export class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.music = {};
        this.palettes = {};
        this.fontsLoaded = false;
        
        // Music management
        this.currentMusicKey = null;
        this.currentIntro = null;
        this.currentLoop = null;
        this.fadeInterval = null;
        this.voices = {}; // Cache for recently played voices
    }

    async playVoice(voiceId, volume = 1.0) {
        if (!voiceId) return;
        
        // Stop current voice if any? Maybe just let them overlap for now or stop previous.
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice.currentTime = 0;
        }

        const src = `assets/audio/voices/${voiceId}.ogg`;
        
        try {
            const audio = this.voices[voiceId] || new Audio(src);
            this.voices[voiceId] = audio;
            audio.volume = volume;
            this.currentVoice = audio;
            await audio.play();
        } catch (e) {
            console.warn(`Voice line not found or playback failed: ${src}`, e);
        }
    }

    async loadPalettes(paletteAssets) {
        const promises = Object.entries(paletteAssets).map(([key, src]) => {
            return fetch(src)
                .then(response => response.text())
                .then(text => {
                    const colors = [];
                    const lines = text.split('\n');
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(';')) return;
                        
                        // Handle FFRRGGBB format (paint.net)
                        let hex = trimmed;
                        if (hex.length === 8) {
                            // Strip the FF alpha if present
                            hex = hex.substring(2);
                        }
                        
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        colors.push({ r, g, b });
                    });
                    this.palettes[key] = colors;
                    return colors;
                });
        });
        return Promise.all(promises);
    }

    palettizeImage(img, paletteKey) {
        if (!img) return null;
        const palette = this.palettes[paletteKey];
        if (!palette) return img;

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 10) continue; // Skip transparent pixels

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Find nearest color in palette
            let bestColor = palette[0];
            let minDist = Infinity;

            for (const color of palette) {
                // simple Euclidean distance in RGB space
                const dr = r - color.r;
                const dg = g - color.g;
                const db = b - color.b;
                const dist = dr * dr + dg * dg + db * db;
                
                if (dist < minDist) {
                    minDist = dist;
                    bestColor = color;
                }
            }

            data[i] = bestColor.r;
            data[i + 1] = bestColor.g;
            data[i + 2] = bestColor.b;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    palettizeKeys(keys, paletteKey) {
        keys.forEach(key => {
            const original = this.getImage(key);
            if (original) {
                const palettized = this.palettizeImage(original, paletteKey);
                this.images[key] = palettized;
            }
        });
    }

    async loadImages(assets) {
        const promises = Object.entries(assets).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    resolve(img);
                };
                img.onerror = reject;
                img.src = src;
            });
        });
        return Promise.all(promises);
    }

    async loadSounds(assets) {
        const promises = Object.entries(assets).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.oncanplaythrough = () => {
                    this.sounds[key] = audio;
                    resolve(audio);
                };
                audio.onerror = reject;
                audio.src = src;
            });
        });
        return Promise.all(promises);
    }

    async loadMusic(assets) {
        const promises = Object.entries(assets).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                // If it's a loop file, enable looping
                if (key.endsWith('_loop')) {
                    audio.loop = true;
                }
                audio.oncanplaythrough = () => {
                    this.music[key] = audio;
                    resolve(audio);
                };
                audio.onerror = reject;
                audio.src = src;
            });
        });
        return Promise.all(promises);
    }

    async loadFonts() {
        await document.fonts.ready;
        this.fontsLoaded = true;
    }

    getImage(key) {
        return this.images[key];
    }

    getSound(key) {
        return this.sounds[key];
    }

    getMusic(key) {
        return this.music[key];
    }

    playSound(key, volume = 1.0) {
        const sound = this.getSound(key);
        if (sound) {
            const clone = sound.cloneNode();
            clone.volume = volume;
            clone.play().catch(e => console.log("Sound play prevented:", e));
        }
    }

    playMusic(key, targetVolume = 0.5) {
        if (this.currentMusicKey === key) return;

        const nextIntro = this.getMusic(`${key}_intro`);
        const nextLoop = this.getMusic(`${key}_loop`);

        if (!nextLoop && !nextIntro) {
            console.warn(`Music track not found: ${key}`);
            return;
        }

        // Stop any existing fade
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }

        const fadeOutStep = 0.05;
        const fadeInStep = 0.05;
        
        const oldIntro = this.currentIntro;
        const oldLoop = this.currentLoop;

        // Initialize next track
        let activeNextPart = nextIntro || nextLoop;
        activeNextPart.volume = 0;
        activeNextPart.currentTime = 0;
        activeNextPart.play().catch(e => console.log("Music play prevented:", e));

        // If there's an intro, set up the transition to loop
        if (nextIntro && nextLoop) {
            nextIntro.onended = () => {
                if (this.currentMusicKey === key) {
                    nextLoop.volume = targetVolume;
                    nextLoop.currentTime = 0;
                    nextLoop.play().catch(e => console.log("Music loop play prevented:", e));
                    this.currentIntro = null;
                }
            };
        }

        this.currentMusicKey = key;
        this.currentIntro = nextIntro || null;
        this.currentLoop = nextLoop || null;

        this.fadeInterval = setInterval(() => {
            let finished = true;

            // Fade out old music (both intro and loop if they exist)
            [oldIntro, oldLoop].forEach(old => {
                if (old && old.paused === false) {
                    if (old.volume > fadeOutStep) {
                        old.volume -= fadeOutStep;
                        finished = false;
                    } else {
                        old.volume = 0;
                        old.pause();
                    }
                }
            });

            // Fade in new music
            if (activeNextPart.volume < targetVolume - fadeInStep) {
                activeNextPart.volume += fadeInStep;
                finished = false;
            } else {
                activeNextPart.volume = targetVolume;
            }

            if (finished) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, 50);
    }
}

export const assets = new AssetLoader();


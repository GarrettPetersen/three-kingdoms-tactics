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
        this.currentVoice = null;
        this.baseMusicVolume = 0.5;
    }

    async playVoice(voiceId, volume = 1.0) {
        if (!voiceId) {
            this.stopVoice();
            return;
        }
        
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice.onended = null; // Clear previous callback
            this.currentVoice.currentTime = 0;
        }

        const src = `assets/audio/voices/${voiceId}.ogg`;
        
        try {
            const audio = this.voices[voiceId] || new Audio(src);
            this.voices[voiceId] = audio;
            audio.volume = volume;
            this.currentVoice = audio;

            // Duck music volume immediately
            this.setMusicVolume(this.baseMusicVolume * 0.3);

            audio.onended = () => {
                if (this.currentVoice === audio) {
                    this.stopVoice();
                }
            };

            await audio.play();
        } catch (e) {
            console.warn(`Voice line not found or playback failed: ${src}`, e);
            this.stopVoice();
        }
    }

    stopVoice() {
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice.onended = null;
            this.currentVoice.currentTime = 0;
            this.currentVoice = null;
        }
        this.setMusicVolume(this.baseMusicVolume);
    }

    setMusicVolume(volume) {
        if (this.currentIntro) this.currentIntro.volume = volume;
        if (this.currentLoop) this.currentLoop.volume = volume;
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
                img.onerror = () => {
                    console.warn(`Failed to load image: ${src}`);
                    resolve(null);
                };
                img.src = src;
            });
        });
        return Promise.all(promises);
    }

    async loadPortraits(characterNames) {
        // Load dedicated portraits if they exist
        const promises = characterNames.map(name => {
            const formattedName = name.replace(/ /g, '-');
            const key = `portrait_${formattedName}`;
            // Try generated first, then raw
            const srcGenerated = `assets/portraits/generated/${formattedName}.png`;
            const srcRaw = `assets/portraits/snes_raw/${formattedName}.png`;
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    resolve(img);
                };
                img.onerror = () => {
                    // Try raw if generated fails
                    const rawImg = new Image();
                    rawImg.onload = () => {
                        this.images[key] = rawImg;
                        resolve(rawImg);
                    };
                    rawImg.onerror = () => {
                        resolve(null); // No portrait found
                    };
                    rawImg.src = srcRaw;
                };
                img.src = srcGenerated;
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
            // Clamp volume between 0 and 1 to prevent IndexSizeError
            clone.volume = Math.max(0, Math.min(1, volume));
            clone.play().catch(e => console.log("Sound play prevented:", e));
        }
    }

    playMusic(key, targetVolume = 0.5) {
        if (this.currentMusicKey === key) {
            this.baseMusicVolume = targetVolume;
            return;
        }

        this.baseMusicVolume = targetVolume;
        const actualVolume = this.currentVoice ? targetVolume * 0.3 : targetVolume;

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
                    const currentTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
                    nextLoop.volume = currentTarget;
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
            const currentTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
            if (activeNextPart.volume < currentTarget - fadeInStep) {
                activeNextPart.volume += fadeInStep;
                finished = false;
            } else {
                activeNextPart.volume = currentTarget;
            }

            if (finished) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, 50);
    }
}

export const assets = new AssetLoader();


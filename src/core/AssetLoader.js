import { getCurrentLanguage } from './Language.js';

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
        this.duckInterval = null; // For smooth music ducking when voice plays
        this.voices = {}; // Cache for recently played voices
        this.currentVoice = null;
        this.baseMusicVolume = 0.5;
        this.loopingSounds = new Map(); // key -> { audio, fadeInterval }
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

        const lang = getCurrentLanguage();
        const src = `assets/audio/voices/${lang}/${voiceId}.ogg`;
        
        try {
            const audio = this.voices[voiceId] || new Audio(src);
            this.voices[voiceId] = audio;
            audio.volume = volume;
            this.currentVoice = audio;

            // Duck music volume smoothly
            this.fadeMusicVolume(this.baseMusicVolume * 0.3, 200);

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
        // Restore music volume smoothly
        this.fadeMusicVolume(this.baseMusicVolume, 300);
    }

    setMusicVolume(volume) {
        if (this.currentIntro) this.currentIntro.volume = volume;
        if (this.currentLoop) this.currentLoop.volume = volume;
    }

    fadeMusicVolume(targetVolume, duration = 200) {
        // Stop any existing ducking fade
        if (this.duckInterval) {
            clearInterval(this.duckInterval);
            this.duckInterval = null;
        }

        // Get current volumes
        const currentIntroVolume = this.currentIntro ? this.currentIntro.volume : 0;
        const currentLoopVolume = this.currentLoop ? this.currentLoop.volume : 0;
        
        // If no music is playing, just set the target immediately
        if (!this.currentIntro && !this.currentLoop) {
            return;
        }

        const startIntroVolume = currentIntroVolume;
        const startLoopVolume = currentLoopVolume;
        const startTime = Date.now();
        const fadeStep = 16; // ~60fps

        this.duckInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use ease-in-out curve for smooth transition
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            if (this.currentIntro) {
                const newVolume = startIntroVolume + (targetVolume - startIntroVolume) * eased;
                this.currentIntro.volume = Math.max(0, Math.min(1, newVolume));
            }
            
            if (this.currentLoop) {
                const newVolume = startLoopVolume + (targetVolume - startLoopVolume) * eased;
                this.currentLoop.volume = Math.max(0, Math.min(1, newVolume));
            }

            if (progress >= 1) {
                // Ensure we hit the exact target
                if (this.currentIntro) this.currentIntro.volume = targetVolume;
                if (this.currentLoop) this.currentLoop.volume = targetVolume;
                clearInterval(this.duckInterval);
                this.duckInterval = null;
            }
        }, fadeStep);
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
                // Re-attach or re-calculate silhouette for the new palettized canvas
                palettized.silhouette = original.silhouette || this.analyzeSilhouette(palettized);
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
                    // Pre-analyze silhouette for impassable edge highlighting
                    img.silhouette = this.analyzeSilhouette(img);
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

    analyzeSilhouette(img) {
        if (!img.width || !img.height) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            const top = new Int32Array(img.width).fill(-1);
            const bottom = new Int32Array(img.width).fill(-1);
            
            for (let x = 0; x < img.width; x++) {
                for (let y = 0; y < img.height; y++) {
                    const alpha = data[(y * img.width + x) * 4 + 3];
                    if (alpha > 50) {
                        if (top[x] === -1) top[x] = y;
                        bottom[x] = y;
                    }
                }
            }
            return { top, bottom };
        } catch (e) {
            console.warn("Could not analyze silhouette (CORS?):", img.src);
            return null;
        }
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
        let resolvedKey = key;
        let resolvedVolume = volume;
        if (key === 'death') {
            const hasA = !!this.getSound('death_a');
            const hasB = !!this.getSound('death_b');
            if (hasA || hasB) {
                if (hasA && hasB) {
                    resolvedKey = Math.random() < 0.5 ? 'death_a' : 'death_b';
                } else {
                    resolvedKey = hasA ? 'death_a' : 'death_b';
                }
            }
        }

        const sound = this.getSound(resolvedKey);
        if (sound) {
            const clone = sound.cloneNode();
            // Clamp volume between 0 and 1 to prevent IndexSizeError
            clone.volume = Math.max(0, Math.min(1, resolvedVolume));
            clone.play().catch(e => console.log("Sound play prevented:", e));
        }
    }

    playLoopingSound(key, volume = 1.0, fadeInMs = 0) {
        const base = this.getSound(key);
        if (!base) return;

        const targetVolume = Math.max(0, Math.min(1, volume));
        const existing = this.loopingSounds.get(key);
        if (existing) {
            if (existing.fadeInterval) {
                clearInterval(existing.fadeInterval);
                existing.fadeInterval = null;
            }
            existing.audio.loop = true;
            if (fadeInMs <= 0) {
                existing.audio.volume = targetVolume;
            } else {
                const startVol = existing.audio.volume;
                const startTime = Date.now();
                existing.fadeInterval = setInterval(() => {
                    const t = Math.min(1, (Date.now() - startTime) / fadeInMs);
                    existing.audio.volume = startVol + (targetVolume - startVol) * t;
                    if (t >= 1) {
                        clearInterval(existing.fadeInterval);
                        existing.fadeInterval = null;
                    }
                }, 16);
            }
            return;
        }

        const audio = base.cloneNode();
        audio.loop = true;
        audio.volume = (fadeInMs > 0) ? 0 : targetVolume;
        const entry = { audio, fadeInterval: null };
        this.loopingSounds.set(key, entry);
        audio.play().catch(e => console.log("Looping sound play prevented:", e));

        if (fadeInMs > 0) {
            const startTime = Date.now();
            entry.fadeInterval = setInterval(() => {
                const t = Math.min(1, (Date.now() - startTime) / fadeInMs);
                audio.volume = targetVolume * t;
                if (t >= 1) {
                    clearInterval(entry.fadeInterval);
                    entry.fadeInterval = null;
                }
            }, 16);
        }
    }

    stopLoopingSound(key, fadeOutMs = 120) {
        const entry = this.loopingSounds.get(key);
        if (!entry) return;
        if (entry.fadeInterval) {
            clearInterval(entry.fadeInterval);
            entry.fadeInterval = null;
        }

        const audio = entry.audio;
        if (fadeOutMs <= 0) {
            audio.pause();
            audio.currentTime = 0;
            this.loopingSounds.delete(key);
            return;
        }

        const startVol = audio.volume;
        const startTime = Date.now();
        entry.fadeInterval = setInterval(() => {
            const t = Math.min(1, (Date.now() - startTime) / fadeOutMs);
            audio.volume = Math.max(0, startVol * (1 - t));
            if (t >= 1) {
                clearInterval(entry.fadeInterval);
                entry.fadeInterval = null;
                audio.pause();
                audio.currentTime = 0;
                this.loopingSounds.delete(key);
            }
        }, 16);
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


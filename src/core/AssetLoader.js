import { getCurrentLanguage } from './Language.js';

export class AssetLoader {
    constructor() {
        this.images = {};
        this.originalImages = {};
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
        this.audioUnlocked = false;
        this.pendingMusic = null; // { key, targetVolume }
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

                        // Support common palette line formats:
                        // - RRGGBB (Lospec .hex)
                        // - #RRGGBB
                        // - AARRGGBB (paint.net .txt)
                        // - #AARRGGBB
                        let hex = trimmed.replace(/^#/, '');
                        if (!/^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(hex)) return;
                        if (hex.length === 8) hex = hex.substring(2); // Drop AA from AARRGGBB

                        const r = parseInt(hex.slice(0, 2), 16);
                        const g = parseInt(hex.slice(2, 4), 16);
                        const b = parseInt(hex.slice(4, 6), 16);
                        if (![r, g, b].every(Number.isFinite)) return;
                        colors.push({ r, g, b });
                    });
                    this.palettes[key] = colors;
                    return colors;
                });
        });
        return Promise.all(promises);
    }

    palettizeImage(img, paletteKey, options = {}) {
        if (!img) return null;
        const palette = this.palettes[paletteKey];
        if (!palette) return img;

        const {
            ditherMix = false,
            flatThreshold = 42,
            mixImprovement = 0.9,
            pattern = 'bayer4'
        } = options;

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const src = new Uint8ClampedArray(data); // keep source stable for flat-area checks
        const w = canvas.width;
        const h = canvas.height;

        const distSq = (r1, g1, b1, r2, g2, b2) => {
            const dr = r1 - r2;
            const dg = g1 - g2;
            const db = b1 - b2;
            return dr * dr + dg * dg + db * db;
        };
        const flatnessAt = (x, y) => {
            const idx = (y * w + x) * 4;
            const r = src[idx];
            const g = src[idx + 1];
            const b = src[idx + 2];
            let total = 0;
            let count = 0;
            const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const nIdx = (ny * w + nx) * 4;
                if (src[nIdx + 3] < 10) continue;
                total += Math.abs(r - src[nIdx]) + Math.abs(g - src[nIdx + 1]) + Math.abs(b - src[nIdx + 2]);
                count++;
            }
            if (!count) return 0;
            return total / (count * 3);
        };
        const bayer4 = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
        const bayer8 = [
            [0, 48, 12, 60, 3, 51, 15, 63],
            [32, 16, 44, 28, 35, 19, 47, 31],
            [8, 56, 4, 52, 11, 59, 7, 55],
            [40, 24, 36, 20, 43, 27, 39, 23],
            [2, 50, 14, 62, 1, 49, 13, 61],
            [34, 18, 46, 30, 33, 17, 45, 29],
            [10, 58, 6, 54, 9, 57, 5, 53],
            [42, 26, 38, 22, 41, 25, 37, 21]
        ];
        const thresholdAt = (x, y) => {
            if (pattern === 'checker') return ((x + y) % 2) * 0.5 + 0.25;
            if (pattern === 'bayer8') return (bayer8[y % 8][x % 8] + 0.5) / 64;
            return (bayer4[y % 4][x % 4] + 0.5) / 16;
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const a = src[i + 3];
                if (a < 10) continue; // Skip transparent pixels

                const r = src[i];
                const g = src[i + 1];
                const b = src[i + 2];

                // Find nearest and second-nearest colors in palette
                let bestColor = palette[0];
                let secondColor = palette[0];
                let minDist = Infinity;
                let secondDist = Infinity;
                for (const color of palette) {
                    const d = distSq(r, g, b, color.r, color.g, color.b);
                    if (d < minDist) {
                        secondDist = minDist;
                        secondColor = bestColor;
                        minDist = d;
                        bestColor = color;
                    } else if (d < secondDist) {
                        secondDist = d;
                        secondColor = color;
                    }
                }

                let out = bestColor;
                if (ditherMix && secondColor !== bestColor && flatnessAt(x, y) <= flatThreshold) {
                    // Project source onto segment [best, second] to estimate two-color mix amount.
                    const abR = secondColor.r - bestColor.r;
                    const abG = secondColor.g - bestColor.g;
                    const abB = secondColor.b - bestColor.b;
                    const abLenSq = abR * abR + abG * abG + abB * abB;
                    let t = 0;
                    if (abLenSq > 0) {
                        const apR = r - bestColor.r;
                        const apG = g - bestColor.g;
                        const apB = b - bestColor.b;
                        t = (apR * abR + apG * abG + apB * abB) / abLenSq;
                    }
                    t = Math.max(0, Math.min(1, t));

                    const mixR = bestColor.r + abR * t;
                    const mixG = bestColor.g + abG * t;
                    const mixB = bestColor.b + abB * t;
                    const mixErr = distSq(r, g, b, mixR, mixG, mixB);
                    const improves = mixErr < (minDist * mixImprovement);
                    if (improves && t > 0.03 && t < 0.97) {
                        out = (t > thresholdAt(x, y)) ? secondColor : bestColor;
                    }
                }

                data[i] = out.r;
                data[i + 1] = out.g;
                data[i + 2] = out.b;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    palettizeKeys(keys, paletteKey, options = {}) {
        keys.forEach(key => {
            const original = this.getImage(key);
            if (original) {
                const palettized = this.palettizeImage(original, paletteKey, options);
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
                    // Keep pristine originals so palette switching can restore true base colors.
                    if (!this.originalImages[key]) this.originalImages[key] = img;
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
        // Load dedicated portraits from generated only.
        // Missing generated portraits should fall back to in-scene sprite zoom logic.
        const promises = characterNames.map(name => {
            const formattedName = name.replace(/ /g, '-');
            const key = `portrait_${formattedName}`;
            // Generated portrait source
            const srcGenerated = `assets/portraits/generated/${formattedName}.png`;
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    resolve(img);
                };
                img.onerror = () => {
                    resolve(null); // No generated portrait found
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
            clone.play().catch(e => {
                this.audioUnlocked = false;
                console.log("Sound play prevented:", e);
            });
        }
    }

    async unlockAudioFromGesture() {
        // Already unlocked: still flush pending music if any.
        if (this.audioUnlocked) {
            if (this.pendingMusic) {
                const pending = this.pendingMusic;
                this.pendingMusic = null;
                this.currentMusicKey = null; // force restart even if key matches
                this.playMusic(pending.key, pending.targetVolume);
            }
            return;
        }

        const pendingCandidate = this.pendingMusic
            ? (this.getMusic(`${this.pendingMusic.key}_intro`) || this.getMusic(`${this.pendingMusic.key}_loop`) || null)
            : null;
        const candidate = pendingCandidate || this.currentIntro || this.currentLoop || Object.values(this.music)[0] || Object.values(this.sounds)[0] || null;
        if (!candidate) {
            if (this.pendingMusic) {
                const pending = this.pendingMusic;
                this.pendingMusic = null;
                this.currentMusicKey = null;
                this.playMusic(pending.key, pending.targetVolume);
            }
            return;
        }

        try {
            const probe = candidate.cloneNode();
            probe.volume = 0;
            probe.muted = true;
            await probe.play();
            probe.pause();
            probe.currentTime = 0;
            this.audioUnlocked = true;
        } catch (e) {
            return;
        }

        if (this.pendingMusic) {
            const pending = this.pendingMusic;
            this.pendingMusic = null;
            this.currentMusicKey = null; // force replay of blocked request
            this.playMusic(pending.key, pending.targetVolume);
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
        activeNextPart.play().catch(e => {
            this.audioUnlocked = false;
            this.pendingMusic = { key, targetVolume };
            // Leave music state clear so a post-gesture retry can restart cleanly.
            if (this.currentMusicKey === key) this.currentMusicKey = null;
            console.log("Music play prevented:", e);
        });

        // If there's an intro, set up the transition to loop
        if (nextIntro && nextLoop) {
            nextIntro.onended = () => {
                if (this.currentMusicKey === key) {
                    const currentTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
                    nextLoop.volume = currentTarget;
                    nextLoop.currentTime = 0;
                    nextLoop.play().catch(e => {
                        this.audioUnlocked = false;
                        this.pendingMusic = { key, targetVolume: this.baseMusicVolume };
                        if (this.currentMusicKey === key) this.currentMusicKey = null;
                        console.log("Music loop play prevented:", e);
                    });
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


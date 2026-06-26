import { getCurrentLanguage } from './Language.js';

const AUDIO_SETTINGS_STORAGE_KEY = 'gameAudioSettings';
const DEFAULT_AUDIO_SETTINGS = {
    master: 1.0,
    music: 0.5,
    sfx: 0.5,
    voice: 0.5,
    muted: false
};
const MUSIC_CROSSFADE_MS = 1100;
const SFX_DEFAULT_GAINS = {
    // These source files measure much hotter than the rest of the effects set.
    war_horn: 0.35,
    boulder_roll: 0.35,
    boulder_roll_2: 0.35,
    boulder_impact: 0.5,
    bump_damage: 0.75,
    splash: 0.8,
    heavy_door_unlocking: 0.8
};

export class AssetLoader {
    constructor() {
        this.images = {};
        this.originalImages = {};
        this.sounds = {};
        this.soundSources = {};
        this.soundLoadPromises = {};
        this.music = {};
        this.musicSources = {};
        this.musicLoadPromises = {};
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
        this._voicePlaySeq = 0;
        this.baseMusicVolume = 0.5;
        this.loopingSounds = new Map(); // key -> { audio, fadeInterval }
        this.loopingSoundRequests = new Map(); // key -> request id, cancels async loop starts
        this.audioUnlocked = false;
        this.pendingMusic = null; // { key, targetVolume }
        this.onNextVoiceEnd = null; // one-time callback when current voice finishes (for action recording)
        this._voiceEndTimeout = null; // timeout for duration-based recorder stop
        this.musicMutedByUser = false; // Cmd+Shift+M mute persists until toggled again or game restarted
        this.currentVoiceBaseVolume = 1.0;

        const audioSettings = this._loadAudioSettings();
        this.masterUserVolume = audioSettings.master;
        this.musicUserVolume = audioSettings.music;
        this.sfxUserVolume = audioSettings.sfx;
        this.voiceUserVolume = audioSettings.voice;
        this.masterMutedByUser = !!audioSettings.muted;
    }

    _clamp01(value) {
        return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    }

    _loadAudioSettings() {
        if (typeof localStorage === 'undefined') {
            return { ...DEFAULT_AUDIO_SETTINGS };
        }
        try {
            const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
            if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
            const parsed = JSON.parse(raw);
            return {
                master: this._clamp01(parsed?.master ?? DEFAULT_AUDIO_SETTINGS.master),
                music: this._clamp01(parsed?.music ?? DEFAULT_AUDIO_SETTINGS.music),
                sfx: this._clamp01(parsed?.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
                voice: this._clamp01(parsed?.voice ?? DEFAULT_AUDIO_SETTINGS.voice),
                muted: !!(parsed?.muted ?? DEFAULT_AUDIO_SETTINGS.muted)
            };
        } catch (_err) {
            return { ...DEFAULT_AUDIO_SETTINGS };
        }
    }

    _saveAudioSettings() {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(this.getAudioSettings()));
        } catch (_err) {
            // Best-effort persistence only.
        }
    }

    _getEffectiveMusicVolume(rawVolume) {
        const requested = this._clamp01(rawVolume);
        const scaled = requested * this._clamp01(this.masterUserVolume) * this._clamp01(this.musicUserVolume);
        return (this.musicMutedByUser || this.masterMutedByUser) ? 0 : this._clamp01(scaled);
    }

    getAudioSettings() {
        return {
            master: this._clamp01(this.masterUserVolume),
            music: this._clamp01(this.musicUserVolume),
            sfx: this._clamp01(this.sfxUserVolume),
            voice: this._clamp01(this.voiceUserVolume),
            muted: !!this.masterMutedByUser
        };
    }

    setAudioSettings(partial = {}) {
        if (Object.prototype.hasOwnProperty.call(partial, 'master')) {
            this.masterUserVolume = this._clamp01(partial.master);
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'music')) {
            this.musicUserVolume = this._clamp01(partial.music);
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'sfx')) {
            this.sfxUserVolume = this._clamp01(partial.sfx);
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'voice')) {
            this.voiceUserVolume = this._clamp01(partial.voice);
        }
        if (Object.prototype.hasOwnProperty.call(partial, 'muted')) {
            this.masterMutedByUser = !!partial.muted;
        }
        this._saveAudioSettings();

        const rawMusic = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
        this.setMusicVolume(rawMusic);

        if (this.currentVoice) {
            this.currentVoice.volume = this.masterMutedByUser ? 0 : this._clamp01(this.currentVoiceBaseVolume * this.masterUserVolume * this.voiceUserVolume);
        }

        this.loopingSounds.forEach(entry => {
            if (!entry || !entry.audio) return;
            const baseVolume = this._clamp01(entry.baseVolume ?? 1.0);
            const defaultGain = this.getSoundDefaultGain(entry.key);
            entry.audio.volume = this.masterMutedByUser ? 0 : this._clamp01(baseVolume * defaultGain * this.masterUserVolume * this.sfxUserVolume);
        });
        return this.getAudioSettings();
    }

    setMasterUserVolume(volume) {
        return this.setAudioSettings({ master: volume });
    }

    setMusicUserVolume(volume) {
        return this.setAudioSettings({ music: volume });
    }

    setSfxUserVolume(volume) {
        return this.setAudioSettings({ sfx: volume });
    }

    setVoiceUserVolume(volume) {
        return this.setAudioSettings({ voice: volume });
    }

    async playVoice(voiceId, volume = 1.0) {
        const playSeq = ++this._voicePlaySeq;
        if (!voiceId) {
            this.stopVoice();
            return;
        }
        
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice.onended = null; // Clear previous callback
            this.currentVoice.currentTime = 0;
        }
        if (this._voiceEndTimeout) {
            clearTimeout(this._voiceEndTimeout);
            this._voiceEndTimeout = null;
        }

        const lang = getCurrentLanguage();
        const src = `assets/audio/voices/${lang}/${voiceId}.ogg`;
        
        let audio = null;
        try {
            audio = this.voices[voiceId] || new Audio(src);
            this.voices[voiceId] = audio;
            audio.pause();
            audio.onended = null;
            audio.currentTime = 0;
            this.currentVoiceBaseVolume = this._clamp01(volume);
            audio.volume = this.masterMutedByUser ? 0 : this._clamp01(this.currentVoiceBaseVolume * this.masterUserVolume * this.voiceUserVolume);
            this.currentVoice = audio;

            this.fadeMusicVolume(this.baseMusicVolume * 0.3, 200);

            const fireVoiceEnd = () => {
                if (playSeq !== this._voicePlaySeq) return;
                if (this._voiceEndTimeout) {
                    clearTimeout(this._voiceEndTimeout);
                    this._voiceEndTimeout = null;
                }
                if (this.onNextVoiceEnd) {
                    const fn = this.onNextVoiceEnd;
                    this.onNextVoiceEnd = null;
                    fn();
                }
            };

            audio.onended = () => {
                if (playSeq !== this._voicePlaySeq) return;
                fireVoiceEnd();
                if (this.currentVoice === audio) {
                    this.stopVoice();
                }
            };

            // Recorder stop: use known length + 0.25s so recording ends reliably when the line finishes
            if (this.onNextVoiceEnd) {
                const scheduleEnd = () => {
                    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                    const ms = Math.round(audio.duration * 1000) + 250;
                    this._voiceEndTimeout = setTimeout(fireVoiceEnd, ms);
                };
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    scheduleEnd();
                } else {
                    audio.addEventListener('loadedmetadata', scheduleEnd, { once: true });
                }
            }

            await audio.play();
        } catch (e) {
            if (playSeq !== this._voicePlaySeq || this.currentVoice !== audio) {
                return;
            }
            console.warn(`Voice line not found or playback failed: ${src}`, e);
            if (this.onNextVoiceEnd) {
                const fn = this.onNextVoiceEnd;
                this.onNextVoiceEnd = null;
                fn();
            }
            this.stopVoice();
        }
    }

    stopVoice() {
        this._voicePlaySeq++;
        if (this._voiceEndTimeout) {
            clearTimeout(this._voiceEndTimeout);
            this._voiceEndTimeout = null;
        }
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice.onended = null;
            this.currentVoice.currentTime = 0;
            this.currentVoice = null;
            this.currentVoiceBaseVolume = 1.0;
        }
        this.onNextVoiceEnd = null;
        // Restore music volume smoothly
        this.fadeMusicVolume(this.baseMusicVolume, 300);
    }

    clearVoiceCache() {
        this.stopVoice();
        this.voices = {};
    }

    setMusicVolume(volume) {
        const effective = this._getEffectiveMusicVolume(volume);
        if (this.currentIntro) this.currentIntro.volume = effective;
        if (this.currentLoop) this.currentLoop.volume = effective;
    }

    fadeMusicVolume(targetVolume, duration = 200) {
        const effectiveTarget = this._getEffectiveMusicVolume(targetVolume);
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
                const newVolume = startIntroVolume + (effectiveTarget - startIntroVolume) * eased;
                this.currentIntro.volume = Math.max(0, Math.min(1, newVolume));
            }
            
            if (this.currentLoop) {
                const newVolume = startLoopVolume + (effectiveTarget - startLoopVolume) * eased;
                this.currentLoop.volume = Math.max(0, Math.min(1, newVolume));
            }

            if (progress >= 1) {
                // Ensure we hit the exact target
                if (this.currentIntro) this.currentIntro.volume = effectiveTarget;
                if (this.currentLoop) this.currentLoop.volume = effectiveTarget;
                clearInterval(this.duckInterval);
                this.duckInterval = null;
            }
        }, fadeStep);
    }

    recoverMusicPlayback() {
        if (!this.currentMusicKey || this.masterMutedByUser || this.musicMutedByUser) return;
        if (this.masterUserVolume <= 0 || this.musicUserVolume <= 0 || this.baseMusicVolume <= 0) return;

        const key = this.currentMusicKey;
        const rawTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
        const targetVolume = this._getEffectiveMusicVolume(rawTarget);

        if (this.currentIntro?.ended && this.currentLoop) {
            this.currentIntro = null;
            this.currentLoop.currentTime = 0;
            this.currentLoop.volume = targetVolume;
            this.currentLoop.play()
                .then(() => {
                    this.audioUnlocked = true;
                })
                .catch(e => {
                    this.audioUnlocked = false;
                    this.pendingMusic = { key, targetVolume: this.baseMusicVolume };
                    if (this.currentMusicKey === key) this.currentMusicKey = null;
                    console.log("Music recovery prevented:", e);
                });
            return;
        }

        const activeTrack = (this.currentIntro && !this.currentIntro.ended)
            ? this.currentIntro
            : (this.currentLoop || this.currentIntro);
        if (!activeTrack) return;

        activeTrack.volume = targetVolume;
        if (!activeTrack.paused && !activeTrack.ended) return;

        activeTrack.play()
            .then(() => {
                this.audioUnlocked = true;
            })
            .catch(e => {
                this.audioUnlocked = false;
                this.pendingMusic = { key, targetVolume: this.baseMusicVolume };
                if (this.currentMusicKey === key) this.currentMusicKey = null;
                console.log("Music recovery prevented:", e);
            });
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
        const loadPortrait = (key, sources) => new Promise((resolve) => {
            const trySource = (index) => {
                if (index >= sources.length) {
                    resolve(null);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    resolve(img);
                };
                img.onerror = () => trySource(index + 1);
                img.src = sources[index];
            };
            trySource(0);
        });

        const promises = characterNames.flatMap(name => {
            const formattedName = name.replace(/ /g, '-');
            return [
                loadPortrait(`portrait_${formattedName}`, [
                    `assets/portraits/small/${formattedName}.png`,
                    `assets/portraits/generated/${formattedName}.png`
                ]),
                loadPortrait(`portrait_large_${formattedName}`, [
                    `assets/portraits/large/${formattedName}.png`
                ])
            ];
        });
        return Promise.all(promises);
    }

    async loadAudioSource(src, options = {}) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.loop = !!options.loop;
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => {
                console.warn(`Failed to load audio: ${src}`);
                resolve(null);
            };
            audio.src = src;
            audio.load();
        });
    }

    async loadSound(key) {
        if (this.sounds[key]) return this.sounds[key];
        const src = this.soundSources[key];
        if (!src) return null;
        if (!this.soundLoadPromises[key]) {
            this.soundLoadPromises[key] = this.loadAudioSource(src).then(audio => {
                if (audio) this.sounds[key] = audio;
                return audio;
            });
        }
        return this.soundLoadPromises[key];
    }

    async loadSounds(assets, options = {}) {
        Object.assign(this.soundSources, assets);
        const preloadKeys = options.preload || Object.keys(assets);
        const promises = preloadKeys.map(key => this.loadSound(key));
        return Promise.all(promises);
    }

    async loadMusicTrack(key) {
        if (this.music[key]) return this.music[key];
        const src = this.musicSources[key];
        if (!src) return null;
        if (!this.musicLoadPromises[key]) {
            this.musicLoadPromises[key] = this.loadAudioSource(src, {
                loop: key.endsWith('_loop')
            }).then(audio => {
                if (audio) this.music[key] = audio;
                return audio;
            });
        }
        return this.musicLoadPromises[key];
    }

    async loadMusic(assets, options = {}) {
        Object.assign(this.musicSources, assets);
        const preloadKeys = options.preload || Object.keys(assets);
        const promises = preloadKeys.map(key => this.loadMusicTrack(key));
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

    getSoundDefaultGain(key) {
        return this._clamp01(SFX_DEFAULT_GAINS[key] ?? 1.0);
    }

    _playLoadedSound(sound, volume, key = null) {
        if (!sound) return;
        const clone = sound.cloneNode();
        const defaultGain = this.getSoundDefaultGain(key);
        clone.volume = this.masterMutedByUser ? 0 : this._clamp01(volume * defaultGain * this.masterUserVolume * this.sfxUserVolume);
        clone.play().catch(e => {
            this.audioUnlocked = false;
            console.log("Sound play prevented:", e);
        });
    }

    playSound(key, volume = 1.0) {
        let resolvedKey = key;
        let resolvedVolume = volume;
        if (key === 'death') {
            const hasA = !!(this.getSound('death_a') || this.soundSources.death_a);
            const hasB = !!(this.getSound('death_b') || this.soundSources.death_b);
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
            this._playLoadedSound(sound, resolvedVolume, resolvedKey);
            return;
        }

        if (this.soundSources[resolvedKey]) {
            this.loadSound(resolvedKey).then(loaded => this._playLoadedSound(loaded, resolvedVolume, resolvedKey));
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
            } else {
                this.recoverMusicPlayback();
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
        } else {
            this.recoverMusicPlayback();
        }
    }

    playLoopingSound(key, volume = 1.0, fadeInMs = 0) {
        const requestId = (this.loopingSoundRequests.get(key) || 0) + 1;
        this.loopingSoundRequests.set(key, requestId);
        const base = this.getSound(key);
        if (!base) {
            if (this.soundSources[key]) {
                this.loadSound(key).then(loaded => {
                    if (loaded && this.loopingSoundRequests.get(key) === requestId) {
                        this.playLoopingSound(key, volume, fadeInMs);
                    }
                });
            }
            return;
        }

        const baseVolume = this._clamp01(volume);
        const defaultGain = this.getSoundDefaultGain(key);
        const targetVolume = this.masterMutedByUser ? 0 : this._clamp01(baseVolume * defaultGain * this.masterUserVolume * this.sfxUserVolume);
        const existing = this.loopingSounds.get(key);
        if (existing) {
            if (existing.fadeInterval) {
                clearInterval(existing.fadeInterval);
                existing.fadeInterval = null;
            }
            existing.baseVolume = baseVolume;
            existing.key = key;
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
        const entry = { audio, fadeInterval: null, baseVolume, key };
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
        this.loopingSoundRequests.set(key, (this.loopingSoundRequests.get(key) || 0) + 1);
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
            const rawTarget = this.currentVoice ? targetVolume * 0.3 : targetVolume;
            this.setMusicVolume(rawTarget);
            this.recoverMusicPlayback();
            return;
        }

        this.baseMusicVolume = targetVolume;
        const requestedVolume = this.currentVoice ? targetVolume * 0.3 : targetVolume;
        const actualVolume = this._getEffectiveMusicVolume(requestedVolume);

        const nextIntro = this.getMusic(`${key}_intro`);
        const nextLoop = this.getMusic(`${key}_loop`);

        if (!nextLoop && !nextIntro) {
            const lazyKeys = [`${key}_intro`, `${key}_loop`].filter(musicKey => this.musicSources[musicKey]);
            if (lazyKeys.length) {
                Promise.all(lazyKeys.map(musicKey => this.loadMusicTrack(musicKey))).then(() => {
                    this.currentMusicKey = null;
                    this.playMusic(key, targetVolume);
                });
                return;
            }
            console.warn(`Music track not found: ${key}`);
            return;
        }

        // Stop any existing fade
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }

        const oldTracks = [this.currentIntro, this.currentLoop]
            .filter(track => track && !track.paused)
            .map(track => ({
                audio: track,
                volume: track.volume
            }));

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
                    const rawTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
                    const currentTarget = this._getEffectiveMusicVolume(rawTarget);
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

        const startTime = Date.now();
        this.fadeInterval = setInterval(() => {
            const t = Math.min(1, (Date.now() - startTime) / MUSIC_CROSSFADE_MS);
            const eased = t * t * (3 - 2 * t);

            oldTracks.forEach(({ audio, volume }) => {
                audio.volume = Math.max(0, volume * (1 - eased));
            });

            const rawTarget = this.currentVoice ? this.baseMusicVolume * 0.3 : this.baseMusicVolume;
            const currentTarget = this._getEffectiveMusicVolume(rawTarget);
            activeNextPart.volume = currentTarget * eased;

            if (t >= 1) {
                oldTracks.forEach(({ audio }) => {
                    audio.volume = 0;
                    audio.pause();
                    audio.currentTime = 0;
                });
                activeNextPart.volume = currentTarget;
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, 16);
    }
}

export const assets = new AssetLoader();

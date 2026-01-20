export class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.music = {};
        this.fontsLoaded = false;
        
        // Music management
        this.currentMusicKey = null;
        this.currentIntro = null;
        this.currentLoop = null;
        this.fadeInterval = null;
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


export class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.fontsLoaded = false;
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

    playSound(key, volume = 1.0) {
        const sound = this.getSound(key);
        if (sound) {
            // Clone the node so we can play the same sound multiple times simultaneously
            const clone = sound.cloneNode();
            clone.volume = volume;
            clone.play().catch(e => console.log("Sound play prevented:", e));
        }
    }
}

export const assets = new AssetLoader();


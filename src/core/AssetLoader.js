export class AssetLoader {
    constructor() {
        this.images = {};
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

    async loadFonts() {
        await document.fonts.ready;
        this.fontsLoaded = true;
    }

    getImage(key) {
        return this.images[key];
    }
}

export const assets = new AssetLoader();


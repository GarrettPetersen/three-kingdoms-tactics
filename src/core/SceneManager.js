export class SceneManager {
    constructor(ctx, canvas, config) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.config = config;
        this.currentScene = null;
        this.scenes = {};
        this.lastPointerX = 0;
        this.lastPointerY = 0;

        window.addEventListener('pointermove', (e) => {
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
        });
    }

    addScene(name, sceneInstance) {
        this.scenes[name] = sceneInstance;
        sceneInstance.manager = this;
    }

    switchTo(name, params = {}) {
        if (this.currentScene && this.currentScene.exit) {
            this.currentScene.exit();
        }
        
        this.currentScene = this.scenes[name];
        
        if (this.currentScene && this.currentScene.enter) {
            this.currentScene.enter(params);
        }
    }

    update(timestamp) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(timestamp);
        }
    }

    render(timestamp) {
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(timestamp);
        }
    }

    handleInput(e) {
        if (this.currentScene && this.currentScene.handleInput) {
            this.currentScene.handleInput(e);
        }
    }
}


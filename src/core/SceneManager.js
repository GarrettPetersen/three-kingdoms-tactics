import { GameState } from './GameState.js';

export class SceneManager {
    constructor(ctx, canvas, config) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.config = config;
        this.currentScene = null;
        this.scenes = {};
        this.gameState = new GameState();
        this.gameState.load();
        
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.logicalMouseX = 0;
        this.logicalMouseY = 0;

        window.addEventListener('pointermove', (e) => {
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.logicalMouseX = (e.clientX - rect.left) * scaleX;
            this.logicalMouseY = (e.clientY - rect.top) * scaleY;
        });
    }

    addScene(name, sceneInstance) {
        this.scenes[name] = sceneInstance;
        sceneInstance.manager = this;
    }

    switchTo(name, params = {}) {
        // Excluded scenes that should never be saved as lastScene
        const excludedScenes = ['title', 'custom_battle', 'campaign_selection'];
        
        // Save lastScene if we're leaving a campaign scene (before switching)
        // We save the scene we're LEAVING, not the one we're entering
        if (this.currentSceneKey && !excludedScenes.includes(this.currentSceneKey)) {
            // Don't save if we're in a custom battle
            if (this.currentSceneKey === 'tactics') {
                const tacticsScene = this.scenes['tactics'];
                if (tacticsScene && !tacticsScene.isCustom) {
                    this.gameState.set('lastScene', this.currentSceneKey);
                }
            } else {
                this.gameState.set('lastScene', this.currentSceneKey);
            }
        }
        
        if (this.currentScene && this.currentScene.exit) {
            this.currentScene.exit();
        }
        
        this.currentScene = this.scenes[name];
        this.currentSceneKey = name;
        
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

    handleKeyDown(e) {
        if (this.currentScene && this.currentScene.handleKeyDown) {
            this.currentScene.handleKeyDown(e);
        }
    }
}


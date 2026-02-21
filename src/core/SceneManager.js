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
        this._padRepeatState = new Map();

        window.addEventListener('pointermove', (e) => {
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.logicalMouseX = (e.clientX - rect.left) * scaleX;
            this.logicalMouseY = (e.clientY - rect.top) * scaleY;
            if (this.currentScene && this.currentScene.onMouseInput) {
                this.currentScene.onMouseInput(this.logicalMouseX, this.logicalMouseY);
            }
        });
    }

    addScene(name, sceneInstance) {
        this.scenes[name] = sceneInstance;
        sceneInstance.manager = this;
    }

    switchTo(name, params = {}) {
        this.gameState.validateAndRepairInvariants(name, params);

        // Excluded scenes that should never be saved as lastScene
        // campaign_selection is now allowed so users can continue from there
        const excludedScenes = ['title', 'custom_battle'];
        
        // Save scene state if the current scene has a saveState method
        if (this.currentScene && typeof this.currentScene.saveState === 'function') {
            try {
                this.currentScene.saveState();
            } catch (e) {
                console.error('Error saving scene state:', e);
            }
        }
        
        // Save lastScene if we're leaving a campaign scene (before switching)
        // We save the scene we're LEAVING, not the one we're entering
        if (this.currentSceneKey && !excludedScenes.includes(this.currentSceneKey)) {
            // Don't save if we're in a custom battle
            if (this.currentSceneKey === 'tactics') {
                const tacticsScene = this.scenes['tactics'];
                if (tacticsScene && !tacticsScene.isCustom) {
                    this.gameState.setLastScene(this.currentSceneKey);
                }
            } else {
                this.gameState.setLastScene(this.currentSceneKey);
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
        this.pollGamepad(timestamp);
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

    pollGamepad(timestamp) {
        if (!navigator.getGamepads) return;
        const pads = navigator.getGamepads();
        if (!pads) return;
        const gp = Array.from(pads).find(Boolean);
        if (!gp) {
            this._padRepeatState.clear();
            return;
        }

        const axisDeadzone = 0.5;
        const up = (gp.buttons[12] && gp.buttons[12].pressed) || gp.axes[1] < -axisDeadzone;
        const down = (gp.buttons[13] && gp.buttons[13].pressed) || gp.axes[1] > axisDeadzone;
        const left = (gp.buttons[14] && gp.buttons[14].pressed) || gp.axes[0] < -axisDeadzone;
        const right = (gp.buttons[15] && gp.buttons[15].pressed) || gp.axes[0] > axisDeadzone;
        const confirm = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[9] && gp.buttons[9].pressed); // South face / Start
        // Cancel supports multiple common mappings across controllers:
        // East face (B/Circle), West face (X/Square on some remaps), and Back/View.
        const cancel =
            (gp.buttons[1] && gp.buttons[1].pressed) ||
            (gp.buttons[2] && gp.buttons[2].pressed) ||
            (gp.buttons[8] && gp.buttons[8].pressed);

        this._emitGamepadKey('up', up, 'ArrowUp', timestamp, true);
        this._emitGamepadKey('down', down, 'ArrowDown', timestamp, true);
        this._emitGamepadKey('left', left, 'ArrowLeft', timestamp, true);
        this._emitGamepadKey('right', right, 'ArrowRight', timestamp, true);
        this._emitGamepadKey('confirm', !!confirm, 'Enter', timestamp, false);
        this._emitGamepadKey('cancel', !!cancel, 'Escape', timestamp, false);
    }

    _emitGamepadKey(id, pressed, key, timestamp, allowRepeat) {
        const initialDelay = 260;
        const repeatDelay = 120;
        const state = this._padRepeatState.get(id) || { down: false, nextRepeatAt: 0 };

        if (!pressed) {
            state.down = false;
            this._padRepeatState.set(id, state);
            return;
        }

        const shouldFire = !state.down || (allowRepeat && timestamp >= state.nextRepeatAt);
        if (!shouldFire) return;

        state.down = true;
        state.nextRepeatAt = timestamp + (allowRepeat ? (state.nextRepeatAt ? repeatDelay : initialDelay) : Number.POSITIVE_INFINITY);
        this._padRepeatState.set(id, state);

        if (this.currentScene && this.currentScene.onNonMouseInput) {
            this.currentScene.onNonMouseInput();
        }
        this.handleKeyDown({
            key,
            fromGamepad: true,
            preventDefault: () => {}
        });
    }
}


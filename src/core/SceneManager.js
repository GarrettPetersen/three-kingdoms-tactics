import { GameState } from './GameState.js';
import { assets } from './AssetLoader.js';

export class SceneManager {
    constructor(ctx, canvas, config) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.config = config;
        this.currentScene = null;
        this.scenes = {};
        this.optionsOverlay = null;
        this.optionsButtonRect = null;
        this.gameState = new GameState();
        this.gameState.load();
        
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.logicalMouseX = 0;
        this.logicalMouseY = 0;
        this._padRepeatState = new Map();
        this._steamInputState = {
            up: false,
            down: false,
            left: false,
            right: false,
            confirm: false,
            cancel: false
        };

        window.addEventListener('pointermove', (e) => {
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            const pos = this.getCanvasLogicalPoint(e);
            this.logicalMouseX = pos.x;
            this.logicalMouseY = pos.y;
            if (this.isOptionsOverlayActive()) {
                if (this.optionsOverlay && this.optionsOverlay.onMouseInput) {
                    this.optionsOverlay.onMouseInput(this.logicalMouseX, this.logicalMouseY);
                }
            } else if (this.currentScene && this.currentScene.onMouseInput) {
                this.currentScene.onMouseInput(this.logicalMouseX, this.logicalMouseY);
            }
        });
    }

    setDisplayControls(controls = {}) {
        this.displayControls = controls;
    }

    getCanvasLogicalPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        if (this.config?.displayRotation === 90) {
            const x = relY * (this.canvas.width / rect.height);
            const y = this.canvas.height - (relX * (this.canvas.height / rect.width));
            return {
                x: Math.max(0, Math.min(this.canvas.width, x)),
                y: Math.max(0, Math.min(this.canvas.height, y))
            };
        }
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    setOptionsOverlay(overlayInstance) {
        this.optionsOverlay = overlayInstance;
        if (this.optionsOverlay) {
            this.optionsOverlay.manager = this;
        }
    }

    isOptionsOverlayActive() {
        return !!(this.optionsOverlay && this.optionsOverlay.isOpen);
    }

    openOptionsOverlay(params = {}) {
        if (!this.optionsOverlay) return;
        this.optionsOverlay.open(params);
    }

    closeOptionsOverlay() {
        if (!this.optionsOverlay) return;
        this.optionsOverlay.close();
    }

    toggleOptionsOverlay(params = {}) {
        if (this.isOptionsOverlayActive()) this.closeOptionsOverlay();
        else this.openOptionsOverlay(params);
    }

    addScene(name, sceneInstance) {
        this.scenes[name] = sceneInstance;
        sceneInstance.manager = this;
    }

    switchTo(name, params = {}) {
        if (this.isOptionsOverlayActive()) {
            this.closeOptionsOverlay();
        }
        this.gameState.validateAndRepairInvariants(name, params);

        // Excluded scenes that should never be saved as lastScene
        // campaign_selection is now allowed so users can continue from there
        const excludedScenes = ['title', 'custom_battle', 'liubo'];
        
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
        if (this.isOptionsOverlayActive()) {
            if (this.optionsOverlay && this.optionsOverlay.update) {
                this.optionsOverlay.update(timestamp);
            }
            return;
        }
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(timestamp);
        }
    }

    render(timestamp) {
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(timestamp);
        }
        this.renderOptionsButton();
        if (this.isOptionsOverlayActive() && this.optionsOverlay && this.optionsOverlay.render) {
            this.optionsOverlay.render(timestamp);
        }
    }

    handleInput(e) {
        if (this.isOptionsOverlayActive()) {
            if (this.optionsOverlay && this.optionsOverlay.handleInput) {
                this.optionsOverlay.handleInput(e);
            }
            return;
        }
        const p = this.getLogicalPointFromEvent(e);
        if (this.isOptionsButtonVisible() && this.isPointInOptionsButton(p.x, p.y)) {
            assets.playSound('ui_click', 0.4);
            this.openOptionsOverlay({ sourceScene: this.currentSceneKey });
            return;
        }
        if (this.currentScene && this.currentScene.handleInput) {
            this.currentScene.handleInput(e);
        }
    }

    handleKeyDown(e) {
        if (e && e.key === 'Escape') {
            if (this.isOptionsOverlayActive()) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                this.closeOptionsOverlay();
                return;
            }
            // Preserve legacy per-scene Escape behavior via Shift+Esc.
            if (!e.shiftKey) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                this.openOptionsOverlay({ sourceScene: this.currentSceneKey });
                return;
            }
        }
        if (this.isOptionsOverlayActive()) {
            if (this.optionsOverlay && this.optionsOverlay.handleKeyDown) {
                this.optionsOverlay.handleKeyDown(e);
            }
            return;
        }
        if (this.currentScene && this.currentScene.handleKeyDown) {
            this.currentScene.handleKeyDown(e);
        }
    }

    getLogicalPointFromEvent(e) {
        if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
            return this.getCanvasLogicalPoint(e);
        }
        return { x: this.logicalMouseX, y: this.logicalMouseY };
    }

    isOptionsButtonVisible() {
        return !!this.currentSceneKey && this.currentSceneKey !== 'title' && !this.isOptionsOverlayActive();
    }

    isPointInOptionsButton(x, y) {
        const r = this.optionsButtonRect;
        return !!r && Number.isFinite(x) && Number.isFinite(y)
            && x >= r.x && x <= r.x + r.w
            && y >= r.y && y <= r.y + r.h;
    }

    getOptionsButtonLayout() {
        const iconSize = 13;
        const hitPadding = 3;
        const iconX = Math.max(1, this.canvas.width - iconSize - 1);
        const iconY = 1;
        return {
            iconX,
            iconY,
            iconSize,
            hitPadding,
            hitX: Math.max(0, iconX - hitPadding),
            hitY: Math.max(0, iconY - hitPadding),
            hitSize: iconSize + hitPadding * 2
        };
    }

    renderOptionsButton() {
        if (!this.isOptionsButtonVisible()) {
            this.optionsButtonRect = null;
            return;
        }

        const icon = assets.getImage('settings_menu_icon');
        const { iconX, iconY, iconSize, hitX, hitY, hitSize } = this.getOptionsButtonLayout();
        this.optionsButtonRect = { x: hitX, y: hitY, w: hitSize, h: hitSize };

        this.ctx.save();
        if (icon) {
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(icon, iconX, iconY);
        } else {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillRect(iconX + 2, iconY + 2, 9, 2);
            this.ctx.fillRect(iconX + 2, iconY + 6, 9, 2);
            this.ctx.fillRect(iconX + 2, iconY + 10, 9, 2);
        }
        this.ctx.restore();
    }

    pollGamepad(timestamp) {
        // Steam Input bridge (optional via preload/steamworks.js)
        if (typeof window !== 'undefined' && window.steamInput && typeof window.steamInput.poll === 'function') {
            try {
                this._steamInputState = window.steamInput.poll() || this._steamInputState;
            } catch (_) {
                // Keep last known safe state; gamepad fallback remains active.
                this._steamInputState = {
                    up: false,
                    down: false,
                    left: false,
                    right: false,
                    confirm: false,
                    cancel: false
                };
            }
        } else {
            this._steamInputState = {
                up: false,
                down: false,
                left: false,
                right: false,
                confirm: false,
                cancel: false
            };
        }

        let gp = null;
        if (navigator.getGamepads) {
            const pads = navigator.getGamepads();
            if (pads) gp = Array.from(pads).find(Boolean);
        }
        if (!gp && !this._steamInputState.up && !this._steamInputState.down && !this._steamInputState.left && !this._steamInputState.right && !this._steamInputState.confirm && !this._steamInputState.cancel) {
            this._padRepeatState.clear();
            return;
        }

        const axisDeadzone = 0.5;
        const gpUp = gp ? ((gp.buttons[12] && gp.buttons[12].pressed) || gp.axes[1] < -axisDeadzone) : false;
        const gpDown = gp ? ((gp.buttons[13] && gp.buttons[13].pressed) || gp.axes[1] > axisDeadzone) : false;
        const gpLeft = gp ? ((gp.buttons[14] && gp.buttons[14].pressed) || gp.axes[0] < -axisDeadzone) : false;
        const gpRight = gp ? ((gp.buttons[15] && gp.buttons[15].pressed) || gp.axes[0] > axisDeadzone) : false;
        const gpConfirm = gp ? ((gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[9] && gp.buttons[9].pressed)) : false; // South face / Start
        // Cancel supports multiple common mappings across controllers:
        // East face (B/Circle), West face (X/Square on some remaps), and Back/View.
        const gpCancel = gp
            ? ((gp.buttons[1] && gp.buttons[1].pressed) ||
              (gp.buttons[2] && gp.buttons[2].pressed) ||
              (gp.buttons[8] && gp.buttons[8].pressed))
            : false;

        const up = gpUp || !!this._steamInputState.up;
        const down = gpDown || !!this._steamInputState.down;
        const left = gpLeft || !!this._steamInputState.left;
        const right = gpRight || !!this._steamInputState.right;
        const confirm = gpConfirm || !!this._steamInputState.confirm;
        const cancel = gpCancel || !!this._steamInputState.cancel;

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

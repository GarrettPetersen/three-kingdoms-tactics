import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';

export class NarrativeScene extends BaseScene {
    constructor() {
        super();
        this.script = [];
        this.currentStep = 0;
        this.actors = {}; // { id: { x, y, img, action, frame, flip, targetX, targetY } }
        this.isWaiting = false;
        this.timer = 0;
        this.fadeAlpha = 0;
        this.fadeTarget = 0;
        this.fadeSpeed = 0.002;
        this.elapsedInStep = 0;
        this.lastSaveTime = 0; // Track when we last saved state
        this.saveInterval = 2000; // Save every 2 seconds
    }

    enter(params) {
        const gs = this.manager.gameState;
        const isResume = params.isResume && gs.get('narrativeState');
        const savedState = isResume ? gs.get('narrativeState') : null;
        
        if (!isResume) {
            // Only set music on initial entry, not on resume (resume will restore it)
            if (params.musicKey) {
                assets.playMusic(params.musicKey, params.musicVolume || 0.5);
            } else if (params.keepMusic || assets.currentMusicKey === 'oath') {
                // Do nothing, keep current music if requested or if already playing oath music
            } else {
                assets.playMusic('narrative', 0.5);
            }
        }
        
        if (!isResume) {
            if (params.scriptId && NARRATIVE_SCRIPTS[params.scriptId]) {
                this.script = NARRATIVE_SCRIPTS[params.scriptId];
                this.scriptId = params.scriptId;
            } else {
                this.script = params.script || [];
                this.scriptId = null;
            }

            // Don't proceed if script is empty
            if (!this.script || this.script.length === 0) {
                console.error('Cannot enter narrative scene: script is empty', {
                    scriptId: params.scriptId,
                    hasScriptParam: !!params.script,
                    scriptParamLength: params.script ? params.script.length : 0
                });
                // Switch to map as fallback
                setTimeout(() => {
                    this.manager.switchTo('map');
                }, 100);
                return;
            }

            this.onComplete = params.onComplete || null;
            this.currentStep = 0;
            this.subStep = 0; // Track 3-line chunks for long dialogue
            this.actors = {};
            this.isWaiting = false;
            this.timer = 0;
            this.lastTime = 0;
            this.fadeAlpha = params.fadeAlpha !== undefined ? params.fadeAlpha : 1;
            this.fadeTarget = this.fadeAlpha;
            this.fadeSpeed = 0.002;
            this.processStep();
            // Save initial state
            this.saveNarrativeState();
        } else {
            // Restore saved state
            this.restoreNarrativeState(savedState);
        }
    }
    
    restoreNarrativeState(state) {
        if (!state) {
            console.error('Cannot restore: state is null');
            return;
        }
        
        this.scriptId = state.scriptId;
        if (this.scriptId && NARRATIVE_SCRIPTS[this.scriptId]) {
            // Restore from scriptId
            this.script = NARRATIVE_SCRIPTS[this.scriptId];
        } else if (this.scriptId && !NARRATIVE_SCRIPTS[this.scriptId]) {
            // scriptId exists but script doesn't exist in NARRATIVE_SCRIPTS
            console.error('Cannot restore: scriptId not found in NARRATIVE_SCRIPTS', {
                scriptId: this.scriptId,
                availableScripts: Object.keys(NARRATIVE_SCRIPTS)
            });
            // Clear the invalid narrative state and switch to map
            this.manager.gameState.set('narrativeState', null);
            this.script = [];
            setTimeout(() => {
                this.manager.switchTo('map');
            }, 100);
            return;
        } else if (state.script && Array.isArray(state.script) && state.script.length > 0) {
            // Custom script (no scriptId) - only use if it's not empty
            this.script = state.script;
        } else {
            // No valid script found - this includes empty arrays
            console.error('Cannot restore: invalid or empty script state', {
                scriptId: this.scriptId,
                hasScriptId: !!this.scriptId,
                scriptExists: this.scriptId ? !!NARRATIVE_SCRIPTS[this.scriptId] : false,
                hasStateScript: !!state.script,
                stateScriptIsArray: Array.isArray(state.script),
                stateScriptLength: state.script ? state.script.length : 0,
                availableScripts: Object.keys(NARRATIVE_SCRIPTS)
            });
            // Clear the invalid narrative state and switch to map
            this.manager.gameState.set('narrativeState', null);
            this.script = [];
            // Switch to map as a safe fallback
            setTimeout(() => {
                this.manager.switchTo('map');
            }, 100);
            return; // Don't continue if we can't restore the script
        }
        
        // Validate currentStep after restoring script
        if (state.currentStep >= this.script.length || state.currentStep < 0) {
            // Script has completed - transition to next scene instead of trying to render
            console.warn('Restoring completed script - transitioning to next scene', {
                scriptId: this.scriptId,
                currentStep: state.currentStep,
                scriptLength: this.script.length
            });
            // Clear the narrative state
            this.manager.gameState.set('narrativeState', null);
            
            // Try to transition to the next scene if we have that info
            if (state.nextScene) {
                this.manager.switchTo(state.nextScene, state.nextParams || {});
            } else {
                // Default to map if no next scene info
                this.manager.switchTo('map');
            }
            return;
        }
        
        // First, restore actors from saved state (they contain the result of all previous commands)
        // But we need to reload images since they can't be serialized
        const savedActors = state.actors || {};
        this.actors = {};
        for (const [id, actor] of Object.entries(savedActors)) {
            // Reconstruct actor with proper image loading
            this.actors[id] = {
                x: actor.x || 0,
                y: actor.y || 0,
                imgKey: actor.imgKey,
                img: actor.imgKey ? assets.getImage(actor.imgKey) : null,
                action: actor.action || 'standby',
                frame: actor.frame || 0,
                flip: actor.flip || false,
                targetX: actor.targetX !== undefined ? actor.targetX : actor.x || 0,
                targetY: actor.targetY !== undefined ? actor.targetY : actor.y || 0,
                speed: actor.speed || 1
            };
        }
        
        // Execute commands up to (but not including) the current step to ensure scene is set up
        // This handles things like backgrounds, fades, etc. that aren't in the actors state
        const targetStep = state.currentStep || 0;
        for (let i = 0; i < targetStep; i++) {
            const step = this.script[i];
            if (step && step.type === 'command') {
                this.handleCommandForResume(step);
            }
        }
        
        // Now restore the state at the current step
        this.currentStep = targetStep;
        this.subStep = state.subStep || 0;
        this.isWaiting = state.isWaiting || false;
        this.timer = state.timer || 0;
        this.fadeAlpha = state.fadeAlpha !== undefined ? state.fadeAlpha : 1;
        this.fadeTarget = state.fadeTarget !== undefined ? state.fadeTarget : this.fadeAlpha;
        this.fadeSpeed = state.fadeSpeed || 0.002;
        this.elapsedInStep = state.elapsedInStep || 0;
        this.onComplete = null; // Don't restore callbacks
        
        // Restore music if it was saved
        if (state.musicKey && assets.currentMusicKey !== state.musicKey) {
            assets.playMusic(state.musicKey, 0.5);
        }
        
        // Set up the current step for rendering (but don't replay voice)
        const step = this.script[this.currentStep];
        if (step) {
            // Initialize selection system if it's a choice
            if (step.type === 'choice') {
                this.initSelection({
                    defaultIndex: 0,
                    totalOptions: step.options ? step.options.length : 0
                });
            }
            
            // Don't replay voice on resume - user already heard it
            // Timer and isWaiting already restored from saved state
        }
    }
    
    handleCommandForResume(cmd) {
        // Handle commands during resume without advancing steps
        if (cmd.action === 'addActor') {
            // Actor should already be in saved actors, but ensure it exists
            if (!this.actors[cmd.id]) {
                this.actors[cmd.id] = {
                    x: cmd.x,
                    y: cmd.y,
                    imgKey: cmd.imgKey,
                    img: assets.getImage(cmd.imgKey),
                    action: 'standby',
                    frame: 0,
                    flip: cmd.flip || false,
                    targetX: cmd.x,
                    targetY: cmd.y,
                    speed: cmd.speed || 1
                };
            }
            // Don't call nextStep() on resume
        } else if (cmd.action === 'move') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.targetX = cmd.x;
                actor.targetY = cmd.y;
                if (cmd.wait) {
                    // Don't advance on resume
                }
            }
        } else if (cmd.action === 'flip') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.flip = cmd.flip !== undefined ? cmd.flip : !actor.flip;
            }
        } else if (cmd.action === 'animate') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.action = cmd.animation || 'standby';
                actor.frame = 0;
            }
        } else if (cmd.action === 'removeActor') {
            // Actor removal should be reflected in saved actors state
            // But if it's not, remove it
            if (this.actors[cmd.id]) {
                delete this.actors[cmd.id];
            }
        } else if (cmd.action === 'clearActors') {
            // Should be reflected in saved state, but clear if needed
            this.actors = {};
        } else if (cmd.action === 'fade') {
            this.fadeTarget = cmd.target;
            this.fadeSpeed = cmd.speed || 0.002;
        } else if (cmd.action === 'wait') {
            // Timer already restored from saved state
        } else if (cmd.action === 'playMusic') {
            // Restore music during resume - it may have been lost on page refresh
            if (assets.currentMusicKey !== cmd.key) {
                assets.playMusic(cmd.key, cmd.volume || 0.5);
            }
        }
        // Don't call nextStep() for any command during resume
    }
    
    exit() {
        // Save narrative state when leaving (also saved on every step change)
        this.saveNarrativeState();
    }

    processStep() {
        const step = this.script[this.currentStep];
        if (!step) return;

        this.elapsedInStep = 0;

        // Initialize selection system when entering a choice step
        if (step.type === 'choice') {
            this.initSelection({
                defaultIndex: 0,
                totalOptions: step.options ? step.options.length : 0
            });
        }

        // Trigger voice if present
        if (step.voiceId) {
            assets.playVoice(step.voiceId);
        }

        if (step.type === 'command') {
            this.handleCommand(step);
        } else if ((step.type === 'title' || step.type === 'dialogue' || step.type === 'narrator') && step.duration) {
            this.timer = step.duration;
            this.isWaiting = true;
        }
    }

    handleCommand(cmd) {
        if (cmd.action === 'addActor') {
            this.actors[cmd.id] = {
                x: cmd.x,
                y: cmd.y,
                imgKey: cmd.imgKey,
                img: assets.getImage(cmd.imgKey),
                action: 'standby',
                frame: 0,
                flip: cmd.flip || false,
                targetX: cmd.x,
                targetY: cmd.y,
                speed: cmd.speed || 1
            };
            this.nextStep();
        } else if (cmd.action === 'move') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.targetX = cmd.x;
                actor.targetY = cmd.y;
                actor.action = 'walk';
                if (cmd.wait !== false) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'animate') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.action = cmd.animation;
                actor.frame = 0;
                if (cmd.wait) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'wait') {
            this.timer = cmd.duration;
            this.isWaiting = true;
        } else if (cmd.action === 'flip') {
            if (this.actors[cmd.id]) this.actors[cmd.id].flip = cmd.flip;
            this.nextStep();
        } else if (cmd.action === 'removeActor') {
            delete this.actors[cmd.id];
            this.nextStep();
        } else if (cmd.action === 'clearActors') {
            this.actors = {};
            this.nextStep();
        } else if (cmd.action === 'fade') {
            this.fadeTarget = cmd.target;
            this.fadeSpeed = cmd.speed || 0.002;
            if (this.fadeAlpha === this.fadeTarget) {
                this.nextStep();
            } else {
                if (cmd.wait !== false) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            }
        } else if (cmd.action === 'playMusic') {
            assets.playMusic(cmd.key, cmd.volume || 0.5);
            this.nextStep();
        }
    }

    nextStep() {
        const step = this.script[this.currentStep];
        if (step && (step.type === 'dialogue' || step.type === 'narrator')) {
            if (this.hasNextChunk) {
                this.subStep++;
                this.elapsedInStep = 0; // Reset timer for the next chunk
                this.saveNarrativeState(); // Save state after advancing
                return;
            }
        }

        this.subStep = 0;
        this.currentStep++;
        this.isWaiting = false;
        this.timer = 0;

        if (this.currentStep >= this.script.length) {
            // Clear narrative state when script completes
            const savedState = this.manager.gameState.get('narrativeState');
            this.manager.gameState.set('narrativeState', null);
            
            // Use onComplete if available, otherwise use saved nextScene info
            if (this.onComplete) {
                this.onComplete();
                return;
            } else if (savedState && savedState.nextScene) {
                // Restore transition from saved state (onComplete was lost during restore)
                // Handle special cases that need milestones or other side effects
                if (this.scriptId === 'inn') {
                    // Add milestone when inn scene completes (normally done in onComplete)
                    this.manager.gameState.addMilestone('prologue_complete');
                }
                this.manager.switchTo(savedState.nextScene, savedState.nextParams || {});
                return;
            }
            // If no transition info, default to map
            this.manager.switchTo('map');
            return;
        } else {
            // Save state after advancing to next step
            this.saveNarrativeState();
        }
        
        this.processStep();
    }
    
    saveNarrativeState() {
        // Save narrative state whenever it changes (for page refresh recovery)
        const gs = this.manager.gameState;
        
        // Don't save if script is empty or invalid
        if (!this.script || this.script.length === 0) {
            console.warn('Not saving narrative state: script is empty', {
                scriptId: this.scriptId,
                currentStep: this.currentStep
            });
            // Clear any existing invalid state
            gs.set('narrativeState', null);
            return;
        }
        
        // Don't save if currentStep is out of bounds (script has completed)
        if (this.currentStep >= this.script.length) {
            console.warn('Not saving narrative state: script has completed', {
                scriptId: this.scriptId,
                currentStep: this.currentStep,
                scriptLength: this.script.length
            });
            // Clear any existing invalid state
            gs.set('narrativeState', null);
            return;
        }
        
        // Save next scene transition info (can't serialize onComplete callback)
        // Always try to determine next scene from scriptId, even if onComplete is null
        // This ensures we can transition correctly after restore
        let nextScene = this.getNextSceneForScriptId(this.scriptId);
        let nextParams = this.getNextParamsForScriptId(this.scriptId);
        
        const state = {
            scriptId: this.scriptId,
            script: this.scriptId ? null : (this.script && this.script.length > 0 ? this.script : null), // Only save script if not using scriptId and it's not empty
            currentStep: this.currentStep,
            subStep: this.subStep,
            actors: this.actors,
            nextScene: nextScene,
            nextParams: nextParams,
            isWaiting: this.isWaiting,
            timer: this.timer,
            fadeAlpha: this.fadeAlpha,
            fadeTarget: this.fadeTarget,
            fadeSpeed: this.fadeSpeed,
            elapsedInStep: this.elapsedInStep,
            musicKey: assets.currentMusicKey || null // Save current music
        };
        gs.set('narrativeState', state);
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        this.elapsedInStep += dt;
        
        // Periodic state saving for crash recovery
        if (timestamp - this.lastSaveTime > this.saveInterval) {
            this.saveNarrativeState();
            this.lastSaveTime = timestamp;
        }

        // Mouse tracking for hover effects in choices
        const currentMouseX = this.manager.logicalMouseX;
        const currentMouseY = this.manager.logicalMouseY;
        
        // Update selection mouse tracking
        const step = this.script[this.currentStep];
        if (step && step.type === 'choice' && this.selection) {
            this.updateSelectionMouse(currentMouseX, currentMouseY);
        }
        
        this.lastMouseX = currentMouseX;
        this.lastMouseY = currentMouseY;

        if (this.timer > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                this.nextStep();
            }
        }

        // Fade handling
        if (this.fadeAlpha !== this.fadeTarget) {
            const diff = this.fadeTarget - this.fadeAlpha;
            const step = this.fadeSpeed * dt;
            if (Math.abs(diff) < step) {
                this.fadeAlpha = this.fadeTarget;
                if (this.isWaiting) this.nextStep();
            } else {
                this.fadeAlpha += Math.sign(diff) * step;
            }
        }

        // Determine current speaker for animation (only speaker animates during dialogue)
        const currentStep = this.script[this.currentStep];
        let currentSpeakerId = null;
        if (currentStep && currentStep.type === 'dialogue' && currentStep.portraitKey) {
            // Convert portrait key to actor id (e.g., 'zhou-jing' -> 'zhoujing', 'liu-bei' -> 'liubei')
            currentSpeakerId = currentStep.portraitKey.replace(/-/g, '');
        }

        let allMoved = true;
        for (let id in this.actors) {
            const a = this.actors[id];
            
            // Only animate the speaking actor during dialogue, or actors that are moving/attacking
            const isMoving = Math.abs(a.targetX - a.x) > 1 || Math.abs(a.targetY - a.y) > 1;
            const isSpecialAction = a.action === 'hit' || a.action === 'attack_1' || a.action === 'attack_2' || a.action === 'walk';
            const isSpeaking = currentSpeakerId && id === currentSpeakerId;
            const shouldAnimate = isMoving || isSpecialAction || isSpeaking || !currentStep || currentStep.type !== 'dialogue';
            
            // Animation
            const anim = ANIMATIONS[a.action] || ANIMATIONS.standby;
            
            if (a.action === 'recovery') {
                // Special logic for drinking: stay on frame 0 (holding bowl) mostly,
                // occasionally play the 4-frame animation once.
                if (!a.isAnimating) {
                    a.frame = 0;
                    // Random chance to start drinking
                    if (Math.random() < 0.005) {
                        a.isAnimating = true;
                    }
                } else {
                    a.frame += dt * 0.006;
                    if (a.frame >= anim.length) {
                        a.frame = 0;
                        a.isAnimating = false;
                    }
                }
            } else if (shouldAnimate) {
                a.frame += dt * 0.008;
                if (a.frame >= anim.length) {
                    if (a.action === 'hit' || a.action === 'attack_1' || a.action === 'attack_2') {
                        a.action = 'standby';
                        if (this.isWaiting) this.nextStep();
                    }
                    a.frame = 0;
                }
            } else {
                // Non-speaking actors during dialogue: stay on frame 0
                a.frame = 0;
            }

            // Movement
            const dx = a.targetX - a.x;
            const dy = a.targetY - a.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 1) {
                allMoved = false;
                let moveDist = a.speed * (dt / 16);
                
                // Cap movement to prevent overshooting
                if (moveDist > dist) moveDist = dist;
                
                // Auto-flip based on movement direction
                // Sprites face RIGHT by default
                if (dx > 0.1) a.flip = false; // Moving Right -> Face Right (default)
                if (dx < -0.1) a.flip = true;  // Moving Left -> Flip to face Left
                
                a.x += (dx / dist) * moveDist;
                a.y += (dy / dist) * moveDist;
            } else {
                a.x = a.targetX;
                a.y = a.targetY;
                if (a.action === 'walk') a.action = 'standby';
            }
        }

        if (this.isWaiting && allMoved && this.timer === 0 && this.fadeAlpha === this.fadeTarget) {
            const step = this.script[this.currentStep];
            if (step && step.type === 'command') {
                this.nextStep();
            }
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        // Ensure script is loaded and currentStep is valid
        if (!this.script || this.script.length === 0) {
            console.error('Cannot render: script is empty', {
                scriptId: this.scriptId,
                hasScript: !!this.script,
                scriptLength: this.script ? this.script.length : 0,
                currentStep: this.currentStep,
                availableScripts: Object.keys(NARRATIVE_SCRIPTS)
            });
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Try to recover by going to map
            if (this.scriptId) {
                console.warn('Attempting recovery: switching to map');
                setTimeout(() => {
                    this.manager.switchTo('map');
                }, 1000);
            }
            return;
        }
        
        if (this.currentStep < 0 || this.currentStep >= this.script.length) {
            console.error('Cannot render: invalid currentStep', this.currentStep, 'script length:', this.script.length);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        const step = this.script[this.currentStep];
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Background
        let bgKey = step?.bg;
        if (!bgKey) {
            for (let i = this.currentStep; i >= 0; i--) {
                if (this.script[i].bg) {
                    bgKey = this.script[i].bg;
                    break;
                }
            }
        }

        let bgX = 0;
        let bgY = 0;
        let bgWidth = 0;
        let bgHeight = 0;
        
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgWidth = bg.width;
                bgHeight = bg.height;
                bgX = Math.floor((canvas.width - bgWidth) / 2);
                bgY = Math.floor((canvas.height - bgHeight) / 2);
                ctx.drawImage(bg, bgX, bgY, bgWidth, bgHeight);
            }
        }

        // Actors - Clipped to background area
        ctx.save();
        if (bgKey && bgWidth > 0 && bgHeight > 0) {
            ctx.beginPath();
            ctx.rect(bgX, bgY, bgWidth, bgHeight);
            ctx.clip();
        }

        const sortedActors = Object.values(this.actors).sort((a, b) => a.y - b.y);
        sortedActors.forEach(a => {
            if (!a.img && a.imgKey) {
                a.img = assets.getImage(a.imgKey);
            }
            this.drawCharacter(ctx, a.img, a.action, a.frame, bgX + a.x, bgY + a.y, { flip: a.flip });
        });
        ctx.restore();

        // Fade overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (step && step.type === 'title') {
            this.renderTitleCard(step);
        } else if (step && (step.type === 'dialogue' || step.type === 'narrator')) {
            let bgKey = step?.bg;
            if (!bgKey) {
                for (let i = this.currentStep; i >= 0; i--) {
                    if (this.script[i].bg) {
                        bgKey = this.script[i].bg;
                        break;
                    }
                }
            }
            const bgImg = bgKey ? assets.getImage(bgKey) : null;
            const status = this.renderDialogueBox(ctx, canvas, step, { 
                subStep: this.subStep,
                bgImg: bgImg 
            });
            this.hasNextChunk = status.hasNextChunk;
        } else if (step && step.type === 'choice') {
            this.renderChoice(step);
        } else if (step && step.type === 'prompt') {
            this.renderPrompt(step);
        }
    }

    renderPrompt(step) {
        const { ctx, canvas } = this.manager;
        const cx = Math.floor(canvas.width / 2);
        
        // Settings for the "To Inn" style prompt
        const w = 60;
        const h = 25;
        const margin = 10;
        
        let px = margin;
        let py = Math.floor(canvas.height / 2) - Math.floor(h / 2);
        
        if (step.position === 'right') {
            px = canvas.width - w - margin;
        }

        const isHovered = this.lastMouseX >= px && this.lastMouseX <= px + w &&
                          this.lastMouseY >= py && this.lastMouseY <= py + h;

        // Draw Box
        ctx.fillStyle = isHovered ? 'rgba(40, 40, 40, 0.95)' : 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, w, h);
        ctx.strokeStyle = isHovered ? '#fff' : '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);

        // Draw Arrow pointing left
        const pulse = Math.abs(Math.sin(Date.now() / 400)) * 5;
        if (step.position !== 'right') {
            ctx.fillStyle = isHovered ? '#fff' : '#ffd700';
            ctx.beginPath();
            ctx.moveTo(px - 5 - pulse, py + h / 2);
            ctx.lineTo(px + 2 - pulse, py + h / 2 - 5);
            ctx.lineTo(px + 2 - pulse, py + h / 2 + 5);
            ctx.fill();
        } else {
            // Arrow pointing right
            ctx.fillStyle = isHovered ? '#fff' : '#ffd700';
            ctx.beginPath();
            ctx.moveTo(px + w + 5 + pulse, py + h / 2);
            ctx.lineTo(px + w - 2 + pulse, py + h / 2 - 5);
            ctx.lineTo(px + w - 2 + pulse, py + h / 2 + 5);
            ctx.fill();
        }

        this.drawPixelText(ctx, step.text, px + Math.floor(w / 2), py + Math.floor(h / 2) - 4, {
            color: isHovered ? '#fff' : '#ffd700',
            font: '8px Silkscreen',
            align: 'center'
        });

        // Store metadata for hit detection
        step._rect = { x: px, y: py, w, h };
    }

    renderChoice(step) {
        const { ctx, canvas } = this.manager;
        const options = step.options || [];
        const padding = 10;
        const lineSpacing = 12;
        const optionSpacing = 8;
        const panelWidth = 200;
        
        // Pre-calculate wrapped lines and total height
        const wrappedOptions = options.map(opt => {
            const lines = [];
            // ALWAYS use buttonText for display in the choice box (it's the abbreviated version)
            // Only fall back to text if buttonText is not provided
            const displayText = (opt.buttonText !== undefined && opt.buttonText !== null) ? opt.buttonText : opt.text;
            const words = displayText.split(' ');
            let currentLine = '';
            
            ctx.save();
            ctx.font = '8px Dogica';
            for (let n = 0; n < words.length; n++) {
                let testLine = currentLine + words[n] + ' ';
                if (ctx.measureText(testLine).width > (panelWidth - 20) && n > 0) {
                    lines.push(currentLine.trim());
                    currentLine = words[n] + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine.trim());
            ctx.restore();
            return lines;
        });

        let totalContentHeight = 0;
        wrappedOptions.forEach(lines => {
            totalContentHeight += lines.length * lineSpacing + optionSpacing;
        });
        
        const panelHeight = totalContentHeight + padding * 2;
        const px = Math.floor((canvas.width - panelWidth) / 2);
        const py = Math.floor((canvas.height - panelHeight) / 2);

        // Panel Background
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        let currentY = py + padding;
        wrappedOptions.forEach((lines, i) => {
            const optionTopY = currentY;
            const optionHeight = lines.length * lineSpacing;
            
            // Check if mouse is over this option
            const isMouseOver = this.lastMouseX >= px && this.lastMouseX <= px + panelWidth &&
                              this.lastMouseY >= optionTopY && this.lastMouseY <= optionTopY + optionHeight + optionSpacing;
            
            // Update highlighted index on mouseover (only if mouseover is enabled)
            if (isMouseOver && this.selection) {
                this.handleSelectionMouseover(i);
            }
            
            // Highlight if it's the currently highlighted option
            const isHovered = this.selection && this.selection.highlightedIndex === i;

            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                ctx.fillRect(px + 2, optionTopY - 2, panelWidth - 4, optionHeight + 4);
            }

            lines.forEach((line, lineIdx) => {
                this.drawPixelText(ctx, line, px + 10, optionTopY + lineIdx * lineSpacing, { 
                    color: isHovered ? '#fff' : '#ccc', 
                    font: '8px Dogica' 
                });
            });

            currentY += optionHeight + optionSpacing;
        });

        // Store panel metadata for input handling
        step._panelMetadata = { px, py, panelWidth, panelHeight, wrappedOptions, padding, lineSpacing, optionSpacing };
    }

    renderTitleCard(step) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = Math.floor(canvas.width / 2);
        const cy = Math.floor(canvas.height / 2);
        
        this.drawPixelText(ctx, step.text, cx, cy - 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        if (step.subtext) {
            this.drawPixelText(ctx, step.subtext, cx, cy + 6, { color: '#eee', font: '8px Silkscreen', align: 'center' });
        }

        // Pulse "CLICK TO CONTINUE" if player is waiting
        if (this.elapsedInStep > 3500) {
            const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;
            ctx.globalAlpha = pulse;
            this.drawPixelText(ctx, "CLICK TO CONTINUE", cx, canvas.height - 30, { 
                color: '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            ctx.globalAlpha = 1.0;
        }
    }

    handleInput(e) {
        const step = this.script[this.currentStep];
        
        // Cooldown to prevent accidental double-clicks and glitches when skipping too fast
        if (this.elapsedInStep < 250) return;

        // Allow advancing dialogue/title even if isWaiting (e.g. during a duration timer)
        const canForceAdvance = step && (step.type === 'dialogue' || step.type === 'title' || step.type === 'narrator');
        
        if (this.isWaiting && !canForceAdvance) return;

        let x = -1000, y = -1000;
        if (e && e.clientX !== undefined) {
            const pos = this.getMousePos(e);
            x = pos.x;
            y = pos.y;
        }

        if (step && step.type === 'choice' && step._panelMetadata) {
            const m = step._panelMetadata;
            
            // Re-enable mouseover on any mouse interaction
            if (x !== -1000 && y !== -1000) {
                if (this.selection) {
                    this.handleSelectionMouseClick();
                }
                
                // Handle mouse clicks
                let currentY = m.py + m.padding;
                
                step.options.forEach((opt, i) => {
                    const lines = m.wrappedOptions[i];
                    const optionHeight = lines.length * m.lineSpacing;
                    
                    if (x >= m.px && x <= m.px + m.panelWidth && 
                        y >= currentY - 2 && y <= currentY + optionHeight + 2) {
                        // Create a dialogue step for the choice so it gets voiced and displayed
                        const choiceDialogue = {
                            type: 'dialogue',
                            portraitKey: step.portraitKey || 'liubei',
                            name: step.name || 'Liu Bei',
                            text: opt.text,
                            voiceId: opt.voiceId
                        };

                        const resultSteps = opt.result || [];
                        this.script.splice(this.currentStep + 1, 0, choiceDialogue, ...resultSteps);
                        
                        this.nextStep();
                    }
                    currentY += optionHeight + m.optionSpacing;
                });
            }
            return;
        }

        if (step && step.type === 'prompt' && step._rect) {
            const r = step._rect;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                assets.playSound('ui_click');
                this.nextStep();
            }
            return;
        }
        
        // Advance script on any pointerdown (if not waiting for command)
        if (step && (step.type === 'dialogue' || step.type === 'title' || step.type === 'narrator')) {
            this.nextStep();
        }
    }

    handleKeyDown(e) {
        const step = this.script[this.currentStep];
        
        // Handle choice navigation using reusable selection system
        if (step && step.type === 'choice' && step._panelMetadata && this.selection) {
            const options = step.options || [];
            const handled = this.handleSelectionKeyboard(e, (selectedIndex) => {
                // Select the currently highlighted choice
                const opt = options[selectedIndex];
                if (opt) {
                    // Create a dialogue step for the choice so it gets voiced and displayed
                    const choiceDialogue = {
                        type: 'dialogue',
                        portraitKey: step.portraitKey || 'liubei',
                        name: step.name || 'Liu Bei',
                        text: opt.text,
                        voiceId: opt.voiceId
                    };

                    const resultSteps = opt.result || [];
                    this.script.splice(this.currentStep + 1, 0, choiceDialogue, ...resultSteps);
                    
                    this.nextStep();
                }
            });
            if (handled) return;
        }
        
        // Default behavior for other steps
        if (e.key === 'Enter' || e.key === ' ') {
            this.handleInput(e);
        }
    }
    
    getNextSceneForScriptId(scriptId) {
        // Map scriptId to the next scene that should be shown after completion
        // This is used when restoring from saved state (onComplete callbacks can't be serialized)
        if (!scriptId) return null;
        
        const nextSceneMap = {
            'intro_poem': 'campaign_selection',
            'daxing_messenger': 'map',
            'guangzong_arrival': 'map',
            'noticeboard': 'narrative', // Goes to inn scene next
            'inn': 'map',
            'qingzhou_victory': 'narrative', // Goes to qingzhou_gate_return next (but this is called from battle, so handled differently)
            'qingzhou_gate_return': 'map',
            // Add more mappings as needed
        };
        
        return nextSceneMap[scriptId] || null;
    }
    
    getNextParamsForScriptId(scriptId) {
        // Get the params for the next scene based on scriptId
        if (!scriptId) return null;
        
        const paramsMap = {
            'daxing_messenger': { afterEvent: 'daxing' },
            'guangzong_arrival': { campaignId: 'liubei' },
            'noticeboard': { scriptId: 'inn' }, // Chain to inn scene
            'inn': {}, // After inn, goes to map (milestone added in onComplete)
            'qingzhou_victory': { scriptId: 'qingzhou_gate_return' }, // Chain to gate return
            'qingzhou_gate_return': {}, // After gate return, goes to map
            // Add more mappings as needed
        };
        
        return paramsMap[scriptId] || null;
    }
}

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
        this.isInteractive = false; // Whether we're in interactive mode (point-and-click)
        this.interactiveStepIndex = -1; // Track which step is the interactive step
        this.clickableActors = {}; // { actorId: { onClick: function or script steps } }
        this.clickableRegions = {}; // { regionId: { x, y, w, h, onClick: script steps } }
        this.hoveredActor = null; // Currently hovered actor ID
        this.hoveredRegion = null; // Currently hovered region ID
        this.scriptLabels = {}; // { labelName: stepIndex } - map of label names to script indices
        this.returnStack = []; // Stack of return positions for branching
        this.insertedStepsCount = 0; // Track how many steps were inserted after interactive step
        this.insertedStepsStartIndex = -1; // Track where inserted steps start (for cleanup)
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
        this.isInteractive = state.isInteractive || false;
        this.interactiveStepIndex = state.interactiveStepIndex !== undefined ? state.interactiveStepIndex : -1;
        this.clickableActors = state.clickableActors || {};
        this.clickableRegions = state.clickableRegions || {};
        this.returnStack = state.returnStack ? [...state.returnStack] : [];
        this.insertedStepsCount = state.insertedStepsCount || 0;
        this.insertedStepsStartIndex = state.insertedStepsStartIndex !== undefined ? state.insertedStepsStartIndex : -1;
        this.hoveredActor = null; // Reset hover state on restore
        this.hoveredRegion = null; // Reset hover state on restore
        this.onComplete = null; // Don't restore callbacks
        
        // Critical: If we're in interactive mode, ensure currentStep is at the interactive step
        // This prevents accidentally being past the interactive step after restore
        if (this.isInteractive && this.interactiveStepIndex >= 0) {
            // If currentStep is past the interactive step, reset to interactive step
            // This can happen if state was saved incorrectly or if inserted steps weren't cleaned up
            if (this.currentStep > this.interactiveStepIndex) {
                console.warn('Restoring interactive state: currentStep was past interactive step, resetting', {
                    currentStep: this.currentStep,
                    interactiveStepIndex: this.interactiveStepIndex
                });
                this.currentStep = this.interactiveStepIndex;
                this.isWaiting = true;
                // Clear any inserted steps tracking since we're resetting
                this.insertedStepsCount = 0;
                this.insertedStepsStartIndex = -1;
            }
        }
        
        // Rebuild label map for jump/goto functionality
        this.buildLabelMap();
        
        // Restore music if it was saved
        if (state.musicKey && assets.currentMusicKey !== state.musicKey) {
            assets.playMusic(state.musicKey, 0.5);
        }
        
        // Set up the current step for rendering (but don't replay voice)
        const step = this.script[this.currentStep];
        if (step) {
            // If we're at an interactive step, we need to process it to set up clickable elements
            // But we don't want to replay voice or re-execute commands
            if (step.type === 'interactive' && this.isInteractive) {
                // Just set up the clickable elements without replaying voice
                this.clickableActors = step.clickableActors || {};
                this.clickableRegions = step.clickableRegions || {};
            } else if (step.type === 'choice') {
                // Initialize selection system if it's a choice
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

        // Build label map if not already built (for jump/goto functionality)
        if (Object.keys(this.scriptLabels).length === 0) {
            this.buildLabelMap();
        }

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
        } else if (step.type === 'label') {
            // Label step - just a marker, advance immediately
            this.nextStep();
        } else if (step.type === 'interactive') {
            // Enter interactive mode - pause script and enable click detection
            this.isInteractive = true;
            this.interactiveStepIndex = this.currentStep; // Remember which step is interactive
            this.isWaiting = true;
            // Set up clickable actors from step definition
            this.clickableActors = step.clickableActors || {};
            // Set up clickable regions from step definition
            this.clickableRegions = step.clickableRegions || {};
            // Clear hover state
            this.hoveredActor = null;
            this.hoveredRegion = null;
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
        } else if (cmd.action === 'setClickable') {
            // Make an actor clickable: { action: 'setClickable', id: 'actorId', onClick: [...] }
            if (!this.clickableActors) {
                this.clickableActors = {};
            }
            this.clickableActors[cmd.id] = {
                onClick: cmd.onClick || null // Can be script steps array or null
            };
            this.nextStep();
        } else if (cmd.action === 'clearClickable') {
            // Remove clickable status from an actor
            if (this.clickableActors && this.clickableActors[cmd.id]) {
                delete this.clickableActors[cmd.id];
            }
            this.nextStep();
        } else if (cmd.action === 'clearAllClickable') {
            // Clear all clickable actors and regions
            this.clickableActors = {};
            this.clickableRegions = {};
            this.nextStep();
        } else if (cmd.action === 'setClickableRegion') {
            // Make a region clickable: { action: 'setClickableRegion', id: 'regionId', x, y, w, h, onClick: [...] }
            if (!this.clickableRegions) {
                this.clickableRegions = {};
            }
            this.clickableRegions[cmd.id] = {
                x: cmd.x || 0,
                y: cmd.y || 0,
                w: cmd.w || 100,
                h: cmd.h || 100,
                onClick: cmd.onClick || null
            };
            this.nextStep();
        } else if (cmd.action === 'clearClickableRegion') {
            // Remove clickable status from a region
            if (this.clickableRegions && this.clickableRegions[cmd.id]) {
                delete this.clickableRegions[cmd.id];
            }
            this.nextStep();
        } else if (cmd.action === 'jump') {
            // Jump to a label: { action: 'jump', label: 'labelName' }
            const labelName = cmd.label;
            if (this.scriptLabels[labelName] !== undefined) {
                this.currentStep = this.scriptLabels[labelName];
                this.isWaiting = false;
                this.timer = 0;
                this.subStep = 0;
                this.processStep();
            } else {
                console.warn(`Jump to unknown label: ${labelName}`);
                this.nextStep();
            }
        } else if (cmd.action === 'return') {
            // Return to a saved position: { action: 'return' }
            // Pops the last position from returnStack
            if (this.returnStack.length > 0) {
                const returnPos = this.returnStack.pop();
                this.currentStep = returnPos;
                this.isWaiting = false;
                this.timer = 0;
                this.subStep = 0;
                this.processStep();
            } else {
                console.warn('Return called but returnStack is empty');
                this.nextStep();
            }
        } else if (cmd.action === 'saveReturn') {
            // Save current position for return: { action: 'saveReturn' }
            this.returnStack.push(this.currentStep);
            this.nextStep();
        }
    }

    buildLabelMap() {
        // Build a map of label names to script indices for jump/goto functionality
        this.scriptLabels = {};
        this.script.forEach((step, index) => {
            if (step.type === 'label' && step.name) {
                this.scriptLabels[step.name] = index;
            }
        });
    }

    nextStep() {
        const step = this.script[this.currentStep];
        
        // Don't advance past an interactive step - wait for user click
        // EXCEPT: if we've inserted dialogue steps after the interactive step (for NPC clicks),
        // we need to allow advancing to show that dialogue
        if (step && step.type === 'interactive' && this.isInteractive) {
            // Check if there are inserted steps after this interactive step
            // (NPC dialogue that was inserted via onClick)
            if (this.currentStep + 1 < this.script.length) {
                const nextStep = this.script[this.currentStep + 1];
                // If the next step is dialogue/narrator, allow advancing to show it
                if (nextStep && (nextStep.type === 'dialogue' || nextStep.type === 'narrator')) {
                    // Allow advancing - we'll return to interactive step after dialogue
                } else {
                    // No inserted dialogue - this shouldn't happen
                    console.warn('nextStep() called while on interactive step with no inserted dialogue - this should not happen');
                    return;
                }
            } else {
                // No next step - this shouldn't happen
                console.warn('nextStep() called while on interactive step with no next step - this should not happen');
                return;
            }
        }
        
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

        // After advancing, check if we've passed inserted NPC dialogue
        // If we were in interactive mode and have passed all inserted dialogue, return to interactive step
        if (this.isInteractive && this.interactiveStepIndex >= 0 && this.currentStep > this.interactiveStepIndex) {
            const currentStep = this.script[this.currentStep];
            // Check if current step is NOT an inserted step (meaning we've reached original script)
            // If it's not marked as inserted, we've passed all inserted dialogue
            if (!currentStep || !currentStep._isInserted) {
                // Check if the last inserted step (the one we just passed) was marked to advance the plot
                // The last inserted step would be at insertedStepsStartIndex + insertedStepsCount - 1
                const lastInsertedIndex = this.insertedStepsStartIndex >= 0 && this.insertedStepsCount > 0
                    ? this.insertedStepsStartIndex + this.insertedStepsCount - 1
                    : -1;
                const shouldAdvance = lastInsertedIndex >= 0 && this.script[lastInsertedIndex]?._advanceAfterThis;
                
                // Remove all inserted steps
                if (this.insertedStepsCount > 0 && this.insertedStepsStartIndex >= 0) {
                    // Remove inserted steps from the script
                    const startIdx = this.insertedStepsStartIndex;
                    this.script.splice(startIdx, this.insertedStepsCount);
                    // Adjust currentStep if it was affected by removal
                    if (this.currentStep >= startIdx) {
                        this.currentStep -= this.insertedStepsCount;
                    }
                    // Reset tracking
                    this.insertedStepsCount = 0;
                    this.insertedStepsStartIndex = -1;
                }
                
                if (shouldAdvance) {
                    // Exit interactive mode and continue with the script
                    this.isInteractive = false;
                    this.clickableActors = {};
                    this.clickableRegions = {};
                    this.hoveredActor = null;
                    this.hoveredRegion = null;
                    // Continue processing the next step (which is now at currentStep after removal)
                    // Don't return - let it continue to processStep() at the end
                } else {
                    // Return to interactive step - don't process it again, just set position
                    this.currentStep = this.interactiveStepIndex;
                    // Don't call processStep() - we're already in interactive mode
                    // Just ensure we're waiting for input
                    this.isWaiting = true;
                    // Save state and return - don't continue to processStep() at the end
                    this.saveNarrativeState();
                    return;
                }
            }
        }

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
            musicKey: assets.currentMusicKey || null, // Save current music
            isInteractive: this.isInteractive || false,
            interactiveStepIndex: this.interactiveStepIndex !== undefined ? this.interactiveStepIndex : -1,
            clickableActors: this.clickableActors || {},
            clickableRegions: this.clickableRegions || {},
            returnStack: this.returnStack ? [...this.returnStack] : [],
            insertedStepsCount: this.insertedStepsCount || 0,
            insertedStepsStartIndex: this.insertedStepsStartIndex !== undefined ? this.insertedStepsStartIndex : -1
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
        
        // Update hover state for interactive mode
        if (this.isInteractive && this.isWaiting) {
            this.updateHoverState(currentMouseX, currentMouseY);
        }
        
        this.lastMouseX = currentMouseX;
        this.lastMouseY = currentMouseY;

        if (this.timer > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                // Don't auto-advance if we're in interactive mode (wait for click)
                if (!this.isInteractive) {
                    this.nextStep();
                }
            }
        }

        // Fade handling
        if (this.fadeAlpha !== this.fadeTarget) {
            const diff = this.fadeTarget - this.fadeAlpha;
            const step = this.fadeSpeed * dt;
            if (Math.abs(diff) < step) {
                this.fadeAlpha = this.fadeTarget;
                // Don't auto-advance if we're in interactive mode (wait for click)
                if (this.isWaiting && !this.isInteractive) this.nextStep();
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
                        // Don't auto-advance if we're in interactive mode (wait for click)
                        if (this.isWaiting && !this.isInteractive) this.nextStep();
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
            // Don't auto-advance if we're in interactive mode (wait for click)
            // Also don't auto-advance if the current step is interactive (should wait for click)
            if (step && step.type === 'command' && !this.isInteractive && step.type !== 'interactive') {
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
            const actorScreenX = bgX + a.x;
            const actorScreenY = bgY + a.y;
            
            // Check if this actor is clickable and hovered
            const actorId = Object.keys(this.actors).find(id => this.actors[id] === a);
            const isClickable = actorId && this.clickableActors && this.clickableActors[actorId];
            const isHovered = this.isInteractive && isClickable && this.hoveredActor === actorId;
            
            // Draw actor
            this.drawCharacter(ctx, a.img, a.action, a.frame, actorScreenX, actorScreenY, { flip: a.flip });
            
            // No visual indicators for clickable actors - they're just clickable sprites
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
        
        // Render clickable region boxes in interactive mode
        if (this.isInteractive && this.clickableRegions) {
            this.renderClickableRegions(ctx, canvas, step);
        }
    }
    
    renderClickableRegions(ctx, canvas, step) {
        // Get background position
        let bgKey = step?.bg;
        if (!bgKey) {
            for (let i = this.currentStep; i >= 0; i--) {
                if (this.script[i].bg) {
                    bgKey = this.script[i].bg;
                    break;
                }
            }
        }
        
        let bgX = 0, bgY = 0;
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgX = Math.floor((canvas.width - bg.width) / 2);
                bgY = Math.floor((canvas.height - bg.height) / 2);
            }
        }
        
        // Draw clickable region boxes - very subtle, only on hover
        for (const [regionId, region] of Object.entries(this.clickableRegions)) {
            const regionScreenX = bgX + region.x;
            const regionScreenY = bgY + region.y;
            const isHovered = this.hoveredRegion === regionId;
            
            // Always show outline for debugging (can make it hover-only later)
            ctx.save();
            if (isHovered) {
                // Hovered: slightly more visible
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
            } else {
                // Not hovered: very subtle
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.2;
            }
            ctx.strokeRect(regionScreenX + 0.5, regionScreenY + 0.5, region.w - 1, region.h - 1);
            
            // Very subtle fill when hovered
            if (isHovered) {
                ctx.fillStyle = '#ffd700';
                ctx.globalAlpha = 0.1;
                ctx.fillRect(regionScreenX, regionScreenY, region.w, region.h);
            }
            ctx.restore();
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
        
        // In interactive mode, handle clicks on actors and regions
        if (this.isInteractive && this.isWaiting) {
            let x = -1000, y = -1000;
            if (e && e.clientX !== undefined) {
                const pos = this.getMousePos(e);
                x = pos.x;
                y = pos.y;
            }
            
            if (x !== -1000 && y !== -1000) {
                // Check for clicks on clickable regions first (they're usually on top)
                const clickedRegion = this.checkRegionClick(x, y);
                if (clickedRegion && this.clickableRegions[clickedRegion]) {
                    assets.playSound('ui_click', 0.5);
                    const region = this.clickableRegions[clickedRegion];
                    const clickHandler = region.onClick;
                    
                    // Handle branching: onClick can be script steps, branch object, or label name
                    if (clickHandler) {
                        if (Array.isArray(clickHandler)) {
                            // Remove any previously inserted steps first
                            if (this.insertedStepsCount > 0 && this.insertedStepsStartIndex >= 0) {
                                this.script.splice(this.insertedStepsStartIndex, this.insertedStepsCount);
                                this.insertedStepsCount = 0;
                                this.insertedStepsStartIndex = -1;
                            }
                            // Insert new steps
                            const insertIndex = this.currentStep + 1;
                            this.script.splice(insertIndex, 0, ...clickHandler);
                            // Mark these steps as inserted by adding a flag
                            for (let i = 0; i < clickHandler.length; i++) {
                                if (this.script[insertIndex + i]) {
                                    this.script[insertIndex + i]._isInserted = true;
                                }
                            }
                            this.insertedStepsCount = clickHandler.length;
                            this.insertedStepsStartIndex = insertIndex;
                        } else if (clickHandler.branch) {
                            // Branch object: { branch: [...steps], return: true/false }
                            // Save return position if needed
                            if (clickHandler.return !== false) {
                                this.returnStack.push(this.currentStep);
                            }
                            // Insert branch steps
                            const branchSteps = clickHandler.branch;
                            if (Array.isArray(branchSteps)) {
                                // Add return command at end if return is true
                                const stepsToInsert = clickHandler.return !== false 
                                    ? [...branchSteps, { type: 'command', action: 'return' }]
                                    : branchSteps;
                                this.script.splice(this.currentStep + 1, 0, ...stepsToInsert);
                            } else if (typeof branchSteps === 'string') {
                                // Branch is a label name - jump to it
                                this.script.splice(this.currentStep + 1, 0, 
                                    { type: 'command', action: 'saveReturn' },
                                    { type: 'command', action: 'jump', label: branchSteps },
                                    { type: 'command', action: 'return' }
                                );
                            }
                        } else if (typeof clickHandler === 'string') {
                            // onClick is a label name - jump to it and return
                            this.script.splice(this.currentStep + 1, 0,
                                { type: 'command', action: 'saveReturn' },
                                { type: 'command', action: 'jump', label: clickHandler },
                                { type: 'command', action: 'return' }
                            );
                        }
                    }
                    // Check if this region should advance the plot
                    if (region.advanceOnClick) {
                        // Mark the inserted steps to advance after they complete
                        // Don't exit interactive mode yet - wait until inserted steps are done
                        if (this.insertedStepsCount > 0 && this.insertedStepsStartIndex >= 0) {
                            // Mark the last inserted step to advance after it
                            const lastInsertedIndex = this.insertedStepsStartIndex + this.insertedStepsCount - 1;
                            if (this.script[lastInsertedIndex]) {
                                this.script[lastInsertedIndex]._advanceAfterThis = true;
                            }
                        }
                        this.nextStep();
                    } else {
                        // Stay in interactive mode - just show dialogue
                        this.nextStep();
                    }
                    return;
                }
                
                // Check for clicks on clickable actors
                const clickedActor = this.checkActorClick(x, y);
                if (clickedActor && this.clickableActors[clickedActor]) {
                    assets.playSound('ui_click', 0.5);
                    const actor = this.clickableActors[clickedActor];
                    const clickHandler = actor.onClick;
                    
                    // Handle branching: onClick can be script steps or a branch object
                    if (clickHandler) {
                        if (Array.isArray(clickHandler)) {
                            // Remove any previously inserted steps first
                            if (this.insertedStepsCount > 0 && this.insertedStepsStartIndex >= 0) {
                                this.script.splice(this.insertedStepsStartIndex, this.insertedStepsCount);
                                this.insertedStepsCount = 0;
                                this.insertedStepsStartIndex = -1;
                            }
                            // Insert new steps
                            const insertIndex = this.currentStep + 1;
                            this.script.splice(insertIndex, 0, ...clickHandler);
                            // Mark these steps as inserted by adding a flag
                            for (let i = 0; i < clickHandler.length; i++) {
                                if (this.script[insertIndex + i]) {
                                    this.script[insertIndex + i]._isInserted = true;
                                }
                            }
                            this.insertedStepsCount = clickHandler.length;
                            this.insertedStepsStartIndex = insertIndex;
                        } else if (clickHandler.branch) {
                            // Branch object: { branch: [...steps], return: true/false }
                            // Save return position if needed
                            if (clickHandler.return !== false) {
                                this.returnStack.push(this.currentStep);
                            }
                            // Insert branch steps
                            const branchSteps = clickHandler.branch;
                            if (Array.isArray(branchSteps)) {
                                // Add return command at end if return is true
                                const stepsToInsert = clickHandler.return !== false 
                                    ? [...branchSteps, { type: 'command', action: 'return' }]
                                    : branchSteps;
                                this.script.splice(this.currentStep + 1, 0, ...stepsToInsert);
                            } else if (typeof branchSteps === 'string') {
                                // Branch is a label name - jump to it
                                this.script.splice(this.currentStep + 1, 0, 
                                    { type: 'command', action: 'saveReturn' },
                                    { type: 'command', action: 'jump', label: branchSteps },
                                    { type: 'command', action: 'return' }
                                );
                            }
                        } else if (typeof clickHandler === 'string') {
                            // onClick is a label name - jump to it
                            this.script.splice(this.currentStep + 1, 0,
                                { type: 'command', action: 'saveReturn' },
                                { type: 'command', action: 'jump', label: clickHandler },
                                { type: 'command', action: 'return' }
                            );
                        }
                    }
                    
                    // Check if this actor should advance the plot
                    if (actor.advanceOnClick) {
                        // Mark the inserted steps to advance after they complete
                        // Don't exit interactive mode yet - wait until inserted steps are done
                        if (this.insertedStepsCount > 0 && this.insertedStepsStartIndex >= 0) {
                            // Mark the last inserted step to advance after it
                            const lastInsertedIndex = this.insertedStepsStartIndex + this.insertedStepsCount - 1;
                            if (this.script[lastInsertedIndex]) {
                                this.script[lastInsertedIndex]._advanceAfterThis = true;
                            }
                        }
                        this.nextStep();
                    } else {
                        // Stay in interactive mode - just show dialogue/branch
                        this.nextStep();
                    }
                    return;
                }
            }
            // In interactive mode, don't advance on other clicks
            return;
        }
        
        if (this.isWaiting && !canForceAdvance) return;

        let x = -1000, y = -1000;
        if (e && e.clientX !== undefined) {
            const pos = this.getMousePos(e);
            x = pos.x;
            y = pos.y;
        }
        
        // Update hover state for interactive mode
        if (this.isInteractive && x !== -1000 && y !== -1000) {
            this.updateHoverState(x, y);
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
        // Allow advancing dialogue even in interactive mode (for NPC dialogue that was inserted)
        // But only if we're currently on a dialogue step, not on the interactive step itself
        if (step && (step.type === 'dialogue' || step.type === 'title' || step.type === 'narrator')) {
            // If in interactive mode, only advance if we're not on the interactive step
            if (!this.isInteractive || (this.isInteractive && this.currentStep !== this.interactiveStepIndex)) {
                this.nextStep();
            }
        }
    }

    checkActorClick(clickX, clickY) {
        // Check if click hits any clickable actor
        const step = this.script[this.currentStep];
        if (!step) return null;
        
        // Get background position
        let bgKey = step?.bg;
        if (!bgKey) {
            for (let i = this.currentStep; i >= 0; i--) {
                if (this.script[i].bg) {
                    bgKey = this.script[i].bg;
                    break;
                }
            }
        }
        
        const { canvas } = this.manager;
        let bgX = 0, bgY = 0;
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgX = Math.floor((canvas.width - bg.width) / 2);
                bgY = Math.floor((canvas.height - bg.height) / 2);
            }
        }
        
        // Check each clickable actor
        for (const [actorId, actor] of Object.entries(this.actors)) {
            if (!this.clickableActors[actorId]) continue;
            if (!actor.img && actor.imgKey) {
                actor.img = assets.getImage(actor.imgKey);
            }
            if (!actor.img) continue;
            
            const actorScreenX = bgX + actor.x;
            const actorScreenY = bgY + actor.y;
            
            // Use pixel-perfect hit detection
            if (this.checkCharacterHit(actor.img, actor.action, actor.frame, actorScreenX, actorScreenY, clickX, clickY, { flip: actor.flip })) {
                return actorId;
            }
        }
        
        return null;
    }

    checkRegionClick(clickX, clickY) {
        // Check if click hits any clickable region
        if (!this.clickableRegions) return null;
        
        const step = this.script[this.currentStep];
        if (!step) return null;
        
        // Get background position
        let bgKey = step?.bg;
        if (!bgKey) {
            for (let i = this.currentStep; i >= 0; i--) {
                if (this.script[i].bg) {
                    bgKey = this.script[i].bg;
                    break;
                }
            }
        }
        
        const { canvas } = this.manager;
        let bgX = 0, bgY = 0;
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgX = Math.floor((canvas.width - bg.width) / 2);
                bgY = Math.floor((canvas.height - bg.height) / 2);
            }
        }
        
        // Check each clickable region
        for (const [regionId, region] of Object.entries(this.clickableRegions)) {
            const regionScreenX = bgX + region.x;
            const regionScreenY = bgY + region.y;
            
            if (clickX >= regionScreenX && clickX <= regionScreenX + region.w &&
                clickY >= regionScreenY && clickY <= regionScreenY + region.h) {
                return regionId;
            }
        }
        
        return null;
    }

    updateHoverState(mouseX, mouseY) {
        // Update which actor or region is being hovered
        const hoveredActor = this.checkActorClick(mouseX, mouseY);
        const hoveredRegion = this.checkRegionClick(mouseX, mouseY);
        
        if (hoveredActor !== this.hoveredActor) {
            this.hoveredActor = hoveredActor;
        }
        if (hoveredRegion !== this.hoveredRegion) {
            this.hoveredRegion = hoveredRegion;
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

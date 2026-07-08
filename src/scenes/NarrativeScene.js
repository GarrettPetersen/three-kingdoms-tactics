import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';
import { getCurrentLanguage, getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';
import { completeStoryNode } from '../core/StoryFlow.js';
import { getSpeakerDialogueDefault } from '../data/PortraitRegistry.js';

export class NarrativeScene extends BaseScene {
    constructor() {
        super();
        this.script = [];
        this.currentStep = 0;
        this.actors = {}; // { id: { x, y, img, action, frame, flip, targetX, targetY } }
        this.props = {}; // { id: { x, y, imgKey, sortY } } static scene objects
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
        this.clickableProps = {}; // { propId: { delegateActorId?: string, onClick?: script steps } }
        this.clickableRegions = {}; // { regionId: { x, y, w, h, onClick: script steps } }
        this.hoveredActor = null; // Currently hovered actor ID
        this.hoveredProp = null; // Currently hovered prop ID
        this.hoveredRegion = null; // Currently hovered region ID
        this.scriptLabels = {}; // { labelName: stepIndex } - map of label names to script indices
        this.baseScript = [];
        this.executionFrames = [];
        this.returnStack = []; // Stack of return positions for branching
        this.insertedStepsCount = 0; // Track how many steps were inserted after interactive step
        this.insertedStepsStartIndex = -1; // Track where inserted steps start (for cleanup)
        this.interactiveNavTargets = []; // [{ id, type, x, y, actorId?/regionId? }]
        this.interactiveNavIndex = -1;
        this.interactiveNavMouseEnabled = true;
        this.pendingInteractiveAdvance = false;
        this.invalidScriptRecoveryScheduled = false;
        this.waitingForActorId = null;
        this.waitingForActorIds = null;
        this.storyRouteId = null;
        this.storyNodeId = null;
        this.skipNextExitSave = false;
        this.visualPaletteCache = new Map();
        this.titleLinkRegion = null;
        this.titleImageCache = new Map();
    }

    cloneScriptSteps(steps) {
        if (!Array.isArray(steps)) return [];
        try {
            return JSON.parse(JSON.stringify(steps));
        } catch (err) {
            console.error('Failed to clone narrative script steps:', err);
            return steps.map(step => ({ ...step }));
        }
    }

    buildLabelMapForSteps(steps) {
        const labels = {};
        (steps || []).forEach((step, index) => {
            if (step?.type === 'label' && step.name) labels[step.name] = index;
        });
        return labels;
    }

    syncActiveFrame() {
        const frame = this.getActiveFrame();
        if (!frame) return;
        frame.steps = this.script;
        frame.index = this.currentStep;
        frame.labels = this.scriptLabels;
    }

    getActiveFrame() {
        if (!Array.isArray(this.executionFrames) || this.executionFrames.length === 0) return null;
        return this.executionFrames[this.executionFrames.length - 1];
    }

    activateFrame(frame) {
        this.script = frame?.steps || [];
        this.currentStep = frame?.index || 0;
        this.scriptLabels = frame?.labels || this.buildLabelMapForSteps(this.script);
        if (frame) frame.labels = this.scriptLabels;
    }

    resetExecutionFrames(script, startIndex = 0) {
        this.baseScript = script || [];
        const baseFrame = {
            type: 'base',
            steps: this.baseScript,
            index: startIndex,
            labels: this.buildLabelMapForSteps(this.baseScript)
        };
        this.executionFrames = [baseFrame];
        this.activateFrame(baseFrame);
    }

    pushRuntimeFrame(steps, options = {}) {
        const clonedSteps = this.cloneScriptSteps(steps || []);
        clonedSteps.forEach(step => {
            if (step && typeof step === 'object') step._isRuntimeFrameStep = true;
        });
        if (clonedSteps.length === 0) {
            if (options.advanceParentAfter) this.nextStep();
            return false;
        }
        this.syncActiveFrame();
        const frame = {
            type: 'runtime',
            steps: clonedSteps,
            index: 0,
            labels: this.buildLabelMapForSteps(clonedSteps),
            returnToInteractive: !!options.returnToInteractive,
            advanceParentAfter: !!options.advanceParentAfter
        };
        this.executionFrames.push(frame);
        this.activateFrame(frame);
        this.subStep = 0;
        this.isWaiting = false;
        this.waitingForActorId = null;
        this.timer = 0;
        return true;
    }

    popRuntimeFrame() {
        if (!this.executionFrames || this.executionFrames.length <= 1) return null;
        const completed = this.executionFrames.pop();
        const parent = this.getActiveFrame();
        this.activateFrame(parent);
        return completed;
    }

    findLabelFrame(labelName) {
        if (!labelName || !Array.isArray(this.executionFrames)) return null;
        this.syncActiveFrame();
        for (let i = this.executionFrames.length - 1; i >= 0; i--) {
            const frame = this.executionFrames[i];
            const labels = frame.labels || this.buildLabelMapForSteps(frame.steps);
            frame.labels = labels;
            if (labels[labelName] !== undefined) {
                return { frameIndex: i, index: labels[labelName] };
            }
        }
        return null;
    }

    getFrameStep(frame = this.getActiveFrame(), offset = 0) {
        if (!frame) return null;
        return frame.steps?.[(frame.index || 0) + offset] || null;
    }

    clearInteractiveState() {
        this.isInteractive = false;
        this.clickableActors = {};
        this.clickableProps = {};
        this.clickableRegions = {};
        this.hoveredActor = null;
        this.hoveredProp = null;
        this.hoveredRegion = null;
        this.interactiveNavTargets = [];
        this.interactiveNavIndex = -1;
        this.interactiveNavMouseEnabled = true;
    }

    shouldPreloadDuringFade(step) {
        return step?.type === 'command'
            && step.action === 'fade'
            && step.target === 0
            && this.fadeAlpha > 0;
    }

    isFadeSetupPreloadActive() {
        return this.shouldPreloadDuringFade(this.script?.[this.currentStep]);
    }

    isFadePreloadCommand(step) {
        if (step?.type !== 'command' || step._preloadedDuringFade) return false;
        return [
            'clearActors',
            'clearProps',
            'addActor',
            'addProp',
            'animate',
            'setActorLayer',
            'setActorLoop'
        ].includes(step.action);
    }

    applyFadePreloadCommand(cmd) {
        if (cmd.action === 'addActor') {
            const loopXStart = cmd.loopXStart !== undefined ? cmd.loopXStart : null;
            const loopXEnd = cmd.loopXEnd !== undefined ? cmd.loopXEnd : null;
            const initialTargetX = (loopXStart !== null && loopXEnd !== null) ? loopXEnd : cmd.x;
            this.actors[cmd.id] = {
                x: cmd.x,
                y: cmd.y,
                imgKey: cmd.imgKey,
                img: assets.getImage(cmd.imgKey),
                action: cmd.actorAction || cmd.animation || 'standby',
                frame: 0,
                flip: cmd.flip || false,
                targetX: initialTargetX,
                targetY: cmd.y,
                speed: cmd.speed || 1,
                loopXStart,
                loopXEnd,
                drawAboveForeground: !!cmd.drawAboveForeground,
                preloadedDuringFade: true
            };
        } else if (cmd.action === 'addProp') {
            this.props[cmd.id] = {
                x: cmd.x || 0,
                y: cmd.y || 0,
                sortY: cmd.sortY !== undefined ? cmd.sortY : (cmd.y || 0),
                imgKey: cmd.imgKey,
                img: cmd.imgKey ? assets.getImage(cmd.imgKey) : null,
                imgKeys: Array.isArray(cmd.imgKeys) ? cmd.imgKeys : null,
                frameMs: Number.isFinite(cmd.frameMs) ? cmd.frameMs : 900,
                frameOffsetMs: Number.isFinite(cmd.frameOffsetMs) ? cmd.frameOffsetMs : 0,
                drawAboveForeground: !!cmd.drawAboveForeground,
                w: cmd.w,
                h: cmd.h,
                preloadedDuringFade: true
            };
        } else if (cmd.action === 'clearActors') {
            this.actors = {};
        } else if (cmd.action === 'clearProps') {
            this.props = {};
        } else if (cmd.action === 'animate') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.action = cmd.animation || 'standby';
                actor.frame = 0;
            }
        } else if (cmd.action === 'setActorLayer') {
            const actor = this.actors[cmd.id];
            if (actor) actor.drawAboveForeground = !!cmd.drawAboveForeground;
        } else if (cmd.action === 'setActorLoop') {
            const actor = this.actors[cmd.id];
            if (actor) {
                if (cmd.enabled === false) {
                    actor.loopXStart = null;
                    actor.loopXEnd = null;
                    if (actor.action === 'walk') actor.action = 'standby';
                } else {
                    actor.loopXStart = cmd.loopXStart !== undefined ? cmd.loopXStart : actor.loopXStart;
                    actor.loopXEnd = cmd.loopXEnd !== undefined ? cmd.loopXEnd : actor.loopXEnd;
                }
            }
        }
    }

    preloadSetupAfterFade(step) {
        if (!this.shouldPreloadDuringFade(step)) return;
        let index = this.currentStep + 1;
        while (index < this.script.length) {
            const candidate = this.script[index];
            if (!candidate || !this.conditionPasses(candidate.condition)) {
                index++;
                continue;
            }
            if (!this.isFadePreloadCommand(candidate)) break;
            this.applyFadePreloadCommand(candidate);
            candidate._preloadedDuringFade = true;
            index++;
        }
    }

    getActiveVisualKey(propName) {
        const frames = this.executionFrames?.length
            ? this.executionFrames
            : [{ steps: this.script, index: this.currentStep }];
        let foregroundBgBoundary = null;
        for (let frameIndex = frames.length - 1; frameIndex >= 0; frameIndex--) {
            const frame = frames[frameIndex];
            const startIndex = Math.min(frame.index || 0, Math.max(0, (frame.steps?.length || 1) - 1));
            for (let i = startIndex; i >= 0; i--) {
                const step = frame.steps?.[i];
                if (!step) continue;
                if (Object.prototype.hasOwnProperty.call(step, propName)) return step[propName];
                if (propName === 'fg' && Object.prototype.hasOwnProperty.call(step, 'bg')) {
                    if (foregroundBgBoundary === null) {
                        foregroundBgBoundary = step.bg;
                        if (!Object.prototype.hasOwnProperty.call(step, 'fg')) return null;
                    } else if (step.bg !== foregroundBgBoundary) {
                        return null;
                    }
                }
            }
        }
        return null;
    }

    findActiveVisualPaletteStep() {
        const frames = this.executionFrames?.length
            ? this.executionFrames
            : [{ steps: this.script, index: this.currentStep }];
        const activeBg = this.getActiveVisualKey('bg');
        for (let frameIndex = frames.length - 1; frameIndex >= 0; frameIndex--) {
            const frame = frames[frameIndex];
            const startIndex = Math.min(frame.index || 0, Math.max(0, (frame.steps?.length || 1) - 1));
            for (let i = startIndex; i >= 0; i--) {
                const step = frame.steps?.[i];
                if (!step) continue;
                if (step.bgPaletteShift) {
                    return {
                        step,
                        isCurrentStep: frameIndex === frames.length - 1 && i === startIndex
                    };
                }
                if (Object.prototype.hasOwnProperty.call(step, 'bg')) {
                    if (!activeBg || step.bg === activeBg) return null;
                }
            }
        }
        return null;
    }

    getVisualPaletteProgress(paletteInfo) {
        if (!paletteInfo?.step || paletteInfo.step.bgPaletteShift !== 'sunset') return 0;
        const step = paletteInfo.step;
        const start = Number.isFinite(step.bgPaletteStart) ? step.bgPaletteStart : 0;
        const end = Number.isFinite(step.bgPaletteEnd) ? step.bgPaletteEnd : start;
        if (!paletteInfo.isCurrentStep) {
            return Math.max(0, Math.min(1, end));
        }

        const voice = (assets.currentVoice && assets.currentVoice.duration > 0) ? assets.currentVoice : null;
        const configuredDuration = Number.isFinite(step.bgPaletteDurationMs) ? step.bgPaletteDurationMs : null;
        const durationMs = Math.max(800, configuredDuration || (voice ? voice.duration * 1000 : 5000));
        const t = Math.max(0, Math.min(1, (this.elapsedInStep || 0) / durationMs));
        return Math.max(0, Math.min(1, start + (end - start) * t));
    }

    getSunsetPaletteImage(img, progress) {
        if (!img || progress <= 0) return img;
        const bucket = Math.max(0, Math.min(24, Math.round(progress * 24)));
        if (bucket <= 0) return img;
        const key = `${img.src || img.width + 'x' + img.height}:sunset:${bucket}`;
        if (this.visualPaletteCache.has(key)) {
            return this.visualPaletteCache.get(key);
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const paletteCtx = canvas.getContext('2d', { willReadFrequently: true });
        paletteCtx.imageSmoothingEnabled = false;
        paletteCtx.drawImage(img, 0, 0);

        try {
            const imageData = paletteCtx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const t = bucket / 24;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const shadow = Math.max(0, 1 - lum / 150);
                const sunsetR = Math.min(255, lum * 1.08 + 58 + shadow * 18);
                const sunsetG = Math.min(255, lum * 0.72 + 34 - shadow * 8);
                const sunsetB = Math.min(255, lum * 0.44 + 22 + shadow * 32);
                data[i] = Math.round(r + (sunsetR - r) * t);
                data[i + 1] = Math.round(g + (sunsetG - g) * t);
                data[i + 2] = Math.round(b + (sunsetB - b) * t);
            }
            paletteCtx.putImageData(imageData, 0, 0);
        } catch (err) {
            console.warn('Could not palette-shift narrative image:', err);
            return img;
        }

        this.visualPaletteCache.set(key, canvas);
        return canvas;
    }

    getPaletteShiftedVisualImage(img, paletteInfo, progress) {
        if (!img || paletteInfo?.step?.bgPaletteShift !== 'sunset') return img;
        return this.getSunsetPaletteImage(img, progress);
    }

    conditionPasses(condition) {
        if (!condition) return true;
        const gs = this.manager?.gameState;
        if (!gs) return true;

        if (Array.isArray(condition)) {
            return condition.every(item => this.conditionPasses(item));
        }
        if (condition.all) {
            return (condition.all || []).every(item => this.conditionPasses(item));
        }
        if (condition.any) {
            return (condition.any || []).some(item => this.conditionPasses(item));
        }
        if (condition.not) {
            return !this.conditionPasses(condition.not);
        }

        const routeId = condition.routeId || null;
        const choiceKey = condition.choice || condition.storyChoice;
        if (choiceKey) {
            const actual = gs.getStoryChoice(choiceKey, undefined, routeId);
            if (condition.exists) return actual !== undefined;
            if (condition.value !== undefined) return actual === condition.value;
            if (condition.notValue !== undefined) return actual !== condition.notValue;
            return actual !== undefined;
        }

        const milestone = condition.milestone || condition.hasMilestone;
        if (milestone) {
            return gs.hasMilestone(milestone, routeId);
        }
        if (condition.completedNode) {
            return gs.hasCompletedStoryNode(condition.completedNode, routeId);
        }

        return true;
    }

    getAvailableChoiceOptions(step) {
        return (step?.options || []).filter(option => this.conditionPasses(option?.condition));
    }

    createChoiceDialogueStep(step, opt) {
        const fallbackText = opt?.buttonText || '';
        const dialogueText = opt?.text !== undefined && opt?.text !== null ? opt.text : fallbackText;
        const speakerKey = opt?.speaker ? String(opt.speaker).trim().toLowerCase() : '';
        const speakerDefault = getSpeakerDialogueDefault(speakerKey) || {};
        return {
            type: 'dialogue',
            speaker: opt?.speaker || step.speaker,
            portraitKey: opt?.portraitKey || speakerDefault.portraitKey || step.portraitKey || 'liubei',
            name: opt?.name || speakerDefault.name || step.name || 'Liu Bei',
            text: dialogueText,
            voiceId: opt?.voiceId,
            position: opt?.position || step.position,
            _isChoiceInserted: true
        };
    }

    enter(params) {
        this.invalidScriptRecoveryScheduled = false;
        const gs = this.manager.gameState;
        const isResume = params.isResume && gs.getSceneState('narrative');
        const savedState = isResume ? gs.getSceneState('narrative') : null;
        
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
                this.resetExecutionFrames(this.cloneScriptSteps(NARRATIVE_SCRIPTS[params.scriptId]));
                this.scriptId = params.scriptId;
            } else {
                this.resetExecutionFrames(this.cloneScriptSteps(params.script || []));
                this.scriptId = null;
            }

            // Don't proceed if script is empty
            if (!this.script || this.script.length === 0) {
                console.error('Cannot enter narrative scene: script is empty', {
                    scriptId: params.scriptId,
                    hasScriptParam: !!params.script,
                    scriptParamLength: params.script ? params.script.length : 0
                });
                // Clear stale narrative state and recover to a safe scene.
                gs.clearSceneState('narrative');
                setTimeout(() => {
                    const campaignId = gs.getCurrentCampaign();
                    if (campaignId) {
                        this.manager.switchTo('map', { campaignId });
                    } else {
                        this.manager.switchTo('campaign_selection');
                    }
                }, 100);
                return;
            }

            this.onComplete = params.onComplete || null;
            this.storyRouteId = params.storyRouteId || null;
            this.storyNodeId = params.storyNodeId || null;
            this.currentStep = 0;
            this.subStep = 0; // Track 3-line chunks for long dialogue
            this.actors = {};
            this.props = {};
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
        this.storyRouteId = state.storyRouteId || null;
        this.storyNodeId = state.storyNodeId || null;
        let restoredBaseScript = null;
        if (this.scriptId && NARRATIVE_SCRIPTS[this.scriptId]) {
            restoredBaseScript = this.cloneScriptSteps(NARRATIVE_SCRIPTS[this.scriptId]);
        } else if (this.scriptId && !NARRATIVE_SCRIPTS[this.scriptId]) {
            // scriptId exists but script doesn't exist in NARRATIVE_SCRIPTS
            console.error('Cannot restore: scriptId not found in NARRATIVE_SCRIPTS', {
                scriptId: this.scriptId,
                availableScripts: Object.keys(NARRATIVE_SCRIPTS)
            });
            // Clear the invalid narrative state and switch to map
            this.manager.gameState.clearSceneState('narrative');
            this.script = [];
            setTimeout(() => {
                this.manager.switchTo('map');
            }, 100);
            return;
        } else if (state.script && Array.isArray(state.script) && state.script.length > 0) {
            // Custom script (no scriptId) - only use if it's not empty
            restoredBaseScript = this.cloneScriptSteps(state.script);
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
            this.manager.gameState.clearSceneState('narrative');
            this.script = [];
            // Switch to map as a safe fallback
            setTimeout(() => {
                this.manager.switchTo('map');
            }, 100);
            return; // Don't continue if we can't restore the script
        }
        this.resetExecutionFrames(restoredBaseScript, state.currentStep || 0);
        if (Array.isArray(state.executionFrames) && state.executionFrames.length > 0) {
            const restoredFrames = state.executionFrames
                .map((frame, index) => {
                    const steps = index === 0
                        ? this.baseScript
                        : this.cloneScriptSteps(frame.steps || []);
                    return {
                        type: index === 0 ? 'base' : (frame.type || 'runtime'),
                        steps,
                        index: frame.index || 0,
                        labels: this.buildLabelMapForSteps(steps),
                        returnToInteractive: !!frame.returnToInteractive,
                        advanceParentAfter: !!frame.advanceParentAfter
                    };
                })
                .filter((frame, index) => index === 0 || frame.steps.length > 0);
            if (restoredFrames.length > 0) {
                this.executionFrames = restoredFrames;
                this.baseScript = restoredFrames[0].steps;
                this.activateFrame(restoredFrames[restoredFrames.length - 1]);
            }
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
            this.manager.gameState.clearSceneState('narrative');
            
            // Try to transition to the next scene if we have that info
            if (state.storyRouteId && state.storyNodeId) {
                completeStoryNode(this.manager, state.storyRouteId, state.storyNodeId);
            } else if (state.nextScene) {
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
                speed: actor.speed || 1,
                loopXStart: actor.loopXStart !== undefined ? actor.loopXStart : null,
                loopXEnd: actor.loopXEnd !== undefined ? actor.loopXEnd : null,
                drawAboveForeground: !!actor.drawAboveForeground,
                preloadedDuringFade: !!actor.preloadedDuringFade
            };
        }

        const savedProps = state.props || {};
        this.props = {};
        for (const [id, prop] of Object.entries(savedProps)) {
            this.props[id] = {
                x: prop.x || 0,
                y: prop.y || 0,
                sortY: prop.sortY !== undefined ? prop.sortY : (prop.y || 0),
                imgKey: prop.imgKey,
                img: prop.imgKey ? assets.getImage(prop.imgKey) : null,
                imgKeys: Array.isArray(prop.imgKeys) ? prop.imgKeys : null,
                frameMs: Number.isFinite(prop.frameMs) ? prop.frameMs : 900,
                frameOffsetMs: Number.isFinite(prop.frameOffsetMs) ? prop.frameOffsetMs : 0,
                drawAboveForeground: !!prop.drawAboveForeground,
                w: prop.w,
                h: prop.h,
                preloadedDuringFade: !!prop.preloadedDuringFade
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
        this.waitingForActorId = state.waitingForActorId || null;
        this.waitingForActorIds = Array.isArray(state.waitingForActorIds) ? [...state.waitingForActorIds] : null;
        this.timer = state.timer || 0;
        this.fadeAlpha = state.fadeAlpha !== undefined ? state.fadeAlpha : 1;
        this.fadeTarget = state.fadeTarget !== undefined ? state.fadeTarget : this.fadeAlpha;
        this.fadeSpeed = state.fadeSpeed || 0.002;
        this.elapsedInStep = state.elapsedInStep || 0;
        this.isInteractive = state.isInteractive || false;
        
        // If we're on a completed wait command, advance past it
        const currentStepObj = this.script[this.currentStep];
        if (currentStepObj && currentStepObj.type === 'command' && currentStepObj.action === 'wait') {
            if (this.timer <= 0 && !this.isWaiting) {
                // Wait command has completed - advance to next step
                this.nextStep();
            }
        }
        this.interactiveStepIndex = state.interactiveStepIndex !== undefined ? state.interactiveStepIndex : -1;
        this.clickableActors = state.clickableActors || {};
        this.clickableProps = state.clickableProps || {};
        this.clickableRegions = state.clickableRegions || {};
        this.returnStack = state.returnStack ? [...state.returnStack] : [];
        this.insertedStepsCount = state.insertedStepsCount || 0;
        this.insertedStepsStartIndex = state.insertedStepsStartIndex !== undefined ? state.insertedStepsStartIndex : -1;
        this.hoveredActor = null; // Reset hover state on restore
        this.hoveredProp = null;
        this.hoveredRegion = null; // Reset hover state on restore
            this.interactiveNavTargets = [];
            this.interactiveNavIndex = -1;
            this.interactiveNavMouseEnabled = true;
        this.pendingInteractiveAdvance = false;
        this.onComplete = null; // Don't restore callbacks
        
        // Recovery guard: interactive flags can be stale in some saved states.
        // Keep interactive mode only when at an interactive step or inside inserted branch steps.
        if (this.isInteractive && this.interactiveStepIndex >= 0) {
            const stepAtCurrent = this.script[this.currentStep];
            const isAtInteractiveStep = !!(stepAtCurrent && (stepAtCurrent.type === 'interactive' || stepAtCurrent.type === 'prompt'));
            const insertedEnd = this.insertedStepsStartIndex >= 0 ? this.insertedStepsStartIndex + this.insertedStepsCount : -1;
            const isInsideInsertedBranch = this.insertedStepsCount > 0
                && this.currentStep >= this.insertedStepsStartIndex
                && this.currentStep < insertedEnd;
            if (!isAtInteractiveStep && !isInsideInsertedBranch) {
                this.isInteractive = false;
                this.clickableActors = {};
                this.clickableProps = {};
                this.clickableRegions = {};
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
            // Recovery guard: if saved flags are stale, restore interactive mode for interactive/prompt steps.
            if (step.type === 'interactive' || step.type === 'prompt') {
                if (!this.isInteractive) {
                    this.isInteractive = true;
                }
                // Interactive steps always require waiting for input.
                this.isWaiting = true;
                if (this.interactiveStepIndex < 0) {
                    this.interactiveStepIndex = this.currentStep;
                }
            }
            // If we're at an interactive step, we need to process it to set up clickable elements
            // But we don't want to replay voice or re-execute commands
            if ((step.type === 'interactive' || step.type === 'prompt') && this.isInteractive) {
                // Just set up the clickable elements without replaying voice
                this.clickableActors = step.clickableActors || {};
                this.clickableProps = step.clickableProps || {};
                this.clickableRegions = { ...(step.clickableRegions || {}) };
                if (step.type === 'prompt' || Array.isArray(step.promptOptions)) {
                    Object.assign(this.clickableRegions, this.buildPromptClickableRegions(step));
                }
            } else if (step.type === 'choice') {
                // Initialize selection system if it's a choice
                this.initSelection({
                    defaultIndex: 0,
                    totalOptions: this.getAvailableChoiceOptions(step).length
                });
            } else if (step.type === 'dialogue' || step.type === 'narrator') {
                // For dialogue/narrator steps, ensure they're set up for rendering
                // The dialogue will be rendered in the render() function
                // But we need to make sure isWaiting is set correctly if it's a timed dialogue
                if (step.duration) {
                    // Timed dialogue - ensure timer is set
                    if (this.timer === 0) {
                        this.timer = step.duration;
                    }
                    this.isWaiting = true;
                } else {
                    // Non-timed dialogue - should wait for user input
                    this.isWaiting = true;
                }
            }
            
            // Don't replay voice on resume - user already heard it
            // Timer and isWaiting already restored from saved state
        }

        const pendingRuntimeSteps = this.manager.gameState.getCampaignVar('pendingNarrativeRuntimeFrameAfterLiubo');
        if (Array.isArray(pendingRuntimeSteps) && pendingRuntimeSteps.length > 0) {
            this.manager.gameState.setCampaignVar('pendingNarrativeRuntimeFrameAfterLiubo', null);
            const shouldReturnToInteractive = !!(this.isInteractive && this.interactiveStepIndex >= 0);
            if (this.pushRuntimeFrame(pendingRuntimeSteps, { returnToInteractive: shouldReturnToInteractive })) {
                this.processStep();
                this.saveNarrativeState();
            }
        }
    }
    
    handleCommandForResume(cmd) {
        // Handle commands during resume without advancing steps
        if (cmd.action === 'addActor') {
            // Actor should already be in saved actors, but ensure it exists
            if (!this.actors[cmd.id]) {
                const loopXStart = cmd.loopXStart !== undefined ? cmd.loopXStart : null;
                const loopXEnd = cmd.loopXEnd !== undefined ? cmd.loopXEnd : null;
                const initialTargetX = (loopXStart !== null && loopXEnd !== null) ? loopXEnd : cmd.x;
                this.actors[cmd.id] = {
                    x: cmd.x,
                    y: cmd.y,
                    imgKey: cmd.imgKey,
                    img: assets.getImage(cmd.imgKey),
                    action: cmd.actorAction || cmd.animation || 'standby',
                    frame: 0,
                    flip: cmd.flip || false,
                    targetX: initialTargetX,
                    targetY: cmd.y,
                    speed: cmd.speed || 1,
                    loopXStart,
                    loopXEnd,
                    drawAboveForeground: !!cmd.drawAboveForeground
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
        } else if (cmd.action === 'setActorLayer') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.drawAboveForeground = !!cmd.drawAboveForeground;
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
        } else if (cmd.action === 'addProp') {
            if (!this.props[cmd.id]) {
                this.props[cmd.id] = {
                    x: cmd.x || 0,
                    y: cmd.y || 0,
                    sortY: cmd.sortY !== undefined ? cmd.sortY : (cmd.y || 0),
                    imgKey: cmd.imgKey,
                    img: cmd.imgKey ? assets.getImage(cmd.imgKey) : null,
                    imgKeys: Array.isArray(cmd.imgKeys) ? cmd.imgKeys : null,
                    frameMs: Number.isFinite(cmd.frameMs) ? cmd.frameMs : 900,
                    frameOffsetMs: Number.isFinite(cmd.frameOffsetMs) ? cmd.frameOffsetMs : 0,
                    drawAboveForeground: !!cmd.drawAboveForeground,
                    w: cmd.w,
                    h: cmd.h
                };
            }
        } else if (cmd.action === 'removeProp') {
            delete this.props[cmd.id];
        } else if (cmd.action === 'clearProps') {
            this.props = {};
        } else if (cmd.action === 'fade') {
            this.fadeTarget = cmd.target;
            this.fadeSpeed = cmd.speed || 0.002;
        } else if (cmd.action === 'wait') {
            // Timer already restored from saved state
        } else if (cmd.action === 'waitForActors') {
            // Wait state is restored from saved state.
        } else if (cmd.action === 'playMusic') {
            // Restore music during resume - it may have been lost on page refresh
            if (assets.currentMusicKey !== cmd.key) {
                assets.playMusic(cmd.key, cmd.volume || 0.5);
            }
        }
        // Don't call nextStep() for any command during resume
    }

    prepareNarrativeResumeAfterMinigame() {
        while (this.executionFrames?.length > 1) {
            this.popRuntimeFrame();
        }
        if (this.interactiveStepIndex >= 0) {
            this.currentStep = this.interactiveStepIndex;
        }
        this.subStep = 0;
        this.isInteractive = true;
        this.isWaiting = true;
        this.waitingForActorId = null;
        this.waitingForActorIds = null;
        this.timer = 0;
        this.returnStack = [];
        this.pendingInteractiveAdvance = false;
    }

    restartScript(scriptId = this.scriptId) {
        if (!scriptId || !NARRATIVE_SCRIPTS[scriptId]) {
            console.warn('Cannot restart narrative script:', scriptId);
            this.nextStep();
            return;
        }

        this.resetExecutionFrames(this.cloneScriptSteps(NARRATIVE_SCRIPTS[scriptId]));
        this.scriptId = scriptId;
        this.currentStep = 0;
        this.subStep = 0;
        this.actors = {};
        this.props = {};
        this.isWaiting = false;
        this.waitingForActorId = null;
        this.waitingForActorIds = null;
        this.timer = 0;
        this.elapsedInStep = 0;
        this.fadeAlpha = 1;
        this.fadeTarget = 1;
        this.fadeSpeed = 0.002;
        this.isInteractive = false;
        this.interactiveStepIndex = -1;
        this.clickableActors = {};
        this.clickableProps = {};
        this.clickableRegions = {};
        this.hoveredActor = null;
        this.hoveredProp = null;
        this.hoveredRegion = null;
        this.returnStack = [];
        this.insertedStepsCount = 0;
        this.insertedStepsStartIndex = -1;
        this.interactiveNavTargets = [];
        this.interactiveNavIndex = -1;
        this.interactiveNavMouseEnabled = true;
        this.pendingInteractiveAdvance = false;
        this.processStep();
        this.saveNarrativeState();
    }
    
    exit() {
        // Save narrative state when leaving (also saved on every step change)
        if (this.skipNextExitSave) {
            this.skipNextExitSave = false;
            return;
        }
        this.saveNarrativeState();
    }

    processStep() {
        let step = this.script[this.currentStep];
        while (step && (step._preloadedDuringFade || !this.conditionPasses(step.condition))) {
            this.currentStep++;
            this.syncActiveFrame();
            step = this.script[this.currentStep];
        }
        if (!step) {
            this.nextStep();
            return;
        }

        this.elapsedInStep = 0;

        // Build label map if not already built (for jump/goto functionality)
        if (Object.keys(this.scriptLabels).length === 0) {
            this.buildLabelMap();
        }

        // Initialize selection system when entering a choice step
        if (step.type === 'choice') {
            this.initSelection({
                defaultIndex: 0,
                totalOptions: this.getAvailableChoiceOptions(step).length
            });
        }

        // Title card: if armed, start recording when the card is shown; stop when user clicks out (in handleInput)
        if (step.type === 'title' && this.manager.actionRecorder?.armed) {
            this.manager.actionRecorder.onUserActionStart();
        }

        // Trigger voice if present
        if (step.voiceId) {
            // If armed, start recording this line (covers first intro line and any line we land on without clicking advance)
            if (this.manager.actionRecorder?.armed) {
                this.manager.actionRecorder.onUserActionStart();
            }
            // Set end callback before playVoice so it's in place when the voice ends (avoids race with short/clipped audio)
            if (this.manager.actionRecorder?.recording) {
                assets.onNextVoiceEnd = () => this.manager.actionRecorder?.signalActionEnd();
            }
            assets.playVoice(step.voiceId);
        } else if ((step.type === 'title' || step.type === 'dialogue' || step.type === 'narrator') && step.duration && this.manager.actionRecorder?.recording) {
            setTimeout(() => this.manager.actionRecorder?.signalActionEnd(), step.duration);
        }
        if (step.type === 'title' && step.entrySoundKey) {
            assets.playSound(step.entrySoundKey, step.entrySoundVolume !== undefined ? step.entrySoundVolume : 1.0);
        }

        this.preloadSetupAfterFade(step);

        if (step.type === 'command') {
            this.handleCommand(step);
        } else if (step.type === 'label') {
            // Label step - just a marker, advance immediately
            this.nextStep();
        } else if (step.type === 'interactive' || step.type === 'prompt') {
            // Enter interactive mode - pause script and enable click detection
            this.isInteractive = true;
            this.interactiveStepIndex = this.currentStep; // Remember which step is interactive
            this.isWaiting = true;
            // Set up clickable actors from step definition
            this.clickableActors = step.clickableActors || {};
            this.clickableProps = step.clickableProps || {};
            // Set up clickable regions from step definition
            this.clickableRegions = { ...(step.clickableRegions || {}) };
            if (step.type === 'prompt' || Array.isArray(step.promptOptions)) {
                Object.assign(this.clickableRegions, this.buildPromptClickableRegions(step));
            }
            // Clear hover state
            this.hoveredActor = null;
            this.hoveredRegion = null;
            this.interactiveNavTargets = [];
            this.interactiveNavIndex = -1;
            this.interactiveNavMouseEnabled = true;
        } else if ((step.type === 'title' || step.type === 'dialogue' || step.type === 'narrator') && step.duration) {
            this.timer = step.duration;
            this.isWaiting = true;
        }
    }

    handleCommand(cmd) {
        if (cmd.action === 'addActor') {
            const loopXStart = cmd.loopXStart !== undefined ? cmd.loopXStart : null;
            const loopXEnd = cmd.loopXEnd !== undefined ? cmd.loopXEnd : null;
            const initialTargetX = (loopXStart !== null && loopXEnd !== null) ? loopXEnd : cmd.x;
            this.actors[cmd.id] = {
                x: cmd.x,
                y: cmd.y,
                imgKey: cmd.imgKey,
                img: assets.getImage(cmd.imgKey),
                action: cmd.actorAction || cmd.animation || 'standby',
                frame: 0,
                flip: cmd.flip || false,
                targetX: initialTargetX,
                targetY: cmd.y,
                speed: cmd.speed || 1,
                loopXStart,
                loopXEnd,
                drawAboveForeground: !!cmd.drawAboveForeground
            };
            this.nextStep();
        } else if (cmd.action === 'move') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.targetX = cmd.x;
                actor.targetY = cmd.y;
                actor.action = 'walk';
                if (cmd.wait !== false) {
                    this.waitingForActorId = cmd.id;
                    this.waitingForActorIds = null;
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'waitForActors') {
            const ids = Array.isArray(cmd.ids) ? cmd.ids.filter(id => !!this.actors[id]) : [];
            if (ids.length === 0) {
                this.nextStep();
            } else {
                this.waitingForActorId = null;
                this.waitingForActorIds = ids;
                this.isWaiting = true;
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
        } else if (cmd.action === 'setActorLayer') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.drawAboveForeground = !!cmd.drawAboveForeground;
            }
            this.nextStep();
        } else if (cmd.action === 'removeActor') {
            delete this.actors[cmd.id];
            this.nextStep();
        } else if (cmd.action === 'clearActors') {
            this.actors = {};
            this.nextStep();
        } else if (cmd.action === 'addProp') {
            this.props[cmd.id] = {
                x: cmd.x || 0,
                y: cmd.y || 0,
                sortY: cmd.sortY !== undefined ? cmd.sortY : (cmd.y || 0),
                imgKey: cmd.imgKey,
                img: cmd.imgKey ? assets.getImage(cmd.imgKey) : null,
                imgKeys: Array.isArray(cmd.imgKeys) ? cmd.imgKeys : null,
                frameMs: Number.isFinite(cmd.frameMs) ? cmd.frameMs : 900,
                frameOffsetMs: Number.isFinite(cmd.frameOffsetMs) ? cmd.frameOffsetMs : 0,
                drawAboveForeground: !!cmd.drawAboveForeground,
                w: cmd.w,
                h: cmd.h
            };
            this.nextStep();
        } else if (cmd.action === 'removeProp') {
            delete this.props[cmd.id];
            this.nextStep();
        } else if (cmd.action === 'clearProps') {
            this.props = {};
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
        } else if (cmd.action === 'playSound') {
            assets.playSound(cmd.key, cmd.volume !== undefined ? cmd.volume : 1.0);
            this.nextStep();
        } else if (cmd.action === 'startCampaignLiubo') {
            this.manager.gameState.clearSceneState('liubo');
            this.manager.gameState.setCampaignVar('narrativeResumeAfterLiubo', null);
            this.prepareNarrativeResumeAfterMinigame();
            this.saveNarrativeState();
            this.manager.switchTo('liubo', {
                mode: 'campaign',
                activityId: cmd.activityId || 'campaign_liubo',
                humanPlayer: cmd.humanPlayer,
                firstPlayer: cmd.firstPlayer
            });
        } else if (cmd.action === 'startBattle') {
            this.saveNarrativeState();
            this.manager.switchTo('tactics', {
                battleId: cmd.battleId,
                ...(cmd.params || {})
            });
        } else if (cmd.action === 'resumeSavedNarrative') {
            const resumeState = this.manager.gameState.getCampaignVar('narrativeResumeAfterLiubo');
            if (resumeState) {
                this.manager.gameState.setSceneState('narrative', resumeState);
                this.manager.gameState.setCampaignVar('narrativeResumeAfterLiubo', null);
            }
            this.skipNextExitSave = true;
            this.manager.switchTo('narrative', { isResume: true });
        } else if (cmd.action === 'restartScript') {
            this.restartScript(cmd.scriptId || this.scriptId);
        } else if (cmd.action === 'setStoryChoice') {
            const routeId = cmd.routeId || this.manager.gameState.getCurrentCampaign() || null;
            if (cmd.key) {
                this.manager.gameState.setStoryChoice(cmd.key, cmd.value, routeId);
            }
            this.nextStep();
        } else if (cmd.action === 'setActorLoop') {
            const actor = this.actors[cmd.id];
            if (actor) {
                if (cmd.enabled === false) {
                    actor.loopXStart = null;
                    actor.loopXEnd = null;
                    if (actor.action === 'walk') actor.action = 'standby';
                } else {
                    actor.loopXStart = cmd.loopXStart !== undefined ? cmd.loopXStart : actor.loopXStart;
                    actor.loopXEnd = cmd.loopXEnd !== undefined ? cmd.loopXEnd : actor.loopXEnd;
                }
            }
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
            // Clear all clickable actors, props, and regions
            this.clickableActors = {};
            this.clickableProps = {};
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
            const target = this.findLabelFrame(labelName);
            if (target) {
                while (this.executionFrames.length - 1 > target.frameIndex) {
                    this.executionFrames.pop();
                }
                const frame = this.executionFrames[target.frameIndex];
                frame.index = target.index;
                this.activateFrame(frame);
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
        const allowImmediateInteractiveAdvance = this.pendingInteractiveAdvance;
        this.pendingInteractiveAdvance = false;
        
        if (step && (step.type === 'interactive' || step.type === 'prompt') && this.isInteractive) {
            if (!allowImmediateInteractiveAdvance) return;
            this.clearInteractiveState();
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
        this.waitingForActorId = null;
        this.waitingForActorIds = null;
        this.timer = 0;

        if (this.currentStep >= this.script.length) {
            if (this.executionFrames?.length > 1) {
                const completed = this.popRuntimeFrame();
                if (completed?.advanceParentAfter) {
                    if (this.isInteractive) this.clearInteractiveState();
                    this.nextStep();
                    return;
                }
                if (completed?.returnToInteractive && this.interactiveStepIndex >= 0) {
                    this.currentStep = this.interactiveStepIndex;
                    this.isInteractive = true;
                    this.isWaiting = true;
                    this.processStep();
                    this.saveNarrativeState();
                    return;
                }
                this.saveNarrativeState();
                this.processStep();
                return;
            }
            // Clear narrative state when script completes
            const savedState = this.manager.gameState.getSceneState('narrative');
            this.manager.gameState.clearSceneState('narrative');
            
            // Use onComplete if available, otherwise use saved nextScene info
            if (this.onComplete) {
                this.onComplete();
                return;
            } else if (savedState?.storyRouteId && savedState?.storyNodeId) {
                completeStoryNode(this.manager, savedState.storyRouteId, savedState.storyNodeId);
                return;
            } else if (savedState && savedState.nextScene) {
                // Restore transition from saved state (onComplete was lost during restore)
                // Handle special cases that need milestones or other side effects
                if (this.scriptId === 'inn') {
                    // Add milestone when inn scene completes (normally done in onComplete)
                    this.manager.gameState.addMilestone('prologue_complete');
                    this.manager.gameState.setStoryCursor('prologue_complete', 'liubei');
                } else if (this.scriptId === 'caocao_dunqiu_intro' || this.scriptId === 'caocao_after_training') {
                    this.manager.gameState.setStoryCursor('caocao_intro_complete', 'caocao');
                } else if (this.scriptId === 'caocao_ch1_end_card') {
                    this.manager.gameState.setStoryCursor('caocao_chapter1_complete', 'caocao');
                    this.manager.gameState.addMilestone('caocao_chapter1_complete');
                } else if (this.scriptId === 'chapter2_hejin_gate') {
                    completeStoryNode(this.manager, 'hejin', 'chapter2_hejin_gate');
                    return;
                } else if (this.scriptId === 'chapter2_hejin_council') {
                    completeStoryNode(this.manager, 'hejin', 'chapter2_hejin_council');
                    return;
                } else if (this.scriptId === 'chapter2_hejin_enthronement') {
                    completeStoryNode(this.manager, 'hejin', 'chapter2_hejin_enthronement');
                    return;
                } else if (this.scriptId === 'chapter2_hejin_jian_shuo') {
                    completeStoryNode(this.manager, 'hejin', 'chapter2_hejin_jian_shuo');
                    return;
                } else if (this.scriptId === 'chapter2_wan_strategy') {
                    completeStoryNode(this.manager, 'chapter2_oath', 'chapter2_wan_strategy');
                    return;
                } else if (this.scriptId === 'chapter2_wan_reversal') {
                    completeStoryNode(this.manager, 'chapter2_oath', 'chapter2_wan_reversal');
                    return;
                } else if (this.scriptId === 'chapter2_anxi_appointment') {
                    completeStoryNode(this.manager, 'chapter2_oath', 'chapter2_anxi_appointment');
                    return;
                } else if (this.scriptId === 'chapter2_anxi_governance') {
                    completeStoryNode(this.manager, 'chapter2_oath', 'chapter2_anxi_governance');
                    return;
                } else if (this.scriptId === 'chapter2_liuhui_shelter') {
                    completeStoryNode(this.manager, 'chapter2_oath', 'chapter2_liuhui_shelter');
                    return;
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

    debugFastSkip() {
        if (!this.script || this.script.length === 0) return false;

        const isChoiceStep = (step) => {
            if (!step) return false;
            return step.type === 'choice' || step.type === 'interactive' || step.type === 'prompt';
        };

        // If we're already at a player decision point, keep it there.
        if (isChoiceStep(this.script[this.currentStep])) {
            return true;
        }

        // Fast-forward through the script while preserving command side effects.
        const maxIterations = Math.max(1, this.script.length * 4);
        for (let i = 0; i < maxIterations; i++) {
            if (this.currentStep >= this.script.length) {
                return true; // nextStep() already handled completion transition.
            }

            const step = this.script[this.currentStep];
            if (isChoiceStep(step)) {
                this.processStep();
                this.saveNarrativeState();
                return true;
            }

        this.isWaiting = false;
        this.waitingForActorId = null;
        this.waitingForActorIds = null;
        this.timer = 0;
            this.elapsedInStep = 9999;
            this.hasNextChunk = false;
            this.nextStep();

            if (this.currentStep >= this.script.length) {
                return true;
            }
        }

        return true;
    }
    
    saveNarrativeState() {
        // Save narrative state whenever it changes (for page refresh recovery)
        const gs = this.manager.gameState;
        this.syncActiveFrame();
        
        // Don't save if script is empty or invalid
        if (!this.script || this.script.length === 0) {
            console.warn('Not saving narrative state: script is empty', {
                scriptId: this.scriptId,
                currentStep: this.currentStep
            });
            // Clear any existing invalid state
            gs.clearSceneState('narrative');
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
            gs.clearSceneState('narrative');
            return;
        }
        
        // Save next scene transition info (can't serialize onComplete callback)
        // Always try to determine next scene from scriptId, even if onComplete is null
        // This ensures we can transition correctly after restore
        let nextScene = this.getNextSceneForScriptId(this.scriptId);
        let nextParams = this.getNextParamsForScriptId(this.scriptId);
        
        const serializedFrames = (this.executionFrames || []).map((frame, index) => ({
            type: frame.type || (index === 0 ? 'base' : 'runtime'),
            steps: index === 0 ? null : frame.steps,
            index: frame.index || 0,
            returnToInteractive: !!frame.returnToInteractive,
            advanceParentAfter: !!frame.advanceParentAfter
        }));
        const state = {
            scriptId: this.scriptId,
            script: !this.scriptId && this.baseScript && this.baseScript.length > 0 ? this.baseScript : null,
            storyRouteId: this.storyRouteId,
            storyNodeId: this.storyNodeId,
            executionFrames: serializedFrames,
            currentStep: this.currentStep,
            subStep: this.subStep,
            actors: this.actors,
            props: this.props,
            nextScene: nextScene,
            nextParams: nextParams,
            isWaiting: this.isWaiting,
            waitingForActorId: this.waitingForActorId,
            waitingForActorIds: Array.isArray(this.waitingForActorIds) ? [...this.waitingForActorIds] : null,
            timer: this.timer,
            fadeAlpha: this.fadeAlpha,
            fadeTarget: this.fadeTarget,
            fadeSpeed: this.fadeSpeed,
            elapsedInStep: this.elapsedInStep,
            musicKey: assets.currentMusicKey || null, // Save current music
            isInteractive: this.isInteractive || false,
            interactiveStepIndex: this.interactiveStepIndex !== undefined ? this.interactiveStepIndex : -1,
            clickableActors: this.clickableActors || {},
            clickableProps: this.clickableProps || {},
            clickableRegions: this.clickableRegions || {},
            returnStack: this.returnStack ? [...this.returnStack] : [],
            insertedStepsCount: 0,
            insertedStepsStartIndex: -1
        };
        gs.setSceneState('narrative', state);
        gs.setLastScene('narrative');
    }

    update(timestamp) {
        // Invalid state guard: avoid running update logic or periodic save loops with no script loaded.
        if (!this.script || this.script.length === 0) return;
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
        if (step && (step.type === 'interactive' || step.type === 'prompt') && this.isInteractive && !this.isWaiting) {
            // Self-heal stale restored flags that can block Enter/click interaction.
            this.isWaiting = true;
        }
        if (step && step.type === 'choice' && this.selection) {
            this.updateSelectionMouse(currentMouseX, currentMouseY);
        }
        
        // Update hover state for interactive mode
        if (this.isInteractive && this.isWaiting) {
            this.rebuildInteractiveNavTargets();

            // Re-enable mouseover mode only after actual mouse movement.
            if (currentMouseX !== this.lastMouseX || currentMouseY !== this.lastMouseY) {
                this.interactiveNavMouseEnabled = true;
            }

            if (this.interactiveNavMouseEnabled) {
                this.updateHoverState(currentMouseX, currentMouseY);
                // Snap nav focus to whatever mouse is currently over.
                if (this.hoveredRegion) {
                    const idx = this.interactiveNavTargets.findIndex(t => t.type === 'region' && t.regionId === this.hoveredRegion);
                    if (idx >= 0) this.interactiveNavIndex = idx;
                } else if (this.hoveredActor) {
                    const idx = this.interactiveNavTargets.findIndex(t => t.type === 'actor' && t.actorId === this.hoveredActor);
                    if (idx >= 0) this.interactiveNavIndex = idx;
                }
            } else {
                // Controller/keyboard mode drives hover highlight.
                this.syncInteractiveHoverFromNav();
            }
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
        if (currentStep && currentStep.type === 'dialogue') {
            // Prefer explicit speaker IDs so a fallback portrait can still animate
            // the correct on-screen actor.
            const speakerSource = currentStep.speaker || currentStep.portraitKey;
            currentSpeakerId = speakerSource ? String(speakerSource).replace(/-/g, '') : null;
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
                const isAmbientLoop = a.loopXStart !== null && a.loopXEnd !== null;
                if (!isAmbientLoop) allMoved = false;
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
                if (a.loopXStart !== null && a.loopXEnd !== null) {
                    // Continuous side-scroller pedestrian loop.
                    a.x = a.loopXStart;
                    a.targetX = a.loopXEnd;
                    a.targetY = a.y;
                    a.action = 'walk';
                    a.flip = a.loopXEnd < a.loopXStart;
                } else if (a.action === 'walk') {
                    a.action = 'standby';
                }
            }
        }

        if (this.isWaiting && Array.isArray(this.waitingForActorIds) && this.waitingForActorIds.length > 0) {
            const allWaitingActorsArrived = this.waitingForActorIds.every(id => {
                const actor = this.actors[id];
                if (!actor) return true;
                const dx = actor.targetX - actor.x;
                const dy = actor.targetY - actor.y;
                return Math.sqrt(dx * dx + dy * dy) <= 1;
            });
            if (allWaitingActorsArrived && this.fadeAlpha === this.fadeTarget) {
                this.nextStep();
                return;
            }
        }

        if (this.isWaiting && this.waitingForActorId) {
            const waitingActor = this.actors[this.waitingForActorId];
            if (!waitingActor) {
                this.nextStep();
                return;
            }
            const waitDx = waitingActor.targetX - waitingActor.x;
            const waitDy = waitingActor.targetY - waitingActor.y;
            const waitDist = Math.sqrt(waitDx * waitDx + waitDy * waitDy);
            if (waitDist <= 1 && this.fadeAlpha === this.fadeTarget) {
                this.nextStep();
                return;
            }
        }

        if (this.isWaiting && !this.waitingForActorId && !this.waitingForActorIds && allMoved && this.timer === 0 && this.fadeAlpha === this.fadeTarget) {
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
            // Try to recover exactly once to avoid log/transition spam.
            if (!this.invalidScriptRecoveryScheduled) {
                this.invalidScriptRecoveryScheduled = true;
                const gs = this.manager.gameState;
                gs.clearSceneState('narrative');
                setTimeout(() => {
                    const campaignId = gs.getCurrentCampaign();
                    if (campaignId) {
                        this.manager.switchTo('map', { campaignId });
                    } else {
                        this.manager.switchTo('campaign_selection');
                    }
                }, 50);
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
        const bgKey = this.getActiveVisualKey('bg');
        const fgKey = this.getActiveVisualKey('fg');
        const fgAlphaRaw = this.getActiveVisualKey('fgAlpha');
        const fgAlpha = (typeof fgAlphaRaw === 'number') ? Math.max(0, Math.min(1, fgAlphaRaw)) : 1;
        const visualPaletteInfo = this.findActiveVisualPaletteStep();
        const visualPaletteProgress = this.getVisualPaletteProgress(visualPaletteInfo);

        let bgX = 0;
        let bgY = 0;
        let bgWidth = 0;
        let bgHeight = 0;
        
        let resolvedBg = null;
        if (bgKey) {
            resolvedBg = assets.getImage(bgKey);
            // Defensive fallback for Cao Cao intro: never allow a pure black stage.
            if (!resolvedBg && this.scriptId === 'caocao_dunqiu_intro') {
                resolvedBg = assets.getImage('urban_street') || assets.getImage('army_camp');
            }
            const bg = this.getPaletteShiftedVisualImage(resolvedBg, visualPaletteInfo, visualPaletteProgress);
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

        const hideFadePreloadedSetup = this.isFadeSetupPreloadActive();
        const actorEntries = Object.entries(this.actors)
            .filter(([, actor]) => !(hideFadePreloadedSetup && actor.preloadedDuringFade))
            .map(([id, actor]) => ({ id, type: 'actor', item: actor, sortY: actor.y }));
        const propEntries = Object.entries(this.props || {})
            .filter(([, prop]) => !(hideFadePreloadedSetup && prop.preloadedDuringFade))
            .map(([id, prop]) => ({ id, type: 'prop', item: prop, sortY: prop.sortY ?? prop.y }));
        const sortedDrawables = [...actorEntries, ...propEntries].sort((a, b) => a.sortY - b.sortY);
        const drawablesBelowForeground = sortedDrawables.filter(entry => !entry.item.drawAboveForeground);
        const drawablesAboveForeground = sortedDrawables.filter(entry => !!entry.item.drawAboveForeground);
        const hoveredActorOutlines = {
            below: null,
            above: null
        };
        const hoveredPropOutlines = {
            below: null,
            above: null
        };
        const drawActor = (a, actorId) => {
            if (!a.img && a.imgKey) {
                a.img = assets.getImage(a.imgKey);
            }
            const actorScreenX = bgX + a.x;
            const actorScreenY = bgY + a.y;
            
            // Check if this actor is clickable and hovered
            const isClickable = actorId && this.clickableActors && this.clickableActors[actorId];
            const isHovered = this.isInteractive && isClickable && this.hoveredActor === actorId;
            
            // Draw actor
            this.drawCharacter(ctx, a.img, a.action, a.frame, actorScreenX, actorScreenY, { flip: a.flip });
            
            if (isHovered) {
                const outlineLayer = a.drawAboveForeground ? 'above' : 'below';
                hoveredActorOutlines[outlineLayer] = {
                    img: a.img,
                    action: a.action,
                    frame: a.frame,
                    x: actorScreenX,
                    y: actorScreenY,
                    flip: a.flip
                };
            }
        };
        const drawProp = (prop, propId) => {
            const img = this.getPropImage(prop);
            if (!img) return;
            const w = prop.w || img.width;
            const h = prop.h || img.height;
            ctx.drawImage(img, bgX + prop.x, bgY + prop.y, w, h);
            const isClickable = propId && this.clickableProps && this.clickableProps[propId];
            if (this.isInteractive && isClickable && this.hoveredProp === propId) {
                const outlineLayer = prop.drawAboveForeground ? 'above' : 'below';
                hoveredPropOutlines[outlineLayer] = {
                    img,
                    x: bgX + prop.x,
                    y: bgY + prop.y,
                    w,
                    h
                };
            }
        };
        const drawDrawable = (entry) => {
            if (entry.type === 'prop') drawProp(entry.item, entry.id);
            else drawActor(entry.item, entry.id);
        };
        const drawHoveredActorOutline = (outline) => {
            if (!outline) return;
            this.drawCharacterPixelOutline(
                ctx,
                outline.img,
                outline.action,
                outline.frame,
                outline.x,
                outline.y,
                { flip: outline.flip, color: '#ffd700' }
            );
        };
        const drawHoveredPropOutline = (outline) => {
            if (!outline) return;
            this.drawImagePixelOutline(ctx, outline.img, outline.x, outline.y, outline.w, outline.h, { color: '#ffd700' });
        };
        drawablesBelowForeground.forEach(drawDrawable);
        drawHoveredActorOutline(hoveredActorOutlines.below);
        drawHoveredPropOutline(hoveredPropOutlines.below);

        if (fgKey && resolvedBg) {
            const fg = this.getPaletteShiftedVisualImage(assets.getImage(fgKey), visualPaletteInfo, visualPaletteProgress);
            if (fg) {
                ctx.save();
                ctx.globalAlpha *= fgAlpha;
                ctx.drawImage(fg, bgX, bgY, bgWidth || fg.width, bgHeight || fg.height);
                ctx.restore();
            }
        }
        drawablesAboveForeground.forEach(drawDrawable);
        drawHoveredActorOutline(hoveredActorOutlines.above);
        drawHoveredPropOutline(hoveredPropOutlines.above);
        ctx.restore();

        // Fade overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (this.shouldRenderInteractiveRegions(step)) {
            this.renderClickableRegions(ctx, canvas, step);
        }

        const previousTitleLinkRegion = this.titleLinkRegion;
        this.titleLinkRegion = null;
        if (step && step.type === 'title') {
            this.renderTitleCard(step, previousTitleLinkRegion);
        } else if (step && (step.type === 'dialogue' || step.type === 'narrator')) {
            const bgKey = this.getActiveVisualKey('bg');
            const bgImg = bgKey ? assets.getImage(bgKey) : null;
            const status = this.renderDialogueBox(ctx, canvas, step, { 
                subStep: this.subStep,
                bgImg: bgImg 
            });
            this.hasNextChunk = status.hasNextChunk;
        } else if (step && step.type === 'choice') {
            this.renderChoice(step);
        }
        this.renderNarrativeInactivityPrompt(ctx, canvas, timestamp);
    }

    getNarrativeInactivityPrompt(step) {
        if (!step) return null;
        if (step.type === 'dialogue' || step.type === 'narrator' || step.type === 'title') {
            return this.getModalityPrompt({
                mouse: { en: "Click anywhere to advance the text.", zh: "点击任意位置继续文字。" },
                touch: { en: "Tap anywhere to advance the text.", zh: "轻触任意位置继续文字。" },
                keyboard: { en: "Press Enter/Space to advance the text.", zh: "按 Enter/空格继续文字。" },
                controller: { en: "Press the confirm button to advance the text.", zh: "按确认键继续文字。" }
            });
        }
        if (this.isInteractive && this.isWaiting && (step.type === 'interactive' || step.type === 'prompt')) {
            return this.getModalityPrompt({
                mouse: { en: "Click a person or object to interact with them.", zh: "点击人物或物体进行互动。" },
                touch: { en: "Tap a person or object to interact with them.", zh: "轻触人物或物体进行互动。" },
                keyboard: { en: "Use arrow keys to choose a person or object, then press Enter/Space.", zh: "用方向键选择人物或物体，再按 Enter/空格。" },
                controller: { en: "Use the D-pad or stick to choose a person or object, then press confirm.", zh: "用方向键或摇杆选择人物或物体，再按确认键。" }
            });
        }
        return null;
    }

    renderNarrativeInactivityPrompt(ctx, canvas, timestamp) {
        if (this.fadeAlpha !== this.fadeTarget) return;
        const step = this.script?.[this.currentStep];
        const prompt = this.getNarrativeInactivityPrompt(step);
        if (!prompt) return;
        const contextKey = this.getNarrativeInactivityPromptContextKey(step);
        const promptStartAt = (step?.type === 'dialogue' || step?.type === 'narrator' || step?.type === 'title')
            ? this.getVoiceAwareInactivityPromptStart(timestamp, contextKey, step.voiceId)
            : null;
        this.renderInactivityPrompt(ctx, canvas, prompt, {
            timestamp,
            contextKey,
            promptStartAt
        });
    }

    getNarrativeInactivityPromptContextKey(step) {
        if (!step) return 'narrative:none';
        const frameDepth = Array.isArray(this.executionFrames) ? this.executionFrames.length : 0;
        if (step.type === 'dialogue' || step.type === 'narrator' || step.type === 'title') {
            return `narrative:${this.scriptId || 'script'}:${frameDepth}:${this.currentStep}:${this.subStep}:${step.type}`;
        }
        if (this.isInteractive && this.isWaiting && (step.type === 'interactive' || step.type === 'prompt')) {
            return `narrative:${this.scriptId || 'script'}:${frameDepth}:${this.currentStep}:interactive:${this.interactiveStepIndex}`;
        }
        return `narrative:${this.scriptId || 'script'}:${frameDepth}:${this.currentStep}:${step.type || 'step'}`;
    }

    shouldRenderInteractiveRegions(step) {
        if (!this.isInteractive || !this.clickableRegions) return false;
        return step?.type === 'interactive' || step?.type === 'prompt';
    }
    
    renderClickableRegions(ctx, canvas, step) {
        // Get background position
        let bgKey = step?.bg || this.getActiveVisualKey('bg');
        
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
            const regionScreenX = region.screenSpace ? region.x : (bgX + region.x);
            const regionScreenY = region.screenSpace ? region.y : (bgY + region.y);
            const isHovered = this.hoveredRegion === regionId;

            if (region.promptStyle) {
                this.renderPromptRegion(ctx, region, isHovered);
                continue;
            }
            
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

    buildPromptClickableRegions(step) {
        const { canvas } = this.manager;
        const options = Array.isArray(step.promptOptions) && step.promptOptions.length > 0
            ? step.promptOptions
            : [{
                id: step.id || 'prompt_0',
                text: step.text,
                position: step.position || 'left',
                onClick: step.onClick || null,
                advanceOnClick: step.advanceOnClick !== false
            }];
        const defaultW = 60;
        const defaultH = 25;
        const gap = 8;
        const totalH = options.reduce((sum, opt) => sum + (opt.h || defaultH), 0) + Math.max(0, options.length - 1) * gap;
        let currentY = Math.floor(canvas.height / 2 - totalH / 2);
        const regions = {};
        for (let i = 0; i < options.length; i++) {
            const opt = options[i] || {};
            const w = opt.w || defaultW;
            const h = opt.h || defaultH;
            const margin = opt.margin !== undefined ? opt.margin : 10;
            let x = 0;
            if (typeof opt.x === 'number') {
                x = opt.x;
            } else if ((opt.position || 'left') === 'right') {
                x = canvas.width - w - margin;
            } else if ((opt.position || 'left') === 'center') {
                x = Math.floor(canvas.width / 2 - w / 2);
            } else {
                x = margin;
            }
            const y = typeof opt.y === 'number' ? opt.y : currentY;
            const id = opt.id || `prompt_${i}`;
            regions[id] = {
                x,
                y,
                w,
                h,
                screenSpace: true,
                promptStyle: true,
                text: opt.text || '',
                position: opt.position || 'left',
                onClick: opt.onClick || null,
                advanceOnClick: opt.advanceOnClick !== false
            };
            currentY += h + gap;
        }
        return regions;
    }

    renderPromptRegion(ctx, region, isHovered) {
        const px = region.x;
        const py = region.y;
        const w = region.w;
        const h = region.h;

        ctx.save();
        ctx.fillStyle = isHovered ? 'rgba(40, 40, 40, 0.95)' : 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, w, h);
        ctx.strokeStyle = isHovered ? '#fff' : '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);

        const pulse = Math.abs(Math.sin(Date.now() / 400)) * 5;
        if ((region.position || 'left') !== 'right') {
            ctx.fillStyle = isHovered ? '#fff' : '#ffd700';
            ctx.beginPath();
            ctx.moveTo(px - 5 - pulse, py + h / 2);
            ctx.lineTo(px + 2 - pulse, py + h / 2 - 5);
            ctx.lineTo(px + 2 - pulse, py + h / 2 + 5);
            ctx.fill();
        } else {
            ctx.fillStyle = isHovered ? '#fff' : '#ffd700';
            ctx.beginPath();
            ctx.moveTo(px + w + 5 + pulse, py + h / 2);
            ctx.lineTo(px + w - 2 + pulse, py + h / 2 - 5);
            ctx.lineTo(px + w - 2 + pulse, py + h / 2 + 5);
            ctx.fill();
        }

        const localizedText = getLocalizedText(region.text || '');
        this.drawPixelText(ctx, localizedText, px + Math.floor(w / 2), py + Math.floor(h / 2) - 4, {
            color: isHovered ? '#fff' : '#ffd700',
            font: '8px Silkscreen',
            align: 'center'
        });
        ctx.restore();
    }

    renderChoice(step) {
        const { ctx, canvas } = this.manager;
        const options = this.getAvailableChoiceOptions(step);
        const previewLayout = this.getChoicePanelLayout(ctx, canvas, options, { promptText: step.prompt });
        previewLayout.optionRects.forEach(rect => {
            const isMouseOver = this.lastMouseX >= rect.x && this.lastMouseX <= rect.x + rect.w &&
                this.lastMouseY >= rect.y && this.lastMouseY <= rect.y + rect.h;
            if (isMouseOver && this.selection) {
                this.handleSelectionMouseover(rect.index);
            }
        });

        const layout = this.renderChoicePanel(ctx, canvas, options, {
            highlightedIndex: this.selection ? this.selection.highlightedIndex : -1,
            promptText: step.prompt
        });
        step._panelMetadata = { ...layout, options };
    }

    renderTitleCard(step, previousTitleLinkRegion = null) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = Math.floor(canvas.width / 2);
        const cy = Math.floor(canvas.height / 2);

        const titleImage = this.getTitleCardImage(step);
        let nextY = cy + 6;
        if (titleImage) {
            const maxTitleW = Math.floor(canvas.width * 0.76);
            const maxTitleH = Math.floor(canvas.height * 0.42);
            const scale = Math.min(maxTitleW / titleImage.width, maxTitleH / titleImage.height, 1);
            const drawW = Math.max(1, Math.floor(titleImage.width * scale));
            const drawH = Math.max(1, Math.floor(titleImage.height * scale));
            const drawX = Math.floor((canvas.width - drawW) / 2);
            const drawY = Math.floor(cy - drawH / 2 - 16);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(titleImage, drawX, drawY, drawW, drawH);
            nextY = drawY + drawH + 14;
        } else {
            const localizedText = getLocalizedText(step.text);
            this.drawPixelText(ctx, localizedText, cx, cy - 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        }
        
        if (step.subtext) {
            const localizedSubtext = getLocalizedText(step.subtext);
            const lines = String(localizedSubtext).split('\n');
            lines.forEach((line, index) => {
                this.drawPixelText(ctx, line, cx, nextY + index * 12, { color: '#eee', font: '8px Silkscreen', align: 'center' });
            });
            nextY += lines.length * 12;
        }

        if (step.linkUrl && step.linkText) {
            const localizedLinkText = getLocalizedText(step.linkText);
            const linkY = nextY + 2;
            const linkColor = step.linkColor || '#7ec8ff';
            const linkHoverColor = step.linkHoverColor || linkColor;
            const isHoveringLink = previousTitleLinkRegion
                && previousTitleLinkRegion.step === step
                && this.lastMouseX >= previousTitleLinkRegion.x
                && this.lastMouseX <= previousTitleLinkRegion.x + previousTitleLinkRegion.w
                && this.lastMouseY >= previousTitleLinkRegion.y
                && this.lastMouseY <= previousTitleLinkRegion.y + previousTitleLinkRegion.h;
            const activeLinkColor = isHoveringLink ? linkHoverColor : linkColor;
            const metrics = this.drawPixelText(ctx, localizedLinkText, cx, linkY, { color: activeLinkColor, font: '8px Silkscreen', align: 'center' });
            if (metrics) {
                const underlineY = Math.round(linkY + 10);
                ctx.fillStyle = activeLinkColor;
                ctx.fillRect(metrics.drawX, underlineY, Math.max(1, Math.round(metrics.width)), 1);
                this.titleLinkRegion = {
                    step,
                    url: step.linkUrl,
                    x: metrics.drawX - 3,
                    y: linkY - 3,
                    w: metrics.width + 6,
                    h: 16
                };
            }
        }

        // Pulse "CLICK TO CONTINUE" if player is waiting
        const promptDelayMs = step.continuePromptDelayMs !== undefined ? step.continuePromptDelayMs : 3500;
        if (this.elapsedInStep > promptDelayMs) {
            const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;
            ctx.globalAlpha = pulse;
            const continueText = getLocalizedText(step.continueText || UI_TEXT['CLICK TO CONTINUE']);
            this.drawPixelText(ctx, continueText, cx, canvas.height - 30, { 
                color: '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            ctx.globalAlpha = 1.0;
        }
    }

    getTitleCardImage(step) {
        if (!step?.titleImageKey) return null;
        const lang = getCurrentLanguage();
        const imageKey = typeof step.titleImageKey === 'string'
            ? step.titleImageKey
            : (step.titleImageKey[lang] || step.titleImageKey.en);
        if (!imageKey) return null;
        const source = assets.getImage(imageKey);
        if (!source) return null;
        if (imageKey === 'title_en') return source;
        if (this.titleImageCache.has(imageKey)) return this.titleImageCache.get(imageKey);

        const processed = document.createElement('canvas');
        processed.width = source.width;
        processed.height = source.height;
        const pctx = processed.getContext('2d');
        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(source, 0, 0);
        const imageData = pctx.getImageData(0, 0, processed.width, processed.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255;
            } else {
                data[i + 3] = 0;
            }
        }
        pctx.putImageData(imageData, 0, 0);
        this.titleImageCache.set(imageKey, processed);
        return processed;
    }

    activateTitleLinkAt(x, y, step) {
        const region = this.titleLinkRegion;
        if (!region || region.step !== step || !region.url) return false;
        if (x < region.x || x > region.x + region.w || y < region.y || y > region.y + region.h) return false;
        assets.playSound('ui_click', 0.5);
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(region.url, '_blank', 'noopener,noreferrer');
        }
        return true;
    }

    getPropImage(prop) {
        if (!prop) return null;
        if (Array.isArray(prop.imgKeys) && prop.imgKeys.length > 0) {
            const frameMs = Math.max(1, prop.frameMs || 900);
            const frameIdx = Math.floor((Date.now() + (prop.frameOffsetMs || 0)) / frameMs) % prop.imgKeys.length;
            return assets.getImage(prop.imgKeys[frameIdx]);
        }
        if (!prop.img && prop.imgKey) {
            prop.img = assets.getImage(prop.imgKey);
        }
        return prop.img || null;
    }

    checkPropImageHit(prop, screenX, screenY, clickX, clickY) {
        const img = this.getPropImage(prop);
        if (!img) return false;
        const w = prop.w || img.width;
        const h = prop.h || img.height;
        if (clickX < screenX || clickX > screenX + w || clickY < screenY || clickY > screenY + h) return false;

        const localX = Math.floor((clickX - screenX) * img.width / w);
        const localY = Math.floor((clickY - screenY) * img.height / h);
        if (localX < 0 || localX >= img.width || localY < 0 || localY >= img.height) return false;

        if (!this._hitCanvas) {
            this._hitCanvas = document.createElement('canvas');
            this._hitCanvas.width = 1;
            this._hitCanvas.height = 1;
            this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
        }
        const hctx = this._hitCtx;
        hctx.clearRect(0, 0, 1, 1);
        hctx.drawImage(img, localX, localY, 1, 1, 0, 0, 1, 1);
        return hctx.getImageData(0, 0, 1, 1).data[3] > 32;
    }

    drawImagePixelOutline(ctx, img, x, y, w, h, options = {}) {
        if (!img) return;
        const color = options.color || '#ffd700';
        const alphaThreshold = options.alphaThreshold ?? 32;
        const srcW = img.width;
        const srcH = img.height;
        const destW = Math.max(1, Math.ceil(w || srcW));
        const destH = Math.max(1, Math.ceil(h || srcH));

        const outlineCanvas = this.getCachedPixelOutlineCanvas(
            img,
            0,
            0,
            srcW,
            srcH,
            color,
            alphaThreshold,
            this._imageFrameOutlineCache,
            128
        );
        if (!outlineCanvas) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(outlineCanvas, Math.floor(x), Math.floor(y), destW, destH);
        ctx.restore();
    }

    activateInteractiveRegion(regionId) {
        const region = this.clickableRegions?.[regionId];
        if (!region) return false;
        assets.playSound('ui_click', 0.5);
        let clickHandler = region.onClick;
        if (region.liuboActivityId && region.onClickRepeat) {
            const record = this.manager.gameState.getCampaignLiuboRecord();
            const played = record.activities?.[region.liuboActivityId]?.played || 0;
            if (played > 0) clickHandler = region.onClickRepeat;
        }

        if (clickHandler) {
            if (Array.isArray(clickHandler)) {
                const shouldAdvanceRegion = !!region.advanceOnClick || (!!region.promptStyle && !clickHandler);
                if (this.pushRuntimeFrame(clickHandler, {
                    returnToInteractive: !shouldAdvanceRegion,
                    advanceParentAfter: shouldAdvanceRegion
                })) {
                    if (shouldAdvanceRegion) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (clickHandler.branch) {
                const branchSteps = clickHandler.branch;
                if (Array.isArray(branchSteps)) {
                    const returnsToInteractive = clickHandler.return !== false;
                    if (this.pushRuntimeFrame(branchSteps, {
                        returnToInteractive: returnsToInteractive,
                        advanceParentAfter: !returnsToInteractive
                    })) {
                        if (!returnsToInteractive) this.clearInteractiveState();
                        this.processStep();
                        return true;
                    }
                } else if (typeof branchSteps === 'string') {
                    this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: branchSteps }], {
                        returnToInteractive: clickHandler.return !== false,
                        advanceParentAfter: clickHandler.return === false
                    });
                    if (clickHandler.return === false) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (typeof clickHandler === 'string') {
                this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: clickHandler }], {
                    returnToInteractive: true
                });
                this.processStep();
                return true;
            }
        }

        const shouldAdvanceRegion = !!region.advanceOnClick || (!!region.promptStyle && !clickHandler);
        if (shouldAdvanceRegion) {
            this.pendingInteractiveAdvance = true;
        }
        this.nextStep();
        return true;
    }

    activateInteractiveProp(propId) {
        const prop = this.clickableProps?.[propId];
        if (!prop) return false;
        if (prop.delegateActorId && this.clickableActors?.[prop.delegateActorId]) {
            return this.activateInteractiveActor(prop.delegateActorId);
        }
        assets.playSound('ui_click', 0.5);
        const clickHandler = prop.onClick;

        if (clickHandler) {
            if (Array.isArray(clickHandler)) {
                if (this.pushRuntimeFrame(clickHandler, {
                    returnToInteractive: !prop.advanceOnClick,
                    advanceParentAfter: !!prop.advanceOnClick
                })) {
                    if (prop.advanceOnClick) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (clickHandler.branch) {
                const branchSteps = clickHandler.branch;
                if (Array.isArray(branchSteps)) {
                    const returnsToInteractive = clickHandler.return !== false;
                    if (this.pushRuntimeFrame(branchSteps, {
                        returnToInteractive: returnsToInteractive,
                        advanceParentAfter: !returnsToInteractive
                    })) {
                        if (!returnsToInteractive) this.clearInteractiveState();
                        this.processStep();
                        return true;
                    }
                } else if (typeof branchSteps === 'string') {
                    this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: branchSteps }], {
                        returnToInteractive: clickHandler.return !== false,
                        advanceParentAfter: clickHandler.return === false
                    });
                    if (clickHandler.return === false) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (typeof clickHandler === 'string') {
                this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: clickHandler }], {
                    returnToInteractive: true
                });
                this.processStep();
                return true;
            }
        }

        if (prop.advanceOnClick) {
            this.pendingInteractiveAdvance = true;
        }
        this.nextStep();
        return true;
    }

    activateInteractiveActor(actorId) {
        const actor = this.clickableActors?.[actorId];
        if (!actor) return false;
        assets.playSound('ui_click', 0.5);
        const clickHandler = actor.onClick;

        if (clickHandler) {
            if (Array.isArray(clickHandler)) {
                if (this.pushRuntimeFrame(clickHandler, {
                    returnToInteractive: !actor.advanceOnClick,
                    advanceParentAfter: !!actor.advanceOnClick
                })) {
                    if (actor.advanceOnClick) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (clickHandler.branch) {
                const branchSteps = clickHandler.branch;
                if (Array.isArray(branchSteps)) {
                    const returnsToInteractive = clickHandler.return !== false;
                    if (this.pushRuntimeFrame(branchSteps, {
                        returnToInteractive: returnsToInteractive,
                        advanceParentAfter: !returnsToInteractive
                    })) {
                        if (!returnsToInteractive) this.clearInteractiveState();
                        this.processStep();
                        return true;
                    }
                } else if (typeof branchSteps === 'string') {
                    this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: branchSteps }], {
                        returnToInteractive: clickHandler.return !== false,
                        advanceParentAfter: clickHandler.return === false
                    });
                    if (clickHandler.return === false) this.clearInteractiveState();
                    this.processStep();
                    return true;
                }
            } else if (typeof clickHandler === 'string') {
                this.pushRuntimeFrame([{ type: 'command', action: 'jump', label: clickHandler }], {
                    returnToInteractive: true
                });
                this.processStep();
                return true;
            }
        }

        if (actor.advanceOnClick) {
            this.pendingInteractiveAdvance = true;
        }
        this.nextStep();
        return true;
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
                    this.activateInteractiveRegion(clickedRegion);
                    return;
                }

                const clickedProp = this.checkPropClick(x, y);
                if (clickedProp && this.clickableProps[clickedProp]) {
                    this.activateInteractiveProp(clickedProp);
                    return;
                }
                
                // Check for clicks on clickable actors
                const clickedActor = this.checkActorClick(x, y);
                if (clickedActor && this.clickableActors[clickedActor]) {
                    this.activateInteractiveActor(clickedActor);
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

        if (step && step.type === 'title' && x !== -1000 && y !== -1000 && this.activateTitleLinkAt(x, y, step)) {
            return;
        }
        if (step && step.type === 'title' && this.elapsedInStep < (step.blockAdvanceBeforeMs || 0)) {
            return;
        }

        if (step && step.type === 'choice' && step._panelMetadata) {
            const m = step._panelMetadata;
            
            // Re-enable mouseover on any mouse interaction
            if (x !== -1000 && y !== -1000) {
                if (this.selection) {
                    this.handleSelectionMouseClick();
                }
                
                const options = m.options || this.getAvailableChoiceOptions(step);
                (m.optionRects || []).forEach(rect => {
                    const opt = options[rect.index];
                    if (x >= rect.x && x <= rect.x + rect.w &&
                        y >= rect.y && y <= rect.y + rect.h) {
                        // Create a dialogue step for the choice so it gets voiced and displayed.
                        // Fallback to button text if full text is missing to avoid blank dialogue panels.
                        const choiceDialogue = this.createChoiceDialogueStep(step, opt);

                        const resultSteps = this.cloneScriptSteps(opt.result || []);
                        resultSteps.forEach(s => {
                            if (s && typeof s === 'object') {
                                s._isChoiceInserted = true;
                            }
                        });
                        this.pushRuntimeFrame([choiceDialogue, ...resultSteps], { advanceParentAfter: true });
                        this.processStep();
                    }
                });
            }
            return;
        }

        // Advance script on any pointerdown (if not waiting for command)
        // Allow advancing dialogue even in interactive mode (for NPC dialogue that was inserted)
        // But only if we're currently on a dialogue step, not on the interactive step itself
        if (step && (step.type === 'dialogue' || step.type === 'title' || step.type === 'narrator')) {
            // If in interactive mode, only advance if we're not on the interactive step
            if (!this.isInteractive || (this.isInteractive && this.currentStep !== this.interactiveStepIndex)) {
                if (step.type === 'title' && this.manager.actionRecorder?.recording) {
                    this.manager.actionRecorder.signalActionEnd();
                } else if ((step.type === 'dialogue' || step.type === 'narrator') && this.manager.actionRecorder?.armed) {
                    this.manager.actionRecorder.onUserActionStart();
                }
                this.nextStep();
            }
        }
    }

    checkActorClick(clickX, clickY) {
        // Check if click hits any clickable actor
        const step = this.script[this.currentStep];
        if (!step) return null;
        
        // Get background position
        let bgKey = step?.bg || this.getActiveVisualKey('bg');
        
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

    checkPropClick(clickX, clickY) {
        const step = this.script[this.currentStep];
        if (!step || !this.clickableProps) return null;

        const { bgX, bgY } = this.getCurrentBackgroundOffset();
        const candidates = Object.entries(this.props || {})
            .filter(([propId]) => !!this.clickableProps[propId])
            .sort((a, b) => (b[1].sortY ?? b[1].y) - (a[1].sortY ?? a[1].y));

        for (const [propId, prop] of candidates) {
            const screenX = bgX + prop.x;
            const screenY = bgY + prop.y;
            if (this.checkPropImageHit(prop, screenX, screenY, clickX, clickY)) {
                return propId;
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
        let bgKey = step?.bg || this.getActiveVisualKey('bg');
        
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
            const regionScreenX = region.screenSpace ? region.x : (bgX + region.x);
            const regionScreenY = region.screenSpace ? region.y : (bgY + region.y);
            
            if (clickX >= regionScreenX && clickX <= regionScreenX + region.w &&
                clickY >= regionScreenY && clickY <= regionScreenY + region.h) {
                return regionId;
            }
        }
        
        return null;
    }

    getCurrentBackgroundOffset() {
        const step = this.script[this.currentStep];
        if (!step) return { bgX: 0, bgY: 0 };

        let bgKey = step?.bg || this.getActiveVisualKey('bg');

        const { canvas } = this.manager;
        let bgX = 0, bgY = 0;
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgX = Math.floor((canvas.width - bg.width) / 2);
                bgY = Math.floor((canvas.height - bg.height) / 2);
            }
        }
        return { bgX, bgY };
    }

    rebuildInteractiveNavTargets() {
        const { bgX, bgY } = this.getCurrentBackgroundOffset();
        const targets = [];

        // Regions first (often important scene hotspots like noticeboards, doors, etc.)
        for (const [regionId, region] of Object.entries(this.clickableRegions || {})) {
            targets.push({
                id: `region:${regionId}`,
                type: 'region',
                regionId,
                x: (region.screenSpace ? region.x : bgX + region.x) + region.w / 2,
                y: (region.screenSpace ? region.y : bgY + region.y) + region.h / 2
            });
        }

        for (const [actorId, actor] of Object.entries(this.actors || {})) {
            if (!this.clickableActors || !this.clickableActors[actorId]) continue;
            targets.push({
                id: `actor:${actorId}`,
                type: 'actor',
                actorId,
                x: bgX + actor.x,
                y: bgY + actor.y
            });
        }

        for (const [propId, prop] of Object.entries(this.props || {})) {
            if (!this.clickableProps || !this.clickableProps[propId]) continue;
            const img = this.getPropImage(prop);
            const w = prop.w || img?.width || 1;
            const h = prop.h || img?.height || 1;
            targets.push({
                id: `prop:${propId}`,
                type: 'prop',
                propId,
                x: bgX + prop.x + w / 2,
                y: bgY + prop.y + h / 2
            });
        }

        // Preserve focus when possible
        let selectedId = null;
        if (this.interactiveNavIndex >= 0 && this.interactiveNavIndex < this.interactiveNavTargets.length) {
            selectedId = this.interactiveNavTargets[this.interactiveNavIndex].id;
        }
        this.interactiveNavTargets = targets;

        if (targets.length === 0) {
            this.interactiveNavIndex = -1;
            this.hoveredActor = null;
            this.hoveredProp = null;
            this.hoveredRegion = null;
            return;
        }

        const preserved = selectedId ? targets.findIndex(t => t.id === selectedId) : -1;
        this.interactiveNavIndex = preserved >= 0 ? preserved : Math.min(Math.max(this.interactiveNavIndex, 0), targets.length - 1);
        this.syncInteractiveHoverFromNav();
    }

    syncInteractiveHoverFromNav() {
        this.hoveredActor = null;
        this.hoveredProp = null;
        this.hoveredRegion = null;
        if (this.interactiveNavIndex < 0 || this.interactiveNavIndex >= this.interactiveNavTargets.length) return;
        const target = this.interactiveNavTargets[this.interactiveNavIndex];
        if (target.type === 'actor') this.hoveredActor = target.actorId;
        if (target.type === 'prop') this.hoveredProp = target.propId;
        if (target.type === 'region') this.hoveredRegion = target.regionId;
    }

    moveInteractiveSelection(dirX, dirY) {
        if (this.interactiveNavTargets.length <= 1) return;
        if (this.interactiveNavIndex < 0 || this.interactiveNavIndex >= this.interactiveNavTargets.length) {
            this.interactiveNavIndex = 0;
            this.syncInteractiveHoverFromNav();
            return;
        }

        const bestIdx = this.navigateTargetIndex(this.interactiveNavIndex, this.interactiveNavTargets, dirX, dirY, { coneSlope: 2.2 });
        this.interactiveNavIndex = bestIdx;
        this.syncInteractiveHoverFromNav();
    }

    activateInteractiveTarget(target) {
        this.activateNavigationTarget(target, {
            region: (t) => this.activateInteractiveRegion(t.regionId),
            prop: (t) => this.activateInteractiveProp(t.propId),
            actor: (t) => this.activateInteractiveActor(t.actorId)
        });
    }

    updateHoverState(mouseX, mouseY) {
        // Update which interactive target is being hovered.
        const hoveredProp = this.checkPropClick(mouseX, mouseY);
        const hoveredActor = hoveredProp ? null : this.checkActorClick(mouseX, mouseY);
        const hoveredRegion = this.checkRegionClick(mouseX, mouseY);
        
        if (hoveredActor !== this.hoveredActor) {
            this.hoveredActor = hoveredActor;
        }
        if (hoveredProp !== this.hoveredProp) {
            this.hoveredProp = hoveredProp;
        }
        if (hoveredRegion !== this.hoveredRegion) {
            this.hoveredRegion = hoveredRegion;
        }
    }

    handleKeyDown(e) {
        const step = this.script[this.currentStep];

        // Handle choice navigation using reusable selection system
        if (step && step.type === 'choice' && step._panelMetadata && this.selection) {
            const options = step._panelMetadata.options || this.getAvailableChoiceOptions(step);
            const handled = this.handleSelectionKeyboard(e, (selectedIndex) => {
                // Select the currently highlighted choice
                const opt = options[selectedIndex];
                if (opt) {
                    // Create a dialogue step for the choice so it gets voiced and displayed.
                    // Fallback to button text if full text is missing to avoid blank dialogue panels.
                    const choiceDialogue = this.createChoiceDialogueStep(step, opt);

                    const resultSteps = this.cloneScriptSteps(opt.result || []);
                    resultSteps.forEach(s => {
                        if (s && typeof s === 'object') {
                            s._isChoiceInserted = true;
                        }
                    });
                    this.pushRuntimeFrame([choiceDialogue, ...resultSteps], { advanceParentAfter: true });
                    this.processStep();
                }
            });
            if (handled) return;
        }

        // Interactive narrative navigation (clickable actors/regions):
        // Arrow keys / d-pad move between clickable centroids, Enter activates.
        if (this.isInteractive && this.isWaiting) {
            if (this.interactiveNavTargets.length === 0) {
                this.rebuildInteractiveNavTargets();
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.onNonMouseInput();
                this.moveInteractiveSelection(0, -1);
                assets.playSound('ui_click', 0.4);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.onNonMouseInput();
                this.moveInteractiveSelection(0, 1);
                assets.playSound('ui_click', 0.4);
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.onNonMouseInput();
                this.moveInteractiveSelection(-1, 0);
                assets.playSound('ui_click', 0.4);
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.onNonMouseInput();
                this.moveInteractiveSelection(1, 0);
                assets.playSound('ui_click', 0.4);
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.onNonMouseInput();
                if (this.interactiveNavIndex < 0 && this.interactiveNavTargets.length > 0) {
                    this.interactiveNavIndex = 0;
                    this.syncInteractiveHoverFromNav();
                }
                const t = this.interactiveNavTargets[this.interactiveNavIndex];
                if (t) this.activateInteractiveTarget(t);
                return;
            }
        }
        
        // Default behavior for other steps
        if (e.key === 'Enter' || e.key === ' ') {
            this.handleInput(e);
        }
    }

    onNonMouseInput() {
        super.onNonMouseInput();
        this.interactiveNavMouseEnabled = false;
    }

    onMouseInput(mouseX, mouseY) {
        super.onMouseInput(mouseX, mouseY);
        this.interactiveNavMouseEnabled = true;
        if (this.isInteractive && this.isWaiting) {
            this.updateHoverState(mouseX, mouseY);
        }
    }
    
    getNextSceneForScriptId(scriptId) {
        // Map scriptId to the next scene that should be shown after completion
        // This is used when restoring from saved state (onComplete callbacks can't be serialized)
        if (!scriptId) return null;
        
        const nextSceneMap = {
            'intro_poem': 'campaign_selection',
            'magistrate_briefing': 'tactics',
            'daxing_messenger': 'map',
            'guangzong_arrival': 'map',
            'caocao_dunqiu_intro': 'map',
            'caocao_after_training': 'map',
            'caocao_ch1_end_card': 'campaign_selection',
            'chapter2_hejin_gate': 'campaign_selection',
            'chapter2_hejin_council': 'campaign_selection',
            'chapter2_hejin_enthronement': 'campaign_selection',
            'chapter2_hejin_jian_shuo': 'campaign_selection',
            'chapter2_wan_strategy': 'campaign_selection',
            'chapter2_wan_reversal': 'campaign_selection',
            'chapter2_anxi_appointment': 'campaign_selection',
            'chapter2_anxi_governance': 'campaign_selection',
            'chapter2_liuhui_shelter': 'campaign_selection',
            'noticeboard': 'narrative', // Goes to inn scene next
            'noticeboard_after_training': 'narrative',
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
            'magistrate_briefing': {
                battleId: 'daxing',
                mapGen: {
                    biome: 'northern',
                    layout: 'foothills',
                    forestDensity: 0.15,
                    mountainDensity: 0.1,
                    riverDensity: 0.05,
                    houseDensity: 0.04
                }
            },
            'daxing_messenger': { afterEvent: 'daxing' },
            'guangzong_arrival': { campaignId: 'liubei' },
            'caocao_dunqiu_intro': { campaignId: 'caocao', partyX: 168, partyY: 98 },
            'caocao_after_training': { campaignId: 'caocao', partyX: 168, partyY: 98 },
            'caocao_ch1_end_card': {},
            'chapter2_hejin_gate': {},
            'chapter2_hejin_council': {},
            'chapter2_hejin_enthronement': {},
            'chapter2_hejin_jian_shuo': {},
            'chapter2_wan_strategy': {},
            'chapter2_wan_reversal': {},
            'chapter2_anxi_appointment': {},
            'chapter2_anxi_governance': {},
            'chapter2_liuhui_shelter': {},
            'noticeboard': { scriptId: 'inn' }, // Chain to inn scene
            'noticeboard_after_training': { scriptId: 'inn' },
            'inn': {}, // After inn, goes to map (milestone added in onComplete)
            'qingzhou_victory': { scriptId: 'qingzhou_gate_return' }, // Chain to gate return
            'qingzhou_gate_return': {}, // After gate return, goes to map
            // Add more mappings as needed
        };
        
        return paramsMap[scriptId] || null;
    }
}

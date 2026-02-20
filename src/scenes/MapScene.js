import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';
import { CHAPTERS } from '../data/Chapters.js';
import { getLocalizedText, LANGUAGE, getFontForLanguage, getTextContainerSize } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';

// Locations and reminders will eventually be moved to CHAPTERS data
const LOCATIONS = {
    magistrate: {
        id: 'magistrate',
        x: 182,
        y: 85,
        name: 'Magistrate Zhou Jing',
        imgKey: 'tent',
        battleId: 'daxing',
        // With the legacy Zhuo-start scene removed, magistrate is the first actionable map objective.
        unlockCondition: (gs) => !(gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')),
        isCompleted: (gs) => gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')
    },
    qingzhou: {
        id: 'qingzhou',
        x: 220,
        y: 95,
        name: 'Qingzhou Region',
        imgKey: 'city',
        battleId: 'qingzhou_siege',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')) && !(gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')),
        isCompleted: (gs) => gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')
    },
    guangzong: {
        id: 'guangzong',
        x: 205,
        y: 55,
        name: 'Guangzong Region',
        imgKey: 'tent',
        battleId: 'guangzong_encounter',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')) && !(gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')),
        isCompleted: (gs) => gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')
    },
    zhuo_county: {
        id: 'zhuo_county',
        x: 190,
        y: 70,
        name: 'Zhuo County',
        imgKey: 'hut',
        battleId: 'zhuo_return',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')) && !(gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('chapter1_complete')),
        isCompleted: (gs) => gs.hasReachedStoryNode('dongzhuo_battle', 'liubei') || gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('dongzhuo_battle') || gs.hasMilestone('chapter1_complete')
    }
};

const STORY_EVENTS = {
    'defeat': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_defeat',
        text: { en: "We were overwhelmed! We must regroup and strike again.", zh: "我们被击溃了！我们必须重整旗鼓，再次出击。" }
    },
    'qingzhou_siege': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'qz_victory_lb_01',
        text: { en: "The siege is lifted. We should report back to Magistrate Zhou Jing for our next assignment.", zh: "围城已解。我们应该向邹靖县令报告，接受下一个任务。" }
    }
};

const HERO_REMINDERS = {
    'prologue_complete': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_01',
        text: { en: "Magistrate Zhou Jing's headquarters is to the East. We must report there at once to begin our service.", zh: "邹靖县令的指挥部在东方。我们必须立即前往报到，开始我们的服役。" }
    },
    'daxing': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_02',
        text: { en: "Qingzhou is under siege. We must march there at once to relieve Imperial Protector Gong Jing!", zh: "青州被围。我们必须立即进军，解救州牧龚景！" }
    },
    'qingzhou_siege': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_03',
        text: { en: "The siege is lifted. We should return to the Magistrate to see where else we can be of service.", zh: "围城已解。我们应该返回县令处，看看还能在哪里效力。" }
    },
    'qingzhou_cleanup': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_04',
        text: { en: "Lu Zhi, my old teacher, is hard-pressed at Guangzong. We must march north to aid him against Zhang Jue's horde!", zh: "卢植，我的老师，在广宗处境艰难。我们必须北上援助他，对抗张角的大军！" }
    },
    'guangzong_encounter': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_05',
        text: { en: "There is nothing more for us at Guangzong. Let us return to Zhuo County.", zh: "广宗已无事可做。让我们返回涿郡。" }
    }
};

export class MapScene extends BaseScene {
    constructor() {
        super();
        this.selectedLocation = null;
        this.dialogueElapsed = 0;
        this.interactionSelected = null;
        this.subStep = 0;
        this.moveState = {
            isMoving: false,
            progress: 0,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0,
            onComplete: null
        };
        // Current location of the party
        this.party = { 
            id: 'liubei', 
            name: 'Liu Bei', 
            x: 190, 
            y: 70,
            imgKey: 'liubei'
        };
        this.lastClickTime = 0;
        this.lastSaveTime = 0; // Track when we last saved state
        this.saveInterval = 2000; // Save every 2 seconds
        this.navTargets = [];
    }

    enter(params) {
        // Only switch to campaign music if we're not already playing something "epic" (like the oath music)
        // that is supposed to carry through.
        if (assets.currentMusicKey !== 'oath') {
            assets.playMusic('campaign', 0.4);
        }
        
        // Load state if it exists
        const gs = this.manager.gameState;
        const isResume = params.isResume && gs.getSceneState('map');
        const savedState = isResume ? gs.getSceneState('map') : null;
        
        // Don't set lastScene here - SceneManager will handle it when switching away

        if (!isResume) {
            this.dialogueElapsed = 0;

            if (params && params.afterEvent) {
                const event = STORY_EVENTS[params.afterEvent];
                if (event) {
                    this.interactionSelected = 'story_event';
                    this.currentEvent = event;
                    this.subStep = 0;
                    if (event.voiceId) assets.playVoice(event.voiceId);
                }
            }

            // Handle post-choice continuation from resumed battles
            if (params && params.afterChoice) {
                if (params.afterChoice === 'guangzong_restrain') {
                    // Return to map - player will click Zhuo County
                } else if (params.afterChoice === 'guangzong_fight') {
                    // After fighting to free Lu Zhi
                    setTimeout(() => this.continueAfterEscortBattle(), 100);
                }
            }

            if (params && params.campaignId) {
                this.currentCampaignId = params.campaignId;
                gs.setCurrentCampaign(params.campaignId);
                if (params.campaignId === 'liubei' && gs.getStoryCursor().routeId !== 'liubei') {
                    gs.startStoryRoute('liubei', 'prologue_complete');
                }
                // Don't set lastScene here - SceneManager will handle it

                // Initialize party based on campaign
                if (params.campaignId === 'liubei') {
                    // Prefer explicit params, then saved position, then default
                    const savedX = gs.getCampaignVar('partyX');
                    const savedY = gs.getCampaignVar('partyY');
                    this.party = { 
                        id: 'liubei', 
                        name: 'Liu Bei', 
                        x: params.partyX !== undefined ? params.partyX : (savedX !== undefined ? savedX : 190), 
                        y: params.partyY !== undefined ? params.partyY : (savedY !== undefined ? savedY : 70),
                        imgKey: 'liubei'
                    };
                }
            } else {
                // No params (coming from Continue), restore from save
                this.currentCampaignId = gs.getCurrentCampaign();
                const savedX = gs.getCampaignVar('partyX');
                const savedY = gs.getCampaignVar('partyY');
                if (this.currentCampaignId === 'liubei') {
                    this.party = { 
                        id: 'liubei', 
                        name: 'Liu Bei', 
                        x: savedX !== undefined ? savedX : 190, 
                        y: savedY !== undefined ? savedY : 70,
                        imgKey: 'liubei'
                    };
                }
            }
        } else {
            // Restore saved state
            this.restoreMapState(savedState);
        }

        this.initSelection({ defaultIndex: 0, totalOptions: 0 });
        this.navTargets = [];
    }
    
    restoreMapState(state) {
        if (!state) return;
        
        this.currentCampaignId = state.currentCampaignId;
        this.party = state.party || { 
            id: 'liubei', 
            name: 'Liu Bei', 
            x: 190, 
            y: 70,
            imgKey: 'liubei'
        };
        this.interactionSelected = state.interactionSelected || null;
        
        // Restore event from key
        if (state.currentEventKey && STORY_EVENTS[state.currentEventKey]) {
            this.currentEvent = STORY_EVENTS[state.currentEventKey];
            this.interactionSelected = 'story_event';
        } else {
            this.currentEvent = null;
        }
        
        this.subStep = state.subStep || 0;
        this.dialogueElapsed = state.dialogueElapsed || 0;
        this.selectedLocation = state.selectedLocation || null;
        
        // Restore move state if party was moving
        if (state.moveState && state.moveState.isMoving) {
            this.moveState = state.moveState;
        }
        
        // If there was an active event, restore it
        if (this.currentEvent && this.currentEvent.voiceId) {
            assets.playVoice(this.currentEvent.voiceId);
        }
    }
    
    saveMapState() {
        // Save map state periodically (for crash recovery)
        const gs = this.manager.gameState;
        
        // Save party position to campaign state
        if (this.currentCampaignId && this.party) {
            gs.setCampaignVar('partyX', this.party.x, this.currentCampaignId);
            gs.setCampaignVar('partyY', this.party.y, this.currentCampaignId);
        }
        
        // Find event key if there's a current event
        let currentEventKey = null;
        if (this.currentEvent) {
            for (const [key, event] of Object.entries(STORY_EVENTS)) {
                if (event === this.currentEvent) {
                    currentEventKey = key;
                    break;
                }
            }
        }
        
        // Save map scene state
        const state = {
            currentCampaignId: this.currentCampaignId,
            party: this.party ? { ...this.party } : null,
            interactionSelected: this.interactionSelected,
            currentEventKey: currentEventKey, // Save event key instead of object
            subStep: this.subStep,
            dialogueElapsed: this.dialogueElapsed,
            selectedLocation: this.selectedLocation,
            moveState: this.moveState.isMoving ? { ...this.moveState } : null
        };
        gs.setSceneState('map', state);
        gs.setLastScene('map');
    }
    
    exit() {
        // Save map state when leaving (also saved periodically)
        this.saveMapState();
    }

    heroMoveTo(targetX, targetY, onComplete) {
        // If we're already at the destination, don't play a "walk in place" animation.
        if (this.party && this.party.x === targetX && this.party.y === targetY) {
            if (onComplete) onComplete();
            return;
        }
        this.moveState = {
            isMoving: true,
            progress: 0,
            startX: this.party.x,
            startY: this.party.y,
            targetX: targetX,
            targetY: targetY,
            onComplete: onComplete
        };
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mapImg = assets.getImage('china_map');
        if (!mapImg) return;

        const mx = Math.floor((canvas.width - mapImg.width) / 2);
        const my = Math.floor((canvas.height - mapImg.height) / 2);
        ctx.drawImage(mapImg, mx, my);

        // Draw dynamic locations
        const gs = this.manager.gameState;
        const navTargets = [];
        const depthDrawables = [];
        const pendingLabels = [];
        const pushDepthDrawable = (draw, sortY, priority = 0) => {
            depthDrawables.push({ draw, sortY, priority });
        };
        for (const locId in LOCATIONS) {
            const loc = LOCATIONS[locId];
            if (loc.unlockCondition(gs)) {
                const lx = mx + loc.x;
                const ly = my + loc.y;
                const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
                
                const img = assets.getImage(loc.imgKey);
                if (img) {
                    const drawX = Math.floor(lx - img.width / 2);
                    const drawY = Math.floor(ly - img.height / 2);
                    navTargets.push({
                        type: 'location',
                        id: locId,
                        x: lx,
                        y: ly,
                        img,
                        drawX,
                        drawY,
                        w: img.width,
                        h: img.height
                    });
                    // Depth sort by sprite "foot" (bottom pixel row), not center Y.
                    const footY = drawY + img.height;
                    pushDepthDrawable(
                        () => {
                            ctx.save();
                            if (isDone) ctx.globalAlpha = 0.5;
                            // Draw centered at the location coordinates
                            ctx.drawImage(img, drawX, drawY, img.width, img.height);
                            ctx.restore();
                        },
                        footY,
                        0
                    );

                    if (this.interactionSelected === locId) {
                        const locName = getLocalizedText(UI_TEXT[loc.name]) || loc.name;
                        const promptText = isDone ? getLocalizedText(UI_TEXT['COMPLETED']) : getLocalizedText(UI_TEXT['click to march']);
                        pendingLabels.push({ name: locName, x: lx, y: ly - 10, prompt: promptText });
                    }
                }
            }
        }

        // Animation frame for idle pose
        const frame = Math.floor(Date.now() / 150) % 4;
        const walkFrame = Math.floor(Date.now() / 100) % 4;

        const charImg = assets.getImage(this.party.imgKey);
        if (charImg) {
            let cx = mx + this.party.x;
            let cy = my + this.party.y;
            
            let action = 'standby';
            let frameIdx = frame;
            let flip = false;

            if (this.moveState.isMoving) {
                cx = mx + this.moveState.startX + (this.moveState.targetX - this.moveState.startX) * this.moveState.progress;
                cy = my + this.moveState.startY + (this.moveState.targetY - this.moveState.startY) * this.moveState.progress;
                
                action = 'walk';
                frameIdx = walkFrame;
                if (this.moveState.targetX < this.moveState.startX) flip = true;
            }

            // Character y is already the feet anchor in drawCharacter().
            pushDepthDrawable(
                () => {
                    this.drawCharacter(ctx, charImg, action, frameIdx, cx, cy, { flip });
                },
                cy,
                1
            );
            this.partyRenderPose = { img: charImg, action, frame: frameIdx, x: cx, y: cy, flip };
            navTargets.push({ type: 'party', id: 'party', x: cx, y: cy });
        } else {
            this.partyRenderPose = null;
        }

        // Draw all map actors/sprites in depth order by foot Y.
        depthDrawables.sort((a, b) => {
            if (a.sortY !== b.sortY) return a.sortY - b.sortY;
            return a.priority - b.priority;
        });
        depthDrawables.forEach(d => d.draw());
        pendingLabels.forEach(label => this.drawLabel(ctx, label.name, label.x, label.y, label.prompt));

        if (this.interactionSelected === 'hero_reminder' && this.currentReminder) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentReminder, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        } else if (this.interactionSelected === 'story_event' && this.currentEvent) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentEvent, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        }

        // Draw Back Button (Top Right)
        const returnText = getLocalizedText(UI_TEXT['RETURN']);
        // Calculate button size properly for Chinese text
        const buttonSize = getTextContainerSize(ctx, returnText, '8px Silkscreen', 10, 14);
        const backW = Math.max(40, buttonSize.width);
        const backH = Math.max(14, buttonSize.height); // Minimum 14px for Chinese text
        const bx = canvas.width - backW - 5;
        const by = 5;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bx, by, backW, backH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, backW - 1, backH - 1);
        
        // Center text vertically (adjust for Chinese font which is taller)
        const textY = by + backH / 2 + (LANGUAGE.current === 'zh' ? 2 : -4);
        this.drawPixelText(ctx, returnText, bx + backW/2, textY, { 
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });

        this.backRect = { x: bx, y: by, w: backW, h: backH };
        navTargets.push({ type: 'back', id: 'back', x: bx + backW / 2, y: by + backH / 2, rect: this.backRect });

        this.navTargets = navTargets;
        if (this.selection) {
            this.selection.totalOptions = this.navTargets.length;
            if (this.selection.highlightedIndex >= this.navTargets.length) {
                this.selection.highlightedIndex = Math.max(0, this.navTargets.length - 1);
            }
        }

        this.renderNavHighlight(ctx);
    }

    drawLabel(ctx, name, x, y, prompt) {
        // Name and prompt are already localized when passed in
        // Calculate container size for both name and prompt
        const nameSize = getTextContainerSize(ctx, name, '8px Silkscreen', 5, 12);
        const promptSize = getTextContainerSize(ctx, prompt, '8px Tiny5', 5, 12);
        
        // Container needs to fit both lines, so use the wider of the two
        const boxW = Math.max(nameSize.width, promptSize.width);
        
        // Height needs to accommodate:
        // - Top padding (4px for Chinese, 3px for English)
        // - Name height
        // - Spacing between lines (5px for Chinese, 4px for English)
        // - Prompt height
        // - Bottom padding (4px for Chinese, 3px for English)
        const topPadding = LANGUAGE.current === 'zh' ? 4 : 3;
        const bottomPadding = LANGUAGE.current === 'zh' ? 4 : 3;
        const lineSpacing = LANGUAGE.current === 'zh' ? 5 : 4;
        const boxH = topPadding + nameSize.height + lineSpacing + promptSize.height + bottomPadding;
        
        const bx = Math.floor(x - 20 - boxW);
        const by = Math.floor(y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

        const displayName = LANGUAGE.current === 'zh' ? name : name.toUpperCase();
        // Position name with top padding (Y coordinate is top of text since textBaseline = 'top')
        const nameY = by + topPadding;
        this.drawPixelText(ctx, displayName, bx + 5, nameY, { color: '#ffd700', font: '8px Silkscreen' });
        
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        // Position prompt below name with proper spacing (Y coordinate is top of text)
        const promptY = by + topPadding + nameSize.height + lineSpacing;
        this.drawPixelText(ctx, prompt, bx + 5, promptY, { color: '#eee', font: '8px Tiny5' });
        ctx.globalAlpha = 1.0;
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        // Periodic state saving for crash recovery
        if (timestamp - this.lastSaveTime > this.saveInterval) {
            this.saveMapState();
            this.lastSaveTime = timestamp;
        }

        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            this.dialogueElapsed = (this.dialogueElapsed || 0) + dt;
        } else {
            this.dialogueElapsed = 0;
        }

        if (this.moveState.isMoving) {
            this.moveState.progress += 0.015;
            if (this.moveState.progress >= 1) {
                this.moveState.progress = 1;
                this.moveState.isMoving = false;
                
                // Update actual coordinate in the party data
                this.party.x = this.moveState.targetX;
                this.party.y = this.moveState.targetY;

                // Save party position to campaign state for persistence
                this.manager.gameState.setCampaignVar('partyX', this.party.x);
                this.manager.gameState.setCampaignVar('partyY', this.party.y);

                if (this.moveState.onComplete) {
                    this.moveState.onComplete();
                }
            }
        }

        if (this.selection) {
            const currentMouseX = this.manager.logicalMouseX;
            const currentMouseY = this.manager.logicalMouseY;
            this.updateSelectionMouse(currentMouseX, currentMouseY);
            if (this.selection.mouseoverEnabled && this.navTargets.length > 0) {
                let nearestIdx = -1;
                let bestDist = Number.POSITIVE_INFINITY;
                this.navTargets.forEach((t, i) => {
                    const dx = t.x - currentMouseX;
                    const dy = t.y - currentMouseY;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        nearestIdx = i;
                    }
                });
                if (nearestIdx >= 0) this.selection.highlightedIndex = nearestIdx;
            }
        }
    }

    renderNavHighlight(ctx) {
        if (!this.selection || this.navTargets.length === 0) return;
        const idx = this.selection.highlightedIndex;
        if (idx < 0 || idx >= this.navTargets.length) return;
        const t = this.navTargets[idx];

        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        if (t.type === 'party' && this.partyRenderPose) {
            const pose = this.partyRenderPose;
            this.drawCharacterPixelOutline(ctx, pose.img, pose.action, pose.frame, pose.x, pose.y, {
                flip: pose.flip,
                color: '#ffd700'
            });
        } else if (t.rect) {
            ctx.strokeRect(Math.floor(t.rect.x) - 1.5, Math.floor(t.rect.y) - 1.5, Math.floor(t.rect.w) + 2, Math.floor(t.rect.h) + 2);
        } else if (t.type === 'location' && t.img) {
            this.drawLocationSpriteOutline(ctx, t.img, t.drawX, t.drawY, { color: '#ffd700' });
        } else {
            const size = (t.type === 'party') ? 14 : 18;
            ctx.strokeRect(Math.floor(t.x - size / 2) - 0.5, Math.floor(t.y - size / 2) - 0.5, size, size);
        }
        ctx.restore();
    }

    drawLocationSpriteOutline(ctx, img, drawX, drawY, options = {}) {
        if (!img) return;
        const { color = '#ffd700', alphaThreshold = 10 } = options;
        const w = img.width;
        const h = img.height;
        if (!w || !h) return;

        if (!this._locationOutlineSrcCanvas || this._locationOutlineSrcCanvas.width !== w || this._locationOutlineSrcCanvas.height !== h) {
            this._locationOutlineSrcCanvas = document.createElement('canvas');
            this._locationOutlineSrcCanvas.width = w;
            this._locationOutlineSrcCanvas.height = h;
            this._locationOutlineSrcCtx = this._locationOutlineSrcCanvas.getContext('2d', { willReadFrequently: true });

            this._locationOutlineDstCanvas = document.createElement('canvas');
            this._locationOutlineDstCanvas.width = w;
            this._locationOutlineDstCanvas.height = h;
            this._locationOutlineDstCtx = this._locationOutlineDstCanvas.getContext('2d');
        }

        const srcCtx = this._locationOutlineSrcCtx;
        const dstCtx = this._locationOutlineDstCtx;
        srcCtx.clearRect(0, 0, w, h);
        dstCtx.clearRect(0, 0, w, h);
        srcCtx.drawImage(img, 0, 0, w, h);

        const srcData = srcCtx.getImageData(0, 0, w, h);
        const outData = dstCtx.createImageData(w, h);
        const rgb = { r: 255, g: 215, b: 0 };
        if (typeof color === 'string' && color.startsWith('#') && (color.length === 7 || color.length === 4)) {
            const clean = color.slice(1);
            const expanded = clean.length === 3
                ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
                : clean;
            rgb.r = parseInt(expanded.slice(0, 2), 16);
            rgb.g = parseInt(expanded.slice(2, 4), 16);
            rgb.b = parseInt(expanded.slice(4, 6), 16);
        }

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const idx = (py * w + px) * 4;
                const a = srcData.data[idx + 3];
                if (a > alphaThreshold) continue;

                let edge = false;
                for (let oy = -1; oy <= 1 && !edge; oy++) {
                    for (let ox = -1; ox <= 1; ox++) {
                        if (ox === 0 && oy === 0) continue;
                        const nx = px + ox;
                        const ny = py + oy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        const nIdx = (ny * w + nx) * 4;
                        if (srcData.data[nIdx + 3] > alphaThreshold) {
                            edge = true;
                            break;
                        }
                    }
                }

                if (edge) {
                    outData.data[idx] = rgb.r;
                    outData.data[idx + 1] = rgb.g;
                    outData.data[idx + 2] = rgb.b;
                    outData.data[idx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(outData, 0, 0);
        ctx.drawImage(this._locationOutlineDstCanvas, Math.floor(drawX), Math.floor(drawY), w, h);
    }

    activateNavTarget(index) {
        this.activateNavigationIndex(this.navTargets, index, {
            back: () => {
                assets.playSound('ui_click');
                this.manager.switchTo('campaign_selection');
            },
            location: (target) => this.activateLocationTarget(target.id),
            party: () => this.activatePartyTarget()
        });
    }

    moveNavDirectional(dirX, dirY) {
        if (!this.selection || !this.navTargets || this.navTargets.length <= 1) return;
        if (this.selection.highlightedIndex < 0 || this.selection.highlightedIndex >= this.navTargets.length) {
            this.selection.highlightedIndex = 0;
        }
        const bestIdx = this.navigateTargetIndex(this.selection.highlightedIndex, this.navTargets, dirX, dirY, { coneSlope: 2.2 });
        this.selection.highlightedIndex = bestIdx;
        assets.playSound('ui_click', 0.5);
    }

    activateLocationTarget(locId) {
        const gs = this.manager.gameState;
        const loc = LOCATIONS[locId];
        if (!loc || !loc.unlockCondition(gs)) return;

        if (this.interactionSelected === locId) {
            const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
            if (!isDone) {
                this.heroMoveTo(loc.x, loc.y, () => {
                    if (loc.battleId === 'daxing') this.startBriefing();
                    else if (loc.battleId === 'qingzhou_siege') this.startQingzhouBriefing();
                    else if (loc.battleId === 'guangzong_encounter') this.startGuangzongBriefing();
                    else if (loc.battleId === 'zhuo_return') this.startZhuoReturn();
                });
            }
        } else {
            this.interactionSelected = locId;
            this.selectedLocation = locId;
        }
    }

    activatePartyTarget() {
        const gs = this.manager.gameState;
        this.showCurrentPartyReminder(gs);
    }

    advanceInteractionDialogue() {
        if (this.dialogueElapsed < 250) return;
        if (this.hasNextChunk) {
            this.subStep++;
            this.dialogueElapsed = 0;
            return;
        }
        this.interactionSelected = null;
        this.subStep = 0;
        this.currentEvent = null;
        this.currentReminder = null;
        this.dialogueElapsed = 0;
    }

    handleInput(e) {
        const { x: mouseX, y: mouseY } = this.getMousePos(e);
        const { canvas } = this.manager;

        // Back button (top right)
        const backW = 40;
        const backH = 15;
        const bx = canvas.width - backW - 5;
        const by = 5;
        
        const isBackHovered = mouseX >= bx && mouseX <= bx + backW && mouseY >= by && mouseY <= by + backH;
        
        if (isBackHovered) {
            assets.playSound('ui_click');
            // If the story is complete, ensure we don't prompt "New Game" when returning later
            if (this.manager.gameState.hasReachedStoryNode('chapter1_complete', 'liubei')) {
                // Don't set lastScene for campaign_selection - it's excluded
            }
            this.manager.switchTo('campaign_selection');
            return;
        }

        const mx = 0; // Fixed 256x256 resolution
        const my = 0;

        // Advance dialogue if active
        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            this.advanceInteractionDialogue();
            return;
        }

        // Handle party click first (party sprite can overlap location icons like the magistrate).
        // A precise click on Liu Bei should always trigger his reminder dialogue.
        const gs = this.manager.gameState;
        const cx = mx + this.party.x;
        const cy = my + this.party.y;
        
        const charImg = assets.getImage(this.party.imgKey);
        const frame = Math.floor(Date.now() / 150) % 4;
        const walkFrame = Math.floor(Date.now() / 100) % 4;
        
        let action = 'standby';
        let frameIdx = frame;
        let flip = false;
        let currentX = cx;
        let currentY = cy;

        if (this.moveState.isMoving) {
            currentX = mx + this.moveState.startX + (this.moveState.targetX - this.moveState.startX) * this.moveState.progress;
            currentY = my + this.moveState.startY + (this.moveState.targetY - this.moveState.startY) * this.moveState.progress;
            action = 'walk';
            frameIdx = walkFrame;
            if (this.moveState.targetX < this.moveState.startX) flip = true;
        }

        const charHit = this.checkCharacterHit(charImg, action, frameIdx, currentX, currentY, mouseX, mouseY, { flip });
        if (charHit) {
            this.showCurrentPartyReminder(gs);
            return;
        }

        // Handle dynamic location clicks
        for (const locId in LOCATIONS) {
            const loc = LOCATIONS[locId];
            if (loc.unlockCondition(gs)) {
                const lx = mx + loc.x;
                const ly = my + loc.y;
                
                const img = assets.getImage(loc.imgKey);
                const iw = img ? img.width : 36;
                const ih = img ? img.height : 36;
                
                const hit = (mouseX >= lx - iw/2 && mouseX <= lx + iw/2 && mouseY >= ly - ih/2 && mouseY <= ly + ih/2);
            
            let labelHit = false;
                if (this.interactionSelected === locId) {
                    const metrics = this.manager.ctx.measureText(loc.name);
                const boxW = Math.floor(metrics.width + 10);
                    const bx = Math.floor(lx - 20 - boxW);
                    const by = Math.floor(ly - 10);
                    labelHit = (mouseX >= bx && mouseX <= bx + boxW && mouseY >= by && mouseY <= by + 24);
            }

                if (hit || labelHit) {
                    if (this.interactionSelected === locId) {
                        const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
                        if (!isDone) {
                            this.heroMoveTo(loc.x, loc.y, () => {
                                if (loc.battleId === 'daxing') this.startBriefing();
                                else if (loc.battleId === 'qingzhou_siege') this.startQingzhouBriefing();
                                else if (loc.battleId === 'guangzong_encounter') this.startGuangzongBriefing();
                                else if (loc.battleId === 'zhuo_return') this.startZhuoReturn();
                            });
                        }
                } else {
                        this.interactionSelected = locId;
                        this.selectedLocation = locId;
                }
                return;
                }
            }
        }
        
        this.selectedLocation = null;
        if (this.interactionSelected !== 'hero_reminder' && this.interactionSelected !== 'story_event') {
            this.interactionSelected = null;
        }
    }

    handleKeyDown(e) {
        if (!this.selection) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            assets.playSound('ui_click');
            this.manager.switchTo('campaign_selection');
            return;
        }

        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.onNonMouseInput();
                this.advanceInteractionDialogue();
            }
            return;
        }

        if (this.navTargets.length === 0) return;
        this.selection.totalOptions = this.navTargets.length;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(0, -1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(0, 1);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(-1, 0);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(1, 0);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.onNonMouseInput();
            this.activateNavTarget(this.selection.highlightedIndex);
        }
    }

    startQingzhouBriefing() {
        this.manager.switchTo('tactics', {
            battleId: 'qingzhou_prelude',
            mapGen: {
                biome: 'central',
                layout: 'city_gate',
                forestDensity: 0.05,
                mountainDensity: 0.0,
                riverDensity: 0.0,
                houseDensity: 0.2
            }
        });
    }

    getCurrentPartyReminderKey(gs) {
        // Highest-priority progression first.
        if (gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('chapter1_complete')) return null;
        if (gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')) return 'guangzong_encounter';
        if (gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')) return 'qingzhou_cleanup';
        if (gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')) return 'qingzhou_siege';
        if (gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')) return 'daxing';
        if (gs.hasReachedStoryNode('prologue_complete', 'liubei') || gs.hasMilestone('prologue_complete')) return 'prologue_complete';
        // Fallback for any pre-Daxing map state: still guide player to the magistrate.
        return 'prologue_complete';
    }

    showCurrentPartyReminder(gs) {
        const reminderKey = this.getCurrentPartyReminderKey(gs);
        const reminder = reminderKey ? HERO_REMINDERS[reminderKey] : null;
        if (!reminder) {
            this.interactionSelected = null;
            this.subStep = 0;
            return;
        }

        this.interactionSelected = 'hero_reminder';
        this.currentReminder = reminder;
        this.subStep = 0;
        if (this.currentReminder.voiceId) assets.playVoice(this.currentReminder.voiceId);
    }

    startGuangzongBriefing() {
        // Guangzong - Lu Zhi arrested, shown on tactics map with cage
        // Player choice handled by TacticsScene after intro dialogue
        this.manager.switchTo('tactics', {
            battleId: 'guangzong_encounter',
            onChoiceRestrain: () => {
                // Peaceful path - go to map, player clicks Zhuo County
                this.manager.gameState.setStoryCursor('guangzong_encounter', 'liubei');
                this.manager.switchTo('map', { 
                    campaignId: 'liubei',
                    partyX: 205,  // Near Guangzong
                    partyY: 55
                });
            },
            onChoiceFight: () => {
                // Battle path - start fight in the same map (handled by TacticsScene)
                // TacticsScene.startFight() will be called instead
            },
            onFightVictory: () => {
                // Called when cage is broken and Lu Zhi is freed
                this.manager.gameState.setStoryChoice('luzhi_outcome', 'freed');
                this.manager.gameState.addMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            },
            onVictory: () => {
                // Fallback for if they kill all enemies without breaking the cage
                this.manager.gameState.setStoryChoice('luzhi_outcome', 'freed');
                this.manager.gameState.addMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            }
        });
    }

    startZhuoReturn() {
        // Go directly to the Dong Zhuo battle - dialogue happens on the battle screen
        const gs = this.manager.gameState;
        const freedLuZhi = gs.getStoryChoice('luzhi_outcome') === 'freed' || gs.hasMilestone('freed_luzhi');
        
        this.manager.switchTo('tactics', {
            battleId: 'dongzhuo_battle',
            onVictory: () => {
                // After battle, show Chapter 1 end
                this.showChapter1End();
            },
            // Pass which path we're on for post-battle dialogue
            freedLuZhi: freedLuZhi
        });
    }
    
    
    showChapter1End() {
        // Show "End of Chapter 1" screen
        this.manager.switchTo('narrative', {
            musicKey: 'oath',
            onComplete: () => {
                this.manager.gameState.setStoryCursor('chapter1_complete', 'liubei');
                this.manager.gameState.addMilestone('chapter1_complete');
                this.manager.switchTo('campaign_selection'); // Back to story selection
            },
            script: [
                { bg: 'black', type: 'command', action: 'clearActors' },
                {
                    type: 'title',
                    text: "CHAPTER 1 COMPLETE",
                    subtext: "The Oath in the Peach Garden",
                    duration: 4000
                },
                {
                    type: 'dialogue',
                    portraitKey: 'narrator',
                    voiceId: 'gz_nar_poem_01',
                    text: { en: "As it was in olden time so it is today,\nThe simple wight may merit well,\nOfficialdom holds sway;\nZhang Fei, the blunt and hasty,\nWhere can you find his peer?", zh: "古往今来皆如此，\n布衣虽有功，\n官场仍当道；\n张飞，直率而急躁，\n何处可寻其匹？" }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'narrator',
                    voiceId: 'ch1_end_01',
                    text: "But slaying the ungrateful would\nMean many deaths a year.\n\nDong Zhuo's fate will be unrolled in later chapters..."
                },
                { 
                    type: 'title', 
                    text: "END OF CHAPTER 1", 
                    subtext: "Liu Bei's Story will continue...",
                    duration: 5000 
                },
                { type: 'command', action: 'fade', target: 1, speed: 0.001 }
            ]
        });
    }

    continueAfterEscortBattle() {
        // First show battle summary, then continue story (outlaw path)
        // Get stats computed by TacticsScene.endBattle()
        const stats = this.manager.gameState.get('lastBattleStats') || {
            won: true,
            battleId: 'guangzong_escort',
            alliedCasualties: 0,
            enemyCasualties: 0,
            housesDestroyed: 0,
            housesProtected: 0,
            totalHouses: 0,
            turnNumber: 1,
            xpGained: 5,
            recoveryInfo: [],
            levelUps: []
        };
        
        this.manager.switchTo('summary', {
            ...stats,
            onComplete: () => {
                this.showOutlawStory();
            }
        });
    }
    
    showOutlawStory() {
        // After freeing Lu Zhi - characters walk up on dirt road, have conversation, then go to map
        this.manager.switchTo('narrative', {
            musicKey: 'forest',
            onComplete: () => {
                // Go to map - player will march to Zhuo County
                this.manager.gameState.setStoryCursor('guangzong_encounter', 'liubei');
                this.manager.switchTo('map', { 
                    campaignId: 'liubei',
                    partyX: 205,  // Near where they were (Guangzong area)
                    partyY: 55
                });
            },
            script: [
                // Characters walk up from bottom on dirt_road_city_in_distance
                { bg: 'dirt_road_city_in_distance', type: 'command', action: 'clearActors' },
                { type: 'command', action: 'fade', target: 0, speed: 0.002 },
                
                // Start characters off-screen bottom
                { type: 'command', action: 'addActor', id: 'luzhi', imgKey: 'zhoujing', x: 100, y: 280 },
                { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 130, y: 285 },
                { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 160, y: 290 },
                { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 145, y: 295 },
                
                // Walk up to 1/3 up the screen (around y=180-200)
                { type: 'command', action: 'move', id: 'luzhi', x: 100, y: 180, wait: false },
                { type: 'command', action: 'move', id: 'liubei', x: 130, y: 185, wait: false },
                { type: 'command', action: 'move', id: 'guanyu', x: 160, y: 190, wait: false },
                { type: 'command', action: 'move', id: 'zhangfei', x: 145, y: 195, wait: true },
                
                // Lu Zhi thanks them but warns of consequences
                {
                    type: 'dialogue',
                    portraitKey: 'custom-male-22',
                    speaker: 'luzhi',
                    name: 'Commander Lu Zhi',
                    position: 'top',
                    voiceId: 'gz_lz_freed_01',
                    text: { en: "Xuande! You have saved me, but at great cost. The court will brand you as rebels for attacking imperial soldiers.", zh: "玄德！你救了我，但代价巨大。朝廷会因你们袭击官军而将你们定为叛贼。" }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    speaker: 'liubei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'gz_lb_freed_02',
                    text: { en: "Master, I could not stand by while a loyal commander was led to unjust execution.", zh: "老师，我不能坐视一位忠心的将军被不义地处决。" }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'custom-male-22',
                    speaker: 'luzhi',
                    name: 'Commander Lu Zhi',
                    position: 'top',
                    voiceId: 'gz_lz_freed_02',
                    text: { en: "Your loyalty does you credit. I will return to Guangzong in secret. Go now, before more soldiers come.", zh: "你的忠诚值得称赞。我会秘密返回广宗。现在走吧，在更多士兵到来之前。" }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'guan-yu',
                    speaker: 'guanyu',
                    name: 'Guan Yu',
                    position: 'top',
                    voiceId: 'gz_gy_outlaw_01',
                    text: { en: "Brother, we cannot stay. If Dong Zhuo learns we freed Lu Zhi, he will have us executed on this spot.", zh: "兄长，我们不能停留。如果董卓知道我们救了卢植，他会当场处决我们。" }
                },
                
                { type: 'command', action: 'fade', target: 1, speed: 0.002 }
            ]
        });
    }

    startBriefing() {
        this.manager.switchTo('narrative', {
            musicKey: 'forest',
            onComplete: () => {
                this.manager.switchTo('tactics', {
                    battleId: 'daxing',
                    mapGen: {
                        biome: 'northern',
                        layout: 'foothills',
                        forestDensity: 0.15,
                        mountainDensity: 0.1,
                        riverDensity: 0.05,
                        houseDensity: 0.04
                    }
                });
            },
            scriptId: 'magistrate_briefing'
        });
    }

}

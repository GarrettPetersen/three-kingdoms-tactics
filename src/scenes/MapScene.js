import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';
import { CHAPTERS } from '../data/Chapters.js';

// Locations and reminders will eventually be moved to CHAPTERS data
const LOCATIONS = {
    zhuo: {
        id: 'zhuo',
        x: 190,
        y: 70,
        name: 'Zhuo County',
        imgKey: 'hut',
        campaignId: 'liubei',
        unlockCondition: (gs) => !gs.hasMilestone('prologue_complete') && !gs.hasMilestone('daxing') && !gs.hasMilestone('qingzhou_siege')
    },
    magistrate: {
        id: 'magistrate',
        x: 182,
        y: 85,
        name: 'Magistrate Zhou Jing',
        imgKey: 'tent',
        battleId: 'daxing',
        unlockCondition: (gs) => gs.hasMilestone('prologue_complete') && !gs.hasMilestone('daxing'),
        isCompleted: (gs) => gs.hasMilestone('daxing')
    },
    qingzhou: {
        id: 'qingzhou',
        x: 220,
        y: 95,
        name: 'Qingzhou Region',
        imgKey: 'city',
        battleId: 'qingzhou_siege',
        unlockCondition: (gs) => gs.hasMilestone('daxing') && !gs.hasMilestone('qingzhou_siege'),
        isCompleted: (gs) => gs.hasMilestone('qingzhou_siege')
    },
    guangzong: {
        id: 'guangzong',
        x: 150,
        y: 50,
        name: 'Guangzong Region',
        imgKey: 'tent',
        battleId: 'guangzong_camp',
        unlockCondition: (gs) => gs.hasMilestone('qingzhou_siege') && !gs.hasMilestone('guangzong_camp'),
        isCompleted: (gs) => gs.hasMilestone('guangzong_camp')
    }
};

const STORY_EVENTS = {
    'defeat': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_defeat',
        text: "We were overwhelmed! We must regroup and strike again."
    },
    'qingzhou_siege': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'qz_victory_lb_01',
        text: "The siege is lifted. We should report back to Magistrate Zhou Jing for our next assignment."
    }
};

const HERO_REMINDERS = {
    'prologue_complete': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_01',
        text: "Magistrate Zhou Jing's headquarters is to the East. We must report there at once to begin our service."
    },
    'daxing': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_02',
        text: "Qingzhou is under siege. We must march there at once to relieve Imperial Protector Gong Jing!"
    },
    'qingzhou_siege': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_03',
        text: "The siege is lifted. We should return to the Magistrate to see where else we can be of service."
    }
};

export class MapScene extends BaseScene {
    constructor() {
        super();
        this.selectedLocation = null;
        this.dialogueElapsed = 0;
        this.prologueComplete = false;
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
    }

    enter(params) {
        // Only switch to campaign music if we're not already playing something "epic" (like the oath music)
        // that is supposed to carry through.
        if (assets.currentMusicKey !== 'oath') {
            assets.playMusic('campaign', 0.4);
        }
        
        // Load state if it exists
        const gs = this.manager.gameState;
        this.dialogueElapsed = 0;
        gs.set('lastScene', 'map'); // Ensure we return here on continue
        this.prologueComplete = gs.hasMilestone('prologue_complete') || gs.hasMilestone('daxing') || gs.hasMilestone('qingzhou_siege');

        if (params && params.afterEvent) {
            const event = STORY_EVENTS[params.afterEvent];
            if (event) {
                this.interactionSelected = 'story_event';
                this.currentEvent = event;
                this.subStep = 0;
                if (event.voiceId) assets.playVoice(event.voiceId);
            }
        }

        if (params && params.campaignId) {
            this.currentCampaignId = params.campaignId;
            gs.set('currentCampaign', params.campaignId);
            gs.set('lastScene', 'map');

            // Initialize party based on campaign
            if (params.campaignId === 'liubei') {
                this.party = { 
                    id: 'liubei', 
                    name: 'Liu Bei', 
                    x: params.partyX !== undefined ? params.partyX : 190, 
                    y: params.partyY !== undefined ? params.partyY : 70,
                    imgKey: 'liubei'
                };
            }
        } else {
            // No params (coming from Continue), restore from save
            this.currentCampaignId = gs.get('currentCampaign');
            if (this.currentCampaignId === 'liubei') {
                this.party = { 
                    id: 'liubei', 
                    name: 'Liu Bei', 
                    x: 190, 
                    y: 70,
                    imgKey: 'liubei'
                };
            }
        }
    }

    heroMoveTo(targetX, targetY, onComplete) {
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
        for (const locId in LOCATIONS) {
            const loc = LOCATIONS[locId];
            if (loc.unlockCondition(gs)) {
                const lx = mx + loc.x;
                const ly = my + loc.y;
                const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
                
                const img = assets.getImage(loc.imgKey);
                if (img) {
                    ctx.save();
                    if (isDone) ctx.globalAlpha = 0.5;
                    
                    // Draw centered at the location coordinates
                    ctx.drawImage(img, Math.floor(lx - img.width / 2), Math.floor(ly - img.height / 2), img.width, img.height);
                    ctx.restore();

                    if (this.interactionSelected === locId) {
                        this.drawLabel(ctx, loc.name, lx, ly - 10, isDone ? "COMPLETED" : "Click to March");
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

            this.drawCharacter(ctx, charImg, action, frameIdx, cx, cy, { flip });
        }

        if (this.interactionSelected === 'hero_reminder' && this.currentReminder) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentReminder, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        } else if (this.interactionSelected === 'story_event' && this.currentEvent) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentEvent, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        }
    }

    drawLabel(ctx, name, x, y, prompt) {
        ctx.save();
        ctx.font = '8px Silkscreen';
        const metrics = ctx.measureText(name);
        ctx.restore();

        const boxW = Math.floor(metrics.width + 10);
        const boxH = 24;
        const bx = Math.floor(x - 20 - boxW);
        const by = Math.floor(y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

        this.drawPixelText(ctx, name.toUpperCase(), bx + 5, by + 3, { color: '#ffd700', font: '8px Silkscreen' });
        
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        this.drawPixelText(ctx, prompt, bx + 5, by + 13, { color: '#eee', font: '8px Tiny5' });
        ctx.globalAlpha = 1.0;
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

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

                if (this.moveState.onComplete) {
                    this.moveState.onComplete();
                }
            }
        }
    }

    handleInput(e) {
        const { x: mouseX, y: mouseY } = this.getMousePos(e);

        const mx = 0; // Fixed 256x256 resolution
        const my = 0;

        // Advance dialogue if active
        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            if (this.dialogueElapsed < 250) return;

            if (this.hasNextChunk) {
                this.subStep++;
                this.dialogueElapsed = 0;
            } else {
                this.interactionSelected = null;
                this.subStep = 0;
                this.currentEvent = null;
                this.currentReminder = null;
                this.dialogueElapsed = 0;
            }
            return;
        }

        // Handle dynamic location clicks
        const gs = this.manager.gameState;
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
                                if (loc.campaignId) this.startCampaign(loc.campaignId);
                                else if (loc.battleId === 'daxing') this.startBriefing();
                                else if (loc.battleId === 'qingzhou_siege') this.startQingzhouBriefing();
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

        // Check party/Zhuo County hit
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
        
        let boxHit = false;
        // Always check box hit if the label is visible (prologue not complete)
        if (!this.prologueComplete) {
            this.manager.ctx.save();
            this.manager.ctx.font = '8px Silkscreen';
            const metrics = this.manager.ctx.measureText("ZHUO COUNTY");
            this.manager.ctx.restore();
            
            const boxW = Math.floor(metrics.width + 10);
            const boxH = 24;
            const bx = Math.floor(cx - 20 - boxW);
            const by = Math.floor(cy - 45);
            boxHit = (mouseX >= bx && mouseX <= bx + boxW && mouseY >= by && mouseY <= by + boxH);
        }

        if (charHit || boxHit) {
            const isZhuoAvailable = !gs.hasMilestone('prologue_complete') && !gs.hasMilestone('daxing') && !gs.hasMilestone('qingzhou_siege');
            
            // Always enter immediately if the prologue is not complete
            if (isZhuoAvailable || boxHit || this.selectedLocation === 'zhuo') {
                if (gs.hasMilestone('prologue_complete') || gs.hasMilestone('daxing') || gs.hasMilestone('qingzhou_siege')) {
                    let reminderKey = 'prologue_complete';
                    
                    if (gs.hasMilestone('qingzhou_siege')) reminderKey = 'qingzhou_siege';
                    else if (gs.hasMilestone('daxing')) reminderKey = 'daxing';
                    
                    this.interactionSelected = 'hero_reminder';
                    this.currentReminder = HERO_REMINDERS[reminderKey];
                    this.subStep = 0;
                    if (this.currentReminder && this.currentReminder.voiceId) assets.playVoice(this.currentReminder.voiceId);
                } else {
                    this.startCampaign('liubei');
                }
            } else {
                // First click on character selects the location (if available)
                if (isZhuoAvailable) {
                    this.selectedLocation = 'zhuo';
                }
                this.interactionSelected = null;
                this.subStep = 0;
            }
            return;
        } else {
            this.selectedLocation = null;
            if (this.interactionSelected !== 'hero_reminder' && this.interactionSelected !== 'story_event') {
                this.interactionSelected = null;
            }
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
            script: [
                { 
                    type: 'title',
                    text: "THE VOLUNTEER ARMY",
                    subtext: "Zhuo County Headquarters",
                    duration: 3000
                },
                { bg: 'army_camp', type: 'command', action: 'clearActors' },
                { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 150, flip: true }, // Face heroes
                { type: 'command', action: 'addActor', id: 'guard1', imgKey: 'soldier', x: 160, y: 140, flip: true },
                { type: 'command', action: 'addActor', id: 'guard2', imgKey: 'soldier', x: 200, y: 140, flip: true },
                
                // Background NPCs for a busier camp
                { type: 'command', action: 'addActor', id: 'soldier3', imgKey: 'soldier', x: 20, y: 150, speed: 0.2 },
                { type: 'command', action: 'addActor', id: 'soldier4', imgKey: 'soldier', x: 230, y: 145, flip: true, speed: 0.1 },
                { type: 'command', action: 'addActor', id: 'merchant', imgKey: 'merchant', x: 30, y: 160, speed: 0.3 },
                { type: 'command', action: 'addActor', id: 'blacksmith', imgKey: 'blacksmith', x: 230, y: 180, flip: true, speed: 0.2 },
                { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: 40, y: 190, speed: 0.5 },
                { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 210, y: 200, flip: true, speed: 0.4 },
                
                { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 240, speed: 1 },
                { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -80, y: 250, speed: 1 },
                { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -120, y: 255, speed: 1 },
                
                { type: 'command', action: 'fade', target: 0, speed: 0.001 },
                
                { type: 'command', action: 'move', id: 'liubei', x: 100, y: 190, wait: false },
                { type: 'command', action: 'move', id: 'guanyu', x: 65, y: 190, wait: false },
                { type: 'command', action: 'move', id: 'zhangfei', x: 135, y: 190, wait: false },
                { type: 'command', action: 'move', id: 'soldier3', x: 10, y: 155, wait: false },
                { type: 'command', action: 'move', id: 'soldier4', x: 245, y: 140, wait: false },
                { type: 'command', action: 'move', id: 'merchant', x: 20, y: 165, wait: false },
                { type: 'command', action: 'move', id: 'blacksmith', x: 240, y: 175 },

                {
                    type: 'dialogue',
                    portraitKey: 'zhou-jing',
                    name: 'Zhou Jing',
                    position: 'top',
                    voiceId: 'daxing_zj_01',
                    text: "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'daxing_lb_01',
                    text: "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'daxing_lb_02',
                    text: "We have raised a force of five hundred volunteers to serve our country and protect the people."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'zhou-jing',
                    name: 'Zhou Jing',
                    position: 'top',
                    voiceId: 'daxing_zj_02',
                    text: "An Imperial kinsman! Truly, the Heavens have not abandoned the Han. Your arrival is most timely."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'zhou-jing',
                    name: 'Zhou Jing',
                    position: 'top',
                    voiceId: 'daxing_zj_03',
                    text: "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'zhang-fei',
                    name: 'Zhang Fei',
                    position: 'top',
                    voiceId: 'daxing_zf_01',
                    text: "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!"
                },
                {
                    type: 'dialogue',
                    portraitKey: 'guan-yu',
                    name: 'Guan Yu',
                    position: 'top',
                    voiceId: 'daxing_gy_01',
                    text: "Third brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'daxing_lb_03',
                    text: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'zhou-jing',
                    name: 'Zhou Jing',
                    position: 'top',
                    voiceId: 'daxing_zj_04',
                    text: "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!"
                },
                { type: 'command', action: 'fade', target: 1, speed: 0.001 },
                { 
                    type: 'title',
                    text: "BATTLE OF DAXING DISTRICT",
                    subtext: "First Strike against the Yellow Turbans",
                    duration: 3000
                }
            ]
        });
    }

    startCampaign(id) {
        if (id === 'liubei') {
            this.manager.switchTo('narrative', {
                onComplete: () => {
                    this.manager.gameState.addMilestone('prologue_complete');
                    this.manager.switchTo('map');
                },
                script: [
                    { 
                        type: 'title',
                        text: "THE HAN DYNASTY IS CRUMBLING",
                        subtext: "Year 184, Zhuo County"
                    },
                    { type: 'command', action: 'fade', target: 0, speed: 0.002 },
                    { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 200, speed: 0.5 },
                    { type: 'command', action: 'addActor', id: 'farmer2', imgKey: 'farmer2', x: 50, y: 185, flip: true, speed: 0.4 },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -50, y: 210, speed: 1 },
                    { bg: 'noticeboard', type: 'command', action: 'move', id: 'liubei', x: 160, y: 210 },
                    { type: 'command', action: 'flip', id: 'liubei', flip: true },
                    { type: 'command', action: 'move', id: 'farmer', x: 220, y: 195 },
                    { type: 'command', action: 'move', id: 'farmer2', x: 20, y: 180 },
                    
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_01',
                        text: "NOTICE: The Yellow Turban rebels under Zhang Jue have risen!"
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_02',
                        text: "All able-bodied men are called to defend the Han."
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_03',
                        text: "Report to the local Magistrate at once."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_01',
                        text: "The Imperial Clan's blood flows in my veins..."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_02',
                        text: "...yet I am but a poor straw-shoe seller."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_03',
                        text: "How can I possibly save the people from this chaos?"
                    },
                    
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 300, y: 240, flip: true, speed: 1.5 },
                    { type: 'command', action: 'move', id: 'zhangfei', x: 190, y: 240 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: '???',
                        voiceId: 'pro_zf_01',
                        text: "Why sigh, O hero, if you do not help your country?"
                    },
                    { type: 'command', action: 'flip', id: 'liubei', flip: false },
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
                    {
                        type: 'choice',
                        portraitKey: 'liu-bei',
                        name: 'Liu Bei',
                        options: [
                            { 
                                text: "I sigh for the suffering people.",
                                voiceId: 'pro_lb_choice_01',
                                result: [
                                    {
                                        type: 'dialogue',
                                        portraitKey: 'zhang-fei',
                                        position: 'top',
                                        name: '???',
                                        voiceId: 'pro_zf_02',
                                        text: "A true hero's heart! You and I are of one mind."
                                    }
                                ]
                            },
                            { 
                                text: "I sigh for my own lost status.",
                                voiceId: 'pro_lb_choice_02',
                                result: [
                                    {
                                        type: 'dialogue',
                                        portraitKey: 'zhang-fei',
                                        position: 'top',
                                        name: '???',
                                        voiceId: 'pro_zf_03',
                                        text: "Status? Bah! In these times of chaos, only courage and wine matter!"
                                    }
                                ]
                            }
                        ]
                    },

                    { type: 'command', action: 'flip', id: 'liubei', flip: false },
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pro_zf_04',
                        text: "I am Zhang Fei, aka Yide."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pro_zf_05',
                        text: "I live in this county, where I have a farm. I sell wine and slaughter hogs."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_04',
                        text: "I am of the Imperial Clan. My name is Liu Bei."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_05',
                        text: "I wish I could destroy these rebels and restore peace..."
                    },
                    {
                        type: 'command',
                        action: 'move', id: 'farmer', x: 250, y: 220 },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pro_zf_06',
                        text: "I have some wealth! I am willing to use it to recruit volunteers."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pro_zf_07',
                        text: "What say you to that?"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pro_lb_06',
                        text: "That would be a great blessing for the people!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pro_zf_08',
                        text: "Then come! Let us go to the village inn and discuss our plans over wine."
                    },
                    { type: 'prompt', text: 'TO INN', position: 'left' },
                    { type: 'command', action: 'flip', id: 'liubei', flip: true },
                    { type: 'command', action: 'move', id: 'liubei', x: -50, y: 240, wait: false },
                    { type: 'command', action: 'move', id: 'zhangfei', x: -50, y: 240 },
                    { type: 'command', action: 'fade', target: 1, speed: 0.002 },
                    
                    // --- SWITCH TO INN ---
                    { bg: 'inn', type: 'command', action: 'clearActors' },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 80, y: 200 },
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 120, y: 200, flip: true },
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'recovery' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'recovery' },
                    { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 180, flip: true },
                    { type: 'command', action: 'animate', id: 'farmer', animation: 'recovery' },
                    
                    { type: 'command', action: 'fade', target: 0, speed: 0.002 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_01',
                        text: "This wine is good! Together, we shall raise an army that will make the rebels tremble."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_01',
                        text: "Indeed. Honor and duty call us."
                    },
                    
                    { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 300, y: 210, flip: true, speed: 1 },
                    { type: 'command', action: 'move', id: 'guanyu', x: 180, y: 210 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: '???',
                        voiceId: 'inn_gy_01',
                        text: "Quick! Bring me wine! I am in a hurry to get to town and join the volunteers!"
                    },
                    
                    { type: 'command', action: 'flip', id: 'liubei', flip: false },
                    { type: 'command', action: 'flip', id: 'zhangfei', flip: false },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'standby' },

                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_02a',
                        text: "That man..."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_02b',
                        text: "His presence is extraordinary. Look at his majestic beard and phoenix-like eyes."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_02',
                        text: "Hey! You there! You're joining the volunteers too? Come, drink with us!"
                    },
                    { type: 'command', action: 'move', id: 'guanyu', x: 140, y: 195 },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'recovery' },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'inn_gy_02',
                        text: "I am Guan Yu, courtesy name Yunchang. For years I have been a fugitive, for I slew a local bully who oppressed the weak."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'inn_gy_03',
                        text: "Now I hear there is a call for volunteers, and I have come to join the cause."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_03',
                        text: "A noble heart! I am Liu Bei, and this is Zhang Fei. We have just agreed to raise a volunteer army ourselves."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_03',
                        text: "Haha! The more the merrier! Drink, Yunchang! Let us toast to our new brotherhood!"
                    },
                    
                    // --- TIME SKIP TO EVENING ---
                    { type: 'command', action: 'fade', target: 1, speed: 0.001 },
                    { bg: 'inn_evening', type: 'command', action: 'removeActor', id: 'farmer' },
                    { type: 'command', action: 'addActor', id: 'soldier_npc', imgKey: 'soldier', x: 230, y: 190, flip: true },
                    { type: 'command', action: 'addActor', id: 'butcher_npc', imgKey: 'butcher', x: 30, y: 210 },
                    { type: 'command', action: 'animate', id: 'soldier_npc', animation: 'recovery' },
                    { type: 'command', action: 'animate', id: 'butcher_npc', animation: 'recovery' },
                    { type: 'command', action: 'wait', duration: 1000 },
                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_04',
                        text: "...and that is why the pig escaped! Haha! But seriously, my friends..."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_05',
                        text: "I feel as though I have known you both for a lifetime."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'inn_gy_04',
                        text: "The heavens have surely brought us together. We share one mind and one purpose."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_04',
                        text: "To restore the Han and bring peace to the common people. That is our shared destiny."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_06',
                        text: "Listen! Behind my farm is a peach garden. The flowers are in full bloom."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_07',
                        text: "Tomorrow, let us offer sacrifices there and swear to be brothers! To live and die as one!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_05',
                        text: "An excellent proposal. We shall do it!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'inn_gy_05',
                        text: "I agree... We swear by the peach garden."
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
                    
                    // --- THE PEACH GARDEN OATH ---
                    { 
                        type: 'title',
                        text: "THE PEACH GARDEN OATH",
                        subtext: "The Next Morning",
                        duration: 3000
                    },
                { type: 'command', action: 'playMusic', key: 'oath', volume: 0.5 },
                { bg: 'peach_garden', type: 'command', action: 'clearActors' },
                { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 128, y: 180 },
                { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 80, y: 185 },
                { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 176, y: 185, flip: true },

                    { type: 'command', action: 'animate', id: 'liubei', animation: 'sitting' },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'sitting' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'sitting' },

                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        name: 'Narrator',
                        position: 'top',
                        portraitKey: 'peach_garden',
                        portraitRect: { x: 50, y: 50, w: 100, h: 80 },
                        voiceId: 'pg_nar_01',
                        text: "In the peach garden, among the blooming flowers, a black ox and a white horse are sacrificed."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pg_lb_01',
                        text: "We three, Liu Bei, Guan Yu, and Zhang Fei, though of different lineages, swear brotherhood and promise mutual help to one end."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'pg_gy_01',
                        text: "We will rescue each other in difficulty; we will aid each other in danger."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'pg_zf_01',
                        text: "We swear to serve the state and save the people."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pg_lb_02',
                        text: "We ask not the same day of birth, but we seek to die together on the same day."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'pg_lb_03',
                        text: "May the Heaven and the Earth read our hearts. If we turn aside from righteousness, may the Heaven and the Human smite us!"
                    },

                    { type: 'command', action: 'animate', id: 'liubei', animation: 'standby' },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'standby' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'standby' },

                    {
                        type: 'dialogue',
                        name: 'Narrator',
                        portraitKey: 'peach_garden',
                        portraitRect: { x: 50, y: 50, w: 100, h: 80 },
                        voiceId: 'pg_nar_02',
                        text: "The ritual complete, Liu Bei is acknowledged as the eldest brother, Guan Yu the second, and Zhang Fei the youngest."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        name: 'Liu Bei',
                        voiceId: 'pg_lb_04',
                        text: "The path ahead is long and full of peril, but together, we shall restore the Han!"
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.001 },

                    // --- RECRUITING AT THE NOTICEBOARD ---
                    { bg: 'noticeboard', type: 'command', action: 'clearActors' },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 100, y: 210 },
                    { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 60, y: 210 },
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 140, y: 210 },
                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'rec_zf_01',
                        text: "CITIZENS OF ZHUO! The Yellow Turbans are coming! Who among you is brave enough to fight for your homes?"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guan-yu',
                        position: 'top',
                        name: 'Guan Yu',
                        voiceId: 'rec_gy_01',
                        text: "We offer no riches, only the chance to serve with honor under the banner of Liu Bei."
                    },

                    { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: -50, y: 210, speed: 0.8 },
                    { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 300, y: 200, flip: true, speed: 0.7 },
                    { type: 'command', action: 'move', id: 'volunteer1', x: 50, y: 220, wait: false },
                    { type: 'command', action: 'move', id: 'volunteer2', x: 200, y: 215 },

                    {
                        type: 'dialogue',
                        portraitKey: 'soldier',
                        position: 'top',
                        name: 'Volunteer',
                        voiceId: 'rec_vol_01',
                        text: "We have heard of your brotherhood! We are but simple men, but we will follow you to the death!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'rec_lb_01',
                        text: "Welcome, brothers. Today we are but a few, but tomorrow we shall be an army."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'rec_lb_02',
                        text: "Let us march! Our first destination: the headquarters of the local Magistrate."
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
                    { 
                        type: 'title',
                        text: "CHAPTER ONE: THE VOLUNTEER ARMY",
                        subtext: "The Journey Begins",
                        duration: 3000
                    }
                ]
            });
        }
    }
}

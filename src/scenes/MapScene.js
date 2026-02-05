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
        x: 205,
        y: 55,
        name: 'Guangzong Region',
        imgKey: 'tent',
        battleId: 'guangzong_encounter',
        unlockCondition: (gs) => gs.hasMilestone('qingzhou_cleanup') && !gs.hasMilestone('guangzong_encounter'),
        isCompleted: (gs) => gs.hasMilestone('guangzong_encounter')
    },
    zhuo_county: {
        id: 'zhuo_county',
        x: 190,
        y: 70,
        name: 'Zhuo County',
        imgKey: 'hut',
        battleId: 'zhuo_return',
        unlockCondition: (gs) => gs.hasMilestone('guangzong_encounter') && !gs.hasMilestone('dongzhuo_battle') && !gs.hasMilestone('chapter1_complete'),
        isCompleted: (gs) => gs.hasMilestone('chapter1_complete') || gs.hasMilestone('dongzhuo_battle')
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
    },
    'qingzhou_cleanup': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_04',
        text: "Lu Zhi, my old teacher, is hard-pressed at Guangzong. We must march north to aid him against Zhang Jue's horde!"
    },
    'guangzong_encounter': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_05',
        text: "There is nothing more for us at Guangzong. Let us return to Zhuo County."
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
            gs.set('currentCampaign', params.campaignId);
            gs.set('lastScene', 'map');

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
            this.currentCampaignId = gs.get('currentCampaign');
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

        // Draw Back Button (Top Right)
        const backW = 40;
        const backH = 15;
        const bx = canvas.width - backW - 5;
        const by = 5;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bx, by, backW, backH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, backW - 1, backH - 1);
        
        this.drawPixelText(ctx, "RETURN", bx + backW/2, by + 4, { 
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });
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

                // Save party position to campaign state for persistence
                this.manager.gameState.setCampaignVar('partyX', this.party.x);
                this.manager.gameState.setCampaignVar('partyY', this.party.y);

                if (this.moveState.onComplete) {
                    this.moveState.onComplete();
                }
            }
        }
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
            if (this.manager.gameState.hasMilestone('chapter1_complete')) {
                this.manager.gameState.set('lastScene', 'campaign_selection');
            }
            this.manager.switchTo('campaign_selection');
            return;
        }

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
            const isZhuoAvailable = !gs.hasMilestone('prologue_complete') && !gs.hasMilestone('daxing') && !gs.hasMilestone('qingzhou_siege') && !gs.hasMilestone('qingzhou_cleanup');
            
            // Always enter immediately if the prologue is not complete
            if (isZhuoAvailable || boxHit || this.selectedLocation === 'zhuo') {
                if (gs.hasMilestone('prologue_complete') || gs.hasMilestone('daxing') || gs.hasMilestone('qingzhou_siege') || gs.hasMilestone('qingzhou_cleanup') || gs.hasMilestone('guangzong_encounter')) {
                    let reminderKey = 'prologue_complete';
                    
                    if (gs.hasMilestone('guangzong_encounter')) reminderKey = 'guangzong_encounter';
                    else if (gs.hasMilestone('qingzhou_cleanup')) reminderKey = 'qingzhou_cleanup';
                    else if (gs.hasMilestone('qingzhou_siege')) reminderKey = 'qingzhou_siege';
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

    startGuangzongBriefing() {
        // Guangzong - Lu Zhi arrested, shown on tactics map with cage
        // Player choice handled by TacticsScene after intro dialogue
        this.manager.switchTo('tactics', {
            battleId: 'guangzong_encounter',
            onChoiceRestrain: () => {
                // Peaceful path - go to map, player clicks Zhuo County
                this.manager.gameState.addMilestone('guangzong_encounter');
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
                this.manager.gameState.addMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            },
            onVictory: () => {
                // Fallback for if they kill all enemies without breaking the cage
                this.manager.gameState.addMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            }
        });
    }

    startZhuoReturn() {
        // Go directly to the Dong Zhuo battle - dialogue happens on the battle screen
        const gs = this.manager.gameState;
        const freedLuZhi = gs.hasMilestone('freed_luzhi');
        
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
                    text: "As it was in olden time so it is today,\nThe simple wight may merit well,\nOfficialdom holds sway;\nZhang Fei, the blunt and hasty,\nWhere can you find his peer?"
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
                this.manager.gameState.addMilestone('guangzong_encounter');
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
                    text: "Xuande! You have saved me, but at great cost. The court will brand you as rebels for attacking imperial soldiers."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    speaker: 'liubei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'gz_lb_freed_02',
                    text: "Master, I could not stand by while a loyal commander was led to unjust execution."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'custom-male-22',
                    speaker: 'luzhi',
                    name: 'Commander Lu Zhi',
                    position: 'top',
                    voiceId: 'gz_lz_freed_02',
                    text: "Your loyalty does you credit. I will return to Guangzong in secret. Go now, before more soldiers come."
                },
                {
                    type: 'dialogue',
                    portraitKey: 'guan-yu',
                    speaker: 'guanyu',
                    name: 'Guan Yu',
                    position: 'top',
                    voiceId: 'gz_gy_outlaw_01',
                    text: "Brother, we cannot stay. If Dong Zhuo learns we freed Lu Zhi, he will have us executed on this spot."
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
            // Start with the Yellow Turban rout cutscene battle
            // The battle will transition to narrative with scriptId 'yellow_turban_to_noticeboard'
            // which then transitions to the noticeboard script
            this.manager.switchTo('tactics', {
                battleId: 'yellow_turban_rout'
            });
        }
    }
}

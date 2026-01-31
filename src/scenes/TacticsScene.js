import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS, ATTACKS, UPGRADE_PATHS } from '../core/Constants.js';
import { TacticsMap } from '../core/TacticsMap.js';
import { Unit } from '../entities/Unit.js';
import { BATTLES, UNIT_TEMPLATES } from '../data/Battles.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';

export class TacticsScene extends BaseScene {
    constructor() {
        super();
        this.tacticsMap = null;
        this.units = [];
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles = new Map();
        this.attackTiles = new Map();
        
        this.animationFrame = 0;
        this.lastTime = 0;
        
        this.turn = 'player'; // 'player', 'enemy'
        this.turnNumber = 1;
        this.isProcessingTurn = false;
        
        this.activeDialogue = null;
        this.hoveredCell = null;
        this.damageNumbers = []; // { x, y, value, timer, maxTime }
        this.projectiles = []; // { startX, startY, targetX, targetY, progress, type, duration }
        this.particles = []; // { x, y, r, type, vx, vy, life, targetY }
        this.weatherType = null; // 'rain', 'snow'
        this.enemiesKilled = 0; // Track kills for specific objectives
        this.ambushTriggered = false;
        this.flagPos = null; // { r, q }
        this.reachedFlag = false;

        // Intro Animation State
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.introDuration = 1000; // ms for the sequence

        this.showAttackOrder = false;
        this.history = [];
        this.subStep = 0;
        this.showEndTurnConfirm = false;
    }

    enter(params = {}) {
        const gs = this.manager.gameState;
        
        // Scenario-specific initialization
        this.battleId = params.battleId || gs.get('currentBattleId') || 'daxing'; 
        this.isCustom = params.isCustom || this.battleId === 'custom';
        
        const battleDef = BATTLES[this.battleId];
        this.isCutscene = battleDef?.isCutscene || false;

        if (!this.isCustom) {
            gs.set('currentBattleId', this.battleId);
        }

        console.log(`Entering battle: ${this.battleId}`);

        const musicKey = (this.battleId === 'daxing' || this.battleId === 'qingzhou_prelude') ? 'oath' : 'battle';
        assets.playMusic(musicKey, 0.4);
        
        const { config, canvas } = this.manager;
        this.tacticsMap = new TacticsMap(config.mapWidth, config.mapHeight);

        // Calculate map start positions once
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        this.startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        this.startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        // HARD RESET all scene state to prevent bleed from previous battles
        this.units = [];
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.hoveredCell = null;
        this.activeDialogue = null;
        this.introScript = null; // Fix dialogue flicker
        this.reachableTiles = new Map();
        this.attackTiles = new Map();
        this.projectiles = [];
        this.particles = [];
        this.damageNumbers = [];
        this.ambushTriggered = false;
        this.reachedFlag = false;
        this.isProcessingTurn = false;
        this.isRetreating = false;
        this.turnNumber = 1;
        this.turn = 'player';
        this.baseXP = 5; // Baseline XP for victory
        this.dialogueElapsed = 0;
        this.dialogueStep = 0;
        this.subStep = 0;
        this.gameOverTimer = 0;
        this.isGameOver = false;
        this.isVictoryDialogueActive = false;
        this.victoryScript = null;
        this.victoryOnComplete = null;
        this.isCleanupDialogueActive = false;
        this.cleanupDialogueScript = null;
        this.cleanupDialogueStep = 0;
        this.enemiesKilled = 0;
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.lastTime = 0;
        
        if (battleDef) {
            this.mapGenParams = params.mapGen || battleDef.map;
        } else {
            // Original initialization for custom/fallbacks
            this.mapGenParams = params.mapGen || {
                biome: 'central',
                layout: 'river', 
                forestDensity: 0.15,
                mountainDensity: 0.1,
                riverDensity: 0.05,
                houseDensity: 0.03
            };
        }

        this.tacticsMap.generate(this.mapGenParams);

        if (battleDef && battleDef.flagPos) {
            // Find a suitable spot for the flag if specified spot is impassable
            let r = battleDef.flagPos.r, q = battleDef.flagPos.q;
            let cell = this.tacticsMap.getCell(r, q);
            if (!cell || cell.impassable) {
                const foundCell = this.findNearestFreeCell(r, q);
                if (foundCell) {
                    r = foundCell.r;
                    q = foundCell.q;
                }
            }
            this.flagPos = { r, q };
        } else {
            this.flagPos = null;
        }
            
            // Reachability Check for Qingzhou Siege Flag
            if (this.battleId === 'qingzhou_siege' && this.flagPos) {
                let attempts = 0;
                while (attempts < 5) {
                    // Liu Bei starts at {r: 7, q: 4} in qingzhou_siege
                    const path = this.tacticsMap.getPath(7, 4, this.flagPos.r, this.flagPos.q, 99);
                    if (path) break;
                    this.tacticsMap.generate(this.mapGenParams);
                    attempts++;
                }
            }

        this.placeInitialUnits(params.units);
        
        // Spawn random boulders on mountain maps
        if (this.mapGenParams.layout === 'mountain_pass' || this.mapGenParams.mountainDensity > 0.1) {
            this.spawnRandomBoulders();
        }

        // Specific boulder placement for Qingzhou Ambush
        if (this.battleId === 'qingzhou_siege') {
            this.placeAmbushBoulders();
        }
        
        // Setup Weather
        this.weatherType = this.mapGenParams.weather || null;
        if (this.weatherType === 'none') this.weatherType = null;
        
        if (!this.weatherType) {
            if (this.mapGenParams.biome === 'northern_snowy') this.weatherType = 'snow';
            else if (this.mapGenParams.biome === 'southern' && Math.random() < 0.3) this.weatherType = 'rain';
        }
        
        this.isIntroDialogueActive = false; // Set to false initially
        this.dialogueStep = 0;
        
        // Wait for intro animation then start dialogue
        setTimeout(() => {
            this.startIntroDialogue();
        }, 1500);

        this.particles = [];
        if (!this.isCustom) {
            this.manager.gameState.set('lastScene', 'tactics');
        }

        if (this.battleId === 'qingzhou_cleanup') {
            this.isProcessingTurn = true;
            setTimeout(() => {
                this.triggerQingzhouCleanup();
            }, 2000);
        }

        // Track initial houses
        this.initialHouseCount = 0;
        for (let r = 0; r < this.manager.config.mapHeight; r++) {
            for (let q = 0; q < this.manager.config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                if (cell && cell.terrain.includes('house') && !cell.terrain.includes('destroyed')) {
                    this.initialHouseCount++;
                }
            }
        }
    }

    startIntroDialogue() {
        this.subStep = 0;
        this.introScript = null;
        const battleDef = BATTLES[this.battleId];
        
        if (battleDef && battleDef.introScript) {
            this.introScript = battleDef.introScript;
        }
        
        if (this.introScript) {
            this.isIntroDialogueActive = true;
            this.dialogueStep = 0;
        } else if (this.isCutscene) {
            // Cutscenes handle their own flow - don't start NPC phase
            this.isIntroDialogueActive = false;
        } else {
            this.isIntroDialogueActive = false;
            this.startNpcPhase(); // Skip to NPC phase if no dialogue
        }
    }

    startVictoryDialogue(scriptId, onComplete) {
        if (!NARRATIVE_SCRIPTS[scriptId]) {
            if (onComplete) onComplete();
            return;
        }
        
        this.isVictoryDialogueActive = true;
        this.victoryScript = NARRATIVE_SCRIPTS[scriptId];
        this.dialogueStep = 0;
        this.subStep = 0;
        this.dialogueElapsed = 0;
        this.victoryOnComplete = onComplete;
    }

    checkWinLoss() {
        if (this.isGameOver || this.isIntroAnimating || this.isIntroDialogueActive || this.isVictoryDialogueActive || this.isCleanupDialogueActive || this.isCutscene) return;

        const battleDef = BATTLES[this.battleId];
        const playerUnits = this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp > 0);
        const enemyUnits = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);

        // Special handling for victory in the ambush battle
        if (this.battleId === 'qingzhou_siege' && this.ambushTriggered && enemyUnits.length === 0) {
            this.manager.gameState.addMilestone('qingzhou_siege');
            
            // Play victory dialogue over the map
            this.startVictoryDialogue('qingzhou_victory', () => {
                this.endBattle(true);
            });
            return;
        }

        if (this.isCutscene) {
            return;
        }

        // Loss: All player team wiped
        if (playerUnits.length === 0) {
            this.endBattle(false);
            return;
        }

        if (battleDef && battleDef.victoryCondition) {
            const vc = battleDef.victoryCondition;
            
            // Check Must Survive conditions
            if (vc.mustSurvive) {
                const deadRequired = vc.mustSurvive.some(id => !this.units.find(u => u.id === id && u.hp > 0));
                if (deadRequired) {
                    this.endBattle(false);
                    return;
                }
            }

            if (vc.type === 'defeat_captains') {
                const captains = enemyUnits.filter(u => vc.captains.includes(u.id));
                if (captains.length === 0 && !this.isRetreating) {
                    this.startRetreatPhase();
                    return;
                }
            } else if (vc.type === 'prelude') {
                if (!this.isIntroDialogueActive && !this.isGameOver) {
                    this.isGameOver = true;
                    this.manager.switchTo('tactics', { battleId: 'qingzhou_siege' });
                    return;
                }
            } else if (vc.type === 'reach_flag_then_defeat_all') {
                const liubei = playerUnits.find(u => u.id === 'liubei');
                // Only trigger if Liu Bei is NOT currently moving to avoid race conditions with checkArrival
                // and ensure flagPos exists to prevent crashes
                if (!this.reachedFlag && liubei && !liubei.isMoving && this.flagPos && liubei.r === this.flagPos.r && liubei.q === this.flagPos.q) {
                    this.reachedFlag = true;
                    this.isProcessingTurn = true;
                    this.activeDialogue = null;
                    
                    try {
                        this.triggerAmbush();
                    } catch (e) {
                        console.error("Ambush trigger failed:", e);
                        this.isProcessingTurn = false;
                    }
                }

                if (enemyUnits.length === 0) {
                    if (this.isIntroAnimating || this.isIntroDialogueActive || this.isProcessingTurn) return;
                    if (this.ambushTriggered) {
                        if (this.turnNumber > 2) this.endBattle(true);
                    } else if (this.turnNumber > 2) {
                        this.triggerAmbush(true);
                    }
                }
            }
        } else {
            // Default: defeat all enemies
            if (enemyUnits.length === 0) {
                this.endBattle(true);
            }
        }
    }

    triggerQingzhouCleanup() {
        const guards = this.units.filter(u => u.id.startsWith('guard'));
        const rebels = this.units.filter(u => u.id.startsWith('rebel_cleanup'));
        const liubei = this.units.find(u => u.id === 'liubei');
        const guanyu = this.units.find(u => u.id === 'guanyu');
        const zhangfei = this.units.find(u => u.id === 'zhangfei');
        const gongjing = this.units.find(u => u.id === 'gongjing');
        
        if (guards.length >= 2 && rebels.length >= 2) {
            // Guard 1 attacks Rebel 1
            setTimeout(() => {
                guards[0].action = 'attack_1';
                setTimeout(() => {
                    this.applyUnitDamage(rebels[0], 99);
                    const pos = this.getPixelPos(rebels[0].r, rebels[0].q);
                    this.addDamageNumber(pos.x, pos.y - 20, 99);
                    assets.playSound('slash');
                    guards[0].action = 'standby';
                }, 300);
            }, 500);

            // Guard 2 attacks Rebel 2
            setTimeout(() => {
                guards[1].action = 'attack_1';
                setTimeout(() => {
                    this.applyUnitDamage(rebels[1], 99);
                    const pos = this.getPixelPos(rebels[1].r, rebels[1].q);
                    this.addDamageNumber(pos.x, pos.y - 20, 99);
                    assets.playSound('slash');
                    guards[1].action = 'standby';
                }, 300);
            }, 1000);

            // After kills, oath brothers walk towards Gong Jing
            setTimeout(() => {
                // Move Liu Bei towards Gong Jing
                if (liubei) {
                    const pathLiubei = this.tacticsMap.getPath(liubei.r, liubei.q, 4, 4, 10, liubei);
                    if (pathLiubei) {
                        const oldCell = this.tacticsMap.getCell(liubei.r, liubei.q);
                        if (oldCell) oldCell.unit = null;
                        liubei.startPath(pathLiubei);
                        const newCell = this.tacticsMap.getCell(4, 4);
                        if (newCell) newCell.unit = liubei;
                        liubei.r = 4; liubei.q = 4;
                    }
                }
                // Move Guan Yu
                if (guanyu) {
                    setTimeout(() => {
                        const pathGuanyu = this.tacticsMap.getPath(guanyu.r, guanyu.q, 5, 4, 10, guanyu);
                        if (pathGuanyu) {
                            const oldCell = this.tacticsMap.getCell(guanyu.r, guanyu.q);
                            if (oldCell) oldCell.unit = null;
                            guanyu.startPath(pathGuanyu);
                            const newCell = this.tacticsMap.getCell(5, 4);
                            if (newCell) newCell.unit = guanyu;
                            guanyu.r = 5; guanyu.q = 4;
                        }
                    }, 200);
                }
                // Move Zhang Fei
                if (zhangfei) {
                    setTimeout(() => {
                        const pathZhangfei = this.tacticsMap.getPath(zhangfei.r, zhangfei.q, 4, 6, 10, zhangfei);
                        if (pathZhangfei) {
                            const oldCell = this.tacticsMap.getCell(zhangfei.r, zhangfei.q);
                            if (oldCell) oldCell.unit = null;
                            zhangfei.startPath(pathZhangfei);
                            const newCell = this.tacticsMap.getCell(4, 6);
                            if (newCell) newCell.unit = zhangfei;
                            zhangfei.r = 4; zhangfei.q = 6;
                        }
                    }, 400);
                }
            }, 2000);

            // Start dialogue after movement
            setTimeout(() => {
                this.startCleanupDialogue();
            }, 4500);
        } else {
            this.isProcessingTurn = false;
        }
    }

    startCleanupDialogue() {
        // Use victory dialogue system to show dialogue on the map
        this.cleanupDialogueScript = [
            {
                type: 'dialogue',
                speaker: 'gongjing',
                name: 'Protector Gong Jing',
                voiceId: 'qz_ret_gj_01',
                text: "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered."
            },
            {
                type: 'dialogue',
                speaker: 'liubei',
                name: 'Liu Bei',
                voiceId: 'qz_ret_lb_01',
                text: "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere."
            },
            {
                type: 'dialogue',
                speaker: 'gongjing',
                name: 'Protector Gong Jing',
                voiceId: 'qz_ret_gj_02',
                text: "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself."
            },
            {
                type: 'dialogue',
                speaker: 'liubei',
                name: 'Liu Bei',
                voiceId: 'qz_ret_lb_02',
                text: "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!"
            }
        ];
        this.cleanupDialogueStep = 0;
        this.isCleanupDialogueActive = true;
        this.dialogueElapsed = 0;
        this.isProcessingTurn = false;
        
        // Play voice for first step
        const firstStep = this.cleanupDialogueScript[0];
        if (firstStep && firstStep.voiceId) {
            assets.playVoice(firstStep.voiceId);
        }
    }

    triggerAmbush(surprised = false) {
        this.ambushTriggered = true;
        // Don't clear history immediately; wait until units are fully added to set NEW baseline
        
        const liubei = this.units.find(u => u.id === 'liubei');
        
        if (surprised) {
            if (liubei) {
                liubei.dialogue = "I... I think I've taken care of them already.";
                this.activeDialogue = { unit: liubei, timer: 3000 };
            }
            
            setTimeout(() => {
                try {
                    this.addAmbushUnit('zhangfei', 'Zhang Fei', 'zhangfei', 10, 1, ['serpent_spear'], false);
                    this.addAmbushUnit('guanyu', 'Guan Yu', 'guanyu', 10, 8, ['green_dragon_slash'], true);
                    
                    if (guanyu) {
                        guanyu.dialogue = "Brother! We heard the signal was... oh. They are all fallen.";
                        this.activeDialogue = { unit: guanyu, timer: 3000 };
                        assets.playVoice('qz_gy_surp_01');
                    }
                    
                    setTimeout(() => {
                        this.endBattle(true);
                    }, 3000);
                } catch (e) {
                    console.error("Surprised ambush failed:", e);
                    this.isProcessingTurn = false;
                }
            }, 1000);
            return;
        }

        if (liubei) {
            liubei.dialogue = "BEAT THE GONGS! Brothers, strike now!";
            liubei.voiceId = 'qz_lb_amb_01';
            this.activeDialogue = { unit: liubei, timer: 1500 };
            assets.playVoice(liubei.voiceId);
            assets.playSound('gong', 1.0);
        }

        // Add Guan Yu, Zhang Fei and the 3 campaign soldiers at the flanks
        setTimeout(() => {
            try {
                // Bottom Left (Zhang Fei + Ally 1) - Facing Right
                this.addAmbushUnit('zhangfei', 'Zhang Fei', 'zhangfei', 10, 1, ['serpent_spear'], false);
                this.addAmbushUnit('ally1', 'Volunteer', 'soldier', 11, 0, ['slash'], false);
                
                // Top (Blocking/Reinforcing - Ally 3) - Facing Down
                this.addAmbushUnit('ally3', 'Volunteer', 'soldier', 0, 5, ['slash'], false);

                setTimeout(() => {
                    try {
                        // Bottom Right (Guan Yu + Ally 2) - Facing Left
                        this.addAmbushUnit('guanyu', 'Guan Yu', 'guanyu', 10, 8, ['green_dragon_slash'], true);
                        this.addAmbushUnit('ally2', 'Volunteer', 'soldier', 11, 9, ['slash'], true);

                        // FINAL STEP: All units are in place. Set the new baseline for undo/reset.
                        setTimeout(() => {
                            this.history = []; // Clear old history
                            this.pushHistory(); // Capture new state as the first baseline entry
                            this.isProcessingTurn = false; // Allow player to move
                        }, 1000);
                    } catch (e) {
                        console.error("Ambush part 2 failed:", e);
                        this.isProcessingTurn = false;
                    }
                }, 300);
            } catch (e) {
                console.error("Ambush part 1 failed:", e);
                this.isProcessingTurn = false;
            }
        }, 500);
    }

    addAmbushUnit(id, name, imgKey, r, q, attacks, flip = false) {
        const gs = this.manager.gameState;
        const unitXP = gs.get('unitXP') || {};
        const unitClasses = gs.get('unitClasses') || {};
        
        const xp = unitXP[id] || 0;
        const level = this.getLevelFromXP(xp);
        
        // Continuity: Check for promoted class (e.g. Soldier -> Archer)
        let finalImgKey = imgKey;
        let finalAttacks = [...attacks];
        const unitClass = unitClasses[id] || (id.startsWith('ally') ? 'soldier' : id);
        
        if (unitClass === 'archer') {
            finalImgKey = 'archer';
            finalAttacks = ['arrow_shot'];
        }

        // Apply weapon upgrades based on level
        const path = UPGRADE_PATHS[unitClass];
        if (path) {
            Object.keys(path).forEach(lvl => {
                if (level >= parseInt(lvl)) {
                    const upgrade = path[lvl];
                    if (upgrade.attack) {
                        finalAttacks[0] = upgrade.attack;
                    }
                }
            });
        }

        const faction = (id === 'liubei' || id === 'guanyu' || id === 'zhangfei') ? 'player' : 'allied';
        const finalMaxHp = this.getMaxHpForLevel(level, (faction === 'player' ? 4 : 2));

        // AMBUSH SPECIAL: Force the target cell to be passable so they can appear on mountains
        const targetCell = this.tacticsMap.getCell(r, q);
        if (targetCell) {
            targetCell.impassable = false;
            // Carve a ramp to ensure they can reach level 0/1
            // We'll find a path to the center and ensure level diffs are <= 1
            const centerR = Math.floor(this.manager.config.mapHeight / 2);
            const centerQ = Math.floor(this.manager.config.mapWidth / 2);
            const path = this.tacticsMap.getLine(r, q, centerR, centerQ);
            let lastLevel = targetCell.level;
            for (const step of path) {
                const cell = this.tacticsMap.getCell(step.r, step.q);
                if (!cell) continue;
                cell.impassable = false;
                if (Math.abs(cell.level - lastLevel) > 1) {
                    cell.level = lastLevel > cell.level ? lastLevel - 1 : lastLevel + 1;
                }
                lastLevel = cell.level;
            }
        }

        // Find closest free spot if r,q is taken
        const finalCell = this.findNearestFreeCell(r, q, 5);
        if (!finalCell) {
            console.warn(`Could not find a free spot for ambush unit ${id} at (${r},${q})`);
            return null;
        }

        const unit = new Unit(id, {
            id, name, imgKey: finalImgKey, r: finalCell.r, q: finalCell.q,
            level, hp: finalMaxHp, maxHp: finalMaxHp,
            faction: faction, 
            moveRange: (unitClass === 'archer' ? 3 : 4), 
            attacks: finalAttacks,
            flip: flip,
            img: assets.getImage(finalImgKey)
        });
        
        this.units.push(unit);
        finalCell.unit = unit;
        this.addDamageNumber(this.getPixelPos(finalCell.r, finalCell.q).x, this.getPixelPos(finalCell.r, finalCell.q).y - 20, "AMBUSH!", '#ffd700');
        
        return unit;
    }

    startGuangzongRetreatPhase() {
        this.isRetreating = true;
        this.isProcessingTurn = true;

        const liubei = this.units.find(u => u.id === 'liubei');
        if (liubei && liubei.hp > 0) {
            liubei.dialogue = "We have scattered their vanguard, but there are too many! We must retreat!";
            liubei.voiceId = 'gz_lb_ret_01';
            this.activeDialogue = { unit: liubei, timer: 3000 };
            assets.playVoice(liubei.voiceId);
        }

        setTimeout(() => {
            this.activeDialogue = null;
            
            const playerUnits = this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp > 0);
            let movingCount = 0;
            playerUnits.forEach(u => {
                // Find path to right of map (retreat away from the wall on the left)
                const targetQ = this.manager.config.mapWidth - 1;
                const targetR = u.r; 
                
                const path = this.tacticsMap.getPath(u.r, u.q, targetR, targetQ, 20, u);
                if (path) {
                    const oldCell = this.tacticsMap.getCell(u.r, u.q);
                    if (oldCell) oldCell.unit = null;
                    u.startPath(path);
                    movingCount++;
                } else {
                    u.isGone = true;
                }
            });

            const checkRetreatDone = () => {
                const stillMoving = playerUnits.some(u => u.isMoving);
                if (!stillMoving) {
                    playerUnits.forEach(u => u.isGone = true);
                    this.endBattle(true);
                } else {
                    setTimeout(checkRetreatDone, 100);
                }
            };
            
            if (movingCount > 0) {
                checkRetreatDone();
            } else {
                this.endBattle(true);
            }
        }, 3000);
    }

    endBattle(won) {
        this.isGameOver = true;
        this.won = won;
        this.gameOverTimer = 2500; // Time before showing summary
        this.isProcessingTurn = true;

        const gs = this.manager.gameState;
        
        const unitXP = gs.get('unitXP') || {};
        const recoveryInfo = [];
        const levelUps = [];

        if (won && !this.isCustom) {
            gs.addMilestone(this.battleId);
            gs.set('lastScene', 'map'); // Return to map on continue
        }

        // Calculate final stats
        let housesDestroyed = 0;
        for (let r = 0; r < this.manager.config.mapHeight; r++) {
            for (let q = 0; q < this.manager.config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                if (cell && cell.terrain.includes('house') && cell.terrain.includes('destroyed')) {
                    housesDestroyed++;
                }
            }
        }

        const housesProtected = Math.max(0, this.initialHouseCount - housesDestroyed);
        const xpGained = this.isCustom ? 0 : Math.max(0, this.baseXP + Math.min(3, housesProtected) - this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp <= 0).length);

        if (!this.isCustom) {
            // Process XP and Injuries
            this.units.forEach(u => {
                if (u.faction === 'player' || u.faction === 'allied') {
                    if (u.hp <= 0) {
                        // Character DIED/INJURED
                        if (u.faction === 'player') {
                            const oldXP = unitXP[u.id] || 0;
                            const levelAtStart = this.getLevelFromXP(oldXP);
                            const xpAtLevelStart = this.getXPForLevel(levelAtStart);
                            const xpLost = oldXP - xpAtLevelStart;
                            
                            unitXP[u.id] = xpAtLevelStart;
                            recoveryInfo.push({
                                id: u.id,
                                name: u.name,
                                xpLost: xpLost,
                                level: levelAtStart,
                                imgKey: u.imgKey
                            });
                        } else if (u.faction === 'allied') {
                            // Allied soldiers are replaced with Level 1 (0 XP)
                            unitXP[u.id] = 0;
                            const unitClasses = gs.get('unitClasses') || {};
                            delete unitClasses[u.id];
                            gs.set('unitClasses', unitClasses);
                        }
                    } else if (won) {
                        // Character SURVIVED and WON
                        const oldXP = unitXP[u.id] || 0;
                        const oldLevel = this.getLevelFromXP(oldXP);
                        unitXP[u.id] = oldXP + xpGained;
                        const newLevel = this.getLevelFromXP(unitXP[u.id]);
                        
                        if (newLevel > oldLevel) {
                            levelUps.push({
                                id: u.id,
                                name: u.name,
                                oldLevel: oldLevel,
                                newLevel: newLevel,
                                imgKey: u.imgKey
                            });
                        }
                    }
                }
            });
            gs.set('unitXP', unitXP);
        }

        this.finalStats = {
            won: won,
            battleId: this.battleId,
            alliedCasualties: this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp <= 0).length,
            enemyCasualties: this.units.filter(u => u.faction === 'enemy' && u.hp <= 0).length,
            housesDestroyed: housesDestroyed,
            housesProtected: housesProtected,
            totalHouses: this.initialHouseCount,
            turnNumber: this.turnNumber,
            xpGained: xpGained,
            recoveryInfo: recoveryInfo,
            levelUps: levelUps
        };

        if (this.isCustom) {
            const stats = gs.get('customStats') || { totalBattles: 0, wins: 0, losses: 0, enemiesDefeated: 0, unitsLost: 0 };
            stats.totalBattles++;
            if (won) stats.wins++;
            else stats.losses++;
            stats.enemiesDefeated += this.finalStats.enemyCasualties;
            stats.unitsLost += this.finalStats.alliedCasualties;
            gs.set('customStats', stats);
        }

        if (!this.isCustom) {
            this.clearBattleState();
        }
    }

    startNpcPhase() {
        this.turn = 'allied_moving';
        this.isProcessingTurn = true;
        
        // Clear old intents before starting new phase
        this.units.forEach(u => {
            if (u.faction !== 'player') {
                u.intent = null;
                u.attackOrder = null;
            }
        });

        const allies = this.units.filter(u => u.faction === 'allied' && u.hp > 0);
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        
        const executeMoves = (npcs, index, onComplete) => {
            if (index >= npcs.length) {
                onComplete();
                return;
            }
            
            const npc = npcs[index];
            if (npc.hp <= 0 || npc.isGone) {
                executeMoves(npcs, index + 1, onComplete);
                return;
            }

            this.moveNpcAndTelegraph(npc, () => {
                // Pause between individual NPC moves so player can follow
                setTimeout(() => {
                    executeMoves(npcs, index + 1, onComplete);
                }, 400); 
            });
        };
        
        // Allied Phase
        setTimeout(() => {
            executeMoves(allies, 0, () => {
                // Enemy Phase
                this.turn = 'enemy_moving';
                if (this.battleId === 'daxing') {
                    this.checkDaxingReinforcements();
                } else if (this.battleId === 'qingzhou_siege') {
                    this.checkQingzhouReinforcements();
                }
                setTimeout(() => {
                    executeMoves(enemies, 0, () => {
                        // Final pause to see the last move
                        setTimeout(() => {
                            this.telegraphAllNpcs();
                            this.startPlayerTurn();
                        }, 300);
                    });
                }, 400);
            });
        }, 500);
    }

    telegraphAllNpcs() {
        // Reset all NPC orders first, but KEEEP intents that were set during individual movement
        this.units.forEach(u => {
            if (u.faction !== 'player') {
                u.attackOrder = null;
            }
        });

        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        const allies = this.units.filter(u => u.faction === 'allied' && u.hp > 0);
        
        let order = 1;
        // Enemies first (Red numbers)
        enemies.forEach(e => {
            // ONLY assign order if they already have an intent from their move phase
            if (e.intent) {
                e.attackOrder = order++;
            }
        });
        // Allies second (Green numbers)
        allies.forEach(a => {
            if (a.intent) {
                a.attackOrder = order++;
            }
        });
    }

    moveNpcAndTelegraph(unit, onComplete) {
        const attackKey = unit.attacks[0] || 'stab';
        const attackConfig = ATTACKS[attackKey] || ATTACKS.stab;
        const minRange = attackConfig.minRange || 1;
        const maxRange = attackConfig.range || 1;

        const targetFaction = unit.faction === 'enemy' ? ['player', 'allied'] : ['enemy'];
        const unitTargets = this.units.filter(u => targetFaction.includes(u.faction) && u.hp > 0);
        const reachableData = this.tacticsMap.getReachableData(unit.r, unit.q, unit.moveRange, unit);
        
        let bestTile = { r: unit.r, q: unit.q };
        let chosenTargetPos = null;

        // Filter reachable hexes to those that aren't occupied (can't end on a unit)
        const validDestinations = new Map();
        reachableData.forEach((data, key) => {
            const [r, q] = key.split(',').map(Number);
            const cell = this.tacticsMap.getCell(r, q);
            if (!cell.unit || cell.unit === unit) {
                validDestinations.set(key, data);
            }
        });

        // 1. Check if we can reach a unit to attack it
        let unitAttackTiles = [];
        validDestinations.forEach((data, key) => {
            const [r, q] = key.split(',').map(Number);
            
            // Look for targets within range from this tile
            const potentialTarget = unitTargets.find(t => {
                const dist = this.tacticsMap.getDistance(r, q, t.r, t.q);
                return dist >= minRange && dist <= maxRange;
            });

            if (potentialTarget) {
                unitAttackTiles.push({ r, q, target: potentialTarget });
            }
        });

        if (unitAttackTiles.length > 0) {
            // Pick a tile that allows attacking a unit. 
            // Prefer tiles that are closer to the unit's current position if multiple exist? 
            // Or just the first one. Let's pick the one that lets us hit the closest target.
            unitAttackTiles.sort((a, b) => {
                const distA = this.tacticsMap.getDistance(a.r, a.q, a.target.r, a.target.q);
                const distB = this.tacticsMap.getDistance(b.r, b.q, b.target.r, b.target.q);
                return distA - distB;
            });
            bestTile = unitAttackTiles[0];
            chosenTargetPos = { r: bestTile.target.r, q: bestTile.target.q };
        } 
        // 2. If no units reachable, check if enemy can reach a house
        else if (unit.faction === 'enemy') {
            let houseAttackTiles = [];
            validDestinations.forEach((data, key) => {
                const [r, q] = key.split(',').map(Number);
                
                // For houses, we'll still mostly look for adjacent ones unless we want archers to snipe houses
                // For now let's keep it simple and just use maxRange 1 for houses unless it's a dedicated siege unit
                const neighbors = this.tacticsMap.getNeighbors(r, q);
                const houseNeighbor = neighbors.find(n => n.terrain.includes('house') && !n.terrain.includes('destroyed'));
                if (houseNeighbor) {
                    houseAttackTiles.push({ r, q, target: houseNeighbor });
                }
            });

            if (houseAttackTiles.length > 0) {
                bestTile = houseAttackTiles[0];
                chosenTargetPos = { r: bestTile.target.r, q: bestTile.target.q };
            }
        }

        // 3. If no immediate attacks possible, move towards the nearest unit (or house)
        if (!chosenTargetPos) {
            let nearestTargetPos = null;
            let minDist = Infinity;

            if (unitTargets.length > 0) {
                unitTargets.forEach(t => {
                    const dist = this.tacticsMap.getDistance(unit.r, unit.q, t.r, t.q);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestTargetPos = { r: t.r, q: t.q };
                    }
                });
            } else if (unit.faction === 'enemy') {
                // Fallback to houses if no units exist
                for (let r = 0; r < this.manager.config.mapHeight; r++) {
                    for (let q = 0; q < this.manager.config.mapWidth; q++) {
                        const cell = this.tacticsMap.getCell(r, q);
                        if (cell.terrain.includes('house') && !cell.terrain.includes('destroyed')) {
                            const d = this.tacticsMap.getDistance(unit.r, unit.q, r, q);
                            if (d < minDist) {
                                minDist = d;
                                nearestTargetPos = { r, q };
                            }
                        }
                    }
                }
            }

            if (nearestTargetPos) {
                let minDistFromTile = Infinity;
                let bestGapTile = null;
                let minGapDistFromTile = Infinity;

                validDestinations.forEach((data, key) => {
                    const [r, q] = key.split(',').map(Number);
                    const dist = this.tacticsMap.getDistance(r, q, nearestTargetPos.r, nearestTargetPos.q);
                    
                    if (dist < minDistFromTile) {
                        minDistFromTile = dist;
                        bestTile = { r, q };
                    }

                    // Allied spacing logic: Try to keep a 1-hex gap from other allies
                    if (unit.faction === 'allied') {
                        const neighbors = this.tacticsMap.getNeighbors(r, q);
                        const hasNearbyAlly = neighbors.some(n => n.unit && n.unit.faction === 'allied' && n.unit !== unit);
                        if (!hasNearbyAlly) {
                            if (dist < minGapDistFromTile) {
                                minGapDistFromTile = dist;
                                bestGapTile = { r, q };
                            }
                        }
                    }
                });

                // If we found a tile that respects the gap, use it
                if (unit.faction === 'allied' && bestGapTile) {
                    bestTile = bestGapTile;
                }
            }
        }

        const path = this.tacticsMap.getPath(unit.r, unit.q, bestTile.r, bestTile.q, unit.moveRange, unit);
        if (path) {
            const oldCell = this.tacticsMap.getCell(unit.r, unit.q);
            if (oldCell) oldCell.unit = null;
            unit.startPath(path);
            this.tacticsMap.getCell(bestTile.r, bestTile.q).unit = unit;
        }

        const checkDone = () => {
            if (!unit.isMoving) {
                this.telegraphSingleNpc(unit);
                onComplete();
            } else {
                setTimeout(checkDone, 100);
            }
        };
        checkDone();
    }

    telegraphSingleNpc(unit) {
        const attackKey = unit.attacks[0] || 'stab';
        const attackConfig = ATTACKS[attackKey] || ATTACKS.stab;
        const minRange = attackConfig.minRange || 1;
        const maxRange = attackConfig.range || 1;
        const targetFaction = unit.faction === 'enemy' ? ['player', 'allied'] : ['enemy'];
        
        // Find units within range
        const unitTargets = this.units.filter(u => targetFaction.includes(u.faction) && u.hp > 0);
        const targetUnit = unitTargets.find(t => {
            const dist = this.tacticsMap.getDistance(unit.r, unit.q, t.r, t.q);
            return dist >= minRange && dist <= maxRange;
        });
        
        let targetPos = null;
        if (targetUnit) {
            targetPos = { r: targetUnit.r, q: targetUnit.q };
        } else if (unit.faction === 'enemy') {
            // Enemies look for adjacent houses if no units are nearby
            const neighbors = this.tacticsMap.getNeighbors(unit.r, unit.q);
            const adjacentHouse = neighbors.find(n => n.terrain.includes('house') && !n.terrain.includes('destroyed'));
            if (adjacentHouse) {
                targetPos = { r: adjacentHouse.r, q: adjacentHouse.q };
            }
        }

        if (targetPos) {
            const fromCube = this.tacticsMap.offsetToCube(unit.r, unit.q);
            const toCube = this.tacticsMap.offsetToCube(targetPos.r, targetPos.q);
            
            // RELATIVE INTENT: Store the relative cube vector
            unit.intent = { 
                type: 'attack', 
                relX: toCube.x - fromCube.x,
                relY: toCube.y - fromCube.y,
                relZ: toCube.z - fromCube.z,
                attackKey 
            };
            
            const startPos = this.getPixelPos(unit.r, unit.q);
            const endPos = this.getPixelPos(targetPos.r, targetPos.q);
            if (endPos.x < startPos.x) unit.flip = true;
            if (endPos.x > startPos.x) unit.flip = false;
        } else {
            unit.intent = null;
        }
    }

    saveBattleState() {
        if (this.battleId === 'custom') return; // Don't save state for custom battles
        const gs = this.manager.gameState;
        const state = this.captureState();
        gs.set('battleState', state);
    }

    captureState() {
        const config = this.manager.config;
        return {
            battleId: this.battleId,
            turn: this.turn,
            turnNumber: this.turnNumber,
            weatherType: this.weatherType,
            mapGen: this.mapGenParams,
            grid: this.tacticsMap.grid.map(row => row.map(cell => ({
                terrain: cell.terrain,
                level: cell.level,
                elevation: cell.elevation,
                impassable: cell.impassable
            }))),
            units: this.units.map(u => ({
                id: u.id,
                name: u.name,
                imgKey: u.imgKey,
                faction: u.faction,
                r: u.r,
                q: u.q,
                hp: u.hp,
                maxHp: u.maxHp,
                moveRange: u.moveRange,
                hasMoved: u.hasMoved,
                hasAttacked: u.hasAttacked,
                hasActed: u.hasActed,
                attacks: u.attacks,
                intent: u.intent ? { ...u.intent } : null,
                action: u.action,
                isDrowning: u.isDrowning,
                isGone: u.isGone,
                flip: u.flip
            }))
        };
    }

    pushHistory() {
        this.history.push(this.captureState());
    }

    getIntentTargetCell(unit) {
        if (!unit || !unit.intent) return null;
        if (unit.intent.relX === undefined) return null;

        const currentCube = this.tacticsMap.offsetToCube(unit.r, unit.q);
        return this.tacticsMap.getCellByCube(
            currentCube.x + unit.intent.relX,
            currentCube.y + unit.intent.relY,
            currentCube.z + unit.intent.relZ
        );
    }

    restoreState(state) {
        if (!state) return;
        const config = this.manager.config;
        
        this.turn = state.turn;
        this.turnNumber = state.turnNumber;
        this.weatherType = state.weatherType;
        
        // Restore Grid
        for (let r = 0; r < config.mapHeight; r++) {
            for (let q = 0; q < config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                const savedCell = state.grid[r][q];
                cell.terrain = savedCell.terrain;
                cell.level = savedCell.level;
                cell.elevation = savedCell.elevation;
                cell.impassable = savedCell.impassable;
                cell.unit = null; // Clear all units first
            }
        }

        // Restore Units
        state.units.forEach(uData => {
            let u = this.units.find(unit => unit.id === uData.id);
            if (!u) {
                // If unit was somehow removed, we might need to recreate it, 
                // but usually units just have isGone = true or hp = 0
                return; 
            }

            u.r = uData.r;
            u.q = uData.q;
            u.hp = uData.hp;
            u.maxHp = uData.maxHp;
            u.imgKey = uData.imgKey;
            u.img = assets.getImage(uData.imgKey);
            u.hasMoved = uData.hasMoved;
            u.hasAttacked = uData.hasAttacked;
            u.hasActed = uData.hasActed;
            u.intent = uData.intent ? { ...uData.intent } : null;
            u.action = uData.action || 'standby';
            u.isDrowning = uData.isDrowning || false;
            u.isGone = uData.isGone || false;
            u.flip = uData.flip || false;

            // Clear animation states
            u.frame = 0;
            u.isMoving = false;
            u.path = [];
            u.pushData = null;
            u.shakeTimer = 0;
            u.visualOffsetX = 0;
            u.visualOffsetY = 0;

            const cell = this.tacticsMap.getCell(u.r, u.q);
            if (cell) cell.unit = u;
        });

        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.attackRects = [];
        this.activeDialogue = null;
    }

    undo() {
        if (this.history.length <= 1) return;
        
        // Ensure we stop any active selection/tiles immediately
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.attackTiles.clear();
        this.reachableTiles.clear();
        this.attackRects = [];

        // Ensure we stop any active unit movement before restoring state
        this.units.forEach(u => {
            u.isMoving = false;
            u.path = [];
        });

        this.history.pop(); // Remove current state
        const prevState = this.history[this.history.length - 1];
        this.restoreState(prevState);
        assets.playSound('ui_click', 0.5);
    }

    clearBattleState() {
        this.manager.gameState.set('battleState', null);
    }

    startPlayerTurn() {
        this.turn = 'player';
        this.isProcessingTurn = false;
        this.units.forEach(u => {
            if (u.faction === 'player') {
                u.hasMoved = false;
                u.hasAttacked = false;
                u.hasActed = false;
            }
        });
        
        this.history = [];
        this.pushHistory(); // Save start of turn state
        this.saveBattleState();
    }

    startExecutionPhase() {
        if (this.isIntroDialogueActive) return; // Wait for intro
        this.turn = 'execution';
        this.isProcessingTurn = true;
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        
        // Collect all telegraphed attacks
        const attackers = this.units
            .filter(u => u.hp > 0 && u.intent && u.intent.type === 'attack')
            .sort((a, b) => (a.attackOrder || 99) - (b.attackOrder || 99));
        
        const executeAll = (index) => {
            if (index >= attackers.length) {
                // Short pause after the final attack before next phase
                setTimeout(() => {
                    this.checkWinLoss();
                    
                    if (!this.isGameOver) {
                        this.turnNumber++;
                        this.startNpcPhase();
                    }
                }, 600);
                return;
            }
            const unit = attackers[index];

            // FIX: Skip unit if they died before their turn to attack (e.g. friendly fire)
            // or if their intent was cleared
            if (unit.hp <= 0 || unit.isGone || !unit.intent) {
                executeAll(index + 1);
                return;
            }

            // RELATIVE TARGET CALCULATION
            const targetCell = this.getIntentTargetCell(unit);
            
            if (targetCell) {
                this.executeAttack(unit, unit.intent.attackKey, targetCell.r, targetCell.q, () => {
                    // Pause between individual attacks so results are clear
                    setTimeout(() => {
                        executeAll(index + 1);
                    }, 500);
                });
            } else {
                // Target is off-map or unreachable relatively (attack cancelled)
                executeAll(index + 1);
            }
        };
        
        // Delay before the very first attack starts
        setTimeout(() => {
            executeAll(0);
        }, 400);
    }

    checkDaxingReinforcements() {
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        const aliveCaptains = enemies.filter(u => u.id === 'dengmao' || u.id === 'chengyuanzhi');
        
        // Only spawn if captains are alive and we're low on grunts
        if (aliveCaptains.length > 0 && enemies.length < 5) {
            const spawnSpots = [
                { r: this.manager.config.mapHeight - 1, q: 3 }, 
                { r: this.manager.config.mapHeight - 1, q: 4 },
                { r: this.manager.config.mapHeight - 1, q: 5 }, 
                { r: this.manager.config.mapHeight - 1, q: 6 }
            ];
            
            let spawns = 0;
            spawnSpots.forEach(spot => {
                if (spawns >= 2) return;
                const cell = this.findNearestFreeCell(spot.r, spot.q, 5);
                if (cell) {
                    const id = `reinforcement_${Date.now()}_${spawns}`;
                    const config = {
                        name: "Yellow Turban",
                        imgKey: 'yellowturban',
                        faction: 'enemy',
                        hp: 3,
                        attacks: ['bash'],
                        r: cell.r, q: cell.q
                    };
                    const unit = new Unit(id, config);
                    unit.img = assets.getImage('yellowturban');
                    this.units.push(unit);
                    cell.unit = unit;
                    spawns++;
                }
            });

            if (spawns > 0) {
                this.addDamageNumber(this.manager.canvas.width / 2, 50, "REINFORCEMENTS!");
                const liubei = this.units.find(u => u.id === 'liubei');
                if (liubei && liubei.hp > 0) {
                    liubei.dialogue = "They keep coming! We must defeat Deng Mao and Cheng Yuanzhi to break them!";
                    liubei.voiceId = 'dx_lb_03';
                    this.activeDialogue = { unit: liubei, timer: 2000 };
                    assets.playVoice(liubei.voiceId);
                }
            }
        }
    }

    checkQingzhouReinforcements() {
        // 5 enter on turn 1, 5 enter on turn 2
        // If ambush was triggered, we might want to stop these or change them, 
        // but the prompt says "5 enemies appearing on the first turn and then 5 more on the next turn"
        // which usually refers to the start of the battle.
        if (this.turnNumber === 1 || this.turnNumber === 2) {
            const spawnSpots = [
                { r: this.manager.config.mapHeight - 1, q: 2 },
                { r: this.manager.config.mapHeight - 1, q: 3 },
                { r: this.manager.config.mapHeight - 1, q: 4 },
                { r: this.manager.config.mapHeight - 1, q: 5 },
                { r: this.manager.config.mapHeight - 1, q: 6 }
            ];

            let spawns = 0;
            spawnSpots.forEach((spot, i) => {
                const cell = this.findNearestFreeCell(spot.r, spot.q, 5);
                if (cell) {
                    const id = `qz_rebel_t${this.turnNumber}_${i}`;
                    const config = {
                        name: "Yellow Turban",
                        imgKey: 'yellowturban',
                        faction: 'enemy',
                        hp: 3,
                        attacks: ['bash'],
                        r: cell.r, q: cell.q
                    };
                    const unit = new Unit(id, config);
                    unit.img = assets.getImage('yellowturban');
                    this.units.push(unit);
                    cell.unit = unit;
                    spawns++;
                }
            });

            if (spawns > 0) {
                this.addDamageNumber(this.manager.canvas.width / 2, 50, "REBEL ADVANCE!");
            }
        }
    }

    spawnRandomBoulders() {
        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            // Find a high spot (level 2+) that is free
            let attempts = 0;
            while (attempts < 20) {
                const r = Math.floor(Math.random() * this.manager.config.mapHeight);
                const q = Math.floor(Math.random() * this.manager.config.mapWidth);
                const cell = this.tacticsMap.getCell(r, q);
                if (cell && !cell.impassable && !cell.unit && cell.level >= 2) {
                    this.addBoulder(r, q);
                    break;
                }
                attempts++;
            }
        }
    }

    placeAmbushBoulders() {
        // Specifically place boulders on the ridges overlooking the main path
        // In the NS mountain pass, ridges are around q=1,2 and q=w-2,w-3
        const ridgeQ = [1, 2, this.manager.config.mapWidth - 2, this.manager.config.mapWidth - 3];
        const rows = [4, 5, 6, 7]; // Mid-map rows
        
        rows.forEach(r => {
            ridgeQ.forEach(q => {
                if (Math.random() < 0.4) {
                    const cell = this.tacticsMap.getCell(r, q);
                    if (cell && !cell.unit && !cell.impassable && cell.level >= 2) {
                        this.addBoulder(r, q);
                    }
                }
            });
        });
    }

    addBoulder(r, q) {
        const id = `boulder_${r}_${q}`;
        const boulder = new Unit(id, {
            id,
            name: "Boulder",
            imgKey: 'boulder',
            img: assets.getImage('boulder'),
            r, q,
            hp: 2,
            maxHp: 2,
            faction: 'neutral',
            moveRange: 0,
            attacks: []
        });
        this.units.push(boulder);
        const cell = this.tacticsMap.getCell(r, q);
        if (cell) cell.unit = boulder;
    }

    startRetreatPhase() {
        this.isRetreating = true;
        this.isProcessingTurn = true;
        
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        if (enemies.length === 0) {
            this.endBattle(true);
            return;
        }

        // 1. One enemy speaks
        const speaker = enemies[0];
        speaker.dialogue = "Our leaders are dead! Run!";
        speaker.voiceId = 'dx_yt_01';
        this.activeDialogue = { unit: speaker, timer: 2500 };
        assets.playVoice(speaker.voiceId);

        // 2. Wait for dialogue, then make them run
        setTimeout(() => {
            this.activeDialogue = null;
            
            let movingCount = 0;
            enemies.forEach(u => {
                // Find path to bottom of map (any spot on bottom row)
                const targetR = this.manager.config.mapHeight - 1;
                const targetQ = u.q; // Just run straight down if possible
                
                const path = this.tacticsMap.getPath(u.r, u.q, targetR, targetQ, 20, u); // High move range for retreat
                if (path) {
                    const oldCell = this.tacticsMap.getCell(u.r, u.q);
                    if (oldCell) oldCell.unit = null;
                    u.startPath(path);
                    movingCount++;
                } else {
                    // If no path, just disappear
                    u.isGone = true;
                }
            });

            const checkRetreatDone = () => {
                const stillMoving = enemies.some(u => u.isMoving);
                if (!stillMoving) {
                    enemies.forEach(u => u.isGone = true);
                    this.endBattle(true);
                } else {
                    setTimeout(checkRetreatDone, 100);
                }
            };
            
            if (movingCount > 0) {
                checkRetreatDone();
            } else {
                this.endBattle(true);
            }
        }, 2000);
    }

    addDamageNumber(x, y, value, color = '#f00') {
        // Random jitter so multiple numbers don't overlap
        const jitterX = (Math.random() - 0.5) * 15;
        const jitterY = (Math.random() - 0.5) * 10;
        
        this.damageNumbers.push({
            x: x + jitterX, 
            y: y + jitterY, 
            value,
            color,
            timer: 1000,
            maxTime: 1000
        });
    }

    damageCell(r, q) {
        const cell = this.tacticsMap.getCell(r, q);
        if (!cell) return;

        if (cell.terrain === 'house_01') {
            cell.terrain = 'house_damaged_01';
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "DAMAGED");
            assets.playSound('building_damage');
        } else if (cell.terrain === 'house_damaged_01') {
            cell.terrain = 'house_destroyed_01';
            cell.impassable = false;
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "DESTROYED");
            assets.playSound('building_damage', 1.0); // Clamped to max 1.0
        } else if (cell.terrain === 'wall_01') {
            // Walls are sturdy and don't break yet, but we play a sound
            assets.playSound('building_damage', 0.6);
        } else if (cell.terrain === 'ice_01') {
            cell.terrain = 'ice_cracked_01';
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "CRACKED");
            assets.playSound('ice_crack');
        } else if (cell.terrain === 'ice_cracked_01') {
            cell.terrain = 'water_deep_01_01';
            cell.impassable = true;
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "BROKEN");
            assets.playSound('ice_break');
            assets.playSound('splash', 0.8);
            
            // Check if a unit was standing on it
            if (cell.unit) {
                const u = cell.unit;
                u.isDrowning = true;
                u.drownTimer = 0;
                cell.unit = null;
            }
        }
    }

    executeAttack(attacker, attackKey, targetR, targetQ, onComplete) {
        // Mark which units were alive at the very start of this logical action
        // to determine if a collision should occur vs sliding over a corpse.
        this.units.forEach(u => u._aliveAtStartOfAction = u.hp > 0);

        // Safety check: Only player can trigger attacks via this method during their turn
        if (this.turn === 'player' && attacker.faction !== 'player') {
            if (onComplete) onComplete();
            return;
        }

        // Emergency timeout to prevent execution phase hangs
        let completed = false;
        const wrappedOnComplete = () => {
            if (completed) return;
            completed = true;
            if (onComplete) onComplete();
        };
        setTimeout(() => {
            if (!completed) {
                console.warn(`Attack ${attackKey} by ${attacker.id} timed out. Forcing completion.`);
                wrappedOnComplete();
            }
        }, 3000); // 3s fallback

        attacker.intent = null; // Clear intent so arrow disappears
        const attack = ATTACKS[attackKey];

        const targetCell = this.tacticsMap.getCell(targetR, targetQ);
        const victim = targetCell ? targetCell.unit : null;
        const isDestructible = targetCell && (targetCell.terrain.includes('house') || targetCell.terrain.includes('ice')) && !targetCell.terrain.includes('destroyed') && !targetCell.terrain.includes('broken');

        // Play attack sound
        if (attackKey.startsWith('serpent_spear')) assets.playSound('stab');
        else if (attackKey.startsWith('green_dragon_slash')) assets.playSound('green_dragon');
        else if (attackKey === 'double_blades') assets.playSound('double_blades');
        else if (attackKey === 'bash') assets.playSound('bash');
        else if (attackKey.startsWith('slash')) assets.playSound('slash');
        else if (attackKey === 'stab') assets.playSound('stab');

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const targetPos = this.getPixelPos(targetR, targetQ);

        // Facing logic
        if (targetPos.x < startPos.x) attacker.flip = true;
        if (targetPos.x > startPos.x) attacker.flip = false;

        if (attackKey === 'double_blades') {
            this.executeDoubleBlades(attacker, targetR, targetQ, wrappedOnComplete);
        } else if (attackKey.startsWith('green_dragon_slash')) {
            this.executeGreenDragonSlash(attacker, attackKey, targetR, targetQ, wrappedOnComplete);
        } else if (attackKey.startsWith('serpent_spear')) {
            this.executeSerpentSpear(attacker, attackKey, targetR, targetQ, wrappedOnComplete);
        } else {
            // Standard single-target attack (Bash, etc.)
            this.executeStandardAttack(attacker, attackKey, targetR, targetQ, wrappedOnComplete);
        }
    }

    executeStandardAttack(attacker, attackKey, targetR, targetQ, onComplete) {
        const attack = ATTACKS[attackKey];
        attacker.action = attack.animation;
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const endPos = this.getPixelPos(targetR, targetQ);

        const targetCell = this.tacticsMap.getCell(targetR, targetQ);
        const victim = targetCell ? targetCell.unit : null;

        if (attack.type === 'projectile') {
            // Projectile timing: fires between frame 2 and 3
            let fired = false;
            const checkFire = () => {
                if (fired) return;
                if (attacker.frame >= 2) {
                    fired = true;
                    assets.playSound('bow_fire', 0.6);
                    // Fire projectile
                    this.projectiles.push({
                        startX: startPos.x,
                        startY: startPos.y - 20, // Fire from bow height
                        targetX: endPos.x,
                        targetY: victim ? endPos.y - 15 : endPos.y, // Target center mass if enemy exists
                        progress: 0,
                        type: 'arrow',
                        duration: 500,
                        onComplete: () => {
                            this.damageCell(targetR, targetQ);
                            if (victim) {
                                assets.playSound('arrow_hit', 0.7);
                                this.applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, endPos);
                            } else {
                                const isHouse = targetCell && targetCell.terrain.includes('house');
                                const isIce = targetCell && targetCell.terrain.includes('ice');
                                if (isHouse) {
                                    assets.playSound('building_damage', 0.8);
                                } else if (isIce) {
                                    const iceCell = this.tacticsMap.getCell(targetR, targetQ);
                                    if (iceCell.terrain === 'ice_01') {
                                        assets.playSound('ice_crack', 0.7);
                                    } else {
                                        assets.playSound('ice_break', 0.7);
                                    }
                                } else {
                                    assets.playSound('whiff', 0.4);
                                }
                            }
                        }
                    });
                } else if (attacker.action === attack.animation) {
                    setTimeout(checkFire, 30);
                }
            };
            checkFire();

            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 1000);
        } else {
        setTimeout(() => {
            const isDestructible = targetCell && (targetCell.terrain.includes('house') || targetCell.terrain.includes('ice')) && !targetCell.terrain.includes('destroyed') && !targetCell.terrain.includes('broken');

            this.damageCell(targetR, targetQ);
            if (victim) {
                this.applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, endPos);
            } else if (!isDestructible) {
                assets.playSound('whiff');
            }
            
            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
        }
    }

    executeDoubleBlades(attacker, targetR, targetQ, onComplete) {
        attacker.action = 'attack_1';
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const frontPos = this.getPixelPos(targetR, targetQ);
        
        // Opposite side target
        const dirIndex = this.tacticsMap.getDirectionIndex(attacker.r, attacker.q, targetR, targetQ);
        const oppositeDir = (dirIndex + 3) % 6;
        const backCell = this.tacticsMap.getNeighborInDirection(attacker.r, attacker.q, oppositeDir);
        const backPos = backCell ? this.getPixelPos(backCell.r, backCell.q) : null;

        const targetCell = this.tacticsMap.getCell(targetR, targetQ);
        const frontVictim = targetCell ? targetCell.unit : null;
        const backVictim = backCell ? backCell.unit : null;
        
        const isFrontDestructible = targetCell && (targetCell.terrain.includes('house') || targetCell.terrain.includes('ice')) && !targetCell.terrain.includes('destroyed') && !targetCell.terrain.includes('broken');
        const isBackDestructible = backCell && (backCell.terrain.includes('house') || backCell.terrain.includes('ice')) && !backCell.terrain.includes('destroyed') && !backCell.terrain.includes('broken');

        // First strike (Front)
        setTimeout(() => {
            this.damageCell(targetR, targetQ);
            if (frontVictim) {
                this.applyDamageAndPush(attacker, frontVictim, ATTACKS.double_blades, targetR, targetQ, startPos, frontPos);
            } else if (!isFrontDestructible) {
                assets.playSound('whiff', 0.6);
            }

            // Turn around
            setTimeout(() => {
                attacker.flip = !attacker.flip;
                attacker.action = 'attack_1';
                attacker.frame = 0;
                assets.playSound('double_blades');

                // Second strike (Back)
                setTimeout(() => {
                    if (backCell) this.damageCell(backCell.r, backCell.q);
                    if (backVictim && backCell) {
                        this.applyDamageAndPush(attacker, backVictim, ATTACKS.double_blades, backCell.r, backCell.q, startPos, backPos);
                    } else if (!isBackDestructible) {
                        assets.playSound('whiff', 0.6);
                    }
                    setTimeout(() => {
                        attacker.action = 'standby';
                        if (onComplete) onComplete();
                    }, 400);
                }, 400);
            }, 300);
        }, 400);
    }

    executeGreenDragonSlash(attacker, attackKey, targetR, targetQ, onComplete) {
        const attack = ATTACKS[attackKey] || ATTACKS.green_dragon_slash;
        attacker.action = attack.animation || 'attack_1';
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const affected = this.getAffectedTiles(attacker, attackKey, targetR, targetQ);

        setTimeout(() => {
            let hitAnything = false;
            affected.forEach(pos => {
                this.damageCell(pos.r, pos.q);
                const cell = this.tacticsMap.getCell(pos.r, pos.q);
                if (cell) {
                    const isDestructible = (cell.terrain.includes('house') || cell.terrain.includes('ice')) && !cell.terrain.includes('destroyed') && !cell.terrain.includes('broken');
                    if (isDestructible) hitAnything = true;
                    
                    if (cell.unit) {
                    const victim = cell.unit;
                    const victimPos = this.getPixelPos(cell.r, cell.q);
                        this.applyDamageAndPush(attacker, victim, attack, cell.r, cell.q, startPos, victimPos);
                        hitAnything = true;
                    }
                }
            });

            if (!hitAnything) {
                assets.playSound('whiff', 0.8);
            }

            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
    }

    executeSerpentSpear(attacker, attackKey, targetR, targetQ, onComplete) {
        const attack = ATTACKS[attackKey] || ATTACKS.serpent_spear;
        attacker.action = attack.animation || 'attack_2';
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const affected = this.getAffectedTiles(attacker, attackKey, targetR, targetQ);

        setTimeout(() => {
            let hitAnything = false;
            affected.forEach(pos => {
                this.damageCell(pos.r, pos.q);
                const cell = this.tacticsMap.getCell(pos.r, pos.q);
                if (cell) {
                    const isDestructible = (cell.terrain.includes('house') || cell.terrain.includes('ice')) && !cell.terrain.includes('destroyed') && !cell.terrain.includes('broken');
                    if (isDestructible) hitAnything = true;

                    if (cell.unit) {
                        const victim = cell.unit;
                        const victimPos = this.getPixelPos(cell.r, cell.q);
                        // Pass the original targetR/targetQ so only the furthest hex (clicked) gets pushed
                        this.applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, victimPos);
                        hitAnything = true;
                    }
                }
            });

            if (!hitAnything) {
                assets.playSound('whiff', 0.8);
            }

            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
    }

    applyUnitDamage(victim, damage, sourceCell = null) {
        let finalDamage = damage;
        
        // Boulder Special Logic: Cracked on first damage, destroyed on second
        if (victim.name === 'Boulder') {
            if (victim.hp === 2) {
                finalDamage = 1; // Only crack it
                victim.imgKey = 'boulder_cracked';
                victim.img = assets.getImage('boulder_cracked');
            } else {
                finalDamage = 1; // Break it
            }
        }

        victim.hp -= finalDamage;

        if (victim.hp <= 0) {
            victim.hp = 0;
            if (victim.name !== 'Boulder') {
                victim.action = 'death';
            }
            victim.intent = null;
            const currentCell = sourceCell || this.tacticsMap.getCell(victim.r, victim.q);
            if (currentCell) currentCell.unit = null;
            assets.playSound('death', 0.6);
            if (victim.faction === 'enemy') {
                this.enemiesKilled++;
            }
        } else {
            if (victim.name !== 'Boulder') {
                victim.action = 'hit';
            }
        }

        return finalDamage;
    }

    applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, endPos) {
        let finalDamage = attack.damage;
        let isCrit = false;
        let isResisted = false;
        let critText = "CRIT!";
        let resistText = "RESISTED!";

        const attackerCell = this.tacticsMap.getCell(attacker.r, attacker.q);
        const victimCell = this.tacticsMap.getCell(victim.r, victim.q);
        const heightDiff = (attackerCell?.level || 0) - (victimCell?.level || 0);

        // 1. Critical Hit (Player only)
        // Formula: 0.5 * (level - 1) / (level + 4) -> Asymptotically approaches 50%
        if (attacker.faction === 'player') {
            let critChance = 0.5 * (attacker.level - 1) / (attacker.level + 4);
            
            // Height Bonus/Penalty
            if (heightDiff > 0) {
                critChance *= 2;
                critText = "HIGH GROUND CRIT!";
            } else if (heightDiff < 0) {
                critChance *= 0.5;
            }

            if (Math.random() < critChance) {
                finalDamage *= 2;
                isCrit = true;
            }
        }

        // 2. Damage Resistance (Player/Allied only)
        if (victim.faction === 'player' || victim.faction === 'allied') {
            let resistChance = 0.5 * (victim.level - 1) / (victim.level + 4);
            
            // Height Bonus/Penalty (Victim is on high ground relative to attacker)
            if (heightDiff < 0) {
                resistChance *= 2;
                resistText = "HIGH GROUND RESIST!";
            } else if (heightDiff > 0) {
                resistChance *= 0.5;
            }

            if (Math.random() < resistChance) {
                finalDamage = 0;
                isResisted = true;
            }
        }

        // Apply damage & Shake
        finalDamage = this.applyUnitDamage(victim, finalDamage, victimCell);
        if (finalDamage > 0) {
            victim.triggerShake(startPos.x, startPos.y, endPos.x, endPos.y);
        }

        // Visual Feedback
        if (isResisted) {
            this.addDamageNumber(endPos.x, endPos.y - 30, resistText, '#00ff00');
            assets.playSound('whiff');
        } else if (isCrit) {
            this.addDamageNumber(endPos.x, endPos.y - 30, `${finalDamage} ${critText}`, '#ff0000');
        } else {
            this.addDamageNumber(endPos.x, endPos.y - 30, finalDamage);
        }

        if (attack.push) {
            // Special Case: Zhang Fei only pushes the furthest hex initially (the one targeted)
            if (attack.push === 'furthest') {
                if (victim.r !== targetR || victim.q !== targetQ) {
                    return; // Don't push intermediate targets
                }
            }

            // Handle push
            const dirIndex = this.tacticsMap.getDirectionIndex(attacker.r, attacker.q, targetR, targetQ);
            if (dirIndex === -1) return; // Cannot push if direction is undefined

            const pushCell = this.tacticsMap.getNeighborInDirection(victim.r, victim.q, dirIndex);
            
            const victimPos = this.getPixelPos(victim.r, victim.q);

            if (pushCell) {
                const targetPos = this.getPixelPos(pushCell.r, pushCell.q);
                const levelDiff = pushCell.level - victimCell.level;

                // 1. COLLISION (Pushing into a wall/high cliff or another living unit)
                const isHighCliff = levelDiff > 1;
                const isImpassable = pushCell.impassable;
                const isOccupiedByLiving = pushCell.unit && pushCell.unit._aliveAtStartOfAction;

                if (isHighCliff || isImpassable || isOccupiedByLiving) {
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, true); // true = bounce
                    this.executePushCollision(victim, pushCell, victimPos, targetPos);
                } 
                // 2. FALLING (Pushing off a cliff)
                else if (levelDiff < -1) {
                    const fallDamage = Math.max(0, Math.abs(levelDiff) - 1);
                    const occupant = pushCell.unit; // Could be a corpse or a living unit (if not _aliveAtStartOfAction)

                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false, Math.abs(levelDiff));
                    victimCell.unit = null;

                    if (occupant && occupant.hp > 0) {
                        // CRUSH MECHANIC
                        this.handleCrushLanding(victim, occupant, pushCell, levelDiff, targetPos);
                    } else {
                        // Normal fall landing
                        setTimeout(() => {
                            assets.playSound('collision', 0.8);
                            this.applyUnitDamage(victim, fallDamage);
                            this.addDamageNumber(targetPos.x, targetPos.y - 30, fallDamage);
                            victim.setPosition(pushCell.r, pushCell.q);
                            pushCell.unit = victim;
                        }, 400);
                    }
                }
                // 3. NORMAL PUSH (Same level or slight elevation change)
                else {
                    victimCell.unit = null;
                    victim.setPosition(pushCell.r, pushCell.q);
                    pushCell.unit = victim;
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false);

                    // Deep water drowning
                    if (pushCell.terrain === 'deep_water') {
                        setTimeout(() => {
                            if (victim.name === 'Boulder') {
                                assets.playSound('drown');
                                pushCell.terrain = 'shallow_water';
                                victim.isGone = true;
                                pushCell.unit = null;
                            } else {
                                victim.isDrowning = true;
                                assets.playSound('drown');
                            }
                        }, 250);
                    } else {
                        assets.playSound('bash', 0.5);
                    }
                }
            } else {
                // Edge of map: The push is blocked by an invisible wall.
                // No damage, no displacement. The unit just shakes in place.
                victim.action = 'hit';
                assets.playSound('collision', 0.5); // Quieter collision sound
            }
        } else {
            victim.action = 'hit';
        }
    }

    resetTurn() {
        if (this.turn !== 'player' || this.isProcessingTurn) return;
        if (this.history.length === 0) return;

        // Reset to the very first state in history (start of turn)
        const startState = this.history[0];
        this.restoreState(startState);
        
        // Keep only the start state in history
        this.history = [startState];
        assets.playSound('ui_click', 0.5);
    }

    getLevelFromXP(xp) {
        if (xp < 20) return 1;
        // Formula: TotalXP(L) = 5L^2 + 5L - 10
        // Solving for L: L = (-5 + sqrt(225 + 20*XP)) / 10
        return Math.floor((-5 + Math.sqrt(225 + 20 * xp)) / 10);
    }

    getMaxHpForLevel(level, baseHp = 4) {
        // Bonus: floor(6 * (level - 1) / (level + 5))
        // Max bonus is 6 (at level=inf), so 4 + 6 = 10.
        const bonus = Math.floor(6 * (level - 1) / (level + 5));
        return Math.min(10, baseHp + bonus);
    }

    cheatWin() {
        if (this.isGameOver || this.isVictoryDialogueActive) return;
        
        // Advance to flag if not already there for Qingzhou
        if (this.battleId === 'qingzhou_siege' && !this.reachedFlag) {
            this.reachedFlag = true;
            this.ambushTriggered = true;
            this.triggerAmbush();
        }

        // Kill all enemies
        this.units.forEach(u => {
            if (u.faction === 'enemy' && u.hp > 0) {
                u.hp = 0;
                this.applyUnitDamage(u, 999); // Use official damage system
            }
        });

        // Let checkWinLoss handle the transition on the next frame
    }

    findNearestFreeCell(r, q, maxDist = 5) {
        const startCell = this.tacticsMap.getCell(r, q);
        if (startCell && !startCell.unit && !startCell.impassable) {
            return startCell;
        }

        const queue = [{ r, q, d: 0 }];
        const visited = new Set([`${r},${q}`]);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.d < maxDist) {
                const neighbors = this.tacticsMap.getNeighbors(current.r, current.q);
                for (const n of neighbors) {
                    const key = `${n.r},${n.q}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        if (!n.unit && !n.impassable) {
                            return n;
                        }
                        queue.push({ r: n.r, q: n.q, d: current.d + 1 });
                    }
                }
            }
        }
        return null;
    }

    getXPForLevel(level) {
        if (level <= 1) return 0;
        return 5 * level * (level + 1) - 10;
    }

    placeInitialUnits(specifiedUnits) {
        this.units = [];
        let unitsToPlace = specifiedUnits;

        if (!unitsToPlace) {
            const battleDef = BATTLES[this.battleId];
            if (battleDef && battleDef.units) {
                unitsToPlace = battleDef.units.map(uDef => {
                    const typeTemplates = UNIT_TEMPLATES[uDef.type];
                    if (!typeTemplates) {
                        console.warn(`No templates found for type: ${uDef.type}`);
                        return null;
                    }
                    
                    const baseId = uDef.id.replace(/\d+$/, ''); // Strip trailing digits (e.g., ally1 -> ally)
                    const template = typeTemplates[uDef.id] || typeTemplates[uDef.id.split('_')[0]] || typeTemplates[baseId];
                    
                    if (!template) {
                        console.warn(`No template found for unit: ${uDef.id} (type: ${uDef.type}, baseId: ${baseId})`);
                        return null;
                    }
                    return {
                        ...template,
                        id: uDef.id,
                        r: uDef.r,
                        q: uDef.q,
                        isDead: uDef.isDead || false  // Preserve isDead flag for corpses
                    };
                }).filter(u => u !== null);
            } else if (this.battleId === 'custom') {
                const enemyType = this.mapGenParams.enemyType || 'yellowturban';
                const enemyCount = this.mapGenParams.enemyCount || 6;

                unitsToPlace = [
                    { id: 'liubei', name: 'Liu Bei', imgKey: 'liubei', r: 2, q: 4, moveRange: 4, hp: 4, faction: 'player', attacks: ['double_blades'] },
                    { id: 'guanyu', name: 'Guan Yu', imgKey: 'guanyu', r: 3, q: 3, moveRange: 5, hp: 4, faction: 'player', attacks: ['green_dragon_slash'] },
                    { id: 'zhangfei', name: 'Zhang Fei', imgKey: 'zhangfei', r: 3, q: 5, moveRange: 4, hp: 4, faction: 'player', attacks: ['serpent_spear'] },
                    { id: 'ally1', name: 'Volunteer', imgKey: 'soldier', r: 1, q: 3, moveRange: 3, hp: 3, faction: 'allied', attacks: ['bash'] },
                    { id: 'ally2', name: 'Volunteer', imgKey: 'soldier', r: 1, q: 4, moveRange: 3, hp: 3, faction: 'allied', attacks: ['bash'] },
                    { id: 'ally3', name: 'Volunteer', imgKey: 'soldier', r: 1, q: 5, moveRange: 3, hp: 3, faction: 'allied', attacks: ['bash'] }
                ];

                for (let i = 0; i < enemyCount; i++) {
                    let type = enemyType;
                    if (type === 'random_mix') type = Math.random() < 0.5 ? 'yellowturban' : 'archer';
                    
                    const r = 7 + Math.floor(i / 3);
                    const q = 2 + (i % 5);
                    
                    unitsToPlace.push({
                        id: `custom_rebel_${i}`,
                        name: type === 'archer' ? 'Archer' : 'Yellow Turban',
                        imgKey: type === 'archer' ? 'archer' : 'yellowturban',
                        r: r, q: q,
                        moveRange: 3,
                        hp: type === 'archer' ? 2 : 3,
                        faction: 'enemy',
                        attacks: type === 'archer' ? ['arrow_shot'] : ['bash']
                    });
                }
            } else {
                // Default fallback
                unitsToPlace = [
                    { id: 'liubei', name: 'Liu Bei', imgKey: 'liubei', r: 2, q: 4, moveRange: 4, hp: 4, faction: 'player', attacks: ['double_blades'] },
                    { id: 'guanyu', name: 'Guan Yu', imgKey: 'guanyu', r: 3, q: 3, moveRange: 5, hp: 4, faction: 'player', attacks: ['green_dragon_slash'] },
                    { id: 'zhangfei', name: 'Zhang Fei', imgKey: 'zhangfei', r: 3, q: 5, moveRange: 4, hp: 4, faction: 'player', attacks: ['serpent_spear'] },
                    { id: 'rebel1', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 4, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel2', name: 'Yellow Turban', imgKey: 'yellowturban', r: 8, q: 5, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] }
                ];
            }
        }

        if (unitsToPlace) {
            const gs = this.manager.gameState;
            const unitXP = gs.get('unitXP') || {};
            const unitClasses = gs.get('unitClasses') || {};

            unitsToPlace.forEach(u => {
                const cell = this.findNearestFreeCell(u.r, u.q, 5);
                if (!cell) {
                    console.warn(`Could not find a free spot for unit ${u.id} at (${u.r},${u.q})`);
                    return;
                }

                const finalR = cell.r;
                const finalQ = cell.q;

                const xp = unitXP[u.id] || 0;
                const level = this.getLevelFromXP(xp);

                // Level bonuses
                const finalMaxHp = this.getMaxHpForLevel(level, u.maxHp || u.hp || 4);

                // Check for class change (e.g. Soldier -> Archer)
                let imgKey = u.imgKey;
                let attacks = [...u.attacks];
                const unitClass = unitClasses[u.id] || (u.id.startsWith('ally') ? 'soldier' : u.id);
                
                if (unitClass === 'archer') {
                    imgKey = 'archer';
                    attacks = ['arrow_shot'];
                }

                // Apply weapon upgrades based on level
                const path = UPGRADE_PATHS[unitClass];
                if (path) {
                    Object.keys(path).forEach(lvl => {
                        if (level >= parseInt(lvl)) {
                            const upgrade = path[lvl];
                            if (upgrade.attack) {
                                // Replace the primary attack with the upgraded version
                                attacks[0] = upgrade.attack;
                            }
                        }
                    });
                }

                const unit = new Unit(u.id, {
                    ...u,
                    imgKey: imgKey,
                    r: finalR,
                    q: finalQ,
                    level: level,
                    hp: u.isDead ? 0 : finalMaxHp, // Support pre-killed units for scenes
                    maxHp: finalMaxHp,
                    attacks: attacks,
                    img: assets.getImage(imgKey),
                    action: u.isDead ? 'death' : 'standby',
                    currentAnimAction: u.isDead ? 'death' : 'standby',
                    frame: u.isDead ? 100 : 0 // Ensure it's at the end of death anim
                });
                
                if (u.isDead) unit.isGone = false; // We want corpses to stay visible
                
                this.units.push(unit);
                cell.unit = unit;
            });
        }
    }

    getPixelPos(r, q) {
        const xOffset = (Math.abs(r) % 2 === 1) ? this.manager.config.horizontalSpacing / 2 : 0;
        return {
            x: this.startX + q * this.manager.config.horizontalSpacing + xOffset,
            y: this.startY + r * this.manager.config.verticalSpacing - (this.tacticsMap.getCell(r, q)?.elevation || 0)
        };
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
            this.lastTime = timestamp;

        if (this.isIntroAnimating) {
            this.introTimer += dt;
            // End animation when the last hex is likely done
            const maxDelay = (this.manager.config.mapHeight * 80) + (this.manager.config.mapWidth * 40);
            if (this.introTimer > maxDelay + 1000) {
                this.isIntroAnimating = false;
            }
        }

        if (this.isGameOver) {
            this.gameOverTimer -= dt;
            if (this.gameOverTimer <= 0) {
                this.manager.switchTo('summary', this.finalStats);
                return;
            }
        }

        this.animationFrame = Math.floor(timestamp / 150) % 4;
        
        if (this.isIntroDialogueActive || this.activeDialogue || this.isVictoryDialogueActive || this.isCleanupDialogueActive || this.isCutscene) {
            this.dialogueElapsed = (this.dialogueElapsed || 0) + dt;
            
            // Auto-clear activeDialogue after its timer expires
            if (this.activeDialogue && this.activeDialogue.timer !== undefined) {
                this.activeDialogue.timer -= dt;
                if (this.activeDialogue.timer <= 0) {
                    if (this.activeDialogue.unit) {
                        this.activeDialogue.unit.dialogue = "";
                        this.activeDialogue.unit.voiceId = null;
                    }
                    this.activeDialogue = null;
                    this.dialogueElapsed = 0;
                }
            }
        } else {
            this.dialogueElapsed = 0;
        }
        
        this.units.forEach(u => {
            // Update footprints
            const currentCell = this.tacticsMap.getCell(u.r, u.q);
            if (currentCell && currentCell.terrain === 'snow_01') {
                currentCell.terrain = 'snow_footprints_01';
            }

            // Only animate player units that haven't acted, or units currently moving
            const isPlayerActive = (this.turn === 'player' && u.faction === 'player' && !u.hasActed);
            const isEnemyActive = (this.turn === 'enemy' && u.faction === 'enemy');
            const shouldAnimate = isPlayerActive || isEnemyActive;
            
            // Get current terrain for footstep sounds
            const cell = this.tacticsMap.getCell(u.r, u.q);
            const terrainType = cell ? cell.terrain : 'grass_01';
            
            u.update(dt, (r, q) => this.getPixelPos(r, q), shouldAnimate, terrainType);
        });

        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.timer -= dt;
            dn.y -= dt * 0.02; // Slow float up
            if (dn.timer <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.progress += dt / p.duration;
            if (p.progress >= 1) {
                p.progress = 1;
                if (p.onComplete) p.onComplete();
                this.projectiles.splice(i, 1);
            }
        }

        // --- UPDATE HOVERED CELL (Must match handleInput selection logic) ---
        const hx = this.manager.logicalMouseX;
        const hy = this.manager.logicalMouseY;
        
        let hoveredUnit = null;
        const activeUnits = this.units.filter(u => u.hp > 0 && !u.isGone);
        // Match draw order (bottom-to-top) for picking
        activeUnits.sort((a, b) => b.currentSortR - a.currentSortR);
        
        for (let u of activeUnits) {
            const ux = u.visualX;
            const uy = u.visualY;
            let sinkOffset = 0;
            if (u.isDrowning) sinkOffset = Math.min(1, u.drownTimer / 2000) * 40;
            else {
                const cell = this.tacticsMap.getCell(u.r, u.q);
                if (cell && cell.terrain.includes('water_shallow')) sinkOffset = 4;
                
                // Standing on corpse? Raise hit box by 4px
                if (u.hp > 0 && !u.isMoving && !u.pushData) {
                    const hasCorpse = this.units.some(other => other !== u && other.r === u.r && other.q === u.q && other.hp <= 0 && !other.isGone);
                    if (hasCorpse) sinkOffset -= 4;
                }
            }
            if (this.checkCharacterHit(u.img, u.currentAnimAction || u.action, u.frame, ux, uy, hx, hy, { 
                flip: u.flip, 
                sinkOffset,
                isProp: u.name === 'Boulder'
            })) {
                hoveredUnit = u;
                break;
            }
        }

        const rawHoveredCell = this.getCellAt(hx, hy);
        
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.selectedAttack) {
            // When targeting an attack, prioritize unit sprite IF it's in range
            if (hoveredUnit && this.attackTiles.has(`${hoveredUnit.r},${hoveredUnit.q}`)) {
                this.hoveredCell = this.tacticsMap.getCell(hoveredUnit.r, hoveredUnit.q);
            } else {
                this.hoveredCell = rawHoveredCell;
            }
        } else {
            // Standard selection hover
            this.hoveredCell = hoveredUnit ? this.tacticsMap.getCell(hoveredUnit.r, hoveredUnit.q) : rawHoveredCell;
        }

        this.updateWeather(dt);
        this.checkWinLoss();
    }

    updateWeather(dt) {
        if (!this.weatherType) {
            this.particles = [];
            return;
        }

        const { config, canvas } = this.manager;
        
        // 1. Spawn new particles (Slower spawn rates)
        const spawnRate = this.weatherType === 'rain' ? 0.15 : 0.03; // Much slower
        const spawnCount = Math.floor(dt * spawnRate + Math.random());
        for (let i = 0; i < spawnCount; i++) {
            const r = Math.floor(Math.random() * config.mapHeight);
            const q = Math.floor(Math.random() * config.mapWidth);
            const pos = this.getPixelPos(r, q);
            
            if (this.weatherType === 'rain') {
                this.particles.push({
                    type: 'rain',
                    x: pos.x + (Math.random() - 0.5) * 20 - 30, // Start left for diagonal fall
                    y: pos.y - 200,
                    targetY: pos.y,
                    r: r + 0.5,
                    vx: 0.1,  // Slower diagonal
                    vy: 0.4,  // Slower fall
                    life: 1,
                    alpha: 0.4 + Math.random() * 0.3
                });
            } else {
                this.particles.push({
                    type: 'snow',
                    x: pos.x + (Math.random() - 0.5) * 40,
                    y: pos.y - 200,
                    targetY: pos.y,
                    r: r + 0.5,
                    vx: (Math.random() - 0.5) * 0.02,
                    vy: 0.02 + Math.random() * 0.02, // Much slower fall
                    life: 1,
                    alpha: 0.6 + Math.random() * 0.4,
                    driftTimer: Math.random() * Math.PI * 2
                });
            }
        }

        // 2. Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.life > 0) {
                if (p.type === 'snow') {
                    p.driftTimer += dt * 0.001; // Slower drift
                    p.x += Math.sin(p.driftTimer) * 0.1;
                }
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                if (p.y >= p.targetY) {
                    p.y = p.targetY;
                    p.life = 0;
                    if (p.type === 'snow') p.life = -500;
                }
            } else {
                p.life -= dt;
                if (p.type === 'rain') {
                    if (p.life < -100) this.particles.splice(i, 1);
                } else {
                    if (p.life < -2000) this.particles.splice(i, 1);
                }
            }
        }
    }

    getCellAt(x, y) {
        const { config } = this.manager;
        if (this.startX === undefined) return null;

        let minDist = 18;
        let found = null;

        for (let r = 0; r < config.mapHeight; r++) {
            const xOffset = (Math.abs(r) % 2 === 1) ? config.horizontalSpacing / 2 : 0;
            for (let q = 0; q < config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                const hx = this.startX + q * config.horizontalSpacing + xOffset;
                const hy = this.startY + r * config.verticalSpacing - (cell.elevation || 0);
                const dist = Math.sqrt((x - hx)**2 + (y - hy)**2);
                if (dist < minDist) {
                    minDist = dist;
                    found = cell;
                }
            }
        }
        return found;
    }

    getAffectedTiles(attacker, attackKey, targetR, targetQ) {
        const affected = [];
        const dist = this.tacticsMap.getDistance(attacker.r, attacker.q, targetR, targetQ);
        const attack = ATTACKS[attackKey];

        if (attackKey.startsWith('serpent_spear')) {
            // Hits the target hex and all intermediate hexes in a line
            affected.push({ r: targetR, q: targetQ });
            
            // Check for intermediate hexes
            for (let d = 1; d < dist; d++) {
                const intermediate = this.getIntermediateHex(attacker.r, attacker.q, targetR, targetQ, d);
                if (intermediate) {
                    affected.push(intermediate);
                }
            }
        } else if (attackKey.startsWith('green_dragon_slash')) {
            // Hits target and its neighbors that are at the same distance from attacker
            // This creates a consistent 3-tile arc at any range (1 or 2).
            affected.push({ r: targetR, q: targetQ });
            const neighbors = this.tacticsMap.getNeighbors(targetR, targetQ);
            neighbors.forEach(n => {
                const d = this.tacticsMap.getDistance(attacker.r, attacker.q, n.r, n.q);
                if (d === dist) {
                    affected.push({ r: n.r, q: n.q });
                }
            });
        } else if (attackKey === 'double_blades') {
            affected.push({ r: targetR, q: targetQ });
            const dirIndex = this.tacticsMap.getDirectionIndex(attacker.r, attacker.q, targetR, targetQ);
            if (dirIndex !== -1) {
                const oppositeDir = (dirIndex + 3) % 6;
                const backCell = this.tacticsMap.getNeighborInDirection(attacker.r, attacker.q, oppositeDir);
                if (backCell) affected.push({ r: backCell.r, q: backCell.q });
            }
        } else {
            affected.push({ r: targetR, q: targetQ });
        }
        return affected;
    }

    getIntermediateHex(r1, q1, r2, q2, step) {
        const from = this.tacticsMap.offsetToCube(r1, q1);
        const to = this.tacticsMap.offsetToCube(r2, q2);
        const dist = this.tacticsMap.getDistance(r1, q1, r2, q2);
        if (dist === 0) return null;

        const t = step / dist;
        const q = from.x + (to.x - from.x) * t;
        const r = from.z + (to.z - from.z) * t;
        const s = -q - r;

        // Round cube coordinates
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const q_diff = Math.abs(rq - q);
        const r_diff = Math.abs(rr - r);
        const s_diff = Math.abs(rs - s);

        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }

        // Convert back to offset
        const finalR = rr;
        const finalQ = rq + Math.floor(rr / 2);
        return { r: finalR, q: finalQ };
    }

    getIntroEffect(r, q) {
        if (!this.isIntroAnimating) return { yOffset: 0, alpha: 1 };

        const delay = (this.manager.config.mapHeight - r) * 80 + q * 40;
        const duration = 600;
        const t = Math.max(0, Math.min(1, (this.introTimer - delay) / duration));
        
        if (t <= 0) return { yOffset: 100, alpha: 0 };
        if (t >= 1) return { yOffset: 0, alpha: 1 };

        // Overshoot ease: p starts at 0, goes to ~1.2, then settles to 1
        const p = t;
        const overshoot = 1.70158;
        const f = 1 + (overshoot + 1) * Math.pow(p - 1, 3) + overshoot * Math.pow(p - 1, 2);
        
        return {
            yOffset: (1 - f) * 100,
            alpha: Math.min(1, t * 3)
        };
    }

    allUnitsActed() {
        return this.units.filter(u => u.faction === 'player' && u.hp > 0 && !u.isGone).every(u => u.hasActed);
    }

    render(timestamp) {
        const { ctx, canvas, config } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        this.startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        this.startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        const drawCalls = [];

        // Determine which units are being targeted by telegraphed attacks
        const targetedUnits = new Set();
        this.units.forEach(u => {
            if (u.hp > 0 && u.intent && u.intent.type === 'attack') {
                const targetCell = this.getIntentTargetCell(u);
                
                if (targetCell) {
                    const affected = this.getAffectedTiles(u, u.intent.attackKey, targetCell.r, targetCell.q);
                    affected.forEach(t => {
                        const cell = this.tacticsMap.getCell(t.r, t.q);
                        if (cell && cell.unit) targetedUnits.add(cell.unit);
                    });
                }
            }
        });

        // Determine which tiles are currently being "previewed" for damage
        const affectedTiles = new Map();
        if (this.selectedUnit && this.selectedAttack && this.hoveredCell && this.attackTiles.has(`${this.hoveredCell.r},${this.hoveredCell.q}`)) {
            const tiles = this.getAffectedTiles(this.selectedUnit, this.selectedAttack, this.hoveredCell.r, this.hoveredCell.q);
            tiles.forEach(t => affectedTiles.set(`${t.r},${t.q}`, true));
        }

        // 1. Collect hexes
        for (let r = 0; r < config.mapHeight; r++) {
            const xOffset = (Math.abs(r) % 2 === 1) ? config.horizontalSpacing / 2 : 0;
            for (let q = 0; q < config.mapWidth; q++) {
                const x = this.startX + q * config.horizontalSpacing + xOffset;
                const y = this.startY + r * config.verticalSpacing;
                const cell = this.tacticsMap.getCell(r, q);
                
                drawCalls.push({
                    type: 'hex',
                    r, q, x, y, priority: 0,
                    terrain: cell.terrain,
                    layer: this.getTerrainLayer(cell.terrain),
                    elevation: cell.elevation || 0,
                    isReachable: this.reachableTiles.has(`${r},${q}`),
                    isAttackRange: this.attackTiles.has(`${r},${q}`),
                    isAffected: affectedTiles.has(`${r},${q}`),
                    isHovered: this.hoveredCell === cell
                });
            }
        }

        // 2. Collect units (using their fractional sort row for depth)
        // Include dead units so their death animation/corpse is visible
        this.units.forEach(u => {
            if (u.isGone) return;
            const pos = this.getPixelPos(u.r, u.q); // for stationary reference
                    drawCalls.push({
                        type: 'unit',
                r: u.currentSortR,
                q: u.q,
                priority: 1,
                unit: u,
                x: pos.x,
                y: pos.y
            });
        });

        // 2b. Flag
        if (this.flagPos) {
            const pos = this.getPixelPos(this.flagPos.r, this.flagPos.q);
            drawCalls.push({
                type: 'flag',
                r: this.flagPos.r,
                q: this.flagPos.q,
                priority: 0.5,
                x: pos.x,
                y: pos.y
            });
        }

        // 3. Collect particles
        this.particles.forEach(p => {
            const { alpha } = this.getIntroEffect(Math.floor(p.r), 0);
            if (alpha <= 0) return;
            
            drawCalls.push({
                type: 'particle',
                r: p.r,
                particle: p,
                alpha: p.alpha * alpha
            });
        });

        // 4. Sort by row, then by priority (hex < particle < unit)
        drawCalls.sort((a, b) => {
            const depthA = a.type === 'unit' ? Math.ceil(a.r) : a.r;
            const depthB = b.type === 'unit' ? Math.ceil(b.r) : b.r;

            if (depthA !== depthB) return depthA - depthB;
            
            // Priority within same depth
            const priorities = { 'hex': 0, 'particle': 1, 'unit': 2, 'flag': 1.5 };
            if (priorities[a.type] !== priorities[b.type]) return priorities[a.type] - priorities[b.type];
            
            // Within same type and row:
            if (a.type === 'unit' && b.type === 'unit') {
                // Living units on top of dead ones
                const isDeadA = a.unit.hp <= 0;
                const isDeadB = b.unit.hp <= 0;
                if (isDeadA !== isDeadB) return isDeadA ? -1 : 1;
            }

            if (a.type === 'hex' && b.type === 'hex') {
                // Use terrain layer to determine overlap (e.g. grass over sand, trees over grass)
                if (a.layer !== b.layer) return a.layer - b.layer;
            }
            
            return a.r - b.r;
        });

        for (const call of drawCalls) {
            const effect = this.getIntroEffect(Math.floor(call.r), call.q || 0);
            if (effect.alpha <= 0 && call.type !== 'particle') continue; // Particles have their own alpha check
            
            ctx.save();
            ctx.globalAlpha = call.alpha || effect.alpha;

            if (call.type === 'hex') {
                const surfaceY = call.y - call.elevation + effect.yOffset;
                const edgeStatus = this.tacticsMap.getEdgeStatus(call.r, call.q);
                this.drawTile(call.terrain, call.x, surfaceY, call.elevation, call.r, call.q, edgeStatus);
                
                if (call.isReachable) {
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 215, 0, 0.3)');
                }
                
                if (call.isAffected) {
                    // Impact preview (Red)
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 0, 0, 0.5)');
                } else if (call.isAttackRange) {
                    // Possible targets (Subtle)
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 0, 0, 0.15)');
                } else if (call.isHovered) {
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 255, 255, 0.2)');
                }
            } else if (call.type === 'unit') {
                const u = call.unit;
                const cell = this.tacticsMap.getCell(u.r, u.q);
                let surfaceY = u.visualY + effect.yOffset; 
                
                let drawOptions = { 
                    flip: u.flip,
                    isProp: u.name === 'Boulder'
                };

                // Raise living units if they are standing on a corpse
                if (u.hp > 0 && !u.isMoving && !u.pushData) {
                    const hasCorpse = this.units.some(other => other !== u && other.r === u.r && other.q === u.q && other.hp <= 0 && !other.isGone);
                    if (hasCorpse) {
                        surfaceY -= 4; // Standing on top of the body
                    }
                }
                
                // Check for water effects
                if (u.isDrowning) {
                    // Drowning: sink down over 2 seconds
                    const drownProgress = Math.min(1, u.drownTimer / 2000);
                    drawOptions.sinkOffset = drownProgress * 40; 
                    drawOptions.isSubmerged = true;
                } else if (cell && cell.terrain.includes('water_shallow')) {
                    // Wading: exactly 4px deep into the hex
                    drawOptions.sinkOffset = 4;
                    drawOptions.isSubmerged = true;
                } else if (cell && cell.terrain.includes('snow')) {
                    // Snow: sink 2px. 
                    // hideBottom is now relative to the absolute bottom of the 72x72 sprite box.
                    // Since there are ~28px of space below the anchor, we need a higher value 
                    // to clip the actual feet (e.g., 28 + 2 = 30).
                    drawOptions.sinkOffset = 2;
                    drawOptions.hideBottom = 27;
                }

                if (targetedUnits.has(u)) {
                    drawOptions.tint = 'rgba(255, 0, 0, 0.3)';
                }

                const isSelected = this.selectedUnit === u;
                if (isSelected) {
                    this.drawHighlight(ctx, u.visualX, surfaceY, 'rgba(255, 255, 255, 0.4)');
                }

                this.drawCharacter(ctx, u.img, u.currentAnimAction || u.action, u.frame, u.visualX + u.visualOffsetX, surfaceY + u.visualOffsetY, drawOptions);
            } else if (call.type === 'flag') {
                const img = assets.getImage('flag_01');
                if (img) {
                    this.drawFlag(ctx, img, call.x, call.y + effect.yOffset, timestamp);
                }
            } else if (call.type === 'particle') {
                const p = call.particle;
                const px = Math.floor(p.x);
                const py = Math.floor(p.y);

                if (p.type === 'rain') {
                    if (p.life > 0) {
                        // Falling streak: strictly 1px wide, pixel-aligned
                        ctx.fillStyle = '#add8e6';
                        // Draw a tiny 1x3 diagonal-ish streak using small rects to avoid AA
                        ctx.fillRect(px, py, 1, 3);
                        ctx.fillRect(px - 1, py - 3, 1, 3);
                    } else {
                        // Splash: simple pixel dots instead of arc
                        ctx.fillStyle = '#add8e6';
                        const stage = Math.floor((p.life / -100) * 3);
                        if (stage === 0) {
                            ctx.fillRect(px - 1, py, 3, 1);
                        } else if (stage === 1) {
                            ctx.fillRect(px - 2, py - 1, 1, 1);
                            ctx.fillRect(px + 2, py - 1, 1, 1);
                        }
                    }
                } else {
                    // Snow: simple pixel squares
                    const size = p.life > 0 ? 1 : 1;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(px, py, size, size);
                }
            }
            ctx.restore();
        }

        // 3. Info Pass: Draw health bars and intents above all terrain
        if (!this.isIntroAnimating) {
            this.units.forEach(u => {
                if (u.hp <= 0) return;
                
                const surfaceY = u.visualY; 
                
                // Draw intent if enemy or ally
                if (u.intent) {
                    this.drawIntent(ctx, u, u.visualX, surfaceY);
                }

                // Draw HP bar (not for dead units, boulders, or drowning units)
                if (u.hp > 0 && u.name !== 'Boulder' && (!u.isDrowning || u.drownTimer < 500)) {
                    this.drawHpBar(ctx, u, u.visualX, surfaceY);
                }
            });
        }

        this.drawUI();

        // 4. Final Pass: Draw UX elements (like push arrows) above everything
        if (!this.isIntroAnimating) {
            this.units.forEach(u => {
                if (u.hp > 0 && u.faction === 'enemy' && u.intent && u.intent.type === 'attack') {
                    const attack = ATTACKS[u.intent.attackKey];
                    if (attack && attack.push) {
                        const targetCell = this.getIntentTargetCell(u);
                        
                        // Only show arrow if there's a unit to be pushed
                        if (targetCell && targetCell.unit) {
                            const dirIndex = this.tacticsMap.getDirectionIndex(u.r, u.q, targetCell.r, targetCell.q);
                            if (dirIndex !== -1) {
                                this.drawPushArrow(ctx, targetCell.r, targetCell.q, dirIndex);
                            }
                        }
                    }
                }
            });
        }

        if (this.selectedAttack && this.hoveredCell && this.attackTiles.has(`${this.hoveredCell.r},${this.hoveredCell.q}`)) {
            const attack = ATTACKS[this.selectedAttack];
            if (attack && attack.push && this.selectedUnit) {
                if (this.selectedAttack === 'double_blades') {
                    // Double Blades: Show both push arrows
                    const dirIndex = this.tacticsMap.getDirectionIndex(this.selectedUnit.r, this.selectedUnit.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        // Front target
                        if (this.hoveredCell.unit) {
                            this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                        }
                        // Back target
                        const oppositeDir = (dirIndex + 3) % 6;
                        const backCell = this.tacticsMap.getNeighborInDirection(this.selectedUnit.r, this.selectedUnit.q, oppositeDir);
                        if (backCell && backCell.unit) {
                            this.drawPushArrow(ctx, backCell.r, backCell.q, oppositeDir);
                        }
                    }
                } else if (this.selectedAttack === 'serpent_spear') {
                    // Serpent Spear: Push the further target
                    const dirIndex = this.tacticsMap.getDirectionIndex(this.selectedUnit.r, this.selectedUnit.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        // Only show arrow if the hovered cell actually contains a unit
                        if (this.hoveredCell.unit) {
                            this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                        }
                    }
                } else {
                    const dirIndex = this.tacticsMap.getDirectionIndex(this.selectedUnit.r, this.selectedUnit.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1 && this.hoveredCell.unit) {
                        this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                    }
                }
            }
        }

        if ((this.isIntroDialogueActive && this.introScript) || (this.isVictoryDialogueActive && this.victoryScript)) {
            const script = this.isIntroDialogueActive ? this.introScript : this.victoryScript;
            const step = script[this.dialogueStep];
            if (step) {
                // Play voice if it hasn't been played for this step yet
                if (step.voiceId && !step._voicePlayed) {
                    assets.playVoice(step.voiceId);
                    step._voicePlayed = true;
                }
                this.renderDialogueBox(ctx, canvas, {
                    portraitKey: step.portraitKey,
                    name: step.name,
                    text: step.text
                }, { subStep: this.subStep || 0 });
            }
        }

        // Cleanup dialogue (qingzhou_cleanup cutscene)
        if (this.isCleanupDialogueActive && this.cleanupDialogueScript) {
            const step = this.cleanupDialogueScript[this.cleanupDialogueStep];
            if (step) {
                const portraitMap = {
                    'liubei': 'liu-bei',
                    'guanyu': 'guan-yu',
                    'zhangfei': 'zhang-fei',
                    'gongjing': 'custom-male-17'  // Older official portrait for Imperial Protector
                };
                this.renderDialogueBox(ctx, canvas, {
                    portraitKey: portraitMap[step.speaker] || step.speaker,
                    name: step.name,
                    text: step.text
                }, { subStep: this.subStep || 0 });
            }
        }

        // Draw Attack Order Numbers (Toggleable)
        if (this.showAttackOrder && !this.isIntroAnimating && !this.isProcessingTurn) {
            this.units.forEach(u => {
                if (u.hp > 0 && u.attackOrder && !u.isGone) {
                    const ux = u.visualX;
                    const uy = u.visualY;
                    let surfaceY = uy;
                    const cell = this.tacticsMap.getCell(u.r, u.q);
                    if (cell && cell.terrain.includes('water_shallow')) surfaceY += 4;
                    if (u.isDrowning) surfaceY += Math.min(1, u.drownTimer / 2000) * 40;

                    const color = (u.faction === 'enemy') ? '#f44' : '#4f4';
                    this.drawPixelText(ctx, u.attackOrder.toString(), ux, surfaceY - 25, {
                        color,
                        font: '10px Silkscreen',
                        align: 'center',
                        outline: true
                    });
                }
            });
        }

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const text = this.won ? "VICTORY!" : "DEFEAT...";
            const color = this.won ? "#ffd700" : "#ff4444";
            this.drawPixelText(ctx, text, canvas.width / 2, canvas.height / 2 - 10, { color, font: '16px Silkscreen', align: 'center' });
            
            if (this.battleId === 'daxing' && this.won) {
                this.drawPixelText(ctx, "The Yellow Turbans scatter!", canvas.width / 2, canvas.height / 2 + 15, { color: '#aaa', font: '8px Tiny5', align: 'center' });
            }
        }
    }

    drawHpBar(ctx, unit, x, y) {
        const segmentW = 3; // 3 pixels per HP point
        const gap = 1;      // 1 pixel gap between segments
        const totalW = unit.maxHp * segmentW + (unit.maxHp - 1) * gap;
        const bx = Math.floor(x - totalW / 2);
        const by = Math.floor(y + 8); // Positioned slightly below the feet

        for (let i = 0; i < unit.maxHp; i++) {
            const lx = bx + i * (segmentW + gap);
            if (i < unit.hp) {
                // Filled segment
                ctx.fillStyle = unit.faction === 'enemy' ? '#f00' : '#0f0';
            } else {
                // Empty segment (darker, semi-transparent)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            }
            ctx.fillRect(lx, by, segmentW, 1);
        }
    }

    drawIntent(ctx, unit, x, y) {
        if (!unit.intent) return;
        
        const targetCell = this.getIntentTargetCell(unit);
        
        if (!targetCell) return;

        // Target pixel position
        const targetPos = this.getPixelPos(targetCell.r, targetCell.q);
        
        // Attacker pixel position (current visual pos)
        const startX = unit.visualX;
        const startY = unit.visualY;

        // Is this unit currently selected?
        const isSelected = this.selectedUnit === unit;
        const glow = isSelected ? Math.abs(Math.sin(Date.now() / 200)) * 0.4 : 0;

        ctx.save();
        
        // Draw telegraphed attack arrow (Red, semi-transparent)
        const dx = targetPos.x - startX;
        const dy = targetPos.y - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Start arrow slightly away from attacker center
        const offset = 10;
        const sx = startX + (dx / dist) * offset;
        const sy = startY + (dy / dist) * offset;
        
        // End arrow slightly before target center
        const ex = targetPos.x - (dx / dist) * 5;
        const ey = targetPos.y - (dy / dist) * 5;

        ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 + glow})`;
        ctx.fillStyle = `rgba(255, 0, 0, ${0.6 + glow})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]); // Dashed line for intent
        
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    drawHighlight(ctx, x, y, color) {
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.fillStyle = color;
        ctx.beginPath();
        // Pointy-top hex shape to match the pixel-art footprint
        ctx.moveTo(0, -12);   // Top tip
        ctx.lineTo(12, -6);   // Top-right
        ctx.lineTo(12, 6);    // Bottom-right
        ctx.lineTo(0, 12);    // Bottom tip
        ctx.lineTo(-12, 6);   // Bottom-left
        ctx.lineTo(-12, -6);  // Top-left
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawPushArrow(ctx, fromR, fromQ, dirIndex) {
        const fromPos = this.getPixelPos(fromR, fromQ);
        const directions = this.tacticsMap.getDirections(fromR);
        const d = directions[dirIndex];
        
        const targetR = fromR + d.dr;
        const targetQ = fromQ + d.dq;
        
        const xOffset = (Math.abs(targetR) % 2 === 1) ? this.manager.config.horizontalSpacing / 2 : 0;
        const targetPos = {
            x: this.startX + targetQ * this.manager.config.horizontalSpacing + xOffset,
            y: this.startY + targetR * this.manager.config.verticalSpacing - (this.tacticsMap.getCell(targetR, targetQ)?.elevation || 0)
        };
        
        const dx = targetPos.x - fromPos.x;
        const dy = targetPos.y - fromPos.y;
        
        ctx.save();
        // Snap to pixels
        const sx = Math.floor(fromPos.x);
        const sy = Math.floor(fromPos.y);
        const ex = Math.floor(fromPos.x + dx * 0.5); // Shortened arrow
        const ey = Math.floor(fromPos.y + dy * 0.5);
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 0; // No blur for pixel perfect
        ctx.shadowOffsetY = 1;
        
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 1; // Thinner
        
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        
        const angle = Math.atan2(dy, dx);
        ctx.translate(ex, ey);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, -2.5); // Smaller head
        ctx.lineTo(-4, 2.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    getAnimatedTerrain(terrainType, r = 0, q = 0) {
        // Slow 2-frame animation, staggered by hex position
        const stagger = (r * 123 + q * 456) % 2000;
        const frame = (Math.floor((Date.now() + stagger) / 2000) % 2) + 1; // 2000ms per frame
        
        if (terrainType === 'water_shallow_01' || terrainType === 'water_shallow_02') {
            return `water_shallow_0${frame}`;
        }
        
        if (terrainType.startsWith('water_deep_01')) {
            return `water_deep_01_0${frame}`;
        }
        
        if (terrainType.startsWith('water_deep_02')) {
            return `water_deep_02_0${frame}`;
        }
        
        return terrainType;
    }

    getTerrainLayer(terrainType) {
        if (!terrainType) return 0;
        
        // Layer 5: Tall/3D objects
        if (terrainType.includes('forest') || 
            terrainType.includes('jungle') || 
            terrainType.includes('mountain') || 
            terrainType.includes('house') || 
            terrainType.includes('wall') ||
            terrainType.includes('tower') ||
            terrainType.includes('tent') ||
            terrainType.includes('yurt') ||
            terrainType.includes('hut')) {
            return 5;
        }
        
        // Layer 4: Snow (covers everything flat)
        if (terrainType.includes('snow')) {
            return 4;
        }

        // Layer 3: Grass (overhangs dirt/ice/sand)
        if (terrainType.includes('grass')) {
            return 3;
        }

        // Layer 2: Ice (overhangs water)
        if (terrainType.includes('ice')) {
            return 2;
        }

        // Layer 1: Basic land types (sand, mud, rocky ground)
        if (terrainType.includes('sand') || 
            terrainType.includes('mud') || 
            terrainType.includes('earth_rocky') || 
            terrainType.includes('earth_stone') ||
            terrainType.includes('earth_cracked')) {
            return 1;
        }
        
        // Layer 0: Water (lowest point)
        return 0;
    }

    drawFlag(ctx, img, x, y, timestamp) {
        if (!img) return;
        
        const poleWidth = 4; // Pole is on the left
        const waveSpeed = 0.005;
        const waveFreq = 0.2;
        const waveAmp = 2;

        const startX = Math.floor(x - poleWidth / 2);

        // Draw pole first (stationary)
        ctx.drawImage(img, 0, 0, poleWidth, img.height, startX, Math.floor(y - img.height), poleWidth, img.height);

        // Draw flag part column by column with wave
        for (let col = poleWidth; col < img.width; col++) {
            const distanceToPole = col - poleWidth;
            // Wave offset: amp increases with distance, phase shifts with time
            const offset = Math.sin(timestamp * waveSpeed + col * waveFreq) * waveAmp * (distanceToPole / (img.width - poleWidth));
            
            ctx.drawImage(img, col, 0, 1, img.height, startX + col, Math.floor(y - img.height + offset), 1, img.height);
        }
    }

    drawTile(terrainType, x, y, elevation = 0, r = 0, q = 0, edgeStatus = {}) {
        const { ctx, config } = this.manager;
        const animatedKey = this.getAnimatedTerrain(terrainType, r, q);
        const img = assets.getImage(animatedKey);
        if (!img) return;
        
        const extraDepth = config.baseDepth + elevation;
        const dx = Math.floor(x - 18);
        
        // Handle taller tiles (like houses)
        // Standard hexes are 36x36. Taller hexes are 36x72.
        // We always align the bottom 36px with the hex footprint.
        const isTall = img.height > 36;
        const dy = Math.floor(y - 18) - (isTall ? 36 : 0);
        const sourceHeight = img.height;
        
        const silhouette = img.silhouette;

        for (let ix = 0; ix < 36; ix++) {
            let edgeY = null;
            // The hex footprint logic (bottom 36px)
            const footprintStart = isTall ? 36 : 0;
            const relIx = ix;
            if (relIx >= 7 && relIx <= 17) edgeY = 25 + Math.floor((relIx - 7) * (30 - 25) / 10);
            else if (relIx >= 18 && relIx <= 28) edgeY = 30 + Math.floor((relIx - 18) * (25 - 30) / 10);

            if (edgeY !== null) {
                // Top part (above the footprint edges)
                const topPartHeight = footprintStart + edgeY;
                ctx.drawImage(img, ix, 0, 1, topPartHeight, dx + ix, dy, 1, topPartHeight);
                
                // Impassable Edge Highlighting (Black Outline)
                ctx.fillStyle = '#000000';
                if (silhouette) {
                    // Top edges (NW/NE) - follow the silhouette
                    if ((edgeStatus.NW && ix < 18) || (edgeStatus.NE && ix >= 18)) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1 && sy < topPartHeight) {
                            ctx.fillRect(dx + ix, dy + sy, 1, 2); // 2px height for visibility
                        }
                    }
                    // Bottom edges (SW/SE) - follow the footprint edge
                    if ((edgeStatus.SW && ix < 18) || (edgeStatus.SE && ix >= 18)) {
                        ctx.fillRect(dx + ix, dy + topPartHeight - 1, 1, 2);
                    }
                } else {
                    // Fallback without silhouette
                    if ((edgeStatus.NW && ix < 18) || (edgeStatus.NE && ix >= 18)) {
                        ctx.fillRect(dx + ix, dy, 1, 2);
                    }
                }

                // The vertical "side" edge
                ctx.drawImage(img, ix, topPartHeight, 1, 1, dx + ix, dy + topPartHeight, 1, extraDepth);
                
                // The bottom part of the hex "lip"
                const bottomPartHeight = sourceHeight - topPartHeight;
                ctx.drawImage(img, ix, topPartHeight, 1, bottomPartHeight, dx + ix, dy + topPartHeight + extraDepth, 1, bottomPartHeight);
            } else {
                ctx.drawImage(img, ix, 0, 1, sourceHeight, dx + ix, dy, 1, sourceHeight);

                // Handle edges for the sides of the hex (columns 0-6 and 29-35)
                ctx.fillStyle = '#000000';
                if (silhouette) {
                    if ((edgeStatus.NW || edgeStatus.W) && ix < 7) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1) ctx.fillRect(dx + ix, dy + sy, 2, 2);
                    }
                    if ((edgeStatus.NE || edgeStatus.E) && ix > 28) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1) ctx.fillRect(dx + ix, dy + sy, 2, 2);
                    }
                } else {
                    if ((edgeStatus.NW || edgeStatus.W) && ix < 7) ctx.fillRect(dx + ix, dy, 2, 2);
                    if ((edgeStatus.NE || edgeStatus.E) && ix > 28) ctx.fillRect(dx + ix, dy, 2, 2);
                }
            }
        }
    }

    drawUI() {
        if (this.isCutscene) {
            const { ctx, canvas } = this.manager;
            if (this.isIntroAnimating || this.isProcessingTurn) return;
            
            // Draw a simple prompt to click to continue
            const pulse = Math.abs(Math.sin(Date.now() * 0.003));
            this.drawPixelText(ctx, "CLICK TO CONTINUE", canvas.width / 2, canvas.height - 20, { 
                color: `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`,
                align: 'center',
                font: '10px Silkscreen'
            });
            return;
        }

        const { ctx, canvas } = this.manager;
        
        // During intro, UI is mostly hidden or faded
        let uiAlpha = 1;
        if (this.isIntroAnimating) {
            uiAlpha = Math.max(0, (this.introTimer - 800) / 400);
            if (uiAlpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = uiAlpha;
        }

        // --- BOTTOM UI BAR ---
        const barH = 40;
        const barY = canvas.height - barH;
        
        // Draw bottom bar background (semi-transparent)
        ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
        ctx.fillRect(0, barY, canvas.width, barH);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barY + 0.5);
        ctx.lineTo(canvas.width, barY + 0.5);
        ctx.stroke();

        // 1. Selection Info (Bottom Left)
        if (this.selectedUnit) {
            const u = this.selectedUnit;
            const bx = 5;
            const by = barY + 2;

            const factionColor = u.faction === 'player' ? '#0f0' : (u.faction === 'allied' ? '#0af' : '#f00');

            // Name (Color-coded)
            this.drawPixelText(ctx, u.name, bx + 4, by + 4, { color: factionColor, font: '8px Silkscreen' });
            
            // HP
            this.drawPixelText(ctx, `HP: ${u.hp}/${u.maxHp}`, bx + 4, by + 12, { color: '#eee', font: '8px Tiny5' });

            // State/Intent & Order
            let actionText = "IDLE";
            let orderText = null;
            if (u.hp > 0 && u.intent && u.intent.type === 'attack') {
                const attack = ATTACKS[u.intent.attackKey];
                const actionName = attack ? attack.name.toUpperCase() : '???';
                actionText = `INTENT: ${actionName}`;
                if (u.attackOrder) orderText = `ORDER: ${u.attackOrder}`;
            } else if (u.hasActed) {
                actionText = "DONE";
            }
            
            this.drawPixelText(ctx, actionText, bx + 4, by + 20, { color: '#aaa', font: '8px Tiny5' });
            if (orderText) {
                this.drawPixelText(ctx, orderText, bx + 4, by + 28, { color: '#888', font: '8px Tiny5' });
            }
        }

        // 2. Damage Numbers (Floating over world)
        this.damageNumbers.forEach(dn => {
            const alpha = Math.min(1, dn.timer / 300);
            ctx.save();
            ctx.globalAlpha = alpha;
            const text = (typeof dn.value === 'number') ? `-${dn.value}` : dn.value;
            this.drawPixelText(ctx, text, dn.x, dn.y, { 
                color: dn.color, 
                font: '10px Tiny5', 
                align: 'center' 
            });
            ctx.restore();
        });

        // 2b. Projectiles
        this.projectiles.forEach(p => {
            if (p.type === 'arrow') {
                const dx = p.targetX - p.startX;
                const dy = p.targetY - p.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Parabola: y = startY + progress * dy - height * sin(progress * PI)
                const arcHeight = Math.min(100, dist * 0.5);
                const x = p.startX + p.progress * dx;
                const y = p.startY + p.progress * dy - Math.sin(p.progress * Math.PI) * arcHeight;
                
                // Draw arrow as a small white line segment (1px)
                // Calculate angle for orientation
                const nextX = p.startX + (p.progress + 0.01) * dx;
                const nextY = p.startY + (p.progress + 0.01) * dy - Math.sin((p.progress + 0.01) * Math.PI) * arcHeight;
                const angle = Math.atan2(nextY - y, nextX - x);
                
                ctx.save();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4);
                ctx.stroke();
                ctx.restore();
            }
        });

        // 3. Turn Indicator (Top Left)
        let turnText = "YOUR TURN";
        let color = '#ffd700';

        if (this.turn === 'enemy_moving') {
            turnText = "ENEMY TURN";
            color = '#f00';
        } else if (this.turn === 'allied_moving') {
            turnText = "ALLY TURN";
            color = '#0af';
        } else if (this.turn === 'execution') {
            turnText = "EXECUTION";
            color = '#fff';
        }

        this.drawPixelText(ctx, turnText, 10, 8, { color, font: '8px Silkscreen' });

        // Objective Display
        if (this.battleId === 'qingzhou_siege') {
            let objectiveText = "GOAL: RETREAT TO THE FLAG";
            if (this.reachedFlag) {
                objectiveText = "GOAL: DEFEAT ALL REBELS";
            }
            this.drawPixelText(ctx, objectiveText, canvas.width / 2, 8, { 
                color: '#fff', 
                font: '8px Tiny5', 
                align: 'center' 
            });
        }

        // 4. End Turn / Reset Turn / Order / Undo (Bottom Right)
        if (this.turn === 'player' && !this.isProcessingTurn) {
            const hasActedAll = this.allUnitsActed();
            
            // Pulse effect for END TURN when all have acted
            const pulse = hasActedAll ? Math.abs(Math.sin(Date.now() / 400)) : 0;
            const btnW = hasActedAll ? 80 : 45;
            const btnH = hasActedAll ? 24 : 8;
            const rx = canvas.width - btnW - 5;
            const spacing = 1;
            
            // END TURN
            const ey = hasActedAll ? (canvas.height - btnH - 30) : (barY + 3);
            ctx.save();
            if (hasActedAll) {
                // Background shadow for the big button
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 3;
                
                // Pulsing red glow
                ctx.fillStyle = `rgba(${120 + pulse * 135}, 20, 20, 0.95)`;
            } else {
            ctx.fillStyle = 'rgba(40, 20, 20, 0.9)';
            }
            
            ctx.fillRect(rx, ey, btnW, btnH);
            ctx.strokeStyle = hasActedAll ? `rgba(255, 215, 0, ${0.7 + pulse * 0.3})` : '#ffd700';
            ctx.lineWidth = hasActedAll ? 2 : 1;
            ctx.strokeRect(rx + 0.5, ey + 0.5, btnW - 1, btnH - 1);
            
            const turnFontSize = hasActedAll ? '10px' : '8px';
            this.drawPixelText(ctx, "END TURN", rx + btnW / 2, ey + (hasActedAll ? 7 : 1), { 
                color: '#fff', 
                font: `${turnFontSize} Silkscreen`, 
                align: 'center',
                outline: hasActedAll
            });
            ctx.restore();
            
            this.endTurnRect = { x: rx, y: ey, w: btnW, h: btnH };

            // Other buttons should adjust if END TURN moved/resized
            const otherBtnW = 45;
            const orx = canvas.width - otherBtnW - 5;

            // RESET TURN
            const ry = barY + 12;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(orx, ry, otherBtnW, 8);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(orx + 0.5, ry + 0.5, otherBtnW - 1, 7);
            this.drawPixelText(ctx, "RESET", orx + otherBtnW / 2, ry + 1, { color: '#eee', font: '8px Tiny5', align: 'center' });
            this.resetTurnRect = { x: orx, y: ry, w: otherBtnW, h: 8 };

            // ATTACK ORDER TOGGLE
            const ay = barY + 21;
            ctx.fillStyle = this.showAttackOrder ? 'rgba(0, 80, 0, 0.9)' : 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(orx, ay, otherBtnW, 8);
            ctx.strokeStyle = this.showAttackOrder ? '#0f0' : '#888';
            ctx.strokeRect(orx + 0.5, ay + 0.5, otherBtnW - 1, 7);
            this.drawPixelText(ctx, "ORDER", orx + otherBtnW / 2, ay + 1, { color: '#fff', font: '8px Tiny5', align: 'center' });
            this.attackOrderRect = { x: orx, y: ay, w: otherBtnW, h: 8 };

            // UNDO
            const uy = barY + 30;
            const canUndo = this.history.length > 1;
            ctx.fillStyle = canUndo ? 'rgba(40, 40, 40, 0.9)' : 'rgba(20, 20, 20, 0.6)';
            ctx.fillRect(orx, uy, otherBtnW, 8);
            ctx.strokeStyle = canUndo ? '#fff' : '#444';
            ctx.strokeRect(orx + 0.5, uy + 0.5, otherBtnW - 1, 7);
            this.drawPixelText(ctx, "UNDO", orx + otherBtnW / 2, uy + 1, { color: canUndo ? '#eee' : '#666', font: '8px Tiny5', align: 'center' });
            this.undoRect = { x: orx, y: uy, w: otherBtnW, h: 8 };
        } else {
            this.endTurnRect = null;
            this.resetTurnRect = null;
            this.attackOrderRect = null;
            this.undoRect = null;
        }

        // 5. Ability UI (Bottom Center)
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.turn === 'player' && !this.isProcessingTurn) {
            this.drawUnitAbilityUI(ctx, canvas, this.selectedUnit);
        }

        // End Turn Confirmation Dialog
        if (this.showEndTurnConfirm) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const dw = 160;
            const dh = 60;
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;
            
            ctx.fillStyle = '#222';
            ctx.fillRect(dx, dy, dw, dh);
            ctx.strokeStyle = '#ffd700';
            ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
            
            this.drawPixelText(ctx, "UNFINISHED ACTIONS", dx + dw / 2, dy + 10, { color: '#ff4444', font: '8px Silkscreen', align: 'center' });
            this.drawPixelText(ctx, "Some units have not acted.", dx + dw / 2, dy + 22, { color: '#fff', font: '8px Tiny5', align: 'center' });
            this.drawPixelText(ctx, "End turn anyway?", dx + dw / 2, dy + 32, { color: '#fff', font: '8px Tiny5', align: 'center' });
            
            // Buttons
            const bw = 50;
            const bh = 15;
            
            // Yes
            const yx = dx + 20;
            const yy = dy + 40;
            ctx.fillStyle = '#442222';
            ctx.fillRect(yx, yy, bw, bh);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(yx + 0.5, yy + 0.5, bw - 1, bh - 1);
            this.drawPixelText(ctx, "YES", yx + bw / 2, yy + 4, { color: '#fff', font: '8px Silkscreen', align: 'center' });
            this.confirmYesRect = { x: yx, y: yy, w: bw, h: bh };
            
            // No
            const nx = dx + dw - 20 - bw;
            const ny = dy + 40;
            ctx.fillStyle = '#222222';
            ctx.fillRect(nx, ny, bw, bh);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(nx + 0.5, ny + 0.5, bw - 1, bh - 1);
            this.drawPixelText(ctx, "NO", nx + bw / 2, ny + 4, { color: '#fff', font: '8px Silkscreen', align: 'center' });
            this.confirmNoRect = { x: nx, y: ny, w: bw, h: bh };
        }

        if (this.activeDialogue) {
            this.renderDialogueBox(ctx, canvas, {
                portraitKey: this.activeDialogue.unit.imgKey,
                name: this.activeDialogue.unit.name,
                text: this.activeDialogue.unit.dialogue
            }, { subStep: this.activeDialogue.subStep || 0 });
        }

        if (this.isIntroAnimating) {
            ctx.restore();
        }
    }

    drawUnitAbilityUI(ctx, canvas, unit) {
        // Positioned between Info Box and Turn Buttons
        const startX = 100;
        const barY = canvas.height - 40;
        
        // Attack buttons
        this.attackRects = [];
        unit.attacks.forEach((key, i) => {
            const attack = ATTACKS[key];
            const aw = 55;
            const ah = 14;
            const ax = startX + i * (aw + 4);
            const ay = barY + 13;

            const isSelected = this.selectedAttack === key;
            const isDisabled = unit.hasAttacked;

            ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(40, 40, 40, 0.8)';
            ctx.fillRect(ax, ay, aw, ah);
            ctx.strokeStyle = isSelected ? '#ffd700' : (isDisabled ? '#333' : '#888');
            ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);

            this.drawPixelText(ctx, attack.name, ax + aw / 2, ay + 3, { 
                color: isDisabled ? '#555' : '#eee', 
                font: '8px Tiny5',
                align: 'center' 
            });

            this.attackRects.push({ x: ax, y: ay, w: aw, h: ah, key });
        });
    }

    selectAttack(attackKey) {
        if (!this.selectedUnit || this.selectedUnit.faction !== 'player' || this.selectedUnit.hasAttacked) return;
        
        this.selectedAttack = attackKey;
        this.reachableTiles.clear(); // Clear move highlights when an attack is selected
        
        // Find valid attack targets based on range
        this.attackTiles = new Map();
        const attack = ATTACKS[this.selectedAttack];
        const range = attack.range || 1;
        const minRange = attack.minRange || 0;
        
        if (range === 1 && minRange === 0) {
            const neighbors = this.tacticsMap.getNeighbors(this.selectedUnit.r, this.selectedUnit.q);
            neighbors.forEach(n => this.attackTiles.set(`${n.r},${n.q}`, true));
        } else {
            // Find all hexes within distance range and >= minRange
            for (let r = 0; r < this.manager.config.mapHeight; r++) {
                for (let q = 0; q < this.manager.config.mapWidth; q++) {
                    const dist = this.tacticsMap.getDistance(this.selectedUnit.r, this.selectedUnit.q, r, q);
                    if (dist >= minRange && dist <= range && dist > 0) {
                        this.attackTiles.set(`${r},${q}`, true);
                    }
                }
            }
        }
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);

        // Don't process cutscene clicks if cleanup dialogue is playing on the map
        if (this.isCutscene && !this.isIntroAnimating && !this.isProcessingTurn && !this.isCleanupDialogueActive) {
            const battleDef = BATTLES[this.battleId];
            if (battleDef && battleDef.nextScene) {
                // qingzhou_cleanup now handles dialogue on-map, so skip this
                if (this.battleId === 'qingzhou_cleanup') {
                    // Don't do anything - dialogue will be triggered by triggerQingzhouCleanup
                    return;
                } else if (this.battleId === 'guangzong_camp') {
                    this.manager.gameState.addMilestone('guangzong_camp');
                    this.manager.switchTo('narrative', {
                        scriptId: 'guangzong_arrival',
                        onComplete: () => {
                            // Return to the world map after the Guangzong narrative
                            this.manager.switchTo('map', { campaignId: 'liubei' });
                        }
                    });
                } else {
                    this.manager.switchTo(battleDef.nextScene, battleDef.nextParams);
                }
                return;
            }
        }

        if (this.showEndTurnConfirm) {
            if (this.confirmYesRect && x >= this.confirmYesRect.x && x <= this.confirmYesRect.x + this.confirmYesRect.w &&
                y >= this.confirmYesRect.y && y <= this.confirmYesRect.y + this.confirmYesRect.h) {
                assets.playSound('ui_click');
                this.showEndTurnConfirm = false;
                this.startExecutionPhase();
                return;
            }
            if (this.confirmNoRect && x >= this.confirmNoRect.x && x <= this.confirmNoRect.x + this.confirmNoRect.w &&
                y >= this.confirmNoRect.y && y <= this.confirmNoRect.y + this.confirmNoRect.h) {
                assets.playSound('ui_click');
                this.showEndTurnConfirm = false;
                return;
            }
            return; // Block other inputs while confirm is visible
        }

        if (this.isIntroDialogueActive || this.isVictoryDialogueActive) {
            if (this.dialogueElapsed < 250) return;
            const script = this.isIntroDialogueActive ? this.introScript : this.victoryScript;
            const step = script[this.dialogueStep];
            const status = this.renderDialogueBox(this.manager.ctx, this.manager.canvas, {
                portraitKey: step.portraitKey,
                name: step.name,
                text: step.text
            }, { subStep: this.subStep || 0 });

            if (status.hasNextChunk) {
                this.subStep = (this.subStep || 0) + 1;
                this.dialogueElapsed = 0;
            } else {
                this.subStep = 0;
                this.dialogueStep++;
                this.dialogueElapsed = 0;
                
                if (this.dialogueStep >= script.length) {
                    if (this.isIntroDialogueActive) {
                        this.isIntroDialogueActive = false;
                        if (this.battleId === 'qingzhou_prelude') {
                            this.checkWinLoss(); // Trigger transition immediately
                        } else {
                            this.startNpcPhase();
                        }
                    } else if (this.isVictoryDialogueActive) {
                        this.isVictoryDialogueActive = false;
                        if (this.victoryOnComplete) this.victoryOnComplete();
                    }
                }
            }
            return;
        }

        if (this.isCleanupDialogueActive) {
            if (this.dialogueElapsed < 250) return;
            const step = this.cleanupDialogueScript[this.cleanupDialogueStep];
            
            // Map speaker to portrait key
            const portraitMap = {
                'liubei': 'liu-bei',
                'guanyu': 'guan-yu',
                'zhangfei': 'zhang-fei',
                'gongjing': 'custom-male-17'  // Older official portrait for Imperial Protector
            };
            
            const status = this.renderDialogueBox(this.manager.ctx, this.manager.canvas, {
                portraitKey: portraitMap[step.speaker] || step.speaker,
                name: step.name,
                text: step.text
            }, { subStep: this.subStep || 0 });

            if (status.hasNextChunk) {
                this.subStep = (this.subStep || 0) + 1;
                this.dialogueElapsed = 0;
            } else {
                this.subStep = 0;
                this.cleanupDialogueStep++;
                this.dialogueElapsed = 0;
                
                if (this.cleanupDialogueStep >= this.cleanupDialogueScript.length) {
                    this.isCleanupDialogueActive = false;
                    // Go to the map - player will click on Guangzong to march there
                    this.manager.gameState.addMilestone('qingzhou_cleanup');
                    this.manager.switchTo('map', { campaignId: 'liubei' });
                } else {
                    // Play voice for next step
                    const nextStep = this.cleanupDialogueScript[this.cleanupDialogueStep];
                    if (nextStep && nextStep.voiceId) {
                        assets.playVoice(nextStep.voiceId);
                    }
                }
            }
            return;
        }

        if (this.activeDialogue) {
            // Allow clicking to skip/advance dialogue if it's been visible for a moment
            if (this.dialogueElapsed < 250) return;
            
            // If the dialogue has a timer (auto-clearing), clicking it should clear it immediately
            if (this.activeDialogue.timer !== undefined) {
                if (this.activeDialogue.unit) {
                    this.activeDialogue.unit.dialogue = "";
                    this.activeDialogue.unit.voiceId = null;
                }
                this.activeDialogue = null;
                this.dialogueElapsed = 0;
                return;
            }

            // Check if there are more lines to show (for manual dialogue)
            const result = this.renderDialogueBox(this.manager.ctx, this.manager.canvas, {
                portraitKey: this.activeDialogue.unit.imgKey,
                name: this.activeDialogue.unit.name,
                text: this.activeDialogue.unit.dialogue
            }, { subStep: this.activeDialogue.subStep || 0 });

            if (result.hasNextChunk) {
                this.activeDialogue.subStep = (this.activeDialogue.subStep || 0) + 1;
                this.dialogueElapsed = 0;
            } else {
                // Clear the unit's dialogue so it doesn't repeat on click
                if (this.activeDialogue.unit) {
                    this.activeDialogue.unit.dialogue = "";
                    this.activeDialogue.unit.voiceId = null;
                }
                this.activeDialogue = null;
                this.dialogueElapsed = 0;
            }
            return;
        }

        if (this.isGameOver) {
            // Game over state - wait for gameOverTimer to transition to summary
            // Don't allow clicking to go anywhere during this period
            return;
        }

        if (this.isProcessingTurn || this.isIntroAnimating) return;

        // 1. Check UI Buttons (End/Reset/Order)
        if (this.endTurnRect && x >= this.endTurnRect.x && x <= this.endTurnRect.x + this.endTurnRect.w &&
            y >= this.endTurnRect.y && y <= this.endTurnRect.y + this.endTurnRect.h) {
            
            if (this.allUnitsActed()) {
            this.startExecutionPhase();
            } else {
                assets.playSound('ui_click');
                this.showEndTurnConfirm = true;
            }
            return;
        }
        if (this.resetTurnRect && x >= this.resetTurnRect.x && x <= this.resetTurnRect.x + this.resetTurnRect.w &&
            y >= this.resetTurnRect.y && y <= this.resetTurnRect.y + this.resetTurnRect.h) {
            this.resetTurn();
            return;
        }
        if (this.attackOrderRect && x >= this.attackOrderRect.x && x <= this.attackOrderRect.x + this.attackOrderRect.w &&
            y >= this.attackOrderRect.y && y <= this.attackOrderRect.y + this.attackOrderRect.h) {
            this.showAttackOrder = !this.showAttackOrder;
            assets.playSound('ui_click', 0.5);
            return;
        }
        if (this.undoRect && x >= this.undoRect.x && x <= this.undoRect.x + this.undoRect.w &&
            y >= this.undoRect.y && y <= this.undoRect.y + this.undoRect.h) {
            this.undo();
            return;
        }

        // 2. Check Ability Buttons
        if (this.attackRects && this.selectedUnit && this.selectedUnit.faction === 'player') {
            const btn = this.attackRects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
            if (btn && !this.selectedUnit.hasAttacked) {
                this.selectAttack(btn.key);
                return;
            }
        }

        // 3. Detect Sprite & Cell
        let spriteUnit = null;
        const activeUnits = this.units.filter(u => u.hp > 0);
        activeUnits.sort((a, b) => b.currentSortR - a.currentSortR);
        for (let u of activeUnits) {
            const ux = u.visualX;
            const uy = u.visualY;
            let sinkOffset = 0;
            if (u.isDrowning) sinkOffset = Math.min(1, u.drownTimer / 2000) * 40;
            else {
                const cell = this.tacticsMap.getCell(u.r, u.q);
                if (cell && cell.terrain.includes('water_shallow')) sinkOffset = 4;
                
                // Standing on corpse? Raise hit box by 4px
                if (u.hp > 0 && !u.isMoving && !u.pushData) {
                    const hasCorpse = this.units.some(other => other !== u && other.r === u.r && other.q === u.q && other.hp <= 0 && !other.isGone);
                    if (hasCorpse) sinkOffset -= 4;
                }
            }
            if (this.checkCharacterHit(u.img, u.currentAnimAction || u.action, u.frame, ux, uy, x, y, { 
                flip: u.flip, 
                sinkOffset,
                isProp: u.name === 'Boulder'
            })) {
                spriteUnit = u;
                break;
            }
        }
        const clickedCell = this.getCellAt(x, y);

        // --- SMART INTENT ACTION CHECK ---
        
        // A. PERFORM ATTACK (Highest Priority if attack is active)
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.selectedAttack) {
            // Use the same hoveredCell calculated in update() to ensure consistency
            if (this.hoveredCell && this.attackTiles.has(`${this.hoveredCell.r},${this.hoveredCell.q}`)) {
                const attacker = this.selectedUnit;
                this.isProcessingTurn = true; // Lock turn during animation
                
                this.executeAttack(attacker, this.selectedAttack, this.hoveredCell.r, this.hoveredCell.q, () => {
                    // Safety: only apply if the action wasn't undone or state reset
                    if (this.turn === 'player' && attacker.hp > 0) {
                        attacker.hasAttacked = true;
                        attacker.hasActed = true;
                        if (this.selectedUnit === attacker) {
                            this.selectedUnit = null;
                            this.selectedAttack = null;
                            this.attackTiles.clear();
                        }
                        this.pushHistory(); // Capture state AFTER attack
                    }
                    this.isProcessingTurn = false; // Unlock turn
                });
                return;
            }
        }

        // B. MOVE UNIT (Priority if move is valid, even if clicking a sprite)
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && !this.selectedUnit.hasMoved && clickedCell && this.reachableTiles.has(`${clickedCell.r},${clickedCell.q}`)) {
            // Check landing spot (cannot land on another unit)
            if (!clickedCell.unit || clickedCell.unit === this.selectedUnit) {
                const path = this.tacticsMap.getPath(this.selectedUnit.r, this.selectedUnit.q, clickedCell.r, clickedCell.q, this.selectedUnit.moveRange, this.selectedUnit);
                if (path) {
                    this.isProcessingTurn = true; // Lock turn during move
                    const oldCell = this.tacticsMap.getCell(this.selectedUnit.r, this.selectedUnit.q);
                    if (oldCell) oldCell.unit = null;
                    this.selectedUnit.startPath(path);
                    clickedCell.unit = this.selectedUnit;
                    this.selectedUnit.hasMoved = true;
                    const movingUnit = this.selectedUnit;
                    const checkArrival = () => {
                        // Safety: stop if turn changed or unit selection cleared (e.g. undo)
                        if (this.turn !== 'player' || !movingUnit) {
                            this.isProcessingTurn = false;
                            return;
                        }

                        if (!movingUnit.isMoving) {
                            if (this.selectedUnit === movingUnit) {
                                if (movingUnit.attacks.length > 0) this.selectAttack(movingUnit.attacks[0]);
                            }
                            this.pushHistory(); // Capture state AFTER move completes
                            this.isProcessingTurn = false; // Unlock turn
                        } else setTimeout(checkArrival, 100);
                    };
                    checkArrival();
                }
                this.reachableTiles.clear();
                return;
            }
        }

        // C. SELECT UNIT (HoveredCell has priority if it contains a unit)
        const targetUnit = this.hoveredCell ? this.hoveredCell.unit : null;
        if (targetUnit) {
            this.selectedUnit = targetUnit;
            this.selectedAttack = null;
            this.attackTiles.clear();
            this.attackRects = [];
            if (this.selectedUnit.faction === 'player' && !this.selectedUnit.hasActed) {
                if (!this.selectedUnit.hasMoved) {
                    const rawReachable = this.tacticsMap.getReachableData(this.selectedUnit.r, this.selectedUnit.q, this.selectedUnit.moveRange, this.selectedUnit);
                    this.reachableTiles = new Map();
                    rawReachable.forEach((data, key) => {
                        const [r, q] = key.split(',').map(Number);
                        const cell = this.tacticsMap.getCell(r, q);
                        if (!cell.unit || cell.unit === this.selectedUnit) this.reachableTiles.set(key, data);
                    });
                } else {
                    this.reachableTiles.clear();
                    if (this.selectedUnit.attacks.length > 0) this.selectAttack(this.selectedUnit.attacks[0]);
                }
            } else this.reachableTiles.clear();
            if (this.selectedUnit.dialogue) this.activeDialogue = { unit: this.selectedUnit, expires: Date.now() + 3000 };
            return;
        }

        // D. DESELECT
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.attackRects = [];
        this.activeDialogue = null;
    }

    executePushCollision(victim, pushCell, victimPos, targetPos) {
        setTimeout(() => {
            assets.playSound('collision');
            
            // Ice doesn't take damage from bumps
            if (!pushCell.terrain.includes('ice')) {
                this.damageCell(pushCell.r, pushCell.q);
            }

            this.applyUnitDamage(victim, 1);
            this.addDamageNumber(victimPos.x, victimPos.y - 30, 1);
            
            if (pushCell.unit && pushCell.unit.hp > 0) { // Only damage if the unit is still alive
                this.applyUnitDamage(pushCell.unit, 1);
                this.addDamageNumber(targetPos.x, targetPos.y - 30, 1);
                pushCell.unit.triggerShake(victimPos.x, victimPos.y, targetPos.x, targetPos.y);
            }
        }, 125);
    }

    handleCrushLanding(faller, occupant, targetCell, levelDiff, targetPos) {
        setTimeout(() => {
            assets.playSound('collision'); // Heavy impact
            
            const fallDamage = Math.max(0, Math.abs(levelDiff) - 1);
            const crushDamage = fallDamage + 1; // Collision bonus
            
            // Damage both
            this.applyUnitDamage(faller, crushDamage);
            this.addDamageNumber(targetPos.x, targetPos.y - 40, crushDamage);
            
            this.applyUnitDamage(occupant, crushDamage);
            this.addDamageNumber(targetPos.x, targetPos.y - 20, crushDamage);
            occupant.triggerShake(targetPos.x, targetPos.y - 10, targetPos.x, targetPos.y);

            // Resolve Occupancy
            if (occupant.hp <= 0) {
                // Occupant dies, faller stands on corpse
                targetCell.unit = (faller.hp > 0) ? faller : null;
            } else {
                // Occupant survives, they get "squished" to a neighbor cell
                const freeCell = this.findNearestFreeCell(targetCell.r, targetCell.q, 1);
                if (freeCell) {
                    targetCell.unit = (faller.hp > 0) ? faller : null;
                    const oldPos = this.getPixelPos(occupant.r, occupant.q);
                    occupant.setPosition(freeCell.r, freeCell.q);
                    freeCell.unit = occupant;
                    const newPos = this.getPixelPos(freeCell.r, freeCell.q);
                    occupant.startPush(oldPos.x, oldPos.y, newPos.x, newPos.y, false);
                } else {
                    // No room to squish! Fatal crush.
                    this.applyUnitDamage(occupant, 999); // Force death
                    this.addDamageNumber(targetPos.x, targetPos.y - 20, "CRUSHED", '#ff0000');
                    targetCell.unit = (faller.hp > 0) ? faller : null;
                }
            }
        }, 400); // Wait for fall animation
    }
}

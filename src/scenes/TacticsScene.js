import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS, ATTACKS, UPGRADE_PATHS } from '../core/Constants.js';
import { TacticsMap } from '../core/TacticsMap.js';
import { Unit } from '../entities/Unit.js';
import { BATTLES, UNIT_TEMPLATES } from '../data/Battles.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';
import { getLocalizedText, getFontForLanguage, getTextContainerSize, LANGUAGE } from '../core/Language.js';
import { UI_TEXT, getLocalizedCharacterName } from '../data/Translations.js';

export class TacticsScene extends BaseScene {
    constructor() {
        super();
        this.tacticsMap = null;
        this.units = [];
        this.horses = []; // { id, riderId|null }
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles = new Map();
        this.attackTiles = new Map();
        
        this.animationFrame = 0;
        this.lastTime = 0;
        this.lastSaveTime = 0; // Track when we last saved state
        this.saveInterval = 2000; // Save every 2 seconds
        
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
        this.controllerNavTargets = [];
        this.controllerNavIndex = -1;
        this.controllerNavMouseEnabled = true;
    }

    enter(params = {}) {
        const gs = this.manager.gameState;
        
        // Check if we're resuming a saved battle
        const isResume = params.isResume && gs.get('battleState');
        const savedState = isResume ? gs.get('battleState') : null;
        
        // Scenario-specific initialization
        this.battleId = params.battleId || (savedState?.battleId) || gs.get('currentBattleId') || 'daxing'; 
        this.isCustom = params.isCustom || this.battleId === 'custom';
        
        const battleDef = BATTLES[this.battleId];
        this.isCutscene = battleDef?.isCutscene || false;
        this.hasChoice = battleDef?.hasChoice || false;

        if (!this.isCustom) {
            gs.set('currentBattleId', this.battleId);
        }

        console.log(`Entering battle: ${this.battleId}${isResume ? ' (resuming)' : ''}`);

        // Determine music: cutscenes with choices stay on map music, regular battles play battle music
        let musicKey = params.musicKey;
        if (!musicKey) {
            if (this.isCutscene && battleDef?.hasChoice) {
                musicKey = 'forest';  // Keep map music for encounter scenes with choices
            } else if (this.battleId === 'daxing' || this.battleId === 'qingzhou_prelude') {
                musicKey = 'oath';
            } else if (this.isCutscene) {
                musicKey = 'forest';  // Keep map music for other cutscenes
            } else {
                musicKey = 'battle';
            }
        }
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
        this.horses = [];
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.hoveredCell = null;
        this.activeDialogue = null;
        this.introScript = null; // Fix dialogue flicker
        this.isPostCombatDialogue = false; // Track if we're in post-combat dialogue
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
        this.cleanupDialogueOnComplete = null;
        this.enemiesKilled = 0;
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.lastTime = 0;
        this.onVictoryCallback = params.onVictory || null; // Custom callback for battle result
        this.onChoiceRestrain = params.onChoiceRestrain || null; // Callback for peaceful choice
        this.onChoiceFight = params.onChoiceFight || null; // Callback for fight choice
        this.onFightVictory = params.onFightVictory || null; // Callback for cage-break victory
        this.controllerNavTargets = [];
        this.controllerNavIndex = -1;
        this.controllerNavMouseEnabled = true;
        
        // If resuming a battle with choices but no callbacks provided, set them up dynamically
        if (this.battleId === 'guangzong_encounter' && !this.onChoiceRestrain) {
            this.onChoiceRestrain = () => {
                // Peaceful path - switch to map and continue to Dong Zhuo
                this.manager.gameState.addMilestone('guangzong_encounter');
                this.manager.switchTo('map', { 
                    campaignId: 'liubei',
                    partyX: 205,
                    partyY: 55
                });
            };
            this.onChoiceFight = () => {}; // Empty - startFight() handles this
            this.onFightVictory = () => {
                this.manager.gameState.addMilestone('freed_luzhi');
                // Use MapScene logic to show story
                const mapScene = this.manager.scenes['map'];
                if (mapScene) {
                    mapScene.continueAfterEscortBattle();
                } else {
                    this.manager.switchTo('map', { campaignId: 'liubei' });
                }
            };
            // Also set fallback victory callback
            this.onVictoryCallback = this.onFightVictory;
        }

        if (this.battleId === 'dongzhuo_battle' && !this.onVictoryCallback) {
            this.onVictoryCallback = () => {
                const mapScene = this.manager.scenes['map'];
                if (mapScene && mapScene.showChapter1End) {
                    mapScene.showChapter1End();
                } else {
                    this.manager.switchTo('map', { afterEvent: 'dongzhuo_battle' });
                }
            };
        }
        
        // Note: this.hasChoice is already set from battleDef earlier in enter()
        this.isChoiceActive = false; // Currently showing choice UI
        this.choiceHovered = -1; // Which choice option is hovered
        this.isFightMode = false; // True when player chose to fight in encounter
        
        if (battleDef) {
            this.mapGenParams = params.mapGen || savedState?.mapGen || battleDef.map;
        } else {
            // Original initialization for custom/fallbacks
            this.mapGenParams = params.mapGen || savedState?.mapGen || {
                biome: 'central',
                layout: 'river', 
                forestDensity: 0.15,
                mountainDensity: 0.1,
                riverDensity: 0.05,
                houseDensity: 0.03
            };
        }
            
        if (!isResume) {
            this.tacticsMap.generate(this.mapGenParams);
        } else {
            // For resume, we'll restore the grid from saved state
            this.tacticsMap.generate(this.mapGenParams);
        }

        // Apply terrain overrides from battle definition
        if (battleDef && battleDef.terrainOverrides) {
            for (const override of battleDef.terrainOverrides) {
                const cell = this.tacticsMap.getCell(override.r, override.q);
                if (cell) {
                    cell.terrain = override.terrain;
                    // Clear impassable flag if setting to a traversable terrain
                    if (!override.terrain.includes('water_deep') && !override.terrain.includes('mountain')) {
                        cell.impassable = false;
                    }
                }
            }
        }

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

        if (!isResume) {
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
        } else {
            // Restore saved battle state
            this.restoreBattleState(savedState);
        }

        this.particles = [];
        if (!this.isCustom) {
            // Don't set lastScene here - SceneManager will handle it when switching away
            this.manager.gameState.set('currentBattleId', this.battleId);
        }
        
        // Initialize history for undo
        this.history = [];
        if (!isResume) {
            this.pushHistory();
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
        this.isPostCombatDialogue = false; // Intro dialogue, not post-combat
        const battleDef = BATTLES[this.battleId];
        
        if (battleDef && battleDef.introScript) {
            this.introScript = battleDef.introScript;
        }
        
        if (this.introScript && this.introScript.length > 0) {
            this.isIntroDialogueActive = true;
            this.dialogueStep = 0;
        } else if (this.battleId === 'yellow_turban_rout') {
            // Start combat immediately, dialogue comes after
            this.isIntroDialogueActive = false;
            this.startYellowTurbanCutsceneCombat();
        } else if (this.isCutscene) {
            // Cutscenes handle their own flow - don't start NPC phase
            this.isIntroDialogueActive = false;
        } else {
            this.isIntroDialogueActive = false;
            this.startNpcPhase(); // Skip to NPC phase if no dialogue
        }
    }

    startYellowTurbanCutsceneCombat() {
        this.isProcessingTurn = true;
        this.cutsceneCombatComplete = false; // Flag to track when combat is done
        
        // Reset all units for combat
        this.units.forEach(u => {
            u.hasMoved = false;
            u.hasAttacked = false;
            u.hasActed = false;
        });
        
        // Use normal NPC phase (allied move → enemy move → telegraph → execution)
        // This will be intercepted to skip player turn and go straight to execution
        this.startNpcPhase();
    }
    
    checkCutsceneCombatComplete() {
        // After execution phase, start retreat
        const soldiers = this.units.filter(u => u.id.startsWith('soldier'));
        const survivors = soldiers.filter(s => s.hp > 0);
        
        // Phase 2: Surviving soldiers flee completely offscreen
        this.isProcessingTurn = true;
        let retreatIndex = 0;
        
        const executeRetreat = () => {
            if (retreatIndex >= survivors.length) {
                // Phase 3: Zhang brothers move to center
                const zhangBrothers = this.units.filter(u => u.id === 'zhangjue' || u.id === 'zhangbao' || u.id === 'zhangliang');
                const centerR = Math.floor(this.manager.config.mapHeight / 2);
                const centerQ = Math.floor(this.manager.config.mapWidth / 2);
                let brotherIndex = 0;
                
                const executeBrotherMove = () => {
                    if (brotherIndex >= zhangBrothers.length) {
                        // Phase 4: Show Zhang brothers dialogue
                        setTimeout(() => {
                            this.isProcessingTurn = false;
                            this.startPostCombatDialogue();
                        }, 500);
                        return;
                    }
                    
                    const brother = zhangBrothers[brotherIndex];
                    if (brother && brother.hp > 0) {
                        // Move to center area (spread them out slightly)
                        const targetQ = centerQ + (brotherIndex - 1); // -1, 0, +1
                        const targetR = centerR;
                        
                        const path = this.tacticsMap.getPath(brother.r, brother.q, targetR, targetQ, 10, brother);
                        if (path && path.length > 1) {
                            const targetCell = this.tacticsMap.getCell(targetR, targetQ);
                            if (targetCell && !targetCell.unit && !targetCell.impassable) {
                                const oldCell = this.tacticsMap.getCell(brother.r, brother.q);
                                if (oldCell) oldCell.unit = null;
                                
                                brother.startPath(path);
                                targetCell.unit = brother;
                                brother.r = targetR;
                                brother.q = targetQ;
                                
                                setTimeout(() => {
                                    brotherIndex++;
                                    executeBrotherMove();
                                }, 800);
                            } else {
                                brotherIndex++;
                                setTimeout(executeBrotherMove, 100);
                            }
                        } else {
                            brotherIndex++;
                            setTimeout(executeBrotherMove, 100);
                        }
                    } else {
                        brotherIndex++;
                        setTimeout(executeBrotherMove, 100);
                    }
                };
                executeBrotherMove();
                return;
            }
            
            const soldier = survivors[retreatIndex];
            if (soldier && soldier.hp > 0) {
                // Move completely offscreen (beyond map edge)
                const rightmostQ = this.manager.config.mapWidth - 1;
                const targetR = soldier.r;
                const path = this.tacticsMap.getPath(soldier.r, soldier.q, targetR, rightmostQ, 20, soldier);
                
                if (path && path.length > 1) {
                    const oldCell = this.tacticsMap.getCell(soldier.r, soldier.q);
                    if (oldCell) oldCell.unit = null;
                    
                    // Move to rightmost edge
                    soldier.startPath(path);
                    const targetCell = this.tacticsMap.getCell(targetR, rightmostQ);
                    if (targetCell) targetCell.unit = soldier;
                    soldier.r = targetR;
                    soldier.q = rightmostQ;
                    
                    // Wait for path to complete, then move visually offscreen
                    const checkPathComplete = () => {
                        if (soldier.isMoving) {
                            setTimeout(checkPathComplete, 100);
                        } else {
                            // Path complete, now move visually offscreen
                            const edgePos = this.getPixelPos(targetR, rightmostQ);
                            const offscreenQ = this.manager.config.mapWidth + 3;
                            const offscreenPos = this.getPixelPos(targetR, offscreenQ);
                            
                            // Animate moving offscreen
                            const startX = edgePos.x;
                            const startY = edgePos.y;
                            const endX = offscreenPos.x;
                            const endY = offscreenPos.y;
                            const duration = 800;
                            const startTime = Date.now();
                            
                            const animateOffscreen = () => {
                                const elapsed = Date.now() - startTime;
                                const progress = Math.min(elapsed / duration, 1);
                                
                                soldier.visualX = startX + (endX - startX) * progress;
                                soldier.visualY = startY + (endY - startY) * progress;
                                
                                if (progress < 1) {
                                    requestAnimationFrame(animateOffscreen);
                                } else {
                                    soldier.isGone = true; // Mark as gone so it doesn't render
                                    const finalCell = this.tacticsMap.getCell(targetR, rightmostQ);
                                    if (finalCell) finalCell.unit = null;
                                    retreatIndex++;
                                    executeRetreat();
                                }
                            };
                            animateOffscreen();
                        }
                    };
                    setTimeout(checkPathComplete, 100);
                } else {
                    // Can't path, just mark as gone
                    soldier.isGone = true;
                    const oldCell = this.tacticsMap.getCell(soldier.r, soldier.q);
                    if (oldCell) oldCell.unit = null;
                    retreatIndex++;
                    setTimeout(executeRetreat, 100);
                }
            } else {
                retreatIndex++;
                setTimeout(executeRetreat, 100);
            }
        };
        
        setTimeout(executeRetreat, 800);
    }

    startPostCombatDialogue() {
        const battleDef = BATTLES[this.battleId];
        if (battleDef && battleDef.postCombatScript) {
            this.introScript = battleDef.postCombatScript;
            this.isIntroDialogueActive = true;
            this.isPostCombatDialogue = true; // Mark as post-combat dialogue
            this.dialogueStep = 0;
            this.dialogueElapsed = 0;
            this.subStep = 0;
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

        const vc = battleDef ? battleDef.victoryCondition : null;
        const victoryType = (vc && typeof vc === 'object') ? vc.type : vc;

        if (battleDef && vc) {
            // Check Must Survive conditions
            const mustSurvive = (vc && typeof vc === 'object' && vc.mustSurvive) ? vc.mustSurvive : null;
            if (mustSurvive) {
                const deadRequired = mustSurvive.some(id => !this.units.find(u => u.id === id && u.hp > 0));
                if (deadRequired) {
                    this.endBattle(false);
                return;
            }
            }

            if (victoryType === 'defeat_captains') {
                const captains = enemyUnits.filter(u => vc.captains.includes(u.id));
                if (captains.length === 0 && !this.isRetreating) {
                    this.startRetreatPhase();
                    return;
                }
            } else if (victoryType === 'prelude') {
                if (!this.isIntroDialogueActive && !this.isGameOver) {
                    this.isGameOver = true;
                    this.manager.switchTo('tactics', { battleId: 'qingzhou_siege' });
                    return;
                }
            } else if (victoryType === 'reach_flag_then_defeat_all') {
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
            } else if (victoryType === 'defeat_all_enemies' || !victoryType) {
                // Standard victory: defeat all enemies
                if (enemyUnits.length === 0) {
                    // Check for on-map victory dialogue (used by Dong Zhuo battle)
                    if (battleDef && battleDef.hasVictoryDialogue && this.battleId === 'dongzhuo_battle') {
                        this.manager.gameState.addMilestone('guangzong_encounter');
                        this.startDongZhuoVictoryDialogue();
        } else {
                        this.endBattle(true);
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
                text: { en: "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered.", zh: "英勇的兄弟们！你们救了青州！当你们的信号响彻关隘，我们从城门冲出。叛军被我们夹击，尽数歼灭。" }
            },
            {
                type: 'dialogue',
                speaker: 'liubei',
                name: 'Liu Bei',
                voiceId: 'qz_ret_lb_01',
                text: { en: "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere.", zh: "能为州牧效力，我们深感荣幸。此地已恢复和平，但叛乱仍在其他地方肆虐。" }
            },
            {
                type: 'dialogue',
                speaker: 'gongjing',
                name: 'Protector Gong Jing',
                voiceId: 'qz_ret_gj_02',
                text: { en: "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.", zh: "确实。我听说卢植将军在广宗被叛军首领张角本人围攻，处境艰难。" }
            },
            {
                type: 'dialogue',
                speaker: 'liubei',
                name: 'Liu Bei',
                voiceId: 'qz_ret_lb_02',
                text: { en: "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!", zh: "卢植！他是我多年前的老师。我不能让他独自面对如此大军。兄弟们，我们向广宗进军！" }
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
        const unitXP = gs.getCampaignVar('unitXP') || {};
        const unitClasses = gs.getCampaignVar('unitClasses') || {};
        
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
        // Heroes have 4 base HP, soldiers gain +1 HP at level 2+, archers stay at 2
        const isArcher = unitClass === 'archer';
        let baseHp = 4;
        if (faction !== 'player') {
            baseHp = isArcher ? 2 : (level >= 2 ? 3 : 2);
        }
        const finalMaxHp = this.getMaxHpForLevel(level, baseHp);

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
        
        const unitXP = gs.getCampaignVar('unitXP') || {};
        const recoveryInfo = [];
        const levelUps = [];

        if (won && !this.isCustom) {
            gs.addMilestone(this.battleId);
            // Don't set lastScene here - SceneManager will handle it
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
        const casualties = this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp <= 0 && !u.isPreDead).length;
        const xpGained = this.isCustom ? 0 : Math.max(0, this.baseXP + Math.min(3, housesProtected) - casualties);

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
                            const unitClasses = gs.getCampaignVar('unitClasses') || {};
                            delete unitClasses[u.id];
                            gs.setCampaignVar('unitClasses', unitClasses);
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
            gs.setCampaignVar('unitXP', unitXP);
        }

        this.finalStats = {
            won: won,
            battleId: this.battleId,
            alliedCasualties: casualties,
            enemyCasualties: this.units.filter(u => u.faction === 'enemy' && u.hp <= 0).length,
            housesDestroyed: housesDestroyed,
            housesProtected: housesProtected,
            totalHouses: this.initialHouseCount || 0,
            turnNumber: this.turnNumber,
            xpGained: xpGained,
            recoveryInfo: recoveryInfo,
            levelUps: levelUps
        };
        
        // Store in gameState so callbacks can access it
        gs.set('lastBattleStats', this.finalStats);

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

    startFight() {
        // First show Liu Bei's line before starting the fight
        this.cleanupDialogueScript = [
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'gz_lb_fight_01',
                text: { en: "Brother, we cannot stand idle while injustice is done. Free him!", zh: "兄长，我们不能坐视不义。救他出来！" }
            }
        ];
        
        this.cleanupDialogueStep = 0;
        this.dialogueElapsed = 0;
        this.isCleanupDialogueActive = true;
        
        // Store the callback to call when dialogue ends
        this.cleanupDialogueOnComplete = () => {
            this.isCleanupDialogueActive = false;
            // Transition from encounter cutscene to actual battle
            // Keep the same map, units in same positions
            
            // Switch to battle music
            assets.playMusic('battle', 0.4);
            
            // Disable cutscene mode
            this.isCutscene = false;
            this.isFightMode = true;
            
            // Add the 3 existing campaign soldiers with their XP
            const gs = this.manager.gameState;
            const unitXP = gs.getCampaignVar('unitXP') || {};
            const unitClasses = gs.getCampaignVar('unitClasses') || {};
            
            const allyPositions = [
                { id: 'ally1', r: 5, q: 0 },
                { id: 'ally2', r: 7, q: 0 },
                { id: 'ally3', r: 4, q: 2 }
            ];
            
            allyPositions.forEach((allyDef) => {
                // Only add if not already present
                if (this.units.find(u => u.id === allyDef.id)) return;

                const cell = this.findNearestFreeCell(allyDef.r, allyDef.q, 3);
                if (cell) {
                    const xp = unitXP[allyDef.id] || 0;
                    const level = this.getLevelFromXP(xp);
                    const unitClass = unitClasses[allyDef.id] || 'soldier';
                    
                    const isArcher = unitClass === 'archer';
                    // Soldiers gain +1 HP at level 2+, archers stay at 2 base HP
                    const baseHp = isArcher ? 2 : (level >= 2 ? 3 : 2);
                    const finalMaxHp = this.getMaxHpForLevel(level, baseHp);
                    
                    const ally = new Unit(allyDef.id, {
                        name: 'Volunteer',
                        imgKey: isArcher ? 'archer' : 'soldier',
                        img: assets.getImage(isArcher ? 'archer' : 'soldier'),
                        faction: 'allied',
                        hp: finalMaxHp,
                        maxHp: finalMaxHp,
                        moveRange: 3,
                        attacks: isArcher ? ['arrow_shot'] : ['slash'],
                        r: cell.r,
                        q: cell.q,
                        level: level
                    });
                    this.units.push(ally);
                    cell.unit = ally;
                }
            });
            
            // Show objective
            this.addDamageNumber(this.manager.canvas.width / 2, 40, "BREAK THE CAGE!", '#ffd700');
            
            // Start with NPC phase so enemies get their first turn to move and telegraph
            this.startNpcPhase();
        };
        
        // Play first voice line
        const firstStep = this.cleanupDialogueScript[0];
        if (firstStep.voiceId) assets.playVoice(firstStep.voiceId);
    }

    startRestrainDialogue() {
        // Show dialogue on the tactics map after choosing to restrain Zhang Fei
        this.cleanupDialogueScript = [
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'gz_lb_restrain_01',
                text: { en: "The court will have its own public judgment. How can you act rashly?", zh: "朝廷自有公断。你怎能如此鲁莽？" }
            },
            {
                speaker: 'guanyu',
                portraitKey: 'guan-yu',
                name: 'Guan Yu',
                voiceId: 'gz_gy_restrain_01',
                text: { en: "It was wise to stay your hand, brother. The law must take its course. Let us return toward Zhuo.", zh: "兄长，你克制是对的。法律自有其道。让我们返回涿郡。" }
            },
            {
                speaker: 'zhangfei',
                portraitKey: 'zhang-fei',
                name: 'Zhang Fei',
                voiceId: 'gz_zf_restrain_01',
                text: { en: "BAH! This stinks of corruption! But... I will follow your lead, eldest brother.", zh: "呸！这真是腐败透顶！但是...我会听从你的，大哥。" }
            },
            {
                speaker: 'narrator',
                portraitKey: null,
                name: 'Narrator',
                voiceId: 'gz_nar_restrain_01',
                text: { en: "And so the escort and the three brothers went two ways. It was useless to continue on that road to Guangzong.", zh: "于是，护送队和三兄弟分道扬镳。继续走那条通往广宗的路已无意义。" }
            },
            {
                speaker: 'guanyu',
                portraitKey: 'guan-yu',
                name: 'Guan Yu',
                voiceId: 'gz_gy_return_01',
                text: { en: "Let us return toward Zhuo County. There is nothing more for us here.", zh: "让我们返回涿郡。这里已无事可做。" }
            }
        ];
        
        this.cleanupDialogueStep = 0;
        this.dialogueElapsed = 0;
        this.isCleanupDialogueActive = true;
        
        // Store the callback to call when dialogue ends
        this.cleanupDialogueOnComplete = () => {
            if (this.onChoiceRestrain) {
                this.onChoiceRestrain();
            }
        };
        
        // Play first voice line
        const firstStep = this.cleanupDialogueScript[0];
        if (firstStep.voiceId) assets.playVoice(firstStep.voiceId);
    }
    
    startDongZhuoVictoryDialogue() {
        // Show dialogue on the tactics map after defeating Yellow Turbans with Dong Zhuo
        const freedLuZhi = this.manager.gameState.hasMilestone('freed_luzhi');
        
        if (freedLuZhi) {
            // Outlaw path - Dong Zhuo recognizes them as the ones who freed Lu Zhi
            this.cleanupDialogueScript = [
                {
                    speaker: 'dongzhuo',
                    portraitKey: 'dong-zhuo',
                    name: 'Dong Zhuo',
                    voiceId: 'gz_dz_outlaw_01',
                    text: { en: "Wait... I know you. You're the ones who attacked imperial escorts and freed that traitor Lu Zhi!", zh: "等等...我认识你们。你们就是袭击朝廷护送队，放走那个叛徒卢植的人！" }
                },
                {
                    speaker: 'liubei',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'gz_lb_defend_01',
                    text: { en: "Lu Zhi was no traitor. He was unjustly accused by corrupt officials.", zh: "卢植不是叛徒。他是被腐败官员诬告的。" }
                },
                {
                    speaker: 'dongzhuo',
                    portraitKey: 'dong-zhuo',
                    name: 'Dong Zhuo',
                    voiceId: 'gz_dz_outlaw_02',
                    text: { en: "Hmph! You dare lecture me? I should have you arrested! But... you did save my life today. Leave now, before I change my mind.", zh: "哼！你敢教训我？我应该逮捕你们！但是...你们今天确实救了我的命。现在离开，在我改变主意之前。" }
                },
                {
                    speaker: 'zhangfei',
                    portraitKey: 'zhang-fei',
                    name: 'Zhang Fei',
                    voiceId: 'gz_zf_rage_outlaw_01',
                    text: { en: "The nerve of that swine! First we save Lu Zhi from injustice, now we save Dong Zhuo from death, and this is our thanks?! Nothing but his death can slake my anger!", zh: "那个混蛋真是无礼！我们先救了卢植免于不义，现在又救了董卓免于死亡，这就是我们的回报？！只有他的死才能平息我的怒火！" }
                }
            ];
        } else {
            // Lawful path - Dong Zhuo is just rude because they have no rank
            this.cleanupDialogueScript = [
                {
                    speaker: 'dongzhuo',
                    portraitKey: 'dong-zhuo',
                    name: 'Dong Zhuo',
                    voiceId: 'gz_dz_01',
                    text: { en: "What offices do you three hold?", zh: "你们三人身居何职？" }
                },
                {
                    speaker: 'liubei',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'gz_lb_office_01',
                    text: { en: "None.", zh: "无。" }
                },
                {
                    speaker: 'dongzhuo',
                    portraitKey: 'dong-zhuo',
                    name: 'Dong Zhuo',
                    voiceId: 'gz_dz_02',
                    text: { en: "Hmph. Common men with no rank. You may go.", zh: "哼。无官无职的平民。你们可以走了。" }
                },
                {
                    speaker: 'zhangfei',
                    portraitKey: 'zhang-fei',
                    name: 'Zhang Fei',
                    voiceId: 'gz_zf_rage_01',
                    text: { en: "We have just rescued this menial in a bloody fight, and now he is rude to us! Nothing but his death can slake my anger.", zh: "我们刚刚在一场血战中救了这个小人物，现在他却对我们无礼！只有他的死才能平息我的怒火。" }
                }
            ];
            // No Liu Bei restraint line here anymore
        }
        
        this.cleanupDialogueStep = 0;
        this.dialogueElapsed = 0;
        this.isCleanupDialogueActive = true;
        
        // This is a cutscene now
        this.isCutscene = true;
        this.isGameOver = false;
        
        // Store the callback to call when dialogue ends
        this.cleanupDialogueOnComplete = () => {
            this.isCutscene = false;
            this.endBattle(true);
        };
        
        // Play first voice line
        const firstStep = this.cleanupDialogueScript[0];
        if (firstStep.voiceId) assets.playVoice(firstStep.voiceId);
    }

    startNpcPhase() {
        // For yellow_turban_rout cutscene, alternate between enemy and allied phases
        if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatTurns !== undefined) {
            // Determine which phase based on current turn state
            const isEnemyPhase = this.turn === 'enemy' || this.turn === 'enemy_moving';
            this.turn = isEnemyPhase ? 'enemy_moving' : 'allied_moving';
        } else {
            this.turn = 'allied_moving';
        }
        
        this.isProcessingTurn = true;

        // Riderless horses wander a bit before allies act
        this.wanderRiderlessHorses();
        
        // Clear old intents before starting new phase
        // But preserve intents for NPCs that have already acted (they've already moved and telegraphed)
        // And preserve hasActed for NPCs that have already acted (to prevent double-acting on restore)
        this.units.forEach(u => {
            if (u.faction !== 'player') {
                // Only clear intent if the NPC hasn't acted yet (restoring mid-phase)
                // If they've already acted, they've already moved and telegraphed, so keep their intent
                if (!u.hasActed) {
                    u.intent = null;
                }
                // Always clear attackOrder - it will be reassigned by telegraphAllNpcs() if they have an intent
                u.attackOrder = null;
                // Don't reset hasActed here - it's used to track which NPCs have acted in this phase
                // It will be reset at the start of the next turn cycle
            }
        });
        
        // Caged units cannot act - they're trapped!
        // Filter out NPCs that have already acted in this phase (to prevent double-acting on restore)
        const allies = this.units.filter(u => u.faction === 'allied' && u.hp > 0 && !u.caged && !u.hasActed);
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0 && !u.caged && !u.hasActed);
        
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
        
        // Normal battle flow: Allied Phase first, then Enemy Phase
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
                            // Reset hasActed for all NPCs now that the phase is complete
                            // This prepares them for the next turn cycle
                            this.units.forEach(u => {
                                if (u.faction !== 'player') {
                                    u.hasActed = false;
                                }
                            });
                            // Special handling for yellow_turban_rout cutscene - skip player turn, go straight to execution
                            if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatComplete !== undefined) {
                                this.startExecutionPhase();
                            } else {
                                this.startPlayerTurn();
                            }
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

        // Determine valid targets based on faction
        // - Enemies target player and allied units, but NOT caged allies (they're protecting the cage)
        // - Allies target enemy units AND caged allies (to free them by breaking the cage)
        const unitTargets = this.units.filter(u => {
            if (u.hp <= 0) return false;
            
            if (unit.faction === 'enemy') {
                // Enemies attack player and allied units, but NOT caged ones
                if (u.caged) return false;  // Don't attack the prisoner you're escorting!
                return u.faction === 'player' || u.faction === 'allied';
            } else {
                // Allied soldiers attack enemies OR caged allies (to break the cage)
                if (u.faction === 'enemy') return true;
                if (u.caged && u.faction === 'allied') return true;  // Attack cage to free ally
                return false;
            }
        });
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

        // Mounted units must also have a valid head hex at the destination.
        // Use the PLANNED flip for each tile (determined by the final approach direction),
        // otherwise a destination that requires turning would incorrectly check the head
        // on the wrong side and be rejected even when no collision would occur.
        if (unit.onHorse) {
            const filtered = new Map();
            validDestinations.forEach((data, key) => {
                const [r, q] = key.split(',').map(Number);
                // Determine which way the horse will face when arriving at (r, q)
                let plannedFlip = unit.flip;
                if (data.parent) {
                    const [prevR, prevQ] = data.parent.split(',').map(Number);
                    const arrivePos = this.getPixelPos(r, q);
                    const fromPos   = this.getPixelPos(prevR, prevQ);
                    if (arrivePos.x < fromPos.x) plannedFlip = true;
                    else if (arrivePos.x > fromPos.x) plannedFlip = false;
                }
                if (this.isValidMountedButtDestination(unit, r, q, plannedFlip)) filtered.set(key, data);
            });
            validDestinations.clear();
            filtered.forEach((v, k) => validDestinations.set(k, v));
        }

        // 1. Check if we can reach a unit to attack it
        let unitAttackTiles = [];
        validDestinations.forEach((data, key) => {
            const [r, q] = key.split(',').map(Number);
            
            // Look for targets within range from this tile
            unitTargets.forEach(t => {
                let dist = this.tacticsMap.getDistance(r, q, t.r, t.q);
                if (unit.onHorse) {
                    const headCell = this.getMountedHeadCellFor(unit, r, q);
                    if (headCell) {
                        const headDist = this.tacticsMap.getDistance(headCell.r, headCell.q, t.r, t.q);
                        dist = Math.min(dist, headDist);
                    }
                }
                if (dist >= minRange && dist <= maxRange) {
                    unitAttackTiles.push({ r, q, target: t });
                }
            });
        });

        if (unitAttackTiles.length > 0) {
            // Rank potential attacks by distance, dog-piling, and type
            const isRanged = maxRange > 1;
            
            unitAttackTiles.sort((a, b) => {
                const distA = this.tacticsMap.getDistance(a.r, a.q, a.target.r, a.target.q);
                const distB = this.tacticsMap.getDistance(b.r, b.q, b.target.r, b.target.q);
                
                // Base score: Melee prefers close, Ranged prefers far
                let scoreA = isRanged ? distA : (10 - distA);
                let scoreB = isRanged ? distB : (10 - distB);
                
                // Randomized jitter (0-2 points)
                scoreA += Math.random() * 2;
                scoreB += Math.random() * 2;
                
                // Penalty for dog-piling: Check if another unit of same faction already targeting this unit
                const targetersA = this.units.filter(u => u !== unit && u.faction === unit.faction && u.intent && u.intent.targetId === a.target.id).length;
                const targetersB = this.units.filter(u => u !== unit && u.faction === unit.faction && u.intent && u.intent.targetId === b.target.id).length;
                
                scoreA -= targetersA * 3;
                scoreB -= targetersB * 3;

                // Priority for Dong Zhuo for enemies (but with the dog-piling penalty it should balance out)
                if (unit.faction === 'enemy' && a.target.id === 'dongzhuo') scoreA += 4;
                if (unit.faction === 'enemy' && b.target.id === 'dongzhuo') scoreB += 4;

                return scoreB - scoreA;
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

        // If we can't line up an attack, try to mount a reachable riderless horse
        if (!unit.onHorse && unitAttackTiles.length === 0) {
            let bestHorse = null;
            let bestHorseCost = Infinity;
            validDestinations.forEach((data, key) => {
                const [r, q] = key.split(',').map(Number);
                const cell = this.tacticsMap.getCell(r, q);
                if (cell?.horse && !cell.horse.riderId) {
                    if (data.cost < bestHorseCost) {
                        bestHorseCost = data.cost;
                        bestHorse = { r, q };
                    }
                }
            });
            if (bestHorse) {
                bestTile = bestHorse;
            }
        }

        // 3. If no immediate attacks possible, move towards the nearest unit (or house)
        if (!chosenTargetPos) {
            let nearestTargetPos = null;
            let minDist = Infinity;

            if (unitTargets.length > 0) {
                // Get all targets with distances
                const targetsWithDist = unitTargets.map(t => ({
                    t,
                    dist: this.tacticsMap.getDistance(unit.r, unit.q, t.r, t.q)
                })).sort((a, b) => a.dist - b.dist);

                // 30% chance to pick second nearest if it exists, to split up forces
                if (targetsWithDist.length > 1 && Math.random() < 0.3) {
                    nearestTargetPos = { r: targetsWithDist[1].t.r, q: targetsWithDist[1].t.q };
                } else {
                    nearestTargetPos = { r: targetsWithDist[0].t.r, q: targetsWithDist[0].t.q };
                }
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
        if (path && path.length > 1) {
            // Unit needs to move
            const oldCell = this.tacticsMap.getCell(unit.r, unit.q);
            if (oldCell) oldCell.unit = null;
            if (unit.onHorse) {
                const oldHead = this.getMountedHeadCellFor(unit, unit.r, unit.q);
                if (oldHead) oldHead.unit = null;
                const horse = this.getHorseById(unit.horseId);
                if (horse) {
                    this.clearHorseFromCells(horse);
                }
            }
            unit.startPath(path);
            this.tacticsMap.getCell(bestTile.r, bestTile.q).unit = unit;
            if (unit.onHorse) {
                // Reserve head hex based on the FINAL movement direction (last step)
                let plannedFlip = unit.flip;
                if (path.length >= 2) {
                    const prev = path[path.length - 2];
                    const last = path[path.length - 1];
                    const prevPos = this.getPixelPos(prev.r, prev.q);
                    const lastPos = this.getPixelPos(last.r, last.q);
                    if (lastPos.x < prevPos.x) plannedFlip = true;
                    else if (lastPos.x > prevPos.x) plannedFlip = false;
                }
                const tmp = { ...unit, flip: plannedFlip };
                const headCell = this.getMountedHeadCellFor(tmp, bestTile.r, bestTile.q);
                if (headCell) headCell.unit = unit;
            }
            
            const checkDone = () => {
                if (!unit.isMoving) {
                    // Update horse position + facing based on final movement direction
                    if (unit.onHorse) {
                        const horse = this.getHorseById(unit.horseId);
                        if (horse) {
                            horse.r = unit.r;
                            horse.q = unit.q;
                            horse.flip = !!unit.flip;
                            this.placeHorseOnCells(horse);
                        }
                        // Ensure the unit occupies the correct head hex for its final facing
                        this.syncMountedOccupancy(unit);
                    }
                    if (!unit.onHorse) {
                        this.tryAutoMount(unit, unit.r, unit.q);
                    }
                    // Mark unit as having acted (moved) to prevent double-acting on restore
                    unit.hasActed = true;
                    unit.hasMoved = true;
                    this.telegraphSingleNpc(unit);
                    onComplete();
                } else {
                    setTimeout(checkDone, 100);
                }
            };
            checkDone();
        } else {
            // Unit is already in position or can't move - just telegraph
            // Mark as having acted to prevent double-acting on restore
            unit.hasActed = true;
            unit.hasMoved = true;
            this.telegraphSingleNpc(unit);
            onComplete();
        }
    }

    telegraphSingleNpc(unit) {
        const attackKey = unit.attacks[0] || 'stab';
        const attackConfig = ATTACKS[attackKey] || ATTACKS.stab;
        const minRange = attackConfig.minRange || 1;
        const maxRange = attackConfig.range || 1;
        
        // Same targeting logic as moveNpcAndTelegraph:
        // - Enemies target player and allied units, but NOT caged allies
        // - Allies target enemy units AND caged allies (to free them)
        const unitTargets = this.units.filter(u => {
            if (u.hp <= 0) return false;
            
            if (unit.faction === 'enemy') {
                if (u.caged) return false;  // Don't attack the prisoner!
                return u.faction === 'player' || u.faction === 'allied';
            } else {
                if (u.faction === 'enemy') return true;
                if (u.caged && u.faction === 'allied') return true;  // Attack cage to free ally
                return false;
            }
        });
        
        const targetUnit = unitTargets.find(t => {
            const origins = this.getAttackOrigins(unit);
            return origins.some(o => {
                const dist = this.tacticsMap.getDistance(o.r, o.q, t.r, t.q);
                return dist >= minRange && dist <= maxRange;
            });
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
            // Facing logic (mounted units must turn-in-place by swapping butt/head anchor)
            const startA = this.getPixelPos(unit.r, unit.q);
            let midX = startA.x;
            if (unit.onHorse) {
                const head = this.getMountedHeadCellFor(unit, unit.r, unit.q);
                if (head) {
                    const startB = this.getPixelPos(head.r, head.q);
                    midX = (startA.x + startB.x) / 2;
                }
            }
            const endPos = this.getPixelPos(targetPos.r, targetPos.q);
            let desiredFlip = unit.flip;
            if (endPos.x < midX) desiredFlip = true;
            else if (endPos.x > midX) desiredFlip = false;

            if (unit.onHorse) this.turnMountedInPlace(unit, desiredFlip);
            else unit.flip = desiredFlip;

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
            ambushTriggered: !!this.ambushTriggered,
            reachedFlag: !!this.reachedFlag,
            weatherType: this.weatherType,
            mapGen: this.mapGenParams,
            grid: this.tacticsMap.grid.map(row => row.map(cell => ({
                terrain: cell.terrain,
                level: cell.level,
                elevation: cell.elevation,
                impassable: cell.impassable
            }))),
            // Horse entities (mounted + riderless)
            horses: (this.horses || []).map(h => ({
                id: h.id,
                riderId: h.riderId || null,
                r: h.r,
                q: h.q,
                flip: !!h.flip,
                type: h.type || 'brown'
            })),
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
                baseMoveRange: u.baseMoveRange,
                onHorse: !!u.onHorse,
                horseId: u.horseId || null,
                horseType: u.horseType || 'brown',
                hasMoved: u.hasMoved,
                hasAttacked: u.hasAttacked,
                hasActed: u.hasActed,
                attacks: u.attacks,
                intent: u.intent ? { ...u.intent } : null,
                action: u.action,
                isDrowning: u.isDrowning,
                isGone: u.isGone,
                flip: u.flip,
                caged: u.caged,
                cageHp: u.cageHp,
                cageSprite: u.cageSprite
            })),
            // Save intro/post-combat dialogue state
            isIntroDialogueActive: this.isIntroDialogueActive,
            dialogueStep: this.dialogueStep,
            subStep: this.subStep,
            dialogueElapsed: this.dialogueElapsed,
            isIntroAnimating: this.isIntroAnimating,
            introTimer: this.introTimer,
            // Track if we're in post-combat dialogue (uses introScript but different source)
            isPostCombatDialogue: this.isPostCombatDialogue || false,
            // Save combat state
            isProcessingTurn: this.isProcessingTurn,
            // Save cutscene combat complete flag for yellow_turban_rout
            cutsceneCombatComplete: this.cutsceneCombatComplete
        };
    }

    pushHistory() {
        this.history.push(this.captureState());
    }

    getIntentTargetCell(unit) {
        if (!unit || !unit.intent) return null;
        if (unit.intent.relX === undefined) return null;

        const currentCube = this.tacticsMap.offsetToCube(unit.r, unit.q);
        const targetCube = {
            x: currentCube.x + unit.intent.relX,
            y: currentCube.y + unit.intent.relY,
            z: currentCube.z + unit.intent.relZ
        };

        // Normal: exact relative target
        const exact = this.tacticsMap.getCellByCube(targetCube.x, targetCube.y, targetCube.z);
        if (exact) return exact;

        // Fallback: if the relative target is off-map (common after pushes/dismounts near edges),
        // pick the nearest in-bounds cell along that same direction.
        const dx = unit.intent.relX;
        const dy = unit.intent.relY;
        const dz = unit.intent.relZ;
        const dist = Math.max(0, (Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) / 2);
        if (dist <= 0) return null;

        for (let i = dist - 1; i >= 1; i--) {
            const t = i / dist;

            // Cube lerp + round (same approach as TacticsMap.getLine)
            const q = currentCube.x + (targetCube.x - currentCube.x) * t;
            const r = currentCube.z + (targetCube.z - currentCube.z) * t;
            const s = -q - r;

            let rq = Math.round(q);
            let rr = Math.round(r);
            let rs = Math.round(s);

            const qDiff = Math.abs(rq - q);
            const rDiff = Math.abs(rr - r);
            const sDiff = Math.abs(rs - s);

            if (qDiff > rDiff && qDiff > sDiff) {
                rq = -rr - rs;
            } else if (rDiff > sDiff) {
                rr = -rq - rs;
            } else {
                rs = -rq - rr;
            }

            const cell = this.tacticsMap.getCellByCube(rq, rs, rr);
            if (cell) return cell;
        }

        return null;
    }

    restoreBattleState(state) {
        if (!state) return;
        const config = this.manager.config;
        
        this.turn = state.turn;
        this.turnNumber = state.turnNumber;
        this.ambushTriggered = !!state.ambushTriggered;
        this.reachedFlag = !!state.reachedFlag;
        this.weatherType = state.weatherType;
        this.horses = [];
        
        // Restore Grid
        for (let r = 0; r < config.mapHeight; r++) {
            for (let q = 0; q < config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                const savedCell = state.grid[r][q];
                if (savedCell) {
                    cell.terrain = savedCell.terrain;
                    cell.level = savedCell.level;
                    cell.elevation = savedCell.elevation;
                    cell.impassable = savedCell.impassable;
                }
                cell.unit = null; // Clear all units first
                cell.horse = null; // Clear all horses first
            }
        }

        // First, place all units using the battle definition (they'll be created in default positions)
        this.placeInitialUnits();
        
        // Now restore unit states from saved data (positions, HP, etc.)
        state.units.forEach(uData => {
            let u = this.units.find(unit => unit.id === uData.id);
            if (!u) {
                // Dynamically spawned units (e.g. Qingzhou reinforcements/ambush units)
                // may not exist in battle definitions. Recreate them from save data.
                u = new Unit(uData.id, {
                    id: uData.id,
                    name: uData.name,
                    imgKey: uData.imgKey,
                    img: assets.getImage(uData.imgKey),
                    faction: uData.faction,
                    r: uData.r,
                    q: uData.q,
                    hp: uData.hp,
                    maxHp: uData.maxHp,
                    moveRange: uData.moveRange,
                    baseMoveRange: uData.baseMoveRange !== undefined ? uData.baseMoveRange : uData.moveRange,
                    onHorse: !!uData.onHorse,
                    horseId: uData.horseId || null,
                    horseType: uData.horseType || 'brown',
                    hasMoved: !!uData.hasMoved,
                    hasAttacked: !!uData.hasAttacked,
                    hasActed: !!uData.hasActed,
                    attacks: uData.attacks || [],
                    intent: uData.intent ? { ...uData.intent } : null,
                    action: uData.action || 'standby',
                    isDrowning: !!uData.isDrowning,
                    isGone: !!uData.isGone,
                    flip: !!uData.flip,
                    caged: !!uData.caged,
                    cageHp: uData.cageHp,
                    cageSprite: uData.cageSprite
                });
                this.units.push(u);
            }

            u.r = uData.r;
            u.q = uData.q;
            u.hp = uData.hp;
            u.maxHp = uData.maxHp;
            u.moveRange = uData.moveRange !== undefined ? uData.moveRange : u.moveRange;
            u.baseMoveRange = uData.baseMoveRange !== undefined ? uData.baseMoveRange : (u.baseMoveRange !== undefined ? u.baseMoveRange : u.moveRange);
            u.onHorse = !!uData.onHorse;
            u.horseId = uData.horseId || null;
            u.horseType = uData.horseType || u.horseType || 'brown';
            u.imgKey = uData.imgKey;
            u.img = assets.getImage(uData.imgKey);
            u.hasMoved = uData.hasMoved;
            u.hasAttacked = uData.hasAttacked;
            u.hasActed = uData.hasActed;
            // Defensive: If an NPC has moved, they should have acted
            if (u.faction !== 'player' && u.hasMoved && !u.hasActed) {
                u.hasActed = true;
            }
            u.intent = uData.intent ? { ...uData.intent } : null;
            u.action = uData.action || 'standby';
            u.isDrowning = uData.isDrowning || false;
            u.isGone = uData.isGone || false;
            u.flip = uData.flip || false;
            u.caged = uData.caged || false;
            u.cageHp = uData.cageHp;
            u.cageSprite = uData.cageSprite;

            // Clear animation states
            u.frame = 0;
            u.isMoving = false;
            u.path = [];
            u.pushData = null;
            u.shakeTimer = 0;
            u.visualOffsetX = 0;
            u.visualOffsetY = 0;

            const cell = this.tacticsMap.getCell(u.r, u.q);
            if (u.onHorse) {
                this.syncMountedOccupancy(u);
            } else {
                if (cell) cell.unit = u;
            }
        });

        // Restore horses (new saves) or reconstruct them from mounted units (old saves)
        const savedHorses = state.horses;
        if (Array.isArray(savedHorses)) {
            this.horses = savedHorses.map(h => ({ ...h, flip: !!h.flip, riderId: h.riderId || null, type: h.type || 'brown' }));
        } else {
            this.horses = this.units
                .filter(u => u.hp > 0 && u.onHorse)
                .map(u => ({ id: u.horseId || `horse_${u.id}`, riderId: u.id, r: u.r, q: u.q, flip: !!u.flip, type: u.horseType || 'brown' }));
        }
        this.horses.forEach(h => this.placeHorseOnCells(h));

        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.attackRects = [];
        this.activeDialogue = null;
        
        // Restore intro/post-combat dialogue state
        this.isIntroDialogueActive = state.isIntroDialogueActive || false;
        this.dialogueStep = state.dialogueStep || 0;
        this.subStep = state.subStep || 0;
        this.dialogueElapsed = state.dialogueElapsed || 0;
        this.isIntroAnimating = state.isIntroAnimating || false;
        this.introTimer = state.introTimer || 0;
        this.isPostCombatDialogue = state.isPostCombatDialogue || false;
        this.cutsceneCombatComplete = state.cutsceneCombatComplete;
        
        // Restore intro or post-combat script from battle definition if dialogue is active
        if (this.isIntroDialogueActive) {
            const battleDef = BATTLES[this.battleId];
            if (this.isPostCombatDialogue && battleDef && battleDef.postCombatScript) {
                // Restore post-combat script
                this.introScript = battleDef.postCombatScript;
            } else if (battleDef && battleDef.introScript) {
                // Restore intro script
                this.introScript = battleDef.introScript;
            }
            
            // Validate dialogueStep is within bounds
            if (this.introScript && this.dialogueStep >= this.introScript.length) {
                // dialogueStep is out of bounds - reset to last valid step
                console.warn(`dialogueStep ${this.dialogueStep} out of bounds for script length ${this.introScript.length}, resetting to last step`);
                this.dialogueStep = Math.max(0, this.introScript.length - 1);
            }
        }
        
        // Restore combat state exactly as it was
        this.isProcessingTurn = state.isProcessingTurn !== undefined ? state.isProcessingTurn : false;
        
        // For player turn, ensure they can act (isProcessingTurn should be false)
        if (this.turn === 'player') {
            this.isProcessingTurn = false;
        }
        
        // If we're restoring mid-NPC-phase, we can't continue the async operations (setTimeouts are lost)
        // But we can detect where we are and continue from the right point
        if ((this.turn === 'enemy' || this.turn === 'enemy_moving' || this.turn === 'allied_moving')) {
            const npcs = this.units.filter(u => 
                (u.faction === 'enemy' || u.faction === 'allied') && 
                u.hp > 0 && 
                !u.caged && 
                !u.isGone
            );
            const hasIntents = npcs.some(npc => npc.intent);
            const allNpcsActed = npcs.length > 0 && npcs.every(npc => npc.hasActed);
            
            if (this.isProcessingTurn) {
                // Mid-NPC-phase: NPCs are still moving
                // Don't start execution phase yet - wait for ALL NPCs to finish moving first
                if (allNpcsActed) {
                    // All NPCs have finished moving - now we can check what to do next
                    if (hasIntents) {
                        // All NPCs have moved and some have intents - call telegraphAllNpcs() then go to execution
                        this.isIntroDialogueActive = false;
                        this.isPostCombatDialogue = false;
                        this.isProcessingTurn = false;
                        this.telegraphAllNpcs();
                        this.turn = 'execution';
                        setTimeout(() => {
                            this.startExecutionPhase();
                        }, 100);
                    } else {
                        // All NPCs have acted but no intents - phase is complete, move to player turn
                        this.isProcessingTurn = false;
                        setTimeout(() => {
                            this.startPlayerTurn();
                        }, 100);
                    }
                } else {
                    // Some NPCs haven't acted yet - restart the phase
                    // startNpcPhase() now skips NPCs that have already acted (hasActed = true)
                    this.isProcessingTurn = false;
                    setTimeout(() => {
                        this.startNpcPhase();
                    }, 100);
                }
            } else {
                // NPC phase completed (isProcessingTurn = false) - check if we should go to execution
                if (hasIntents) {
                    // NPCs have finished moving and have intents - call telegraphAllNpcs() to assign attack orders, then go to execution
                    // Ensure intro dialogue is not active (we're in combat, not dialogue)
                    this.isIntroDialogueActive = false;
                    this.isPostCombatDialogue = false;
                    this.telegraphAllNpcs();
                    this.turn = 'execution';
                    setTimeout(() => {
                        this.startExecutionPhase();
                    }, 100);
                } else if (allNpcsActed) {
                    // All NPCs have acted but no intents found in saved state
                    // This could happen if intents weren't saved properly, or if NPCs moved but couldn't find targets
                    // Try to recreate intents by calling telegraphAllNpcs() (which assigns orders to existing intents)
                    // But first, if NPCs have moved, they should have intents - try to recreate them
                    const npcsThatMoved = npcs.filter(npc => npc.hasMoved);
                    if (npcsThatMoved.length > 0) {
                        // NPCs have moved but no intents - try to recreate intents for NPCs that can attack
                        npcsThatMoved.forEach(npc => {
                            if (!npc.intent && npc.attacks && npc.attacks.length > 0) {
                                // Recreate intent for this NPC
                                this.telegraphSingleNpc(npc);
                            }
                        });
                    }
                    
                    // Call telegraphAllNpcs() to assign attack orders
                    this.telegraphAllNpcs();
                    
                    // Check again if intents exist
                    const npcsAfterTelegraph = this.units.filter(u => 
                        (u.faction === 'enemy' || u.faction === 'allied') && 
                        u.hp > 0 && 
                        !u.caged && 
                        !u.isGone
                    );
                    const hasIntentsAfterTelegraph = npcsAfterTelegraph.some(npc => npc.intent);
                    
                    if (hasIntentsAfterTelegraph) {
                        // NPCs now have intents - go to execution phase
                        // Ensure intro dialogue is not active (we're in combat, not dialogue)
                        this.isIntroDialogueActive = false;
                        this.isPostCombatDialogue = false;
                        this.turn = 'execution';
                        setTimeout(() => {
                            this.startExecutionPhase();
                        }, 100);
                    } else {
                        // Still no intents - NPCs can't attack, so move to next phase
                        // For yellow_turban_rout cutscene, check if execution already completed
                        if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatComplete !== undefined) {
                            this.turn = 'execution';
                            setTimeout(() => {
                                // Check if execution phase should complete or if we need to start it
                                const attackers = this.units.filter(u => u.hp > 0 && u.intent && u.intent.type === 'attack');
                                if (attackers.length === 0) {
                                    // No attackers with intents - execution may have completed, check for post-combat
                                    this.checkCutsceneCombatComplete();
                                } else {
                                    this.startExecutionPhase();
                                }
                            }, 100);
                        } else {
                            setTimeout(() => {
                                this.startPlayerTurn();
                            }, 100);
                        }
                    }
                } else {
                    // Some NPCs haven't acted yet - restart the phase
                    this.isProcessingTurn = false;
                    setTimeout(() => {
                        this.startNpcPhase();
                    }, 100);
                }
            }
        } else if (this.turn === 'execution') {
            if (this.isProcessingTurn) {
                // Execution phase was interrupted - restart it
                this.isProcessingTurn = false;
                setTimeout(() => {
                    this.startExecutionPhase();
                }, 100);
            } else {
                // Execution phase has completed - check if we need to trigger post-combat dialogue
                // Check if there are any attackers with intents left (execution not actually complete)
                const attackers = this.units.filter(u => u.hp > 0 && u.intent && u.intent.type === 'attack');
                
                if (attackers.length > 0) {
                    // There are still attacks to execute - restart execution phase
                    this.isProcessingTurn = false;
                    setTimeout(() => {
                        this.startExecutionPhase();
                    }, 100);
                } else {
                    // All attacks have been executed - trigger post-execution logic
                    // For yellow_turban_rout, check if we should show post-combat dialogue
                    if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatComplete !== undefined) {
                        // Check if we're already in post-combat dialogue
                        if (this.isPostCombatDialogue && this.isIntroDialogueActive) {
                            // Already in post-combat dialogue - ensure script is loaded and dialogueStep is valid
                            const battleDef = BATTLES[this.battleId];
                            if (battleDef && battleDef.postCombatScript) {
                                this.introScript = battleDef.postCombatScript;
                                // Validate dialogueStep is within bounds
                                if (this.dialogueStep >= this.introScript.length) {
                                    console.warn(`dialogueStep ${this.dialogueStep} out of bounds for post-combat script length ${this.introScript.length}, resetting to last step`);
                                    this.dialogueStep = Math.max(0, this.introScript.length - 1);
                                }
                            }
                            // The dialogue should continue from where it was saved
                        } else if (!this.isPostCombatDialogue && !this.isIntroDialogueActive) {
                            // Execution completed, but post-combat sequence hasn't started
                            // Check if retreat sequence has already completed (soldiers gone, brothers in center)
                            const soldiers = this.units.filter(u => u.id.startsWith('soldier') && u.hp > 0 && !u.isGone);
                            const zhangBrothers = this.units.filter(u => (u.id === 'zhangjue' || u.id === 'zhangbao' || u.id === 'zhangliang') && u.hp > 0);
                            const centerR = Math.floor(this.manager.config.mapHeight / 2);
                            const centerQ = Math.floor(this.manager.config.mapWidth / 2);
                            const brothersInCenter = zhangBrothers.every(brother => {
                                const dist = Math.abs(brother.r - centerR) + Math.abs(brother.q - centerQ);
                                return dist <= 1; // Within 1 hex of center
                            });
                            
                            if (soldiers.length === 0 && brothersInCenter && zhangBrothers.length > 0) {
                                // Retreat sequence has completed - start post-combat dialogue directly
                                setTimeout(() => {
                                    this.isProcessingTurn = false;
                                    this.startPostCombatDialogue();
                                }, 100);
                            } else {
                                // Need to run retreat sequence
                                setTimeout(() => {
                                    this.checkCutsceneCombatComplete();
                                }, 100);
                            }
                        }
                    } else {
                        // For other battles, check win/loss conditions
                        setTimeout(() => {
                            this.checkWinLoss();
                            if (!this.isGameOver) {
                                this.turnNumber++;
                                this.startNpcPhase();
                            }
                        }, 100);
                    }
                }
            }
        }
        
        // Initialize history for undo
        this.history = [];
        this.pushHistory();
    }

    restoreState(state) {
        if (!state) return;
        const config = this.manager.config;
        
        this.turn = state.turn;
        this.turnNumber = state.turnNumber;
        this.weatherType = state.weatherType;
        this.horses = [];
        
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
                cell.horse = null; // Clear all horses first
            }
        }

        // Restore horses (new saves) or reconstruct from mounted units (older history entries)
        const savedHorses = state.horses;
        if (Array.isArray(savedHorses)) {
            this.horses = savedHorses.map(h => ({ ...h, flip: !!h.flip, riderId: h.riderId || null }));
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
            u.moveRange = uData.moveRange !== undefined ? uData.moveRange : u.moveRange;
            u.baseMoveRange = uData.baseMoveRange !== undefined ? uData.baseMoveRange : (u.baseMoveRange !== undefined ? u.baseMoveRange : u.moveRange);
            u.onHorse = !!uData.onHorse;
            u.horseId = uData.horseId || null;
            u.horseType = uData.horseType || u.horseType || 'brown';
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
            u.caged = uData.caged || false;
            u.cageHp = uData.cageHp;
            u.cageSprite = uData.cageSprite;

            // Clear animation states
            u.frame = 0;
            u.isMoving = false;
            u.path = [];
            u.pushData = null;
            u.shakeTimer = 0;
            u.visualOffsetX = 0;
            u.visualOffsetY = 0;

            const cell = this.tacticsMap.getCell(u.r, u.q);
            if (u.onHorse) {
                this.syncMountedOccupancy(u);
            } else {
                if (cell) cell.unit = u;
            }
        });

        // If history entry didn't include horses, rebuild from mounted units
        if (!Array.isArray(savedHorses)) {
            this.horses = this.units
                .filter(u => u.hp > 0 && u.onHorse)
                .map(u => ({ id: u.horseId || `horse_${u.id}`, riderId: u.id, r: u.r, q: u.q, flip: !!u.flip, type: u.horseType || 'brown' }));
        }
        this.horses.forEach(h => this.placeHorseOnCells(h));

        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.attackRects = [];
        this.activeDialogue = null;
        this.mountedMovePlans = null;
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

    exit() {
        // Save battle state when leaving (unless it's a custom battle or battle is complete)
        if (!this.isCustom && !this.isGameOver && !this.isVictoryDialogueActive) {
            this.saveBattleState();
        }
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
        if (this.isIntroDialogueActive) {
            console.warn('startExecutionPhase() called but isIntroDialogueActive is true - returning early');
            return; // Wait for intro
        }
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
        
        if (attackers.length === 0) {
            console.warn('startExecutionPhase() called but no attackers found with intents. Units with intents:', 
                this.units.filter(u => u.intent).map(u => ({ id: u.id, intent: u.intent })));
            // No attackers - execution phase completes immediately
            // For yellow_turban_rout, check if we should go to post-combat
            if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatComplete !== undefined) {
                this.isProcessingTurn = false;
                setTimeout(() => {
                    this.checkCutsceneCombatComplete();
                }, 100);
            } else {
                this.isProcessingTurn = false;
                setTimeout(() => {
                    this.checkWinLoss();
                    if (!this.isGameOver) {
                        this.turnNumber++;
                        this.startNpcPhase();
                    }
                }, 100);
            }
            return;
        }
        
        const executeAll = (index) => {
            if (index >= attackers.length) {
                // Short pause after the final attack before next phase
                setTimeout(() => {
                    // Special handling for yellow_turban_rout cutscene
                    if (this.battleId === 'yellow_turban_rout' && this.cutsceneCombatComplete !== undefined) {
                        // Mark execution as complete
                        this.isProcessingTurn = false;
                        this.checkCutsceneCombatComplete();
                        return;
                    }
                    
                    this.isProcessingTurn = false;
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
                    // Alternate between weak (2HP) and normal (3HP) Yellow Turbans
                    const isWeak = spawns % 2 === 0;
                    const config = {
                        name: "Yellow Turban",
                        imgKey: 'yellowturban',
                        faction: 'enemy',
                        hp: isWeak ? 2 : 3,
                        maxHp: isWeak ? 2 : 3,
                        level: isWeak ? 1 : 2,
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
                    // Alternate between weak (2HP) and normal (3HP) Yellow Turbans
                    const isWeak = i % 2 === 0;
                    const config = {
                        name: "Yellow Turban",
                        imgKey: 'yellowturban',
                        faction: 'enemy',
                        hp: isWeak ? 2 : 3,
                        maxHp: isWeak ? 2 : 3,
                        level: isWeak ? 1 : 2,
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
        const victim = targetCell ? this.getRiderUnitFromCell(targetCell) : null;
        const isDestructible = targetCell && (targetCell.terrain.includes('house') || targetCell.terrain.includes('ice')) && !targetCell.terrain.includes('destroyed') && !targetCell.terrain.includes('broken');

        // Play attack sound
        if (attackKey.startsWith('serpent_spear')) assets.playSound('stab');
        else if (attackKey.startsWith('green_dragon_slash')) assets.playSound('green_dragon');
        else if (attackKey === 'tyrant_sweep') assets.playSound('green_dragon');  // Same sound as green dragon
        else if (attackKey === 'double_blades') assets.playSound('double_blades');
        else if (attackKey === 'bash') assets.playSound('bash');
        else if (attackKey.startsWith('slash')) assets.playSound('slash');
        else if (attackKey === 'stab') assets.playSound('stab');

        const targetPos = this.getPixelPos(targetR, targetQ);

        // Facing logic (mounted units must turn-in-place by swapping butt/head anchor)
        if (attacker.onHorse) {
            const a = this.getPixelPos(attacker.r, attacker.q);
            const head = this.getMountedHeadCellFor(attacker, attacker.r, attacker.q);
            let midX = a.x;
            if (head) {
                const b = this.getPixelPos(head.r, head.q);
                midX = (a.x + b.x) / 2;
            }
            let desiredFlip = attacker.flip;
            if (targetPos.x < midX) desiredFlip = true;
            else if (targetPos.x > midX) desiredFlip = false;
            this.turnMountedInPlace(attacker, desiredFlip);
        }

        // Compute origin AFTER any mounted turn-in-place (turn swaps butt/head anchor)
        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const startPos = this.getPixelPos(origin.r, origin.q);

        if (!attacker.onHorse) {
            if (targetPos.x < startPos.x) attacker.flip = true;
            if (targetPos.x > startPos.x) attacker.flip = false;
        }

        if (attackKey === 'double_blades') {
            this.executeDoubleBlades(attacker, targetR, targetQ, wrappedOnComplete);
        } else if (attackKey.startsWith('green_dragon_slash') || attackKey === 'tyrant_sweep') {
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

        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const startPos = this.getPixelPos(origin.r, origin.q);
        const endPos = this.getPixelPos(targetR, targetQ);

        const targetCell = this.tacticsMap.getCell(targetR, targetQ);
        const victim = targetCell ? this.getRiderUnitFromCell(targetCell) : null;

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
                // Flash swish indicator at the strike moment
                if (attackKey.startsWith('slash')) {
                    // Standard sword slash — medium perpendicular stroke
                    this.spawnSwish(
                        [{ r: targetR, q: targetQ }],
                        startPos, 'slash',
                        { maxWidth: 7, duration: 130 }
                    );
                } else if (attackKey === 'bash') {
                    // Heavy blunt bash — shorter, chunkier slash stroke
                    this.spawnSwish(
                        [{ r: targetR, q: targetQ }],
                        startPos, 'slash',
                        { maxWidth: 6, duration: 120 }
                    );
                } else if (attackKey === 'whirlwind') {
                    // Spinning strike — wide sweeping slash
                    this.spawnSwish(
                        [{ r: targetR, q: targetQ }],
                        startPos, 'slash',
                        { maxWidth: 10, duration: 150 }
                    );
                } else if (attackKey === 'heavy_thrust') {
                    // Thrust with a polearm — thin needle stab
                    this.spawnSwish(
                        [{ r: targetR, q: targetQ }],
                        startPos, 'stab',
                        { maxWidth: 3, duration: 140 }
                    );
                }

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

        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const startPos = this.getPixelPos(origin.r, origin.q);
        const frontPos = this.getPixelPos(targetR, targetQ);
        
        // Opposite side target
        const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, targetR, targetQ);
        const oppositeDir = (dirIndex + 3) % 6;
        const backCell = this.tacticsMap.getNeighborInDirection(origin.r, origin.q, oppositeDir);
        const backPos = backCell ? this.getPixelPos(backCell.r, backCell.q) : null;

        const targetCell = this.tacticsMap.getCell(targetR, targetQ);
        const frontVictimRaw = targetCell ? targetCell.unit : null;
        const backVictimRaw = backCell ? backCell.unit : null;
        // Defensive: prevent self-hit on mounted units (head/butt hex)
        const frontVictim = (frontVictimRaw === attacker) ? null : frontVictimRaw;
        const backVictim = (backVictimRaw === attacker) ? null : backVictimRaw;
        
        const isFrontDestructible = targetCell && (targetCell.terrain.includes('house') || targetCell.terrain.includes('ice')) && !targetCell.terrain.includes('destroyed') && !targetCell.terrain.includes('broken');
        const isBackDestructible = backCell && (backCell.terrain.includes('house') || backCell.terrain.includes('ice')) && !backCell.terrain.includes('destroyed') && !backCell.terrain.includes('broken');

        // First strike: poll for the swing frame (frame >= 1), same pattern as green dragon / serpent spear.
        let struck1 = false;
        const checkFirst = () => {
            if (struck1) return;
            if (attacker.action !== 'attack_1') return;

            if (attacker.frame >= 1) {
                struck1 = true;

                // Swish + damage for the front blade
                this.spawnSwish(
                    [{ r: targetR, q: targetQ }],
                    startPos, 'slash',
                    { maxWidth: 7, duration: 130 }
                );
                this.damageCell(targetR, targetQ);
                if (frontVictim) {
                    this.applyDamageAndPush(attacker, frontVictim, ATTACKS.double_blades, targetR, targetQ, startPos, frontPos);
                } else if (!isFrontDestructible) {
                    assets.playSound('whiff', 0.6);
                }

                // Turn around after a brief pause (let the first swing play through)
                setTimeout(() => {
                    if (attacker.onHorse) this.turnMountedInPlace(attacker, !attacker.flip);
                    else attacker.flip = !attacker.flip;
                    attacker.action = 'attack_1';
                    attacker.frame = 0;
                    assets.playSound('double_blades');

                    // Second strike: poll for the swing frame again on the new animation
                    let struck2 = false;
                    const checkSecond = () => {
                        if (struck2) return;
                        if (attacker.action !== 'attack_1') return;

                        if (attacker.frame >= 1) {
                            struck2 = true;

                            if (backCell) {
                                // Recompute origin after pivot (mounted units swap butt/head)
                                const origin2 = this.getAttackOriginForTarget(attacker, backCell.r, backCell.q);
                                const startPos2 = this.getPixelPos(origin2.r, origin2.q);
                                // Swish + damage for the back blade
                                this.spawnSwish(
                                    [{ r: backCell.r, q: backCell.q }],
                                    startPos2, 'slash',
                                    { maxWidth: 7, duration: 130 }
                                );
                                this.damageCell(backCell.r, backCell.q);
                                if (backVictim) {
                                    this.applyDamageAndPush(attacker, backVictim, ATTACKS.double_blades, backCell.r, backCell.q, startPos2, backPos);
                                } else if (!isBackDestructible) {
                                    assets.playSound('whiff', 0.6);
                                }
                            } else if (!isBackDestructible) {
                                assets.playSound('whiff', 0.6);
                            }

                            setTimeout(() => {
                                attacker.action = 'standby';
                                if (onComplete) onComplete();
                            }, 400);
                            return;
                        }
                        setTimeout(checkSecond, 16);
                    };
                    setTimeout(checkSecond, 16);
                }, 300);
                return;
            }
            setTimeout(checkFirst, 16);
        };
        setTimeout(checkFirst, 16);
    }

    executeGreenDragonSlash(attacker, attackKey, targetR, targetQ, onComplete) {
        const attack = ATTACKS[attackKey] || ATTACKS.green_dragon_slash;
        attacker.action = attack.animation || 'attack_1';
        attacker.frame = 0;

        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const startPos = this.getPixelPos(origin.r, origin.q);
        const affected = this.getAffectedTiles(attacker, attackKey, targetR, targetQ);

        // Swipe fires on frame 1 (the swing frame), same pattern as serpent spear.
        let struck = false;
        const checkSwing = () => {
            if (struck) return;
            if (attacker.action !== (attack.animation || 'attack_1')) return;

            if (attacker.frame >= 1) {
                struck = true;

                // Flash swipe indicator at the strike moment
                this.spawnSwish(affected, startPos, 'arc', { maxWidth: 10, duration: 180 });

                // Deduplicate victims: a mounted unit occupies two hexes, so the arc
                // could hit it twice. Only apply damage once per unit per attack.
                const hitVictims = new Set();
                let hitAnything = false;
                affected.forEach(pos => {
                    this.damageCell(pos.r, pos.q);
                    const cell = this.tacticsMap.getCell(pos.r, pos.q);
                    if (cell) {
                        const isDestructible = (cell.terrain.includes('house') || cell.terrain.includes('ice')) && !cell.terrain.includes('destroyed') && !cell.terrain.includes('broken');
                        if (isDestructible) hitAnything = true;

                        const victim = this.getRiderUnitFromCell(cell);
                        if (victim && !hitVictims.has(victim)) {
                            hitVictims.add(victim);
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
                return;
            }

            // Keep polling while the attack animation is active
            setTimeout(checkSwing, 16);
        };
        setTimeout(checkSwing, 16);
    }

    executeSerpentSpear(attacker, attackKey, targetR, targetQ, onComplete) {
        const attack = ATTACKS[attackKey] || ATTACKS.serpent_spear;
        attacker.action = attack.animation || 'attack_2';
        attacker.frame = 0;

        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const startPos = this.getPixelPos(origin.r, origin.q);
        const endPos = this.getPixelPos(targetR, targetQ);
        const affected = this.getAffectedTiles(attacker, attackKey, targetR, targetQ);

        // Serpent Spear has a clear "wind-up" then "swing" on the next frame.
        // Spawn the swipe and apply damage exactly when the swing frame begins.
        let struck = false;
        const checkSwing = () => {
            if (struck) return;
            if (attacker.action !== (attack.animation || 'attack_2')) return;

            // Swing happens on the next animation frame after wind-up (frame 0 -> frame 1)
            if (attacker.frame >= 1) {
                struck = true;

            // Flash stab indicator at the strike moment (no travel)
            this.spawnSwish(affected, startPos, 'stab', { maxWidth: 2.5, duration: 140 });

            // Deduplicate victims so a mounted unit straddling two hit hexes only takes damage once.
            const hitVictimsSS = new Set();
            let hitAnything = false;
            affected.forEach(pos => {
                this.damageCell(pos.r, pos.q);
                const cell = this.tacticsMap.getCell(pos.r, pos.q);
                if (cell) {
                    const isDestructible = (cell.terrain.includes('house') || cell.terrain.includes('ice')) && !cell.terrain.includes('destroyed') && !cell.terrain.includes('broken');
                    if (isDestructible) hitAnything = true;

                    const victim = this.getRiderUnitFromCell(cell);
                    if (victim && !hitVictimsSS.has(victim)) {
                        hitVictimsSS.add(victim);
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
                return;
            }

            // keep polling while the attack animation is active
            setTimeout(checkSwing, 16);
        };
        checkSwing();
    }

    applyUnitDamage(victim, damage, sourceCell = null) {
        // Caged units - damage the cage, not the unit
        if (victim.caged) {
            // Initialize cage HP if not set
            if (victim.cageHp === undefined) {
                victim.cageHp = 3;  // Cage has 3 HP
            }
            
            victim.cageHp -= damage;
            
            if (victim.cageHp <= 0) {
                // Cage broken! Free the prisoner
                victim.caged = false;
                victim.cageHp = 0;
                this.addDamageNumber(victim.visualX, victim.visualY - 20, "FREED!", '#00ff00');
                assets.playSound('building_damage', 1.0);
                
                // Check for victory condition
                if (this.isFightMode && this.onFightVictory) {
                    // Set the callback IMMEDIATELY to prevent race conditions with checkWinLoss
                    this.onVictoryCallback = this.onFightVictory;
                    
                    // Show victory message and end - use endBattle to compute stats
                    setTimeout(() => {
                        this.addDamageNumber(this.manager.canvas.width / 2, 50, "VICTORY!", '#ffd700');
                        setTimeout(() => {
                            this.endBattle(true);
                        }, 1500);
                    }, 500);
                }
            } else {
                // Show cage damage
                this.addDamageNumber(victim.visualX, victim.visualY - 20, `CAGE: ${victim.cageHp}/3`);
                assets.playSound('building_damage', 0.7);
                
                // Visual: switch cage sprite based on damage
                if (victim.cageHp <= 1) {
                    victim.cageSprite = 'cage_more_damaged';
                } else if (victim.cageHp <= 2) {
                    victim.cageSprite = 'cage_damaged';
                }
            }
            return 0;  // No damage to the unit itself
        }
        
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
            // If a mounted unit dies, it falls off and the horse remains (horse is immortal)
            if (victim.onHorse) {
                this.dismountUnitLeaveHorse(victim);
            }
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
        // Hard safety: nobody can ever hit/push themselves with their own attack.
        // (Mounted units occupy 2 hexes, and some multi-hex attacks can otherwise reference the other hex.)
        if (!attacker || !victim) return;
        if (victim === attacker) return;

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

        // Apply damage & Shake (use the hit cell so mounted head-hex hits clear the right occupancy)
        const hitCell = this.tacticsMap.getCell(targetR, targetQ);
        finalDamage = this.applyUnitDamage(victim, finalDamage, hitCell);
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
            const attackerOrigin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
            const dirIndex = this.tacticsMap.getDirectionIndex(attackerOrigin.r, attackerOrigin.q, targetR, targetQ);
            if (dirIndex === -1) return; // Cannot push if direction is undefined

            // If a mounted unit is hit on its head hex, push from that hex (not always from butt).
            // Also: pushed mounted units are dismounted; the horse stays put.
            let victimPushR = victim.r;
            let victimPushQ = victim.q;
            const wasMounted = !!victim.onHorse;
            if (wasMounted) {
                // Always push from the ACTUAL hit hex (targetR/targetQ) if it's one of the 2 occupied horse hexes.
                // This makes head-hex pushes dismount and push in the expected direction even if facing/anchor changed.
                const hitIsOnPair =
                    (victim.r === targetR && victim.q === targetQ) ||
                    (victim.r === targetR && victim.q + 1 === targetQ) ||
                    (victim.r === targetR && victim.q - 1 === targetQ);
                if (hitIsOnPair) {
                    victimPushR = targetR;
                    victimPushQ = targetQ;
                }
            }

            const victimCellForPush = this.tacticsMap.getCell(victimPushR, victimPushQ);
            const pushCell = this.tacticsMap.getNeighborInDirection(victimPushR, victimPushQ, dirIndex);
            
            const victimPos = this.getPixelPos(victimPushR, victimPushQ);

            if (pushCell) {
                const targetPos = this.getPixelPos(pushCell.r, pushCell.q);
                const levelDiff = (pushCell.level || 0) - (victimCellForPush?.level || 0);
                const isDeepWater = pushCell.terrain && pushCell.terrain.includes('water_deep');

                // 1. COLLISION (Pushing into a wall/high cliff or another living unit)
                const isHighCliff = levelDiff > 1;
                const isImpassable = pushCell.impassable && !isDeepWater;
                const liveOccupant = this.getLivingUnitOccupyingCell(pushCell.r, pushCell.q, victim);
                const isOccupiedByLiving = !!liveOccupant;
                const isOccupiedByHorse = !!pushCell.horse; // riderless or ridden horses occupy hexes too

                if (isHighCliff || isImpassable || isOccupiedByLiving || isOccupiedByHorse) {
                    // Special case: pushing a mounted unit "into itself" (head -> butt or butt -> head)
                    // should dismount and fall off the back rather than taking collision damage.
                    if (wasMounted && pushCell && this.unitOccupiesCell(victim, pushCell.r, pushCell.q)) {
                        // Dismount at current anchor (butt), then try to push one hex further "back"
                        const fromCell = this.tacticsMap.getCell(victim.r, victim.q);
                        const fromPos = this.getPixelPos(victim.r, victim.q);
                        this.dismountUnitLeaveHorse(victim);

                        const behindCell = this.tacticsMap.getNeighborInDirection(pushCell.r, pushCell.q, dirIndex);
                        if (behindCell && !behindCell.impassable && !behindCell.unit && !behindCell.horse) {
                            if (fromCell && fromCell.unit === victim) fromCell.unit = null;
                            const behindPos = this.getPixelPos(behindCell.r, behindCell.q);
                            victim.setPosition(behindCell.r, behindCell.q);
                            behindCell.unit = victim;
                            victim.startPush(fromPos.x, fromPos.y, behindPos.x, behindPos.y, false, 1);
                            assets.playSound('bash', 0.5);
                        } else {
                            // Can't fall back; just dismount in place without collision damage
                            if (fromCell) fromCell.unit = victim;
                            assets.playSound('collision', 0.3);
                        }
                        return;
                    }

                    // Blocked push: bump damage + bounce, but stay mounted (no displacement).
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, true, 0); // true = bounce
                    this.executePushCollision(victim, pushCell, victimPos, targetPos);
                } 
                // 2. FALLING (Pushing off a cliff)
                else if (levelDiff < -1) {
                    const fallDamage = Math.max(0, Math.abs(levelDiff) - 1);
                    const occupant = pushCell.unit; // Could be a corpse or a living unit (if not _aliveAtStartOfAction)

                    // Displaced push: if mounted, fall off horse (horse stays) before resolving fall.
                    if (wasMounted) this.dismountUnitLeaveHorse(victim);
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false, Math.abs(levelDiff));
                    if (victimCellForPush) victimCellForPush.unit = null;

                    if (occupant && occupant.hp > 0) {
                        // CRUSH MECHANIC
                        this.handleCrushLanding(victim, occupant, pushCell, levelDiff, targetPos);
                    } else {
                        // Normal fall landing
                    setTimeout(() => { 
                            if (isDeepWater) {
                        victim.isDrowning = true;
                                assets.playSound('drown');
                            } else {
                                assets.playSound('collision', 0.8);
                                this.applyUnitDamage(victim, fallDamage);
                                this.addDamageNumber(targetPos.x, targetPos.y - 30, fallDamage);
                            }
                    victim.setPosition(pushCell.r, pushCell.q);
                        pushCell.unit = victim;
                        }, 400);
                    }
                }
                // 3. NORMAL PUSH (Same level or slight elevation change)
                else {
                    // Displaced push: if mounted, fall off horse (horse stays) and add a small arc.
                    const dismountFallHeight = wasMounted ? 1 : 0;
                    if (wasMounted) this.dismountUnitLeaveHorse(victim);
                    if (victimCellForPush) victimCellForPush.unit = null;
                    victim.setPosition(pushCell.r, pushCell.q);
                    pushCell.unit = victim;
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false, dismountFallHeight);

                    // Deep water drowning
                    if (isDeepWater) {
                        setTimeout(() => {
                            if (victim.name === 'Boulder') {
                                assets.playSound('drown');
                                pushCell.terrain = 'water_shallow_01'; // Fill in deep water with boulder
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
                // If mounted, stay mounted when blocked at the edge.
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
        if (xp < 10) return 1;
        // Formula: TotalXP(L) = 2.5*L^2 + 2.5*L - 5
        // Level 2 at 10 XP, Level 3 at 25 XP, Level 4 at 45 XP, etc.
        // Solving for L: L = (-1 + sqrt(9 + 1.6*xp)) / 2
        return Math.floor((-1 + Math.sqrt(9 + 1.6 * xp)) / 2);
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

        // Kill all enemies only
        this.units.forEach(u => {
            if (u.faction === 'enemy' && u.hp > 0) {
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
        // Level 2 at 10 XP, Level 3 at 25 XP, Level 4 at 45 XP, etc.
        return 2.5 * level * level + 2.5 * level - 5;
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
                        isDead: uDef.isDead || false,  // Preserve isDead flag for corpses
                        isPreDead: uDef.isDead || false, // NEW: Track if unit started dead
                        caged: uDef.caged || false,     // Preserve caged flag
                        frame: uDef.frame !== undefined ? uDef.frame : undefined
                    };
                }).filter(u => u !== null);
            } else if (this.battleId === 'custom') {
                // Roster provided by CustomBattleMenuScene
                unitsToPlace = specifiedUnits || [];
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
            const unitXP = gs.getCampaignVar('unitXP') || {};
            const unitClasses = gs.getCampaignVar('unitClasses') || {};

            unitsToPlace.forEach(u => {
                const cell = this.findNearestFreeCell(u.r, u.q, 5);
                if (!cell) {
                    console.warn(`Could not find a free spot for unit ${u.id} at (${u.r},${u.q})`);
                    return;
                }

                const finalR = cell.r;
                const finalQ = cell.q;

                let level = u.level;
                if (!this.isCustom || !level) {
                    const xp = unitXP[u.id] || 0;
                    level = this.getLevelFromXP(xp);
                }

                // Check for class change (e.g. Soldier -> Archer)
                let imgKey = u.imgKey;
                let attacks = u.attacks ? [...u.attacks] : [];
                
                let unitClass = u.templateId || u.id.replace(/\d+$/, '');
                if (!this.isCustom) {
                    unitClass = unitClasses[u.id] || (u.id.startsWith('ally') ? 'soldier' : u.id);
                } else {
                    if (u.isArcher) {
                        unitClass = 'archer';
                    } else if (unitClass === 'ally' || unitClass === 'guard' || unitClass.includes('custom_ally') || unitClass.includes('custom_guard')) {
                        unitClass = 'soldier';
                    }
                }
                
                // Level bonuses - soldiers gain +1 HP at level 2+, archers stay at 2 base
                const isAlly = u.id.startsWith('ally') || u.id.startsWith('guard') || u.id.includes('custom_ally') || u.id.includes('custom_guard');
                const isArcher = unitClass === 'archer';
                let baseHp = u.maxHp || u.hp || 4;
                if (isAlly) {
                    baseHp = isArcher ? 2 : (level >= 2 ? 3 : 2);
                }
                const finalMaxHp = this.getMaxHpForLevel(level, baseHp);
                
                if (unitClass === 'archer') {
                    imgKey = 'archer';
                    attacks = ['arrow_shot'];
                }

                // Apply template if missing data (for custom roster)
                if (this.isCustom && !u.hp) {
                    const typeTemplates = UNIT_TEMPLATES[u.type];
                    const template = typeTemplates ? (typeTemplates[u.templateId] || Object.values(typeTemplates)[0]) : null;
                    if (template) {
                        if (!attacks.length) attacks = [...template.attacks];
                        if (!u.moveRange) u.moveRange = template.moveRange;
                    }
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
                    isPreDead: u.isPreDead || false,
                    maxHp: finalMaxHp,
                    attacks: attacks,
                    img: assets.getImage(imgKey),
                    action: u.isDead ? 'death' : 'standby',
                    currentAnimAction: u.isDead ? 'death' : 'standby',
                    frame: u.isDead ? 100 : 0 // Ensure it's at the end of death anim
                });
                
                if (u.isDead) unit.isGone = false; // We want corpses to stay visible

                // Mount (custom battles): +1 move and occupy 2 adjacent hexes (left/right only)
                const wantsHorse = !!u.onHorse;
                if (wantsHorse) {
                    unit.onHorse = true;
                    unit.baseMoveRange = unit.moveRange;
                    unit.horseType = u.horseType || 'brown';
                    unit.moveRange = unit.baseMoveRange + this.getHorseMoveBonus(unit.horseType);
                    unit.horseId = `horse_${unit.id}`;
                }
                
            this.units.push(unit);
                cell.unit = unit;
                if (unit.onHorse) {
                    if (this.isValidMountedButtDestination(unit, unit.r, unit.q)) {
                        const headCell = this.getMountedHeadCellFor(unit, unit.r, unit.q);
                        headCell.unit = unit;
                        const horse = { id: unit.horseId, riderId: unit.id, r: unit.r, q: unit.q, flip: !!unit.flip, type: unit.horseType || 'brown' };
                        this.horses.push(horse);
                        this.placeHorseOnCells(horse);
                    } else {
                        unit.onHorse = false;
                        unit.horseId = null;
                        unit.moveRange = unit.baseMoveRange;
                    }
                }
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

    getMountedHeadCellFor(unit, buttR, buttQ) {
        const dq = unit.flip ? -1 : 1; // Only left/right horses for now
        return this.tacticsMap.getCell(buttR, buttQ + dq);
    }

    isValidMountedButtDestination(unit, buttR, buttQ, plannedFlip = null) {
        const buttCell = this.tacticsMap.getCell(buttR, buttQ);
        if (!buttCell || buttCell.impassable) return false;

        // Use plannedFlip if provided, otherwise fall back to the unit's current facing.
        // This is important when validating destinations where the horse will turn: without
        // plannedFlip the head cell would be on the wrong side and good tiles get rejected.
        const flip = (plannedFlip !== null) ? plannedFlip : unit.flip;
        const dq = flip ? -1 : 1;
        const headCell = this.tacticsMap.getCell(buttR, buttQ + dq);
        if (!headCell || headCell.impassable) return false;

        // Horse can't straddle a cliff: the two occupied hexes must be within 1 level of each other
        const levelDiff = Math.abs((buttCell.level || 0) - (headCell.level || 0));
        if (levelDiff > 1) return false;

        // Both hexes must be free (or occupied by the moving unit itself)
        if (buttCell.unit && buttCell.unit !== unit) return false;
        if (headCell.unit && headCell.unit !== unit) return false;

        return true;
    }

    // Mounted move planning (butt + head) for UI highlighting / click handling
    buildMountedMovePlans(unit, reachableData) {
        const plans = [];
        reachableData.forEach((data, key) => {
            const [r, q] = key.split(',').map(Number);
            const buttCell = this.tacticsMap.getCell(r, q);
            if (!buttCell) return;

            // Butt must be free (or this unit)
            if (buttCell.unit && buttCell.unit !== unit) return;

            // Determine final facing from cheapest-path parent -> node
            let plannedFlip = unit.flip;
            if (data.parent) {
                const [pr, pq] = data.parent.split(',').map(Number);
                const prevPos = this.getPixelPos(pr, pq);
                const lastPos = this.getPixelPos(r, q);
                if (lastPos.x < prevPos.x) plannedFlip = true;
                else if (lastPos.x > prevPos.x) plannedFlip = false;
            }

            const tmp = { ...unit, flip: plannedFlip };
            const headCell = this.getMountedHeadCellFor(tmp, r, q);
            if (!headCell || headCell.impassable) return;
            if (headCell.unit && headCell.unit !== unit) return;

            // Can't straddle a cliff at the destination
            const levelDiff = Math.abs((buttCell.level || 0) - (headCell.level || 0));
            if (levelDiff > 1) return;

            plans.push({
                butt: { r, q },
                head: { r: headCell.r, q: headCell.q },
                plannedFlip
            });
        });
        return plans;
    }

    getMountedPlanForClickedCell(clickedR, clickedQ) {
        if (!this.mountedMovePlans || this.mountedMovePlans.length === 0) return null;
        // Prefer plans where the clicked cell is the head
        const headPlan = this.mountedMovePlans.find(p => p.head.r === clickedR && p.head.q === clickedQ);
        if (headPlan) return headPlan;
        return this.mountedMovePlans.find(p => p.butt.r === clickedR && p.butt.q === clickedQ) || null;
    }

    syncMountedOccupancy(unit) {
        if (!unit?.onHorse) return;
        // Clear any stale occupancy on both potential head tiles (E and W), then set the correct one.
        const buttCell = this.tacticsMap.getCell(unit.r, unit.q);
        const eastCell = this.tacticsMap.getCell(unit.r, unit.q + 1);
        const westCell = this.tacticsMap.getCell(unit.r, unit.q - 1);

        if (buttCell) buttCell.unit = unit;
        if (eastCell && eastCell.unit === unit) eastCell.unit = null;
        if (westCell && westCell.unit === unit) westCell.unit = null;

        const headCell = this.getMountedHeadCellFor(unit, unit.r, unit.q);
        if (headCell) headCell.unit = unit;
    }

    getAttackOrigins(attacker) {
        const origins = [{ r: attacker.r, q: attacker.q, kind: 'butt' }];
        if (attacker.onHorse) {
            const head = this.getMountedHeadCellFor(attacker, attacker.r, attacker.q);
            if (head) origins.push({ r: head.r, q: head.q, kind: 'head' });
        }
        return origins;
    }

    getAttackOriginForTarget(attacker, targetR, targetQ) {
        const origins = this.getAttackOrigins(attacker);
        let best = origins[0];
        let bestDist = Infinity;
        for (const o of origins) {
            const d = this.tacticsMap.getDistance(o.r, o.q, targetR, targetQ);
            if (d < bestDist) {
                bestDist = d;
                best = o;
            } else if (d === bestDist) {
                // Tie -> prefer head
                if (o.kind === 'head') best = o;
            }
        }
        return best;
    }

    getHorseById(horseId) {
        if (!horseId) return null;
        return this.horses.find(h => h.id === horseId) || null;
    }

    getRiderUnitFromCell(cell) {
        if (!cell) return null;
        if (cell.unit) return cell.unit;
        const riderId = cell.horse?.riderId;
        if (!riderId) return null;
        return this.units.find(u => u.id === riderId) || null;
    }

    unitOccupiesCell(unit, r, q) {
        if (!unit) return false;
        if (unit.r === r && unit.q === q) return true;
        if (unit.onHorse) {
            const head = this.getMountedHeadCellFor(unit, unit.r, unit.q);
            if (head && head.r === r && head.q === q) return true;
        }
        return false;
    }

    getLivingUnitOccupyingCell(r, q, excludeUnit = null) {
        for (const u of this.units) {
            if (!u || u === excludeUnit || u.isGone || u.hp <= 0) continue;
            if (this.unitOccupiesCell(u, r, q)) return u;
        }
        return null;
    }

    getHorseMoveBonus(horseType) {
        if (horseType === 'white') return 2;
        if (horseType === 'redhare') return 3;
        // black/brown/default
        return 1;
    }

    getHorseSpriteKeys(horseType = 'brown') {
        const t = horseType || 'brown';
        return {
            stand: `horse_stand_${t}`,
            run: `horse_run_${t}`
        };
    }

    getHorseHeadCoords(horse) {
        const dq = horse.flip ? -1 : 1;
        return { r: horse.r, q: horse.q + dq };
    }

    clearHorseFromCells(horse) {
        if (!horse) return;
        const butt = this.tacticsMap.getCell(horse.r, horse.q);
        const headCoords = this.getHorseHeadCoords(horse);
        const head = this.tacticsMap.getCell(headCoords.r, headCoords.q);
        if (butt && butt.horse === horse) butt.horse = null;
        if (head && head.horse === horse) head.horse = null;
    }

    placeHorseOnCells(horse) {
        if (!horse) return;
        const butt = this.tacticsMap.getCell(horse.r, horse.q);
        const headCoords = this.getHorseHeadCoords(horse);
        const head = this.tacticsMap.getCell(headCoords.r, headCoords.q);
        if (butt) butt.horse = horse;
        if (head) head.horse = horse;
    }

    // Mounted facing change without movement: keep the footprint on the same two hexes
    // by swapping which occupied hex is the "butt" anchor.
    turnMountedInPlace(unit, desiredFlip) {
        if (!unit?.onHorse) return;
        if (unit.isMoving) return;
        if (desiredFlip === undefined || desiredFlip === null) return;
        if (!!unit.flip === !!desiredFlip) return;

        const oldButtCell = this.tacticsMap.getCell(unit.r, unit.q);
        const oldHeadCell = this.getMountedHeadCellFor(unit, unit.r, unit.q);
        if (!oldHeadCell) {
            unit.flip = !!desiredFlip;
            this.syncMountedOccupancy(unit);
            const horse = this.getHorseById(unit.horseId);
            if (horse) {
                this.clearHorseFromCells(horse);
                horse.r = unit.r;
                horse.q = unit.q;
                horse.flip = !!unit.flip;
                this.placeHorseOnCells(horse);
            }
            return;
        }

        // Swap anchor: new butt becomes the previous head (occupied pair stays identical)
        const newButtR = oldHeadCell.r;
        const newButtQ = oldHeadCell.q;

        if (oldButtCell && oldButtCell.unit === unit) oldButtCell.unit = null;
        if (oldHeadCell && oldHeadCell.unit === unit) oldHeadCell.unit = null;

        unit.r = newButtR;
        unit.q = newButtQ;
        unit.flip = !!desiredFlip;
        this.syncMountedOccupancy(unit);

        const horse = this.getHorseById(unit.horseId);
        if (horse) {
            this.clearHorseFromCells(horse);
            horse.r = unit.r;
            horse.q = unit.q;
            horse.flip = !!unit.flip;
            this.placeHorseOnCells(horse);
        }
    }

    dismountUnitLeaveHorse(unit) {
        if (!unit?.onHorse) return;
        const horse = this.getHorseById(unit.horseId);
        if (horse) {
            // Horse stays put where the unit is currently anchored
            this.clearHorseFromCells(horse);
            horse.r = unit.r;
            horse.q = unit.q;
            horse.flip = !!unit.flip;
            horse.riderId = null;
            horse.type = horse.type || unit.horseType || 'brown';
            this.placeHorseOnCells(horse);
        }

        // Clear unit occupancy from both horse hexes
        const buttCell = this.tacticsMap.getCell(unit.r, unit.q);
        const headCell = this.getMountedHeadCellFor(unit, unit.r, unit.q);
        if (buttCell && buttCell.unit === unit) buttCell.unit = null;
        if (headCell && headCell.unit === unit) headCell.unit = null;

        unit.onHorse = false;
        unit.horseId = null;
        unit.moveRange = unit.baseMoveRange;
    }

    tryAutoMount(unit, enteredR, enteredQ) {
        if (!unit || unit.onHorse || unit.hp <= 0) return false;
        const cell = this.tacticsMap.getCell(enteredR, enteredQ);
        const horse = cell?.horse;
        if (!horse || horse.riderId) return false;

        const head = this.getHorseHeadCoords(horse);
        const enteredIsButt = (horse.r === enteredR && horse.q === enteredQ);
        const enteredIsHead = (head.r === enteredR && head.q === enteredQ);
        if (!enteredIsButt && !enteredIsHead) return false;

        // If we entered the head tile, flip the horse so the entered tile becomes the butt anchor
        this.clearHorseFromCells(horse);
        if (enteredIsHead) {
            horse.flip = !horse.flip;
            horse.r = enteredR;
            horse.q = enteredQ;
        }
        horse.riderId = unit.id;
        this.placeHorseOnCells(horse);

        unit.onHorse = true;
        unit.horseId = horse.id;
        unit.horseType = horse.type || 'brown';
        unit.baseMoveRange = unit.baseMoveRange || unit.moveRange;
        unit.moveRange = unit.baseMoveRange + this.getHorseMoveBonus(unit.horseType);
        unit.r = horse.r;
        unit.q = horse.q;
        unit.flip = !!horse.flip;

        // Occupy both hexes as a mounted unit
        const buttCell = this.tacticsMap.getCell(unit.r, unit.q);
        const headCell = this.getMountedHeadCellFor(unit, unit.r, unit.q);
        if (buttCell) buttCell.unit = unit;
        if (headCell) headCell.unit = unit;
        return true;
    }

    isValidHorseButtDestination(horse, buttR, buttQ) {
        const buttCell = this.tacticsMap.getCell(buttR, buttQ);
        if (!buttCell || buttCell.impassable) return false;

        const dq = horse.flip ? -1 : 1;
        const headCell = this.tacticsMap.getCell(buttR, buttQ + dq);
        if (!headCell || headCell.impassable) return false;

        // Horse can't straddle a cliff
        const levelDiff = Math.abs((buttCell.level || 0) - (headCell.level || 0));
        if (levelDiff > 1) return false;

        // Don't wander onto units
        if (buttCell.unit) return false;
        if (headCell.unit) return false;

        return true;
    }

    wanderRiderlessHorses() {
        // Move each riderless horse 0-1 steps to a random valid nearby butt tile
        this.horses.forEach(h => {
            if (h.riderId) return;
            const neighbors = this.tacticsMap.getNeighbors(h.r, h.q);
            const candidates = [{ r: h.r, q: h.q }, ...neighbors.map(n => ({ r: n.r, q: n.q }))];
            const valid = candidates.filter(c => this.isValidHorseButtDestination(h, c.r, c.q));
            if (valid.length <= 1) return;

            const choice = valid[Math.floor(Math.random() * valid.length)];
            if (choice.r === h.r && choice.q === h.q) return; // no move

            const prevPos = this.getPixelPos(h.r, h.q);
            const nextPos = this.getPixelPos(choice.r, choice.q);
            // Face opposite the direction you came from:
            // If we moved right (came from left), face right. If we moved left (came from right), face left.
            if (nextPos.x > prevPos.x + 0.1) h.flip = false;
            else if (nextPos.x < prevPos.x - 0.1) h.flip = true;

            // Animate visually instead of teleporting: update gameplay position immediately (so occupancy/pathing is correct),
            // but render at an interpolated visual position for a short duration.
            h.moveData = {
                startX: prevPos.x,
                startY: prevPos.y,
                endX: nextPos.x,
                endY: nextPos.y,
                t: 0,
                duration: 250
            };
            h.visualX = prevPos.x;
            h.visualY = prevPos.y;
            h.isMoving = true;

            this.clearHorseFromCells(h);
            h.r = choice.r;
            h.q = choice.q;
            this.placeHorseOnCells(h);
        });
    }

    updateRiderlessHorseAnimations(dt) {
        this.horses.forEach(h => {
            if (h.riderId) return;
            if (!h.moveData) {
                h.isMoving = false;
                return;
            }
            h.moveData.t += dt;
            const p = Math.min(1, h.moveData.t / h.moveData.duration);
            h.visualX = h.moveData.startX + (h.moveData.endX - h.moveData.startX) * p;
            h.visualY = h.moveData.startY + (h.moveData.endY - h.moveData.startY) * p;
            if (p >= 1) {
                const finalPos = this.getPixelPos(h.r, h.q);
                h.visualX = finalPos.x;
                h.visualY = finalPos.y;
                h.moveData = null;
                h.isMoving = false;
            }
        });
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
            this.lastTime = timestamp;

        // Periodic state saving for crash recovery (only for campaign battles)
        if (!this.isCustomBattle && timestamp - this.lastSaveTime > this.saveInterval) {
            this.saveBattleState();
            this.lastSaveTime = timestamp;
        }

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
                // If there's a custom victory callback, pass it to the summary screen
                if (this.won && this.onVictoryCallback) {
                    this.manager.switchTo('summary', {
                        ...this.finalStats,
                        onComplete: this.onVictoryCallback
                    });
                    return;
                }
                this.manager.switchTo('summary', this.finalStats);
                return;
            }
        }

        this.animationFrame = Math.floor(timestamp / 150) % 4;
        this.updateRiderlessHorseAnimations(dt);
        
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
            
            // In cutscene dialogue, only animate the speaking character
            let shouldAnimate = isPlayerActive || isEnemyActive;
            if (this.isCutscene && this.isCleanupDialogueActive && this.cleanupDialogueScript) {
                const currentStep = this.cleanupDialogueScript[this.cleanupDialogueStep];
                if (currentStep && currentStep.speaker) {
                    shouldAnimate = (u.id === currentStep.speaker);
                } else {
                    shouldAnimate = false;
                }
            } else if (this.isCutscene && !this.isCleanupDialogueActive) {
                // During cutscene but not in dialogue - no one animates
                shouldAnimate = false;
            }
            
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

        // --- UPDATE CHOICE HOVER ---
        if (this.isChoiceActive && this.choiceRects) {
            const mx = this.manager.logicalMouseX;
            const my = this.manager.logicalMouseY;
            this.choiceHovered = -1;
            for (const rect of this.choiceRects) {
                if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
                    this.choiceHovered = rect.index;
                    break;
                }
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
            // Mounted hover: match the mounted click logic (rider OR horse), but allow click-through on transparent pixels
            if (u.onHorse) {
                const spacing = this.manager.config.horizontalSpacing;
                const buttX = ux;
                const buttY = uy + sinkOffset;
                const headX = buttX + (u.flip ? -spacing : spacing);
                const midX = Math.floor((buttX + headX) / 2);
                const midY = buttY;

                const riderX = midX;
                const riderY = midY - 22;

                const riderHit = this.checkCharacterHit(u.img, (u.action === 'walk') ? 'standby' : (u.currentAnimAction || u.action), u.frame, riderX, riderY, hx, hy, {
                    flip: u.flip,
                    sinkOffset: 0,
                    isProp: false
                });

                // Pixel-perfect horse hit (64x64 frame), so transparent pixels don't block what’s behind
                const keys = this.getHorseSpriteKeys(u.horseType || 'brown');
                const horseStand = assets.getImage(keys.stand) || assets.getImage('horse_stand');
                const horseRun = assets.getImage(keys.run) || assets.getImage('horse_run');
                const isRunning = (u.isMoving || u.action === 'walk') && horseRun;
                const horseImg = isRunning ? horseRun : horseStand;

                let horseHit = false;
                if (horseImg) {
                    const frameW = 64;
                    const frameH = 64;
                    const frameCount = Math.max(1, Math.floor((horseImg.width || frameW) / frameW));
                    const f = isRunning ? (Math.floor(Date.now() / 80) % frameCount) : 0;
                    const srcX = f * frameW;
                    const srcY = 0;

                    const horseFeetY = 15;
                    const destX = midX - frameW / 2;
                    const destY = midY + (horseFeetY - frameH);
                    horseHit = this.checkImageFrameHit(horseImg, srcX, srcY, frameW, frameH, destX, destY, hx, hy, { flip: u.flip });
                }

                if (riderHit || horseHit) {
                    hoveredUnit = u;
                    break;
                }
            } else if (this.checkCharacterHit(u.img, u.currentAnimAction || u.action, u.frame, ux, uy, hx, hy, { 
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
        const origin = this.getAttackOriginForTarget(attacker, targetR, targetQ);
        const dist = this.tacticsMap.getDistance(origin.r, origin.q, targetR, targetQ);
        const attack = ATTACKS[attackKey];

        if (attackKey.startsWith('serpent_spear')) {
            // Hits the target hex and all intermediate hexes in a line
            affected.push({ r: targetR, q: targetQ });
            
            // Check for intermediate hexes
            for (let d = 1; d < dist; d++) {
                const intermediate = this.getIntermediateHex(origin.r, origin.q, targetR, targetQ, d);
                if (intermediate) {
                    affected.push(intermediate);
                }
            }
        } else if (attackKey.startsWith('green_dragon_slash') || attackKey === 'tyrant_sweep') {
            // 3-hex arc.
            // For mounted units: never allow the arc to include the attacker's own head/butt.
            // Special case: if targeting "above/below" the horse at melee range, slice 3-in-a-row horizontally.
            const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, targetR, targetQ);

            const isMounted = !!attacker.onHorse;
            const isEastWest = (dirIndex === 1 || dirIndex === 4);
            const isMelee = dist === 1;

            if (isMounted && isMelee && !isEastWest) {
                // "Above/below" horse: hit a horizontal 3-hex line centered on the target.
                affected.push({ r: targetR, q: targetQ });
                const east = this.tacticsMap.getNeighborInDirection(targetR, targetQ, 1);
                const west = this.tacticsMap.getNeighborInDirection(targetR, targetQ, 4);
                if (east) affected.push({ r: east.r, q: east.q });
                if (west) affected.push({ r: west.r, q: west.q });
            } else {
                // Default: fan on the SAME distance ring from the attacker.
                // This guarantees all 3 hexes are the same distance from `origin` AND form a contiguous arc.
                // Always include the targeted hex, then add the two neighboring hexes that are also at the same distance.
                affected.push({ r: targetR, q: targetQ });
                if (dirIndex !== -1 && dist > 0) {
                    const neighbors = this.tacticsMap.getNeighbors(targetR, targetQ) || [];
                    const sameRing = neighbors.filter(n => this.tacticsMap.getDistance(origin.r, origin.q, n.r, n.q) === dist);
                    // Usually exactly 2 neighbors sit on the same distance ring; include them to form the 3-hex arc.
                    if (sameRing.length >= 2) {
                        affected.push({ r: sameRing[0].r, q: sameRing[0].q });
                        affected.push({ r: sameRing[1].r, q: sameRing[1].q });
                    }
                }
            }
        } else if (attackKey === 'double_blades') {
            // Special case for mounted units when targeting left/right:
            // hit in front of head AND behind butt (with a gap between), per design.
            if (attacker.onHorse) {
                const butt = { r: attacker.r, q: attacker.q };
                const head = this.getMountedHeadCellFor(attacker, butt.r, butt.q);
                if (head) {
                    const forwardDir = attacker.flip ? 4 : 1; // W if facing west, E if facing east
                    const backDir = attacker.flip ? 1 : 4;
                    const inFrontOfHead = this.tacticsMap.getNeighborInDirection(head.r, head.q, forwardDir);
                    const behindButt = this.tacticsMap.getNeighborInDirection(butt.r, butt.q, backDir);

                    const isFrontTarget = (inFrontOfHead && inFrontOfHead.r === targetR && inFrontOfHead.q === targetQ);
                    const isBackTarget = (behindButt && behindButt.r === targetR && behindButt.q === targetQ);

                    if (isFrontTarget && behindButt) {
                        affected.push({ r: targetR, q: targetQ });
                        affected.push({ r: behindButt.r, q: behindButt.q });
                    } else if (isBackTarget && inFrontOfHead) {
                        affected.push({ r: targetR, q: targetQ });
                        affected.push({ r: inFrontOfHead.r, q: inFrontOfHead.q });
                    } else {
                        // Fallback to normal behavior for non-E/W targets
                        affected.push({ r: targetR, q: targetQ });
                        const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, targetR, targetQ);
                        if (dirIndex !== -1) {
                            const oppositeDir = (dirIndex + 3) % 6;
                            const backCell = this.tacticsMap.getNeighborInDirection(origin.r, origin.q, oppositeDir);
                            if (backCell) affected.push({ r: backCell.r, q: backCell.q });
                        }
                    }
                } else {
                    affected.push({ r: targetR, q: targetQ });
                }
            } else {
                affected.push({ r: targetR, q: targetQ });
                const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, targetR, targetQ);
                if (dirIndex !== -1) {
                    const oppositeDir = (dirIndex + 3) % 6;
                    const backCell = this.tacticsMap.getNeighborInDirection(origin.r, origin.q, oppositeDir);
                    if (backCell) affected.push({ r: backCell.r, q: backCell.q });
                }
            }
        } else {
            affected.push({ r: targetR, q: targetQ });
        }

        // Never allow an attack to "hit" the attacker itself (important for 2-hex mounted footprint).
        const forbidden = new Set([`${attacker.r},${attacker.q}`]);
        if (attacker.onHorse) {
            const head = this.getMountedHeadCellFor(attacker, attacker.r, attacker.q);
            if (head) forbidden.add(`${head.r},${head.q}`);
        }

        // De-dupe + filter out forbidden tiles + filter out off-map
        const uniq = [];
        const seen = new Set();
        for (const t of affected) {
            if (!t) continue;
            const cell = this.tacticsMap.getCell(t.r, t.q);
            if (!cell) continue;
            const k = `${t.r},${t.q}`;
            if (forbidden.has(k)) continue;
            if (seen.has(k)) continue;
            seen.add(k);
            uniq.push({ r: t.r, q: t.q });
        }

        return uniq;
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

        // Determine which units and tiles are being targeted by telegraphed attacks
        const targetedUnits = new Set();
        const telegraphedTiles = new Set();
        this.units.forEach(u => {
            if (u.hp > 0 && u.intent && u.intent.type === 'attack') {
                const targetCell = this.getIntentTargetCell(u);
                
                if (targetCell) {
                    const affected = this.getAffectedTiles(u, u.intent.attackKey, targetCell.r, targetCell.q);
                    affected.forEach(t => {
                        telegraphedTiles.add(`${t.r},${t.q}`);
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

        // Determine which tiles are being previewed for a mounted move destination (hover)
        const movePreviewTiles = new Set();
        if (
            this.selectedUnit &&
            this.selectedUnit.faction === 'player' &&
            !this.selectedUnit.hasMoved &&
            this.selectedUnit.onHorse &&
            !this.selectedAttack &&
            this.hoveredCell
        ) {
            const hk = `${this.hoveredCell.r},${this.hoveredCell.q}`;
            if (this.reachableTiles.has(hk)) {
                const plan = this.getMountedPlanForClickedCell(this.hoveredCell.r, this.hoveredCell.q);
                if (plan) {
                    movePreviewTiles.add(`${plan.butt.r},${plan.butt.q}`);
                    movePreviewTiles.add(`${plan.head.r},${plan.head.q}`);
                }
            }
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
                    isTelegraphed: telegraphedTiles.has(`${r},${q}`),
                    isHovered: this.hoveredCell === cell,
                    isMovePreview: movePreviewTiles.has(`${r},${q}`)
                });
            }
        }

        // 2. Collect units (using their fractional sort row for depth)
        // Include dead units so their death animation/corpse is visible
        // 2a. Riderless horses (rendered as props between two adjacent hexes)
        this.horses.forEach(h => {
            if (h.riderId) return; // ridden horses are rendered with their rider
            const pos = (h.moveData && h.visualX !== undefined && h.visualY !== undefined)
                ? { x: h.visualX, y: h.visualY }
                : this.getPixelPos(h.r, h.q);
            drawCalls.push({
                type: 'horse',
                r: h.r,
                q: h.q,
                priority: 0.9,
                horse: h,
                x: pos.x,
                y: pos.y
            });
        });

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
                const slopeInfo = this.tacticsMap.getSlopeInfo(call.r, call.q);
                this.drawTile(call.terrain, call.x, surfaceY, call.elevation, call.r, call.q, edgeStatus, slopeInfo);
                
                if (call.isReachable) {
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 215, 0, 0.3)');
                }

                // Mounted move hover preview (show the planned head+butt destination pair)
                if (call.isMovePreview) {
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 255, 255, 0.28)');
                }
                
                if (call.isAffected) {
                    // Impact preview (Red)
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 0, 0, 0.5)');
                } else if (call.isTelegraphed) {
                    // Telegraphed attack area (Subtle Red)
                    this.drawHighlight(ctx, call.x, surfaceY, 'rgba(255, 0, 0, 0.25)');
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

                // Mounted rendering: draw rider split around the horse so legs "straddle"
                if (u.onHorse) {
                    const riderAction = (u.action === 'walk') ? 'standby' : (u.currentAnimAction || u.action);
                    const buttX = u.visualX + u.visualOffsetX;
                    // Apply terrain sink ONCE for mounted rendering (we'll pass sinkOffset=0 to drawCharacter)
                    const headForSink = this.getMountedHeadCellFor(u, u.r, u.q);
                    const isHorseInShallow =
                        (!!cell && cell.terrain?.includes('water_shallow')) ||
                        (!!headForSink && headForSink.terrain?.includes('water_shallow'));
                    const terrainSink = Math.max(drawOptions.sinkOffset || 0, isHorseInShallow ? 4 : 0);
                    const buttY = surfaceY + u.visualOffsetY + terrainSink;
                    const riderDrawOptions = { ...drawOptions, sinkOffset: 0, isSubmerged: false };

                    const spacing = this.manager.config.horizontalSpacing;
                    const headX = buttX + (u.flip ? -spacing : spacing);
                    const headY = buttY;
                    const midX = Math.floor((buttX + headX) / 2);
                    const midY = Math.floor((buttY + headY) / 2);

                    // Tuning: horse feet were too low; lift the sprite a bit.
                    // Also center/raise the rider so he's seated on the horse back.
                    const horseFeetY = 15; // lower number lifts the horse (feet higher)
                    const riderX = midX;
                    // Requested: rider down 3px, but horse+rider up 5px overall => net rider up 2px from previous
                    const riderY = midY - 22;

                    const nearSide = u.flip ? 'right' : 'left';
                    const farSide = nearSide === 'left' ? 'right' : 'left';

                    const drawHalf = (side) => {
                        ctx.save();
                        const clipX = side === 'left' ? Math.floor(riderX - 36) : Math.floor(riderX);
                        ctx.beginPath();
                        ctx.rect(clipX, Math.floor(riderY - 100), 36, 140);
                        ctx.clip();
                        this.drawCharacter(ctx, u.img, riderAction, u.frame, riderX, riderY, riderDrawOptions);
                        ctx.restore();
                    };

                    // Far leg behind the horse
                    drawHalf(farSide);

                    // Horse (between two adjacent hexes)
                    const keys = this.getHorseSpriteKeys(u.horseType || 'brown');
                    const horseStand = assets.getImage(keys.stand) || assets.getImage('horse_stand');
                    const horseRun = assets.getImage(keys.run) || assets.getImage('horse_run');
                    const isRunning = (u.isMoving || u.action === 'walk') && horseRun;
                    const horseImg = isRunning ? horseRun : horseStand;
                    if (horseImg) {
                        const frameW = 64;
                        const frameH = 64;
                        const frameCount = isRunning ? Math.max(1, Math.floor(horseImg.width / frameW)) : 1;
                        const f = isRunning ? (Math.floor(timestamp / 80) % frameCount) : 0;
                        const sx = f * frameW;

                        const dx = -frameW / 2;
                        const dy = horseFeetY - frameH;

                        const drawHorsePass = (alpha = 1.0, clipRect = null) => {
                            ctx.save();
                            if (clipRect) {
                                ctx.beginPath();
                                ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
                                ctx.clip();
                            }
                            ctx.globalAlpha *= alpha;
                            ctx.translate(midX, midY);
                            if (u.flip) ctx.scale(-1, 1);
                            ctx.drawImage(horseImg, sx, 0, frameW, frameH, dx, dy, frameW, frameH);
                            ctx.restore();
                        };

                        // Submerge horse legs in shallow water (similar to drawCharacter isSubmerged)
                        if (isHorseInShallow) {
                            const topY = midY + dy;
                            const feetY = midY + horseFeetY;
                            // Waterline is slightly above feet due to sink
                            const waterlineY = feetY - terrainSink;
                            drawHorsePass(1.0, { x: midX - 40, y: topY - 10, w: 80, h: Math.max(0, waterlineY - (topY - 10)) });
                            drawHorsePass(0.4, { x: midX - 40, y: waterlineY, w: 80, h: Math.max(0, (feetY + 10) - waterlineY) });
                        } else {
                            drawHorsePass(1.0);
                        }
                    }

                    // Near leg in front of the horse
                    drawHalf(nearSide);
                } else {
                    this.drawCharacter(ctx, u.img, u.currentAnimAction || u.action, u.frame, u.visualX + u.visualOffsetX, surfaceY + u.visualOffsetY, drawOptions);
                }
                
                // Draw cage overlay if unit is caged
                if (u.caged) {
                    const cageKey = u.cageSprite || 'cage';
                    const cageImg = assets.getImage(cageKey);
                    if (cageImg) {
                        // Center cage horizontally over the hex (cage is 36x72)
                        const cageX = Math.floor(u.visualX - cageImg.width / 2);
                        // Align cage bottom with hex bottom
                        // Hex is 36x36 centered at surfaceY, so bottom is surfaceY + 18
                        // Cage is 72 tall, so top should be at (surfaceY + 18) - 72 = surfaceY - 54
                        const cageY = Math.floor(surfaceY - 54);
                        ctx.drawImage(cageImg, cageX, cageY);
                    }
                }
            } else if (call.type === 'horse') {
                const h = call.horse;
                const keys = this.getHorseSpriteKeys(h.type || 'brown');
                const horseStand = assets.getImage(keys.stand) || assets.getImage('horse_stand');
                const horseRun = assets.getImage(keys.run) || assets.getImage('horse_run');
                const isRunning = !!h.isMoving && !!horseRun;
                const horseImg = isRunning ? horseRun : horseStand;

                if (horseImg) {
                    const spacing = this.manager.config.horizontalSpacing;
                    const buttPos = { x: call.x, y: call.y };
                    const headPos = { x: buttPos.x + (h.flip ? -spacing : spacing), y: buttPos.y };
                    const midX = Math.floor((buttPos.x + headPos.x) / 2);
                    const head = this.getHorseHeadCoords(h);
                    const buttCell = this.tacticsMap.getCell(h.r, h.q);
                    const headCell = this.tacticsMap.getCell(head.r, head.q);
                    const isShallow =
                        (!!buttCell && buttCell.terrain?.includes('water_shallow')) ||
                        (!!headCell && headCell.terrain?.includes('water_shallow'));
                    const sink = isShallow ? 4 : 0;
                    const midY = Math.floor((buttPos.y + headPos.y) / 2) + effect.yOffset + sink;

                    const frameW = 64;
                    const frameH = 64;
                    const horseFeetY = 15;
                    const dx = -frameW / 2;
                    const dy = horseFeetY - frameH; // tuned: lift horse so feet aren't underground
                    const frameCount = isRunning ? Math.max(1, Math.floor(horseImg.width / frameW)) : 1;
                    const f = isRunning ? (Math.floor(timestamp / 80) % frameCount) : 0;
                    const sx = f * frameW;

                    const drawHorsePass = (alpha = 1.0, clipRect = null) => {
                        ctx.save();
                        if (clipRect) {
                            ctx.beginPath();
                            ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
                            ctx.clip();
                        }
                        ctx.globalAlpha *= alpha;
                        ctx.translate(midX, midY);
                        if (h.flip) ctx.scale(-1, 1);
                        if (isRunning) ctx.drawImage(horseImg, sx, 0, frameW, frameH, dx, dy, frameW, frameH);
                        else ctx.drawImage(horseImg, dx, dy);
                        ctx.restore();
                    };

                    if (isShallow) {
                        const topY = midY + dy;
                        const feetY = midY + horseFeetY;
                        const waterlineY = feetY - sink;
                        drawHorsePass(1.0, { x: midX - 40, y: topY - 10, w: 80, h: Math.max(0, waterlineY - (topY - 10)) });
                        drawHorsePass(0.4, { x: midX - 40, y: waterlineY, w: 80, h: Math.max(0, (feetY + 10) - waterlineY) });
                    } else {
                        drawHorsePass(1.0);
                    }
                }
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
                let uiX = u.visualX;
                if (u.onHorse) {
                    const spacing = this.manager.config.horizontalSpacing;
                    const headX = u.visualX + (u.flip ? -spacing : spacing);
                    uiX = Math.floor((u.visualX + headX) / 2);
                }
                
                // Draw intent if enemy or ally
                if (u.intent) {
                    this.drawIntent(ctx, u, uiX, surfaceY);
                }

                // Draw HP bar (not for dead units, boulders, or drowning units)
                if (u.hp > 0 && u.name !== 'Boulder' && (!u.isDrowning || u.drownTimer < 500)) {
                    this.drawHpBar(ctx, u, uiX, surfaceY);
                }
            });
        }

        this.drawUI();
        this.rebuildControllerNavTargets();
        this.drawControllerNavFocus(ctx);

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
                const origin = this.getAttackOriginForTarget(this.selectedUnit, this.hoveredCell.r, this.hoveredCell.q);
                if (this.selectedAttack === 'double_blades') {
                    // Double Blades: Show both push arrows
                    const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        // Front target
                        if (this.hoveredCell.unit) {
                            this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                        }
                        // Back target
                        const oppositeDir = (dirIndex + 3) % 6;
                        const backCell = this.tacticsMap.getNeighborInDirection(origin.r, origin.q, oppositeDir);
                        if (backCell && backCell.unit) {
                            this.drawPushArrow(ctx, backCell.r, backCell.q, oppositeDir);
                        }
                    }
                } else if (this.selectedAttack === 'serpent_spear') {
                    // Serpent Spear: Push the further target
                    const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        // Only show arrow if the hovered cell actually contains a unit
                        if (this.hoveredCell.unit) {
                            this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                        }
                    }
                } else {
                    const dirIndex = this.tacticsMap.getDirectionIndex(origin.r, origin.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1 && this.hoveredCell.unit) {
                        this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                    }
                }
            }
        }

        if ((this.isIntroDialogueActive && this.introScript) || (this.isVictoryDialogueActive && this.victoryScript)) {
            const script = this.isIntroDialogueActive ? this.introScript : this.victoryScript;
            // Validate dialogueStep is within bounds
            if (this.dialogueStep >= script.length) {
                console.warn(`Render: dialogueStep ${this.dialogueStep} out of bounds for script length ${script.length}`);
                return; // Don't render invalid dialogue
            }
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
                    'dongzhuo': 'dong-zhuo',
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

    drawChoiceUI() {
        const { ctx, canvas } = this.manager;
        
        // Semi-transparent overlay - taller to fit wrapped text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
        
        // Choice prompt
        this.drawPixelText(ctx, "What will you do?", canvas.width / 2, canvas.height - 82, {
            color: '#ffd700',
            align: 'center',
            font: '10px Silkscreen'
        });
        
        // Choice options - two lines each
        const options = [
            { lines: ["Stay your hand,", "brother!"], color: '#88ff88', hoverColor: '#aaffaa' },
            { lines: ["Free him,", "brothers!"], color: '#ff8888', hoverColor: '#ffaaaa' }
        ];
        
        const optionWidth = 100;
        const optionHeight = 36;
        const spacing = 16;
        const startX = canvas.width / 2 - (options.length * optionWidth + (options.length - 1) * spacing) / 2;
        const optionY = canvas.height - 68;
        
        this.choiceRects = [];
        
        options.forEach((opt, i) => {
            const ox = startX + i * (optionWidth + spacing);
            const isHovered = this.choiceHovered === i;
            
            // Store rect for hit detection
            this.choiceRects.push({ x: ox, y: optionY, w: optionWidth, h: optionHeight, index: i });
            
            // Draw option box
            ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(ox, optionY, optionWidth, optionHeight);
            ctx.strokeStyle = isHovered ? opt.hoverColor : opt.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + 0.5, optionY + 0.5, optionWidth - 1, optionHeight - 1);
            
            // Draw text - two lines
            const lineHeight = 10;
            const textColor = isHovered ? opt.hoverColor : opt.color;
            opt.lines.forEach((line, lineIdx) => {
                this.drawPixelText(ctx, line, ox + optionWidth / 2, optionY + 8 + lineIdx * lineHeight, {
                    color: textColor,
                    align: 'center',
                    font: '8px Silkscreen'
                });
            });
        });
    }

    rebuildControllerNavTargets() {
        const prev = (this.controllerNavIndex >= 0 && this.controllerNavIndex < this.controllerNavTargets.length)
            ? this.controllerNavTargets[this.controllerNavIndex]
            : null;
        const prevId = prev ? prev.id : null;
        const targets = [];

        if (this.isChoiceActive && this.choiceRects) {
            this.choiceRects.forEach(rect => {
                targets.push({
                    id: `choice:${rect.index}`,
                    type: 'choice',
                    x: rect.x + rect.w / 2,
                    y: rect.y + rect.h / 2,
                    rect,
                    choiceIndex: rect.index
                });
            });
        } else if (this.showEndTurnConfirm) {
            if (this.confirmYesRect) {
                targets.push({
                    id: 'confirm:yes',
                    type: 'confirm_yes',
                    x: this.confirmYesRect.x + this.confirmYesRect.w / 2,
                    y: this.confirmYesRect.y + this.confirmYesRect.h / 2,
                    rect: this.confirmYesRect
                });
            }
            if (this.confirmNoRect) {
                targets.push({
                    id: 'confirm:no',
                    type: 'confirm_no',
                    x: this.confirmNoRect.x + this.confirmNoRect.w / 2,
                    y: this.confirmNoRect.y + this.confirmNoRect.h / 2,
                    rect: this.confirmNoRect
                });
            }
        } else if (!this.isProcessingTurn && !this.isIntroAnimating && !this.isGameOver) {
            if (this.endTurnRect) targets.push({ id: 'ui:end_turn', type: 'ui', x: this.endTurnRect.x + this.endTurnRect.w / 2, y: this.endTurnRect.y + this.endTurnRect.h / 2, rect: this.endTurnRect });
            if (this.resetTurnRect) targets.push({ id: 'ui:reset', type: 'ui', x: this.resetTurnRect.x + this.resetTurnRect.w / 2, y: this.resetTurnRect.y + this.resetTurnRect.h / 2, rect: this.resetTurnRect });
            if (this.attackOrderRect) targets.push({ id: 'ui:order', type: 'ui', x: this.attackOrderRect.x + this.attackOrderRect.w / 2, y: this.attackOrderRect.y + this.attackOrderRect.h / 2, rect: this.attackOrderRect });
            if (this.undoRect) targets.push({ id: 'ui:undo', type: 'ui', x: this.undoRect.x + this.undoRect.w / 2, y: this.undoRect.y + this.undoRect.h / 2, rect: this.undoRect });

            if (this.attackRects && this.selectedUnit && this.selectedUnit.faction === 'player') {
                this.attackRects.forEach(r => {
                    targets.push({
                        id: `ability:${r.key}`,
                        type: 'ability',
                        x: r.x + r.w / 2,
                        y: r.y + r.h / 2,
                        rect: r,
                        attackKey: r.key
                    });
                });
            }

            if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.selectedAttack) {
                for (const key of this.attackTiles.keys()) {
                    const [r, q] = key.split(',').map(Number);
                    const pos = this.getPixelPos(r, q);
                    targets.push({ id: `attack_cell:${r},${q}`, type: 'attack_cell', x: pos.x, y: pos.y, r, q });
                }
            } else if (this.selectedUnit && this.selectedUnit.faction === 'player' && !this.selectedUnit.hasMoved) {
                for (const key of this.reachableTiles.keys()) {
                    const [r, q] = key.split(',').map(Number);
                    const pos = this.getPixelPos(r, q);
                    targets.push({ id: `move_cell:${r},${q}`, type: 'move_cell', x: pos.x, y: pos.y, r, q });
                }
            }

            this.units.forEach(u => {
                if (u.hp > 0 && !u.isGone) {
                    targets.push({
                        id: `unit:${u.id}`,
                        type: 'unit',
                        x: u.visualX,
                        y: u.visualY,
                        r: u.r,
                        q: u.q,
                        unit: u
                    });
                }
            });
        }

        this.controllerNavTargets = targets;
        if (targets.length === 0) {
            this.controllerNavIndex = -1;
            return;
        }

        const preserved = prevId ? targets.findIndex(t => t.id === prevId) : -1;
        if (preserved >= 0) {
            this.controllerNavIndex = preserved;
        } else {
            const defaultUnit = this.selectedUnit ? targets.findIndex(t => t.type === 'unit' && t.unit === this.selectedUnit) : -1;
            this.controllerNavIndex = defaultUnit >= 0 ? defaultUnit : 0;
        }
    }

    drawControllerNavFocus(ctx) {
        if (this.controllerNavMouseEnabled) return;
        if (!this.controllerNavTargets || this.controllerNavTargets.length === 0) return;
        if (this.controllerNavIndex < 0 || this.controllerNavIndex >= this.controllerNavTargets.length) return;
        const t = this.controllerNavTargets[this.controllerNavIndex];
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        if (t.rect) {
            ctx.strokeRect(Math.floor(t.rect.x) - 1.5, Math.floor(t.rect.y) - 1.5, Math.floor(t.rect.w) + 2, Math.floor(t.rect.h) + 2);
        } else {
            const size = (t.type === 'unit') ? 16 : 14;
            ctx.strokeRect(Math.floor(t.x - size / 2) - 0.5, Math.floor(t.y - size / 2) - 0.5, size, size);
        }
        ctx.restore();
    }

    moveControllerSelection(dirX, dirY) {
        if (!this.controllerNavTargets || this.controllerNavTargets.length <= 1) return;
        if (this.controllerNavIndex < 0 || this.controllerNavIndex >= this.controllerNavTargets.length) {
            this.controllerNavIndex = 0;
            return;
        }
        const cur = this.controllerNavTargets[this.controllerNavIndex];

        const isMapTarget = (t) => t && (t.type === 'move_cell' || t.type === 'attack_cell' || t.type === 'unit');
        const findMapTargetAt = (r, q, preferredType = null) => {
            if (preferredType) {
                const exact = this.controllerNavTargets.findIndex(t => t.r === r && t.q === q && t.type === preferredType);
                if (exact >= 0) return exact;
            }
            return this.controllerNavTargets.findIndex(t => t.r === r && t.q === q && isMapTarget(t));
        };

        // Hex-first navigation: for map targets, arrow keys should prefer adjacent hexes.
        if (isMapTarget(cur) && cur.r !== undefined && cur.q !== undefined) {
            let dirChoices = [];
            if (dirX > 0) dirChoices = [1];       // E
            else if (dirX < 0) dirChoices = [4];  // W
            else if (dirY < 0) dirChoices = [0, 5]; // NE, NW
            else if (dirY > 0) dirChoices = [2, 3]; // SE, SW

            for (const d of dirChoices) {
                const n = this.tacticsMap.getNeighborInDirection(cur.r, cur.q, d);
                if (!n) continue;
                const idx = findMapTargetAt(n.r, n.q, cur.type);
                if (idx >= 0) {
                    this.controllerNavIndex = idx;
                    const t = this.controllerNavTargets[idx];
                    if (t.type === 'unit' && t.unit) this.hoveredCell = this.tacticsMap.getCell(t.unit.r, t.unit.q);
                    if ((t.type === 'move_cell' || t.type === 'attack_cell') && t.r !== undefined) this.hoveredCell = this.tacticsMap.getCell(t.r, t.q);
                    assets.playSound('ui_click', 0.5);
                    return;
                }
            }
        }

        let bestIdx = this.findDirectionalTargetIndex(this.controllerNavIndex, this.controllerNavTargets, dirX, dirY, { coneSlope: 2.2 });
        if (bestIdx === -1) {
            // Never strand focus: if no directional candidate exists, step deterministically.
            bestIdx = (this.controllerNavIndex + 1) % this.controllerNavTargets.length;
        }

        this.controllerNavIndex = bestIdx;
        const t = this.controllerNavTargets[bestIdx];
        if (t.type === 'unit' && t.unit) this.hoveredCell = this.tacticsMap.getCell(t.unit.r, t.unit.q);
        if ((t.type === 'move_cell' || t.type === 'attack_cell') && t.r !== undefined) this.hoveredCell = this.tacticsMap.getCell(t.r, t.q);
        assets.playSound('ui_click', 0.5);
    }

    activateControllerTarget() {
        if (this.controllerNavIndex < 0 || this.controllerNavIndex >= this.controllerNavTargets.length) return;
        const t = this.controllerNavTargets[this.controllerNavIndex];
        if (!t) return;
        if (t.type === 'unit' && t.unit) {
            this.hoveredCell = this.tacticsMap.getCell(t.unit.r, t.unit.q);
        } else if ((t.type === 'move_cell' || t.type === 'attack_cell') && t.r !== undefined && t.q !== undefined) {
            this.hoveredCell = this.tacticsMap.getCell(t.r, t.q);
        }
        this.clickLogicalPoint(t.x, t.y);
    }

    clickLogicalPoint(x, y) {
        const { canvas } = this.manager;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = rect.left + x / scaleX;
        const clientY = rect.top + y / scaleY;
        this.handleInput({ clientX, clientY });
    }

    clearBattleSelection() {
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.attackRects = [];
        this.activeDialogue = null;
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

    drawStraightSwipe(ctx, p) {
        // Draw a fast "thrust" indicator: a thin lens ("elongated lemon") with pointy ends,
        // straight centerline, curved edges, fully filled.
        const dx = p.endX - p.startX;
        const dy = p.endY - p.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) return;

        // Flash + fade (no travel)
        const alpha = Math.max(0, 1 - p.progress);

        const dirX = dx / dist;
        const dirY = dy / dist;
        const perpX = -dirY;
        const perpY = dirX;

        // Build a filled lens polygon around a straight centerline.
        // Width tapers to 0 at ends, peaks in middle -> pointy ends.
        const numPoints = 18;
        const maxHalfWidth = 2.5; // thin thrust — max 5px total width
        const maxBow = 0.0;       // straight (no centerline bow)

        const left = [];
        const right = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;

            // Center point on straight line
            let cx = p.startX + t * dx;
            let cy = p.startY + t * dy;

            // Bow the centerline outward in the middle, but keep ends on the true line
            const bow = Math.sin(t * Math.PI) * maxBow;
            cx += perpX * bow;
            cy += perpY * bow;

            // Lens half-width: sin(pi*t) gives pointy ends + curved edges
            const w = maxHalfWidth * Math.sin(t * Math.PI);

            left.push({ x: cx + perpX * w, y: cy + perpY * w });
            right.push({ x: cx - perpX * w, y: cy - perpY * w });
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';

        ctx.beginPath();
        ctx.moveTo(Math.floor(left[0].x), Math.floor(left[0].y));
        for (let i = 1; i < left.length; i++) ctx.lineTo(Math.floor(left[i].x), Math.floor(left[i].y));
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(Math.floor(right[i].x), Math.floor(right[i].y));
        ctx.closePath();

        ctx.fill();
        ctx.restore();
    }

    drawArcSwipe(ctx, p) {
        // Draw a curved "swoosh" arc (solid white).
        // p.affectedHexes: array of {r, q}
        // p.startPos: attacker position (used to orient the arc)
        // p.arcWidth: 1 (single) or 3 (wide arc)
        if (!p.affectedHexes || p.affectedHexes.length === 0) return;
        
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 1;
        
        // Flash + fade (no travel)
        const alpha = Math.max(0, 1 - p.progress);
        ctx.globalAlpha = alpha;

        const hexPositions = p.affectedHexes.map(hex => this.getPixelPos(hex.r, hex.q));
        const center = hexPositions.reduce((acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }), { x: 0, y: 0 });
        center.x /= hexPositions.length;
        center.y /= hexPositions.length;

        const startPos = p.startPos || center;
        const dx = center.x - startPos.x;
        const dy = center.y - startPos.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / d;
        const dirY = dy / d;
        const perpX = -dirY;
        const perpY = dirX;

        // Find left/right extremes among affected hexes
        let left = hexPositions[0];
        let right = hexPositions[0];
        for (const pt of hexPositions) {
            const s = (pt.x - center.x) * perpX + (pt.y - center.y) * perpY;
            const sl = (left.x - center.x) * perpX + (left.y - center.y) * perpY;
            const sr = (right.x - center.x) * perpX + (right.y - center.y) * perpY;
            if (s < sl) left = pt;
            if (s > sr) right = pt;
        }

        const arcWidth = p.arcWidth || Math.max(1, p.affectedHexes.length);

        // Wide arc (Guan Yu / Tyrant Sweep): sabre-swing silhouette with 3 key points:
        //   tail   – tapered tip at the "top" extreme hex (left)
        //   bladeA – top corner of blade edge, in the "bottom" extreme hex (right)
        //   bladeB – bottom corner of blade edge, in the "bottom" extreme hex (right)
        // All three edges are quadratic curves so the shape reads as a curved sabre blade.
        if (arcWidth >= 3) {
            const halfThick  = 8;   // half the blade-edge span (perpendicular)
            const edgePush   = 8;   // push blade edge forward (dir) from right-hex centre
            const outwardBow = 14;  // blade-edge control bow (forward) → sabre curve
            const spineForward = 10; // spine-arc control forward offset from centre
            const bellyForward = 20; // belly-arc control forward offset from centre

            // ── 3 anchor points ──────────────────────────────────────────────
            // Tail: tapered tip at the "top" extreme hex
            const tail = { x: left.x, y: left.y };

            // bladeA: "top" corner of blade edge (toward tail side), pushed forward
            const bladeA = {
                x: right.x + dirX * edgePush - perpX * halfThick,
                y: right.y + dirY * edgePush - perpY * halfThick
            };

            // bladeB: "bottom" corner of blade edge (away from tail), pushed forward
            const bladeB = {
                x: right.x + dirX * edgePush + perpX * halfThick,
                y: right.y + dirY * edgePush + perpY * halfThick
            };

            // ── Quadratic control points (all bow in the forward / dir direction) ──
            // Spine arc (tail → bladeA): subtle forward bow
            const spineCtrl = {
                x: center.x + dirX * spineForward,
                y: center.y + dirY * spineForward
            };
            // Blade edge (bladeA → bladeB): cutting edge bows outward like a sabre
            const bladeCtrl = {
                x: right.x + dirX * (edgePush + outwardBow),
                y: right.y + dirY * (edgePush + outwardBow)
            };
            // Belly / swing arc (bladeB → tail): main sweeping arc through middle hex
            const bellyCtrl = {
                x: center.x + dirX * bellyForward,
                y: center.y + dirY * bellyForward
            };

            ctx.beginPath();
            ctx.moveTo(Math.floor(tail.x), Math.floor(tail.y));

            // Spine edge: tail → bladeA  (slightly curved, forward-bowing)
            ctx.quadraticCurveTo(
                Math.floor(spineCtrl.x), Math.floor(spineCtrl.y),
                Math.floor(bladeA.x),    Math.floor(bladeA.y)
            );
            // Blade edge: bladeA → bladeB  (bowed outward = sabre curvature)
            ctx.quadraticCurveTo(
                Math.floor(bladeCtrl.x), Math.floor(bladeCtrl.y),
                Math.floor(bladeB.x),    Math.floor(bladeB.y)
            );
            // Belly / swing arc: bladeB → tail  (main sweeping arc)
            ctx.quadraticCurveTo(
                Math.floor(bellyCtrl.x), Math.floor(bellyCtrl.y),
                Math.floor(tail.x),      Math.floor(tail.y)
            );

            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return;
        }

        const thickness = arcWidth === 1 ? 6 : 10;
        const frontPush = arcWidth === 1 ? 6 : 10;
        const trailLen = arcWidth === 1 ? 14 : 18;
        const outwardBulge = arcWidth === 1 ? 10 : 14;

        // Outer/front edge endpoints (curved like a blade)
        const outerL = { x: left.x + dirX * frontPush, y: left.y + dirY * frontPush };
        const outerR = { x: right.x + dirX * frontPush, y: right.y + dirY * frontPush };
        const outerCtrl = { x: center.x + dirX * (frontPush + 4) + perpX * outwardBulge, y: center.y + dirY * (frontPush + 4) + perpY * outwardBulge };

        // Inner/trailing edge endpoints (tapering arc behind)
        const innerR = { x: right.x - dirX * trailLen, y: right.y - dirY * trailLen };
        const innerL = { x: left.x - dirX * trailLen, y: left.y - dirY * trailLen };
        const innerCtrl = { x: center.x - dirX * (trailLen + 2) + perpX * (outwardBulge * 0.55), y: center.y - dirY * (trailLen + 2) + perpY * (outwardBulge * 0.55) };

        // Offset outer/inner edges by thickness so the swoosh is filled, not hollow
        const outerL2 = { x: outerL.x + perpX * (thickness * 0.5), y: outerL.y + perpY * (thickness * 0.5) };
        const outerR2 = { x: outerR.x - perpX * (thickness * 0.5), y: outerR.y - perpY * (thickness * 0.5) };
        const innerR2 = { x: innerR.x - perpX * (thickness * 0.25), y: innerR.y - perpY * (thickness * 0.25) };
        const innerL2 = { x: innerL.x + perpX * (thickness * 0.25), y: innerL.y + perpY * (thickness * 0.25) };

        // Curved end caps so there are no straight segments
        const capCtrlR = { x: right.x + dirX * (frontPush - trailLen * 0.4), y: right.y + dirY * (frontPush - trailLen * 0.4) };
        const capCtrlL = { x: left.x + dirX * (frontPush - trailLen * 0.4), y: left.y + dirY * (frontPush - trailLen * 0.4) };

        ctx.beginPath();
        // Outer/front edge curve
        ctx.moveTo(Math.floor(outerL2.x), Math.floor(outerL2.y));
        ctx.quadraticCurveTo(Math.floor(outerCtrl.x), Math.floor(outerCtrl.y), Math.floor(outerR2.x), Math.floor(outerR2.y));
        // Right cap (outer -> inner)
        ctx.quadraticCurveTo(Math.floor(capCtrlR.x), Math.floor(capCtrlR.y), Math.floor(innerR2.x), Math.floor(innerR2.y));
        // Inner/trailing edge curve back
        ctx.quadraticCurveTo(Math.floor(innerCtrl.x), Math.floor(innerCtrl.y), Math.floor(innerL2.x), Math.floor(innerL2.y));
        // Left cap (inner -> outer)
        ctx.quadraticCurveTo(Math.floor(capCtrlL.x), Math.floor(capCtrlL.y), Math.floor(outerL2.x), Math.floor(outerL2.y));
        ctx.closePath();

        // Solid white fill (the fade is handled by ctx.globalAlpha)
        ctx.fill();
        
        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Unified Swish System
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Spawn a swish indicator for any attack.
     *
     * @param {Array<{r,q}>} hexes      Affected hex grid coords (unordered OK for 'arc')
     * @param {{x,y}}        originPos  Attacker pixel position (used for direction)
     * @param {string}       style      'arc' | 'slash' | 'stab'
     *   'arc'   – ribbon flows through hexes sorted perp to attack dir (sweeping arc)
     *   'slash' – perpendicular lens stroke through the first (only) hex
     *   'stab'  – thin needle from origin along the attack direction through hexes
     * @param {Object}       [opts]
     * @param {number}       [opts.maxWidth=8]   Peak half-width in px
     * @param {string}       [opts.color='#fff']
     * @param {number}       [opts.duration=160]
     */
    spawnSwish(hexes, originPos, style = 'arc', opts = {}) {
        const { maxWidth = 8, color = '#fff', duration = 160, swingDir = 1 } = opts;

        if (!hexes || hexes.length === 0) return;

        const hexPixels = hexes.map(h => this.getPixelPos(h.r, h.q));

        // Direction from origin toward the centroid of affected hexes
        const cX = hexPixels.reduce((s, p) => s + p.x, 0) / hexPixels.length;
        const cY = hexPixels.reduce((s, p) => s + p.y, 0) / hexPixels.length;
        const dxC = cX - originPos.x, dyC = cY - originPos.y;
        const dC  = Math.sqrt(dxC * dxC + dyC * dyC) || 1;
        const dirX = dxC / dC, dirY = dyC / dC;
        const perpX = -dirY, perpY = dirX;

        let points;

        if (style === 'stab') {
            // Thin ribbon from origin through hexes in attack-direction order
            const sorted = hexPixels.slice().sort(
                (a, b) => (a.x * dirX + a.y * dirY) - (b.x * dirX + b.y * dirY)
            );
            points = [originPos, ...sorted];

        } else if (style === 'slash') {
            // Perpendicular lens stroke through the target hex
            const tgt = hexPixels[0];
            const halfLen = Math.max(14, maxWidth * 1.8);
            points = [
                { x: tgt.x - perpX * halfLen, y: tgt.y - perpY * halfLen },
                tgt,
                { x: tgt.x + perpX * halfLen, y: tgt.y + perpY * halfLen }
            ];

        } else { // 'arc'
            // Sort by screen-Y so the topmost hex is always the tail for a downward swing.
            // This is correct for both east- and west-facing characters (the perp-direction
            // sort would flip for west attacks, wrongly putting the tail at the bottom).
            // swingDir = 1 → top-to-bottom (default, downward slash, clockwise for right / ccw for left)
            // swingDir = -1 → bottom-to-top (upward swing, rare)
            const sorted = hexPixels.slice().sort((a, b) => (a.y - b.y) * swingDir);
            points = sorted;
        }

        this.projectiles.push({
            type: 'swish',
            points,
            style,
            maxWidth,
            color,
            progress: 0,
            duration,
        });
    }

    /**
     * Draw a smooth tapered ribbon swish along a pre-computed point sequence.
     * Width taper:
     *   'slash' / 'stab' → symmetric lens (sin curve, thin at both ends)
     *   'arc'            → sabre: zero at tail, grows to peak, quick taper at tip
     */
    drawSwish(ctx, p) {
        if (!p.points || p.points.length < 2) return;
        // Slow fade: stays near full opacity for most of the duration, drops at the end
        const alpha = Math.max(0, 1 - p.progress * p.progress);
        if (alpha <= 0) return;

        const maxW  = p.maxWidth || 8;
        const style = p.style   || 'arc';

        const widthAt = (t) => {
            if (style === 'slash' || style === 'stab') {
                // Symmetric lens: zero at ends, peak in middle
                return maxW * Math.sin(t * Math.PI);
            }
            // Sabre: zero at tail, ramps up, sharp taper at very tip
            const grow  = Math.min(1, t / 0.65);
            const taper = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1;
            return maxW * grow * taper;
        };

        const totalSamples = Math.max(24, p.points.length * 14);
        const samples = this._catmullRomSample(p.points, totalSamples);

        const left = [], right = [];
        for (let i = 0; i < samples.length; i++) {
            const t  = i / (samples.length - 1);
            const s  = samples[i];
            const nx = i < samples.length - 1 ? samples[i + 1].x - s.x : s.x - samples[i - 1].x;
            const ny = i < samples.length - 1 ? samples[i + 1].y - s.y : s.y - samples[i - 1].y;
            const nLen = Math.sqrt(nx * nx + ny * ny) || 1;
            const px = -ny / nLen, py = nx / nLen;
            const w  = widthAt(t);
            left.push({ x: s.x + px * w, y: s.y + py * w });
            right.push({ x: s.x - px * w, y: s.y - py * w });
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color || '#fff';
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (let i = 1; i < left.length; i++)          ctx.lineTo(left[i].x,  left[i].y);
        for (let i = right.length - 1; i >= 0; i--)    ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Sample a Catmull-Rom spline through the given control points.
     * Ghost points are added at each end so the curve enters/exits cleanly.
     */
    _catmullRomSample(points, totalSamples) {
        if (points.length === 1) return [{ ...points[0] }];

        // Ghost points that mirror the first and last segments
        const first = points[0], second = points[1];
        const last  = points[points.length - 1], prev = points[points.length - 2];
        const pts = [
            { x: 2 * first.x - second.x, y: 2 * first.y - second.y },
            ...points,
            { x: 2 * last.x - prev.x,    y: 2 * last.y  - prev.y  }
        ];

        const segments   = points.length - 1;
        const sps        = Math.max(2, Math.ceil(totalSamples / segments));
        const result     = [];

        for (let seg = 0; seg < segments; seg++) {
            const p0 = pts[seg], p1 = pts[seg + 1], p2 = pts[seg + 2], p3 = pts[seg + 3];
            // Include the final endpoint only on the last segment to avoid duplicates
            const count = seg === segments - 1 ? sps + 1 : sps;
            for (let i = 0; i < count; i++) {
                const t  = i / sps;
                const t2 = t * t, t3 = t2 * t;
                result.push({
                    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
                });
            }
        }
        return result;
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

    drawTile(terrainType, x, y, elevation = 0, r = 0, q = 0, edgeStatus = {}, slopeInfo = {}) {
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
        const elevationStep = this.tacticsMap.elevationStep; // Height difference per level (3 pixels)
        
        // Get neighbor positions for slope calculations
        const getNeighborElevation = (direction) => {
            const neighbor = this.tacticsMap.getCell(r + direction.dr, q + direction.dq);
            if (!neighbor) return null;
            return neighbor.elevation || 0;
        };
        
        const directions = this.tacticsMap.getDirections(r);
        const labels = ['NE', 'E', 'SE', 'SW', 'W', 'NW'];
        const currentCell = this.tacticsMap.getCell(r, q);
        const isCurrentBuilding = currentCell && (currentCell.terrain.includes('house') || currentCell.terrain.includes('wall'));
        
        // Helper to check if an edge should show black outline (cliffs only, not buildings)
        const isCliffEdge = (edgeLabel) => {
            if (!edgeStatus[edgeLabel]) return false;
            const direction = directions[labels.indexOf(edgeLabel)];
            if (!direction) return false;
            const neighbor = this.tacticsMap.getCell(r + direction.dr, q + direction.dq);
            if (!neighbor) return false;
            // Don't show black edges for buildings
            if (isCurrentBuilding) return false;
            const isNeighborBuilding = neighbor.terrain && (neighbor.terrain.includes('house') || neighbor.terrain.includes('wall'));
            if (isNeighborBuilding) return false;
            // Only show black edge if it's a cliff (height diff > 1)
            const levelDiff = Math.abs((neighbor.level || 0) - (currentCell?.level || 0));
            return levelDiff > 1;
        };
        
        // Determine which edge each column is on, with smooth blending at boundaries
        const getEdgeForColumn = (ix) => {
            if (ix >= 7 && ix <= 17) {
                // Smooth transition between NW and SW around column 12
                if (ix <= 10) return 'NW';
                if (ix >= 14) return 'SW';
                // Blend zone: columns 11-13
                return null; // Will be handled specially
            }
            if (ix >= 18 && ix <= 28) {
                // Smooth transition between NE and SE around column 23
                if (ix <= 21) return 'NE';
                if (ix >= 25) return 'SE';
                // Blend zone: columns 22-24
                return null; // Will be handled specially
            }
            if (ix < 7) return 'W';
            if (ix > 28) return 'E';
            return null;
        };
        
        // Helper to blend slope offsets from two edges
        const blendSlopeOffset = (ix, edge1, edge2, blendStart, blendEnd) => {
            if (!slopeInfo[edge1] && !slopeInfo[edge2]) return 0;
            
            const blendProgress = (ix - blendStart) / (blendEnd - blendStart);
            const direction1 = directions[labels.indexOf(edge1)];
            const direction2 = directions[labels.indexOf(edge2)];
            const elev1 = getNeighborElevation(direction1);
            const elev2 = getNeighborElevation(direction2);
            
            let offset1 = 0, offset2 = 0;
            if (slopeInfo[edge1] && elev1 !== null) {
                const slopeDir1 = slopeInfo[edge1];
                const slopeHeight1 = slopeDir1 * elevationStep;
                // Calculate progress along edge1 (approaching the blend zone)
                const edgeProgress1 = 1.0; // At the end of edge1
                offset1 = slopeHeight1 * edgeProgress1;
            }
            if (slopeInfo[edge2] && elev2 !== null) {
                const slopeDir2 = slopeInfo[edge2];
                const slopeHeight2 = slopeDir2 * elevationStep;
                // Calculate progress along edge2 (starting from the blend zone)
                const edgeProgress2 = 0.0; // At the start of edge2
                offset2 = slopeHeight2 * edgeProgress2;
            }
            
            // Smooth blend between the two edges
            const t = blendProgress;
            const smoothT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            return offset1 * (1 - smoothT) + offset2 * smoothT;
        };
        
        for (let ix = 0; ix < 36; ix++) {
            let edgeY = null;
            // The hex footprint logic (bottom 36px)
            const footprintStart = isTall ? 36 : 0;
            const relIx = ix;
            if (relIx >= 7 && relIx <= 17) edgeY = 25 + Math.floor((relIx - 7) * (30 - 25) / 10);
            else if (relIx >= 18 && relIx <= 28) edgeY = 30 + Math.floor((relIx - 18) * (25 - 30) / 10);

            // Check if this column is on a sloped edge
            const edge = getEdgeForColumn(ix);
            let slopeOffset = 0;
            let hasSlope = false;
            
            // Handle blend zones (smooth transitions between edges)
            if (edge === null && ix >= 11 && ix <= 13) {
                // Blend zone between NW and SW
                slopeOffset = blendSlopeOffset(ix, 'NW', 'SW', 11, 13);
                hasSlope = slopeOffset !== 0;
            } else if (edge === null && ix >= 22 && ix <= 24) {
                // Blend zone between NE and SE
                slopeOffset = blendSlopeOffset(ix, 'NE', 'SE', 22, 24);
                hasSlope = slopeOffset !== 0;
            } else if (edge && slopeInfo[edge] !== undefined) {
                hasSlope = true;
                const direction = directions[labels.indexOf(edge)];
                const neighborElevation = getNeighborElevation(direction);
                if (neighborElevation !== null && direction) {
                    const slopeDirection = slopeInfo[edge]; // +1 = uphill, -1 = downhill
                    // Calculate how much to stretch this column
                    // For columns on the edge, we stretch them to connect to the neighbor
                    const slopeHeight = slopeDirection * elevationStep;
                    
                    // Determine how far along the edge this column is (0 to 1)
                    let edgeProgress = 0;
                    if (edge === 'NW') {
                        edgeProgress = Math.max(0, Math.min(1, (ix - 7) / 3)); // Columns 7-10, normalized to 0-1
                    } else if (edge === 'SW') {
                        edgeProgress = Math.max(0, Math.min(1, (ix - 14) / 3)); // Columns 14-17, normalized to 0-1
                    } else if (edge === 'NE') {
                        edgeProgress = Math.max(0, Math.min(1, (ix - 18) / 3)); // Columns 18-21, normalized to 0-1
                    } else if (edge === 'SE') {
                        edgeProgress = Math.max(0, Math.min(1, (ix - 25) / 3)); // Columns 25-28, normalized to 0-1
                    } else if (edge === 'W') {
                        edgeProgress = Math.max(0, Math.min(1, ix / 6)); // Columns 0-6, clamped
                    } else if (edge === 'E') {
                        edgeProgress = Math.max(0, Math.min(1, (ix - 29) / 6)); // Columns 29-35, clamped
                    }
                    
                    // Apply smooth easing to reduce visible steps
                    // Ease-in-out cubic for smoother transitions
                    const t = edgeProgress;
                    const smoothProgress = t < 0.5 
                        ? 4 * t * t * t 
                        : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    
                    // Interpolate the slope offset based on position along edge
                    slopeOffset = slopeHeight * smoothProgress;
                }
            }

            if (edgeY !== null) {
                // Top part (above the footprint edges)
                const topPartHeight = footprintStart + edgeY;
                
                // If there's a slope, stretch the column vertically
                if (hasSlope && slopeOffset !== 0) {
                    // Stretch the top part to create the ramp
                    // slopeOffset is positive for uphill (neighbor higher), negative for downhill (neighbor lower)
                    const stretchedHeight = topPartHeight + Math.abs(slopeOffset);
                    // For downhill (negative offset), we need to start drawing earlier (move up)
                    // For uphill (positive offset), we extend downward from the same start point
                    const stretchY = slopeOffset < 0 ? slopeOffset : 0;
                    
                    // Draw stretched column - clamp to prevent going off-screen
                    const drawY = dy + stretchY;
                    if (drawY >= 0 && drawY < this.manager.canvas.height) {
                        ctx.drawImage(img, ix, 0, 1, topPartHeight, dx + ix, drawY, 1, stretchedHeight);
                    } else {
                        // Fallback: draw normally if coordinates are invalid
                        ctx.drawImage(img, ix, 0, 1, topPartHeight, dx + ix, dy, 1, topPartHeight);
                    }
                } else {
                    ctx.drawImage(img, ix, 0, 1, topPartHeight, dx + ix, dy, 1, topPartHeight);
                }
                
                // Impassable Edge Highlighting (Black Outline) - only for cliffs, not buildings
                ctx.fillStyle = '#000000';
                if (silhouette) {
                    // Top edges (NW/NE) - follow the silhouette
                    if (((edgeStatus.NW && isCliffEdge('NW') && ix < 18) || (edgeStatus.NE && isCliffEdge('NE') && ix >= 18))) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1 && sy < topPartHeight) {
                            const highlightY = hasSlope && slopeOffset < 0 ? dy + sy + slopeOffset : dy + sy;
                            ctx.fillRect(dx + ix, Math.max(0, highlightY), 1, 2);
                        }
                    }
                    // Bottom edges (SW/SE) - follow the footprint edge
                    if (((edgeStatus.SW && isCliffEdge('SW') && ix < 18) || (edgeStatus.SE && isCliffEdge('SE') && ix >= 18))) {
                        const edgeYPos = hasSlope && slopeOffset < 0 ? dy + topPartHeight - 1 + slopeOffset : dy + topPartHeight - 1;
                        ctx.fillRect(dx + ix, Math.max(0, edgeYPos), 1, 2);
                    }
                } else {
                    // Fallback without silhouette
                    if (((edgeStatus.NW && isCliffEdge('NW') && ix < 18) || (edgeStatus.NE && isCliffEdge('NE') && ix >= 18))) {
                        const highlightY = hasSlope && slopeOffset < 0 ? dy + slopeOffset : dy;
                        ctx.fillRect(dx + ix, Math.max(0, highlightY), 1, 2);
                    }
                }
                
                // The vertical "side" edge - keep it aligned with the top part
                // Calculate where the side edge should be based on the stretched top part
                let sideY = dy + topPartHeight;
                if (hasSlope && slopeOffset !== 0) {
                    // If we stretched upward (downhill), adjust the side edge position
                    if (slopeOffset < 0) {
                        sideY = dy + topPartHeight + slopeOffset;
                    }
                    // If uphill (slopeOffset > 0), the side edge stays at the same position
                }
                ctx.drawImage(img, ix, topPartHeight, 1, 1, dx + ix, sideY, 1, extraDepth);
                
                // The bottom part of the hex "lip"
                const bottomPartHeight = sourceHeight - topPartHeight;
                ctx.drawImage(img, ix, topPartHeight, 1, bottomPartHeight, dx + ix, sideY + extraDepth, 1, bottomPartHeight);
            } else {
                // For side columns (W/E), also handle slopes
                if (hasSlope && slopeOffset !== 0) {
                    const stretchedHeight = sourceHeight + Math.abs(slopeOffset);
                    const stretchY = slopeOffset < 0 ? slopeOffset : 0;
                    const drawY = dy + stretchY;
                    if (drawY >= 0 && drawY < this.manager.canvas.height) {
                        ctx.drawImage(img, ix, 0, 1, sourceHeight, dx + ix, drawY, 1, stretchedHeight);
                    } else {
                        // Fallback: draw normally if coordinates are invalid
                        ctx.drawImage(img, ix, 0, 1, sourceHeight, dx + ix, dy, 1, sourceHeight);
                    }
                } else {
                    ctx.drawImage(img, ix, 0, 1, sourceHeight, dx + ix, dy, 1, sourceHeight);
                }

                // Handle edges for the sides of the hex (columns 0-6 and 29-35)
                // For left side (columns 0-6), check W edge specifically
                // For right side (columns 29-35), check E edge specifically
                ctx.fillStyle = '#000000';
                if (silhouette) {
                    // Left side (W edge) - columns 0-6
                    if (ix < 7 && edgeStatus.W && isCliffEdge('W')) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1) {
                            const highlightY = hasSlope && slopeOffset < 0 ? dy + slopeOffset + sy : dy + sy;
                            ctx.fillRect(dx + ix, Math.max(0, highlightY), 2, 2);
                        }
                    }
                    // Right side (E edge) - columns 29-35
                    if (ix > 28 && edgeStatus.E && isCliffEdge('E')) {
                        const sy = silhouette.top[ix];
                        if (sy !== -1) {
                            const highlightY = hasSlope && slopeOffset < 0 ? dy + slopeOffset + sy : dy + sy;
                            ctx.fillRect(dx + ix, Math.max(0, highlightY), 2, 2);
                        }
                    }
                } else {
                    // Left side (W edge) - columns 0-6
                    if (ix < 7 && edgeStatus.W && isCliffEdge('W')) {
                        const highlightY = hasSlope && slopeOffset < 0 ? dy + slopeOffset : dy;
                        ctx.fillRect(dx + ix, Math.max(0, highlightY), 2, 2);
                    }
                    // Right side (E edge) - columns 29-35
                    if (ix > 28 && edgeStatus.E && isCliffEdge('E')) {
                        const highlightY = hasSlope && slopeOffset < 0 ? dy + slopeOffset : dy;
                        ctx.fillRect(dx + ix, Math.max(0, highlightY), 2, 2);
                    }
                }
            }
        }
    }

    drawUI() {
        if (this.isChoiceActive) {
            this.drawChoiceUI();
            return;
        }
        
        if (this.isCutscene) {
            const { ctx, canvas } = this.manager;
            if (this.isIntroAnimating || this.isProcessingTurn) return;
            
            // For view-only battles, only show "CLICK TO CONTINUE" when combat is actually complete
            if (this.battleId === 'qingzhou_prelude') {
                const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
                // Only show prompt if combat is complete (no enemies and we're in player turn or post-combat dialogue)
                // Don't show if we're still in NPC turn phases
                if (enemies.length > 0 || (this.turn !== 'player' && this.turn !== 'execution' && !this.isPostCombatDialogue)) {
                    // Still in combat - don't show prompt
                    return;
                }
            }
            
            // Draw a simple prompt to click to continue
            const pulse = Math.abs(Math.sin(Date.now() * 0.003));
            const continueText = getLocalizedText(UI_TEXT['CLICK TO CONTINUE']);
            this.drawPixelText(ctx, continueText, canvas.width / 2, canvas.height - 20, { 
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
            const lineSpacing = LANGUAGE.current === 'zh' ? 12 : 8; // Keep within 40px bar
            const maxTextTop = barY + barH - 10; // 8px font + small padding

            const factionColor = u.faction === 'player' ? '#0f0' : (u.faction === 'allied' ? '#0af' : '#f00');

            // Name (Color-coded, localized)
            const unitName = getLocalizedCharacterName(u.name) || u.name;
            this.drawPixelText(ctx, unitName, bx + 4, by + 4, { color: factionColor, font: '8px Silkscreen' });
            
            // HP Bar (language-independent)
            const hpBarX = bx + 4;
            const hpBarY = by + 4 + lineSpacing;
            const hpBarW = 60;
            const hpBarH = 6;
            const hpPercent = Math.max(0, Math.min(1, u.hp / u.maxHp));
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(hpBarX + 0.5, hpBarY + 0.5, hpBarW - 1, hpBarH - 1);
            
            // Health fill
            const fillW = Math.floor(hpBarW * hpPercent);
            if (fillW > 0) {
                ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.25 ? '#ff0' : '#f00');
                ctx.fillRect(hpBarX + 1, hpBarY + 1, fillW - 2, hpBarH - 2);
            }

            // State/Intent & Order (localized)
            let actionText = getLocalizedText(UI_TEXT['IDLE']);
            let orderText = null;
            if (u.hp > 0 && u.intent && u.intent.type === 'attack') {
                const attack = ATTACKS[u.intent.attackKey];
                if (attack) {
                    const actionName = getLocalizedText(UI_TEXT[attack.name]) || attack.name;
                    const intentLabel = getLocalizedText(UI_TEXT['INTENT:']);
                    actionText = `${intentLabel} ${actionName}`;
                } else {
                    actionText = `${getLocalizedText(UI_TEXT['INTENT:'])} ???`;
                }
                if (u.attackOrder) {
                    const orderLabel = getLocalizedText(UI_TEXT['ORDER:']);
                    orderText = `${orderLabel}${u.attackOrder}`;
                }
            } else if (u.hasActed) {
                actionText = getLocalizedText(UI_TEXT['DONE']);
            }
            
            const actionY = Math.min(by + 4 + lineSpacing * 2, maxTextTop);
            this.drawPixelText(ctx, actionText, bx + 4, actionY, { color: '#aaa', font: '8px Tiny5' });
            const orderY = by + 4 + lineSpacing * 3;
            if (orderText && orderY <= maxTextTop) {
                this.drawPixelText(ctx, orderText, bx + 4, orderY, { color: '#888', font: '8px Tiny5' });
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
            } else if (p.type === 'swipe_straight') {
                this.drawStraightSwipe(ctx, p);
            } else if (p.type === 'swipe_arc') {
                this.drawArcSwipe(ctx, p);
            } else if (p.type === 'swish') {
                this.drawSwish(ctx, p);
            }
        });

        // 3. Turn Indicator (Top Left)
        let turnTextKey = "YOUR TURN";
        let color = '#ffd700';

        if (this.turn === 'enemy_moving') {
            turnTextKey = "ENEMY TURN";
            color = '#f00';
        } else if (this.turn === 'allied_moving') {
            turnTextKey = "ALLY TURN";
            color = '#0af';
        } else if (this.turn === 'execution') {
            turnTextKey = "EXECUTION";
            color = '#fff';
        }

        const turnText = getLocalizedText(UI_TEXT[turnTextKey]);
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
        } else if (this.isFightMode) {
            this.drawPixelText(ctx, "GOAL: FREE LU ZHI", canvas.width / 2, 8, { 
                color: '#fff', 
                font: '8px Tiny5', 
                align: 'center' 
            });
        } else if (this.battleId === 'dongzhuo_battle') {
            this.drawPixelText(ctx, "GOAL: SAVE DONG ZHUO", canvas.width / 2, 8, { 
                color: '#fff', 
                font: '8px Tiny5', 
                align: 'center' 
            });
        }

        // 4. End Turn / Reset Turn / Order / Undo (Bottom Right)
        if (this.turn === 'player' && !this.isProcessingTurn) {
            const hasActedAll = this.allUnitsActed();
            const isChinese = LANGUAGE.current === 'zh';
            
            // Pulse effect for END TURN when all have acted
            const pulse = hasActedAll ? Math.abs(Math.sin(Date.now() / 400)) : 0;
            
            // Get localized text for buttons
            const endTurnText = getLocalizedText(UI_TEXT['END TURN']);
            // Use symbols for language-independent buttons
            const resetText = '\u23EE'; // U+23EE: Black Left-Pointing Double Triangle (rewind to start)
            const orderText = '1,2,3'; // Numbers (universal)
            const undoText = '◄'; // Left triangle
            
            // Calculate button sizes based on text
            ctx.save();
            ctx.font = getFontForLanguage(hasActedAll ? '10px Silkscreen' : '8px Silkscreen');
            const endTurnSize = getTextContainerSize(ctx, endTurnText, hasActedAll ? '10px Silkscreen' : '8px Silkscreen', 8, hasActedAll ? 20 : 8);
            // Symbols are smaller, use fixed widths
            ctx.font = '8px Tiny5';
            const resetSize = { width: 24, height: 8 }; // |<< symbol
            const orderSize = { width: 24, height: 8 }; // 1,2,3 text
            const undoSize = { width: 16, height: 8 }; // ◄ symbol
            ctx.restore();
            
            // Language-independent buttons (RESET, ORDER, UNDO) use same layout for both languages
            // END TURN button is larger in Chinese to fit the text
            let endTurnW, endTurnH, endTurnX, endTurnY;
            let otherBtnW, otherBtnH, resetX, resetY, orderX, orderY, undoX, undoY;
            
            // Symbol buttons are the same size in both languages
            otherBtnW = Math.max(24, Math.max(resetSize.width, Math.max(orderSize.width, undoSize.width)));
            otherBtnH = 8;
            const orx = canvas.width - otherBtnW - 5;
            
            // Other buttons: single column, same layout for both languages
            resetX = orx;
            resetY = barY + 12;
            orderX = orx;
            orderY = barY + 21;
            undoX = orx;
            undoY = barY + 30;
            
            if (hasActedAll) {
                // Big END TURN button at bottom center
                if (isChinese) {
                    // Chinese: larger button to fit 12px zpix text
                    endTurnW = Math.max(100, endTurnSize.width);
                    endTurnH = 20; // 12px font + padding
                    endTurnX = (canvas.width - endTurnW) / 2;
                    // Position so bottom has 1px gap with RESET button (at resetY)
                    endTurnY = resetY - endTurnH - 1;
                } else {
                    endTurnW = 80;
                    endTurnH = 24;
                    endTurnX = (canvas.width - endTurnW) / 2;
                    endTurnY = canvas.height - endTurnH - 30;
                }
            } else {
                // Small END TURN button in top right
                if (isChinese) {
                    // Chinese: fit 12px zpix text
                    endTurnW = Math.max(50, endTurnSize.width);
                    endTurnH = 16; // 12px font + padding
                } else {
                    endTurnW = 45;
                    endTurnH = 8;
                }
                endTurnX = canvas.width - endTurnW - 5;
                // Position so bottom has 1px gap with RESET button (at resetY)
                endTurnY = resetY - endTurnH - 1;
            }
            
            // END TURN button
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
            
            ctx.fillRect(endTurnX, endTurnY, endTurnW, endTurnH);
            ctx.strokeStyle = hasActedAll ? `rgba(255, 215, 0, ${0.7 + pulse * 0.3})` : '#ffd700';
            ctx.lineWidth = hasActedAll ? 2 : 1;
            ctx.strokeRect(endTurnX + 0.5, endTurnY + 0.5, endTurnW - 1, endTurnH - 1);
            
            // END TURN button: use standard font sizes (12px zpix for Chinese, 8px/10px Silkscreen for English)
            let turnFont, turnFontSize;
            if (isChinese) {
                turnFont = hasActedAll ? '12px zpix' : '12px zpix';
                turnFontSize = 12;
            } else {
                turnFont = hasActedAll ? '10px Silkscreen' : '8px Silkscreen';
                turnFontSize = hasActedAll ? 10 : 8;
            }
            const turnTextY = endTurnY + (endTurnH - turnFontSize) / 2;
            ctx.save();
            ctx.font = turnFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#fff';
            if (hasActedAll) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeText(endTurnText, endTurnX + endTurnW / 2, turnTextY);
            }
            ctx.fillText(endTurnText, endTurnX + endTurnW / 2, turnTextY);
            ctx.restore();
            ctx.restore();
            
            this.endTurnRect = { x: endTurnX, y: endTurnY, w: endTurnW, h: endTurnH };

            // RESET button (hardcoded 8px font, no scaling)
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(resetX, resetY, otherBtnW, otherBtnH);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(resetX + 0.5, resetY + 0.5, otherBtnW - 1, otherBtnH - 1);
            // Use hardcoded 8px font directly (bypass getFontForLanguage)
            const resetTextY = resetY + (otherBtnH - 8) / 2;
            ctx.save();
            ctx.font = '8px Tiny5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#eee';
            ctx.fillText(resetText, resetX + otherBtnW / 2, resetTextY);
            ctx.restore();
            this.resetTurnRect = { x: resetX, y: resetY, w: otherBtnW, h: otherBtnH };

            // ORDER button (hardcoded 8px font, no scaling)
            ctx.fillStyle = this.showAttackOrder ? 'rgba(0, 80, 0, 0.9)' : 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(orderX, orderY, otherBtnW, otherBtnH);
            ctx.strokeStyle = this.showAttackOrder ? '#0f0' : '#888';
            ctx.strokeRect(orderX + 0.5, orderY + 0.5, otherBtnW - 1, otherBtnH - 1);
            // Use hardcoded 8px font directly (bypass getFontForLanguage)
            const orderTextY = orderY + (otherBtnH - 8) / 2;
            ctx.save();
            ctx.font = '8px Tiny5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#fff';
            ctx.fillText(orderText, orderX + otherBtnW / 2, orderTextY);
            ctx.restore();
            this.attackOrderRect = { x: orderX, y: orderY, w: otherBtnW, h: otherBtnH };

            // UNDO button (hardcoded 8px font, no scaling)
            const canUndo = this.history.length > 1;
            ctx.fillStyle = canUndo ? 'rgba(40, 40, 40, 0.9)' : 'rgba(20, 20, 20, 0.6)';
            ctx.fillRect(undoX, undoY, otherBtnW, otherBtnH);
            ctx.strokeStyle = canUndo ? '#fff' : '#444';
            ctx.strokeRect(undoX + 0.5, undoY + 0.5, otherBtnW - 1, otherBtnH - 1);
            // Use hardcoded 8px font directly (bypass getFontForLanguage)
            const undoTextY = undoY + (otherBtnH - 8) / 2;
            ctx.save();
            ctx.font = '8px Tiny5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = canUndo ? '#eee' : '#666';
            ctx.fillText(undoText, undoX + otherBtnW / 2, undoTextY);
            ctx.restore();
            this.undoRect = { x: undoX, y: undoY, w: otherBtnW, h: otherBtnH };
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

            const attackName = getLocalizedText(UI_TEXT[attack.name]) || attack.name;
            this.drawPixelText(ctx, attackName, ax + aw / 2, ay + 3, { 
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
        const origins = this.getAttackOrigins(this.selectedUnit);
        const originKeys = new Set(origins.map(o => `${o.r},${o.q}`));
        
        if (range === 1 && minRange === 0) {
            origins.forEach(o => {
                const neighbors = this.tacticsMap.getNeighbors(o.r, o.q);
                neighbors.forEach(n => {
                    const k = `${n.r},${n.q}`;
                    // Don't allow targeting your own occupied hexes (mounted head/butt)
                    if (originKeys.has(k)) return;
                    if (n.unit === this.selectedUnit) return;
                    this.attackTiles.set(k, true);
                });
            });
        } else {
            // Find all hexes within distance range and >= minRange
            for (let r = 0; r < this.manager.config.mapHeight; r++) {
                for (let q = 0; q < this.manager.config.mapWidth; q++) {
                    const k = `${r},${q}`;
                    if (originKeys.has(k)) continue;
                    const inRange = origins.some(o => {
                        const dist = this.tacticsMap.getDistance(o.r, o.q, r, q);
                        return dist >= minRange && dist <= range && dist > 0;
                    });
                    if (inRange) this.attackTiles.set(k, true);
                }
            }
        }
    }

    handleInput(e) {
        let x = -1000, y = -1000;
        if (e && e.clientX !== undefined) {
            const pos = this.getMousePos(e);
            x = pos.x;
            y = pos.y;
        }

        // Handle choice selection
        if (this.isChoiceActive && this.choiceRects) {
            if (x === -1000) return; // Mouse only for choices for now
            for (const rect of this.choiceRects) {
                if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                    this.isChoiceActive = false;
                    if (rect.index === 0) {
                        // Peaceful choice - restrain Zhang Fei, show dialogue on map
                        this.startRestrainDialogue();
                    } else if (rect.index === 1) {
                        // Fight choice - start fight in current map
                        this.startFight();
                    }
                    return;
                }
            }
            return;
        }

        // Don't process cutscene clicks if cleanup dialogue is playing on the map
        // Also don't allow clicks during active combat - only when combat is truly complete
        if (this.isCutscene && !this.isIntroAnimating && !this.isProcessingTurn && !this.isCleanupDialogueActive && !this.isIntroDialogueActive && !this.isVictoryDialogueActive) {
            // For view-only battles, check if combat is actually complete before allowing skip
            if (this.battleId === 'qingzhou_prelude') {
                // Check if victory condition is met (all enemies defeated or turn limit reached)
                const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
                
                // For prelude battles, combat continues until victory condition is met
                // Don't allow skipping if:
                // - There are still enemies alive
                // - We're not in player turn (still processing NPC turns)
                // - We haven't reached the post-combat dialogue yet
                if (enemies.length > 0 || (this.turn !== 'player' && this.turn !== 'execution')) {
                    // Still in combat - don't allow skipping
                    return;
                }
                
                // If we're in player turn but combat should be complete, check if we should start post-combat dialogue
                if (this.turn === 'player' && enemies.length === 0 && !this.isPostCombatDialogue) {
                    // Combat is complete but post-combat dialogue hasn't started - trigger it
                    this.checkWinLoss();
                    // checkWinLoss for prelude will switch to next battle, but we want post-combat dialogue first
                    // Actually, for prelude, the victory condition switches to the next battle directly
                    // So if we're here, we should allow the transition
                }
            }
            
            const battleDef = BATTLES[this.battleId];
            if (battleDef && battleDef.nextScene) {
                if (this.battleId === 'qingzhou_cleanup') {
                    return;
                } else if (this.battleId === 'guangzong_camp') {
                    this.manager.gameState.addMilestone('guangzong_camp');
                    this.manager.switchTo('narrative', {
                        scriptId: 'guangzong_arrival',
                        onComplete: () => {
                            this.manager.switchTo('map', { campaignId: 'liubei' });
                        }
                    });
                } else if (this.battleId === 'yellow_turban_rout') {
                    // Go to noticeboard scene, then inn scene, then map
                    this.manager.switchTo('narrative', {
                        scriptId: 'noticeboard',
                        onComplete: () => {
                            this.manager.switchTo('narrative', {
                                scriptId: 'inn',
                                onComplete: () => {
                                    this.manager.gameState.addMilestone('prologue_complete');
                                    this.manager.switchTo('map');
                                }
                            });
                        }
                    });
                } else {
                    this.manager.switchTo(battleDef.nextScene, battleDef.nextParams);
                }
                return;
            }
        }

        if (this.showEndTurnConfirm) {
            if (x !== -1000) {
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
            }
            return; // Block other inputs while confirm is visible
        }

        if (this.isIntroDialogueActive || this.isVictoryDialogueActive) {
            if (this.dialogueElapsed < 250) return;
            const script = this.isIntroDialogueActive ? this.introScript : this.victoryScript;
            if (!script || this.dialogueStep >= script.length) {
                // Script is missing or dialogueStep is out of bounds - something went wrong
                console.error(`Dialogue error: script=${!!script}, dialogueStep=${this.dialogueStep}, scriptLength=${script ? script.length : 0}`);
                if (this.isIntroDialogueActive && this.isPostCombatDialogue && this.battleId === 'yellow_turban_rout') {
                    // Try to reload the post-combat script
                    const battleDef = BATTLES[this.battleId];
                    if (battleDef && battleDef.postCombatScript) {
                        this.introScript = battleDef.postCombatScript;
                        this.dialogueStep = 0; // Reset to start
                        console.log('Reloaded post-combat script and reset dialogueStep to 0');
                    }
                }
                return;
            }
            const step = script[this.dialogueStep];
            if (!step) {
                console.error(`Dialogue step ${this.dialogueStep} is null or undefined`);
                return;
            }
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
                        if (this.hasChoice && (this.onChoiceRestrain || this.onChoiceFight)) {
                            // Show choice UI instead of starting battle
                            this.isChoiceActive = true;
                        } else if (this.battleId === 'qingzhou_prelude') {
                            this.checkWinLoss(); // Trigger transition immediately
                        } else if (this.battleId === 'yellow_turban_rout') {
                            // Post-combat dialogue finished, transition to noticeboard
                            this.manager.switchTo('narrative', {
                                scriptId: 'noticeboard',
                                onComplete: () => {
                                    this.manager.gameState.addMilestone('prologue_complete');
                                    this.manager.switchTo('map');
                                }
                            });
                        } else if (!this.isCutscene) {
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
                'dongzhuo': 'dong-zhuo',
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
                    
                    // Call completion callback if set, otherwise use default behavior
                    if (this.cleanupDialogueOnComplete) {
                        this.cleanupDialogueOnComplete();
                        this.cleanupDialogueOnComplete = null;
                    } else {
                        // Default: Go to the map after Qingzhou cleanup
                        this.manager.gameState.addMilestone('qingzhou_cleanup');
                        this.manager.switchTo('map', { campaignId: 'liubei' });
                    }
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

        if (x === -1000) return; // Remaining checks are mouse only

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

            // Mounted selection: clicking rider OR horse should select
            if (u.onHorse) {
                const spacing = this.manager.config.horizontalSpacing;
                const buttX = ux;
                const buttY = uy + sinkOffset;
                const headX = buttX + (u.flip ? -spacing : spacing);
                const midX = Math.floor((buttX + headX) / 2);
                const midY = buttY;

                // Rider anchor must match render()
                const riderX = midX;
                const riderY = midY - 22;

                const riderHit = this.checkCharacterHit(u.img, (u.action === 'walk') ? 'standby' : (u.currentAnimAction || u.action), u.frame, riderX, riderY, x, y, {
                    flip: u.flip,
                    sinkOffset: 0,
                    isProp: false
                });

                // Pixel-perfect horse hit (64x64 frame), so transparent pixels don't block what’s behind
                const keys = this.getHorseSpriteKeys(u.horseType || 'brown');
                const horseStand = assets.getImage(keys.stand) || assets.getImage('horse_stand');
                const horseRun = assets.getImage(keys.run) || assets.getImage('horse_run');
                const isRunning = (u.isMoving || u.action === 'walk') && horseRun;
                const horseImg = isRunning ? horseRun : horseStand;

                let horseHit = false;
                if (horseImg) {
                    const frameW = 64;
                    const frameH = 64;
                    const frameCount = Math.max(1, Math.floor((horseImg.width || frameW) / frameW));
                    const f = isRunning ? (Math.floor(Date.now() / 80) % frameCount) : 0;
                    const srcX = f * frameW;
                    const srcY = 0;

                    const horseFeetY = 15;
                    const destX = midX - frameW / 2;
                    const destY = midY + (horseFeetY - frameH);
                    horseHit = this.checkImageFrameHit(horseImg, srcX, srcY, frameW, frameH, destX, destY, x, y, { flip: u.flip });
                }

                if (riderHit || horseHit) {
                    spriteUnit = u;
                    break;
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
                let destR = clickedCell.r;
                let destQ = clickedCell.q;
                let plannedFlip = this.selectedUnit.flip;
                let headCellForReserve = null;

                if (this.selectedUnit.onHorse) {
                    // For mounted units, interpret the clicked hex as HEAD if possible; otherwise use BUTT.
                    const plan = this.getMountedPlanForClickedCell(clickedCell.r, clickedCell.q);
                    if (!plan) {
                        assets.playSound('ui_error', 0.4);
                        return;
                    }
                    destR = plan.butt.r;
                    destQ = plan.butt.q;
                    plannedFlip = plan.plannedFlip;
                    headCellForReserve = this.tacticsMap.getCell(plan.head.r, plan.head.q);
                }

                const path = this.tacticsMap.getPath(this.selectedUnit.r, this.selectedUnit.q, destR, destQ, this.selectedUnit.moveRange, this.selectedUnit);

                // For mounted units, only the END destination must have valid head+butt space (chokepoints are allowed).
                if (path && (!this.selectedUnit.onHorse || headCellForReserve)) {
                    this.isProcessingTurn = true; // Lock turn during move
                    const oldCell = this.tacticsMap.getCell(this.selectedUnit.r, this.selectedUnit.q);
                    if (oldCell) oldCell.unit = null;
                    if (this.selectedUnit.onHorse) {
                        const oldHead = this.getMountedHeadCellFor(this.selectedUnit, this.selectedUnit.r, this.selectedUnit.q);
                        if (oldHead) oldHead.unit = null;
                        const horse = this.getHorseById(this.selectedUnit.horseId);
                        if (horse) this.clearHorseFromCells(horse);
                    }

                    if (this.selectedUnit.onHorse) {
                        // Lock facing for destination/head reservation (will update naturally during movement)
                        this.selectedUnit.flip = plannedFlip;
                    }

                    this.selectedUnit.startPath(path);
                    const destCell = this.tacticsMap.getCell(destR, destQ);
                    if (destCell) destCell.unit = this.selectedUnit;
                    if (this.selectedUnit.onHorse) {
                        if (headCellForReserve) headCellForReserve.unit = this.selectedUnit;
                    }
                    this.selectedUnit.hasMoved = true;
                    const movingUnit = this.selectedUnit;
                    const checkArrival = () => {
                        // Safety: stop if turn changed or unit selection cleared (e.g. undo)
                        if (this.turn !== 'player' || !movingUnit) {
                            this.isProcessingTurn = false;
                            return;
                        }

                        if (!movingUnit.isMoving) {
                            // Update horse position + facing based on final movement direction
                            if (movingUnit.onHorse) {
                                const horse = this.getHorseById(movingUnit.horseId);
                                if (horse) {
                                    horse.r = movingUnit.r;
                                    horse.q = movingUnit.q;
                                    horse.flip = !!movingUnit.flip;
                                    this.placeHorseOnCells(horse);
                                }
                                // Ensure the unit occupies the correct head hex for its final facing
                                this.syncMountedOccupancy(movingUnit);
                            }
                            // Auto-mount any riderless horse you stepped onto
                            if (!movingUnit.onHorse) {
                                this.tryAutoMount(movingUnit, movingUnit.r, movingUnit.q);
                            }
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
        const targetUnit = spriteUnit || (this.hoveredCell ? this.hoveredCell.unit : null);
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
                        if (this.selectedUnit.onHorse) {
                            // Allow moving the butt through 1-hex corridors; only the END destination needs head+butt space.
                            if (!cell.unit || cell.unit === this.selectedUnit) this.reachableTiles.set(key, data);
                        } else {
                            if (!cell.unit || cell.unit === this.selectedUnit) this.reachableTiles.set(key, data);
                        }
                    });

                    if (this.selectedUnit.onHorse) {
                        // Build mounted destination plans and highlight both butt+head tiles for each plan
                        this.mountedMovePlans = this.buildMountedMovePlans(this.selectedUnit, rawReachable);
                        const highlight = new Map();
                        this.mountedMovePlans.forEach(p => {
                            highlight.set(`${p.butt.r},${p.butt.q}`, true);
                            highlight.set(`${p.head.r},${p.head.q}`, true);
                        });
                        this.reachableTiles = highlight;
                    } else {
                        this.mountedMovePlans = null;
                    }
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
            
            const bumpVictim = this.getLivingUnitOccupyingCell(pushCell.r, pushCell.q, victim);
            // Don't double-damage if we "collided" with ourselves (mounted 2-hex footprint)
            if (bumpVictim && bumpVictim !== victim && bumpVictim.hp > 0) { // Only damage if the unit is still alive
                this.applyUnitDamage(bumpVictim, 1);
                this.addDamageNumber(targetPos.x, targetPos.y - 30, 1);
                if (bumpVictim) bumpVictim.triggerShake(victimPos.x, victimPos.y, targetPos.x, targetPos.y);
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

            // IMPORTANT: The faller has landed on `targetCell`. Ensure their logical position matches
            // so future telegraphs/attacks are anchored to the unit (not their old horse anchor).
            faller.setPosition(targetCell.r, targetCell.q);
            faller.currentSortR = targetCell.r;

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

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            if (this.showEndTurnConfirm) {
                this.showEndTurnConfirm = false;
                assets.playSound('ui_click', 0.5);
                return;
            }
            if (this.selectedUnit || this.selectedAttack || this.activeDialogue) {
                this.clearBattleSelection();
                assets.playSound('ui_click', 0.5);
                return;
            }
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            // Advance dialogue-like overlays first
            if (this.isIntroDialogueActive || this.isVictoryDialogueActive || this.isCleanupDialogueActive || this.activeDialogue) {
                e.preventDefault();
                this.onNonMouseInput();
                this.controllerNavMouseEnabled = false;
                this.handleInput(e);
                return;
            }
        }

        this.rebuildControllerNavTargets();
        if (!this.controllerNavTargets || this.controllerNavTargets.length === 0) return;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            this.moveControllerSelection(0, -1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            this.moveControllerSelection(0, 1);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            this.moveControllerSelection(-1, 0);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            this.moveControllerSelection(1, 0);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.onNonMouseInput();
            this.controllerNavMouseEnabled = false;
            this.activateControllerTarget();
        }
    }

    onMouseInput(mouseX, mouseY) {
        super.onMouseInput(mouseX, mouseY);
        this.controllerNavMouseEnabled = true;
    }

    onNonMouseInput() {
        super.onNonMouseInput();
        this.controllerNavMouseEnabled = false;
    }
}

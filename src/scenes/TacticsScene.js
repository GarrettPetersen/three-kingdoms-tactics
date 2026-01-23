import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS, ATTACKS } from '../core/Constants.js';
import { TacticsMap } from '../core/TacticsMap.js';
import { Unit } from '../entities/Unit.js';

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
        this.particles = []; // { x, y, r, type, vx, vy, life, targetY }
        this.weatherType = null; // 'rain', 'snow'

        // Intro Animation State
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.introDuration = 1000; // ms for the sequence

        this.showAttackOrder = false;
        this.history = [];
    }

    enter(params = {}) {
        const musicKey = params.battleId === 'daxing' ? 'oath' : 'battle';
        assets.playMusic(musicKey, 0.4);
        this.isCustom = params.isCustom || false;
        const { config, canvas } = this.manager;
        this.tacticsMap = new TacticsMap(config.mapWidth, config.mapHeight);

        // Calculate map start positions once
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        this.startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        this.startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        // Reset Intro Animation
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.lastTime = 0;
        this.gameOverTimer = 0;
        this.isGameOver = false;
        
        // Scenario-specific initialization
        const gs = this.manager.gameState;
        this.battleId = params.battleId || gs.get('currentBattleId') || 'daxing'; 
        gs.set('currentBattleId', this.battleId);
        this.baseXP = 5; // Default base XP for battles
        this.isRetreating = false;

        // Check for saved battle state
        const savedState = gs.get('battleState');

        if (params.isResume && savedState && savedState.battleId === this.battleId) {
            // Restore from save
            this.turn = savedState.turn;
            this.turnNumber = savedState.turnNumber;
            this.weatherType = savedState.weatherType;
            this.mapGenParams = savedState.mapGen;
            
            // Restore Map
            for (let r = 0; r < config.mapHeight; r++) {
                for (let q = 0; q < config.mapWidth; q++) {
                    const cell = this.tacticsMap.getCell(r, q);
                    const savedCell = savedState.grid[r][q];
                    cell.terrain = savedCell.terrain;
                    cell.level = savedCell.level;
                    cell.elevation = savedCell.elevation;
                    cell.impassable = savedCell.impassable;
                }
            }

            // Restore Units
            this.units = savedState.units.map(uData => {
                const u = new Unit(uData.id, {
                    ...uData,
                    img: assets.getImage(uData.imgKey)
                });
                // Sync positions on the map
                const cell = this.tacticsMap.getCell(u.r, u.q);
                if (cell) cell.unit = u;
                return u;
            });

            this.isIntroAnimating = false;
            this.isIntroDialogueActive = false;
        } else {
            // Original initialization
            this.mapGenParams = params.mapGen || {
                biome: 'central',
                layout: 'river', 
                forestDensity: 0.15,
                mountainDensity: 0.1,
                riverDensity: 0.05,
                houseDensity: 0.03
            };
            
            this.tacticsMap.generate(this.mapGenParams);
            this.placeInitialUnits(params.units);
            
            // Setup Weather
            this.weatherType = this.mapGenParams.weather || null;
            if (this.weatherType === 'none') this.weatherType = null;
            
            if (!this.weatherType) {
                if (this.mapGenParams.biome === 'northern_snowy') this.weatherType = 'snow';
                else if (this.mapGenParams.biome === 'southern' && Math.random() < 0.3) this.weatherType = 'rain';
            }
            
            this.isIntroDialogueActive = true;
            this.dialogueStep = 0;
            
            // Wait for intro animation then start dialogue
            setTimeout(() => {
                this.startIntroDialogue();
            }, 1500);
        }

        this.particles = [];
        this.manager.gameState.set('lastScene', 'tactics');

        // Track initial houses
        this.initialHouseCount = 0;
        for (let r = 0; r < config.mapHeight; r++) {
            for (let q = 0; q < config.mapWidth; q++) {
                const cell = this.tacticsMap.getCell(r, q);
                if (cell && cell.terrain.includes('house') && !cell.terrain.includes('destroyed')) {
                    this.initialHouseCount++;
                }
            }
        }
    }

    startIntroDialogue() {
        this.introScript = null;
        if (this.battleId === 'daxing') {
            this.introScript = [
                { portraitKey: 'liubei', name: 'Liu Bei', voiceId: 'dx_lb_01', text: "The Yellow Turban vanguard is here. They seek to plunder Zhuo County!" },
                { portraitKey: 'guanyu', name: 'Guan Yu', voiceId: 'dx_gy_01', text: "Their numbers are great, but they are but a rabble without leadership." },
                { portraitKey: 'zhangfei', name: 'Zhang Fei', voiceId: 'dx_zf_01', text: "Let me at them! My Serpent Spear is thirsty for rebel blood!" },
                { portraitKey: 'bandit1', name: 'Deng Mao', voiceId: 'dx_dm_01', text: "Imperial dogs! You dare stand in the way of the Lord of Heaven?" },
                { portraitKey: 'bandit2', name: 'Cheng Yuanzhi', voiceId: 'dx_cyz_01', text: "Slay them all! The Han is dead, the Yellow Heavens shall rise!" },
                { portraitKey: 'liubei', name: 'Liu Bei', voiceId: 'dx_lb_02', text: "Their resolve is weak. If we defeat these captains, the rest will be turned to flight!" }
            ];
        }
        
        if (this.introScript) {
            this.isIntroDialogueActive = true;
            this.dialogueStep = 0;
        } else {
            this.isIntroDialogueActive = false;
            this.startNpcPhase(); // Skip to NPC phase if no dialogue
        }
    }

    checkWinLoss() {
        if (this.isGameOver || this.isIntroAnimating || this.isIntroDialogueActive) return;

        // Custom Win/Loss for Battle 1 (Daxing)
        if (this.battleId === 'daxing') {
            const oathBrothers = this.units.filter(u => (u.id === 'liubei' || u.id === 'guanyu' || u.id === 'zhangfei') && u.hp > 0);
            const alliedSoldiers = this.units.filter(u => u.faction === 'allied' && u.hp > 0);
            const captains = this.units.filter(u => (u.id === 'dengmao' || u.id === 'chengyuanzhi') && u.hp > 0);

            // Loss: All oath brothers die OR all allied soldiers die
            if (oathBrothers.length === 0 || alliedSoldiers.length === 0) {
                this.endBattle(false);
                return;
            }

            // Win: Both captains defeated
            if (captains.length === 0 && !this.isRetreating) {
                this.startRetreatPhase();
                return;
            }
        } else {
            // Default Win/Loss
            const playerUnits = this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp > 0);
            const enemyUnits = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);

            if (playerUnits.length === 0) this.endBattle(false);
            else if (enemyUnits.length === 0) this.endBattle(true);
        }
    }

    endBattle(won) {
        this.isGameOver = true;
        this.won = won;
        this.gameOverTimer = 2500; // Time before showing summary
        this.isProcessingTurn = true;

        if (won) {
            const gs = this.manager.gameState;
            const completed = gs.get('completedCampaigns') || [];
            if (!completed.includes(this.battleId)) {
                completed.push(this.battleId);
                gs.set('completedCampaigns', completed);
            }
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

        this.finalStats = {
            won: won,
            battleId: this.battleId,
            alliedCasualties: this.units.filter(u => (u.faction === 'player' || u.faction === 'allied') && u.hp <= 0).length,
            enemyCasualties: this.units.filter(u => u.faction === 'enemy' && u.hp <= 0).length,
            housesDestroyed: housesDestroyed,
            housesProtected: Math.max(0, this.initialHouseCount - housesDestroyed),
            totalHouses: this.initialHouseCount,
            turnNumber: this.turnNumber
        };

        if (won) {
            const housesProtected = Math.min(3, this.finalStats.housesProtected);
            const xpGained = Math.max(0, this.baseXP + housesProtected - this.finalStats.alliedCasualties);
            this.finalStats.xpGained = xpGained;

            // Save XP to characters
            const gs = this.manager.gameState;
            const unitXP = gs.get('unitXP') || {};
            this.units.filter(u => u.faction === 'player').forEach(u => {
                unitXP[u.id] = (unitXP[u.id] || 0) + xpGained;
            });
            gs.set('unitXP', unitXP);
        }

        this.clearBattleState();
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
            const neighbors = this.tacticsMap.getNeighbors(r, q);
            const unitNeighbor = neighbors.find(n => n.unit && targetFaction.includes(n.unit.faction));
            if (unitNeighbor) {
                unitAttackTiles.push({ r, q, target: unitNeighbor.unit });
            }
        });

        if (unitAttackTiles.length > 0) {
            bestTile = unitAttackTiles[0];
            chosenTargetPos = { r: bestTile.target.r, q: bestTile.target.q };
        } 
        // 2. If no units reachable, check if enemy can reach a house
        else if (unit.faction === 'enemy') {
            let houseAttackTiles = [];
            validDestinations.forEach((data, key) => {
                const [r, q] = key.split(',').map(Number);
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
        const targetFaction = unit.faction === 'enemy' ? ['player', 'allied'] : ['enemy'];
        
        // Find adjacent units to target
        const neighbors = this.tacticsMap.getNeighbors(unit.r, unit.q);
        const adjacentUnit = neighbors.find(n => n.unit && targetFaction.includes(n.unit.faction));
        
        let dirIndex = -1;
        if (adjacentUnit) {
            dirIndex = this.tacticsMap.getDirectionIndex(unit.r, unit.q, adjacentUnit.r, adjacentUnit.q);
        } else if (unit.faction === 'enemy') {
            // Enemies look for adjacent houses if no units are nearby
            const adjacentHouse = neighbors.find(n => n.terrain.includes('house') && !n.terrain.includes('destroyed'));
            if (adjacentHouse) {
                dirIndex = this.tacticsMap.getDirectionIndex(unit.r, unit.q, adjacentHouse.r, adjacentHouse.q);
            }
        }

        if (dirIndex !== -1) {
            unit.intent = { type: 'attack', dirIndex, attackKey };
            const targetCell = this.tacticsMap.getNeighborInDirection(unit.r, unit.q, dirIndex);
            if (targetCell) {
                const startPos = this.getPixelPos(unit.r, unit.q);
                const endPos = this.getPixelPos(targetCell.r, targetCell.q);
                if (endPos.x < startPos.x) unit.flip = true;
                if (endPos.x > startPos.x) unit.flip = false;
            }
        } else {
            unit.intent = null;
        }
    }

    saveBattleState() {
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
            u.updateVisualPos(() => this.getPixelPos(u.r, u.q));

            const cell = this.tacticsMap.getCell(u.r, u.q);
            if (cell) cell.unit = u;
        });

        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.activeDialogue = null;
    }

    undo() {
        if (this.history.length <= 1) return;
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
                        if (this.battleId === 'daxing') {
                            this.checkDaxingReinforcements();
                        }
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

            const targetCell = this.tacticsMap.getNeighborInDirection(unit.r, unit.q, unit.intent.dirIndex);
            
            if (targetCell) {
                this.executeAttack(unit, unit.intent.attackKey, targetCell.r, targetCell.q, () => {
                    // Pause between individual attacks so results are clear
                    setTimeout(() => {
                        executeAll(index + 1);
                    }, 500);
                });
            } else {
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
                const cell = this.tacticsMap.getCell(spot.r, spot.q);
                if (cell && !cell.unit && !cell.impassable) {
                    const id = `reinforcement_${Date.now()}_${spawns}`;
                    const config = {
                        name: "Yellow Turban",
                        imgKey: 'yellowturban',
                        faction: 'enemy',
                        hp: 3,
                        attacks: ['bash'],
                        r: spot.r, q: spot.q
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

    addDamageNumber(x, y, value) {
        // Random jitter so multiple numbers don't overlap
        const jitterX = (Math.random() - 0.5) * 15;
        const jitterY = (Math.random() - 0.5) * 10;
        
        this.damageNumbers.push({
            x: x + jitterX, 
            y: y + jitterY, 
            value,
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
            assets.playSound('collision');
        } else if (cell.terrain === 'house_damaged_01') {
            cell.terrain = 'house_destroyed_01';
            cell.impassable = false;
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "DESTROYED");
            assets.playSound('collision');
        } else if (cell.terrain === 'wall_01') {
            // Walls are sturdy and don't break yet, but we play a sound
            assets.playSound('collision');
        } else if (cell.terrain === 'ice_01') {
            cell.terrain = 'ice_cracked_01';
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "CRACKED");
            assets.playSound('collision');
        } else if (cell.terrain === 'ice_cracked_01') {
            cell.terrain = 'water_deep_01_01';
            cell.impassable = true;
            const pos = this.getPixelPos(r, q);
            this.addDamageNumber(pos.x, pos.y - 20, "BROKEN");
            assets.playSound('splash');
            
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
        // Safety check: Only player can trigger attacks via this method during their turn
        if (this.turn === 'player' && attacker.faction !== 'player') return;

        attacker.intent = null; // Clear intent so arrow disappears
        const attack = ATTACKS[attackKey];

        // Play attack sound
        if (attackKey === 'serpent_spear') assets.playSound('stab');
        else if (attackKey === 'green_dragon_slash') assets.playSound('green_dragon');
        else if (attackKey === 'double_blades') assets.playSound('double_blades');
        else if (attackKey === 'bash') assets.playSound('bash');
        else if (attackKey === 'slash') assets.playSound('slash');
        else if (attackKey === 'stab') assets.playSound('stab');

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const targetPos = this.getPixelPos(targetR, targetQ);

        // Facing logic
        if (targetPos.x < startPos.x) attacker.flip = true;
        if (targetPos.x > startPos.x) attacker.flip = false;

        if (attackKey === 'double_blades') {
            this.executeDoubleBlades(attacker, targetR, targetQ, onComplete);
        } else if (attackKey === 'green_dragon_slash') {
            this.executeGreenDragonSlash(attacker, targetR, targetQ, onComplete);
        } else if (attackKey === 'serpent_spear') {
            this.executeSerpentSpear(attacker, targetR, targetQ, onComplete);
        } else {
            // Standard single-target attack (Bash, etc.)
            this.executeStandardAttack(attacker, attackKey, targetR, targetQ, onComplete);
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

        setTimeout(() => {
            // Apply dialogue trigger for boss deaths in Daxing
            if (victim && victim.hp > 0 && (victim.id === 'dengmao' || victim.id === 'chengyuanzhi')) {
                // Potential for mid-attack dialogue if needed
            }

            this.damageCell(targetR, targetQ);
            if (victim) {
                this.applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, endPos);
            }
            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
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

        // First strike (Front)
        setTimeout(() => {
            this.damageCell(targetR, targetQ);
            if (frontVictim) {
                this.applyDamageAndPush(attacker, frontVictim, ATTACKS.double_blades, targetR, targetQ, startPos, frontPos);
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
                    }
                    setTimeout(() => {
                        attacker.action = 'standby';
                        if (onComplete) onComplete();
                    }, 400);
                }, 400);
            }, 300);
        }, 400);
    }

    executeGreenDragonSlash(attacker, targetR, targetQ, onComplete) {
        attacker.action = 'attack_1';
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const affected = this.getAffectedTiles(attacker, 'green_dragon_slash', targetR, targetQ);

        setTimeout(() => {
            affected.forEach(pos => {
                this.damageCell(pos.r, pos.q);
                const cell = this.tacticsMap.getCell(pos.r, pos.q);
                if (cell && cell.unit) {
                    const victim = cell.unit;
                    const victimPos = this.getPixelPos(cell.r, cell.q);
                    this.applyDamageAndPush(attacker, victim, ATTACKS.green_dragon_slash, cell.r, cell.q, startPos, victimPos);
                }
            });

            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
    }

    executeSerpentSpear(attacker, targetR, targetQ, onComplete) {
        attacker.action = 'attack_2';
        attacker.frame = 0;

        const startPos = this.getPixelPos(attacker.r, attacker.q);
        const affected = this.getAffectedTiles(attacker, 'serpent_spear', targetR, targetQ);

        setTimeout(() => {
            affected.forEach(pos => {
                this.damageCell(pos.r, pos.q);
                const cell = this.tacticsMap.getCell(pos.r, pos.q);
                if (cell && cell.unit) {
                    const victim = cell.unit;
                    const victimPos = this.getPixelPos(cell.r, cell.q);
                    this.applyDamageAndPush(attacker, victim, ATTACKS.serpent_spear, cell.r, cell.q, startPos, victimPos);
                }
            });

            setTimeout(() => {
                attacker.action = 'standby';
                if (onComplete) onComplete();
            }, 400);
        }, 400);
    }

    applyDamageAndPush(attacker, victim, attack, targetR, targetQ, startPos, endPos) {
        // Apply damage & Shake
        victim.hp -= attack.damage;
        victim.triggerShake(startPos.x, startPos.y, endPos.x, endPos.y);
        this.addDamageNumber(endPos.x, endPos.y - 30, attack.damage);
        
        const targetCell = this.tacticsMap.getCell(targetR, targetQ);

        // Handle death
        if (victim.hp <= 0) {
            victim.hp = 0;
            victim.action = 'death';
            victim.intent = null;
            targetCell.unit = null;
            assets.playSound('death', 0.6);
        }

        if (attack.push) {
            // Handle push
            const dirIndex = this.tacticsMap.getDirectionIndex(attacker.r, attacker.q, targetR, targetQ);
            const pushCell = this.tacticsMap.getNeighborInDirection(targetR, targetQ, dirIndex);
            
            const victimPos = this.getPixelPos(victim.r, victim.q);

            if (pushCell) {
                const targetPos = this.getPixelPos(pushCell.r, pushCell.q);

                if (pushCell.terrain.includes('water_deep')) {
                    // Drown
                    targetCell.unit = null;
                    victim.setPosition(pushCell.r, pushCell.q);
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false);
                    setTimeout(() => { 
                        assets.playSound('splash');
                        victim.isDrowning = true;
                        victim.drownTimer = 0;
                    }, 300);
                } else if (!pushCell.impassable && !pushCell.unit) {
                    // Valid empty tile
                    targetCell.unit = null;
                    victim.setPosition(pushCell.r, pushCell.q);
                    // Only occupy the new cell if still alive
                    if (victim.hp > 0) {
                        pushCell.unit = victim;
                    }
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false);
                } else {
                    // Collision
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, true); 
                    setTimeout(() => {
                        assets.playSound('collision');
                        
                        // Ice doesn't take damage from bumps
                        if (!pushCell.terrain.includes('ice')) {
                            this.damageCell(pushCell.r, pushCell.q);
                        }

                        victim.hp -= 1;
                        this.addDamageNumber(victimPos.x, victimPos.y - 30, 1);
                        if (pushCell.unit) {
                            pushCell.unit.hp -= 1;
                            this.addDamageNumber(targetPos.x, targetPos.y - 30, 1);
                            pushCell.unit.triggerShake(victimPos.x, victimPos.y, targetPos.x, targetPos.y);
                            if (pushCell.unit.hp <= 0) {
                                pushCell.unit.hp = 0;
                                pushCell.unit.action = 'death';
                                pushCell.unit.intent = null;
                                pushCell.unit = null;
                                assets.playSound('death', 0.6);
                            } else {
                                pushCell.unit.action = 'hit';
                            }
                        }
                        if (victim.hp <= 0) {
                            victim.hp = 0;
                            victim.action = 'death';
                            targetCell.unit = null;
                            assets.playSound('death', 0.6);
                        }
                    }, 125);
                }
            } else {
                // Edge of map
                const dummyX = victimPos.x + (victimPos.x - startPos.x) * 0.5;
                const dummyY = victimPos.y + (victimPos.y - startPos.y) * 0.5;
                victim.startPush(victimPos.x, victimPos.y, dummyX, dummyY, true);
                setTimeout(() => {
                    assets.playSound('collision');
                    victim.hp -= 1;
                    this.addDamageNumber(victimPos.x, victimPos.y - 30, 1);
                    if (victim.hp <= 0) {
                        victim.hp = 0;
                        victim.action = 'death';
                        victim.intent = null;
                        targetCell.unit = null;
                        assets.playSound('death', 0.6);
                    }
                }, 125);
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

    placeInitialUnits(specifiedUnits) {
        this.units = [];
        let unitsToPlace = specifiedUnits;

        if (!unitsToPlace && (this.battleId === 'daxing' || this.battleId === 'custom')) {
            unitsToPlace = [
                { id: 'liubei', name: 'Liu Bei', imgKey: 'liubei', r: 2, q: 4, moveRange: 4, hp: 4, faction: 'player', attacks: ['double_blades'] },
                { id: 'guanyu', name: 'Guan Yu', imgKey: 'guanyu', r: 3, q: 3, moveRange: 5, hp: 4, faction: 'player', attacks: ['green_dragon_slash'] },
                { id: 'zhangfei', name: 'Zhang Fei', imgKey: 'zhangfei', r: 3, q: 5, moveRange: 4, hp: 4, faction: 'player', attacks: ['serpent_spear'] },
                
                // Allied Soldiers
                { id: 'ally1', name: 'Soldier', imgKey: 'soldier', r: 1, q: 3, moveRange: 3, hp: 2, faction: 'allied', attacks: ['slash'] },
                { id: 'ally2', name: 'Soldier', imgKey: 'soldier', r: 1, q: 4, moveRange: 3, hp: 2, faction: 'allied', attacks: ['slash'] },
                { id: 'ally3', name: 'Soldier', imgKey: 'soldier', r: 1, q: 5, moveRange: 3, hp: 2, faction: 'allied', attacks: ['slash'] }
            ];

            if (this.battleId === 'daxing') {
                // Add Captains for Daxing
                unitsToPlace.push(
                    { id: 'dengmao', name: 'Deng Mao', imgKey: 'bandit1', r: 8, q: 4, moveRange: 3, hp: 6, faction: 'enemy', attacks: ['heavy_thrust'] },
                    { id: 'chengyuanzhi', name: 'Cheng Yuanzhi', imgKey: 'bandit2', r: 9, q: 5, moveRange: 3, hp: 8, faction: 'enemy', attacks: ['whirlwind'] },
                    { id: 'rebel1', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 3, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel2', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 5, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel3', name: 'Yellow Turban', imgKey: 'yellowturban', r: 8, q: 2, moveRange: 3, hp: 2, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel4', name: 'Yellow Turban', imgKey: 'yellowturban', r: 8, q: 7, moveRange: 3, hp: 2, faction: 'enemy', attacks: ['bash'] }
                );
            } else {
                // Default Custom Battle Enemies
                unitsToPlace.push(
                    { id: 'rebel1', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 2, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel2', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 4, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel3', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 6, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel4', name: 'Yellow Turban', imgKey: 'yellowturban', r: 9, q: 3, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel5', name: 'Yellow Turban', imgKey: 'yellowturban', r: 9, q: 5, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                    { id: 'rebel6', name: 'Yellow Turban', imgKey: 'yellowturban', r: 9, q: 7, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] }
                );
            }
        } else if (!unitsToPlace) {
            // Sensible fallback for any other scenario
            unitsToPlace = [
                { id: 'liubei', name: 'Liu Bei', imgKey: 'liubei', r: 2, q: 4, moveRange: 4, hp: 4, faction: 'player', attacks: ['double_blades'] },
                { id: 'guanyu', name: 'Guan Yu', imgKey: 'guanyu', r: 3, q: 3, moveRange: 5, hp: 4, faction: 'player', attacks: ['green_dragon_slash'] },
                { id: 'zhangfei', name: 'Zhang Fei', imgKey: 'zhangfei', r: 3, q: 5, moveRange: 4, hp: 4, faction: 'player', attacks: ['serpent_spear'] },
                { id: 'rebel1', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 4, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
                { id: 'rebel2', name: 'Yellow Turban', imgKey: 'yellowturban', r: 8, q: 5, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] }
            ];
        }

        if (unitsToPlace) {
            unitsToPlace.forEach(u => {
            let finalR = u.r;
            let finalQ = u.q;
            
            const cell = this.tacticsMap.getCell(finalR, finalQ);
            if (!cell || cell.impassable || cell.unit) {
                let found = false;
                for (let dist = 1; dist < 5 && !found; dist++) {
                    for (let dr = -dist; dr <= dist && !found; dr++) {
                        for (let dq = -dist; dq <= dist && !found; dq++) {
                            const testCell = this.tacticsMap.getCell(u.r + dr, u.q + dq);
                            if (testCell && !testCell.impassable && !testCell.unit) {
                                finalR = u.r + dr;
                                finalQ = u.q + dq;
                                found = true;
                            }
                        }
                    }
                }
            }

            const unit = new Unit(u.id, {
                ...u,
                r: finalR,
                q: finalQ,
                img: assets.getImage(u.imgKey)
            });
            this.units.push(unit);
            const finalCell = this.tacticsMap.getCell(finalR, finalQ);
            if (finalCell) finalCell.unit = unit;
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

        this.hoveredCell = this.getCellAt(this.manager.logicalMouseX, this.manager.logicalMouseY);

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

        if (attackKey === 'serpent_spear') {
            // Only hits the target hex
            affected.push({ r: targetR, q: targetQ });
        } else if (attackKey === 'green_dragon_slash') {
            // Hits target and its neighbors that are at the same distance from attacker
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
                const targetCell = this.tacticsMap.getNeighborInDirection(u.r, u.q, u.intent.dirIndex);
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
            const priorities = { 'hex': 0, 'particle': 1, 'unit': 2 };
            if (priorities[a.type] !== priorities[b.type]) return priorities[a.type] - priorities[b.type];
            
            // Within same type and row:
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
                this.drawTile(call.terrain, call.x, surfaceY, call.elevation, call.r, call.q);
                
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
                
                let drawOptions = { flip: u.flip };
                
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

                // Draw HP bar
                if (!u.isDrowning || u.drownTimer < 500) {
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
                        const targetCell = this.tacticsMap.getNeighborInDirection(u.r, u.q, u.intent.dirIndex);
                        // Only show arrow if there's a unit to be pushed
                        if (targetCell && targetCell.unit) {
                            this.drawPushArrow(ctx, targetCell.r, targetCell.q, u.intent.dirIndex);
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

        if (this.isIntroDialogueActive && this.introScript) {
            const step = this.introScript[this.dialogueStep];
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
                });
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
        
        const targetCell = this.tacticsMap.getNeighborInDirection(unit.r, unit.q, unit.intent.dirIndex);
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

    drawTile(terrainType, x, y, elevation = 0, r = 0, q = 0) {
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
        const displayHeight = sourceHeight;
        
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
                
                // The vertical "side" edge
                ctx.drawImage(img, ix, topPartHeight, 1, 1, dx + ix, dy + topPartHeight, 1, extraDepth);
                
                // The bottom part of the hex "lip"
                const bottomPartHeight = sourceHeight - topPartHeight;
                ctx.drawImage(img, ix, topPartHeight, 1, bottomPartHeight, dx + ix, dy + topPartHeight + extraDepth, 1, bottomPartHeight);
            } else {
                ctx.drawImage(img, ix, 0, 1, sourceHeight, dx + ix, dy, 1, sourceHeight);
            }
        }
    }

    drawUI() {
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
            const boxW = 90;
            const bx = 5;
            const by = barY + 2;

            // Faction-colored border for the info section
            ctx.strokeStyle = u.faction === 'player' ? '#0f0' : (u.faction === 'allied' ? '#0af' : '#f00');
            ctx.strokeRect(bx, by, boxW, barH - 4);

            // Name
            this.drawPixelText(ctx, u.name, bx + 4, by + 4, { color: '#fff', font: '8px Dogica' });
            
            // HP
            this.drawPixelText(ctx, `HP: ${u.hp}/${u.maxHp}`, bx + 4, by + 16, { color: '#eee', font: '8px Dogica' });

            // State/Intent
            let actionText = "IDLE";
            if (u.hp > 0 && u.intent && u.intent.type === 'attack') {
                const attack = ATTACKS[u.intent.attackKey];
                const actionName = attack ? attack.name.toUpperCase() : '???';
                if (u.attackOrder) actionText = `INTENT: ${actionName} (ORD: ${u.attackOrder})`;
                else actionText = `INTENT: ${actionName}`;
            } else if (u.hasActed) {
                actionText = "DONE";
            }
            this.drawPixelText(ctx, actionText, bx + 4, by + 28, { color: '#aaa', font: '8px Dogica' });
        }

        // 2. Damage Numbers (Floating over world)
        this.damageNumbers.forEach(dn => {
            const alpha = Math.min(1, dn.timer / 300);
            ctx.save();
            ctx.globalAlpha = alpha;
            this.drawPixelText(ctx, `-${dn.value}`, dn.x, dn.y, { 
                color: '#f00', 
                font: '10px Dogica', 
                align: 'center' 
            });
            ctx.restore();
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

        this.drawPixelText(ctx, turnText, 10, 8, { color, font: '8px Dogica' });

        // 4. End Turn / Reset Turn (Bottom Right)
        if (this.turn === 'player' && !this.isProcessingTurn) {
            const btnW = 60;
            const btnH = 16;
            const rx = canvas.width - btnW - 5;
            
            // END TURN
            const ey = barY + 3;
            ctx.fillStyle = 'rgba(40, 20, 20, 0.9)';
            ctx.fillRect(rx, ey, btnW, btnH);
            ctx.strokeStyle = '#ffd700';
            ctx.strokeRect(rx + 0.5, ey + 0.5, btnW - 1, btnH - 1);
            this.drawPixelText(ctx, "END TURN", rx + btnW / 2, ey + 5, { color: '#fff', font: '8px Dogica', align: 'center' });
            this.endTurnRect = { x: rx, y: ey, w: btnW, h: btnH };

            // RESET TURN
            const ry = barY + 21;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(rx, ry, btnW, btnH);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(rx + 0.5, ry + 0.5, btnW - 1, btnH - 1);
            this.drawPixelText(ctx, "RESET", rx + btnW / 2, ry + 5, { color: '#eee', font: '8px Dogica', align: 'center' });
            this.resetTurnRect = { x: rx, y: ry, w: btnW, h: btnH };

            // ATTACK ORDER TOGGLE
            const ax = rx - btnW - 5;
            const ay = barY + 3;
            ctx.fillStyle = this.showAttackOrder ? 'rgba(0, 80, 0, 0.9)' : 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(ax, ay, btnW, btnH);
            ctx.strokeStyle = this.showAttackOrder ? '#0f0' : '#888';
            ctx.strokeRect(ax + 0.5, ay + 0.5, btnW - 1, btnH - 1);
            this.drawPixelText(ctx, "ORDER", ax + btnW / 2, ay + 5, { color: '#fff', font: '8px Dogica', align: 'center' });
            this.attackOrderRect = { x: ax, y: ay, w: btnW, h: btnH };

            // UNDO
            const uy = barY + 21;
            const canUndo = this.history.length > 1;
            ctx.fillStyle = canUndo ? 'rgba(40, 40, 40, 0.9)' : 'rgba(20, 20, 20, 0.6)';
            ctx.fillRect(ax, uy, btnW, btnH);
            ctx.strokeStyle = canUndo ? '#fff' : '#444';
            ctx.strokeRect(ax + 0.5, uy + 0.5, btnW - 1, btnH - 1);
            this.drawPixelText(ctx, "UNDO", ax + btnW / 2, uy + 5, { color: canUndo ? '#eee' : '#666', font: '8px Dogica', align: 'center' });
            this.undoRect = { x: ax, y: uy, w: btnW, h: btnH };
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
        const endX = canvas.width - 70;
        const barY = canvas.height - 40;
        
        // Attack buttons
        this.attackRects = [];
        unit.attacks.forEach((key, i) => {
            const attack = ATTACKS[key];
            const aw = 65;
            const ah = 20;
            const ax = startX + i * (aw + 5);
            const ay = barY + 10;

            const isSelected = this.selectedAttack === key;
            const isDisabled = unit.hasAttacked;

            ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(40, 40, 40, 0.8)';
            ctx.fillRect(ax, ay, aw, ah);
            ctx.strokeStyle = isSelected ? '#ffd700' : (isDisabled ? '#333' : '#888');
            ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);

            this.drawPixelText(ctx, attack.name, ax + aw / 2, ay + 6, { 
                color: isDisabled ? '#555' : '#eee', 
                font: '8px Dogica',
                align: 'center' 
            });

            this.attackRects.push({ x: ax, y: ay, w: aw, h: ah, key });
        });
    }

    selectAttack(attackKey) {
        if (!this.selectedUnit || this.selectedUnit.faction !== 'player' || this.selectedUnit.hasAttacked) return;
        
        this.selectedAttack = attackKey;
        // Don't clear reachableTiles here, let the input handler manage it
        
        // Find valid attack targets based on range
        this.attackTiles = new Map();
        const range = ATTACKS[this.selectedAttack].range || 1;
        
        if (range === 1) {
            const neighbors = this.tacticsMap.getNeighbors(this.selectedUnit.r, this.selectedUnit.q);
            neighbors.forEach(n => this.attackTiles.set(`${n.r},${n.q}`, true));
        } else if (range === 2) {
            // Find all hexes within distance 2
            for (let r = 0; r < this.manager.config.mapHeight; r++) {
                for (let q = 0; q < this.manager.config.mapWidth; q++) {
                    const dist = this.tacticsMap.getDistance(this.selectedUnit.r, this.selectedUnit.q, r, q);
                    if (dist > 0 && dist <= 2) {
                        this.attackTiles.set(`${r},${q}`, true);
                    }
                }
            }
        }
    }

    handleInput(e) {
        if (this.isIntroDialogueActive) {
            this.dialogueStep++;
            if (this.dialogueStep >= this.introScript.length) {
                this.isIntroDialogueActive = false;
                this.startNpcPhase();
            }
            return;
        }

        if (this.activeDialogue) {
            // Check if there are more lines to show
            const result = this.renderDialogueBox(this.manager.ctx, this.manager.canvas, {
                portraitKey: this.activeDialogue.unit.imgKey,
                name: this.activeDialogue.unit.name,
                text: this.activeDialogue.unit.dialogue
            }, { subStep: this.activeDialogue.subStep || 0 });

            if (result.hasNextChunk) {
                this.activeDialogue.subStep = (this.activeDialogue.subStep || 0) + 1;
            } else {
                this.activeDialogue = null;
            }
            return;
        }

        if (this.isGameOver) {
            this.manager.switchTo('title');
            return;
        }

        if (this.isProcessingTurn || this.isIntroAnimating) return;

        const { x, y } = this.getMousePos(e);
        
        // 1. Check UI Buttons (End/Reset/Order)
        if (this.endTurnRect && x >= this.endTurnRect.x && x <= this.endTurnRect.x + this.endTurnRect.w &&
            y >= this.endTurnRect.y && y <= this.endTurnRect.y + this.endTurnRect.h) {
            this.startExecutionPhase();
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
            }
            if (this.checkCharacterHit(u.img, u.currentAnimAction || u.action, u.frame, ux, uy, x, y, { flip: u.flip, sinkOffset })) {
                spriteUnit = u;
                break;
            }
        }
        const clickedCell = this.getCellAt(x, y);

        // --- SMART INTENT ACTION CHECK ---
        
        // A. PERFORM ATTACK (Highest Priority if attack is active)
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.selectedAttack) {
            let targetCell = null;
            if (spriteUnit && this.attackTiles.has(`${spriteUnit.r},${spriteUnit.q}`)) {
                targetCell = this.tacticsMap.getCell(spriteUnit.r, spriteUnit.q);
            } else if (clickedCell && this.attackTiles.has(`${clickedCell.r},${clickedCell.q}`)) {
                targetCell = clickedCell;
            }

            if (targetCell) {
                this.pushHistory();
                this.executeAttack(this.selectedUnit, this.selectedAttack, targetCell.r, targetCell.q, () => {
                    this.selectedUnit.hasAttacked = true;
                    this.selectedUnit.hasActed = true;
                    this.selectedUnit = null;
                    this.selectedAttack = null;
                    this.attackTiles.clear();
                });
                return;
            }
        }

        // B. MOVE UNIT (Priority if move is valid, even if clicking a sprite)
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && !this.selectedUnit.hasMoved && clickedCell && this.reachableTiles.has(`${clickedCell.r},${clickedCell.q}`)) {
            // Check landing spot (cannot land on another unit)
            if (!clickedCell.unit || clickedCell.unit === this.selectedUnit) {
                this.pushHistory();
                const path = this.tacticsMap.getPath(this.selectedUnit.r, this.selectedUnit.q, clickedCell.r, clickedCell.q, this.selectedUnit.moveRange, this.selectedUnit);
                if (path) {
                    const oldCell = this.tacticsMap.getCell(this.selectedUnit.r, this.selectedUnit.q);
                    if (oldCell) oldCell.unit = null;
                    this.selectedUnit.startPath(path);
                    clickedCell.unit = this.selectedUnit;
                    this.selectedUnit.hasMoved = true;
                    const checkArrival = () => {
                        if (!this.selectedUnit.isMoving) {
                            if (this.selectedUnit.attacks.length > 0) this.selectAttack(this.selectedUnit.attacks[0]);
                        } else setTimeout(checkArrival, 100);
                    };
                    checkArrival();
                }
                this.reachableTiles.clear();
                return;
            }
        }

        // C. SELECT UNIT (Sprite has priority over empty cell)
        const targetUnit = spriteUnit || (clickedCell ? clickedCell.unit : null);
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
}

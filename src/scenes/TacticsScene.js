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

        // Intro Animation State
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.introDuration = 1000; // ms for the sequence
    }

    enter(params = {}) {
        const { config, canvas } = this.manager;
        this.tacticsMap = new TacticsMap(config.mapWidth, config.mapHeight);

        // Reset Intro Animation
        this.isIntroAnimating = true;
        this.introTimer = 0;
        this.lastTime = 0;
        
        // Ensure start positions are calculated before telegraphing
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        this.startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        this.startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        // Map generation parameters
        const mapGenParams = params.mapGen || {
            forestDensity: 0.12,
            mountainDensity: 0.08,
            riverDensity: 0.04
        };
        
        this.tacticsMap.generate(mapGenParams);
        this.placeInitialUnits(params.units);
        
        this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.turn = 'player';
        this.units.forEach(u => {
            if (u.faction === 'player') {
                u.hasMoved = false;
                u.hasAttacked = false;
                u.hasActed = false;
            }
        });
        
        this.saveTurnState();
        this.telegraphEnemyMoves();
    }

    startEnemyTurn() {
        this.turn = 'enemy';
        this.isProcessingTurn = true;
        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        
        // Phase 1: All enemies attack first
        const executeAllAttacks = (index) => {
            if (index >= enemies.length) {
                // Phase 2: All enemies move after all attacks are done
                executeAllMoves(0);
                return;
            }
            const enemy = enemies[index];
            if (enemy.intent && enemy.intent.type === 'attack') {
                const targetCell = this.tacticsMap.getNeighborInDirection(enemy.r, enemy.q, enemy.intent.dirIndex);
                if (targetCell) {
                    this.executeAttack(enemy, enemy.intent.attackKey, targetCell.r, targetCell.q, () => {
                        executeAllAttacks(index + 1);
                    });
                } else {
                    executeAllAttacks(index + 1);
                }
            } else {
                executeAllAttacks(index + 1);
            }
        };

        const executeAllMoves = (index) => {
            if (index >= enemies.length) {
                this.isProcessingTurn = false;
                this.turnNumber++;
                this.startPlayerTurn();
                return;
            }
            const enemy = enemies[index];
            this.moveEnemyAndTelegraph(enemy, () => {
                executeAllMoves(index + 1);
            });
        };

        executeAllAttacks(0);
    }

    moveEnemyAndTelegraph(enemy, onComplete) {
        // Move towards nearest player
        const targets = this.units.filter(u => u.faction === 'player' && u.hp > 0);
        if (targets.length === 0) {
            onComplete();
            return;
        }

        const target = targets[0]; // Simplest AI
        const reachable = this.tacticsMap.getReachableData(enemy.r, enemy.q, enemy.moveRange);
        
        let bestTile = { r: enemy.r, q: enemy.q };
        let minDist = Infinity;

        reachable.forEach((data, key) => {
            const [r, q] = key.split(',').map(Number);
            // Ideally move to adjacency
            const dist = Math.sqrt((r - target.r)**2 + (q - target.q)**2);
            if (dist < minDist) {
                minDist = dist;
                bestTile = { r, q };
            }
        });

        const path = this.tacticsMap.getPath(enemy.r, enemy.q, bestTile.r, bestTile.q, enemy.moveRange);
        if (path) {
            const oldCell = this.tacticsMap.getCell(enemy.r, enemy.q);
            if (oldCell) oldCell.unit = null;
            
            enemy.startPath(path);
            this.tacticsMap.getCell(bestTile.r, bestTile.q).unit = enemy;
        }

        // Wait for movement to finish, then telegraph next attack
        const checkDone = () => {
            if (!enemy.isMoving) {
                // Now that we've moved, where will we attack next turn?
                this.telegraphSingleEnemy(enemy);
                onComplete();
            } else {
                setTimeout(checkDone, 100);
            }
        };
        checkDone();
    }

    telegraphEnemyMoves() {
        const enemies = this.units.filter(u => u.faction === 'enemy' && u.hp > 0);
        enemies.forEach(e => this.telegraphSingleEnemy(e));
    }

    telegraphSingleEnemy(enemy) {
        const attackKey = enemy.attacks[0] || 'stab';
        const targets = this.units.filter(u => u.faction === 'player' && u.hp > 0);
        
        // Find adjacent player to target
        const neighbors = this.tacticsMap.getNeighbors(enemy.r, enemy.q);
        const playerNeighbor = neighbors.find(n => n.unit && n.unit.faction === 'player');
        
        let dirIndex = -1;
        if (playerNeighbor) {
            dirIndex = this.tacticsMap.getDirectionIndex(enemy.r, enemy.q, playerNeighbor.r, playerNeighbor.q);
        } else if (targets.length > 0) {
            // Pick a direction towards target
            const target = targets[0];
            // Simplest: find neighbor closest to target
            let bestNeighbor = null;
            let minDist = Infinity;
            neighbors.forEach(n => {
                const dist = Math.sqrt((n.r - target.r)**2 + (n.q - target.q)**2);
                if (dist < minDist) {
                    minDist = dist;
                    bestNeighbor = n;
                }
            });
            if (bestNeighbor) {
                dirIndex = this.tacticsMap.getDirectionIndex(enemy.r, enemy.q, bestNeighbor.r, bestNeighbor.q);
            }
        }

        if (dirIndex !== -1) {
            enemy.intent = { type: 'attack', dirIndex, attackKey };
            
            // Set facing ONCE when telegraphing
            const targetCell = this.tacticsMap.getNeighborInDirection(enemy.r, enemy.q, dirIndex);
            if (targetCell) {
                const startPos = this.getPixelPos(enemy.r, enemy.q);
                const endPos = this.getPixelPos(targetCell.r, targetCell.q);
                if (endPos.x < startPos.x) enemy.flip = true;
                if (endPos.x > startPos.x) enemy.flip = false;
            }
        } else {
            enemy.intent = null;
        }
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
            targetCell.unit = null;
        } else if (attack.push) {
            // Handle push
            const dirIndex = this.tacticsMap.getDirectionIndex(attacker.r, attacker.q, targetR, targetQ);
            const pushCell = this.tacticsMap.getNeighborInDirection(targetR, targetQ, dirIndex);
            
            const victimPos = this.getPixelPos(victim.r, victim.q);

            if (pushCell) {
                const targetPos = this.getPixelPos(pushCell.r, pushCell.q);

                if (pushCell.terrain === 'water_deep_01') {
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
                    pushCell.unit = victim;
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, false);
                } else {
                    // Collision
                    victim.startPush(victimPos.x, victimPos.y, targetPos.x, targetPos.y, true); 
                    setTimeout(() => {
                        assets.playSound('collision');
                        this.damageCell(pushCell.r, pushCell.q);
                        victim.hp -= 1;
                        this.addDamageNumber(victimPos.x, victimPos.y - 30, 1);
                        if (pushCell.unit) {
                            pushCell.unit.hp -= 1;
                            this.addDamageNumber(targetPos.x, targetPos.y - 30, 1);
                            pushCell.unit.triggerShake(victimPos.x, victimPos.y, targetPos.x, targetPos.y);
                            if (pushCell.unit.hp <= 0) {
                                pushCell.unit.hp = 0;
                                pushCell.unit.action = 'death';
                                pushCell.unit = null;
                            } else {
                                pushCell.unit.action = 'hit';
                            }
                        }
                        if (victim.hp <= 0) {
                            victim.hp = 0;
                            victim.action = 'death';
                            targetCell.unit = null;
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
                        targetCell.unit = null;
                    }
                }, 125);
            }
        } else {
            victim.action = 'hit';
        }
    }

    saveTurnState() {
        this.turnStartState = this.units.map(u => ({
            id: u.id,
            r: u.r,
            q: u.q,
            hp: u.hp,
            hasMoved: u.hasMoved,
            hasAttacked: u.hasAttacked,
            hasActed: u.hasActed,
            faction: u.faction
        }));
    }

    resetTurn() {
        if (this.turn !== 'player' || this.isProcessingTurn) return;

        this.units.forEach(u => {
            const state = this.turnStartState.find(s => s.id === u.id);
            if (state) {
                const oldCell = this.tacticsMap.getCell(u.r, u.q);
                if (oldCell && oldCell.unit === u) oldCell.unit = null;

                u.r = state.r;
                u.q = state.q;
                u.hp = state.hp;
                u.hasMoved = state.hasMoved;
                u.hasAttacked = state.hasAttacked;
                u.hasActed = state.hasActed;

                const newCell = this.tacticsMap.getCell(u.r, u.q);
                if (newCell) newCell.unit = u;
            }
        });

        this.selectedUnit = null;
        this.selectedAttack = null;
        this.reachableTiles.clear();
        this.attackTiles.clear();
        this.activeDialogue = null;
    }

    placeInitialUnits(specifiedUnits) {
        this.units = [];
        const unitsToPlace = specifiedUnits || [
            { id: 'liubei', name: 'Liu Bei', imgKey: 'liubei', r: 2, q: 4, moveRange: 4, hp: 4, faction: 'player', attacks: ['double_blades'] },
            { id: 'guanyu', name: 'Guan Yu', imgKey: 'guanyu', r: 3, q: 3, moveRange: 5, hp: 4, faction: 'player', attacks: ['green_dragon_slash'] },
            { id: 'zhangfei', name: 'Zhang Fei', imgKey: 'zhangfei', r: 3, q: 5, moveRange: 4, hp: 4, faction: 'player', attacks: ['serpent_spear'] },
            { id: 'rebel1', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 4, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
            { id: 'rebel2', name: 'Yellow Turban', imgKey: 'yellowturban', r: 8, q: 5, moveRange: 3, hp: 3, faction: 'enemy', attacks: ['bash'] },
            { id: 'rebel3', name: 'Yellow Turban', imgKey: 'yellowturban', r: 7, q: 6, moveRange: 3, hp: 2, faction: 'enemy', attacks: ['bash'] }
        ];

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

        this.animationFrame = Math.floor(timestamp / 150) % 4;
        
        this.units.forEach(u => {
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
                    elevation: cell.elevation || 0,
                    isReachable: this.reachableTiles.has(`${r},${q}`),
                    isAttackRange: this.attackTiles.has(`${r},${q}`),
                    isAffected: affectedTiles.has(`${r},${q}`),
                    isHovered: this.hoveredCell === cell
                });
            }
        }

        // 2. Collect units (using their fractional sort row for depth)
        this.units.filter(u => u.hp > 0).forEach(u => {
            const pos = this.getPixelPos(u.r, u.q); // for stationary reference
            drawCalls.push({
                type: 'unit',
                r: u.currentSortR,
                q: u.q,
                priority: 1,
                unit: u,
                x: pos.x, // not actually used for moving units but good for consistency
                y: pos.y
            });
        });

        // 3. Sort by row, then by priority (hex < unit)
        drawCalls.sort((a, b) => {
            // For sorting purposes, units should draw as if they are in the furthest row they overlap.
            // Using Math.ceil ensures that as soon as a unit moves even slightly "down" into 
            // the visual overlap zone of the next row, it draws after that row's hexes.
            const depthA = a.type === 'unit' ? Math.ceil(a.r) : a.r;
            const depthB = b.type === 'unit' ? Math.ceil(b.r) : b.r;

            if (depthA !== depthB) return depthA - depthB;
            if (a.priority !== b.priority) return a.priority - b.priority;
            
            // For units in same fractional row position, use actual r for sub-sorting
            return a.r - b.r;
        });

        for (const call of drawCalls) {
            const effect = this.getIntroEffect(Math.floor(call.r), call.q || 0);
            if (effect.alpha <= 0) continue;
            
            ctx.save();
            ctx.globalAlpha = effect.alpha;

            if (call.type === 'hex') {
                const surfaceY = call.y - call.elevation + effect.yOffset;
                this.drawTile(call.terrain, call.x, surfaceY, call.elevation);
                
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
            } else {
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
                } else if (cell && cell.terrain === 'water_shallow_01') {
                    // Wading: exactly 4px deep into the hex
                    drawOptions.sinkOffset = 4;
                    drawOptions.isSubmerged = true;
                }

                const isSelected = this.selectedUnit === u;
                if (isSelected) {
                    this.drawHighlight(ctx, u.visualX, surfaceY, 'rgba(255, 255, 255, 0.4)');
                }
                
                // Draw intent if enemy
                if (u.faction === 'enemy' && u.intent) {
                    this.drawIntent(ctx, u, u.visualX, surfaceY);
                }

                this.drawCharacter(ctx, u.img, u.currentAnimAction || u.action, u.frame, u.visualX + u.visualOffsetX, surfaceY + u.visualOffsetY, drawOptions);

                // Draw HP bar
                if (!u.isDrowning || u.drownTimer < 500) {
                    this.drawHpBar(ctx, u, u.visualX, surfaceY);
                }
            }
            ctx.restore();
        }

        this.drawUI();

        // 4. Final Pass: Draw UX elements (like push arrows) above everything
        if (!this.isIntroAnimating) {
            this.units.forEach(u => {
                if (u.hp > 0 && u.faction === 'enemy' && u.intent && u.intent.type === 'attack') {
                    const attack = ATTACKS[u.intent.attackKey];
                    if (attack && attack.push) {
                        const targetCell = this.tacticsMap.getNeighborInDirection(u.r, u.q, u.intent.dirIndex);
                        if (targetCell) {
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
                        this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                        const oppositeDir = (dirIndex + 3) % 6;
                        const backCell = this.tacticsMap.getNeighborInDirection(this.selectedUnit.r, this.selectedUnit.q, oppositeDir);
                        if (backCell) {
                            this.drawPushArrow(ctx, backCell.r, backCell.q, oppositeDir);
                        }
                    }
                } else if (this.selectedAttack === 'serpent_spear') {
                    // Serpent Spear: Push the further target
                    const dirIndex = this.tacticsMap.getDirectionIndex(this.selectedUnit.r, this.selectedUnit.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        const cell1 = this.tacticsMap.getNeighborInDirection(this.selectedUnit.r, this.selectedUnit.q, dirIndex);
                        const cell2 = cell1 ? this.tacticsMap.getNeighborInDirection(cell1.r, cell1.q, dirIndex) : null;
                        
                        // If user hovers either cell in the line, show the push on the appropriate one
                        // Actually the spear always pushes the "further" target in its line of fire.
                        // But for simplicity in UX, we show the arrow on the cell actually hovered if it's in the range.
                        this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                    }
                } else {
                    const dirIndex = this.tacticsMap.getDirectionIndex(this.selectedUnit.r, this.selectedUnit.q, this.hoveredCell.r, this.hoveredCell.q);
                    if (dirIndex !== -1) {
                        this.drawPushArrow(ctx, this.hoveredCell.r, this.hoveredCell.q, dirIndex);
                    }
                }
            }
        }
    }

    drawHpBar(ctx, unit, x, y) {
        const barW = 20;
        const barH = 3;
        const bx = x - barW / 2;
        const by = y + 5;

        ctx.fillStyle = '#000';
        ctx.fillRect(bx, by, barW, barH);
        
        const healthPct = unit.hp / unit.maxHp;
        ctx.fillStyle = unit.faction === 'player' ? '#0f0' : '#f00';
        ctx.fillRect(bx + 0.5, by + 0.5, (barW - 1) * healthPct, barH - 1);
    }

    drawIntent(ctx, unit, x, y) {
        if (!unit.intent) return;
        
        const targetCell = this.tacticsMap.getNeighborInDirection(unit.r, unit.q, unit.intent.dirIndex);
        if (!targetCell) return;

        // Red exclamation mark above enemy
        ctx.save();
        ctx.fillStyle = '#f00';
        ctx.font = '10px Silkscreen';
        ctx.textAlign = 'center';
        ctx.fillText('!', x, y - 45);
        
        // Target highlight on the map
        const targetPos = this.getPixelPos(targetCell.r, targetCell.q);
        this.drawHighlight(ctx, targetPos.x, targetPos.y, 'rgba(255, 0, 0, 0.2)');

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
        // Solid white with shadow for UX clarity
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
        
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(fromPos.x + dx * 0.7, fromPos.y + dy * 0.7);
        ctx.stroke();
        
        const angle = Math.atan2(dy, dx);
        ctx.translate(fromPos.x + dx * 0.7, fromPos.y + dy * 0.7);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-8, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    drawTile(terrainType, x, y, elevation = 0) {
        const { ctx, config } = this.manager;
        const img = assets.getImage(terrainType);
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

        // Draw damage numbers
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

        // Turn indicator
        const turnText = this.turn === 'player' ? "YOUR TURN" : "ENEMY TURN";
        const color = this.turn === 'player' ? '#ffd700' : '#f00';
        this.drawPixelText(ctx, turnText, 10, 10, { color, font: '8px Silkscreen' });

        // End Turn button
        if (this.turn === 'player' && !this.isProcessingTurn) {
            const bx = canvas.width - 80;
            const by = 10;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
            ctx.fillRect(bx, by, 70, 20);
            ctx.strokeStyle = '#ffd700';
            ctx.strokeRect(bx + 0.5, by + 0.5, 69, 19);
            this.drawPixelText(ctx, "END TURN", bx + 35, by + 5, { color: '#fff', font: '8px Silkscreen', align: 'center' });
            this.endTurnRect = { x: bx, y: by, w: 70, h: 20 };

            // Reset Turn button
            const rby = 35;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
            ctx.fillRect(bx, rby, 70, 20);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(bx + 0.5, rby + 0.5, 69, 19);
            this.drawPixelText(ctx, "RESET TURN", bx + 35, rby + 5, { color: '#eee', font: '8px Silkscreen', align: 'center' });
            this.resetTurnRect = { x: bx, y: rby, w: 70, h: 20 };
        }

        // Selected Unit Info & Attacks
        if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.turn === 'player' && !this.isProcessingTurn) {
            this.drawUnitAbilityUI(ctx, canvas, this.selectedUnit);
        }

        if (this.activeDialogue) {
            this.renderDialogueBox(ctx, canvas, {
                portraitKey: this.activeDialogue.unit.imgKey,
                name: this.activeDialogue.unit.name,
                text: this.activeDialogue.unit.dialogue
            });
        }

        if (this.isIntroAnimating) {
            ctx.restore();
        }
    }

    drawUnitAbilityUI(ctx, canvas, unit) {
        const barHeight = 40;
        const by = canvas.height - barHeight;
        
        ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
        ctx.fillRect(0, by, canvas.width, barHeight);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(0.5, by + 0.5, canvas.width - 1, barHeight - 1);

        this.drawPixelText(ctx, unit.name.toUpperCase(), 10, by + 5, { color: '#ffd700' });
        
        // Attack buttons
        this.attackRects = [];
        unit.attacks.forEach((key, i) => {
            const attack = ATTACKS[key];
            const ax = 80 + i * 85;
            const ay = by + 10;
            const aw = 80;
            const ah = 20;

            const isSelected = this.selectedAttack === key;
            const isDisabled = unit.hasAttacked;

            ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(40, 40, 40, 0.8)';
            ctx.fillRect(ax, ay, aw, ah);
            ctx.strokeStyle = isSelected ? '#ffd700' : (isDisabled ? '#333' : '#888');
            ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);

            this.drawPixelText(ctx, attack.name, ax + aw / 2, ay + 5, { 
                color: isDisabled ? '#555' : '#eee', 
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
        if (this.isProcessingTurn || this.isIntroAnimating) return;

        const { x, y } = this.getMousePos(e);
        
        // Check End Turn button
        if (this.endTurnRect && x >= this.endTurnRect.x && x <= this.endTurnRect.x + this.endTurnRect.w &&
            y >= this.endTurnRect.y && y <= this.endTurnRect.y + this.endTurnRect.h) {
            this.startEnemyTurn();
            return;
        }

        // Check Reset Turn button
        if (this.resetTurnRect && x >= this.resetTurnRect.x && x <= this.resetTurnRect.x + this.resetTurnRect.w &&
            y >= this.resetTurnRect.y && y <= this.resetTurnRect.y + this.resetTurnRect.h) {
            this.resetTurn();
            return;
        }

        // Check Attack buttons
        if (this.attackRects && this.selectedUnit && this.selectedUnit.faction === 'player') {
            const btn = this.attackRects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
            if (btn && !this.selectedUnit.hasAttacked) {
                this.selectAttack(btn.key);
                return;
            }
        }

        const clickedCell = this.getCellAt(x, y);

        if (clickedCell) {
            // ACTION: MOVE UNIT (Priority over attack so you can move to a tile you could also attack)
            if (this.selectedUnit && !this.selectedUnit.hasMoved && this.reachableTiles.has(`${clickedCell.r},${clickedCell.q}`)) {
                const path = this.tacticsMap.getPath(this.selectedUnit.r, this.selectedUnit.q, clickedCell.r, clickedCell.q, this.selectedUnit.moveRange);
                if (path) {
                    const oldCell = this.tacticsMap.getCell(this.selectedUnit.r, this.selectedUnit.q);
                    if (oldCell) oldCell.unit = null;
                    
                    this.selectedUnit.startPath(path);
                    clickedCell.unit = this.selectedUnit;
                    this.selectedUnit.hasMoved = true;
                    
                    // After path starts, auto-select attack for once movement finishes
                    const checkArrival = () => {
                        if (!this.selectedUnit.isMoving) {
                            if (this.selectedUnit.attacks.length > 0) {
                                this.selectAttack(this.selectedUnit.attacks[0]);
                            }
                        } else {
                            setTimeout(checkArrival, 100);
                        }
                    };
                    checkArrival();
                }
                this.reachableTiles.clear();
                return;
            }

            // ACTION: PERFORM ATTACK
            if (this.selectedUnit && this.selectedUnit.faction === 'player' && this.selectedAttack && this.attackTiles.has(`${clickedCell.r},${clickedCell.q}`)) {
                this.executeAttack(this.selectedUnit, this.selectedAttack, clickedCell.r, clickedCell.q, () => {
                    this.selectedUnit.hasAttacked = true;
                    this.selectedUnit.hasActed = true;
                    this.selectedUnit = null;
                    this.selectedAttack = null;
                    this.attackTiles.clear();
                });
                return;
            }

            // ACTION: SELECT UNIT
            if (clickedCell.unit) {
                this.selectedUnit = clickedCell.unit;
                this.selectedAttack = null;
                this.attackTiles.clear();
                this.attackRects = []; // Clear buttons for new selection

                if (this.selectedUnit.faction === 'player' && !this.selectedUnit.hasActed) {
                    if (!this.selectedUnit.hasMoved) {
                        this.reachableTiles = this.tacticsMap.getReachableData(clickedCell.r, clickedCell.q, this.selectedUnit.moveRange);
                    } else {
                        this.reachableTiles.clear();
                        // Default select first attack ONLY after moving
                        if (this.selectedUnit.attacks.length > 0) {
                            this.selectAttack(this.selectedUnit.attacks[0]);
                        }
                    }
                } else {
                    this.reachableTiles.clear();
                }
                
                if (this.selectedUnit.dialogue) {
                    this.activeDialogue = { unit: this.selectedUnit, expires: Date.now() + 3000 };
                }
            } else {
                // DESELECT
                this.selectedUnit = null;
                this.selectedAttack = null;
                this.reachableTiles.clear();
                this.attackTiles.clear();
                this.attackRects = [];
                this.activeDialogue = null;
            }
        }
    }
}

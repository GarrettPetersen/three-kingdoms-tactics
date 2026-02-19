import { ANIMATIONS, ATTACKS } from '../core/Constants.js';
import { assets } from '../core/AssetLoader.js';

export class Unit {
    constructor(id, config = {}) {
        this.id = id;
        this.name = config.name || "Unknown";
        this.imgKey = config.imgKey;
        this.img = config.img; // Loaded image
        this.faction = config.faction || 'player'; // 'player', 'enemy'
        
        this.r = config.r || 0;
        this.q = config.q || 0;
        
        // Stats
        this.hp = (config.hp !== undefined) ? config.hp : 10;
        this.maxHp = (config.maxHp !== undefined) ? config.maxHp : (config.hp || 10);
        this.moveRange = config.moveRange || 3;
        // Preserve the unmodified base for effects like mounts
        this.baseMoveRange = (config.baseMoveRange !== undefined) ? config.baseMoveRange : this.moveRange;

        // Mount state
        this.onHorse = !!config.onHorse;
        this.horseId = config.horseId || null;
        this.horseType = config.horseType || 'brown'; // brown|black|white|redhare
        
        // State
        this.action = config.action || (this.hp <= 0 ? 'death' : 'standby');
        this.currentAnimAction = config.currentAnimAction || this.action || 'standby';
        this.frame = (config.frame !== undefined) ? config.frame : 0;
        this.flip = config.flip || false;
        this.dialogue = config.dialogue || "";
        this.hasMoved = config.hasMoved || false;
        this.hasAttacked = config.hasAttacked || false;
        this.hasActed = config.hasActed || false; // Turn is complete
        this.attacks = config.attacks || []; // Array of attack keys from ATTACKS
        this.intent = config.intent || null; // { type: 'attack', r, q, attackKey }
        
        // Movement animation
        this.isMoving = false;
        this.path = [];
        this.pathIndex = 0;
        this.moveProgress = 0;
        this.visualX = 0;
        this.visualY = 0;
        this.currentSortR = config.r || 0;

        // Push/Hit visual effects
        this.visualOffsetX = 0;
        this.visualOffsetY = 0;
        this.shakeTimer = 0;
        this.shakeDir = { x: 0, y: 0 };
        this.pushData = null; // { startX, startY, targetX, targetY, progress, isBounce }
        this.isDrowning = config.isDrowning || false;
        this.isGone = config.isGone || false;
        this.drownTimer = 0;
        this.stepTimer = 0;
        this.level = config.level || 1;
        this.caged = config.caged || false;  // For cage overlay rendering
        this.isPreDead = config.isPreDead || false; // Started the mission dead (don't count for casualties)
    }

    update(dt, getPixelPos, shouldAnimate = true, terrainType = 'grass_01') {
        if (this.isDrowning) {
            // ... drowning logic ...
            this.drownTimer += dt;
            this.action = 'hit';
            this.currentAnimAction = 'hit';
            this.frame += dt * 0.008;

            const pos = getPixelPos(this.r, this.q);
            this.visualX = pos.x;
            this.visualY = pos.y;
            this.currentSortR = this.r;

            if (this.drownTimer > 2000) {
                this.hp = 0;
                this.intent = null;
                this.isDrowning = false;
                this.isGone = true;
                this.action = 'death';
                this.currentAnimAction = 'death';
                assets.playSound('death', 0.6);
            }
            return;
        }

        // Ensure hp=0 units stay in death animation
        if (this.hp <= 0 && this.action !== 'death') {
            this.action = 'death';
            this.frame = 0;
            assets.playSound('death', 0.6);
        }

        let animAction = this.action;
        
        // If telegraphing an attack, use the attack animation but hold frame 0
        if (this.intent && this.intent.type === 'attack' && this.action === 'standby' && !this.isMoving && !this.pushData) {
            const attack = ATTACKS[this.intent.attackKey];
            if (attack) {
                animAction = attack.animation;
            }
        }

        const anim = ANIMATIONS[animAction] || ANIMATIONS.standby;
        
        // One-shot animations
        const isOneShot = (this.action === 'attack_1' || this.action === 'attack_2' || (this.action === 'hit' && !this.pushData));
        const isDeath = (this.action === 'death');
        
        if (isOneShot) {
            if (this.frame < anim.length - 0.1) {
                this.frame += dt * 0.008;
            } else {
                this.action = 'standby';
                this.frame = 0;
            }
        } else if (isDeath) {
            // Death animation: play once and stay on the last frame
            if (this.frame < anim.length - 1) {
                this.frame += dt * 0.008;
            } else {
                this.frame = anim.length - 1;
            }
        } else if (this.isMoving || this.pushData || this.action === 'hit') {
            this.frame += dt * 0.008;
        } else if (this.intent && this.intent.type === 'attack' && this.action === 'standby') {
            // Telegraphing - hold first frame of attack
            this.frame = 0;
        } else if (shouldAnimate) {
            this.frame += dt * 0.008;
        } else {
            this.frame = 0;
        }

        // Use the resolved animation action for drawing
        this.currentAnimAction = animAction;

        // Handle Hit Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = Math.max(0, this.shakeTimer / 200); 
            const mag = Math.sin(progress * Math.PI * 8) * 4 * progress;
            this.visualOffsetX = this.shakeDir.x * mag;
            this.visualOffsetY = this.shakeDir.y * mag;
            
            if (this.shakeTimer <= 0) {
                this.visualOffsetX = 0;
                this.visualOffsetY = 0;
            }
        }

        // Handle Push Animation
        if (this.pushData) {
            if (this.name !== 'Boulder') {
            this.action = 'hit';
            }
            // Pushes are 250ms (0.004), Falls are slower 400ms (0.0025)
            const speed = this.pushData.fallHeight > 0 ? 0.0025 : 0.004;
            this.pushData.progress += dt * speed;
            const p = Math.min(1, this.pushData.progress);
            
            let interp = p;
            if (this.pushData.isBounce) {
                // Out and back curve
                interp = Math.sin(p * Math.PI) * 0.4;
            }

            this.visualX = this.pushData.startX + (this.pushData.targetX - this.pushData.startX) * interp;
            this.visualY = this.pushData.startY + (this.pushData.targetY - this.pushData.startY) * interp;

            // Handle Parabolic Fall
            if (this.pushData.fallHeight > 0) {
                // Parabola: y = -4 * h * p * (p - 1)
                // This adds a peak in the middle of the fall
                const arcHeight = 20; // Max height of the jump/fall arc
                const parabola = -4 * arcHeight * p * (p - 1);
                this.visualY -= parabola;
            }

            if (p >= 1) {
                this.pushData = null;
                this.action = 'standby';
            }
        }

        // Handle Path Movement
        if (this.isMoving && this.path.length > 0) {
            this.action = 'walk';
            this.moveProgress += dt * 0.005; 

            // Trigger footstep sounds
            this.stepTimer -= dt;
            if (this.stepTimer <= 0) {
                this.stepTimer = 350; // Every 350ms during walk
                this.playStepSound(terrainType);
            }

            const startNode = this.path[this.pathIndex];
            const endNode = this.path[this.pathIndex + 1];

            if (endNode) {
                const startPos = getPixelPos(startNode.r, startNode.q);
                const endPos = getPixelPos(endNode.r, endNode.q);

                this.visualX = startPos.x + (endPos.x - startPos.x) * this.moveProgress;
                this.visualY = startPos.y + (endPos.y - startPos.y) * this.moveProgress;
                this.currentSortR = startNode.r + (endNode.r - startNode.r) * this.moveProgress;

                // Handle facing
                if (endPos.x < startPos.x) this.flip = true;
                if (endPos.x > startPos.x) this.flip = false;

                if (this.moveProgress >= 1) {
                    this.moveProgress = 0;
                    this.pathIndex++;
                    this.setPosition(endNode.r, endNode.q);
                    
                    if (this.pathIndex >= this.path.length - 1) {
                        this.isMoving = false;
                        this.action = 'standby';
                        this.path = [];
                    }
                }
            } else {
                this.isMoving = false;
                this.action = 'standby';
            }
        } else if (!this.pushData) {
            // Stationary update
            const pos = getPixelPos(this.r, this.q);
            this.visualX = pos.x;
            this.visualY = pos.y;
            this.currentSortR = this.r;
        }
    }

    startPath(path) {
        if (!path || path.length < 2) return;
        this.path = path;
        this.pathIndex = 0;
        this.moveProgress = 0;
        this.isMoving = true;
        this.stepTimer = 0; // Play first step immediately
    }

    startPush(startX, startY, targetX, targetY, isBounce = false, fallHeight = 0) {
        this.pushData = { startX, startY, targetX, targetY, progress: 0, isBounce, fallHeight };
        this.action = 'hit';
        this.frame = 0;
    }

    triggerShake(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        this.shakeDir = { x: dx / dist, y: dy / dist };
        this.shakeTimer = 200;
    }

    playStepSound(terrainType) {
        let soundKey = 'step_generic';
        if (terrainType.includes('grass')) soundKey = 'step_grass';
        else if (terrainType.includes('water_shallow')) soundKey = 'step_water_walk';
        else if (terrainType.includes('water')) soundKey = 'step_water';
        else if (terrainType.includes('sand') || terrainType.includes('mud') || terrainType.includes('snow')) soundKey = 'step_sand';
        else if (terrainType.includes('mountain') || terrainType.includes('house') || terrainType.includes('town')) soundKey = 'step_stone';
        
        assets.playSound(soundKey, 0.3); // Play at 30% volume
    }

    setPosition(r, q) {
        this.r = r;
        this.q = q;
    }
}

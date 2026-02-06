import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { UPGRADE_PATHS, ATTACKS } from '../core/Constants.js';

export class LevelUpScene extends BaseScene {
    constructor() {
        super();
        this.levelUps = [];
        this.currentIndex = 0;
        this.timer = 0;
        this.showBonuses = false;
        this.isPromoting = false;
        this.promotionChoice = null;
        this.chosenClass = null;
    }

    enter(params) {
        this.levelUps = params.levelUps || [];
        this.onComplete = params.onComplete || null;
        this.isEndGame = params.isEndGame || false;
        this.isCustom = params.isCustom || false;
        this.battleId = params.battleId || null;
        this.currentIndex = 0;
        this.timer = 0;
        this.lastTime = 0;
        this.showBonuses = false;
        this.isPromoting = false;
        this.promotionChoice = null;
        this.chosenClass = null;
        
        if (this.levelUps.length > 0) {
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    checkPromotion() {
        const current = this.levelUps[this.currentIndex];
        if (current && current.id.startsWith('ally') && current.newLevel === 2) {
            const gs = this.manager.gameState;
            const classes = gs.getCampaignVar('unitClasses') || {};
            if (!classes[current.id] || classes[current.id] === 'soldier') {
                this.isPromoting = true;
            }
        }
    }

    update(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.timer += dt;
        if (this.timer > 1000 && !this.showBonuses) {
            this.showBonuses = true;
            assets.playSound('step_generic', 0.3);
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        const current = this.levelUps[this.currentIndex];
        
        if (!current) {
            this.next();
            return;
        }

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subdued background image
        const bg = assets.getImage('army_camp');
        if (bg) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        const cx = canvas.width / 2;
        
        // Character Image
        const img = assets.getImage(current.imgKey);
        if (img) {
            // Victory animation: prepared -> jump -> land -> pose
            // Let's make it 1 jump per 1.5 seconds
            const frame = (this.timer * 0.002);
            this.drawCharacter(ctx, img, 'victory', frame, cx, 120, { scale: 1.5 });
        }

        // Text
        const pulse = Math.abs(Math.sin(Date.now() / 300));
        this.drawPixelText(ctx, "LEVEL UP!", cx, 40, { 
            color: `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`, 
            font: '16px Silkscreen', 
            align: 'center',
            outline: true
        });

        this.drawPixelText(ctx, `${current.name}`, cx, 150, { 
            color: '#fff', 
            font: '10px Silkscreen', 
            align: 'center' 
        });

        this.drawPixelText(ctx, `LEVEL ${current.oldLevel} -> ${current.newLevel}`, cx, 165, { 
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });

        if (this.showBonuses) {
            let by = 185;
            
            // 1. Stat Bonuses
            const bonuses = [
                "Increased Critical Chance",
                "Increased Damage Resistance"
            ];
            
            // Asymptotic HP Bonus check (check if max hp actually increased)
            const oldMaxHp = this.getMaxHpForLevel(current.oldLevel);
            const newMaxHp = this.getMaxHpForLevel(current.newLevel);
            if (newMaxHp > oldMaxHp) {
                bonuses.push(`Max HP +${newMaxHp - oldMaxHp}`);
            }

            // 2. Weapon Upgrades
            const gs = this.manager.gameState;
            const unitClasses = gs.getCampaignVar('unitClasses') || {};
            const unitClass = this.chosenClass || unitClasses[current.id] || (current.id.startsWith('ally') ? 'soldier' : current.id);
            const path = UPGRADE_PATHS[unitClass];
            if (path && path[current.newLevel]) {
                const upgrade = path[current.newLevel];
                const attackName = ATTACKS[upgrade.attack]?.name || "New Technique";
                bonuses.push(`Learned ${attackName}: ${upgrade.text}`);
            }

            // 3. Class specific bonuses added AFTER selection
            if (this.chosenClass === 'soldier') {
                bonuses.push("+ Melee Attack");
                bonuses.push("+ 1 HP");
            } else if (this.chosenClass === 'archer') {
                bonuses.push("+ Ranged Attack");
                bonuses.push("+ Range 2");
            }

            bonuses.forEach(b => {
                const lines = this.wrapText(ctx, `+ ${b}`, 200, '8px Tiny5');
                lines.forEach(line => {
                    this.drawPixelText(ctx, line, cx, by, { 
                        color: '#4f4', 
                        font: '8px Tiny5', 
                        align: 'center' 
                    });
                    by += 10;
                });
            });

            // 3. Promotion UI
            if (this.isPromoting) {
                this.renderPromotionUI(ctx, canvas, cx, by + 5);
            }
        }

        // Prompt
        if (this.timer > 2000 && !this.isPromoting) {
            const pulse2 = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = 0.5 + pulse2 * 0.5;
            this.drawPixelText(ctx, "CLICK TO CONTINUE", cx, 235, {
                color: '#aaa',
                font: '8px Silkscreen',
                align: 'center'
            });
            ctx.restore();
        }
    }

    getMaxHpForLevel(level, baseHp = 4) {
        const bonus = Math.floor(6 * (level - 1) / (level + 5));
        return Math.min(10, baseHp + bonus);
    }

    renderPromotionUI(ctx, canvas, cx, y) {
        this.drawPixelText(ctx, "CHOOSE PROMOTION:", cx, y, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        const bw = 80;
        const bh = 40; // Taller to fit bonuses
        
        // Soldier Button
        const sx = cx - bw - 10;
        const sy = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'soldier' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(sx, sy, bw, bh);
        ctx.strokeRect(sx + 1, sy + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, "SOLDIER", sx + bw/2, sy + bh/2 - 4, { color: '#fff', font: '8px Tiny5', align: 'center' });
        this.soldierRect = { x: sx, y: sy, w: bw, h: bh };

        // Archer Button
        const ax = cx + 10;
        const ay = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'archer' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(ax, ay, bw, bh);
        ctx.strokeRect(ax + 1, ay + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, "ARCHER", ax + bw/2, ay + bh/2 - 4, { color: '#fff', font: '8px Tiny5', align: 'center' });
        this.archerRect = { x: ax, y: ay, w: bw, h: bh };
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);

        if (this.isPromoting) {
            if (this.soldierRect && x >= this.soldierRect.x && x <= this.soldierRect.x + this.soldierRect.w &&
                y >= this.soldierRect.y && y <= this.soldierRect.y + this.soldierRect.h) {
                this.selectPromotion('soldier');
                return;
            }
            if (this.archerRect && x >= this.archerRect.x && x <= this.archerRect.x + this.archerRect.w &&
                y >= this.archerRect.y && y <= this.archerRect.y + this.archerRect.h) {
                this.selectPromotion('archer');
                return;
            }
            return;
        }

        if (this.timer > 1500) {
            this.next();
        } else {
            // Speed up
            this.timer = 1001;
            this.showBonuses = true;
        }
    }

    selectPromotion(choice) {
        const current = this.levelUps[this.currentIndex];
        const gs = this.manager.gameState;
        const classes = gs.getCampaignVar('unitClasses') || {};
        classes[current.id] = choice;
        gs.setCampaignVar('unitClasses', classes);
        
        assets.playSound('ui_click');
        this.isPromoting = false;
        this.chosenClass = choice;
        
        // Update current display info
        if (choice === 'archer') {
            current.imgKey = 'archer';
        }
    }

    next() {
        this.currentIndex++;
        if (this.currentIndex >= this.levelUps.length) {
            if (this.onComplete) {
                this.onComplete();
                return;
            }
            if (this.isEndGame) {
                this.manager.switchTo('credits');
            } else if (this.battleId === 'qingzhou_siege') {
                this.manager.switchTo('tactics', { battleId: 'qingzhou_cleanup' });
            } else if (this.isCustom) {
                this.manager.switchTo('title');
            } else if (this.manager.gameState.get('currentBattleId') === 'daxing') {
                this.manager.switchTo('narrative', {
                    scriptId: 'daxing_messenger',
                    onComplete: () => {
                        this.manager.switchTo('map', { afterEvent: 'daxing' });
                    }
                });
            } else {
                this.manager.switchTo('map', { afterEvent: this.manager.gameState.get('currentBattleId') });
            }
        } else {
            this.timer = 0;
            this.showBonuses = false;
            this.isPromoting = false;
            this.promotionChoice = null;
            this.chosenClass = null;
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.handleInput(e);
        }
    }
}


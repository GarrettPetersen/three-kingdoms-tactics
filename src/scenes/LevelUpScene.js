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
    }

    enter(params) {
        this.levelUps = params.levelUps || [];
        this.isEndGame = params.isEndGame || false;
        this.isCustom = params.isCustom || false;
        this.currentIndex = 0;
        this.timer = 0;
        this.lastTime = 0;
        this.showBonuses = false;
        this.isPromoting = false;
        this.promotionChoice = null;
        
        if (this.levelUps.length > 0) {
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    checkPromotion() {
        const current = this.levelUps[this.currentIndex];
        if (current && current.id.startsWith('ally') && current.newLevel === 2) {
            const gs = this.manager.gameState;
            const classes = gs.get('unitClasses') || {};
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
            const unitClasses = gs.get('unitClasses') || {};
            const unitClass = unitClasses[current.id] || (current.id.startsWith('ally') ? 'soldier' : current.id);
            const path = UPGRADE_PATHS[unitClass];
            if (path && path[current.newLevel]) {
                const upgrade = path[current.newLevel];
                const attackName = ATTACKS[upgrade.attack]?.name || "New Technique";
                bonuses.push(`Learned ${attackName}: ${upgrade.text}`);
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
        const bh = 20;
        
        // Soldier Button
        const sx = cx - bw - 10;
        const sy = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'soldier' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(sx, sy, bw, bh);
        ctx.strokeRect(sx + 1, sy + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, "SOLDIER", sx + bw/2, sy + 6, { color: '#fff', font: '8px Tiny5', align: 'center' });
        this.soldierRect = { x: sx, y: sy, w: bw, h: bh };

        // Archer Button
        const ax = cx + 10;
        const ay = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'archer' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(ax, ay, bw, bh);
        ctx.strokeRect(ax + 1, ay + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, "ARCHER", ax + bw/2, ay + 6, { color: '#fff', font: '8px Tiny5', align: 'center' });
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
        const classes = gs.get('unitClasses') || {};
        classes[current.id] = choice;
        gs.set('unitClasses', classes);
        
        assets.playSound('ui_click');
        this.isPromoting = false;
        
        // Update current display info
        if (choice === 'archer') {
            current.imgKey = 'archer';
        }
    }

    next() {
        this.currentIndex++;
        if (this.currentIndex >= this.levelUps.length) {
            if (this.isEndGame) {
                this.manager.switchTo('credits');
            } else if (this.isCustom) {
                this.manager.switchTo('title');
            } else if (this.manager.gameState.get('currentBattleId') === 'daxing') {
                this.manager.switchTo('narrative', {
                    script: [
                        { bg: 'army_camp', type: 'command', action: 'clearActors' },
                        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'soldier', x: 230, y: 180, flip: true, speed: 2 },
                        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 160, flip: true },
                        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 60, y: 200 },
                        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 20, y: 210 },
                        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 100, y: 210 },
                        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
                        { type: 'command', action: 'move', id: 'messenger', x: 140, y: 180 },
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier',
                            name: 'Messenger',
                            position: 'top',
                            voiceId: 'qz_ms_01',
                            text: "URGENT! Imperial Protector Gong Jing of Qingzhou Region is under siege! The city is near falling!"
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'qz_lb_01',
                            text: "I will go. We cannot let the people of Qingzhou suffer."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'qz_zj_01',
                            text: "I shall reinforce you with five thousand of my best soldiers. March at once!"
                        },
                        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
                    ],
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
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }
}


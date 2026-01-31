import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class BattleSummaryScene extends BaseScene {
    constructor() {
        super();
        this.stats = null;
        this.timer = 0;
        this.showLines = 0;
        this.lineDelays = [500, 1000, 1500, 2000, 2500, 3000];
    }

    enter(params) {
        this.stats = params;
        this.timer = 0;
        this.lastTime = 0;
        this.showLines = 0;
        assets.playMusic('campaign', 0.4);
    }

    update(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.timer += dt;
        for (let i = 0; i < this.lineDelays.length; i++) {
            if (this.timer > this.lineDelays[i]) {
                if (this.showLines <= i) {
                    this.showLines = i + 1;
                    assets.playSound('step_generic', 0.2);
                }
            }
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subdued background image (the china map)
        const bg = assets.getImage('china_map');
        if (bg) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Title
        const titleText = this.stats.won ? "VICTORY" : "DEFEAT";
        const titleColor = this.stats.won ? "#ffd700" : "#ff4444";
        this.drawPixelText(ctx, titleText, canvas.width / 2, 30, { 
            color: titleColor, 
            font: '16px Silkscreen', 
            align: 'center' 
        });

        const startY = 65;
        const spacing = 18;

        if (this.showLines > 0) {
            this.drawStatLine(ctx, "Allied Casualties:", this.stats.alliedCasualties, startY, '#0f0');
        }
        if (this.showLines > 1) {
            this.drawStatLine(ctx, "Enemy Casualties:", this.stats.enemyCasualties, startY + spacing, '#f00');
        }
        if (this.showLines > 2) {
            const houseText = `${this.stats.housesProtected} / ${this.stats.totalHouses}`;
            this.drawStatLine(ctx, "Houses Protected:", houseText, startY + spacing * 2, '#0af');
        }
        if (this.showLines > 3) {
            this.drawStatLine(ctx, "Turns Taken:", this.stats.turnNumber, startY + spacing * 3, '#eee');
        }

        if (this.showLines > 4 && this.stats.won) {
            this.drawStatLine(ctx, "XP Gained:", this.stats.xpGained || 0, startY + spacing * 4, '#ffd700');
        }

        if (this.showLines > 5) {
            if (this.stats.battleId === 'custom') {
                const gs = this.manager.gameState;
                const cs = gs.get('customStats') || { wins: 0, totalBattles: 0 };
                const text = `CUSTOM RECORD: ${cs.wins} - ${cs.totalBattles - cs.wins}`;
                this.drawPixelText(ctx, text, canvas.width / 2, 205, {
                    color: '#0af',
                    font: '8px Silkscreen',
                    align: 'center'
                });
            }

            const pulse = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            this.drawPixelText(ctx, "PRESS ANYWHERE TO CONTINUE", canvas.width / 2, 230, {
                color: '#fff',
                font: '8px Silkscreen',
                align: 'center'
            });
            ctx.restore();
        }
    }

    drawStatLine(ctx, label, value, y, color) {
        const x = 50;
        const valX = 200;
        
        if (value === undefined || value === null) value = 0;
        
        // Icon
        let imgKey = null;
        if (label.includes("Allied")) imgKey = 'soldier';
        else if (label.includes("Enemy")) imgKey = 'yellowturban';
        else if (label.includes("Houses")) imgKey = 'house_01';

        if (imgKey) {
            const img = assets.getImage(imgKey);
            if (img) {
                ctx.save();
                if (imgKey === 'house_01') {
                    // Houses are terrain, handle differently if needed, but for now just draw scaled
                    ctx.drawImage(img, 0, 0, 36, 72, x - 25, y - 5, 15, 30);
                } else {
                    // Draw small version of the character
                    this.drawCharacter(ctx, img, 'standby', 0, x - 15, y + 15, { scale: 0.4 });
                }
                ctx.restore();
            }
        }

        this.drawPixelText(ctx, label, x, y, { color: '#aaa', font: '8px Tiny5' });
        this.drawPixelText(ctx, value.toString(), valX, y, { color: color, font: '8px Tiny5', align: 'right' });
    }

    handleInput(e) {
        if (this.showLines >= this.lineDelays.length) {
            const isCustom = this.stats.battleId === 'custom';
            // isEndGame should be false for qingzhou_siege as it's not the final battle
            const isEndGame = false; // Will be set to true for actual final battle

            if (this.stats.recoveryInfo && this.stats.recoveryInfo.length > 0) {
                this.manager.switchTo('recovery', {
                    recoveryInfo: this.stats.recoveryInfo,
                    levelUps: this.stats.levelUps,
                    isEndGame: isEndGame,
                    isCustom: isCustom,
                    battleId: this.stats.battleId
                });
            } else if (this.stats.levelUps && this.stats.levelUps.length > 0) {
                this.manager.switchTo('levelup', { 
                    levelUps: this.stats.levelUps,
                    isEndGame: isEndGame,
                    isCustom: isCustom,
                    battleId: this.stats.battleId
                });
            } else if (this.stats.battleId === 'qingzhou_siege' && this.stats.won) {
                this.manager.switchTo('tactics', { battleId: 'qingzhou_cleanup' });
            } else if (isCustom) {
                this.manager.switchTo('title');
            } else if (!this.stats.won) {
                this.manager.switchTo('map', { afterEvent: 'defeat' });
            } else if (this.stats.battleId === 'daxing' && this.stats.won) {
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
                this.manager.switchTo('map', { afterEvent: this.stats.battleId });
            }
        } else {
            // Skip animations
            this.timer = 10000;
        }
    }
}


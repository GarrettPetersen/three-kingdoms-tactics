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
        this.showLines = 0;
        assets.playMusic('campaign', 0.4);
    }

    update(dt) {
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
        this.drawPixelText(ctx, titleText, canvas.width / 2, 40, { 
            color: titleColor, 
            font: '16px Silkscreen', 
            align: 'center' 
        });

        if (this.showLines > 0) {
            this.drawStatLine(ctx, "Allied Casualties:", this.stats.alliedCasualties, 80, '#0f0');
        }
        if (this.showLines > 1) {
            this.drawStatLine(ctx, "Enemy Casualties:", this.stats.enemyCasualties, 100, '#f00');
        }
        if (this.showLines > 2) {
            const houseText = `${this.stats.housesProtected} / ${this.stats.totalHouses}`;
            this.drawStatLine(ctx, "Houses Protected:", houseText, 120, '#0af');
        }
        if (this.showLines > 3) {
            this.drawStatLine(ctx, "Turns Taken:", this.stats.turnNumber, 140, '#eee');
        }

        if (this.showLines > 4 && this.stats.won) {
            this.drawStatLine(ctx, "XP Gained:", this.stats.xpGained || 0, 160, '#ffd700');
        }

        if (this.showLines > 5) {
            const pulse = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            this.drawPixelText(ctx, "PRESS ANYWHERE TO CONTINUE", canvas.width / 2, 200, {
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
            this.manager.switchTo('title');
        } else {
            // Skip animations
            this.timer = 10000;
        }
    }
}


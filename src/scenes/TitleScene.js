import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class TitleScene extends BaseScene {
    constructor() {
        super();
        this.processedTitleCanvas = null;
        this.menuHitArea = null;
    }

    enter() {
        this.processTitleImage();
        assets.playMusic('title', 0.5);
    }

    processTitleImage() {
        const titleImg = assets.getImage('title');
        if (!titleImg) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = titleImg.width;
        tempCanvas.height = titleImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(titleImg, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) {
                data[i] = 139; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
            } else {
                data[i+3] = 0;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        this.processedTitleCanvas = tempCanvas;
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.processedTitleCanvas) {
            const x = Math.floor((canvas.width - this.processedTitleCanvas.width) / 2);
            const y = 40;
            ctx.drawImage(this.processedTitleCanvas, x, y);
        }
        
        const cx = Math.floor(canvas.width / 2);
        const cy = canvas.height - 70;
        const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;

        // NEW GAME Button
        const ngText = "NEW GAME";
        ctx.globalAlpha = pulse;
        const ngMetrics = this.drawPixelText(ctx, ngText, cx, cy, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        ctx.globalAlpha = 1.0;
        this.newGameRect = { 
            x: Math.floor(cx - ngMetrics.width / 2 - 10), 
            y: cy - 10, 
            w: Math.floor(ngMetrics.width + 20), 
            h: 20 
        };

        // CUSTOM BATTLE Button
        const cbText = "CUSTOM BATTLE";
        const cbY = cy + 25;
        const cbMetrics = this.drawPixelText(ctx, cbText, cx, cbY, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        this.customBattleRect = {
            x: Math.floor(cx - cbMetrics.width / 2 - 10),
            y: cbY - 10,
            w: Math.floor(cbMetrics.width + 20),
            h: 20
        };
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        
        if (this.newGameRect && x >= this.newGameRect.x && x <= this.newGameRect.x + this.newGameRect.w &&
            y >= this.newGameRect.y && y <= this.newGameRect.y + this.newGameRect.h) {
            this.manager.switchTo('campaign_selection');
            return;
        }

        if (this.customBattleRect && x >= this.customBattleRect.x && x <= this.customBattleRect.x + this.customBattleRect.w &&
            y >= this.customBattleRect.y && y <= this.customBattleRect.y + this.customBattleRect.h) {
            this.manager.switchTo('custom_battle');
            return;
        }
    }
}

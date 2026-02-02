import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class TitleScene extends BaseScene {
    constructor() {
        super();
        this.processedTitleCanvas = null;
        this.waitingForInteraction = true;
        this.isAnimating = false;
        this.animationProgress = 0; // 0 to 1 for the pan
        this.panX = 0;
        this.state = 'START'; // START, PANNING, GUANDAO, MENU
        
        this.layers = [
            { key: 'intro_sky', speed: 0.1 },
            { key: 'intro_hills', speed: 0.3 },
            { key: 'intro_distant_army', speed: 0.6 },
            { key: 'intro_distant_army_flags', speed: 0.6, wave: 'flags' },
            { key: 'intro_midground_army', speed: 1.0 },
            { key: 'intro_midground_army_flags', speed: 1.0, wave: 'flags' },
            { key: 'intro_field', speed: 1.1 },
            { key: 'intro_grass', speed: 2.2 },
            { key: 'intro_blades', speed: 2.2, wave: 'grass' }
        ];
        
        this.horseX = 400; // Start position of horse
        this.guandaoY = -260; // Hidden entirely above (canvas height is 256)
        this.guandaoTargetY = 0;
        this.guandaoBreathe = 0;
        this.titleAlpha = 0;
        this.menuAlpha = 0;
    }

    enter() {
        this.processTitleImage();
        this.state = 'START';
        this.waitingForInteraction = true;
        this.isAnimating = false;
        this.panX = 0;
        this.animationProgress = 0;
        this.guandaoY = -260;
        this.titleAlpha = 0;
        this.menuAlpha = 0;
    }

    processTitleImage() {
        const titleImg = assets.getImage('title');
        if (!titleImg) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = titleImg.width + 4; // Extra space for outline
        tempCanvas.height = titleImg.height + 4;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 1. Create the red title version
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = titleImg.width;
        spriteCanvas.height = titleImg.height;
        const sctx = spriteCanvas.getContext('2d');
        sctx.drawImage(titleImg, 0, 0);
        const imageData = sctx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) {
                // Set to red (139, 0, 0)
                data[i] = 139; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
            } else {
                data[i+3] = 0;
            }
        }
        sctx.putImageData(imageData, 0, 0);

        // 2. Create a black mask version for the outline
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = titleImg.width;
        maskCanvas.height = titleImg.height;
        const mctx = maskCanvas.getContext('2d');
        mctx.drawImage(spriteCanvas, 0, 0);
        const maskData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const mPixels = maskData.data;
        for (let i = 0; i < mPixels.length; i += 4) {
            if (mPixels[i+3] > 0) {
                mPixels[i] = 0; mPixels[i+1] = 0; mPixels[i+2] = 0; // Black
            }
        }
        mctx.putImageData(maskData, 0, 0);

        // 3. Draw black outline by drawing shifted versions of the mask
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                tempCtx.drawImage(maskCanvas, 2 + dx, 2 + dy);
            }
        }

        // 4. Draw the red title on top
        tempCtx.drawImage(spriteCanvas, 2, 2);
        
        this.processedTitleCanvas = tempCanvas;
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        if (this.state === 'PANNING') {
            // Natural movement: slow start, fast middle, slow end
            // Use an easing function or just a manual curve
            this.animationProgress += dt * 0.0003;
            if (this.animationProgress > 1) {
                this.animationProgress = 1;
                this.state = 'GUANDAO';
                assets.playSound('unsheath_sword', 0.6);
            }

            // Ease in-out cubic
            const t = this.animationProgress;
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            
            // Pan target: horse at -100px. Horse moves with speed of grass (layer 5).
            // Horse start is 400. To get to -100, it moves 500px.
            // Horse position = horseX - (panX * speed_grass)
            // -100 = 400 - (targetPanX * 2.2) -> 2.2 * targetPanX = 500 -> targetPanX = 227.27
            const targetPanX = 500 / 2.2; 
            this.panX = ease * targetPanX;

        } else if (this.state === 'GUANDAO') {
            const step = dt * 0.15;
            if (this.guandaoY < this.guandaoTargetY) {
                this.guandaoY += step;
                if (this.guandaoY > this.guandaoTargetY) this.guandaoY = this.guandaoTargetY;
            } else {
                // Breathing effect
                this.guandaoBreathe += dt * 0.002;
                // Gently move up and down, but never below top of screen (guandaoY is 0)
                // Offset is negative (moving up)
                this.guandaoOffset = Math.sin(this.guandaoBreathe) * 5 - 5;
                
                // Fade in title and menu
                if (this.titleAlpha < 1) {
                    this.titleAlpha += dt * 0.002; // Faster fade
                    if (this.titleAlpha > 1) this.titleAlpha = 1;
                } else if (this.menuAlpha < 1) {
                    this.menuAlpha += dt * 0.002; // Faster fade
                    if (this.menuAlpha >= 1) {
                        this.menuAlpha = 1;
                        this.state = 'MENU';
                    }
                }
            }
        } else if (this.state === 'MENU') {
            this.guandaoBreathe += dt * 0.002;
            this.guandaoOffset = Math.sin(this.guandaoBreathe) * 5 - 5;
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw parallax layers
        this.layers.forEach(layer => {
            const img = assets.getImage(layer.key);
            if (!img) return;
            
            const baseX = -((this.panX * layer.speed) % img.width);
            
            if (!layer.wave) {
                ctx.drawImage(img, Math.floor(baseX), 0);
                if (baseX < 0) {
                    ctx.drawImage(img, Math.floor(baseX + img.width), 0);
                }
            } else if (layer.wave === 'flags') {
                // Wave moving left to right (offset Y based on X)
                const waveAmp = 1.2;
                const waveFreq = 0.06;
                const waveSpeed = 0.002;
                const time = timestamp * waveSpeed;
                
                // Draw in segments to simulate wave
                const segmentWidth = 4;
                for (let sx = 0; sx < img.width; sx += segmentWidth) {
                    const sw = Math.min(segmentWidth, img.width - sx);
                    const offY = Math.sin(time + sx * waveFreq) * waveAmp;
                    
                    ctx.drawImage(img, sx, 0, sw, img.height, Math.floor(baseX + sx), Math.floor(offY), sw, img.height);
                    if (baseX < 0) {
                        ctx.drawImage(img, sx, 0, sw, img.height, Math.floor(baseX + img.width + sx), Math.floor(offY), sw, img.height);
                    }
                }
            } else if (layer.wave === 'grass') {
                // Wave moving top to bottom (offset X based on Y)
                const waveAmp = 0.8;
                const waveFreq = 0.1;
                const waveSpeed = 0.002;
                const time = timestamp * waveSpeed;
                
                const segmentHeight = 2;
                for (let sy = 0; sy < img.height; sy += segmentHeight) {
                    const sh = Math.min(segmentHeight, img.height - sy);
                    const offX = Math.sin(time + sy * waveFreq) * waveAmp;
                    
                    ctx.drawImage(img, 0, sy, img.width, sh, Math.floor(baseX + offX), sy, img.width, sh);
                    if (baseX < 0) {
                        ctx.drawImage(img, 0, sy, img.width, sh, Math.floor(baseX + img.width + offX), sy, img.width, sh);
                    }
                }
            }
        });

        // Draw horse (moves with grass speed)
        const horseImg = assets.getImage('intro_horse');
        if (horseImg) {
            const hx = this.horseX - (this.panX * 2.2);
            ctx.drawImage(horseImg, Math.floor(hx), canvas.height - horseImg.height);
        }

        // Draw guandao
        const guandaoImg = assets.getImage('intro_guandao');
        if (guandaoImg && (this.state === 'GUANDAO' || this.state === 'MENU')) {
            const gx = Math.floor((canvas.width - guandaoImg.width) / 2);
            const gy = Math.floor(this.guandaoY + (this.guandaoOffset || 0));
            ctx.drawImage(guandaoImg, gx, gy);
        }
        
        if (this.state === 'START' && this.waitingForInteraction) {
            const cx = Math.floor(canvas.width / 2);
            const cy = canvas.height - 70;
            const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;
            ctx.globalAlpha = pulse;
            this.drawPixelText(ctx, "CLICK TO START", cx, cy + 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            ctx.globalAlpha = 1.0;
            return;
        }

        // Draw title
        if (this.processedTitleCanvas && this.titleAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.titleAlpha;
            const x = Math.floor((canvas.width - this.processedTitleCanvas.width) / 2);
            const y = 38; // Slightly higher due to outline
            ctx.drawImage(this.processedTitleCanvas, x, y);
            ctx.restore();
        }

        // Draw Menu
        if (this.menuAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.menuAlpha;
            this.renderMenu(ctx, canvas);
            ctx.restore();
        }
        
        // Reset alpha just in case
        ctx.globalAlpha = 1.0;
        }
        
    renderMenu(ctx, canvas) {
        const cx = Math.floor(canvas.width / 2);
        const cy = canvas.height - 70;
        const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;

        // Draw a subtle background for the menu area to ensure visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(cx - 80, cy - 30, 160, 80);

        const ngText = "NEW GAME";
        const hasSave = this.manager.gameState.hasSave();
        
        if (hasSave) {
            // CONTINUE Button
            const contText = "CONTINUE";
            const contY = cy - 15;
            ctx.save();
            ctx.globalAlpha *= pulse;
            const contMetrics = this.drawPixelText(ctx, contText, cx, contY, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            ctx.restore();
            
            this.continueRect = {
                x: Math.floor(cx - contMetrics.width / 2 - 10),
                y: contY - 10,
                w: Math.floor(contMetrics.width + 20),
                h: 20
            };

            // NEW GAME
            const ngY = cy + 10;
            const ngMetrics = this.drawPixelText(ctx, ngText, cx, ngY, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            this.newGameRect = { 
                x: Math.floor(cx - ngMetrics.width / 2 - 10), 
                y: ngY - 10, 
                w: Math.floor(ngMetrics.width + 20), 
                h: 20 
            };

            // CUSTOM BATTLE
            const cbText = "CUSTOM BATTLE";
            const cbY = cy + 35;
            const cbMetrics = this.drawPixelText(ctx, cbText, cx, cbY, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            this.customBattleRect = {
                x: Math.floor(cx - cbMetrics.width / 2 - 10),
                y: cbY - 10,
                w: Math.floor(cbMetrics.width + 20),
                h: 20
            };
        } else {
            // Original Layout
            ctx.save();
            ctx.globalAlpha *= pulse;
            const ngMetrics = this.drawPixelText(ctx, ngText, cx, cy, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            ctx.restore();
            
            this.newGameRect = { 
                x: Math.floor(cx - ngMetrics.width / 2 - 10), 
                y: cy - 10, 
                w: Math.floor(ngMetrics.width + 20), 
                h: 20 
            };

            const cbText = "CUSTOM BATTLE";
            const cbY = cy + 25;
            const cbMetrics = this.drawPixelText(ctx, cbText, cx, cbY, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            this.customBattleRect = {
                x: Math.floor(cx - cbMetrics.width / 2 - 10),
                y: cbY - 10,
                w: Math.floor(cbMetrics.width + 20),
                h: 20
            };
            this.continueRect = null;
        }

        // Confirmation Dialog Overlay
        if (this.showConfirm) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const dialogW = 200;
            const dialogH = 80;
            const dx = Math.floor((canvas.width - dialogW) / 2);
            const dy = Math.floor((canvas.height - dialogH) / 2);

            // Dialog Box
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(dx, dy, dialogW, dialogH);
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(dx + 1, dy + 1, dialogW - 2, dialogH - 2);

            this.drawPixelText(ctx, "START A NEW GAME?", cx, dy + 20, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            this.drawPixelText(ctx, "EXISTING PROGRESS WILL BE LOST", cx, dy + 35, { color: '#eee', font: '8px Tiny5', align: 'center' });

            const btnY = dy + 55;
            const yesMetrics = this.drawPixelText(ctx, "YES", cx - 40, btnY, { color: '#ff0000', font: '8px Silkscreen', align: 'center' });
            this.confirmYesRect = {
                x: Math.floor(cx - 40 - yesMetrics.width / 2 - 10),
                y: btnY - 10,
                w: Math.floor(yesMetrics.width + 20),
                h: 20
            };

            const noMetrics = this.drawPixelText(ctx, "NO", cx + 40, btnY, { color: '#eee', font: '8px Silkscreen', align: 'center' });
            this.confirmNoRect = {
                x: Math.floor(cx + 40 - noMetrics.width / 2 - 10),
                y: btnY - 10,
                w: Math.floor(noMetrics.width + 20),
                h: 20
            };
        }
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        
        if (this.waitingForInteraction) {
            this.waitingForInteraction = false;
            this.state = 'PANNING';
            assets.playMusic('title', 0.5);
            return;
        }

        if (this.menuAlpha < 0.5) return;

        if (this.showConfirm) {
            // Handle Yes
            if (this.confirmYesRect && x >= this.confirmYesRect.x && x <= this.confirmYesRect.x + this.confirmYesRect.w &&
                y >= this.confirmYesRect.y && y <= this.confirmYesRect.y + this.confirmYesRect.h) {
                assets.playSound('gong', 0.8);
                this.manager.gameState.reset();
                this.manager.switchTo('narrative', {
                    scriptId: 'intro_poem',
                    keepMusic: true,
                    onComplete: () => this.manager.switchTo('campaign_selection')
                });
                return;
            }
            // Handle No
            if (this.confirmNoRect && x >= this.confirmNoRect.x && x <= this.confirmNoRect.x + this.confirmNoRect.w &&
                y >= this.confirmNoRect.y && y <= this.confirmNoRect.y + this.confirmNoRect.h) {
                assets.playSound('ui_click');
                this.showConfirm = false;
                return;
            }
            return; // Block other inputs while confirm is visible
        }
        
        if (this.continueRect && x >= this.continueRect.x && x <= this.continueRect.x + this.continueRect.w &&
            y >= this.continueRect.y && y <= this.continueRect.y + this.continueRect.h) {
            assets.playSound('gong', 0.8);
            const lastScene = this.manager.gameState.get('lastScene') || 'campaign_selection';
            const campaignId = this.manager.gameState.get('currentCampaign');
            this.manager.switchTo(lastScene, { campaignId, isResume: true });
            return;
        }

        if (this.newGameRect && x >= this.newGameRect.x && x <= this.newGameRect.x + this.newGameRect.w &&
            y >= this.newGameRect.y && y <= this.newGameRect.y + this.newGameRect.h) {
            
            const hasSave = this.manager.gameState.hasSave();
            if (hasSave) {
                assets.playSound('ui_click');
                this.showConfirm = true;
                return;
            }

            assets.playSound('gong', 0.8);
            this.manager.gameState.reset();
            this.manager.switchTo('narrative', {
                scriptId: 'intro_poem',
                keepMusic: true,
                onComplete: () => this.manager.switchTo('campaign_selection')
            });
            return;
        }

        if (this.customBattleRect && x >= this.customBattleRect.x && x <= this.customBattleRect.x + this.customBattleRect.w &&
            y >= this.customBattleRect.y && y <= this.customBattleRect.y + this.customBattleRect.h) {
            this.manager.switchTo('custom_battle');
            return;
        }
    }
}

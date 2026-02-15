import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';
import { LANGUAGE, setLanguage, getCurrentLanguage, getFontForLanguage, getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';

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
        this.menuOptions = []; // Array of {rect, action} for menu items
        this.confirmSelection = null; // Selection state for confirm dialog
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
        this.menuOptions = [];
        this.selection = null;
        this.showConfirm = false; // Reset confirmation dialog state
        this.confirmSelection = null;
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
            
            // Update selection mouse tracking
            if (this.selection) {
                const currentMouseX = this.manager.logicalMouseX;
                const currentMouseY = this.manager.logicalMouseY;
                this.updateSelectionMouse(currentMouseX, currentMouseY);
                
                // Check mouseover for menu items
                this.menuOptions.forEach((option, i) => {
                    if (option.rect && 
                        currentMouseX >= option.rect.x && currentMouseX <= option.rect.x + option.rect.w &&
                        currentMouseY >= option.rect.y && currentMouseY <= option.rect.y + option.rect.h) {
                        this.handleSelectionMouseover(i);
                    }
                });
            }
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
            const startText = getLocalizedText(UI_TEXT['CLICK TO START']);
            this.drawPixelText(ctx, startText, cx, cy + 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
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
        
        // Draw language toggle (always visible in bottom-left corner)
        this.renderLanguageToggle(ctx, canvas);
        
        // Reset alpha just in case
        ctx.globalAlpha = 1.0;
        }
        
    updateMenuOptions() {
        const hasSave = this.manager.gameState.hasSave();
        this.menuOptions = [];
        
        if (hasSave) {
            this.menuOptions.push({ rect: this.continueRect, action: 'continue' });
            this.menuOptions.push({ rect: this.newGameRect, action: 'newgame' });
            this.menuOptions.push({ rect: this.customBattleRect, action: 'custombattle' });
        } else {
            this.menuOptions.push({ rect: this.newGameRect, action: 'newgame' });
            this.menuOptions.push({ rect: this.customBattleRect, action: 'custombattle' });
        }
    }

    renderMenu(ctx, canvas) {
        const cx = Math.floor(canvas.width / 2);
        const cy = canvas.height - 70;
        const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;

        // Draw a subtle background for the menu area to ensure visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(cx - 80, cy - 30, 160, 80);

        const ngText = getLocalizedText(UI_TEXT['NEW GAME']);
        const hasSave = this.manager.gameState.hasSave();
        
        if (hasSave) {
            // CONTINUE Button
            const contText = getLocalizedText(UI_TEXT['CONTINUE']);
            const contY = cy - 15;
            const isHighlighted = this.selection && this.selection.highlightedIndex === 0;
            ctx.save();
            ctx.globalAlpha *= pulse;
            const contMetrics = this.drawPixelText(ctx, contText, cx, contY, { 
                color: isHighlighted ? '#fff' : '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            ctx.restore();
            
            this.continueRect = {
                x: Math.floor(cx - contMetrics.width / 2 - 10),
                y: contY - 10,
                w: Math.floor(contMetrics.width + 20),
                h: 20
            };

            // NEW GAME
            const ngY = cy + 10;
            const isHighlightedNG = this.selection && this.selection.highlightedIndex === 1;
            const ngMetrics = this.drawPixelText(ctx, ngText, cx, ngY, { 
                color: isHighlightedNG ? '#fff' : '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            this.newGameRect = { 
                x: Math.floor(cx - ngMetrics.width / 2 - 10), 
                y: ngY - 10, 
                w: Math.floor(ngMetrics.width + 20), 
                h: 20 
            };

            // CUSTOM BATTLE
            const cbText = getLocalizedText(UI_TEXT['CUSTOM BATTLE']);
            const cbY = cy + 35;
            const isHighlightedCB = this.selection && this.selection.highlightedIndex === 2;
            const cbMetrics = this.drawPixelText(ctx, cbText, cx, cbY, { 
                color: isHighlightedCB ? '#fff' : '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            this.customBattleRect = {
                x: Math.floor(cx - cbMetrics.width / 2 - 10),
                y: cbY - 10,
                w: Math.floor(cbMetrics.width + 20),
                h: 20
            };
        } else {
            // Original Layout
            const isHighlightedNG = this.selection && this.selection.highlightedIndex === 0;
            ctx.save();
            ctx.globalAlpha *= pulse;
            const ngMetrics = this.drawPixelText(ctx, ngText, cx, cy, { 
                color: isHighlightedNG ? '#fff' : '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            ctx.restore();
            
            this.newGameRect = { 
                x: Math.floor(cx - ngMetrics.width / 2 - 10), 
                y: cy - 10, 
                w: Math.floor(ngMetrics.width + 20), 
                h: 20 
            };

            const cbText = "CUSTOM BATTLE";
            const cbY = cy + 25;
            const isHighlightedCB = this.selection && this.selection.highlightedIndex === 1;
            const cbMetrics = this.drawPixelText(ctx, cbText, cx, cbY, { 
                color: isHighlightedCB ? '#fff' : '#ffd700', 
                font: '8px Silkscreen', 
                align: 'center' 
            });
            this.customBattleRect = {
                x: Math.floor(cx - cbMetrics.width / 2 - 10),
                y: cbY - 10,
                w: Math.floor(cbMetrics.width + 20),
                h: 20
            };
            this.continueRect = null;
        }
        
        // Update menu options array after rendering
        this.updateMenuOptions();
        
        // Initialize selection system if not already done
        if (!this.selection && this.menuOptions.length > 0) {
            this.initSelection({
                defaultIndex: 0,
                totalOptions: this.menuOptions.length
            });
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

            const newGameText = getLocalizedText(UI_TEXT['START A NEW GAME?']);
            const progressText = getLocalizedText(UI_TEXT['EXISTING PROGRESS WILL BE LOST']);
            this.drawPixelText(ctx, newGameText, cx, dy + 20, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
            this.drawPixelText(ctx, progressText, cx, dy + 35, { color: '#eee', font: '8px Tiny5', align: 'center' });

            const btnY = dy + 55;
            
            // Initialize selection if not already done
            if (!this.confirmSelection) {
                this.confirmSelection = {
                    highlightedIndex: 0, // Start with YES (0)
                    mouseoverEnabled: true,
                    lastMouseX: -1,
                    lastMouseY: -1,
                    totalOptions: 2
                };
            }
            
            // Draw YES button with highlight if selected
            const yesColor = this.confirmSelection.highlightedIndex === 0 ? '#ff0000' : '#888';
            const yesText = getLocalizedText(UI_TEXT['YES']);
            const yesMetrics = this.drawPixelText(ctx, yesText, cx - 40, btnY, { color: yesColor, font: '8px Silkscreen', align: 'center' });
            this.confirmYesRect = {
                x: Math.floor(cx - 40 - yesMetrics.width / 2 - 10),
                y: btnY - 10,
                w: Math.floor(yesMetrics.width + 20),
                h: 20
            };
            
            // Draw highlight box for YES if selected
            if (this.confirmSelection.highlightedIndex === 0) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.confirmYesRect.x, this.confirmYesRect.y, this.confirmYesRect.w, this.confirmYesRect.h);
            }

            // Draw NO button with highlight if selected
            const noColor = this.confirmSelection.highlightedIndex === 1 ? '#eee' : '#888';
            const noText = getLocalizedText(UI_TEXT['NO']);
            const noMetrics = this.drawPixelText(ctx, noText, cx + 40, btnY, { color: noColor, font: '8px Silkscreen', align: 'center' });
            this.confirmNoRect = {
                x: Math.floor(cx + 40 - noMetrics.width / 2 - 10),
                y: btnY - 10,
                w: Math.floor(noMetrics.width + 20),
                h: 20
            };
            
            // Draw highlight box for NO if selected
            if (this.confirmSelection.highlightedIndex === 1) {
                ctx.strokeStyle = '#eee';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.confirmNoRect.x, this.confirmNoRect.y, this.confirmNoRect.w, this.confirmNoRect.h);
            }
        }
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        
        // Check language toggle first (always available)
        if (this.languageToggleRect) {
            const { x: tx, y: ty, w, h } = this.languageToggleRect;
            if (x >= tx && x <= tx + w && y >= ty && y <= ty + h) {
                this.executeMenuAction('toggleLanguage');
                return;
            }
        }
        
        if (this.waitingForInteraction) {
            this.waitingForInteraction = false;
            this.state = 'PANNING';
            assets.playMusic('title', 0.5);
            return;
        }
        
        // Re-enable mouseover on mouse interaction
        if (this.selection && x !== undefined && y !== undefined) {
            this.handleSelectionMouseClick();
        }
        
        // Update confirm dialog mouse tracking
        if (this.showConfirm && this.confirmSelection && x !== undefined && y !== undefined) {
            const currentMouseX = this.manager.logicalMouseX;
            const currentMouseY = this.manager.logicalMouseY;
            
            // Re-enable mouseover if mouse has moved
            if (currentMouseX !== this.confirmSelection.lastMouseX || currentMouseY !== this.confirmSelection.lastMouseY) {
                this.confirmSelection.mouseoverEnabled = true;
                this.confirmSelection.lastMouseX = currentMouseX;
                this.confirmSelection.lastMouseY = currentMouseY;
            }
            
            // Handle mouseover for YES button
            if (this.confirmYesRect && x >= this.confirmYesRect.x && x <= this.confirmYesRect.x + this.confirmYesRect.w &&
                y >= this.confirmYesRect.y && y <= this.confirmYesRect.y + this.confirmYesRect.h) {
                if (this.confirmSelection.mouseoverEnabled && this.confirmSelection.highlightedIndex !== 0) {
                    this.confirmSelection.highlightedIndex = 0;
                }
            }
            // Handle mouseover for NO button
            if (this.confirmNoRect && x >= this.confirmNoRect.x && x <= this.confirmNoRect.x + this.confirmNoRect.w &&
                y >= this.confirmNoRect.y && y <= this.confirmNoRect.y + this.confirmNoRect.h) {
                if (this.confirmSelection.mouseoverEnabled && this.confirmSelection.highlightedIndex !== 1) {
                    this.confirmSelection.highlightedIndex = 1;
                }
            }
        }

        if (this.menuAlpha < 0.5) return;

        if (this.showConfirm) {
            // Handle Yes click
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
            // Handle No click
            if (this.confirmNoRect && x >= this.confirmNoRect.x && x <= this.confirmNoRect.x + this.confirmNoRect.w &&
                y >= this.confirmNoRect.y && y <= this.confirmNoRect.y + this.confirmNoRect.h) {
                assets.playSound('ui_click');
                this.showConfirm = false;
                this.confirmSelection = null;
                return;
            }
            return; // Block other inputs while confirm is visible
        }
        
        if (this.continueRect && x >= this.continueRect.x && x <= this.continueRect.x + this.continueRect.w &&
            y >= this.continueRect.y && y <= this.continueRect.y + this.continueRect.h) {
            this.executeMenuAction('continue');
            return;
        }

        if (this.newGameRect && x >= this.newGameRect.x && x <= this.newGameRect.x + this.newGameRect.w &&
            y >= this.newGameRect.y && y <= this.newGameRect.y + this.newGameRect.h) {
            
            const hasSave = this.manager.gameState.hasSave();
            if (hasSave) {
                assets.playSound('ui_click');
                this.showConfirm = true;
                this.confirmSelection = null; // Will be initialized in render
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

    handleKeyDown(e) {
        // Handle "CLICK TO START" with Enter key
        if (this.waitingForInteraction && (e.key === 'Enter' || e.key === ' ')) {
            this.waitingForInteraction = false;
            this.state = 'PANNING';
            assets.playMusic('title', 0.5);
            return;
        }
        
        // Handle confirm dialog navigation (horizontal: left/right arrows)
        if (this.showConfirm && this.confirmSelection) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.confirmSelection.mouseoverEnabled = false;
                this.confirmSelection.highlightedIndex = (this.confirmSelection.highlightedIndex - 1 + 2) % 2;
                assets.playSound('ui_click');
                return;
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.confirmSelection.mouseoverEnabled = false;
                this.confirmSelection.highlightedIndex = (this.confirmSelection.highlightedIndex + 1) % 2;
                assets.playSound('ui_click');
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.confirmSelection.highlightedIndex === 0) {
                    // YES
                    assets.playSound('gong', 0.8);
                    this.manager.gameState.reset();
                    this.manager.switchTo('narrative', {
                        scriptId: 'intro_poem',
                        keepMusic: true,
                        onComplete: () => this.manager.switchTo('campaign_selection')
                    });
                } else {
                    // NO
                    assets.playSound('ui_click');
                    this.showConfirm = false;
                    this.confirmSelection = null;
                }
                return;
            }
        }
        
        // Handle menu navigation
        if (this.state === 'MENU' && this.selection && !this.showConfirm) {
            const handled = this.handleSelectionKeyboard(e, (selectedIndex) => {
                const option = this.menuOptions[selectedIndex];
                if (option && option.action) {
                    this.executeMenuAction(option.action);
                }
            });
            if (handled) return;
        }
    }

    executeMenuAction(action) {
        if (action === 'continue') {
            assets.playSound('gong', 0.8);
            const gs = this.manager.gameState;
            const campaignId = gs.get('currentCampaign');
            
            // Check for saved states in priority order
            // If there's a saved narrative state, resume narrative
            const narrativeState = gs.get('narrativeState');
            if (narrativeState) {
                // Check if we have a valid script to restore
                let hasValidScript = false;
                if (narrativeState.scriptId) {
                    // Using scriptId - check if script exists and currentStep is valid
                    const script = NARRATIVE_SCRIPTS[narrativeState.scriptId];
                    if (script && narrativeState.currentStep < script.length) {
                        hasValidScript = true;
                    }
                } else if (narrativeState.script && Array.isArray(narrativeState.script) && narrativeState.script.length > 0) {
                    // Using custom script - check if currentStep is valid
                    if (narrativeState.currentStep < narrativeState.script.length) {
                        hasValidScript = true;
                    }
                }
                
                if (hasValidScript) {
                    this.manager.switchTo('narrative', { isResume: true });
                    return;
                } else {
                    // Invalid narrative state - clear it
                    console.warn('Clearing invalid narrative state', narrativeState);
                    gs.set('narrativeState', null);
                }
            }
            
            // If there's a saved battle state, resume battle
            if (gs.get('battleState')) {
                this.manager.switchTo('tactics', { isResume: true });
                return;
            }
            
            // If there's a saved map state, resume map
            if (gs.get('mapState')) {
                this.manager.switchTo('map', { campaignId, isResume: true });
                return;
            }
            
            // Fallback to lastScene (with exclusion check)
            let lastScene = gs.get('lastScene');
            const excludedScenes = ['title', 'custom_battle']; // campaign_selection is now allowed
            
            // If lastScene is excluded or doesn't exist, default to map
            if (!lastScene || excludedScenes.includes(lastScene)) {
                // If no lastScene but we have a campaign, go to map
                // Otherwise, go to campaign_selection
                if (campaignId) {
                    lastScene = 'map';
                } else {
                    lastScene = 'campaign_selection';
                }
            }
            
            // Check for scene-specific saved states (generic approach for future scenes)
            // Any scene can implement saveState() method that saves to `${sceneName}State`
            // and restore via enter({ isResume: true })
            // This allows any scene to opt into save/restore without modifying continue logic
            const sceneStateKey = `${lastScene}State`;
            const sceneState = gs.get(sceneStateKey);
            if (sceneState) {
                // Scene has saved state - resume it
                this.manager.switchTo(lastScene, { isResume: true });
                return;
            }
            
            // No saved state for this scene - just switch to it normally
            this.manager.switchTo(lastScene, { campaignId, isResume: true });
        } else if (action === 'newgame') {
            const hasSave = this.manager.gameState.hasSave();
            if (hasSave) {
                assets.playSound('ui_click');
                this.showConfirm = true;
                this.confirmSelection = null; // Will be initialized in render
            } else {
                assets.playSound('gong', 0.8);
                this.manager.gameState.reset();
                this.manager.switchTo('narrative', {
                    scriptId: 'intro_poem',
                    keepMusic: true,
                    onComplete: () => this.manager.switchTo('campaign_selection')
                });
            }
        } else if (action === 'custombattle') {
            this.manager.switchTo('custom_battle');
        } else if (action === 'toggleLanguage') {
            const currentLang = getCurrentLanguage();
            const newLang = currentLang === 'en' ? 'zh' : 'en';
            setLanguage(newLang);
            assets.playSound('ui_click', 0.5);
        }
    }

    renderLanguageToggle(ctx, canvas) {
        // Always use 12px zpix since toggle always shows Chinese text
        // Adjust rectangle to fit 12px font properly
        const toggleX = 5;
        const toggleY = canvas.height - 20;
        const toggleW = 60;
        const toggleH = 16;
        
        // Background with better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(toggleX, toggleY, toggleW, toggleH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(toggleX + 0.5, toggleY + 0.5, toggleW - 1, toggleH - 1);
        
        // Language labels
        const currentLang = getCurrentLanguage();
        const enText = 'EN';
        const zhText = '中文';
        
        // Draw both languages, highlight current
        const enColor = currentLang === 'en' ? '#ffd700' : '#888';
        const zhColor = currentLang === 'zh' ? '#ffd700' : '#888';
        
        // Always use 12px zpix - draw directly to bypass getFontForLanguage processing
        ctx.save();
        ctx.font = '12px zpix';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        ctx.fillStyle = enColor;
        ctx.fillText(enText, toggleX + 6, toggleY + 2);
        
        ctx.fillStyle = zhColor;
        ctx.fillText(zhText, toggleX + 32, toggleY + 2);
        ctx.restore();
        
        // Store toggle rect for click detection
        this.languageToggleRect = { x: toggleX, y: toggleY, w: toggleW, h: toggleH };
    }
}

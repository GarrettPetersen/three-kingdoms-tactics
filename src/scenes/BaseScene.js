import { ANIMATIONS } from '../core/Constants.js';
import { assets } from '../core/AssetLoader.js';

export class BaseScene {
    constructor() {
        this.manager = null;
    }

    enter(params) {}
    exit() {}
    update(timestamp) {}
    render(timestamp) {}
    handleInput(e) {}

    // Reusable selection system for menus and choices
    initSelection(options = {}) {
        const {
            defaultIndex = 0,
            totalOptions = 0
        } = options;
        
        this.selection = {
            highlightedIndex: defaultIndex,
            mouseoverEnabled: true,
            lastMouseX: -1,
            lastMouseY: -1,
            totalOptions: totalOptions
        };
    }

    updateSelectionMouse(currentMouseX, currentMouseY) {
        if (!this.selection) return;
        
        // Re-enable mouseover if mouse has moved
        if (currentMouseX !== this.selection.lastMouseX || currentMouseY !== this.selection.lastMouseY) {
            this.selection.mouseoverEnabled = true;
            this.selection.lastMouseX = currentMouseX;
            this.selection.lastMouseY = currentMouseY;
        }
    }

    handleSelectionMouseover(optionIndex) {
        if (!this.selection) return;
        if (this.selection.mouseoverEnabled && this.selection.highlightedIndex !== optionIndex) {
            this.selection.highlightedIndex = optionIndex;
        }
    }

    handleSelectionMouseClick() {
        if (!this.selection) return;
        this.selection.mouseoverEnabled = true;
    }

    handleSelectionKeyboard(e, onSelect) {
        if (!this.selection) return false;
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex - 1 + this.selection.totalOptions) % this.selection.totalOptions;
            assets.playSound('ui_click');
            return true;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex + 1) % this.selection.totalOptions;
            assets.playSound('ui_click');
            return true;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (onSelect) {
                onSelect(this.selection.highlightedIndex);
            }
            return true;
        }
        
        return false;
    }

    getMousePos(e) {
        const { canvas } = this.manager;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    drawCharacter(ctx, img, action, frame, x, y, options = {}) {
        if (!img) return;
        const { flip = false, sinkOffset = 0, isSubmerged = false, tint = null, hideBottom = 0, scale = 1.0, isProp = false } = options;
        const sourceSize = 72;

        if (isProp) {
            // Props are single images, not spritesheets. Center them.
            ctx.save();
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            if (scale !== 1.0) ctx.scale(scale, scale);
            
            // Draw centered horizontally. 
            // For vertical, we align the visible bottom (assuming 5px padding) to the ground.
            const visibleHeight = img.height - 5;
            ctx.drawImage(img, -img.width / 2, -visibleHeight);
            ctx.restore();
            return;
        }

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;
        const feetY = -44;

        const drawPass = (alpha = 1.0, clipRect = null) => {
            ctx.save();
            if (clipRect) {
                ctx.beginPath();
                ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
                ctx.clip();
            }
            ctx.globalAlpha *= alpha;
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            if (scale !== 1.0) ctx.scale(scale, scale);
            
            if (tint) {
                // To tint ONLY the sprite and not the background already on the canvas,
                // we must use a temporary buffer.
                if (!this._tintCanvas) {
                    this._tintCanvas = document.createElement('canvas');
                    this._tintCanvas.width = sourceSize;
                    this._tintCanvas.height = sourceSize;
                    this._tintCtx = this._tintCanvas.getContext('2d');
                }
                const tctx = this._tintCtx;
                tctx.clearRect(0, 0, sourceSize, sourceSize);
                
                // 1. Draw sprite to temp
                tctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
                
                // 2. Tint it
                tctx.save();
                tctx.globalCompositeOperation = 'source-atop';
                tctx.fillStyle = tint;
                tctx.fillRect(0, 0, sourceSize, sourceSize);
                tctx.restore();
                
                // 3. Draw temp back to main
                ctx.drawImage(this._tintCanvas, -36, feetY);
            } else {
                // Draw normally
                ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            }
            
            ctx.restore();
        };

        if (isSubmerged) {
            // Above water
            drawPass(1.0, { x: x - 40, y: y - 100, w: 80, h: 100 });
            // Below water
            drawPass(0.4, { x: x - 40, y: y, w: 80, h: 100 });
        } else if (hideBottom > 0) {
            // Hide N pixels from the absolute bottom of the 72x72 sprite
            // The bottom of the sprite is at anchor (y + sinkOffset) + 28 pixels (since feetY is -44)
            const spriteBottomY = y + sinkOffset + 28;
            const clipY = spriteBottomY - hideBottom;
            drawPass(1.0, { x: x - 40, y: y - 100, w: 80, h: clipY - (y - 100) });
        } else {
            drawPass(1.0);
        }
    }

    checkCharacterHit(img, action, frame, x, y, clickX, clickY, options = {}) {
        if (!img) return false;
        const { flip = false, sinkOffset = 0, isProp = false } = options;
        const sourceSize = 72;

        if (isProp) {
            const bx = x - img.width / 2;
            const by = y + sinkOffset - (img.height - 5);
            if (clickX < bx || clickX > bx + img.width || clickY < by || clickY > by + img.height) {
                return false;
            }
            // Pixel perfect check for props
            if (!this._hitCanvas) {
                this._hitCanvas = document.createElement('canvas');
                this._hitCanvas.width = 1;
                this._hitCanvas.height = 1;
                this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
            }
            const hctx = this._hitCtx;
            hctx.clearRect(0, 0, 1, 1);
            hctx.save();
            hctx.translate(-(clickX - bx), -(clickY - by));
            if (flip) {
                hctx.translate(img.width / 2, 0);
                hctx.scale(-1, 1);
                hctx.translate(-img.width / 2, 0);
            }
            hctx.drawImage(img, 0, 0);
            hctx.restore();
            const alpha = hctx.getImageData(0, 0, 1, 1).data[3];
            return alpha > 10;
        }

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;
        const feetY = -44;

        // 1. Quick bounding box check
        const bx = x - 36;
        const by = y + feetY + sinkOffset;
        if (clickX < bx || clickX > bx + sourceSize || clickY < by || clickY > by + sourceSize) {
            return false;
        }

        // 2. Pixel-perfect check using a tiny offscreen canvas
        if (!this._hitCanvas) {
            this._hitCanvas = document.createElement('canvas');
            this._hitCanvas.width = 1;
            this._hitCanvas.height = 1;
            this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
        }

        const hctx = this._hitCtx;
        hctx.clearRect(0, 0, 1, 1);
        hctx.save();
        
        // Translate such that the click point is at (0,0) in our 1x1 canvas
        hctx.translate(-(clickX - bx), -(clickY - by));
        
        if (flip) {
            // If flipped, we need to flip the drawing relative to the sprite center
            // Sprite center relative to bx is sourceSize / 2
            hctx.translate(sourceSize / 2, 0);
            hctx.scale(-1, 1);
            hctx.translate(-sourceSize / 2, 0);
        }

        hctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
        hctx.restore();

        const alpha = hctx.getImageData(0, 0, 1, 1).data[3];
        return alpha > 10; // Threshold for hit
    }

    wrapText(ctx, text, maxWidth, font = '8px Tiny5') {
        const words = (text || "").split(' ');
        const lines = [];
        let currentLine = '';

        ctx.save();
        ctx.font = font;
        for (let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            // Subtract a small buffer (4px) to account for font rendering variations and ellipsis
            if (ctx.measureText(testLine).width > maxWidth - 4 && n > 0) {
                lines.push(currentLine.trim());
                currentLine = words[n] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());
        ctx.restore();
        return lines;
    }

    renderDialogueBox(ctx, canvas, step, options = {}) {
        const { subStep = 0, bgImg = null } = options;
        const margin = 5;
        const panelHeight = 60; // Increased from 50 to fit 48px height portraits
        const panelWidth = canvas.width - margin * 2;
        const px = margin;
        
        const position = step.position || 'bottom';
        const py = position === 'top' ? margin : canvas.height - panelHeight - margin;

        // Panel
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        // Portrait Box (Adjusted for 40x48)
        const portraitW = 40;
        const portraitH = 48;
        const portraitX = px + 6;
        const portraitY = py + 6;
        
        // Portrait Background/Border
        ctx.fillStyle = '#000';
        ctx.fillRect(portraitX - 1, portraitY - 1, portraitW + 2, portraitH + 2);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(portraitX - 0.5, portraitY - 0.5, portraitW + 1, portraitH + 1);

        const isNoticeboard = step.portraitKey === 'noticeboard' || (step.name && step.name.toLowerCase().includes('noticeboard'));
        let isNarrator = step.portraitKey === 'narrator' || !step.name || step.name.toLowerCase() === 'narrator';
        
        // Force Narrator name if not set
        if (isNarrator && (!step.name || step.name.toLowerCase() === 'narrator')) {
            step.name = "Narrator";
        }

        // Try to find a dedicated portrait first
        let portraitImg = null;
        if (isNoticeboard || isNarrator) {
            let useBg = bgImg;
            if (isNarrator && !useBg) {
                // Default narrator background to peach garden for a nice visual
                useBg = assets.getImage('peach_garden');
            }

            if (useBg) {
                // Special case: Crop the center of the background image
                const cw = useBg.width;
                const ch = useBg.height;
                const cropX = Math.floor((cw - portraitW) / 2);
                const cropY = Math.floor((ch - portraitH) / 2);
                ctx.drawImage(useBg, cropX, cropY, portraitW, portraitH, portraitX, portraitY, portraitW, portraitH);
            }
            // If no bgImg, it just stays black (narrator/noticeboard default)
        } else if (step.portraitKey) {
            // 1. Try formatted name first (e.g. "portrait_Liu-Bei")
            const formattedName = step.name ? step.name.replace(/ /g, '-') : '';
            portraitImg = assets.getImage(`portrait_${formattedName}`);
            
            // 2. If name-based failed (e.g. name is "???"), try the portraitKey itself (e.g. "portrait_zhangfei")
            if (!portraitImg) {
                portraitImg = assets.getImage(`portrait_${step.portraitKey}`);
            }

            // 3. Special case for common variations
            if (!portraitImg) {
                // Try title case portraitKey (e.g. "portrait_Zhang-Fei")
                const titleKey = step.portraitKey.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
                portraitImg = assets.getImage(`portrait_${titleKey}`);
            }
            
            if (!portraitImg) {
                // Fallback to the actor sprite sheet crop
                portraitImg = assets.getImage(step.portraitKey);
                if (portraitImg) {
            const crop = step.portraitRect || { x: 26, y: 20, w: 20, h: 20 };
                    // Draw fallback at 2x to fill space (scaled pixel art, but better than nothing)
                    ctx.drawImage(portraitImg, crop.x, crop.y, crop.w, crop.h, portraitX, portraitY + 4, 40, 40);
                }
            } else {
                // Draw dedicated portrait at native 1:1 resolution
                ctx.drawImage(portraitImg, portraitX, portraitY, portraitW, portraitH);
            }
        }

        // Name
        const textX = portraitX + portraitW + 8;
        this.drawPixelText(ctx, (step.name || "").toUpperCase(), textX, py + 6, { color: '#ffd700', font: '8px Silkscreen' });

        // Text
        const textPaddingRight = 15;
        const maxWidth = panelWidth - (textX - px) - textPaddingRight;
        const lines = this.wrapText(ctx, step.text, maxWidth, '8px Dogica');
        const start = subStep * 3;
        const displayLines = lines.slice(start, start + 3);
        const hasNextChunk = (subStep + 1) * 3 < lines.length;
        
        let lineY = py + 20; // Moved up a bit to fit 3 lines
        displayLines.forEach((line, i) => {
            let text = line;
            if (i === displayLines.length - 1 && hasNextChunk) {
                text += "...";
            }
            this.drawPixelText(ctx, text, textX, lineY, { color: '#eee', font: '8px Dogica' });
            lineY += 12; // Slightly reduced spacing between lines
        });

        // Click prompt - show right arrow if there's more text, otherwise show "NEXT"
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        if (hasNextChunk) {
            // Draw right arrow (→) when there's more text to read
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            const arrowX = px + panelWidth - 10;
            const arrowY = py + panelHeight - 9;
            // Draw a right-pointing triangle
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX + 5, arrowY + 3);
            ctx.lineTo(arrowX, arrowY + 6);
            ctx.closePath();
            ctx.fill();
        } else {
            // Show "NEXT" when clicking will advance to next dialogue
            this.drawPixelText(ctx, "NEXT", px + panelWidth - 2, py + panelHeight - 10, { color: '#eee', font: '8px Tiny5', align: 'right' });
        }
        ctx.globalAlpha = 1.0;

        return { hasNextChunk, totalLines: lines.length };
    }

    drawPixelText(ctx, text, x, y, options = {}) {
        if (!text) return null;
        const { 
            color = '#eee', 
            font = '8px Silkscreen', 
            align = 'left',
            outline = false,
            outlineColor = '#000'
        } = options;
        
        ctx.save();
        ctx.font = font;
        ctx.textAlign = align; 
        ctx.textBaseline = 'top'; 
        
        if (outline) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.strokeText(text, x, y);
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        const metrics = ctx.measureText(text);
        ctx.restore();
        return metrics;
    }
}

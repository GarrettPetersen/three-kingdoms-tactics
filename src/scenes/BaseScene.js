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
        const { flip = false, sinkOffset = 0, isSubmerged = false, tint = null, hideBottom = 0, scale = 1.0 } = options;
        const sourceSize = 72;
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
        const { flip = false, sinkOffset = 0 } = options;
        const sourceSize = 72;
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
        const { subStep = 0 } = options;
        const margin = 5;
        const panelHeight = 50;
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

        // Portrait
        const portraitSize = 38;
        const portraitX = px + 6;
        const portraitY = py + 6;
        ctx.fillStyle = '#000';
        ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(portraitX + 0.5, portraitY + 0.5, portraitSize - 1, portraitSize - 1);

        const actorImg = assets.getImage(step.portraitKey);
        if (actorImg) {
            const crop = step.portraitRect || { x: 26, y: 20, w: 20, h: 20 };
            const destSize = 32;
            const destOffset = (portraitSize - destSize) / 2;
            ctx.drawImage(actorImg, crop.x, crop.y, crop.w, crop.h, portraitX + destOffset, portraitY + destOffset, destSize, destSize);
        }

        // Name
        const textX = portraitX + portraitSize + 8;
        this.drawPixelText(ctx, (step.name || "").toUpperCase(), textX, py + 7, { color: '#ffd700', font: '8px Dogica' });

        // Text
        const textPaddingRight = 15;
        const maxWidth = panelWidth - (textX - px) - textPaddingRight;
        const lines = this.wrapText(ctx, step.text, maxWidth, '8px Dogica');
        const start = subStep * 2;
        const displayLines = lines.slice(start, start + 2);
        const hasNextChunk = (subStep + 1) * 2 < lines.length;
        
        let lineY = py + 22;
        displayLines.forEach((line, i) => {
            let text = line;
            if (i === displayLines.length - 1 && hasNextChunk) {
                text += "...";
            }
            this.drawPixelText(ctx, text, textX, lineY, { color: '#eee', font: '8px Dogica' });
            lineY += 12;
        });

        // Click prompt
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        this.drawPixelText(ctx, "NEXT", px + panelWidth - 2, py + panelHeight - 8, { color: '#eee', font: '8px Dogica', align: 'right' });
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


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
        const { flip = false, sinkOffset = 0, isSubmerged = false } = options;
        const sourceSize = 72;
        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;
        const feetY = -44;

        if (isSubmerged) {
            // Draw ABOVE water surface (opaque)
            // The water surface is exactly at 'y'
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 40, y - 100, 80, 100); 
            ctx.clip();
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            ctx.restore();

            // Draw BELOW water surface (semi-transparent)
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.rect(x - 40, y, 80, 100); 
            ctx.clip();
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            ctx.restore();
        } else {
            // Draw normally (Dry Ground)
            ctx.save();
            ctx.translate(Math.floor(x), Math.floor(y));
            if (flip) ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            ctx.restore();
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

    wrapText(ctx, text, maxWidth) {
        const words = (text || "").split(' ');
        const lines = [];
        let currentLine = '';

        ctx.save();
        ctx.font = '8px Tiny5';
        for (let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
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
        const panelHeight = 44;
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
        const portraitSize = 34;
        const portraitX = px + 5;
        const portraitY = py + 5;
        ctx.fillStyle = '#000';
        ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(portraitX + 0.5, portraitY + 0.5, portraitSize - 1, portraitSize - 1);

        const actorImg = assets.getImage(step.portraitKey);
        if (actorImg) {
            const crop = step.portraitRect || { x: 26, y: 20, w: 20, h: 20 };
            const destSize = 28;
            const destOffset = (portraitSize - destSize) / 2;
            ctx.drawImage(actorImg, crop.x, crop.y, crop.w, crop.h, portraitX + destOffset, portraitY + destOffset, destSize, destSize);
        }

        // Name
        const textX = portraitX + portraitSize + 8;
        this.drawPixelText(ctx, (step.name || "").toUpperCase(), textX, py + 6, { color: '#ffd700', font: '8px Silkscreen' });

        // Text
        const maxWidth = panelWidth - portraitSize - 25;
        const lines = this.wrapText(ctx, step.text, maxWidth);
        const start = subStep * 2;
        const displayLines = lines.slice(start, start + 2);
        const hasNextChunk = (subStep + 1) * 2 < lines.length;
        
        let lineY = py + 18;
        displayLines.forEach((line, i) => {
            let text = line;
            if (i === displayLines.length - 1 && hasNextChunk) {
                text += "...";
            }
            this.drawPixelText(ctx, text, textX, lineY, { color: '#eee', font: '8px Tiny5' });
            lineY += 10;
        });

        // Click prompt
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        this.drawPixelText(ctx, "NEXT", px + panelWidth - 2, py + panelHeight - 8, { color: '#eee', font: '8px Tiny5', align: 'right' });
        ctx.globalAlpha = 1.0;

        return { hasNextChunk, totalLines: lines.length };
    }

    drawPixelText(ctx, text, x, y, options = {}) {
        if (!text) return null;
        const { 
            color = '#eee', 
            font = '8px Silkscreen', 
            align = 'left' 
        } = options;
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align; 
        ctx.textBaseline = 'top'; 
        
        ctx.fillText(text, x, y);
        const metrics = ctx.measureText(text);
        ctx.restore();
        return metrics;
    }
}


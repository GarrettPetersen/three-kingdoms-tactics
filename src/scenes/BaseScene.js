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

    drawCharacter(ctx, img, action, frame, x, y, flip = false) {
        if (!img) return;
        const sourceSize = 72;
        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;

        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, -68, sourceSize, sourceSize);
        ctx.restore();
    }

    wrapText(ctx, text, maxWidth) {
        const words = (text || "").split(' ');
        const lines = [];
        let currentLine = '';

        ctx.save();
        ctx.font = '8px Dogica';
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
            this.drawPixelText(ctx, text, textX, lineY, { color: '#eee', font: '8px Dogica' });
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


import { ANIMATIONS } from '../core/Constants.js';

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

    drawPixelText(ctx, text, x, y, options = {}) {
        const { 
            color = '#eee', 
            font = '8px Silkscreen', 
            align = 'left' 
        } = options;
        
        ctx.save();
        ctx.imageSmoothingEnabled = false; // Ensure no smoothing for text
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = 'left'; 
        ctx.textBaseline = 'top'; 
        
        const metrics = ctx.measureText(text);
        let drawX = Math.floor(x);
        
        if (align === 'center') {
            drawX = Math.floor(x - metrics.width / 2);
        } else if (align === 'right') {
            drawX = Math.floor(x - metrics.width);
        }
        
        ctx.fillText(text, drawX, Math.floor(y));
        ctx.restore();
        return metrics;
    }
}


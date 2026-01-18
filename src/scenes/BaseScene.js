export class BaseScene {
    constructor() {
        this.manager = null;
    }

    enter(params) {}
    exit() {}
    update(timestamp) {}
    render(timestamp) {}
    handleInput(e) {}

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


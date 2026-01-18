import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class NarrativeScene extends BaseScene {
    constructor() {
        super();
        this.script = [];
        this.currentLine = 0;
    }

    enter(params) {
        this.script = params.script || [
            { name: "Liu Bei", text: "The path ahead is long and full of peril...", img: "liubei" },
            { name: "Zhuge Liang", text: "But with wisdom and strategy, we shall prevail.", img: "zhugeliang" }
        ];
        this.currentLine = 0;
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const line = this.script[this.currentLine];
        if (!line) return;

        // Draw character center screen
        const img = assets.getImage(line.img);
        if (img) {
            ctx.drawImage(img, 0, 0, 72, 72, Math.floor(canvas.width / 2 - 36), Math.floor(canvas.height / 2 - 50), 72, 72);
        }

        // Draw Dialogue Box
        const margin = 10;
        const panelWidth = Math.floor(canvas.width * 0.9);
        const panelHeight = 50;
        const px = Math.floor((canvas.width - panelWidth) / 2);
        const py = canvas.height - panelHeight - margin;

        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#8b0000';
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        ctx.fillStyle = '#ffd700';
        ctx.font = '8px Silkscreen';
        ctx.fillText(line.name, px + 10, py + 15);

        ctx.fillStyle = '#eee';
        ctx.font = '8px Silkscreen';
        ctx.fillText(line.text, px + 10, py + 30);
        
        ctx.font = '6px Silkscreen';
        ctx.fillText("Click to continue...", px + panelWidth - 60, py + panelHeight - 5);
    }

    handleInput(e) {
        this.currentLine++;
        if (this.currentLine >= this.script.length) {
            this.manager.switchTo('tactics');
        }
    }
}


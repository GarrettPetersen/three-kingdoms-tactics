import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class CreditsScene extends BaseScene {
    constructor() {
        super();
        this.creditsText = "";
        this.lines = [];
        this.scrollPos = 0;
        this.timer = 0;
        this.isLoaded = false;
    }

    async enter() {
        this.timer = 0;
        this.scrollPos = 0;
        this.isLoaded = false;
        
        if (assets.currentMusicKey !== 'title') {
            assets.playMusic('title', 0.3);
        }

        try {
            const response = await fetch('credits.md');
            const text = await response.text();
            this.parseCredits(text);
            this.isLoaded = true;
        } catch (e) {
            console.error("Failed to load credits.md", e);
            this.lines = ["# CREDITS", "", "Game design by Garrett Petersen"];
            this.isLoaded = true;
        }
    }

    parseCredits(text) {
        // Simple parser for markdown-like credits
        this.lines = text.split('\n').map(line => line.trim());
    }

    update(dt) {
        if (!this.isLoaded) return;
        
        this.timer += dt;
        // Scroll speed: ~20 pixels per second
        this.scrollPos += dt * 0.025;

        // Auto-exit after some time if it finishes scrolling
        const totalHeight = this.lines.length * 15 + 300;
        if (this.scrollPos > totalHeight + 100) {
            this.exitToTitle();
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.isLoaded) return;

        const cx = canvas.width / 2;
        const startY = canvas.height - this.scrollPos;

        this.lines.forEach((line, i) => {
            const y = startY + i * 15;
            if (y < -20 || y > canvas.height + 20) return; // Cull off-screen

            let options = {
                color: '#fff',
                font: '8px Tiny5',
                align: 'center'
            };

            if (line.startsWith('# ')) {
                options.color = '#ffd700';
                options.font = '12px Silkscreen';
                line = line.substring(2).toUpperCase();
            } else if (line.startsWith('## ')) {
                options.color = '#0af';
                options.font = '10px Silkscreen';
                line = line.substring(3).toUpperCase();
            } else if (line === "") {
                return;
            }

            this.drawPixelText(ctx, line, cx, y, options);
        });

        // Skip prompt
        if (this.timer > 3000) {
            const pulse = Math.abs(Math.sin(Date.now() / 500));
            ctx.globalAlpha = 0.3 + pulse * 0.3;
            this.drawPixelText(ctx, "CLICK TO SKIP", canvas.width - 5, canvas.height - 15, {
                color: '#aaa',
                font: '8px Tiny5',
                align: 'right'
            });
            ctx.globalAlpha = 1.0;
        }
    }

    handleInput(e) {
        if (this.timer > 1000) {
            this.exitToTitle();
        }
    }

    exitToTitle() {
        this.manager.switchTo('title');
    }
}



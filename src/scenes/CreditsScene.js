import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

const DEFAULT_CREDITS_MARKDOWN = `# Credits

Game design by Garrett Petersen

Character sprites by Px2d and Garrett Petersen

Music by YouFulca

Hex art by Retro Diffusion and Garrett Petersen

Location backgrounds by Retro Diffusion

Title font: Sukajan Brush by tkzgraphic

Original novel by Guanzhong Luo`;

export class CreditsScene extends BaseScene {
    constructor() {
        super();
        this.creditsText = "";
        this.lines = [];
        this.scrollPos = 0;
        this.timer = 0;
        this.isLoaded = false;
        this.returnToMenu = false;
        this.lastTime = 0;
    }

    async enter(params = {}) {
        this.timer = 0;
        this.scrollPos = 0;
        this.isLoaded = false;
        this.returnToMenu = !!params.returnToMenu;
        this.lastTime = 0;
        
        if (assets.currentMusicKey !== 'title') {
            assets.playMusic('title', 0.3);
        }

        try {
            const text = await this.loadCreditsText();
            this.parseCredits(text);
            this.isLoaded = true;
        } catch (e) {
            console.error("Failed to load credits.md", e);
            this.parseCredits(DEFAULT_CREDITS_MARKDOWN);
            this.isLoaded = true;
        }
    }

    parseCredits(text) {
        // Simple parser for markdown-like credits
        this.lines = text.split('\n').map(line => line.trim());
    }

    async loadCreditsText() {
        let lastError = null;
        for (const url of this.getCreditsUrls()) {
            try {
                const response = await fetch(url, { cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error(`Credits request failed: ${response.status}`);
                }
                const text = await response.text();
                if (this.isHtmlResponse(response, text)) {
                    throw new Error(`Credits request returned HTML from ${url}`);
                }
                return text;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Credits request failed');
    }

    getCreditsUrls() {
        const urls = [];
        if (typeof document !== 'undefined' && document.baseURI) {
            urls.push(new URL('credits.md', document.baseURI).href);
        }
        if (typeof window !== 'undefined' && window.location?.origin && window.location.protocol !== 'file:') {
            urls.push(new URL('credits.md', `${window.location.origin}/`).href);
        }
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            ['../credits.md', '../../credits.md'].forEach(relativePath => {
                urls.push(new URL(relativePath, import.meta.url).href);
            });
        }
        urls.push('credits.md');
        return [...new Set(urls)];
    }

    isHtmlResponse(response, text) {
        const contentType = response.headers?.get?.('content-type') || '';
        const trimmed = text.trimStart().slice(0, 120).toLowerCase();
        return contentType.includes('text/html') ||
            trimmed.startsWith('<!doctype html') ||
            trimmed.startsWith('<html');
    }

    update(timestamp) {
        if (!this.isLoaded) return;

        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
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
                options.font = '16px Silkscreen';
                line = line.substring(2).toUpperCase();
            } else if (line.startsWith('## ')) {
                options.color = '#0af';
                options.font = '16px Silkscreen';
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

    handleKeyDown(e) {
        if (this.timer <= 1000) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            this.exitToTitle();
        }
    }

    exitToTitle() {
        this.manager.switchTo('title', { showMenu: this.returnToMenu });
    }
}

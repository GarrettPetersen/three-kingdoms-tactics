import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class CampaignSelectionScene extends BaseScene {
    constructor() {
        super();
        this.chapters = [
            { id: '1', title: 'Chapter 1', available: true },
            { id: '2', title: 'Chapter 2', available: false }, 
            { id: '3', title: 'Chapter 3', available: false },
            { id: '4', title: 'Chapter 4', available: false },
            { id: '5', title: 'Chapter 5', available: false }
        ];
        this.selectedChapterIndex = 0;
        this.message = null;
        this.messageTimer = 0;
        
        // Campaigns available in the selected chapter
        this.campaigns = [
            { 
                id: 'liubei', 
                name: 'THE OATH IN THE PEACH GARDEN', 
                charName: 'LIU BEI',
                imgKey: 'liubei',
                description: 'In the waning days of the Han, three heroes meet to swear an oath that will change history.',
                x: 190,
                y: 70,
                locked: false
            }
        ];
        this.selectedIndex = 0;
    }

    enter() {
        assets.playMusic('title');
        
        const gs = this.manager.gameState;
        const isComplete = gs.hasMilestone('chapter1_complete');
        const freedLuZhi = gs.hasMilestone('freed_luzhi');

        // Chapter 2 is available only if Chapter 1 is complete
        this.chapters.find(ch => ch.id === '2').available = isComplete;

        // Update Liu Bei campaign info if complete
        const liubei = this.campaigns.find(c => c.id === 'liubei');
        if (liubei && isComplete) {
            liubei.isComplete = true;
            liubei.name = 'THE OATH - STORY COMPLETE';
            liubei.description = 'You formed a brotherhood to fight the Yellow Turban rebels and rescued general Dong Zhuo from certain death.';
            
            if (freedLuZhi) {
                liubei.description += ' You chose the path of loyalty, freeing Lu Zhi and becoming an outlaw in the eyes of the corrupt court.';
            } else {
                liubei.description += ' You followed the law, allowing Lu Zhi to be taken to the capital despite the injustice of the charges.';
            }
        }

        // Reset message state
        this.message = null;
        this.messageTimer = 0;

        // Setup ESC key listener
        this._onKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.manager.switchTo('title');
            }
        };
        window.addEventListener('keydown', this._onKeyDown);
    }

    exit() {
        // Cleanup listener
        window.removeEventListener('keydown', this._onKeyDown);
    }

    update(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0) {
                this.message = null;
            }
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Map Background
        const mapImg = assets.getImage('china_map');
        if (mapImg) {
            ctx.globalAlpha = 0.5; // Dim the map to make UI pop
            ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }

        // 1. VERTICAL TIMELINE (Left side)
        const timelineX = 10;
        let timelineY = 40;
        const timelineSpacing = 25;

        // Draw timeline vertical bar
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(timelineX + 15, 30);
        ctx.lineTo(timelineX + 15, timelineY + (this.chapters.length - 1) * timelineSpacing + 10);
        ctx.stroke();

        this.chapters.forEach((ch, i) => {
            const isSelected = this.selectedChapterIndex === i;
            const ty = timelineY + i * timelineSpacing;
            
            // Node circle
            ctx.fillStyle = isSelected ? '#ffd700' : (ch.available ? '#888' : '#333');
            ctx.beginPath();
            ctx.arc(timelineX + 15, ty + 4, 3, 0, Math.PI * 2);
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            const color = isSelected ? '#ffd700' : (ch.available ? '#aaa' : '#444');
            this.drawPixelText(ctx, ch.title, timelineX + 22, ty, { color, font: '8px Silkscreen' });
        });

        // 2. CHARACTER ICONS ON MAP
        const frame = Math.floor(Date.now() / 150) % 4;
        this.campaigns.forEach((c, i) => {
            const isSelected = this.selectedIndex === i;
            const charImg = assets.getImage(c.imgKey);
            
            if (charImg) {
                // Dim locked characters, or grayscale if complete
                ctx.save();
                if (c.isComplete) {
                    ctx.filter = 'grayscale(100%)';
                }
                ctx.globalAlpha = c.locked ? 0.4 : 1.0;
                
                // Draw a pulsing circle under the selected character
                if (isSelected && !c.locked) {
                    const pulse = Math.abs(Math.sin(Date.now() / 500));
                    ctx.fillStyle = c.isComplete ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 215, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 10 + pulse * 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // If complete, no idle animation
                const animFrame = c.isComplete ? 0 : frame;
                this.drawCharacter(ctx, charImg, 'standby', animFrame, c.x, c.y, { flip: false });
                
                // Name label above head
                const nameColor = isSelected ? '#ffd700' : (c.locked ? '#444' : '#fff');
                this.drawPixelText(ctx, c.charName, c.x, c.y - 45, { color: nameColor, font: '8px Silkscreen', align: 'center' });
                
                ctx.restore();
            }
        });

        // 3. SELECTION INFO BOX (Bottom Center)
        const selected = this.campaigns[this.selectedIndex];
        if (selected) {
            const boxH = 65;
            const boxW = canvas.width - 60;
            const bx = 45;
            const by = canvas.height - boxH - 20;

            ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
            ctx.fillRect(bx, by, boxW, boxH);
            ctx.strokeStyle = selected.locked ? '#444' : '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

            this.drawPixelText(ctx, selected.name, bx + 5, by + 5, { color: '#ffd700', font: '8px Silkscreen' });
            
            const lines = this.wrapText(ctx, selected.description, boxW - 10);
            let lineY = by + 18;
            lines.forEach(line => {
                this.drawPixelText(ctx, line, bx + 5, lineY, { color: '#aaa', font: '8px Tiny5' });
                lineY += 10;
            });

            if (selected.locked) {
                this.drawPixelText(ctx, "CAMPAIGN LOCKED", bx + boxW / 2, by + boxH - 10, { color: '#8b0000', font: '8px Silkscreen', align: 'center' });
            } else if (this.message) {
                this.drawPixelText(ctx, this.message.text, bx + boxW / 2, by + boxH - 10, { color: this.message.color, font: '8px Silkscreen', align: 'center' });
            } else if (selected.isComplete) {
                this.drawPixelText(ctx, "STORY COMPLETE", bx + boxW / 2, by + boxH - 10, { color: '#ff4444', font: '8px Silkscreen', align: 'center' });
            } else {
                const pulse = Math.abs(Math.sin(Date.now() / 500));
                ctx.globalAlpha = pulse;
                this.drawPixelText(ctx, "CLICK CHARACTER TO BEGIN", bx + boxW / 2, by + boxH - 10, { color: '#eee', font: '8px Tiny5', align: 'center' });
                ctx.globalAlpha = 1.0;
            }
        }

        // Header Title
        this.drawPixelText(ctx, "STORY SELECTION", canvas.width / 2, 10, { color: '#fff', font: '8px Silkscreen', align: 'center' });
        
        // Back Button
        const backRect = { x: canvas.width - 55, y: 5, w: 50, h: 14 };
        ctx.fillStyle = 'rgba(60, 0, 0, 0.8)';
        ctx.fillRect(backRect.x, backRect.y, backRect.w, backRect.h);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(backRect.x + 0.5, backRect.y + 0.5, backRect.w - 1, backRect.h - 1);
        
        this.drawPixelText(ctx, "RETURN", backRect.x + backRect.w / 2, backRect.y + 3, { color: '#eee', font: '8px Silkscreen', align: 'center' });
        this.backRect = backRect;

        // Visual helper for ESC
        this.drawPixelText(ctx, "[ESC]", backRect.x - 2, backRect.y + 3, { color: '#444', font: '8px Tiny5', align: 'right' });
    }

    addMessage(text, color = '#eee') {
        this.message = { text, color };
        this.messageTimer = 2000;
        assets.playSound('ui_click');
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);

        // 0. Back button check
        if (this.backRect && x >= this.backRect.x && x <= this.backRect.x + this.backRect.w &&
            y >= this.backRect.y && y <= this.backRect.y + this.backRect.h) {
            this.manager.switchTo('title');
            return;
        }

        // 1. Timeline selection
        const timelineX = 10;
        let timelineY = 40;
        const timelineSpacing = 25;
        this.chapters.forEach((ch, i) => {
            const ty = timelineY + i * timelineSpacing;
            if (x >= timelineX && x <= timelineX + 80 && y >= ty && y <= ty + 20) {
                if (ch.available) {
                    this.selectedChapterIndex = i;
                    if (ch.id === '2') {
                        // Special "Coming soon" message for Chapter 2
                        this.addMessage("Chapter 2: Coming soon!", '#ffd700');
                    }
                }
            }
        });

        // 2. Character Selection on Map
        let hitChar = false;
        this.campaigns.forEach((c, i) => {
            const frame = Math.floor(Date.now() / 150) % 4;
            const charImg = assets.getImage(c.imgKey);
            if (this.checkCharacterHit(charImg, 'standby', frame, c.x, c.y, x, y)) {
                hitChar = true;
                if (this.selectedIndex === i && !c.locked) {
                    if (c.isComplete) {
                        this.addMessage("This story is complete.", '#ff4444');
                    } else {
                        this.manager.switchTo('map', { campaignId: c.id });
                    }
                } else {
                    this.selectedIndex = i;
                }
            }
        });
        
        // Return to title on ESC (managed in main.js, but good to have a click fallback if needed)
        // For now, only mouse hits are processed here.
    }
}


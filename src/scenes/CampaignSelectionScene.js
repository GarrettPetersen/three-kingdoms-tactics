import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class CampaignSelectionScene extends BaseScene {
    constructor() {
        super();
        this.years = [
            { year: '184 AD', id: '184', available: true },
            { year: '189 AD', id: '189', available: false },
            { year: '190 AD', id: '190', available: false },
            { year: '194 AD', id: '194', available: false },
            { year: '200 AD', id: '200', available: false },
            { year: '208 AD', id: '208', available: false }
        ];
        this.selectedYearIndex = 0;
        
        // Campaigns available in the selected year (184 AD)
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
        assets.playMusic('title_loop');
        
        // Update availability based on GameState
        const gs = this.manager.gameState;
        const unlockedYears = gs.get('unlockedYears') || ['184'];

        this.years.forEach(y => {
            y.available = unlockedYears.includes(y.id);
        });

        // Example logic: if daxing is completed, maybe unlock 189 AD?
        if (gs.hasMilestone('daxing')) {
            if (!unlockedYears.includes('189')) {
                unlockedYears.push('189');
                gs.set('unlockedYears', unlockedYears);
                this.years.find(y => y.id === '189').available = true;
            }
        }

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
        ctx.lineTo(timelineX + 15, timelineY + (this.years.length - 1) * timelineSpacing + 10);
        ctx.stroke();

        this.years.forEach((y, i) => {
            const isSelected = this.selectedYearIndex === i;
            const ty = timelineY + i * timelineSpacing;
            
            // Node circle
            ctx.fillStyle = isSelected ? '#ffd700' : (y.available ? '#888' : '#333');
            ctx.beginPath();
            ctx.arc(timelineX + 15, ty + 4, 3, 0, Math.PI * 2);
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            const color = isSelected ? '#ffd700' : (y.available ? '#aaa' : '#444');
            this.drawPixelText(ctx, y.year, timelineX + 22, ty, { color, font: '8px Silkscreen' });
        });

        // 2. CHARACTER ICONS ON MAP
        const frame = Math.floor(Date.now() / 150) % 4;
        this.campaigns.forEach((c, i) => {
            const isSelected = this.selectedIndex === i;
            const charImg = assets.getImage(c.imgKey);
            
            if (charImg) {
                // Dim locked characters
                ctx.globalAlpha = c.locked ? 0.4 : 1.0;
                
                // Draw a pulsing circle under the selected character
                if (isSelected && !c.locked) {
                    const pulse = Math.abs(Math.sin(Date.now() / 500));
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 10 + pulse * 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                this.drawCharacter(ctx, charImg, 'standby', frame, c.x, c.y, { flip: false });
                
                // Name label above head
                const nameColor = isSelected ? '#ffd700' : (c.locked ? '#444' : '#fff');
                this.drawPixelText(ctx, c.charName, c.x, c.y - 45, { color: nameColor, font: '8px Silkscreen', align: 'center' });
                
                ctx.globalAlpha = 1.0;
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
            } else {
                const pulse = Math.abs(Math.sin(Date.now() / 500));
                ctx.globalAlpha = pulse;
                this.drawPixelText(ctx, "CLICK CHARACTER TO BEGIN", bx + boxW / 2, by + boxH - 10, { color: '#eee', font: '8px Tiny5', align: 'center' });
                ctx.globalAlpha = 1.0;
            }
        }

        // Header Title
        this.drawPixelText(ctx, "ERA SELECTION", canvas.width / 2, 10, { color: '#fff', font: '8px Silkscreen', align: 'center' });
        
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
        this.years.forEach((year, i) => {
            const ty = timelineY + i * timelineSpacing;
            if (x >= timelineX && x <= timelineX + 80 && y >= ty && y <= ty + 20) {
                if (year.available) {
                    this.selectedYearIndex = i;
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
                    this.manager.switchTo('map', { campaignId: c.id });
                } else {
                    this.selectedIndex = i;
                }
            }
        });
        
        // Return to title on ESC (managed in main.js, but good to have a click fallback if needed)
        // For now, only mouse hits are processed here.
    }
}


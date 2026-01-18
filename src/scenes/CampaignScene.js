import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class CampaignScene extends BaseScene {
    constructor() {
        super();
        this.selectedCampaign = null;
        this.campaigns = [
            { 
                id: 'liubei', 
                name: 'The Story of Liu Bei', 
                x: 190, // Zhuo County coordinates relative to map
                y: 70,
                imgKey: 'liubei'
            }
        ];
        this.lastClickTime = 0;
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mapImg = assets.getImage('china_map');
        if (!mapImg) return;

        const mx = Math.floor((canvas.width - mapImg.width) / 2);
        const my = Math.floor((canvas.height - mapImg.height) / 2);
        ctx.drawImage(mapImg, mx, my);

        // Animation frame for idle pose (4 frames, ~150ms per frame)
        const frame = Math.floor(Date.now() / 150) % 4;

        this.campaigns.forEach(c => {
            const charImg = assets.getImage(c.imgKey);
            if (!charImg) return;

            const cx = mx + c.x;
            const cy = my + c.y;
            
            // Draw character idle animation (frames 0-3)
            const sx = frame * 72;
            const sy = 0;
            ctx.drawImage(charImg, sx, sy, 72, 72, Math.floor(cx - 36), Math.floor(cy - 68), 72, 72);

            if (this.selectedCampaign === c.id) {
                // Draw name label with background box
                ctx.save();
                ctx.font = '8px Silkscreen';
                const metrics = ctx.measureText(c.name);
                ctx.restore();

                const boxW = Math.floor(metrics.width + 10);
                const boxH = 24; 
                // Position to the LEFT of character to stay on screen
                const bx = Math.floor(cx - 20 - boxW); 
                const by = Math.floor(cy - 45); 

                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fillRect(bx, by, boxW, boxH);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

                // Line 1: Title (Silkscreen - Heading Style) - MOVED UP
                this.drawPixelText(ctx, c.name.toUpperCase(), bx + 5, by + 3, { color: '#ffd700', font: '8px Silkscreen' });
                
                // Line 2: Click prompt (Tiny5 - General UI Style) - MOVED UP
                const pulse = Math.abs(Math.sin(Date.now() / 500));
                ctx.globalAlpha = pulse;
                this.drawPixelText(ctx, "Click to Start", bx + 5, by + 13, { 
                    color: '#eee', 
                    font: '8px Tiny5' 
                });
                ctx.globalAlpha = 1.0;
            }
        });
    }

    handleInput(e) {
        const rect = this.manager.canvas.getBoundingClientRect();
        const mouseX = Math.floor((e.clientX - rect.left) / this.manager.config.scale);
        const mouseY = Math.floor((e.clientY - rect.top) / this.manager.config.scale);

        const mx = Math.floor((this.manager.canvas.width - 256) / 2);
        const my = Math.floor((this.manager.canvas.height - 256) / 2);

        let hitAny = false;
        this.campaigns.forEach(c => {
            const cx = mx + c.x;
            const cy = my + c.y;
            
            // 1. Check hit area around character (roughly 30x45 box)
            const charHit = (mouseX >= cx - 15 && mouseX <= cx + 15 && mouseY >= cy - 40 && mouseY <= cy + 5);
            
            // 2. Check hit area for the selection box (if this campaign is already selected)
            let boxHit = false;
            if (this.selectedCampaign === c.id) {
                this.manager.ctx.font = '8px Silkscreen';
                const metrics = this.manager.ctx.measureText(c.name);
                const boxW = Math.floor(metrics.width + 10);
                const boxH = 24;
                const bx = Math.floor(cx - 20 - boxW);
                const by = Math.floor(cy - 45);
                boxHit = (mouseX >= bx && mouseX <= bx + boxW && mouseY >= by && mouseY <= by + boxH);
            }

            if (charHit || boxHit) {
                hitAny = true;
                if (this.selectedCampaign === c.id) {
                    this.startCampaign(c.id);
                } else {
                    this.selectedCampaign = c.id;
                }
            }
        });

        if (!hitAny) {
            this.selectedCampaign = null;
        }
    }

    startCampaign(id) {
        if (id === 'liubei') {
            this.manager.switchTo('narrative', {
                script: [
                    { 
                        type: 'title',
                        text: "THE HAN DYNASTY IS CRUMBLING",
                        subtext: "Year 184, Zhuo County"
                    },
                    { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 230, speed: 0.5 },
                    { type: 'command', action: 'addActor', id: 'farmer2', imgKey: 'farmer2', x: 50, y: 215, flip: true, speed: 0.4 },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -50, y: 240, speed: 1 },
                    { bg: 'noticeboard', type: 'command', action: 'move', id: 'liubei', x: 160, y: 240 },
                    { type: 'command', action: 'flip', id: 'liubei', flip: true },
                    { type: 'command', action: 'move', id: 'farmer', x: 220, y: 225 },
                    { type: 'command', action: 'move', id: 'farmer2', x: 20, y: 210 },
                    
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        text: "NOTICE: The Yellow Turban rebels under Zhang Jue have risen!"
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        text: "All able-bodied men are called to defend the Han."
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        text: "Report to the local Magistrate at once."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "*Sighs* The Imperial Clan's blood flows in my veins..."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "...yet I am but a poor straw-shoe seller."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "How can I possibly save the people from this chaos?"
                    },
                    
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 300, y: 240, flip: true, speed: 1.5 },
                    { type: 'command', action: 'move', id: 'zhangfei', x: 190, y: 240 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: '???',
                        text: "Why sigh, O hero, if you do not help your country?"
                    },

                    { type: 'command', action: 'flip', id: 'liubei', flip: false },
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "I am Zhang Fei, aka Yide."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "I live in this county, where I have a farm. I sell wine and slaughter hogs."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "I am of the Imperial Clan. My name is Liu Bei."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "I wish I could destroy these rebels and restore peace..."
                    },
                    {
                        type: 'command',
                        action: 'move', id: 'farmer', x: 250, y: 220 },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "I have some wealth! I am willing to use it to recruit volunteers."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "What say you to that?"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "That would be a great blessing for the people!"
                    }
                ]
            });
        }
    }
}

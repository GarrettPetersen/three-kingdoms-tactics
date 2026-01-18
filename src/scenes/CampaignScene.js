import { BaseScene } from './BaseScene.js';

export class CampaignScene extends BaseScene {
    constructor() {
        super();
        this.campaigns = [
            { id: 'liubei', name: 'The Story of Liu Bei', description: 'Follow the path of benevolence.' }
        ];
        this.hitAreas = [];
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = Math.floor(canvas.width / 2);
        this.drawPixelText(ctx, "CHOOSE YOUR CAMPAIGN", cx, 30, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });

        this.hitAreas = [];
        this.campaigns.forEach((c, i) => {
            const x = Math.floor(canvas.width / 2 - 60);
            const y = Math.floor(80 + i * 30);
            const w = 120;
            const h = 20;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y - 10, w, h);
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y - 9.5, w - 1, h - 1);

            // Center text in button: button y center is 'y', height is 20.
            // With top baseline, to center 8px font in 20px box, offset is (20-8)/2 = 6px from top.
            // Button top is y-10. So y-10+6 = y-4.
            this.drawPixelText(ctx, c.name, Math.floor(x + w / 2), y - 4, { color: '#eee', font: '8px Silkscreen', align: 'center' });

            this.hitAreas.push({ x, y: y - 10, w, h, id: c.id });
        });
    }

    handleInput(e) {
        const rect = this.manager.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.manager.config.scale);
        const y = Math.floor((e.clientY - rect.top) / this.manager.config.scale);

        const hit = this.hitAreas.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
        if (hit && hit.id === 'liubei') {
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
                    { bg: 'noticeboard', type: 'command', action: 'move', id: 'liubei', x: 100, y: 240 },
                    { type: 'command', action: 'flip', id: 'liubei', flip: true }, // Turn back to "read" notice
                    { type: 'command', action: 'move', id: 'farmer', x: 160, y: 225 },
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
                    { type: 'command', action: 'move', id: 'zhangfei', x: 160, y: 240 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: '???',
                        text: "Why sigh, O hero, if you do not help your country?"
                    },

                    { type: 'command', action: 'flip', id: 'liubei', flip: false }, // Liu Bei turns to face Zhang Fei
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true }, // THEN he is startled
                    
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

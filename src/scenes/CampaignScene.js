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
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "Then come! Let us go to the village inn and discuss our plans over wine."
                    },
                    { type: 'command', action: 'flip', id: 'liubei', flip: true },
                    { type: 'command', action: 'move', id: 'liubei', x: -50, y: 240, wait: false },
                    { type: 'command', action: 'move', id: 'zhangfei', x: -50, y: 240 },
                    { type: 'command', action: 'fade', target: 1, speed: 0.002 },
                    
                    // --- SWITCH TO INN ---
                    { bg: 'inn', type: 'command', action: 'clearActors' },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 80, y: 200 },
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 120, y: 200, flip: true },
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'recovery' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'recovery' },
                    { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 180, flip: true },
                    { type: 'command', action: 'animate', id: 'farmer', animation: 'recovery' },
                    
                    { type: 'command', action: 'fade', target: 0, speed: 0.002 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "*Drinking* This wine is good! Together, we shall raise an army that will make the rebels tremble."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "Indeed. Honor and duty call us."
                    },
                    
                    { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 300, y: 210, flip: true, speed: 1 },
                    { type: 'command', action: 'move', id: 'guanyu', x: 180, y: 210 },
                    
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: '???',
                        text: "Quick! Bring me wine! I am in a hurry to get to town and join the volunteers!"
                    },
                    
                    { type: 'command', action: 'flip', id: 'liubei', flip: false },
                    { type: 'command', action: 'flip', id: 'zhangfei', flip: false },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'standby' },

                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "*Looking at the newcomer* That man... his presence is extraordinary. Look at his majestic beard and phoenix-like eyes."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "Hey! You there! You're joining the volunteers too? Come, drink with us!"
                    },
                    { type: 'command', action: 'move', id: 'guanyu', x: 140, y: 195 },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'recovery' },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: 'Guan Yu',
                        text: "I am Guan Yu, courtesy name Yunchang. For years I have been a fugitive, for I slew a local bully who oppressed the weak."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: 'Guan Yu',
                        text: "Now I hear there is a call for volunteers, and I have come to join the cause."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "A noble heart! I am Liu Bei, and this is Zhang Fei. We have just agreed to raise a volunteer army ourselves."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "Haha! The more the merrier! Drink, Yunchang! Let us toast to our new brotherhood!"
                    },
                    
                    // --- TIME SKIP TO EVENING ---
                    { type: 'command', action: 'fade', target: 1, speed: 0.001 },
                    { bg: 'inn_evening', type: 'command', action: 'removeActor', id: 'farmer' },
                    { type: 'command', action: 'addActor', id: 'soldier_npc', imgKey: 'soldier', x: 230, y: 190, flip: true },
                    { type: 'command', action: 'addActor', id: 'butcher_npc', imgKey: 'butcher', x: 30, y: 210 },
                    { type: 'command', action: 'animate', id: 'soldier_npc', animation: 'recovery' },
                    { type: 'command', action: 'animate', id: 'butcher_npc', animation: 'recovery' },
                    { type: 'command', action: 'wait', duration: 1000 },
                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "*Tipsy* ...and that is why the pig escaped! Haha! But seriously, my friends..."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "I feel as though I have known you both for a lifetime."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: 'Guan Yu',
                        text: "The heavens have surely brought us together. We share one mind and one purpose."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "To restore the Han and bring peace to the common people. That is our shared destiny."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "Listen! Behind my farm is a peach garden. The flowers are in full bloom."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "Tomorrow, let us offer sacrifices there and swear to be brothers! To live and die as one!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "An excellent proposal. We shall do it!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: 'Guan Yu',
                        text: "I agree. We swear by the peach garden."
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
                    
                    // --- THE PEACH GARDEN OATH ---
                    { 
                        type: 'title',
                        text: "THE PEACH GARDEN OATH",
                        subtext: "The Next Morning",
                        duration: 3000
                    },
                    { bg: 'peach_garden', type: 'command', action: 'clearActors' },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 128, y: 210 },
                    { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 80, y: 215 },
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 176, y: 215, flip: true },
                    
                    { type: 'command', action: 'animate', id: 'liubei', animation: 'sitting' },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'sitting' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'sitting' },

                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        name: 'Narrator',
                        portraitKey: 'peach_garden',
                        portraitRect: { x: 50, y: 50, w: 100, h: 80 },
                        text: "In the peach garden, among the blooming flowers, a black ox and a white horse are sacrificed."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        name: 'Liu Bei',
                        text: "We three, Liu Bei, Guan Yu, and Zhang Fei, though of different lineages, swear brotherhood and promise mutual help to one end."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        name: 'Guan Yu',
                        text: "We will rescue each other in difficulty; we will aid each other in danger."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        name: 'Zhang Fei',
                        text: "We swear to serve the state and save the people."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        name: 'Liu Bei',
                        text: "We ask not the same day of birth, but we seek to die together on the same day."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        name: 'Liu Bei',
                        text: "May the Heaven and the Earth read our hearts. If we turn aside from righteousness, may the Heaven and the Human smite us!"
                    },

                    { type: 'command', action: 'animate', id: 'liubei', animation: 'standby' },
                    { type: 'command', action: 'animate', id: 'guanyu', animation: 'standby' },
                    { type: 'command', action: 'animate', id: 'zhangfei', animation: 'standby' },

                    {
                        type: 'dialogue',
                        name: 'Narrator',
                        portraitKey: 'peach_garden',
                        portraitRect: { x: 50, y: 50, w: 100, h: 80 },
                        text: "The ritual complete, Liu Bei is acknowledged as the eldest brother, Guan Yu the second, and Zhang Fei the youngest."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        name: 'Liu Bei',
                        text: "The path ahead is long and full of peril, but together, we shall restore the Han!"
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.001 },

                    // --- RECRUITING AT THE NOTICEBOARD ---
                    { bg: 'noticeboard', type: 'command', action: 'clearActors' },
                    { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 100, y: 240 },
                    { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 60, y: 240 },
                    { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 140, y: 240 },
                    { type: 'command', action: 'fade', target: 0, speed: 0.001 },

                    {
                        type: 'dialogue',
                        portraitKey: 'zhangfei',
                        position: 'top',
                        name: 'Zhang Fei',
                        text: "CITIZENS OF ZHUO! The Yellow Turbans are coming! Who among you is brave enough to fight for your homes?"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'guanyu',
                        position: 'top',
                        name: 'Guan Yu',
                        text: "We offer no riches, only the chance to serve with honor under the banner of the Imperial Uncle, Liu Bei."
                    },

                    { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: -50, y: 240, speed: 0.8 },
                    { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 300, y: 230, flip: true, speed: 0.7 },
                    { type: 'command', action: 'move', id: 'volunteer1', x: 50, y: 250, wait: false },
                    { type: 'command', action: 'move', id: 'volunteer2', x: 200, y: 245 },

                    {
                        type: 'dialogue',
                        portraitKey: 'soldier',
                        position: 'top',
                        name: 'Volunteer',
                        text: "We have heard of your brotherhood! We are but simple men, but we will follow you to the death!"
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "Welcome, brothers. Today we are but a few, but tomorrow we shall be an army."
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liubei',
                        position: 'top',
                        name: 'Liu Bei',
                        text: "Let us march! Our first destination: the headquarters of the local Magistrate."
                    },
                    { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
                    { 
                        type: 'title',
                        text: "CHAPTER ONE: THE VOLUNTEER ARMY",
                        subtext: "The Journey Begins",
                        duration: 3000
                    }
                ]
            });
        }
    }
}

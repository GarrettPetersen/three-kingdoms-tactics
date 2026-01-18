import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

const ANIMATIONS = {
    standby:  { start: 0,  length: 4 },
    attack_1: { start: 4,  length: 4 },
    walk:     { start: 8,  length: 4 },
    attack_2: { start: 12, length: 4 },
    defense:  { start: 16, length: 4 },
    hit:      { start: 20, length: 4 },
    victory:  { start: 24, length: 4 },
    death:    { start: 28, length: 4 },
    recovery: { start: 32, length: 4 },
    sitting:  { start: 36, length: 4 }
};

export class NarrativeScene extends BaseScene {
    constructor() {
        super();
        this.script = [];
        this.currentStep = 0;
        this.actors = {}; // { id: { x, y, img, action, frame, flip, targetX, targetY } }
        this.isWaiting = false;
        this.timer = 0;
    }

    enter(params) {
        this.originalScript = params.script || [];
        this.script = this.processDialogueWrapping(this.originalScript);
        this.currentStep = 0;
        this.actors = {};
        this.isWaiting = false;
        this.timer = 0;
        this.processStep();
    }

    processDialogueWrapping(script) {
        const processed = [];
        const margin = 5;
        const portraitSize = 34;
        const panelWidth = this.manager.canvas.width - margin * 2;
        // Reduced maxWidth slightly to ensure padding on both sides
        const maxWidth = panelWidth - portraitSize - 25; 

        script.forEach(step => {
            if (step.type !== 'dialogue') {
                processed.push(step);
                return;
            }

            const ctx = this.manager.ctx;
            ctx.save();
            ctx.font = '8px Dogica';
            const words = step.text.split(' ');
            const lines = [];
            let currentLine = '';

            for (let n = 0; n < words.length; n++) {
                let testLine = currentLine + words[n] + ' ';
                // Ensure we measure against the correct font
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    lines.push(currentLine.trim());
                    currentLine = words[n] + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine.trim());
            ctx.restore();

            // Break into chunks of 2 lines
            for (let i = 0; i < lines.length; i += 2) {
                const chunk = lines.slice(i, i + 2);
                processed.push({
                    ...step,
                    lines: chunk,
                    hasNextChunk: (i + 2 < lines.length)
                });
            }
        });
        return processed;
    }

    processStep() {
        const step = this.script[this.currentStep];
        if (!step) return;

        if (step.type === 'command') {
            this.handleCommand(step);
        }
    }

    handleCommand(cmd) {
        if (cmd.action === 'addActor') {
            this.actors[cmd.id] = {
                x: cmd.x,
                y: cmd.y,
                img: assets.getImage(cmd.imgKey),
                action: 'standby',
                frame: 0,
                flip: cmd.flip || false,
                targetX: cmd.x,
                targetY: cmd.y,
                speed: cmd.speed || 1
            };
            this.nextStep();
        } else if (cmd.action === 'move') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.targetX = cmd.x;
                actor.targetY = cmd.y;
                actor.action = 'walk';
                this.isWaiting = true;
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'animate') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.action = cmd.animation;
                actor.frame = 0;
                if (cmd.wait) this.isWaiting = true;
                else this.nextStep();
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'wait') {
            this.timer = cmd.duration;
            this.isWaiting = true;
        } else if (cmd.action === 'flip') {
            if (this.actors[cmd.id]) this.actors[cmd.id].flip = cmd.flip;
            this.nextStep();
        }
    }

    nextStep() {
        this.currentStep++;
        this.isWaiting = false;
        this.processStep();
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        if (this.timer > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                this.nextStep();
            }
        }

        let allMoved = true;
        for (let id in this.actors) {
            const a = this.actors[id];
            
            // Animation
            const anim = ANIMATIONS[a.action] || ANIMATIONS.standby;
            a.frame += dt * 0.008;
            if (a.frame >= anim.length) {
                if (a.action === 'hit' || a.action === 'attack_1' || a.action === 'attack_2') {
                    a.action = 'standby';
                    if (this.isWaiting) this.nextStep();
                }
                a.frame = 0;
            }

            // Movement
            const dx = a.targetX - a.x;
            const dy = a.targetY - a.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 1) {
                allMoved = false;
                const moveDist = a.speed * (dt / 16);
                a.x += (dx / dist) * moveDist;
                a.y += (dy / dist) * moveDist;
            } else {
                a.x = a.targetX;
                a.y = a.targetY;
                if (a.action === 'walk') a.action = 'standby';
            }
        }

        if (this.isWaiting && allMoved && this.timer === 0) {
            const step = this.script[this.currentStep];
            if (step && step.action === 'move') {
                this.nextStep();
            }
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        const step = this.script[this.currentStep];
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Background
        let bgKey = step?.bg;
        if (!bgKey) {
            for (let i = this.currentStep; i >= 0; i--) {
                if (this.script[i].bg) {
                    bgKey = this.script[i].bg;
                    break;
                }
            }
        }

        let bgX = 0;
        let bgY = 10;
        let bgWidth = 0;
        let bgHeight = 0;
        
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgWidth = bg.width;
                bgHeight = bg.height;
                bgX = Math.floor((canvas.width - bgWidth) / 2);
                ctx.drawImage(bg, bgX, bgY, bgWidth, bgHeight);
            }
        }

        // Actors - Clipped to background area
        ctx.save();
        if (bgKey) {
            // Create a clipping rectangle so actors don't appear on the black letterboxing
            ctx.beginPath();
            ctx.rect(bgX, bgY, bgWidth, bgHeight);
            ctx.clip();
        }

        const sortedActors = Object.values(this.actors).sort((a, b) => a.y - b.y);
        sortedActors.forEach(a => {
            const anim = ANIMATIONS[a.action] || ANIMATIONS.standby;
            const f = Math.floor(a.frame) % anim.length;
            const frameIdx = anim.start + f;
            const sx = (frameIdx % 8) * 72;
            const sy = Math.floor(frameIdx / 8) * 72;

            ctx.save();
            ctx.translate(Math.floor(bgX + a.x), Math.floor(bgY + a.y));
            if (a.flip) ctx.scale(-1, 1);
            ctx.drawImage(a.img, sx, sy, 72, 72, -36, -68, 72, 72);
            ctx.restore();
        });
        ctx.restore(); // End clipping

        if (step && step.type === 'title') {
            this.renderTitleCard(step);
        } else if (step && step.type === 'dialogue') {
            this.renderDialogue(step);
        }
    }

    renderTitleCard(step) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = Math.floor(canvas.width / 2);
        const cy = Math.floor(canvas.height / 2);
        
        this.drawPixelText(ctx, step.text, cx, cy - 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        if (step.subtext) {
            this.drawPixelText(ctx, step.subtext, cx, cy + 6, { color: '#eee', font: '8px Silkscreen', align: 'center' });
        }
    }

    renderDialogue(step) {
        const { ctx, canvas } = this.manager;
        const margin = 5;
        const panelHeight = 44;
        const panelWidth = canvas.width - margin * 2;
        const px = margin;
        
        // Handle position: top or bottom (default)
        const position = step.position || 'bottom';
        const py = position === 'top' ? margin : canvas.height - panelHeight - margin;

        // Panel
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        // Portrait
        const portraitSize = 34;
        const portraitX = px + 5;
        const portraitY = py + 5;
        ctx.fillStyle = '#000';
        ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(portraitX + 0.5, portraitY + 0.5, portraitSize - 1, portraitSize - 1);

        const actorImg = assets.getImage(step.portraitKey);
        if (actorImg) {
            // Default to character face crop (26, 20, 20, 20)
            const crop = step.portraitRect || { x: 26, y: 20, w: 20, h: 20 };
            const destSize = 28;
            const destOffset = (portraitSize - destSize) / 2;
            ctx.drawImage(actorImg, crop.x, crop.y, crop.w, crop.h, portraitX + destOffset, portraitY + destOffset, destSize, destSize);
        }

        // Name (Silkscreen - Heading Style) - MOVED UP
        const textX = portraitX + portraitSize + 8;
        this.drawPixelText(ctx, (step.name || "").toUpperCase(), textX, py + 6, { color: '#ffd700', font: '8px Silkscreen' });

        // Text (Dogica - General Text Style) - MOVED UP
        const displayLines = step.lines || [];
        let lineY = py + 18;
        
        if (displayLines.length > 0) {
            displayLines.forEach((line, i) => {
                let text = line;
                // Add ellipsis if this is the last line of a multi-part dialogue
                if (i === displayLines.length - 1 && step.hasNextChunk) {
                    text += "...";
                }
                this.drawPixelText(ctx, text, textX, lineY, { color: '#eee', font: '8px Dogica' });
                lineY += 10;
            });
        } else {
            // Fallback for non-processed text
            const words = (step.text || "").split(' ');
            let line = '';
            const maxWidth = panelWidth - portraitSize - 20;
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                ctx.font = '8px Dogica';
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    this.drawPixelText(ctx, line, textX, lineY, { color: '#eee', font: '8px Dogica' });
                    line = words[n] + ' ';
                    lineY += 10;
                } else {
                    line = testLine;
                }
            }
            this.drawPixelText(ctx, line, textX, lineY, { color: '#eee', font: '8px Dogica' });
        }

        // Click prompt (Tiny5)
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        this.drawPixelText(ctx, "NEXT", panelWidth - 2, py + panelHeight - 8, { color: '#eee', font: '8px Tiny5', align: 'right' });
        ctx.globalAlpha = 1.0;
    }

    handleInput(e) {
        const step = this.script[this.currentStep];
        if (this.isWaiting) return;
        
        // Advance script on any pointerdown (if not waiting for command)
        if (step && (step.type === 'dialogue' || step.type === 'title')) {
            this.nextStep();
        }
    }
}

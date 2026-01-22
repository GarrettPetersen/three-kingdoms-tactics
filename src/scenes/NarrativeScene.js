import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';

export class NarrativeScene extends BaseScene {
    constructor() {
        super();
        this.script = [];
        this.currentStep = 0;
        this.actors = {}; // { id: { x, y, img, action, frame, flip, targetX, targetY } }
        this.isWaiting = false;
        this.timer = 0;
        this.fadeAlpha = 0;
        this.fadeTarget = 0;
        this.fadeSpeed = 0.002;
    }

    enter(params) {
        if (params.musicKey) {
            assets.playMusic(params.musicKey, params.musicVolume || 0.5);
        } else if (params.keepMusic || assets.currentMusicKey === 'oath') {
            // Do nothing, keep current music if requested or if already playing oath music
        } else {
            assets.playMusic('narrative', 0.5);
        }
        this.script = params.script || [];
        this.onComplete = params.onComplete || null;
        this.currentStep = 0;
        this.subStep = 0; // Track 2-line chunks for long dialogue
        this.actors = {};
        this.isWaiting = false;
        this.timer = 0;
        this.lastTime = 0;
        this.fadeAlpha = params.fadeAlpha !== undefined ? params.fadeAlpha : 1;
        this.fadeTarget = this.fadeAlpha;
        this.fadeSpeed = 0.002;
        this.processStep();
    }

    processStep() {
        const step = this.script[this.currentStep];
        if (!step) return;

        // Trigger voice if present
        if (step.voiceId) {
            assets.playVoice(step.voiceId);
        }

        if (step.type === 'command') {
            this.handleCommand(step);
        } else if ((step.type === 'title' || step.type === 'dialogue') && step.duration) {
            this.timer = step.duration;
            this.isWaiting = true;
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
                if (cmd.wait !== false) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'animate') {
            const actor = this.actors[cmd.id];
            if (actor) {
                actor.action = cmd.animation;
                actor.frame = 0;
                if (cmd.wait) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            } else {
                this.nextStep();
            }
        } else if (cmd.action === 'wait') {
            this.timer = cmd.duration;
            this.isWaiting = true;
        } else if (cmd.action === 'flip') {
            if (this.actors[cmd.id]) this.actors[cmd.id].flip = cmd.flip;
            this.nextStep();
        } else if (cmd.action === 'removeActor') {
            delete this.actors[cmd.id];
            this.nextStep();
        } else if (cmd.action === 'clearActors') {
            this.actors = {};
            this.nextStep();
        } else if (cmd.action === 'fade') {
            this.fadeTarget = cmd.target;
            this.fadeSpeed = cmd.speed || 0.002;
            if (this.fadeAlpha === this.fadeTarget) {
                this.nextStep();
            } else {
                if (cmd.wait !== false) {
                    this.isWaiting = true;
                } else {
                    this.nextStep();
                }
            }
        } else if (cmd.action === 'playMusic') {
            assets.playMusic(cmd.key, cmd.volume || 0.5);
            this.nextStep();
        }
    }

    nextStep() {
        const step = this.script[this.currentStep];
        if (step && step.type === 'dialogue') {
            if (this.hasNextChunk) {
                this.subStep++;
                return;
            }
        }

        this.subStep = 0;
        this.currentStep++;
        this.isWaiting = false;

        if (this.currentStep >= this.script.length) {
            if (this.onComplete) {
                this.onComplete();
                return;
            }
        }
        
        this.processStep();
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        // Mouse tracking for hover effects in choices
        this.lastMouseX = this.manager.logicalMouseX;
        this.lastMouseY = this.manager.logicalMouseY;

        if (this.timer > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                this.nextStep();
            }
        }

        // Fade handling
        if (this.fadeAlpha !== this.fadeTarget) {
            const diff = this.fadeTarget - this.fadeAlpha;
            const step = this.fadeSpeed * dt;
            if (Math.abs(diff) < step) {
                this.fadeAlpha = this.fadeTarget;
                if (this.isWaiting) this.nextStep();
            } else {
                this.fadeAlpha += Math.sign(diff) * step;
            }
        }

        let allMoved = true;
        for (let id in this.actors) {
            const a = this.actors[id];
            
            // Animation
            const anim = ANIMATIONS[a.action] || ANIMATIONS.standby;
            
            if (a.action === 'recovery') {
                // Special logic for drinking: stay on frame 0 (holding bowl) mostly,
                // occasionally play the 4-frame animation once.
                if (!a.isAnimating) {
                    a.frame = 0;
                    // Random chance to start drinking
                    if (Math.random() < 0.005) {
                        a.isAnimating = true;
                    }
                } else {
                    a.frame += dt * 0.006;
                    if (a.frame >= anim.length) {
                        a.frame = 0;
                        a.isAnimating = false;
                    }
                }
            } else {
                a.frame += dt * 0.008;
                if (a.frame >= anim.length) {
                    if (a.action === 'hit' || a.action === 'attack_1' || a.action === 'attack_2') {
                        a.action = 'standby';
                        if (this.isWaiting) this.nextStep();
                    }
                    a.frame = 0;
                }
            }

            // Movement
            const dx = a.targetX - a.x;
            const dy = a.targetY - a.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 1) {
                allMoved = false;
                let moveDist = a.speed * (dt / 16);
                
                // Cap movement to prevent overshooting
                if (moveDist > dist) moveDist = dist;

                // Auto-flip based on movement direction
                // Sprites face RIGHT by default
                if (dx > 0.1) a.flip = false; // Moving Right -> Face Right (default)
                if (dx < -0.1) a.flip = true;  // Moving Left -> Flip to face Left
                
                a.x += (dx / dist) * moveDist;
                a.y += (dy / dist) * moveDist;
            } else {
                a.x = a.targetX;
                a.y = a.targetY;
                if (a.action === 'walk') a.action = 'standby';
            }
        }

        if (this.isWaiting && allMoved && this.timer === 0 && this.fadeAlpha === this.fadeTarget) {
            const step = this.script[this.currentStep];
            if (step && step.type === 'command') {
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
        let bgY = 0;
        let bgWidth = 0;
        let bgHeight = 0;
        
        if (bgKey) {
            const bg = assets.getImage(bgKey);
            if (bg) {
                bgWidth = bg.width;
                bgHeight = bg.height;
                bgX = Math.floor((canvas.width - bgWidth) / 2);
                bgY = Math.floor((canvas.height - bgHeight) / 2);
                ctx.drawImage(bg, bgX, bgY, bgWidth, bgHeight);
            }
        }

        // Actors - Clipped to background area
        ctx.save();
        if (bgKey && bgWidth > 0 && bgHeight > 0) {
            ctx.beginPath();
            ctx.rect(bgX, bgY, bgWidth, bgHeight);
            ctx.clip();
        }

        const sortedActors = Object.values(this.actors).sort((a, b) => a.y - b.y);
        sortedActors.forEach(a => {
            this.drawCharacter(ctx, a.img, a.action, a.frame, bgX + a.x, bgY + a.y, { flip: a.flip });
        });
        ctx.restore();

        // Fade overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (step && step.type === 'title') {
            this.renderTitleCard(step);
        } else if (step && step.type === 'dialogue') {
            const status = this.renderDialogueBox(ctx, canvas, step, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        } else if (step && step.type === 'choice') {
            this.renderChoice(step);
        }
    }

    renderChoice(step) {
        const { ctx, canvas } = this.manager;
        const options = step.options || [];
        const padding = 10;
        const lineSpacing = 10;
        const optionSpacing = 6;
        const panelWidth = 200;
        
        // Pre-calculate wrapped lines and total height
        const wrappedOptions = options.map(opt => {
            const lines = [];
            const words = opt.text.split(' ');
            let currentLine = '';
            
            ctx.save();
            ctx.font = '8px Tiny5';
            for (let n = 0; n < words.length; n++) {
                let testLine = currentLine + words[n] + ' ';
                if (ctx.measureText(testLine).width > (panelWidth - 20) && n > 0) {
                    lines.push(currentLine.trim());
                    currentLine = words[n] + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine.trim());
            ctx.restore();
            return lines;
        });

        let totalContentHeight = 0;
        wrappedOptions.forEach(lines => {
            totalContentHeight += lines.length * lineSpacing + optionSpacing;
        });
        
        const panelHeight = totalContentHeight + padding * 2;
        const px = Math.floor((canvas.width - panelWidth) / 2);
        const py = Math.floor((canvas.height - panelHeight) / 2);

        // Panel Background
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        let currentY = py + padding;
        wrappedOptions.forEach((lines, i) => {
            const optionTopY = currentY;
            const optionHeight = lines.length * lineSpacing;
            
            const isHovered = this.lastMouseX >= px && this.lastMouseX <= px + panelWidth &&
                              this.lastMouseY >= optionTopY && this.lastMouseY <= optionTopY + optionHeight + optionSpacing;

            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                ctx.fillRect(px + 2, optionTopY - 2, panelWidth - 4, optionHeight + 4);
            }

            lines.forEach((line, lineIdx) => {
                this.drawPixelText(ctx, line, px + 10, optionTopY + lineIdx * lineSpacing, { 
                    color: isHovered ? '#fff' : '#ccc', 
                    font: '8px Tiny5' 
                });
            });

            currentY += optionHeight + optionSpacing;
        });

        // Store panel metadata for input handling
        step._panelMetadata = { px, py, panelWidth, panelHeight, wrappedOptions, padding, lineSpacing, optionSpacing };
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

    handleInput(e) {
        const step = this.script[this.currentStep];
        if (this.isWaiting) return;

        const { x, y } = this.getMousePos(e);

        if (step && step.type === 'choice' && step._panelMetadata) {
            const m = step._panelMetadata;
            let currentY = m.py + m.padding;
            
            step.options.forEach((opt, i) => {
                const lines = m.wrappedOptions[i];
                const optionHeight = lines.length * m.lineSpacing;
                
                if (x >= m.px && x <= m.px + m.panelWidth && 
                    y >= currentY - 2 && y <= currentY + optionHeight + 2) {
                    // Create a dialogue step for the choice so it gets voiced and displayed
                    const choiceDialogue = {
                        type: 'dialogue',
                        portraitKey: step.portraitKey || 'liubei',
                        name: step.name || 'Liu Bei',
                        text: opt.text,
                        voiceId: opt.voiceId
                    };

                    const resultSteps = opt.result || [];
                    this.script.splice(this.currentStep + 1, 0, choiceDialogue, ...resultSteps);
                    
                    this.nextStep();
                }
                currentY += optionHeight + m.optionSpacing;
            });
            return;
        }
        
        // Advance script on any pointerdown (if not waiting for command)
        if (step && (step.type === 'dialogue' || step.type === 'title')) {
            this.nextStep();
        }
    }
}

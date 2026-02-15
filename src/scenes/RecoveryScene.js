import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';

const RECOVERY_DIALOGUE = {
    'liubei': {
        text: { en: "My apologies, brothers. I let my guard down, but my spirit remains unbroken.", zh: "抱歉，兄弟们。我一时大意，但我的精神依然不屈。" },
        voiceId: 'recov_lb_01'
    },
    'guanyu': {
        text: { en: "A momentary lapse in focus. I shall return to the field with renewed vigor.", zh: "一时失神。我将以新的活力重返战场。" },
        voiceId: 'recov_gy_01'
    },
    'zhangfei': {
        text: { en: "Bah! Those rascals got a lucky hit in! Next time, they won't be so fortunate!", zh: "呸！那些混蛋只是侥幸得手！下次，他们就没这么幸运了！" },
        voiceId: 'recov_zf_01'
    }
};

export class RecoveryScene extends BaseScene {
    constructor() {
        super();
        this.recoveryInfo = [];
        this.currentIndex = 0;
        this.timer = 0;
        this.lastTime = 0;
    }

    enter(params) {
        this.recoveryInfo = params.recoveryInfo || [];
        this.levelUps = params.levelUps || [];
        this.onComplete = params.onComplete || null;
        this.isEndGame = params.isEndGame || false;
        this.isCustom = params.isCustom || false;
        this.battleId = params.battleId;
        this.currentIndex = 0;
        this.timer = 0;
        this.lastTime = 0;
        
        if (this.recoveryInfo.length > 0) {
            this.playCurrentVoice();
        } else {
            this.finish();
        }
    }

    playCurrentVoice() {
        const current = this.recoveryInfo[this.currentIndex];
        if (current) {
            const dialogue = RECOVERY_DIALOGUE[current.id];
            if (dialogue && dialogue.voiceId) {
                assets.playVoice(dialogue.voiceId);
            }
        }
    }

    update(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.timer += dt;
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        const current = this.recoveryInfo[this.currentIndex];
        
        if (!current) {
            this.finish();
            return;
        }

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subdued background image
        const bg = assets.getImage('army_camp');
        if (bg) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        const cx = canvas.width / 2;
        
        // Title
        this.drawPixelText(ctx, "HERO RECOVERED", cx, 40, { 
            color: '#ff4444', 
            font: '16px Silkscreen', 
            align: 'center',
            outline: true
        });

        // Portrait
        const portraitKey = `portrait_${current.name.replace(/ /g, '-')}`;
        const portraitImg = assets.getImage(portraitKey);
        if (portraitImg) {
            const px = cx - 20;
            const py = 70;
            ctx.fillStyle = '#000';
            ctx.fillRect(px - 1, py - 1, 42, 50);
            ctx.drawImage(portraitImg, px, py, 40, 48);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(px - 0.5, py - 0.5, 41, 49);
        }

        // Name
        this.drawPixelText(ctx, current.name, cx, 125, { 
            color: '#fff', 
            font: '10px Silkscreen', 
            align: 'center' 
        });

        // XP Loss Info
        this.drawPixelText(ctx, `Returned to Level ${current.level}`, cx, 140, { 
            color: '#aaa', 
            font: '8px Tiny5', 
            align: 'center' 
        });
        if (current.xpLost > 0) {
            this.drawPixelText(ctx, `-${current.xpLost} XP lost while wounded`, cx, 150, { 
                color: '#ff4444', 
                font: '8px Tiny5', 
                align: 'center' 
            });
        }

        // Dialogue Box
        const dialogue = RECOVERY_DIALOGUE[current.id] || { text: { en: "I'm back on my feet.", zh: "我重新站起来了。" } };
        const boxW = 200;
        const boxH = 50;
        const bx = cx - boxW / 2;
        const by = 170;

        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#8b0000';
        ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

        const localizedText = getLocalizedText(dialogue.text);
        const lines = this.wrapText(ctx, localizedText, boxW - 20, '8px Dogica');
        lines.forEach((line, i) => {
            this.drawPixelText(ctx, line, bx + 10, by + 10 + i * 14, { 
                color: '#eee', 
                font: '8px Dogica' 
            });
        });

        // Click prompt
        if (this.timer > 1000) {
            const pulse = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = pulse;
            const continueText = getLocalizedText(UI_TEXT['CLICK TO CONTINUE']);
            this.drawPixelText(ctx, continueText, cx, 235, {
                color: '#aaa',
                font: '8px Silkscreen',
                align: 'center'
            });
            ctx.restore();
        }
    }

    handleInput(e) {
        if (this.timer > 1000) {
            this.next();
        }
    }

    next() {
        this.currentIndex++;
        if (this.currentIndex >= this.recoveryInfo.length) {
            this.finish();
        } else {
            this.timer = 0;
            this.playCurrentVoice();
        }
    }

    finish() {
        if (this.levelUps && this.levelUps.length > 0) {
            this.manager.switchTo('levelup', { 
                levelUps: this.levelUps,
                isEndGame: this.isEndGame,
                isCustom: this.isCustom,
                battleId: this.battleId,
                onComplete: this.onComplete
            });
        } else if (this.onComplete) {
            this.onComplete();
        } else if (this.isEndGame) {
            this.manager.switchTo('credits');
        } else if (this.battleId === 'qingzhou_siege') {
            this.manager.switchTo('tactics', { battleId: 'qingzhou_cleanup' });
        } else if (this.isCustom) {
            this.manager.switchTo('title');
        } else if (this.battleId === 'daxing' && this.manager.gameState.get('battleState')?.won !== false) {
            // Note: BattleSummary handles the Daxing messenger narrative, but if we came straight here...
            // Actually, BattleSummary should be the one deciding where to go after this.
            // We just need to go to map or narrative as a fallback.
            this.manager.switchTo('map', { afterEvent: this.battleId });
        } else {
            this.manager.switchTo('map', { afterEvent: this.battleId });
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.handleInput(e);
        }
    }
}


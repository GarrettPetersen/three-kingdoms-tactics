import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { UPGRADE_PATHS, ATTACKS } from '../core/Constants.js';
import { getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';
import { getMaxHpForLevel as getUnitMaxHpForLevel } from '../data/UnitRules.js';

export class LevelUpScene extends BaseScene {
    constructor() {
        super();
        this.levelUps = [];
        this.currentIndex = 0;
        this.timer = 0;
        this.showBonuses = false;
        this.isPromoting = false;
        this.promotionChoice = null;
        this.chosenClass = null;
    }

    enter(params) {
        this.levelUps = params.levelUps || [];
        this.onComplete = params.onComplete || null;
        this.isEndGame = params.isEndGame || false;
        this.isCustom = params.isCustom || false;
        this.battleId = params.battleId || null;
        this.currentIndex = 0;
        this.timer = 0;
        this.lastTime = 0;
        this.showBonuses = false;
        this.isPromoting = false;
        this.promotionChoice = null;
        this.chosenClass = null;
        
        if (this.levelUps.length > 0) {
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    checkPromotion() {
        const current = this.levelUps[this.currentIndex];
        if (current && current.id.startsWith('ally') && current.newLevel >= 2) {
            const gs = this.manager.gameState;
            const classes = gs.getCampaignVar('unitClasses') || {};
            // Normal flow: prompt on level 2.
            // Recovery flow: if class is still missing at higher levels, prompt again.
            if (current.newLevel === 2) {
                if (!classes[current.id] || classes[current.id] === 'soldier') {
                    this.isPromoting = true;
                }
            } else if (!classes[current.id]) {
                this.isPromoting = true;
            }
        }
    }

    update(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.timer += dt;
        if (this.timer > 1000 && !this.showBonuses) {
            this.showBonuses = true;
            assets.playSound('step_generic', 0.3);
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        const current = this.levelUps[this.currentIndex];
        
        if (!current) {
            this.next();
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
        
        // Character Image
        const img = assets.getImage(current.imgKey);
        if (img) {
            // Victory animation: prepared -> jump -> land -> pose
            // Let's make it 1 jump per 1.5 seconds
            const frame = (this.timer * 0.002);
            this.drawCharacter(ctx, img, 'victory', frame, cx, 120);
        }

        // Text
        const pulse = Math.abs(Math.sin(Date.now() / 300));
        this.drawPixelText(ctx, getLocalizedText({ en: "LEVEL UP!", zh: "升级！" }), cx, 40, { 
            color: `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`, 
            font: '16px Silkscreen', 
            align: 'center',
            outline: true
        });

        this.drawPixelText(ctx, `${current.name}`, cx, 150, { 
            color: '#fff', 
            font: '10px Silkscreen', 
            align: 'center' 
        });

        this.drawPixelText(ctx, getLocalizedText({
            en: `LEVEL ${current.oldLevel} -> ${current.newLevel}`,
            zh: `等级 ${current.oldLevel} -> ${current.newLevel}`
        }), cx, 165, {
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });

        if (this.showBonuses) {
            let by = 185;
            
            // 1. Stat Bonuses
            const bonuses = [
                getLocalizedText({ en: "Increased Critical Chance", zh: "暴击率提升" }),
                getLocalizedText({ en: "Increased Damage Resistance", zh: "减伤能力提升" })
            ];
            
            // Asymptotic HP Bonus check (check if max hp actually increased)
            const oldMaxHp = this.getMaxHpForLevel(current.oldLevel);
            const newMaxHp = this.getMaxHpForLevel(current.newLevel);
            if (newMaxHp > oldMaxHp) {
                bonuses.push(getLocalizedText({
                    en: `Max HP +${newMaxHp - oldMaxHp}`,
                    zh: `最大生命 +${newMaxHp - oldMaxHp}`
                }));
            }

            // 2. Weapon Upgrades
            const gs = this.manager.gameState;
            const unitClasses = gs.getCampaignVar('unitClasses') || {};
            const unitClass = this.chosenClass || unitClasses[current.id] || (current.id.startsWith('ally') ? 'soldier' : current.id);
            const path = UPGRADE_PATHS[unitClass];
            if (path && path[current.newLevel]) {
                const upgrade = path[current.newLevel];
                const upgradedAttackKey = upgrade.attack || upgrade.secondaryAttack;
                const attackName = getLocalizedText(ATTACKS[upgradedAttackKey]?.name || { en: "New Technique", zh: "新招式" });
                const upgradeText = getLocalizedText(upgrade.text || '');
                bonuses.push(getLocalizedText({
                    en: `Learned ${attackName}: ${upgradeText}`,
                    zh: `习得 ${attackName}：${upgradeText}`
                }));
            }

            // 3. Class specific bonuses added AFTER selection
            if (this.chosenClass === 'soldier') {
                bonuses.push(getLocalizedText({ en: "+ Melee Attack", zh: "+ 近战攻击" }));
                bonuses.push(getLocalizedText({ en: "+ 1 HP", zh: "+ 1 生命" }));
            } else if (this.chosenClass === 'archer') {
                bonuses.push(getLocalizedText({ en: "+ Ranged Attack", zh: "+ 远程攻击" }));
                bonuses.push(getLocalizedText({ en: "+ Range 2", zh: "+ 射程 2" }));
            }

            bonuses.forEach(b => {
                const lines = this.wrapText(ctx, `+ ${b}`, 200, '8px Tiny5');
                lines.forEach(line => {
                    this.drawPixelText(ctx, line, cx, by, { 
                        color: '#4f4', 
                        font: '8px Tiny5', 
                        align: 'center' 
                    });
                    by += 10;
                });
            });

            // 3. Promotion UI
            if (this.isPromoting) {
                this.renderPromotionUI(ctx, canvas, cx, by + 5);
            }
        }

        // Prompt
        if (this.timer > 2000 && !this.isPromoting) {
            const pulse2 = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = 0.5 + pulse2 * 0.5;
            const continueText = getLocalizedText(UI_TEXT['CLICK TO CONTINUE']);
            this.drawPixelText(ctx, continueText, cx, 235, {
                color: '#aaa',
                font: '8px Silkscreen',
                align: 'center'
            });
            ctx.restore();
        }
    }

    getMaxHpForLevel(level, baseHp = 4) {
        return getUnitMaxHpForLevel(level, baseHp);
    }

    renderPromotionUI(ctx, canvas, cx, y) {
        this.drawPixelText(ctx, getLocalizedText({ en: "CHOOSE PROMOTION:", zh: "选择晋升：" }), cx, y, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        const bw = 80;
        const bh = 40; // Taller to fit bonuses
        
        // Soldier Button
        const sx = cx - bw - 10;
        const sy = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'soldier' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(sx, sy, bw, bh);
        ctx.strokeRect(sx + 1, sy + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, getLocalizedText({ en: "SOLDIER", zh: "步兵" }), sx + bw/2, sy + bh/2 - 4, { color: '#fff', font: '8px Tiny5', align: 'center' });
        this.soldierRect = { x: sx, y: sy, w: bw, h: bh };

        // Archer Button
        const ax = cx + 10;
        const ay = y + 15;
        ctx.fillStyle = '#222';
        ctx.strokeStyle = this.promotionChoice === 'archer' ? '#ffd700' : '#888';
        ctx.lineWidth = 2;
        ctx.fillRect(ax, ay, bw, bh);
        ctx.strokeRect(ax + 1, ay + 1, bw - 2, bh - 2);
        this.drawPixelText(ctx, getLocalizedText({ en: "ARCHER", zh: "弓兵" }), ax + bw/2, ay + bh/2 - 4, { color: '#fff', font: '8px Tiny5', align: 'center' });
        this.archerRect = { x: ax, y: ay, w: bw, h: bh };
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);

        if (this.isPromoting) {
            if (this.soldierRect && x >= this.soldierRect.x && x <= this.soldierRect.x + this.soldierRect.w &&
                y >= this.soldierRect.y && y <= this.soldierRect.y + this.soldierRect.h) {
                this.selectPromotion('soldier');
                return;
            }
            if (this.archerRect && x >= this.archerRect.x && x <= this.archerRect.x + this.archerRect.w &&
                y >= this.archerRect.y && y <= this.archerRect.y + this.archerRect.h) {
                this.selectPromotion('archer');
                return;
            }
            return;
        }

        if (this.timer > 1500) {
            this.next();
        } else {
            // Speed up
            this.timer = 1001;
            this.showBonuses = true;
        }
    }

    selectPromotion(choice) {
        const current = this.levelUps[this.currentIndex];
        const gs = this.manager.gameState;
        const classes = gs.getCampaignVar('unitClasses') || {};
        classes[current.id] = choice;
        gs.setCampaignVar('unitClasses', classes);
        
        assets.playSound('ui_click');
        this.isPromoting = false;
        this.chosenClass = choice;
        
        // Update current display info
        if (choice === 'archer') {
            current.imgKey = 'archer';
        }
    }

    next() {
        const current = this.levelUps[this.currentIndex];
        if (current) {
            const gs = this.manager.gameState;
            const seen = gs.getCampaignVar('unitLevelsSeen') || {};
            const prevSeen = (typeof seen[current.id] === 'number') ? seen[current.id] : 1;
            seen[current.id] = Math.max(prevSeen, current.newLevel || prevSeen);
            gs.setCampaignVar('unitLevelsSeen', seen);
        }

        this.currentIndex++;
        if (this.currentIndex >= this.levelUps.length) {
            if (this.onComplete) {
                this.onComplete();
                return;
            }
            if (this.isEndGame) {
                this.manager.switchTo('credits');
            } else if (this.battleId === 'qingzhou_siege') {
                this.manager.switchTo('tactics', { battleId: 'qingzhou_cleanup' });
            } else if (this.isCustom) {
                this.manager.switchTo('title');
            } else if (this.manager.gameState.getCurrentBattleId() === 'daxing') {
                this.manager.switchTo('narrative', {
                    scriptId: 'daxing_messenger',
                    onComplete: () => {
                        this.manager.switchTo('map', { afterEvent: 'daxing' });
                    }
                });
            } else {
                this.manager.switchTo('map', { afterEvent: this.manager.gameState.getCurrentBattleId() });
            }
        } else {
            this.timer = 0;
            this.showBonuses = false;
            this.isPromoting = false;
            this.promotionChoice = null;
            this.chosenClass = null;
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.handleInput(e);
        }
    }
}


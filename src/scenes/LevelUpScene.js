import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { UPGRADE_PATHS, ATTACKS } from '../core/Constants.js';
import { getLocalizedText } from '../core/Language.js';
import { UI_TEXT, getLocalizedCharacterName } from '../data/Translations.js';
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
        this.promotionType = null; // 'soldier_ranged' (level 2) | 'archer_crossbow' (level 3)
    }

    enter(params) {
        const gs = this.manager.gameState;
        const isResume = !!params.isResume;
        const savedState = isResume ? gs.getSceneState('levelup') : null;

        if (savedState && Array.isArray(savedState.levelUps) && savedState.levelUps.length > 0) {
            this.levelUps = savedState.levelUps.map(lu => ({ ...lu }));
            this.onComplete = null; // Functions are not serializable across sessions.
            this.isEndGame = !!savedState.isEndGame;
            this.isCustom = !!savedState.isCustom;
            this.battleId = savedState.battleId || null;
            this.currentIndex = Math.max(0, Math.min(savedState.currentIndex || 0, this.levelUps.length - 1));
            this.timer = Math.max(0, savedState.timer || 0);
            this.lastTime = 0;
            this.showBonuses = !!savedState.showBonuses;
            this.isPromoting = !!savedState.isPromoting;
            this.promotionChoice = savedState.promotionChoice || null;
            this.chosenClass = savedState.chosenClass || null;
            this.promotionType = savedState.promotionType || null;
            return;
        }

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
        this.promotionType = null;

        if (this.levelUps.length > 0) {
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    saveState() {
        if (!this.levelUps || this.levelUps.length === 0) return;
        const gs = this.manager.gameState;
        gs.setSceneState('levelup', {
            levelUps: this.levelUps.map(lu => ({ ...lu })),
            currentIndex: this.currentIndex,
            timer: this.timer,
            showBonuses: this.showBonuses,
            isPromoting: this.isPromoting,
            promotionChoice: this.promotionChoice,
            chosenClass: this.chosenClass,
            promotionType: this.promotionType,
            isEndGame: this.isEndGame,
            isCustom: this.isCustom,
            battleId: this.battleId
        });
    }

    checkPromotion() {
        const current = this.levelUps[this.currentIndex];
        if (current && current.id.startsWith('ally') && current.newLevel >= 2) {
            const gs = this.manager.gameState;
            const classes = gs.getCampaignVar('unitClasses') || {};
            const currentClass = classes[current.id];
            // Level 2: soldier -> choose Soldier or Archer
            if (current.newLevel === 2 && (!currentClass || currentClass === 'soldier')) {
                this.isPromoting = true;
                this.promotionType = 'soldier_ranged';
                this.promotionChoice = 'soldier'; // default for keyboard/controller
            } else if (current.newLevel === 3 && currentClass === 'archer') {
                // Level 3: archer -> choose Archer or Crossbowman
                this.isPromoting = true;
                this.promotionType = 'archer_crossbow';
                this.promotionChoice = 'archer'; // default for keyboard/controller
            } else if (current.newLevel > 2 && !currentClass) {
                this.isPromoting = true;
                this.promotionType = 'soldier_ranged';
                this.promotionChoice = 'soldier';
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
        
        // LEVEL UP title only above the character
        const pulse = Math.abs(Math.sin(Date.now() / 300));
        this.drawPixelText(ctx, getLocalizedText({ en: "LEVEL UP!", zh: "升级！" }), cx, 32, { 
            color: `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`, 
            font: '16px Silkscreen', 
            align: 'center',
            outline: true
        });

        // Draw order: title -> character -> name+level -> bonuses. Name/level must stay below
        // the sprite (use spriteBottom) so they never overlap the character.
        const characterY = 99;
        const spriteBottom = characterY + 28;  // BaseScene draws sprite y-44..y+28
        const img = assets.getImage(current.imgKey);
        if (img) {
            const frame = (this.timer * 0.002);
            this.drawCharacter(ctx, img, 'victory', frame, cx, characterY);
        }

        // Name and level: just below sprite (minimal padding under sprite); name localized
        const nameY = spriteBottom + 6;
        const levelY = nameY + 14;
        const displayName = getLocalizedCharacterName(current.name) || current.name;
        this.drawPixelText(ctx, displayName, cx, nameY, { 
            color: '#fff', 
            font: '16px Silkscreen', 
            align: 'center' 
        });

        this.drawPixelText(ctx, getLocalizedText({
            en: `LEVEL ${current.oldLevel} -> ${current.newLevel}`,
            zh: `等级 ${current.oldLevel} -> ${current.newLevel}`
        }), cx, levelY, {
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });

        const nameLevelBlockBottom = levelY + 14;
        if (this.showBonuses) {
            let by = nameLevelBlockBottom + 10;
            const promotionY = nameLevelBlockBottom + 20;
            const reserveForPromotion = this.isPromoting && !this.chosenClass;
            
            // 1) Always-known stat bonuses first.
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

            // 2) Show promotion choice before class-dependent upgrades.
            if (reserveForPromotion) {
                this.renderPromotionUI(ctx, canvas, cx, promotionY);
            } else {
                // 3) Only show class/weapon upgrades once class is known.
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

                if (this.chosenClass === 'soldier') {
                    bonuses.push(getLocalizedText({ en: "+ Melee Attack", zh: "+ 近战攻击" }));
                    bonuses.push(getLocalizedText({ en: "+ 1 HP", zh: "+ 1 生命" }));
                } else if (this.chosenClass === 'archer') {
                    bonuses.push(getLocalizedText({ en: "+ Ranged Attack", zh: "+ 远程攻击" }));
                    bonuses.push(getLocalizedText({ en: "+ Range 2", zh: "+ 射程 2" }));
                } else if (this.chosenClass === 'crossbowman') {
                    bonuses.push(getLocalizedText({ en: "+ Crossbow Bolt", zh: "+ 弩矢攻击" }));
                    bonuses.push(getLocalizedText({ en: "+ Push on hit", zh: "+ 命中可击退" }));
                }
            }

            bonuses.forEach(b => {
                const lines = this.wrapText(ctx, `+ ${b}`, 200, '10px Tiny5');
                lines.forEach(line => {
                    const maxY = reserveForPromotion ? (promotionY - 8) : 222;
                    if (by > maxY) return;
                    this.drawPixelText(ctx, line, cx, by, { 
                        color: '#4f4', 
                        font: '10px Tiny5', 
                        align: 'center' 
                    });
                    by += 14;
                });
            });
        }

        // Prompt
        if (this.timer > 2000 && !this.isPromoting) {
            const pulse2 = Math.abs(Math.sin(Date.now() / 500));
            ctx.save();
            ctx.globalAlpha = 0.5 + pulse2 * 0.5;
            const continueText = getLocalizedText(UI_TEXT['CLICK TO CONTINUE']);
            this.drawPixelText(ctx, continueText, cx, 232, {
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
        
        const bw = 60;
        const bh = 30;
        const gap = 14;
        const isArcherCrossbow = this.promotionType === 'archer_crossbow';

        this.soldierRect = null;
        this.archerRect = null;
        this.crossbowRect = null;

        if (isArcherCrossbow) {
            // Level 3 archer: Archer | Crossbowman
            const ax = cx - bw - gap / 2;
            const ay = y + 11;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = this.promotionChoice === 'archer' ? '#ffd700' : '#888';
            ctx.lineWidth = 2;
            ctx.fillRect(ax, ay, bw, bh);
            ctx.strokeRect(ax + 1, ay + 1, bw - 2, bh - 2);
            this.drawPixelText(ctx, getLocalizedText({ en: "ARCHER", zh: "弓兵" }), ax + bw/2, ay + bh/2 - 3, { color: '#fff', font: '10px Tiny5', align: 'center' });
            this.archerRect = { x: ax, y: ay, w: bw, h: bh };

            const cxb = cx + gap / 2;
            const cyb = y + 11;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = this.promotionChoice === 'crossbowman' ? '#ffd700' : '#888';
            ctx.lineWidth = 2;
            ctx.fillRect(cxb, cyb, bw, bh);
            ctx.strokeRect(cxb + 1, cyb + 1, bw - 2, bh - 2);
            this.drawPixelText(ctx, getLocalizedText({ en: "XBOW", zh: "弩兵" }), cxb + bw/2, cyb + bh/2 - 3, { color: '#fff', font: '10px Tiny5', align: 'center' });
            this.crossbowRect = { x: cxb, y: cyb, w: bw, h: bh };
        } else {
            // Level 2 soldier: Soldier | Archer
            const sx = cx - bw - gap / 2;
            const sy = y + 11;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = this.promotionChoice === 'soldier' ? '#ffd700' : '#888';
            ctx.lineWidth = 2;
            ctx.fillRect(sx, sy, bw, bh);
            ctx.strokeRect(sx + 1, sy + 1, bw - 2, bh - 2);
            this.drawPixelText(ctx, getLocalizedText({ en: "SOLDIER", zh: "步兵" }), sx + bw/2, sy + bh/2 - 3, { color: '#fff', font: '10px Tiny5', align: 'center' });
            this.soldierRect = { x: sx, y: sy, w: bw, h: bh };

            const ax = cx + gap / 2;
            const ay = y + 11;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = this.promotionChoice === 'archer' ? '#ffd700' : '#888';
            ctx.lineWidth = 2;
            ctx.fillRect(ax, ay, bw, bh);
            ctx.strokeRect(ax + 1, ay + 1, bw - 2, bh - 2);
            this.drawPixelText(ctx, getLocalizedText({ en: "ARCHER", zh: "弓兵" }), ax + bw/2, ay + bh/2 - 3, { color: '#fff', font: '10px Tiny5', align: 'center' });
            this.archerRect = { x: ax, y: ay, w: bw, h: bh };
        }
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
            if (this.crossbowRect && x >= this.crossbowRect.x && x <= this.crossbowRect.x + this.crossbowRect.w &&
                y >= this.crossbowRect.y && y <= this.crossbowRect.y + this.crossbowRect.h) {
                this.selectPromotion('crossbowman');
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
        } else if (choice === 'crossbowman') {
            current.imgKey = 'crossbowman';
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
            this.manager.gameState.clearSceneState('levelup');
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
            this.promotionType = null;
            assets.playSound('victory', 0.5);
            this.checkPromotion();
        }
    }

    handleKeyDown(e) {
        if (this.isPromoting && !this.chosenClass) {
            // Keyboard/controller: select promotion option
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (this.promotionType === 'soldier_ranged') {
                    this.promotionChoice = e.key === 'ArrowLeft' ? 'soldier' : 'archer';
                } else {
                    this.promotionChoice = e.key === 'ArrowLeft' ? 'archer' : 'crossbowman';
                }
                assets.playSound('ui_click', 0.5);
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                if (this.promotionChoice) {
                    this.selectPromotion(this.promotionChoice);
                }
                return;
            }
            return;
        }
        // Not promoting: advance or speed up
        if (e.key === 'Enter' || e.key === ' ') {
            if (this.timer > 1500) {
                this.next();
            } else {
                this.timer = 1001;
                this.showBonuses = true;
            }
        }
    }
}


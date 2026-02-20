import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { getLocalizedText, LANGUAGE } from '../core/Language.js';
import { UI_TEXT, getLocalizedCharacterName } from '../data/Translations.js';

export class CampaignSelectionScene extends BaseScene {
    constructor() {
        super();
        this.chapters = [
            { id: '1', titleKey: 'Chapter 1', available: true },
            { id: '2', titleKey: 'Chapter 2', available: false }, 
            { id: '3', titleKey: 'Chapter 3', available: false },
            { id: '4', titleKey: 'Chapter 4', available: false },
            { id: '5', titleKey: 'Chapter 5', available: false }
        ];
        this.selectedChapterIndex = 0;
        this.message = null;
        this.messageTimer = 0;
        this.lastTime = 0;
        this.fadeAlpha = 1;
        
        // Campaigns available in the selected chapter
        this.campaigns = [
            { 
                id: 'liubei', 
                nameKey: 'THE OATH IN THE PEACH GARDEN',
                nameCompleteKey: 'THE OATH - STORY COMPLETE',
                charName: 'LIU BEI',
                imgKey: 'liubei',
                descriptionKey: 'campaign_liubei_description',
                description: 'In the waning days of the Han, three heroes meet to swear an oath that will change history.',
                x: 190,
                y: 70,
                locked: false
            }
        ];
        this.selectedIndex = 0;
    }

    enter() {
        if (assets.currentMusicKey !== 'title') {
            assets.playMusic('title');
        }
        
        this.fadeAlpha = 1;
        const gs = this.manager.gameState;
        const isComplete = gs.hasMilestone('chapter1_complete');
        const freedLuZhi = gs.hasMilestone('freed_luzhi');

        // Chapter 2 is available only if Chapter 1 is complete
        this.chapters.find(ch => ch.id === '2').available = isComplete;

        // Update Liu Bei campaign info if complete
        const liubei = this.campaigns.find(c => c.id === 'liubei');
        if (liubei) {
            // Check progress
            liubei.isInProgress = (gs.get('currentCampaign') === 'liubei') || gs.hasMilestone('prologue_complete');
            
            if (isComplete) {
                liubei.isComplete = true;
                liubei.description = getLocalizedText(UI_TEXT['campaign_liubei_complete_base']);
                
                if (freedLuZhi) {
                    liubei.description += getLocalizedText(UI_TEXT['campaign_liubei_complete_freed']);
                } else {
                    liubei.description += getLocalizedText(UI_TEXT['campaign_liubei_complete_law']);
                }

                // Ensure lastScene is set to campaign_selection once complete
                gs.set('lastScene', 'campaign_selection');
            } else {
                // Reset to default state when not complete
                liubei.isComplete = false;
                liubei.description = getLocalizedText(UI_TEXT['campaign_liubei_description']);
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

        if (this.fadeAlpha > 0) {
            this.fadeAlpha -= dt * 0.001;
            if (this.fadeAlpha < 0) this.fadeAlpha = 0;
        }

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
            
            // Check if this chapter has an active message
            const hasMessage = this.message && this.message.chapterIndex === i;
            const displayText = hasMessage ? this.message.text : getLocalizedText(UI_TEXT[ch.titleKey]);
            const displayColor = hasMessage ? this.message.color : (isSelected ? '#ffd700' : (ch.available ? '#aaa' : '#444'));
            
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

            this.drawPixelText(ctx, displayText, timelineX + 22, ty, { color: displayColor, font: '8px Silkscreen' });
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

                // Red "COMPLETE" text over character if complete
                if (c.isComplete) {
                    this.drawPixelText(ctx, "COMPLETE", c.x, c.y - 15, { 
                        color: '#f00', 
                        font: '8px Silkscreen', 
                        align: 'center',
                        outline: true
                    });
                } else if (c.isInProgress) {
                    // Yellow "IN PROGRESS" text over character if in progress
                    this.drawPixelText(ctx, "IN PROGRESS", c.x, c.y - 15, { 
                        color: '#ffd700', 
                        font: '8px Silkscreen', 
                        align: 'center',
                        outline: true
                    });
                }
                
                // Name label above head
                const nameColor = isSelected ? '#ffd700' : (c.locked ? '#444' : '#fff');
                // Translate "LIU BEI" to "Liu Bei" first, then localize
                const charNameKey = c.charName === 'LIU BEI' ? 'Liu Bei' : c.charName;
                const charNameText = getLocalizedCharacterName(charNameKey);
                const displayName = charNameText || c.charName;
                // Only uppercase for English
                const finalName = LANGUAGE.current === 'zh' ? displayName : displayName.toUpperCase();
                this.drawPixelText(ctx, finalName, c.x, c.y - 45, { color: nameColor, font: '8px Silkscreen', align: 'center' });
                
                ctx.restore();
            }
        });

        // 3. SELECTION INFO BOX (Bottom Center)
        const selected = this.campaigns[this.selectedIndex];
        if (selected) {
            const boxH = 80; // Increased from 65 to accommodate 5 lines
            const boxW = canvas.width - 60;
            const bx = 45;
            const by = canvas.height - boxH - 10; // Moved up slightly to fit taller box

            ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
            ctx.fillRect(bx, by, boxW, boxH);
            ctx.strokeStyle = selected.locked ? '#444' : '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

            const nameText = selected.isComplete 
                ? getLocalizedText(UI_TEXT[selected.nameCompleteKey])
                : getLocalizedText(UI_TEXT[selected.nameKey]);
            this.drawPixelText(ctx, nameText, bx + 5, by + 5, { color: '#ffd700', font: '8px Silkscreen' });
            
            const lines = this.wrapText(ctx, selected.description, boxW - 10);
            let lineY = by + 18;
            lines.forEach(line => {
                this.drawPixelText(ctx, line, bx + 5, lineY, { color: '#aaa', font: '8px Tiny5' });
                lineY += 10;
            });

            // Adjust Y position for all bottom text to fit in box (Chinese needs more space)
            const bottomTextY = LANGUAGE.current === 'zh' ? by + boxH - 14 : by + boxH - 10;
            
            if (selected.locked) {
                this.drawPixelText(ctx, getLocalizedText(UI_TEXT['CAMPAIGN LOCKED']), bx + boxW / 2, bottomTextY, { color: '#8b0000', font: '8px Silkscreen', align: 'center' });
            } else if (this.message && this.message.chapterIndex === null) {
                this.drawPixelText(ctx, this.message.text, bx + boxW / 2, bottomTextY, { color: this.message.color, font: '8px Silkscreen', align: 'center' });
            } else if (selected.isComplete) {
                this.drawPixelText(ctx, getLocalizedText(UI_TEXT['STORY COMPLETE']), bx + boxW / 2, bottomTextY, { color: '#ff4444', font: '8px Silkscreen', align: 'center' });
            } else {
                const pulse = Math.abs(Math.sin(Date.now() / 500));
                ctx.globalAlpha = pulse;
                const promptText = selected.isInProgress 
                    ? getLocalizedText(UI_TEXT['CLICK CHARACTER TO CONTINUE'])
                    : getLocalizedText(UI_TEXT['CLICK CHARACTER TO BEGIN']);
                this.drawPixelText(ctx, promptText, bx + boxW / 2, bottomTextY, { color: '#eee', font: '8px Tiny5', align: 'center' });
                ctx.globalAlpha = 1.0;
            }
        }

        // Header Title
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['STORY SELECTION']), canvas.width / 2, 10, { color: '#fff', font: '8px Silkscreen', align: 'center' });
        
        // Back Button
        const backRect = { x: canvas.width - 55, y: 5, w: 50, h: 14 };
        ctx.fillStyle = 'rgba(60, 0, 0, 0.8)';
        ctx.fillRect(backRect.x, backRect.y, backRect.w, backRect.h);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(backRect.x + 0.5, backRect.y + 0.5, backRect.w - 1, backRect.h - 1);
        
        const returnText = getLocalizedText(UI_TEXT['RETURN']);
        this.drawPixelText(ctx, returnText, backRect.x + backRect.w / 2, backRect.y + 3, { color: '#eee', font: '8px Silkscreen', align: 'center' });
        this.backRect = backRect;

        // Visual helper for ESC
        this.drawPixelText(ctx, "[ESC]", backRect.x - 2, backRect.y + 3, { color: '#444', font: '8px Tiny5', align: 'right' });

        // Fade Overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    addMessage(text, color = '#eee', chapterIndex = null) {
        this.message = { text, color, chapterIndex };
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
            // Wider hit area for the timeline items
            if (x >= 0 && x <= 120 && y >= ty - 5 && y <= ty + 20) {
                // For now, only Chapter 1 is implemented
                if (i > 0) {
                    this.addMessage(getLocalizedText(UI_TEXT['COMING SOON!']), '#ffd700', i);
                    return;
                }
                
                if (ch.available) {
                    this.selectedChapterIndex = i;
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
                        this.addMessage(getLocalizedText(UI_TEXT['This story is complete.']), '#ff4444');
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

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.manager.switchTo('title');
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = (this.selectedChapterIndex - 1 + this.chapters.length) % this.chapters.length;
            if (!this.chapters[next].available) {
                this.addMessage(getLocalizedText(UI_TEXT['COMING SOON!']), '#ffd700', next);
            } else {
                this.selectedChapterIndex = next;
                assets.playSound('ui_click');
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (this.selectedChapterIndex + 1) % this.chapters.length;
            if (!this.chapters[next].available) {
                this.addMessage(getLocalizedText(UI_TEXT['COMING SOON!']), '#ffd700', next);
            } else {
                this.selectedChapterIndex = next;
                assets.playSound('ui_click');
            }
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (this.campaigns.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + this.campaigns.length) % this.campaigns.length;
                assets.playSound('ui_click');
            }
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (this.campaigns.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % this.campaigns.length;
                assets.playSound('ui_click');
            }
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const selected = this.campaigns[this.selectedIndex];
            if (!selected) return;
            if (selected.locked) {
                this.addMessage(getLocalizedText(UI_TEXT['CAMPAIGN LOCKED']), '#8b0000');
                return;
            }
            if (selected.isComplete) {
                this.addMessage(getLocalizedText(UI_TEXT['This story is complete.']), '#ff4444');
                return;
            }
            this.manager.switchTo('map', { campaignId: selected.id });
        }
    }
}


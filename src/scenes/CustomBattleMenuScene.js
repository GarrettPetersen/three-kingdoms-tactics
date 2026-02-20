import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { UNIT_TEMPLATES } from '../data/Battles.js';
import { getLocalizedText, LANGUAGE, getFontForLanguage, getTextContainerSize } from '../core/Language.js';
import { UI_TEXT, getLocalizedCharacterName } from '../data/Translations.js';

export class CustomBattleMenuScene extends BaseScene {
    constructor() {
        super();
        this.options = {
            biome: 'central',
            layout: 'river',
            weather: 'none',
            forestDensity: 0.15,
            mountainDensity: 0.1,
            riverDensity: 0.05,
            houseDensity: 0.03,
            roster: []
        };
        
        this.biomes = ['central', 'northern', 'northern_snowy', 'southern'];
        this.layouts = ['foothills', 'river', 'lake_edge', 'mountain_pass', 'plain', 'city_gate'];
        this.weathers = ['none', 'rain', 'snow'];
        
        this.dropdowns = {
            biome: { open: false, items: this.biomes, scrollOffset: 0 },
            layout: { open: false, items: this.layouts, scrollOffset: 0 },
            weather: { open: false, items: this.weathers, scrollOffset: 0 },
            unit: { open: false, items: [], selectedIndex: undefined, scrollOffset: 0 }
        };

        this.view = 'MENU'; // 'MENU' or 'STATS'
        this.setupStep = 0; // 0: Environment, 1: Army
        this.buttonRects = [];
        this.selectedRosterIndex = -1;
        this.rosterScrollOffset = 0; // For scrolling through roster if it has many units

        this.availableUnits = [
            { name: 'Liu Bei', imgKey: 'liubei', type: 'hero', templateId: 'liubei' },
            { name: 'Guan Yu', imgKey: 'guanyu', type: 'hero', templateId: 'guanyu' },
            { name: 'Zhang Fei', imgKey: 'zhangfei', type: 'hero', templateId: 'zhangfei' },
            { name: 'Volunteer', imgKey: 'soldier', type: 'allied_soldier', templateId: 'ally' },
            { name: 'Qingzhou Guard', imgKey: 'soldier', type: 'allied_soldier', templateId: 'guard' },
            { name: 'Gong Jing', imgKey: 'gongjing_sprite', type: 'commander', templateId: 'gongjing' },
            { name: 'Lu Zhi', imgKey: 'zhoujing', type: 'commander', templateId: 'luzhi' },
            { name: 'Dong Zhuo', imgKey: 'dongzhuo', type: 'warlord', templateId: 'dongzhuo' },
            { name: 'Yellow Turban', imgKey: 'yellowturban', type: 'enemy_soldier', templateId: 'rebel' },
            { name: 'YT Captain', imgKey: 'bandit2', type: 'enemy_captain', templateId: 'zhang_jue_captain' },
            { name: 'Deng Mao', imgKey: 'bandit1', type: 'enemy_captain', templateId: 'dengmao' },
            { name: 'Cheng Yuanzhi', imgKey: 'bandit2', type: 'enemy_captain', templateId: 'chengyuanzhi' },
            { name: 'Imp. Escort', imgKey: 'soldier', type: 'imperial_soldier', templateId: 'escort' },
            { name: 'Archer', imgKey: 'archer', type: 'enemy_soldier', templateId: 'rebel', isArcher: true, hp: 2 },
        ];
        
        // Initialize unit dropdown items
        this.dropdowns.unit.items = this.availableUnits;
    }

    enter() {
        this.buttonRects = [];
        this.view = 'MENU';
        this.setupStep = 0;
        this.selectedRosterIndex = -1;
        this.rosterScrollOffset = 0;
        // Reset dropdowns
        for (const k in this.dropdowns) this.dropdowns[k].open = false;

        // Initialize default roster if empty
        if (this.options.roster.length === 0) {
            this.options.roster = [
                { type: 'hero', templateId: 'liubei', faction: 'player', level: 1, name: 'Liu Bei', imgKey: 'liubei' },
                { type: 'hero', templateId: 'guanyu', faction: 'player', level: 1, name: 'Guan Yu', imgKey: 'guanyu' },
                { type: 'hero', templateId: 'zhangfei', faction: 'player', level: 1, name: 'Zhang Fei', imgKey: 'zhangfei' }
            ];
        }

        this.initSelection({ defaultIndex: 0, totalOptions: 0 });
    }

    update() {
        if (!this.selection) return;
        this.selection.totalOptions = this.buttonRects.length;
        if (this.selection.totalOptions <= 0) return;
        if (this.selection.highlightedIndex >= this.selection.totalOptions) {
            this.selection.highlightedIndex = this.selection.totalOptions - 1;
        }

        const mouseX = this.manager.logicalMouseX;
        const mouseY = this.manager.logicalMouseY;
        this.updateSelectionMouse(mouseX, mouseY);

        if (!this.selection.mouseoverEnabled) return;
        // Pick topmost hovered button
        for (let i = this.buttonRects.length - 1; i >= 0; i--) {
            const r = this.buttonRects[i];
            if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
                this.selection.highlightedIndex = i;
                break;
            }
        }
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.view === 'STATS') {
            this.renderStats(ctx, canvas);
            return;
        }

        if (this.setupStep === 1) {
            this.renderArmyStep(ctx, canvas);
            return;
        }

        this.renderMapStep(ctx, canvas);
    }

    renderMapStep(ctx, canvas) {
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['STEP 1: ENVIRONMENT']), canvas.width / 2, 15, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        this.buttonRects = [];
        const startY = 40;
        const spacing = 22;

        const drawDropdownAnchor = (label, key, val, index) => {
            const ly = startY + index * spacing;
            const lx = 20;
            const dx = 100;
            const dw = 120;
            const dh = 14;

            this.drawPixelText(ctx, label, lx, ly + 3, { color: '#aaa', font: '8px Tiny5' });
            
            const rect = { x: dx, y: ly, w: dw, h: dh, type: 'dropdown', key: key };
            ctx.fillStyle = '#222';
            ctx.fillRect(Math.floor(rect.x), Math.floor(rect.y), Math.floor(rect.w), Math.floor(rect.h));
            ctx.strokeStyle = this.dropdowns[key].open ? '#ffd700' : '#666';
            ctx.strokeRect(Math.floor(rect.x) + 0.5, Math.floor(rect.y) + 0.5, Math.floor(rect.w) - 1, Math.floor(rect.h) - 1);
            
            // Localize the value
            const displayVal = getLocalizedText(UI_TEXT[val]) || (typeof val === 'string' ? val.toUpperCase().replace(/_/g, ' ') : val);
            this.drawPixelText(ctx, displayVal, dx + 5, ly + 3, { color: '#fff', font: '8px Tiny5' });
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            if (this.dropdowns[key].open) {
                ctx.moveTo(dx + dw - 12, ly + 10); ctx.lineTo(dx + dw - 8, ly + 4); ctx.lineTo(dx + dw - 4, ly + 10);
            } else {
                ctx.moveTo(dx + dw - 12, ly + 4); ctx.lineTo(dx + dw - 8, ly + 10); ctx.lineTo(dx + dw - 4, ly + 4);
            }
            ctx.fill();
            this.buttonRects.push(rect);
        };

        drawDropdownAnchor(getLocalizedText(UI_TEXT['BIOME:']), "biome", this.options.biome, 0);
        drawDropdownAnchor(getLocalizedText(UI_TEXT['LAYOUT:']), "layout", this.options.layout, 1);
        drawDropdownAnchor(getLocalizedText(UI_TEXT['WEATHER:']), "weather", this.options.weather, 2);

        const drawDensitySlider = (label, key, val, index) => {
            const ly = startY + index * spacing;
            this.drawPixelText(ctx, label, 20, ly + 3, { color: '#aaa', font: '8px Tiny5' });
            const sw = 120;
            const sx = 100;
            const sy = ly + 6;
            ctx.fillStyle = '#444';
            ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.floor(sw), 2);
            const ratio = val / 0.3;
            const kx = sx + ratio * sw;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(Math.floor(kx - 4), Math.floor(sy - 4), 8, 10);
            this.buttonRects.push({ x: sx, y: ly, w: sw, h: 14, type: 'density_slider', key: key });
        };

        drawDensitySlider(getLocalizedText(UI_TEXT['FOREST:']), "forestDensity", this.options.forestDensity, 3);
        drawDensitySlider(getLocalizedText(UI_TEXT['MOUNTAIN:']), "mountainDensity", this.options.mountainDensity, 4);
        drawDensitySlider(getLocalizedText(UI_TEXT['RIVER:']), "riverDensity", this.options.riverDensity, 5);

        const nextRect = { x: canvas.width / 2 - 50, y: 190, w: 100, h: 18, type: 'next_step' };
        this.drawButton(ctx, getLocalizedText(UI_TEXT['NEXT: ARMY SETUP']), nextRect, false, '#228b22');
        this.buttonRects.push(nextRect);

        const backRect = { x: 20, y: 220, w: 60, h: 18, type: 'back' };
        this.drawButton(ctx, getLocalizedText(UI_TEXT['CANCEL']), backRect, false, '#8b0000');
        this.buttonRects.push(backRect);

        const statsRect = { x: canvas.width - 80, y: 220, w: 60, h: 18, type: 'view_stats' };
        this.drawButton(ctx, getLocalizedText(UI_TEXT['STATS']), statsRect, false, '#444');
        this.buttonRects.push(statsRect);

        // Dropdowns last for Z-index
        for (const key in this.dropdowns) {
            if (key === 'unit') continue; // Unit dropdown is rendered in army step
            if (this.dropdowns[key].open) {
                const items = this.dropdowns[key].items;
                const index = ['biome', 'layout', 'weather'].indexOf(key);
                const ly = startY + index * spacing;
                const dx = 100;
                const dw = 120;
                const dh = LANGUAGE.current === 'zh' ? 14 : 14; // Minimum 14px for Chinese text
                const maxVisible = 6; // Limit to prevent covering buttons
                const scrollOffset = this.dropdowns[key].scrollOffset || 0;
                const startIdx = Math.max(0, Math.min(scrollOffset, items.length - maxVisible));
                const endIdx = Math.min(items.length, startIdx + maxVisible);
                
                for (let i = startIdx; i < endIdx; i++) {
                    const item = items[i];
                    const iy = ly + dh + (i - startIdx) * dh;
                    const iRect = { x: dx, y: iy, w: dw, h: dh, type: 'item', key: key, value: item };
                    ctx.fillStyle = '#333';
                    ctx.fillRect(Math.floor(iRect.x), Math.floor(iRect.y), Math.floor(iRect.w), Math.floor(iRect.h));
                    ctx.strokeStyle = '#444';
                    ctx.strokeRect(Math.floor(iRect.x) + 0.5, Math.floor(iRect.y) + 0.5, Math.floor(iRect.w) - 1, Math.floor(iRect.h) - 1);
                    
                    // Localize the item text
                    const itemText = getLocalizedText(UI_TEXT[item]) || item.toUpperCase().replace(/_/g, ' ');
                    const textY = iy + (LANGUAGE.current === 'zh' ? 2 : 3);
                    this.drawPixelText(ctx, itemText, dx + 10, textY, { color: '#ccc', font: '8px Tiny5' });
                    this.buttonRects.push(iRect);
                }
                
                // Show down arrow if there are more items
                if (endIdx < items.length) {
                    const arrowY = ly + dh + (endIdx - startIdx) * dh;
                    const arrowRect = { x: dx, y: arrowY, w: dw, h: dh, type: 'scroll_down', key: key };
                    ctx.fillStyle = '#444';
                    ctx.fillRect(Math.floor(arrowRect.x), Math.floor(arrowRect.y), Math.floor(arrowRect.w), Math.floor(arrowRect.h));
                    ctx.strokeStyle = '#666';
                    ctx.strokeRect(Math.floor(arrowRect.x) + 0.5, Math.floor(arrowRect.y) + 0.5, Math.floor(arrowRect.w) - 1, Math.floor(arrowRect.h) - 1);
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.moveTo(dx + dw/2 - 4, arrowY + 4);
                    ctx.lineTo(dx + dw/2, arrowY + 10);
                    ctx.lineTo(dx + dw/2 + 4, arrowY + 4);
                    ctx.fill();
                    this.buttonRects.push(arrowRect);
                }
                
                // Show up arrow if scrolled
                if (startIdx > 0) {
                    const arrowY = ly + dh;
                    const arrowRect = { x: dx, y: arrowY, w: dw, h: dh, type: 'scroll_up', key: key };
                    ctx.fillStyle = '#444';
                    ctx.fillRect(Math.floor(arrowRect.x), Math.floor(arrowRect.y), Math.floor(arrowRect.w), Math.floor(arrowRect.h));
                    ctx.strokeStyle = '#666';
                    ctx.strokeRect(Math.floor(arrowRect.x) + 0.5, Math.floor(arrowRect.y) + 0.5, Math.floor(arrowRect.w) - 1, Math.floor(arrowRect.h) - 1);
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.moveTo(dx + dw/2 - 4, arrowY + 10);
                    ctx.lineTo(dx + dw/2, arrowY + 4);
                    ctx.lineTo(dx + dw/2 + 4, arrowY + 10);
                    ctx.fill();
                    this.buttonRects.push(arrowRect);
                }
            }
        }

        this.renderSelectionOutline(ctx);
    }

    renderArmyStep(ctx, canvas) {
        this.buttonRects = [];
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['STEP 2: ARMY SETUP']), canvas.width / 2, 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });

        // Left side: Detail View or Available Units
        const leftX = 10;
        const leftY = 30;
        const leftW = 110;

        if (this.selectedRosterIndex >= 0) {
            this.renderUnitTweakPanel(ctx, leftX, leftY, leftW);
        } else {
            this.renderAvailableUnitsPanel(ctx, leftX, leftY, leftW);
        }

        // Right side: List of current units in roster (moved down to avoid covering title)
        this.renderRosterPanel(ctx, 130, 50, 115);

        // Bottom Navigation
        const isAddingUnit = this.selectedRosterIndex >= 0;
        
        // Left button: UNDO (when adding unit) or BACK TO MAP (otherwise)
        let leftButtonText, leftButtonType;
        if (isAddingUnit) {
            leftButtonText = getLocalizedText(UI_TEXT['UNDO']);
            leftButtonType = 'undo_add_unit';
        } else {
            leftButtonText = getLocalizedText(UI_TEXT['BACK TO MAP']);
            leftButtonType = 'prev_step';
        }
        
        // Right button: ADD UNIT (when adding unit) or START BATTLE (when roster has units)
        let rightButtonText, rightButtonType, rightButtonColor;
        if (isAddingUnit) {
            rightButtonText = getLocalizedText(UI_TEXT['ADD UNIT']);
            rightButtonType = 'confirm_add_unit';
            rightButtonColor = '#228b22';
        } else if (this.options.roster.length > 0) {
            rightButtonText = getLocalizedText(UI_TEXT['START BATTLE']);
            rightButtonType = 'start';
            rightButtonColor = '#228b22';
        } else {
            rightButtonText = null; // No right button when no units
        }
        
        // Calculate button sizes based on text
        ctx.save();
        ctx.font = getFontForLanguage('8px Silkscreen');
        const leftButtonSize = getTextContainerSize(ctx, leftButtonText, '8px Silkscreen', 10, 20);
        const leftButtonW = Math.max(80, leftButtonSize.width);
        const leftButtonH = 20;
        
        let rightButtonW = 0, rightButtonH = 20;
        if (rightButtonText) {
            const rightButtonSize = getTextContainerSize(ctx, rightButtonText, '8px Silkscreen', 10, 20);
            rightButtonW = Math.max(80, rightButtonSize.width);
        }
        ctx.restore();
        
        // Position buttons to prevent overlap
        const buttonSpacing = 10;
        const totalWidth = leftButtonW + (rightButtonW > 0 ? rightButtonW + buttonSpacing : 0);
        const startX = (canvas.width - totalWidth) / 2;
        
        // Left button
        const leftRect = { x: startX, y: 220, w: leftButtonW, h: leftButtonH, type: leftButtonType };
        this.drawButton(ctx, leftButtonText, leftRect, false, '#444');
        this.buttonRects.push(leftRect);
        
        // Right button (if exists)
        if (rightButtonText) {
            const rightRect = { x: startX + leftButtonW + buttonSpacing, y: 220, w: rightButtonW, h: rightButtonH, type: rightButtonType };
            this.drawButton(ctx, rightButtonText, rightRect, false, rightButtonColor);
            this.buttonRects.push(rightRect);
        }

        this.renderSelectionOutline(ctx);
    }

    renderUnitTweakPanel(ctx, x, y, w) {
        const sel = this.options.roster[this.selectedRosterIndex];
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['EDITING UNIT']), x, y, { color: '#ffd700', font: '8px Tiny5' });
        
        // Large preview
        const charImg = assets.getImage(sel.imgKey);
        if (charImg) {
            ctx.save();
            ctx.translate(x + w/2, y + 50);
            ctx.scale(1.2, 1.2);
            this.drawCharacter(ctx, charImg, 'standby', Math.floor(Date.now()/150)%4, 0, 0);
            ctx.restore();
        }
        const unitName = getLocalizedCharacterName(sel.name) || sel.name;
        const displayName = LANGUAGE.current === 'zh' ? unitName : unitName.toUpperCase();
        this.drawPixelText(ctx, displayName, x + w/2, y + 65, { color: '#fff', font: '8px Silkscreen', align: 'center' });

        // Controls (use a y-cursor so buttons never overlap)
        const buttonH = 14;
        const blockGap = 4;
        let cy = y + 80;

        // Faction: one cycling button (PLAYER -> ALLIED -> ENEMY)
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['FACTION:']), x, cy, { color: '#aaa', font: '8px Tiny5' });
        cy += 12;
        const factionColors = { player: '#4f4', allied: '#55f', enemy: '#f44' };
        const factionKey = (sel.faction || 'player').toUpperCase();
        const factionText = getLocalizedText(UI_TEXT[factionKey]) || factionKey;
        const factionRect = { x: x, y: cy, w: w, h: buttonH, type: 'cycle_faction' };
        this.drawButton(ctx, factionText, factionRect, false, factionColors[sel.faction] || '#222');
        this.buttonRects.push(factionRect);
        cy += buttonH + blockGap;

        // Level selection
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['LEVEL:']), x, cy, { color: '#aaa', font: '8px Tiny5' });
        cy += 12;
        [1, 2, 3, 4, 5].forEach((l, i) => {
            const rect = { x: x + i * 22, y: cy, w: 18, h: buttonH, type: 'set_level', level: l };
            const isActive = sel.level === l;
            this.drawButton(ctx, l.toString(), rect, isActive, isActive ? '#ffd700' : '#222');
            this.buttonRects.push(rect);
        });
        cy += buttonH + blockGap;

        // Horse toggle (single button cycles: foot -> brown -> black -> white -> redhare -> foot)
        const isMounted = !!sel.onHorse;
        const horseType = sel.horseType || 'brown';
        const labelKey = !isMounted
            ? 'ON FOOT'
            : (horseType === 'black' ? 'BLACK HORSE' :
                horseType === 'white' ? 'WHITE HORSE' :
                horseType === 'redhare' ? 'RED HARE' :
                'BROWN HORSE');
        const horseText = getLocalizedText(UI_TEXT[labelKey]);
        const horseRect = { x: x, y: cy, w: w, h: buttonH, type: 'toggle_horse' };
        this.drawButton(ctx, horseText, horseRect, isMounted, isMounted ? '#5a3' : '#222');
        this.buttonRects.push(horseRect);
        cy += buttonH + blockGap;

        // Delete button (kept above bottom nav so it can't overlap UNDO)
        const delRect = { x: x, y: cy, w: w, h: buttonH, type: 'remove_unit', index: this.selectedRosterIndex };
        this.drawButton(ctx, getLocalizedText(UI_TEXT['REMOVE UNIT']), delRect, false, '#800');
        this.buttonRects.push(delRect);
    }

    renderAvailableUnitsPanel(ctx, x, y, w) {
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['ADD UNITS']), x, y, { color: '#aaa', font: '8px Tiny5' });
        
        // Unit dropdown
        const dropdownY = y + 15;
        const dropdownH = 14;
        const dropdownW = w;
        
        // Get selected unit name for display
        let selectedUnitName = getLocalizedText(UI_TEXT['SELECT UNIT']);
        if (this.dropdowns.unit.selectedIndex !== undefined) {
            const selectedUnit = this.availableUnits[this.dropdowns.unit.selectedIndex];
            if (selectedUnit) {
                selectedUnitName = getLocalizedCharacterName(selectedUnit.name) || selectedUnit.name;
                if (LANGUAGE.current !== 'zh') {
                    selectedUnitName = selectedUnitName.toUpperCase();
                }
            }
        }
        
        const unitDropdownRect = { x: x, y: dropdownY, w: dropdownW, h: dropdownH, type: 'dropdown', key: 'unit' };
        ctx.fillStyle = '#222';
        ctx.fillRect(Math.floor(unitDropdownRect.x), Math.floor(unitDropdownRect.y), Math.floor(unitDropdownRect.w), Math.floor(unitDropdownRect.h));
        ctx.strokeStyle = this.dropdowns.unit.open ? '#ffd700' : '#666';
        ctx.strokeRect(Math.floor(unitDropdownRect.x) + 0.5, Math.floor(unitDropdownRect.y) + 0.5, Math.floor(unitDropdownRect.w) - 1, Math.floor(unitDropdownRect.h) - 1);
        
        // Truncate name if too long
        ctx.save();
        ctx.font = '8px Tiny5';
        const maxWidth = dropdownW - 20; // Leave space for arrow
        let displayName = selectedUnitName;
        if (ctx.measureText(displayName).width > maxWidth) {
            const ellipsis = '...';
            let truncated = '';
            for (let i = 0; i < displayName.length; i++) {
                const test = truncated + displayName[i] + ellipsis;
                if (ctx.measureText(test).width > maxWidth) break;
                truncated += displayName[i];
            }
            displayName = truncated + ellipsis;
        }
        ctx.restore();
        
        this.drawPixelText(ctx, displayName, x + 5, dropdownY + 3, { color: '#fff', font: '8px Tiny5' });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (this.dropdowns.unit.open) {
            ctx.moveTo(x + dropdownW - 12, dropdownY + 10); 
            ctx.lineTo(x + dropdownW - 8, dropdownY + 4); 
            ctx.lineTo(x + dropdownW - 4, dropdownY + 10);
        } else {
            ctx.moveTo(x + dropdownW - 12, dropdownY + 4); 
            ctx.lineTo(x + dropdownW - 8, dropdownY + 10); 
            ctx.lineTo(x + dropdownW - 4, dropdownY + 4);
        }
        ctx.fill();
        this.buttonRects.push(unitDropdownRect);
        
        
        // Render dropdown items if open
        if (this.dropdowns.unit.open) {
            const maxVisible = 6; // Limit visible items to prevent covering button
            const itemH = 14;
            const scrollOffset = this.dropdowns.unit.scrollOffset || 0;
            const startIndex = Math.max(0, Math.min(scrollOffset, this.availableUnits.length - maxVisible));
            const endIndex = Math.min(this.availableUnits.length, startIndex + maxVisible);
            
            for (let i = startIndex; i < endIndex; i++) {
                const unit = this.availableUnits[i];
                const itemY = dropdownY + dropdownH + (i - startIndex) * itemH;
                const itemRect = { x: x, y: itemY, w: dropdownW, h: itemH, type: 'unit_item', index: i };
                
                const isSelected = this.dropdowns.unit.selectedIndex === i;
                ctx.fillStyle = isSelected ? '#330' : '#333';
                ctx.fillRect(Math.floor(itemRect.x), Math.floor(itemRect.y), Math.floor(itemRect.w), Math.floor(itemRect.h));
                ctx.strokeStyle = isSelected ? '#ffd700' : '#444';
                ctx.strokeRect(Math.floor(itemRect.x) + 0.5, Math.floor(itemRect.y) + 0.5, Math.floor(itemRect.w) - 1, Math.floor(itemRect.h) - 1);
                
                // Show unit sprite
                const charImg = assets.getImage(unit.imgKey);
                if (charImg) {
                    ctx.save();
                    ctx.translate(itemRect.x + 8, itemRect.y + 10);
                    ctx.scale(0.2, 0.2);
                    this.drawCharacter(ctx, charImg, 'standby', 0, 0, 0);
                    ctx.restore();
                }
                
                // Show unit name (localized)
                const unitName = getLocalizedCharacterName(unit.name) || unit.name;
                const displayUnitName = LANGUAGE.current === 'zh' ? unitName : unitName.toUpperCase();
                ctx.save();
                ctx.font = '8px Tiny5';
                const nameMaxWidth = dropdownW - 18 - 5; // Leave space for sprite and padding
                let displayText = displayUnitName;
                if (ctx.measureText(displayText).width > nameMaxWidth) {
                    const ellipsis = '...';
                    let truncated = '';
                    for (let j = 0; j < displayText.length; j++) {
                        const test = truncated + displayText[j] + ellipsis;
                        if (ctx.measureText(test).width > nameMaxWidth) break;
                        truncated += displayText[j];
                    }
                    displayText = truncated + ellipsis;
                }
                ctx.restore();
                
                this.drawPixelText(ctx, displayText, itemRect.x + 18, itemRect.y + 3, { 
                    color: isSelected ? '#ffd700' : '#ccc', 
                    font: '8px Tiny5' 
                });
                this.buttonRects.push(itemRect);
            }
            
            // Show down arrow if there are more items
            if (endIndex < this.availableUnits.length) {
                const arrowY = dropdownY + dropdownH + (endIndex - startIndex) * itemH;
                const arrowRect = { x: x, y: arrowY, w: dropdownW, h: itemH, type: 'unit_scroll_down' };
                ctx.fillStyle = '#444';
                ctx.fillRect(Math.floor(arrowRect.x), Math.floor(arrowRect.y), Math.floor(arrowRect.w), Math.floor(arrowRect.h));
                ctx.strokeStyle = '#666';
                ctx.strokeRect(Math.floor(arrowRect.x) + 0.5, Math.floor(arrowRect.y) + 0.5, Math.floor(arrowRect.w) - 1, Math.floor(arrowRect.h) - 1);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(x + dropdownW/2 - 4, arrowY + 4);
                ctx.lineTo(x + dropdownW/2, arrowY + 10);
                ctx.lineTo(x + dropdownW/2 + 4, arrowY + 4);
                ctx.fill();
                this.buttonRects.push(arrowRect);
            }
            
            // Show up arrow if scrolled
            if (startIndex > 0) {
                const arrowY = dropdownY + dropdownH;
                const arrowRect = { x: x, y: arrowY, w: dropdownW, h: itemH, type: 'unit_scroll_up' };
                ctx.fillStyle = '#444';
                ctx.fillRect(Math.floor(arrowRect.x), Math.floor(arrowRect.y), Math.floor(arrowRect.w), Math.floor(arrowRect.h));
                ctx.strokeStyle = '#666';
                ctx.strokeRect(Math.floor(arrowRect.x) + 0.5, Math.floor(arrowRect.y) + 0.5, Math.floor(arrowRect.w) - 1, Math.floor(arrowRect.h) - 1);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(x + dropdownW/2 - 4, arrowY + 10);
                ctx.lineTo(x + dropdownW/2, arrowY + 4);
                ctx.lineTo(x + dropdownW/2 + 4, arrowY + 10);
                ctx.fill();
                this.buttonRects.push(arrowRect);
            }
        }
    }

    renderRosterPanel(ctx, x, y, w) {
        const counts = { player: 0, allied: 0, enemy: 0 };
        this.options.roster.forEach(u => counts[u.faction]++);
        
        // Header spacing (no longer need lineSpacing since we removed the counts line)
        const headerSpacing = LANGUAGE.current === 'zh' ? 12 : 10;
        
        const rosterText = getLocalizedText(UI_TEXT['ROSTER']) + ` (${this.options.roster.length}/20)`;
        this.drawPixelText(ctx, rosterText, x, y, { color: '#aaa', font: '8px Tiny5' });

        const rowH = LANGUAGE.current === 'zh' ? 18 : 16;
        const startY = y + headerSpacing;
        const factionColors = { player: '#4f4', allied: '#55f', enemy: '#f44' };

        // Calculate available space for roster items (from startY to bottom navigation buttons)
        // Bottom navigation is around y=200-220, so we have roughly 150-170px of space
        const { canvas } = this.manager;
        const bottomNavY = canvas.height - 30; // Approximate position of bottom nav
        const availableHeight = bottomNavY - startY;
        const maxVisibleRows = Math.floor(availableHeight / rowH);
        
        // Clamp scroll offset
        const maxScroll = Math.max(0, this.options.roster.length - maxVisibleRows);
        this.rosterScrollOffset = Math.max(0, Math.min(this.rosterScrollOffset, maxScroll));
        
        // Render visible units only
        const visibleStart = this.rosterScrollOffset;
        const visibleEnd = Math.min(visibleStart + maxVisibleRows, this.options.roster.length);
        
        for (let i = visibleStart; i < visibleEnd; i++) {
            const u = this.options.roster[i];
            const displayIndex = i - visibleStart;
            const rect = { 
                x: x, 
                y: startY + displayIndex * rowH, 
                w: w - 4, 
                h: rowH - 2, 
                type: 'select_roster', 
                index: i 
            };
            const isSelected = this.selectedRosterIndex === i;
            
            ctx.fillStyle = isSelected ? '#330' : '#111';
            ctx.fillRect(Math.floor(rect.x), Math.floor(rect.y), Math.floor(rect.w), Math.floor(rect.h));
            ctx.strokeStyle = isSelected ? '#ffd700' : '#333';
            ctx.strokeRect(Math.floor(rect.x) + 0.5, Math.floor(rect.y) + 0.5, Math.floor(rect.w) - 1, Math.floor(rect.h) - 1);

            const charImg = assets.getImage(u.imgKey);
            if (charImg) {
                ctx.save();
                ctx.translate(rect.x + 8, rect.y + 10);
                ctx.scale(0.2, 0.2);
                this.drawCharacter(ctx, charImg, 'standby', 0, 0, 0);
                ctx.restore();
            }

            const nameColor = factionColors[u.faction] || '#fff';
            const unitName = getLocalizedCharacterName(u.name) || u.name;
            const displayName = LANGUAGE.current === 'zh' ? unitName : unitName.toUpperCase();
            // Truncate name with ellipsis if too long (account for sprite width ~16px)
            const maxWidth = rect.w - 18 - 2; // Leave space for sprite and padding
            const truncatedName = this.truncateText(ctx, displayName, maxWidth, '8px Tiny5');
            // Center text vertically in the row: drawPixelText uses textBaseline='top'
            const nameTextY = rect.y + (rect.h - 8) / 2;
            this.drawPixelText(ctx, truncatedName, rect.x + 18, nameTextY, { color: nameColor, font: '8px Tiny5' });
            this.buttonRects.push(rect);
        }

        // Add scroll arrows if needed
        if (this.options.roster.length > maxVisibleRows) {
            const arrowW = 16;
            const arrowH = 12;
            const arrowX = x + w - arrowW - 2;
            
            // Down arrow (scroll down)
            if (this.rosterScrollOffset < maxScroll) {
                const downArrowY = startY + maxVisibleRows * rowH;
                const downArrowRect = { 
                    x: arrowX, 
                    y: downArrowY, 
                    w: arrowW, 
                    h: arrowH, 
                    type: 'roster_scroll_down' 
                };
                ctx.fillStyle = '#444';
                ctx.fillRect(Math.floor(downArrowRect.x), Math.floor(downArrowRect.y), Math.floor(downArrowRect.w), Math.floor(downArrowRect.h));
                ctx.strokeStyle = '#666';
                ctx.strokeRect(Math.floor(downArrowRect.x) + 0.5, Math.floor(downArrowRect.y) + 0.5, Math.floor(downArrowRect.w) - 1, Math.floor(downArrowRect.h) - 1);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(arrowX + arrowW/2 - 4, downArrowY + 4);
                ctx.lineTo(arrowX + arrowW/2, downArrowY + 8);
                ctx.lineTo(arrowX + arrowW/2 + 4, downArrowY + 4);
                ctx.fill();
                this.buttonRects.push(downArrowRect);
            }
            
            // Up arrow (scroll up)
            if (this.rosterScrollOffset > 0) {
                const upArrowY = startY - arrowH;
                const upArrowRect = { 
                    x: arrowX, 
                    y: upArrowY, 
                    w: arrowW, 
                    h: arrowH, 
                    type: 'roster_scroll_up' 
                };
                ctx.fillStyle = '#444';
                ctx.fillRect(Math.floor(upArrowRect.x), Math.floor(upArrowRect.y), Math.floor(upArrowRect.w), Math.floor(upArrowRect.h));
                ctx.strokeStyle = '#666';
                ctx.strokeRect(Math.floor(upArrowRect.x) + 0.5, Math.floor(upArrowRect.y) + 0.5, Math.floor(upArrowRect.w) - 1, Math.floor(upArrowRect.h) - 1);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(arrowX + arrowW/2 - 4, upArrowY + 8);
                ctx.lineTo(arrowX + arrowW/2, upArrowY + 4);
                ctx.lineTo(arrowX + arrowW/2 + 4, upArrowY + 8);
                ctx.fill();
                this.buttonRects.push(upArrowRect);
            }
        }

        if (this.options.roster.length > 0) {
            // Position CLEAR ALL button with proper spacing from roster text
            const clearY = LANGUAGE.current === 'zh' ? y + 1 : y;
            const clearH = LANGUAGE.current === 'zh' ? 12 : 10;
            const clearRect = { x: x + w - 40, y: clearY, w: 40, h: clearH, type: 'clear_roster' };
            const clearTextY = clearY + (clearH - 8) / 2;
            this.drawPixelText(ctx, getLocalizedText(UI_TEXT['CLEAR ALL']), x + w, clearTextY, { color: '#800', font: '8px Tiny5', align: 'right' });
            this.buttonRects.push(clearRect);
        }
    }

    renderStats(ctx, canvas) {
        const cx = canvas.width / 2;
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['CUSTOM BATTLE RECORD']), cx, 30, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        const stats = this.manager.gameState.get('customStats') || { totalBattles: 0, wins: 0, losses: 0, enemiesDefeated: 0, unitsLost: 0 };
        
        let y = 70;
        const drawStatLine = (label, val, color = '#eee') => {
            this.drawPixelText(ctx, label, 50, y, { color: '#aaa', font: '8px Tiny5' });
            this.drawPixelText(ctx, val.toString(), 200, y, { color: color, font: '8px Tiny5', align: 'right' });
            y += 18;
        };

        drawStatLine(getLocalizedText(UI_TEXT['Total Battles:']), stats.totalBattles);
        drawStatLine(getLocalizedText(UI_TEXT['Wins:']), stats.wins, '#4f4');
        drawStatLine(getLocalizedText(UI_TEXT['Losses:']), stats.losses, '#f44');
        drawStatLine(getLocalizedText(UI_TEXT['Enemies Slain:']), stats.enemiesDefeated, '#ffd700');
        drawStatLine(getLocalizedText(UI_TEXT['Heroes Fallen:']), stats.unitsLost, '#f44');

        const winRate = stats.totalBattles > 0 ? Math.round((stats.wins / stats.totalBattles) * 100) : 0;
        drawStatLine(getLocalizedText(UI_TEXT['Win Rate:']), `${winRate}%`, '#0af');

        this.buttonRects = [];
        const backRect = { x: cx - 40, y: 210, w: 80, h: 20, type: 'menu_view' };
        const returnText = getLocalizedText(UI_TEXT['RETURN']);
        this.drawButton(ctx, returnText, backRect, false, '#444');
        this.buttonRects.push(backRect);

        this.renderSelectionOutline(ctx);
    }

    renderSelectionOutline(ctx) {
        if (!this.selection || this.buttonRects.length === 0) return;
        const idx = this.selection.highlightedIndex;
        if (idx < 0 || idx >= this.buttonRects.length) return;
        const r = this.buttonRects[idx];
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.floor(r.x) - 1.5, Math.floor(r.y) - 1.5, Math.floor(r.w) + 2, Math.floor(r.h) + 2);
        ctx.restore();
    }

    truncateText(ctx, text, maxWidth, font = '8px Tiny5') {
        ctx.save();
        ctx.font = font;
        const ellipsis = '...';
        const ellipsisWidth = ctx.measureText(ellipsis).width;
        
        // If text fits, return as-is
        if (ctx.measureText(text).width <= maxWidth) {
            ctx.restore();
            return text;
        }
        
        // Binary search for the longest text that fits
        let low = 0;
        let high = text.length;
        let best = 0;
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const testText = text.substring(0, mid) + ellipsis;
            const width = ctx.measureText(testText).width;
            
            if (width <= maxWidth) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        ctx.restore();
        return best > 0 ? text.substring(0, best) + ellipsis : ellipsis;
    }

    drawButton(ctx, text, rect, isSelected, bgColor = '#333') {
        // Ensure button height is at least 14px for Chinese text
        const minHeight = LANGUAGE.current === 'zh' ? 14 : rect.h;
        const actualH = Math.max(minHeight, rect.h);
        const actualRect = { ...rect, h: actualH };
        
        ctx.fillStyle = isSelected ? '#ffd700' : bgColor;
        ctx.fillRect(Math.floor(actualRect.x), Math.floor(actualRect.y), Math.floor(actualRect.w), Math.floor(actualRect.h));
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.floor(actualRect.x) + 0.5, Math.floor(actualRect.y) + 0.5, Math.floor(actualRect.w) - 1, Math.floor(actualRect.h) - 1);
        
        // Center text vertically: drawPixelText uses textBaseline='top', so Y is top of text
        // For 8px font in actualRect.h box: top should be at actualRect.y + (actualRect.h - 8) / 2
        const textY = actualRect.y + (actualRect.h - 8) / 2;
        this.drawPixelText(ctx, text, actualRect.x + actualRect.w / 2, textY, { 
            color: isSelected ? '#000' : '#fff', 
            font: '8px Tiny5', 
            align: 'center' 
        });
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        
        // Search backwards so we pick the "top-most" (last rendered) button first
        const btn = [...this.buttonRects].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
        if (btn) {
            if (this.selection) {
                this.handleSelectionMouseClick();
                const idx = this.buttonRects.indexOf(btn);
                if (idx >= 0) this.selection.highlightedIndex = idx;
            }
            if (btn.type === 'dropdown') {
                const wasOpen = this.dropdowns[btn.key].open;
                for (const k in this.dropdowns) this.dropdowns[k].open = false;
                this.dropdowns[btn.key].open = !wasOpen;
                assets.playSound('ui_click', 0.5);
            } else if (btn.type === 'item') {
                this.options[btn.key] = btn.value;
                this.dropdowns[btn.key].open = false;
                assets.playSound('ui_click');
            } else if (btn.type === 'unit_item') {
                // Clicking a unit directly adds it and opens the editing screen
                if (this.options.roster.length < 20) {
                    const u = this.availableUnits[btn.index];
                    const defaultFaction = u.type.startsWith('enemy') ? 'enemy' : (u.type.startsWith('hero') ? 'player' : 'allied');
                    this.options.roster.push({
                        ...u,
                        faction: defaultFaction,
                        level: 1,
                        onHorse: false,
                        horseType: 'brown'
                    });
                    this.selectedRosterIndex = this.options.roster.length - 1;
                    this.dropdowns.unit.selectedIndex = undefined;
                    this.dropdowns.unit.open = false;
                    this.dropdowns.unit.scrollOffset = 0;
                    assets.playSound('ui_click', 0.6);
                } else {
                    assets.playSound('ui_error', 0.5);
                }
            } else if (btn.type === 'unit_scroll_down') {
                this.dropdowns.unit.scrollOffset = Math.min(
                    this.availableUnits.length - 6,
                    (this.dropdowns.unit.scrollOffset || 0) + 1
                );
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'unit_scroll_up') {
                this.dropdowns.unit.scrollOffset = Math.max(0, (this.dropdowns.unit.scrollOffset || 0) - 1);
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'scroll_down') {
                // Scroll down for biome/layout/weather dropdowns
                this.dropdowns[btn.key].scrollOffset = Math.min(
                    this.dropdowns[btn.key].items.length - 6,
                    (this.dropdowns[btn.key].scrollOffset || 0) + 1
                );
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'scroll_up') {
                // Scroll up for biome/layout/weather dropdowns
                this.dropdowns[btn.key].scrollOffset = Math.max(0, (this.dropdowns[btn.key].scrollOffset || 0) - 1);
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'roster_scroll_down') {
                // Scroll down roster
                const { canvas } = this.manager;
                const rowH = LANGUAGE.current === 'zh' ? 18 : 16;
                const availableHeight = (canvas.height - 30) - (50 + (LANGUAGE.current === 'zh' ? 18 : 12));
                const maxVisibleRows = Math.floor(availableHeight / rowH);
                const maxScroll = Math.max(0, this.options.roster.length - maxVisibleRows);
                this.rosterScrollOffset = Math.min(maxScroll, this.rosterScrollOffset + 1);
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'roster_scroll_up') {
                // Scroll up roster
                this.rosterScrollOffset = Math.max(0, this.rosterScrollOffset - 1);
                assets.playSound('ui_click', 0.3);
            } else if (btn.type === 'density_slider') {
                const ratio = Math.max(0, Math.min(1, (x - btn.x) / btn.w));
                this.options[btn.key] = ratio * 0.3;
            } else if (btn.type === 'view_stats') {
                this.view = 'STATS';
                assets.playSound('ui_click');
            } else if (btn.type === 'menu_view') {
                this.view = 'MENU';
                this.setupStep = 0;
                assets.playSound('ui_click');
            } else if (btn.type === 'next_step') {
                this.setupStep = 1;
                assets.playSound('ui_click');
            } else if (btn.type === 'prev_step') {
                this.setupStep = 0;
                assets.playSound('ui_click');
            } else if (btn.type === 'back') {
                this.manager.switchTo('title');
                assets.playSound('ui_click');
            } else if (btn.type === 'undo_add_unit') {
                // Remove the unit being added and return to unit selection
                if (this.selectedRosterIndex >= 0 && this.selectedRosterIndex < this.options.roster.length) {
                    this.options.roster.splice(this.selectedRosterIndex, 1);
                    this.selectedRosterIndex = -1;
                    assets.playSound('ui_click', 0.4);
                }
            } else if (btn.type === 'confirm_add_unit') {
                // Confirm adding the unit (just deselect it to finish)
                this.selectedRosterIndex = -1;
                assets.playSound('ui_click', 0.6);
            } else if (btn.type === 'deselect_unit') {
                this.selectedRosterIndex = -1;
                assets.playSound('ui_click', 0.4);
            } else if (btn.type === 'start') {
                assets.playSound('gong', 0.8);
                
                const units = this.options.roster.map((u, i) => {
                    let r, q;
                    if (u.faction === 'enemy') {
                        r = 7 + Math.floor(i / 4);
                        q = 2 + (i % 6);
                    } else {
                        r = 2 + Math.floor(i / 4);
                        q = 2 + (i % 6);
                    }

                    return {
                        id: `custom_${u.templateId}_${i}`,
                        type: u.type,
                        templateId: u.templateId,
                        name: u.name,
                        imgKey: u.imgKey,
                        faction: u.faction,
                        level: u.level,
                        isArcher: u.isArcher || false,
                        onHorse: !!u.onHorse,
                        horseType: u.horseType || 'brown',
                        r, q
                    };
                });

                this.manager.switchTo('tactics', {
                    battleId: 'custom',
                    isCustom: true,
                    mapGen: { ...this.options },
                    units: units
                });
            } else if (btn.type === 'add_unit') {
                // Legacy support - should not be used with dropdown
                if (this.options.roster.length < 20) {
                    const u = btn.unit;
                    const defaultFaction = u.type.startsWith('enemy') ? 'enemy' : (u.type.startsWith('hero') ? 'player' : 'allied');
                    this.options.roster.push({
                        ...u,
                        faction: defaultFaction,
                        level: 1,
                        onHorse: false,
                        horseType: 'brown'
                    });
                    this.selectedRosterIndex = this.options.roster.length - 1;
                    assets.playSound('ui_click', 0.6);
                } else {
                    assets.playSound('ui_error', 0.5);
                }
            } else if (btn.type === 'remove_unit') {
                this.options.roster.splice(btn.index, 1);
                this.selectedRosterIndex = -1;
                assets.playSound('ui_click', 0.4);
            } else if (btn.type === 'select_roster') {
                this.selectedRosterIndex = btn.index;
                assets.playSound('ui_click', 0.6);
            } else if (btn.type === 'cycle_faction') {
                if (this.selectedRosterIndex >= 0) {
                    const cur = this.options.roster[this.selectedRosterIndex];
                    const order = ['player', 'allied', 'enemy'];
                    const idx = Math.max(0, order.indexOf(cur.faction));
                    cur.faction = order[(idx + 1) % order.length];
                    assets.playSound('ui_click', 0.7);
                }
            } else if (btn.type === 'set_level') {
                if (this.selectedRosterIndex >= 0) {
                    this.options.roster[this.selectedRosterIndex].level = btn.level;
                    assets.playSound('ui_click', 0.7);
                }
            } else if (btn.type === 'toggle_horse') {
                if (this.selectedRosterIndex >= 0) {
                    const cur = this.options.roster[this.selectedRosterIndex];
                    const order = [
                        { onHorse: false, horseType: 'brown' },
                        { onHorse: true, horseType: 'brown' },
                        { onHorse: true, horseType: 'black' },
                        { onHorse: true, horseType: 'white' },
                        { onHorse: true, horseType: 'redhare' }
                    ];
                    const curKey = `${!!cur.onHorse}:${cur.horseType || 'brown'}`;
                    const idx = Math.max(0, order.findIndex(s => `${!!s.onHorse}:${s.horseType}` === curKey));
                    const next = order[(idx + 1) % order.length];
                    cur.onHorse = next.onHorse;
                    cur.horseType = next.horseType;
                    assets.playSound('ui_click', 0.6);
                }
            } else if (btn.type === 'clear_roster') {
                this.options.roster = [];
                this.selectedRosterIndex = -1;
                assets.playSound('ui_click', 0.5);
            }
        } else {
            for (const k in this.dropdowns) this.dropdowns[k].open = false;
        }
    }

    activateSelectionIndex(index) {
        if (index < 0 || index >= this.buttonRects.length) return;
        const r = this.buttonRects[index];
        const logicalX = r.x + r.w / 2;
        const logicalY = r.y + r.h / 2;
        const { canvas } = this.manager;
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        const clientX = canvasRect.left + logicalX / scaleX;
        const clientY = canvasRect.top + logicalY / scaleY;
        this.handleInput({ clientX, clientY });
    }

    moveSelectionDirectional(dirX, dirY) {
        if (!this.selection || this.buttonRects.length === 0) return;
        const count = this.buttonRects.length;
        if (this.selection.highlightedIndex < 0 || this.selection.highlightedIndex >= count) {
            this.selection.highlightedIndex = 0;
        }
        const curIdx = this.selection.highlightedIndex;
        const cur = this.buttonRects[curIdx];
        const curX = cur.x + cur.w / 2;
        const curY = cur.y + cur.h / 2;

        let bestIdx = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < count; i++) {
            if (i === curIdx) continue;
            const r = this.buttonRects[i];
            const x = r.x + r.w / 2;
            const y = r.y + r.h / 2;
            const vx = x - curX;
            const vy = y - curY;
            const dist = Math.sqrt(vx * vx + vy * vy) || 1;
            const nx = vx / dist;
            const ny = vy / dist;
            const dot = nx * dirX + ny * dirY;
            if (dot <= 0.2) continue;
            const score = (dot * 3) - (dist / 300);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }

        if (bestIdx !== -1) {
            this.selection.highlightedIndex = bestIdx;
            assets.playSound('ui_click', 0.5);
        }
    }

    handleKeyDown(e) {
        if (!this.selection || this.buttonRects.length === 0) return;
        this.selection.totalOptions = this.buttonRects.length;
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveSelectionDirectional(0, -1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveSelectionDirectional(0, 1);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveSelectionDirectional(-1, 0);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveSelectionDirectional(1, 0);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.onNonMouseInput();
            this.activateSelectionIndex(this.selection.highlightedIndex);
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            if (this.view === 'STATS') {
                this.view = 'MENU';
                this.setupStep = 0;
                assets.playSound('ui_click');
            } else if (this.setupStep === 1) {
                this.setupStep = 0;
                assets.playSound('ui_click');
            } else {
                this.manager.switchTo('title');
                assets.playSound('ui_click');
            }
        }
    }
}

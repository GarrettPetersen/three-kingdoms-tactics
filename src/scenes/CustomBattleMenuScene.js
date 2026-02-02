import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { UNIT_TEMPLATES } from '../data/Battles.js';

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
            biome: { open: false, items: this.biomes },
            layout: { open: false, items: this.layouts },
            weather: { open: false, items: this.weathers }
        };

        this.view = 'MENU'; // 'MENU' or 'STATS'
        this.setupStep = 0; // 0: Environment, 1: Army
        this.buttonRects = [];
        this.selectedRosterIndex = -1;

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
    }

    enter() {
        this.buttonRects = [];
        this.view = 'MENU';
        this.setupStep = 0;
        this.selectedRosterIndex = -1;
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
        this.drawPixelText(ctx, "STEP 1: ENVIRONMENT", canvas.width / 2, 15, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
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
            
            this.drawPixelText(ctx, val.toUpperCase().replace(/_/g, ' '), dx + 5, ly + 3, { color: '#fff', font: '8px Tiny5' });
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

        drawDropdownAnchor("BIOME:", "biome", this.options.biome, 0);
        drawDropdownAnchor("LAYOUT:", "layout", this.options.layout, 1);
        drawDropdownAnchor("WEATHER:", "weather", this.options.weather, 2);

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

        drawDensitySlider("FOREST:", "forestDensity", this.options.forestDensity, 3);
        drawDensitySlider("MOUNTAIN:", "mountainDensity", this.options.mountainDensity, 4);
        drawDensitySlider("RIVER:", "riverDensity", this.options.riverDensity, 5);

        const nextRect = { x: canvas.width / 2 - 50, y: 190, w: 100, h: 18, type: 'next_step' };
        this.drawButton(ctx, "NEXT: ARMY SETUP", nextRect, false, '#228b22');
        this.buttonRects.push(nextRect);

        const backRect = { x: 20, y: 220, w: 60, h: 18, type: 'back' };
        this.drawButton(ctx, "CANCEL", backRect, false, '#8b0000');
        this.buttonRects.push(backRect);

        const statsRect = { x: canvas.width - 80, y: 220, w: 60, h: 18, type: 'view_stats' };
        this.drawButton(ctx, "STATS", statsRect, false, '#444');
        this.buttonRects.push(statsRect);

        // Dropdowns last for Z-index
        for (const key in this.dropdowns) {
            if (this.dropdowns[key].open) {
                const items = this.dropdowns[key].items;
                const index = ['biome', 'layout', 'weather'].indexOf(key);
                const ly = startY + index * spacing;
                const dx = 100;
                const dw = 120;
                const dh = 14;
                items.forEach((item, i) => {
                    const iy = ly + dh + (i * dh);
                    const iRect = { x: dx, y: iy, w: dw, h: dh, type: 'item', key: key, value: item };
                    ctx.fillStyle = '#333';
                    ctx.fillRect(Math.floor(iRect.x), Math.floor(iRect.y), Math.floor(iRect.w), Math.floor(iRect.h));
                    ctx.strokeStyle = '#444';
                    ctx.strokeRect(Math.floor(iRect.x) + 0.5, Math.floor(iRect.y) + 0.5, Math.floor(iRect.w) - 1, Math.floor(iRect.h) - 1);
                    this.drawPixelText(ctx, item.toUpperCase().replace(/_/g, ' '), dx + 10, iy + 3, { color: '#ccc', font: '8px Tiny5' });
                    this.buttonRects.push(iRect);
                });
            }
        }
    }

    renderArmyStep(ctx, canvas) {
        this.buttonRects = [];
        this.drawPixelText(ctx, "STEP 2: ARMY SETUP", canvas.width / 2, 10, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });

        // Left side: Detail View or Available Units
        const leftX = 10;
        const leftY = 30;
        const leftW = 110;

        if (this.selectedRosterIndex >= 0) {
            this.renderUnitTweakPanel(ctx, leftX, leftY, leftW);
        } else {
            this.renderAvailableUnitsPanel(ctx, leftX, leftY, leftW);
        }

        // Right side: List of current units in roster
        this.renderRosterPanel(ctx, 130, 30, 115);

        // Bottom Navigation
        const startRect = { x: canvas.width / 2 + 10, y: 220, w: 100, h: 20, type: 'start' };
        this.drawButton(ctx, "START BATTLE", startRect, false, '#228b22');
        this.buttonRects.push(startRect);

        const backRect = { x: canvas.width / 2 - 110, y: 220, w: 100, h: 20, type: 'prev_step' };
        this.drawButton(ctx, "BACK TO MAP", backRect, false, '#444');
        this.buttonRects.push(backRect);
    }

    renderUnitTweakPanel(ctx, x, y, w) {
        const sel = this.options.roster[this.selectedRosterIndex];
        this.drawPixelText(ctx, "EDITING UNIT", x, y, { color: '#ffd700', font: '8px Tiny5' });
        
        // Large preview
        const charImg = assets.getImage(sel.imgKey);
        if (charImg) {
            ctx.save();
            ctx.translate(x + w/2, y + 50);
            ctx.scale(1.2, 1.2);
            this.drawCharacter(ctx, charImg, 'standby', Math.floor(Date.now()/150)%4, 0, 0);
            ctx.restore();
        }
        this.drawPixelText(ctx, sel.name.toUpperCase(), x + w/2, y + 65, { color: '#fff', font: '8px Silkscreen', align: 'center' });

        // Faction selection
        const fy = y + 80;
        this.drawPixelText(ctx, "FACTION:", x, fy, { color: '#aaa', font: '8px Tiny5' });
        const factionColors = { player: '#4f4', allied: '#55f', enemy: '#f44' };
        ['PLAYER', 'ALLIED', 'ENEMY'].forEach((f, i) => {
            const rect = { x: x, y: fy + 12 + i * 16, w: w, h: 14, type: 'set_faction', faction: f.toLowerCase() };
            const isActive = sel.faction === f.toLowerCase();
            this.drawButton(ctx, f, rect, isActive, isActive ? factionColors[sel.faction] : '#222');
            this.buttonRects.push(rect);
        });

        // Level selection
        const ly = y + 145;
        this.drawPixelText(ctx, "LEVEL:", x, ly, { color: '#aaa', font: '8px Tiny5' });
        [1, 2, 3, 4, 5].forEach((l, i) => {
            const rect = { x: x + i * 22, y: ly + 12, w: 18, h: 14, type: 'set_level', level: l };
            const isActive = sel.level === l;
            this.drawButton(ctx, l.toString(), rect, isActive, isActive ? '#ffd700' : '#222');
            this.buttonRects.push(rect);
        });

        // Delete button
        const delRect = { x: x, y: y + 175, w: w, h: 14, type: 'remove_unit', index: this.selectedRosterIndex };
        this.drawButton(ctx, "REMOVE UNIT", delRect, false, '#800');
        this.buttonRects.push(delRect);
        
        // Close detail view
        const closeRect = { x: x, y: y + 5, w: 20, h: 10, type: 'deselect_unit' };
        this.drawPixelText(ctx, "< BACK", x, y + 5, { color: '#aaa', font: '8px Tiny5' });
        this.buttonRects.push(closeRect);
    }

    renderAvailableUnitsPanel(ctx, x, y, w) {
        this.drawPixelText(ctx, "ADD UNITS", x, y, { color: '#aaa', font: '8px Tiny5' });
        const colW = w / 2 - 5;
        const rowH = 24;
        this.availableUnits.forEach((u, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const rect = { x: x + col * (colW + 10), y: y + 15 + row * rowH, w: colW, h: rowH - 4, type: 'add_unit', unit: u };
            ctx.fillStyle = '#222';
            ctx.fillRect(Math.floor(rect.x), Math.floor(rect.y), Math.floor(rect.w), Math.floor(rect.h));
            ctx.strokeStyle = '#444';
            ctx.strokeRect(Math.floor(rect.x) + 0.5, Math.floor(rect.y) + 0.5, Math.floor(rect.w) - 1, Math.floor(rect.h) - 1);
            
            const charImg = assets.getImage(u.imgKey);
            if (charImg) {
                ctx.save();
                ctx.translate(rect.x + rect.w/2, rect.y + 16);
                ctx.scale(0.3, 0.3);
                this.drawCharacter(ctx, charImg, 'standby', 0, 0, 0);
                ctx.restore();
            }
            this.drawPixelText(ctx, u.name.toUpperCase(), rect.x + rect.w/2, rect.y + 2, { 
                color: '#fff', 
                font: u.name.length > 8 ? '5px Silkscreen' : '8px Tiny5',
                align: 'center' 
            });
            this.buttonRects.push(rect);
        });
    }

    renderRosterPanel(ctx, x, y, w) {
        const counts = { player: 0, allied: 0, enemy: 0 };
        this.options.roster.forEach(u => counts[u.faction]++);
        
        this.drawPixelText(ctx, `ROSTER (${this.options.roster.length}/20)`, x, y, { color: '#aaa', font: '8px Tiny5' });
        this.drawPixelText(ctx, `P:${counts.player} A:${counts.allied} E:${counts.enemy}`, x, y + 10, { color: '#ffd700', font: '8px Tiny5' });

        const rowH = 16;
        const startY = y + 22;
        const factionColors = { player: '#4f4', allied: '#55f', enemy: '#f44' };

        // Two columns if roster > 10
        this.options.roster.forEach((u, i) => {
            const col = Math.floor(i / 11);
            const row = i % 11;
            const rectW = i >= 11 ? w / 2 : w;
            const rectX = i >= 11 ? x + w / 2 : x;
            const rect = { x: rectX, y: startY + row * rowH, w: rectW - 4, h: rowH - 2, type: 'select_roster', index: i };
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
            const name = i >= 11 ? u.name.substring(0, 5) : u.name;
            this.drawPixelText(ctx, name.toUpperCase(), rect.x + 18, rect.y + 3, { color: nameColor, font: '8px Tiny5' });
            this.buttonRects.push(rect);
        });

        if (this.options.roster.length > 0) {
            const clearRect = { x: x + w - 40, y: y, w: 40, h: 10, type: 'clear_roster' };
            this.drawPixelText(ctx, "CLEAR ALL", x + w, y, { color: '#800', font: '8px Tiny5', align: 'right' });
            this.buttonRects.push(clearRect);
        }
    }

    renderStats(ctx, canvas) {
        const cx = canvas.width / 2;
        this.drawPixelText(ctx, "CUSTOM BATTLE RECORD", cx, 30, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        const stats = this.manager.gameState.get('customStats') || { totalBattles: 0, wins: 0, losses: 0, enemiesDefeated: 0, unitsLost: 0 };
        
        let y = 70;
        const drawStatLine = (label, val, color = '#eee') => {
            this.drawPixelText(ctx, label, 50, y, { color: '#aaa', font: '8px Tiny5' });
            this.drawPixelText(ctx, val.toString(), 200, y, { color: color, font: '8px Tiny5', align: 'right' });
            y += 18;
        };

        drawStatLine("Total Battles:", stats.totalBattles);
        drawStatLine("Wins:", stats.wins, '#4f4');
        drawStatLine("Losses:", stats.losses, '#f44');
        drawStatLine("Enemies Slain:", stats.enemiesDefeated, '#ffd700');
        drawStatLine("Heroes Fallen:", stats.unitsLost, '#f44');

        const winRate = stats.totalBattles > 0 ? Math.round((stats.wins / stats.totalBattles) * 100) : 0;
        drawStatLine("Win Rate:", `${winRate}%`, '#0af');

        this.buttonRects = [];
        const backRect = { x: cx - 40, y: 210, w: 80, h: 20, type: 'menu_view' };
        this.drawButton(ctx, "RETURN", backRect, false, '#444');
        this.buttonRects.push(backRect);
    }

    drawButton(ctx, text, rect, isSelected, bgColor = '#333') {
        ctx.fillStyle = isSelected ? '#ffd700' : bgColor;
        ctx.fillRect(Math.floor(rect.x), Math.floor(rect.y), Math.floor(rect.w), Math.floor(rect.h));
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.floor(rect.x) + 0.5, Math.floor(rect.y) + 0.5, Math.floor(rect.w) - 1, Math.floor(rect.h) - 1);
        
        this.drawPixelText(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 - 4, { 
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
            if (btn.type === 'dropdown') {
                const wasOpen = this.dropdowns[btn.key].open;
                for (const k in this.dropdowns) this.dropdowns[k].open = false;
                this.dropdowns[btn.key].open = !wasOpen;
                assets.playSound('ui_click', 0.5);
            } else if (btn.type === 'item') {
                this.options[btn.key] = btn.value;
                this.dropdowns[btn.key].open = false;
                assets.playSound('ui_click');
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
                if (this.options.roster.length < 20) {
                    const u = btn.unit;
                    const defaultFaction = u.type.startsWith('enemy') ? 'enemy' : (u.type.startsWith('hero') ? 'player' : 'allied');
                    this.options.roster.push({
                        ...u,
                        faction: defaultFaction,
                        level: 1
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
            } else if (btn.type === 'set_faction') {
                if (this.selectedRosterIndex >= 0) {
                    this.options.roster[this.selectedRosterIndex].faction = btn.faction;
                    assets.playSound('ui_click', 0.7);
                }
            } else if (btn.type === 'set_level') {
                if (this.selectedRosterIndex >= 0) {
                    this.options.roster[this.selectedRosterIndex].level = btn.level;
                    assets.playSound('ui_click', 0.7);
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
}

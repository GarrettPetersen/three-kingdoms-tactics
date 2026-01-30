import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';

export class CustomBattleMenuScene extends BaseScene {
    constructor() {
        super();
        this.options = {
            biome: 'central',
            layout: 'river',
            weather: 'none',
            enemyType: 'yellowturban',
            enemyCount: 6,
            forestDensity: 0.15,
            mountainDensity: 0.1,
            riverDensity: 0.05,
            houseDensity: 0.03
        };
        
        this.biomes = ['central', 'northern', 'northern_snowy', 'southern'];
        this.layouts = ['foothills', 'river', 'lake_edge', 'mountain_pass', 'plain', 'city_gate'];
        this.weathers = ['none', 'rain', 'snow'];
        this.enemyTypes = ['yellowturban', 'archer', 'random_mix'];
        
        this.dropdowns = {
            biome: { open: false, items: this.biomes },
            layout: { open: false, items: this.layouts },
            weather: { open: false, items: this.weathers },
            enemyType: { open: false, items: this.enemyTypes }
        };

        this.view = 'MENU'; // 'MENU' or 'STATS'
        this.buttonRects = [];
    }

    enter() {
        this.buttonRects = [];
        this.view = 'MENU';
        // Reset dropdowns
        for (const k in this.dropdowns) this.dropdowns[k].open = false;
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.view === 'STATS') {
            this.renderStats(ctx, canvas);
            return;
        }

        this.drawPixelText(ctx, "CUSTOM BATTLE SETUP", canvas.width / 2, 20, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        this.buttonRects = [];

        // Fixed positions for labels
        const startY = 45;
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
            // Arrow
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
        drawDropdownAnchor("ENEMIES:", "enemyType", this.options.enemyType, 3);

        // Slider for Enemy Count
        const sliderY = startY + 4 * spacing;
        this.drawPixelText(ctx, "COUNT:", 20, sliderY + 3, { color: '#aaa', font: '8px Tiny5' });
        const sw = 120;
        const sx = 100;
        const sy = sliderY + 6;
        ctx.fillStyle = '#444';
        ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.floor(sw), 2);
        // Knob
        const ratio = (this.options.enemyCount - 1) / 11; // 1 to 12
        const kx = sx + ratio * sw;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(Math.floor(kx - 4), Math.floor(sy - 4), 8, 10);
        this.drawPixelText(ctx, this.options.enemyCount.toString(), sx + sw + 10, sliderY + 3, { color: '#fff', font: '8px Tiny5' });
        
        this.buttonRects.push({ x: sx, y: sliderY, w: sw, h: 14, type: 'slider', key: 'enemyCount' });

        // Bottom Buttons
        const startRect = { x: canvas.width / 2 - 50, y: 190, w: 100, h: 18, type: 'start' };
        this.drawButton(ctx, "START BATTLE", startRect, false, '#228b22');
        this.buttonRects.push(startRect);

        const statsRect = { x: 20, y: 220, w: 80, h: 15, type: 'view_stats' };
        this.drawButton(ctx, "VIEW STATS", statsRect, false, '#444');
        this.buttonRects.push(statsRect);

        const backRect = { x: canvas.width - 80 - 20, y: 220, w: 80, h: 15, type: 'back' };
        this.drawButton(ctx, "BACK", backRect, false, '#8b0000');
        this.buttonRects.push(backRect);

        // Draw open dropdown on top
        for (const key in this.dropdowns) {
            if (this.dropdowns[key].open) {
                const items = this.dropdowns[key].items;
                const index = ['biome', 'layout', 'weather', 'enemyType'].indexOf(key);
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
                // Close all others
                for (const k in this.dropdowns) this.dropdowns[k].open = false;
                this.dropdowns[btn.key].open = !wasOpen;
                assets.playSound('ui_click', 0.5);
            } else if (btn.type === 'item') {
                this.options[btn.key] = btn.value;
                this.dropdowns[btn.key].open = false;
                assets.playSound('ui_click');
            } else if (btn.type === 'slider') {
                const ratio = (x - btn.x) / btn.w;
                this.options.enemyCount = Math.max(1, Math.min(12, Math.floor(ratio * 11) + 1));
                // No sound for slider move or maybe a tiny click
            } else if (btn.type === 'view_stats') {
                this.view = 'STATS';
                assets.playSound('ui_click');
            } else if (btn.type === 'menu_view') {
                this.view = 'MENU';
                assets.playSound('ui_click');
            } else if (btn.type === 'back') {
                this.manager.switchTo('title');
                assets.playSound('ui_click');
            } else if (btn.type === 'start') {
                assets.playSound('gong', 0.8);
                this.manager.switchTo('tactics', {
                    battleId: 'custom',
                    isCustom: true,
                    mapGen: { ...this.options }
                });
            }
        } else {
            // Close all dropdowns if clicking elsewhere
            for (const k in this.dropdowns) this.dropdowns[k].open = false;
        }
    }
}


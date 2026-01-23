import { BaseScene } from './BaseScene.js';

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
            houseDensity: 0.03
        };
        
        this.biomes = ['central', 'northern', 'northern_snowy', 'southern'];
        this.layouts = ['foothills', 'river', 'lake_edge', 'mountain_pass', 'plain', 'city_gate'];
        this.weathers = ['none', 'rain', 'snow'];
        
        this.selectedCategory = 0; // 0: Biome, 1: Layout, 2: Start
        this.buttonRects = [];
    }

    enter() {
        this.buttonRects = [];
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.drawPixelText(ctx, "CUSTOM BATTLE", canvas.width / 2, 20, { color: '#ffd700', font: '8px Silkscreen', align: 'center' });
        
        let y = 50;
        this.buttonRects = [];

        // Biome Selection
        this.drawPixelText(ctx, "BIOME:", 20, y, { color: '#aaa', font: '8px Silkscreen' });
        y += 12;
        this.biomes.forEach((b, i) => {
            const isSelected = this.options.biome === b;
            const bx = 20 + (i % 2) * 110;
            const by = y + Math.floor(i / 2) * 14;
            const rect = { x: bx, y: by, w: 100, h: 12, type: 'biome', value: b };
            this.drawButton(ctx, b.toUpperCase(), rect, isSelected);
            this.buttonRects.push(rect);
        });

        y += 40; // Space for 2 rows of biomes

        // Layout Selection
        this.drawPixelText(ctx, "LAYOUT:", 20, y, { color: '#aaa', font: '8px Silkscreen' });
        y += 12;
        this.layouts.forEach((l, i) => {
            const isSelected = this.options.layout === l;
            const bx = 20 + (i % 2) * 110;
            const by = y + Math.floor(i / 2) * 14;
            const rect = { x: bx, y: by, w: 100, h: 12, type: 'layout', value: l };
            this.drawButton(ctx, l.toUpperCase().replace('_', ' '), rect, isSelected);
            this.buttonRects.push(rect);
        });

        y += 50; // Space for 3 rows of layouts

        // Weather Selection
        this.drawPixelText(ctx, "WEATHER:", 20, y, { color: '#aaa', font: '8px Silkscreen' });
        y += 12;
        this.weathers.forEach((w, i) => {
            const isSelected = this.options.weather === w;
            const bx = 20 + i * 75;
            const by = y;
            const rect = { x: bx, y: by, w: 70, h: 12, type: 'weather', value: w };
            this.drawButton(ctx, w.toUpperCase(), rect, isSelected);
            this.buttonRects.push(rect);
        });

        y += 30;

        // Start Button
        const startRect = { x: canvas.width / 2 - 50, y: y, w: 100, h: 20, type: 'start' };
        this.drawButton(ctx, "START BATTLE", startRect, false, '#228b22');
        this.buttonRects.push(startRect);

        // Back Button
        const backRect = { x: canvas.width / 2 - 30, y: y + 25, w: 60, h: 15, type: 'back' };
        this.drawButton(ctx, "BACK", backRect, false, '#8b0000');
        this.buttonRects.push(backRect);
    }

    drawButton(ctx, text, rect, isSelected, bgColor = '#333') {
        ctx.fillStyle = isSelected ? '#ffd700' : bgColor;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        
        this.drawPixelText(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 - 4, { 
            color: isSelected ? '#000' : '#fff', 
            font: '8px Dogica', 
            align: 'center' 
        });
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        
        const btn = this.buttonRects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
        if (btn) {
            if (btn.type === 'biome') this.options.biome = btn.value;
            if (btn.type === 'layout') this.options.layout = btn.value;
            if (btn.type === 'weather') this.options.weather = btn.value;
            if (btn.type === 'back') this.manager.switchTo('title');
            if (btn.type === 'start') {
                this.manager.switchTo('tactics', {
                    battleId: 'custom',
                    isCustom: true,
                    mapGen: { ...this.options }
                });
            }
        }
    }
}


import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS } from '../core/Constants.js';

export class TacticsScene extends BaseScene {
    constructor() {
        super();
        this.grid = [];
        this.animationFrame = 0;
        this.lastTime = 0;
        this.activeDialogue = null;
    }

    enter() {
        this.generateMap();
        this.placeInitialUnits();
    }

    generateMap() {
        const { config } = this.manager;
        this.grid = [];
        for (let r = 0; r < config.mapHeight; r++) {
            const row = [];
            for (let q = 0; q < config.mapWidth; q++) {
                const rand = Math.random() * 100;
                let terrain = 'grass_01';
                if (rand < 70) terrain = 'grass_01'; 
                else if (rand < 85) terrain = 'grass_flowers'; 
                else if (rand < 95) terrain = 'forest_01'; 
                else terrain = 'sand_01'; 
                
                let elevation = 0;
                if (terrain === 'forest_01') elevation = 8;
                if (r === 3 && q === 3) elevation = 15;
                
                row.push({ terrain, elevation, unit: null });
            }
            this.grid.push(row);
        }
    }

    placeUnit(r, q, unitData) {
        if (this.grid[r] && this.grid[r][q]) {
            this.grid[r][q].unit = unitData;
        }
    }

    placeInitialUnits() {
        this.placeUnit(4, 4, { 
            name: 'Lu Bu', 
            img: assets.getImage('lvbu'), 
            action: 'standby',
            dialogue: "Is there no one who can provide me with a decent challenge?"
        });
        this.placeUnit(2, 2, { 
            name: 'Dong Zhuo', 
            img: assets.getImage('dongzhuo'), 
            action: 'standby',
            dialogue: "All of China shall tremble before my power!"
        });
        this.placeUnit(2, 4, { 
            name: 'Liu Bei', 
            img: assets.getImage('liubei'), 
            action: 'standby',
            dialogue: "I seek only to restore peace and benevolence to the land."
        });
        this.placeUnit(2, 5, { 
            name: 'Guan Yu', 
            img: assets.getImage('guanyu'), 
            action: 'standby',
            dialogue: "My blade is tempered with honor. Who dares face me?"
        });
        this.placeUnit(2, 6, { 
            name: 'Zhang Fei', 
            img: assets.getImage('zhangfei'), 
            action: 'standby',
            dialogue: "Hahaha! Time for a drink and a good fight!"
        });
        this.placeUnit(4, 2, { 
            name: 'Zhuge Liang', 
            img: assets.getImage('zhugeliang'), 
            action: 'standby',
            dialogue: "The stars have foretold our victory. Strategy is the key."
        });
    }

    update(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        if (deltaTime > 150) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.lastTime = timestamp;
        }
    }

    render(timestamp) {
        const { ctx, canvas, config } = this.manager;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        const startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        const startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        const drawCalls = [];

        for (let r = 0; r < config.mapHeight; r++) {
            const xOffset = (r % 2 === 1) ? config.horizontalSpacing / 2 : 0;
            for (let q = 0; q < config.mapWidth; q++) {
                const x = startX + q * config.horizontalSpacing + xOffset;
                const y = startY + r * config.verticalSpacing;
                const cell = this.grid[r][q];
                
                drawCalls.push({
                    type: 'hex',
                    r, q, x, y, priority: 0,
                    terrain: cell.terrain,
                    elevation: cell.elevation || 0
                });
                
                if (cell.unit && cell.unit.img) {
                    drawCalls.push({
                        type: 'unit',
                        r, q, x, y, priority: 1,
                        unit: cell.unit,
                        action: cell.unit.action || 'standby',
                        frame: this.animationFrame,
                        elevation: cell.elevation || 0
                    });
                }
            }
        }

        drawCalls.sort((a, b) => {
            if (a.r !== b.r) return a.r - b.r;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.q - b.q;
        });

        for (const call of drawCalls) {
            if (call.type === 'hex') {
                this.drawTile(call.terrain, call.x, call.y - call.elevation, call.elevation);
            } else {
                this.drawCharacter(call.unit.img, call.action, call.frame, call.x, call.y - call.elevation);
            }
        }

        this.drawUI();
    }

    drawTile(terrainType, x, y, elevation = 0) {
        const { ctx, config } = this.manager;
        const img = assets.getImage(terrainType);
        if (!img) return;
        
        const extraDepth = config.baseDepth + elevation;
        const dx = Math.floor(x - 18);
        const dy = Math.floor(y - 18);
        
        for (let ix = 0; ix < 36; ix++) {
            let edgeY = null;
            if (ix >= 7 && ix <= 17) edgeY = 25 + Math.floor((ix - 7) * (30 - 25) / 10);
            else if (ix >= 18 && ix <= 28) edgeY = 30 + Math.floor((ix - 18) * (25 - 30) / 10);

            if (edgeY !== null) {
                ctx.drawImage(img, ix, 0, 1, edgeY, dx + ix, dy, 1, edgeY);
                ctx.drawImage(img, ix, edgeY, 1, 1, dx + ix, dy + edgeY, 1, extraDepth);
                const remainingH = 36 - edgeY;
                ctx.drawImage(img, ix, edgeY, 1, remainingH, dx + ix, dy + edgeY + extraDepth, 1, remainingH);
            } else {
                ctx.drawImage(img, ix, 0, 1, 36, dx + ix, dy, 1, 36);
            }
        }
    }

    drawUI() {
        if (!this.activeDialogue || Date.now() > this.activeDialogue.expires) {
            this.activeDialogue = null;
            return;
        }

        const { ctx, canvas } = this.manager;
        const { unit } = this.activeDialogue;
        
        const margin = 10;
        const panelWidth = Math.floor(canvas.width * 0.8);
        const panelHeight = 44;
        const x = Math.floor((canvas.width - panelWidth) / 2);
        const y = canvas.height - panelHeight - margin;

        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.fillRect(x, y, panelWidth, panelHeight);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

        const portraitSize = 32;
        const portraitX = x + 6;
        const portraitY = y + 6;
        ctx.fillStyle = '#111';
        ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        ctx.strokeRect(portraitX + 0.5, portraitY + 0.5, portraitSize - 1, portraitSize - 1);

        ctx.drawImage(unit.img, 26, 20, 20, 20, portraitX + 1, portraitY + 1, portraitSize - 2, portraitSize - 2);

        ctx.fillStyle = '#ffd700';
        ctx.font = '8px Silkscreen';
        ctx.fillText(unit.name, portraitX + portraitSize + 8, y + 14);

        ctx.fillStyle = '#eee';
        ctx.font = '8px Silkscreen';
        
        const words = (unit.dialogue || "Prepare for battle!").split(' ');
        let line = '';
        let lineY = y + 24;
        const maxWidth = panelWidth - portraitSize - 24;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, portraitX + portraitSize + 8, lineY);
                line = words[n] + ' ';
                lineY += 10;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, portraitX + portraitSize + 8, lineY);
    }

    handleInput(e) {
        const { canvas, config } = this.manager;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / config.scale;
        const y = (e.clientY - rect.top) / config.scale;
        
        const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
        const mapPixelHeight = config.mapHeight * config.verticalSpacing;
        const startX = Math.floor((canvas.width - mapPixelWidth) / 2);
        const startY = Math.floor((canvas.height - mapPixelHeight) / 2);

        let clickedHex = null;
        let minDist = 15;

        for (let r = 0; r < config.mapHeight; r++) {
            const xOffset = (r % 2 === 1) ? config.horizontalSpacing / 2 : 0;
            for (let q = 0; q < config.mapWidth; q++) {
                const hx = startX + q * config.horizontalSpacing + xOffset;
                const hy = startY + r * config.verticalSpacing - (this.grid[r][q].elevation || 0);
                const dist = Math.sqrt((x - hx)**2 + (y - hy)**2);
                if (dist < minDist) {
                    minDist = dist;
                    clickedHex = {r, q};
                }
            }
        }

        if (clickedHex) {
            const unit = this.grid[clickedHex.r][clickedHex.q].unit;
            if (unit) {
                this.activeDialogue = { unit, expires: Date.now() + 5000 };
            } else {
                this.activeDialogue = null;
            }
        }
    }
}


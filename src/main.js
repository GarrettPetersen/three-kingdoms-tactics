const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game configuration
const config = {
    scale: 3, 
    tileWidth: 36,
    tileHeight: 36,
    baseDepth: 6, // New: base thickness for all hexes
    
    // Snug fit for pointy-top sides
    horizontalSpacing: 23, 
    verticalSpacing: 17,   
    
    mapWidth: 10,
    mapHeight: 12
};

let terrainImgs = {};
let charImg = null;
let grid = []; // 2D array of { terrain, unit }
let animationFrame = 0;
let lastTime = 0;
let activeDialogue = null;
let gameState = 'title'; // 'title' or 'playing'
let titleImg = null;
let processedTitleCanvas = null;

const TERRAIN_TYPES = [
    'grass_01', 'grass_flowers', 'grass_02', 'grass_03', 'grass_04',
    'sand_01', 'sand_02', 'sand_03', 'sand_04', 'sand_05',
    'water_shallow_01', 'water_shallow_02', 'water_deep_01', 'water_deep_02',
    'forest_01', 'forest_02', 'forest_03', 'forest_04', 'forest_05',
    'earth_cracked', 'earth_rocky',
    'mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03', 'earth_stone',
    'town_pavement', 'town_building_01', 'town_building_02', 'town_building_03', 'town_road', 'town_building_04', 'town_building_05', 'town_square',
    'mud_01', 'mud_02', 'mud_03', 'mud_04', 'mud_05', 'mud_06', 'mud_07',
    'jungle_01', 'jungle_02', 'jungle_03', 'jungle_04', 'jungle_05', 'jungle_06', 'jungle_07',
    'mountain_snowy_01', 'mountain_snowy_02'
];

const ANIMATIONS = {
    standby:  { start: 0,  length: 4 },
    attack_1: { start: 4,  length: 4 },
    movement: { start: 8,  length: 4 },
    attack_2: { start: 12, length: 4 },
    defense:  { start: 16, length: 4 },
    hit:      { start: 20, length: 4 },
    victory:  { start: 24, length: 4 },
    death:    { start: 28, length: 4 },
    recovery: { start: 32, length: 4 },
    sitting:  { start: 36, length: 4 }
};

function generateMap() {
    grid = [];
    for (let r = 0; r < config.mapHeight; r++) {
        const row = [];
        for (let q = 0; q < config.mapWidth; q++) {
            const rand = Math.random() * 100;
            let terrain = 'grass_01';
            if (rand < 70) terrain = 'grass_01'; 
            else if (rand < 85) terrain = 'grass_flowers'; 
            else if (rand < 95) terrain = 'forest_01'; 
            else terrain = 'sand_01'; 
            
            // Random elevation for some tiles
            let elevation = 0;
            if (terrain === 'forest_01') elevation = 8;
            if (r === 3 && q === 3) elevation = 15; // A tall plateau
            
            row.push({
                terrain: terrain,
                elevation: elevation,
                unit: null
            });
        }
        grid.push(row);
    }
}

function placeUnit(r, q, unitData) {
    if (grid[r] && grid[r][q]) {
        grid[r][q].unit = unitData;
    }
}

function setupCanvas() {
    canvas.width = Math.floor(window.innerWidth / config.scale);
    canvas.height = Math.floor(window.innerHeight / config.scale);
    ctx.imageSmoothingEnabled = false;
    canvas.style.width = `${canvas.width * config.scale}px`;
    canvas.style.height = `${canvas.height * config.scale}px`;
}

async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function drawTile(terrainType, x, y, elevation = 0) {
    const img = terrainImgs[terrainType];
    if (!img) return;
    
    // Total depth includes base depth + elevation
    const extraDepth = config.baseDepth + elevation;
    
    // Center the 36x36 tile on the grid point
    const dx = Math.floor(x - 18);
    const dy = Math.floor(y - 18);
    
    // Draw the tile column by column to apply the "stretch" to the front edge
    for (let ix = 0; ix < 36; ix++) {
        let edgeY = null;
        
        // Front edge definition: 7,25 to 17,30 and 18,30 to 28,25
        if (ix >= 7 && ix <= 17) {
            // Linear interpolation from 25 to 30
            edgeY = 25 + Math.floor((ix - 7) * (30 - 25) / 10);
        } else if (ix >= 18 && ix <= 28) {
            // Linear interpolation from 30 to 25
            edgeY = 30 + Math.floor((ix - 18) * (25 - 30) / 10);
        }

        if (edgeY !== null) {
            // 1. Draw top part (everything above the front edge)
            ctx.drawImage(img, ix, 0, 1, edgeY, dx + ix, dy, 1, edgeY);
            
            // 2. Extrude the edge pixel
            // We draw the pixel at edgeY stretched down by extraDepth
            ctx.drawImage(img, ix, edgeY, 1, 1, dx + ix, dy + edgeY, 1, extraDepth);
            
            // 3. Draw the bottom part (the original lip) shifted down
            const remainingH = 36 - edgeY;
            ctx.drawImage(img, ix, edgeY, 1, remainingH, dx + ix, dy + edgeY + extraDepth, 1, remainingH);
        } else {
            // Not on the front edge, draw full column normally
            ctx.drawImage(img, ix, 0, 1, 36, dx + ix, dy, 1, 36);
        }
    }
}

function drawCharacter(img, action, frame, x, y) {
    if (!img) return;
    
    const sourceSize = 72; 
    const cols = 8;
    
    const anim = ANIMATIONS[action] || ANIMATIONS.standby;
    const frameIndex = anim.start + (frame % anim.length);
    
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    
    const sx = col * sourceSize;
    const sy = row * sourceSize;
    
    const displaySize = 72;
    
    // dx: centered horizontally on the grid point (x)
    const dx = Math.floor(x - displaySize / 2);
    // dy: custom offset from user tweak
    const dy = Math.floor(y - 43); 
    
    ctx.drawImage(
        img,
        sx, sy, sourceSize, sourceSize,
        dx, dy, displaySize, displaySize
    );
}

function processTitleImage() {
    if (!titleImg) return;
    
    // Create a temporary canvas to manipulate pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = titleImg.width;
    tempCanvas.height = titleImg.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(titleImg, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Convert black-on-white to red (with transparency)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        
        if (avg < 128) {
            // It's a dark pixel (the text)
            data[i] = 139;     // Dark Red (matching our theme)
            data[i+1] = 0;
            data[i+2] = 0;
            data[i+3] = 255;   // Fully opaque
        } else {
            // It's a light pixel (the background)
            data[i+3] = 0;     // Fully transparent
        }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    processedTitleCanvas = tempCanvas;
}

let menuHitArea = null;

function drawTitleScreen() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (processedTitleCanvas) {
        const x = Math.floor((canvas.width - processedTitleCanvas.width) / 2);
        const y = 40;
        ctx.drawImage(processedTitleCanvas, x, y);
    }
    
    // Menu
    ctx.fillStyle = '#ffd700'; // Gold
    ctx.font = '8px Silkscreen';
    const text = "NEW GAME";
    const metrics = ctx.measureText(text);
    const tx = Math.floor((canvas.width - metrics.width) / 2);
    const ty = canvas.height - 60;
    
    // Simple pulsing effect for the menu option
    const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.5 + 0.5;
    ctx.globalAlpha = pulse;
    ctx.fillText(text, tx, ty);
    ctx.globalAlpha = 1.0;
    
    // Hit area for "New Game"
    menuHitArea = { x: tx - 10, y: ty - 10, w: metrics.width + 20, h: 20 };
}

function render(timestamp) {
    if (Object.keys(terrainImgs).length === 0) return;
    
    if (gameState === 'title') {
        drawTitleScreen();
        requestAnimationFrame(render);
        return;
    }
    
    const deltaTime = timestamp - lastTime;
    if (deltaTime > 150) {
        animationFrame = (animationFrame + 1) % 4;
        lastTime = timestamp;
    }
    
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
            const cell = grid[r][q];
            
            // Hex draw call
            drawCalls.push({
                type: 'hex',
                r, q, x, y,
                priority: 0, // Draw hexes first in their row
                terrain: cell.terrain,
                elevation: cell.elevation || 0
            });
            
            // Unit draw call
            if (cell.unit && cell.unit.img) {
                drawCalls.push({
                    type: 'unit',
                    r, q, x, y,
                    priority: 1, // Draw units after hexes in their row
                    unit: cell.unit,
                    action: cell.unit.action || 'standby',
                    frame: animationFrame,
                    elevation: cell.elevation || 0
                });
            }
        }
    }

    // Strict depth sorting: Row first, then priority (hex vs unit), then column
    drawCalls.sort((a, b) => {
        if (a.r !== b.r) return a.r - b.r;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.q - b.q;
    });

    for (const call of drawCalls) {
        if (call.type === 'hex') {
            drawTile(call.terrain, call.x, call.y - call.elevation, call.elevation);
        } else {
            drawCharacter(call.unit.img, call.action, call.frame, call.x, call.y - call.elevation);
        }
    }

    // Draw UI overlay
    drawUI();
    
    requestAnimationFrame(render);
}

function showDialogue(unit) {
    activeDialogue = {
        unit: unit,
        expires: Date.now() + 5000
    };
}

function drawUI() {
    if (!activeDialogue || Date.now() > activeDialogue.expires) {
        activeDialogue = null;
        return;
    }

    const { unit } = activeDialogue;
    
    // Panel dimensions in "art pixels"
    const margin = 10;
    const panelWidth = Math.floor(canvas.width * 0.8);
    const panelHeight = 44;
    const x = Math.floor((canvas.width - panelWidth) / 2);
    const y = canvas.height - panelHeight - margin;

    // 1. Draw Background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // 2. Draw Border (1 art pixel thick)
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

    // 3. Draw Portrait (zoomed using your 20,20 crop)
    const portraitSize = 32;
    const portraitX = x + 6;
    const portraitY = y + 6;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
    ctx.strokeRect(portraitX + 0.5, portraitY + 0.5, portraitSize - 1, portraitSize - 1);

    // Zoom into face (Using your tweaked faceY = 20)
    const zoomArea = 20;
    const faceX = 26;
    const faceY = 20; 
    
    ctx.drawImage(
        unit.img,
        0 * 72 + faceX, 0 * 72 + faceY, zoomArea, zoomArea, // Source
        portraitX + 1, portraitY + 1, portraitSize - 2, portraitSize - 2 // Destination
    );

    // 4. Draw Text
    ctx.fillStyle = '#ffd700'; // Gold for Name
    ctx.font = '8px Silkscreen'; // Pixel font
    ctx.fillText(unit.name, portraitX + portraitSize + 8, y + 14);

    ctx.fillStyle = '#eee'; // White for text
    ctx.font = '8px Silkscreen';
    
    // Simple text wrapping for canvas
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
            lineY += 10; // More spacing for pixel font
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, portraitX + portraitSize + 8, lineY);
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / config.scale;
    const y = (e.clientY - rect.top) / config.scale;
    
    if (gameState === 'title' && menuHitArea) {
        if (x >= menuHitArea.x && x <= menuHitArea.x + menuHitArea.w &&
            y >= menuHitArea.y && y <= menuHitArea.y + menuHitArea.h) {
            gameState = 'playing';
        }
        return;
    }

    const mapPixelWidth = config.mapWidth * config.horizontalSpacing;
    const mapPixelHeight = config.mapHeight * config.verticalSpacing;
    const startX = Math.floor((canvas.width - mapPixelWidth) / 2);
    const startY = Math.floor((canvas.height - mapPixelHeight) / 2);

    let clickedHex = null;
    let minDist = 15; // Max distance to be considered a click

    for (let r = 0; r < config.mapHeight; r++) {
        const xOffset = (r % 2 === 1) ? config.horizontalSpacing / 2 : 0;
        for (let q = 0; q < config.mapWidth; q++) {
            const hx = startX + q * config.horizontalSpacing + xOffset;
            const hy = startY + r * config.verticalSpacing - (grid[r][q].elevation || 0);
            
            const dist = Math.sqrt((x - hx)**2 + (y - hy)**2);
            if (dist < minDist) {
                minDist = dist;
                clickedHex = {r, q};
            }
        }
    }

    if (clickedHex) {
        const unit = grid[clickedHex.r][clickedHex.q].unit;
        if (unit) {
            showDialogue(unit);
        } else {
            activeDialogue = null;
        }
    }
}

async function init() {
    setupCanvas();
    generateMap();
    
    canvas.addEventListener('mousedown', handleCanvasClick);
    
    window.addEventListener('resize', () => {
        setupCanvas();
    });
    
    try {
        // Wait for fonts to load
        await document.fonts.ready;

        // Load all terrain images
        const terrainPromises = TERRAIN_TYPES.map(async (type) => {
            const img = await loadImage(`assets/terrain/individual/${type}.png`);
            terrainImgs[type] = img;
        });

        // Load all character images
        const [
            luBuImg, 
            dongZhuoImg, 
            liuBeiImg, 
            guanYuImg, 
            zhangFeiImg, 
            zhugeLiangImg,
            loadedTitleImg
        ] = await Promise.all([
            loadImage('assets/characters/001_lvbu.png'),
            loadImage('assets/characters/002_dongzhuo.png'),
            loadImage('assets/characters/048_liubei.png'),
            loadImage('assets/characters/049_guanyu.png'),
            loadImage('assets/characters/050_zhangfei.png'),
            loadImage('assets/characters/051_zhugeliang.png'),
            loadImage('assets/misc/three_kingdoms_stratagem_title.png'),
            ...terrainPromises
        ]);
        
        titleImg = loadedTitleImg;
        processTitleImage();
        
        // Place units
        placeUnit(4, 4, { 
            name: 'Lu Bu', 
            img: luBuImg, 
            action: 'standby',
            dialogue: "Is there no one who can provide me with a decent challenge?"
        });
        placeUnit(2, 2, { 
            name: 'Dong Zhuo', 
            img: dongZhuoImg, 
            action: 'standby',
            dialogue: "All of China shall tremble before my power!"
        });
        placeUnit(2, 4, { 
            name: 'Liu Bei', 
            img: liuBeiImg, 
            action: 'standby',
            dialogue: "I seek only to restore peace and benevolence to the land."
        });
        placeUnit(2, 5, { 
            name: 'Guan Yu', 
            img: guanYuImg, 
            action: 'standby',
            dialogue: "My blade is tempered with honor. Who dares face me?"
        });
        placeUnit(2, 6, { 
            name: 'Zhang Fei', 
            img: zhangFeiImg, 
            action: 'standby',
            dialogue: "Hahaha! Time for a drink and a good fight!"
        });
        placeUnit(4, 2, { 
            name: 'Zhuge Liang', 
            img: zhugeLiangImg, 
            action: 'standby',
            dialogue: "The stars have foretold our victory. Strategy is the key."
        });
        
        requestAnimationFrame(render);
    } catch (err) {
        console.error('Failed to load assets', err);
    }
}

init();

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'terrain', 'edge_trapezoids');
const FORCE = process.argv.includes('--force');
const FORCE_HAND_EDITED = process.argv.includes('--force-hand-edited');
const ONLY_TERRAIN = process.argv.find(arg => arg.startsWith('--only-terrain='))?.split('=')[1] || null;
const HAND_EDITED_TERRAINS = new Set(['grass']);

const geometry = {
    tileWidth: 36,
    tileHeight: 36,
    padding: 46,
    canvasWidth: 128,
    canvasHeight: 128,
    center: { x: 64, y: 64 },
    horizontalSpacing: 29,
    verticalSpacing: 23,
    baseDepth: 6,
    elevationStep: 6,
    heightDiffs: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6],
    coveragePad: 1,
    surfaceVertices: {
        N: { x: 18, y: 6 },
        NE: { x: 29, y: 12 },
        SE: { x: 29, y: 24 },
        S: { x: 18, y: 30 },
        SW: { x: 7, y: 24 },
        NW: { x: 7, y: 12 }
    },
    directions: {
        w: {
            label: 'W',
            description: 'Region between the current NW-SW edge and the west neighbor NE-SE edge.'
        },
        sw: {
            label: 'SW',
            description: 'Region between the current SW-S edge and the southwest neighbor N-NE edge.'
        },
        se: {
            label: 'SE',
            description: 'Region between the current S-SE edge and the southeast neighbor NW-N edge.'
        }
    }
};

const terrainSources = {
    grass: 'grass_01',
    earth: 'earth_rocky',
    mud: 'mud_01',
    sand: 'sand_01',
    snow: 'snow_01',
    rock: 'mountain_stone_01',
    brick: 'brick_01',
    water_shallow: 'water_shallow_01',
    water_deep: 'water_deep_01_01'
};

const terrainVariantDiffs = [-1, 0, 1];
const terrainDiffsByGroup = {
    brick: geometry.heightDiffs,
    water_shallow: terrainVariantDiffs,
    water_deep: terrainVariantDiffs
};
const sharedCliffDiffs = [-3, -2, 2, 3];

function ensureCleanDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
}

function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a, b, amount) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return rgbToHex({
        r: ca.r + (cb.r - ca.r) * amount,
        g: ca.g + (cb.g - ca.g) * amount,
        b: ca.b + (cb.b - ca.b) * amount
    });
}

function getMostCommonOpaqueColor(imageData) {
    const counts = new Map();
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] <= 50) continue;
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    let bestKey = '128,128,128';
    let bestCount = -1;
    for (const [key, count] of counts.entries()) {
        if (count > bestCount) {
            bestKey = key;
            bestCount = count;
        }
    }

    const [r, g, b] = bestKey.split(',').map(Number);
    return rgbToHex({ r, g, b });
}

function getTerrainFillColors(sourceImages) {
    const fills = {};
    for (const [terrain, img] of Object.entries(sourceImages)) {
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        fills[terrain] = getMostCommonOpaqueColor(ctx.getImageData(0, 0, img.width, img.height));
    }
    return fills;
}

function getLightTintAmount(direction, diff) {
    const facesLeft = direction === 'w' || direction === 'sw';
    if (Math.abs(diff) >= 2) return facesLeft ? 0.14 : -0.2;
    if (diff === 0) return 0;

    const brighter = facesLeft ? diff < 0 : diff > 0;
    return brighter ? 0.18 : -0.18;
}

function applyTint(baseColor, tintAmount) {
    if (tintAmount > 0) return mix(baseColor, '#ffffff', tintAmount);
    if (tintAmount < 0) return mix(baseColor, '#000000', Math.abs(tintAmount));
    return baseColor;
}

function getFill(terrainColors, terrain, direction, diff) {
    const isWaterBeachEdge = (terrain === 'water_shallow' || terrain === 'water_deep') && Math.abs(diff) === 1;
    const sourceTerrain = Math.abs(diff) >= 2 && terrain !== 'brick' ? 'rock' : (isWaterBeachEdge ? 'sand' : terrain);
    const baseColor = terrainColors[sourceTerrain] || '#808080';
    return applyTint(baseColor, getLightTintAmount(direction, diff));
}

function polygonToRows(points) {
    const rows = [];
    const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
    const maxY = Math.min(geometry.canvasHeight - 1, Math.ceil(Math.max(...points.map(p => p[1]))));

    for (let y = minY; y <= maxY; y++) {
        const scanY = y + 0.5;
        const intersections = [];
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            if ((a[1] <= scanY && b[1] > scanY) || (b[1] <= scanY && a[1] > scanY)) {
                const t = (scanY - a[1]) / (b[1] - a[1]);
                intersections.push(a[0] + t * (b[0] - a[0]));
            }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            const start = Math.max(0, Math.floor(intersections[i]));
            const end = Math.min(geometry.canvasWidth - 1, Math.ceil(intersections[i + 1]) - 1);
            if (start <= end) rows.push({ y, start, end });
        }
    }

    return rows;
}

function padRows(rows, amount = 0) {
    if (amount <= 0) return rows;
    const rowsByY = new Map();
    rows.forEach(row => {
        for (let dy = -amount; dy <= amount; dy++) {
            const y = row.y + dy;
            if (y < 0 || y >= geometry.canvasHeight) continue;
            const start = Math.max(0, row.start - amount);
            const end = Math.min(geometry.canvasWidth - 1, row.end + amount);
            const existing = rowsByY.get(y);
            if (existing) {
                existing.start = Math.min(existing.start, start);
                existing.end = Math.max(existing.end, end);
            } else {
                rowsByY.set(y, { y, start, end });
            }
        }
    });
    return [...rowsByY.values()].sort((a, b) => a.y - b.y);
}

function surfacePoint(name, offset = { x: 0, y: 0 }) {
    const p = geometry.surfaceVertices[name];
    return [
        geometry.padding + p.x + offset.x,
        geometry.padding + p.y + offset.y
    ];
}

function getNeighborEdgeGeometry(direction, diff) {
    const elevationOffset = -diff * geometry.elevationStep;
    if (direction === 'w') {
        return {
            current: ['NW', 'SW'],
            neighbor: ['NE', 'SE'],
            offset: { x: -geometry.horizontalSpacing, y: elevationOffset }
        };
    }
    if (direction === 'sw') {
        return {
            current: ['SW', 'S'],
            neighbor: ['N', 'NE'],
            offset: { x: -geometry.horizontalSpacing / 2, y: geometry.verticalSpacing + elevationOffset }
        };
    }
    return {
        current: ['S', 'SE'],
        neighbor: ['NW', 'N'],
        offset: { x: geometry.horizontalSpacing / 2, y: geometry.verticalSpacing + elevationOffset }
    };
}

function getEdgeToEdgeRows({ direction, diff }) {
    const edge = getNeighborEdgeGeometry(direction, diff);
    const points = [
        surfacePoint(edge.current[0]),
        surfacePoint(edge.current[1]),
        surfacePoint(edge.neighbor[1], edge.offset),
        surfacePoint(edge.neighbor[0], edge.offset)
    ];
    return padRows(polygonToRows(points), geometry.coveragePad);
}

function getFrontFaceRows({ direction, diff }) {
    return getEdgeToEdgeRows({ direction, diff });
}

function getSideFaceRows({ diff }) {
    return getEdgeToEdgeRows({ direction: 'w', diff });
}

function getFaceRows({ direction, diff }) {
    if (direction === 'w') {
        return getSideFaceRows({ diff });
    }

    if (direction === 'sw' || direction === 'se') {
        return getFrontFaceRows({ direction, diff });
    }

    return [];
}

function getPointsFromRows(rows) {
    if (rows.length === 0) return [];
    return [
        [rows[0].start, rows[0].y],
        [rows[0].end, rows[0].y],
        [rows[rows.length - 1].end, rows[rows.length - 1].y],
        [rows[rows.length - 1].start, rows[rows.length - 1].y]
    ];
}

function drawTrapezoid({ terrain, direction, diff, terrainColors }) {
    const canvas = createCanvas(geometry.canvasWidth, geometry.canvasHeight);
    const ctx = canvas.getContext('2d');
    const rows = getFaceRows({ direction, diff });

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = getFill(terrainColors, terrain, direction, diff);
    rows.forEach(row => ctx.fillRect(row.start, row.y, row.end - row.start + 1, 1));

    return { canvas, points: getPointsFromRows(rows), rows };
}

function writePng(filename, canvas, terrain) {
    if (HAND_EDITED_TERRAINS.has(terrain) && !FORCE_HAND_EDITED && fs.existsSync(filename)) return false;
    if (!FORCE && fs.existsSync(filename)) return false;
    fs.writeFileSync(filename, canvas.toBuffer('image/png'));
    return true;
}

function shouldWriteTerrain(terrain) {
    return !ONLY_TERRAIN || terrain === ONLY_TERRAIN;
}

async function main() {
    ensureCleanDir(OUT_DIR);
    const sourceImages = {};
    for (const [terrain, source] of Object.entries(terrainSources)) {
        sourceImages[terrain] = await loadImage(path.join(__dirname, '..', 'public', 'assets', 'terrain', 'individual', `${source}.png`));
    }
    const terrainColors = getTerrainFillColors(sourceImages);

    const manifest = {
        generatedBy: path.basename(__filename),
        forceOverwrite: FORCE,
        forceHandEdited: FORCE_HAND_EDITED,
        onlyTerrain: ONLY_TERRAIN,
        protectedTerrains: [...HAND_EDITED_TERRAINS],
        notes: [
            'Transparent 128x128 PNGs with a 36x36 tile footprint inset at x=46,y=46.',
            'Draw centered at the same logical hex center as terrain tiles.',
            'Rows are rasterized from the real polygon between the current hex edge and the adjacent hex edge, using the same 29x23 spacing and 6px elevation step as the map renderer.',
            'This generator is non-destructive by default: existing PNGs are skipped. Pass --force to overwrite placeholder art.',
            'Hand-edited terrain groups are protected even with --force. Pass --force-hand-edited only when you really want to replace those PNGs.',
            'heightDiff is neighbor.level - current.level. Diffs -1/+1 are walkable slopes; absolute diffs >=2 use the shared rocky_cliff set because they are impassable, except brick which has its own steep rampart faces.'
        ],
        geometry,
        terrainVariantDiffs,
        terrainDiffsByGroup,
        sharedCliffDiffs,
        terrainSources,
        terrainColors,
        assets: []
    };
    let written = 0;
    let skipped = 0;

    for (const terrain of Object.keys(terrainSources)) {
        const terrainDir = path.join(OUT_DIR, terrain);
        fs.mkdirSync(terrainDir, { recursive: true });
        for (const direction of Object.keys(geometry.directions)) {
            for (const diff of terrainDiffsByGroup[terrain] || terrainVariantDiffs) {
                const diffName = diff > 0 ? `plus${diff}` : diff < 0 ? `minus${Math.abs(diff)}` : 'zero';
                const filename = `${direction}_${diffName}.png`;
                const { canvas, points, rows } = drawTrapezoid({ terrain, direction, diff, terrainColors });
                if (shouldWriteTerrain(terrain)) {
                    if (writePng(path.join(terrainDir, filename), canvas, terrain)) written++;
                    else skipped++;
                }
                manifest.assets.push({
                    terrain,
                    direction,
                    directionLabel: geometry.directions[direction].label,
                    heightDiff: diff,
                    file: `assets/terrain/edge_trapezoids/${terrain}/${filename}`,
                    points,
                    rows
                });
            }
        }
    }

    const cliffDir = path.join(OUT_DIR, 'rocky_cliff');
    fs.mkdirSync(cliffDir, { recursive: true });
    for (const direction of Object.keys(geometry.directions)) {
        for (const diff of sharedCliffDiffs) {
            const diffName = diff > 0 ? `plus${diff}` : `minus${Math.abs(diff)}`;
            const filename = `${direction}_${diffName}.png`;
            const { canvas, points, rows } = drawTrapezoid({ terrain: 'rock', direction, diff, terrainColors });
            if (shouldWriteTerrain('rocky_cliff')) {
                if (writePng(path.join(cliffDir, filename), canvas, 'rocky_cliff')) written++;
                else skipped++;
            }
            manifest.assets.push({
                terrain: 'rocky_cliff',
                direction,
                directionLabel: geometry.directions[direction].label,
                heightDiff: diff,
                file: `assets/terrain/edge_trapezoids/rocky_cliff/${filename}`,
                points,
                rows
            });
        }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Prepared ${manifest.assets.length} PNGs plus manifest in ${OUT_DIR}`);
    console.log(`PNG files written: ${written}; skipped existing: ${skipped}${FORCE ? ' (--force)' : ''}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

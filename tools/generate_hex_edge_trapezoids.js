const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'terrain', 'edge_trapezoids');
const MASK_TILE = path.join(__dirname, '..', 'public', 'assets', 'terrain', 'individual', 'grass_01.png');
const FORCE = process.argv.includes('--force');

const geometry = {
    tileWidth: 36,
    tileHeight: 36,
    padding: 10,
    canvasWidth: 56,
    canvasHeight: 56,
    center: { x: 28, y: 28 },
    horizontalSpacing: 29,
    verticalSpacing: 23,
    baseDepth: 6,
    elevationStep: 3,
    heightDiffs: [-3, -2, -1, 0, 1, 2, 3],
    directions: {
        w: {
            label: 'W',
            description: 'Left / west side underlay region, widened to tuck under same-row neighbor art.'
        },
        sw: {
            label: 'SW',
            description: 'Bottom-left front face region, widened to fill corner joins.'
        },
        se: {
            label: 'SE',
            description: 'Bottom-right front face region, widened to fill corner joins.'
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
    water_shallow: 'water_shallow_01',
    water_deep: 'water_deep_01_01'
};

const terrainVariantDiffs = [-1, 0, 1];
const terrainDiffsByGroup = {
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
    if (diff === 0 || Math.abs(diff) >= 2) return 0;

    const facesLeft = direction === 'w' || direction === 'sw';
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
    const sourceTerrain = Math.abs(diff) >= 2 ? 'rock' : (isWaterBeachEdge ? 'sand' : terrain);
    const baseColor = terrainColors[sourceTerrain] || '#808080';
    return applyTint(baseColor, getLightTintAmount(direction, diff));
}

function getTileMask(img) {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data;
}

function maskHasPixel(mask, localX, localY, width, height) {
    const x = Math.floor(localX);
    const y = Math.floor(localY);
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return mask[(y * width + x) * 4 + 3] > 50;
}

function getColumnTop(mask, localX, width, height) {
    for (let y = 0; y < height; y++) {
        if (maskHasPixel(mask, localX, y, width, height)) return y;
    }
    return 0;
}

function getBottomEdgeY(x) {
    if (x >= 7 && x <= 17) return 25 + Math.floor((x - 7) * (30 - 25) / 10);
    if (x >= 18 && x <= 28) return 30 + Math.floor((x - 18) * (25 - 30) / 10);
    return null;
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

function getFrontFaceRows({ mask, direction, diff }) {
    const pad = geometry.padding;
    const heightOffset = diff * geometry.elevationStep;
    const cliffDepth = Math.abs(diff) >= 2 ? Math.abs(diff) * geometry.elevationStep : 0;
    const topOverlap = 3;
    const outerBow = 4;
    const outerBowDrop = 5;
    const outerBottomOverhang = 3;

    if (direction === 'sw') {
        const outerTopY = pad + getBottomEdgeY(7) - topOverlap;
        return polygonToRows([
            [pad + 2, outerTopY],
            [pad + 17, pad + getBottomEdgeY(17) - Math.max(0, heightOffset) - topOverlap],
            [pad + 20, pad + 39 + Math.max(0, -heightOffset) + cliffDepth],
            [pad + 4 - outerBottomOverhang, pad + 33 + Math.max(0, -heightOffset) + cliffDepth],
            [pad + 2 - outerBow, outerTopY + outerBowDrop]
        ]);
    }

    const outerTopY = pad + getBottomEdgeY(28) - topOverlap;
    return polygonToRows([
        [pad + 18, pad + getBottomEdgeY(18) - Math.max(0, heightOffset) - topOverlap],
        [pad + 33, outerTopY],
        [pad + 33 + outerBow, outerTopY + outerBowDrop],
        [pad + 32 + outerBottomOverhang, pad + 33 + Math.max(0, -heightOffset) + cliffDepth],
        [pad + 21, pad + 39 + Math.max(0, -heightOffset) + cliffDepth]
    ]);
}

function getSideFaceRows({ diff }) {
    const pad = geometry.padding;
    const heightOffset = diff * geometry.elevationStep;
    const cliffDepth = Math.abs(diff) >= 2 ? Math.abs(diff) * geometry.elevationStep : 0;
    const topOverlap = 3;
    return polygonToRows([
        [pad - 2, pad + 18 - Math.max(0, heightOffset) - topOverlap],
        [pad + 9, pad + 13 - Math.max(0, heightOffset) - topOverlap],
        [pad + 10, pad + 35 + Math.max(0, -heightOffset) + cliffDepth],
        [pad - 2, pad + 42 + Math.max(0, -heightOffset) + cliffDepth]
    ]);
}

function getFaceRows({ mask, direction, diff }) {
    const width = geometry.tileWidth;
    const height = geometry.tileHeight;
    const pad = geometry.padding;
    const extraDepth = Math.abs(diff) >= 2 ? Math.abs(diff) * geometry.elevationStep : 0;
    const pixelsByRow = new Map();

    if (direction === 'w') {
        return getSideFaceRows({ diff });
    }

    if (direction === 'sw' || direction === 'se') {
        return getFrontFaceRows({ mask, direction, diff });
    }

    for (let localX = 0; localX < width; localX++) {
        for (let localY = 0; localY < height; localY++) {
            if (!maskHasPixel(mask, localX, localY, width, height)) continue;

            let inFace = false;
            if (direction === 'w') {
                inFace = localX >= 2 && localX <= 7 && localY >= 12;
            } else if (direction === 'sw') {
                const edgeY = getBottomEdgeY(localX);
                inFace = edgeY !== null && localX <= 17 && localY >= edgeY;
            } else if (direction === 'se') {
                const edgeY = getBottomEdgeY(localX);
                inFace = edgeY !== null && localX >= 18 && localY >= edgeY;
            }
            if (!inFace) continue;

            const x = localX + pad;
            const y = localY + pad;
            const row = pixelsByRow.get(y) || { y, start: x, end: x };
            row.start = Math.min(row.start, x);
            row.end = Math.max(row.end, x);
            pixelsByRow.set(y, row);
        }
    }

    if (extraDepth > 0) {
        const rows = [...pixelsByRow.values()];
        const lastByColumn = new Map();
        rows.forEach(row => {
            for (let x = row.start; x <= row.end; x++) lastByColumn.set(x, Math.max(lastByColumn.get(x) || 0, row.y));
        });
        for (const [x, y] of lastByColumn) {
            for (let d = 1; d <= extraDepth; d++) {
                const yy = y + d;
                if (yy >= geometry.canvasHeight) continue;
                const row = pixelsByRow.get(yy) || { y: yy, start: x, end: x };
                row.start = Math.min(row.start, x);
                row.end = Math.max(row.end, x);
                pixelsByRow.set(yy, row);
            }
        }
    }

    const rawRows = [...pixelsByRow.values()].sort((a, b) => a.y - b.y);
    const rows = [];
    rawRows.forEach(row => {
        if (row.start <= row.end) rows.push(row);
    });
    return rows;
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

function drawTrapezoid({ terrain, direction, diff, mask, terrainColors }) {
    const canvas = createCanvas(geometry.canvasWidth, geometry.canvasHeight);
    const ctx = canvas.getContext('2d');
    const rows = getFaceRows({ mask, direction, diff });

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = getFill(terrainColors, terrain, direction, diff);
    rows.forEach(row => ctx.fillRect(row.start, row.y, row.end - row.start + 1, 1));

    return { canvas, points: getPointsFromRows(rows), rows };
}

function writePng(filename, canvas) {
    if (!FORCE && fs.existsSync(filename)) return false;
    fs.writeFileSync(filename, canvas.toBuffer('image/png'));
    return true;
}

async function main() {
    ensureCleanDir(OUT_DIR);
    const maskImage = await loadImage(MASK_TILE);
    const mask = getTileMask(maskImage);
    const sourceImages = {};
    for (const [terrain, source] of Object.entries(terrainSources)) {
        sourceImages[terrain] = await loadImage(path.join(__dirname, '..', 'public', 'assets', 'terrain', 'individual', `${source}.png`));
    }
    const terrainColors = getTerrainFillColors(sourceImages);

    const manifest = {
        generatedBy: path.basename(__filename),
        forceOverwrite: FORCE,
        notes: [
            'Transparent 56x56 PNGs with a 36x36 tile footprint inset at x=10,y=10.',
            'Draw centered at the same logical hex center as terrain tiles, then tune from the manifest polygon points.',
            'This generator is non-destructive by default: existing PNGs are skipped. Pass --force to overwrite placeholder art.',
            'heightDiff is neighbor.level - current.level. Diffs -1/+1 are walkable slopes; absolute diffs >=2 use the shared rocky_cliff set because they are impassable.'
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
                const { canvas, points, rows } = drawTrapezoid({ terrain, direction, diff, mask, terrainColors });
                if (writePng(path.join(terrainDir, filename), canvas)) written++;
                else skipped++;
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
            const { canvas, points, rows } = drawTrapezoid({ terrain: 'rock', direction, diff, mask, terrainColors });
            if (writePng(path.join(cliffDir, filename), canvas)) written++;
            else skipped++;
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

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const force = process.argv.includes('--force');
const outDir = path.resolve(__dirname, '..', 'public', 'assets', 'liubo');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writePng(name, canvas) {
    const filePath = path.join(outDir, name);
    if (!force && fs.existsSync(filePath)) {
        console.log(`skip ${name}`);
        return;
    }
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    console.log(`${force ? 'write' : 'create'} ${name}`);
}

function drawPixelLine(ctx, x1, y1, x2, y2, color, width = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    ctx.stroke();
}

function drawBoard() {
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#5f462b';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
        ctx.fillStyle = '#6b4e30';
        ctx.fillRect(0, y, 256, 1);
    }
    for (let x = 5; x < 256; x += 18) {
        ctx.fillStyle = 'rgba(41, 27, 15, 0.25)';
        ctx.fillRect(x, 0, 1, 256);
    }

    const boardX = 22;
    const boardY = 22;
    const boardSize = 212;
    const center = boardX + boardSize / 2;
    const edge = '#22170f';
    const line = '#3b2718';
    const light = '#b58a52';

    ctx.fillStyle = '#a47b47';
    ctx.fillRect(boardX, boardY, boardSize, boardSize);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX + 0.5, boardY + 0.5, boardSize - 1, boardSize - 1);
    ctx.strokeStyle = light;
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX + 8.5, boardY + 8.5, boardSize - 17, boardSize - 17);

    const left = boardX + 18;
    const right = boardX + boardSize - 18;
    const top = boardY + 18;
    const bottom = boardY + boardSize - 18;
    const centerSquare = 58;
    const c0 = center - centerSquare / 2;
    const c1 = center + centerSquare / 2;

    // Outer square.
    drawPixelLine(ctx, left, top, right, top, line, 3);
    drawPixelLine(ctx, right, top, right, bottom, line, 3);
    drawPixelLine(ctx, right, bottom, left, bottom, line, 3);
    drawPixelLine(ctx, left, bottom, left, top, line, 3);

    // Four inset corner L marks.
    const cornerL = 28;
    drawPixelLine(ctx, left + cornerL, top, left + cornerL, top + cornerL, edge, 3);
    drawPixelLine(ctx, left, top + cornerL, left + cornerL, top + cornerL, edge, 3);
    drawPixelLine(ctx, right - cornerL, top, right - cornerL, top + cornerL, edge, 3);
    drawPixelLine(ctx, right - cornerL, top + cornerL, right, top + cornerL, edge, 3);
    drawPixelLine(ctx, right - cornerL, bottom, right - cornerL, bottom - cornerL, edge, 3);
    drawPixelLine(ctx, right - cornerL, bottom - cornerL, right, bottom - cornerL, edge, 3);
    drawPixelLine(ctx, left + cornerL, bottom, left + cornerL, bottom - cornerL, edge, 3);
    drawPixelLine(ctx, left, bottom - cornerL, left + cornerL, bottom - cornerL, edge, 3);

    // Central river.
    ctx.fillStyle = '#9fc0c1';
    ctx.fillRect(c0, c0, centerSquare, centerSquare);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(c0 + 0.5, c0 + 0.5, centerSquare - 1, centerSquare - 1);

    // Four T marks poking out from the central square.
    const tStem = 24;
    const tBar = 36;
    drawPixelLine(ctx, center, c0, center, c0 - tStem, edge, 3);
    drawPixelLine(ctx, center - tBar / 2, c0 - tStem, center + tBar / 2, c0 - tStem, edge, 3);
    drawPixelLine(ctx, center, c1, center, c1 + tStem, edge, 3);
    drawPixelLine(ctx, center - tBar / 2, c1 + tStem, center + tBar / 2, c1 + tStem, edge, 3);
    drawPixelLine(ctx, c0, center, c0 - tStem, center, edge, 3);
    drawPixelLine(ctx, c0 - tStem, center - tBar / 2, c0 - tStem, center + tBar / 2, edge, 3);
    drawPixelLine(ctx, c1, center, c1 + tStem, center, edge, 3);
    drawPixelLine(ctx, c1 + tStem, center - tBar / 2, c1 + tStem, center + tBar / 2, edge, 3);

    // Middle L marks on all four sides come inward from the outer edge.
    const sideL = 22;
    drawPixelLine(ctx, center, top, center, top + sideL, edge, 3);
    drawPixelLine(ctx, center - 20, top + sideL, center, top + sideL, edge, 3);
    drawPixelLine(ctx, center, bottom, center, bottom - sideL, edge, 3);
    drawPixelLine(ctx, center, bottom - sideL, center + 20, bottom - sideL, edge, 3);
    drawPixelLine(ctx, left, center, left + sideL, center, edge, 3);
    drawPixelLine(ctx, left + sideL, center - 20, left + sideL, center, edge, 3);
    drawPixelLine(ctx, right, center, right - sideL, center, edge, 3);
    drawPixelLine(ctx, right - sideL, center, right - sideL, center + 20, edge, 3);

    // Four circles.
    [[82, 82], [174, 82], [174, 174], [82, 174]].forEach(([x, y]) => {
        ctx.strokeStyle = edge;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
    });

    return canvas;
}

function drawPiece(color, isOwl, vertical) {
    const w = vertical ? 10 : 16;
    const h = vertical ? 16 : 10;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const fill = color === 'white' ? '#e3d6bd' : '#443229';
    const hi = color === 'white' ? '#fff0ce' : '#6a4b37';
    const shadow = color === 'white' ? '#9d7c57' : '#201713';
    ctx.fillStyle = shadow;
    ctx.fillRect(2, 2, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w - 2, h - 2);
    ctx.fillStyle = hi;
    ctx.fillRect(2, 2, w - 6, 2);
    ctx.fillStyle = '#1a110c';
    ctx.strokeRect(0.5, 0.5, w - 3, h - 3);
    if (isOwl) {
        ctx.fillStyle = color === 'white' ? '#b42318' : '#d5b466';
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        ctx.fillRect(cx - 2, cy - 2, 5, 5);
        ctx.fillRect(cx - 1, cy - 5, 3, 2);
    }
    return canvas;
}

function drawStick(marked, vertical) {
    const w = vertical ? 5 : 24;
    const h = vertical ? 24 : 5;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#28180d';
    ctx.fillRect(1, 1, w - 1, h - 1);
    ctx.fillStyle = marked ? '#c79a58' : '#8f6940';
    ctx.fillRect(0, 0, w - 1, h - 1);
    ctx.fillStyle = marked ? '#fff0bf' : '#b58b5a';
    if (vertical) ctx.fillRect(2, 3, 2, h - 8);
    else ctx.fillRect(3, 2, w - 8, 2);
    if (marked) {
        ctx.fillStyle = '#4b251a';
        if (vertical) {
            ctx.fillRect(2, 8, 2, 2);
            ctx.fillRect(2, 18, 2, 2);
        } else {
            ctx.fillRect(8, 2, 2, 2);
            ctx.fillRect(18, 2, 2, 2);
        }
    }
    return canvas;
}

ensureDir(outDir);
writePng('board.png', drawBoard());
for (const color of ['white', 'black']) {
    for (const owl of [false, true]) {
        const prefix = owl ? `owl_${color}` : `piece_${color}`;
        writePng(`${prefix}_h.png`, drawPiece(color, owl, false));
        writePng(`${prefix}_v.png`, drawPiece(color, owl, true));
    }
}
writePng('stick_marked_h.png', drawStick(true, false));
writePng('stick_unmarked_h.png', drawStick(false, false));
writePng('stick_marked_v.png', drawStick(true, true));
writePng('stick_unmarked_v.png', drawStick(false, true));

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'assets/terrain/hexes.png';
const outputDir = 'assets/terrain/individual';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function sliceTiles() {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    const tileSize = 36;
    const padding = 2;
    const cols = 7;
    const rows = 7;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const left = padding + c * tileSize;
            const top = padding + r * tileSize;
            
            const index = r * cols + c;
            const fileName = `tile_${index.toString().padStart(3, '0')}.png`;
            const outputPath = path.join(outputDir, fileName);
            
            await sharp(inputPath)
                .extract({ left, top, width: tileSize, height: tileSize })
                .toFile(outputPath);
            
            console.log(`Saved ${fileName}`);
        }
    }
}

sliceTiles().catch(err => {
    console.error(err);
    process.exit(1);
});


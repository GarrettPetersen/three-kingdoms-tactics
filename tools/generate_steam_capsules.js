#!/usr/bin/env node
/**
 * Generate Steam capsule art from the intro screen
 * Creates multiple sizes with English and Chinese titles, plus a background version
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

// Canvas configuration for pixel art (no anti-aliasing)
const pixelArtConfig = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low'
};

// Layer definitions matching TitleScene.js
const layers = [
    { key: 'intro_sky', speed: 0.1, file: '00_sky.png' },
    { key: 'intro_hills', speed: 0.3, file: '01_hills.png' },
    { key: 'intro_distant_army', speed: 0.6, file: '02_distant_army.png' },
    { key: 'intro_distant_army_flags', speed: 0.6, file: '02_distant_army_flags.png' },
    { key: 'intro_midground_army', speed: 1.0, file: '03_midground_army.png' },
    { key: 'intro_midground_army_flags', speed: 1.0, file: '03_midground_army_flags.png' },
    { key: 'intro_field', speed: 1.1, file: '04_field.png' },
    { key: 'intro_grass', speed: 2.2, file: '05_grass.png' },
    { key: 'intro_blades', speed: 2.2, file: '05_blades.png' }
];

// Original canvas size (from the game)
const ORIGINAL_WIDTH = 512;
const ORIGINAL_HEIGHT = 256;

// Pan position to match the final title screen state
// From TitleScene: targetPanX = 500 / 2.2 ≈ 227.27
const PAN_X = 227.27;

// Title images
const TITLE_EN = 'assets/misc/three_kingdoms_stratagem_title.png';
const TITLE_ZH = 'assets/misc/三国玄机.png';

// Output sizes
const CAPSULE_SIZES = [
    { width: 920, height: 430, name: 'header' },
    { width: 462, height: 174, name: 'small' },
    { width: 1232, height: 706, name: 'main' },
    { width: 748, height: 896, name: 'vertical' }
];

const BACKGROUND_SIZE = { width: 1438, height: 810, name: 'background' };

// Library image sizes
const LIBRARY_SIZES = [
    { width: 600, height: 900, name: 'library_capsule' },
    { width: 920, height: 430, name: 'library_header' },
    { width: 3840, height: 1240, name: 'library_hero' }
];

const LIBRARY_LOGO_SIZE = { width: 1280, height: 720 }; // Aspect ratio maintained

/**
 * Process title image to add red color and black outline (matching TitleScene.js)
 */
function processTitleImage(titleImg) {
    const tempCanvas = createCanvas(titleImg.width + 4, titleImg.height + 4);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = false;
    
    // 1. Create the red title version
    const spriteCanvas = createCanvas(titleImg.width, titleImg.height);
    const sctx = spriteCanvas.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(titleImg, 0, 0);
    const imageData = sctx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 128) {
            // Set to red (139, 0, 0)
            data[i] = 139; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
        } else {
            data[i+3] = 0;
        }
    }
    sctx.putImageData(imageData, 0, 0);

    // 2. Create a black mask version for the outline
    const maskCanvas = createCanvas(titleImg.width, titleImg.height);
    const mctx = maskCanvas.getContext('2d');
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(spriteCanvas, 0, 0);
    const maskData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const mPixels = maskData.data;
    for (let i = 0; i < mPixels.length; i += 4) {
        if (mPixels[i+3] > 0) {
            mPixels[i] = 0; mPixels[i+1] = 0; mPixels[i+2] = 0; // Black
        }
    }
    mctx.putImageData(maskData, 0, 0);

    // 3. Draw black outline by drawing shifted versions of the mask
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            tempCtx.drawImage(maskCanvas, 2 + dx, 2 + dy);
        }
    }

    // 4. Draw the red title on top
    tempCtx.drawImage(spriteCanvas, 2, 2);
    
    return tempCanvas;
}

/**
 * Draw parallax layers to canvas
 */
function drawLayers(ctx, canvas, layerImages, panX, includeGrass = true, grassOffsetY = 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    layers.forEach(layer => {
        // Skip grass if not including foreground objects
        if (!includeGrass && (layer.key === 'intro_grass' || layer.key === 'intro_blades')) {
            return;
        }
        
        const img = layerImages[layer.key];
        if (!img) return;
        
        const baseX = -((panX * layer.speed) % img.width);
        
        // For grass layers, shift up so horse feet are behind it
        const offsetY = (layer.key === 'intro_grass' || layer.key === 'intro_blades') ? grassOffsetY : 0;
        
        // Draw tiled layer
        let x = baseX;
        while (x < canvas.width) {
            ctx.drawImage(img, Math.floor(x), Math.floor(offsetY));
            x += img.width;
        }
        // Draw wrap-around if needed
        if (baseX < 0) {
            ctx.drawImage(img, Math.floor(baseX + img.width), Math.floor(offsetY));
        }
    });
    
    // If grass was shifted up, fill black below to cover gaps
    if (includeGrass && grassOffsetY < 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, canvas.height + grassOffsetY, canvas.width, -grassOffsetY);
    }
}

/**
 * Draw horse on the left side
 * Returns the horse X position for spacing calculations
 * Extends the top row of pixels upward for more height
 */
function drawHorse(ctx, canvas, horseImg, panX, scale, sizeName) {
    if (!horseImg) return null;
    
    // From TitleScene: horseX = 400, hx = horseX - (panX * 2.2)
    // At PAN_X = 227.27, hx = 400 - (227.27 * 2.2) = 400 - 500 = -100
    const horseX = 400;
    const hx = horseX - (panX * 2.2);
    const scaledHx = hx * scale;
    const scaledWidth = horseImg.width * scale;
    const scaledHeight = horseImg.height * scale;
    
    // Position on left, allow partial cropping (30% can be off-screen)
    const drawX = Math.floor(Math.max(-scaledWidth * 0.3, scaledHx));
    
    // Adjust horse Y position per size
    let horseYOffset = 10 * scale; // Default: move down 10px (scaled)
    if (sizeName === 'main') {
        horseYOffset = 5 * scale; // Less offset for main
    } else if (sizeName === 'vertical') {
        horseYOffset = 5 * scale; // Less offset for vertical to reduce gap
    } else if (sizeName === 'library_capsule') {
        horseYOffset = 5 * scale; // Less offset for library capsule to reduce gap
    }
    
    // Extend top row of pixels upward (add extra height at top)
    // For vertical and library_capsule, extend more to fill any gap
    let baseExtraHeight = 5;
    if (sizeName === 'vertical') {
        baseExtraHeight = 10; // More extension for vertical
    } else if (sizeName === 'library_capsule') {
        baseExtraHeight = 10; // More extension for library capsule
    }
    const extraHeight = Math.max(1, Math.ceil(baseExtraHeight * scale)); // Extend (scaled), minimum 1px
    // Position horse so extension goes all the way up (no gap)
    const drawY = Math.floor(canvas.height - scaledHeight + horseYOffset - extraHeight);
    
    ctx.imageSmoothingEnabled = false;
    
    // Draw the horse, extending the top row upward
    // First, draw the main image
    ctx.drawImage(
        horseImg,
        0, 0, horseImg.width, horseImg.height,
        drawX, drawY + extraHeight, scaledWidth, scaledHeight
    );
    
    // Always extend the top row of pixels upward (for all sizes including vertical)
    // Get the top row of the horse image and extend it
    const topRowCanvas = createCanvas(horseImg.width, 1);
    const topRowCtx = topRowCanvas.getContext('2d');
    topRowCtx.imageSmoothingEnabled = false;
    topRowCtx.drawImage(horseImg, 0, 0, horseImg.width, 1, 0, 0, horseImg.width, 1);
    
    // Draw the extended top row
    ctx.drawImage(
        topRowCanvas,
        0, 0, horseImg.width, 1,
        drawX, drawY, scaledWidth, extraHeight
    );
    
    return drawX + scaledWidth; // Return right edge of horse for spacing
}

/**
 * Draw guandao on the left side, maintaining spacing from horse
 * After animation, guandao is much closer to the horse
 */
function drawGuandao(ctx, canvas, guandaoImg, horseRightEdge, horseImg, scale, sizeName) {
    if (!guandaoImg) return;
    
    // After the pan animation completes, the guandao appears and is much closer
    // The visual spacing is much tighter than the mathematical center position
    // Use a much smaller absolute spacing value (around 50-80 pixels)
    
    const scaledWidth = guandaoImg.width * scale;
    const scaledHeight = guandaoImg.height * scale;
    
    // Use tight spacing (much closer than centered position)
    // All spacing uses the same scale factor for consistency (no mixels)
    // Base spacing at original scale: -160px (close but not overlapping)
    let baseSpacing = -160; // Base spacing at original scale
    // Fine-tune per size
    if (sizeName === 'header') {
        baseSpacing = -170; // Even closer for header
    } else if (sizeName === 'main') {
        baseSpacing = -180; // Very close for main
    } else if (sizeName === 'small') {
        baseSpacing = -165; // Slightly closer for small
    } else if (sizeName === 'vertical') {
        baseSpacing = -155; // Slightly more for vertical
    }
    
    // Scale the spacing to match everything else
    const spacing = baseSpacing * scale;
    
    let drawX;
    if (horseRightEdge !== null && horseImg) {
        // Use scaled spacing for consistency
        drawX = Math.floor(horseRightEdge + spacing);
    } else {
        // Fallback: position on left, partially cropped
        drawX = Math.floor(-scaledWidth * 0.4);
    }
    
    // Move guandao up a bit (all scaling consistent)
    const centerY = (canvas.height - scaledHeight) / 2;
    const drawY = Math.floor(centerY - (20 * scale)); // 20px scaled
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        guandaoImg,
        0, 0, guandaoImg.width, guandaoImg.height,
        drawX, drawY, scaledWidth, scaledHeight
    );
}

/**
 * Draw title centered on canvas (both horizontally and vertically)
 */
function drawTitle(ctx, canvas, processedTitle) {
    const x = Math.floor((canvas.width - processedTitle.width) / 2);
    const y = Math.floor((canvas.height - processedTitle.height) / 2);
    ctx.drawImage(processedTitle, x, y);
}

/**
 * Scale image buffer without anti-aliasing using nearest-neighbor
 * Maintains aspect ratio and crops to fit (never squishes)
 */
async function scaleImage(buffer, targetWidth, targetHeight) {
    return await sharp(buffer)
        .resize(targetWidth, targetHeight, {
            kernel: sharp.kernel.nearest, // Nearest-neighbor for pixel art
            fit: 'cover' // Crop to fit, maintain aspect ratio
        })
        .png()
        .toBuffer();
}

/**
 * Convert canvas to buffer
 */
function canvasToBuffer(canvas) {
    return Buffer.from(canvas.toDataURL('image/png').split(',')[1], 'base64');
}

/**
 * Generate capsule art
 */
async function generateCapsules() {
    console.log('Loading images...');
    
    // Load all layer images
    const layerImages = {};
    for (const layer of layers) {
        const filePath = path.join(__dirname, '..', 'assets', 'intro_animation', layer.file);
        try {
            layerImages[layer.key] = await loadImage(filePath);
            console.log(`  Loaded ${layer.file}`);
        } catch (err) {
            console.error(`  Failed to load ${layer.file}: ${err.message}`);
        }
    }
    
    // Load title images
    const titleEnPath = path.join(__dirname, '..', TITLE_EN);
    const titleZhPath = path.join(__dirname, '..', TITLE_ZH);
    const titleEnImg = await loadImage(titleEnPath);
    const titleZhImg = await loadImage(titleZhPath);
    console.log('  Loaded title images');
    
    // Load horse and guandao
    const horsePath = path.join(__dirname, '..', 'assets', 'intro_animation', '06_horse.png');
    const guandaoPath = path.join(__dirname, '..', 'assets', 'intro_animation', '07_guandao.png');
    const horseImg = await loadImage(horsePath);
    const guandaoImg = await loadImage(guandaoPath);
    console.log('  Loaded horse and guandao');
    
    // Process titles
    const processedTitleEn = processTitleImage(titleEnImg);
    const processedTitleZh = processTitleImage(titleZhImg);
    console.log('  Processed titles');
    
    // Create output directory
    const outputDir = path.join(__dirname, '..', 'steam_capsules');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Render base composition at original size
    // We'll render per-size to adjust grass positioning
    
    // Generate capsule sizes with titles
    console.log('\nGenerating capsule art with titles...');
    for (const size of CAPSULE_SIZES) {
        // Calculate scale factor (maintain aspect ratio)
        const scaleX = size.width / ORIGINAL_WIDTH;
        const scaleY = size.height / ORIGINAL_HEIGHT;
        const scale = Math.max(scaleX, scaleY); // Use larger scale to ensure coverage
        
        // Calculate title scale - use same base scale as background for pixel consistency
        // Then multiply for visibility (double for small, larger for vertical)
        let titleScale = scale; // Use same scale as background
        if (size.name === 'small') {
            titleScale *= 2; // Double size for small capsule
        } else if (size.name === 'vertical') {
            titleScale *= 1.5; // 50% larger for vertical
        }
        
        const titleWidth = Math.floor(processedTitleEn.width * titleScale);
        const titleHeight = Math.floor(processedTitleEn.height * titleScale);
        
        // Scale titles
        const titleEnBuffer = canvasToBuffer(processedTitleEn);
        const scaledTitleEnBuffer = await scaleImage(titleEnBuffer, titleWidth, titleHeight);
        const scaledTitleEn = await loadImage(scaledTitleEnBuffer);
        
        const titleZhBuffer = canvasToBuffer(processedTitleZh);
        const scaledTitleZhBuffer = await scaleImage(titleZhBuffer, titleWidth, titleHeight);
        const scaledTitleZh = await loadImage(scaledTitleZhBuffer);
        
        // Create base canvas for this size with adjusted grass
        const baseCanvasSize = createCanvas(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
        const baseCtxSize = baseCanvasSize.getContext('2d');
        Object.assign(baseCtxSize, pixelArtConfig);
        
        // Adjust grass offset per size
        let grassOffset = -10; // Default
        if (size.name === 'header') {
            grassOffset = -9; // 1px less to fix visible line
        } else if (size.name === 'main') {
            grassOffset = -15; // Higher for main
        } else if (size.name === 'small') {
            grassOffset = -11; // Slightly more for small
        } else if (size.name === 'vertical') {
            grassOffset = -8; // Less for vertical
        }
        
        drawLayers(baseCtxSize, baseCanvasSize, layerImages, PAN_X, true, grassOffset);
        
        // Create canvas for this size
        const canvasEn = createCanvas(size.width, size.height);
        const ctxEn = canvasEn.getContext('2d');
        Object.assign(ctxEn, pixelArtConfig);
        
        // Draw scaled background (maintains aspect ratio, crops to fit)
        const baseBuffer = canvasToBuffer(baseCanvasSize);
        const scaledBaseBuffer = await scaleImage(baseBuffer, size.width, size.height);
        const scaledBase = await loadImage(scaledBaseBuffer);
        ctxEn.drawImage(scaledBase, 0, 0);
        
        // Draw horse on left side (returns right edge for spacing)
        const horseRightEdge = drawHorse(ctxEn, canvasEn, horseImg, PAN_X, scale, size.name);
        
        // Draw guandao on left side, maintaining spacing from horse
        drawGuandao(ctxEn, canvasEn, guandaoImg, horseRightEdge, horseImg, scale, size.name);
        
        // Draw title centered (both horizontally and vertically)
        const titleX = Math.floor((size.width - scaledTitleEn.width) / 2);
        const titleY = Math.floor((size.height - scaledTitleEn.height) / 2);
        ctxEn.drawImage(scaledTitleEn, titleX, titleY);
        
        // Save English version
        const filenameEn = `capsule_${size.name}_en.png`;
        const filepathEn = path.join(outputDir, filenameEn);
        const bufferEn = canvasEn.toBuffer('image/png');
        fs.writeFileSync(filepathEn, bufferEn);
        console.log(`  ✓ ${filenameEn} (${size.width}x${size.height})`);
        
        // Chinese version
        const canvasZh = createCanvas(size.width, size.height);
        const ctxZh = canvasZh.getContext('2d');
        Object.assign(ctxZh, pixelArtConfig);
        ctxZh.drawImage(scaledBase, 0, 0);
        const horseRightEdgeZh = drawHorse(ctxZh, canvasZh, horseImg, PAN_X, scale, size.name);
        drawGuandao(ctxZh, canvasZh, guandaoImg, horseRightEdgeZh, horseImg, scale, size.name);
        ctxZh.drawImage(scaledTitleZh, titleX, titleY);
        
        const filenameZh = `capsule_${size.name}_schinese.png`;
        const filepathZh = path.join(outputDir, filenameZh);
        const bufferZh = canvasZh.toBuffer('image/png');
        fs.writeFileSync(filepathZh, bufferZh);
        console.log(`  ✓ ${filenameZh} (${size.width}x${size.height})`);
    }
    
    // Generate background version (no title, no grass)
    console.log('\nGenerating background version...');
    const bgCanvas = createCanvas(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
    const bgCtx = bgCanvas.getContext('2d');
    Object.assign(bgCtx, pixelArtConfig);
    
    // Draw layers without grass
    drawLayers(bgCtx, bgCanvas, layerImages, PAN_X, false, 0);
    
    // Scale to background size using sharp
    const bgBuffer = canvasToBuffer(bgCanvas);
    const finalBgBuffer = await scaleImage(bgBuffer, BACKGROUND_SIZE.width, BACKGROUND_SIZE.height);
    
    const bgFilename = `capsule_${BACKGROUND_SIZE.name}.png`;
    const bgFilepath = path.join(outputDir, bgFilename);
    fs.writeFileSync(bgFilepath, finalBgBuffer);
    console.log(`  ✓ ${bgFilename} (${BACKGROUND_SIZE.width}x${BACKGROUND_SIZE.height})`);
    
    // Generate library images
    console.log('\nGenerating library images...');
    
    // Library Capsule (600x900) - with title, horse, guandao
    const libCapsuleSize = LIBRARY_SIZES.find(s => s.name === 'library_capsule');
    const libCapsuleScaleX = libCapsuleSize.width / ORIGINAL_WIDTH;
    const libCapsuleScaleY = libCapsuleSize.height / ORIGINAL_HEIGHT;
    const libCapsuleScale = Math.max(libCapsuleScaleX, libCapsuleScaleY);
    
    // Calculate title scale with 1.5x multiplier, but reduce if it doesn't fit
    let libCapsuleTitleScale = libCapsuleScale * 1.5;
    
    // Check if title fits, and reduce title scale if needed (but keep background/horse/guandao at normal scale)
    const maxTitleWidth = libCapsuleSize.width * 0.95; // 95% of canvas width for safety margin
    const maxTitleHeight = libCapsuleSize.height * 0.95; // 95% of canvas height for safety margin
    
    const titleWidthAtScale = processedTitleEn.width * libCapsuleTitleScale;
    const titleHeightAtScale = processedTitleEn.height * libCapsuleTitleScale;
    
    // Calculate scale factor needed to fit title (only adjust title, not everything)
    const widthScaleFactor = titleWidthAtScale > maxTitleWidth ? maxTitleWidth / titleWidthAtScale : 1;
    const heightScaleFactor = titleHeightAtScale > maxTitleHeight ? maxTitleHeight / titleHeightAtScale : 1;
    const fitScaleFactor = Math.min(widthScaleFactor, heightScaleFactor);
    
    // If title doesn't fit, only scale down the title (keep background/horse/guandao at normal scale)
    if (fitScaleFactor < 1) {
        libCapsuleTitleScale *= fitScaleFactor;
    }
    
    const libCapsuleTitleWidth = Math.floor(processedTitleEn.width * libCapsuleTitleScale);
    const libCapsuleTitleHeight = Math.floor(processedTitleEn.height * libCapsuleTitleScale);
    const libCapsuleTitleEnBuffer = await scaleImage(canvasToBuffer(processedTitleEn), libCapsuleTitleWidth, libCapsuleTitleHeight);
    const libCapsuleTitleEn = await loadImage(libCapsuleTitleEnBuffer);
    const libCapsuleTitleZhBuffer = await scaleImage(canvasToBuffer(processedTitleZh), libCapsuleTitleWidth, libCapsuleTitleHeight);
    const libCapsuleTitleZh = await loadImage(libCapsuleTitleZhBuffer);
    
    // Create base for library capsule with grass
    const libCapsuleBaseCanvas = createCanvas(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
    const libCapsuleBaseCtx = libCapsuleBaseCanvas.getContext('2d');
    Object.assign(libCapsuleBaseCtx, pixelArtConfig);
    drawLayers(libCapsuleBaseCtx, libCapsuleBaseCanvas, layerImages, PAN_X, true, -10);
    
    // Scale base to fit (using the adjusted scale)
    const libCapsuleBaseBuffer = canvasToBuffer(libCapsuleBaseCanvas);
    const libCapsuleScaledBaseBuffer = await scaleImage(libCapsuleBaseBuffer, libCapsuleSize.width, libCapsuleSize.height);
    const libCapsuleScaledBase = await loadImage(libCapsuleScaledBaseBuffer);
    
    // English version
    const libCapsuleEnCanvas = createCanvas(libCapsuleSize.width, libCapsuleSize.height);
    const libCapsuleEnCtx = libCapsuleEnCanvas.getContext('2d');
    Object.assign(libCapsuleEnCtx, pixelArtConfig);
    libCapsuleEnCtx.drawImage(libCapsuleScaledBase, 0, 0);
    
    const libCapsuleHorseRight = drawHorse(libCapsuleEnCtx, libCapsuleEnCanvas, horseImg, PAN_X, libCapsuleScale, 'library_capsule');
    drawGuandao(libCapsuleEnCtx, libCapsuleEnCanvas, guandaoImg, libCapsuleHorseRight, horseImg, libCapsuleScale, 'library_capsule');
    
    const libCapsuleTitleX = Math.floor((libCapsuleSize.width - libCapsuleTitleEn.width) / 2);
    const libCapsuleTitleY = Math.floor((libCapsuleSize.height - libCapsuleTitleEn.height) / 2);
    // Ensure pixel-perfect rendering (no anti-aliasing)
    libCapsuleEnCtx.imageSmoothingEnabled = false;
    libCapsuleEnCtx.drawImage(libCapsuleTitleEn, libCapsuleTitleX, libCapsuleTitleY);
    
    const libCapsuleEnFile = path.join(outputDir, 'library_capsule_en.png');
    fs.writeFileSync(libCapsuleEnFile, libCapsuleEnCanvas.toBuffer('image/png'));
    console.log(`  ✓ library_capsule_en.png (${libCapsuleSize.width}x${libCapsuleSize.height})`);
    
    // Chinese version
    const libCapsuleZhCanvas = createCanvas(libCapsuleSize.width, libCapsuleSize.height);
    const libCapsuleZhCtx = libCapsuleZhCanvas.getContext('2d');
    Object.assign(libCapsuleZhCtx, pixelArtConfig);
    libCapsuleZhCtx.drawImage(libCapsuleScaledBase, 0, 0);
    const libCapsuleHorseRightZh = drawHorse(libCapsuleZhCtx, libCapsuleZhCanvas, horseImg, PAN_X, libCapsuleScale, 'library_capsule');
    drawGuandao(libCapsuleZhCtx, libCapsuleZhCanvas, guandaoImg, libCapsuleHorseRightZh, horseImg, libCapsuleScale, 'library_capsule');
    // Ensure pixel-perfect rendering (no anti-aliasing)
    libCapsuleZhCtx.imageSmoothingEnabled = false;
    libCapsuleZhCtx.drawImage(libCapsuleTitleZh, libCapsuleTitleX, libCapsuleTitleY);
    
    const libCapsuleZhFile = path.join(outputDir, 'library_capsule_schinese.png');
    fs.writeFileSync(libCapsuleZhFile, libCapsuleZhCanvas.toBuffer('image/png'));
    console.log(`  ✓ library_capsule_schinese.png (${libCapsuleSize.width}x${libCapsuleSize.height})`);
    
    // Library Header (920x430) - same as header capsule
    const libHeaderSize = LIBRARY_SIZES.find(s => s.name === 'library_header');
    const headerSize = CAPSULE_SIZES.find(s => s.name === 'header');
    const headerScaleX = headerSize.width / ORIGINAL_WIDTH;
    const headerScaleY = headerSize.height / ORIGINAL_HEIGHT;
    const headerScale = Math.max(headerScaleX, headerScaleY);
    const headerTitleScale = headerScale; // Use same scale as background for pixel consistency
    
    const headerTitleWidth = Math.floor(processedTitleEn.width * headerTitleScale);
    const headerTitleHeight = Math.floor(processedTitleEn.height * headerTitleScale);
    const headerTitleEnBuffer = await scaleImage(canvasToBuffer(processedTitleEn), headerTitleWidth, headerTitleHeight);
    const headerTitleEn = await loadImage(headerTitleEnBuffer);
    const headerTitleZhBuffer = await scaleImage(canvasToBuffer(processedTitleZh), headerTitleWidth, headerTitleHeight);
    const headerTitleZh = await loadImage(headerTitleZhBuffer);
    
    // Reuse the base canvas we already created for header
    const headerBaseCanvas = createCanvas(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
    const headerBaseCtx = headerBaseCanvas.getContext('2d');
    Object.assign(headerBaseCtx, pixelArtConfig);
    drawLayers(headerBaseCtx, headerBaseCanvas, layerImages, PAN_X, true, -9);
    
    const headerBaseBuffer = canvasToBuffer(headerBaseCanvas);
    const headerScaledBaseBuffer = await scaleImage(headerBaseBuffer, headerSize.width, headerSize.height);
    const headerScaledBase = await loadImage(headerScaledBaseBuffer);
    
    // English version
    const libHeaderEnCanvas = createCanvas(libHeaderSize.width, libHeaderSize.height);
    const libHeaderEnCtx = libHeaderEnCanvas.getContext('2d');
    Object.assign(libHeaderEnCtx, pixelArtConfig);
    libHeaderEnCtx.drawImage(headerScaledBase, 0, 0);
    const libHeaderHorseRight = drawHorse(libHeaderEnCtx, libHeaderEnCanvas, horseImg, PAN_X, headerScale, 'header');
    drawGuandao(libHeaderEnCtx, libHeaderEnCanvas, guandaoImg, libHeaderHorseRight, horseImg, headerScale, 'header');
    const libHeaderTitleX = Math.floor((libHeaderSize.width - headerTitleEn.width) / 2);
    const libHeaderTitleY = Math.floor((libHeaderSize.height - headerTitleEn.height) / 2);
    libHeaderEnCtx.drawImage(headerTitleEn, libHeaderTitleX, libHeaderTitleY);
    
    const libHeaderEnFile = path.join(outputDir, 'library_header_en.png');
    fs.writeFileSync(libHeaderEnFile, libHeaderEnCanvas.toBuffer('image/png'));
    console.log(`  ✓ library_header_en.png (${libHeaderSize.width}x${libHeaderSize.height})`);
    
    // Chinese version
    const libHeaderZhCanvas = createCanvas(libHeaderSize.width, libHeaderSize.height);
    const libHeaderZhCtx = libHeaderZhCanvas.getContext('2d');
    Object.assign(libHeaderZhCtx, pixelArtConfig);
    libHeaderZhCtx.drawImage(headerScaledBase, 0, 0);
    const libHeaderHorseRightZh = drawHorse(libHeaderZhCtx, libHeaderZhCanvas, horseImg, PAN_X, headerScale, 'header');
    drawGuandao(libHeaderZhCtx, libHeaderZhCanvas, guandaoImg, libHeaderHorseRightZh, horseImg, headerScale, 'header');
    libHeaderZhCtx.drawImage(headerTitleZh, libHeaderTitleX, libHeaderTitleY);
    
    const libHeaderZhFile = path.join(outputDir, 'library_header_schinese.png');
    fs.writeFileSync(libHeaderZhFile, libHeaderZhCanvas.toBuffer('image/png'));
    console.log(`  ✓ library_header_schinese.png (${libHeaderSize.width}x${libHeaderSize.height})`);
    
    // Library Hero (3840x1240) - background only, no title, no horse/guandao
    const libHeroSize = LIBRARY_SIZES.find(s => s.name === 'library_hero');
    const libHeroScaledBuffer = await scaleImage(bgBuffer, libHeroSize.width, libHeroSize.height);
    
    const libHeroFile = path.join(outputDir, 'library_hero.png');
    fs.writeFileSync(libHeroFile, libHeroScaledBuffer);
    console.log(`  ✓ library_hero.png (${libHeroSize.width}x${libHeroSize.height})`);
    
    // Library Logo - processed title on transparent background
    // Calculate size maintaining aspect ratio, with max 1280px width or 720px height
    const logoAspectRatio = processedTitleEn.width / processedTitleEn.height;
    let logoWidth, logoHeight;
    if (logoAspectRatio > (LIBRARY_LOGO_SIZE.width / LIBRARY_LOGO_SIZE.height)) {
        // Wider than target aspect ratio - use width as constraint
        logoWidth = LIBRARY_LOGO_SIZE.width;
        logoHeight = Math.floor(LIBRARY_LOGO_SIZE.width / logoAspectRatio);
    } else {
        // Taller than target aspect ratio - use height as constraint
        logoHeight = LIBRARY_LOGO_SIZE.height;
        logoWidth = Math.floor(LIBRARY_LOGO_SIZE.height * logoAspectRatio);
    }
    
    // Scale the processed title to logo size (maintains transparency from processing)
    const logoEnBuffer = await scaleImage(canvasToBuffer(processedTitleEn), logoWidth, logoHeight);
    const logoZhBuffer = await scaleImage(canvasToBuffer(processedTitleZh), logoWidth, logoHeight);
    
    const logoEnFile = path.join(outputDir, 'library_logo_en.png');
    fs.writeFileSync(logoEnFile, logoEnBuffer);
    console.log(`  ✓ library_logo_en.png (${logoWidth}x${logoHeight})`);
    
    const logoZhFile = path.join(outputDir, 'library_logo_schinese.png');
    fs.writeFileSync(logoZhFile, logoZhBuffer);
    console.log(`  ✓ library_logo_schinese.png (${logoWidth}x${logoHeight})`);
    
    console.log('\n✅ All capsule and library art generated in steam_capsules/');
}

// Run the script
generateCapsules().catch(err => {
    console.error('Error generating capsules:', err);
    process.exit(1);
});


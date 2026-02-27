import { ANIMATIONS } from '../core/Constants.js';
import { assets } from '../core/AssetLoader.js';
import { getLocalizedText, getFontForLanguage, getUIScale, LANGUAGE } from '../core/Language.js';
import { getLocalizedCharacterName } from '../data/Translations.js';

export class BaseScene {
    constructor() {
        this.manager = null;
    }

    enter(params) {}
    exit() {}
    update(timestamp) {}
    render(timestamp) {}
    handleInput(e) {}

    // Reusable selection system for menus and choices
    initSelection(options = {}) {
        const {
            defaultIndex = 0,
            totalOptions = 0
        } = options;
        
        this.selection = {
            highlightedIndex: defaultIndex,
            mouseoverEnabled: true,
            lastMouseX: -1,
            lastMouseY: -1,
            totalOptions: totalOptions
        };
    }

    updateSelectionMouse(currentMouseX, currentMouseY) {
        if (!this.selection) return;
        
        // Re-enable mouseover if mouse has moved
        if (currentMouseX !== this.selection.lastMouseX || currentMouseY !== this.selection.lastMouseY) {
            this.selection.mouseoverEnabled = true;
            this.selection.lastMouseX = currentMouseX;
            this.selection.lastMouseY = currentMouseY;
        }
    }

    handleSelectionMouseover(optionIndex) {
        if (!this.selection) return;
        if (this.selection.mouseoverEnabled && this.selection.highlightedIndex !== optionIndex) {
            this.selection.highlightedIndex = optionIndex;
        }
    }

    handleSelectionMouseClick() {
        if (!this.selection) return;
        this.selection.mouseoverEnabled = true;
    }

    handleSelectionKeyboard(e, onSelect) {
        if (!this.selection) return false;
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex - 1 + this.selection.totalOptions) % this.selection.totalOptions;
            assets.playSound('ui_click');
            return true;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex + 1) % this.selection.totalOptions;
            assets.playSound('ui_click');
            return true;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (onSelect) {
                onSelect(this.selection.highlightedIndex);
            }
            return true;
        }
        
        return false;
    }

    onNonMouseInput() {
        if (this.selection) this.selection.mouseoverEnabled = false;
        if (this.confirmSelection) this.confirmSelection.mouseoverEnabled = false;
    }

    onMouseInput(mouseX, mouseY) {
        if (this.selection) {
            this.selection.mouseoverEnabled = true;
            this.selection.lastMouseX = mouseX;
            this.selection.lastMouseY = mouseY;
        }
        if (this.confirmSelection) {
            this.confirmSelection.mouseoverEnabled = true;
            this.confirmSelection.lastMouseX = mouseX;
            this.confirmSelection.lastMouseY = mouseY;
        }
    }

    getMousePos(e) {
        const { canvas } = this.manager;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    buildDirectionalNavGraph(targets, options = {}) {
        const graph = [];
        if (!targets || targets.length === 0) return graph;
        const dirs = [
            { key: 'up', x: 0, y: -1 },
            { key: 'down', x: 0, y: 1 },
            { key: 'left', x: -1, y: 0 },
            { key: 'right', x: 1, y: 0 }
        ];
        const minForward = options.minForward !== undefined ? options.minForward : 4;
        const coneSlope = options.coneSlope !== undefined ? options.coneSlope : 2.0;
        const forwardWeight = options.forwardWeight !== undefined ? options.forwardWeight : 0.9;
        const lateralWeight = options.lateralWeight !== undefined ? options.lateralWeight : 1.35;
        const distanceWeight = options.distanceWeight !== undefined ? options.distanceWeight : 0.4;
        const wrap = options.wrap !== undefined ? options.wrap : true;

        for (let i = 0; i < targets.length; i++) {
            const cur = targets[i];
            const node = { up: -1, down: -1, left: -1, right: -1 };
            if (!cur) {
                graph.push(node);
                continue;
            }

            dirs.forEach(d => {
                let bestIdx = -1;
                let bestScore = Number.POSITIVE_INFINITY;
                for (let j = 0; j < targets.length; j++) {
                    if (j === i) continue;
                    const t = targets[j];
                    if (!t) continue;
                    const vx = t.x - cur.x;
                    const vy = t.y - cur.y;
                    const forward = vx * d.x + vy * d.y;
                    if (forward <= minForward) continue;
                    const lateral = Math.abs(vx * d.y - vy * d.x);
                    if (lateral > forward * coneSlope) continue;
                    const dist = Math.sqrt(vx * vx + vy * vy);
                    const score = forward * forwardWeight + lateral * lateralWeight + dist * distanceWeight;
                    if (score < bestScore) {
                        bestScore = score;
                        bestIdx = j;
                    }
                }

                if (bestIdx === -1 && wrap) {
                    // Wrap-around: choose the farthest target in the opposite direction, keeping lateral error low.
                    let wrapIdx = -1;
                    let wrapScore = Number.POSITIVE_INFINITY;
                    for (let j = 0; j < targets.length; j++) {
                        if (j === i) continue;
                        const t = targets[j];
                        if (!t) continue;
                        const vx = t.x - cur.x;
                        const vy = t.y - cur.y;
                        const forward = vx * d.x + vy * d.y;
                        const opposite = -forward; // larger means further "behind" us
                        if (opposite <= 0) continue;
                        const lateral = Math.abs(vx * d.y - vy * d.x);
                        const dist = Math.sqrt(vx * vx + vy * vy);
                        const score = lateral * 1.5 + dist * 0.1 - opposite * 0.5;
                        if (score < wrapScore) {
                            wrapScore = score;
                            wrapIdx = j;
                        }
                    }
                    bestIdx = wrapIdx;
                }

                node[d.key] = bestIdx;
            });
            graph.push(node);
        }
        return graph;
    }

    findDirectionalTargetIndex(currentIndex, targets, dirX, dirY, options = {}) {
        if (!targets || targets.length <= 1) return -1;
        if (currentIndex < 0 || currentIndex >= targets.length) return -1;
        let dirKey = null;
        if (dirY < 0) dirKey = 'up';
        else if (dirY > 0) dirKey = 'down';
        else if (dirX < 0) dirKey = 'left';
        else if (dirX > 0) dirKey = 'right';
        if (!dirKey) return -1;
        const graph = this.buildDirectionalNavGraph(targets, options);
        if (!graph[currentIndex]) return -1;
        return graph[currentIndex][dirKey];
    }

    navigateTargetIndex(currentIndex, targets, dirX, dirY, options = {}) {
        if (!targets || targets.length === 0) return -1;
        if (currentIndex < 0 || currentIndex >= targets.length) return 0;
        let nextIndex = this.findDirectionalTargetIndex(currentIndex, targets, dirX, dirY, options);
        if (nextIndex === -1 && targets.length > 0) {
            nextIndex = (currentIndex + 1) % targets.length;
        }
        return nextIndex;
    }

    activateNavigationTarget(target, handlers = {}, fallback = null) {
        if (!target) return false;
        const handler = handlers[target.type];
        if (typeof handler === 'function') {
            handler(target);
            return true;
        }
        if (typeof fallback === 'function') {
            fallback(target);
            return true;
        }
        return false;
    }

    activateNavigationIndex(targets, index, handlers = {}, fallback = null) {
        if (!targets || index < 0 || index >= targets.length) return false;
        return this.activateNavigationTarget(targets[index], handlers, fallback);
    }

    drawCharacter(ctx, img, action, frame, x, y, options = {}) {
        if (!img) return;
        const { flip = false, sinkOffset = 0, isSubmerged = false, tint = null, hideBottom = 0, scale = 1.0, isProp = false } = options;
        const sourceSize = 72;

        if (isProp) {
            // Props are single images, not spritesheets. Center them.
            ctx.save();
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            if (scale !== 1.0) ctx.scale(scale, scale);
            
            // Draw centered horizontally. 
            // For vertical, we align the visible bottom (assuming 5px padding) to the ground.
            const visibleHeight = img.height - 5;
            ctx.drawImage(img, -img.width / 2, -visibleHeight);
            ctx.restore();
            return;
        }

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;
        const feetY = -44;

        const drawPass = (alpha = 1.0, clipRect = null) => {
            ctx.save();
            if (clipRect) {
                ctx.beginPath();
                ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
                ctx.clip();
            }
            ctx.globalAlpha *= alpha;
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            if (scale !== 1.0) ctx.scale(scale, scale);
            
            if (tint) {
                // To tint ONLY the sprite and not the background already on the canvas,
                // we must use a temporary buffer.
                if (!this._tintCanvas) {
                    this._tintCanvas = document.createElement('canvas');
                    this._tintCanvas.width = sourceSize;
                    this._tintCanvas.height = sourceSize;
                    this._tintCtx = this._tintCanvas.getContext('2d');
                }
                const tctx = this._tintCtx;
                tctx.clearRect(0, 0, sourceSize, sourceSize);
                
                // 1. Draw sprite to temp
                tctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
                
                // 2. Tint it
                tctx.save();
                tctx.globalCompositeOperation = 'source-atop';
                tctx.fillStyle = tint;
                tctx.fillRect(0, 0, sourceSize, sourceSize);
                tctx.restore();
                
                // 3. Draw temp back to main
                ctx.drawImage(this._tintCanvas, -36, feetY);
            } else {
                // Draw normally
                ctx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            }
            
            ctx.restore();
        };

        if (isSubmerged) {
            // Above water
            drawPass(1.0, { x: x - 40, y: y - 100, w: 80, h: 100 });
            // Below water
            drawPass(0.4, { x: x - 40, y: y, w: 80, h: 100 });
        } else if (hideBottom > 0) {
            // Hide N pixels from the absolute bottom of the 72x72 sprite
            // The bottom of the sprite is at anchor (y + sinkOffset) + 28 pixels (since feetY is -44)
            const spriteBottomY = y + sinkOffset + 28;
            const clipY = spriteBottomY - hideBottom;
            drawPass(1.0, { x: x - 40, y: y - 100, w: 80, h: clipY - (y - 100) });
        } else {
            drawPass(1.0);
        }
    }

    checkCharacterHit(img, action, frame, x, y, clickX, clickY, options = {}) {
        if (!img) return false;
        const { flip = false, sinkOffset = 0, isProp = false, alphaThreshold = 254 } = options;
        const sourceSize = 72;

        if (isProp) {
            const bx = x - img.width / 2;
            const by = y + sinkOffset - (img.height - 5);
            if (clickX < bx || clickX > bx + img.width || clickY < by || clickY > by + img.height) {
                return false;
            }
            // Pixel perfect check for props
            if (!this._hitCanvas) {
                this._hitCanvas = document.createElement('canvas');
                this._hitCanvas.width = 1;
                this._hitCanvas.height = 1;
                this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
            }
            const hctx = this._hitCtx;
            hctx.clearRect(0, 0, 1, 1);
            hctx.save();
            hctx.translate(-(clickX - bx), -(clickY - by));
            if (flip) {
                hctx.translate(img.width / 2, 0);
                hctx.scale(-1, 1);
                hctx.translate(-img.width / 2, 0);
            }
            hctx.drawImage(img, 0, 0);
            hctx.restore();
            const alpha = hctx.getImageData(0, 0, 1, 1).data[3];
            return alpha > alphaThreshold;
        }

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;
        const feetY = -44;

        // 1. Quick bounding box check
        const bx = x - 36;
        const by = y + feetY + sinkOffset;
        if (clickX < bx || clickX > bx + sourceSize || clickY < by || clickY > by + sourceSize) {
            return false;
        }

        // 2. Pixel-perfect check using a tiny offscreen canvas
        if (!this._hitCanvas) {
            this._hitCanvas = document.createElement('canvas');
            this._hitCanvas.width = 1;
            this._hitCanvas.height = 1;
            this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
        }

        const hctx = this._hitCtx;
        hctx.clearRect(0, 0, 1, 1);
        hctx.save();
        
        // Translate such that the click point is at (0,0) in our 1x1 canvas
        hctx.translate(-(clickX - bx), -(clickY - by));
        
        if (flip) {
            // If flipped, we need to flip the drawing relative to the sprite center
            // Sprite center relative to bx is sourceSize / 2
            hctx.translate(sourceSize / 2, 0);
            hctx.scale(-1, 1);
            hctx.translate(-sourceSize / 2, 0);
        }

        hctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
        hctx.restore();

        const alpha = hctx.getImageData(0, 0, 1, 1).data[3];
        return alpha > alphaThreshold;
    }

    /**
     * Pixel-perfect hit test for a generic image frame rendered at a given top-left.
     * Useful for non-spritesheet assets like horses (64x64 frames) where bounding-box hits block clicks.
     *
     * @param {HTMLImageElement|HTMLCanvasElement} img
     * @param {number} srcX - Source X within img (frame start)
     * @param {number} srcY - Source Y within img (frame start)
     * @param {number} srcW - Frame width
     * @param {number} srcH - Frame height
     * @param {number} destX - Destination top-left X on canvas
     * @param {number} destY - Destination top-left Y on canvas
     * @param {number} clickX - Click X
     * @param {number} clickY - Click Y
     * @param {{flip?: boolean, alphaThreshold?: number}} options
     */
    checkImageFrameHit(img, srcX, srcY, srcW, srcH, destX, destY, clickX, clickY, options = {}) {
        if (!img) return false;
        const { flip = false, alphaThreshold = 254 } = options;

        if (clickX < destX || clickX > destX + srcW || clickY < destY || clickY > destY + srcH) {
            return false;
        }

        // Pixel-perfect check using a tiny offscreen canvas (reuses the same 1x1 buffer)
        if (!this._hitCanvas) {
            this._hitCanvas = document.createElement('canvas');
            this._hitCanvas.width = 1;
            this._hitCanvas.height = 1;
            this._hitCtx = this._hitCanvas.getContext('2d', { willReadFrequently: true });
        }

        const localXRaw = Math.floor(clickX - destX);
        const localX = flip ? (srcW - 1 - localXRaw) : localXRaw;
        const localY = Math.floor(clickY - destY);

        if (localX < 0 || localX >= srcW || localY < 0 || localY >= srcH) return false;

        const hctx = this._hitCtx;
        hctx.clearRect(0, 0, 1, 1);
        // Copy a single pixel from the source frame to (0,0)
        hctx.drawImage(img, srcX + localX, srcY + localY, 1, 1, 0, 0, 1, 1);
        const alpha = hctx.getImageData(0, 0, 1, 1).data[3];
        return alpha > alphaThreshold;
    }

    drawCharacterPixelOutline(ctx, img, action, frame, x, y, options = {}) {
        if (!img) return;
        const { flip = false, sinkOffset = 0, color = '#ffd700', alphaThreshold = 254 } = options;
        const sourceSize = 72;
        const feetY = -44;

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;

        if (!this._outlineSrcCanvas) {
            this._outlineSrcCanvas = document.createElement('canvas');
            this._outlineSrcCanvas.width = sourceSize;
            this._outlineSrcCanvas.height = sourceSize;
            this._outlineSrcCtx = this._outlineSrcCanvas.getContext('2d', { willReadFrequently: true });
            this._outlineDstCanvas = document.createElement('canvas');
            this._outlineDstCanvas.width = sourceSize;
            this._outlineDstCanvas.height = sourceSize;
            this._outlineDstCtx = this._outlineDstCanvas.getContext('2d');
        }

        const srcCtx = this._outlineSrcCtx;
        const dstCtx = this._outlineDstCtx;
        srcCtx.clearRect(0, 0, sourceSize, sourceSize);
        dstCtx.clearRect(0, 0, sourceSize, sourceSize);
        srcCtx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);

        const srcData = srcCtx.getImageData(0, 0, sourceSize, sourceSize);
        const outData = dstCtx.createImageData(sourceSize, sourceSize);
        const rgb = this._hexToRgb(color);
        const w = sourceSize;
        const h = sourceSize;

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const idx = (py * w + px) * 4;
                const a = srcData.data[idx + 3];
                if (a > alphaThreshold) continue;

                let edge = false;
                for (let oy = -1; oy <= 1 && !edge; oy++) {
                    for (let ox = -1; ox <= 1; ox++) {
                        if (ox === 0 && oy === 0) continue;
                        const nx = px + ox;
                        const ny = py + oy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        const nIdx = (ny * w + nx) * 4;
                        if (srcData.data[nIdx + 3] > alphaThreshold) {
                            edge = true;
                            break;
                        }
                    }
                }

                if (edge) {
                    outData.data[idx] = rgb.r;
                    outData.data[idx + 1] = rgb.g;
                    outData.data[idx + 2] = rgb.b;
                    outData.data[idx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(outData, 0, 0);

        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(this._outlineDstCanvas, -36, feetY, sourceSize, sourceSize);
        ctx.restore();
    }

    drawImageFramePixelOutline(ctx, img, srcX, srcY, srcW, srcH, destX, destY, options = {}) {
        if (!img) return;
        const { flip = false, color = '#ffd700', alphaThreshold = 254 } = options;
        if (srcW <= 0 || srcH <= 0) return;

        if (
            !this._outlineFrameSrcCanvas ||
            this._outlineFrameSrcCanvas.width !== srcW ||
            this._outlineFrameSrcCanvas.height !== srcH
        ) {
            this._outlineFrameSrcCanvas = document.createElement('canvas');
            this._outlineFrameSrcCanvas.width = srcW;
            this._outlineFrameSrcCanvas.height = srcH;
            this._outlineFrameSrcCtx = this._outlineFrameSrcCanvas.getContext('2d', { willReadFrequently: true });
            this._outlineFrameDstCanvas = document.createElement('canvas');
            this._outlineFrameDstCanvas.width = srcW;
            this._outlineFrameDstCanvas.height = srcH;
            this._outlineFrameDstCtx = this._outlineFrameDstCanvas.getContext('2d');
        }

        const srcCtx = this._outlineFrameSrcCtx;
        const dstCtx = this._outlineFrameDstCtx;
        srcCtx.clearRect(0, 0, srcW, srcH);
        dstCtx.clearRect(0, 0, srcW, srcH);
        srcCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

        const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
        const outData = dstCtx.createImageData(srcW, srcH);
        const rgb = this._hexToRgb(color);

        for (let py = 0; py < srcH; py++) {
            for (let px = 0; px < srcW; px++) {
                const idx = (py * srcW + px) * 4;
                const a = srcData.data[idx + 3];
                if (a > alphaThreshold) continue;

                let edge = false;
                for (let oy = -1; oy <= 1 && !edge; oy++) {
                    for (let ox = -1; ox <= 1; ox++) {
                        if (ox === 0 && oy === 0) continue;
                        const nx = px + ox;
                        const ny = py + oy;
                        if (nx < 0 || nx >= srcW || ny < 0 || ny >= srcH) continue;
                        const nIdx = (ny * srcW + nx) * 4;
                        if (srcData.data[nIdx + 3] > alphaThreshold) {
                            edge = true;
                            break;
                        }
                    }
                }

                if (edge) {
                    outData.data[idx] = rgb.r;
                    outData.data[idx + 1] = rgb.g;
                    outData.data[idx + 2] = rgb.b;
                    outData.data[idx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(outData, 0, 0);

        ctx.save();
        if (flip) {
            ctx.translate(Math.floor(destX + srcW), Math.floor(destY));
            ctx.scale(-1, 1);
            ctx.drawImage(this._outlineFrameDstCanvas, 0, 0, srcW, srcH);
        } else {
            ctx.drawImage(this._outlineFrameDstCanvas, Math.floor(destX), Math.floor(destY), srcW, srcH);
        }
        ctx.restore();
    }

    _hexToRgb(hex) {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
            return { r: 255, g: 215, b: 0 };
        }
        const clean = hex.slice(1);
        const expanded = clean.length === 3
            ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
            : clean;
        if (expanded.length !== 6) return { r: 255, g: 215, b: 0 };
        return {
            r: parseInt(expanded.slice(0, 2), 16),
            g: parseInt(expanded.slice(2, 4), 16),
            b: parseInt(expanded.slice(4, 6), 16)
        };
    }

    wrapText(ctx, text, maxWidth, font = '8px Tiny5') {
        if (!text) return [];
        
        const lines = [];
        ctx.save();
        ctx.font = getFontForLanguage(font);
        
        // Check if text contains Chinese characters (CJK Unified Ideographs)
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        
        if (hasChinese) {
            // Chinese: wrap by character (no spaces)
            let currentLine = '';
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const testLine = currentLine + char;
                // Subtract buffer for Chinese (characters are wider)
                if (ctx.measureText(testLine).width > maxWidth - 6 && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
        } else {
            // English: wrap by word (spaces)
            const words = text.split(' ');
            let currentLine = '';
            for (let n = 0; n < words.length; n++) {
                let testLine = currentLine + (currentLine ? ' ' : '') + words[n];
                // Subtract a small buffer (4px) to account for font rendering variations and ellipsis
                if (ctx.measureText(testLine).width > maxWidth - 4 && n > 0) {
                    lines.push(currentLine.trim());
                    currentLine = words[n];
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine.trim()) lines.push(currentLine.trim());
        }
        
        ctx.restore();
        return lines;
    }

    renderDialogueBox(ctx, canvas, step, options = {}) {
        const { subStep = 0, bgImg = null } = options;
        const margin = 5;
        // Keep panel height at original size (60px) - fits 3 lines English, 2 lines Chinese
        const panelHeight = 60;
        const panelWidth = canvas.width - margin * 2;
        const px = margin;
        
        const position = step.position || 'bottom';
        const py = position === 'top' ? margin : canvas.height - panelHeight - margin;

        // Panel
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        ctx.fillRect(px, py, panelWidth, panelHeight);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

        // Portrait Box (Adjusted for 40x48)
        const portraitW = 40;
        const portraitH = 48;
        const portraitX = px + 6;
        const portraitY = py + 6;
        
        // Portrait Background/Border
        ctx.fillStyle = '#000';
        ctx.fillRect(portraitX - 1, portraitY - 1, portraitW + 2, portraitH + 2);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(portraitX - 0.5, portraitY - 0.5, portraitW + 1, portraitH + 1);

        const speakerToPortraitKey = {
            liubei: 'liu-bei',
            guanyu: 'guan-yu',
            zhangfei: 'zhang-fei',
            caocao: 'cao-cao',
            caoren: 'cao-ren',
            dongzhuo: 'dong-zhuo',
            zhangjue: 'zhang-jiao',
            zhangliang: 'zhang-liang',
            zhangbao: 'zhang-bao',
            dengmao: 'deng-mao',
            chengyuanzhi: 'cheng-yuanzhi',
            huangfusong: 'huangfu-song-generic',
            zhujun: 'zhu-jun-generic',
            luzhi: 'lu-zhi',
            gongjing: 'gong-jing',
            zhoujing: 'zhou-jing',
            soldier: 'soldier',
            farmer: 'farmer',
            farmer2: 'farmer2',
            merchant: 'merchant',
            blacksmith: 'blacksmith',
            xiaoer: 'xiaoer',
            yellowturban: 'yellowturban',
            narrator: 'narrator',
            noticeboard: 'noticeboard'
        };
        const nameToPortraitKey = {
            'liu bei': 'liu-bei',
            'guan yu': 'guan-yu',
            'zhang fei': 'zhang-fei',
            'cao cao': 'cao-cao',
            'cao ren': 'cao-ren',
            'dong zhuo': 'dong-zhuo',
            'zhang jue': 'zhang-jiao',
            'zhang liang': 'zhang-liang',
            'zhang bao': 'zhang-bao',
            'deng mao': 'deng-mao',
            'cheng yuanzhi': 'cheng-yuanzhi',
            'huangfu song': 'huangfu-song-generic',
            'zhu jun': 'zhu-jun-generic',
            'lu zhi': 'lu-zhi',
            'commander lu zhi': 'lu-zhi',
            'gong jing': 'gong-jing',
            'zhou jing': 'zhou-jing',
            villager: 'farmer',
            farmer: 'farmer',
            merchant: 'merchant',
            blacksmith: 'blacksmith',
            narrator: 'narrator'
        };
        const legacyPortraitAliases = {
            liubei: 'liu-bei',
            guanyu: 'guan-yu',
            zhangfei: 'zhang-fei',
            caocao: 'cao-cao',
            caoren: 'cao-ren',
            dongzhuo: 'dong-zhuo',
            zhangjiao: 'zhang-jiao',
            zhangbao: 'zhang-bao',
            zhangliang: 'zhang-liang',
            luzhi: 'lu-zhi',
            gongjing: 'gong-jing',
            dengmao: 'deng-mao',
            chengyuanzhi: 'cheng-yuanzhi',
            zhoujing: 'zhou-jing',
            yellowturban: 'yellow-turban'
        };
        const portraitAssetKeyById = {
            'liu-bei': 'Liu-Bei',
            'guan-yu': 'Guan-Yu',
            'zhang-fei': 'Zhang-Fei',
            'cao-cao': 'Cao-Cao',
            'cao-ren': 'Cao-Ren',
            'zhou-jing': 'Zhou-Jing',
            'deng-mao': 'Deng-Mao',
            'cheng-yuanzhi': 'Cheng-Yuanzhi',
            'dong-zhuo': 'Dong-Zhuo',
            'zhang-jiao': 'Zhang-Jiao',
            'zhang-bao': 'Zhang-Bao',
            'zhang-liang': 'Zhang-Liang',
            'huangfu-song-generic': 'Huangfu-Song-generic',
            'zhu-jun-generic': 'Zhu-Jun-generic',
            'farmer': 'farmer',
            'farmer-v1': 'farmer-v1',
            'farmer-v2': 'farmer-v2',
            'farmer-v3': 'farmer-v3',
            'farmer-v4': 'farmer-v4',
            'farmer-v5': 'farmer-v5',
            'farmer-female': 'farmer-female',
            'merchant': 'merchant',
            'blacksmith': 'blacksmith',
            'xiaoer': 'xiaoer',
            'soldier': 'soldier',
            'soldier-v1': 'soldier-v1',
            'soldier-v2': 'soldier-v2',
            'soldier-v3': 'soldier-v3',
            'soldier-v4': 'soldier-v4',
            'soldier-v5': 'soldier-v5',
            'gong-jing': 'Gong-Jing',
            'lu-zhi': 'Lu-Zhi',
            'yellow-turban': 'Yellow-Turban'
        };

        // Try to find a dedicated portrait first
        let portraitImg = null;
        const rawSpeaker = (step.speaker || '').trim();
        const speakerKey = rawSpeaker.toLowerCase();
        const nameKey = (step.name || '').trim().toLowerCase();
        const rawPortraitId =
            ((step.portraitKey && String(step.portraitKey)) ||
            speakerToPortraitKey[speakerKey] ||
            nameToPortraitKey[nameKey] ||
            rawSpeaker ||
            '')
                .trim()
                .toLowerCase();
        let resolvedPortraitId = legacyPortraitAliases[rawPortraitId] || rawPortraitId || null;

        const genericName = (step.name || '').trim().toLowerCase();
        if (genericName === 'yellow turban' || step.speaker === 'yellowturban') {
            // Non-named rebels should use the generic battlefield sprite portrait.
            resolvedPortraitId = 'yellow-turban';
        }
        step.portraitKey = resolvedPortraitId;

        const isNoticeboard = resolvedPortraitId === 'noticeboard' || (step.name && step.name.toLowerCase().includes('noticeboard'));
        const isNarrator = resolvedPortraitId === 'narrator' || !step.name || step.name.toLowerCase() === 'narrator';

        // Force Narrator name if not set
        if (isNarrator && (!step.name || step.name.toLowerCase() === 'narrator')) {
            step.name = 'Narrator';
        }

        const portraitToSpriteKey = {
            'liu-bei': 'liubei',
            'guan-yu': 'guanyu',
            'zhang-fei': 'zhangfei',
            'cao-cao': 'caocao',
            'cao-ren': 'caoren',
            'zhou-jing': 'zhoujing',
            'dong-zhuo': 'dongzhuo',
            'zhang-bao': 'zhangbao',
            'zhang-jiao': 'zhangjiao',
            'zhang-liang': 'zhangliang',
            'gong-jing': 'gongjing_sprite',
            'lu-zhi': 'zhoujing',
            'huangfu-song-generic': 'huangfusong_sprite',
            'zhu-jun-generic': 'zhujun_sprite',
            'yellow-turban': 'yellowturban'
        };
        if (isNoticeboard || isNarrator) {
            let useBg = bgImg;
            if (isNarrator && !useBg) {
                // Default narrator background to peach garden for a nice visual
                useBg = assets.getImage('peach_garden');
            }

            if (useBg) {
                // Special case: Crop the center of the background image
                const cw = useBg.width;
                const ch = useBg.height;
                const cropX = Math.floor((cw - portraitW) / 2);
                const cropY = Math.floor((ch - portraitH) / 2);
                ctx.drawImage(useBg, cropX, cropY, portraitW, portraitH, portraitX, portraitY, portraitW, portraitH);
            }
            // If no bgImg, it just stays black (narrator/noticeboard default)
        } else if (resolvedPortraitId) {
            const dedicatedPortraitKey = portraitAssetKeyById[resolvedPortraitId];
            if (dedicatedPortraitKey) {
                portraitImg = assets.getImage(`portrait_${dedicatedPortraitKey}`);
            }

            if (!portraitImg) {
                // Universal fallback: zoomed sprite portrait from the actor sheet.
                const rawKey = resolvedPortraitId || '';
                const normalizedKey = rawKey.replace(/-/g, '').toLowerCase();
                const mappedKey = portraitToSpriteKey[rawKey] || portraitToSpriteKey[normalizedKey] || null;
                const spriteImg =
                    assets.getImage(rawKey) ||
                    (mappedKey ? assets.getImage(mappedKey) : null) ||
                    assets.getImage(normalizedKey) ||
                    (step.speaker ? assets.getImage(step.speaker) : null);
                if (spriteImg) {
                    if (step.portraitRect) {
                        const crop = step.portraitRect;
                        ctx.drawImage(spriteImg, crop.x, crop.y, crop.w, crop.h, portraitX, portraitY, portraitW, portraitH);
                    } else {
                        // 1) Zoom frame 0, then 2) crop to exact 40x48 panel size.
                        const frameH = spriteImg.height;
                        const frameW = Math.min(frameH, spriteImg.width);
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = frameW;
                        frameCanvas.height = frameH;
                        const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
                        frameCtx.imageSmoothingEnabled = false;
                        frameCtx.drawImage(spriteImg, 0, 0, frameW, frameH, 0, 0, frameW, frameH);

                        const zoom = 2;
                        const zoomW = frameW * zoom;
                        const zoomH = frameH * zoom;
                        const zoomCanvas = document.createElement('canvas');
                        zoomCanvas.width = zoomW;
                        zoomCanvas.height = zoomH;
                        const zoomCtx = zoomCanvas.getContext('2d', { willReadFrequently: true });
                        zoomCtx.imageSmoothingEnabled = false;
                        zoomCtx.drawImage(frameCanvas, 0, 0, frameW, frameH, 0, 0, zoomW, zoomH);

                        const cropW = 40;
                        const cropH = 48;
                        // Deterministic crop window (after zoom) so weapons/props do not shift framing.
                        let cropX = Math.floor((zoomW - cropW) / 2);
                        let cropY = Math.floor(zoomH * 0.26);
                        cropX = Math.max(0, Math.min(zoomW - cropW, cropX));
                        cropY = Math.max(0, Math.min(zoomH - cropH, cropY));
                        ctx.drawImage(zoomCanvas, cropX, cropY, cropW, cropH, portraitX, portraitY, portraitW, portraitH);
                    }
                }
            } else {
                // Draw dedicated portrait at native 1:1 resolution
                ctx.drawImage(portraitImg, portraitX, portraitY, portraitW, portraitH);
            }
        }

        // Name
        const textX = portraitX + portraitW + 8;
        const localizedName = getLocalizedCharacterName(step.name);
        const nameText = localizedName ? (LANGUAGE.current === 'zh' ? localizedName : localizedName.toUpperCase()) : '';
        this.drawPixelText(ctx, nameText, textX, py + 6, { color: '#ffd700', font: '8px Silkscreen' });

        // Text
        const textPaddingRight = 15;
        const maxWidth = panelWidth - (textX - px) - textPaddingRight;
        if (!step.text) {
            console.error('renderDialogueBox: step.text is missing:', step);
        }
        const localizedText = getLocalizedText(step.text);
        if (!localizedText) {
            console.error('renderDialogueBox: getLocalizedText returned empty string for step:', step, 'Current language:', LANGUAGE.current);
        }
        // Chinese: limit to 2 lines max, English: 3 lines max
        const maxLines = LANGUAGE.current === 'zh' ? 2 : 3;
        const ellipsis = LANGUAGE.current === 'zh' ? '…' : '...';
        const fullText = localizedText || '';
        const hasChinese = /[\u4e00-\u9fff]/.test(fullText);
        let displayLines = [];
        let hasNextChunk = false;
        let totalLines = 0;

        ctx.save();
        ctx.font = getFontForLanguage('8px Dogica');

        if (!hasChinese) {
            // Build English chunks by consumed word ranges so we never lose partial words between pages.
            const words = [];
            const wordRegex = /\S+/g;
            let match;
            while ((match = wordRegex.exec(fullText)) !== null) {
                words.push({ text: match[0], start: match.index, end: match.index + match[0].length });
            }

            const wrapWordRanges = (startWordIdx = 0) => {
                const wrapped = [];
                let i = startWordIdx;
                while (i < words.length) {
                    const lineStart = i;
                    let lineText = words[i].text;
                    i++;
                    while (i < words.length) {
                        const candidate = `${lineText} ${words[i].text}`;
                        if (ctx.measureText(candidate).width > maxWidth - 4) break;
                        lineText = candidate;
                        i++;
                    }
                    wrapped.push({ text: lineText, startWord: lineStart, endWord: i - 1 });
                }
                return wrapped;
            };

            const chunks = [];
            let cursorWord = 0;
            while (cursorWord < words.length) {
                const wrapped = wrapWordRanges(cursorWord);
                totalLines += wrapped.length;
                if (wrapped.length <= maxLines) {
                    chunks.push({ lines: wrapped.map(l => l.text), hasNext: false });
                    break;
                }

                const page = wrapped.slice(0, maxLines);
                let lastLine = page[page.length - 1].text;
                let endWord = page[page.length - 1].endWord;

                // Ensure ellipsis still ends on a full word boundary.
                while (endWord > page[page.length - 1].startWord && ctx.measureText(`${lastLine}${ellipsis}`).width > maxWidth) {
                    endWord--;
                    const wordsSlice = words.slice(page[page.length - 1].startWord, endWord + 1).map(w => w.text);
                    lastLine = wordsSlice.join(' ');
                }

                const pageLines = page.map(l => l.text);
                pageLines[pageLines.length - 1] = `${lastLine}${ellipsis}`;
                chunks.push({ lines: pageLines, hasNext: true });
                cursorWord = endWord + 1;
            }

            const safeSubStep = Math.max(0, Math.min(subStep, Math.max(0, chunks.length - 1)));
            const chunk = chunks[safeSubStep] || { lines: [], hasNext: false };
            displayLines = chunk.lines;
            hasNextChunk = chunk.hasNext;
        } else {
            // Keep Chinese wrapping behavior; char-level wrapping is expected for CJK text.
            const lines = this.wrapText(ctx, fullText, maxWidth, '8px Dogica');
            totalLines = lines.length;
            const start = subStep * maxLines;
            hasNextChunk = (subStep + 1) * maxLines < lines.length;
            displayLines = lines.slice(start, start + maxLines);
            if (hasNextChunk && displayLines.length > 0) {
                const lastLine = displayLines[displayLines.length - 1];
                if (ctx.measureText(`${lastLine}${ellipsis}`).width <= maxWidth) {
                    displayLines[displayLines.length - 1] = `${lastLine}${ellipsis}`;
                } else {
                    let shortened = lastLine;
                    while (ctx.measureText(`${shortened}${ellipsis}`).width > maxWidth && shortened.length > 0) {
                        shortened = shortened.slice(0, -1);
                    }
                    displayLines[displayLines.length - 1] = `${shortened}${ellipsis}`;
                }
            }
        }
        ctx.restore();
        
        // Adjust line spacing for Chinese (larger font) - but keep panel same size
        const lineSpacing = LANGUAGE.current === 'zh' ? 16 : 12;
        let lineY = py + 20;
        displayLines.forEach((line, i) => {
            this.drawPixelText(ctx, line, textX, lineY, { color: '#eee', font: '8px Dogica' });
            lineY += lineSpacing;
        });

        // Click prompt - show right arrow if there's more text, otherwise show double arrow for next dialogue
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#eee';
        const arrowX = px + panelWidth - 10;
        const arrowY = py + panelHeight - 9;
        
        if (hasNextChunk) {
            // Draw single right arrow (→) when there's more text to read in current dialogue
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX + 5, arrowY + 3);
            ctx.lineTo(arrowX, arrowY + 6);
            ctx.closePath();
            ctx.fill();
        } else {
            // Draw double right arrow (») when clicking will advance to next dialogue
            // Draw two triangles side by side
            ctx.beginPath();
            // First triangle
            ctx.moveTo(arrowX - 4, arrowY);
            ctx.lineTo(arrowX - 4 + 5, arrowY + 3);
            ctx.lineTo(arrowX - 4, arrowY + 6);
            ctx.closePath();
            ctx.fill();
            // Second triangle
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX + 5, arrowY + 3);
            ctx.lineTo(arrowX, arrowY + 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        return { hasNextChunk, totalLines };
    }

    drawPixelText(ctx, text, x, y, options = {}) {
        if (!text) return null;
        const { 
            color = '#eee', 
            font = '8px Silkscreen', 
            align = 'left',
            outline = false,
            outlineColor = '#000'
        } = options;
        
        ctx.save();
        // Use language-appropriate font
        ctx.font = getFontForLanguage(font);
        ctx.textAlign = align; 
        ctx.textBaseline = 'top'; 
        
        if (outline) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.strokeText(text, x, y);
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        const metrics = ctx.measureText(text);
        ctx.restore();
        return metrics;
    }
}

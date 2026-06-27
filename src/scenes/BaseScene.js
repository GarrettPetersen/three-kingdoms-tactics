import { ANIMATIONS } from '../core/Constants.js';
import { assets } from '../core/AssetLoader.js';
import { getLocalizedText, getFontForLanguage, getUIScale, LANGUAGE } from '../core/Language.js';
import { getLocalizedCharacterName } from '../data/Translations.js';
import {
    getPortraitAssetKey,
    getSpriteKeyForPortrait,
    isNarratorPortrait,
    isNoticeboardPortrait,
    resolvePortraitId
} from '../data/PortraitRegistry.js';

export class BaseScene {
    constructor() {
        this.manager = null;
        this._outlineImageIds = new WeakMap();
        this._nextOutlineImageId = 1;
        this._characterOutlineCache = new Map();
        this._imageFrameOutlineCache = new Map();
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
        if (this.manager?.getCanvasLogicalPoint) {
            return this.manager.getCanvasLogicalPoint(e);
        }
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
        const {
            flip = false,
            sinkOffset = 0,
            isSubmerged = false,
            tint = null,
            hideBottom = 0,
            scale = 1.0,
            isProp = false,
            propBottomPadding = 5,
            waterMaskCanvas = null,
            waterEffectTime = 0,
            waterClipRect = null
        } = options;
        const sourceSize = 72;

        if (isProp) {
            // Props are single images, not spritesheets. Center them.
            ctx.save();
            ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
            if (flip) ctx.scale(-1, 1);
            if (scale !== 1.0) ctx.scale(scale, scale);
            
            // Draw centered horizontally. For vertical, align the visible bottom to the ground.
            const bottomPadding = Number.isFinite(propBottomPadding) ? propBottomPadding : 5;
            const visibleHeight = img.height - bottomPadding;
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

        const drawSpriteFrame = (targetCtx) => {
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
                targetCtx.drawImage(this._tintCanvas, -36, feetY);
            } else {
                // Draw normally
                targetCtx.drawImage(img, sx, sy, sourceSize, sourceSize, -36, feetY, sourceSize, sourceSize);
            }
        };

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
            drawSpriteFrame(ctx);
            
            ctx.restore();
        };

        if (isSubmerged) {
            const defaultWaterClip = { x: x - 40, y, w: 80, h: 100 };
            const submergedClip = waterClipRect === false ? null : (waterClipRect || defaultWaterClip);
            if (waterMaskCanvas && this.drawWaterMaskedPass(ctx, {
                x,
                y: y + sinkOffset,
                scale,
                flip,
                bounds: {
                    x: Math.floor(x - 42 * scale),
                    y: Math.floor(y + sinkOffset + feetY * scale - 4),
                    w: Math.ceil(sourceSize * scale + 12),
                    h: Math.ceil(sourceSize * scale + 12)
                },
                maskCanvas: waterMaskCanvas,
                time: waterEffectTime,
                eligibilityClip: submergedClip,
                drawSource: (targetCtx) => {
                    targetCtx.save();
                    targetCtx.translate(Math.floor(x), Math.floor(y + sinkOffset));
                    if (flip) targetCtx.scale(-1, 1);
                    if (scale !== 1.0) targetCtx.scale(scale, scale);
                    drawSpriteFrame(targetCtx);
                    targetCtx.restore();
                }
            })) {
                return;
            }
            // Fallback: rectangular split if the map mask is unavailable.
            drawPass(1.0, { x: x - 40, y: y - 100, w: 80, h: 100 });
            drawPass(0.4, defaultWaterClip);
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

    ensureWaterEffectCanvas(name, width, height) {
        const canvasKey = `_${name}Canvas`;
        const ctxKey = `_${name}Ctx`;
        if (!this[canvasKey]) {
            this[canvasKey] = document.createElement('canvas');
            this[ctxKey] = this[canvasKey].getContext('2d');
        }
        const canvas = this[canvasKey];
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return { canvas, ctx: this[ctxKey] };
    }

    drawWaterMaskedPass(ctx, options = {}) {
        const {
            bounds,
            maskCanvas,
            time = 0,
            eligibilityClip = null,
            drawSource
        } = options;
        if (!maskCanvas || !drawSource || !ctx?.canvas || !bounds) return false;

        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        const sx = Math.max(0, Math.floor(bounds.x));
        const sy = Math.max(0, Math.floor(bounds.y));
        const ex = Math.min(canvasW, Math.ceil(bounds.x + bounds.w));
        const ey = Math.min(canvasH, Math.ceil(bounds.y + bounds.h));
        const w = ex - sx;
        const h = ey - sy;
        if (w <= 0 || h <= 0) return false;

        const sprite = this.ensureWaterEffectCanvas('waterSprite', canvasW, canvasH);
        const dry = this.ensureWaterEffectCanvas('waterDry', canvasW, canvasH);
        const wet = this.ensureWaterEffectCanvas('waterWet', canvasW, canvasH);
        const refracted = this.ensureWaterEffectCanvas('waterRefracted', canvasW, canvasH);
        const eligible = this.ensureWaterEffectCanvas('waterEligibleMask', canvasW, canvasH);

        sprite.ctx.clearRect(sx, sy, w, h);
        dry.ctx.clearRect(sx, sy, w, h);
        wet.ctx.clearRect(sx, sy, w, h);
        refracted.ctx.clearRect(sx, sy, w, h);
        eligible.ctx.clearRect(sx, sy, w, h);

        drawSource(sprite.ctx);

        eligible.ctx.save();
        if (eligibilityClip) {
            eligible.ctx.beginPath();
            eligible.ctx.rect(
                Math.floor(eligibilityClip.x),
                Math.floor(eligibilityClip.y),
                Math.ceil(eligibilityClip.w),
                Math.ceil(eligibilityClip.h)
            );
            eligible.ctx.clip();
        }
        eligible.ctx.drawImage(maskCanvas, sx, sy, w, h, sx, sy, w, h);
        eligible.ctx.restore();

        dry.ctx.drawImage(sprite.canvas, sx, sy, w, h, sx, sy, w, h);
        dry.ctx.save();
        dry.ctx.globalCompositeOperation = 'destination-out';
        dry.ctx.drawImage(eligible.canvas, sx, sy, w, h, sx, sy, w, h);
        dry.ctx.restore();

        wet.ctx.drawImage(sprite.canvas, sx, sy, w, h, sx, sy, w, h);
        wet.ctx.save();
        wet.ctx.globalCompositeOperation = 'destination-in';
        wet.ctx.drawImage(eligible.canvas, sx, sy, w, h, sx, sy, w, h);
        wet.ctx.restore();
        wet.ctx.save();
        wet.ctx.globalCompositeOperation = 'source-atop';
        wet.ctx.fillStyle = 'rgba(70, 150, 185, 0.14)';
        wet.ctx.fillRect(sx, sy, w, h);
        wet.ctx.restore();

        ctx.drawImage(dry.canvas, sx, sy, w, h, sx, sy, w, h);

        const phase = time * 0.0018;
        const stripH = 2;
        for (let row = sy; row < ey; row += stripH) {
            const rowH = Math.min(stripH, ey - row);
            const offsetX = Math.round(Math.sin(phase + row * 0.22) * 1.15);
            const squeezeY = Math.round((row - sy) * -0.02);
            refracted.ctx.drawImage(wet.canvas, sx, row, w, rowH, sx + offsetX, row + squeezeY, w, rowH);
        }
        refracted.ctx.save();
        refracted.ctx.globalCompositeOperation = 'destination-in';
        refracted.ctx.drawImage(eligible.canvas, sx, sy, w, h, sx, sy, w, h);
        refracted.ctx.restore();

        ctx.save();
        ctx.globalAlpha *= 0.46;
        ctx.drawImage(refracted.canvas, sx, sy, w, h, sx, sy, w, h);
        ctx.restore();

        sprite.ctx.clearRect(sx, sy, w, h);
        dry.ctx.clearRect(sx, sy, w, h);
        wet.ctx.clearRect(sx, sy, w, h);
        refracted.ctx.clearRect(sx, sy, w, h);
        eligible.ctx.clearRect(sx, sy, w, h);
        return true;
    }

    checkCharacterHit(img, action, frame, x, y, clickX, clickY, options = {}) {
        if (!img) return false;
        const { flip = false, sinkOffset = 0, isProp = false, alphaThreshold = 254, scale = 1.0, propBottomPadding = 5 } = options;
        const sourceSize = 72;

        if (isProp) {
            const propScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
            const bottomPadding = Number.isFinite(propBottomPadding) ? propBottomPadding : 5;
            const drawW = img.width * propScale;
            const drawH = img.height * propScale;
            const bx = x - drawW / 2;
            const by = y + sinkOffset - ((img.height - bottomPadding) * propScale);
            if (clickX < bx || clickX > bx + drawW || clickY < by || clickY > by + drawH) {
                return false;
            }
            const localX = Math.floor((clickX - bx) / propScale);
            const localY = Math.floor((clickY - by) / propScale);
            const sourceX = flip ? (img.width - 1 - localX) : localX;
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
            hctx.translate(-sourceX, -localY);
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
        const { flip = false, sinkOffset = 0, color = '#ffd700', alphaThreshold = 178 } = options;
        const sourceSize = 72;
        const feetY = -44;

        const anim = ANIMATIONS[action] || ANIMATIONS.standby;
        const f = Math.floor(frame) % anim.length;
        const frameIdx = anim.start + f;
        const sx = (frameIdx % 8) * sourceSize;
        const sy = Math.floor(frameIdx / 8) * sourceSize;

        const outlineCanvas = this.getCachedPixelOutlineCanvas(
            img,
            sx,
            sy,
            sourceSize,
            sourceSize,
            color,
            alphaThreshold,
            this._characterOutlineCache,
            256
        );
        if (!outlineCanvas) return;

        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y + sinkOffset));
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(outlineCanvas, -36, feetY, sourceSize, sourceSize);
        ctx.restore();
    }

    getOutlineImageId(img) {
        if (!img || (typeof img !== 'object' && typeof img !== 'function')) return 'none';
        let id = this._outlineImageIds.get(img);
        if (!id) {
            id = this._nextOutlineImageId++;
            this._outlineImageIds.set(img, id);
        }
        return id;
    }

    getCachedPixelOutlineCanvas(img, sx, sy, sw, sh, color, alphaThreshold, cache, maxEntries = 256) {
        if (!img || sw <= 0 || sh <= 0) return null;
        const imageId = this.getOutlineImageId(img);
        const key = `${imageId}:${sx}:${sy}:${sw}:${sh}:${color}:${alphaThreshold}`;
        const cached = cache.get(key);
        if (cached) {
            cache.delete(key);
            cache.set(key, cached);
            return cached;
        }

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = sw;
        srcCanvas.height = sh;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = sw;
        dstCanvas.height = sh;
        const dstCtx = dstCanvas.getContext('2d');

        srcCtx.clearRect(0, 0, sw, sh);
        dstCtx.clearRect(0, 0, sw, sh);
        srcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const srcData = srcCtx.getImageData(0, 0, sw, sh);
        const outData = dstCtx.createImageData(sw, sh);
        const rgb = this._hexToRgb(color);
        const w = sw;
        const h = sh;

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
        cache.set(key, dstCanvas);
        while (cache.size > maxEntries) {
            const oldest = cache.keys().next().value;
            cache.delete(oldest);
        }
        return dstCanvas;
    }

    drawImageFramePixelOutline(ctx, img, srcX, srcY, srcW, srcH, destX, destY, options = {}) {
        if (!img) return;
        const { flip = false, color = '#ffd700', alphaThreshold = 178 } = options;
        if (srcW <= 0 || srcH <= 0) return;

        const outlineCanvas = this.getCachedPixelOutlineCanvas(
            img,
            srcX,
            srcY,
            srcW,
            srcH,
            color,
            alphaThreshold,
            this._imageFrameOutlineCache,
            128
        );
        if (!outlineCanvas) return;

        ctx.save();
        if (flip) {
            ctx.translate(Math.floor(destX + srcW), Math.floor(destY));
            ctx.scale(-1, 1);
            ctx.drawImage(outlineCanvas, 0, 0, srcW, srcH);
        } else {
            ctx.drawImage(outlineCanvas, Math.floor(destX), Math.floor(destY), srcW, srcH);
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

    getChoiceOptionLines(ctx, option, index, maxWidth, options = {}) {
        const font = options.font || '8px Dogica';
        const maxLines = Math.max(1, options.maxLines || 2);

        if (option?.lines) {
            const rawLines = Array.isArray(option.lines)
                ? option.lines
                : (option.lines[LANGUAGE.current] || option.lines.en || []);
            const lines = [];
            rawLines.forEach(line => {
                const localized = getLocalizedText(line);
                const wrapped = this.wrapText(ctx, localized, maxWidth, font);
                lines.push(...(wrapped.length ? wrapped : [localized]));
            });
            return lines.slice(0, maxLines);
        }

        const buttonText = option?.buttonText !== undefined && option?.buttonText !== null
            ? getLocalizedText(option.buttonText)
            : '';
        const fullText = option?.text !== undefined && option?.text !== null
            ? getLocalizedText(option.text)
            : '';
        const fallback = getLocalizedText({ en: `Choice ${index + 1}`, zh: `选项 ${index + 1}` });
        const displayText = buttonText || fullText || fallback;
        return this.wrapText(ctx, displayText, maxWidth, font).slice(0, maxLines);
    }

    getChoicePanelLayout(ctx, canvas, rawOptions, options = {}) {
        const choiceOptions = rawOptions || [];
        const isTouchLayout = !!this.manager?.config?.hasCoarsePointer;
        const outerMargin = Math.max(8, Math.floor(Math.min(canvas.width, canvas.height) * 0.04));
        const panelW = Math.min(canvas.width - outerMargin * 2, isTouchLayout ? 232 : 236);
        const px = Math.floor((canvas.width - panelW) / 2);
        const textW = Math.max(1, panelW - 28);
        const font = options.font || '8px Dogica';
        const lineHeight = LANGUAGE.current === 'zh' ? 13 : 11;
        const maxLines = choiceOptions.length > 4 ? 2 : 3;
        const optionLines = choiceOptions.map((opt, index) => this.getChoiceOptionLines(ctx, opt, index, textW, {
            font,
            maxLines
        }));

        const promptText = options.promptText ? getLocalizedText(options.promptText) : '';
        const promptLines = promptText ? this.wrapText(ctx, promptText, textW, '8px Silkscreen').slice(0, 2) : [];
        const promptBlockH = promptLines.length ? promptLines.length * 11 + 8 : 0;

        const availableH = canvas.height - outerMargin * 2;
        let pad = isTouchLayout ? 12 : 10;
        let gap = isTouchLayout ? 9 : 8;
        let minOptionH = isTouchLayout ? 44 : 36;
        let optionPadY = isTouchLayout ? 10 : 8;

        let optionHeights = optionLines.map(lines => Math.max(minOptionH, lines.length * lineHeight + optionPadY * 2));
        let panelH = pad * 2 + promptBlockH + optionHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, choiceOptions.length - 1);

        if (panelH > availableH) {
            pad = 8;
            gap = 6;
            minOptionH = 34;
            optionPadY = 6;
            optionHeights = optionLines.map(lines => Math.max(minOptionH, lines.length * lineHeight + optionPadY * 2));
            panelH = pad * 2 + promptBlockH + optionHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, choiceOptions.length - 1);
        }

        if (panelH > availableH && choiceOptions.length > 0) {
            const availableForOptions = Math.max(28, availableH - pad * 2 - promptBlockH - gap * Math.max(0, choiceOptions.length - 1));
            const compressedH = Math.max(28, Math.floor(availableForOptions / choiceOptions.length));
            optionHeights = optionHeights.map(() => compressedH);
            panelH = pad * 2 + promptBlockH + optionHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, choiceOptions.length - 1);
        }

        panelH = Math.min(availableH, panelH);
        const py = Math.floor((canvas.height - panelH) / 2);
        const optionRects = [];
        let y = py + pad + promptBlockH;
        optionHeights.forEach((h, index) => {
            optionRects.push({
                x: px + 10,
                y,
                w: panelW - 20,
                h,
                index
            });
            y += h + gap;
        });

        return {
            px,
            py,
            panelW,
            panelH,
            pad,
            gap,
            optionLines,
            optionRects,
            promptLines,
            lineHeight,
            font,
            options: choiceOptions
        };
    }

    renderChoicePanel(ctx, canvas, rawOptions, options = {}) {
        const layout = this.getChoicePanelLayout(ctx, canvas, rawOptions, options);
        const highlightedIndex = Number.isFinite(options.highlightedIndex) ? options.highlightedIndex : -1;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(18, 14, 11, 0.96)';
        ctx.fillRect(layout.px, layout.py, layout.panelW, layout.panelH);
        ctx.strokeStyle = '#8a6a35';
        ctx.lineWidth = 1;
        ctx.strokeRect(layout.px + 0.5, layout.py + 0.5, layout.panelW - 1, layout.panelH - 1);

        if (layout.promptLines.length) {
            const promptY = layout.py + layout.pad;
            layout.promptLines.forEach((line, index) => {
                this.drawPixelText(ctx, line, layout.px + layout.panelW / 2, promptY + index * 11, {
                    color: '#ffd77a',
                    font: '8px Silkscreen',
                    align: 'center'
                });
            });
        }

        layout.optionRects.forEach(rect => {
            const opt = layout.options[rect.index] || {};
            const isHighlighted = highlightedIndex === rect.index;
            const baseColor = opt.color || '#d8b36c';
            const hoverColor = opt.hoverColor || '#fff1b8';
            const strokeColor = isHighlighted ? hoverColor : baseColor;
            const fillColor = isHighlighted ? 'rgba(255, 218, 126, 0.18)' : 'rgba(42, 32, 23, 0.96)';

            ctx.fillStyle = fillColor;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

            const lines = layout.optionLines[rect.index] || [];
            const blockH = lines.length * layout.lineHeight;
            const textY = Math.round(rect.y + (rect.h - blockH) / 2);
            lines.forEach((line, lineIndex) => {
                this.drawPixelText(ctx, line, rect.x + rect.w / 2, textY + lineIndex * layout.lineHeight, {
                    color: isHighlighted ? '#fff' : '#ead9b7',
                    font: layout.font,
                    align: 'center'
                });
            });
        });

        ctx.restore();
        return layout;
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

        // Portraits use a large dialogue bust when available, with a sprite crop as fallback.
        const portraitW = 40;
        const portraitH = 48;
        const portraitX = px + 6;
        const portraitY = py + 6;
        const largePortraitW = 80;
        const largePortraitH = 96;
        const largePortraitX = px + 6;
        const largePortraitY = position === 'top'
            ? margin + 6
            : canvas.height - margin - 6 - largePortraitH;
        const drawInsetPortraitFrame = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(portraitX - 1, portraitY - 1, portraitW + 2, portraitH + 2);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(portraitX - 0.5, portraitY - 0.5, portraitW + 1, portraitH + 1);
        };
        const drawLargePortrait = (img) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(largePortraitX - 1, largePortraitY - 1, largePortraitW + 2, largePortraitH + 2);
            ctx.drawImage(img, largePortraitX, largePortraitY, largePortraitW, largePortraitH);
        };

        // Try to find a dedicated portrait first
        let largePortraitImg = null;
        let usesLargePortrait = false;
        const resolvedPortraitId = resolvePortraitId(step);
        step.portraitKey = resolvedPortraitId;

        const isNoticeboard = isNoticeboardPortrait(step, resolvedPortraitId);
        const isNarrator = isNarratorPortrait(step, resolvedPortraitId);

        // Force Narrator name if not set
        if (isNarrator && (!step.name || step.name.toLowerCase() === 'narrator')) {
            step.name = 'Narrator';
        }

        if (isNoticeboard || isNarrator) {
            drawInsetPortraitFrame();
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
            const dedicatedPortraitKey = getPortraitAssetKey(resolvedPortraitId);
            if (dedicatedPortraitKey) {
                largePortraitImg = assets.getImage(`portrait_large_${dedicatedPortraitKey}`);
            }

            if (largePortraitImg) {
                usesLargePortrait = true;
                drawLargePortrait(largePortraitImg);
            } else {
                drawInsetPortraitFrame();
            }

            if (!largePortraitImg) {
                // Universal fallback: zoomed sprite portrait from the actor sheet.
                const rawKey = resolvedPortraitId || '';
                const normalizedKey = rawKey.replace(/-/g, '').toLowerCase();
                const mappedKey = getSpriteKeyForPortrait(rawKey) || getSpriteKeyForPortrait(normalizedKey);
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
            }
        }

        // Name
        const textX = usesLargePortrait ? largePortraitX + largePortraitW + 8 : portraitX + portraitW + 8;
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
        const metrics = ctx.measureText(text);
        const width = Number.isFinite(metrics.width) ? metrics.width : 0;
        const anchorX = Math.round(x);
        const drawY = Math.round(y);
        let drawX = anchorX;
        if (align === 'center') {
            drawX = Math.round(x - width / 2);
        } else if (align === 'right' || align === 'end') {
            drawX = Math.round(x - width);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top'; 
        
        if (outline) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.strokeText(text, drawX, drawY);
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, drawX, drawY);
        ctx.restore();
        return {
            width,
            actualBoundingBoxLeft: metrics.actualBoundingBoxLeft || 0,
            actualBoundingBoxRight: metrics.actualBoundingBoxRight || width,
            actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || 0,
            actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || 0,
            drawX,
            drawY,
            anchorX,
            anchorY: drawY
        };
    }
}

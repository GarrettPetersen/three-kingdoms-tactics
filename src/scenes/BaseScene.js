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
        const { flip = false, sinkOffset = 0, isProp = false } = options;
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
            return alpha > 10;
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
        return alpha > 10; // Threshold for hit
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

        const isNoticeboard = step.portraitKey === 'noticeboard' || (step.name && step.name.toLowerCase().includes('noticeboard'));
        let isNarrator = step.portraitKey === 'narrator' || !step.name || step.name.toLowerCase() === 'narrator';
        
        // Force Narrator name if not set
        if (isNarrator && (!step.name || step.name.toLowerCase() === 'narrator')) {
            step.name = "Narrator";
        }

        // Try to find a dedicated portrait first
        let portraitImg = null;
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
        } else if (step.portraitKey) {
            // 1. Try formatted name first (e.g. "portrait_Liu-Bei")
            const formattedName = step.name ? step.name.replace(/ /g, '-') : '';
            portraitImg = assets.getImage(`portrait_${formattedName}`);
            
            // 2. If name-based failed (e.g. name is "???"), try the portraitKey itself (e.g. "portrait_zhangfei")
            if (!portraitImg) {
                portraitImg = assets.getImage(`portrait_${step.portraitKey}`);
            }

            // 3. Special case for common variations
            if (!portraitImg) {
                // Try title case portraitKey (e.g. "portrait_Zhang-Fei")
                const titleKey = step.portraitKey.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
                portraitImg = assets.getImage(`portrait_${titleKey}`);
            }
            
            if (!portraitImg) {
                // Fallback to the actor sprite sheet crop
                portraitImg = assets.getImage(step.portraitKey);
                if (portraitImg) {
            const crop = step.portraitRect || { x: 26, y: 20, w: 20, h: 20 };
                    // Draw fallback at 2x to fill space (scaled pixel art, but better than nothing)
                    ctx.drawImage(portraitImg, crop.x, crop.y, crop.w, crop.h, portraitX, portraitY + 4, 40, 40);
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
        let lines = this.wrapText(ctx, localizedText || '', maxWidth, '8px Dogica');
        
        // Chinese: limit to 2 lines max, English: 3 lines max
        const maxLines = LANGUAGE.current === 'zh' ? 2 : 3;
        
        // Calculate chunking BEFORE any truncation - keep full lines array for hasNextChunk calculation
        const start = subStep * maxLines;
        const hasNextChunk = (subStep + 1) * maxLines < lines.length;
        
        // Get the lines to display for this chunk
        let displayLines = lines.slice(start, start + maxLines);
        
        // Add ellipsis to the last displayed line when there's more text to show
        if (hasNextChunk && displayLines.length > 0) {
            ctx.save();
            ctx.font = getFontForLanguage('8px Dogica');
            const lastLine = displayLines[displayLines.length - 1];
            const ellipsis = LANGUAGE.current === 'zh' ? '…' : '...';
            const lastLineWidth = ctx.measureText(lastLine).width;
            const ellipsisWidth = ctx.measureText(ellipsis).width;
            
            if (lastLineWidth + ellipsisWidth <= maxWidth) {
                displayLines[displayLines.length - 1] = lastLine + ellipsis;
            } else {
                // Replace last few characters with ellipsis if needed
                let shortened = lastLine;
                while (ctx.measureText(shortened + ellipsis).width > maxWidth && shortened.length > 0) {
                    shortened = shortened.slice(0, -1);
                }
                displayLines[displayLines.length - 1] = shortened + ellipsis;
            }
            ctx.restore();
        }
        
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

        return { hasNextChunk, totalLines: lines.length };
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

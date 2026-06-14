import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { LANGUAGE, setLanguage, getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';

export class OptionsOverlay extends BaseScene {
    constructor() {
        super();
        this.isOpen = false;
        this.panelRect = null;
        this.closeButtonRect = null;
        this.rowRects = [];
        this.sliderRects = {};
        this.checkboxRects = {};
        this.activeSliderKey = null;
        this.volumeKeys = ['master', 'music', 'sfx', 'voice'];
        this.rowKeys = ['fullscreen', 'scale', 'mute', ...this.volumeKeys, 'language', 'palette'];
        this._onPointerUp = () => {
            this.activeSliderKey = null;
        };
    }

    open() {
        this.isOpen = true;
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerUp);
        const existingIndex = this.selection?.highlightedIndex ?? 0;
        this.initSelection({
            defaultIndex: Math.max(0, Math.min(this.rowKeys.length - 1, existingIndex)),
            totalOptions: this.rowKeys.length
        });
    }

    close() {
        this.isOpen = false;
        this.panelRect = null;
        this.closeButtonRect = null;
        this.rowRects = [];
        this.sliderRects = {};
        this.checkboxRects = {};
        this.activeSliderKey = null;
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerUp);
    }

    clamp01(value) {
        return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    }

    getLanguageLabel(langCode) {
        return LANGUAGE.names?.[langCode] || String(langCode || '').toUpperCase();
    }

    refreshActiveSceneLanguageVisuals() {
        const scene = this.manager?.currentScene;
        if (scene && typeof scene.processTitleImage === 'function') {
            scene.processTitleImage();
        }
    }

    adjustVolume(key, delta) {
        const current = assets.getAudioSettings();
        const next = this.clamp01((current[key] ?? 0.5) + delta);
        assets.setAudioSettings({ [key]: next });
        assets.playSound('ui_click', 0.35);
    }

    setVolumeFromRatio(key, ratio) {
        assets.setAudioSettings({ [key]: this.clamp01(ratio) });
    }

    toggleMute() {
        const settings = assets.getAudioSettings();
        assets.setAudioSettings({ muted: !settings.muted });
        assets.playSound('ui_click', 0.35);
    }

    cycleLanguage(direction = 1) {
        const supported = Array.isArray(LANGUAGE.supported) ? LANGUAGE.supported : [];
        if (supported.length <= 1) return;
        const currentIndex = Math.max(0, supported.indexOf(LANGUAGE.current));
        const nextIndex = (currentIndex + direction + supported.length) % supported.length;
        const nextLang = supported[nextIndex];
        if (setLanguage(nextLang)) {
            assets.clearVoiceCache();
            this.refreshActiveSceneLanguageVisuals();
            assets.playSound('ui_click', 0.45);
        }
    }

    getPaletteScene() {
        const scene = this.manager?.currentScene;
        return scene && typeof scene.cycleBattlePalette === 'function' ? scene : null;
    }

    getPaletteLabel() {
        const scene = this.getPaletteScene();
        if (!scene || typeof scene.getBattlePaletteLabel !== 'function') return 'OFF';
        return scene.getBattlePaletteLabel();
    }

    cyclePalette(direction = 1) {
        const scene = this.getPaletteScene();
        if (!scene) return;
        if (scene.cycleBattlePalette(direction, true)) {
            assets.playSound('ui_click', 0.45);
        }
    }

    isFullscreen() {
        return !!this.manager?.displayControls?.isFullscreen?.();
    }

    getScaleMode() {
        return this.manager?.displayControls?.getScaleMode?.() || this.manager?.config?.scaleMode || 'pixel';
    }

    getScaleModeLabel() {
        return getLocalizedText(this.getScaleMode() === 'fit' ? UI_TEXT['FIT SCREEN'] : UI_TEXT['PIXEL PERFECT']);
    }

    toggleFullscreen() {
        const toggle = this.manager?.displayControls?.toggleFullscreenFit;
        if (!toggle) return;
        assets.playSound('ui_click', 0.45);
        Promise.resolve(toggle()).catch(() => assets.playSound('ui_error', 0.35));
    }

    toggleScaleMode() {
        const setScaleMode = this.manager?.displayControls?.setScaleMode;
        if (!setScaleMode || this.isFullscreen()) return;
        const next = this.getScaleMode() === 'fit' ? 'pixel' : 'fit';
        setScaleMode(next);
        assets.playSound('ui_click', 0.45);
    }

    activateRow(rowKey) {
        if (rowKey === 'fullscreen') {
            this.toggleFullscreen();
        }
        if (rowKey === 'scale') {
            this.toggleScaleMode();
        }
        if (rowKey === 'language') {
            this.cycleLanguage(1);
        }
        if (rowKey === 'palette') {
            this.cyclePalette(1);
        }
        if (rowKey === 'mute') {
            this.toggleMute();
        }
    }

    handleKeyDown(e) {
        if (!this.isOpen || !this.selection) return false;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex - 1 + this.rowKeys.length) % this.rowKeys.length;
            assets.playSound('ui_click', 0.35);
            return true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            this.selection.highlightedIndex = (this.selection.highlightedIndex + 1) % this.rowKeys.length;
            assets.playSound('ui_click', 0.35);
            return true;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.selection.mouseoverEnabled = false;
            const rowKey = this.rowKeys[this.selection.highlightedIndex];
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            if (this.volumeKeys.includes(rowKey)) {
                this.adjustVolume(rowKey, dir * 0.05);
                return true;
            }
            if (rowKey === 'mute') {
                this.toggleMute();
                return true;
            }
            if (rowKey === 'fullscreen') {
                this.toggleFullscreen();
                return true;
            }
            if (rowKey === 'scale') {
                this.toggleScaleMode();
                return true;
            }
            if (rowKey === 'language') {
                this.cycleLanguage(dir);
                return true;
            }
            if (rowKey === 'palette') {
                this.cyclePalette(dir);
                return true;
            }
            return true;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const rowKey = this.rowKeys[this.selection.highlightedIndex];
            this.activateRow(rowKey);
            return true;
        }
        return true;
    }

    handleInput(e) {
        if (!this.isOpen || !this.selection) return false;
        const { x, y } = this.getMousePos(e);
        this.handleSelectionMouseClick();

        if (
            this.closeButtonRect &&
            x >= this.closeButtonRect.x &&
            x <= this.closeButtonRect.x + this.closeButtonRect.w &&
            y >= this.closeButtonRect.y &&
            y <= this.closeButtonRect.y + this.closeButtonRect.h
        ) {
            assets.playSound('ui_click', 0.4);
            this.manager.closeOptionsOverlay();
            return true;
        }

        const rowIndex = this.rowRects.findIndex(r =>
            x >= r.x && x <= r.x + r.w &&
            y >= r.y && y <= r.y + r.h
        );
        if (rowIndex >= 0) {
            this.selection.highlightedIndex = rowIndex;
        }

        for (const key of this.volumeKeys) {
            const hit = this.sliderRects[key];
            if (hit && x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
                this.activeSliderKey = key;
                this.setVolumeFromRatio(key, (x - hit.x) / hit.w);
                return true;
            }
        }

        const muteHit = this.checkboxRects.mute;
        if (muteHit && x >= muteHit.x && x <= muteHit.x + muteHit.w && y >= muteHit.y && y <= muteHit.y + muteHit.h) {
            this.toggleMute();
            return true;
        }

        if (rowIndex >= 0) {
            this.activateRow(this.rowKeys[rowIndex]);
            return true;
        }

        return true;
    }

    update() {
        if (!this.isOpen || !this.selection) return;
        const mx = this.manager?.logicalMouseX;
        const my = this.manager?.logicalMouseY;
        if (!Number.isFinite(mx) || !Number.isFinite(my)) return;
        this.updateSelectionMouse(mx, my);

        for (let i = 0; i < this.rowRects.length; i++) {
            const r = this.rowRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                this.handleSelectionMouseover(i);
                break;
            }
        }
    }

    onMouseInput(x, y) {
        if (!this.isOpen) return;
        if (this.activeSliderKey) {
            const hit = this.sliderRects[this.activeSliderKey];
            if (hit) this.setVolumeFromRatio(this.activeSliderKey, (x - hit.x) / hit.w);
        }
    }

    drawMuteRow(ctx, rowRect, label, isMuted, isHighlighted) {
        const rowTextY = rowRect.y + 6;
        this.drawPixelText(ctx, label, rowRect.x + 8, rowTextY, {
            color: isHighlighted ? '#ffffff' : '#ffd700',
            font: '8px Tiny5'
        });

        const boxSize = 10;
        const boxX = rowRect.x + rowRect.w - boxSize - 12;
        const boxY = rowRect.y + Math.floor((rowRect.h - boxSize) / 2);
        this.checkboxRects.mute = { x: boxX, y: boxY, w: boxSize, h: boxSize };

        ctx.fillStyle = isMuted ? '#66ccff' : '#202020';
        ctx.fillRect(boxX, boxY, boxSize, boxSize);
        ctx.strokeStyle = isHighlighted ? '#ffffff' : '#777777';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);
        if (isMuted) {
            ctx.strokeStyle = '#001018';
            ctx.beginPath();
            ctx.moveTo(boxX + 2, boxY + 5);
            ctx.lineTo(boxX + 4, boxY + 8);
            ctx.lineTo(boxX + 8, boxY + 2);
            ctx.stroke();
        }
    }

    drawVolumeRow(ctx, rowRect, label, value, isHighlighted, sliderKey) {
        const rowTextY = rowRect.y + 6;
        this.drawPixelText(ctx, label, rowRect.x + 8, rowTextY, {
            color: isHighlighted ? '#ffffff' : '#ffd700',
            font: '8px Tiny5'
        });

        const sliderW = Math.max(80, Math.floor(rowRect.w * 0.45));
        const sliderH = 8;
        const sliderX = rowRect.x + rowRect.w - sliderW - 44;
        const sliderY = rowRect.y + Math.floor((rowRect.h - sliderH) / 2);
        this.sliderRects[sliderKey] = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };

        ctx.fillStyle = '#202020';
        ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
        ctx.strokeStyle = isHighlighted ? '#ffffff' : '#777777';
        ctx.lineWidth = 1;
        ctx.strokeRect(sliderX + 0.5, sliderY + 0.5, sliderW - 1, sliderH - 1);

        const fillW = Math.max(0, Math.min(sliderW, Math.floor(sliderW * value)));
        if (fillW > 0) {
            ctx.fillStyle = '#66ccff';
            ctx.fillRect(sliderX + 1, sliderY + 1, Math.max(0, fillW - 2), sliderH - 2);
        }

        this.drawPixelText(ctx, `${Math.round(value * 100)}%`, sliderX + sliderW + 8, rowTextY, {
            color: '#eeeeee',
            font: '8px Tiny5'
        });
    }

    render() {
        if (!this.isOpen) return;
        const { ctx, canvas } = this.manager;
        const settings = assets.getAudioSettings();

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const panelW = Math.min(360, canvas.width - 20);
        const rowH = 22;
        const panelH = Math.min(canvas.height - 12, 36 + this.rowKeys.length * rowH);
        const panelX = Math.floor((canvas.width - panelW) / 2);
        const panelY = Math.floor((canvas.height - panelH) / 2);
        const startY = panelY + 28;
        this.panelRect = { x: panelX, y: panelY, w: panelW, h: panelH };

        ctx.fillStyle = '#101010';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

        const closeBtnSize = 14;
        const closeBtnX = panelX + panelW - closeBtnSize - 6;
        const closeBtnY = panelY + 6;
        this.closeButtonRect = { x: closeBtnX, y: closeBtnY, w: closeBtnSize, h: closeBtnSize };
        const mx = this.manager?.logicalMouseX;
        const my = this.manager?.logicalMouseY;
        const closeHovered = Number.isFinite(mx) && Number.isFinite(my)
            && mx >= closeBtnX && mx <= closeBtnX + closeBtnSize
            && my >= closeBtnY && my <= closeBtnY + closeBtnSize;
        ctx.fillStyle = closeHovered ? '#3a3a3a' : '#222222';
        ctx.fillRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
        ctx.strokeStyle = closeHovered ? '#ffffff' : '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(closeBtnX + 0.5, closeBtnY + 0.5, closeBtnSize - 1, closeBtnSize - 1);
        this.drawPixelText(ctx, 'X', closeBtnX + closeBtnSize / 2, closeBtnY + 3, {
            color: closeHovered ? '#ffffff' : '#cccccc',
            font: '8px Silkscreen',
            align: 'center'
        });

        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['OPTIONS']), panelX + panelW / 2, panelY + 8, {
            color: '#ffd700',
            font: '8px Silkscreen',
            align: 'center'
        });

        this.rowRects = [];
        this.sliderRects = {};
        this.checkboxRects = {};
        const rowX = panelX + 10;
        const rowW = panelW - 20;
        const labels = {
            master: getLocalizedText(UI_TEXT['MASTER VOLUME']),
            music: getLocalizedText(UI_TEXT['MUSIC VOLUME']),
            sfx: getLocalizedText(UI_TEXT['SFX VOLUME']),
            voice: getLocalizedText(UI_TEXT['VOICE VOLUME']),
            language: getLocalizedText(UI_TEXT['LANGUAGE']),
            palette: getLocalizedText(UI_TEXT['PALETTE']),
            mute: getLocalizedText(UI_TEXT['MUTE']),
            fullscreen: getLocalizedText(this.isFullscreen() ? UI_TEXT['EXIT FULLSCREEN'] : UI_TEXT['FULLSCREEN']),
            scale: getLocalizedText(UI_TEXT['SCALE MODE'])
        };

        for (let i = 0; i < this.rowKeys.length; i++) {
            const rowKey = this.rowKeys[i];
            const y = startY + i * rowH;
            const rowRect = { x: rowX, y, w: rowW, h: rowH - 2 };
            this.rowRects.push(rowRect);
            const isHighlighted = this.selection?.highlightedIndex === i;

            ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)';
            ctx.fillRect(rowRect.x, rowRect.y, rowRect.w, rowRect.h);
            ctx.strokeStyle = isHighlighted ? '#eeeeee' : '#444444';
            ctx.lineWidth = 1;
            ctx.strokeRect(rowRect.x + 0.5, rowRect.y + 0.5, rowRect.w - 1, rowRect.h - 1);

            if (rowKey === 'mute') {
                this.drawMuteRow(ctx, rowRect, labels.mute, !!settings.muted, isHighlighted);
                continue;
            }
            if (rowKey === 'fullscreen') {
                this.drawPixelText(ctx, labels.fullscreen, rowRect.x + 8, rowRect.y + 6, {
                    color: isHighlighted ? '#ffffff' : '#ffd700',
                    font: '8px Silkscreen'
                });
                this.drawPixelText(ctx, this.isFullscreen() ? getLocalizedText(UI_TEXT['ON']) : getLocalizedText(UI_TEXT['OFF']), rowRect.x + rowRect.w - 12, rowRect.y + 6, {
                    color: '#eeeeee',
                    font: '8px Silkscreen',
                    align: 'right'
                });
                continue;
            }
            if (rowKey === 'scale') {
                const locked = this.isFullscreen();
                this.drawPixelText(ctx, labels.scale, rowRect.x + 8, rowRect.y + 6, {
                    color: isHighlighted ? '#ffffff' : '#ffd700',
                    font: '8px Silkscreen'
                });
                this.drawPixelText(ctx, `< ${this.getScaleModeLabel()} >`, rowRect.x + rowRect.w - 12, rowRect.y + 6, {
                    color: locked ? '#777777' : '#eeeeee',
                    font: '8px Silkscreen',
                    align: 'right'
                });
                continue;
            }
            if (this.volumeKeys.includes(rowKey)) {
                this.drawVolumeRow(ctx, rowRect, labels[rowKey], settings[rowKey], isHighlighted, rowKey);
                continue;
            }
            if (rowKey === 'language') {
                this.drawPixelText(ctx, labels.language, rowRect.x + 8, rowRect.y + 6, {
                    color: isHighlighted ? '#ffffff' : '#ffd700',
                    font: '8px Silkscreen'
                });
                const languageLabel = this.getLanguageLabel(LANGUAGE.current);
                this.drawPixelText(ctx, `< ${languageLabel} >`, rowRect.x + rowRect.w - 12, rowRect.y + 6, {
                    color: '#eeeeee',
                    font: '8px Silkscreen',
                    align: 'right'
                });
                continue;
            }
            if (rowKey === 'palette') {
                this.drawPixelText(ctx, labels.palette, rowRect.x + 8, rowRect.y + 6, {
                    color: isHighlighted ? '#ffffff' : '#ffd700',
                    font: '8px Silkscreen'
                });
                this.drawPixelText(ctx, `< ${this.getPaletteLabel()} >`, rowRect.x + rowRect.w - 12, rowRect.y + 6, {
                    color: this.getPaletteScene() ? '#eeeeee' : '#777777',
                    font: '8px Silkscreen',
                    align: 'right'
                });
                continue;
            }

        }
        ctx.restore();
    }
}

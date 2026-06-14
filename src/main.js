import { assets } from './core/AssetLoader.js';
import { SceneManager } from './core/SceneManager.js';
import { ActionRecorder } from './core/ActionRecorder.js';
import { LANGUAGE, setLanguage } from './core/Language.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CustomBattleMenuScene } from './scenes/CustomBattleMenuScene.js';
import { CampaignSelectionScene } from './scenes/CampaignSelectionScene.js';
import { MapScene } from './scenes/MapScene.js';
import { TacticsScene } from './scenes/TacticsScene.js';
import { NarrativeScene } from './scenes/NarrativeScene.js';
import { BattleSummaryScene } from './scenes/BattleSummaryScene.js';
import { LevelUpScene } from './scenes/LevelUpScene.js';
import { RecoveryScene } from './scenes/RecoveryScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { OptionsOverlay } from './scenes/OptionsOverlay.js';
import { LiuboScene } from './scenes/LiuboScene.js';

const canvas = document.getElementById('game-canvas');
const gameContainer = document.getElementById('game-container');
const webFullscreenToggle = document.getElementById('web-fullscreen-toggle');
const ctx = canvas.getContext('2d');

function hideBootLoader() {
    const loader = document.getElementById('boot-loader');
    if (!loader) return;

    loader.classList.add('boot-loader--hidden');
    window.setTimeout(() => loader.remove(), 320);
}

function showBootLoadError() {
    const loader = document.getElementById('boot-loader');
    if (!loader) return;

    loader.classList.add('boot-loader--error');
    const text = loader.querySelector('.boot-loader__text');
    if (text) text.textContent = 'LOAD FAILED';
}

// Phase 1: centralize canvas sizing so resolution changes are controlled from one place.
const TARGET_CANVAS_WIDTH = 455;
const TARGET_CANVAS_HEIGHT = 256;
const LEGACY_CANVAS_WIDTH = 256;
const LEGACY_CANVAS_HEIGHT = 256;
const LEGACY_X_OFFSET = Math.floor((TARGET_CANVAS_WIDTH - LEGACY_CANVAS_WIDTH) / 2);
const USE_WIDE_CANVAS = true;

const ACTIVE_CANVAS_WIDTH = USE_WIDE_CANVAS ? TARGET_CANVAS_WIDTH : LEGACY_CANVAS_WIDTH;
const ACTIVE_CANVAS_HEIGHT = USE_WIDE_CANVAS ? TARGET_CANVAS_HEIGHT : LEGACY_CANVAS_HEIGHT;
const LEGACY_MAP_WIDTH = 10;
const LEGACY_MAP_HEIGHT = 12;
const BASE_HEX_HORIZONTAL_SPACING = 23;
const BASE_HEX_VERTICAL_SPACING = 17;
const HEX_SPACING_SCALE = 1.25;

const config = {
    useWideCanvas: USE_WIDE_CANVAS,
    targetCanvasWidth: TARGET_CANVAS_WIDTH,
    targetCanvasHeight: TARGET_CANVAS_HEIGHT,
    legacyCanvasWidth: LEGACY_CANVAS_WIDTH,
    legacyCanvasHeight: LEGACY_CANVAS_HEIGHT,
    legacyXOffset: LEGACY_X_OFFSET,
    legacyMapWidth: LEGACY_MAP_WIDTH,
    legacyMapHeight: LEGACY_MAP_HEIGHT,
    baseHorizontalSpacing: BASE_HEX_HORIZONTAL_SPACING,
    baseVerticalSpacing: BASE_HEX_VERTICAL_SPACING,
    hexSpacingScale: HEX_SPACING_SCALE,
    virtualWidth: ACTIVE_CANVAS_WIDTH,
    virtualHeight: ACTIVE_CANVAS_HEIGHT,
    tileWidth: 36,
    tileHeight: 36,
    baseDepth: 6,
    horizontalSpacing: Math.round(BASE_HEX_HORIZONTAL_SPACING * HEX_SPACING_SCALE),
    verticalSpacing: Math.round(BASE_HEX_VERTICAL_SPACING * HEX_SPACING_SCALE),
    mapWidth: LEGACY_MAP_WIDTH,
    mapHeight: LEGACY_MAP_HEIGHT,
    scaleMode: 'pixel',
    isFullscreen: false,
    supportsFullscreen: !!document.fullscreenEnabled
};

const TERRAIN_TYPES = [
    'grass_01', 'grass_flowers', 'grass_02', 'grass_03', 'grass_04',
    'sand_01', 'sand_02', 'sand_03', 'sand_04', 'sand_05',
    'water_shallow_01', 'water_shallow_02', 
    'water_deep_01_01', 'water_deep_01_02', 
    'water_deep_02_01', 'water_deep_02_02',
    'forest_deciduous_01', 'forest_deciduous_02', 'forest_broadleaf_01', 'forest_broadleaf_02', 'forest_broadleaf_03',
    'earth_cracked', 'earth_rocky',
    'mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03', 'earth_stone',
    'house_01', 'house_damaged_01', 'house_destroyed_01', 'wall_01', 'gate_01', 'gate_cracked_01', 'gate_open_01',
    'tent',
    'mud_01', 'mud_02', 'mud_03', 'mud_04', 'mud_05', 'mud_06', 'mud_07',
    'jungle_dense_01', 'jungle_dense_02', 'jungle_dense_03', 'jungle_palm_01', 'jungle_palm_02', 'jungle_palm_03',
    'pine_forest_01', 'pine_forest_snow_01',
    'mountain_snowy_01', 'mountain_snowy_02',
    'snow_01', 'snow_footprints_01', 'ice_01', 'ice_cracked_01'
];

function setupCanvas() {
    // Standardize on a fixed virtual resolution for pixel-perfect consistency
    canvas.width = config.virtualWidth;
    canvas.height = config.virtualHeight;
    ctx.imageSmoothingEnabled = false;

    // Use uniform integer scale to keep pixels square and avoid distortion/blur.
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches || false;
    const isFullscreen = document.fullscreenElement === gameContainer;
    const useFitScreen = isFullscreen || config.scaleMode === 'fit';
    const isPortrait = screenHeight > screenWidth;
    const shouldRotate = hasCoarsePointer && isPortrait && useFitScreen;
    const fitWidth = shouldRotate ? config.virtualHeight : config.virtualWidth;
    const fitHeight = shouldRotate ? config.virtualWidth : config.virtualHeight;
    const maxScale = Math.min(screenWidth / fitWidth, screenHeight / fitHeight);
    const scale = Math.max(1, useFitScreen ? maxScale : Math.floor(maxScale));
    config.displayRotation = shouldRotate ? 90 : 0;
    config.displayScale = scale;
    config.hasCoarsePointer = hasCoarsePointer;
    config.isFullscreen = isFullscreen;
    config.scaleMode = useFitScreen ? 'fit' : 'pixel';
    canvas.style.width = `${config.virtualWidth * scale}px`;
    canvas.style.height = `${config.virtualHeight * scale}px`;
    canvas.style.transform = shouldRotate ? 'rotate(90deg)' : '';
    canvas.style.transformOrigin = 'center center';
}

async function lockLandscapeIfPossible() {
    try {
        if (screen.orientation?.lock) await screen.orientation.lock('landscape');
    } catch (err) {
        // Mobile browsers often reject orientation lock outside installed/fullscreen contexts.
    }
}

function unlockOrientationIfPossible() {
    try {
        if (screen.orientation?.unlock) screen.orientation.unlock();
    } catch (err) {
        // Some browsers expose lock without unlock, or throw when not locked.
    }
}

async function refreshFullscreenDisplayState() {
    const isGameFullscreen = document.fullscreenElement === gameContainer;
    if (!isGameFullscreen) {
        unlockOrientationIfPossible();
        if (config.scaleMode === 'fit') config.scaleMode = 'pixel';
    } else if (!document.hidden) {
        await lockLandscapeIfPossible();
    }
    setupCanvas();
}

async function toggleFullscreenFit() {
    if (!document.fullscreenElement) {
        config.scaleMode = 'fit';
        if (gameContainer?.requestFullscreen) {
            try {
                await gameContainer.requestFullscreen();
            } catch (err) {
                config.scaleMode = 'pixel';
                setupCanvas();
                throw err;
            }
            await lockLandscapeIfPossible();
        }
    } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        config.scaleMode = 'pixel';
    }
    setupCanvas();
}

function setScaleMode(mode) {
    config.scaleMode = mode === 'fit' ? 'fit' : 'pixel';
    setupCanvas();
}

function isWebFullscreenToggleAvailable() {
    const ua = navigator.userAgent || '';
    const isElectronShell = /\bElectron\b/i.test(ua);
    return !!webFullscreenToggle && !!document.fullscreenEnabled && !isElectronShell;
}

function updateWebFullscreenToggle() {
    if (!webFullscreenToggle) return;
    const shouldShow = isWebFullscreenToggleAvailable();
    webFullscreenToggle.hidden = !shouldShow;
    if (!shouldShow) return;

    const isActive = document.fullscreenElement === gameContainer;
    webFullscreenToggle.classList.toggle('web-fullscreen-toggle--active', isActive);
    const label = isActive ? 'Exit fullscreen' : 'Enter fullscreen';
    webFullscreenToggle.setAttribute('aria-label', label);
    webFullscreenToggle.title = label;
}

function setupWebFullscreenToggle() {
    if (!webFullscreenToggle) return;
    updateWebFullscreenToggle();
    webFullscreenToggle.addEventListener('click', async () => {
        webFullscreenToggle.disabled = true;
        try {
            await toggleFullscreenFit();
        } catch (err) {
            console.warn('Fullscreen toggle failed:', err);
        } finally {
            webFullscreenToggle.disabled = false;
            updateWebFullscreenToggle();
        }
    });
}

/**
 * Take 1920x1080 screenshots from the 256x256 canvas
 * Creates three 16:9 crops (top, middle, bottom) and one letterboxed version
 * Saves one set in the current language and one set in Chinese (filenames ending with _schinese)
 * All screenshots are saved in a single zip file
 */
async function takeScreenshots(ctx, canvas, config, sceneManager) {
    const SOURCE_WIDTH = 256;
    const SOURCE_HEIGHT = 256;
    const CROP_HEIGHT = 144; // 16:9 aspect ratio: 256 * 9/16 = 144
    const TARGET_WIDTH = 1920;
    const TARGET_HEIGHT = 1080;
    
    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2026-02-17T19-30-45
    
    // Load JSZip from CDN if not already loaded
    if (typeof JSZip === 'undefined') {
        console.log('Loading JSZip library...');
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Create a temporary canvas to capture the current frame
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = SOURCE_WIDTH;
    sourceCanvas.height = SOURCE_HEIGHT;
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.imageSmoothingEnabled = false;
    
    // Create output canvas for scaling
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = TARGET_WIDTH;
    outputCanvas.height = TARGET_HEIGHT;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    
    const cropYPositions = [
        { y: 0, name: 'top' },
        { y: Math.floor((SOURCE_HEIGHT - CROP_HEIGHT) / 2), name: 'middle' },
        { y: SOURCE_HEIGHT - CROP_HEIGHT, name: 'bottom' }
    ];
    
    const letterboxScale = TARGET_HEIGHT / SOURCE_HEIGHT;
    const letterboxWidth = Math.floor(SOURCE_WIDTH * letterboxScale);
    const letterboxX = Math.floor((TARGET_WIDTH - letterboxWidth) / 2);
    
    /** Generate the 4 screenshot blobs from the current sourceCanvas; filenameSuffix is '' or '_schinese' */
    async function captureSet(filenameSuffix) {
        const list = [];
        function generateScreenshot(cropX, cropY, cropW, cropH) {
            return new Promise((resolve) => {
                outputCtx.fillStyle = '#000';
                outputCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
                outputCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
                outputCanvas.toBlob((blob) => resolve(blob), 'image/png');
            });
        }
        for (const { y, name } of cropYPositions) {
            const blob = await generateScreenshot(0, y, SOURCE_WIDTH, CROP_HEIGHT);
            const base = `screenshot_${name}_1920x1080`;
            list.push({ blob, filename: `${base}${filenameSuffix}.png` });
        }
        outputCtx.fillStyle = '#000';
        outputCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        outputCtx.drawImage(sourceCanvas, 0, 0, SOURCE_WIDTH, SOURCE_HEIGHT, letterboxX, 0, letterboxWidth, TARGET_HEIGHT);
        const letterboxBlob = await new Promise((resolve) => outputCanvas.toBlob((blob) => resolve(blob), 'image/png'));
        const letterboxBase = 'screenshot_letterbox_1920x1080';
        list.push({ blob: letterboxBlob, filename: `${letterboxBase}${filenameSuffix}.png` });
        return list;
    }
    
    const screenshots = [];
    const savedLang = LANGUAGE.current;
    
    // 1) English set (base filenames)
    if (sceneManager) setLanguage('en');
    if (sceneManager) sceneManager.render(Date.now());
    sourceCtx.drawImage(canvas, 0, 0);
    console.log('Generating screenshots (English)...');
    screenshots.push(...(await captureSet('')));
    
    // 2) Chinese set (filenames ending with _schinese)
    if (sceneManager) setLanguage('zh');
    if (sceneManager) sceneManager.render(Date.now());
    sourceCtx.drawImage(canvas, 0, 0);
    console.log('Generating screenshots (Chinese)...');
    screenshots.push(...(await captureSet('_schinese')));
    
    if (sceneManager) setLanguage(savedLang);
    if (sceneManager) sceneManager.render(Date.now());
    
    // Create zip file
    console.log('Creating zip file...');
    const zip = new JSZip();
    for (const { blob, filename } of screenshots) {
        zip.file(filename, blob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `screenshots_${timestamp}.zip`;
    
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Screenshots saved to: ${zipFilename}`);
}

async function init() {
    setupCanvas();
    setupWebFullscreenToggle();
    window.addEventListener('resize', setupCanvas);
    document.addEventListener('fullscreenchange', () => {
        refreshFullscreenDisplayState();
        updateWebFullscreenToggle();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) unlockOrientationIfPossible();
        else refreshFullscreenDisplayState();
        updateWebFullscreenToggle();
    });
    window.addEventListener('pagehide', unlockOrientationIfPossible);
    window.addEventListener('blur', unlockOrientationIfPossible);
    screen.orientation?.addEventListener?.('change', setupCanvas);

    const sceneManager = new SceneManager(ctx, canvas, config);
    sceneManager.setDisplayControls({
        toggleFullscreenFit,
        setScaleMode,
        getScaleMode: () => config.scaleMode,
        isFullscreen: () => document.fullscreenElement === gameContainer,
        supportsFullscreen: () => !!document.fullscreenEnabled
    });
    sceneManager.addScene('title', new TitleScene());
    sceneManager.addScene('custom_battle', new CustomBattleMenuScene());
    sceneManager.addScene('liubo', new LiuboScene());
    sceneManager.addScene('campaign_selection', new CampaignSelectionScene());
    sceneManager.addScene('map', new MapScene());
    sceneManager.addScene('tactics', new TacticsScene());
    sceneManager.addScene('narrative', new NarrativeScene());
    sceneManager.addScene('summary', new BattleSummaryScene());
    sceneManager.addScene('recovery', new RecoveryScene());
    sceneManager.addScene('levelup', new LevelUpScene());
    sceneManager.addScene('credits', new CreditsScene());
    sceneManager.setOptionsOverlay(new OptionsOverlay());

    const actionRecorder = new ActionRecorder(assets, canvas);
    sceneManager.actionRecorder = actionRecorder;

    const recordPanel = document.createElement('div');
    recordPanel.id = 'trailer-record-panel';
    recordPanel.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:rgba(0,0,0,0.85);color:#eee;padding:8px 12px;border-radius:6px;font:12px sans-serif;display:none;max-width:260px;';
    const recordStatus = document.createElement('div');
    recordStatus.id = 'trailer-record-status';
    recordStatus.textContent = '—';
    const recordHint = document.createElement('div');
    recordHint.style.cssText = 'font-size:10px;color:#aaa;margin-top:4px;';
    recordHint.textContent = 'Records canvas only (256×256). Share tab/window for game audio. Clips save to Downloads. Ctrl+Shift+M toggles music (mute before recording).';
    const armBtn = document.createElement('button');
    armBtn.textContent = 'Arm record (next action)';
    armBtn.style.cssText = 'margin-top:6px;padding:4px 8px;cursor:pointer;';
    armBtn.onclick = async () => {
        const ok = await actionRecorder.arm();
        recordStatus.textContent = ok ? 'Armed — click in-game to record' : (actionRecorder.lastError || 'Share tab when prompted');
        stopBtn.style.display = 'none';
    };
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop recording';
    stopBtn.style.cssText = 'margin-top:4px;padding:4px 8px;cursor:pointer;display:none;';
    stopBtn.onclick = () => {
        actionRecorder.signalActionEnd();
        stopBtn.style.display = 'none';
    };
    actionRecorder.onArmedChange = (armed) => {
        recordStatus.textContent = armed ? 'Armed — click in-game to record' : (actionRecorder.recording ? 'Recording…' : '—');
        stopBtn.style.display = actionRecorder.recording ? 'block' : 'none';
    };
    actionRecorder.onRecordingChange = (recording) => {
        recordStatus.textContent = recording ? 'Recording…' : (actionRecorder.armed ? 'Armed' : '—');
        stopBtn.style.display = recording ? 'block' : 'none';
    };
    actionRecorder.onClipSaved = (filename) => {
        recordStatus.textContent = `Saved ${filename} (in Downloads)`;
        recordStatus.title = 'Clip saved to your browser\u2019s Downloads folder';
        setTimeout(() => {
            if (recordStatus.textContent.startsWith('Saved ')) {
                recordStatus.textContent = actionRecorder.armed ? 'Armed — click in-game to record' : '—';
                recordStatus.title = '';
            }
        }, 5000);
    };
    recordPanel.appendChild(recordStatus);
    recordPanel.appendChild(recordHint);
    recordPanel.appendChild(armBtn);
    recordPanel.appendChild(stopBtn);
    document.body.appendChild(recordPanel);

    // Ctrl+Shift+E or Cmd+Shift+E toggles record panel (Cmd+Shift+R is browser "hard reload")
    window.addEventListener('keydown', (e) => {
        const isRecordHotkey = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e';
        if (e.shiftKey && (e.ctrlKey || e.metaKey) && /^[A-Z]$/i.test(e.key)) {
            console.log('[Record hotkey] keydown', { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, isRecordHotkey });
        }
        if (isRecordHotkey) {
            e.preventDefault();
            recordPanel.style.display = recordPanel.style.display === 'none' ? 'block' : 'none';
            console.log('[Record hotkey] panel toggled, display=', recordPanel.style.display);
        }
    });

    // Ctrl+Shift+M or Cmd+Shift+M toggles in-game music (mute persists until toggled again or game closed)
    window.addEventListener('keydown', (e) => {
        const isMusicHotkey = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm';
        if (!isMusicHotkey) return;
        e.preventDefault();
        assets.musicMutedByUser = !assets.musicMutedByUser;
        const rawTarget = assets.currentVoice ? (assets.baseMusicVolume ?? 0.5) * 0.3 : (assets.baseMusicVolume ?? 0.5);
        assets.setMusicVolume(rawTarget);
    });

    canvas.addEventListener('pointerdown', (e) => sceneManager.handleInput(e));
    const unlockAudio = () => {
        assets.unlockAudioFromGesture();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('touchend', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    let inputBuffer = "";
    window.addEventListener('keydown', (e) => {
        const isFastSkipCombo = (e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'));
        if (isFastSkipCombo) {
            e.preventDefault();
            inputBuffer = "";
            const scene = sceneManager.currentScene;
            if (scene && typeof scene.debugFastSkip === 'function') {
                scene.debugFastSkip();
            }
            return;
        }

        // Allow scenes to handle specific keys (like Enter to advance text)
        sceneManager.handleKeyDown(e);

        if (e.key.length === 1) {
            inputBuffer += e.key.toLowerCase();
            const markChapterComplete = (chapterNum) => {
                const n = Number(chapterNum);
                if (!Number.isFinite(n) || n < 1) return false;
                const milestone = `chapter${n}_complete`;
                sceneManager.gameState.addMilestone(milestone);
                // Canon defaults when skipping content:
                // - Lu Zhi is NOT freed (lawful/canonical branch)
                // - Liu Bei restrains Zhang Fei in Dong Zhuo confrontation
                if (n >= 1) {
                    sceneManager.gameState.setStoryChoice('luzhi_outcome', 'restrained');
                    sceneManager.gameState.setStoryChoice('chapter2_oath_dongzhuo_choice', 'restrain');
                    sceneManager.gameState.setWorldChoice('chapter2_oath_dongzhuo_choice', 'restrain');
                    sceneManager.gameState.removeMilestone('freed_luzhi');
                    sceneManager.gameState.removeMilestone('chapter2_oath_dongzhuo_fought');
                }
                // Chapter 1 uses this explicit key in existing unlock checks.
                if (n === 1) sceneManager.gameState.addMilestone('chapter1_complete');
                if (n === 1) {
                    sceneManager.gameState.setCurrentCampaign('liubei');
                    sceneManager.gameState.setStoryCursor('chapter1_complete', 'liubei');
                }
                if (n === 2) {
                    sceneManager.gameState.setCurrentCampaign('chapter2_oath');
                    sceneManager.gameState.setStoryCursor('chapter2_oath_complete', 'chapter2_oath');
                }
                sceneManager.gameState.setLastScene('campaign_selection');
                sceneManager.switchTo('campaign_selection');
                console.log(`[CHEAT] Marked Chapter ${n} complete.`);
                return true;
            };

            // Cheat: type ch1done, ch2done, ch3done... to mark that chapter complete.
            const chapterDoneMatch = inputBuffer.match(/ch(\d+)done$/);
            if (chapterDoneMatch && markChapterComplete(chapterDoneMatch[1])) {
                inputBuffer = "";
                return;
            }
            if (inputBuffer.endsWith('title')) { sceneManager.switchTo('title'); inputBuffer = ""; }
            if (inputBuffer.endsWith('camp')) { sceneManager.switchTo('campaign_selection'); inputBuffer = ""; }
            if (inputBuffer.endsWith('map')) { sceneManager.switchTo('map'); inputBuffer = ""; }
            if (inputBuffer.endsWith('battle')) { 
                inputBuffer = ""; 
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.switchTo('tactics', { battleId: 'daxing' }); 
            }
            if (inputBuffer.endsWith('screenshot')) {
                inputBuffer = "";
                takeScreenshots(ctx, canvas, config, sceneManager).catch(err => {
                    console.error('Screenshot error:', err);
                });
            }
            if (inputBuffer.endsWith('brief')) {
                inputBuffer = "";
                // Jump to the Magistrate Briefing (same script as post-prologue; single source of truth in NarrativeScripts.js)
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.switchTo('narrative', {
                    scriptId: 'daxing_messenger',
                    musicKey: 'forest',
                    onComplete: () => sceneManager.switchTo('tactics', {
                        battleId: 'daxing',
                        mapGen: {
                            biome: 'northern',
                            layout: 'foothills',
                            forestDensity: 0.15,
                            mountainDensity: 0.1,
                            riverDensity: 0.05,
                            houseDensity: 0.04
                        }
                    })
                });
            }
            if (inputBuffer.endsWith('story')) {
                inputBuffer = "";
                sceneManager.switchTo('narrative', {
                    script: [
                        { type: 'title', text: 'DEBUG: NARRATIVE', subtext: 'Testing narrative scene' },
                        { type: 'dialogue', name: 'System', voiceId: 'debug_narrative_01', text: { en: 'Cheat code accepted. Narrative scene is functional.', zh: '作弊码已接受。剧情场景运行正常。' } }
                    ]
                });
            }
            if (inputBuffer.endsWith('win')) {
                if (sceneManager.currentSceneKey === 'tactics' && sceneManager.currentScene) {
                    if (sceneManager.currentScene.cheatWin) {
                        sceneManager.currentScene.cheatWin();
                    } else {
                        sceneManager.currentScene.endBattle(true);
                    }
                    inputBuffer = "";
                }
            }
            if (inputBuffer.endsWith('qingzhou')) {
                inputBuffer = "";
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.gameState.addMilestone('daxing');
                sceneManager.gameState.setCurrentCampaign('liubei');
                sceneManager.gameState.startStoryRoute('liubei', 'daxing');
                sceneManager.switchTo('map', { campaignId: 'liubei', partyX: 182, partyY: 85 });
            }
            if (inputBuffer.endsWith('guangzong')) {
                inputBuffer = "";
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.gameState.addMilestone('daxing');
                sceneManager.gameState.addMilestone('qingzhou_siege');
                sceneManager.gameState.addMilestone('qingzhou_cleanup');
                sceneManager.gameState.setCurrentCampaign('liubei');
                sceneManager.gameState.startStoryRoute('liubei', 'qingzhou_cleanup');
                // Place Liu Bei at Qingzhou (220, 95) - he needs to march to Guangzong
                sceneManager.switchTo('map', { campaignId: 'liubei', partyX: 220, partyY: 95 });
            }
            if (inputBuffer.length > 20) inputBuffer = inputBuffer.slice(-20);
        }
    });

    try {
        await assets.loadFonts();

        const terrainAssets = {};
        TERRAIN_TYPES.forEach(t => {
            const isGateTerrain = t.startsWith('gate_');
            terrainAssets[t] = isGateTerrain
                ? `assets/terrain/${t}.png`
                : `assets/terrain/individual/${t}.png`;
        });
        const edgeTrapezoidAssets = {};
        const edgeTerrainGroups = ['grass', 'earth', 'mud', 'sand', 'snow', 'rock'];
        const edgeWaterTerrainGroups = ['water_shallow', 'water_deep'];
        const edgeDirections = ['w', 'sw', 'se'];
        const edgeTerrainDiffs = [-1, 0, 1];
        const edgeCliffDiffs = [-3, -2, 2, 3];
        const getEdgeDiffName = (diff) => diff > 0 ? `plus${diff}` : diff < 0 ? `minus${Math.abs(diff)}` : 'zero';
        edgeTerrainGroups.forEach(terrain => {
            edgeDirections.forEach(direction => {
                edgeTerrainDiffs.forEach(diff => {
                    const diffName = getEdgeDiffName(diff);
                    edgeTrapezoidAssets[`edge_trapezoid_${terrain}_${direction}_${diffName}`] =
                        `assets/terrain/edge_trapezoids/${terrain}/${direction}_${diffName}.png`;
                });
            });
        });
        edgeWaterTerrainGroups.forEach(terrain => {
            edgeDirections.forEach(direction => {
                edgeTerrainDiffs.forEach(diff => {
                    const diffName = getEdgeDiffName(diff);
                    edgeTrapezoidAssets[`edge_trapezoid_${terrain}_${direction}_${diffName}`] =
                        `assets/terrain/edge_trapezoids/${terrain}/${direction}_${diffName}.png`;
                });
            });
        });
        edgeDirections.forEach(direction => {
            edgeCliffDiffs.forEach(diff => {
                const diffName = getEdgeDiffName(diff);
                edgeTrapezoidAssets[`edge_trapezoid_rocky_cliff_${direction}_${diffName}`] =
                    `assets/terrain/edge_trapezoids/rocky_cliff/${direction}_${diffName}.png`;
            });
        });

        // Character names for dedicated portraits
        const portraitNames = [
            'Liu-Bei', 'Guan-Yu', 'Zhang-Fei', 'Cao-Cao', 'Cao-Ren', 'Zhou-Jing', 'Diaochan', 
            'Deng-Mao', 'Cheng-Yuanzhi', 'The-Noticeboard', 'Yellow-Turban',
            'Dong-Zhuo', 'Zhang-Jiao', 'Zhang-Bao',
            'Huangfu-Song-generic', 'Zhu-Jun-generic',
            'farmer',
            'farmer-v1',
            'farmer-v2',
            'farmer-v3',
            'farmer-v4',
            'farmer-v5',
            'farmer-female',
            'merchant',
            'blacksmith',
            'xiaoer',
            'soldier',
            'soldier-v1',
            'soldier-v2',
            'soldier-v3',
            'soldier-v4',
            'soldier-v5',
            'Zhang-Liang',
            'Gong-Jing',
            'Lu-Zhi'
        ];

        await Promise.all([
            assets.loadPortraits(portraitNames),
            assets.loadPalettes({
                'fairytale-forest': 'assets/palettes/fairytale-forest.hex',
                'vinik24': 'assets/palettes/vinik24.hex',
                'pastel-qt': 'assets/palettes/pastel-qt.hex',
                'japanese-woodblock': 'assets/palettes/japanese-woodblock.hex',
                'lost-century': 'assets/palettes/lost-century.hex',
                'retrocal-8': 'assets/palettes/retrocal-8.hex',
                'csc16': 'assets/palettes/csc16.hex',
                'cotten-candy-5': 'assets/palettes/cotten-candy-5.hex',
                'cookie-dough-7': 'assets/palettes/cookie-dough-7.hex',
                'fantasy-24': 'assets/palettes/fantasy-24.hex',
                'pinkgreen': 'assets/palettes/pinkgreen.hex',
                'resurrect-64': 'assets/palettes/resurrect-64.hex',
                'slso8': 'assets/palettes/slso8.hex',
                'steam-lords': 'assets/palettes/steam-lords.hex',
                'pico-8': 'assets/palettes/pico-8.hex',
                'hollow': 'assets/palettes/hollow.hex',
                'dusty-plain': 'assets/palettes/dustyplain.hex',
                '31': 'assets/palettes/31.hex',
                'midnight-epipelagic': 'assets/palettes/midnight-epipelagic.hex',
                'midnight-ablaze': 'assets/palettes/midnight-ablaze.hex',
                'apollo': 'assets/palettes/apollo.hex',
                'goldrush': 'assets/palettes/goldrush.hex',
                'twilight-5': 'assets/palettes/twilight-5.hex',
                'tiffany-lamp': 'assets/palettes/tiffany-lamp.hex',
                'gold-and-blue': 'assets/palettes/gold-and-blue.hex',
                'funkyfuture-8': 'assets/palettes/funkyfuture-8.hex'
            }),
            assets.loadImages({
                title_en: 'assets/misc/three_kingdoms_stratagem_title_scaled.png',
                title_zh: 'assets/misc/三国玄机.png',
                settings_menu_icon: 'assets/ui_elements/settings_menu_icon.png',
                lightning_bolt_icon: 'assets/ui_elements/lightning_bolt.png',
                liubo_table: 'assets/misc/liubo_table.png',
                liubo_board: 'assets/liubo/board.png',
                liubo_piece_white_h: 'assets/liubo/piece_white_h.png',
                liubo_piece_white_v: 'assets/liubo/piece_white_v.png',
                liubo_piece_black_h: 'assets/liubo/piece_black_h.png',
                liubo_piece_black_v: 'assets/liubo/piece_black_v.png',
                liubo_owl_white_h: 'assets/liubo/owl_white_h.png',
                liubo_owl_white_v: 'assets/liubo/owl_white_v.png',
                liubo_owl_black_h: 'assets/liubo/owl_black_h.png',
                liubo_owl_black_v: 'assets/liubo/owl_black_v.png',
                liubo_stick_marked_h: 'assets/liubo/stick_marked_h.png',
                liubo_stick_unmarked_h: 'assets/liubo/stick_unmarked_h.png',
                liubo_stick_marked_v: 'assets/liubo/stick_marked_v.png',
                liubo_stick_unmarked_v: 'assets/liubo/stick_unmarked_v.png',
                liubo_cup: 'assets/liubo/cup.png',
                liubo_cup_empty: 'assets/liubo/cup_empty.png',
                intro_sky: 'assets/intro_animation/00_sky.png',
                intro_hills: 'assets/intro_animation/01_hills.png',
                intro_distant_army: 'assets/intro_animation/02_distant_army.png',
                intro_distant_army_flags: 'assets/intro_animation/02_distant_army_flags.png',
                intro_midground_army: 'assets/intro_animation/03_midground_army.png',
                intro_midground_army_flags: 'assets/intro_animation/03_midground_army_flags.png',
                intro_field: 'assets/intro_animation/04_field.png',
                intro_grass: 'assets/intro_animation/05_grass.png',
                intro_blades: 'assets/intro_animation/05_blades.png',
                intro_horse: 'assets/intro_animation/06_horse.png',
                intro_guandao: 'assets/intro_animation/07_guandao.png',
                horse_stand: 'assets/small_horse/small_horse_stand.png',
                horse_run: 'assets/small_horse/small_horse_run.png',
                noticeboard: 'assets/settings/village_noticeboard.png',
                inn: 'assets/settings/village_inn.png',
                inn_evening: 'assets/settings/village_inn_evening.png',
                peach_garden: 'assets/settings/peach_garden.png',
                army_camp: 'assets/settings/army_camp.png',
                urban_street: 'assets/settings/urban_street.png',
                urban_street_foreground: 'assets/settings/urban_street_foreground.png',
                dirt_road_city_in_distance: 'assets/settings/dirt_road_city_in_distance.png',
                china_map: 'assets/settings/china_map.png',
                camp_tent: 'assets/terrain/buildings/yellow_tent.png',
                hut: 'assets/terrain/buildings/green_hut.png',
                city: 'assets/terrain/buildings/red_house.png',
                lvbu: 'assets/characters/001_lvbu.png',
                dongzhuo: 'assets/characters/002_dongzhuo.png',
                caocao: 'assets/characters/031_caocao.png',
                caoren: 'assets/characters/034_caoren.png',
                liubei: 'assets/characters/048_liubei.png',
                guanyu: 'assets/characters/049_guanyu.png',
                zhangfei: 'assets/characters/050_zhangfei.png',
                zhugeliang: 'assets/characters/051_zhugeliang.png',
                zhoujing: 'assets/characters/071_chendeng.png',
                gongjing_sprite: 'assets/characters/067_dongyun.png',
                huangfusong_sprite: 'assets/characters/072_liyan.png',
                zhujun_sprite: 'assets/characters/073_chendao.png',
                yellowturban: 'assets/characters/097_yellowturban.png',
                xiaoer: 'assets/characters/086_xiaoer01.png',
                merchant: 'assets/characters/090_fushang01.png',
                blacksmith: 'assets/characters/091_tiejiang01.png',
                dengmao: 'assets/characters/028_xusheng.png',
                chengyuanzhi: 'assets/characters/027_chengpu.png',
                bandit1: 'assets/characters/088_qiangdao01.png',
                bandit2: 'assets/characters/089_qiangdao02.png',
                archer: 'assets/characters/098_archer.png',
                yellowturbanarcher: 'assets/characters/100_yellowturbanarcher.png',
                crossbowman: 'assets/characters/099_crossbowman.png',
                zhangjiao: 'assets/characters/005_zhangjiao.png',
                zhangbao: 'assets/characters/006_zhangbao.png',
                zhangliang: 'assets/characters/007_zhangliang.png',
                yellowturban: 'assets/characters/097_yellowturban.png',
                priest: 'assets/characters/085_daoshi01.png',
                farmer: 'assets/characters/083_nongfu01.png',
                farmer2: 'assets/characters/084_nongfu02.png',
                soldier: 'assets/characters/081_shibing001.png',
                butcher: 'assets/characters/082_tufu01.png',
                flag_01: 'assets/misc/flag_01.png',
                dummy: 'assets/misc/dummy.png',
                dummy_broken: 'assets/misc/dummy_broken.png',
                boulder: 'assets/misc/boulder.png',
                boulder_cracked: 'assets/misc/boulder_cracked.png',
                boulder_destroyed: 'assets/misc/boulder_destroyed.png',
                boulder_shadow: 'assets/misc/boulder_shadow.png',
                lightning_sheet: 'assets/misc/lightning.png',
                cage: 'assets/terrain/individual/cage.png',
                cage_damaged: 'assets/terrain/individual/cage_damaged.png',
                cage_more_damaged: 'assets/terrain/individual/cage_more_damaged.png',
                cage_destroyed: 'assets/terrain/individual/cage_destroyed.png',
                fire_yellow_01: 'assets/fire/fire_yellow_01.png',
                fire_yellow_02: 'assets/fire/fire_yellow_02.png',
                fire_yellow_03: 'assets/fire/fire_yellow_03.png',
                fire_yellow_04: 'assets/fire/fire_yellow_04.png',
                fire_yellow_05: 'assets/fire/fire_yellow_05.png',
                fire_yellow_06: 'assets/fire/fire_yellow_06.png',
                fire_yellow_07: 'assets/fire/fire_yellow_07.png',
                fire_yellow_08: 'assets/fire/fire_yellow_08.png',
                ...terrainAssets,
                ...edgeTrapezoidAssets
            }),
            assets.loadSounds({
                slash: 'assets/sfx/slash.ogg',
                stab: 'assets/sfx/stab.ogg',
                double_blades: 'assets/sfx/double_blades.ogg',
                green_dragon: 'assets/sfx/green_dragon.ogg',
                bash: 'assets/sfx/bash.ogg',
                whiff: 'assets/sfx/whiff.ogg',
                bow_fire: 'assets/sfx/bow_fire.ogg',
                arrow_hit: 'assets/sfx/arrow_hit.ogg',
                building_damage: 'assets/sfx/building_damage.ogg',
                ice_crack: 'assets/sfx/ice_crack.ogg',
                ice_break: 'assets/sfx/ice_break.ogg',
                collision: 'assets/sfx/collision.ogg',
                bump_damage: 'assets/sfx/bump_damage.ogg',
                boulder_impact: 'assets/sfx/boulder_impact.ogg',
                boulder_roll: 'assets/sfx/boulder_roll.ogg',
                boulder_roll_2: 'assets/sfx/boulder_roll.ogg',
                splash: 'assets/sfx/water_splash_realistic.ogg',
                shing: 'assets/sfx/shing.ogg',
                step_grass: 'assets/sfx/step_grass.ogg',
                step_water: 'assets/sfx/step_water.ogg',
                step_sand: 'assets/sfx/step_sand.ogg',
                step_stone: 'assets/sfx/step_stone.ogg',
                step_generic: 'assets/sfx/step_generic.ogg',
                ui_click: 'assets/sfx/step_generic.ogg',
                step_water_walk: 'assets/sfx/water_wade.ogg',
                death_a: 'assets/sfx/death_a.ogg',
                death_b: 'assets/sfx/death_b.ogg',
                horse_gallop_loop: 'assets/sfx/horse_gallop_loop.ogg',
                horse_neigh_a: 'assets/sfx/horse_neigh_a.ogg',
                horse_neigh_b: 'assets/sfx/horse_neigh_b.ogg',
                horse_neigh_c: 'assets/sfx/horse_neigh_c.ogg',
                horse_snort: 'assets/sfx/horse_snort.ogg',
                death: 'assets/sfx/death.ogg',
                gong: 'assets/sfx/gong.ogg',
                war_horn: 'assets/sfx/war_horn.ogg',
                heavy_door_unlocking: 'assets/sfx/heavy-door-unlocking.ogg',
                unsheath_sword: 'assets/sfx/unsheath_sword.ogg',
                fire_crackle_loop: 'assets/sfx/fire_crackle_loop.ogg',
                rain_gentle_loop: 'assets/sfx/rain_gentle_loop.ogg',
                lightning_strike: 'assets/sfx/lightning-strike.ogg'
            }, {
                preload: ['ui_click', 'gong', 'unsheath_sword']
            }),
            assets.loadMusic({
                title_loop: 'assets/music/title_loop.ogg',
                campaign_intro: 'assets/music/campaign_intro.ogg',
                campaign_loop: 'assets/music/campaign_loop.ogg',
                narrative_loop: 'assets/music/narrative_loop.ogg',
                battle_intro: 'assets/music/battle_intro.ogg',
                battle_loop: 'assets/music/battle_loop.ogg',
                oath_intro: 'assets/music/oath_intro.ogg',
                oath_loop: 'assets/music/oath_loop.ogg',
                forest_intro: 'assets/music/forest_intro.ogg',
                forest_loop: 'assets/music/forest_loop.ogg',
                grim_refugees_loop: 'assets/music/grim_refugees_loop.ogg',
                liubo_intro: 'assets/music/liubo_intro.ogg',
                liubo_loop: 'assets/music/liubo_loop.ogg'
            }, {
                preload: ['title_loop']
            })
        ]);

        // Create flipped/recolored version of army_camp for Lu Zhi's camp
        const armyCamp = assets.getImage('army_camp');
        if (armyCamp) {
            const canvas = document.createElement('canvas');
            canvas.width = armyCamp.width;
            canvas.height = armyCamp.height;
            const ctx = canvas.getContext('2d');
            // Flip horizontally
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(armyCamp, 0, 0);
            // Apply slight color shift for different look (more blue/grey tones)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                // Shift towards cooler tones (reduce red, boost blue slightly)
                data[i] = Math.max(0, data[i] - 15);      // R
                data[i + 2] = Math.min(255, data[i + 2] + 10); // B
            }
            ctx.putImageData(imageData, 0, 0);
            // Store as new image
            const flippedImg = new Image();
            flippedImg.src = canvas.toDataURL();
            assets.images['army_camp_flipped'] = flippedImg;
        }

        // Horse variants ("shaders"): generate recolored canvases for stand+run.
        // Note: the base horse art is very dark, so we recolor *all non-transparent pixels*
        // instead of relying on multiplicative tinting (which won't change pure-black pixels).
        const makeHorseVariant = (baseKey, outKey, transformFn) => {
            const img = assets.getImage(baseKey);
            if (!img) return;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a < 10) continue;
                const [r, g, b] = transformFn(data[i], data[i + 1], data[i + 2]);
                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, b));
            }
            ctx.putImageData(imageData, 0, 0);
            assets.images[outKey] = canvas;
        };

        const lum = (r, g, b) => (r + g + b) / 3;
        const shade = (v, minV, maxV) => Math.max(minV, Math.min(maxV, v));
        const preserveDark = (r, g, b, v, fn) => {
            // Preserve very dark outline pixels from the original art so horses don't look washed out.
            // (These are typically #000000 / near-black pixels used for linework.)
            if (v <= 18) return [r, g, b];
            return fn(v);
        };

        // Brown: warm recolor
        makeHorseVariant('horse_stand', 'horse_stand_brown', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => [
                shade(110 + vv * 0.55, 90, 210),
                shade(55 + vv * 0.35, 40, 150),
                shade(30 + vv * 0.25, 20, 120)
            ]);
        });
        makeHorseVariant('horse_run', 'horse_run_brown', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => [
                shade(110 + vv * 0.55, 90, 210),
                shade(55 + vv * 0.35, 40, 150),
                shade(30 + vv * 0.25, 20, 120)
            ]);
        });

        // Black: keep dark but not pure-black everywhere
        makeHorseVariant('horse_stand', 'horse_stand_black', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => {
                const v2 = shade(25 + vv * 0.25, 18, 80);
                return [v2, v2, v2];
            });
        });
        makeHorseVariant('horse_run', 'horse_run_black', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => {
                const v2 = shade(25 + vv * 0.25, 18, 80);
                return [v2, v2, v2];
            });
        });

        // White: light grey/white with preserved shading
        makeHorseVariant('horse_stand', 'horse_stand_white', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => {
                const v2 = shade(185 + vv * 0.28, 170, 245);
                return [v2, v2, v2];
            });
        });
        makeHorseVariant('horse_run', 'horse_run_white', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => {
                const v2 = shade(185 + vv * 0.28, 170, 245);
                return [v2, v2, v2];
            });
        });

        // Red Hare: saturated warm red
        makeHorseVariant('horse_stand', 'horse_stand_redhare', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => [
                shade(165 + vv * 0.35, 140, 255),
                shade(40 + vv * 0.18, 30, 160),
                shade(25 + vv * 0.12, 18, 120)
            ]);
        });
        makeHorseVariant('horse_run', 'horse_run_redhare', (r, g, b) => {
            const v = lum(r, g, b);
            return preserveDark(r, g, b, v, (vv) => [
                shade(165 + vv * 0.35, 140, 255),
                shade(40 + vv * 0.18, 30, 160),
                shade(25 + vv * 0.12, 18, 120)
            ]);
        });

        // Default terrain colors: no global palette remap.

        // Imperial camp tents: recolor yellow tent art to a pale white canvas variant.
        const baseTent = assets.getImage('tent');
        if (baseTent) {
            const rgbToHueSat = (r, g, b) => {
                const rn = r / 255;
                const gn = g / 255;
                const bn = b / 255;
                const max = Math.max(rn, gn, bn);
                const min = Math.min(rn, gn, bn);
                const delta = max - min;
                let hue = 0;
                if (delta > 0.0001) {
                    if (max === rn) hue = ((gn - bn) / delta) % 6;
                    else if (max === gn) hue = (bn - rn) / delta + 2;
                    else hue = (rn - gn) / delta + 4;
                    hue *= 60;
                    if (hue < 0) hue += 360;
                }
                const sat = max <= 0.0001 ? 0 : delta / max;
                return { hue, sat };
            };

            const tentCanvas = document.createElement('canvas');
            tentCanvas.width = baseTent.width;
            tentCanvas.height = baseTent.height;
            const tctx = tentCanvas.getContext('2d', { willReadFrequently: true });
            tctx.imageSmoothingEnabled = false;
            tctx.drawImage(baseTent, 0, 0);
            const imageData = tctx.getImageData(0, 0, tentCanvas.width, tentCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const lum = (r + g + b) / 3;
                if (lum <= 18) continue; // Keep dark line art intact.

                // Only recolor yellow cloth pixels. Keep brown/mud pixels unchanged.
                const { hue, sat } = rgbToHueSat(r, g, b);
                const isYellowCloth = hue >= 38 && hue <= 72 && sat >= 0.22;
                if (!isYellowCloth) continue;

                const v = Math.max(155, Math.min(245, 165 + lum * 0.35));
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = Math.min(255, v + 4);
            }
            tctx.putImageData(imageData, 0, 0);
            tentCanvas.silhouette = baseTent.silhouette;
            assets.images['tent_white'] = tentCanvas;
        }

        // Urban foreground art includes a black matte in the center; convert near-black to transparent
        // so actors/background remain visible behind the foreground pillars.
        const urbanFg = assets.getImage('urban_street_foreground');
        if (urbanFg) {
            const fgCanvas = document.createElement('canvas');
            fgCanvas.width = urbanFg.width;
            fgCanvas.height = urbanFg.height;
            const fgCtx = fgCanvas.getContext('2d', { willReadFrequently: true });
            fgCtx.imageSmoothingEnabled = false;
            fgCtx.drawImage(urbanFg, 0, 0);
            const fgData = fgCtx.getImageData(0, 0, fgCanvas.width, fgCanvas.height);
            const data = fgData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                if (data[i] <= 12 && data[i + 1] <= 12 && data[i + 2] <= 12) {
                    data[i + 3] = 0;
                }
            }
            fgCtx.putImageData(fgData, 0, 0);
            fgCanvas.silhouette = assets.analyzeSilhouette(fgCanvas);
            assets.images['urban_street_foreground'] = fgCanvas;
        }

        sceneManager.switchTo('title');
        hideBootLoader();

        function gameLoop(timestamp) {
            sceneManager.update(timestamp);
            sceneManager.render(timestamp);
            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);

    } catch (err) {
        console.error('Failed to initialize game', err);
        showBootLoadError();
    }
}

init();

import { assets } from './core/AssetLoader.js';
import { SceneManager } from './core/SceneManager.js';
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

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const config = {
    virtualWidth: 256,
    virtualHeight: 256,
    tileWidth: 36,
    tileHeight: 36,
    baseDepth: 6,
    horizontalSpacing: 23, 
    verticalSpacing: 17,   
    mapWidth: 10,
    mapHeight: 12
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
    'house_01', 'house_damaged_01', 'house_destroyed_01', 'wall_01',
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

    // Scale canvas to the largest size that fits the viewport (maintain aspect ratio)
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scale = Math.max(1, Math.min(screenWidth / config.virtualWidth, screenHeight / config.virtualHeight));
    canvas.style.width = `${Math.floor(config.virtualWidth * scale)}px`;
    canvas.style.height = `${Math.floor(config.virtualHeight * scale)}px`;
}

/**
 * Take 1920x1080 screenshots from the 256x256 canvas
 * Creates three 16:9 crops (top, middle, bottom) and one letterboxed version
 * Saves all screenshots in a single zip file
 */
async function takeScreenshots(ctx, canvas, config) {
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
    
    // Copy current canvas to source
    sourceCtx.drawImage(canvas, 0, 0);
    
    // Create output canvas for scaling
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = TARGET_WIDTH;
    outputCanvas.height = TARGET_HEIGHT;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    
    // Helper to generate a screenshot blob
    function generateScreenshot(cropX, cropY, cropW, cropH) {
        return new Promise((resolve) => {
            // Clear output canvas
            outputCtx.fillStyle = '#000';
            outputCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
            
            // Draw cropped section scaled up (nearest-neighbor)
            outputCtx.drawImage(
                sourceCanvas,
                cropX, cropY, cropW, cropH,  // Source crop
                0, 0, TARGET_WIDTH, TARGET_HEIGHT  // Destination (full size)
            );
            
            // Convert to blob
            outputCanvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    }
    
    console.log('Generating screenshots...');
    
    // Generate all 4 screenshots
    const screenshots = [];
    
    // Three 16:9 crops: top, middle, bottom
    const cropYPositions = [
        { y: 0, name: 'top' },
        { y: Math.floor((SOURCE_HEIGHT - CROP_HEIGHT) / 2), name: 'middle' },
        { y: SOURCE_HEIGHT - CROP_HEIGHT, name: 'bottom' }
    ];
    
    for (const { y, name } of cropYPositions) {
        const blob = await generateScreenshot(0, y, SOURCE_WIDTH, CROP_HEIGHT);
        screenshots.push({ blob, filename: `screenshot_${name}_1920x1080.png` });
    }
    
    // Create letterboxed version (256x256 scaled up with black bars on sides)
    const letterboxScale = TARGET_HEIGHT / SOURCE_HEIGHT; // 1080 / 256 = 4.21875
    const letterboxWidth = Math.floor(SOURCE_WIDTH * letterboxScale); // 256 * 4.21875 = 1080
    const letterboxX = Math.floor((TARGET_WIDTH - letterboxWidth) / 2); // Center horizontally
    
    outputCtx.fillStyle = '#000';
    outputCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    outputCtx.drawImage(
        sourceCanvas,
        0, 0, SOURCE_WIDTH, SOURCE_HEIGHT,
        letterboxX, 0, letterboxWidth, TARGET_HEIGHT
    );
    
    const letterboxBlob = await new Promise((resolve) => {
        outputCanvas.toBlob((blob) => resolve(blob), 'image/png');
    });
    screenshots.push({ blob: letterboxBlob, filename: 'screenshot_letterbox_1920x1080.png' });
    
    // Create zip file
    console.log('Creating zip file...');
    const zip = new JSZip();
    for (const { blob, filename } of screenshots) {
        zip.file(filename, blob);
    }
    
    // Generate zip blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `screenshots_${timestamp}.zip`;
    
    // Download the zip file (single dialog)
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
    window.addEventListener('resize', setupCanvas);

    const sceneManager = new SceneManager(ctx, canvas, config);
    sceneManager.addScene('title', new TitleScene());
    sceneManager.addScene('custom_battle', new CustomBattleMenuScene());
    sceneManager.addScene('campaign_selection', new CampaignSelectionScene());
    sceneManager.addScene('map', new MapScene());
    sceneManager.addScene('tactics', new TacticsScene());
    sceneManager.addScene('narrative', new NarrativeScene());
    sceneManager.addScene('summary', new BattleSummaryScene());
    sceneManager.addScene('recovery', new RecoveryScene());
    sceneManager.addScene('levelup', new LevelUpScene());
    sceneManager.addScene('credits', new CreditsScene());

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
                takeScreenshots(ctx, canvas, config).catch(err => {
                    console.error('Screenshot error:', err);
                });
            }
            if (inputBuffer.endsWith('brief')) {
                inputBuffer = "";
                // Jump to the Magistrate Briefing script
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.switchTo('narrative', {
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
                    }),
                    script: [
                        { type: 'title', text: "THE VOLUNTEER ARMY", subtext: "Zhuo County Headquarters", duration: 3000 },
                        { bg: 'army_camp', type: 'command', action: 'clearActors' },
                        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 150, flip: true },
                        { type: 'command', action: 'addActor', id: 'guard1', imgKey: 'soldier', x: 160, y: 140, flip: true },
                        { type: 'command', action: 'addActor', id: 'guard2', imgKey: 'soldier', x: 200, y: 140, flip: true },
                        { type: 'command', action: 'addActor', id: 'soldier3', imgKey: 'soldier', x: 20, y: 150, speed: 0.2 },
                        { type: 'command', action: 'addActor', id: 'soldier4', imgKey: 'soldier', x: 230, y: 145, flip: true, speed: 0.1 },
                        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 240, speed: 1 },
                        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -80, y: 250, speed: 1 },
                        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -120, y: 255, speed: 1 },
                        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
                        { type: 'command', action: 'move', id: 'liubei', x: 100, y: 190, wait: false },
                        { type: 'command', action: 'move', id: 'guanyu', x: 65, y: 190, wait: false },
                        { type: 'command', action: 'move', id: 'zhangfei', x: 135, y: 190, wait: false },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_01',
                            text: "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'daxing_lb_01',
                            text: "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'daxing_lb_02',
                            text: "We have raised a force of five hundred volunteers to serve our country and protect the people."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_02',
                            text: "An Imperial kinsman! Truly, the Heavens have not abandoned the Han. Your arrival is most timely."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_03',
                            text: "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'daxing_zf_01',
                            text: "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!"
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'daxing_gy_01',
                            text: "Third brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'daxing_lb_03',
                            text: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_04',
                            text: "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!"
                        },
                        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
                        { 
                            type: 'title', 
                            text: "BATTLE OF DAXING DISTRICT", 
                            subtext: "First Strike against the Yellow Turbans", 
                            duration: 3000 
                        }
                    ]
                });
            }
            if (inputBuffer.endsWith('story')) {
                inputBuffer = "";
                sceneManager.switchTo('narrative', {
                    script: [
                        { type: 'title', text: 'DEBUG: NARRATIVE', subtext: 'Testing narrative scene' },
                        { type: 'dialogue', name: 'System', voiceId: 'debug_narrative_01', text: 'Cheat code accepted. Narrative scene is functional.' }
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
            terrainAssets[t] = `assets/terrain/individual/${t}.png`;
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
                'fairytale-forest': 'assets/palettes/fairytale-forest.txt'
            }),
            assets.loadImages({
                title_en: 'assets/misc/three_kingdoms_stratagem_title.png',
                title_zh: 'assets/misc/三国玄机.png',
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
                boulder: 'assets/misc/boulder.png',
                boulder_cracked: 'assets/misc/boulder_cracked.png',
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
                ...terrainAssets
            }),
            assets.loadSounds({
                slash: 'assets/sfx/slash.wav',
                stab: 'assets/sfx/stab.wav',
                double_blades: 'assets/sfx/double_blades.wav',
                green_dragon: 'assets/sfx/green_dragon.wav',
                bash: 'assets/sfx/bash.wav',
                whiff: 'assets/sfx/whiff.wav',
                bow_fire: 'assets/sfx/bow_fire.wav',
                arrow_hit: 'assets/sfx/arrow_hit.wav',
                building_damage: 'assets/sfx/building_damage.wav',
                ice_crack: 'assets/sfx/ice_crack.wav',
                ice_break: 'assets/sfx/ice_break.wav',
                collision: 'assets/sfx/collision.wav',
                splash: 'assets/sfx/water_splash_realistic.mp3',
                shing: 'assets/sfx/shing.wav',
                step_grass: 'assets/sfx/step_grass.wav',
                step_water: 'assets/sfx/step_water.wav',
                step_sand: 'assets/sfx/step_sand.wav',
                step_stone: 'assets/sfx/step_stone.wav',
                step_generic: 'assets/sfx/step_generic.wav',
                ui_click: 'assets/sfx/step_generic.wav',
                step_water_walk: 'assets/sfx/step_water_walk.wav',
                death_a: 'assets/sfx/death_a.mp3',
                death_b: 'assets/sfx/death_b.mp3',
                horse_gallop_loop: 'assets/sfx/horse_gallop_loop.mp3',
                horse_neigh_a: 'assets/sfx/horse_neigh_a.mp3',
                horse_neigh_b: 'assets/sfx/horse_neigh_b.mp3',
                horse_neigh_c: 'assets/sfx/horse_neigh_c.mp3',
                horse_snort: 'assets/sfx/horse_snort.mp3',
                death: 'assets/sfx/death.wav',
                gong: 'assets/sfx/gong.mp3',
                unsheath_sword: 'assets/sfx/unsheath_sword.mp3',
                fire_crackle_loop: 'assets/sfx/fire_crackle_loop.mp3'
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
                grim_refugees_loop: 'assets/music/grim_refugees_loop.ogg'
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

        // Apply palette to terrain assets
        assets.palettizeKeys(TERRAIN_TYPES, 'fairytale-forest');

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

        function gameLoop(timestamp) {
            sceneManager.update(timestamp);
            sceneManager.render(timestamp);
            requestAnimationFrame(gameLoop);
        }
        requestAnimationFrame(gameLoop);

    } catch (err) {
        console.error('Failed to initialize game', err);
    }
}

init();

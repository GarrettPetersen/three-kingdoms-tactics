import { assets } from './core/AssetLoader.js';
import { SceneManager } from './core/SceneManager.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CustomBattleMenuScene } from './scenes/CustomBattleMenuScene.js';
import { CampaignSelectionScene } from './scenes/CampaignSelectionScene.js';
import { MapScene } from './scenes/MapScene.js';
import { TacticsScene } from './scenes/TacticsScene.js';
import { NarrativeScene } from './scenes/NarrativeScene.js';

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

    // Use CSS to scale the canvas to fit the window while maintaining aspect ratio
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const multiplier = Math.max(1, Math.floor(Math.min(screenWidth / config.virtualWidth, screenHeight / config.virtualHeight)));
    
    // We can either use a whole-number multiplier for sharpest pixels, 
    // or just let 'object-fit: contain' handle it in CSS.
    // Let's set a explicit style size to ensure it's large enough.
    canvas.style.width = `${config.virtualWidth * multiplier}px`;
    canvas.style.height = `${config.virtualHeight * multiplier}px`;
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

    canvas.addEventListener('pointerdown', (e) => sceneManager.handleInput(e));

    let inputBuffer = "";
    window.addEventListener('keydown', (e) => {
        if (e.key.length === 1) {
            inputBuffer += e.key.toLowerCase();
            if (inputBuffer.endsWith('title')) sceneManager.switchTo('title');
            if (inputBuffer.endsWith('camp')) sceneManager.switchTo('campaign_selection');
            if (inputBuffer.endsWith('map')) sceneManager.switchTo('map');
            if (inputBuffer.endsWith('battle')) sceneManager.switchTo('tactics', { battleId: 'custom' });
            if (inputBuffer.endsWith('brief')) {
                // Jump to the Magistrate Briefing script
                sceneManager.switchTo('narrative', {
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
                            portraitKey: 'zhoujing',
                            name: 'Zhou Jing',
                            position: 'top',
                            text: "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liubei',
                            name: 'Liu Bei',
                            position: 'top',
                            text: "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liubei',
                            name: 'Liu Bei',
                            position: 'top',
                            text: "We have raised a force of five hundred volunteers to serve our country and protect the people."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhoujing',
                            name: 'Zhou Jing',
                            position: 'top',
                            text: "An Imperial kinsman! Truly, the Heavens have not abandoned the Han. Your arrival is most timely."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhoujing',
                            name: 'Zhou Jing',
                            position: 'top',
                            text: "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhangfei',
                            name: 'Zhang Fei',
                            position: 'top',
                            text: "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!"
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'guanyu',
                            name: 'Guan Yu',
                            position: 'top',
                            text: "Eldest brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'liubei',
                            name: 'Liu Bei',
                            position: 'top',
                            text: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhoujing',
                            name: 'Zhou Jing',
                            position: 'top',
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
                sceneManager.switchTo('narrative', {
                    script: [
                        { type: 'title', text: 'DEBUG: NARRATIVE', subtext: 'Testing narrative scene' },
                        { type: 'dialogue', name: 'System', text: 'Cheat code accepted. Narrative scene is functional.' }
                    ]
                });
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

        await Promise.all([
            assets.loadPalettes({
                vinik24: 'assets/palettes/vinik24.txt'
            }),
            assets.loadImages({
                title: 'assets/misc/three_kingdoms_stratagem_title.png',
                noticeboard: 'assets/settings/village_noticeboard.png',
                inn: 'assets/settings/village_inn.png',
                inn_evening: 'assets/settings/village_inn_evening.png',
                peach_garden: 'assets/settings/peach_garden.png',
                army_camp: 'assets/settings/army_camp.png',
                china_map: 'assets/settings/china_map.png',
                tent: 'assets/terrain/buildings/yellow_tent.png',
                lvbu: 'assets/characters/001_lvbu.png',
                dongzhuo: 'assets/characters/002_dongzhuo.png',
                liubei: 'assets/characters/048_liubei.png',
                guanyu: 'assets/characters/049_guanyu.png',
                zhangfei: 'assets/characters/050_zhangfei.png',
                zhugeliang: 'assets/characters/051_zhugeliang.png',
                zhoujing: 'assets/characters/064_jiangwan.png',
                yellowturban: 'assets/characters/097_yellowturban.png',
                merchant: 'assets/characters/090_fushang01.png',
                blacksmith: 'assets/characters/091_tiejiang01.png',
                bandit1: 'assets/characters/088_qiangdao01.png',
                bandit2: 'assets/characters/089_qiangdao02.png',
                zhangjiao: 'assets/characters/005_zhangjiao.png',
                zhangbao: 'assets/characters/006_zhangbao.png',
                zhangliang: 'assets/characters/007_zhangliang.png',
                yellowturban: 'assets/characters/097_yellowturban.png',
                priest: 'assets/characters/085_daoshi01.png',
                farmer: 'assets/characters/083_nongfu01.png',
                farmer2: 'assets/characters/084_nongfu02.png',
                soldier: 'assets/characters/081_shibing001.png',
                butcher: 'assets/characters/082_tufu01.png',
                ...terrainAssets
            }),
            assets.loadSounds({
                slash: 'assets/sfx/slash.wav',
                stab: 'assets/sfx/stab.wav',
                double_blades: 'assets/sfx/double_blades.wav',
                green_dragon: 'assets/sfx/green_dragon.wav',
                bash: 'assets/sfx/bash.wav',
                collision: 'assets/sfx/collision.wav',
                splash: 'assets/sfx/splash.wav',
                step_grass: 'assets/sfx/step_grass.wav',
                step_water: 'assets/sfx/step_water.wav',
                step_sand: 'assets/sfx/step_sand.wav',
                step_stone: 'assets/sfx/step_stone.wav',
                step_generic: 'assets/sfx/step_generic.wav'
            }),
            assets.loadMusic({
                title_loop: 'assets/music/title_loop.ogg',
                campaign_intro: 'assets/music/campaign_intro.ogg',
                campaign_loop: 'assets/music/campaign_loop.ogg',
                narrative_loop: 'assets/music/narrative_loop.ogg',
                battle_intro: 'assets/music/battle_intro.ogg',
                battle_loop: 'assets/music/battle_loop.ogg'
            })
        ]);

        // Apply palette to terrain assets
        assets.palettizeKeys(TERRAIN_TYPES, 'vinik24');

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

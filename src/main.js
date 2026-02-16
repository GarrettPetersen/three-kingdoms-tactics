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
    sceneManager.addScene('summary', new BattleSummaryScene());
    sceneManager.addScene('recovery', new RecoveryScene());
    sceneManager.addScene('levelup', new LevelUpScene());
    sceneManager.addScene('credits', new CreditsScene());

    canvas.addEventListener('pointerdown', (e) => sceneManager.handleInput(e));

    let inputBuffer = "";
    window.addEventListener('keydown', (e) => {
        // Allow scenes to handle specific keys (like Enter to advance text)
        sceneManager.handleKeyDown(e);

        if (e.key.length === 1) {
            inputBuffer += e.key.toLowerCase();
            if (inputBuffer.endsWith('title')) { sceneManager.switchTo('title'); inputBuffer = ""; }
            if (inputBuffer.endsWith('camp')) { sceneManager.switchTo('campaign_selection'); inputBuffer = ""; }
            if (inputBuffer.endsWith('map')) { sceneManager.switchTo('map'); inputBuffer = ""; }
            if (inputBuffer.endsWith('battle')) { 
                inputBuffer = ""; 
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.switchTo('tactics', { battleId: 'daxing' }); 
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
                sceneManager.switchTo('map', { campaignId: 'liubei', partyX: 182, partyY: 85 });
            }
            if (inputBuffer.endsWith('guangzong')) {
                inputBuffer = "";
                sceneManager.gameState.addMilestone('prologue_complete');
                sceneManager.gameState.addMilestone('daxing');
                sceneManager.gameState.addMilestone('qingzhou_siege');
                sceneManager.gameState.addMilestone('qingzhou_cleanup');
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
            'Liu-Bei', 'Guan-Yu', 'Zhang-Fei', 'Zhou-Jing', 'Diaochan', 
            'Deng-Mao', 'Cheng-Yuanzhi', 'The-Noticeboard', 'Yellow-Turban',
            'Dong-Zhuo', 'Zhang-Jiao', 'Zhang-Bao',
            // Custom portraits for NPCs
            'Custom-Male-10',  // Zhang Jue (Lord of Heaven)
            'Custom-Male-12',  // Zhang Liang (Lord of Human)
            'Custom-Male-17',  // Gong Jing (Imperial Protector)
            'Custom-Male-22'   // Lu Zhi (Commander)
        ];

        await Promise.all([
            assets.loadPortraits(portraitNames),
            assets.loadPalettes({
                vinik24: 'assets/palettes/vinik24.txt'
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
                noticeboard: 'assets/settings/village_noticeboard.png',
                inn: 'assets/settings/village_inn.png',
                inn_evening: 'assets/settings/village_inn_evening.png',
                peach_garden: 'assets/settings/peach_garden.png',
                army_camp: 'assets/settings/army_camp.png',
                dirt_road_city_in_distance: 'assets/settings/dirt_road_city_in_distance.png',
                china_map: 'assets/settings/china_map.png',
                tent: 'assets/terrain/buildings/yellow_tent.png',
                hut: 'assets/terrain/buildings/green_hut.png',
                city: 'assets/terrain/buildings/red_house.png',
                lvbu: 'assets/characters/001_lvbu.png',
                dongzhuo: 'assets/characters/002_dongzhuo.png',
                liubei: 'assets/characters/048_liubei.png',
                guanyu: 'assets/characters/049_guanyu.png',
                zhangfei: 'assets/characters/050_zhangfei.png',
                zhugeliang: 'assets/characters/051_zhugeliang.png',
                zhoujing: 'assets/characters/071_chendeng.png',
                gongjing_sprite: 'assets/characters/067_dongyun.png',
                yellowturban: 'assets/characters/097_yellowturban.png',
                merchant: 'assets/characters/090_fushang01.png',
                blacksmith: 'assets/characters/091_tiejiang01.png',
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
                splash: 'assets/sfx/splash.wav',
                shing: 'assets/sfx/shing.wav',
                step_grass: 'assets/sfx/step_grass.wav',
                step_water: 'assets/sfx/step_water.wav',
                step_sand: 'assets/sfx/step_sand.wav',
                step_stone: 'assets/sfx/step_stone.wav',
                step_generic: 'assets/sfx/step_generic.wav',
                ui_click: 'assets/sfx/step_generic.wav',
                step_water_walk: 'assets/sfx/step_water_walk.wav',
                death: 'assets/sfx/death.wav',
                gong: 'assets/sfx/gong.mp3',
                unsheath_sword: 'assets/sfx/unsheath_sword.mp3'
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
                forest_loop: 'assets/music/forest_loop.ogg'
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

import { assets } from './core/AssetLoader.js';
import { SceneManager } from './core/SceneManager.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CampaignScene } from './scenes/CampaignScene.js';
import { TacticsScene } from './scenes/TacticsScene.js';
import { NarrativeScene } from './scenes/NarrativeScene.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const config = {
    scale: 3, 
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
    'water_shallow_01', 'water_shallow_02', 'water_deep_01', 'water_deep_02',
    'forest_01', 'forest_02', 'forest_03', 'forest_04', 'forest_05',
    'earth_cracked', 'earth_rocky',
    'mountain_stone_01', 'mountain_stone_02', 'mountain_stone_03', 'earth_stone',
    'town_pavement', 'town_building_01', 'town_building_02', 'town_building_03', 'town_road', 'town_building_04', 'town_building_05', 'town_square',
    'mud_01', 'mud_02', 'mud_03', 'mud_04', 'mud_05', 'mud_06', 'mud_07',
    'jungle_01', 'jungle_02', 'jungle_03', 'jungle_04', 'jungle_05', 'jungle_06', 'jungle_07',
    'mountain_snowy_01', 'mountain_snowy_02'
];

function setupCanvas() {
    canvas.width = Math.floor(window.innerWidth / config.scale);
    canvas.height = Math.floor(window.innerHeight / config.scale);
    ctx.imageSmoothingEnabled = false;
    canvas.style.width = `${canvas.width * config.scale}px`;
    canvas.style.height = `${canvas.height * config.scale}px`;
}

async function init() {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    const sceneManager = new SceneManager(ctx, canvas, config);
    sceneManager.addScene('title', new TitleScene());
    sceneManager.addScene('campaign', new CampaignScene());
    sceneManager.addScene('tactics', new TacticsScene());
    sceneManager.addScene('narrative', new NarrativeScene());

    canvas.addEventListener('pointerdown', (e) => sceneManager.handleInput(e));

    let inputBuffer = "";
    window.addEventListener('keydown', (e) => {
        if (e.key.length === 1) {
            inputBuffer += e.key.toLowerCase();
            if (inputBuffer.endsWith('title')) sceneManager.switchTo('title');
            if (inputBuffer.endsWith('camp')) sceneManager.switchTo('campaign');
            if (inputBuffer.endsWith('battle')) sceneManager.switchTo('tactics');
            if (inputBuffer.endsWith('brief')) {
                // Jump to the Magistrate Briefing script
                sceneManager.switchTo('narrative', {
                    onComplete: () => sceneManager.switchTo('tactics'),
                    script: [
                        { type: 'title', text: "THE VOLUNTEER ARMY", subtext: "Zhuo County Headquarters", duration: 3000 },
                        { bg: 'army_camp', type: 'command', action: 'clearActors' },
                        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 128, y: 180 },
                        { type: 'command', action: 'addActor', id: 'guard1', imgKey: 'soldier', x: 80, y: 170 },
                        { type: 'command', action: 'addActor', id: 'guard2', imgKey: 'soldier', x: 176, y: 170, flip: true },
                        { type: 'command', action: 'addActor', id: 'soldier3', imgKey: 'soldier', x: 20, y: 180, speed: 0.2 },
                        { type: 'command', action: 'addActor', id: 'soldier4', imgKey: 'soldier', x: 230, y: 175, flip: true, speed: 0.1 },
                        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 80, y: 280, speed: 1 },
                        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 40, y: 290, speed: 1 },
                        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 120, y: 295, flip: true, speed: 1 },
                        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
                        { type: 'command', action: 'move', id: 'liubei', x: 128, y: 220, wait: false },
                        { type: 'command', action: 'move', id: 'guanyu', x: 90, y: 220, wait: false },
                        { type: 'command', action: 'move', id: 'zhangfei', x: 166, y: 220, wait: false },
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

        await assets.loadImages({
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
            merchant: 'assets/characters/090_fushang01.png',
            blacksmith: 'assets/characters/091_tiejiang01.png',
            zhangjiao: 'assets/characters/005_zhangjiao.png',
            zhangbao: 'assets/characters/006_zhangbao.png',
            zhangliang: 'assets/characters/007_zhangliang.png',
            rebel1: 'assets/characters/088_qiangdao01.png',
            rebel2: 'assets/characters/089_qiangdao02.png',
            priest: 'assets/characters/085_daoshi01.png',
            farmer: 'assets/characters/083_nongfu01.png',
            farmer2: 'assets/characters/084_nongfu02.png',
            soldier: 'assets/characters/081_shibing001.png',
            butcher: 'assets/characters/082_tufu01.png',
            ...terrainAssets
        });

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

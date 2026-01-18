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
            china_map: 'assets/settings/china_map.png',
            tent: 'assets/terrain/buildings/yellow_tent.png',
            lvbu: 'assets/characters/001_lvbu.png',
            dongzhuo: 'assets/characters/002_dongzhuo.png',
            liubei: 'assets/characters/048_liubei.png',
            guanyu: 'assets/characters/049_guanyu.png',
            zhangfei: 'assets/characters/050_zhangfei.png',
            zhugeliang: 'assets/characters/051_zhugeliang.png',
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

const fs = require('fs');
const path = require('path');

const dir = 'assets/terrain/individual';
const mapping = {
    0: 'grass_01', 1: 'grass_flowers', 2: 'grass_02', 3: 'grass_03', 4: 'grass_04',
    5: 'sand_01', 6: 'sand_02', 7: 'sand_03', 8: 'sand_04', 9: 'sand_05',
    10: 'water_shallow_01', 11: 'water_shallow_02', 12: 'water_deep_01', 13: 'water_deep_02',
    14: 'forest_01', 15: 'forest_02', 16: 'forest_03', 17: 'forest_04', 18: 'forest_05',
    19: 'earth_cracked', 20: 'earth_rocky',
    21: 'mountain_stone_01', 22: 'mountain_stone_02', 23: 'mountain_stone_03', 24: 'earth_stone',
    25: 'town_pavement', 26: 'town_building_01', 27: 'town_building_02', 28: 'town_building_03', 29: 'town_road', 30: 'town_building_04', 31: 'town_building_05', 32: 'town_square',
    33: 'mud_01', 34: 'mud_02', 35: 'mud_03', 36: 'mud_04', 37: 'mud_05', 38: 'mud_06', 39: 'mud_07',
    40: 'jungle_01', 41: 'jungle_02', 42: 'jungle_03', 43: 'jungle_04', 44: 'jungle_05', 45: 'jungle_06', 46: 'jungle_07',
    47: 'mountain_snowy_01', 48: 'mountain_snowy_02'
};

Object.entries(mapping).forEach(([index, name]) => {
    const oldName = `tile_${index.toString().padStart(3, '0')}.png`;
    const newName = `${name}.png`;
    const oldPath = path.join(dir, oldName);
    const newPath = path.join(dir, newName);

    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed ${oldName} -> ${newName}`);
    }
});


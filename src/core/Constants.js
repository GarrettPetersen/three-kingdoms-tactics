export const ANIMATIONS = {
    standby:  { start: 0,  length: 4 },
    attack_1: { start: 4,  length: 4 },
    walk:     { start: 8,  length: 4 },
    attack_2: { start: 12, length: 4 },
    defense:  { start: 16, length: 4 },
    hit:      { start: 20, length: 4 },
    victory:  { start: 24, length: 4 },
    death:    { start: 28, length: 4 },
    recovery: { start: 32, length: 4 },
    sitting:  { start: 36, length: 4 }
};

export const ATTACKS = {
    serpent_spear: {
        name: { en: 'Serpent Spear', zh: '蛇矛' },
        damage: 1,
        range: 2,
        push: 'furthest', // Special: only push the furthest
        animation: 'attack_2',
        description: { en: 'Strikes in a line. Pushes the further target.', zh: '沿直线突刺，并击退最远目标。' }
    },
    serpent_spear_2: {
        name: { en: 'Serpent Spear II', zh: '蛇矛 II' },
        damage: 1,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Extended reach. Pushes the furthest target.', zh: '延长攻击距离，并击退最远目标。' }
    },
    serpent_spear_3: {
        name: { en: 'Serpent Spear III', zh: '蛇矛 III' },
        damage: 2,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Heavy strike. Pushes the furthest target.', zh: '重击突刺，并击退最远目标。' }
    },
    serpent_spear_4: {
        name: { en: 'Serpent Spear IV', zh: '蛇矛 IV' },
        damage: 2,
        range: 3,
        push: true, // All hexes
        animation: 'attack_2',
        description: { en: 'Ultimate strike. Pushes all targets in line.', zh: '极限突刺，击退直线上的全部目标。' }
    },
    caoren_spear: {
        name: { en: 'Long Spear', zh: '长矛' },
        damage: 1,
        range: 2,
        push: 'furthest', // Special: only push the furthest
        animation: 'attack_2',
        description: { en: 'Line thrust from behind the shield. Pushes the furthest target.', zh: '持盾前压后以长矛突刺，击退最远目标。' }
    },
    caoren_spear_2: {
        name: { en: 'Long Spear II', zh: '长矛 II' },
        damage: 1,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Extended reach. Pushes the furthest target.', zh: '延长攻击距离，并击退最远目标。' }
    },
    caoren_spear_3: {
        name: { en: 'Long Spear III', zh: '长矛 III' },
        damage: 2,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Heavy strike. Pushes the furthest target.', zh: '重击突刺，并击退最远目标。' }
    },
    caoren_spear_4: {
        name: { en: 'Long Spear IV', zh: '长矛 IV' },
        damage: 2,
        range: 3,
        push: true, // All hexes
        animation: 'attack_2',
        description: { en: 'Ultimate strike. Pushes all targets in line.', zh: '极限突刺，击退直线上的全部目标。' }
    },
    green_dragon_slash: {
        name: { en: 'Green Dragon', zh: '青龙斩' },
        damage: 1,
        range: 2,
        animation: 'attack_1',
        description: { en: 'A massive sweeping arc.', zh: '大范围横扫。' }
    },
    green_dragon_slash_2: {
        name: { en: 'Green Dragon II', zh: '青龙斩 II' },
        damage: 2,
        range: 2,
        animation: 'attack_1',
        description: { en: 'Enhanced sweeping strike.', zh: '强化横扫一击。' }
    },
    green_dragon_slash_3: {
        name: { en: 'Green Dragon III', zh: '青龙斩 III' },
        damage: 2,
        range: 2,
        push: true,
        animation: 'attack_1',
        description: { en: 'Sweeping arc that pushes all targets.', zh: '横扫弧斩并击退全部目标。' }
    },
    green_dragon_slash_4: {
        name: { en: 'Green Dragon IV', zh: '青龙斩 IV' },
        damage: 3,
        range: 2,
        push: true,
        animation: 'attack_1',
        description: { en: 'Devastating sweep that pushes all targets.', zh: '毁灭性横扫，击退全部目标。' }
    },
    double_blades: {
        name: { en: 'Double Blades', zh: '双股剑' },
        damage: 1,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'Strikes front and back, pushing both.', zh: '前后同时出剑，并击退双方目标。' }
    },
    bash: {
        name: { en: 'Bash', zh: '猛击' },
        damage: 1,
        range: 1,
        push: 1,
        animation: 'attack_1',
        description: { en: 'A heavy strike that knocks the target back.', zh: '沉重打击并击退目标。' }
    },
    slash: {
        name: { en: 'Slash', zh: '斩击' },
        damage: 1,
        range: 1,
        animation: 'attack_1',
        description: { en: 'A standard sword strike.', zh: '标准剑斩。' }
    },
    slash_2: {
        name: { en: 'Slash II', zh: '斩击 II' },
        damage: 2,
        range: 1,
        animation: 'attack_1',
        description: { en: 'A powerful sword strike.', zh: '更强力的剑斩。' }
    },
    slash_3: {
        name: { en: 'Slash III', zh: '斩击 III' },
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'Sword strike that pushes the target.', zh: '剑斩并击退目标。' }
    },
    slash_cao: {
        name: { en: 'Power Slash', zh: '都尉斩' },
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'A forceful one-hex strike that pushes.', zh: '一格强力剑斩，并击退目标。' }
    },
    slash_cao_2: {
        name: { en: 'Power Slash II', zh: '都尉斩 II' },
        damage: 3,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'Improved one-hex strike with heavier damage.', zh: '强化一格剑斩，伤害更高。' }
    },
    slash_cao_3: {
        name: { en: 'Power Slash III', zh: '都尉斩 III' },
        damage: 4,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'Veteran commander strike with high damage and push.', zh: '老练都尉之斩，高伤并击退。' }
    },
    arrow_shot: {
        name: { en: 'Arrow Shot', zh: '箭射' },
        damage: 1,
        minRange: 2,
        range: 4,
        type: 'projectile',
        animation: 'attack_1',
        description: { en: 'Fires an arrow at distance.', zh: '远距离射出一箭。' }
    },
    arrow_shot_2: {
        name: { en: 'Arrow Shot II', zh: '箭射 II' },
        damage: 1,
        minRange: 2,
        range: 5,
        type: 'projectile',
        animation: 'attack_1',
        description: { en: 'Improved range arrow shot.', zh: '射程提升的箭射。' }
    },
    arrow_shot_3: {
        name: { en: 'Arrow Shot III', zh: '箭射 III' },
        damage: 2,
        minRange: 2,
        range: 5,
        type: 'projectile',
        animation: 'attack_1',
        description: { en: 'Powerful heavy arrow.', zh: '威力更强的重箭。' }
    },
    whirlwind: {
        name: { en: 'Whirlwind', zh: '旋风斩' },
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: { en: 'A fierce spinning strike that hits and pushes.', zh: '凶猛回旋斩，命中并击退。' }
    },
    tyrant_sweep: {
        name: { en: 'Tyrant Sweep', zh: '暴君横扫' },
        damage: 2,
        range: 1,
        arc: 3,  // Hits 3 adjacent hexes in a wide arc
        push: true,  // Pushes all 3 targets
        animation: 'attack_1',
        description: { en: 'A brutal sweep that strikes 3 adjacent foes and sends them flying.', zh: '凶暴横扫，打击3个相邻敌人并将其击飞。' }
    },
    heavy_thrust: {
        name: { en: 'Heavy Thrust', zh: '重突刺' },
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_2',
        description: { en: 'A powerful lunge that deals heavy damage and push.', zh: '强力突刺，造成高伤并击退。' }
    }
};

export const UPGRADE_PATHS = {
    'liubei': {
        // Liu Bei is balanced, maybe gains damage later?
    },
    'guanyu': {
        3: { attack: 'green_dragon_slash_2', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } },
        5: { attack: 'green_dragon_slash_3', text: { en: 'Gained Push effect', zh: '获得击退效果' } },
        8: { attack: 'green_dragon_slash_4', text: { en: 'Damage increased to 3', zh: '伤害提升至 3' } }
    },
    'zhangfei': {
        3: { attack: 'serpent_spear_2', text: { en: 'Range increased to 3', zh: '射程提升至 3' } },
        5: { attack: 'serpent_spear_3', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } },
        8: { attack: 'serpent_spear_4', text: { en: 'Push affects all targets in line', zh: '击退影响直线上的全部目标' } }
    },
    'caoren': {
        3: { attack: 'caoren_spear_2', text: { en: 'Range increased to 3', zh: '射程提升至 3' } },
        5: { attack: 'caoren_spear_3', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } },
        8: { attack: 'caoren_spear_4', text: { en: 'Push affects all targets in line', zh: '击退影响直线上的全部目标' } }
    },
    'caocao': {
        3: { attack: 'slash_cao_2', text: { en: 'Damage increased to 3', zh: '伤害提升至 3' } },
        6: { attack: 'slash_cao_3', text: { en: 'Damage increased to 4', zh: '伤害提升至 4' } }
    },
    'soldier': {
        3: { attack: 'slash_2', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } },
        5: { attack: 'slash_3', text: { en: 'Gained Push effect', zh: '获得击退效果' } }
    },
    'archer': {
        4: { attack: 'arrow_shot_2', text: { en: 'Range increased to 5', zh: '射程提升至 5' } },
        6: { attack: 'arrow_shot_3', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } }
    }
};


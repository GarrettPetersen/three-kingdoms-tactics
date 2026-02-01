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
        name: 'Serpent Spear',
        damage: 1,
        range: 2,
        push: 'furthest', // Special: only push the furthest
        animation: 'attack_2',
        description: 'Strikes in a line. Pushes the further target.'
    },
    serpent_spear_2: {
        name: 'Serpent Spear II',
        damage: 1,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: 'Extended reach. Pushes the furthest target.'
    },
    serpent_spear_3: {
        name: 'Serpent Spear III',
        damage: 2,
        range: 3,
        push: 'furthest',
        animation: 'attack_2',
        description: 'Heavy strike. Pushes the furthest target.'
    },
    serpent_spear_4: {
        name: 'Serpent Spear IV',
        damage: 2,
        range: 3,
        push: true, // All hexes
        animation: 'attack_2',
        description: 'Ultimate strike. Pushes all targets in line.'
    },
    green_dragon_slash: {
        name: 'Green Dragon',
        damage: 1,
        range: 2,
        animation: 'attack_1',
        description: 'A massive sweeping arc.'
    },
    green_dragon_slash_2: {
        name: 'Green Dragon II',
        damage: 2,
        range: 2,
        animation: 'attack_1',
        description: 'Enhanced sweeping strike.'
    },
    green_dragon_slash_3: {
        name: 'Green Dragon III',
        damage: 2,
        range: 2,
        push: true,
        animation: 'attack_1',
        description: 'Sweeping arc that pushes all targets.'
    },
    green_dragon_slash_4: {
        name: 'Green Dragon IV',
        damage: 3,
        range: 2,
        push: true,
        animation: 'attack_1',
        description: 'Devastating sweep that pushes all targets.'
    },
    double_blades: {
        name: 'Double Blades',
        damage: 1,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: 'Strikes front and back, pushing both.'
    },
    bash: {
        name: 'Bash',
        damage: 1,
        range: 1,
        push: 1,
        animation: 'attack_1',
        description: 'A heavy strike that knocks the target back.'
    },
    slash: {
        name: 'Slash',
        damage: 1,
        range: 1,
        animation: 'attack_1',
        description: 'A standard sword strike.'
    },
    slash_2: {
        name: 'Slash II',
        damage: 2,
        range: 1,
        animation: 'attack_1',
        description: 'A powerful sword strike.'
    },
    slash_3: {
        name: 'Slash III',
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: 'Sword strike that pushes the target.'
    },
    arrow_shot: {
        name: 'Arrow Shot',
        damage: 1,
        minRange: 2,
        range: 4,
        type: 'projectile',
        animation: 'attack_1',
        description: 'Fires an arrow at distance.'
    },
    arrow_shot_2: {
        name: 'Arrow Shot II',
        damage: 1,
        minRange: 2,
        range: 5,
        type: 'projectile',
        animation: 'attack_1',
        description: 'Improved range arrow shot.'
    },
    arrow_shot_3: {
        name: 'Arrow Shot III',
        damage: 2,
        minRange: 2,
        range: 5,
        type: 'projectile',
        animation: 'attack_1',
        description: 'Powerful heavy arrow.'
    },
    whirlwind: {
        name: 'Whirlwind',
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: 'A fierce spinning strike that hits and pushes.'
    },
    tyrant_sweep: {
        name: 'Tyrant Sweep',
        damage: 2,
        range: 1,
        arc: 3,  // Hits 3 adjacent hexes in a wide arc
        push: true,  // Pushes all 3 targets
        animation: 'attack_1',
        description: 'A brutal sweep that strikes 3 adjacent foes and sends them flying.'
    },
    heavy_thrust: {
        name: 'Heavy Thrust',
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_2',
        description: 'A powerful lunge that deals heavy damage and push.'
    }
};

export const UPGRADE_PATHS = {
    'liubei': {
        // Liu Bei is balanced, maybe gains damage later?
    },
    'guanyu': {
        3: { attack: 'green_dragon_slash_2', text: 'Damage increased to 2' },
        5: { attack: 'green_dragon_slash_3', text: 'Gained Push effect' },
        8: { attack: 'green_dragon_slash_4', text: 'Damage increased to 3' }
    },
    'zhangfei': {
        3: { attack: 'serpent_spear_2', text: 'Range increased to 3' },
        5: { attack: 'serpent_spear_3', text: 'Damage increased to 2' },
        8: { attack: 'serpent_spear_4', text: 'Push affects all targets in line' }
    },
    'soldier': {
        3: { attack: 'slash_2', text: 'Damage increased to 2' },
        5: { attack: 'slash_3', text: 'Gained Push effect' }
    },
    'archer': {
        4: { attack: 'arrow_shot_2', text: 'Range increased to 5' },
        6: { attack: 'arrow_shot_3', text: 'Damage increased to 2' }
    }
};


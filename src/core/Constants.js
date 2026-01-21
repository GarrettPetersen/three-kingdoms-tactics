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
        push: true,
        animation: 'attack_2',
        description: 'Strikes in a line. Pushes the further target.'
    },
    green_dragon_slash: {
        name: 'Green Dragon',
        damage: 1,
        range: 2,
        animation: 'attack_1',
        description: 'A massive sweeping arc.'
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
    whirlwind: {
        name: 'Whirlwind',
        damage: 2,
        range: 1,
        push: true,
        animation: 'attack_1',
        description: 'A fierce spinning strike that hits and pushes.'
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


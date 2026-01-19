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
    stab: {
        name: 'Stab',
        damage: 1,
        range: 1,
        animation: 'attack_1',
        description: 'A basic forward strike.'
    },
    slash: {
        name: 'Slash',
        damage: 1,
        range: 1,
        push: 1,
        animation: 'attack_2',
        description: 'Strikes and pushes the target back.'
    }
};


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
        line: true,
        push: 'furthest', // Special: only push the furthest
        animation: 'attack_2',
        description: { en: 'Strikes in a line. Pushes the further target.', zh: '沿直线突刺，并击退最远目标。' }
    },
    serpent_spear_2: {
        name: { en: 'Serpent Spear II', zh: '蛇矛 II' },
        damage: 1,
        range: 3,
        line: true,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Extended reach. Pushes the furthest target.', zh: '延长攻击距离，并击退最远目标。' }
    },
    serpent_spear_3: {
        name: { en: 'Serpent Spear III', zh: '蛇矛 III' },
        damage: 2,
        range: 3,
        line: true,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Heavy strike. Pushes the furthest target.', zh: '重击突刺，并击退最远目标。' }
    },
    serpent_spear_4: {
        name: { en: 'Serpent Spear IV', zh: '蛇矛 IV' },
        damage: 2,
        range: 3,
        line: true,
        push: true, // All hexes
        animation: 'attack_2',
        description: { en: 'Ultimate strike. Pushes all targets in line.', zh: '极限突刺，击退直线上的全部目标。' }
    },
    caoren_spear: {
        name: { en: 'Long Spear', zh: '长矛' },
        damage: 1,
        range: 2,
        line: true,
        push: 'furthest', // Special: only push the furthest
        animation: 'attack_2',
        description: { en: 'Line thrust from behind the shield. Pushes the furthest target.', zh: '持盾前压后以长矛突刺，击退最远目标。' }
    },
    caoren_spear_2: {
        name: { en: 'Long Spear II', zh: '长矛 II' },
        damage: 1,
        range: 3,
        line: true,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Extended reach. Pushes the furthest target.', zh: '延长攻击距离，并击退最远目标。' }
    },
    caoren_spear_3: {
        name: { en: 'Long Spear III', zh: '长矛 III' },
        damage: 2,
        range: 3,
        line: true,
        push: 'furthest',
        animation: 'attack_2',
        description: { en: 'Heavy strike. Pushes the furthest target.', zh: '重击突刺，并击退最远目标。' }
    },
    caoren_spear_4: {
        name: { en: 'Long Spear IV', zh: '长矛 IV' },
        damage: 2,
        range: 3,
        line: true,
        push: true, // All hexes
        animation: 'attack_2',
        description: { en: 'Ultimate strike. Pushes all targets in line.', zh: '极限突刺，击退直线上的全部目标。' }
    },
    generic_spear: {
        name: { en: 'Spear Thrust', zh: '长枪突刺' },
        damage: 1,
        range: 2,
        line: true,
        animation: 'attack_2',
        description: { en: 'Linear spear thrust along one of 6 rays.', zh: '沿六向射线之一发起直线突刺。' }
    },
    generic_spear_2: {
        name: { en: 'Spear Thrust II', zh: '长枪突刺 II' },
        damage: 1,
        range: 2,
        line: true,
        furthestBonusDamage: 1,
        animation: 'attack_2',
        description: { en: 'Furthest target in line takes +1 damage.', zh: '直线最远目标额外受到 +1 伤害。' }
    },
    generic_spear_3: {
        name: { en: 'Spear Thrust III', zh: '长枪突刺 III' },
        damage: 1,
        range: 3,
        line: true,
        furthestBonusDamage: 1,
        animation: 'attack_2',
        description: { en: 'Extended line range. Furthest target takes +1 damage.', zh: '攻击距离提升，最远目标额外受到 +1 伤害。' }
    },
    green_dragon_slash: {
        name: { en: 'Green Dragon', zh: '青龙斩' },
        damage: 1,
        range: 2,
        shape: 'sweep',
        sweepLength: 3,
        animation: 'attack_1',
        description: { en: 'A massive sweeping arc.', zh: '大范围横扫。' }
    },
    green_dragon_slash_2: {
        name: { en: 'Green Dragon II', zh: '青龙斩 II' },
        damage: 2,
        range: 2,
        shape: 'sweep',
        sweepLength: 3,
        animation: 'attack_1',
        description: { en: 'Enhanced sweeping strike.', zh: '强化横扫一击。' }
    },
    green_dragon_slash_3: {
        name: { en: 'Green Dragon III', zh: '青龙斩 III' },
        damage: 2,
        range: 2,
        shape: 'sweep',
        sweepLength: 3,
        push: true,
        animation: 'attack_1',
        description: { en: 'Sweeping arc that pushes all targets.', zh: '横扫弧斩并击退全部目标。' }
    },
    green_dragon_slash_4: {
        name: { en: 'Green Dragon IV', zh: '青龙斩 IV' },
        damage: 3,
        range: 2,
        shape: 'sweep',
        sweepLength: 3,
        push: true,
        animation: 'attack_1',
        description: { en: 'Devastating sweep that pushes all targets.', zh: '毁灭性横扫，击退全部目标。' }
    },
    polearm_sweep: {
        name: { en: 'Polearm Sweep', zh: '长柄横扫' },
        damage: 1,
        range: 2,
        shape: 'sweep',
        sweepLength: 1,
        animation: 'attack_1',
        description: { en: 'A focused polearm sweep that hits one target.', zh: '集中横扫，命中单个目标。' }
    },
    polearm_sweep_2: {
        name: { en: 'Polearm Sweep II', zh: '长柄横扫 II' },
        damage: 1,
        range: 2,
        shape: 'sweep',
        sweepLength: 2,
        animation: 'attack_1',
        description: { en: 'Broader sweep that can hit two foes.', zh: '横扫范围扩大，可打击两个目标。' }
    },
    polearm_sweep_3: {
        name: { en: 'Polearm Sweep III', zh: '长柄横扫 III' },
        damage: 1,
        range: 3,
        shape: 'sweep',
        sweepLength: 2,
        animation: 'attack_1',
        description: { en: 'Extended reach while keeping a broad sweep.', zh: '攻击距离提升，同时保持横扫范围。' }
    },
    polearm_sweep_4: {
        name: { en: 'Polearm Sweep IV', zh: '长柄横扫 IV' },
        damage: 2,
        range: 3,
        shape: 'sweep',
        sweepLength: 2,
        animation: 'attack_1',
        description: { en: 'A heavy sweep with higher damage.', zh: '高伤害重型横扫。' }
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
    bash_2: {
        name: { en: 'Bash II', zh: '猛击 II' },
        damage: 2,
        range: 1,
        push: 1,
        animation: 'attack_1',
        description: { en: 'A stronger bash with increased damage.', zh: '更强力的猛击，伤害提升。' }
    },
    bash_3: {
        name: { en: 'Bash III', zh: '猛击 III' },
        damage: 3,
        range: 1,
        push: 1,
        animation: 'attack_1',
        description: { en: 'A crushing bash with high damage.', zh: '毁灭性猛击，造成高伤害。' }
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
    command: {
        name: { en: 'Command', zh: '号令' },
        damage: 0,
        range: 99,
        type: 'command',
        animation: 'attack_2',
        commandMoveBonus: 0,
        commandDamageBonus: 0,
        allowEnemy: false,
        description: { en: 'Order any ally to act immediately.', zh: '号令任意友军立即行动。' }
    },
    command_2: {
        name: { en: 'Command II', zh: '号令 II' },
        damage: 0,
        range: 99,
        type: 'command',
        animation: 'attack_2',
        commandMoveBonus: 1,
        commandDamageBonus: 0,
        allowEnemy: false,
        description: { en: 'Commanded units gain +1 movement.', zh: '被号令单位获得 +1 移动力。' }
    },
    command_3: {
        name: { en: 'Command III', zh: '号令 III' },
        damage: 0,
        range: 99,
        type: 'command',
        animation: 'attack_2',
        commandMoveBonus: 1,
        commandDamageBonus: 1,
        allowEnemy: false,
        description: { en: 'Commanded units gain +1 movement and +1 damage.', zh: '被号令单位获得 +1 移动力与 +1 伤害。' }
    },
    command_4: {
        name: { en: 'Command IV', zh: '号令 IV' },
        damage: 0,
        range: 99,
        type: 'command',
        animation: 'attack_2',
        commandMoveBonus: 1,
        commandDamageBonus: 1,
        allowEnemy: true,
        description: { en: 'Command any unit except self, including enemies.', zh: '可号令除自身外的任意单位（含敌方）。' }
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
    blade_sweep_1: {
        name: { en: 'Blade Sweep I', zh: '刀锋横扫 I' },
        damage: 1,
        range: 1,
        shape: 'sweep',
        sweepLength: 1,
        animation: 'attack_1',
        description: { en: 'A short cleaving swing.', zh: '短距劈砍横扫。' }
    },
    blade_sweep_2: {
        name: { en: 'Blade Sweep II', zh: '刀锋横扫 II' },
        damage: 1,
        range: 1,
        shape: 'sweep',
        sweepLength: 2,
        animation: 'attack_1',
        description: { en: 'A broader two-target sweep.', zh: '更宽的双目标横扫。' }
    },
    blade_sweep_3: {
        name: { en: 'Blade Sweep III', zh: '刀锋横扫 III' },
        damage: 1,
        range: 1,
        shape: 'sweep',
        sweepLength: 3,
        push: true,
        animation: 'attack_1',
        description: { en: 'A full sweep that pushes all hit targets.', zh: '完整横扫并击退命中目标。' }
    },
    blade_sweep_4: {
        name: { en: 'Blade Sweep IV', zh: '刀锋横扫 IV' },
        damage: 2,
        range: 1,
        shape: 'sweep',
        sweepLength: 3,
        push: true,
        animation: 'attack_1',
        description: { en: 'A crushing full-power sweep.', zh: '全力重型横扫。' }
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
    'dengmao': {
        2: { attack: 'generic_spear_2', text: { en: 'Furthest target in line now takes +1 damage', zh: '直线最远目标额外受到 +1 伤害' } },
        4: { attack: 'generic_spear_3', text: { en: 'Range increased to 3', zh: '射程提升至 3' } }
    },
    'chengyuanzhi': {
        2: { attack: 'polearm_sweep_2', text: { en: 'Sweep length increased to 2', zh: '横扫长度提升至 2' } },
        4: { attack: 'polearm_sweep_3', text: { en: 'Range increased to 3', zh: '射程提升至 3' } },
        6: { attack: 'polearm_sweep_4', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } }
    },
    'caocao': {
        3: { attack: 'slash_cao_2', text: { en: 'Damage increased to 3', zh: '伤害提升至 3' } },
        4: { secondaryAttack: 'command_2', text: { en: 'Command now grants +1 movement', zh: '号令现可提供 +1 移动力' } },
        6: { attack: 'slash_cao_3', text: { en: 'Damage increased to 4', zh: '伤害提升至 4' } },
        7: { secondaryAttack: 'command_3', text: { en: 'Command now grants +1 damage', zh: '号令现可提供 +1 伤害' } },
        9: { secondaryAttack: 'command_4', text: { en: 'Command can now target enemies', zh: '号令现可作用于敌方单位' } }
    },
    'rebel': {
        3: { attack: 'bash_2', text: { en: 'Bash damage increased to 2', zh: '猛击伤害提升至 2' } },
        6: { attack: 'bash_3', text: { en: 'Bash damage increased to 3', zh: '猛击伤害提升至 3' } }
    },
    'dongzhuo': {
        2: { attack: 'blade_sweep_2', text: { en: 'Sweep length increased to 2', zh: '横扫长度提升至 2' } },
        3: { attack: 'blade_sweep_3', text: { en: 'Gained push on full sweep', zh: '完整横扫获得击退效果' } },
        5: { attack: 'blade_sweep_4', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } }
    },
    'zhangliang': {
        3: { attack: 'blade_sweep_3', text: { en: 'Sweep now pushes all hit targets', zh: '横扫现可击退所有命中目标' } },
        5: { attack: 'blade_sweep_4', text: { en: 'Sweep damage increased to 2', zh: '横扫伤害提升至 2' } }
    },
    'soldier': {
        2: { attack: 'polearm_sweep_2', text: { en: 'Sweep length increased to 2', zh: '横扫长度提升至 2' } },
        4: { attack: 'polearm_sweep_3', text: { en: 'Range increased to 3', zh: '射程提升至 3' } },
        7: { attack: 'polearm_sweep_4', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } }
    },
    'archer': {
        4: { attack: 'arrow_shot_2', text: { en: 'Range increased to 5', zh: '射程提升至 5' } },
        6: { attack: 'arrow_shot_3', text: { en: 'Damage increased to 2', zh: '伤害提升至 2' } }
    }
};


export const BATTLES = {
    'yellow_turban_rout': {
        name: "The Yellow Turban Rebellion",
        map: {
            biome: 'northern',
            layout: 'foothills',
            forestDensity: 0.1,
            mountainDensity: 0.05,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Zhang brothers and Yellow Turbans (left side, advancing)
            { id: 'zhangjue', r: 2, q: 3, type: 'zhang_jue' },
            { id: 'zhangbao', r: 2, q: 4, type: 'zhang_bao' },
            { id: 'zhangliang', r: 2, q: 5, type: 'zhang_liang' },
            { id: 'rebel1', r: 3, q: 2, type: 'enemy_soldier' },
            { id: 'rebel2', r: 3, q: 3, type: 'enemy_soldier' },
            { id: 'rebel3', r: 3, q: 4, type: 'enemy_soldier' },
            { id: 'rebel4', r: 3, q: 5, type: 'enemy_soldier' },
            { id: 'rebel5', r: 3, q: 6, type: 'enemy_soldier' },
            { id: 'rebel6', r: 1, q: 3, type: 'enemy_soldier' },
            { id: 'rebel7', r: 1, q: 4, type: 'enemy_soldier' },
            { id: 'rebel8', r: 1, q: 5, type: 'enemy_soldier' },
            // Government soldiers (right side, retreating) - halved for faster combat
            { id: 'soldier1', r: 8, q: 3, type: 'imperial_soldier' },
            { id: 'soldier2', r: 8, q: 4, type: 'imperial_soldier' },
            { id: 'soldier3', r: 9, q: 3, type: 'imperial_soldier' },
            { id: 'soldier4', r: 9, q: 4, type: 'imperial_soldier' }
        ],
        isCutscene: true,
        cutsceneAutoCombat: true, // Enable automatic combat animations
        introScript: [], // Combat happens first, then dialogue
        postCombatScript: [
            { portraitKey: 'custom-male-10', name: 'Zhang Jue', voiceId: 'intro_zj_01', text: "The good fortune of the Han is exhausted! The Wise and Worthy Man has appeared!" },
            { portraitKey: 'zhang-bao', name: 'Zhang Bao', voiceId: 'intro_zb_01', text: "Brother, the official troops melt away at a whisper of our coming! Our strength grows by the day!" },
            { portraitKey: 'custom-male-12', name: 'Zhang Liang', voiceId: 'intro_zl_01', text: "The people bind their heads with yellow scarves and join our cause! Soon, all the empire will be ours!" },
            { portraitKey: 'custom-male-10', name: 'Zhang Jue', voiceId: 'intro_zj_02', text: "For schemes like ours, the most difficult part is to gain the popular favor. But that is already ours. Such an opportunity must not pass!" },
            { portraitKey: 'custom-male-10', name: 'Zhang Jue', voiceId: 'intro_zj_03', text: "I am Zhang Jue, the Lord of Heaven! With my brothers Zhang Bao, Lord of Earth, and Zhang Liang, Lord of Human, we shall bring down this corrupt dynasty!" },
            { portraitKey: 'zhang-bao', name: 'Zhang Bao', voiceId: 'intro_zb_02', text: "The Han has grown weak and decadent! The people cry out for justice, and we shall deliver it with fire and steel!" },
            { portraitKey: 'custom-male-12', name: 'Zhang Liang', voiceId: 'intro_zl_02', text: "Let the imperial dogs flee! Their cities will burn, their armies will crumble. The Yellow Heavens shall rise!" },
            { portraitKey: 'custom-male-10', name: 'Zhang Jue', voiceId: 'intro_zj_04', text: "The age of the Han is over. A new era begins today—an era of the people, led by the Wise and Worthy Master!" },
            { portraitKey: 'custom-male-10', name: 'Zhang Jue', voiceId: 'intro_zj_05', text: "Now we march through Zhuo County! Let all who stand in our way be crushed beneath the banner of the Yellow Turbans!" }
        ],
        nextScene: 'narrative',
        nextParams: { 
            scriptId: 'noticeboard'
        }
    },
    'daxing': {
        name: "Battle of Daxing District",
        map: {
            biome: 'northern',
            layout: 'foothills',
            forestDensity: 0.15,
            mountainDensity: 0.1,
            riverDensity: 0.05,
            houseDensity: 0.04
        },
        playerFaction: 'liu_bei_volunteers',
        units: [
            { id: 'liubei', r: 2, q: 4, type: 'hero' },
            { id: 'guanyu', r: 3, q: 3, type: 'hero' },
            { id: 'zhangfei', r: 3, q: 5, type: 'hero' },
            { id: 'ally1', r: 1, q: 3, type: 'allied_soldier' },
            { id: 'ally2', r: 1, q: 4, type: 'allied_soldier' },
            { id: 'ally3', r: 1, q: 5, type: 'allied_soldier' },
            { id: 'dengmao', r: 8, q: 4, type: 'enemy_captain' },
            { id: 'chengyuanzhi', r: 9, q: 5, type: 'enemy_captain' },
            { id: 'rebel1', r: 7, q: 3, type: 'enemy_soldier_weak' },
            { id: 'rebel2', r: 7, q: 5, type: 'enemy_soldier' }
        ],
        victoryCondition: {
            type: 'defeat_captains',
            captains: ['dengmao', 'chengyuanzhi'],
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        reinforcements: 'daxing',
        introScript: [
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'dx_lb_01', text: "The Yellow Turban vanguard is here. They seek to plunder Zhuo County!" },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'dx_gy_01', text: "Their numbers are great, but they are but a rabble without leadership." },
            { portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'dx_zf_01', text: "Let me at them! My Serpent Spear is thirsty for rebel blood!" },
            { portraitKey: 'bandit1', name: 'Deng Mao', voiceId: 'dx_dm_01', text: "Imperial dogs! You dare stand in the way of the Lord of Heaven?" },
            { portraitKey: 'bandit2', name: 'Cheng Yuanzhi', voiceId: 'dx_cyz_01', text: "Slay them all! The Han is dead, the Yellow Heavens shall rise!" },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'dx_lb_02', text: "Their resolve is weak. If we defeat these captains, the rest will be turned to flight!" }
        ]
    },
    'qingzhou_prelude': {
        name: "Ambush at Qingzhou",
        map: {
            biome: 'central',
            layout: 'mountain_pass',
            orientation: 'ns',
            forestDensity: 0.1,
            mountainDensity: 0.15,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        playerFaction: 'liu_bei_volunteers',
        units: [
            { id: 'liubei', r: 1, q: 1, type: 'hero' },
            { id: 'guanyu', r: 2, q: 1, type: 'hero' },
            { id: 'zhangfei', r: 1, q: 2, type: 'hero' },
            { id: 'ally1', r: 2, q: 2, type: 'allied_soldier' },
            { id: 'ally2', r: 1, q: 0, type: 'allied_soldier' },
            { id: 'ally3', r: 0, q: 1, type: 'allied_soldier' },
            // Generate 20 rebels - half weak (level 1, 2HP), half normal (level 2, 3HP)
            ...Array.from({length: 20}, (_, i) => ({ 
                id: `rebel_pre_${i}`, 
                r: 6 + Math.floor(i / 5), 
                q: 1 + (i % 8), 
                type: i % 2 === 0 ? 'enemy_soldier_weak' : 'enemy_soldier' 
            }))
        ],
        victoryCondition: {
            type: 'prelude'
        },
        introScript: [
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_02', text: "They are many and we but few. We cannot prevail in a direct assault." },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_03', text: "Guan Yu, Zhang Fei—take half our forces and hide behind the hills. When the gongs beat, strike from the flanks!" },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'qz_gy_01', text: "A superior strategy, brother. We go at once." }
        ]
    },
    'qingzhou_siege': {
        name: "Relief of Qingzhou",
        map: {
            biome: 'central',
            layout: 'mountain_pass',
            orientation: 'ns',
            forestDensity: 0.1,
            mountainDensity: 0.15,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        playerFaction: 'liu_bei_volunteers',
        units: [
            { id: 'liubei', r: 7, q: 4, type: 'hero' }
        ],
        flagPos: { r: 1, q: 4 },
        victoryCondition: {
            type: 'reach_flag_then_defeat_all',
            flagPos: { r: 1, q: 4 }
        },
        reinforcements: 'qingzhou',
        introScript: [
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_bt_lb_03', text: "I must reach the flag to signal the ambush!" }
        ]
    },
    'qingzhou_cleanup': {
        name: 'Qingzhou Gate - Victory',
        map: {
            biome: 'central',
            layout: 'city_gate',
            seed: 'qingzhou_gate',
            forestDensity: 0.1,
            mountainDensity: 0.1,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Oath brothers start at top left
            { id: 'liubei', r: 2, q: 2, type: 'hero' },
            { id: 'guanyu', r: 3, q: 2, type: 'hero' },
            { id: 'zhangfei', r: 2, q: 3, type: 'hero' },
            // Guards and Gong Jing near the gate
            { id: 'guard1', r: 6, q: 4, type: 'allied_soldier' },
            { id: 'guard2', r: 6, q: 6, type: 'allied_soldier' },
            { id: 'gongjing', r: 5, q: 5, type: 'commander' },
            // Dead yellow turbans scattered around
            { id: 'rebel_corpse1', r: 7, q: 3, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse2', r: 8, q: 6, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse3', r: 9, q: 4, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse4', r: 10, q: 5, type: 'enemy_soldier', isDead: true },
            // Rebels that will be executed in the cutscene
            { id: 'rebel_cleanup1', r: 7, q: 4, type: 'enemy_soldier' },
            { id: 'rebel_cleanup2', r: 7, q: 6, type: 'enemy_soldier' }
        ],
        isCutscene: true,
        nextScene: 'narrative',
        nextParams: { scriptId: 'qingzhou_gate_return' }
    },
    'guangzong_camp': {
        name: 'Guangzong - Lu Zhi\'s Camp',
        map: {
            biome: 'northern',
            layout: 'army_camp',
            seed: 'guangzong',
            mirror: true,
            forestDensity: 0.2,
            mountainDensity: 0.1,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 8, q: 5, type: 'hero' },
            { id: 'guanyu', r: 9, q: 5, type: 'hero' },
            { id: 'zhangfei', r: 8, q: 6, type: 'hero' },
            { id: 'luzhi', r: 5, q: 5, type: 'commander' },
            { id: 'camp_guard1', r: 4, q: 4, type: 'allied_soldier' },
            { id: 'camp_guard2', r: 4, q: 6, type: 'allied_soldier' }
        ],
        isCutscene: true,
        nextScene: 'narrative',
        nextParams: { scriptId: 'guangzong_arrival' }
    },
    'guangzong_encounter': {
        name: 'The Road to Guangzong',
        map: {
            biome: 'northern',
            layout: 'road',
            seed: 'luzhi_road',
            forestDensity: 0.08,  // Some trees on the sides
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Heroes approaching from the left on the road
            { id: 'liubei', r: 6, q: 1, type: 'hero' },
            { id: 'guanyu', r: 5, q: 1, type: 'hero' },
            { id: 'zhangfei', r: 7, q: 1, type: 'hero' },
            // Our 3 campaign soldiers
            { id: 'ally1', r: 5, q: 0, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 0, type: 'allied_soldier' },
            { id: 'ally3', r: 4, q: 2, type: 'allied_soldier' },
            // Lu Zhi in a cage on the road, being escorted
            { id: 'luzhi', r: 6, q: 6, type: 'commander', caged: true },
            // Imperial escort soldiers - some surrounding Lu Zhi, some blocking the way
            { id: 'escort1', r: 5, q: 6, type: 'imperial_soldier' },
            { id: 'escort2', r: 7, q: 6, type: 'imperial_soldier' },
            { id: 'escort3', r: 6, q: 7, type: 'imperial_soldier' },
            { id: 'escort4', r: 6, q: 8, type: 'imperial_soldier' },
            // Escorts blocking the path to the cage
            { id: 'escort5', r: 5, q: 4, type: 'imperial_soldier' },
            { id: 'escort6', r: 6, q: 4, type: 'imperial_soldier' },
            { id: 'escort7', r: 7, q: 4, type: 'imperial_soldier' }
        ],
        isCutscene: true,
        victoryCondition: 'defeat_all_enemies',
        introScript: [
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_01', text: "What is this? Commander Lu Zhi... in chains?" },
            { speaker: 'luzhi', portraitKey: 'custom-male-22', name: 'Lu Zhi', voiceId: 'gz_lz_explain_01', text: "Xuande! I had the rebels surrounded and was on the point of smashing them, when Zhang Jue employed sorcery to prevent my victory." },
            { speaker: 'luzhi', portraitKey: 'custom-male-22', name: 'Lu Zhi', voiceId: 'gz_lz_explain_02', text: "The court sent Eunuch Zuo Feng to inquire. He demanded a bribe, but where could I find gold in such circumstances? He reported that I hid behind ramparts and disheartened my army." },
            { speaker: 'luzhi', portraitKey: 'custom-male-22', name: 'Lu Zhi', voiceId: 'gz_lz_explain_03', text: "So I was superseded by Dong Zhuo, and now I go to the capital to answer false charges." },
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_01', text: "This is outrage! Let me slay these dogs and free you, Master!" }
        ],
        // Choice will be handled by TacticsScene after intro dialogue
        hasChoice: true
    },
    'guangzong_escort': {
        name: 'Free Lu Zhi',
        map: {
            biome: 'northern',
            layout: 'road',
            seed: 'luzhi_road',  // Same seed so map looks the same
            forestDensity: 0.08,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Heroes on the left - same positions as encounter
            { id: 'liubei', r: 6, q: 1, type: 'hero' },
            { id: 'guanyu', r: 5, q: 1, type: 'hero' },
            { id: 'zhangfei', r: 7, q: 1, type: 'hero' },
            // Our 3 campaign soldiers
            { id: 'ally1', r: 5, q: 0, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 0, type: 'allied_soldier' },
            { id: 'ally3', r: 4, q: 2, type: 'allied_soldier' },
            // Lu Zhi in a cage (allied, to be protected)
            { id: 'luzhi', r: 6, q: 6, type: 'commander', caged: true },
            // Imperial escort soldiers (enemies) - same as encounter
            { id: 'escort1', r: 5, q: 6, type: 'imperial_soldier' },
            { id: 'escort2', r: 7, q: 6, type: 'imperial_soldier' },
            { id: 'escort3', r: 6, q: 7, type: 'imperial_soldier' },
            { id: 'escort4', r: 6, q: 8, type: 'imperial_soldier' },
            // Escorts blocking the path to the cage
            { id: 'escort5', r: 5, q: 4, type: 'imperial_soldier' },
            { id: 'escort6', r: 6, q: 4, type: 'imperial_soldier' },
            { id: 'escort7', r: 7, q: 4, type: 'imperial_soldier' }
        ],
        victoryCondition: 'defeat_all_enemies',
        introScript: [
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_free_01', text: "HA! Now you're talking, brother! Come on!" },
            { speaker: 'guanyu', portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'gz_gy_free_01', text: "Brother, there may be consequences for this..." },
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_free_02', text: "We have made our choice. Now we fight!" }
        ]
    },
    'dongzhuo_battle': {
        name: 'Rescue Dong Zhuo',
        map: {
            biome: 'northern',
            layout: 'river',
            seed: 'dongzhuo_rescue',
            forestDensity: 0.1,
            mountainDensity: 0.05,
            riverDensity: 0.0,
            houseDensity: 0.04  // Reduced for rural setting
        },
        units: [
            // Heroes charging in from the left
            { id: 'liubei', r: 6, q: 1, type: 'hero' },
            { id: 'guanyu', r: 5, q: 0, type: 'hero' },
            { id: 'zhangfei', r: 7, q: 0, type: 'hero' },
            // Our 3 campaign soldiers
            { id: 'ally1', r: 5, q: 1, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 1, type: 'allied_soldier' },
            { id: 'ally3', r: 6, q: 0, type: 'allied_soldier' },
            // Dong Zhuo - allied NPC being rescued
            { id: 'dongzhuo', r: 6, q: 8, type: 'warlord' },
            // Dead soldiers around Dong Zhuo
            { id: 'dead_guard1', r: 5, q: 8, type: 'allied_soldier', isDead: true, frame: 2 },
            { id: 'dead_guard2', r: 7, q: 8, type: 'allied_soldier', isDead: true, frame: 2 },
            { id: 'dead_guard3', r: 6, q: 9, type: 'allied_soldier', isDead: true, frame: 2 },
            // Yellow Turbans attacking Dong Zhuo - Spread out more
            { id: 'rebel1', r: 4, q: 4, type: 'enemy_soldier_weak' },
            { id: 'rebel2', r: 6, q: 3, type: 'enemy_soldier' },
            { id: 'rebel3', r: 8, q: 4, type: 'enemy_soldier_weak' },
            { id: 'rebel4', r: 5, q: 6, type: 'enemy_soldier' },
            { id: 'rebel5', r: 3, q: 6, type: 'enemy_soldier_weak' },
            { id: 'rebel6', r: 9, q: 6, type: 'enemy_soldier' },
            { id: 'rebel7', r: 4, q: 7, type: 'enemy_soldier' },
            { id: 'rebel8', r: 8, q: 7, type: 'enemy_soldier_weak' },
            { id: 'rebel9', r: 3, q: 4, type: 'enemy_soldier' },
            { id: 'rebel10', r: 9, q: 4, type: 'enemy_soldier_weak' },
            // Yellow Turban captain
            { id: 'zhang_jue_captain', r: 6, q: 2, type: 'enemy_captain' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['dongzhuo']
        },
        introScript: [
            { speaker: 'dongzhuo', portraitKey: 'dong-zhuo', name: 'Dong Zhuo', voiceId: 'gz_dz_help_01', text: "CURSE THESE REBELS! They have slaughtered my men! Is there no one left to fight?!" },
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_attack_01', text: "That banner reads 'Zhang Jue, Lord of Heaven!' Government soldiers are losing! Brothers, we attack!" },
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_attack_01', text: "HA! Finally some Yellow Turbans to smash! Let's go!" }
        ],
        hasVictoryDialogue: true  // Flag to trigger on-map victory dialogue
    }
};

export const UNIT_TEMPLATES = {
    'hero': {
        'liubei': { name: 'Liu Bei', imgKey: 'liubei', hp: 4, moveRange: 4, attacks: ['double_blades'], faction: 'player' },
        'guanyu': { name: 'Guan Yu', imgKey: 'guanyu', hp: 4, moveRange: 5, attacks: ['green_dragon_slash'], faction: 'player' },
        'zhangfei': { name: 'Zhang Fei', imgKey: 'zhangfei', hp: 4, moveRange: 4, attacks: ['serpent_spear'], faction: 'player' }
    },
    'allied_soldier': {
        'ally': { name: 'Volunteer', imgKey: 'soldier', hp: 2, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'guard': { name: 'Qingzhou Guard', imgKey: 'soldier', hp: 3, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'dead_guard': { name: 'Imperial Guard', imgKey: 'soldier', hp: 0, moveRange: 0, attacks: [], faction: 'allied' }
    },
    'enemy_soldier': {
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 3, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 2 }
    },
    'enemy_soldier_weak': {
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 2, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 1 }
    },
    'imperial_soldier': {
        'soldier': { name: 'Imperial Soldier', imgKey: 'soldier', hp: 1, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'escort': { name: 'Imperial Escort', imgKey: 'soldier', hp: 3, moveRange: 3, attacks: ['slash'], faction: 'enemy' }
    },
    'enemy_captain': {
        'dengmao': { name: 'Deng Mao', imgKey: 'bandit1', hp: 5, moveRange: 3, attacks: ['heavy_thrust'], faction: 'enemy' },
        'chengyuanzhi': { name: 'Cheng Yuanzhi', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['whirlwind'], faction: 'enemy' },
        'zhang_jue_captain': { name: 'Yellow Turban Captain', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['whirlwind'], faction: 'enemy' }
    },
    'commander': {
        'gongjing': { name: 'Gong Jing', imgKey: 'gongjing_sprite', hp: 5, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'luzhi': { name: 'Lu Zhi', imgKey: 'zhoujing', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' }
    },
    'warlord': {
        'dongzhuo': { name: 'Dong Zhuo', imgKey: 'dongzhuo', hp: 9, moveRange: 3, attacks: ['tyrant_sweep'], faction: 'allied' }
    },
    'zhang_jue': {
        'zhangjue': { name: 'Zhang Jue', imgKey: 'zhangjiao', hp: 8, moveRange: 4, attacks: ['whirlwind'], faction: 'enemy' }
    },
    'zhang_bao': {
        'zhangbao': { name: 'Zhang Bao', imgKey: 'zhangbao', hp: 7, moveRange: 4, attacks: ['heavy_thrust'], faction: 'enemy' }
    },
    'zhang_liang': {
        'zhangliang': { name: 'Zhang Liang', imgKey: 'zhangliang', hp: 7, moveRange: 4, attacks: ['heavy_thrust'], faction: 'enemy' }
    },
    'prop': {
        'boulder': { name: 'Boulder', imgKey: 'boulder', hp: 2, moveRange: 0, attacks: [], faction: 'neutral' }
    }
};

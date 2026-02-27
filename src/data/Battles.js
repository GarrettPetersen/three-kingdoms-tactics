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
            { name: 'Zhang Jue', voiceId: 'intro_zj_01', text: { en: "The good fortune of the Han is exhausted! The Wise and Worthy Man has appeared!", zh: "汉运将终，大贤出矣！" } },
            { name: 'Zhang Bao', voiceId: 'intro_zb_01', text: { en: "Brother, the official troops melt away at a whisper of our coming! Our strength grows by the day!", zh: "兄长，官军闻风而逃！我们的力量与日俱增！" } },
            { name: 'Zhang Liang', voiceId: 'intro_zl_01', text: { en: "The people bind their heads with yellow scarves and join our cause! Soon, all the empire will be ours!", zh: "百姓头裹黄巾，加入我们的事业！很快，整个天下都将属于我们！" } },
            { name: 'Zhang Jue', voiceId: 'intro_zj_02', text: { en: "For schemes like ours, the most difficult part is to gain the popular favor. But that is already ours. Such an opportunity must not pass!", zh: "成大事者，最难在于得民心。但民心已归我。此等良机，不可错过！" } },
            { name: 'Zhang Jue', voiceId: 'intro_zj_03', text: { en: "I am Zhang Jue, the Lord of Heaven! With my brothers Zhang Bao, Lord of Earth, and Zhang Liang, Lord of Human, we shall bring down this corrupt dynasty!", zh: "我乃张角，天公将军！与吾弟张宝，地公将军，张梁，人公将军，必将推翻这腐朽的王朝！" } },
            { name: 'Zhang Bao', voiceId: 'intro_zb_02', text: { en: "The Han has grown weak and decadent! The people cry out for justice, and we shall deliver it with fire and steel!", zh: "汉室已衰败腐朽！百姓呼唤正义，我们将以烈火与钢铁来伸张！" } },
            { name: 'Zhang Liang', voiceId: 'intro_zl_02', text: { en: "Let the imperial dogs flee! Their cities will burn, their armies will crumble. The Yellow Heavens shall rise!", zh: "让那些朝廷走狗逃吧！他们的城池将燃烧，他们的军队将崩溃。黄天当立！" } },
            { name: 'Zhang Jue', voiceId: 'intro_zj_04', text: { en: "The age of the Han is over. A new era begins today—an era of the people, led by the Wise and Worthy Master!", zh: "汉朝的时代已经结束。今天，一个新的时代开始了——一个由大贤领导的人民时代！" } },
            { name: 'Zhang Jue', voiceId: 'intro_zj_05', text: { en: "Now we march through Zhuo County! Let all who stand in our way be crushed beneath the banner of the Yellow Turbans!", zh: "现在我们进军涿郡！所有阻挡我们的人，都将被黄巾军的旗帜碾碎！" } }
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
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'dx_lb_01', text: { en: "The Yellow Turban vanguard is here. They seek to plunder Zhuo County!", zh: "黄巾先锋已至。他们欲劫掠涿郡！" } },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'dx_gy_01', text: { en: "Their numbers are great, but they are but a rabble without leadership.", zh: "他们人数众多，但不过是一群乌合之众。" } },
            { portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'dx_zf_01', text: { en: "Let me at them! My Serpent Spear is thirsty for rebel blood!", zh: "让我来对付他们！我的丈八蛇矛渴饮叛军之血！" } },
            { portraitKey: 'dengmao', name: 'Deng Mao', voiceId: 'dx_dm_01', text: { en: "Imperial dogs! You dare stand in the way of the Lord of Heaven?", zh: "朝廷走狗！你们敢阻挡天公将军？" } },
            { portraitKey: 'chengyuanzhi', name: 'Cheng Yuanzhi', voiceId: 'dx_cyz_01', text: { en: "Slay them all! The Han is dead, the Yellow Heavens shall rise!", zh: "杀光他们！汉室已亡，黄天当立！" } },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'dx_lb_02', text: { en: "Their resolve is weak. If we defeat these captains, the rest will be turned to flight!", zh: "他们意志薄弱。若我们击败这些头目，其余必溃散！" } }
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
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_02', text: { en: "They are many and we but few. We cannot prevail in a direct assault.", zh: "敌众我寡。我们不能正面强攻。" } },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_03', text: { en: "Guan Yu, Zhang Fei—take half our forces and hide behind the hills. When the gongs beat, strike from the flanks!", zh: "云长、翼德——带一半人马埋伏在山后。锣声一响，从两翼夹击！" } },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'qz_gy_01', text: { en: "A superior strategy, brother. We go at once.", zh: "妙计，兄长。我们即刻出发。" } }
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
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_bt_lb_03', text: { en: "I must reach the flag to signal the ambush!", zh: "我必须到达旗帜处，发出伏击信号！" } }
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
            campFaction: 'imperial',
            tentTerrain: 'tent_white',
            campTentCount: 9,
            burningTentCount: 0,
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
            { id: 'camp_guard2', r: 4, q: 6, type: 'allied_soldier' },
            { id: 'camp_guard3', r: 5, q: 4, type: 'allied_soldier' }
        ],
        isCutscene: true,
        introScript: [
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_camp_lb_01', text: { en: "Master Lu! Liu Bei has brought volunteers from Youzhou. We came as soon as we heard you had engaged Zhang Jue at Guangzong.", zh: "卢师！刘备率幽州义勇来援。得知您在广宗与张角交战，我们便立刻赶来。" } },
            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_camp_lz_01', text: { en: "Xuande, your loyalty honors me. I have Zhang Jue pinned here, but his brothers Zhang Liang and Zhang Bao contest Huangfu Song and Zhu Jun at Yingchuan.", zh: "玄德，你的忠义令我欣慰。我在此牵制张角，但其弟张梁、张宝正在颍川与皇甫嵩、朱儁对垒。" } },
            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_camp_lz_02', text: { en: "Take your five hundred and I will lend a thousand regulars. March to Yingchuan, scout the situation, and strike when the chance appears.", zh: "你带本部五百人，我再拨你一千官军。即刻赶赴颍川，先探敌情，见机剿击。" } },
            {
                type: 'choice',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                options: [
                    {
                        buttonText: { en: "At once.", zh: "即刻出发" },
                        voiceId: 'gz_camp_lb_choice_01',
                        text: { en: "Your command is clear. We march to Yingchuan at once.", zh: "军令已明。我们即刻赶赴颍川。" },
                        speaker: 'liubei'
                    },
                    {
                        buttonText: { en: "Request details.", zh: "再问军情" },
                        voiceId: 'gz_camp_lb_choice_02',
                        text: { en: "Before we depart, tell me: where should we regroup after contact?", zh: "临行前请示：与敌接触后，应在何处会合？" },
                        speaker: 'liubei',
                        result: [
                            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_camp_lz_choice_01', text: { en: "If the rebels break, report back at Guangzong immediately.", zh: "若贼军溃散，立刻回广宗复命。" } }
                        ]
                    }
                ]
            },
            { speaker: 'guanyu', portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'gz_camp_gy_01', text: { en: "Understood. We ride at once.", zh: "明白。我们即刻出发。" } }
        ],
        nextScene: 'map',
        nextParams: { campaignId: 'liubei', partyX: 205, partyY: 55 }
    },
    'yingchuan_aftermath': {
        name: 'Yingchuan - Burned Rebel Camp',
        map: {
            biome: 'northern',
            layout: 'army_camp',
            seed: 'yingchuan_after_fire',
            campFaction: 'yellow_turban',
            tentTerrain: 'tent',
            campTentCount: 11,
            burningTentCount: 6,
            forestDensity: 0.08,
            mountainDensity: 0.03,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 8, q: 2, type: 'hero' },
            { id: 'guanyu', r: 9, q: 2, type: 'hero' },
            { id: 'zhangfei', r: 8, q: 3, type: 'hero' },
            { id: 'huangfusong', r: 4, q: 6, type: 'commander' },
            { id: 'zhujun', r: 5, q: 7, type: 'commander' },
            { id: 'imperial1', r: 4, q: 5, type: 'imperial_soldier' },
            { id: 'imperial2', r: 6, q: 6, type: 'imperial_soldier' },
            { id: 'imperial3', r: 5, q: 5, type: 'imperial_soldier' },
            { id: 'rebel_corpse_a', r: 3, q: 7, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse_b', r: 6, q: 7, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse_c', r: 5, q: 8, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse_d', r: 7, q: 6, type: 'enemy_soldier', isDead: true }
        ],
        isCutscene: true,
        introScript: [
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'yc_af_zf_01', text: { en: "Look at this blaze! We arrived too late to wet our blades.", zh: "看这冲天火势！咱们来晚了，连刀都没沾上血。" } },
            { speaker: 'huangfusong', portraitKey: 'Huangfu-Song-generic', name: 'Huangfu Song', voiceId: 'yc_af_hfs_01', text: { en: "You are Liu Xuande? We fired the grass camp in the second watch. The rebels had no saddles, no armor, and broke in panic.", zh: "你就是刘玄德？二更后我军火攻草营，贼众马不及鞍、人不及甲，仓皇四散。" } },
            { speaker: 'zhujun', portraitKey: 'Zhu-Jun-generic', name: 'Zhu Jun', voiceId: 'yc_af_zj_01', text: { en: "Zhang Liang and Zhang Bao escaped with remnants toward Guangzong. Report this to Commander Lu Zhi at once.", zh: "张梁、张宝率残兵往广宗遁去。你速回报卢植中郎将。" } },
            {
                type: 'choice',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                options: [
                    {
                        buttonText: { en: "Return now.", zh: "即刻回报" },
                        voiceId: 'yc_af_lb_choice_01',
                        text: { en: "Understood. Brothers, we return to Master Lu immediately.", zh: "明白。二弟三弟，立刻回去复命。" },
                        speaker: 'liubei'
                    },
                    {
                        buttonText: { en: "Ask after enemy.", zh: "询问敌踪" },
                        voiceId: 'yc_af_lb_choice_02',
                        text: { en: "Do you judge Zhang Liang and Zhang Bao to rejoin Zhang Jue without delay?", zh: "二位以为张梁、张宝会不会立刻回援张角？" },
                        speaker: 'liubei',
                        result: [
                            { speaker: 'zhujun', portraitKey: 'Zhu-Jun-generic', name: 'Zhu Jun', voiceId: 'yc_af_zj_choice_01', text: { en: "That is most likely. Speed your march and Lu Zhi may catch them in disorder.", zh: "十有八九如此。你们快马回报，卢植或可乘其乱而击之。" } }
                        ]
                    }
                ]
            }
        ],
        nextScene: 'map',
        nextParams: { campaignId: 'liubei', partyX: 188, partyY: 92 }
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
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_01', text: { en: "What is this? Commander Lu Zhi... in chains?", zh: "这是怎么回事？卢植将军...被锁链所缚？" } },
            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_lz_explain_01', text: { en: "Xuande! I had the rebels surrounded and was on the point of smashing them, when Zhang Jue employed sorcery to prevent my victory.", zh: "玄德！我已将叛军包围，正要击溃他们，张角却用妖术阻我胜利。" } },
            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_lz_explain_02', text: { en: "The court sent Eunuch Zuo Feng to inquire. He demanded a bribe, but where could I find gold in such circumstances? He reported that I hid behind ramparts and disheartened my army.", zh: "朝廷派左丰前来查问。他索要贿赂，但此等情况下我何处寻金？他竟报我躲在壁垒后，挫我军心。" } },
            { speaker: 'luzhi', portraitKey: 'lu-zhi', name: 'Lu Zhi', voiceId: 'gz_lz_explain_03', text: { en: "So I was superseded by Dong Zhuo, and now I go to the capital to answer false charges.", zh: "因此我被董卓取代，现在我要去京城回应这些莫须有的指控。" } },
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_01', text: { en: "This is outrage! Let me slay these dogs and free you, Master!", zh: "这真是岂有此理！让我杀了这些走狗，救您出来，将军！" } }
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
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_free_01', text: { en: "HA! Now you're talking, brother! Come on!", zh: "哈！这才像话，兄长！来吧！" } },
            { speaker: 'guanyu', portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'gz_gy_free_01', text: { en: "Brother, there may be consequences for this...", zh: "兄长，此举可能带来后果..." } },
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_free_02', text: { en: "We have made our choice. Now we fight!", zh: "我们已经做出选择。现在，战斗！" } }
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
            // Zhang Jue himself leads this assault; he retreats when near defeat.
            {
                id: 'zhangjue',
                r: 6,
                q: 2,
                type: 'zhang_jue',
                immortal: {
                    enabled: true,
                    triggerHp: 2,
                    onNearDeath: {
                        say: {
                            speaker: 'zhangjue',
                            text: {
                                en: "Fall back! We withdraw for now—but the Yellow Heaven will rise again!",
                                zh: "先撤！暂退一步——黄天终将再起！"
                            },
                            voiceId: 'gz_zj_retreat_01',
                            durationMs: 2300,
                            lockSkips: true
                        },
                        flee: {
                            edge: 'right',
                            delayMs: 1900,
                            durationMs: 900,
                            extraTiles: 5,
                            endBattle: { won: true }
                        }
                    }
                }
            }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['dongzhuo']
        },
        introScript: [
            { speaker: 'dongzhuo', portraitKey: 'dong-zhuo', name: 'Dong Zhuo', voiceId: 'gz_dz_help_01', text: { en: "CURSE THESE REBELS! They have slaughtered my men! Is there no one left to fight?!", zh: "这些叛军该死！他们屠杀了我的部下！难道没有人能战斗了吗？！" } },
            { speaker: 'zhangjue', portraitKey: 'zhang-jiao', name: 'Zhang Jue', voiceId: 'gz_zj_rescue_01', text: { en: "The Blue Heaven is dead; the Yellow Heaven shall rise! Dong Zhuo, today your fate ends!", zh: "苍天已死，黄天当立！董卓，今日便是你的死期！" } },
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_attack_01', text: { en: "That banner reads 'Zhang Jue, Lord of Heaven!' Government soldiers are losing! Brothers, we attack!", zh: "那旗帜上写着'张角，天公将军'！官军正在败退！兄弟们，我们进攻！" } },
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_attack_01', text: { en: "HA! Finally some Yellow Turbans to smash! Let's go!", zh: "哈！终于有黄巾贼可以痛打了！我们走！" } }
        ],
        hasVictoryDialogue: true  // Flag to trigger on-map victory dialogue
    },
    'chapter2_oath_dongzhuo_choice': {
        name: 'Chapter 2 Opening - Brothers and Dong Zhuo',
        map: {
            biome: 'northern',
            layout: 'river',
            seed: 'dongzhuo_rescue',
            forestDensity: 0.1,
            mountainDensity: 0.05,
            riverDensity: 0.0,
            houseDensity: 0.04
        },
        units: [
            { id: 'liubei', r: 6, q: 1, type: 'hero' },
            { id: 'guanyu', r: 5, q: 0, type: 'hero' },
            { id: 'zhangfei', r: 7, q: 0, type: 'hero' },
            { id: 'ally1', r: 5, q: 1, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 1, type: 'allied_soldier' },
            { id: 'ally3', r: 6, q: 0, type: 'allied_soldier' },
            { id: 'dongzhuo', r: 6, q: 8, type: 'warlord' },
            { id: 'dead_guard1', r: 5, q: 8, type: 'allied_soldier', isDead: true, frame: 2 },
            { id: 'dead_guard2', r: 7, q: 8, type: 'allied_soldier', isDead: true, frame: 2 }
        ],
        isCutscene: true,
        hasChoice: true,
        choiceOptions: [
            { lines: ['Restrain', 'Zhang Fei'], color: '#88ff88', hoverColor: '#aaffaa' },
            { lines: ['Let him', 'strike'], color: '#ff8888', hoverColor: '#ffaaaa' }
        ],
        introScript: [
            // Reuse existing recorded Chapter 1 voice lines (same text, same voice IDs)
            { speaker: 'dongzhuo', portraitKey: 'dong-zhuo', name: 'Dong Zhuo', voiceId: 'gz_dz_01', text: { en: "What offices do you three hold?", zh: "你们三人身居何职？" } },
            { speaker: 'liubei', portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'gz_lb_office_01', text: { en: "None.", zh: "无。" } },
            { speaker: 'dongzhuo', portraitKey: 'dong-zhuo', name: 'Dong Zhuo', voiceId: 'gz_dz_02', text: { en: "Hmph. Common men with no rank. You may go.", zh: "哼。无官无职的平民。你们可以走了。" } },
            { speaker: 'zhangfei', portraitKey: 'zhang-fei', name: 'Zhang Fei', voiceId: 'gz_zf_rage_01', text: { en: "We have just rescued this menial in a bloody fight, and now he is rude to us! Nothing but his death can slake my anger.", zh: "我们刚刚在一场血战中救了这个小人物，现在他却对我们无礼！只有他的死才能平息我的怒火。" } }
        ]
    },
    'caocao_yingchuan_intercept': {
        name: 'Yingchuan - Cavalry Intercept',
        map: {
            biome: 'northern',
            layout: 'road',
            seed: 'caocao_yingchuan_intercept',
            forestDensity: 0.08,
            mountainDensity: 0.08,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Cao Cao force enters from the right.
            { id: 'caocao', r: 6, q: 9, type: 'caocao_force', onHorse: true, horseType: 'black', flip: true },
            { id: 'caoren', r: 5, q: 9, type: 'caocao_force', onHorse: true, horseType: 'brown', flip: true },
            { id: 'rider1', r: 7, q: 9, type: 'caocao_force', onHorse: true, horseType: 'brown', flip: true },
            { id: 'rider2', r: 6, q: 8, type: 'caocao_force', onHorse: true, horseType: 'white', flip: true },
            { id: 'rider3', r: 5, q: 8, type: 'caocao_force', onHorse: true, horseType: 'brown', flip: true },

            // Government troops in pursuit from the rear.
            { id: 'imperial1', r: 6, q: 2, type: 'allied_soldier' },
            { id: 'imperial2', r: 7, q: 2, type: 'allied_soldier' },
            { id: 'imperial_dead1', r: 5, q: 3, type: 'allied_soldier', isDead: true },
            { id: 'imperial_dead2', r: 8, q: 3, type: 'allied_soldier', isDead: true },

            // Retreating Yellow Turban force enters from the left.
            {
                id: 'zhangbao',
                r: 6,
                q: 1,
                type: 'zhang_bao',
                immortal: {
                    enabled: true,
                    triggerHp: 2,
                    onNearDeath: {
                        say: {
                            speaker: 'zhangbao',
                            text: {
                                en: "Brother Liang, break away! We will settle this at Guangzong!",
                                zh: "梁弟，速突围！回广宗再与官军算账！"
                            },
                            voiceId: 'cc_yc_zb_retreat_01',
                            durationMs: 2100,
                            lockSkips: true
                        },
                        flee: {
                            edge: 'left',
                            delayMs: 1700,
                            durationMs: 900,
                            extraTiles: 5
                        }
                    }
                }
            },
            {
                id: 'zhangliang',
                r: 5,
                q: 1,
                type: 'zhang_liang',
                immortal: {
                    enabled: true,
                    triggerHp: 2,
                    onNearDeath: {
                        say: {
                            speaker: 'zhangliang',
                            portraitKey: 'zhang-liang',
                            text: {
                                en: "To Guangzong! Rejoin the elder brother!",
                                zh: "退往广宗！与兄长会合！"
                            },
                            voiceId: 'cc_yc_zl_retreat_01',
                            durationMs: 1900,
                            lockSkips: true
                        },
                        flee: {
                            edge: 'left',
                            delayMs: 1500,
                            durationMs: 850,
                            extraTiles: 5
                        }
                    }
                }
            },
            { id: 'rebel1', r: 7, q: 2, type: 'enemy_soldier' },
            { id: 'rebel2', r: 6, q: 2, type: 'enemy_soldier' },
            { id: 'rebel3', r: 5, q: 2, type: 'enemy_soldier' },
            { id: 'rebel4', r: 7, q: 1, type: 'enemy_soldier' },
            { id: 'rebel5', r: 4, q: 1, type: 'enemy_soldier_weak' },
            { id: 'rebel6', r: 6, q: 3, type: 'enemy_soldier_weak' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['caocao', 'caoren']
        },
        introScript: [
            {
                speaker: 'caocao',
                portraitKey: 'cao-cao',
                name: 'Cao Cao',
                voiceId: 'cc_yc_01',
                text: {
                    en: "Yingchuan burns behind them. Huangfu Song and Zhu Jun have already broken their camp.",
                    zh: "颍川火光未息。皇甫嵩、朱儁已先破其营。"
                }
            },
            {
                speaker: 'caocao',
                portraitKey: 'cao-cao',
                name: 'Cao Cao',
                voiceId: 'cc_yc_02',
                text: {
                    en: "We cut the road here. Leave none to regroup at Guangzong.",
                    zh: "我军就在此断其去路，不可使其回广宗再聚。"
                }
            },
            {
                speaker: 'caoren',
                portraitKey: 'cao-ren',
                name: 'Cao Ren',
                voiceId: 'cc_yc_cr_01',
                text: {
                    en: "Understood! Cavalry forward - close the pass and strike their rear guard!",
                    zh: "明白！骑军前压，封住隘口，先斩其后队！"
                }
            },
            {
                speaker: 'zhangbao',
                portraitKey: 'zhang-bao',
                name: 'Zhang Bao',
                voiceId: 'cc_yc_zb_01',
                text: {
                    en: "Cavalry ahead?! Break through! Break through!",
                    zh: "前方竟有骑军？冲出去！冲出去！"
                }
            }
        ],
        postCombatScript: [
            {
                speaker: 'caocao',
                portraitKey: 'cao-cao',
                name: 'Cao Cao',
                voiceId: 'cc_yc_02',
                text: {
                    en: "We cut the road here. Leave none to regroup at Guangzong.",
                    zh: "我军就在此断其去路，不可使其回广宗再聚。"
                }
            },
            {
                speaker: 'caoren',
                portraitKey: 'cao-ren',
                name: 'Cao Ren',
                voiceId: 'cc_yc_cr_post_01',
                text: {
                    en: "Understood. I'll sweep the road, gather stragglers, and have the cavalry ready to move.",
                    zh: "得令。我这就清扫道路、收拢散卒，整备骑军再进。"
                }
            }
        ],
        nextScene: 'tactics',
        nextParams: { battleId: 'caocao_yingchuan_debrief' }
    },
    'caocao_yingchuan_debrief': {
        name: 'Yingchuan - After The Intercept',
        map: {
            biome: 'northern',
            layout: 'army_camp',
            seed: 'caocao_yingchuan_debrief',
            campFaction: 'yellow_turban',
            tentTerrain: 'tent',
            campTentCount: 9,
            burningTentCount: 5,
            forestDensity: 0.05,
            mountainDensity: 0.02,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'caocao', r: 8, q: 3, type: 'caocao_force' },
            { id: 'caoren', r: 9, q: 3, type: 'caocao_force' },
            { id: 'huangfusong', r: 4, q: 6, type: 'commander' },
            { id: 'zhujun', r: 5, q: 7, type: 'commander' },
            { id: 'imperial1', r: 4, q: 5, type: 'imperial_soldier' },
            { id: 'imperial2', r: 6, q: 6, type: 'imperial_soldier' },
            { id: 'rebel_corpse_a', r: 3, q: 7, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse_b', r: 6, q: 7, type: 'enemy_soldier', isDead: true },
            { id: 'rebel_corpse_c', r: 5, q: 8, type: 'enemy_soldier', isDead: true }
        ],
        isCutscene: true,
        introScript: [
            {
                speaker: 'huangfusong',
                portraitKey: 'Huangfu-Song-generic',
                name: 'Huangfu Song',
                voiceId: 'cc_yc_hfs_01',
                text: {
                    en: "Cavalry Commander Cao, your interception came in perfect time. The routed bands have no order left.",
                    zh: "曹都尉，你截击得正是时候。贼众既溃，已无行列可言。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'Zhu-Jun-generic',
                name: 'Zhu Jun',
                voiceId: 'cc_yc_zj_01',
                text: {
                    en: "Zhang Liang and Zhang Bao slipped away with a few horsemen. They will likely run toward Guangzong.",
                    zh: "张梁、张宝只率少数骑卒突围，多半会往广宗而去。"
                }
            },
            {
                type: 'choice',
                portraitKey: 'cao-cao',
                name: 'Cao Cao',
                options: [
                    {
                        buttonText: { en: 'Press pursuit north.', zh: '北追广宗' },
                        voiceId: 'cc_yc_choice_01',
                        text: {
                            en: "Then we ride without delay. A beaten enemy must not be given a night to breathe.",
                            zh: "那便即刻北追。败军最忌给它一夜喘息之机。"
                        },
                        speaker: 'caocao',
                        result: []
                    },
                    {
                        buttonText: { en: 'Stabilize here first.', zh: '先定颍川' },
                        voiceId: 'cc_yc_choice_02',
                        text: {
                            en: "We secure this field first and gather remounts; then strike again with full speed.",
                            zh: "先稳此地、补足战马，再以全速追击。"
                        },
                        speaker: 'caocao',
                        result: [
                            {
                                speaker: 'huangfusong',
                                portraitKey: 'Huangfu-Song-generic',
                                name: 'Huangfu Song',
                                voiceId: 'cc_yc_hfs_choice_01',
                                text: {
                                    en: "Prudent and sharp. Keep your riders fresh and your line intact.",
                                    zh: "持重而不失锋芒。养住骑军，阵势自可再发。"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                speaker: 'caoren',
                portraitKey: 'cao-ren',
                name: 'Cao Ren',
                voiceId: 'cc_yc_cr_02',
                text: {
                    en: "Orders received. I will regroup the riders and prepare to move at once.",
                    zh: "军令已受。我这就整队骑士，随时再进。"
                }
            }
        ],
        nextScene: 'narrative',
        nextParams: { scriptId: 'caocao_ch1_end_card' }
    }
};

const SOLDIER_BASE = {
    templateId: 'soldier',
    imgKey: 'soldier',
    moveRange: 3,
    attacks: ['slash', 'polearm_sweep']
};

const SOLDIER_VARIANTS = {
    // Unified soldier archetype with role-specific title/faction/stat overrides.
    volunteer: { ...SOLDIER_BASE, name: 'Volunteer', hp: 2, faction: 'allied' },
    qingzhou_guard: { ...SOLDIER_BASE, name: 'Qingzhou Guard', hp: 3, faction: 'allied' },
    imperial_guard_dead: { ...SOLDIER_BASE, name: 'Imperial Guard', hp: 0, moveRange: 0, attacks: [], faction: 'allied' },
    imperial_soldier: { ...SOLDIER_BASE, name: 'Imperial Soldier', hp: 1, faction: 'allied' },
    imperial_escort: { ...SOLDIER_BASE, name: 'Imperial Escort', hp: 3, faction: 'enemy' },
    generic: { ...SOLDIER_BASE, name: 'Soldier', hp: 3, faction: 'allied' }
};

export const UNIT_TEMPLATES = {
    'hero': {
        'liubei': { name: 'Liu Bei', imgKey: 'liubei', hp: 4, moveRange: 4, attacks: ['double_blades'], faction: 'player' },
        'guanyu': { name: 'Guan Yu', imgKey: 'guanyu', hp: 4, moveRange: 5, attacks: ['green_dragon_slash'], faction: 'player' },
        'zhangfei': { name: 'Zhang Fei', imgKey: 'zhangfei', hp: 4, moveRange: 4, attacks: ['serpent_spear'], faction: 'player' }
    },
    'allied_soldier': {
        'ally': { ...SOLDIER_VARIANTS.volunteer },
        'guard': { ...SOLDIER_VARIANTS.qingzhou_guard },
        'camp_guard': { ...SOLDIER_VARIANTS.qingzhou_guard },
        'dead_guard': { ...SOLDIER_VARIANTS.imperial_guard_dead }
    },
    'enemy_soldier': {
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 3, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 2 }
    },
    'enemy_soldier_weak': {
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 2, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 1 }
    },
    'imperial_soldier': {
        'soldier': { ...SOLDIER_VARIANTS.imperial_soldier },
        'escort': { ...SOLDIER_VARIANTS.imperial_escort }
    },
    // Generic custom-battle soldier option.
    'soldier': {
        'soldier': { ...SOLDIER_VARIANTS.generic }
    },
    'enemy_captain': {
        'dengmao': { name: 'Deng Mao', imgKey: 'dengmao', hp: 5, moveRange: 3, attacks: ['generic_spear'], faction: 'enemy', level: 1 },
        'chengyuanzhi': { name: 'Cheng Yuanzhi', imgKey: 'chengyuanzhi', hp: 5, moveRange: 3, attacks: ['polearm_sweep'], faction: 'enemy', level: 2 },
        'zhang_jue_captain': { name: 'Yellow Turban Captain', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['bash'], faction: 'enemy' }
    },
    'commander': {
        'gongjing': { name: 'Gong Jing', imgKey: 'gongjing_sprite', hp: 5, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'luzhi': { name: 'Lu Zhi', imgKey: 'zhoujing', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'huangfusong': { name: 'Huangfu Song', imgKey: 'huangfusong_sprite', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'zhujun': { name: 'Zhu Jun', imgKey: 'zhujun_sprite', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' }
    },
    'warlord': {
        'dongzhuo': { name: 'Dong Zhuo', imgKey: 'dongzhuo', hp: 9, moveRange: 3, attacks: ['blade_sweep_4'], faction: 'allied' }
    },
    'caocao_force': {
        'caocao': { name: 'Cao Cao', imgKey: 'caocao', hp: 6, moveRange: 4, attacks: ['slash_cao', 'command'], faction: 'player' },
        'caoren': {
            name: 'Cao Ren',
            imgKey: 'caoren',
            hp: 5,
            moveRange: 4,
            attacks: ['caoren_spear'],
            faction: 'player',
            shieldResistBase: 0.2,
            shieldResistPerLevel: 0.05
        },
        'rider': { name: 'Cavalry', imgKey: 'soldier', hp: 4, moveRange: 4, attacks: ['slash'], faction: 'allied', templateId: 'soldier' }
    },
    'zhang_jue': {
        'zhangjue': { name: 'Zhang Jue', imgKey: 'zhangjiao', hp: 8, moveRange: 4, attacks: ['bash_3'], faction: 'enemy' }
    },
    'zhang_bao': {
        'zhangbao': { name: 'Zhang Bao', imgKey: 'zhangbao', hp: 7, moveRange: 4, attacks: ['slash'], faction: 'enemy' }
    },
    'zhang_liang': {
        'zhangliang': { name: 'Zhang Liang', imgKey: 'zhangliang', hp: 7, moveRange: 4, attacks: ['blade_sweep_2'], faction: 'enemy' }
    },
    'prop': {
        'boulder': { name: 'Boulder', imgKey: 'boulder', hp: 2, moveRange: 0, attacks: [], faction: 'neutral' }
    }
};

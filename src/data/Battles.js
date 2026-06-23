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
            { id: 'rebel4', r: 3, q: 5, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel5', r: 3, q: 6, type: 'enemy_soldier' },
            { id: 'rebel6', r: 1, q: 3, type: 'enemy_soldier' },
            { id: 'rebel7', r: 1, q: 4, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel8', r: 1, q: 5, type: 'enemy_soldier' },
            // Government soldiers (right side, retreating) - halved for faster combat
            { id: 'soldier1', r: 8, q: 3, type: 'imperial_soldier' },
            { id: 'soldier2', r: 8, q: 4, type: 'imperial_soldier' },
            { id: 'soldier3', r: 9, q: 3, type: 'imperial_soldier' },
            { id: 'soldier4', r: 9, q: 4, type: 'imperial_soldier' }
        ],
        isCutscene: true,
        cutsceneAutoCombat: true, // Enable automatic combat animations
        watchOnlyHint: {
            title: { en: 'WATCH ONLY', zh: '仅观看' },
            body: { en: 'This battle plays automatically.', zh: '本场战斗会自动进行。' },
            blockedBody: { en: 'This battle is watch-only. You will command soon.', zh: '本场战斗只能观看。稍后由你指挥。' }
        },
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
            { id: 'rebel1', r: 7, q: 3, type: 'enemy_soldier_weak', templateId: 'rebel_archer' },
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
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'daxing' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "Daxing cannot be left to the rebels. Gather the volunteers; we strike again before they scatter into the county.", zh: "大兴不可任贼侵扰。收拢义勇，趁贼未散，再战一次。" } },
                { type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Good. I owe those captains another meeting.", zh: "好。俺也正要再会会那两个贼首。" } }
            ]
        }
    },
    'zhuo_training': {
        name: "Zhuo County Training",
        map: {
            biome: 'northern',
            layout: 'foothills',
            seed: 'zhuo_training',
            forestDensity: 0.0,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0,
            weather: 'none'
        },
        playerFaction: 'liu_bei_volunteers',
        baseXP: 0,
        units: [
            { id: 'liubei', r: 2, q: 3, type: 'hero' },
            { id: 'guanyu', r: 3, q: 2, type: 'hero' },
            { id: 'zhangfei', r: 3, q: 4, type: 'hero' },
            { id: 'ally1', r: 1, q: 2, type: 'allied_soldier' },
            { id: 'ally2', r: 1, q: 4, type: 'allied_soldier' },
            { id: 'dummy1', r: 6, q: 2, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy2', r: 6, q: 3, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy3', r: 6, q: 4, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy4', r: 7, q: 3, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy5', r: 7, q: 5, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy6', r: 8, q: 4, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy7', r: 5, q: 1, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy8', r: 5, q: 5, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy9', r: 7, q: 1, type: 'training_dummy', templateId: 'dummy' },
            { id: 'dummy10', r: 8, q: 6, type: 'training_dummy', templateId: 'dummy' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        introScript: [
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'train_lb_01', text: { en: "Before battle, watch how the field breathes.", zh: "临战之前，先看清战场如何运转。" } },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'train_lb_02', text: { en: "Enemies and allies move first. They show where they mean to strike.", zh: "敌人与友军会先行动，并标出他们准备攻击的位置。" } },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'train_lb_03', text: { en: "Those attacks do not land until you end your turn.", zh: "只有你结束回合之后，那些攻击才会真正落下。" } },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'train_gy_01', text: { en: "Red marks enemies. Blue marks allies. Green marks the heroes under your command.", zh: "红色代表敌人，蓝色代表友军，绿色代表由你指挥的英雄。" } }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'zhuo_training' } },
            script: [
                { bg: 'noticeboard', type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Wooden dummies got the better of us? Again!", zh: "木桩都能占上风？再来！" } }
            ]
        }
    },
    'qingzhou_prelude': {
        name: "Ambush at Qingzhou",
        map: {
            biome: 'central',
            layout: 'city_gate',
            cityGateDefenderSide: 'player',
            forestDensity: 0.05,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.2
        },
        playerFaction: 'liu_bei_volunteers',
        units: [
            { id: 'liubei', r: 4, q: 1, type: 'hero', cityGateSide: 'outside' },
            { id: 'guanyu', r: 5, q: 1, type: 'hero', cityGateSide: 'outside' },
            { id: 'zhangfei', r: 4, q: 2, type: 'hero', cityGateSide: 'outside' },
            { id: 'ally1', r: 5, q: 2, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'ally2', r: 4, q: 0, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'ally3', r: 5, q: 3, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'gongjing', r: 1, q: 5, type: 'commander', cityGateSide: 'inside' },
            { id: 'qz_guard1', r: 1, q: 4, type: 'allied_soldier', cityGateSide: 'inside' },
            { id: 'qz_guard2', r: 2, q: 5, type: 'allied_soldier', cityGateSide: 'inside' },
            // Generate 20 rebels - half weak, half normal; ~1/5 are archers (at least 1)
            ...Array.from({length: 20}, (_, i) => ({ 
                id: `rebel_pre_${i}`, 
                r: 6 + Math.floor(i / 5), 
                q: 1 + (i % 8), 
                type: i % 2 === 0 ? 'enemy_soldier_weak' : 'enemy_soldier',
                templateId: i % 5 === 0 ? 'rebel_archer' : 'rebel',
                cityGateSide: 'outside'
            }))
        ],
        victoryCondition: {
            type: 'prelude'
        },
        introScript: [
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_02', text: { en: "They are many and we but few. We cannot prevail in a direct assault.", zh: "敌众我寡。我们不能正面强攻。" } },
            { portraitKey: 'liu-bei', name: 'Liu Bei', voiceId: 'qz_lb_03', text: { en: "Guan Yu, Zhang Fei—take half our forces and hide behind the hills. When the gongs beat, strike from the flanks!", zh: "云长、翼德——带一半人马埋伏在山后。锣声一响，从两翼夹击！" } },
            { portraitKey: 'guan-yu', name: 'Guan Yu', voiceId: 'qz_gy_01', text: { en: "A superior strategy, brother. We go at once.", zh: "妙计，兄长。我们即刻出发。" } }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'qingzhou_prelude' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "The pass swallowed our formation before the ambush could be set. We return to the ridge and prepare the signal again.", zh: "山道乱了阵脚，伏兵未成。退回岭上，重新布置信号。" } },
                { type: 'dialogue', portraitKey: 'guan-yu', name: 'Guan Yu', text: { en: "This time the flanks will move as one.", zh: "此番两翼必同时而动。" } }
            ]
        }
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
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'qingzhou_siege' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "The signal failed and the pass fell into confusion. We return to the mouth of the gorge and run the ambush again.", zh: "旗号未成，山道大乱。退回谷口，重整伏击。" } },
                { type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Let me hear that gong properly this time.", zh: "这回锣声可要响个痛快。" } }
            ]
        }
    },
    'qingzhou_cleanup': {
        name: 'Qingzhou Gate - Victory',
        map: {
            biome: 'central',
            layout: 'city_gate',
            seed: 'qingzhou_gate',
            cityGateDefenderSide: 'player',
            forestDensity: 0.1,
            mountainDensity: 0.1,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            // Oath brothers and remaining rebels are outside the city gate.
            { id: 'liubei', r: 5, q: 2, type: 'hero', cityGateSide: 'outside' },
            { id: 'guanyu', r: 6, q: 2, type: 'hero', cityGateSide: 'outside' },
            { id: 'zhangfei', r: 5, q: 3, type: 'hero', cityGateSide: 'outside' },
            // Guards and Gong Jing near the gate
            { id: 'guard1', r: 6, q: 4, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'guard2', r: 6, q: 6, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'gongjing', r: 5, q: 5, type: 'commander', cityGateSide: 'outside' },
            // Dead yellow turbans scattered around
            { id: 'rebel_corpse1', r: 7, q: 3, type: 'enemy_soldier', isDead: true, cityGateSide: 'outside' },
            { id: 'rebel_corpse2', r: 8, q: 6, type: 'enemy_soldier', isDead: true, cityGateSide: 'outside' },
            { id: 'rebel_corpse3', r: 9, q: 4, type: 'enemy_soldier', isDead: true, cityGateSide: 'outside' },
            { id: 'rebel_corpse4', r: 10, q: 5, type: 'enemy_soldier', isDead: true, cityGateSide: 'outside' },
            // Rebels that will be executed in the cutscene (one archer)
            { id: 'rebel_cleanup1', r: 7, q: 4, type: 'enemy_soldier', templateId: 'rebel_archer', cityGateSide: 'outside' },
            { id: 'rebel_cleanup2', r: 8, q: 5, type: 'enemy_soldier', cityGateSide: 'outside' }
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
        hasChoice: true,
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'guangzong_encounter' } },
            script: [
                { bg: 'dirt_road_city_in_distance', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "The escort overcame us before Master Lu could be freed. We return to the road and make the choice again with steadier hands.", zh: "押送兵先胜一阵，卢师未能脱困。回到路上，再作决断。" } },
                { type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Then let me start closer to the cage.", zh: "那就让俺离牢笼近些再打。" } }
            ]
        }
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
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'guangzong_escort' } },
            script: [
                { bg: 'dirt_road_city_in_distance', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "If we choose to free Master Lu, hesitation will only shame us. Reform the line and break the escort cleanly.", zh: "既要救卢师，迟疑只会自辱。重整阵势，破开押送兵。" } },
                { type: 'dialogue', portraitKey: 'guan-yu', name: 'Guan Yu', text: { en: "Then we must strike without harming the innocent.", zh: "既如此，更要出手有度，不伤无辜。" } }
            ]
        }
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
            // Yellow Turbans attacking Dong Zhuo - Spread out more (~1/5 archers)
            { id: 'rebel1', r: 4, q: 4, type: 'enemy_soldier_weak' },
            { id: 'rebel2', r: 6, q: 3, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel3', r: 8, q: 4, type: 'enemy_soldier_weak' },
            { id: 'rebel4', r: 5, q: 6, type: 'enemy_soldier' },
            { id: 'rebel5', r: 3, q: 6, type: 'enemy_soldier_weak' },
            { id: 'rebel6', r: 9, q: 6, type: 'enemy_soldier' },
            { id: 'rebel7', r: 4, q: 7, type: 'enemy_soldier', templateId: 'rebel_archer' },
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
        hasVictoryDialogue: true,  // Flag to trigger on-map victory dialogue
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'dongzhuo_battle' } },
            script: [
                { bg: 'dirt_road_city_in_distance', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "Dong Zhuo's column is still under threat. Whatever his manners, we cannot let the rebels destroy an imperial force.", zh: "董卓军仍在危急之中。无论其人如何，不能坐视官军覆灭。" } },
                { type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Saving him twice had better be worth it.", zh: "救他两回，最好别白费。" } }
            ]
        }
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
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_oath_dongzhuo_choice' } },
            script: [
                { bg: 'dirt_road_city_in_distance', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "Dong Zhuo is not worth the ruin of our oath. We return to the moment and choose our course with clear minds.", zh: "董卓不值得毁我兄弟之义。回到此刻，冷静决断。" } },
                { type: 'dialogue', portraitKey: 'guan-yu', name: 'Guan Yu', text: { en: "Anger must answer to righteousness.", zh: "怒气也须听从义理。" } }
            ]
        }
    },
    'chapter2_zhangbao_probe': {
        name: 'Yingchuan - First Clash with Zhang Bao',
        baseXP: 0,
        map: {
            biome: 'northern',
            layout: 'foothills',
            seed: 'chapter2_zhangbao_probe',
            weather: 'rain',
            forestDensity: 0.08,
            mountainDensity: 0.06,
            riverDensity: 0.0,
            houseDensity: 0.02
        },
        units: [
            { id: 'liubei', r: 7, q: 2, type: 'hero' },
            { id: 'guanyu', r: 6, q: 2, type: 'hero' },
            { id: 'zhangfei', r: 8, q: 2, type: 'hero' },
            { id: 'ally1', r: 7, q: 1, type: 'allied_soldier' },
            { id: 'ally2', r: 6, q: 1, type: 'allied_soldier' },
            { id: 'ally3', r: 8, q: 1, type: 'allied_soldier' },
            {
                id: 'zhangbao',
                r: 4,
                q: 9,
                type: 'zhang_bao',
                level: 4,
                immortal: {
                    enabled: true,
                    triggerHp: 1,
                    onNearDeath: { callback: 'chapter2_zhangbao_sorcery' }
                }
            },
            { id: 'gaosheng', r: 5, q: 8, type: 'enemy_captain', templateId: 'gaosheng' },
            { id: 'rebel1', r: 4, q: 8, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel2', r: 5, q: 9, type: 'enemy_soldier' },
            { id: 'rebel3', r: 3, q: 9, type: 'enemy_soldier' }
        ],
        introScript: [
            {
                speaker: 'zhangbao',
                portraitKey: 'zhang-bao',
                name: 'Zhang Bao',
                voiceId: 'ch2_probe_zb_01',
                text: {
                    en: "You are Liu Xuande? Good. Taste the thunder of the Yellow Heaven.",
                    zh: "你便是刘玄德？好，且尝黄天之雷。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_probe_lb_01',
                text: {
                    en: "Hold the line. Break Gao Sheng first and pressure Zhang Bao.",
                    zh: "稳住阵脚。先破高升，再逼张宝。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_zhangbao_probe' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "Zhang Bao's lightning broke our advance before we understood his method. Reform the vanguard; we test him again.", zh: "未明张宝雷法，前军先乱。重整先锋，再试其阵。" } },
                { type: 'dialogue', portraitKey: 'zhang-fei', name: 'Zhang Fei', text: { en: "Let him throw thunder. I will still close the distance.", zh: "任他使雷，俺也去近前会他。" } }
            ]
        }
    },
    'chapter2_zhangbao_counter': {
        name: 'Yingchuan - The Yangcheng Approach',
        map: {
            biome: 'northern',
            layout: 'pincer_valley',
            orientation: 'ns',
            seed: 'chapter2_zhangbao_counter',
            weather: 'rain',
            forestDensity: 0.0,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 5, q: 1, type: 'hero' },
            { id: 'guanyu', r: 4, q: 8, type: 'hero' },
            { id: 'zhangfei', r: 6, q: 8, type: 'hero' },
            { id: 'ally1', r: 4, q: 1, type: 'allied_soldier' },
            { id: 'ally2', r: 3, q: 9, type: 'allied_soldier' },
            { id: 'ally3', r: 7, q: 9, type: 'allied_soldier' },
            {
                id: 'zhangbao',
                r: 4,
                q: 5,
                type: 'zhang_bao',
                level: 4,
                attacks: ['slash', 'heavenly_lightning'],
                immortal: {
                    enabled: true,
                    triggerHp: 2,
                    onNearDeath: {
                        say: {
                            speaker: 'zhangbao',
                            portraitKey: 'zhang-bao',
                            text: {
                                en: "My spell is broken! Yangcheng - fall back to Yangcheng!",
                                zh: "吾法已破！退入阳城，退入阳城！"
                            },
                            voiceId: 'ch2_counter_zb_retreat_01',
                            durationMs: 2200
                        },
                        flee: {
                            edge: 'right',
                            delayMs: 1600,
                            durationMs: 900,
                            extraTiles: 5
                        },
                        endBattle: {
                            won: true,
                            delayMs: 3000
                        }
                    }
                }
            },
            { id: 'gaosheng_remnant', r: 5, q: 5, type: 'enemy_captain', templateId: 'gaosheng', storyCasualtyKey: 'chapter2_zhangbao_probe:gaosheng' },
            { id: 'rebel1', r: 4, q: 6, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel2', r: 5, q: 6, type: 'enemy_soldier' },
            { id: 'rebel3', r: 3, q: 5, type: 'enemy_soldier' },
            { id: 'rebel4', r: 6, q: 5, type: 'enemy_soldier' }
        ],
        scenarioAttacks: [
            {
                attackKey: 'throw_filth',
                unitIds: ['liubei', 'guanyu', 'zhangfei'],
                targetUnitIds: ['zhangbao'],
                removeAfterUse: true,
                disableTargetAttacks: ['heavenly_lightning']
            }
        ],
        introScript: [
            {
                speaker: 'zhangbao',
                portraitKey: 'zhang-bao',
                name: 'Zhang Bao',
                voiceId: 'ch2_counter_zb_01',
                text: {
                    en: "Again you come? Then Heaven's lightning will answer me again!",
                    zh: "汝等又来？黄天天雷仍为我应！"
                }
            },
            {
                speaker: 'guanyu',
                portraitKey: 'guan-yu',
                name: 'Guan Yu',
                voiceId: 'ch2_counter_gy_01',
                text: {
                    en: "We are in position on the far side. When he calls the lightning, we close the pincer.",
                    zh: "我等已在彼侧列阵。待其召雷，即合围进逼。"
                }
            },
            {
                speaker: 'liu-bei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_counter_lb_01',
                text: {
                    en: "Hold until the thunder breaks and the black air rises. Then get close to Zhang Bao and throw the filth on him to stop his power.",
                    zh: "待雷声大作、黑气漫天，再靠近张宝，将秽物掷到他身上，破其妖法。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_zhangbao_counter' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'zhu-jun-generic', name: 'Zhu Jun', text: { en: "The counter failed before the filth reached Zhang Bao. Reform the two wings and try again.", zh: "秽物未及张宝，破法便败。重整两翼，再试一次。" } },
                { type: 'dialogue', portraitKey: 'liu-bei', name: 'Liu Bei', text: { en: "We know the method. Next time, close the pincer and strike him directly.", zh: "破法之策已明。再往，合围上前，务必中其身。" } }
            ]
        }
    },
    'chapter2_yangcheng_surrender': {
        name: 'Yangcheng - Surrender at the Wall',
        map: {
            biome: 'northern',
            layout: 'city_gate',
            seed: 'chapter2_yangcheng_surrender',
            cityGateDefenderSide: 'enemy',
            forestDensity: 0.0,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 6, q: 3, type: 'hero', templateId: 'liubei', cityGateSide: 'outside' },
            { id: 'guanyu', r: 7, q: 2, type: 'hero', templateId: 'guanyu', cityGateSide: 'outside' },
            { id: 'zhangfei', r: 7, q: 6, type: 'hero', templateId: 'zhangfei', cityGateSide: 'outside' },
            { id: 'zhujun', r: 5, q: 2, type: 'commander', templateId: 'zhujun_observer', cityGateSide: 'outside' },
            { id: 'oath_soldier1', r: 8, q: 2, type: 'allied_soldier', templateId: 'ally', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'oath_soldier2', r: 8, q: 4, type: 'allied_soldier', templateId: 'ally', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'oath_soldier3', r: 8, q: 6, type: 'allied_soldier', templateId: 'ally', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'han_soldier1', r: 5, q: 1, type: 'imperial_soldier', templateId: 'soldier', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'han_soldier2', r: 5, q: 8, type: 'imperial_soldier', templateId: 'soldier', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'han_soldier3', r: 6, q: 7, type: 'imperial_soldier', templateId: 'soldier', cityGateSide: 'outside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'zhangbao', r: 2, q: 4, type: 'zhang_bao', templateId: 'zhangbao_wounded', cityGateSide: 'inside' },
            { id: 'yanzheng', r: 2, q: 5, type: 'commander', templateId: 'yanzheng', faction: 'enemy', cityGateSide: 'inside' },
            { id: 'wall_rebel1', r: 2, q: 1, type: 'enemy_soldier_weak', templateId: 'rebel', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'wall_rebel2', r: 2, q: 2, type: 'enemy_soldier_weak', templateId: 'rebel_archer', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'wall_rebel3', r: 2, q: 3, type: 'enemy_soldier_weak', templateId: 'rebel', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'wall_rebel4', r: 2, q: 6, type: 'enemy_soldier_weak', templateId: 'rebel', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'wall_rebel5', r: 2, q: 7, type: 'enemy_soldier_weak', templateId: 'rebel_archer', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] },
            { id: 'wall_rebel6', r: 2, q: 8, type: 'enemy_soldier_weak', templateId: 'rebel', cityGateSide: 'inside', spectator: true, moveRange: 0, attacks: [] }
        ],
        isCutscene: true,
        cutsceneAutoCombat: true,
        introScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_yc_zj_01',
                text: {
                    en: "Zhang Bao! Zhang Jue died at Guangzong, and Huangfu Song cut down Zhang Liang at Quyang. Your brothers are gone, your sorcery is broken, and the counties return to the Han.",
                    zh: "张宝！张角已死于广宗，张梁又在曲阳为皇甫嵩所破。你兄弟皆亡，妖法已破，诸郡皆归汉廷。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_yc_zj_02',
                text: {
                    en: "Open the gate. Surrender the city, and those who lay down arms may yet live.",
                    zh: "开城投降。弃兵归顺者，尚可保全性命。"
                }
            },
            {
                speaker: 'zhangbao',
                portraitKey: 'zhang-bao',
                name: 'Zhang Bao',
                voiceId: 'ch2_yc_zb_refuse_01',
                text: {
                    en: "Surrender? I am the General of Earth. Yangcheng will stand while one Yellow Turban yet breathes.",
                    zh: "投降？吾乃地公将军。只要黄巾尚有一人，阳城便不会降。"
                }
            },
            {
                type: 'choice',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                options: [
                    {
                        buttonText: { en: "Lay down your arms.", zh: "弃兵开城。" },
                        voiceId: 'ch2_yc_lb_clemency_01',
                        text: {
                            en: "Zhang Bao, surrender now. Lay down your arms, and I will urge mercy for the soldiers on that wall.",
                            zh: "张宝，此刻归降。弃兵开城，我愿为墙上士卒求一线生路。"
                        },
                        speaker: 'liubei',
                        result: [
                            { type: 'command', action: 'setStoryChoice', key: 'chapter2_yangcheng_appeal', value: 'clemency', routeId: 'chapter2_oath' },
                            {
                                speaker: 'zhangbao',
                                portraitKey: 'zhang-bao',
                                name: 'Zhang Bao',
                                voiceId: 'ch2_yc_zb_01',
                                text: {
                                    en: "Clemency? From men who splash filth at Heaven? I am General of Earth. Yangcheng will not bend.",
                                    zh: "宽赦？尔等以污秽犯天，也配言宽赦？吾乃地公将军，阳城不降！"
                                }
                            }
                        ]
                    },
                    {
                        buttonText: { en: "Force a siege and die.", zh: "守城便死。" },
                        voiceId: 'ch2_yc_lb_threat_01',
                        text: {
                            en: "Then hear this plainly: if you force a siege, your followers will die for a spell already spent.",
                            zh: "那便听清楚：若你执意守城，部众只会为已破之妖术送命。"
                        },
                        speaker: 'liubei',
                        result: [
                            { type: 'command', action: 'setStoryChoice', key: 'chapter2_yangcheng_appeal', value: 'threat', routeId: 'chapter2_oath' },
                            {
                                speaker: 'zhangbao',
                                portraitKey: 'zhang-bao',
                                name: 'Zhang Bao',
                                voiceId: 'ch2_yc_zb_threat_reply',
                                text: {
                                    en: "Threats from woven-mat peddlers? I command the Yellow Heaven. Come up the wall and be buried beneath it.",
                                    zh: "织席贩履之徒，也敢威吓于我？吾奉黄天号令。尔等上城，便葬于城下！"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                speaker: 'yanzheng',
                portraitKey: 'yellowturban',
                name: 'Yan Zheng',
                voiceId: 'ch2_yc_yz_01',
                text: {
                    en: "General... the men have no grain, no faith, and no wish to be buried with you.",
                    zh: "将军……军中无粮，无心，也无人愿陪你同葬。"
                }
            },
            {
                speaker: 'zhangbao',
                portraitKey: 'zhang-bao',
                name: 'Zhang Bao',
                voiceId: 'ch2_yc_zb_02',
                text: {
                    en: "Coward! Speak once more of surrender and I will offer your blood to the Yellow Heaven.",
                    zh: "懦夫！再敢言降，吾便以汝血祭黄天！"
                }
            }
        ],
        postCombatScript: [
            {
                speaker: 'yanzheng',
                portraitKey: 'yellowturban',
                name: 'Yan Zheng',
                voiceId: 'ch2_yc_yz_02',
                text: {
                    en: "Yan Zheng has struck down Zhang Bao. I bring his head and surrender Yangcheng.",
                    zh: "严政已杀张宝。今献其首，举阳城归降。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_yc_zj_03',
                text: {
                    en: "Receive the surrender. Disarm the rebels, spare those who submit, and send word of Yangcheng to the court.",
                    zh: "纳降。收其兵器，顺者勿杀，并将阳城捷报奏闻朝廷。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_yc_lb_02',
                text: {
                    en: "The false thunder is silent. May the people behind those walls hear real peace again.",
                    zh: "妖雷已息。愿城中百姓，终能再闻太平之声。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_yc_zj_04',
                text: {
                    en: "Yangcheng is settled. We march next to Wan, where Han Zhong has gathered the remaining rebels.",
                    zh: "阳城已定。下一步进军宛城，韩忠已在那里收聚余贼。"
                }
            }
        ]
    },
    'chapter2_wan_field': {
        name: 'Wan - The Open Southeast Road',
        map: {
            biome: 'northern',
            layout: 'road',
            seed: 'chapter2_wan_field',
            forestDensity: 0.08,
            mountainDensity: 0.06,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 6, q: 2, type: 'hero', templateId: 'liubei' },
            { id: 'guanyu', r: 5, q: 1, type: 'hero', templateId: 'guanyu' },
            { id: 'zhangfei', r: 7, q: 1, type: 'hero', templateId: 'zhangfei' },
            { id: 'ally1', r: 5, q: 2, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 2, type: 'allied_soldier' },
            { id: 'zhujun', r: 6, q: 0, type: 'commander', templateId: 'zhujun' },
            { id: 'imperial1', r: 4, q: 1, type: 'imperial_soldier' },
            { id: 'imperial2', r: 8, q: 1, type: 'imperial_soldier' },
            { id: 'hanzhong', r: 6, q: 8, type: 'enemy_captain', templateId: 'hanzhong' },
            { id: 'rebel1', r: 5, q: 8, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel2', r: 7, q: 8, type: 'enemy_soldier' },
            { id: 'rebel3', r: 4, q: 9, type: 'enemy_soldier' },
            { id: 'rebel4', r: 8, q: 9, type: 'enemy_soldier', templateId: 'rebel_archer' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        introScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_field_zj_01',
                text: {
                    en: "Han Zhong has taken the road. Hold discipline and cut through his disordered column.",
                    zh: "韩忠果走此路。严整军阵，击破其散乱之队。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_field_lb_01',
                text: {
                    en: "Do not let them turn desperation into courage. Break the captains and the rest will scatter.",
                    zh: "不可令其绝望成勇。先破头目，其余自散。"
                }
            },
            {
                speaker: 'hanzhong',
                portraitKey: 'yellowturban',
                name: 'Han Zhong',
                voiceId: 'ch2_wan_field_hz_01',
                text: {
                    en: "They opened the road to bait us. Fight through before the trap closes!",
                    zh: "官军开路，果是诱我！趁伏兵未合，杀出去！"
                }
            }
        ],
        postCombatScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_field_zj_02',
                text: {
                    en: "The field is ours. Now Wan can be received without trusting a barred gate.",
                    zh: "野战已胜。如此受宛城之降，便非轻信闭门之言。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_field_lb_02',
                text: {
                    en: "A road left open saved more lives than a wall battered in anger.",
                    zh: "留一路生门，胜过怒击城墙，可少伤性命。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_wan_field' } },
            script: [
                {
                    bg: 'army_camp',
                    type: 'dialogue',
                    portraitKey: 'zhu-jun-generic',
                    name: 'Zhu Jun',
                    voiceId: 'ch2_wan_field_defeat_zj_01',
                    text: {
                        en: "Han Zhong slipped the trap because the road was opened without enough pressure. Reform the line and spring it again.",
                        zh: "韩忠脱围，是开路而逼迫不足。重整军阵，再设此计。"
                    }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'ch2_wan_field_defeat_lb_01',
                    text: {
                        en: "The plan is still sound. We must meet him in the field before he regains courage.",
                        zh: "此计仍可行。须在野外迎击，不令其复振。"
                    }
                }
            ]
        }
    },
    'chapter2_wan_gate': {
        name: 'Wan - Assault the Gate',
        map: {
            biome: 'northern',
            layout: 'city_gate',
            seed: 'chapter2_wan_gate',
            cityGateDefenderSide: 'enemy',
            forestDensity: 0.0,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 7, q: 3, type: 'hero', templateId: 'liubei', cityGateSide: 'outside' },
            { id: 'guanyu', r: 7, q: 2, type: 'hero', templateId: 'guanyu', cityGateSide: 'outside' },
            { id: 'zhangfei', r: 7, q: 6, type: 'hero', templateId: 'zhangfei', cityGateSide: 'outside' },
            { id: 'ally1', r: 8, q: 2, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'ally2', r: 8, q: 6, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'zhujun', r: 6, q: 1, type: 'commander', templateId: 'zhujun', cityGateSide: 'outside' },
            { id: 'imperial1', r: 6, q: 7, type: 'imperial_soldier', cityGateSide: 'outside' },
            { id: 'wan_ladder_left', r: 8, q: 1, type: 'siege_ladder', templateId: 'ladder', faction: 'allied', cityGateSide: 'outside' },
            { id: 'wan_ladder_right', r: 8, q: 7, type: 'siege_ladder', templateId: 'ladder', faction: 'allied', cityGateSide: 'outside' },
            { id: 'hanzhong', r: 2, q: 4, type: 'enemy_captain', templateId: 'hanzhong', cityGateSide: 'inside' },
            { id: 'wall_rebel1', r: 2, q: 2, type: 'enemy_soldier', cityGateSide: 'inside' },
            { id: 'wall_rebel2', r: 2, q: 6, type: 'enemy_soldier', templateId: 'rebel_archer', cityGateSide: 'inside' },
            { id: 'wall_rebel3', r: 1, q: 3, type: 'enemy_soldier', templateId: 'rebel_archer', cityGateSide: 'inside' },
            { id: 'wall_rebel4', r: 1, q: 5, type: 'enemy_soldier', cityGateSide: 'inside' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        introScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_gate_zj_01',
                text: {
                    en: "Wan's gate stands before us. Break it, but keep the soldiers from plunder.",
                    zh: "宛城城门在前。破门而入，但须禁军士焚掠。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_gate_lb_01',
                text: {
                    en: "The rebels chose a closed gate over true surrender. Strike cleanly and end this quickly.",
                    zh: "贼众闭门而不真降。速战速决，不可拖延。"
                }
            },
            {
                speaker: 'hanzhong',
                portraitKey: 'yellowturban',
                name: 'Han Zhong',
                voiceId: 'ch2_wan_gate_hz_01',
                text: {
                    en: "They answer surrender with ladders and blades. Hold the wall!",
                    zh: "官军以刀梯回应请降！守住城墙！"
                }
            }
        ],
        postCombatScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_gate_zj_02',
                text: {
                    en: "Wan is taken. This was harsher than the open road, but the city must now be kept in order.",
                    zh: "宛城已取。此路较开东南为烈，城中更须安抚整肃。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_gate_lb_02',
                text: {
                    en: "Then let the people see that Han order follows the soldiers through the gate.",
                    zh: "便令百姓看见，汉军入城，随之而来的是法度。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_wan_gate' } },
            script: [
                {
                    bg: 'army_camp',
                    type: 'dialogue',
                    portraitKey: 'zhu-jun-generic',
                    name: 'Zhu Jun',
                    voiceId: 'ch2_wan_gate_defeat_zj_01',
                    text: {
                        en: "A gate assault punishes disorder at once. Pull the men back, dress the ranks, and try again.",
                        zh: "攻门最忌乱。收兵整队，再攻一次。"
                    }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'ch2_wan_gate_defeat_lb_01',
                    text: {
                        en: "We chose the harder road. Next time, keep pressure on the gate and protect the soldiers beside it.",
                        zh: "既择险途，下次须紧逼城门，并护住门前军士。"
                    }
                }
            ]
        }
    },
    'chapter2_wan_north_road': {
        name: 'Wan - Hold the North Road',
        map: {
            biome: 'northern',
            layout: 'road',
            seed: 'chapter2_wan_north_road',
            forestDensity: 0.06,
            mountainDensity: 0.08,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 6, q: 2, type: 'hero', templateId: 'liubei' },
            { id: 'guanyu', r: 5, q: 2, type: 'hero', templateId: 'guanyu' },
            { id: 'zhangfei', r: 7, q: 2, type: 'hero', templateId: 'zhangfei' },
            { id: 'ally1', r: 5, q: 1, type: 'allied_soldier' },
            { id: 'ally2', r: 7, q: 1, type: 'allied_soldier' },
            { id: 'imperial1', r: 6, q: 1, type: 'imperial_soldier' },
            { id: 'sunzhong', r: 6, q: 8, type: 'enemy_captain', templateId: 'sunzhong', delayedIntroGroup: 'sunzhong_north_road' },
            { id: 'rebel1', r: 5, q: 8, type: 'enemy_soldier', templateId: 'rebel_archer', delayedIntroGroup: 'sunzhong_north_road' },
            { id: 'rebel2', r: 7, q: 8, type: 'enemy_soldier', delayedIntroGroup: 'sunzhong_north_road' },
            { id: 'rebel3', r: 4, q: 9, type: 'enemy_soldier', delayedIntroGroup: 'sunzhong_north_road' },
            { id: 'rebel4', r: 8, q: 9, type: 'enemy_soldier', templateId: 'rebel_archer', delayedIntroGroup: 'sunzhong_north_road' },
            { id: 'rebel5', r: 6, q: 9, type: 'enemy_soldier', delayedIntroGroup: 'sunzhong_north_road' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        introScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_north_zj_01',
                text: {
                    en: "Sun Jian is striking the wall. Xuande, hold this north road; Sun Zhong must not carry Zhao Hong's remnant away.",
                    zh: "孙坚正攻城墙。玄德，守住这条北路；不可令孙仲带赵弘余众逃去。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_north_lb_01',
                text: {
                    en: "Form across the road. Leave the rebels no passage except surrender.",
                    zh: "横列于道路之上。除降服之外，不给贼众留路。"
                }
            },
            {
                speaker: 'sunzhong',
                portraitKey: 'yellowturban',
                name: 'Sun Zhong',
                voiceId: 'ch2_wan_north_sz_01',
                text: {
                    en: "The wall is shaking. Run north before Sun Jian shuts us inside Wan!",
                    zh: "城墙将破！趁孙坚未封住宛城，向北杀出去！"
                }
            },
            {
                type: 'command',
                action: 'spawnDelayedIntroUnits',
                groupId: 'sunzhong_north_road',
                entryFrom: 'right',
                entryStride: 1,
                flip: true
            }
        ],
        postCombatScript: [
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_north_lb_02',
                text: {
                    en: "Sun Zhong's column is broken. Gather the weapons and spare those who throw them down.",
                    zh: "孙仲一队已破。收其兵器，弃械者可免。"
                }
            },
            {
                speaker: 'sunjian',
                portraitKey: 'chengyuanzhi',
                name: 'Sun Jian',
                voiceId: 'ch2_wan_north_sj_01',
                text: {
                    en: "The wall is ours, and Zhao Hong is dead. Your roadblock kept the rebels from becoming an army again.",
                    zh: "城墙已取，赵弘已死。你等守路，使贼众不能复成军势。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_north_zj_02',
                text: {
                    en: "Then Wan is settled. Zhao Hong and Sun Zhong are dead, and Nanyang's commanderies are quiet again.",
                    zh: "如此宛城已定，赵弘、孙仲皆死，南阳诸郡复平。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_north_zj_03',
                text: {
                    en: "Huangfu Song has broken Zhang Liang at Quyang, and Zhang Jue is already dead. In this region, the Yellow Turban fire is nearly spent.",
                    zh: "皇甫嵩已于曲阳破张梁，张角也早已身死。此一路黄巾之火，至此几尽。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_north_zj_04',
                text: {
                    en: "We return to Luoyang. I will report the victory and memorialize the merit of Sun Jian, Liu Bei, and all who stood here.",
                    zh: "我等班师洛阳。此捷须奏闻朝廷，孙坚、刘备以及此役有功者，也当一并表奏。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_wan_north_road' } },
            script: [
                {
                    bg: 'army_camp',
                    type: 'dialogue',
                    portraitKey: 'zhu-jun-generic',
                    name: 'Zhu Jun',
                    voiceId: 'ch2_wan_north_defeat_zj_01',
                    text: {
                        en: "Sun Zhong broke through the north road. Reform the line before his remnant gathers strength.",
                        zh: "孙仲冲破北路。趁余众未聚，立刻重整军阵。"
                    }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'ch2_wan_north_defeat_lb_01',
                    text: {
                        en: "The wall assault depends on this road staying closed. We try again at once.",
                        zh: "攻城之势，要靠此路不失。即刻再战。"
                    }
                }
            ]
        }
    },
    'chapter2_wan_final_assault': {
        name: 'Wan - Sun Jian at the Walls',
        map: {
            biome: 'northern',
            layout: 'city_gate',
            seed: 'chapter2_wan_final_assault',
            cityGateDefenderSide: 'enemy',
            forestDensity: 0.0,
            mountainDensity: 0.0,
            riverDensity: 0.0,
            houseDensity: 0.0
        },
        units: [
            { id: 'liubei', r: 7, q: 3, type: 'hero', templateId: 'liubei', cityGateSide: 'outside' },
            { id: 'guanyu', r: 7, q: 2, type: 'hero', templateId: 'guanyu', cityGateSide: 'outside' },
            { id: 'zhangfei', r: 7, q: 6, type: 'hero', templateId: 'zhangfei', cityGateSide: 'outside' },
            { id: 'ally1', r: 8, q: 3, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'ally2', r: 8, q: 5, type: 'allied_soldier', cityGateSide: 'outside' },
            { id: 'sunjian', r: 6, q: 2, type: 'commander', templateId: 'sunjian', cityGateSide: 'outside' },
            { id: 'sunjian_soldier1', r: 6, q: 1, type: 'imperial_soldier', cityGateSide: 'outside' },
            { id: 'sunjian_soldier2', r: 7, q: 1, type: 'imperial_soldier', cityGateSide: 'outside' },
            { id: 'zhujun', r: 6, q: 7, type: 'commander', templateId: 'zhujun', cityGateSide: 'outside' },
            { id: 'wan_final_ladder_left', r: 8, q: 1, type: 'siege_ladder', templateId: 'ladder', faction: 'allied', cityGateSide: 'outside' },
            { id: 'wan_final_ladder_right', r: 8, q: 7, type: 'siege_ladder', templateId: 'ladder', faction: 'allied', cityGateSide: 'outside' },
            { id: 'zhaohong', r: 2, q: 4, type: 'enemy_captain', templateId: 'zhaohong', cityGateSide: 'inside' },
            { id: 'sunzhong', r: 2, q: 5, type: 'enemy_captain', templateId: 'sunzhong', cityGateSide: 'inside' },
            { id: 'wall_rebel1', r: 1, q: 2, type: 'enemy_soldier', templateId: 'rebel_archer', cityGateSide: 'inside' },
            { id: 'wall_rebel2', r: 1, q: 6, type: 'enemy_soldier', templateId: 'rebel_archer', cityGateSide: 'inside' },
            { id: 'wall_rebel3', r: 2, q: 2, type: 'enemy_soldier', cityGateSide: 'inside' },
            { id: 'wall_rebel4', r: 2, q: 7, type: 'enemy_soldier', cityGateSide: 'inside' }
        ],
        victoryCondition: {
            type: 'defeat_all_enemies',
            mustSurvive: ['liubei', 'guanyu', 'zhangfei']
        },
        introScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_final_zj_01',
                text: {
                    en: "Xuande has chosen to join Sun Jian at the wall. My remaining troops will watch the roads; your task is to break this gate.",
                    zh: "玄德已决意同孙坚攻城。余兵守道路；你等所任，便是破此城门。"
                }
            },
            {
                speaker: 'sunjian',
                portraitKey: 'chengyuanzhi',
                name: 'Sun Jian',
                voiceId: 'ch2_wan_final_sj_01',
                text: {
                    en: "Then I will be first on the wall. Zhao Hong will learn how little his reclaimed city is worth.",
                    zh: "坚愿先登。赵弘复得宛城，也不过再失一次。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_final_lb_01',
                text: {
                    en: "Brothers, press the gate with Sun Jian. Break Zhao Hong and Sun Zhong here before the rebellion scatters again.",
                    zh: "二弟三弟，与孙将军并力攻门。就在此处破赵弘、孙仲，勿使乱势复散。"
                }
            },
            {
                speaker: 'sunzhong',
                portraitKey: 'yellowturban',
                name: 'Sun Zhong',
                voiceId: 'ch2_wan_final_sz_01',
                text: {
                    en: "Break through! Wan is lost if we cling to the stones.",
                    zh: "突围！若死守城石，宛城便真完了！"
                }
            }
        ],
        postCombatScript: [
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_final_zj_02',
                text: {
                    en: "Zhao Hong is dead, Sun Zhong has fallen, and the rebels have broken. Nanyang's commanderies are quiet again.",
                    zh: "赵弘已死，孙仲亦伏，贼众溃散。南阳诸郡复平。"
                }
            },
            {
                speaker: 'liubei',
                portraitKey: 'liu-bei',
                name: 'Liu Bei',
                voiceId: 'ch2_wan_final_lb_02',
                text: {
                    en: "Then let the surrendering men be counted and disarmed. Victory must end the killing, not feed it.",
                    zh: "请清点降众，收其兵器。胜利当止杀，不可养杀。"
                }
            },
            {
                speaker: 'sunjian',
                portraitKey: 'chengyuanzhi',
                name: 'Sun Jian',
                voiceId: 'ch2_wan_final_sj_02',
                text: {
                    en: "Well said. The wall is taken; now the officers must hold the city better than the rebels did.",
                    zh: "玄德所言甚是。城墙既取，官军更当守出法度。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_final_zj_03',
                text: {
                    en: "Huangfu Song has broken Zhang Liang at Quyang, and Zhang Jue is already dead. In this region, the Yellow Turban fire is nearly spent.",
                    zh: "皇甫嵩已于曲阳破张梁，张角也早已身死。此一路黄巾之火，至此几尽。"
                }
            },
            {
                speaker: 'zhujun',
                portraitKey: 'zhu-jun-generic',
                name: 'Zhu Jun',
                voiceId: 'ch2_wan_final_zj_04',
                text: {
                    en: "We return to Luoyang. I will report the victory and memorialize the merit of Sun Jian, Liu Bei, and all who stood here.",
                    zh: "我等班师洛阳。此捷须奏闻朝廷，孙坚、刘备以及此役有功者，也当一并表奏。"
                }
            }
        ],
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'chapter2_wan_final_assault' } },
            script: [
                {
                    bg: 'army_camp',
                    type: 'dialogue',
                    portraitKey: 'zhu-jun-generic',
                    name: 'Zhu Jun',
                    voiceId: 'ch2_wan_final_defeat_zj_01',
                    text: {
                        en: "Zhao Hong used the walls better than expected. Reform before the gate and press again with Sun Jian.",
                        zh: "赵弘凭城之势，胜于所料。重整门前之阵，与孙坚再攻。"
                    }
                },
                {
                    type: 'dialogue',
                    portraitKey: 'liu-bei',
                    name: 'Liu Bei',
                    voiceId: 'ch2_wan_final_defeat_lb_01',
                    text: {
                        en: "Sun Zhong cannot be allowed to carry the remnant away. We return to the gate at once.",
                        zh: "不可令孙仲携余党逃去。即刻回攻城门。"
                    }
                }
            ]
        }
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
            { id: 'rider2', r: 6, q: 8, type: 'caocao_force', onHorse: true, flip: true },
            { id: 'rider3', r: 5, q: 8, type: 'caocao_force', onHorse: true, horseType: 'brown', flip: true },

            // Zhang Bao and Zhang Liang survive the novel, so they retreat when routed here.
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
                            portraitKey: 'zhang-bao',
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
            { id: 'rebel1', r: 7, q: 2, type: 'enemy_soldier', templateId: 'rebel_archer' },
            { id: 'rebel2', r: 6, q: 2, type: 'enemy_soldier' },
            { id: 'rebel3', r: 5, q: 2, type: 'enemy_soldier' }
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
        nextParams: { battleId: 'caocao_yingchuan_debrief' },
        defeat: {
            retry: { scene: 'tactics', params: { battleId: 'caocao_yingchuan_intercept' } },
            script: [
                { bg: 'army_camp', type: 'dialogue', portraitKey: 'cao-cao', name: 'Cao Cao', text: { en: "The intercept failed because we let speed become disorder. Form the cavalry again and close the road properly.", zh: "截击失利，是快而无序。重整骑军，严封道路。" } },
                { type: 'dialogue', portraitKey: 'cao-ren', name: 'Cao Ren', text: { en: "Understood. The next charge will leave them no gap.", zh: "明白。下次冲阵，不留缺口。" } }
            ]
        }
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
    attacks: ['polearm_sweep']
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
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 3, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 2 },
        'rebel_archer': { name: 'Yellow Turban Archer', imgKey: 'yellowturbanarcher', hp: 3, moveRange: 3, attacks: ['arrow_shot'], faction: 'enemy', level: 2 }
    },
    'enemy_soldier_weak': {
        'rebel': { name: 'Yellow Turban', imgKey: 'yellowturban', hp: 2, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 1 },
        'rebel_archer': { name: 'Yellow Turban Archer', imgKey: 'yellowturbanarcher', hp: 2, moveRange: 3, attacks: ['arrow_shot'], faction: 'enemy', level: 1 }
    },
    'imperial_soldier': {
        'soldier': { ...SOLDIER_VARIANTS.imperial_soldier },
        'escort': { ...SOLDIER_VARIANTS.imperial_escort }
    },
    'training_dummy': {
        'dummy': {
            name: 'Training Dummy',
            imgKey: 'dummy',
            hp: 1,
            moveRange: 0,
            attacks: [],
            faction: 'enemy',
            level: 1,
            isProp: true,
            breaksToImgKey: 'dummy_broken',
            keepBrokenOnDefeat: true
        }
    },
    // Generic custom-battle soldier option.
    'soldier': {
        'soldier': { ...SOLDIER_VARIANTS.generic }
    },
    'crossbowman': {
        'crossbowman': { name: 'Crossbowman', imgKey: 'crossbowman', hp: 2, moveRange: 4, attacks: ['crossbow_bolt'], faction: 'allied' }
    },
    'enemy_captain': {
        'dengmao': { name: 'Deng Mao', imgKey: 'dengmao', hp: 4, moveRange: 3, attacks: ['generic_spear'], faction: 'enemy', level: 1 },
        'chengyuanzhi': { name: 'Cheng Yuanzhi', imgKey: 'chengyuanzhi', hp: 4, moveRange: 3, attacks: ['polearm_sweep'], faction: 'enemy', level: 2 },
        'gaosheng': { name: 'Gao Sheng', imgKey: 'dengmao', hp: 5, moveRange: 3, attacks: ['generic_spear'], faction: 'enemy', level: 2 },
        'hanzhong': { name: 'Han Zhong', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['bash'], faction: 'enemy', level: 2 },
        'zhaohong': { name: 'Zhao Hong', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['generic_spear'], faction: 'enemy', level: 2 },
        'sunzhong': { name: 'Sun Zhong', imgKey: 'dengmao', hp: 4, moveRange: 4, attacks: ['bash'], faction: 'enemy', level: 2 },
        'zhang_jue_captain': { name: 'Yellow Turban Captain', imgKey: 'bandit2', hp: 5, moveRange: 3, attacks: ['bash'], faction: 'enemy' }
    },
    'commander': {
        'gongjing': { name: 'Gong Jing', imgKey: 'gongjing_sprite', hp: 5, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'luzhi': { name: 'Lu Zhi', imgKey: 'zhoujing', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'huangfusong': { name: 'Huangfu Song', imgKey: 'huangfusong_sprite', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'zhujun': { name: 'Zhu Jun', imgKey: 'zhujun_sprite', hp: 6, moveRange: 3, attacks: ['slash'], faction: 'allied' },
        'zhujun_observer': { name: 'Zhu Jun', imgKey: 'zhujun_sprite', hp: 6, moveRange: 0, attacks: [], faction: 'player' },
        'sunjian': { name: 'Sun Jian', imgKey: 'sunjian', hp: 6, moveRange: 4, attacks: ['slash'], faction: 'allied', level: 2 },
        'yanzheng': { name: 'Yan Zheng', imgKey: 'yellowturban', hp: 3, moveRange: 0, attacks: ['slash'], faction: 'allied' }
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
            attacks: ['caoren_spear', 'shield_bash'],
            faction: 'player',
            shieldResistBase: 0.2,
            shieldResistPerLevel: 0.05
        },
        'rider': { name: 'Cavalry', imgKey: 'soldier', hp: 4, moveRange: 4, attacks: ['polearm_sweep'], faction: 'allied', templateId: 'soldier' }
    },
    'zhang_jue': {
        'zhangjue': { name: 'Zhang Jue', imgKey: 'zhangjiao', hp: 8, moveRange: 4, attacks: ['bash_3'], faction: 'enemy' }
    },
    'zhang_bao': {
        'zhangbao': { name: 'Zhang Bao', imgKey: 'zhangbao', hp: 7, moveRange: 4, attacks: ['slash'], faction: 'enemy' },
        'zhangbao_wounded': { name: 'Zhang Bao', imgKey: 'zhangbao', hp: 1, moveRange: 0, attacks: [], faction: 'enemy', staticCorpseImgKey: 'zhangbao_headless_body' }
    },
    'zhang_liang': {
        'zhangliang': { name: 'Zhang Liang', imgKey: 'zhangliang', hp: 7, moveRange: 4, attacks: ['blade_sweep_2'], faction: 'enemy' }
    },
    'prop': {
        'boulder': { name: 'Boulder', imgKey: 'boulder', hp: 2, moveRange: 0, attacks: [], faction: 'neutral' }
    },
    'siege_ladder': {
        'ladder': {
            name: 'Siege Ladder',
            imgKey: 'siege_ladder',
            hp: 4,
            moveRange: 2,
            attacks: [],
            faction: 'allied',
            isProp: true,
            isSiegeLadder: true,
            crackedImgKey: 'siege_ladder_cracked',
            destroyedImgKey: 'siege_ladder_destroyed',
            ladderCombatLevel: 3
        }
    }
};

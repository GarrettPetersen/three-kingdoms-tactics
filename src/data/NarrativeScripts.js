const CH2_FREED_LU_ZHI = {
    any: [
        { choice: 'luzhi_outcome', value: 'freed', routeId: 'liubei' },
        { milestone: 'freed_luzhi', routeId: 'liubei' },
        { milestone: 'freed_luzhi' }
    ]
};

const CH2_ATTACKED_DONG_ZHUO = {
    any: [
        { choice: 'chapter2_oath_dongzhuo_choice', value: 'strike', routeId: 'chapter2_oath' },
        { milestone: 'chapter2_oath_dongzhuo_fought', routeId: 'chapter2_oath' },
        { milestone: 'chapter2_oath_dongzhuo_fought' }
    ]
};

const CH2_NO_POLITICAL_CRIMES = {
    all: [
        { not: CH2_FREED_LU_ZHI },
        { not: CH2_ATTACKED_DONG_ZHUO }
    ]
};

const CH2_FREED_ONLY = {
    all: [
        CH2_FREED_LU_ZHI,
        { not: CH2_ATTACKED_DONG_ZHUO }
    ]
};

const CH2_ATTACKED_ONLY = {
    all: [
        { not: CH2_FREED_LU_ZHI },
        CH2_ATTACKED_DONG_ZHUO
    ]
};

const CH2_ONE_POLITICAL_CRIME = {
    any: [
        CH2_FREED_ONLY,
        CH2_ATTACKED_ONLY
    ]
};

const CH2_BOTH_POLITICAL_CRIMES = {
    all: [
        CH2_FREED_LU_ZHI,
        CH2_ATTACKED_DONG_ZHUO
    ]
};

const HEJIN_CAO_CAO_HEEDED = { choice: 'hejin_cao_cao_trust', value: 'heeded', routeId: 'hejin' };
const HEJIN_CAO_CAO_DISMISSED = { choice: 'hejin_cao_cao_trust', value: 'dismissed', routeId: 'hejin' };
const HEJIN_ENTRY_DISCIPLINED = { choice: 'hejin_palace_entry_tone', value: 'disciplined', routeId: 'hejin' };
const HEJIN_ENTRY_SHOW_FORCE = { choice: 'hejin_palace_entry_tone', value: 'show_force', routeId: 'hejin' };

export const NARRATIVE_SCRIPTS = {
    'intro_poem': [
        { bg: 'peach_garden', type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'wait', duration: 1000 },
        {
            type: 'narrator',
            text: {
                en: "The world under heaven, long divided, must unite; long united, must divide.",
                zh: "话说天下大势，分久必合，合久必分。"
            },
            voiceId: 'intro_narrator_01'
        },
        {
            type: 'narrator',
            text: {
                en: "Four hundred years ago, the Han dynasty rose from the ashes of the Qin.",
                zh: "周末七国分争，并入于秦。及秦灭之后，楚、汉分争，又并入于汉。"
            },
            voiceId: 'intro_narrator_02a'
        },
        {
            type: 'narrator',
            text: {
                en: "From Gaozu's founding to Guangwu's restoration, the empire stood strong.",
                zh: "汉朝自高祖斩白蛇而起义，一统天下。后来光武中兴，传至献帝，遂分为三国。"
            },
            voiceId: 'intro_narrator_02b'
        },
        {
            type: 'narrator',
            text: {
                en: "But now, in the reign of Emperor Ling, the Han crumbles from within.",
                zh: "推其致乱之由，殆始于桓、灵二帝。"
            },
            voiceId: 'intro_narrator_02c'
        },
        { type: 'command', action: 'addActor', id: 'eunuch1', imgKey: 'priest', x: 40, y: 120 },
        { type: 'command', action: 'addActor', id: 'eunuch2', imgKey: 'priest', x: 80, y: 120 },
        { type: 'command', action: 'addActor', id: 'eunuch3', imgKey: 'priest', x: 120, y: 120 },
        { type: 'command', action: 'addActor', id: 'eunuch4', imgKey: 'priest', x: 160, y: 120 },
        { type: 'command', action: 'addActor', id: 'eunuch5', imgKey: 'priest', x: 200, y: 120 },
        { type: 'command', action: 'addActor', id: 'eunuch6', imgKey: 'priest', x: 40, y: 160 },
        { type: 'command', action: 'addActor', id: 'eunuch7', imgKey: 'priest', x: 80, y: 160 },
        { type: 'command', action: 'addActor', id: 'eunuch8', imgKey: 'priest', x: 120, y: 160 },
        { type: 'command', action: 'addActor', id: 'eunuch9', imgKey: 'priest', x: 160, y: 160 },
        { type: 'command', action: 'addActor', id: 'eunuch10', imgKey: 'priest', x: 200, y: 160 },
        {
            type: 'narrator',
            text: {
                en: "The Ten Regular Attendants—eunuchs who have wormed their way into the emperor's favor—corrupt the court.",
                zh: "桓帝禁锢善类，崇信宦官。及桓帝崩，灵帝即位，大将军窦武、太傅陈蕃，共相辅佐。"
            },
            voiceId: 'intro_narrator_03a'
        },
        {
            type: 'narrator',
            text: {
                en: "They silence honest ministers, plunder the treasury, and rule through fear.",
                zh: "时有宦官曹节等弄权，窦武、陈蕃谋诛之，作事不密，反为所害。"
            },
            voiceId: 'intro_narrator_03b'
        },
        {
            type: 'narrator',
            text: {
                en: "The people suffer while the palace grows fat.",
                zh: "中涓自此愈横。"
            },
            voiceId: 'intro_narrator_03c'
        },
        { type: 'command', action: 'removeActor', id: 'eunuch1' },
        { type: 'command', action: 'removeActor', id: 'eunuch2' },
        { type: 'command', action: 'removeActor', id: 'eunuch3' },
        { type: 'command', action: 'removeActor', id: 'eunuch4' },
        { type: 'command', action: 'removeActor', id: 'eunuch5' },
        { type: 'command', action: 'removeActor', id: 'eunuch6' },
        { type: 'command', action: 'removeActor', id: 'eunuch7' },
        { type: 'command', action: 'removeActor', id: 'eunuch8' },
        { type: 'command', action: 'removeActor', id: 'eunuch9' },
        { type: 'command', action: 'removeActor', id: 'eunuch10' },
        {
            type: 'narrator',
            text: {
                en: "In this chaos, the three Zhang brothers of Julu Commandery see their chance.",
                zh: "在这乱世之中，巨鹿郡张氏三兄弟窥见了机会。"
            },
            voiceId: 'intro_narrator_04a'
        },
        { type: 'command', action: 'addActor', id: 'zhangjue', imgKey: 'zhangjiao', x: 100, y: 140 },
        { type: 'command', action: 'wait', duration: 300 },
        { type: 'command', action: 'addActor', id: 'zhangbao', imgKey: 'zhangbao', x: 120, y: 140 },
        { type: 'command', action: 'wait', duration: 300 },
        { type: 'command', action: 'addActor', id: 'zhangliang', imgKey: 'zhangliang', x: 140, y: 140 },
        {
            type: 'narrator',
            text: {
                en: "Zhang Jue, a failed scholar, claims to have received divine teachings.",
                zh: "时巨鹿郡有兄弟三人：张角，本是个不第秀才，因入山采药，遇一老人，授以天书三卷。"
            },
            voiceId: 'intro_narrator_04b'
        },
        {
            type: 'narrator',
            text: {
                en: "He heals the sick, gathers followers, and whispers: 'The Blue Heaven is dead. The Yellow Heaven shall rise.'",
                zh: "角得此书，能呼风唤雨，号为太平道人。中平元年正月内，疫气流行，张角散施符水，为人治病，自称大贤良师。角有徒弟五百余人，云游四方，皆能书符念咒。次后徒众日多，角乃立三十六方，大方万余人，小方六七千，各立渠帅，称为将军。讹言：'苍天已死，黄天当立；岁在甲子，天下大吉。'"
            },
            voiceId: 'intro_narrator_04c'
        },
        { type: 'command', action: 'removeActor', id: 'zhangjue' },
        { type: 'command', action: 'removeActor', id: 'zhangbao' },
        { type: 'command', action: 'removeActor', id: 'zhangliang' },
        {
            type: 'narrator',
            text: {
                en: "With half a million followers bound in yellow scarves, the Zhang brothers prepare to strike.",
                zh: "四方百姓，裹黄巾从张角反者四五十万。"
            },
            voiceId: 'intro_narrator_05a'
        },
        {
            type: 'narrator',
            text: {
                en: "The rebellion begins.",
                zh: "黄巾之乱，由此而起。"
            },
            voiceId: 'intro_narrator_05b'
        },
        {
            type: 'narrator',
            text: {
                en: "The age of the Han draws to its end.",
                zh: "汉室将倾，天下大乱。"
            },
            voiceId: 'intro_narrator_05c'
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'magistrate_briefing': [
        { type: 'title', text: { en: "THE VOLUNTEER ARMY", zh: "志愿军" }, subtext: { en: "Zhuo County Headquarters", zh: "涿县总部" }, duration: 3000 },
        { bg: 'army_camp', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 150, flip: true },
        { type: 'command', action: 'addActor', id: 'guard1', imgKey: 'soldier', x: 160, y: 140, flip: true },
        { type: 'command', action: 'addActor', id: 'guard2', imgKey: 'soldier', x: 200, y: 140, flip: true },
        { type: 'command', action: 'addActor', id: 'soldier3', imgKey: 'soldier', x: 20, y: 150, speed: 0.2 },
        { type: 'command', action: 'addActor', id: 'soldier4', imgKey: 'soldier', x: 230, y: 145, flip: true, speed: 0.1 },
        { type: 'command', action: 'addActor', id: 'merchant', imgKey: 'merchant', x: 30, y: 160, speed: 0.3 },
        { type: 'command', action: 'addActor', id: 'blacksmith', imgKey: 'blacksmith', x: 230, y: 180, flip: true, speed: 0.2 },
        { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: 40, y: 190, speed: 0.5 },
        { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 210, y: 200, flip: true, speed: 0.4 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 240, speed: 1 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -80, y: 250, speed: 1 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -120, y: 255, speed: 1 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'move', id: 'liubei', x: 100, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 65, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 135, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'soldier3', x: 10, y: 155, wait: false },
        { type: 'command', action: 'move', id: 'soldier4', x: 245, y: 140, wait: false },
        { type: 'command', action: 'move', id: 'merchant', x: 20, y: 165, wait: false },
        { type: 'command', action: 'move', id: 'blacksmith', x: 240, y: 175 },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhou Jing',
            position: 'top',
            voiceId: 'daxing_zj_01',
            text: {
                en: "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits.",
                zh: "来者何人？你身后的这些人...有虎将之相。你们不像是普通的新兵。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            voiceId: 'daxing_lb_01',
            text: {
                en: "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei.",
                zh: "我是刘备，中山靖王之后，汉景帝玄孙。这两位是我的结义兄弟，关羽和张飞。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            voiceId: 'daxing_lb_02',
            text: {
                en: "We have raised a force of five hundred volunteers to serve our country and protect the people.",
                zh: "我们已招募了五百名志愿军，为国效力，保护百姓。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "For justice.", zh: "为正义" },
                    text: {
                        en: "The people cry out for justice. We cannot stand idle.",
                        zh: "百姓呼唤正义。我们不能袖手旁观。"
                    },
                    voiceId: 'daxing_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_02',
                            text: {
                                en: "An Imperial kinsman with a true heart! Truly, the Heavens have not abandoned the Han. Your arrival is most timely.",
                                zh: "真正的皇室宗亲！天不弃汉，你们的到来正是时候。"
                            }
                        }
                    ]
                },
                { 
                    buttonText: { en: "For glory.", zh: "为荣耀" },
                    text: {
                        en: "We seek glory in service to the Han.",
                        zh: "我们为汉朝效力，追求荣耀。"
                    },
                    voiceId: 'daxing_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_02_alt',
                            text: {
                                en: "An Imperial kinsman! Your ambition serves the Han well. Your arrival is most timely.",
                                zh: "皇室宗亲！你的雄心壮志对汉朝有益。你们的到来正是时候。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhou Jing',
            position: 'top',
            voiceId: 'daxing_zj_03',
            text: {
                en: "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans.",
                zh: "探子来报，叛将程远志正率五万黄巾军向我们进发。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            position: 'top',
            voiceId: 'daxing_zf_01',
            text: {
                en: "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!",
                zh: "五万？哈！不过是一群蚂蚁！县令，给我们命令，我们定将他们打得落花流水！"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            position: 'top',
            voiceId: 'daxing_gy_01',
            text: {
                en: "Third brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march.",
                zh: "三弟说得对。我们已发誓要消灭这些叛徒，恢复和平。我们已准备好出征。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "To Daxing District.", zh: "赴大兴" },
                    text: {
                        en: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion.",
                        zh: "邹县令，我们只求为国效力。请带我们到大兴县，让我们结束这场叛乱。"
                    },
                    voiceId: 'daxing_lb_03',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_04',
                            text: {
                                en: "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!",
                                zh: "很好！我将亲自率领主力。我们一同直捣程远志军的心脏！"
                            }
                        }
                    ]
                },
                { 
                    buttonText: { en: "We can handle them!", zh: "我们能打" },
                    text: {
                        en: "Fifty thousand rebels? We three alone could handle them!",
                        zh: "五万叛军？我们三人足以对付！"
                    },
                    voiceId: 'daxing_lb_choice_03',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'daxing_gy_choice_01',
                            text: {
                                en: "Brother, your courage is admirable, but even heroes need strategy. Let us work with the magistrate.",
                                zh: "兄长，你的勇气可嘉，但英雄也需要策略。让我们与县令合作。"
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_04_alt',
                            text: {
                                en: "Your confidence is inspiring! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!",
                                zh: "你的信心令人鼓舞！我将亲自率领主力。我们一同直捣程远志军的心脏！"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'interactive',
            promptOptions: [
                { id: 'to_map', text: { en: 'TO DAXING', zh: '前往大兴' }, position: 'left', y: 72, advanceOnClick: true }
            ],
            clickableActors: {
                'zhoujing': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_int_zj_01',
                            speaker: 'zhoujing',
                            text: {
                                en: "The rebels rally under yellow banners and false promises. We must break their momentum before fear spreads.",
                                zh: "贼军以黄旗惑众，趁乱煽动民心。必须尽快挫其锋芒，免得人心再乱。"
                            }
                        }
                    ]
                },
                'guard1': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v1',
                            name: 'Guard',
                            position: 'top',
                            voiceId: 'daxing_int_guard1_push_01',
                            speaker: 'soldier',
                            text: {
                                en: "Some attacks can push enemies, redirecting their blows away from allied soldiers.",
                                zh: "有些招式能击退敌人，把他们的攻击方向推离友军。"
                            }
                        }
                    ]
                },
                'guard2': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v2',
                            name: 'Guard',
                            position: 'top',
                            voiceId: 'daxing_int_guard2_push_01',
                            speaker: 'soldier',
                            text: {
                                en: "Pushing an enemy off a cliff deals extra damage. Height can turn one strike into a rout.",
                                zh: "把敌人击下山崖会造成额外伤害。高低之势，足以让一击变成溃败。"
                            }
                        }
                    ]
                },
                'soldier3': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v3',
                            name: 'Soldier',
                            position: 'top',
                            voiceId: 'daxing_int_soldier3_push_01',
                            speaker: 'soldier',
                            text: {
                                en: "If you push enemies into deep water, they drown. Watch the riverbanks when you choose your target.",
                                zh: "若把敌人推进深水，他们会溺亡。选目标时，要留意河岸。"
                            }
                        }
                    ]
                },
                'soldier4': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v4',
                            name: 'Soldier',
                            position: 'top',
                            voiceId: 'daxing_int_soldier4_01',
                            speaker: 'soldier',
                            text: {
                                en: "After Cheng Yuanzhi, more rebel captains will come. We have to win this first clash cleanly.",
                                zh: "程远志之后，必有更多贼将来犯。这一战必须打得干净利落。"
                            }
                        }
                    ]
                },
                'merchant': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'merchant',
                            name: 'Merchant',
                            position: 'top',
                            voiceId: 'daxing_int_merchant_01',
                            speaker: 'farmer',
                            text: {
                                en: "Roads to the east are half-blocked by refugees. If you march, march fast before supply lines choke.",
                                zh: "东面道路已被流民堵了大半。若要出兵，须速行，免得粮道先断。"
                            }
                        }
                    ]
                },
                'blacksmith': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'blacksmith',
                            name: 'Blacksmith',
                            position: 'top',
                            voiceId: 'daxing_int_blacksmith_01',
                            speaker: 'farmer',
                            text: {
                                en: "I reforged farm iron into spearheads all night. The county's fate now hangs on your vanguard.",
                                zh: "我连夜把农具熔成枪头。全县安危，如今都系在你们先锋身上。"
                            }
                        }
                    ]
                },
                'volunteer1': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v5',
                            name: 'Volunteer',
                            position: 'top',
                            voiceId: 'daxing_int_volunteer1_01',
                            speaker: 'volunteer',
                            text: {
                                en: "I was a field hand yesterday. Today I carry a blade. If we fail, our families have nowhere to run.",
                                zh: "我昨日还在田里，今日已执兵刃。此战若败，家人便无处可逃。"
                            }
                        }
                    ]
                },
                'volunteer2': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier-v1',
                            name: 'Volunteer',
                            position: 'top',
                            voiceId: 'daxing_int_volunteer2_01',
                            speaker: 'volunteer',
                            text: {
                                en: "People say the Zhang brothers can call wind and rain. I do not know about that—but I know we cannot yield.",
                                zh: "民间都说张氏兄弟能呼风唤雨。我不知真假，只知此时绝不能退。"
                            }
                        }
                    ]
                },
                'liubei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'daxing_int_lb_01',
                            speaker: 'liubei',
                            text: {
                                en: "To shield the people is our vow. Brothers, we fight not for fame, but to end this terror.",
                                zh: "护民安众，正是我等所誓。兄弟们，此战不为功名，只为止乱。"
                            }
                        }
                    ]
                },
                'guanyu': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'daxing_int_gy_01',
                            speaker: 'guanyu',
                            text: {
                                en: "When the line wavers, hold your ground. Discipline cuts deeper than any blade.",
                                zh: "阵脚一乱，必生溃败。守住军纪，胜过万般锋刃。"
                            }
                        }
                    ]
                },
                'zhangfei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'daxing_int_zf_01',
                            speaker: 'zhangfei',
                            text: {
                                en: "Ha! Let Cheng Yuanzhi come. I have been waiting to test this spear on real rebels.",
                                zh: "哈！程远志尽管来。我这杆蛇矛，正等着拿真贼开锋。"
                            }
                        }
                    ]
                }
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001         }
    ],
    'daxing_messenger': [
        { bg: 'army_camp', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'xiaoer', x: 230, y: 180, flip: true, speed: 2 },
        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 160, flip: true },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 60, y: 200 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 20, y: 210 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 100, y: 210 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'move', id: 'messenger', x: 140, y: 180 },
        {
            type: 'dialogue',
            speaker: 'volunteer',
            portraitKey: 'xiaoer',
            name: 'Messenger',
            position: 'top',
            voiceId: 'qz_ms_01',
            text: {
                en: "URGENT! Imperial Protector Gong Jing of Qingzhou Region is under siege! The city is near falling!",
                zh: "紧急！青州太守龚景被围困！城池即将陷落！"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "Ride at once.", zh: "即刻驰援" },
                    text: {
                        en: "We ride at once. If Qingzhou is near falling, every moment we spend talking costs lives.",
                        zh: "即刻驰援。青州若已危急，多说一刻，百姓便多死一分。"
                    },
                    voiceId: 'qz_lb_ride_now_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_zf_ride_now_01',
                            text: {
                                en: "Good! Words will not break a siege. Hooves and blades will!",
                                zh: "好！空话破不了围，马蹄和刀锋才行！"
                            }
                        }
                    ]
                },
                { 
                    buttonText: { en: "Tell us the danger.", zh: "先问险情" },
                    text: {
                        en: "We will help, but tell us the danger first. Which gate is hardest pressed, and who commands the rebels?",
                        zh: "我们必去相救，但先说明险情。哪座城门最急？贼军由谁统领？"
                    },
                    voiceId: 'qz_lb_ask_danger_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'xiaoer',
                            name: 'Messenger',
                            position: 'top',
                            voiceId: 'qz_ms_ask_danger_01',
                            text: {
                                en: "The western gate bends under their assault. Their banners name no famous general, only Yellow Turban zealots in great number.",
                                zh: "西门受攻最急。贼旗不见名将，只是黄巾狂徒众多。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhou Jing',
            position: 'top',
            voiceId: 'qz_zj_01',
            text: {
                en: "I shall reinforce you with five thousand of my best soldiers. March at once!",
                zh: "我将派五千精兵增援你们。立即出发！"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'qingzhou_victory': [
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'qz_vic_zf_01',
            position: 'top',
            text: {
                en: "Look at them run! Like rats from a sinking ship! We've broken their spirit.",
                zh: "看他们逃跑！像沉船上的老鼠！我们已经击垮了他们的士气。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'qz_vic_gy_01',
            position: 'top',
            text: {
                en: "A well-executed trap, Brother. The high ground served us well.",
                zh: "一个精心设计的陷阱，兄长。高地为我们提供了优势。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "Secure the city.", zh: "先保城池" },
                    text: {
                        en: "Let us not tarry. The city is still in peril. We return to the gates and secure the people first.",
                        zh: "不可耽搁。城池仍在危急之中。先回城门，保住百姓。"
                    },
                    voiceId: 'qz_vic_lb_secure_city_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'qingzhou_after_pass',
                            value: 'secure_city'
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'qz_vic_gy_secure_city_01',
                            text: {
                                en: "A sound judgment. Victory in the pass means little if the city falls behind us.",
                                zh: "兄长所断甚当。若身后城池失守，此处得胜也无意义。"
                            }
                        }
                    ]
                },
                { 
                    buttonText: { en: "Pursue them.", zh: "追击残敌" },
                    text: {
                        en: "If we pursue now, perhaps we can scatter them completely before they rally.",
                        zh: "若此刻追击，或可在贼众重整之前将其彻底击散。"
                    },
                    voiceId: 'qz_vic_lb_pursue_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'qingzhou_after_pass',
                            value: 'pursued_rebels'
                        },
                        {
                            type: 'dialogue',
                            bg: 'valley_aerial_shot',
                            bgPaletteShift: 'sunset',
                            bgPaletteStart: 0,
                            bgPaletteEnd: 0.22,
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_vic_zf_pursue_01',
                            text: {
                                en: "Ha! That is the fire I like. Give me one charge and I will send them running until sunset!",
                                zh: "哈哈！这才痛快！给我冲一阵，我让他们逃到日落也不敢回头！"
                            }
                        },
                        {
                            type: 'dialogue',
                            bg: 'valley_aerial_shot',
                            bgPaletteShift: 'sunset',
                            bgPaletteStart: 0.22,
                            bgPaletteEnd: 0.58,
                            portraitKey: 'narrator',
                            voiceId: 'qz_vic_nar_pursue_01',
                            text: {
                                en: "The brothers hunted the broken rebels through the pass, scattering those who tried to rally and driving the rest into the hills.",
                                zh: "三兄弟沿关道追击溃贼，击散试图重整的残部，将其余人马赶入山中。"
                            }
                        },
                        {
                            type: 'dialogue',
                            bg: 'valley_aerial_shot',
                            bgPaletteShift: 'sunset',
                            bgPaletteStart: 0.58,
                            bgPaletteEnd: 0.82,
                            portraitKey: 'liu-bei',
                            name: 'Liu Bei',
                            position: 'top',
                            voiceId: 'qz_vic_lb_return_after_pursuit_01',
                            text: {
                                en: "Enough. They will not trouble Qingzhou tonight. Now back to the city before the gates ask why we delayed.",
                                zh: "够了。今夜他们再不能扰青州。现在回城，莫让城门前的人问我们为何迟来。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            bg: 'valley_aerial_shot',
            bgPaletteShift: 'sunset',
            bgPaletteStart: 0.82,
            bgPaletteEnd: 1,
            portraitKey: 'narrator',
            voiceId: 'qz_vic_nar_01',
            text: {
                en: "Though fierce as tigers soldiers be, Battles are won by strategy.\nA hero comes; he gains renown, Already destined for a crown.",
                zh: "運籌決算有神功，二虎還須遜一龍。初出便能垂偉績，自應分鼎在孤窮。"
            }
        }
    ],
    'qingzhou_gate_return': [
        {
            type: 'dialogue',
            portraitKey: 'gong-jing',
            name: 'Protector Gong Jing',
            voiceId: 'qz_ret_gj_01',
            position: 'top',
            text: {
                en: "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered.",
                zh: "英勇的兄弟们！你们救了青州！当你们的信号响彻关隘，我们从城门冲出。叛军被我们夹击，尽数歼灭。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "Peace restored.", zh: "平定此地" },
                    text: {
                        en: "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere.",
                        zh: "能为州牧效力，我们深感荣幸。此地已恢复和平，但叛乱仍在其他地方肆虐。"
                    },
                    voiceId: 'qz_ret_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: { en: "An honor.", zh: "不胜荣幸" },
                    text: {
                        en: "It was an honor to serve. The people of Qingzhou can rest easy now.",
                        zh: "能为您效力是我们的荣幸。青州百姓现在可以安心了。"
                    },
                    voiceId: 'qz_ret_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'gong-jing',
                            name: 'Protector Gong Jing',
                            position: 'top',
                            voiceId: 'qz_ret_gj_choice_01',
                            text: {
                                en: "Your humility does you credit, but your deeds speak louder than words.",
                                zh: "你的谦逊值得称赞，但你的行为比言语更有力。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'gong-jing',
            name: 'Protector Gong Jing',
            voiceId: 'qz_ret_gj_02',
            position: 'top',
            text: {
                en: "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
                zh: "确实。我听说卢植将军在广宗被叛军首领张角本人围攻，处境艰难。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "My teacher.", zh: "卢植是师" },
                    text: {
                        en: "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!",
                        zh: "卢植！他是我多年前的老师。我不能让他独自面对如此大军。兄弟们，我们向广宗进军！"
                    },
                    voiceId: 'qz_ret_lb_02',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: { en: "We must help.", zh: "必须援卢" },
                    text: {
                        en: "Commander Lu Zhi needs aid. We cannot abandon a loyal servant of the Han.",
                        zh: "卢植中郎将需要援助。我们不能抛弃汉朝的忠臣。"
                    },
                    voiceId: 'qz_ret_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'qz_ret_gy_choice_01',
                            text: {
                                en: "A noble cause, brother. We stand with you.",
                                zh: "高尚的事业，兄长。我们与你同在。"
                            }
                        }
                    ]
                }
            ]
        }
    ],
    'noticeboard': [
        { 
            type: 'title',
            text: {
                en: "ZHUO COUNTY",
                zh: "涿县"
            },
            subtext: {
                en: "Year 184",
                zh: "公元184年"
            }
        },
        { type: 'command', action: 'fade', target: 0, speed: 0.002 },
        { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 200, speed: 0.5 },
        { type: 'command', action: 'addActor', id: 'farmer2', imgKey: 'farmer2', x: 50, y: 185, flip: true, speed: 0.4 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -50, y: 210, speed: 1 },
        { bg: 'noticeboard', type: 'command', action: 'move', id: 'liubei', x: 100, y: 210 },
        { type: 'command', action: 'flip', id: 'liubei', flip: true },
        { type: 'command', action: 'move', id: 'farmer', x: 220, y: 195 },
        { type: 'command', action: 'move', id: 'farmer2', x: 20, y: 180 },
        
        // Make noticeboard and NPCs clickable and enter interactive mode
        { type: 'interactive', 
          clickableRegions: {
            'noticeboard': {
                // Actual noticeboard position from image: x: 80, y: 111 to x: 176, y: 177
                x: 80,
                y: 111,
                w: 96,
                h: 66,
                advanceOnClick: true, // This click advances the plot
                onClick: [
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_01',
                        text: {
                            en: "NOTICE: The Yellow Turban rebels under Zhang Jue have risen!",
                            zh: "告示：张角领导的黄巾军已起事！"
                        }
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_02',
                        text: {
                            en: "All able-bodied men are called to defend the Han.",
                            zh: "所有壮丁都被征召保卫汉朝。"
                        }
                    },
                    {
                        type: 'dialogue',
                        name: 'The Noticeboard',
                        position: 'top',
                        portraitKey: 'noticeboard',
                        portraitRect: { x: 80, y: 100, w: 90, h: 70 },
                        voiceId: 'pro_nb_03',
                        text: {
                            en: "Report to the local Magistrate at once.",
                            zh: "立即向当地县令报到。"
                        }
                    },
                ]
            }
          },
          clickableActors: {
            'farmer': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'farmer-v1',
                        position: 'top',
                        name: 'Villager',
                        voiceId: 'pro_farmer_01',
                        text: {
                            en: "The Yellow Turbans... they say they'll burn everything in their path. My family has lived here for generations. What will become of us?",
                            zh: "黄巾军...听说他们会烧毁一切。我家世代住在这里。我们该怎么办？"
                        }
                    }
                ]
            },
            'farmer2': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'farmer-female',
                        position: 'top',
                        name: 'Villager',
                        voiceId: 'pro_farmer2_01',
                        text: {
                            en: "I've heard the rebels are already in the next county. They show no mercy to those who resist. We must prepare for the worst.",
                            zh: "我听说叛军已经到了邻县。他们对抵抗者毫不留情。我们必须做最坏的打算。"
                        }
                    }
                ]
            }
          }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_01',
            text: {
                en: "The Imperial Clan's blood flows in my veins...",
                zh: "我体内流淌着皇族的血液..."
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_02',
            text: {
                en: "...yet I am but a poor straw-shoe seller.",
                zh: "...但我只是一个卖草鞋的穷人。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_03',
            text: {
                en: "How can I possibly save the people from this chaos?",
                zh: "我如何才能拯救百姓于这乱世？"
            }
        },
        
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 300, y: 240, flip: true, speed: 1.5 },
        { type: 'command', action: 'move', id: 'zhangfei', x: 190, y: 240 },
        
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: '???',
            voiceId: 'pro_zf_01',
            text: {
                en: "Why sigh, O hero, if you do not help your country?",
                zh: "大丈夫不与国家出力，何故长叹？"
            }
        },
        { type: 'command', action: 'flip', id: 'liubei', flip: false },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "For the people.", zh: "为百姓" },
                    text: {
                        en: "I sigh for the suffering people.",
                        zh: "我叹百姓受苦。"
                    },
                    voiceId: 'pro_lb_choice_01',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: '???',
                            voiceId: 'pro_zf_02',
                            text: {
                                en: "A true hero's heart! You and I are of one mind.",
                                zh: "真英雄之心！你我志同道合。"
                            }
                        }
                    ]
                },
                { 
                    buttonText: { en: "For my status.", zh: "为名位" },
                    text: {
                        en: "I sigh for my own lost status.",
                        zh: "我叹自己失去的地位。"
                    },
                    voiceId: 'pro_lb_choice_02',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: '???',
                            voiceId: 'pro_zf_03',
                            text: {
                                en: "Status? Bah! In these times of chaos, only courage and wine matter!",
                                zh: "地位？呸！在这乱世，只有勇气和美酒才重要！"
                            }
                        }
                    ]
                }
            ]
        },

        { type: 'command', action: 'flip', id: 'liubei', flip: false },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
        
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_04',
            text: {
                en: "I am Zhang Fei, aka Yide.",
                zh: "我姓张名飞，字翼德。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_05',
            text: {
                en: "I live in this county, where I have a farm. I sell wine and slaughter hogs.",
                zh: "世居涿郡，颇有庄田，卖酒屠猪。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_04',
            text: {
                en: "I am of the Imperial Clan. My name is Liu Bei.",
                zh: "我本汉室宗亲。姓刘名备。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_05',
            text: {
                en: "I wish I could destroy these rebels and restore peace...",
                zh: "我愿消灭这些叛军，恢复和平..."
            }
        },
        {
            type: 'command',
            action: 'move', id: 'farmer', x: 250, y: 220 },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_06',
            text: {
                en: "I have some wealth! I am willing to use it to recruit volunteers.",
                zh: "我颇有资财，当招募乡勇，与公同举大事，如何？"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_07',
            text: {
                en: "What say you to that?",
                zh: "你意下如何？"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_06',
            text: {
                en: "That would be a great blessing for the people!",
                zh: "那将是百姓的福气！"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_08',
            text: {
                en: "Then come! Let us go to the village inn and discuss our plans over wine.",
                zh: "那好！我们去村中酒店，边喝酒边商议大事。"
            }
        },
        {
            type: 'interactive',
            promptOptions: [
                { id: 'to_inn', text: { en: 'TO INN', zh: '前往酒店' }, position: 'left', advanceOnClick: true }
            ],
            clickableActors: {
                'farmer': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'farmer-v1',
                            position: 'top',
                            name: 'Villager',
                            voiceId: 'pro_farmer_01',
                            text: {
                                en: "The Yellow Turbans... they say they'll burn everything in their path. My family has lived here for generations. What will become of us?",
                                zh: "黄巾军...听说他们会烧毁一切。我家世代住在这里。我们该怎么办？"
                            }
                        }
                    ]
                },
                'farmer2': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'farmer-female',
                            position: 'top',
                            name: 'Villager',
                            voiceId: 'pro_farmer2_01',
                            text: {
                                en: "I've heard the rebels are already in the next county. They show no mercy to those who resist. We must prepare for the worst.",
                                zh: "我听说叛军已经到了邻县。他们对抵抗者毫不留情。我们必须做最坏的打算。"
                            }
                        }
                    ]
                },
                'liubei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            position: 'top',
                            name: 'Liu Bei',
                            voiceId: 'pro_lb_noticeboard_wait_01',
                            text: {
                                en: "If we can gather men of courage, perhaps this county need not face the rebels alone.",
                                zh: "若能聚起有胆气之士，涿县或许不必独自面对贼军。"
                            }
                        }
                    ]
                },
                'zhangfei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: 'Zhang Fei',
                            voiceId: 'pro_zf_noticeboard_wait_01',
                            text: {
                                en: "Come, Xuande! Wine first, then we find the men to break these rebels.",
                                zh: "走吧，玄德！先饮酒，再招人，把这些贼打个粉碎。"
                            }
                        }
                    ]
                }
            }
        },
        { type: 'command', action: 'flip', id: 'liubei', flip: true },
        { type: 'command', action: 'move', id: 'liubei', x: -50, y: 240, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: -50, y: 240 },
        { type: 'command', action: 'fade', target: 1, speed: 0.002 },
        
        // --- SWITCH TO INN ---
        { bg: 'inn', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 80, y: 200 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 120, y: 200, flip: true },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'recovery' },
        { type: 'command', action: 'animate', id: 'zhangfei', animation: 'recovery' },
        { type: 'command', action: 'addActor', id: 'bar_farmer', imgKey: 'farmer', x: 36, y: 194 },
        { type: 'command', action: 'animate', id: 'bar_farmer', animation: 'recovery' },
        { type: 'command', action: 'addActor', id: 'liubo_player', imgKey: 'xiaoer', x: 198, y: 158, flip: true },
        { type: 'command', action: 'animate', id: 'liubo_player', animation: 'recovery' },
        { type: 'command', action: 'addProp', id: 'liubo_table', imgKey: 'liubo_table', x: 174, y: 138, sortY: 226 },
        
        { type: 'command', action: 'fade', target: 0, speed: 0.002 },
        
        // Interactive step: players can explore the inn before Guan Yu arrives
        { type: 'interactive',
          clickableRegions: {
            'wine_casks': {
                // Wine casks on left-hand middle of screen (approximate position)
                x: 0,
                y: 125,
                w: 40,
                h: 40,
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_wine_01',
                        text: {
                            en: "The wine here is of fine quality. A good vintage for such troubled times.",
                            zh: "这里的酒品质上乘。在这乱世中，这是好酒。"
                        },
                        _isInserted: true
                    }
                ]
            }
          },
          clickableActors: {
            'bar_farmer': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'farmer-v2',
                        position: 'top',
                        name: 'Villager',
                        voiceId: 'inn_farmer_01',
                        text: {
                            en: "These Yellow Turban rebels... I try to drink away my worries, but they always return. What will become of us?",
                            zh: "这些黄巾叛军...我想借酒消愁，但忧虑总是回来。我们该怎么办？"
                        },
                        _isInserted: true
                    }
                ]
            },
            'liubo_player': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'xiaoer',
                        position: 'top',
                        name: 'Liubo Player',
                        voiceId: 'inn_liubo_intro_01',
                        text: {
                            en: "The road is dangerous, friend. Sit for a game of Liubo before you chase trouble?",
                            zh: "路上凶险，朋友。追着麻烦走之前，坐下博一局如何？"
                        },
                        _isInserted: true
                    },
                    {
                        type: 'choice',
                        portraitKey: 'xiaoer',
                        name: 'Liubo Player',
                        options: [
                            {
                                buttonText: { en: "Play Liubo.", zh: "博一局。" },
                                speaker: 'xiaoer',
                                voiceId: 'inn_liubo_accept_01',
                                text: {
                                    en: "Very well. Let us play.",
                                    zh: "好。我们博一局。"
                                },
                                result: [
                                    { type: 'command', action: 'startCampaignLiubo', activityId: 'inn_first_liubo' }
                                ]
                            },
                            {
                                buttonText: { en: "Not now.", zh: "现在不玩。" },
                                speaker: 'xiaoer',
                                voiceId: 'inn_liubo_decline_01',
                                text: {
                                    en: "Another time.",
                                    zh: "改日吧。"
                                },
                                result: [
                                    {
                                        type: 'dialogue',
                                        portraitKey: 'xiaoer',
                                        position: 'top',
                                        name: 'Liubo Player',
                                        voiceId: 'inn_liubo_decline_reply_01',
                                        text: {
                                            en: "The board will wait. The rebels, perhaps not.",
                                            zh: "棋盘会等你。黄巾贼可未必。"
                                        }
                                    }
                                ]
                            }
                        ],
                        _isInserted: true
                    }
                ]
            },
            'liubei': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_click_01',
                        text: {
                            en: "The people suffer while we sit here. We must act soon.",
                            zh: "百姓受苦，而我们却坐在这里。我们必须尽快行动。"
                        },
                        _isInserted: true
                    }
                ]
            },
            'zhangfei': {
                advanceOnClick: true, // Clicking Zhang Fei triggers the rest of the scene
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'zhang-fei',
                        position: 'top',
                        name: 'Zhang Fei',
                        voiceId: 'inn_zf_01',
                        text: {
                            en: "This wine is good! Together, we shall raise an army that will make the rebels tremble.",
                            zh: "这酒不错！我们一起组建一支让叛军颤抖的军队。"
                        }
                    },
                    {
                        type: 'dialogue',
                        portraitKey: 'liu-bei',
                        position: 'top',
                        name: 'Liu Bei',
                        voiceId: 'inn_lb_01',
                        text: {
                            en: "Indeed. Honor and duty call us.",
                            zh: "确实。荣誉和责任在召唤我们。"
                        }
                    }
                ]
            }
          }
        },
        
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 300, y: 210, flip: true, speed: 1 },
        { type: 'command', action: 'move', id: 'guanyu', x: 180, y: 210 },
        
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: '???',
            voiceId: 'inn_gy_01',
            text: {
                en: "Quick! Bring me wine! I am in a hurry to get to town and join the volunteers!",
                zh: "快！给我拿酒来！我急着进城加入志愿军！"
            }
        },
        
        { type: 'command', action: 'flip', id: 'liubei', flip: false },
        { type: 'command', action: 'flip', id: 'zhangfei', flip: false },
        { type: 'command', action: 'animate', id: 'guanyu', animation: 'standby' },

        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'inn_lb_02',
            text: {
                en: "That man... his presence is extraordinary. Look at his majestic beard and phoenix-like eyes.",
                zh: "那个人...他的气度非凡。看他那威严的胡须和凤眼。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_02',
            text: {
                en: "Hey! You there! You're joining the volunteers too? Come, drink with us!",
                zh: "喂！你！你也要加入志愿军吗？来，和我们一起喝酒！"
            }
        },
        { type: 'command', action: 'move', id: 'guanyu', x: 140, y: 195 },
        { type: 'command', action: 'animate', id: 'guanyu', animation: 'recovery' },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_02',
            text: {
                en: "I am Guan Yu, courtesy name Yunchang. For years I have been a fugitive, for I slew a local bully who oppressed the weak.",
                zh: "我是关羽，字云长。多年来我一直是逃犯，因为我杀死了一个欺压弱者的恶霸。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_03',
            text: {
                en: "Now I hear there is a call for volunteers, and I have come to join the cause.",
                zh: "现在我听说有招募志愿军的号召，所以我来加入这个事业。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: {
                        en: "A noble heart!",
                        zh: "义胆可嘉"
                    },
                    text: {
                        en: "A noble heart! I am Liu Bei, and this is Zhang Fei. We have just agreed to raise a volunteer army ourselves.",
                        zh: "高尚的心！我是刘备，这是张飞。我们刚刚决定自己组建一支志愿军。"
                    },
                    voiceId: 'inn_lb_03',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: {
                        en: "Join us.",
                        zh: "与我同袍"
                    },
                    text: {
                        en: "Your cause is just. Join us, and together we shall serve the Han.",
                        zh: "你的事业是正义的。加入我们，让我们一起为汉朝效力。"
                    },
                    voiceId: 'inn_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'inn_gy_choice_01',
                            text: {
                                en: "Your words ring true. I would be honored to join your cause.",
                                zh: "你的话很真诚。我很荣幸能加入你的事业。"
                            }
                        }
                    ]
                },
                { 
                    buttonText: {
                        en: "Do not kill unlawfully.",
                        zh: "不可私杀"
                    },
                    text: {
                        en: "Even when a man deserves punishment, private killing is not lawful. Righteous anger must still answer to the Han.",
                        zh: "即使那人该受惩处，私自杀人也不合法。义愤也必须服从汉法。"
                    },
                    voiceId: 'inn_lb_choice_unlawful_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'inn_gy_choice_unlawful_01',
                            text: {
                                en: "You speak rightly. I have lived as a fugitive for that deed. Let me seek redemption through service to the Han.",
                                zh: "你说得对。我因那一刀流亡至今。愿让我以效力汉室来赎前罪。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_03',
            text: {
                en: "Haha! The more the merrier! Drink, Yunchang! Let us toast to our new brotherhood!",
                zh: "哈哈！人越多越热闹！云长，喝酒！让我们为新结义的兄弟情干杯！"
            }
        },
        
        // --- TIME SKIP TO EVENING ---
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
        { bg: 'inn_evening', type: 'command', action: 'removeActor', id: 'farmer' },
        { type: 'command', action: 'addActor', id: 'soldier_npc', imgKey: 'soldier', x: 230, y: 190, flip: true },
        { type: 'command', action: 'addActor', id: 'butcher_npc', imgKey: 'butcher', x: 30, y: 210 },
        { type: 'command', action: 'animate', id: 'soldier_npc', animation: 'recovery' },
        { type: 'command', action: 'animate', id: 'butcher_npc', animation: 'recovery' },
        { type: 'command', action: 'wait', duration: 1000 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },

        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_04',
            text: {
                en: "...and that is why the pig escaped! Haha! But seriously, my friends...",
                zh: "...所以那头猪就跑了！哈哈！但说真的，我的朋友们..."
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_05',
            text: {
                en: "I feel as though I have known you both for a lifetime.",
                zh: "我感觉好像认识你们一辈子了。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_04',
            text: {
                en: "The heavens have surely brought us together. We share one mind and one purpose.",
                zh: "天意让我们相聚。我们志同道合。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: { en: "Restore the Han.", zh: "匡扶汉室" },
                    text: {
                        en: "To restore the Han and bring peace to the common people. That is our shared destiny.",
                        zh: "恢复汉室，给百姓带来和平。这是我们共同的使命。"
                    },
                    voiceId: 'inn_lb_04',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: { en: "For the people.", zh: "为百姓" },
                    text: {
                        en: "We fight not for glory, but for the people who suffer under this chaos.",
                        zh: "我们不为荣耀而战，而是为在这乱世中受苦的百姓。"
                    },
                    voiceId: 'inn_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'inn_gy_choice_02',
                            text: {
                                en: "Spoken like a true leader. The people need men like you.",
                                zh: "说得像真正的领袖。百姓需要像你这样的人。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_06',
            text: {
                en: "Listen! Behind my farm is a peach garden. The flowers are in full bloom.",
                zh: "听我说！我庄后有一桃园，花开正盛。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_07',
            text: {
                en: "Tomorrow, let us offer sacrifices there and swear to be brothers! To live and die as one!",
                zh: "明日当于园中祭告天地，我三人结为兄弟，协力同心，然后可图大事。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'inn_lb_05',
            text: {
                en: "An excellent proposal. We shall do it!",
                zh: "好主意。我们这就去做！"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_05',
            text: {
                en: "I agree. We swear by the peach garden.",
                zh: "我同意。我们在桃园结义。"
            }
        },
        {
            type: 'interactive',
            promptOptions: [
                { id: 'to_peach_garden', text: { en: 'TO PEACH GARDEN', zh: '前往桃园' }, position: 'right', y: 88, w: 118, h: 25, advanceOnClick: true }
            ],
            clickableActors: {
                'bar_farmer': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'farmer-v2',
                            position: 'top',
                            name: 'Villager',
                            voiceId: 'inn_farmer_01',
                            text: {
                                en: "These Yellow Turban rebels... I try to drink away my worries, but they always return. What will become of us?",
                                zh: "这些黄巾叛军...我想借酒消愁，但忧虑总是回来。我们该怎么办？"
                            }
                        }
                    ]
                },
                'liubo_player': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'xiaoer',
                            position: 'top',
                            name: 'Liubo Player',
                            voiceId: 'inn_liubo_intro_01',
                            text: {
                                en: "The road is dangerous, friend. Sit for a game of Liubo before you chase trouble?",
                                zh: "路上凶险，朋友。追着麻烦走之前，坐下博一局如何？"
                            }
                        },
                        {
                            type: 'choice',
                            portraitKey: 'xiaoer',
                            name: 'Liubo Player',
                            options: [
                                {
                                    buttonText: { en: "Play Liubo.", zh: "博一局。" },
                                    speaker: 'xiaoer',
                                    voiceId: 'inn_liubo_accept_01',
                                    text: {
                                        en: "Very well. Let us play.",
                                        zh: "好。我们博一局。"
                                    },
                                    result: [
                                        { type: 'command', action: 'startCampaignLiubo', activityId: 'inn_first_liubo' }
                                    ]
                                },
                                {
                                    buttonText: { en: "Not now.", zh: "现在不玩。" },
                                    speaker: 'xiaoer',
                                    voiceId: 'inn_liubo_decline_01',
                                    text: {
                                        en: "Another time.",
                                        zh: "改日吧。"
                                    },
                                    result: [
                                        {
                                            type: 'dialogue',
                                            portraitKey: 'xiaoer',
                                            position: 'top',
                                            name: 'Liubo Player',
                                            voiceId: 'inn_liubo_decline_reply_01',
                                            text: {
                                                en: "The board will wait. The rebels, perhaps not.",
                                                zh: "棋盘会等你。黄巾贼可未必。"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                'liubei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'liu-bei',
                            position: 'top',
                            name: 'Liu Bei',
                            voiceId: 'inn_lb_click_01',
                            text: {
                                en: "The people suffer while we sit here. We must act soon.",
                                zh: "百姓受苦，而我们却坐在这里。我们必须尽快行动。"
                            }
                        }
                    ]
                },
                'zhangfei': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: 'Zhang Fei',
                            voiceId: 'inn_zf_06',
                            text: {
                                en: "Listen! Behind my farm is a peach garden. The flowers are in full bloom.",
                                zh: "听我说！我庄后有一桃园，花开正盛。"
                            }
                        }
                    ]
                },
                'guanyu': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            position: 'top',
                            name: 'Guan Yu',
                            voiceId: 'inn_gy_05',
                            text: {
                                en: "I agree. We swear by the peach garden.",
                                zh: "我同意。我们在桃园结义。"
                            }
                        }
                    ]
                },
                'soldier_npc': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier',
                            position: 'top',
                            name: 'Volunteer',
                            voiceId: 'inn_soldier_npc_01',
                            text: {
                                en: "If you three raise the banner, men will follow. The county is waiting for someone to stand first.",
                                zh: "三位若举旗，自有人追随。涿县百姓都在等第一个挺身而出的人。"
                            }
                        }
                    ]
                },
                'butcher_npc': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'butcher',
                            position: 'top',
                            name: 'Butcher',
                            voiceId: 'inn_butcher_npc_01',
                            text: {
                                en: "Zhang Fei's wine is strong, and so is his word. If he calls this oath sacred, I believe him.",
                                zh: "张飞的酒烈，他的话也重。他说此誓为重，我信。"
                            }
                        }
                    ]
                }
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
        
        // --- THE PEACH GARDEN OATH ---
        { 
            type: 'title',
            text: {
                en: "THE PEACH GARDEN OATH",
                zh: "桃园结义"
            },
            subtext: {
                en: "The Next Morning",
                zh: "次日"
            },
            duration: 3000
        },
        { type: 'command', action: 'playMusic', key: 'oath', volume: 0.5 },
        { bg: 'peach_garden', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.002 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 128, y: 180 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 80, y: 185 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 176, y: 185, flip: true },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'sitting' },
        
        {
            type: 'narrator',
            text: {
                en: "In the peach garden, among the blooming flowers, a black ox and a white horse are sacrificed.",
                zh: "在桃园中，盛开的桃花下，宰杀黑牛白马，祭告天地。"
            },
            voiceId: 'pg_nar_01'
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_01',
            text: {
                en: "We three, Liu Bei, Guan Yu, and Zhang Fei, though of different lineages, swear brotherhood and promise mutual help to one end.",
                zh: "念刘备、关羽、张飞，虽然异姓，既结为兄弟，则同心协力，救困扶危。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'pg_gy_01',
            text: {
                en: "We will rescue each other in difficulty; we will aid each other in danger.",
                zh: "上报国家，下安黎庶。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pg_zf_01',
            text: {
                en: "We swear to serve the state and save the people.",
                zh: "上报国家，下安黎庶。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_02',
            text: {
                en: "We ask not the same day of birth, but we seek to die together on the same day.",
                zh: "不求同年同月同日生，只愿同年同月同日死。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_03',
            text: {
                en: "May the Heaven and the Earth read our hearts. If we turn aside from righteousness, may the Heaven and the Human smite us!",
                zh: "皇天后土，实鉴此心。背义忘恩，天人共戮！"
            }
        },
        {
            type: 'narrator',
            text: {
                en: "The ritual complete, Liu Bei is acknowledged as the eldest brother, Guan Yu the second, and Zhang Fei the youngest.",
                zh: "祭毕，拜刘备为兄，关羽次之，张飞为弟。"
            },
            voiceId: 'pg_nar_02'
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_04',
            text: {
                en: "The path ahead is long and full of peril, but together, we shall restore the Han!",
                zh: "前路漫长且充满危险，但只要我们在一起，定能恢复汉室！"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },

        // --- RECRUITING AT THE NOTICEBOARD ---
        { bg: 'noticeboard', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 210 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -70, y: 210 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -100, y: 210 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        // All three walk into place together
        { type: 'command', action: 'move', id: 'liubei', x: 100, y: 210, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 60, y: 210, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 140, y: 210, wait: false },
        // Wait for all movements to complete before showing dialogue
        { type: 'command', action: 'wait', duration: 1000 },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'rec_zf_01',
            text: {
                en: "CITIZENS OF ZHUO! The Yellow Turbans are coming! Who among you is brave enough to fight for your homes?",
                zh: "涿县百姓！黄巾军来了！你们中有谁有勇气为家园而战？"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'rec_gy_01',
            text: {
                en: "We offer no riches, only the chance to serve with honor under the banner of Liu Bei.",
                zh: "我们不提供财富，只提供在刘备旗下光荣效力的机会。"
            }
        },

        { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: -50, y: 210, speed: 0.8 },
        { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 300, y: 200, flip: true, speed: 0.7 },
        { type: 'command', action: 'move', id: 'volunteer1', x: 50, y: 220, wait: false },
        { type: 'command', action: 'move', id: 'volunteer2', x: 200, y: 215 },

        {
            type: 'dialogue',
            portraitKey: 'soldier-v2',
            position: 'top',
            name: 'Volunteer',
            voiceId: 'rec_vol_01',
            text: {
                en: "We have heard of your brotherhood! We are but simple men, but we will follow you to the death!",
                zh: "我们听说了你们的结义！我们只是普通人，但我们会跟随你们至死！"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_01',
            text: {
                en: "Welcome, brothers. Today we are but a few, but tomorrow we shall be an army.",
                zh: "欢迎，兄弟们。今天我们只是少数，但明天我们将成为一支军队。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'rec_zf_train_prompt_01',
            text: {
                en: "Should we pause to do some training?",
                zh: "要不要先停下来操练一番？"
            }
        },
        {
            type: 'choice',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            options: [
                {
                    buttonText: { en: "Yes. (play combat tutorial)", zh: "操练。（进入战斗教程）" },
                    speaker: 'zhangfei',
                    voiceId: 'rec_zf_train_yes_01',
                    text: {
                        en: "Good. Better to strike wood now than miss rebels later.",
                        zh: "好。现在砍木桩，总好过上阵时砍空。"
                    },
                    result: [
                        { type: 'command', action: 'startBattle', battleId: 'zhuo_training' }
                    ]
                },
                {
                    buttonText: { en: "No. (skip combat tutorial)", zh: "不必。（跳过战斗教程）" },
                    speaker: 'liubei',
                    voiceId: 'rec_lb_train_no_01',
                    text: {
                        en: "No. We know enough to begin, and the county cannot wait.",
                        zh: "不必。我们足以出发，县中也等不得。"
                    },
                    result: [
                        { type: 'command', action: 'jump', label: 'post_recruit_training' }
                    ]
                }
            ]
        },
        { type: 'label', name: 'post_recruit_training' },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_02',
            text: {
                en: "Let us march! Our first destination: the headquarters of the local Magistrate.",
                zh: "让我们出发！我们的第一个目的地：当地县令的总部。"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 }
    ],
    'noticeboard_after_training': [
        { bg: 'noticeboard', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 100, y: 210 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 60, y: 210 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 140, y: 210 },
        { type: 'command', action: 'addActor', id: 'volunteer1', imgKey: 'soldier', x: 50, y: 220 },
        { type: 'command', action: 'addActor', id: 'volunteer2', imgKey: 'soldier', x: 200, y: 215, flip: true },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_02',
            text: {
                en: "Let us march! Our first destination: the headquarters of the local Magistrate.",
                zh: "让我们出发！我们的第一个目的地：当地县令的总部。"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 }
    ],
    'caocao_dunqiu_intro': [
        {
            type: 'title',
            text: {
                en: 'DUNQIU',
                zh: '顿丘'
            },
            subtext: {
                en: '184 AD',
                zh: '中平元年（184年）'
            },
            duration: 2800
        },
        { type: 'command', action: 'fade', target: 0, speed: 0.0012, wait: false },
        { bg: 'urban_street', fg: 'urban_street_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'refugee_m_01', imgKey: 'farmer', x: 22, y: 165, actorAction: 'walk', speed: 0.52, loopXStart: -44, loopXEnd: 320 },
        { type: 'command', action: 'addActor', id: 'refugee_f_01', imgKey: 'farmer2', x: 86, y: 164, actorAction: 'walk', speed: 0.48, loopXStart: -62, loopXEnd: 326 },
        { type: 'command', action: 'addActor', id: 'refugee_m_02', imgKey: 'farmer', x: 148, y: 166, actorAction: 'walk', speed: 0.44, loopXStart: -78, loopXEnd: 332 },
        { type: 'command', action: 'addActor', id: 'refugee_f_02', imgKey: 'farmer2', x: 208, y: 163, actorAction: 'walk', speed: 0.56, loopXStart: -96, loopXEnd: 338 },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: 52, y: 258, actorAction: 'walk', speed: 0.72, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'caocao_attendant', imgKey: 'soldier', x: 56, y: 262, actorAction: 'walk', speed: 0.66, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'caocao_civil_attendant', imgKey: 'zhoujing', x: 36, y: 264, actorAction: 'walk', speed: 0.6, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'caocao', x: 102, y: 206, wait: false },
        { type: 'command', action: 'move', id: 'caocao_attendant', x: 90, y: 212, wait: false },
        { type: 'command', action: 'move', id: 'caocao_civil_attendant', x: 78, y: 216, wait: true },
        {
            type: 'dialogue',
            name: 'Civil Attendant',
            portraitKey: 'zhoujing',
            speaker: 'zhoujing',
            voiceId: 'cc_dq_att_00',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Magistrate, the refugees all report the Yellow Turbans are burning and plundering along the roads. The people are carrying old and young alike and pleading to enter the city for shelter.',
                zh: '县令，流民皆称黄巾沿途焚掠，郡县震动。百姓扶老携幼，争入城中避难。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_01',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'The court sits idle while the Yellow Turbans spread havoc. If this chaos is to end, someone must move first.',
                zh: '朝廷迟疑不决，黄巾蜂起为乱。若要止此祸，终须有人先行。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_02',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Something must be done about these refugees.',
                zh: '这些流民，必须尽快处置。'
            }
        },
        {
            type: 'choice',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            position: 'top',
            options: [
                {
                    buttonText: { en: 'Open grain stores.', zh: '开仓赈民' },
                    portraitKey: 'cao-cao',
                    name: 'Cao Cao',
                    voiceId: 'cc_dq_choice_01',
                    text: {
                        en: 'Open the city granaries. Issue gruel at the east market and register each household in order.',
                        zh: '开城中仓廪，于东市设粥棚，按户登记，依次赈济。'
                    },
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'caocao_refugee_policy',
                            value: 'open_granaries',
                            routeId: 'caocao'
                        },
                        {
                            type: 'dialogue',
                            name: 'Military Attendant',
                            portraitKey: 'soldier-v3',
                            voiceId: 'cc_dq_att_01',
                            position: 'top',
                            bg: 'urban_street',
                            fg: 'urban_street_foreground',
                            text: {
                                en: 'At once, Magistrate. We will open the stores and keep order.',
                                zh: '谨遵县令之命。即刻开仓施粥，并维持秩序。'
                            }
                        },
                        { type: 'command', action: 'move', id: 'caocao_attendant', x: 140, y: 166, wait: true },
                        { type: 'command', action: 'removeActor', id: 'caocao_attendant' },
                        { type: 'command', action: 'addActor', id: 'caocao_attendant', imgKey: 'soldier', x: 140, y: 166, actorAction: 'walk', speed: 0.66, drawAboveForeground: false },
                        { type: 'command', action: 'move', id: 'caocao_attendant', x: 340, y: 166, wait: true },
                        { type: 'command', action: 'removeActor', id: 'caocao_attendant' }
                    ]
                },
                {
                    buttonText: { en: 'Close the gates.', zh: '闭门止入' },
                    portraitKey: 'cao-cao',
                    name: 'Cao Cao',
                    voiceId: 'cc_dq_choice_02',
                    text: {
                        en: 'Close the gates at once. Redirect new arrivals to neighboring counties before panic swallows the city.',
                        zh: '即刻闭门，后来流民引往邻县，勿使城中先乱。'
                    },
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'caocao_refugee_policy',
                            value: 'close_gates',
                            routeId: 'caocao'
                        },
                        { type: 'command', action: 'setActorLoop', id: 'refugee_m_01', enabled: false },
                        { type: 'command', action: 'setActorLoop', id: 'refugee_f_01', enabled: false },
                        { type: 'command', action: 'setActorLoop', id: 'refugee_m_02', enabled: false },
                        { type: 'command', action: 'setActorLoop', id: 'refugee_f_02', enabled: false },
                        {
                            type: 'dialogue',
                            name: 'Military Attendant',
                            portraitKey: 'soldier-v3',
                            voiceId: 'cc_dq_att_02',
                            position: 'top',
                            bg: 'urban_street',
                            fg: 'urban_street_foreground',
                            text: {
                                en: 'Understood, Magistrate. I will have the gates sealed at once.',
                                zh: '明白，县令。末将即刻去闭城门。'
                            }
                        },
                        { type: 'command', action: 'move', id: 'caocao_attendant', x: 140, y: 166, wait: true },
                        { type: 'command', action: 'removeActor', id: 'caocao_attendant' },
                        { type: 'command', action: 'addActor', id: 'caocao_attendant', imgKey: 'soldier', x: 140, y: 166, actorAction: 'walk', speed: 0.66, drawAboveForeground: false },
                        { type: 'command', action: 'move', id: 'caocao_attendant', x: -30, y: 166, wait: true },
                        { type: 'command', action: 'removeActor', id: 'caocao_attendant' },
                        { type: 'command', action: 'playSound', key: 'building_damage', volume: 0.7 }
                    ]
                }
            ]
        },
        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'xiaoer', x: -30, y: 166, actorAction: 'walk', speed: 0.84, drawAboveForeground: false },
        { type: 'command', action: 'move', id: 'messenger', x: 140, y: 166, wait: true },
        { type: 'command', action: 'removeActor', id: 'messenger' },
        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'xiaoer', x: 140, y: 166, actorAction: 'walk', speed: 0.84, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'messenger', x: 166, y: 216, wait: true },
        {
            type: 'dialogue',
            speaker: 'volunteer',
            name: 'Messenger',
            portraitKey: 'xiaoer',
            voiceId: 'cc_dq_msg_01',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Dispatch from Luoyang! Imperial order: Dong Commandery is to muster a cavalry force of five thousand.',
                zh: '洛阳急报！奉朝廷诏令：东郡当募骑兵五千。'
            }
        },
        {
            type: 'dialogue',
            speaker: 'volunteer',
            name: 'Messenger',
            portraitKey: 'xiaoer',
            voiceId: 'cc_dq_msg_02',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Draft men and horses from local households and march against the Yellow Turban rebels.',
                zh: '自各乡里征发丁壮与战马，进讨黄巾逆军。'
            }
        },
        {
            type: 'dialogue',
            speaker: 'volunteer',
            name: 'Messenger',
            portraitKey: 'xiaoer',
            voiceId: 'cc_dq_msg_03',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Magistrate Cao Cao is elevated to Cavalry Commander and placed in command of this Dong Commandery cavalry force.',
                zh: '今擢曹操县令为骑都尉，总领东郡所募此部骑军。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_03',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'At last - authority to strike the rebels.',
                zh: '正合我意，今得以正兵讨贼。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_04',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Write draft notices to every household at once, and send riders to every surrounding village.',
                zh: '即刻缮写征发文书，遍告诸户；再遣快骑，传令四乡。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_05',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Send word to my cousin Cao Ren: gather every horseman he can and join me without delay.',
                zh: '另发急信与我从弟曹仁，命其尽集骑士速来会合。'
            }
        },
        {
            type: 'dialogue',
            name: 'Cao Cao',
            portraitKey: 'cao-cao',
            voiceId: 'cc_dq_06',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'Arm my household retainers for war, and draw horses from my own stables to mount them.',
                zh: '再令我家丁披甲执兵，并从我家马厩点出战马配骑，即刻备战。'
            }
        },
        {
            type: 'dialogue',
            name: 'Civil Attendant',
            portraitKey: 'zhoujing',
            voiceId: 'cc_dq_att_03',
            position: 'top',
            bg: 'urban_street',
            fg: 'urban_street_foreground',
            text: {
                en: 'As you command, Magistrate. I will see these orders carried out at once.',
                zh: '谨遵县令之命。属下这就分头施行。'
            }
        },
        { type: 'command', action: 'move', id: 'caocao', x: 142, y: 328, wait: false },
        { type: 'command', action: 'move', id: 'caocao_civil_attendant', x: 116, y: 330, wait: false },
        { type: 'command', action: 'move', id: 'messenger', x: 170, y: 332, wait: true },
        { type: 'command', action: 'removeActor', id: 'caocao' },
        { type: 'command', action: 'removeActor', id: 'caocao_civil_attendant' },
        { type: 'command', action: 'removeActor', id: 'messenger' },
        { type: 'command', action: 'setActorLoop', id: 'refugee_m_01', enabled: false },
        { type: 'command', action: 'setActorLoop', id: 'refugee_f_01', enabled: false },
        { type: 'command', action: 'setActorLoop', id: 'refugee_m_02', enabled: false },
        { type: 'command', action: 'setActorLoop', id: 'refugee_f_02', enabled: false }
    ],
    'chapter2_zhujun_camp': [
        { bg: 'army_camp', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'zhujun', imgKey: 'zhujun_sprite', x: 136, y: 188 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 72, y: 214 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 42, y: 214 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 12, y: 214 },
        { type: 'title', text: { en: 'YINGCHUAN - ZHU JUN CAMP', zh: '颍川·朱儁军营' }, duration: 1800 },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_zj_camp_zj_00',
            text: {
                en: "Xuande, you came by night to join my command. Good.",
                zh: "玄德，你们当夜引军来投，甚好。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_zj_camp_zj_02',
            text: {
                en: "I will receive your force with full trust. We combine our men as one host and advance against Zhang Bao.",
                zh: "我待汝军以厚礼。即刻合兵一处，进讨张宝。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_zj_camp_zj_01',
            text: {
                en: "Xuande, take the vanguard and engage the rebels first.",
                zh: "玄德，你为先锋，先与贼对敌。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_zj_camp_lb_01',
            text: {
                en: "Understood. Guan Yu, Zhang Fei - prepare the men. We march at first light.",
                zh: "领命。云长、翼德，整备军士，黎明出发。"
            }
        }
    ],
    'chapter2_zhangbao_counter_council': [
        { bg: 'army_camp', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'zhujun', imgKey: 'zhujun_sprite', x: 164, y: 170 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -44, y: 184, actorAction: 'walk', speed: 0.5 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -80, y: 184, actorAction: 'walk', speed: 0.5 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -116, y: 184, actorAction: 'walk', speed: 0.5 },
        { type: 'command', action: 'move', id: 'liubei', x: 90, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 60, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 30, y: 184, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_counter_camp_lb_01',
            position: 'top',
            text: {
                en: "Zhang Bao called lightning down on us. In the thunder and black air, it seemed as if soldiers were falling from the sky.",
                zh: "张宝作法唤下天雷。雷声与黑气之中，似有人马自天而下。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_counter_camp_zj_01',
            position: 'top',
            text: {
                en: "Then do not meet thunder with spearpoints alone. Blood and filth can foul the rite itself. If Zhang Bao is struck with it, the lightning should fail.",
                zh: "天雷不可只以兵刃相迎。血秽可污其法坛。若能掷中张宝，雷法应自败。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_counter_camp_gy_01',
            position: 'top',
            text: {
                en: "Pig, sheep, and dog blood, with filthy matter besides. Give it to the brothers and keep it ready at both sides of the valley.",
                zh: "盛猪羊狗血，并备秽物。分与兄弟，令两侧伏兵皆可随时投掷。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_counter_camp_zf_01',
            position: 'top',
            text: {
                en: "Ha! If thunder answers him, slop will answer thunder.",
                zh: "哈哈！他以雷吓人，俺便以污秽泼雷！"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                {
                    buttonText: { en: 'Use the plan.', zh: '依计而行' },
                    text: {
                        en: "If striking Zhang Bao with filth stops the thunder and saves the men, we use it.",
                        zh: "若以秽物掷中张宝便能止雷、保全军士，便依此计。"
                    },
                    voiceId: 'ch2_counter_camp_choice_use',
                    speaker: 'liubei',
                    position: 'top',
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'zhangbao_counter_plan',
                            value: 'accepted',
                            routeId: 'chapter2_oath'
                        }
                    ]
                },
                {
                    buttonText: { en: 'Question it.', zh: '心有迟疑' },
                    text: {
                        en: "It sits poorly with me to answer darkness with such things. Yet lives weigh heavier than pride.",
                        zh: "以秽物破妖，心中终觉不安。但军士性命，重于颜面。"
                    },
                    voiceId: 'ch2_counter_camp_choice_reluctant',
                    speaker: 'liubei',
                    position: 'top',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhu-jun-generic',
                            name: 'Zhu Jun',
                            voiceId: 'ch2_counter_camp_zj_02',
                            position: 'top',
                            text: {
                                en: "This is not worship of sorcery. It is a soldier's answer: close the distance, foul the caster, and end the thunder.",
                                zh: "此非奉妖，乃军中破法之策：逼近施术者，以秽物污之，雷自止。"
                            }
                        },
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'zhangbao_counter_plan',
                            value: 'reluctant',
                            routeId: 'chapter2_oath'
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_counter_camp_lb_02',
            position: 'top',
            text: {
                en: "Guan Yu, Zhang Fei: take the right side of the valley. I will press from the left. When Zhang Bao calls thunder, close in and throw the filth on him.",
                zh: "云长、翼德，引兵据谷右。我自左路进逼。张宝一召雷，便合围上前，将秽物掷到他身上。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_counter_camp_zj_03',
            position: 'top',
            text: {
                en: "Good. The road to Yangcheng opens beyond that ridge. Break him there, and he will have only the city walls left.",
                zh: "善。过此山冈，便是阳城之路。此处破之，他只得退守城中。"
            }
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 320, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 350, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'liubei', x: 380, y: 184, wait: true },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_wan_strategy': [
        { bg: 'outside_city_walls', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'zhujun', imgKey: 'zhujun_sprite', x: 164, y: 178 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 74, y: 192 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 42, y: 192 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 24, y: 192 },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_wan_wall_zj_01',
            position: 'top',
            text: {
                en: "There stands Wan. Han Zhong asks to surrender, yet the gate remains barred and his banners still fly on the wall.",
                zh: "宛城就在眼前。韩忠遣使请降，然而城门仍闭，城头旗帜仍在。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_wan_wall_zj_02',
            position: 'top',
            text: {
                en: "Yangcheng opened from within after Yan Zheng struck down Zhang Bao. Wan has offered only words from behind a shut gate.",
                zh: "阳城是严政斩张宝后从城中开门。宛城如今只是隔着闭门空言请降。"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_wan_wall_zj_03',
            position: 'top',
            text: {
                en: "If this is a trick to buy time, the walls before us will make it costly. Speak, Xuande: how should we answer?",
                zh: "若这是缓兵之计，眼前城墙便会令我军付出代价。玄德，你以为该如何应对？"
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_wan_wall_lb_01',
            position: 'top',
            text: {
                en: "General, Wan is not Yangcheng. We must decide whether to draw Han Zhong out or break the gate before his deceit ripens.",
                zh: "将军，宛城非阳城。此刻须决断：诱韩忠出城，还是趁其诈计未成先破城门。"
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            options: [
                {
                    buttonText: { en: "Open the southeast road.", zh: "开东南一路。" },
                    voiceId: 'ch2_wan_wall_lb_02',
                    text: {
                        en: "Leave the southeast road open. When Han Zhong comes out, strike his broken ranks in the field.",
                        zh: "可独开东南一路。韩忠若出，便于野外击其散乱之阵。"
                    },
                    speaker: 'liubei',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'chapter2_wan_strategy', value: 'open_southeast', routeId: 'chapter2_oath' },
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            voiceId: 'ch2_wan_wall_gy_01',
                            position: 'top',
                            text: {
                                en: "A trapped army is iron. A fleeing army is reeds before the blade.",
                                zh: "困兽之兵坚如铁，奔逃之众则如草芥。"
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            voiceId: 'ch2_wan_wall_zf_01',
                            position: 'top',
                            text: {
                                en: "Good! Let them think they have found a road, then I will close it with my spear.",
                                zh: "好！让他们以为有路可走，俺再用蛇矛替他们截路！"
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhu-jun-generic',
                            name: 'Zhu Jun',
                            voiceId: 'ch2_wan_wall_zj_04',
                            position: 'top',
                            text: {
                                en: "That counsel is wise. Loosen the siege at the southeast. Place our best troops at the narrow road.",
                                zh: "玄德之言有理。东南稍解围势，精锐伏于狭路。"
                            }
                        }
                    ]
                },
                {
                    buttonText: { en: "Strike the walls now.", zh: "即刻攻城。" },
                    voiceId: 'ch2_wan_wall_lb_03',
                    text: {
                        en: "Then strike the walls now. If Han Zhong hides behind a false surrender, break the gate before he can profit from it.",
                        zh: "那便即刻攻城。若韩忠借诈降藏身墙后，便先破其城门，使其无利可图。"
                    },
                    speaker: 'liubei',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'chapter2_wan_strategy', value: 'assault_walls', routeId: 'chapter2_oath' },
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            voiceId: 'ch2_wan_wall_gy_02',
                            position: 'top',
                            text: {
                                en: "A hard blow may end deceit quickly, if our men keep discipline at the gate.",
                                zh: "若军心整肃，重击城门，也可速断其诈。"
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            voiceId: 'ch2_wan_wall_zf_02',
                            position: 'top',
                            text: {
                                en: "Ha! If they bar the door while begging mercy, I will knock loudly enough for all Wan to hear.",
                                zh: "哈哈！一边求饶一边闭门，俺便敲得全宛城都听见！"
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhu-jun-generic',
                            name: 'Zhu Jun',
                            voiceId: 'ch2_wan_wall_zj_05',
                            position: 'top',
                            text: {
                                en: "So be it. Form the assault column here before the gate. Wan is to be taken, not burned.",
                                zh: "也罢。就在城门前列攻城之阵。取宛城，不许焚掠。"
                            }
                        }
                    ]
                }
            ]
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 320, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 350, y: 184, wait: false },
        { type: 'command', action: 'move', id: 'liubei', x: 380, y: 184, wait: true },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_wan_reversal': [
        { bg: 'outside_city_walls', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        {
            type: 'narrator',
            voiceId: 'ch2_wan_rev_narrator_01',
            text: {
                en: 'Han Zhong was slain and his scattered men fled. Yet the Wan campaign did not end there.',
                zh: '韩忠既死，余众四散。然而宛城之役并未就此结束。'
            }
        },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 78, y: 190 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 46, y: 190 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 24, y: 190 },
        { type: 'command', action: 'addActor', id: 'zhujun', imgKey: 'zhujun_sprite', x: 170, y: 188, flip: true },
        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'soldier', x: 332, y: 190, actorAction: 'walk', speed: 0.82, flip: true },
        { type: 'command', action: 'move', id: 'messenger', x: 216, y: 190, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'soldier',
            name: 'Messenger',
            voiceId: 'ch2_wan_rev_messenger_01',
            position: 'top',
            text: {
                en: 'General Zhu! Zhao Hong and Sun Zhong have gathered the remaining rebels. Their numbers are strong.',
                zh: '朱将军！赵弘、孙仲收合余党，声势甚盛。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'soldier',
            name: 'Messenger',
            voiceId: 'ch2_wan_rev_messenger_02',
            position: 'top',
            text: {
                en: 'They have struck back toward Wan. The outer troops are falling away from the walls.',
                zh: '贼众反扑宛城，城外诸军已被逼退。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_wan_rev_zj_01',
            position: 'top',
            text: {
                en: 'So the serpent has another head. Pull the line ten li back and keep the army whole.',
                zh: '蛇断一首，余首尚动。退军十里下寨，先保军势。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_wan_rev_lb_01',
            position: 'top',
            text: {
                en: 'Han Zhong fell because he left the city broken. Zhao Hong will be harder if he has regained the walls.',
                zh: '韩忠出城而败。赵弘若复据城墙，便更难破。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_wan_rev_gy_01',
            position: 'top',
            text: {
                en: 'Then we wait for the next opening, not throw men against a wall in anger.',
                zh: '当待其隙，不可怒驱士卒撞墙。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_wan_rev_zf_01',
            position: 'top',
            text: {
                en: 'Hmph. If Sun Zhong tries to run north, leave that road to me.',
                zh: '哼。孙仲若从北门逃，便交给俺。'
            }
        },
        { type: 'command', action: 'move', id: 'messenger', x: 332, y: 190, wait: true },
        { type: 'command', action: 'removeActor', id: 'messenger' },
        { type: 'command', action: 'playSound', key: 'war_horn', volume: 0.85 },
        { type: 'command', action: 'playMusic', key: 'oath', volume: 0.52 },
        { type: 'command', action: 'wait', duration: 420 },
        { type: 'command', action: 'addActor', id: 'sunjian', imgKey: 'sunjian', x: 344, y: 188, actorAction: 'walk', speed: 0.92, flip: true },
        { type: 'command', action: 'addActor', id: 'sunjian_soldier_1', imgKey: 'soldier', x: 374, y: 192, actorAction: 'walk', speed: 0.86, flip: true },
        { type: 'command', action: 'addActor', id: 'sunjian_soldier_2', imgKey: 'soldier', x: 402, y: 196, actorAction: 'walk', speed: 0.84, flip: true },
        { type: 'command', action: 'addActor', id: 'sunjian_soldier_3', imgKey: 'soldier', x: 430, y: 200, actorAction: 'walk', speed: 0.82, flip: true },
        { type: 'command', action: 'addActor', id: 'sunjian_soldier_4', imgKey: 'soldier', x: 458, y: 204, actorAction: 'walk', speed: 0.8, flip: true },
        { type: 'command', action: 'addActor', id: 'sunjian_soldier_5', imgKey: 'soldier', x: 486, y: 208, actorAction: 'walk', speed: 0.78, flip: true },
        { type: 'command', action: 'move', id: 'sunjian', x: 142, y: 188, wait: false },
        { type: 'command', action: 'move', id: 'sunjian_soldier_1', x: 172, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'sunjian_soldier_2', x: 198, y: 196, wait: false },
        { type: 'command', action: 'move', id: 'sunjian_soldier_3', x: 224, y: 200, wait: false },
        { type: 'command', action: 'move', id: 'sunjian_soldier_4', x: 186, y: 208, wait: false },
        { type: 'command', action: 'move', id: 'sunjian_soldier_5', x: 212, y: 212, wait: true },
        {
            type: 'dialogue',
            speaker: 'sunjian',
            portraitKey: 'chengyuanzhi',
            name: 'Sun Jian',
            voiceId: 'ch2_wan_rev_sj_01',
            position: 'top',
            text: {
                en: 'General Zhu Jun, Sun Jian of Xiapi answers the imperial call. My men are ready to strike Wan.',
                zh: '朱儁将军，下邳孙坚奉诏而来。麾下兵马，愿攻宛城。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhu-jun-generic',
            name: 'Zhu Jun',
            voiceId: 'ch2_wan_rev_zj_02',
            position: 'top',
            text: {
                en: 'Good. The rebels think their courage has returned. We will show them it was only noise.',
                zh: '善。贼众以为勇气复来，我等便让他们知道，不过喧嚣而已。'
            }
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            options: [
                {
                    buttonText: { en: 'Hold the north road.', zh: '守北路。' },
                    voiceId: 'ch2_wan_rev_lb_02_road',
                    text: {
                        en: 'Then Sun Jian can press the wall. Our brothers will hold the north road and cut down anyone who breaks from the gate.',
                        zh: '那便请孙将军攻城。我兄弟守北路，凡从城门突围者，尽截之。'
                    },
                    speaker: 'liubei',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'chapter2_wan_second_siege', value: 'hold_north_road', routeId: 'chapter2_oath' },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhu-jun-generic',
                            name: 'Zhu Jun',
                            voiceId: 'ch2_wan_rev_zj_03_road',
                            position: 'top',
                            text: {
                                en: 'Good. Sun Jian will strike the wall. Xuande, take your brothers to the north road; if Sun Zhong runs, he must find you there.',
                                zh: '善。孙坚攻城。玄德，你兄弟往守北路；孙仲若走，必使其遇你。'
                            }
                        },
                        {
                            type: 'dialogue',
                            speaker: 'sunjian',
                            portraitKey: 'chengyuanzhi',
                            name: 'Sun Jian',
                            voiceId: 'ch2_wan_rev_sj_02_road',
                            position: 'top',
                            text: {
                                en: 'Leave the wall to me. If the rebels flee north, make the road narrower than the gate.',
                                zh: '城墙交给孙坚。贼若北逃，便请诸君使其路窄于城门。'
                            }
                        }
                    ]
                },
                {
                    buttonText: { en: 'Join Sun Jian at the wall.', zh: '同孙坚攻城。' },
                    voiceId: 'ch2_wan_rev_lb_02_wall',
                    text: {
                        en: 'Then we will join Sun Jian at the wall. If the gate breaks quickly, Sun Zhong will have no road left to use.',
                        zh: '那我等同孙将军攻城。若速破城门，孙仲便无路可走。'
                    },
                    speaker: 'liubei',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'chapter2_wan_second_siege', value: 'join_wall', routeId: 'chapter2_oath' },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhu-jun-generic',
                            name: 'Zhu Jun',
                            voiceId: 'ch2_wan_rev_zj_03_wall',
                            position: 'top',
                            text: {
                                en: 'Then the wall assault will carry our strength. My remaining troops will watch the roads while you and Sun Jian break the gate.',
                                zh: '如此，攻城一路当用我军锐气。余兵守道路，你与孙坚并力破门。'
                            }
                        },
                        {
                            type: 'dialogue',
                            speaker: 'sunjian',
                            portraitKey: 'chengyuanzhi',
                            name: 'Sun Jian',
                            voiceId: 'ch2_wan_rev_sj_02_wall',
                            position: 'top',
                            text: {
                                en: 'Good. We will climb together and settle Zhao Hong before his courage hardens.',
                                zh: '好。并力登城，趁赵弘胆气未固，便定此役。'
                            }
                        }
                    ]
                }
            ]
        },
        { type: 'command', action: 'setStoryChoice', key: 'chapter2_wan_reversal', value: 'sun_jian_arrived', routeId: 'chapter2_oath' },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_anxi_appointment': [
        { bg: 'luoyang_aerial_shot', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        {
            type: 'title',
            text: { en: 'LUOYANG', zh: '洛阳' },
            subtext: { en: 'Merit waits outside the gate', zh: '功名候于宫门外' }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_narrator_01',
            text: {
                en: 'With Wan settled and Nanyang quiet, Zhu Jun returned to Luoyang to report the victory and memorialize the merit of Sun Jian and Liu Bei.',
                zh: '宛城既定，南阳平息，朱儁班师洛阳奏捷，并上表奏孙坚、刘备等人之功。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_narrator_02',
            text: {
                en: 'Sun Jian had patrons and soon departed to a new post. Liu Bei waited outside the palace, day after day, and no summons came.',
                zh: '孙坚有人情，不久便得别郡司马之任。刘备在宫门外候命，日复一日，却始终不得除授。'
            }
        },
        { bg: 'luoyang_imperial_palace_gate', fg: 'luoyang_imperial_palace_gate_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'palace_traffic_soldier_01', imgKey: 'soldier', x: -34, y: 226, actorAction: 'walk', speed: 0.48, loopXStart: -58, loopXEnd: 292, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'palace_traffic_messenger_01', imgKey: 'xiaoer', x: 64, y: 230, actorAction: 'walk', speed: 0.58, loopXStart: -96, loopXEnd: 304, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'palace_traffic_soldier_02', imgKey: 'soldier', x: 152, y: 228, actorAction: 'walk', speed: 0.42, loopXStart: -130, loopXEnd: 298, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 108, y: 190, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 76, y: 190, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 46, y: 190, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'zhangfei', x: 56, y: 190, wait: false },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_anxi_zf_01',
            position: 'top',
            text: {
                en: 'We broke Zhang Bao, settled Yangcheng, and helped take Wan. Are we to wear a path into these stones before anyone speaks to us?',
                zh: '咱们破张宝、定阳城，又助取宛城。难道要在这宫门石上走出沟来，才有人理会？'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_gy_01',
            position: 'top',
            text: {
                en: 'Merit should speak for itself. Yet at court, even merit seems to need an usher.',
                zh: '功劳本当自明。只是朝堂之上，功劳也似乎要人引见。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_lb_01',
            position: 'top',
            text: {
                en: 'If office comes, we serve. If none comes, our oath remains. Still, the men who followed us deserve to see justice done.',
                zh: '有官则尽职，无官亦守义。只是随我等出生入死之人，也该见朝廷公道。'
            }
        },
        { type: 'command', action: 'addActor', id: 'zhangjun', imgKey: 'zhoujing', x: 336, y: 190, actorAction: 'walk', speed: 0.72, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'zhangjun', x: 198, y: 190, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_01',
            position: 'top',
            text: {
                en: 'You are Liu Xuande? I have heard your name in the campaign reports. Why do you wait here like an unrewarded clerk?',
                zh: '你便是刘玄德？军报中屡闻其名。为何在此久候，如无功小吏？'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_lb_02',
            position: 'top',
            text: {
                en: 'General Zhu has submitted our names. We wait on the court. Nothing more is in my hands.',
                zh: '朱将军已上名籍。我等只待朝廷铨注。除此之外，备无可为。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_02',
            position: 'top',
            text: {
                en: 'Then I will speak where waiting cannot. Soldiers bleed for the Han while offices are sold at the gate.',
                zh: '既如此，我便替这沉默开口。将士为汉流血，官爵却在门内买卖。'
            }
        },
        { type: 'command', action: 'move', id: 'zhangjun', x: 147, y: 170, wait: true },
        { type: 'command', action: 'setActorLayer', id: 'zhangjun', drawAboveForeground: false },
        { type: 'command', action: 'move', id: 'zhangjun', x: 340, y: 170, wait: true },
        { type: 'command', action: 'removeActor', id: 'zhangjun' },
        { type: 'command', action: 'addActor', id: 'luoyang_liubo_player', imgKey: 'merchant', x: 216, y: 190, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'animate', id: 'luoyang_liubo_player', animation: 'recovery' },
        { type: 'command', action: 'addProp', id: 'luoyang_liubo_table', imgKey: 'liubo_table', x: 176, y: 166, sortY: 226 },
        {
            type: 'interactive',
            clickableActors: {
                'luoyang_liubo_player': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'merchant',
                            position: 'top',
                            name: 'Liubo Player',
                            voiceId: 'ch2_luoyang_liubo_intro_01',
                            text: {
                                en: 'Waiting at court is its own campaign. Sit for a game of Liubo while the palace decides your fate?',
                                zh: '候在宫门外，也像一场战役。趁宫中议事未定，坐下博一局如何？'
                            },
                            _isInserted: true
                        },
                        {
                            type: 'choice',
                            portraitKey: 'merchant',
                            name: 'Liubo Player',
                            options: [
                                {
                                    buttonText: { en: 'Play Liubo.', zh: '博一局。' },
                                    speaker: 'merchant',
                                    voiceId: 'ch2_luoyang_liubo_accept_01',
                                    text: {
                                        en: 'Then let the sticks speak while the ministers keep silent.',
                                        zh: '那就让博箸先开口，等诸公慢慢议。'
                                    },
                                    result: [
                                        { type: 'command', action: 'startCampaignLiubo', activityId: 'chapter2_luoyang_wait_liubo' }
                                    ]
                                },
                                {
                                    buttonText: { en: 'Not now.', zh: '现在不玩。' },
                                    speaker: 'merchant',
                                    voiceId: 'ch2_luoyang_liubo_decline_01',
                                    text: {
                                        en: 'Another time. We should keep our eyes on the gate.',
                                        zh: '改日吧。我们还是盯着宫门。'
                                    },
                                    result: [
                                        {
                                            type: 'dialogue',
                                            portraitKey: 'merchant',
                                            position: 'top',
                                            name: 'Liubo Player',
                                            voiceId: 'ch2_luoyang_liubo_decline_reply_01',
                                            text: {
                                                en: 'As you wish. The board moves faster than the court.',
                                                zh: '随你。棋盘走得总比朝廷快。'
                                            }
                                        }
                                    ]
                                }
                            ],
                            _isInserted: true
                        }
                    ]
                }
            },
            promptOptions: [
                {
                    id: 'continue_waiting',
                    text: { en: 'Keep waiting.', zh: '继续等候。' },
                    position: 'right',
                    y: 204,
                    w: 86,
                    h: 24,
                    advanceOnClick: true
                }
            ]
        },
        { type: 'command', action: 'removeProp', id: 'luoyang_liubo_table' },
        { type: 'command', action: 'removeActor', id: 'luoyang_liubo_player' },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_narrator_wait_01',
            text: {
                en: 'Several hours later, Zhang Jun came back through the palace gate, dusty, angry, and very much alive.',
                zh: '数个时辰后，张钧自宫门复出，衣冠带尘，怒气未消，所幸性命尚在。'
            }
        },
        { type: 'command', action: 'addActor', id: 'zhangjun', imgKey: 'zhoujing', x: 340, y: 170, actorAction: 'walk', speed: 0.72, flip: true, drawAboveForeground: false },
        { type: 'command', action: 'move', id: 'zhangjun', x: 147, y: 170, wait: true },
        { type: 'command', action: 'setActorLayer', id: 'zhangjun', drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'zhangjun', x: 198, y: 190, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_03',
            position: 'top',
            text: {
                en: 'I told the emperor plainly: the Yellow Turbans rose because offices are sold, kin are favored, enemies are ruined, and worthy men are made to beg.',
                zh: '我已直奏天子：黄巾之乱，正因卖官鬻爵、任亲害仇，贤者有功，反须乞命。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_04',
            position: 'top',
            text: {
                en: 'I urged him to cut away the corruption of the Ten Attendants and reward those who fought. The eunuchs called me a deceiver and had me driven out.',
                zh: '我请诛十常侍之蠹，重赏讨贼有功者。宦官却称我欺主，将我逐出。'
            }
        },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_clean_01',
            position: 'top',
            text: {
                en: 'Yet they fear more unrewarded soldiers will speak. Your name has been written down for Anxi County commandant.',
                zh: '然而他们惧有功之士再生怨言，已将你铨注为安喜县尉。'
            }
        },
        {
            condition: CH2_FREED_ONLY,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_freed_01',
            position: 'top',
            text: {
                en: 'They also named Lu Zhi: you took arms against imperial escorts and released him. Zhu Jun argued that your merit made punishment unwise.',
                zh: '他们又提卢植之事：你劫夺朝廷解送，私放其身。朱儁力言你功不可刑。'
            }
        },
        {
            condition: CH2_ATTACKED_ONLY,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_dz_01',
            position: 'top',
            text: {
                en: 'They also named Dong Zhuo: your brothers raised steel against an imperial general. Zhu Jun argued that your merit made punishment unwise.',
                zh: '他们又提董卓之事：你兄弟曾向朝廷将帅举刃。朱儁力言你功不可刑。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_one_01',
            position: 'top',
            text: {
                en: 'The court forgives the offense, but cuts down the reward. You are assigned beneath the Anxi commandant, not over him.',
                zh: '朝廷赦其罪，减其赏。你得赴安喜供职，却非自掌县尉之印。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_both_01',
            position: 'top',
            text: {
                en: 'They named both charges: Lu Zhi freed by force, and blades raised against Dong Zhuo. Zhu Jun could save your life, not your office.',
                zh: '他们两罪并提：以兵私放卢植，又向董卓举刃。朱儁可救你性命，却救不得官职。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhang Jun',
            voiceId: 'ch2_anxi_zj_both_02',
            position: 'top',
            text: {
                en: 'The court pardons the crimes and grants no post. Leave Luoyang before another tongue finds profit in naming you rebel.',
                zh: '朝廷免你罪名，不授一官。趁尚无人再借叛名生事，速离洛阳。'
            }
        },
        { condition: CH2_NO_POLITICAL_CRIMES, type: 'command', action: 'setStoryChoice', key: 'chapter2_oath_political_outcome', value: 'anxi_commandant', routeId: 'chapter2_oath' },
        { condition: CH2_ONE_POLITICAL_CRIME, type: 'command', action: 'setStoryChoice', key: 'chapter2_oath_political_outcome', value: 'anxi_assistant', routeId: 'chapter2_oath' },
        { condition: CH2_BOTH_POLITICAL_CRIMES, type: 'command', action: 'setStoryChoice', key: 'chapter2_oath_political_outcome', value: 'pardoned_outlaw', routeId: 'chapter2_oath' },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_lb_03',
            position: 'top',
            text: {
                en: 'Anxi County commandant. The seal is small, but the people beneath it are not small.',
                zh: '安喜县尉。印绶虽小，印下百姓却不可轻。'
            }
        },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_gy_02',
            position: 'top',
            text: {
                en: 'Then we go cleanly. A low office held with righteousness is higher than a high office bought with shame.',
                zh: '那便清清白白去。以义守微官，胜过以耻买高位。'
            }
        },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_anxi_zf_02',
            position: 'top',
            text: {
                en: 'Fine. But if some painted official comes to bully honest folk, do not ask me to smile at him.',
                zh: '也罢。若有花面官来欺压良民，可别叫俺陪他笑脸。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_lb_one_01',
            position: 'top',
            text: {
                en: 'Assistant to the Anxi commandant. No seal of my own, yet the people served by that office are still people of the Han.',
                zh: '安喜县尉佐。虽无自掌之印，然此职所及，仍是汉家百姓。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_gy_one_01',
            position: 'top',
            text: {
                en: 'They could not deny your merit, so they made the post smaller than the deed.',
                zh: '他们不能没你的功，便把官职压得小过功劳。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_anxi_zf_one_01',
            position: 'top',
            text: {
                en: 'A half-reward for a whole battlefield. Hmph. I will still walk beside you to Anxi.',
                zh: '一场大战，只给半截赏赐。哼。去安喜，俺仍陪大哥。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_lb_both_01',
            position: 'top',
            text: {
                en: 'So our reward is not a seal, but breath in our bodies. If that breath remains, we can still choose righteousness.',
                zh: '如此，我等所得不是印绶，而是尚留此身一口气。此气尚在，仍可择义而行。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_gy_both_01',
            position: 'top',
            text: {
                en: 'Then we cannot serve through an office, but we can still guard the people wherever chaos opens a road.',
                zh: '既不能以官职效力，仍可在乱处护民。义路未绝。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_anxi_zf_both_01',
            position: 'top',
            text: {
                en: 'Forgive us? After we saved their realm? If anger were wine, I could drown Luoyang in it.',
                zh: '赦我们？我们救了他们的天下！若怒气是酒，俺能把洛阳灌沉。'
            }
        },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_gy_both_02',
            position: 'top',
            text: {
                en: 'Then we should leave before the court changes its mind. A pardon spoken in fear may not survive a second whisper.',
                zh: '那就该在朝廷改口之前离开。因惧而赦，未必经得起第二句谗言。'
            }
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 320, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 350, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'liubei', x: 380, y: 190, wait: true },
        { type: 'command', action: 'removeActor', id: 'zhangjun' },
        { type: 'command', action: 'removeActor', id: 'liubei' },
        { type: 'command', action: 'removeActor', id: 'guanyu' },
        { type: 'command', action: 'removeActor', id: 'zhangfei' },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_anxi_governance': [
        { bg: 'dirt_road_city_in_distance', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -34, y: 192, actorAction: 'walk', speed: 0.72 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -64, y: 192, actorAction: 'walk', speed: 0.68 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -94, y: 192, actorAction: 'walk', speed: 0.72 },
        { type: 'command', action: 'move', id: 'liubei', x: 112, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 80, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 50, y: 192, wait: true },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'narrator',
            voiceId: 'ch2_anxi_narrator_04',
            text: {
                en: 'Liu Bei dismissed the volunteers to their villages and took only a small retinue with Guan Yu and Zhang Fei to Anxi.',
                zh: '刘备遂遣军士各归乡里，只带少数亲随，与关羽、张飞赴安喜县上任。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'narrator',
            voiceId: 'ch2_anxi_narrator_one_02',
            text: {
                en: 'Liu Bei dismissed the volunteers to their villages and took a small retinue with Guan Yu and Zhang Fei to Anxi, there to serve beneath another man\'s seal.',
                zh: '刘备遂遣军士各归乡里，只带少数亲随，与关羽、张飞赴安喜，在他人印下供职。'
            }
        },
        { bg: 'urban_street', fg: 'urban_street_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 118, y: 214, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 82, y: 216, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 50, y: 216, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'clerk', imgKey: 'zhoujing', x: 176, y: 204, flip: true, drawAboveForeground: true },
        {
            condition: CH2_NO_POLITICAL_CRIMES,
            type: 'narrator',
            voiceId: 'ch2_anxi_govern_narrator_01',
            text: {
                en: 'For one month Liu Bei governed Anxi without taking so much as a hair from the people, and the county began to trust the new commandant.',
                zh: '署县事一月，刘备与民秋毫无犯，安喜百姓渐渐信服这位新县尉。'
            }
        },
        {
            condition: CH2_ONE_POLITICAL_CRIME,
            type: 'narrator',
            voiceId: 'ch2_anxi_govern_narrator_one_01',
            text: {
                en: 'Though another seal hung above him, Liu Bei handled Anxi business without taking so much as a hair from the people.',
                zh: '虽在他人印下供职，刘备处置安喜县事，仍与民秋毫无犯。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_govern_narrator_02',
            text: {
                en: 'He ate and slept beside Guan Yu and Zhang Fei, and when he sat in public the brothers stood attendance all day without complaint.',
                zh: '到任之后，与关、张食则同桌，寝则同床。稠人广坐之中，关、张侍立终日不倦。'
            }
        },
        { type: 'command', action: 'addActor', id: 'inspector', imgKey: 'merchant', x: 340, y: 204, actorAction: 'walk', speed: 0.58, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'inspector', x: 214, y: 204, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'merchant',
            name: 'Inspector',
            voiceId: 'ch2_anxi_govern_inspector_01',
            position: 'top',
            text: {
                en: 'Liu Xuande. What is your origin, and by what merit did you receive office?',
                zh: '刘玄德。你是何出身，又凭何功得授职任？'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_govern_lb_01',
            position: 'top',
            text: {
                en: 'I am descended from Prince Jing of Zhongshan. Since Zhuo County I have fought the Yellow Turbans in more than thirty actions.',
                zh: '备乃中山靖王之后。自涿郡起兵以来，大小三十余战，讨剿黄巾。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'merchant',
            name: 'Inspector',
            voiceId: 'ch2_anxi_govern_inspector_02',
            position: 'top',
            text: {
                en: 'False kinship, false merit. The court now purges corrupt military upstarts. You may be exactly the man it means.',
                zh: '诈称皇亲，虚报功绩。朝廷正要沙汰这等军功滥官，你恐怕正合其例。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'County Clerk',
            voiceId: 'ch2_anxi_govern_clerk_01',
            position: 'top',
            text: {
                en: 'My lord, the inspector comes wrapped in authority. He asks without asking. A bribe is what he means.',
                zh: '刘公，督邮以威压人。他口中不说，心里所要，无非贿赂。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_govern_lb_02',
            position: 'top',
            text: {
                en: 'I have taken nothing from the people. What treasure could I hand him without first becoming what he accuses me of being?',
                zh: '我与民秋毫无犯。若要献财，岂不是先成了他口中的贪吏？'
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
        { bg: 'urban_street', fg: 'urban_street_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'inspector', imgKey: 'merchant', x: 210, y: 198, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'clerk', imgKey: 'zhoujing', x: 172, y: 214, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'elder1', imgKey: 'farmer', x: 88, y: 218, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'elder2', imgKey: 'farmer2', x: 64, y: 218, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -34, y: 220, actorAction: 'walk', speed: 0.92, drawAboveForeground: true },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_govern_narrator_03',
            text: {
                en: 'The next day, the inspector seized the county clerks and forced them to accuse Liu Bei. Elders came to plead for him and were beaten away from the gate.',
                zh: '次日，督邮先提县吏，勒令指称刘备害民。乡老前来苦告，又被门人赶打。'
            }
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 136, y: 218, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'farmer',
            name: 'Elder',
            voiceId: 'ch2_anxi_govern_elder_01',
            position: 'top',
            text: {
                en: 'General Zhang, the inspector means to ruin Lord Liu. We came to testify, but his men will not let us in.',
                zh: '张将军，督邮要害刘公。我等来作证，却被他手下拦在门外。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_anxi_govern_zf_01',
            position: 'top',
            text: {
                en: 'A thief who harms the people dares call my brother corrupt? Let him hear the truth from my hand.',
                zh: '害民的贼，倒敢说俺哥哥贪污？让他的皮肉听听真话！'
            }
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 202, y: 204, wait: true },
        { type: 'command', action: 'animate', id: 'zhangfei', animation: 'attack_1', wait: true },
        { type: 'command', action: 'playSound', key: 'bash', volume: 0.8 },
        { type: 'command', action: 'animate', id: 'inspector', animation: 'hit', wait: false },
        { type: 'command', action: 'wait', duration: 350 },
        { type: 'command', action: 'animate', id: 'zhangfei', animation: 'attack_1', wait: true },
        { type: 'command', action: 'playSound', key: 'bash', volume: 0.8 },
        { type: 'command', action: 'animate', id: 'inspector', animation: 'hit', wait: false },
        {
            type: 'dialogue',
            portraitKey: 'merchant',
            name: 'Inspector',
            voiceId: 'ch2_anxi_govern_inspector_03',
            position: 'top',
            text: {
                en: 'Liu Xuande! Save my life!',
                zh: '玄德公！救我性命！'
            }
        },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 220, actorAction: 'walk', speed: 0.84, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -68, y: 220, actorAction: 'walk', speed: 0.8, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'liubei', x: 110, y: 218, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 82, y: 218, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_govern_lb_03',
            position: 'top',
            text: {
                en: 'Yide, enough. He deserves punishment, but not death by our anger.',
                zh: '翼德，够了。他当受责罚，却不该死于我等怒气。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_anxi_govern_gy_01',
            position: 'top',
            text: {
                en: 'Brother, a thornbush is no perch for phoenixes. Return the seal and seek a larger road.',
                zh: '兄长，枳棘丛中，非栖鸾凤之所。不如缴还印绶，另图远计。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_anxi_govern_lb_04',
            position: 'top',
            text: {
                en: 'Inspector, by your harm to the people you should die. I spare you. Take this seal back to those who sell honor so cheaply.',
                zh: '督邮，据你害民，本当杀却。今姑饶汝命。把这印绶带回给那些轻卖功名的人。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_anxi_govern_narrator_04',
            text: {
                en: 'Liu Bei hung the seal on the inspector, left Anxi with Guan Yu and Zhang Fei, and turned north toward Liu Hui of Dai.',
                zh: '刘备将印绶挂在督邮颈上，与关羽、张飞离开安喜，北往代州投刘恢。'
            }
        },
        { type: 'command', action: 'move', id: 'zhangfei', x: 340, y: 216, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 370, y: 216, wait: false },
        { type: 'command', action: 'move', id: 'liubei', x: 400, y: 216, wait: true },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_liuhui_shelter': [
        { bg: 'dirt_road_city_in_distance', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -34, y: 192, actorAction: 'walk', speed: 0.72 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -64, y: 192, actorAction: 'walk', speed: 0.68 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -94, y: 192, actorAction: 'walk', speed: 0.72 },
        { type: 'command', action: 'addActor', id: 'liuhui', imgKey: 'zhoujing', x: 246, y: 192, flip: true },
        { type: 'command', action: 'move', id: 'liubei', x: 120, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 88, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 58, y: 192, wait: true },
        {
            condition: CH2_BOTH_POLITICAL_CRIMES,
            type: 'narrator',
            voiceId: 'ch2_liuhui_narrator_both_01',
            text: {
                en: 'The court had pardoned Liu Bei but granted no post. He dismissed the volunteers to their villages and left Luoyang before pardon curdled into pursuit.',
                zh: '朝廷赦了刘备，却不授一官。刘备遣军士各归乡里，趁赦命未变，离开洛阳。'
            }
        },
        {
            condition: { not: CH2_BOTH_POLITICAL_CRIMES },
            type: 'narrator',
            voiceId: 'ch2_liuhui_narrator_anxi_01',
            text: {
                en: 'After the seal was returned and Anxi left behind, Liu Bei, Guan Yu, and Zhang Fei traveled north with warrants already likely riding after them.',
                zh: '印绶既还，安喜已别，刘备、关羽、张飞北行而去，追捕文书只怕已在路上。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_liuhui_lb_01',
            position: 'top',
            text: {
                en: 'Liu Hui of Dai is also of the Han house. If he will receive us, we may wait there until the realm has need of us again.',
                zh: '代州刘恢亦是汉室宗亲。若他肯收留，我等可暂候其处，待天下再有用我等之日。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Liu Hui',
            voiceId: 'ch2_liuhui_lh_01',
            position: 'top',
            text: {
                en: 'Xuande, I know your name and your blood. The Han is poorer when men like you are hunted. My house is open.',
                zh: '玄德，我知你名，也知你宗。似你这等人为朝廷所逼，汉家更贫。寒舍可容。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            voiceId: 'ch2_liuhui_zf_01',
            position: 'top',
            text: {
                en: 'Hiding sits badly on my shoulders. Still, better here than bowing to an inspector with a hungry palm.',
                zh: '躲藏这事压得俺肩膀难受。可比向伸手要钱的督邮低头强。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'ch2_liuhui_gy_01',
            position: 'top',
            text: {
                en: 'A righteous road sometimes passes through another man\'s gate. We accept your shelter with gratitude.',
                zh: '义路有时也须借人门庭而过。承蒙收留，关某铭感。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'ch2_liuhui_lb_02',
            position: 'top',
            text: {
                en: 'Then we remain quiet, protect those near us, and wait for a summons worthy of the oath we swore.',
                zh: '那便暂且安身，护近处百姓，待一个不负桃园之誓的征召。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_liuhui_narrator_02',
            text: {
                en: 'Liu Hui sheltered the brothers in Dai. For a time, Liu Bei vanished from court ledgers, but not from the troubled roads of the Han.',
                zh: '刘恢遂留匿兄弟三人。刘备一时隐于朝廷簿书之外，却未离汉家乱路之中。'
            }
        },
        { type: 'command', action: 'move', id: 'liuhui', x: 320, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 340, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 370, y: 192, wait: false },
        { type: 'command', action: 'move', id: 'liubei', x: 400, y: 192, wait: true },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_hejin_gate': [
        { bg: 'luoyang_aerial_shot', type: 'command', action: 'fade', target: 0, speed: 0.001, wait: false },
        {
            type: 'title',
            text: { en: 'LUOYANG', zh: '洛阳' },
            subtext: { en: 'The Han Palace', zh: '汉宫' }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_narrator_01',
            position: 'top',
            text: {
                en: 'In the fourth month of Zhongping year six, Emperor Ling lay gravely ill.',
                zh: '中平六年四月，灵帝病笃。'
            }
        },
        { bg: 'imperial_chamber', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        {
            type: 'command',
            action: 'addProp',
            id: 'emperor_ling',
            imgKey: 'emperor_ling_deathbed',
            imgKeys: ['emperor_ling_deathbed', 'emperor_ling_deathbed02'],
            frameMs: 900,
            x: 92,
            y: 122,
            sortY: 154
        },
        { type: 'command', action: 'addActor', id: 'deathbed_eunuch_left', imgKey: 'priest', x: 102, y: 204, flip: true },
        { type: 'command', action: 'addActor', id: 'deathbed_eunuch_center', imgKey: 'priest', x: 126, y: 204 },
        { type: 'command', action: 'addActor', id: 'deathbed_eunuch_right', imgKey: 'priest', x: 150, y: 204 },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_narrator_02',
            position: 'top',
            text: {
                en: 'He summoned General-in-Chief He Jin to the palace to settle the matter of succession.',
                zh: '帝召大将军何进入宫，商议后事。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_narrator_03',
            position: 'top',
            text: {
                en: 'But Jian Shuo and the palace eunuchs had already made their counsel plain: if Prince Xie was to be enthroned, He Jin must first be killed.',
                zh: '蹇硕与宦官密议：若欲立皇子协，必先诛何进，以绝后患。'
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
        { type: 'command', action: 'wait', duration: 350 },
        { bg: 'luoyang_imperial_palace_gate', fg: 'luoyang_imperial_palace_gate_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'palace_traffic_soldier_01', imgKey: 'soldier', x: -34, y: 226, actorAction: 'walk', speed: 0.48, loopXStart: -58, loopXEnd: 292, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'palace_traffic_messenger_01', imgKey: 'xiaoer', x: 64, y: 230, actorAction: 'walk', speed: 0.58, loopXStart: -96, loopXEnd: 304, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'palace_traffic_soldier_02', imgKey: 'soldier', x: 152, y: 228, actorAction: 'walk', speed: 0.42, loopXStart: -130, loopXEnd: 298, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'gate_eunuch', imgKey: 'eunuch', x: 178, y: 185, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: -34, y: 214, actorAction: 'walk', speed: 0.72, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'hejin', x: 94, y: 214, wait: true },
        {
            type: 'dialogue',
            name: 'Palace Eunuch',
            portraitKey: 'eunuch',
            voiceId: 'ch2_hj_eunuch_01',
            position: 'top',
            text: {
                en: 'General-in-Chief He Jin, His Majesty awaits within.',
                zh: '大将军何进，陛下在宫中相候。'
            }
        },
        { type: 'command', action: 'addActor', id: 'panyin', imgKey: 'panyin', x: 292, y: 212, actorAction: 'walk', speed: 0.92, flip: true, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'panyin', x: 148, y: 212, wait: true },
        {
            type: 'dialogue',
            name: 'Pan Yin',
            portraitKey: 'panyin',
            voiceId: 'ch2_hj_panyin_01',
            position: 'top',
            text: {
                en: 'Do not enter the palace. Jian Shuo means to murder you.',
                zh: '不可入宫。蹇硕欲谋杀公。'
            }
        },
        {
            type: 'dialogue',
            name: 'He Jin',
            portraitKey: 'hejin',
            voiceId: 'ch2_hj_hejin_01',
            position: 'top',
            text: {
                en: 'Murder me? At the very gate?',
                zh: '谋杀我？就在宫门之前？'
            }
        },
        {
            type: 'choice',
            portraitKey: 'hejin',
            name: 'He Jin',
            options: [
                {
                    buttonText: { en: 'Return home.', zh: '急归私宅' },
                    text: {
                        en: 'I will not step blindly into Jian Shuo\'s knife. I return home and summon the ministers.',
                        zh: '我不入蹇硕之刃。即刻归宅，召集诸大臣。'
                    },
                    voiceId: 'ch2_hj_choice_return',
                    speaker: 'hejin',
                    result: [
                        {
                            type: 'command',
                            action: 'setStoryChoice',
                            key: 'hejin_gate_warning',
                            value: 'withdrew',
                            routeId: 'hejin'
                        },
                        {
                            type: 'dialogue',
                            name: 'Pan Yin',
                            portraitKey: 'panyin',
                            voiceId: 'ch2_hj_panyin_02',
                            position: 'top',
                            text: {
                                en: 'Go quickly. The palace walls have ears, and every ear belongs to the eunuchs.',
                                zh: '速去。宫墙有耳，而耳目皆属宦官。'
                            }
                        },
                        { type: 'command', action: 'move', id: 'panyin', x: 284, y: 212, wait: false },
                        { type: 'command', action: 'move', id: 'hejin', x: -36, y: 214, wait: true },
                        { type: 'command', action: 'removeActor', id: 'hejin' },
                        { type: 'command', action: 'removeActor', id: 'panyin' },
                        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
                    ]
                },
                {
                    buttonText: { en: 'Enter the palace.', zh: '径入宫门' },
                    text: {
                        en: 'I am General-in-Chief. Let Jian Shuo show his hand if he dares.',
                        zh: '我乃大将军。蹇硕若敢，便让他露出手来。'
                    },
                    voiceId: 'ch2_hj_choice_enter',
                    speaker: 'hejin',
                    result: [
                        {
                            type: 'dialogue',
                            name: 'Pan Yin',
                            portraitKey: 'panyin',
                            voiceId: 'ch2_hj_panyin_03',
                            position: 'top',
                            text: {
                                en: 'My lord, no. This is exactly what they want.',
                                zh: '公不可。此正中其计。'
                            }
                        },
                        { type: 'command', action: 'move', id: 'hejin', x: 147, y: 170, wait: true },
                        { type: 'command', action: 'setActorLayer', id: 'hejin', drawAboveForeground: false },
                        { type: 'command', action: 'addActor', id: 'guard_left', imgKey: 'palace_assassin', x: 92, y: 170, actorAction: 'walk', speed: 0.84 },
                        { type: 'command', action: 'addActor', id: 'guard_right', imgKey: 'palace_assassin', x: 232, y: 170, actorAction: 'walk', speed: 0.84, flip: true },
                        { type: 'command', action: 'move', id: 'guard_left', x: 132, y: 170, wait: false },
                        { type: 'command', action: 'move', id: 'guard_right', x: 162, y: 170, wait: true },
                        {
                            type: 'dialogue',
                            name: 'Palace Attendant',
                            portraitKey: 'palace_assassin',
                            voiceId: 'ch2_hj_guard_01',
                            position: 'top',
                            text: {
                                en: 'Seal the gate. Jian Shuo commands it.',
                                zh: '闭宫门。蹇硕有令。'
                            }
                        },
                        { type: 'command', action: 'animate', id: 'hejin', animation: 'hit', wait: false },
                        { type: 'command', action: 'playSound', key: 'unsheath_sword', volume: 0.8 },
                        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
                        {
                            type: 'title',
                            text: { en: 'BAD END', zh: '异史结局' },
                            subtext: { en: 'He Jin ignored the warning.', zh: '何进未听潘隐之言。' }
                        },
                        {
                            type: 'narrator',
                            voiceId: 'ch2_hj_narrator_bad_end',
                            text: {
                                en: 'This was not how the chronicle records it. Return to the palace gate.',
                                zh: '此非史书所载。重返宫门，再作抉择。'
                            }
                        },
                        { type: 'command', action: 'restartScript', scriptId: 'chapter2_hejin_gate' }
                    ]
                }
            ]
        }
    ],
    'chapter2_hejin_council': [
        { bg: 'luoyang_council_hall', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: 134, y: 202 },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_narrator_04',
            position: 'top',
            text: {
                en: 'Shaken, He Jin returned to his residence and summoned the ministers, intent on destroying the eunuchs.',
                zh: '何进大惊，急归私宅，召诸大臣，欲尽诛宦官。'
            }
        },
        { type: 'command', action: 'playSound', key: 'heavy_door_unlocking', volume: 0.75 },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: -24, y: 204, actorAction: 'walk', speed: 0.72 },
        { type: 'command', action: 'addActor', id: 'yuanshao', imgKey: 'yuanshao', x: 340, y: 204, actorAction: 'walk', speed: 0.72, flip: true },
        { type: 'command', action: 'addActor', id: 'minister', imgKey: 'soldier', x: 356, y: 208, actorAction: 'walk', speed: 0.66, flip: true },
        { type: 'command', action: 'move', id: 'caocao', x: 72, y: 204, wait: false },
        { type: 'command', action: 'move', id: 'yuanshao', x: 198, y: 204, wait: false },
        { type: 'command', action: 'move', id: 'minister', x: 236, y: 208, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_council_hj_01',
            position: 'top',
            text: {
                en: 'Jian Shuo set a blade for me at the palace gate. This poison has roots through the whole forbidden palace.',
                zh: '蹇硕在宫门设刃害我。此毒根已遍禁中。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_council_hj_02',
            position: 'top',
            text: {
                en: 'If the eunuchs can choose the emperor by murder, none of us serves the Han any longer.',
                zh: '宦官若能以杀人定储位，则我等皆非为汉效力。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_council_ys_01',
            position: 'top',
            text: {
                en: 'My lord, the matter is plain. Name the traitors, command the troops, and sweep the palace clean.',
                zh: '大将军，此事分明。列其奸名，发兵入宫，一扫而尽。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_council_cc_01',
            position: 'top',
            text: {
                en: 'The eunuchs have served inside the palace for generations. Their ears are in every curtain and corridor.',
                zh: '宦官世在禁中，帘幕廊庑之间，皆有其耳目。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_council_cc_02',
            position: 'top',
            text: {
                en: 'If this is to be done, it must be secret and exact. A broad shout of vengeance will ruin your whole clan.',
                zh: '若欲行事，须密而准。大张杀伐，必有灭族之祸。'
            }
        },
        {
            type: 'choice',
            portraitKey: 'hejin',
            name: 'He Jin',
            position: 'top',
            options: [
                {
                    buttonText: { en: 'Heed Cao Cao.', zh: '听曹操之言' },
                    voiceId: 'ch2_hj_council_hj_heed',
                    text: {
                        en: 'Your caution is sharp, Mengde. We will first learn who stands with Jian Shuo.',
                        zh: '孟德之慎，言中要害。先查明谁与蹇硕同党。'
                    },
                    speaker: 'hejin',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'hejin_cao_cao_trust', value: 'heeded', routeId: 'hejin' },
                        {
                            type: 'dialogue',
                            portraitKey: 'cao-cao',
                            name: 'Cao Cao',
                            voiceId: 'ch2_hj_council_cc_03',
                            position: 'top',
                            text: {
                                en: 'Then keep the circle small. A plan known by all ministers is already known by Zhang Rang.',
                                zh: '那便令知者少。诸臣皆知之计，张让亦已知之。'
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'yuan-shao',
                            name: 'Yuan Shao',
                            voiceId: 'ch2_hj_council_ys_02',
                            position: 'top',
                            text: {
                                en: 'Caution has its place, but delay fattens traitors.',
                                zh: '谨慎固然有用，迁延只会养肥奸贼。'
                            }
                        }
                    ]
                },
                {
                    buttonText: { en: 'Dismiss him.', zh: '斥其年少' },
                    voiceId: 'ch2_hj_council_hj_dismiss',
                    text: {
                        en: 'You are still young, Mengde. Do not dress fear as wisdom before the ministers.',
                        zh: '孟德年少，不可在众臣前以惧为智。'
                    },
                    speaker: 'hejin',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'hejin_cao_cao_trust', value: 'dismissed', routeId: 'hejin' },
                        {
                            type: 'dialogue',
                            portraitKey: 'cao-cao',
                            name: 'Cao Cao',
                            voiceId: 'ch2_hj_council_cc_04',
                            position: 'top',
                            text: {
                                en: 'Then I have spoken. May the walls be less talkative than men.',
                                zh: '操言尽于此。只愿宫墙不如人多口。'
                            }
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'yuan-shao',
                            name: 'Yuan Shao',
                            voiceId: 'ch2_hj_council_ys_03',
                            position: 'top',
                            text: {
                                en: 'The General-in-Chief sees clearly. Let force answer force.',
                                zh: '大将军明断。以兵制奸，正当其时。'
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_council_hj_03',
            position: 'top',
            text: {
                en: 'Before steel is drawn, the succession must be secured. Send watchers to the palace and wait for Pan Yin.',
                zh: '刀兵未动，先定储位。遣人守宫中消息，等潘隐再报。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_council_narrator_02',
            text: {
                en: 'Even as the ministers argued, the palace concealed Emperor Ling\'s death and prepared a forged summons.',
                zh: '诸臣议论未定，宫中已秘不发丧，并拟矫诏再召何进。'
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_hejin_secret_death': [
        { bg: 'luoyang_council_hall', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: 134, y: 202 },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: 72, y: 204 },
        { type: 'command', action: 'addActor', id: 'yuanshao', imgKey: 'yuanshao', x: 198, y: 204, flip: true },
        { type: 'command', action: 'addActor', id: 'panyin', imgKey: 'panyin', x: 340, y: 206, actorAction: 'walk', speed: 0.88, flip: true },
        { type: 'command', action: 'move', id: 'panyin', x: 236, y: 206, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'panyin',
            name: 'Pan Yin',
            voiceId: 'ch2_hj_death_panyin_01',
            position: 'top',
            text: {
                en: 'My lord, Emperor Ling is dead.',
                zh: '大将军，灵帝已崩。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'panyin',
            name: 'Pan Yin',
            voiceId: 'ch2_hj_death_panyin_02',
            position: 'top',
            text: {
                en: 'Jian Shuo and the Ten Attendants hide the mourning. They prepare a false edict to summon you in again.',
                zh: '蹇硕与十常侍秘不发丧，又拟矫诏再召公入宫。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'panyin',
            name: 'Pan Yin',
            voiceId: 'ch2_hj_death_panyin_03',
            position: 'top',
            text: {
                en: 'Their aim is to end you first, then enthrone Prince Xie.',
                zh: '其意先绝公之后患，再立皇子协。'
            }
        },
        { type: 'command', action: 'addActor', id: 'false_messenger', imgKey: 'eunuch', x: 340, y: 206, actorAction: 'walk', speed: 0.74, flip: true },
        { type: 'command', action: 'move', id: 'false_messenger', x: 270, y: 206, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'eunuch',
            name: 'Palace Messenger',
            voiceId: 'ch2_hj_death_eunuch_01',
            position: 'top',
            text: {
                en: 'By palace order: General-in-Chief He Jin is to enter at once and settle the late matter of succession.',
                zh: '宫中有命：请大将军速入，以定后事。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_death_cc_01',
            position: 'top',
            text: {
                en: 'There is the snare, dressed as command.',
                zh: '此便是罗网，却披作诏命。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_death_cc_02',
            position: 'top',
            text: {
                en: 'The first matter is to make the throne lawful. Set Prince Bian in place, then punish the traitors.',
                zh: '今日之计，先宜正君位，然后图贼。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_death_hj_01',
            position: 'top',
            text: {
                en: 'Who here dares enter with me, enthrone the heir, and cleanse the palace?',
                zh: '谁敢与吾入宫，正君讨贼，扫清朝廷？'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_death_ys_01',
            position: 'top',
            text: {
                en: 'I will borrow five thousand elite troops. We cut through the gates, enthrone the new lord, and kill the eunuchs.',
                zh: '愿借精兵五千，斩关入内，册立新君，尽诛阉竖。'
            }
        },
        {
            type: 'choice',
            portraitKey: 'hejin',
            name: 'He Jin',
            position: 'top',
            options: [
                {
                    buttonText: { en: 'Enter with discipline.', zh: '整军入宫' },
                    voiceId: 'ch2_hj_death_hj_discipline',
                    text: {
                        en: 'Take the troops, but keep them under command. We enter to secure the throne, not to loot the palace.',
                        zh: '可点兵入宫，但须严令约束。入宫为正君位，不为劫掠。'
                    },
                    speaker: 'hejin',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'hejin_palace_entry_tone', value: 'disciplined', routeId: 'hejin' },
                        {
                            type: 'dialogue',
                            portraitKey: 'cao-cao',
                            name: 'Cao Cao',
                            voiceId: 'ch2_hj_death_cc_03',
                            position: 'top',
                            text: {
                                en: 'Then speed and order may still serve you.',
                                zh: '如此，速与整尚可为公所用。'
                            }
                        }
                    ]
                },
                {
                    buttonText: { en: 'Show force openly.', zh: '张兵示威' },
                    voiceId: 'ch2_hj_death_hj_force',
                    text: {
                        en: 'Let the palace see our strength before it opens its mouth again.',
                        zh: '让宫中先见我兵威，再敢开口。'
                    },
                    speaker: 'hejin',
                    result: [
                        { type: 'command', action: 'setStoryChoice', key: 'hejin_palace_entry_tone', value: 'show_force', routeId: 'hejin' },
                        {
                            type: 'dialogue',
                            portraitKey: 'yuan-shao',
                            name: 'Yuan Shao',
                            voiceId: 'ch2_hj_death_ys_02',
                            position: 'top',
                            text: {
                                en: 'Good. Fear is the one court language the eunuchs understand.',
                                zh: '善。宦官所懂的朝廷话，正是畏惧二字。'
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_death_narrator_01',
            text: {
                en: 'He Jin chose Yuan Shao, gathered the imperial troops, and prepared to enter before Emperor Ling\'s coffin.',
                zh: '何进大喜，遂点御林军，欲引众臣入宫，于灵帝柩前扶立太子辩。'
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_hejin_enthronement': [
        { bg: 'luoyang_imperial_palace_gate', fg: 'luoyang_imperial_palace_gate_foreground', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_enthrone_narrator_01',
            position: 'top',
            text: {
                en: 'Yuan Shao borrowed five thousand imperial troops. He Yong, Xun You, Zheng Tai, and the ministers followed He Jin toward the palace.',
                zh: '袁绍借御林军五千，何颙、荀攸、郑泰等诸臣随何进入宫。'
            }
        },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: -36, y: 214, actorAction: 'walk', speed: 0.76, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'yuanshao', imgKey: 'yuanshao', x: -66, y: 214, actorAction: 'walk', speed: 0.74, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: -94, y: 214, actorAction: 'walk', speed: 0.72, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'minister', imgKey: 'zhoujing', x: -122, y: 214, actorAction: 'walk', speed: 0.7, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'troop_left', imgKey: 'soldier', x: -150, y: 218, actorAction: 'walk', speed: 0.68, drawAboveForeground: true },
        { type: 'command', action: 'addActor', id: 'troop_right', imgKey: 'soldier', x: -176, y: 218, actorAction: 'walk', speed: 0.68, drawAboveForeground: true },
        { type: 'command', action: 'move', id: 'hejin', x: 86, y: 214, wait: false },
        { type: 'command', action: 'move', id: 'yuanshao', x: 124, y: 214, wait: false },
        { type: 'command', action: 'move', id: 'caocao', x: 162, y: 214, wait: false },
        { type: 'command', action: 'move', id: 'minister', x: 202, y: 214, wait: false },
        { type: 'command', action: 'move', id: 'troop_left', x: 52, y: 218, wait: false },
        { type: 'command', action: 'move', id: 'troop_right', x: 240, y: 218, wait: true },
        {
            condition: HEJIN_ENTRY_DISCIPLINED,
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_enthrone_hj_disciplined_01',
            position: 'top',
            text: {
                en: 'No one breaks ranks. No one enters a chamber not named. We come to set the throne in order.',
                zh: '诸军不得乱行，不得擅入别殿。我等入宫，只为正君位。'
            }
        },
        {
            condition: HEJIN_ENTRY_SHOW_FORCE,
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_enthrone_ys_force_01',
            position: 'top',
            text: {
                en: 'Let every gate see the troops. If the eunuchs whisper, let them whisper behind spear-points.',
                zh: '让诸门都看见兵威。宦官若要低语，也叫他们对着枪尖低语。'
            }
        },
        {
            condition: HEJIN_CAO_CAO_HEEDED,
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_enthrone_cc_heeded_01',
            position: 'top',
            text: {
                en: 'The fewer doors we open, the fewer lies escape. Go straight to the coffin and the seals.',
                zh: '少开一门，便少漏一分奸计。直趋梓宫与玺绶。'
            }
        },
        {
            condition: HEJIN_CAO_CAO_DISMISSED,
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_enthrone_cc_dismissed_01',
            position: 'top',
            text: {
                en: 'If force must lead, then at least let purpose follow close behind it.',
                zh: '若兵威在前，至少让名义紧随其后。'
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },
        { bg: 'imperial_chamber', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        {
            type: 'command',
            action: 'addProp',
            id: 'emperor_ling_coffin',
            imgKey: 'emperor_ling_deathbed',
            imgKeys: ['emperor_ling_deathbed', 'emperor_ling_deathbed02'],
            frameMs: 1100,
            x: 92,
            y: 122,
            sortY: 154
        },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: 92, y: 206 },
        { type: 'command', action: 'addActor', id: 'liubian', imgKey: 'liubian', x: 146, y: 206 },
        { type: 'command', action: 'addActor', id: 'yuanshao', imgKey: 'yuanshao', x: 48, y: 208 },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: 214, y: 208, flip: true },
        { type: 'command', action: 'addActor', id: 'minister_left', imgKey: 'zhoujing', x: 22, y: 210 },
        { type: 'command', action: 'addActor', id: 'minister_right', imgKey: 'panyin', x: 242, y: 210, flip: true },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_enthrone_hj_01',
            position: 'top',
            text: {
                en: 'Before the late Emperor Ling, let Prince Bian receive the seals and mount the throne.',
                zh: '于灵帝梓宫之前，奉太子辩受玺绶，即皇帝位。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_enthrone_ys_01',
            position: 'top',
            text: {
                en: 'The new Son of Heaven is seated. Now every false order issued in the dark can be named treason.',
                zh: '新天子已立。暗中矫诏者，皆可名为逆贼。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_enthrone_narrator_02',
            text: {
                en: 'Prince Bian was enthroned as Emperor Shao. Empress He became Empress Dowager, and Prince Xie was made Prince of Chenliu.',
                zh: '太子辩即位，是为少帝。何后为皇太后，皇子协封陈留王。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_enthrone_narrator_03',
            text: {
                en: 'The throne was settled, but Jian Shuo still held forbidden troops and the palace corridors still answered to eunuch voices.',
                zh: '君位虽定，蹇硕仍握禁兵，宫中廊庑仍听宦官之声。'
            }
        },
        { type: 'command', action: 'setStoryChoice', key: 'hejin_succession_outcome', value: 'liubian_enthroned', routeId: 'hejin' },
        {
            condition: HEJIN_ENTRY_DISCIPLINED,
            type: 'command',
            action: 'setStoryChoice',
            key: 'hejin_legitimacy',
            value: 'orderly_enthronement',
            routeId: 'hejin'
        },
        {
            condition: HEJIN_ENTRY_SHOW_FORCE,
            type: 'command',
            action: 'setStoryChoice',
            key: 'hejin_legitimacy',
            value: 'forceful_enthronement',
            routeId: 'hejin'
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'chapter2_hejin_jian_shuo': [
        { bg: 'luoyang_imperial_garden_night', fg: null, type: 'command', action: 'clearActors' },
        { type: 'command', action: 'clearProps' },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_js_narrator_01',
            position: 'top',
            text: {
                en: 'With Emperor Shao enthroned, Yuan Shao moved at once to arrest Jian Shuo.',
                zh: '少帝既立，袁绍即引兵收蹇硕。'
            }
        },
        { type: 'command', action: 'addActor', id: 'yuanshao', imgKey: 'yuanshao', x: -32, y: 210, actorAction: 'walk', speed: 0.82 },
        { type: 'command', action: 'addActor', id: 'troop1', imgKey: 'soldier', x: -62, y: 214, actorAction: 'walk', speed: 0.78 },
        { type: 'command', action: 'addActor', id: 'troop2', imgKey: 'soldier', x: -88, y: 214, actorAction: 'walk', speed: 0.78 },
        { type: 'command', action: 'addActor', id: 'jianshuo', imgKey: 'eunuch_guard', x: 228, y: 210, flip: true },
        { type: 'command', action: 'addActor', id: 'guosheng', imgKey: 'eunuch', x: 260, y: 212, flip: true },
        { type: 'command', action: 'move', id: 'yuanshao', x: 82, y: 210, wait: false },
        { type: 'command', action: 'move', id: 'troop1', x: 46, y: 214, wait: false },
        { type: 'command', action: 'move', id: 'troop2', x: 112, y: 214, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_js_ys_01',
            position: 'top',
            text: {
                en: 'Jian Shuo plotted to murder the General-in-Chief and enthrone another prince by forged command. Seize him.',
                zh: '蹇硕矫诏谋杀大将军，欲别立皇子。拿下。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'eunuch-guard',
            name: 'Jian Shuo',
            voiceId: 'ch2_hj_js_jian_01',
            position: 'top',
            text: {
                en: 'Guards! To me! The palace troops answer to me!',
                zh: '护驾！都来！禁兵听我号令！'
            }
        },
        { type: 'command', action: 'move', id: 'jianshuo', x: 306, y: 210, wait: false },
        { type: 'command', action: 'move', id: 'guosheng', x: 230, y: 212, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'eunuch',
            name: 'Guo Sheng',
            voiceId: 'ch2_hj_js_guo_01',
            position: 'top',
            text: {
                en: 'You tried to drag us all into your murder. I will not die for your ambition.',
                zh: '你以私谋拖我等共死。我不为你的野心殉葬。'
            }
        },
        { type: 'command', action: 'move', id: 'guosheng', x: 286, y: 212, wait: true },
        { type: 'command', action: 'playSound', key: 'unsheath_sword', volume: 0.8 },
        { type: 'command', action: 'animate', id: 'jianshuo', animation: 'hit', wait: false },
        { type: 'command', action: 'wait', duration: 450 },
        { type: 'command', action: 'removeActor', id: 'jianshuo' },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_js_narrator_02',
            text: {
                en: 'Jian Shuo fled into the imperial garden and was killed by Guo Sheng. The troops under Jian Shuo submitted to He Jin.',
                zh: '蹇硕走入御园，为郭胜所杀。蹇硕所领禁兵，皆归何进。'
            }
        },
        {
            condition: HEJIN_ENTRY_DISCIPLINED,
            type: 'narrator',
            voiceId: 'ch2_hj_js_narrator_discipline_01',
            text: {
                en: 'Because He Jin had kept order at the gates, more palace soldiers surrendered their banners without panic.',
                zh: '因何进先前约束军伍，宫中兵士多安然解旗归命。'
            }
        },
        {
            condition: HEJIN_ENTRY_SHOW_FORCE,
            type: 'narrator',
            voiceId: 'ch2_hj_js_narrator_force_01',
            text: {
                en: 'Because He Jin had displayed force openly, the palace quieted quickly, but fear ran ahead of every messenger.',
                zh: '因何进张兵示威，宫中虽速静，惧声却先于使者传开。'
            }
        },
        { type: 'command', action: 'addActor', id: 'hejin', imgKey: 'hejin', x: 338, y: 210, actorAction: 'walk', speed: 0.74, flip: true },
        { type: 'command', action: 'addActor', id: 'caocao', imgKey: 'caocao', x: 366, y: 214, actorAction: 'walk', speed: 0.72, flip: true },
        { type: 'command', action: 'move', id: 'hejin', x: 168, y: 210, wait: false },
        { type: 'command', action: 'move', id: 'caocao', x: 204, y: 214, wait: true },
        {
            type: 'dialogue',
            portraitKey: 'yuan-shao',
            name: 'Yuan Shao',
            voiceId: 'ch2_hj_js_ys_02',
            position: 'top',
            text: {
                en: 'Jian Shuo is dead. The blade has found one root. Let it find the rest.',
                zh: '蹇硕已死。刀已断一根恶根，便当尽断其余。'
            }
        },
        {
            type: 'dialogue',
            portraitKey: 'hejin',
            name: 'He Jin',
            voiceId: 'ch2_hj_js_hj_01',
            position: 'top',
            text: {
                en: 'Jian Shuo plotted murder. Zhang Rang and Duan Gui still have the Empress Dowager\'s ear. We move by charge, not by fury.',
                zh: '蹇硕谋杀，罪在明处。张让、段珪仍得太后左右。行事须以罪名，不可以怒气。'
            }
        },
        {
            condition: HEJIN_CAO_CAO_HEEDED,
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_js_cc_heeded_01',
            position: 'top',
            text: {
                en: 'One traitor named and struck: that is power. A general cry against all eunuchs will turn power into smoke.',
                zh: '明其一罪而诛之，此为权。泛呼尽杀宦官，权势便化作烟。'
            }
        },
        {
            condition: HEJIN_CAO_CAO_DISMISSED,
            type: 'dialogue',
            portraitKey: 'cao-cao',
            name: 'Cao Cao',
            voiceId: 'ch2_hj_js_cc_dismissed_01',
            position: 'top',
            text: {
                en: 'The garden is quiet, but the inner palace is not. Victory over one eunuch is not mastery of the eunuchs.',
                zh: '御园已静，内宫未静。胜一宦官，并非制宦官。'
            }
        },
        {
            type: 'narrator',
            voiceId: 'ch2_hj_js_narrator_03',
            text: {
                en: 'He Jin now held the new emperor, Jian Shuo\'s troops, and a palace full of frightened enemies. Zhang Rang and Duan Gui remained.',
                zh: '何进手握新君、蹇硕禁兵，亦握住满宫惊惧之敌。张让、段珪等仍在。'
            }
        },
        { type: 'command', action: 'setStoryChoice', key: 'hejin_jian_shuo_outcome', value: 'killed_by_guo_sheng', routeId: 'hejin' },
        {
            condition: HEJIN_ENTRY_DISCIPLINED,
            type: 'command',
            action: 'setStoryChoice',
            key: 'hejin_eunuch_hostility',
            value: 'contained_after_jian_shuo',
            routeId: 'hejin'
        },
        {
            condition: HEJIN_ENTRY_SHOW_FORCE,
            type: 'command',
            action: 'setStoryChoice',
            key: 'hejin_eunuch_hostility',
            value: 'fearful_after_jian_shuo',
            routeId: 'hejin'
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'caocao_ch1_end_card': [
        { bg: 'black', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'fade', target: 0, speed: 0.0012 },
        {
            type: 'title',
            text: { en: 'CHAPTER ONE COMPLETE', zh: '第一章完成' },
            subtext: { en: 'Ascent Of The Cavalry Commander', zh: '骑都尉之崛起' },
            duration: 3200
        },
        {
            type: 'dialogue',
            portraitKey: 'narrator',
            voiceId: 'cc_ch1_end_01',
            text: {
                en: "At Yingchuan the routed rebels were cut and scattered. Cao Cao pressed north at once, and from this campaign his name began to spread.",
                zh: "颍川一役，败贼再遭截击，兵势益乱。曹操旋即北追，自此声名渐起。"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ]
    // Note: Guangzong scene is now handled inline in MapScene.startGuangzongBriefing()
    // following the novel where Lu Zhi was arrested and Liu Bei encounters Dong Zhuo
};

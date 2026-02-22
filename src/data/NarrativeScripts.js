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
                { id: 'to_map', text: { en: 'TO MAP', zh: '前往地图' }, position: 'left', advanceOnClick: true }
            ],
            clickableActors: {
                'zhoujing': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
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
                            portraitKey: 'soldier',
                            name: 'Guard',
                            position: 'top',
                            text: {
                                en: "Word is the main rebel host numbers in the tens of thousands. Staying in formation is our only chance.",
                                zh: "听说贼军有数万之众。我们唯有严守阵形，方有生机。"
                            }
                        }
                    ]
                },
                'guard2': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier',
                            name: 'Guard',
                            position: 'top',
                            text: {
                                en: "They paint \"Jiazi\" on their gates and call it Heaven's will. Steel will answer that lie.",
                                zh: "他们在门上写“甲子”，妄称天命。此等谎言，自当以兵刃破之。"
                            }
                        }
                    ]
                },
                'soldier3': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier',
                            name: 'Soldier',
                            position: 'top',
                            text: {
                                en: "I have never seen Zhuo this tense. Even the market folk are carrying spears now.",
                                zh: "涿县从未如此紧张，连集市百姓都在备矛守望。"
                            }
                        }
                    ]
                },
                'soldier4': {
                    onClick: [
                        {
                            type: 'dialogue',
                            portraitKey: 'soldier',
                            name: 'Soldier',
                            position: 'top',
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
                            portraitKey: 'soldier',
                            name: 'Volunteer',
                            position: 'top',
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
                            portraitKey: 'soldier',
                            name: 'Volunteer',
                            position: 'top',
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
        { type: 'command', action: 'addActor', id: 'messenger', imgKey: 'soldier', x: 230, y: 180, flip: true, speed: 2 },
        { type: 'command', action: 'addActor', id: 'zhoujing', imgKey: 'zhoujing', x: 180, y: 160, flip: true },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 60, y: 200 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 20, y: 210 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 100, y: 210 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'move', id: 'messenger', x: 140, y: 180 },
        {
            type: 'dialogue',
            portraitKey: 'soldier',
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
                    buttonText: { en: "I will go.", zh: "我去" },
                    text: {
                        en: "I will go. We cannot let the people of Qingzhou suffer.",
                        zh: "我去。我们不能让青州百姓受苦。"
                    },
                    voiceId: 'qz_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: { en: "We'll help.", zh: "立即支援" },
                    text: {
                        en: "The people cry out for aid. We must answer their call at once.",
                        zh: "百姓呼唤援助。我们必须立即响应他们的呼唤。"
                    },
                    voiceId: 'qz_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_zf_choice_01',
                            text: {
                                en: "That's the spirit, brother! Let's show those rebels what we're made of!",
                                zh: "好样的，兄长！让我们向那些叛军展示我们的实力！"
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
                    buttonText: { en: "To the gates.", zh: "回城门" },
                    text: {
                        en: "Let us not tarry. The city is still in peril. We must return to the gates and ensure the Imperial Protector is safe.",
                        zh: "我们不要耽搁。城池仍在危险中。我们必须返回城门，确保太守安全。"
                    },
                    voiceId: 'qz_vic_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: { en: "Victory.", zh: "乘胜回城" },
                    text: {
                        en: "A fine victory, but we must remain vigilant. The city gates await us.",
                        zh: "一场漂亮的胜利，但我们必须保持警惕。城门在等待我们。"
                    },
                    voiceId: 'qz_vic_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_vic_zf_choice_01',
                            text: {
                                en: "Right you are, eldest brother! Let's make sure the city is truly secure.",
                                zh: "你说得对，大哥！让我们确保城池真正安全。"
                            }
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
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
            portraitKey: 'custom-male-17',
            name: 'Protector Gong Jing',
            voiceId: 'qz_ret_gj_01',
            position: 'top',
            text: {
                en: "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered.",
                zh: "英勇的兄弟们！你们救了青州！当你们的信号在山谷中回响时，我们从城门冲出。叛军被我们夹击，全军覆没。"
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
                        zh: "我们很高兴能为您效力，太守。这里恢复了和平，但叛乱仍在其他地方肆虐。"
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
                            portraitKey: 'custom-male-17',
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
            portraitKey: 'custom-male-17',
            name: 'Protector Gong Jing',
            voiceId: 'qz_ret_gj_02',
            position: 'top',
            text: {
                en: "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
                zh: "确实。我听说卢植中郎将在广宗被叛军首领张角本人围困。"
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
                        portraitKey: 'farmer',
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
                        portraitKey: 'farmer2',
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
            ]
        },
        { type: 'command', action: 'flip', id: 'liubei', flip: true },
        { type: 'command', action: 'move', id: 'liubei', x: -50, y: 240, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: -50, y: 240 },
        { type: 'command', action: 'fade', target: 1, speed: 0.002 },
        
        // --- SWITCH TO INN ---
        { bg: 'inn', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 80, y: 200 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 120, y: 200, flip: true },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'recovery' },
        { type: 'command', action: 'animate', id: 'zhangfei', animation: 'recovery' },
        { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 180, flip: true },
        { type: 'command', action: 'animate', id: 'farmer', animation: 'recovery' },
        
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
            'farmer': {
                onClick: [
                    {
                        type: 'dialogue',
                        portraitKey: 'farmer',
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
            portraitKey: 'soldier',
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
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_02',
            text: {
                en: "Let us march! Our first destination: the headquarters of the local Magistrate.",
                zh: "让我们出发！我们的第一个目的地：当地县令的总部。"
            }
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
        { 
            type: 'title',
            text: {
                en: "CHAPTER ONE: THE VOLUNTEER ARMY",
                zh: "第一章：志愿军"
            },
            subtext: {
                en: "The Journey Begins",
                zh: "征程开始"
            },
            duration: 3000
        }
    ]
    // Note: Guangzong scene is now handled inline in MapScene.startGuangzongBriefing()
    // following the novel where Lu Zhi was arrested and Liu Bei encounters Dong Zhuo
};



export const NARRATIVE_SCRIPTS = {
    'intro_poem': [
        { bg: 'peach_garden', type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'wait', duration: 1000 },
        {
            type: 'narrator',
            text: "The world under heaven, long divided, must unite; long united, must divide.",
            voiceId: 'intro_narrator_01'
        },
        {
            type: 'narrator',
            text: "Four hundred years ago, the Han dynasty rose from the ashes of the Qin.",
            voiceId: 'intro_narrator_02a'
        },
        {
            type: 'narrator',
            text: "From Gaozu's founding to Guangwu's restoration, the empire stood strong.",
            voiceId: 'intro_narrator_02b'
        },
        {
            type: 'narrator',
            text: "But now, in the reign of Emperor Ling, the Han crumbles from within.",
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
            text: "The Ten Regular Attendants—eunuchs who have wormed their way into the emperor's favor—corrupt the court.",
            voiceId: 'intro_narrator_03a'
        },
        {
            type: 'narrator',
            text: "They silence honest ministers, plunder the treasury, and rule through fear.",
            voiceId: 'intro_narrator_03b'
        },
        {
            type: 'narrator',
            text: "The people suffer while the palace grows fat.",
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
            text: "In this chaos, three brothers from Julu County see their chance.",
            voiceId: 'intro_narrator_04a'
        },
        { type: 'command', action: 'addActor', id: 'zhangjue', imgKey: 'zhangjiao', x: 100, y: 140 },
        { type: 'command', action: 'wait', duration: 300 },
        { type: 'command', action: 'addActor', id: 'zhangbao', imgKey: 'zhangbao', x: 120, y: 140 },
        { type: 'command', action: 'wait', duration: 300 },
        { type: 'command', action: 'addActor', id: 'zhangliang', imgKey: 'zhangliang', x: 140, y: 140 },
        {
            type: 'narrator',
            text: "Zhang Jue, a failed scholar, claims to have received divine teachings.",
            voiceId: 'intro_narrator_04b'
        },
        {
            type: 'narrator',
            text: "He heals the sick, gathers followers, and whispers: 'The Blue Heaven is dead. The Yellow Heaven shall rise.'",
            voiceId: 'intro_narrator_04c'
        },
        { type: 'command', action: 'removeActor', id: 'zhangjue' },
        { type: 'command', action: 'removeActor', id: 'zhangbao' },
        { type: 'command', action: 'removeActor', id: 'zhangliang' },
        {
            type: 'narrator',
            text: "With half a million followers bound in yellow scarves, the Zhang brothers prepare to strike.",
            voiceId: 'intro_narrator_05a'
        },
        {
            type: 'narrator',
            text: "The rebellion begins.",
            voiceId: 'intro_narrator_05b'
        },
        {
            type: 'narrator',
            text: "The age of the Han draws to its end.",
            voiceId: 'intro_narrator_05c'
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 }
    ],
    'magistrate_briefing': [
        { type: 'title', text: "THE VOLUNTEER ARMY", subtext: "Zhuo County Headquarters", duration: 3000 },
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
            text: "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            voiceId: 'daxing_lb_01',
            text: "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            voiceId: 'daxing_lb_02',
            text: "We have raised a force of five hundred volunteers to serve our country and protect the people."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "For justice. We cannot stand idle.",
                    text: "The people cry out for justice. We cannot stand idle.",
                    voiceId: 'daxing_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_02',
                            text: "An Imperial kinsman with a true heart! Truly, the Heavens have not abandoned the Han. Your arrival is most timely."
                        }
                    ]
                },
                { 
                    buttonText: "We seek glory in service to the Han.",
                    text: "We seek glory in service to the Han.",
                    voiceId: 'daxing_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_02_alt',
                            text: "An Imperial kinsman! Your ambition serves the Han well. Your arrival is most timely."
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
            text: "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            name: 'Zhang Fei',
            position: 'top',
            voiceId: 'daxing_zf_01',
            text: "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!"
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            position: 'top',
            voiceId: 'daxing_gy_01',
            text: "Third brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "Lead us to Daxing District.",
                    text: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion.",
                    voiceId: 'daxing_lb_03',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_04',
                            text: "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!"
                        }
                    ]
                },
                { 
                    buttonText: "We three alone could handle them!",
                    text: "Fifty thousand rebels? We three alone could handle them!",
                    voiceId: 'daxing_lb_choice_03',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'daxing_gy_choice_01',
                            text: "Brother, your courage is admirable, but even heroes need strategy. Let us work with the magistrate."
                        },
                        {
                            type: 'dialogue',
                            portraitKey: 'zhou-jing',
                            name: 'Zhou Jing',
                            position: 'top',
                            voiceId: 'daxing_zj_04',
                            text: "Your confidence is inspiring! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!"
                        }
                    ]
                }
            ]
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
            text: "URGENT! Imperial Protector Gong Jing of Qingzhou Region is under siege! The city is near falling!"
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "I will go. We cannot let them suffer.",
                    text: "I will go. We cannot let the people of Qingzhou suffer.",
                    voiceId: 'qz_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "We must answer their call at once.",
                    text: "The people cry out for aid. We must answer their call at once.",
                    voiceId: 'qz_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_zf_choice_01',
                            text: "That's the spirit, brother! Let's show those rebels what we're made of!"
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
            text: "I shall reinforce you with five thousand of my best soldiers. March at once!"
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
            text: "Look at them run! Like rats from a sinking ship! We've broken their spirit."
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            name: 'Guan Yu',
            voiceId: 'qz_vic_gy_01',
            position: 'top',
            text: "A well-executed trap, Brother. The high ground served us well."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "Return to the gates. The city is still in peril.",
                    text: "Let us not tarry. The city is still in peril. We must return to the gates and ensure the Imperial Protector is safe.",
                    voiceId: 'qz_vic_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "A fine victory, but we must remain vigilant.",
                    text: "A fine victory, but we must remain vigilant. The city gates await us.",
                    voiceId: 'qz_vic_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            name: 'Zhang Fei',
                            position: 'top',
                            voiceId: 'qz_vic_zf_choice_01',
                            text: "Right you are, eldest brother! Let's make sure the city is truly secure."
                        }
                    ]
                }
            ]
        },
        {
            type: 'dialogue',
            portraitKey: 'narrator',
            voiceId: 'qz_vic_nar_01',
            text: "Though fierce as tigers soldiers be, Battles are won by strategy.\nA hero comes; he gains renown, Already destined for a crown."
        }
    ],
    'qingzhou_gate_return': [
        {
            type: 'dialogue',
            portraitKey: 'custom-male-17',
            name: 'Protector Gong Jing',
            voiceId: 'qz_ret_gj_01',
            position: 'top',
            text: "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "Peace is restored here, but the rebellion rages elsewhere.",
                    text: "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere.",
                    voiceId: 'qz_ret_lb_01',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "It was an honor to serve.",
                    text: "It was an honor to serve. The people of Qingzhou can rest easy now.",
                    voiceId: 'qz_ret_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'custom-male-17',
                            name: 'Protector Gong Jing',
                            position: 'top',
                            voiceId: 'qz_ret_gj_choice_01',
                            text: "Your humility does you credit, but your deeds speak louder than words."
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
            text: "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "He was my teacher. We march for Guangzong!",
                    text: "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!",
                    voiceId: 'qz_ret_lb_02',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "We cannot abandon a loyal servant of the Han.",
                    text: "Commander Lu Zhi needs aid. We cannot abandon a loyal servant of the Han.",
                    voiceId: 'qz_ret_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'qz_ret_gy_choice_01',
                            text: "A noble cause, brother. We stand with you."
                        }
                    ]
                }
            ]
        }
    ],
    'noticeboard': [
        { 
            type: 'title',
            text: "ZHUO COUNTY",
            subtext: "Year 184"
        },
        { type: 'command', action: 'fade', target: 0, speed: 0.002 },
        { type: 'command', action: 'addActor', id: 'farmer', imgKey: 'farmer', x: 200, y: 200, speed: 0.5 },
        { type: 'command', action: 'addActor', id: 'farmer2', imgKey: 'farmer2', x: 50, y: 185, flip: true, speed: 0.4 },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -50, y: 210, speed: 1 },
        { bg: 'noticeboard', type: 'command', action: 'move', id: 'liubei', x: 160, y: 210 },
        { type: 'command', action: 'flip', id: 'liubei', flip: true },
        { type: 'command', action: 'move', id: 'farmer', x: 220, y: 195 },
        { type: 'command', action: 'move', id: 'farmer2', x: 20, y: 180 },
        
        {
            type: 'dialogue',
            name: 'The Noticeboard',
            position: 'top',
            portraitKey: 'noticeboard',
            portraitRect: { x: 80, y: 100, w: 90, h: 70 },
            voiceId: 'pro_nb_01',
            text: "NOTICE: The Yellow Turban rebels under Zhang Jue have risen!"
        },
        {
            type: 'dialogue',
            name: 'The Noticeboard',
            position: 'top',
            portraitKey: 'noticeboard',
            portraitRect: { x: 80, y: 100, w: 90, h: 70 },
            voiceId: 'pro_nb_02',
            text: "All able-bodied men are called to defend the Han."
        },
        {
            type: 'dialogue',
            name: 'The Noticeboard',
            position: 'top',
            portraitKey: 'noticeboard',
            portraitRect: { x: 80, y: 100, w: 90, h: 70 },
            voiceId: 'pro_nb_03',
            text: "Report to the local Magistrate at once."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_01',
            text: "The Imperial Clan's blood flows in my veins..."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_02',
            text: "...yet I am but a poor straw-shoe seller."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_03',
            text: "How can I possibly save the people from this chaos?"
        },
        
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 300, y: 240, flip: true, speed: 1.5 },
        { type: 'command', action: 'move', id: 'zhangfei', x: 190, y: 240 },
        
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: '???',
            voiceId: 'pro_zf_01',
            text: "Why sigh, O hero, if you do not help your country?"
        },
        { type: 'command', action: 'flip', id: 'liubei', flip: false },
        { type: 'command', action: 'animate', id: 'liubei', animation: 'hit', wait: true },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "For the suffering people.",
                    text: "I sigh for the suffering people.",
                    voiceId: 'pro_lb_choice_01',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: '???',
                            voiceId: 'pro_zf_02',
                            text: "A true hero's heart! You and I are of one mind."
                        }
                    ]
                },
                { 
                    buttonText: "For my own lost status.",
                    text: "I sigh for my own lost status.",
                    voiceId: 'pro_lb_choice_02',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'zhang-fei',
                            position: 'top',
                            name: '???',
                            voiceId: 'pro_zf_03',
                            text: "Status? Bah! In these times of chaos, only courage and wine matter!"
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
            text: "I am Zhang Fei, aka Yide."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_05',
            text: "I live in this county, where I have a farm. I sell wine and slaughter hogs."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_04',
            text: "I am of the Imperial Clan. My name is Liu Bei."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_05',
            text: "I wish I could destroy these rebels and restore peace..."
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
            text: "I have some wealth! I am willing to use it to recruit volunteers."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_07',
            text: "What say you to that?"
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pro_lb_06',
            text: "That would be a great blessing for the people!"
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pro_zf_08',
            text: "Then come! Let us go to the village inn and discuss our plans over wine."
        },
        { type: 'prompt', text: 'TO INN', position: 'left' },
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
        
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_01',
            text: "This wine is good! Together, we shall raise an army that will make the rebels tremble."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'inn_lb_01',
            text: "Indeed. Honor and duty call us."
        },
        
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 300, y: 210, flip: true, speed: 1 },
        { type: 'command', action: 'move', id: 'guanyu', x: 180, y: 210 },
        
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: '???',
            voiceId: 'inn_gy_01',
            text: "Quick! Bring me wine! I am in a hurry to get to town and join the volunteers!"
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
            text: "That man... his presence is extraordinary. Look at his majestic beard and phoenix-like eyes."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_02',
            text: "Hey! You there! You're joining the volunteers too? Come, drink with us!"
        },
        { type: 'command', action: 'move', id: 'guanyu', x: 140, y: 195 },
        { type: 'command', action: 'animate', id: 'guanyu', animation: 'recovery' },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_02',
            text: "I am Guan Yu, courtesy name Yunchang. For years I have been a fugitive, for I slew a local bully who oppressed the weak."
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_03',
            text: "Now I hear there is a call for volunteers, and I have come to join the cause."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "A noble heart! We have agreed to raise an army ourselves.",
                    text: "A noble heart! I am Liu Bei, and this is Zhang Fei. We have just agreed to raise a volunteer army ourselves.",
                    voiceId: 'inn_lb_03',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "Join us, and together we shall serve the Han.",
                    text: "Your cause is just. Join us, and together we shall serve the Han.",
                    voiceId: 'inn_lb_choice_01',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'inn_gy_choice_01',
                            text: "Your words ring true. I would be honored to join your cause."
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
            text: "Haha! The more the merrier! Drink, Yunchang! Let us toast to our new brotherhood!"
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
            text: "...and that is why the pig escaped! Haha! But seriously, my friends..."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_05',
            text: "I feel as though I have known you both for a lifetime."
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_04',
            text: "The heavens have surely brought us together. We share one mind and one purpose."
        },
        {
            type: 'choice',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            options: [
                { 
                    buttonText: "To restore the Han and bring peace. That is our shared destiny.",
                    text: "To restore the Han and bring peace to the common people. That is our shared destiny.",
                    voiceId: 'inn_lb_04',
                    speaker: 'liubei',
                    result: []
                },
                { 
                    buttonText: "We fight not for glory, but for the people.",
                    text: "We fight not for glory, but for the people who suffer under this chaos.",
                    voiceId: 'inn_lb_choice_02',
                    speaker: 'liubei',
                    result: [
                        {
                            type: 'dialogue',
                            portraitKey: 'guan-yu',
                            name: 'Guan Yu',
                            position: 'top',
                            voiceId: 'inn_gy_choice_02',
                            text: "Spoken like a true leader. The people need men like you."
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
            text: "Listen! Behind my farm is a peach garden. The flowers are in full bloom."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'inn_zf_07',
            text: "Tomorrow, let us offer sacrifices there and swear to be brothers! To live and die as one!"
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'inn_lb_05',
            text: "An excellent proposal. We shall do it!"
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'inn_gy_05',
            text: "I agree. We swear by the peach garden."
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
        
        // --- THE PEACH GARDEN OATH ---
        { 
            type: 'title',
            text: "THE PEACH GARDEN OATH",
            subtext: "The Next Morning",
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
            text: "In the peach garden, among the blooming flowers, a black ox and a white horse are sacrificed.",
            voiceId: 'pg_nar_01'
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_01',
            text: "We three, Liu Bei, Guan Yu, and Zhang Fei, though of different lineages, swear brotherhood and promise mutual help to one end."
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'pg_gy_01',
            text: "We will rescue each other in difficulty; we will aid each other in danger."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'pg_zf_01',
            text: "We swear to serve the state and save the people."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_02',
            text: "We ask not the same day of birth, but we seek to die together on the same day."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_03',
            text: "May the Heaven and the Earth read our hearts. If we turn aside from righteousness, may the Heaven and the Human smite us!"
        },
        {
            type: 'narrator',
            text: "The ritual complete, Liu Bei is acknowledged as the eldest brother, Guan Yu the second, and Zhang Fei the youngest.",
            voiceId: 'pg_nar_02'
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'pg_lb_04',
            text: "The path ahead is long and full of peril, but together, we shall restore the Han!"
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.001 },

        // --- RECRUITING AT THE NOTICEBOARD ---
        { bg: 'noticeboard', type: 'command', action: 'clearActors' },
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 100, y: 210 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 60, y: 210 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 140, y: 210 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },

        {
            type: 'dialogue',
            portraitKey: 'zhang-fei',
            position: 'top',
            name: 'Zhang Fei',
            voiceId: 'rec_zf_01',
            text: "CITIZENS OF ZHUO! The Yellow Turbans are coming! Who among you is brave enough to fight for your homes?"
        },
        {
            type: 'dialogue',
            portraitKey: 'guan-yu',
            position: 'top',
            name: 'Guan Yu',
            voiceId: 'rec_gy_01',
            text: "We offer no riches, only the chance to serve with honor under the banner of the Imperial Uncle, Liu Bei."
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
            text: "We have heard of your brotherhood! We are but simple men, but we will follow you to the death!"
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_01',
            text: "Welcome, brothers. Today we are but a few, but tomorrow we shall be an army."
        },
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            position: 'top',
            name: 'Liu Bei',
            voiceId: 'rec_lb_02',
            text: "Let us march! Our first destination: the headquarters of the local Magistrate."
        },
        { type: 'command', action: 'fade', target: 1, speed: 0.0005 },
        { 
            type: 'title',
            text: "CHAPTER ONE: THE VOLUNTEER ARMY",
            subtext: "The Journey Begins",
            duration: 3000
        }
    ]
    // Note: Guangzong scene is now handled inline in MapScene.startGuangzongBriefing()
    // following the novel where Lu Zhi was arrested and Liu Bei encounters Dong Zhuo
};



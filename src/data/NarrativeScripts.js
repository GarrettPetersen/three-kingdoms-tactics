export const NARRATIVE_SCRIPTS = {
    'intro_poem': [
        { bg: 'peach_garden', type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'wait', duration: 1000 },
        {
            type: 'narrator',
            text: "The world under heaven, long divided, must unite; long united, must divide.",
            voiceId: 'intro_narrator_01'
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
        { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: -40, y: 240, speed: 1 },
        { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: -80, y: 250, speed: 1 },
        { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: -120, y: 255, speed: 1 },
        { type: 'command', action: 'fade', target: 0, speed: 0.001 },
        { type: 'command', action: 'move', id: 'liubei', x: 100, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'guanyu', x: 65, y: 190, wait: false },
        { type: 'command', action: 'move', id: 'zhangfei', x: 135, y: 190, wait: false },
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
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhou Jing',
            position: 'top',
            voiceId: 'daxing_zj_02',
            text: "An Imperial kinsman! Truly, the Heavens have not abandoned the Han. Your arrival is most timely."
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
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            position: 'top',
            voiceId: 'daxing_lb_03',
            text: "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion."
        },
        {
            type: 'dialogue',
            portraitKey: 'zhou-jing',
            name: 'Zhou Jing',
            position: 'top',
            voiceId: 'daxing_zj_04',
            text: "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!"
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
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'qz_vic_lb_01',
            position: 'top',
            text: "Let us not tarry. The city is still in peril. We must return to the gates and ensure the Imperial Protector is safe."
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
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'qz_ret_lb_01',
            position: 'top',
            text: "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere."
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
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            voiceId: 'qz_ret_lb_02',
            position: 'top',
            text: "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!"
        }
    ]
    // Note: Guangzong scene is now handled inline in MapScene.startGuangzongBriefing()
    // following the novel where Lu Zhi was arrested and Liu Bei encounters Dong Zhuo
};



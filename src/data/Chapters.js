export const CHAPTERS = {
    1: {
        id: 1,
        title: "The Oath in the Peach Garden",
        routes: {
            liubei: {
                id: 'liubei',
                title: 'The Oath in the Peach Garden'
            },
            caocao: {
                id: 'caocao',
                title: 'Ascent of the Cavalry Commander'
            }
        },
        scenes: [
            { id: 'prologue', type: 'narrative', scriptId: 'prologue' },
            { id: 'magistrate_briefing', type: 'narrative', scriptId: 'magistrate_briefing' },
            { id: 'daxing', type: 'battle', battleId: 'daxing' },
            { id: 'victory_daxing', type: 'narrative', scriptId: 'victory_daxing' },
            { id: 'qingzhou_prelude', type: 'battle', battleId: 'qingzhou_prelude' },
            { id: 'qingzhou_siege', type: 'battle', battleId: 'qingzhou_siege' },
            { id: 'guangzong_camp', type: 'battle', battleId: 'guangzong_camp' },
            { id: 'yingchuan_aftermath', type: 'battle', battleId: 'yingchuan_aftermath' },
            { id: 'guangzong_encounter', type: 'battle', battleId: 'guangzong_encounter' }
        ]
    },
    2: {
        id: 2,
        title: "Brothers Against the Tide",
        routes: {
            oath: {
                id: 'chapter2_oath',
                title: 'Brothers Against the Tide',
                scenes: [
                    { id: 'chapter2_oath_dongzhuo_choice', type: 'battle', battleId: 'chapter2_oath_dongzhuo_choice' }
                ]
            }
        }
    }
};



import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { ANIMATIONS, IS_DEMO } from '../core/Constants.js';
import { CHAPTERS } from '../data/Chapters.js';
import { getLocalizedText, LANGUAGE, getFontForLanguage, getTextContainerSize } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';
import { launchStoryNode } from '../core/StoryFlow.js';
import { createDemoWishlistCard } from '../data/DemoEndCard.js';

const CHAPTER2_ROUTE_ID = 'chapter2_oath';
const CHAPTER2_LEGACY_ROUTE_ID = 'liubei';

function hasChapter2Node(gs, nodeId) {
    return gs.hasReachedStoryNode(nodeId, CHAPTER2_ROUTE_ID)
        || gs.hasMilestone(nodeId, CHAPTER2_ROUTE_ID)
        || gs.hasReachedStoryNode(nodeId, CHAPTER2_LEGACY_ROUTE_ID)
        || gs.hasMilestone(nodeId, CHAPTER2_LEGACY_ROUTE_ID);
}

function hasCompletedChapter2Node(gs, nodeId) {
    return gs.hasCompletedStoryNode(nodeId, CHAPTER2_ROUTE_ID)
        || gs.hasCompletedStoryNode(nodeId, CHAPTER2_LEGACY_ROUTE_ID);
}

function hasChapter2Choice(gs, choiceId) {
    return gs.getStoryChoice(choiceId, null, CHAPTER2_ROUTE_ID) != null
        || gs.getStoryChoice(choiceId, null, CHAPTER2_LEGACY_ROUTE_ID) != null;
}

// Locations and reminders will eventually be moved to CHAPTERS data
const LIUBEI_LOCATIONS = {
    magistrate: {
        id: 'magistrate',
        x: 182,
        y: 85,
        name: 'Magistrate Zhou Jing',
        imgKey: 'camp_tent',
        battleId: 'daxing',
        // With the legacy Zhuo-start scene removed, magistrate is the first actionable map objective.
        unlockCondition: (gs) => !(gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')),
        isCompleted: (gs) => gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')
    },
    magistrate_return: {
        id: 'magistrate_return',
        x: 182,
        y: 85,
        name: 'Magistrate Zhou Jing',
        imgKey: 'camp_tent',
        battleId: 'qingzhou_cleanup',
        // After Qingzhou siege, the player should return here for the follow-up scene.
        unlockCondition: (gs) =>
            (gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')) &&
            !(gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')),
        isCompleted: (gs) => gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')
    },
    qingzhou: {
        id: 'qingzhou',
        x: 220,
        y: 95,
        name: 'Qingzhou Region',
        imgKey: 'city',
        battleId: 'qingzhou_siege',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')) && !(gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')),
        isCompleted: (gs) => gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')
    },
    guangzong: {
        id: 'guangzong',
        x: 205,
        y: 55,
        name: 'Guangzong Region',
        imgKey: 'camp_tent',
        battleId: 'guangzong_camp',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')) && !(gs.hasReachedStoryNode('guangzong_camp', 'liubei') || gs.hasMilestone('guangzong_camp')),
        isCompleted: (gs) => gs.hasReachedStoryNode('guangzong_camp', 'liubei') || gs.hasMilestone('guangzong_camp')
    },
    yingchuan: {
        id: 'yingchuan',
        x: 188,
        y: 92,
        name: 'Yingchuan Region',
        imgKey: 'city',
        battleId: 'yingchuan_aftermath',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('guangzong_camp', 'liubei') || gs.hasMilestone('guangzong_camp')) && !(gs.hasReachedStoryNode('yingchuan_aftermath', 'liubei') || gs.hasMilestone('yingchuan_aftermath')),
        isCompleted: (gs) => gs.hasReachedStoryNode('yingchuan_aftermath', 'liubei') || gs.hasMilestone('yingchuan_aftermath')
    },
    guangzong_return: {
        id: 'guangzong_return',
        x: 205,
        y: 55,
        name: 'Guangzong Road',
        imgKey: 'camp_tent',
        battleId: 'guangzong_encounter',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('yingchuan_aftermath', 'liubei') || gs.hasMilestone('yingchuan_aftermath')) && !(gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')),
        isCompleted: (gs) => gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')
    },
    zhuo_county: {
        id: 'zhuo_county',
        x: 190,
        y: 70,
        name: 'Zhuo County',
        imgKey: 'hut',
        battleId: 'zhuo_return',
        unlockCondition: (gs) => (gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')) && !(gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('chapter1_complete')),
        isCompleted: (gs) => gs.hasReachedStoryNode('dongzhuo_battle', 'liubei') || gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('dongzhuo_battle') || gs.hasMilestone('chapter1_complete')
    },
    chapter2_zhujun_camp: {
        id: 'chapter2_zhujun_camp',
        x: 188,
        y: 92,
        name: 'Yingchuan - Zhu Jun Camp',
        imgKey: 'camp_tent',
        battleId: 'chapter2_zhujun_camp',
        unlockCondition: (gs) =>
            (
                gs.getStoryCursor(CHAPTER2_ROUTE_ID).nodeId === 'chapter2_zhujun_camp'
                || gs.getStoryCursor(CHAPTER2_LEGACY_ROUTE_ID).nodeId === 'chapter2_zhujun_camp'
                || hasChapter2Choice(gs, 'chapter2_oath_dongzhuo_choice')
                || gs.hasMilestone('chapter2_oath_dongzhuo_restrained')
                || gs.hasMilestone('chapter2_oath_dongzhuo_fought')
                || hasChapter2Node(gs, 'chapter2_oath_dongzhuo_choice')
            ) && !(
                hasCompletedChapter2Node(gs, 'chapter2_zhujun_camp')
            ),
        isCompleted: (gs) =>
            hasCompletedChapter2Node(gs, 'chapter2_zhujun_camp')
    },
    chapter2_wan_strategy: {
        id: 'chapter2_wan_strategy',
        x: 181,
        y: 120,
        name: 'Wan',
        imgKey: 'city',
        storyRouteId: CHAPTER2_ROUTE_ID,
        storyNodeId: 'chapter2_wan_strategy',
        unlockCondition: (gs) =>
            (
                gs.getStoryCursor(CHAPTER2_ROUTE_ID).nodeId === 'chapter2_wan_strategy'
                || gs.getStoryCursor(CHAPTER2_LEGACY_ROUTE_ID).nodeId === 'chapter2_wan_strategy'
                || hasChapter2Node(gs, 'chapter2_wan_strategy')
            ) && !hasCompletedChapter2Node(gs, 'chapter2_wan_strategy'),
        isCompleted: (gs) =>
            hasCompletedChapter2Node(gs, 'chapter2_wan_strategy')
    },
    chapter2_luoyang: {
        id: 'chapter2_luoyang',
        x: 154,
        y: 84,
        name: 'Luoyang',
        imgKey: 'city',
        storyRouteId: CHAPTER2_ROUTE_ID,
        storyNodeId: 'chapter2_anxi_appointment',
        unlockCondition: (gs) =>
            (
                gs.getStoryCursor(CHAPTER2_ROUTE_ID).nodeId === 'chapter2_anxi_appointment'
                || gs.getStoryCursor(CHAPTER2_LEGACY_ROUTE_ID).nodeId === 'chapter2_anxi_appointment'
                || hasChapter2Node(gs, 'chapter2_anxi_appointment')
            ) && !hasCompletedChapter2Node(gs, 'chapter2_anxi_appointment'),
        isCompleted: (gs) =>
            hasCompletedChapter2Node(gs, 'chapter2_anxi_appointment')
    },
    chapter2_anxi_governance: {
        id: 'chapter2_anxi_governance',
        x: 176,
        y: 77,
        name: 'Anxi County',
        imgKey: 'city',
        storyRouteId: CHAPTER2_ROUTE_ID,
        storyNodeId: 'chapter2_anxi_governance',
        unlockCondition: (gs) =>
            (
                gs.getStoryCursor(CHAPTER2_ROUTE_ID).nodeId === 'chapter2_anxi_governance'
                || gs.getStoryCursor(CHAPTER2_LEGACY_ROUTE_ID).nodeId === 'chapter2_anxi_governance'
                || hasChapter2Node(gs, 'chapter2_anxi_governance')
            ) && !hasCompletedChapter2Node(gs, 'chapter2_anxi_governance'),
        isCompleted: (gs) =>
            hasCompletedChapter2Node(gs, 'chapter2_anxi_governance')
    },
    chapter2_liuhui_shelter: {
        id: 'chapter2_liuhui_shelter',
        x: 171,
        y: 44,
        name: "Liu Hui's Residence",
        imgKey: 'city',
        storyRouteId: CHAPTER2_ROUTE_ID,
        storyNodeId: 'chapter2_liuhui_shelter',
        unlockCondition: (gs) =>
            (
                gs.getStoryCursor(CHAPTER2_ROUTE_ID).nodeId === 'chapter2_liuhui_shelter'
                || gs.getStoryCursor(CHAPTER2_LEGACY_ROUTE_ID).nodeId === 'chapter2_liuhui_shelter'
                || hasChapter2Node(gs, 'chapter2_liuhui_shelter')
            ) && !hasCompletedChapter2Node(gs, 'chapter2_liuhui_shelter'),
        isCompleted: (gs) =>
            hasCompletedChapter2Node(gs, 'chapter2_liuhui_shelter')
    }
};

const CAOCAO_LOCATIONS = {
    caocao_yingchuan: {
        id: 'caocao_yingchuan',
        x: 188,
        y: 92,
        name: 'Yingchuan Region',
        imgKey: 'city',
        battleId: 'caocao_yingchuan_intercept',
        unlockCondition: (gs) =>
            (gs.hasReachedStoryNode('caocao_intro_complete', 'caocao') || gs.hasMilestone('caocao_intro_complete')) &&
            !(gs.hasReachedStoryNode('caocao_yingchuan_intercept', 'caocao') || gs.hasMilestone('caocao_yingchuan_intercept')),
        isCompleted: (gs) =>
            gs.hasReachedStoryNode('caocao_yingchuan_intercept', 'caocao') ||
            gs.hasReachedStoryNode('caocao_chapter1_complete', 'caocao') ||
            gs.hasMilestone('caocao_yingchuan_intercept') ||
            gs.hasMilestone('caocao_chapter1_complete')
    }
};

const STORY_EVENTS = {
    'defeat': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_defeat',
        text: { en: "We were overwhelmed! We must regroup and strike again.", zh: "我们被击溃了！我们必须重整旗鼓，再次出击。" }
    },
    'qingzhou_siege': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'qz_victory_lb_01',
        text: { en: "The siege is lifted. We should report back to Magistrate Zhou Jing for our next assignment.", zh: "围城已解。我们应该向邹靖县令报告，接受下一个任务。" }
    },
    'chapter2_to_zhujun': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_zhujun_01',
        text: { en: "Dong Zhuo's road is not ours. We march to Yingchuan and report to General Zhu Jun.", zh: "董卓那条路，不是我们的路。我们赶赴颍川，投朱儁将军麾下。" }
    },
    'chapter2_zhangbao_probe_end': {
        type: 'dialogue',
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_probe_01',
        text: { en: "Zhang Bao's sorcery broke our first assault. We regroup at camp and plan a counter.", zh: "张宝妖术破了我军首战。先回营整军，再议破术之策。" }
    }
};

const HERO_REMINDERS = {
    'prologue_complete': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_01',
        text: { en: "Magistrate Zhou Jing's headquarters is to the East. We must report there at once to begin our service.", zh: "邹靖县令的指挥部在东方。我们必须立即前往报到，开始我们的服役。" }
    },
    'daxing': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_02',
        text: { en: "Qingzhou is under siege. We must march there at once to relieve Imperial Protector Gong Jing!", zh: "青州被围。我们必须立即进军，解救州牧龚景！" }
    },
    'qingzhou_siege': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_03',
        text: { en: "The siege is lifted. We should return to the Magistrate to see where else we can be of service.", zh: "围城已解。我们应该返回县令处，看看还能在哪里效力。" }
    },
    'qingzhou_cleanup': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_04',
        text: { en: "Master Lu Zhi is confronting Zhang Jue at Guangzong. We should reinforce his camp first and await orders.", zh: "卢师正在广宗牵制张角。我们应先赶赴营中会合，听候调遣。" }
    },
    'guangzong_camp': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_06',
        text: { en: "Master Lu sent us to Yingchuan. Huangfu Song and Zhu Jun are engaging Zhang Liang and Zhang Bao there.", zh: "卢师命我们去颍川。皇甫嵩与朱儁正在那里迎击张梁、张宝。" }
    },
    'yingchuan_aftermath': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_07',
        text: { en: "The rebels have already been routed at Yingchuan. We must return at once and report to Master Lu.", zh: "颍川叛军已败。我们应立刻回去向卢师复命。" }
    },
    'guangzong_encounter': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_rem_05',
        text: { en: "There is nothing more for us at Guangzong. Let us return to Zhuo County.", zh: "广宗已无事可做。让我们返回涿郡。" }
    },
    'caocao_intro_complete': {
        portraitKey: 'cao-cao',
        name: 'Cao Cao',
        voiceId: 'map_cc_rem_01',
        text: {
            en: "Government armies are already engaged with the Yellow Turbans at Yingchuan. We march there now and cut off their retreat.",
            zh: "官军已在颍川与黄巾交战。我们即刻前往，断其退路。"
        }
    },
    'chapter2_oath_dongzhuo_choice': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_zhujun_02',
        text: {
            en: "General Zhu Jun is at Yingchuan. Let us march there and take proper command against the rebels.",
            zh: "朱儁将军正在颍川。我们前往投军，循正道讨贼。"
        }
    },
    'chapter2_zhangbao_probe': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_probe_02',
        text: {
            en: "We have seen Zhang Bao's sorcery with our own eyes. We need a counter before the next clash.",
            zh: "张宝妖术已亲眼所见。下次交锋前，须先得破术之法。"
        }
    },
    'chapter2_zhangbao_counter_council': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_counter_council_01',
        text: {
            en: "The counter is prepared. We return to the valley, close the pincer, and break Zhang Bao's thunder.",
            zh: "破术之策已备。我们回到谷中，合围进逼，破张宝天雷。"
        }
    },
    'chapter2_zhangbao_counter': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_counter_01',
        text: {
            en: "Zhang Bao has fled to Yangcheng. Press on before the city can steady itself.",
            zh: "张宝已退入阳城。趁城中未定，立刻追击。"
        }
    },
    'chapter2_yangcheng_surrender': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_yangcheng_01',
        text: {
            en: "Yangcheng is before us. End this without wasting the lives of those ready to surrender.",
            zh: "阳城就在眼前。若有人愿降，不可枉费性命。"
        }
    },
    'chapter2_wan_strategy': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_wan_01',
        text: {
            en: "Our next march is south. If the rebels ask to surrender, we must think carefully before sealing every road.",
            zh: "朱儁将军下一步转向宛城。若贼众请降，四路围死之前，须先细思。"
        }
    },
    'chapter2_wan_field': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_wan_field_01',
        text: {
            en: "The southeast road is open. Han Zhong has come out, and we must strike before his men can rally.",
            zh: "东南一路已开。韩忠出城，须趁其未整而击之。"
        }
    },
    'chapter2_wan_gate': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_wan_gate_01',
        text: {
            en: "Wan's gate stands before us. Break it quickly, then keep order inside the city.",
            zh: "宛城城门在前。速破其门，入城后须严整军纪。"
        }
    },
    'chapter2_anxi_appointment': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_luoyang_01',
        text: {
            en: "Wan is settled. General Zhu Jun returns to Luoyang to report the victory; we should follow and wait on the court's judgment.",
            zh: "宛城已定。朱儁将军班师洛阳奏捷，我等也该随行，听候朝廷铨注。"
        }
    },
    'chapter2_anxi_governance': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_anxi_01',
        text: {
            en: "The court has named our place. We march to Anxi and serve the people there as cleanly as we can.",
            zh: "朝廷已定我等去处。我们往安喜去，尽力清白为民。"
        }
    },
    'chapter2_liuhui_shelter': {
        portraitKey: 'liu-bei',
        name: 'Liu Bei',
        voiceId: 'map_lb_ch2_liuhui_01',
        text: {
            en: "We cannot remain under the court's eye. Liu Hui of Dai may shelter us until a better summons comes.",
            zh: "不可再留在朝廷眼下。代州刘恢或可暂容我等，待来日再听征召。"
        }
    }
};

function makeMapScreenLocation(location, overrides = {}) {
    return {
        ...location,
        ...overrides,
        unlockCondition: overrides.unlockCondition || (() => true)
    };
}

const MAP_SCREEN_DEFINITIONS = {
    liubei_chapter1: {
        id: 'liubei_chapter1',
        campaignId: 'liubei',
        party: { id: 'liubei', name: 'Liu Bei', x: 190, y: 70, imgKey: 'liubei' },
        locations: LIUBEI_LOCATIONS
    },
    caocao_chapter1: {
        id: 'caocao_chapter1',
        campaignId: 'caocao',
        party: { id: 'caocao', name: 'Cao Cao', x: 168, y: 98, imgKey: 'caocao' },
        locations: CAOCAO_LOCATIONS,
        reminderKey: 'caocao_intro_complete'
    },
    chapter2_zhujun_camp: {
        id: 'chapter2_zhujun_camp',
        campaignId: CHAPTER2_ROUTE_ID,
        party: { id: 'liubei', name: 'Liu Bei', x: 205, y: 55, imgKey: 'liubei' },
        locations: {
            chapter2_zhujun_camp: makeMapScreenLocation(LIUBEI_LOCATIONS.chapter2_zhujun_camp)
        },
        reminderKey: 'chapter2_oath_dongzhuo_choice'
    },
    chapter2_wan_strategy: {
        id: 'chapter2_wan_strategy',
        campaignId: CHAPTER2_ROUTE_ID,
        party: { id: 'liubei', name: 'Liu Bei', x: 188, y: 92, imgKey: 'liubei' },
        locations: {
            chapter2_wan_strategy: makeMapScreenLocation(LIUBEI_LOCATIONS.chapter2_wan_strategy)
        },
        reminderKey: 'chapter2_wan_strategy'
    },
    chapter2_luoyang: {
        id: 'chapter2_luoyang',
        campaignId: CHAPTER2_ROUTE_ID,
        party: { id: 'liubei', name: 'Liu Bei', x: 181, y: 120, imgKey: 'liubei' },
        locations: {
            chapter2_luoyang: makeMapScreenLocation(LIUBEI_LOCATIONS.chapter2_luoyang)
        },
        reminderKey: 'chapter2_anxi_appointment'
    },
    chapter2_anxi: {
        id: 'chapter2_anxi',
        campaignId: CHAPTER2_ROUTE_ID,
        party: { id: 'liubei', name: 'Liu Bei', x: 154, y: 84, imgKey: 'liubei' },
        locations: {
            chapter2_anxi_governance: makeMapScreenLocation(LIUBEI_LOCATIONS.chapter2_anxi_governance)
        },
        reminderKey: 'chapter2_anxi_governance'
    },
    chapter2_liuhui: {
        id: 'chapter2_liuhui',
        campaignId: CHAPTER2_ROUTE_ID,
        party: { id: 'liubei', name: 'Liu Bei', x: 176, y: 77, imgKey: 'liubei' },
        locations: {
            chapter2_liuhui_shelter: makeMapScreenLocation(LIUBEI_LOCATIONS.chapter2_liuhui_shelter)
        },
        reminderKey: 'chapter2_liuhui_shelter'
    }
};

const MAP_SCREEN_BY_STORY_NODE = {
    chapter2_zhujun_camp: 'chapter2_zhujun_camp',
    chapter2_wan_strategy: 'chapter2_wan_strategy',
    chapter2_anxi_appointment: 'chapter2_luoyang',
    chapter2_anxi_governance: 'chapter2_anxi',
    chapter2_liuhui_shelter: 'chapter2_liuhui'
};

export class MapScene extends BaseScene {
    constructor() {
        super();
        this.selectedLocation = null;
        this.dialogueElapsed = 0;
        this.interactionSelected = null;
        this.subStep = 0;
        this.moveState = {
            isMoving: false,
            progress: 0,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0,
            onComplete: null
        };
        // Current location of the party
        this.party = { 
            id: 'liubei', 
            name: 'Liu Bei', 
            x: 190, 
            y: 70,
            imgKey: 'liubei'
        };
        this.lastClickTime = 0;
        this.lastSaveTime = 0; // Track when we last saved state
        this.saveInterval = 2000; // Save every 2 seconds
        this.navTargets = [];
        this.currentMapScreenId = 'liubei_chapter1';
    }

    getActiveMapScreen() {
        return MAP_SCREEN_DEFINITIONS[this.currentMapScreenId] || null;
    }

    resolveMapScreenId(params = {}, gs = this.manager.gameState) {
        if (params.mapScreenId && MAP_SCREEN_DEFINITIONS[params.mapScreenId]) {
            return params.mapScreenId;
        }
        if (params.afterEvent === 'chapter2_to_zhujun') {
            return 'chapter2_zhujun_camp';
        }

        const campaignId = params.campaignId || gs.getCurrentCampaign();
        const cursorNodeId = gs.getStoryCursor(campaignId).nodeId;
        const cursorScreenId = MAP_SCREEN_BY_STORY_NODE[cursorNodeId];
        if (cursorScreenId && MAP_SCREEN_DEFINITIONS[cursorScreenId]) {
            return cursorScreenId;
        }

        if (campaignId === 'caocao') return 'caocao_chapter1';
        return 'liubei_chapter1';
    }

    getActiveLocations() {
        const screen = this.getActiveMapScreen();
        if (screen?.locations) return screen.locations;
        return this.currentCampaignId === 'caocao' ? CAOCAO_LOCATIONS : LIUBEI_LOCATIONS;
    }

    enter(params = {}) {
        // Only switch to campaign music if we're not already playing something "epic" (like the oath music)
        // that is supposed to carry through.
        if (assets.currentMusicKey !== 'oath') {
            assets.playMusic('campaign', 0.4);
        }
        
        // Load state if it exists
        const gs = this.manager.gameState;
        const isResume = params.isResume && gs.getSceneState('map');
        const savedState = isResume ? gs.getSceneState('map') : null;
        
        // Don't set lastScene here - SceneManager will handle it when switching away

        if (!isResume) {
            this.dialogueElapsed = 0;
            this.currentMapScreenId = this.resolveMapScreenId(params, gs);
            const activeScreen = this.getActiveMapScreen();
            const targetCampaignId = params?.campaignId || activeScreen?.campaignId;
            const preferScreenDefaults = !!params.mapScreenId;

            if (params && params.afterEvent) {
                const event = STORY_EVENTS[params.afterEvent];
                if (event) {
                    this.interactionSelected = 'story_event';
                    this.currentEvent = event;
                    this.subStep = 0;
                    if (event.voiceId) assets.playVoice(event.voiceId);
                }
            }

            // Handle post-choice continuation from resumed battles
            if (params && params.afterChoice) {
                if (params.afterChoice === 'guangzong_restrain') {
                    // Return to map - player will click Zhuo County
                } else if (params.afterChoice === 'guangzong_fight') {
                    // After fighting to free Lu Zhi
                    setTimeout(() => this.continueAfterEscortBattle(), 100);
                }
            }

            if (targetCampaignId) {
                this.currentCampaignId = targetCampaignId;
                gs.setCurrentCampaign(targetCampaignId);
                if (targetCampaignId === 'liubei' && !gs.getStoryCursor('liubei').nodeId) {
                    gs.startStoryRoute('liubei', 'prologue_complete');
                }
                // Don't set lastScene here - SceneManager will handle it

                // Initialize party based on campaign
                if (targetCampaignId === 'liubei' || targetCampaignId === CHAPTER2_ROUTE_ID) {
                    // Prefer explicit params, then saved position, then default
                    const savedX = preferScreenDefaults ? undefined : gs.getCampaignVar('partyX', targetCampaignId);
                    const savedY = preferScreenDefaults ? undefined : gs.getCampaignVar('partyY', targetCampaignId);
                    const defaults = activeScreen?.party || MAP_SCREEN_DEFINITIONS.liubei_chapter1.party;
                    this.party = {
                        id: defaults.id || 'liubei',
                        name: defaults.name || 'Liu Bei',
                        x: params.partyX !== undefined ? params.partyX : (savedX !== undefined ? savedX : defaults.x),
                        y: params.partyY !== undefined ? params.partyY : (savedY !== undefined ? savedY : defaults.y),
                        imgKey: defaults.imgKey || 'liubei'
                    };
                } else if (targetCampaignId === 'caocao') {
                    const savedX = gs.getCampaignVar('partyX', 'caocao');
                    const savedY = gs.getCampaignVar('partyY', 'caocao');
                    const defaults = activeScreen?.party || MAP_SCREEN_DEFINITIONS.caocao_chapter1.party;
                    this.party = {
                        id: defaults.id || 'caocao',
                        name: defaults.name || 'Cao Cao',
                        x: params.partyX !== undefined ? params.partyX : (savedX !== undefined ? savedX : defaults.x),
                        y: params.partyY !== undefined ? params.partyY : (savedY !== undefined ? savedY : defaults.y),
                        imgKey: defaults.imgKey || 'caocao'
                    };
                }
            } else {
                // No params (coming from Continue), restore from save
                this.currentCampaignId = gs.getCurrentCampaign();
                const fallbackScreen = this.getActiveMapScreen();
                const savedX = gs.getCampaignVar('partyX', this.currentCampaignId);
                const savedY = gs.getCampaignVar('partyY', this.currentCampaignId);
                if (this.currentCampaignId === 'liubei' || this.currentCampaignId === CHAPTER2_ROUTE_ID) {
                    const defaults = fallbackScreen?.party || MAP_SCREEN_DEFINITIONS.liubei_chapter1.party;
                    this.party = {
                        id: defaults.id || 'liubei',
                        name: defaults.name || 'Liu Bei',
                        x: savedX !== undefined ? savedX : defaults.x,
                        y: savedY !== undefined ? savedY : defaults.y,
                        imgKey: defaults.imgKey || 'liubei'
                    };
                } else if (this.currentCampaignId === 'caocao') {
                    const defaults = fallbackScreen?.party || MAP_SCREEN_DEFINITIONS.caocao_chapter1.party;
                    this.party = {
                        id: defaults.id || 'caocao',
                        name: defaults.name || 'Cao Cao',
                        x: savedX !== undefined ? savedX : defaults.x,
                        y: savedY !== undefined ? savedY : defaults.y,
                        imgKey: defaults.imgKey || 'caocao'
                    };
                }
            }
        } else {
            // Restore saved state
            this.restoreMapState(savedState);
        }

        this.initSelection({ defaultIndex: 0, totalOptions: 0 });
        this.navTargets = [];

        // Cao Cao route map should open with his reminder line, and allow replay on sprite click.
        if (!savedState && this.currentCampaignId === 'caocao') {
            this.showCurrentPartyReminder(gs);
        }
    }
    
    restoreMapState(state) {
        if (!state) return;
        
        this.currentCampaignId = state.currentCampaignId;
        this.currentMapScreenId = MAP_SCREEN_DEFINITIONS[state.currentMapScreenId]
            ? state.currentMapScreenId
            : this.resolveMapScreenId({ campaignId: state.currentCampaignId }, this.manager.gameState);
        this.party = state.party || { 
            id: 'liubei', 
            name: 'Liu Bei', 
            x: 190, 
            y: 70,
            imgKey: 'liubei'
        };
        this.interactionSelected = state.interactionSelected || null;
        
        // Restore event from key
        if (state.currentEventKey && STORY_EVENTS[state.currentEventKey]) {
            this.currentEvent = STORY_EVENTS[state.currentEventKey];
            this.interactionSelected = 'story_event';
        } else {
            this.currentEvent = null;
        }
        
        this.subStep = state.subStep || 0;
        this.dialogueElapsed = state.dialogueElapsed || 0;
        this.selectedLocation = state.selectedLocation || null;
        
        // Restore move state if party was moving
        if (state.moveState && state.moveState.isMoving) {
            this.moveState = state.moveState;
        }
        
        // If there was an active event, restore it
        if (this.currentEvent && this.currentEvent.voiceId) {
            assets.playVoice(this.currentEvent.voiceId);
        }
    }
    
    saveMapState() {
        // Save map state periodically (for crash recovery)
        const gs = this.manager.gameState;
        
        // Save party position to campaign state
        if (this.currentCampaignId && this.party) {
            gs.setCampaignVar('partyX', this.party.x, this.currentCampaignId);
            gs.setCampaignVar('partyY', this.party.y, this.currentCampaignId);
        }
        
        // Find event key if there's a current event
        let currentEventKey = null;
        if (this.currentEvent) {
            for (const [key, event] of Object.entries(STORY_EVENTS)) {
                if (event === this.currentEvent) {
                    currentEventKey = key;
                    break;
                }
            }
        }
        
        // Save map scene state
        const state = {
            currentCampaignId: this.currentCampaignId,
            currentMapScreenId: this.currentMapScreenId,
            party: this.party ? { ...this.party } : null,
            interactionSelected: this.interactionSelected,
            currentEventKey: currentEventKey, // Save event key instead of object
            subStep: this.subStep,
            dialogueElapsed: this.dialogueElapsed,
            selectedLocation: this.selectedLocation,
            moveState: this.moveState.isMoving ? { ...this.moveState } : null
        };
        gs.setSceneState('map', state);
        gs.setLastScene('map');
    }
    
    exit() {
        // Save map state when leaving (also saved periodically)
        this.saveMapState();
    }

    heroMoveTo(targetX, targetY, onComplete) {
        // If we're already at the destination, don't play a "walk in place" animation.
        if (this.party && this.party.x === targetX && this.party.y === targetY) {
            if (onComplete) onComplete();
            return;
        }
        this.moveState = {
            isMoving: true,
            progress: 0,
            startX: this.party.x,
            startY: this.party.y,
            targetX: targetX,
            targetY: targetY,
            onComplete: onComplete
        };
    }

    getMapOrigin(canvas, mapImg) {
        const mx = Math.floor((canvas.width - mapImg.width) / 2);
        const my = Math.floor((canvas.height - mapImg.height) / 2);
        return { mx, my };
    }

    render(timestamp) {
        const { ctx, canvas } = this.manager;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mapImg = assets.getImage('china_map');
        if (!mapImg) return;

        const { mx, my } = this.getMapOrigin(canvas, mapImg);
        ctx.drawImage(mapImg, mx, my);

        // Draw dynamic locations
        const gs = this.manager.gameState;
        const navTargets = [];
        const depthDrawables = [];
        const pendingLabels = [];
        const pushDepthDrawable = (draw, sortY, priority = 0) => {
            depthDrawables.push({ draw, sortY, priority });
        };
        const locations = this.getActiveLocations();
        for (const locId in locations) {
            const loc = locations[locId];
            if (loc.unlockCondition(gs)) {
                const lx = mx + loc.x;
                const ly = my + loc.y;
                const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
                
                const img = assets.getImage(loc.imgKey);
                if (img) {
                    const drawX = Math.floor(lx - img.width / 2);
                    const drawY = Math.floor(ly - img.height / 2);
                    navTargets.push({
                        type: 'location',
                        id: locId,
                        x: lx,
                        y: ly,
                        img,
                        drawX,
                        drawY,
                        w: img.width,
                        h: img.height
                    });
                    // Depth sort by sprite "foot" (bottom pixel row), not center Y.
                    const footY = drawY + img.height;
                    pushDepthDrawable(
                        () => {
                            ctx.save();
                            if (isDone) ctx.globalAlpha = 0.5;
                            // Draw centered at the location coordinates
                            ctx.drawImage(img, drawX, drawY, img.width, img.height);
                            ctx.restore();
                        },
                        footY,
                        0
                    );

                    if (this.interactionSelected === locId) {
                        const locName = getLocalizedText(UI_TEXT[loc.name] || { en: loc.name, zh: loc.name });
                        const promptText = isDone
                            ? getLocalizedText(UI_TEXT['COMPLETED'] || { en: 'COMPLETED', zh: '已完成' })
                            : getLocalizedText(UI_TEXT['click to march'] || { en: 'click to march', zh: '点击进军' });
                        pendingLabels.push({ name: locName, x: lx, y: ly - 10, prompt: promptText });
                    }
                }
            }
        }

        // Animation frame for idle pose
        const frame = Math.floor(Date.now() / 150) % 4;
        const walkFrame = Math.floor(Date.now() / 100) % 4;

        const charImg = assets.getImage(this.party.imgKey);
        if (charImg) {
            let cx = mx + this.party.x;
            let cy = my + this.party.y;
            
            let action = 'standby';
            let frameIdx = frame;
            let flip = false;

            if (this.moveState.isMoving) {
                cx = mx + this.moveState.startX + (this.moveState.targetX - this.moveState.startX) * this.moveState.progress;
                cy = my + this.moveState.startY + (this.moveState.targetY - this.moveState.startY) * this.moveState.progress;
                
                action = 'walk';
                frameIdx = walkFrame;
                if (this.moveState.targetX < this.moveState.startX) flip = true;
            }

            // Character y is already the feet anchor in drawCharacter().
            pushDepthDrawable(
                () => {
                    this.drawCharacter(ctx, charImg, action, frameIdx, cx, cy, { flip });
                },
                cy,
                1
            );
            this.partyRenderPose = { img: charImg, action, frame: frameIdx, x: cx, y: cy, flip };
            navTargets.push({ type: 'party', id: 'party', x: cx, y: cy });
        } else {
            this.partyRenderPose = null;
        }

        // Draw all map actors/sprites in depth order by foot Y.
        depthDrawables.sort((a, b) => {
            if (a.sortY !== b.sortY) return a.sortY - b.sortY;
            return a.priority - b.priority;
        });
        depthDrawables.forEach(d => d.draw());
        pendingLabels.forEach(label => this.drawLabel(ctx, label.name, label.x, label.y, label.prompt));

        if (this.interactionSelected === 'hero_reminder' && this.currentReminder) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentReminder, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        } else if (this.interactionSelected === 'story_event' && this.currentEvent) {
            const status = this.renderDialogueBox(ctx, canvas, this.currentEvent, { subStep: this.subStep });
            this.hasNextChunk = status.hasNextChunk;
        }

        // Draw Back Button (Top Right)
        const returnText = getLocalizedText(UI_TEXT['RETURN']);
        // Measure using the actual render font so Chinese glyphs always fit.
        ctx.save();
        const returnFont = getFontForLanguage('8px Silkscreen');
        ctx.font = returnFont;
        const returnMetrics = ctx.measureText(returnText);
        const measuredW = Math.ceil(returnMetrics.width);
        const measuredH = Math.ceil((returnMetrics.actualBoundingBoxAscent || 0) + (returnMetrics.actualBoundingBoxDescent || 0))
            || (LANGUAGE.current === 'zh' ? 12 : 8);
        ctx.restore();
        const padX = LANGUAGE.current === 'zh' ? 10 : 8;
        const backW = Math.max(40, measuredW + padX * 2);
        const optionsLayout = this.manager.getOptionsButtonLayout ? this.manager.getOptionsButtonLayout() : null;
        const backH = optionsLayout?.iconSize || 13;
        const bx = optionsLayout ? optionsLayout.hitX - backW - 1 : canvas.width - backW - 5;
        const by = optionsLayout ? optionsLayout.iconY : 5;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bx, by, backW, backH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, backW - 1, backH - 1);
        
        const textY = by + Math.floor((backH - measuredH) / 2);
        this.drawPixelText(ctx, returnText, bx + backW/2, textY, { 
            color: '#ffd700', 
            font: '8px Silkscreen', 
            align: 'center' 
        });

        this.backRect = { x: bx, y: by, w: backW, h: backH };
        navTargets.push({ type: 'back', id: 'back', x: bx + backW / 2, y: by + backH / 2, rect: this.backRect });

        this.navTargets = navTargets;
        if (this.selection) {
            this.selection.totalOptions = this.navTargets.length;
            if (this.selection.highlightedIndex >= this.navTargets.length) {
                this.selection.highlightedIndex = Math.max(0, this.navTargets.length - 1);
            }
        }

        this.renderNavHighlight(ctx);
    }

    drawLabel(ctx, name, x, y, prompt) {
        // Name and prompt are already localized when passed in
        // Calculate container size for both name and prompt
        const nameSize = getTextContainerSize(ctx, name, '8px Silkscreen', 5, 12);
        const promptSize = getTextContainerSize(ctx, prompt, '8px Tiny5', 5, 12);
        
        // Container needs to fit both lines, so use the wider of the two
        const boxW = Math.max(nameSize.width, promptSize.width);
        
        // Height needs to accommodate:
        // - Top padding (4px for Chinese, 3px for English)
        // - Name height
        // - Spacing between lines (5px for Chinese, 4px for English)
        // - Prompt height
        // - Bottom padding (4px for Chinese, 3px for English)
        const topPadding = LANGUAGE.current === 'zh' ? 4 : 3;
        const bottomPadding = LANGUAGE.current === 'zh' ? 4 : 3;
        const lineSpacing = LANGUAGE.current === 'zh' ? 5 : 4;
        const boxH = topPadding + nameSize.height + lineSpacing + promptSize.height + bottomPadding;
        
        const bx = Math.floor(x - 20 - boxW);
        const by = Math.floor(y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

        const displayName = LANGUAGE.current === 'zh' ? name : name.toUpperCase();
        // Position name with top padding (Y coordinate is top of text since textBaseline = 'top')
        const nameY = by + topPadding;
        this.drawPixelText(ctx, displayName, bx + 5, nameY, { color: '#ffd700', font: '8px Silkscreen' });
        
        const pulse = Math.abs(Math.sin(Date.now() / 500));
        ctx.globalAlpha = pulse;
        // Position prompt below name with proper spacing (Y coordinate is top of text)
        const promptY = by + topPadding + nameSize.height + lineSpacing;
        this.drawPixelText(ctx, prompt, bx + 5, promptY, { color: '#eee', font: '8px Tiny5' });
        ctx.globalAlpha = 1.0;
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        // Periodic state saving for crash recovery
        if (timestamp - this.lastSaveTime > this.saveInterval) {
            this.saveMapState();
            this.lastSaveTime = timestamp;
        }

        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            this.dialogueElapsed = (this.dialogueElapsed || 0) + dt;
        } else {
            this.dialogueElapsed = 0;
        }

        if (this.moveState.isMoving) {
            this.moveState.progress += 0.015;
            if (this.moveState.progress >= 1) {
                this.moveState.progress = 1;
                this.moveState.isMoving = false;
                
                // Update actual coordinate in the party data
                this.party.x = this.moveState.targetX;
                this.party.y = this.moveState.targetY;

                // Save party position to campaign state for persistence
                this.manager.gameState.setCampaignVar('partyX', this.party.x);
                this.manager.gameState.setCampaignVar('partyY', this.party.y);

                if (this.moveState.onComplete) {
                    this.moveState.onComplete();
                }
            }
        }

        if (this.selection) {
            const currentMouseX = this.manager.logicalMouseX;
            const currentMouseY = this.manager.logicalMouseY;
            this.updateSelectionMouse(currentMouseX, currentMouseY);
            if (this.selection.mouseoverEnabled && this.navTargets.length > 0) {
                let nearestIdx = -1;
                let bestDist = Number.POSITIVE_INFINITY;
                this.navTargets.forEach((t, i) => {
                    const dx = t.x - currentMouseX;
                    const dy = t.y - currentMouseY;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        nearestIdx = i;
                    }
                });
                if (nearestIdx >= 0) this.selection.highlightedIndex = nearestIdx;
            }
        }
    }

    renderNavHighlight(ctx) {
        if (!this.selection || this.navTargets.length === 0) return;
        const idx = this.selection.highlightedIndex;
        if (idx < 0 || idx >= this.navTargets.length) return;
        const t = this.navTargets[idx];

        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        if (t.type === 'party' && this.partyRenderPose) {
            const pose = this.partyRenderPose;
            this.drawCharacterPixelOutline(ctx, pose.img, pose.action, pose.frame, pose.x, pose.y, {
                flip: pose.flip,
                color: '#ffd700'
            });
        } else if (t.rect) {
            ctx.strokeRect(Math.floor(t.rect.x) - 1.5, Math.floor(t.rect.y) - 1.5, Math.floor(t.rect.w) + 2, Math.floor(t.rect.h) + 2);
        } else if (t.type === 'location' && t.img) {
            this.drawLocationSpriteOutline(ctx, t.img, t.drawX, t.drawY, { color: '#ffd700' });
        } else {
            const size = (t.type === 'party') ? 14 : 18;
            ctx.strokeRect(Math.floor(t.x - size / 2) - 0.5, Math.floor(t.y - size / 2) - 0.5, size, size);
        }
        ctx.restore();
    }

    drawLocationSpriteOutline(ctx, img, drawX, drawY, options = {}) {
        if (!img) return;
        const { color = '#ffd700', alphaThreshold = 10 } = options;
        const w = img.width;
        const h = img.height;
        if (!w || !h) return;

        if (!this._locationOutlineSrcCanvas || this._locationOutlineSrcCanvas.width !== w || this._locationOutlineSrcCanvas.height !== h) {
            this._locationOutlineSrcCanvas = document.createElement('canvas');
            this._locationOutlineSrcCanvas.width = w;
            this._locationOutlineSrcCanvas.height = h;
            this._locationOutlineSrcCtx = this._locationOutlineSrcCanvas.getContext('2d', { willReadFrequently: true });

            this._locationOutlineDstCanvas = document.createElement('canvas');
            this._locationOutlineDstCanvas.width = w;
            this._locationOutlineDstCanvas.height = h;
            this._locationOutlineDstCtx = this._locationOutlineDstCanvas.getContext('2d');
        }

        const srcCtx = this._locationOutlineSrcCtx;
        const dstCtx = this._locationOutlineDstCtx;
        srcCtx.clearRect(0, 0, w, h);
        dstCtx.clearRect(0, 0, w, h);
        srcCtx.drawImage(img, 0, 0, w, h);

        const srcData = srcCtx.getImageData(0, 0, w, h);
        const outData = dstCtx.createImageData(w, h);
        const rgb = { r: 255, g: 215, b: 0 };
        if (typeof color === 'string' && color.startsWith('#') && (color.length === 7 || color.length === 4)) {
            const clean = color.slice(1);
            const expanded = clean.length === 3
                ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
                : clean;
            rgb.r = parseInt(expanded.slice(0, 2), 16);
            rgb.g = parseInt(expanded.slice(2, 4), 16);
            rgb.b = parseInt(expanded.slice(4, 6), 16);
        }

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const idx = (py * w + px) * 4;
                const a = srcData.data[idx + 3];
                if (a > alphaThreshold) continue;

                let edge = false;
                for (let oy = -1; oy <= 1 && !edge; oy++) {
                    for (let ox = -1; ox <= 1; ox++) {
                        if (ox === 0 && oy === 0) continue;
                        const nx = px + ox;
                        const ny = py + oy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        const nIdx = (ny * w + nx) * 4;
                        if (srcData.data[nIdx + 3] > alphaThreshold) {
                            edge = true;
                            break;
                        }
                    }
                }

                if (edge) {
                    outData.data[idx] = rgb.r;
                    outData.data[idx + 1] = rgb.g;
                    outData.data[idx + 2] = rgb.b;
                    outData.data[idx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(outData, 0, 0);
        ctx.drawImage(this._locationOutlineDstCanvas, Math.floor(drawX), Math.floor(drawY), w, h);
    }

    activateNavTarget(index) {
        this.activateNavigationIndex(this.navTargets, index, {
            back: () => {
                assets.playSound('ui_click');
                this.manager.switchTo('campaign_selection');
            },
            location: (target) => this.activateLocationTarget(target.id),
            party: () => this.activatePartyTarget()
        });
    }

    moveNavDirectional(dirX, dirY) {
        if (!this.selection || !this.navTargets || this.navTargets.length <= 1) return;
        if (this.selection.highlightedIndex < 0 || this.selection.highlightedIndex >= this.navTargets.length) {
            this.selection.highlightedIndex = 0;
        }
        const bestIdx = this.navigateTargetIndex(this.selection.highlightedIndex, this.navTargets, dirX, dirY, { coneSlope: 2.2 });
        this.selection.highlightedIndex = bestIdx;
        assets.playSound('ui_click', 0.5);
    }

    activateLocationTarget(locId) {
        const gs = this.manager.gameState;
        const loc = this.getActiveLocations()[locId];
        if (!loc || !loc.unlockCondition(gs)) return;

        if (this.interactionSelected === locId) {
            const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
            if (!isDone) {
                this.heroMoveTo(loc.x, loc.y, () => {
                    if (loc.storyRouteId && loc.storyNodeId) this.startStoryMapLocation(loc);
                    else if (loc.battleId === 'daxing') this.startBriefing();
                    else if (loc.battleId === 'qingzhou_siege') this.startQingzhouBriefing();
                    else if (loc.battleId === 'qingzhou_cleanup') this.startQingzhouCleanup();
                    else if (loc.battleId === 'guangzong_camp') this.startGuangzongCamp();
                    else if (loc.battleId === 'yingchuan_aftermath') this.startYingchuanAftermath();
                    else if (loc.battleId === 'guangzong_encounter') this.startGuangzongBriefing();
                    else if (loc.battleId === 'zhuo_return') this.startZhuoReturn();
                    else if (loc.battleId === 'chapter2_zhujun_camp') this.startChapter2ZhuJunCamp();
                    else if (loc.battleId === 'caocao_yingchuan_intercept') this.startCaocaoYingchuanIntercept();
                });
            }
        } else {
            this.interactionSelected = locId;
            this.selectedLocation = locId;
        }
    }

    startStoryMapLocation(loc) {
        if (!loc?.storyRouteId || !loc?.storyNodeId) return;
        launchStoryNode(this.manager, loc.storyRouteId, loc.storyNodeId);
    }

    activatePartyTarget() {
        const gs = this.manager.gameState;
        this.showCurrentPartyReminder(gs);
    }

    advanceInteractionDialogue() {
        if (this.dialogueElapsed < 250) return;
        if (this.hasNextChunk) {
            this.subStep++;
            this.dialogueElapsed = 0;
            return;
        }
        const nextScene = (this.interactionSelected === 'story_event' && this.currentEvent)
            ? this.currentEvent.nextScene
            : null;
        this.interactionSelected = null;
        this.subStep = 0;
        this.currentEvent = null;
        this.currentReminder = null;
        this.dialogueElapsed = 0;
        if (nextScene) {
            this.manager.switchTo(nextScene);
        }
    }

    handleInput(e) {
        const { x: mouseX, y: mouseY } = this.getMousePos(e);
        const { canvas } = this.manager;

        // Back button (top right)
        const backRect = this.backRect || { x: canvas.width - 45, y: 5, w: 40, h: 15 };
        const isBackHovered = mouseX >= backRect.x
            && mouseX <= backRect.x + backRect.w
            && mouseY >= backRect.y
            && mouseY <= backRect.y + backRect.h;
        
        if (isBackHovered) {
            assets.playSound('ui_click');
            // If the story is complete, ensure we don't prompt "New Game" when returning later
            if (this.manager.gameState.hasReachedStoryNode('chapter1_complete', 'liubei')) {
                // Don't set lastScene for campaign_selection - it's excluded
            }
            this.manager.switchTo('campaign_selection');
            return;
        }

        const mapImg = assets.getImage('china_map');
        const { mx, my } = mapImg ? this.getMapOrigin(canvas, mapImg) : { mx: 0, my: 0 };

        // Advance dialogue if active
        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            this.advanceInteractionDialogue();
            return;
        }

        // Resolve click by top-most overlap target (locations vs party), matching render depth.
        const gs = this.manager.gameState;
        const cx = mx + this.party.x;
        const cy = my + this.party.y;
        
        const charImg = assets.getImage(this.party.imgKey);
        const frame = Math.floor(Date.now() / 150) % 4;
        const walkFrame = Math.floor(Date.now() / 100) % 4;
        
        let action = 'standby';
        let frameIdx = frame;
        let flip = false;
        let currentX = cx;
        let currentY = cy;

        if (this.moveState.isMoving) {
            currentX = mx + this.moveState.startX + (this.moveState.targetX - this.moveState.startX) * this.moveState.progress;
            currentY = my + this.moveState.startY + (this.moveState.targetY - this.moveState.startY) * this.moveState.progress;
            action = 'walk';
            frameIdx = walkFrame;
            if (this.moveState.targetX < this.moveState.startX) flip = true;
        }

        const hitCandidates = [];
        const charHit = this.checkCharacterHit(charImg, action, frameIdx, currentX, currentY, mouseX, mouseY, { flip });
        if (charHit) {
            hitCandidates.push({
                type: 'party',
                sortY: currentY,
                priority: 1
            });
        }

        // Gather dynamic location hits
        const locations = this.getActiveLocations();
        for (const locId in locations) {
            const loc = locations[locId];
            if (loc.unlockCondition(gs)) {
                const lx = mx + loc.x;
                const ly = my + loc.y;
                
                const img = assets.getImage(loc.imgKey);
                const iw = img ? img.width : 36;
                const ih = img ? img.height : 36;
                
                const hit = (mouseX >= lx - iw/2 && mouseX <= lx + iw/2 && mouseY >= ly - ih/2 && mouseY <= ly + ih/2);
            
            let labelHit = false;
                if (this.interactionSelected === locId) {
                    const metrics = this.manager.ctx.measureText(loc.name);
                const boxW = Math.floor(metrics.width + 10);
                    const bx = Math.floor(lx - 20 - boxW);
                    const by = Math.floor(ly - 10);
                    labelHit = (mouseX >= bx && mouseX <= bx + boxW && mouseY >= by && mouseY <= by + 24);
            }

                if (hit || labelHit) {
                    // Location footY matches render depth sorting in render()
                    hitCandidates.push({
                        type: 'location',
                        locId,
                        loc,
                        sortY: ly + ih / 2,
                        priority: 0
                    });
                }
            }
        }

        if (hitCandidates.length > 0) {
            hitCandidates.sort((a, b) => {
                if (a.sortY !== b.sortY) return b.sortY - a.sortY;
                return b.priority - a.priority;
            });
            const topHit = hitCandidates[0];

            if (topHit.type === 'party') {
                this.showCurrentPartyReminder(gs);
                return;
            }

            const { locId, loc } = topHit;
            if (this.interactionSelected === locId) {
                const isDone = loc.isCompleted ? loc.isCompleted(gs) : false;
                if (!isDone) {
                    this.heroMoveTo(loc.x, loc.y, () => {
                        if (loc.storyRouteId && loc.storyNodeId) this.startStoryMapLocation(loc);
                        else if (loc.battleId === 'daxing') this.startBriefing();
                        else if (loc.battleId === 'qingzhou_siege') this.startQingzhouBriefing();
                        else if (loc.battleId === 'qingzhou_cleanup') this.startQingzhouCleanup();
                        else if (loc.battleId === 'guangzong_camp') this.startGuangzongCamp();
                        else if (loc.battleId === 'yingchuan_aftermath') this.startYingchuanAftermath();
                        else if (loc.battleId === 'guangzong_encounter') this.startGuangzongBriefing();
                        else if (loc.battleId === 'zhuo_return') this.startZhuoReturn();
                        else if (loc.battleId === 'chapter2_zhujun_camp') this.startChapter2ZhuJunCamp();
                        else if (loc.battleId === 'caocao_yingchuan_intercept') this.startCaocaoYingchuanIntercept();
                    });
                }
            } else {
                this.interactionSelected = locId;
                this.selectedLocation = locId;
            }
            return;
        }
        
        this.selectedLocation = null;
        if (this.interactionSelected !== 'hero_reminder' && this.interactionSelected !== 'story_event') {
            this.interactionSelected = null;
        }
    }

    handleKeyDown(e) {
        if (!this.selection) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            assets.playSound('ui_click');
            this.manager.switchTo('campaign_selection');
            return;
        }

        if (this.interactionSelected === 'hero_reminder' || this.interactionSelected === 'story_event') {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.onNonMouseInput();
                this.advanceInteractionDialogue();
            }
            return;
        }

        if (this.navTargets.length === 0) return;
        this.selection.totalOptions = this.navTargets.length;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(0, -1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(0, 1);
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(-1, 0);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.onNonMouseInput();
            this.moveNavDirectional(1, 0);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.onNonMouseInput();
            this.activateNavTarget(this.selection.highlightedIndex);
        }
    }

    startQingzhouBriefing() {
        this.manager.switchTo('tactics', {
            battleId: 'qingzhou_prelude',
            mapGen: {
                biome: 'central',
                layout: 'city_gate',
                cityGateDefenderSide: 'player',
                forestDensity: 0.05,
                mountainDensity: 0.0,
                riverDensity: 0.0,
                houseDensity: 0.2
            }
        });
    }

    startQingzhouCleanup() {
        this.manager.switchTo('tactics', {
            battleId: 'qingzhou_cleanup'
        });
    }

    startGuangzongCamp() {
        this.manager.switchTo('tactics', {
            battleId: 'guangzong_camp'
        });
    }

    startYingchuanAftermath() {
        this.manager.switchTo('tactics', {
            battleId: 'yingchuan_aftermath'
        });
    }

    startChapter2ZhuJunCamp() {
        launchStoryNode(this.manager, CHAPTER2_ROUTE_ID, 'chapter2_zhujun_camp');
    }

    getCurrentPartyReminderKey(gs) {
        const screenReminderKey = this.getActiveMapScreen()?.reminderKey;
        if (screenReminderKey && HERO_REMINDERS[screenReminderKey]) return screenReminderKey;

        if (this.currentCampaignId === 'caocao') {
            if (gs.hasReachedStoryNode('caocao_chapter1_complete', 'caocao') || gs.hasMilestone('caocao_chapter1_complete')) return null;
            if (gs.hasReachedStoryNode('caocao_intro_complete', 'caocao') || gs.hasMilestone('caocao_intro_complete')) return 'caocao_intro_complete';
            return 'caocao_intro_complete';
        }

        // Highest-priority progression first.
        if (hasChapter2Node(gs, 'chapter2_liuhui_shelter')) return 'chapter2_liuhui_shelter';
        if (hasChapter2Node(gs, 'chapter2_anxi_governance')) return 'chapter2_anxi_governance';
        if (hasChapter2Node(gs, 'chapter2_anxi_appointment')) return 'chapter2_anxi_appointment';
        if (hasChapter2Node(gs, 'chapter2_wan_gate')) return 'chapter2_wan_gate';
        if (hasChapter2Node(gs, 'chapter2_wan_field')) return 'chapter2_wan_field';
        if (hasChapter2Node(gs, 'chapter2_wan_strategy')) return 'chapter2_wan_strategy';
        if (hasChapter2Node(gs, 'chapter2_yangcheng_surrender')) return 'chapter2_yangcheng_surrender';
        if (hasChapter2Node(gs, 'chapter2_zhangbao_counter')) return 'chapter2_zhangbao_counter';
        if (hasChapter2Node(gs, 'chapter2_zhangbao_counter_council')) return 'chapter2_zhangbao_counter_council';
        if (hasChapter2Node(gs, 'chapter2_zhangbao_probe')) return 'chapter2_zhangbao_probe';
        if ((hasChapter2Choice(gs, 'chapter2_oath_dongzhuo_choice') || gs.hasMilestone('chapter2_oath_dongzhuo_restrained') || gs.hasMilestone('chapter2_oath_dongzhuo_fought')) && !hasCompletedChapter2Node(gs, 'chapter2_zhujun_camp')) return 'chapter2_oath_dongzhuo_choice';
        if (gs.hasReachedStoryNode('chapter1_complete', 'liubei') || gs.hasMilestone('chapter1_complete')) return null;
        if (gs.hasReachedStoryNode('guangzong_encounter', 'liubei') || gs.hasMilestone('guangzong_encounter')) return 'guangzong_encounter';
        if (gs.hasReachedStoryNode('yingchuan_aftermath', 'liubei') || gs.hasMilestone('yingchuan_aftermath')) return 'yingchuan_aftermath';
        if (gs.hasReachedStoryNode('guangzong_camp', 'liubei') || gs.hasMilestone('guangzong_camp')) return 'guangzong_camp';
        if (gs.hasReachedStoryNode('qingzhou_cleanup', 'liubei') || gs.hasMilestone('qingzhou_cleanup')) return 'qingzhou_cleanup';
        if (gs.hasReachedStoryNode('qingzhou_siege', 'liubei') || gs.hasMilestone('qingzhou_siege')) return 'qingzhou_siege';
        if (gs.hasReachedStoryNode('daxing', 'liubei') || gs.hasMilestone('daxing')) return 'daxing';
        if (gs.hasReachedStoryNode('prologue_complete', 'liubei') || gs.hasMilestone('prologue_complete')) return 'prologue_complete';
        // Fallback for any pre-Daxing map state: still guide player to the magistrate.
        return 'prologue_complete';
    }

    showCurrentPartyReminder(gs) {
        const reminderKey = this.getCurrentPartyReminderKey(gs);
        const reminder = reminderKey ? HERO_REMINDERS[reminderKey] : null;
        if (!reminder) {
            this.interactionSelected = null;
            this.subStep = 0;
            return;
        }

        this.interactionSelected = 'hero_reminder';
        this.currentReminder = reminder;
        this.subStep = 0;
        if (this.currentReminder.voiceId) assets.playVoice(this.currentReminder.voiceId);
    }

    startGuangzongBriefing() {
        // Guangzong - Lu Zhi arrested, shown on tactics map with cage
        // Player choice handled by TacticsScene after intro dialogue
        this.manager.switchTo('tactics', {
            battleId: 'guangzong_encounter',
            onChoiceRestrain: () => {
                // Peaceful path - go to map, player clicks Zhuo County
                this.manager.gameState.setStoryCursor('guangzong_encounter', 'liubei');
                this.manager.switchTo('map', { 
                    campaignId: 'liubei',
                    partyX: 205,  // Near Guangzong
                    partyY: 55
                });
            },
            onFightVictory: () => {
                // Called when cage is broken and Lu Zhi is freed
                this.manager.gameState.setStoryChoice('luzhi_outcome', 'freed');
                this.manager.gameState.addMilestone('freed_luzhi');
                this.manager.gameState.addWorldMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            },
            onVictory: () => {
                // Fallback for if they kill all enemies without breaking the cage
                this.manager.gameState.setStoryChoice('luzhi_outcome', 'freed');
                this.manager.gameState.addMilestone('freed_luzhi');
                this.manager.gameState.addWorldMilestone('freed_luzhi');
                this.continueAfterEscortBattle();
            }
        });
    }

    startZhuoReturn() {
        // Go directly to the Dong Zhuo battle - dialogue happens on the battle screen
        const gs = this.manager.gameState;
        const freedLuZhi = gs.getStoryChoice('luzhi_outcome') === 'freed' || gs.hasMilestone('freed_luzhi');
        
        this.manager.switchTo('tactics', {
            battleId: 'dongzhuo_battle',
            onVictory: () => {
                // After battle, show Chapter 1 end
                this.showChapter1End();
            },
            // Pass which path we're on for post-battle dialogue
            freedLuZhi: freedLuZhi
        });
    }
    
    
    showChapter1End() {
        const baseScript = [
            { bg: 'black', type: 'command', action: 'clearActors' },
            {
                type: 'title',
                text: { en: "CHAPTER 1 COMPLETE", zh: "第一章完成" },
                subtext: { en: "The Oath in the Peach Garden", zh: "桃园结义" },
                duration: 4000
            },
            {
                type: 'dialogue',
                portraitKey: 'narrator',
                voiceId: 'gz_nar_poem_01',
                text: { en: "As it was in olden time so it is today,\nThe simple wight may merit well,\nOfficialdom holds sway;\nZhang Fei, the blunt and hasty,\nWhere can you find his peer?", zh: "古往今来皆如此，\n布衣虽有功，\n官场仍当道；\n张飞，直率而急躁，\n何处可寻其匹？" }
            },
            {
                type: 'dialogue',
                portraitKey: 'narrator',
                voiceId: 'ch1_end_01',
                text: {
                    en: "But slaying the ungrateful would\nmean many deaths a year.\n\nDong Zhuo's fate will be unrolled in later chapters...",
                    zh: "若尽诛忘恩之徒，\n一年不知要杀多少人。\n\n董卓的命运，将在后续章节展开……"
                }
            },
            {
                type: 'title',
                text: { en: "END OF CHAPTER 1", zh: "第一章终" },
                subtext: { en: "Liu Bei's Story will continue...", zh: "刘备的故事仍将继续……" },
                duration: 5000
            }
        ];
        if (IS_DEMO) {
            baseScript.push(createDemoWishlistCard());
        }
        baseScript.push({ type: 'command', action: 'fade', target: 1, speed: 0.001 });

        this.manager.switchTo('narrative', {
            musicKey: 'oath',
            onComplete: () => {
                this.manager.gameState.setStoryCursor('chapter1_complete', 'liubei');
                this.manager.gameState.addMilestone('chapter1_complete');
                this.manager.switchTo('campaign_selection');
            },
            script: baseScript
        });
    }

    continueAfterEscortBattle() {
        // Summary and level-ups were already shown by TacticsScene -> BattleSummaryScene -> LevelUpScene.
        // The victory callback (onFightVictory/onVictory) is passed as onComplete to summary, and levelup
        // calls it when done. So we must not show summary again here—go straight to the outlaw story.
        this.showOutlawStory();
    }
    
    showOutlawStory() {
        // After freeing Lu Zhi - characters walk up on dirt road, have conversation, then go to map
        this.manager.switchTo('narrative', {
            musicKey: 'forest',
            onComplete: () => {
                // Go to map - player will march to Zhuo County
                this.manager.gameState.setStoryCursor('guangzong_encounter', 'liubei');
                this.manager.switchTo('map', { 
                    campaignId: 'liubei',
                    partyX: 205,  // Near where they were (Guangzong area)
                    partyY: 55
                });
            },
            script: [
                // Characters walk up from bottom on dirt_road_city_in_distance
                { bg: 'dirt_road_city_in_distance', type: 'command', action: 'clearActors' },
                { type: 'command', action: 'fade', target: 0, speed: 0.002 },
                
                // Start characters off-screen bottom
                { type: 'command', action: 'addActor', id: 'luzhi', imgKey: 'zhoujing', x: 100, y: 280 },
                { type: 'command', action: 'addActor', id: 'liubei', imgKey: 'liubei', x: 130, y: 285 },
                { type: 'command', action: 'addActor', id: 'guanyu', imgKey: 'guanyu', x: 160, y: 290 },
                { type: 'command', action: 'addActor', id: 'zhangfei', imgKey: 'zhangfei', x: 145, y: 295 },
                
                // Walk up to 1/3 up the screen (around y=180-200)
                { type: 'command', action: 'move', id: 'luzhi', x: 100, y: 180, wait: false },
                { type: 'command', action: 'move', id: 'liubei', x: 130, y: 185, wait: false },
                { type: 'command', action: 'move', id: 'guanyu', x: 160, y: 190, wait: false },
                { type: 'command', action: 'move', id: 'zhangfei', x: 145, y: 195, wait: true },
                
                // Lu Zhi thanks them but warns of consequences
                {
                    type: 'dialogue',
                    speaker: 'luzhi',
                    name: 'Commander Lu Zhi',
                    position: 'top',
                    voiceId: 'gz_lz_freed_01',
                    text: { en: "Xuande! You have saved me, but at great cost. The court will brand you as rebels for attacking imperial soldiers.", zh: "玄德！你救了我，但代价巨大。朝廷会因你们袭击官军而将你们定为叛贼。" }
                },
                {
                    type: 'dialogue',
                    speaker: 'liubei',
                    name: 'Liu Bei',
                    position: 'top',
                    voiceId: 'gz_lb_freed_02',
                    text: { en: "Master, I could not stand by while a loyal commander was led to unjust execution.", zh: "老师，我不能坐视一位忠心的将军被不义地处决。" }
                },
                {
                    type: 'dialogue',
                    speaker: 'luzhi',
                    name: 'Commander Lu Zhi',
                    position: 'top',
                    voiceId: 'gz_lz_freed_02',
                    text: { en: "Your loyalty does you credit. I will return to Guangzong in secret. Go now, before more soldiers come.", zh: "你的忠诚值得称赞。我会秘密返回广宗。现在走吧，在更多士兵到来之前。" }
                },
                {
                    type: 'dialogue',
                    speaker: 'guanyu',
                    name: 'Guan Yu',
                    position: 'top',
                    voiceId: 'gz_gy_outlaw_01',
                    text: { en: "Brother, we cannot stay. If Dong Zhuo learns we freed Lu Zhi, he will have us executed on this spot.", zh: "兄长，我们不能停留。如果董卓知道我们救了卢植，他会当场处决我们。" }
                },
                
                { type: 'command', action: 'fade', target: 1, speed: 0.002 }
            ]
        });
    }

    startBriefing() {
        this.manager.switchTo('narrative', {
            musicKey: 'forest',
            onComplete: () => {
                this.manager.switchTo('tactics', {
                    battleId: 'daxing',
                    mapGen: {
                        biome: 'northern',
                        layout: 'foothills',
                        forestDensity: 0.15,
                        mountainDensity: 0.1,
                        riverDensity: 0.05,
                        houseDensity: 0.04
                    }
                });
            },
            scriptId: 'magistrate_briefing'
        });
    }

    startCaocaoYingchuanIntercept() {
        this.manager.switchTo('tactics', {
            battleId: 'caocao_yingchuan_intercept',
            onVictory: () => this.startCaocaoYingchuanDebrief()
        });
    }

    startCaocaoYingchuanDebrief() {
        this.manager.switchTo('tactics', {
            battleId: 'caocao_yingchuan_debrief'
        });
    }

}

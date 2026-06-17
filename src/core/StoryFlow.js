import { STORY_ROUTES, getStoryNodeNextIds } from '../data/StoryGraph.js';
import { CHAPTERS } from '../data/Chapters.js';
import { BATTLES } from '../data/Battles.js';

const NODE_LAUNCH_OVERRIDES = {
    prologue: { scene: 'tactics', params: { battleId: 'yellow_turban_rout' }, label: 'battle: yellow_turban_rout' },
    prologue_complete: { scene: 'map', params: { campaignId: 'liubei', partyX: 190, partyY: 70 }, label: 'map: Zhuo County' },
    chapter1_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    caocao_intro: {
        scene: 'narrative',
        params: {
            scriptId: 'caocao_dunqiu_intro',
            musicKey: 'grim_refugees',
            musicVolume: 0.42,
            keepMusic: false
        },
        label: 'narrative: caocao_dunqiu_intro'
    },
    caocao_intro_complete: { scene: 'map', params: { campaignId: 'caocao', partyX: 168, partyY: 98 }, label: 'map: Yingchuan' },
    caocao_chapter1_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    chapter2_oath_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    chapter2_hejin_gate_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' }
};

const PARTY_POSITIONS = {
    liubei: {
        default: { partyX: 190, partyY: 70 },
        qingzhou_siege: { partyX: 210, partyY: 110 },
        qingzhou_cleanup: { partyX: 220, partyY: 95 },
        guangzong_camp: { partyX: 205, partyY: 55 },
        yingchuan_aftermath: { partyX: 205, partyY: 55 },
        guangzong_encounter: { partyX: 205, partyY: 55 },
        dongzhuo_battle: { partyX: 190, partyY: 70 }
    },
    caocao: {
        default: { partyX: 168, partyY: 98 }
    },
    chapter2_oath: {
        default: { partyX: 220, partyY: 95 }
    }
};

let chapterSceneMetadata = null;

export function collectChapterSceneMetadata() {
    if (chapterSceneMetadata) return chapterSceneMetadata;
    const byNodeId = {};
    for (const chapter of Object.values(CHAPTERS || {})) {
        const addScenes = (scenes = []) => {
            scenes.forEach(scene => {
                if (scene?.id) byNodeId[scene.id] = scene;
            });
        };
        addScenes(chapter.scenes);
        for (const route of Object.values(chapter.routes || {})) {
            addScenes(route.scenes);
        }
    }
    chapterSceneMetadata = byNodeId;
    return chapterSceneMetadata;
}

export function resolveStoryLaunchTarget(routeId, nodeId) {
    if (NODE_LAUNCH_OVERRIDES[nodeId]) return NODE_LAUNCH_OVERRIDES[nodeId];

    const chapterScene = collectChapterSceneMetadata()[nodeId];
    if (chapterScene?.type === 'battle' && chapterScene.battleId) {
        return {
            scene: 'tactics',
            params: { battleId: chapterScene.battleId },
            label: `battle: ${chapterScene.battleId}`
        };
    }
    if (chapterScene?.type === 'narrative' && chapterScene.scriptId) {
        return {
            scene: 'narrative',
            params: { scriptId: chapterScene.scriptId },
            label: `narrative: ${chapterScene.scriptId}`
        };
    }
    if (BATTLES?.[nodeId]) {
        return {
            scene: 'tactics',
            params: { battleId: nodeId },
            label: `battle: ${nodeId}`
        };
    }

    const pos = PARTY_POSITIONS[routeId]?.[nodeId] || PARTY_POSITIONS[routeId]?.default || {};
    return {
        scene: 'map',
        params: { campaignId: routeId, ...pos },
        label: 'map'
    };
}

function transitionMatches(transition, gameState, routeId) {
    if (!transition) return false;
    if (transition.choice) {
        const actual = gameState?.getStoryChoice?.(transition.choice, undefined, routeId);
        if (transition.value !== undefined) return actual === transition.value;
        return actual !== undefined;
    }
    if (transition.milestone) {
        return gameState?.hasMilestone?.(transition.milestone, routeId) === true;
    }
    return true;
}

export function getNextStoryNodeId(routeId, nodeId, gameState = null) {
    const node = STORY_ROUTES?.[routeId]?.nodes?.[nodeId];
    if (Array.isArray(node?.transitions)) {
        const transition = node.transitions.find(t => transitionMatches(t, gameState, routeId));
        return transition?.to || null;
    }
    const nextIds = getStoryNodeNextIds(node);
    return nextIds[0] || null;
}

export function buildStoryLaunchParams(manager, routeId, nodeId, launch) {
    const params = { ...(launch.params || {}) };
    if (launch.scene === 'map') {
        params.campaignId = params.campaignId || routeId;
    } else if (launch.scene === 'tactics') {
        params.storyRouteId = routeId;
        params.storyNodeId = nodeId;
        params.onVictory = () => completeStoryNode(manager, routeId, nodeId);
    } else if (launch.scene === 'narrative') {
        params.storyRouteId = routeId;
        params.storyNodeId = nodeId;
        params.onComplete = () => completeStoryNode(manager, routeId, nodeId);
    }
    return params;
}

export function launchStoryNode(manager, routeId, nodeId, options = {}) {
    const { setCursor = true } = options;
    const gs = manager.gameState;
    if (setCursor) gs.setStoryCursor(nodeId, routeId);
    gs.setCurrentCampaign(routeId);
    const launch = resolveStoryLaunchTarget(routeId, nodeId);
    const params = buildStoryLaunchParams(manager, routeId, nodeId, launch);
    manager.switchTo(launch.scene, params);
}

export function completeStoryNode(manager, routeId, nodeId) {
    const gs = manager.gameState;
    gs.addMilestone(nodeId, routeId);

    const nextNodeId = getNextStoryNodeId(routeId, nodeId, gs);
    if (!nextNodeId) {
        manager.switchTo('campaign_selection');
        return;
    }

    launchStoryNode(manager, routeId, nextNodeId);
}

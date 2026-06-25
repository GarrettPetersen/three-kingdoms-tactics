import { CHAPTERS } from '../data/Chapters.js';
import { IS_DEMO } from './Constants.js';

const DEMO_MAX_CHAPTER_ID = 1;

let chapterMetadata = null;

function buildChapterMetadata() {
    if (chapterMetadata) return chapterMetadata;

    const routeChapterIds = {};
    const nodeChapterIds = {};
    const battleChapterIds = {};
    const scriptChapterIds = {};

    for (const chapter of Object.values(CHAPTERS || {})) {
        const chapterId = Number(chapter.id);
        const recordScene = (scene) => {
            if (!scene) return;
            if (scene.id) nodeChapterIds[scene.id] = chapterId;
            if (scene.battleId) battleChapterIds[scene.battleId] = chapterId;
            if (scene.scriptId) scriptChapterIds[scene.scriptId] = chapterId;
        };

        (chapter.scenes || []).forEach(recordScene);
        for (const route of Object.values(chapter.routes || {})) {
            if (route?.id) routeChapterIds[route.id] = chapterId;
            (route.scenes || []).forEach(recordScene);
        }
    }

    chapterMetadata = {
        routeChapterIds,
        nodeChapterIds,
        battleChapterIds,
        scriptChapterIds
    };
    return chapterMetadata;
}

function inferChapterIdFromIdentifier(id) {
    if (!id || typeof id !== 'string') return null;
    const match = id.match(/^(?:chapter|ch)(\d+)(?:_|$)/i);
    return match ? Number(match[1]) : null;
}

export function isChapterAvailableInBuild(chapterId) {
    if (!IS_DEMO) return true;
    const numericChapterId = Number(chapterId);
    return !Number.isFinite(numericChapterId) || numericChapterId <= DEMO_MAX_CHAPTER_ID;
}

export function getStoryRouteChapterId(routeId) {
    const metadata = buildChapterMetadata();
    return metadata.routeChapterIds[routeId] || inferChapterIdFromIdentifier(routeId);
}

export function getStoryNodeChapterId(nodeId) {
    const metadata = buildChapterMetadata();
    return metadata.nodeChapterIds[nodeId] || inferChapterIdFromIdentifier(nodeId);
}

export function getBattleChapterId(battleId) {
    const metadata = buildChapterMetadata();
    return metadata.battleChapterIds[battleId] || inferChapterIdFromIdentifier(battleId);
}

export function getNarrativeScriptChapterId(scriptId) {
    const metadata = buildChapterMetadata();
    return metadata.scriptChapterIds[scriptId] || inferChapterIdFromIdentifier(scriptId);
}

export function isStoryRouteAvailableInBuild(routeId) {
    return isChapterAvailableInBuild(getStoryRouteChapterId(routeId));
}

export function isStoryNodeAvailableInBuild(nodeId) {
    return isChapterAvailableInBuild(getStoryNodeChapterId(nodeId));
}

export function isBattleAvailableInBuild(battleId) {
    return isChapterAvailableInBuild(getBattleChapterId(battleId));
}

export function isNarrativeScriptAvailableInBuild(scriptId) {
    return isChapterAvailableInBuild(getNarrativeScriptChapterId(scriptId));
}

export function isSceneTargetAvailableInBuild(sceneName, params = {}, gameState = null) {
    if (!IS_DEMO) return true;

    if (sceneName === 'map') {
        const campaignId = params.campaignId || (params.isResume ? gameState?.getCurrentCampaign?.() : null);
        return !campaignId || isStoryRouteAvailableInBuild(campaignId);
    }

    if (sceneName === 'tactics') {
        const savedState = params.isResume ? gameState?.getSceneState?.('tactics') : null;
        const battleId = params.battleId || savedState?.battleId || gameState?.getCurrentBattleId?.();
        return !battleId || isBattleAvailableInBuild(battleId);
    }

    if (sceneName === 'narrative') {
        const savedState = params.isResume ? gameState?.getSceneState?.('narrative') : null;
        const scriptId = params.scriptId || savedState?.scriptId;
        return !scriptId || isNarrativeScriptAvailableInBuild(scriptId);
    }

    if (sceneName === 'levelup') {
        const campaignId = gameState?.getCurrentCampaign?.();
        return !campaignId || isStoryRouteAvailableInBuild(campaignId);
    }

    if (sceneName === 'liubo' && params.mode === 'campaign') {
        const campaignId = gameState?.getCurrentCampaign?.();
        return !campaignId || isStoryRouteAvailableInBuild(campaignId);
    }

    return true;
}

export function getBuildUnavailableFallbackTarget() {
    return { scene: 'campaign_selection', params: {} };
}

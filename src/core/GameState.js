import { STORY_ROUTES, buildParentMap } from '../data/StoryGraph.js';
import { CHAPTERS } from '../data/Chapters.js';

const SAVE_VERSION = 4;
const SCENE_STATE_KEYS = ['map', 'tactics', 'narrative', 'levelup', 'liubo'];
const FORCE_IDS = {
    LIU_BEI: 'liuBei',
    CAO_CAO: 'caoCao'
};
const SHARED_FORCE_ROUTES = {
    liubei: FORCE_IDS.LIU_BEI,
    chapter2_oath: FORCE_IDS.LIU_BEI,
    caocao: FORCE_IDS.CAO_CAO
};
const SHARED_FORCE_ROUTE_ORDER = {
    [FORCE_IDS.LIU_BEI]: ['liubei', 'chapter2_oath'],
    [FORCE_IDS.CAO_CAO]: ['caocao']
};
const SHARED_FORCE_KEYS = new Set(['unitXP', 'unitClasses', 'unitLevelsSeen', 'allyParties', 'unitTraits']);
const DEFAULT_ALLY_PARTIES_BY_FORCE = {
    [FORCE_IDS.LIU_BEI]: {
        liubei: ['ally1'],
        guanyu: ['ally2'],
        zhangfei: ['ally3']
    },
    [FORCE_IDS.CAO_CAO]: {
        caocao: ['rider1', 'rider2', 'rider3']
    }
};
const DEFAULT_UNIT_TRAITS_BY_FORCE = {
    [FORCE_IDS.LIU_BEI]: {},
    [FORCE_IDS.CAO_CAO]: {
        rider2: {
            hasWhiteHorse: true,
            horseType: 'white'
        }
    }
};

function createSceneStates() {
    return Object.fromEntries(SCENE_STATE_KEYS.map(key => [key, null]));
}

function uniqueList(values = []) {
    return [...new Set(values.filter(Boolean))];
}

function clonePlain(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

export class GameState {
    constructor() {
        this.saveKey = 'three_kingdoms_tactics_save';
        this.data = this.getDefaults();
    }

    getDefaults() {
        return {
            version: SAVE_VERSION,
            activeRunId: null,
            runs: {},
            world: {
                unlockedYears: ['184'],
                flags: {},
                choices: {},
                completedRoutes: {},
                forceState: {}
            },
            session: {
                lastScene: 'title',
                lastRunId: null,
                currentBattleId: null
            },
            customStats: {
                totalBattles: 0,
                wins: 0,
                losses: 0,
                enemiesDefeated: 0,
                unitsLost: 0
            }
        };
    }

    getLegacySceneName(key) {
        if (key === 'mapState') return 'map';
        if (key === 'battleState') return 'tactics';
        if (key === 'narrativeState') return 'narrative';
        return null;
    }

    createRunState(routeId) {
        const route = STORY_ROUTES[routeId];
        return {
            routeId,
            currentNodeId: null,
            visitedNodeIds: route?.startNode ? [route.startNode] : [],
            completedNodeIds: [],
            choices: {},
            flags: {},
            sceneStates: createSceneStates(),
            party: {},
            state: {},
            inventory: {}
        };
    }

    getRunState(routeId = null, { create = true } = {}) {
        const id = routeId || this.getCurrentCampaign();
        if (!id) return null;
        if (!this.data.runs) this.data.runs = {};
        if (!this.data.runs[id] && create) {
            this.data.runs[id] = this.createRunState(id);
        }
        const run = this.data.runs[id] || null;
        if (run && create) this.repairRunShape(run, id);
        return run;
    }

    repairRunShape(run, routeId = run?.routeId) {
        if (!run) return;
        run.routeId = run.routeId || routeId;
        run.visitedNodeIds = uniqueList(run.visitedNodeIds || []);
        run.completedNodeIds = uniqueList(run.completedNodeIds || []);
        run.choices = { ...(run.choices || {}) };
        run.flags = { ...(run.flags || {}) };
        run.sceneStates = { ...createSceneStates(), ...(run.sceneStates || {}) };
        run.party = { ...(run.party || {}) };
        run.state = { ...(run.state || {}) };
        run.inventory = { ...(run.inventory || {}) };
    }

    repairWorldShape() {
        const defaults = this.getDefaults().world;
        this.data.world = {
            ...defaults,
            ...(this.data.world || {}),
            flags: { ...(this.data.world?.flags || {}) },
            choices: { ...(this.data.world?.choices || {}) },
            completedRoutes: { ...(this.data.world?.completedRoutes || {}) },
            forceState: { ...(this.data.world?.forceState || {}) },
            unlockedYears: this.data.world?.unlockedYears || defaults.unlockedYears
        };
    }

    getSharedForceId(routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        return SHARED_FORCE_ROUTES[resolvedRouteId] || null;
    }

    getSharedForceRouteOrder(forceId, preferredRouteId = null) {
        const order = [];
        const add = (routeId) => {
            if (routeId && !order.includes(routeId)) order.push(routeId);
        };
        (SHARED_FORCE_ROUTE_ORDER[forceId] || []).forEach(add);
        add(preferredRouteId);
        return order;
    }

    mergeLegacyForceVar(key, forceId, preferredRouteId = null) {
        const merged = {};
        this.getSharedForceRouteOrder(forceId, preferredRouteId).forEach(routeId => {
            const legacy = this.data.runs?.[routeId]?.state?.[key];
            if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
                Object.assign(merged, legacy);
            }
        });
        return merged;
    }

    getSharedForceState(forceId = FORCE_IDS.LIU_BEI, preferredRouteId = null) {
        this.repairWorldShape();
        if (!this.data.world.forceState[forceId]) {
            this.data.world.forceState[forceId] = {};
        }
        const force = this.data.world.forceState[forceId];
        force.unitXP = {
            ...this.mergeLegacyForceVar('unitXP', forceId, preferredRouteId),
            ...(force.unitXP || {})
        };
        force.unitClasses = {
            ...this.mergeLegacyForceVar('unitClasses', forceId, preferredRouteId),
            ...(force.unitClasses || {})
        };
        force.unitLevelsSeen = {
            ...this.mergeLegacyForceVar('unitLevelsSeen', forceId, preferredRouteId),
            ...(force.unitLevelsSeen || {})
        };
        force.allyParties = {
            ...clonePlain(DEFAULT_ALLY_PARTIES_BY_FORCE[forceId] || {}),
            ...(force.allyParties || {})
        };
        force.unitTraits = {
            ...clonePlain(DEFAULT_UNIT_TRAITS_BY_FORCE[forceId] || {}),
            ...this.mergeLegacyForceVar('unitTraits', forceId, preferredRouteId),
            ...(force.unitTraits || {})
        };
        return force;
    }

    getAllyParties(campaignId = null) {
        const forceId = this.getSharedForceId(campaignId);
        if (!forceId) return {};
        return this.getSharedForceState(forceId, campaignId).allyParties;
    }

    getAllyPartyOwner(unitId, campaignId = null) {
        const parties = this.getAllyParties(campaignId);
        return Object.keys(parties).find(ownerId => (parties[ownerId] || []).includes(unitId)) || null;
    }

    getUnitTraits(unitId, campaignId = null) {
        const forceId = this.getSharedForceId(campaignId);
        if (!forceId || !unitId) return {};
        return { ...(this.getSharedForceState(forceId, campaignId).unitTraits?.[unitId] || {}) };
    }

    save() {
        localStorage.setItem(this.saveKey, JSON.stringify(this.data));
    }

    load() {
        const saved = localStorage.getItem(this.saveKey);
        if (!saved) return false;

        try {
            const parsed = JSON.parse(saved);
            if (parsed?.version !== SAVE_VERSION || !parsed?.runs || !parsed?.world) {
                this.data = this.getDefaults();
                localStorage.removeItem(this.saveKey);
                return false;
            }

            const defaults = this.getDefaults();
            this.data = {
                ...defaults,
                ...parsed,
                version: SAVE_VERSION,
                activeRunId: parsed.activeRunId ?? parsed.session?.lastRunId ?? null,
                runs: { ...(parsed.runs || {}) },
                world: {
                    ...defaults.world,
                    ...(parsed.world || {}),
                    flags: { ...(parsed.world?.flags || {}) },
                    choices: { ...(parsed.world?.choices || {}) },
                    completedRoutes: { ...(parsed.world?.completedRoutes || {}) },
                    forceState: { ...(parsed.world?.forceState || {}) },
                    unlockedYears: parsed.world?.unlockedYears || defaults.world.unlockedYears
                },
                session: {
                    ...defaults.session,
                    ...(parsed.session || {})
                },
                customStats: {
                    ...defaults.customStats,
                    ...(parsed.customStats || {})
                }
            };

            for (const [routeId, run] of Object.entries(this.data.runs)) {
                this.repairRunShape(run, routeId);
            }
            this.repairWorldShape();
            this.save();
            return true;
        } catch (e) {
            console.error('Failed to parse save data', e);
            return false;
        }
    }

    getLastScene() {
        return this.data.session?.lastScene;
    }

    setLastScene(sceneName) {
        if (!this.data.session) this.data.session = this.getDefaults().session;
        this.data.session.lastScene = sceneName;
        this.save();
    }

    getCurrentCampaign() {
        return this.data.activeRunId ?? this.data.session?.lastRunId ?? null;
    }

    setCurrentCampaign(campaignId) {
        if (!this.data.session) this.data.session = this.getDefaults().session;
        this.data.activeRunId = campaignId ?? null;
        this.data.session.lastRunId = campaignId ?? null;
        if (campaignId) this.getRunState(campaignId);
        this.save();
    }

    getCurrentBattleId() {
        return this.data.session?.currentBattleId ?? null;
    }

    setCurrentBattleId(battleId) {
        if (!this.data.session) this.data.session = this.getDefaults().session;
        this.data.session.currentBattleId = battleId;
        this.save();
    }

    setCampaignVar(key, value, campaignId = null) {
        const resolvedRouteId = campaignId || this.getCurrentCampaign();
        const forceId = SHARED_FORCE_KEYS.has(key) ? this.getSharedForceId(resolvedRouteId) : null;
        if (forceId) {
            const force = this.getSharedForceState(forceId, resolvedRouteId);
            force[key] = (value && typeof value === 'object') ? clonePlain(value) : value;
            this.save();
            return;
        }
        const run = this.getRunState(campaignId);
        if (!run) return;
        if (key === 'partyX' || key === 'partyY') {
            run.party[key] = value;
        } else {
            run.state[key] = value;
        }
        this.save();
    }

    getCampaignVar(key, campaignId = null) {
        const resolvedRouteId = campaignId || this.getCurrentCampaign();
        const forceId = SHARED_FORCE_KEYS.has(key) ? this.getSharedForceId(resolvedRouteId) : null;
        if (forceId) {
            const force = this.getSharedForceState(forceId, resolvedRouteId);
            return force[key];
        }
        const run = this.getRunState(campaignId, { create: false });
        if (key === 'partyX' || key === 'partyY') return run?.party?.[key];
        return run?.state?.[key];
    }

    getStoryState(routeId = null) {
        const activeRoute = routeId || this.getCurrentCampaign();
        const run = activeRoute ? this.getRunState(activeRoute) : null;
        return {
            activeRoute,
            cursorNode: run?.currentNodeId ?? null,
            choices: { ...(run?.choices || {}) },
            routes: Object.fromEntries(Object.entries(this.data.runs || {}).map(([id, routeRun]) => [
                id,
                {
                    cursorNode: routeRun.currentNodeId ?? null,
                    choices: { ...(routeRun.choices || {}) },
                    visitedNodeIds: [...(routeRun.visitedNodeIds || [])],
                    completedNodeIds: [...(routeRun.completedNodeIds || [])],
                    flags: { ...(routeRun.flags || {}) }
                }
            ])),
            globalChoices: { ...(this.data.world?.choices || {}) }
        };
    }

    setStoryState(storyState = {}) {
        const activeRoute = storyState.activeRoute || this.getCurrentCampaign();
        if (activeRoute) {
            const run = this.getRunState(activeRoute);
            const routeBucket = storyState.routes?.[activeRoute] || {};
            if (storyState.cursorNode !== undefined) run.currentNodeId = storyState.cursorNode;
            if (routeBucket.cursorNode !== undefined) run.currentNodeId = routeBucket.cursorNode;
            if (storyState.choices) run.choices = { ...run.choices, ...storyState.choices };
            if (routeBucket.choices) run.choices = { ...run.choices, ...routeBucket.choices };
            if (routeBucket.visitedNodeIds) run.visitedNodeIds = uniqueList(routeBucket.visitedNodeIds);
            if (routeBucket.completedNodeIds) run.completedNodeIds = uniqueList(routeBucket.completedNodeIds);
            if (routeBucket.flags) run.flags = { ...run.flags, ...routeBucket.flags };
            this.data.activeRunId = activeRoute;
            this.data.session.lastRunId = activeRoute;
        }
        if (storyState.globalChoices) {
            this.data.world.choices = { ...this.data.world.choices, ...storyState.globalChoices };
        }
        this.save();
    }

    startStoryRoute(routeId, startNode = null) {
        const route = STORY_ROUTES[routeId];
        if (!route) return;
        const run = this.getRunState(routeId);
        const node = startNode || run.currentNodeId || route.startNode;
        run.currentNodeId = node;
        run.visitedNodeIds = uniqueList([...(run.visitedNodeIds || []), route.startNode, node]);
        this.data.activeRunId = routeId;
        this.data.session.lastRunId = routeId;
        this.save();
    }

    markStoryPathReached(run, nodeId) {
        if (!run || !nodeId) return;
        const routeId = run.routeId;
        const parents = buildParentMap(routeId);
        const reached = [];
        let cur = nodeId;
        while (cur && !reached.includes(cur)) {
            reached.push(cur);
            cur = parents[cur] || null;
        }
        run.visitedNodeIds = uniqueList([...(run.visitedNodeIds || []), ...reached]);
        run.completedNodeIds = uniqueList([...(run.completedNodeIds || []), ...reached.filter(id => id !== nodeId)]);
    }

    setStoryCursor(nodeId, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const route = STORY_ROUTES[resolvedRouteId];
        if (!route || !route.nodes[nodeId]) return;
        const run = this.getRunState(resolvedRouteId);
        if (run.currentNodeId && run.currentNodeId !== nodeId) {
            run.completedNodeIds = uniqueList([...(run.completedNodeIds || []), run.currentNodeId]);
        }
        run.currentNodeId = nodeId;
        this.markStoryPathReached(run, nodeId);
        this.data.activeRunId = resolvedRouteId;
        this.data.session.lastRunId = resolvedRouteId;
        this.save();
    }

    getStoryCursor(routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const run = resolvedRouteId ? this.getRunState(resolvedRouteId, { create: false }) : null;
        return { routeId: resolvedRouteId, nodeId: run?.currentNodeId ?? null };
    }

    hasReachedStoryNode(nodeId, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const route = STORY_ROUTES[resolvedRouteId];
        if (!route || !route.nodes[nodeId]) return false;
        const run = this.getRunState(resolvedRouteId, { create: false });
        if (!run) return false;
        return run.currentNodeId === nodeId
            || (run.visitedNodeIds || []).includes(nodeId)
            || (run.completedNodeIds || []).includes(nodeId)
            || run.flags?.[nodeId] === true;
    }

    hasCompletedStoryNode(nodeId, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const route = STORY_ROUTES[resolvedRouteId];
        if (!route || !route.nodes[nodeId]) return false;
        const run = this.getRunState(resolvedRouteId, { create: false });
        if (!run) return false;
        return (run.completedNodeIds || []).includes(nodeId)
            || run.flags?.[nodeId] === true;
    }

    setStoryChoice(key, value, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        if (!resolvedRouteId) {
            this.data.world.choices[key] = value;
            this.save();
            return;
        }
        const run = this.getRunState(resolvedRouteId);
        run.choices[key] = value;
        this.save();
    }

    clearStoryChoice(key, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        if (!resolvedRouteId) {
            this.clearWorldChoice(key);
            return;
        }
        const run = this.getRunState(resolvedRouteId, { create: false });
        if (!run?.choices || run.choices[key] === undefined) return;
        delete run.choices[key];
        this.save();
    }

    setWorldChoice(key, value) {
        this.data.world.choices[key] = value;
        this.save();
    }

    clearWorldChoice(key) {
        if (this.data.world?.choices?.[key] === undefined) return;
        delete this.data.world.choices[key];
        this.save();
    }

    getStoryChoice(key, fallback = null, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const run = resolvedRouteId ? this.getRunState(resolvedRouteId, { create: false }) : null;
        if (run?.choices?.[key] !== undefined) return run.choices[key];
        return this.data.world?.choices?.[key] ?? fallback;
    }

    resolveStoryRouteId(routeId = null) {
        return routeId || this.getCurrentCampaign();
    }

    getSceneState(sceneName, routeId = null) {
        const run = this.getRunState(this.resolveStoryRouteId(routeId), { create: false });
        return run?.sceneStates?.[sceneName] ?? null;
    }

    setSceneState(sceneName, state, routeId = null) {
        const run = this.getRunState(this.resolveStoryRouteId(routeId));
        if (!run) return;
        run.sceneStates[sceneName] = state;
        this.save();
    }

    clearSceneState(sceneName, routeId = null) {
        this.setSceneState(sceneName, null, routeId);
    }

    getCampaignLiuboRecord(routeId = null) {
        const run = this.getRunState(routeId);
        if (!run) return { played: 0, wins: 0, losses: 0, activities: {} };
        if (!run.state.liuboRecord) {
            run.state.liuboRecord = { played: 0, wins: 0, losses: 0, activities: {} };
        }
        if (!run.state.liuboRecord.activities) run.state.liuboRecord.activities = {};
        return run.state.liuboRecord;
    }

    recordCampaignLiuboResult(activityId, won, routeId = null) {
        const record = this.getCampaignLiuboRecord(routeId);
        record.played = (record.played || 0) + 1;
        if (won) record.wins = (record.wins || 0) + 1;
        else record.losses = (record.losses || 0) + 1;
        if (activityId) {
            const activity = record.activities[activityId] || { played: 0, wins: 0, losses: 0 };
            activity.played = (activity.played || 0) + 1;
            if (won) activity.wins = (activity.wins || 0) + 1;
            else activity.losses = (activity.losses || 0) + 1;
            record.activities[activityId] = activity;
        }
        this.save();
        return record;
    }

    resolveContinueTarget(options = {}) {
        const {
            validateNarrativeState = () => true,
            excludedScenes = ['title', 'custom_battle', 'summary', 'recovery', 'debug_story_graph', 'story_script_reader']
        } = options;

        const campaignId = this.getCurrentCampaign();
        const lastScene = this.getLastScene();
        const narrativeState = this.getSceneState('narrative');
        const battleState = this.getSceneState('tactics');
        const mapState = this.getSceneState('map');
        const levelUpState = this.getSceneState('levelup');
        const liuboState = this.getSceneState('liubo');

        if (this.isCampaignComplete(campaignId)) {
            return { scene: 'campaign_selection', params: {} };
        }

        const hasValidNarrativeState = !!(narrativeState && validateNarrativeState(narrativeState));
        if (narrativeState && !hasValidNarrativeState) {
            console.warn('Clearing invalid narrative state', narrativeState);
            this.clearSceneState('narrative');
        }

        if (liuboState) {
            return { scene: 'liubo', params: { isResume: true } };
        }

        if (lastScene === 'map') {
            return { scene: 'map', params: { campaignId, isResume: true } };
        }
        if (lastScene === 'tactics' && battleState) {
            return { scene: 'tactics', params: { isResume: true } };
        }
        if (lastScene === 'narrative' && hasValidNarrativeState) {
            return { scene: 'narrative', params: { isResume: true } };
        }
        if (lastScene === 'levelup' && levelUpState) {
            return { scene: 'levelup', params: { isResume: true } };
        }

        if (hasValidNarrativeState) {
            return { scene: 'narrative', params: { isResume: true } };
        }
        if (mapState) {
            return { scene: 'map', params: { campaignId, isResume: true } };
        }
        if (battleState) {
            return { scene: 'tactics', params: { isResume: true } };
        }
        if (levelUpState) {
            return { scene: 'levelup', params: { isResume: true } };
        }

        let resolvedLastScene = lastScene;
        if (!resolvedLastScene || excludedScenes.includes(resolvedLastScene)) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }
        if (resolvedLastScene === 'narrative' && !hasValidNarrativeState) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }
        if (resolvedLastScene === 'tactics' && !battleState) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }

        const sceneState = this.getSceneState(resolvedLastScene);
        if (sceneState) {
            return { scene: resolvedLastScene, params: { isResume: true } };
        }

        return { scene: resolvedLastScene, params: { campaignId } };
    }

    validateAndRepairInvariants(targetScene = null, targetParams = {}) {
        let changed = false;

        if (!this.data.runs) {
            this.data.runs = {};
            changed = true;
        }
        if (!this.data.world) {
            this.data.world = this.getDefaults().world;
            changed = true;
        }
        if (!this.data.session) {
            this.data.session = this.getDefaults().session;
            changed = true;
        }

        let currentCampaign = this.getCurrentCampaign();
        if (targetScene === 'map' && !currentCampaign) {
            this.data.activeRunId = 'liubei';
            this.data.session.lastRunId = 'liubei';
            currentCampaign = 'liubei';
            changed = true;
        }

        const run = currentCampaign ? this.getRunState(currentCampaign) : null;
        const mapState = run?.sceneStates?.map ?? null;
        const battleState = run?.sceneStates?.tactics ?? null;
        const narrativeState = run?.sceneStates?.narrative ?? null;

        if (mapState) {
            if (!mapState.party || mapState.party.x === undefined || mapState.party.y === undefined) {
                run.sceneStates.map = null;
                changed = true;
            } else if (!mapState.currentCampaignId && currentCampaign) {
                mapState.currentCampaignId = currentCampaign;
                changed = true;
            }
        }

        if (battleState && !battleState.battleId) {
            run.sceneStates.tactics = null;
            changed = true;
        }

        if (narrativeState && typeof narrativeState.currentStep !== 'number') {
            run.sceneStates.narrative = null;
            changed = true;
        }

        if (!this.getCurrentBattleId() && battleState?.battleId) {
            this.data.session.currentBattleId = battleState.battleId;
            changed = true;
        }
        if (targetScene === 'tactics' && !this.getCurrentBattleId() && !battleState?.battleId && !targetParams?.battleId) {
            this.data.session.currentBattleId = 'daxing';
            changed = true;
        }

        if (changed) this.save();
    }

    addMilestone(id, routeId = null) {
        if (!id) return;
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const route = STORY_ROUTES[resolvedRouteId];
        if (resolvedRouteId) {
            const run = this.getRunState(resolvedRouteId);
            run.flags[id] = true;
            if (route?.nodes?.[id]) {
                if (run.currentNodeId !== id) run.completedNodeIds = uniqueList([...(run.completedNodeIds || []), id]);
                run.visitedNodeIds = uniqueList([...(run.visitedNodeIds || []), id]);
            }
        } else {
            this.data.world.flags[id] = true;
        }
        this.save();
    }

    addWorldMilestone(id) {
        if (!id) return;
        this.data.world.flags[id] = true;
        this.save();
    }

    removeMilestone(id, routeId = null) {
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const run = resolvedRouteId ? this.getRunState(resolvedRouteId, { create: false }) : null;
        if (run) {
            delete run.flags[id];
            run.visitedNodeIds = (run.visitedNodeIds || []).filter(nodeId => nodeId !== id);
            run.completedNodeIds = (run.completedNodeIds || []).filter(nodeId => nodeId !== id);
        }
        delete this.data.world.flags[id];
        this.save();
    }

    hasMilestone(id, routeId = null) {
        if (!id) return false;
        const resolvedRouteId = routeId || this.getCurrentCampaign();
        const run = resolvedRouteId ? this.getRunState(resolvedRouteId, { create: false }) : null;
        if (run?.flags?.[id]) return true;
        if ((run?.visitedNodeIds || []).includes(id)) return true;
        if ((run?.completedNodeIds || []).includes(id)) return true;
        return this.data.world?.flags?.[id] === true;
    }

    getChapterRouteIds(chapterId) {
        const chapter = CHAPTERS?.[chapterId];
        if (!chapter) return [];
        if (chapter.routes && typeof chapter.routes === 'object') {
            return Object.values(chapter.routes)
                .map(route => route?.id)
                .filter(Boolean);
        }
        if (Number(chapterId) === 1) return ['liubei'];
        return [];
    }

    isChapterComplete(chapterId) {
        const routeIds = this.getChapterRouteIds(chapterId);
        if (routeIds.length > 0) {
            return routeIds.every(routeId => this.isCampaignComplete(routeId));
        }
        return this.hasMilestone(`chapter${chapterId}_complete`);
    }

    isCampaignComplete(campaignId = null) {
        const id = campaignId || this.getCurrentCampaign();
        if (!id) return false;

        if (this.data.world?.completedRoutes?.[id]) return true;

        const route = STORY_ROUTES[id];
        if (route?.terminalNode && this.hasReachedStoryNode(route.terminalNode, id)) return true;
        if (this.hasMilestone(`${id}_complete`, id)) return true;

        const explicitCompletionMilestone = {
            liubei: 'chapter1_complete'
        };
        const key = explicitCompletionMilestone[id];
        return !!(key && this.hasMilestone(key, id));
    }

    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    reset() {
        this.data = this.getDefaults();
        localStorage.removeItem(this.saveKey);
        this.save();
    }

    set(key, value) {
        const sceneName = this.getLegacySceneName(key);
        if (sceneName) {
            this.setSceneState(sceneName, value);
            return;
        }
        if (key === 'lastScene') {
            this.setLastScene(value);
            return;
        }
        if (key === 'currentCampaign') {
            this.setCurrentCampaign(value);
            return;
        }
        if (key === 'currentBattleId') {
            this.setCurrentBattleId(value);
            return;
        }
        if (key === 'milestones') {
            const run = this.getRunState();
            if (run) {
                run.flags = Object.fromEntries((value || []).map(id => [id, true]));
            } else {
                this.data.world.flags = Object.fromEntries((value || []).map(id => [id, true]));
            }
            this.save();
            return;
        }
        if (key === 'unlockedYears') {
            this.data.world.unlockedYears = value || ['184'];
            this.save();
            return;
        }
        this.data[key] = value;
        this.save();
    }

    get(key) {
        const sceneName = this.getLegacySceneName(key);
        if (sceneName) {
            return this.getSceneState(sceneName);
        }
        if (key === 'lastScene') return this.getLastScene();
        if (key === 'currentCampaign') return this.getCurrentCampaign();
        if (key === 'currentBattleId') return this.getCurrentBattleId();
        if (key === 'milestones') {
            const run = this.getRunState(null, { create: false });
            return Object.keys(run?.flags || {});
        }
        if (key === 'unlockedYears') return this.data.world?.unlockedYears;
        return this.data[key];
    }
}

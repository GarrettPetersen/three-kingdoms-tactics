import { STORY_ROUTES, buildParentMap } from '../data/StoryGraph.js';
import { CHAPTERS } from '../data/Chapters.js';

export class GameState {
    constructor() {
        this.saveKey = 'three_kingdoms_tactics_save';
        this.data = this.getDefaults();
    }

    getDefaults() {
        return {
            version: 3,
            progress: {
                unlockedYears: ['184'],
                milestones: [] // e.g. 'prologue_complete', 'daxing_won'
            },
            session: {
                lastScene: 'title',
                currentCampaign: null,
                currentBattleId: null,
                story: {
                    activeRoute: null,
                    cursorNode: null,
                    choices: {},
                    routes: {},
                    globalChoices: {}
                },
                sceneStates: {
                    map: null,
                    tactics: null,
                    narrative: null
                },
                sceneStatesByRoute: {} // { routeId: { map, tactics, narrative } }
            },
            // Campaign-specific persistent state
            campaignState: {}, // { 'liubei': { partyX, partyY, unitXP, unitClasses } }
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

    // Isolated campaign state management
    setCampaignVar(key, value, campaignId = null) {
        const id = campaignId || this.getCurrentCampaign();
        if (!id) return;
        
        if (!this.data.campaignState[id]) {
            this.data.campaignState[id] = {};
        }
        this.data.campaignState[id][key] = value;
        this.save();
    }

    getCampaignVar(key, campaignId = null) {
        const id = campaignId || this.getCurrentCampaign();
        if (!id || !this.data.campaignState[id]) return undefined;
        return this.data.campaignState[id][key];
    }

    getLastScene() {
        return this.data.session?.lastScene;
    }

    setLastScene(sceneName) {
        if (!this.data.session) this.data.session = {};
        this.data.session.lastScene = sceneName;
        this.save();
    }

    getCurrentCampaign() {
        return this.data.session?.currentCampaign ?? null;
    }

    setCurrentCampaign(campaignId) {
        if (!this.data.session) this.data.session = {};
        this.data.session.currentCampaign = campaignId;
        if (campaignId && STORY_ROUTES[campaignId]) {
            const story = this.getStoryState(campaignId);
            this.data.session.story = {
                ...(this.data.session.story || {}),
                activeRoute: campaignId,
                cursorNode: story.cursorNode ?? STORY_ROUTES[campaignId].startNode,
                choices: { ...(story.choices || {}) },
                routes: { ...(story.routes || {}) },
                globalChoices: { ...(story.globalChoices || {}) }
            };
        }
        this.save();
    }

    getCurrentBattleId() {
        return this.data.session?.currentBattleId ?? null;
    }

    setCurrentBattleId(battleId) {
        if (!this.data.session) this.data.session = {};
        this.data.session.currentBattleId = battleId;
        this.save();
    }

    getStoryState(routeId = null) {
        const storyDefaults = this.getDefaults().session.story;
        const rawStory = this.data.session?.story || {};
        const merged = {
            ...storyDefaults,
            ...rawStory,
            routes: { ...(rawStory.routes || {}) },
            globalChoices: {
                ...(storyDefaults.globalChoices || {}),
                ...(rawStory.globalChoices || {}),
                ...(rawStory.choices || {})
            }
        };

        const activeRoute = routeId || merged.activeRoute || this.getCurrentCampaign() || null;
        if (activeRoute && !merged.routes[activeRoute]) {
            merged.routes[activeRoute] = {
                cursorNode: null,
                choices: {}
            };
        }
        const activeRouteState = activeRoute ? (merged.routes[activeRoute] || { cursorNode: null, choices: {} }) : { cursorNode: null, choices: {} };
        return {
            ...merged,
            activeRoute,
            cursorNode: activeRouteState.cursorNode ?? null,
            choices: { ...(activeRouteState.choices || {}) }
        };
    }

    setStoryState(storyState) {
        if (!this.data.session) this.data.session = {};
        const defaults = this.getDefaults().session.story;
        const merged = {
            ...defaults,
            ...(storyState || {}),
            routes: { ...((storyState && storyState.routes) || {}) },
            globalChoices: { ...((storyState && storyState.globalChoices) || {}) }
        };
        const activeRoute = merged.activeRoute || null;
        if (activeRoute) {
            const bucket = merged.routes[activeRoute] || { cursorNode: null, choices: {} };
            if (merged.cursorNode !== undefined) bucket.cursorNode = merged.cursorNode;
            if (merged.choices) bucket.choices = { ...(bucket.choices || {}), ...(merged.choices || {}) };
            merged.routes[activeRoute] = bucket;
        }
        const activeBucket = activeRoute ? merged.routes[activeRoute] : null;
        this.data.session.story = {
            ...defaults,
            activeRoute,
            cursorNode: activeBucket?.cursorNode ?? null,
            choices: { ...(activeBucket?.choices || {}) },
            routes: merged.routes,
            globalChoices: merged.globalChoices
        };
        this.save();
    }

    startStoryRoute(routeId, startNode = null) {
        const route = STORY_ROUTES[routeId];
        if (!route) return;
        const story = this.getStoryState(routeId);
        const existingNode = story.routes?.[routeId]?.cursorNode;
        const node = startNode || existingNode || route.startNode;
        this.setStoryState({
            ...story,
            activeRoute: routeId,
            cursorNode: node
        });
    }

    setStoryCursor(nodeId, routeId = null) {
        const story = this.getStoryState();
        const resolvedRouteId = routeId || story.activeRoute || this.getCurrentCampaign();
        const route = STORY_ROUTES[resolvedRouteId];
        if (!route || !route.nodes[nodeId]) return;
        const routes = { ...(story.routes || {}) };
        const bucket = routes[resolvedRouteId] || { cursorNode: null, choices: {} };
        bucket.cursorNode = nodeId;
        routes[resolvedRouteId] = bucket;
        this.setStoryState({
            ...story,
            activeRoute: resolvedRouteId,
            routes,
            cursorNode: nodeId
        });
    }

    getStoryCursor(routeId = null) {
        const story = this.getStoryState(routeId);
        return { routeId: story.activeRoute, nodeId: story.cursorNode };
    }

    hasReachedStoryNode(nodeId, routeId = null) {
        const story = this.getStoryState(routeId);
        const resolvedRouteId = routeId || story.activeRoute;
        if (!resolvedRouteId) return false;
        const route = STORY_ROUTES[resolvedRouteId];
        if (!route || !route.nodes[nodeId]) return false;
        let cur = story.routes?.[resolvedRouteId]?.cursorNode ?? null;
        const parents = buildParentMap(resolvedRouteId);
        while (cur) {
            if (cur === nodeId) return true;
            cur = parents[cur] || null;
        }
        return false;
    }

    setStoryChoice(key, value, routeId = null) {
        const story = this.getStoryState(routeId);
        const resolvedRouteId = routeId || story.activeRoute || this.getCurrentCampaign();
        if (!resolvedRouteId) {
            this.setStoryState({
                ...story,
                globalChoices: { ...(story.globalChoices || {}), [key]: value }
            });
            return;
        }
        const routes = { ...(story.routes || {}) };
        const bucket = routes[resolvedRouteId] || { cursorNode: null, choices: {} };
        bucket.choices = { ...(bucket.choices || {}), [key]: value };
        routes[resolvedRouteId] = bucket;
        this.setStoryState({
            ...story,
            activeRoute: resolvedRouteId,
            routes,
            choices: bucket.choices,
            globalChoices: { ...(story.globalChoices || {}), [key]: value }
        });
    }

    getStoryChoice(key, fallback = null, routeId = null) {
        const story = this.getStoryState(routeId);
        const resolvedRouteId = routeId || story.activeRoute || this.getCurrentCampaign();
        const routeValue = story.routes?.[resolvedRouteId]?.choices?.[key];
        if (routeValue !== undefined) return routeValue;
        return story.globalChoices?.[key] ?? fallback;
    }

    resolveStoryRouteId(routeId = null) {
        return routeId || this.getCurrentCampaign() || this.getStoryState().activeRoute || null;
    }

    getSceneState(sceneName, routeId = null) {
        const resolvedRouteId = this.resolveStoryRouteId(routeId);
        const byRoute = this.data.session?.sceneStatesByRoute?.[resolvedRouteId];
        if (byRoute && Object.prototype.hasOwnProperty.call(byRoute, sceneName)) {
            return byRoute[sceneName] ?? null;
        }
        return this.data.session?.sceneStates?.[sceneName] ?? null;
    }

    setSceneState(sceneName, state, routeId = null) {
        if (!this.data.session) this.data.session = {};
        if (!this.data.session.sceneStates) this.data.session.sceneStates = {};
        if (!this.data.session.sceneStatesByRoute) this.data.session.sceneStatesByRoute = {};
        const resolvedRouteId = this.resolveStoryRouteId(routeId);
        if (resolvedRouteId) {
            if (!this.data.session.sceneStatesByRoute[resolvedRouteId]) {
                this.data.session.sceneStatesByRoute[resolvedRouteId] = {};
            }
            this.data.session.sceneStatesByRoute[resolvedRouteId][sceneName] = state;
        }
        this.data.session.sceneStates[sceneName] = state;
        this.save();
    }

    clearSceneState(sceneName, routeId = null) {
        this.setSceneState(sceneName, null, routeId);
    }

    resolveContinueTarget(options = {}) {
        const {
            validateNarrativeState = () => true,
            excludedScenes = ['title', 'custom_battle', 'summary', 'recovery']
        } = options;

        const campaignId = this.getCurrentCampaign();
        const lastScene = this.getLastScene();
        const narrativeState = this.getSceneState('narrative');
        const battleState = this.getSceneState('tactics');
        const mapState = this.getSceneState('map');
        const levelUpState = this.getSceneState('levelup');

        // Completed campaign stories should resume at story selection, not stale in-campaign states.
        if (this.isCampaignComplete(campaignId)) {
            return { scene: 'campaign_selection', params: {} };
        }

        const hasValidNarrativeState = !!(narrativeState && validateNarrativeState(narrativeState));
        if (narrativeState && !hasValidNarrativeState) {
            console.warn('Clearing invalid narrative state', narrativeState);
            this.clearSceneState('narrative');
        }

        // 1) Resume the scene the player most recently left.
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

        // 2) Fallback to any valid saved state.
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

        // 3) Final fallback to lastScene.
        let resolvedLastScene = lastScene;
        if (!resolvedLastScene || excludedScenes.includes(resolvedLastScene)) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }
        if (resolvedLastScene === 'narrative' && !hasValidNarrativeState) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }
        if (resolvedLastScene === 'tactics' && !battleState) {
            // Never "continue" into a fresh battle when no tactics save exists.
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

        let currentCampaign = this.getCurrentCampaign();
        const mapState = this.getSceneState('map');
        const battleState = this.getSceneState('tactics');
        const narrativeState = this.getSceneState('narrative');

        // Recover campaign identity from saved map state when possible.
        if (!currentCampaign && mapState?.currentCampaignId) {
            this.data.session.currentCampaign = mapState.currentCampaignId;
            currentCampaign = mapState.currentCampaignId;
            changed = true;
        }

        // If map is requested but campaign is unknown, fall back to the default campaign.
        if (targetScene === 'map' && !currentCampaign) {
            this.data.session.currentCampaign = 'liubei';
            currentCampaign = 'liubei';
            changed = true;
        }

        // Ensure map state is structurally valid.
        if (mapState) {
            if (!mapState.party || mapState.party.x === undefined || mapState.party.y === undefined) {
                this.data.session.sceneStates.map = null;
                changed = true;
            } else if (!mapState.currentCampaignId && currentCampaign) {
                mapState.currentCampaignId = currentCampaign;
                this.data.session.sceneStates.map = mapState;
                changed = true;
            }
        }

        // Ensure tactics state has a battle id.
        if (battleState && !battleState.battleId) {
            this.data.session.sceneStates.tactics = null;
            changed = true;
        }

        // Ensure narrative state has basic shape.
        if (narrativeState && typeof narrativeState.currentStep !== 'number') {
            this.data.session.sceneStates.narrative = null;
            changed = true;
        }

        // Keep currentBattleId synchronized with saved tactics state.
        if (!this.getCurrentBattleId() && battleState?.battleId) {
            this.data.session.currentBattleId = battleState.battleId;
            changed = true;
        }
        if (targetScene === 'tactics' && !this.getCurrentBattleId() && !battleState?.battleId && !targetParams?.battleId) {
            this.data.session.currentBattleId = 'daxing';
            changed = true;
        }

        // Defensive shape repair if older saves had partial session objects.
        if (!this.data.session) {
            this.data.session = { ...this.getDefaults().session };
            changed = true;
        } else {
            if (!this.data.session.story) {
                this.data.session.story = { ...this.getDefaults().session.story };
                changed = true;
            } else {
                if (!this.data.session.story.routes) {
                    this.data.session.story.routes = {};
                    changed = true;
                }
                if (!this.data.session.story.globalChoices) {
                    this.data.session.story.globalChoices = { ...(this.data.session.story.choices || {}) };
                    changed = true;
                }
            }
            if (!this.data.session.sceneStates) {
                this.data.session.sceneStates = { ...this.getDefaults().session.sceneStates };
                changed = true;
            } else {
                for (const key of Object.keys(this.getDefaults().session.sceneStates)) {
                    if (!(key in this.data.session.sceneStates)) {
                        this.data.session.sceneStates[key] = null;
                        changed = true;
                    }
                }
            }
            if (!this.data.session.sceneStatesByRoute) {
                this.data.session.sceneStatesByRoute = {};
                changed = true;
            }
        }

        if (changed) this.save();
    }

    save() {
        localStorage.setItem(this.saveKey, JSON.stringify(this.data));
    }

    load() {
        const saved = localStorage.getItem(this.saveKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const defaults = this.getDefaults();
                const parsedProgress = parsed.progress || {};
                const parsedSession = parsed.session || {};
                const parsedSceneStates = parsedSession.sceneStates || {};
                const parsedStory = parsedSession.story || {};
                const parsedRouteStates = parsedSession.sceneStatesByRoute || {};

                const migratedMilestones = [
                    ...(parsed.milestones || []),
                    ...(parsedProgress.milestones || [])
                ];
                if (parsed.prologueComplete) migratedMilestones.push('prologue_complete');
                if (parsed.completedCampaigns) migratedMilestones.push(...parsed.completedCampaigns);

                const uniqueMilestones = [...new Set(migratedMilestones)];

                const migratedCampaignState = {
                    ...(parsed.campaignState || {})
                };
                if (!migratedCampaignState.liubei) migratedCampaignState.liubei = {};
                if (parsed.unitXP && !migratedCampaignState.liubei.unitXP) migratedCampaignState.liubei.unitXP = parsed.unitXP;
                if (parsed.unitClasses && !migratedCampaignState.liubei.unitClasses) migratedCampaignState.liubei.unitClasses = parsed.unitClasses;
                if (parsed.partyX !== undefined && migratedCampaignState.liubei.partyX === undefined) migratedCampaignState.liubei.partyX = parsed.partyX;
                if (parsed.partyY !== undefined && migratedCampaignState.liubei.partyY === undefined) migratedCampaignState.liubei.partyY = parsed.partyY;

                const migratedActiveRoute = parsedStory.activeRoute || parsedSession.currentCampaign || parsed.currentCampaign || null;
                const migratedRoutes = { ...(parsedStory.routes || {}) };
                if (migratedActiveRoute && !migratedRoutes[migratedActiveRoute]) {
                    migratedRoutes[migratedActiveRoute] = {
                        cursorNode: parsedStory.cursorNode || null,
                        choices: { ...(parsedStory.choices || {}) }
                    };
                }
                const activeRouteState = migratedActiveRoute ? migratedRoutes[migratedActiveRoute] : null;
                const migratedStory = {
                    ...defaults.session.story,
                    ...parsedStory,
                    activeRoute: migratedActiveRoute,
                    cursorNode: activeRouteState?.cursorNode ?? parsedStory.cursorNode ?? null,
                    choices: { ...(activeRouteState?.choices || parsedStory.choices || {}) },
                    routes: migratedRoutes,
                    globalChoices: {
                        ...(parsedStory.globalChoices || {}),
                        ...(parsedStory.choices || {})
                    }
                };

                const migratedSceneStatesByRoute = { ...parsedRouteStates };
                const routeForLegacyStates = parsedSession.currentCampaign || parsed.currentCampaign || migratedActiveRoute;
                if (routeForLegacyStates && !migratedSceneStatesByRoute[routeForLegacyStates]) {
                    migratedSceneStatesByRoute[routeForLegacyStates] = {
                        map: parsedSceneStates.map ?? parsed.mapState ?? defaults.session.sceneStates.map,
                        tactics: parsedSceneStates.tactics ?? parsed.battleState ?? defaults.session.sceneStates.tactics,
                        narrative: parsedSceneStates.narrative ?? parsed.narrativeState ?? defaults.session.sceneStates.narrative
                    };
                }

                this.data = {
                    ...defaults,
                    ...parsed,
                    progress: {
                        ...defaults.progress,
                        ...parsedProgress,
                        unlockedYears: parsedProgress.unlockedYears || parsed.unlockedYears || defaults.progress.unlockedYears,
                        milestones: uniqueMilestones
                    },
                    session: {
                        ...defaults.session,
                        ...parsedSession,
                        lastScene: parsedSession.lastScene || parsed.lastScene || defaults.session.lastScene,
                        currentCampaign: parsedSession.currentCampaign || parsed.currentCampaign || defaults.session.currentCampaign,
                        currentBattleId: parsedSession.currentBattleId || parsed.currentBattleId || defaults.session.currentBattleId,
                        story: migratedStory,
                        sceneStates: {
                            ...defaults.session.sceneStates,
                            ...parsedSceneStates,
                            map: parsedSceneStates.map ?? parsed.mapState ?? defaults.session.sceneStates.map,
                            tactics: parsedSceneStates.tactics ?? parsed.battleState ?? defaults.session.sceneStates.tactics,
                            narrative: parsedSceneStates.narrative ?? parsed.narrativeState ?? defaults.session.sceneStates.narrative
                        },
                        sceneStatesByRoute: migratedSceneStatesByRoute
                    },
                    campaignState: migratedCampaignState,
                    version: 3
                };

                // Persist migrated shape immediately so future loads are deterministic.
                this.save();
                return true;
            } catch (e) {
                console.error("Failed to parse save data", e);
                return false;
            }
        }
        return false;
    }

    addMilestone(id) {
        if (!this.data.progress.milestones.includes(id)) {
            this.data.progress.milestones.push(id);
            this.save();
        }
    }

    removeMilestone(id) {
        const milestones = this.data.progress?.milestones || [];
        const next = milestones.filter(m => m !== id);
        if (next.length !== milestones.length) {
            this.data.progress.milestones = next;
            this.save();
        }
    }

    hasMilestone(id) {
        return (this.data.progress?.milestones || []).includes(id);
    }

    getChapterRouteIds(chapterId) {
        const chapter = CHAPTERS?.[chapterId];
        if (!chapter) return [];
        if (chapter.routes && typeof chapter.routes === 'object') {
            return Object.values(chapter.routes)
                .map(route => route?.id)
                .filter(Boolean);
        }
        // Legacy fallback for Chapter 1 before route objects were introduced.
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

        const route = STORY_ROUTES[id];
        if (route && route.terminalNode) {
            if (this.hasReachedStoryNode(route.terminalNode, id)) return true;
        }

        // Generic naming convention for future campaigns.
        if (this.hasMilestone(`${id}_complete`)) return true;

        // Legacy/explicit completion milestones.
        const legacyCompletionMilestone = {
            liubei: 'chapter1_complete'
        };
        const legacyKey = legacyCompletionMilestone[id];
        return !!(legacyKey && this.hasMilestone(legacyKey));
    }

    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    reset() {
        this.data = this.getDefaults();
        localStorage.removeItem(this.saveKey);
        // Save the reset state to ensure it's persisted
        this.save();
    }

    // Convenience getters/setters
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
            this.data.progress.milestones = value || [];
            this.save();
            return;
        }
        if (key === 'unlockedYears') {
            this.data.progress.unlockedYears = value || ['184'];
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
        if (key === 'milestones') return this.data.progress?.milestones;
        if (key === 'unlockedYears') return this.data.progress?.unlockedYears;
        return this.data[key];
    }
}


export class GameState {
    constructor() {
        this.saveKey = 'three_kingdoms_tactics_save';
        this.data = this.getDefaults();
    }

    getDefaults() {
        return {
            version: 2,
            progress: {
                unlockedYears: ['184'],
                milestones: [] // e.g. 'prologue_complete', 'daxing_won'
            },
            session: {
                lastScene: 'title',
                currentCampaign: null,
                currentBattleId: null,
                sceneStates: {
                    map: null,
                    tactics: null,
                    narrative: null
                }
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

    getSceneState(sceneName) {
        return this.data.session?.sceneStates?.[sceneName] ?? null;
    }

    setSceneState(sceneName, state) {
        if (!this.data.session) this.data.session = {};
        if (!this.data.session.sceneStates) this.data.session.sceneStates = {};
        this.data.session.sceneStates[sceneName] = state;
        this.save();
    }

    clearSceneState(sceneName) {
        this.setSceneState(sceneName, null);
    }

    resolveContinueTarget(options = {}) {
        const {
            validateNarrativeState = () => true,
            excludedScenes = ['title', 'custom_battle']
        } = options;

        const campaignId = this.getCurrentCampaign();
        const lastScene = this.getLastScene();
        const narrativeState = this.getSceneState('narrative');
        const battleState = this.getSceneState('tactics');
        const mapState = this.getSceneState('map');

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

        // 3) Final fallback to lastScene.
        let resolvedLastScene = lastScene;
        if (!resolvedLastScene || excludedScenes.includes(resolvedLastScene)) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }
        if (resolvedLastScene === 'narrative' && !hasValidNarrativeState) {
            resolvedLastScene = campaignId ? 'map' : 'campaign_selection';
        }

        const sceneState = this.getSceneState(resolvedLastScene);
        if (sceneState) {
            return { scene: resolvedLastScene, params: { isResume: true } };
        }

        return { scene: resolvedLastScene, params: { campaignId, isResume: true } };
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
                        sceneStates: {
                            ...defaults.session.sceneStates,
                            ...parsedSceneStates,
                            map: parsedSceneStates.map ?? parsed.mapState ?? defaults.session.sceneStates.map,
                            tactics: parsedSceneStates.tactics ?? parsed.battleState ?? defaults.session.sceneStates.tactics,
                            narrative: parsedSceneStates.narrative ?? parsed.narrativeState ?? defaults.session.sceneStates.narrative
                        }
                    },
                    campaignState: migratedCampaignState,
                    version: 2
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

    hasMilestone(id) {
        return (this.data.progress?.milestones || []).includes(id);
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


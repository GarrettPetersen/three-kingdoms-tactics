export class GameState {
    constructor() {
        this.saveKey = 'three_kingdoms_tactics_save';
        this.data = this.getDefaults();
    }

    getDefaults() {
        return {
            version: 1,
            lastScene: 'title',
            unlockedYears: ['184'],
            milestones: [], // e.g. 'prologue_complete', 'daxing_won'
            currentCampaign: null,
            // Campaign-specific states (isolated)
            campaignState: {}, // { 'liubei': { partyX, partyY, unitXP, unitClasses, lastScene } }
            customStats: {
                totalBattles: 0,
                wins: 0,
                losses: 0,
                enemiesDefeated: 0,
                unitsLost: 0
            }
        };
    }

    // Isolated campaign state management
    setCampaignVar(key, value, campaignId = null) {
        const id = campaignId || this.data.currentCampaign;
        if (!id) return;
        
        if (!this.data.campaignState[id]) {
            this.data.campaignState[id] = {};
        }
        this.data.campaignState[id][key] = value;
        this.save();
    }

    getCampaignVar(key, campaignId = null) {
        const id = campaignId || this.data.currentCampaign;
        if (!id || !this.data.campaignState[id]) return undefined;
        return this.data.campaignState[id][key];
    }

    save() {
        localStorage.setItem(this.saveKey, JSON.stringify(this.data));
    }

    load() {
        const saved = localStorage.getItem(this.saveKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Simple migration logic
                this.data = { ...this.getDefaults(), ...parsed };
                
                // Migrate top-level unit data to campaign state if not already there
                // (Assuming 'liubei' was the only campaign before this change)
                if (parsed.unitXP && !this.data.campaignState['liubei']?.unitXP) {
                    this.setCampaignVar('unitXP', parsed.unitXP, 'liubei');
                }
                if (parsed.unitClasses && !this.data.campaignState['liubei']?.unitClasses) {
                    this.setCampaignVar('unitClasses', parsed.unitClasses, 'liubei');
                }
                if (parsed.partyX !== undefined && !this.data.campaignState['liubei']?.partyX) {
                    this.setCampaignVar('partyX', parsed.partyX, 'liubei');
                }
                if (parsed.partyY !== undefined && !this.data.campaignState['liubei']?.partyY) {
                    this.setCampaignVar('partyY', parsed.partyY, 'liubei');
                }

                // Migrate old flags
                if (parsed.prologueComplete && !this.data.milestones.includes('prologue_complete')) {
                    this.data.milestones.push('prologue_complete');
                }
                if (parsed.completedCampaigns) {
                    parsed.completedCampaigns.forEach(c => {
                        if (!this.data.milestones.includes(c)) this.data.milestones.push(c);
                    });
                }
                
                return true;
            } catch (e) {
                console.error("Failed to parse save data", e);
                return false;
            }
        }
        return false;
    }

    addMilestone(id) {
        if (!this.data.milestones.includes(id)) {
            this.data.milestones.push(id);
            this.save();
        }
    }

    hasMilestone(id) {
        return (this.data.milestones || []).includes(id);
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
        this.data[key] = value;
        this.save();
    }

    get(key) {
        return this.data[key];
    }
}


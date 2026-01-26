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
            battleState: null,
            unitXP: {}, // { unitId: totalXP }
            unitClasses: {} // { unitId: 'archer' }
        };
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


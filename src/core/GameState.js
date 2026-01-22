export class GameState {
    constructor() {
        this.saveKey = 'three_kingdoms_tactics_save';
        this.data = this.getDefaults();
    }

    getDefaults() {
        return {
            version: 1,
            lastScene: 'title',
            prologueComplete: false,
            unlockedYears: ['184'],
            completedCampaigns: [],
            currentCampaign: null,
            battleState: null,
            unitXP: {} // { unitId: totalXP }
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
                // Simple migration logic if needed
                this.data = { ...this.getDefaults(), ...parsed };
                return true;
            } catch (e) {
                console.error("Failed to parse save data", e);
                return false;
            }
        }
        return false;
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


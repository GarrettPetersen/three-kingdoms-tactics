import { BATTLES, UNIT_TEMPLATES } from '../src/data/Battles.js';
import { GameState } from '../src/core/GameState.js';

const failures = [];

function assertRule(condition, message) {
    if (!condition) failures.push(message);
}

function createMemoryStorage() {
    return {
        store: {},
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
        },
        setItem(key, value) {
            this.store[key] = String(value);
        },
        removeItem(key) {
            delete this.store[key];
        }
    };
}

globalThis.localStorage = createMemoryStorage();

function checkSharedForceState() {
    const gs = new GameState();
    gs.setCurrentCampaign('liubei');
    gs.setCampaignVar('unitXP', { ally1: 25, liubei: 10 });
    gs.setCampaignVar('unitClasses', { ally1: 'archer' });
    gs.setCampaignVar('unitLevelsSeen', { ally1: 2 });

    assertRule(gs.getCampaignVar('unitXP', 'chapter2_oath')?.ally1 === 25,
        'Liu Bei force XP must be visible from chapter2_oath.');
    assertRule(gs.getCampaignVar('unitClasses', 'chapter2_oath')?.ally1 === 'archer',
        'Liu Bei force class choices must be visible from chapter2_oath.');
    assertRule(gs.getCampaignVar('unitXP', 'caocao')?.ally1 === undefined,
        'Cao Cao force must not share Liu Bei ally XP.');

    assertRule(gs.getAllyPartyOwner('ally1', 'liubei') === 'liubei',
        'ally1 should be attached to Liu Bei by default.');
    assertRule(gs.getAllyPartyOwner('ally2', 'liubei') === 'guanyu',
        'ally2 should be attached to Guan Yu by default.');
    assertRule(gs.getAllyPartyOwner('ally3', 'liubei') === 'zhangfei',
        'ally3 should be attached to Zhang Fei by default.');
    assertRule(gs.getAllyPartyOwner('rider2', 'caocao') === 'caocao',
        'rider2 should be attached to Cao Cao by default.');
    assertRule(gs.getAllyPartyOwner('rider3', 'caocao') === 'caocao',
        'rider3 should be attached to Cao Cao by default.');
    assertRule(!Object.keys(gs.getCampaignVar('allyParties', 'caocao') || {}).includes('caoren'),
        'Cao Ren should not own an ally party until he is a POV route leader.');

    const rider2Traits = gs.getUnitTraits('rider2', 'caocao');
    assertRule(rider2Traits.hasWhiteHorse === true && rider2Traits.horseType === 'white',
        'rider2 white horse must be a persistent Cao Cao force trait.');
}

function checkLegacyForceMigration() {
    globalThis.localStorage = createMemoryStorage();
    globalThis.localStorage.setItem('three_kingdoms_tactics_save', JSON.stringify({
        version: 4,
        activeRunId: 'chapter2_oath',
        runs: {
            liubei: {
                routeId: 'liubei',
                currentNodeId: 'chapter1_complete',
                visitedNodeIds: [],
                completedNodeIds: [],
                choices: {},
                flags: {},
                sceneStates: {},
                party: {},
                state: {
                    unitXP: { ally2: 45 },
                    unitClasses: { ally2: 'crossbowman' },
                    unitLevelsSeen: { ally2: 3 }
                },
                inventory: {}
            },
            chapter2_oath: {
                routeId: 'chapter2_oath',
                currentNodeId: 'chapter2_oath_dongzhuo_choice',
                visitedNodeIds: [],
                completedNodeIds: [],
                choices: {},
                flags: {},
                sceneStates: {},
                party: {},
                state: {},
                inventory: {}
            }
        },
        world: { unlockedYears: ['184'], flags: {}, choices: {}, completedRoutes: {} },
        session: { lastScene: 'map', lastRunId: 'chapter2_oath', currentBattleId: null },
        customStats: {}
    }));

    const gs = new GameState();
    gs.load();
    assertRule(gs.getCampaignVar('unitXP', 'chapter2_oath')?.ally2 === 45,
        'Legacy Liu Bei unitXP must migrate into shared force state.');
    assertRule(gs.getCampaignVar('unitClasses', 'chapter2_oath')?.ally2 === 'crossbowman',
        'Legacy Liu Bei unitClasses must migrate into shared force state.');
}

function checkBattleRows() {
    const persistentAllyId = /^ally\d+$/;
    const caocaoRiderId = /^rider\d+$/;
    const forbiddenPersistentKeys = ['templateId', 'level', 'hp', 'maxHp', 'attacks', 'moveRange', 'allyPartyOwnerId', 'traits'];

    Object.entries(BATTLES).forEach(([battleId, battle]) => {
        (battle.units || []).forEach(unit => {
            if (persistentAllyId.test(unit.id) && unit.type === 'allied_soldier') {
                forbiddenPersistentKeys.forEach(key => {
                    assertRule(!(key in unit),
                        `${battleId}.${unit.id} should not hardcode persistent ally field '${key}'.`);
                });
                assertRule(!('horseType' in unit),
                    `${battleId}.${unit.id} should not hardcode persistent horse traits.`);
            }

            if (battleId.startsWith('caocao_') && caocaoRiderId.test(unit.id)) {
                forbiddenPersistentKeys.forEach(key => {
                    assertRule(!(key in unit),
                        `${battleId}.${unit.id} should not hardcode Cao Cao rider persistent field '${key}'.`);
                });
                if (unit.id === 'rider2') {
                    assertRule(!('horseType' in unit),
                        'rider2 white horse must come from unitTraits, not battle data.');
                }
            }
        });
    });
}

function checkZhuoTrainingBattle() {
    const battle = BATTLES.zhuo_training;
    assertRule(!!battle, 'zhuo_training battle must exist.');
    if (!battle) return;

    const allies = (battle.units || []).filter(unit => unit.id.startsWith('ally'));
    assertRule(allies.length > 0, 'zhuo_training should include normal allied units.');
    allies.forEach(unit => {
        assertRule(unit.type === 'allied_soldier',
            `zhuo_training.${unit.id} should use normal allied_soldier AI.`);
        assertRule(!('templateId' in unit),
            `zhuo_training.${unit.id} should use the canonical persistent ally path.`);
    });

    const dummies = (battle.units || []).filter(unit => unit.type === 'training_dummy');
    assertRule(dummies.length >= 10, 'zhuo_training should have enough dummies for multiple attacks.');
    const dummyTemplate = UNIT_TEMPLATES.training_dummy?.dummy;
    assertRule(dummyTemplate?.hp === 1, 'training dummy template should have 1 HP.');
    assertRule(dummyTemplate?.moveRange === 0, 'training dummy template should have zero movement.');
    assertRule(Array.isArray(dummyTemplate?.attacks) && dummyTemplate.attacks.length === 0,
        'training dummy template should have no attacks.');
    assertRule(dummyTemplate?.breaksToImgKey === 'dummy_broken',
        'training dummy template should break to dummy_broken.');
}

checkSharedForceState();
checkLegacyForceMigration();
checkBattleRows();
checkZhuoTrainingBattle();

if (failures.length > 0) {
    console.error('Design rule validation failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Design rule validation passed.');

import { BATTLES, UNIT_TEMPLATES } from '../src/data/Battles.js';
import { GameState } from '../src/core/GameState.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const failures = [];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

function checkQingzhouCityGatePrelude() {
    const battle = BATTLES.qingzhou_prelude;
    assertRule(!!battle, 'qingzhou_prelude battle must exist.');
    if (!battle) return;

    assertRule(battle.map?.layout === 'city_gate',
        'qingzhou_prelude should use the city_gate layout.');
    assertRule(battle.map?.cityGateDefenderSide === 'player',
        'Qingzhou city gate should be defended by the player/allied side.');

    const units = battle.units || [];
    const byId = new Map(units.map(unit => [unit.id, unit]));
    ['liubei', 'guanyu', 'zhangfei', 'ally1', 'ally2', 'ally3'].forEach(id => {
        assertRule(byId.get(id)?.cityGateSide === 'outside',
            `qingzhou_prelude.${id} should start outside the Qingzhou walls.`);
    });
    ['gongjing', 'qz_guard1', 'qz_guard2'].forEach(id => {
        assertRule(byId.get(id)?.cityGateSide === 'inside',
            `qingzhou_prelude.${id} should start on the Qingzhou wall side.`);
    });
    units
        .filter(unit => unit.id?.startsWith('rebel_pre_'))
        .forEach(unit => {
            assertRule(unit.cityGateSide === 'outside',
                `qingzhou_prelude.${unit.id} should besiege from outside the walls.`);
        });
}

function listJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return listJsFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

function checkCanvasTextRendering() {
    const srcRoot = path.join(projectRoot, 'src');
    const files = listJsFiles(srcRoot);
    const allowedFontSizes = {
        Silkscreen: new Set([8, 16]),
        Tiny5: new Set([8]),
        Dogica: new Set([8]),
        zpix: new Set([12, 24])
    };

    files.forEach(filePath => {
        const relPath = path.relative(projectRoot, filePath);
        const source = fs.readFileSync(filePath, 'utf8');
        const lines = source.split(/\r?\n/);

        lines.forEach((line, index) => {
            if (/\.\s*(fillText|strokeText)\s*\(/.test(line) && relPath !== 'src/scenes/BaseScene.js') {
                failures.push(`${relPath}:${index + 1} must draw on-screen text through BaseScene.drawPixelText(), not direct canvas text APIs.`);
            }
        });

        const fontLiteralPattern = /['"`](\d+)px\s+(Silkscreen|Tiny5|Dogica|zpix)['"`]/g;
        let match;
        while ((match = fontLiteralPattern.exec(source)) !== null) {
            const size = Number(match[1]);
            const family = match[2];
            if (!allowedFontSizes[family]?.has(size)) {
                const lineNo = source.slice(0, match.index).split(/\r?\n/).length;
                failures.push(`${relPath}:${lineNo} uses ${size}px ${family}; allowed pixel-font sizes are ${[...allowedFontSizes[family]].join(', ')}px.`);
            }
        }
    });

    const baseScene = fs.readFileSync(path.join(srcRoot, 'scenes', 'BaseScene.js'), 'utf8');
    const drawPixelTextMatch = baseScene.match(/drawPixelText\(ctx, text, x, y, options = \{\}\) \{[\s\S]*?\n    \}/);
    assertRule(!!drawPixelTextMatch, 'BaseScene.drawPixelText must exist as the canonical canvas text path.');
    const drawPixelTextSource = drawPixelTextMatch?.[0] || '';
    assertRule(drawPixelTextSource.includes('ctx.measureText(text)'),
        'BaseScene.drawPixelText must measure text before drawing so aligned text can be snapped.');
    assertRule(drawPixelTextSource.includes("align === 'center'") && drawPixelTextSource.includes('width / 2'),
        'BaseScene.drawPixelText must snap centered text from its actual glyph origin, not only its anchor.');
    assertRule(drawPixelTextSource.includes("align === 'right'") && drawPixelTextSource.includes("align === 'end'"),
        'BaseScene.drawPixelText must snap right-aligned text from its actual glyph origin.');
    assertRule(drawPixelTextSource.includes("ctx.textAlign = 'left'"),
        'BaseScene.drawPixelText must draw from a snapped left origin after resolving alignment.');
    assertRule(drawPixelTextSource.includes('Math.round(x') && drawPixelTextSource.includes('Math.round(y)'),
        'BaseScene.drawPixelText must round text draw coordinates to canvas pixels.');
    assertRule(drawPixelTextSource.includes("ctx.textBaseline = 'top'"),
        'BaseScene.drawPixelText must use top baseline for predictable pixel alignment.');
    assertRule(drawPixelTextSource.includes('getFontForLanguage(font)'),
        'BaseScene.drawPixelText must route fonts through getFontForLanguage().');
}

function checkNarrativeScriptImmutability() {
    const relPath = 'src/scenes/NarrativeScene.js';
    const source = fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
    assertRule(!source.includes('this.script.splice('),
        `${relPath} must not splice runtime branch steps into the authored script; use execution frames instead.`);
    assertRule(source.includes('pushRuntimeFrame('),
        `${relPath} should execute choice and interactive branches through runtime frames.`);
}

function checkBattleDialogueScriptImmutability() {
    const relPath = 'src/scenes/TacticsScene.js';
    const source = fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
    assertRule(!source.includes('choiceState.script.splice('),
        `${relPath} must not splice chosen battle dialogue branches into the active script; use dialogue frames instead.`);
    assertRule(source.includes('pushBattleDialogueFrame('),
        `${relPath} should execute battle dialogue choices through temporary dialogue frames.`);
}

checkSharedForceState();
checkLegacyForceMigration();
checkBattleRows();
checkZhuoTrainingBattle();
checkQingzhouCityGatePrelude();
checkCanvasTextRendering();
checkNarrativeScriptImmutability();
checkBattleDialogueScriptImmutability();

if (failures.length > 0) {
    console.error('Design rule validation failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Design rule validation passed.');

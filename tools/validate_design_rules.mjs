import { BATTLES, UNIT_TEMPLATES } from '../src/data/Battles.js';
import { GameState } from '../src/core/GameState.js';
import { NARRATIVE_SCRIPTS } from '../src/data/NarrativeScripts.js';
import { resolveUnitTemplate } from '../src/data/UnitRules.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

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
        const unitsById = new Map((battle.units || []).map(unit => [unit.id, unit]));
        const liveStartCells = new Map();
        const mustSurvive = typeof battle.victoryCondition === 'object' && Array.isArray(battle.victoryCondition?.mustSurvive)
            ? battle.victoryCondition.mustSurvive
            : [];
        mustSurvive.forEach(id => {
            const unit = unitsById.get(id);
            assertRule(!!unit, `${battleId} mustSurvive unit '${id}' must be present in battle units.`);
            if (unit) {
                assertRule(!!resolveUnitTemplate(unit.type, unit.templateId || unit.id),
                    `${battleId} mustSurvive unit '${id}' must resolve a spawnable template.`);
            }
        });

        (battle.units || []).forEach(unit => {
            if (!unit.isDead) {
                const startKey = `${unit.r},${unit.q}`;
                const existingUnitId = liveStartCells.get(startKey);
                assertRule(!existingUnitId,
                    `${battleId}.${unit.id} must not share live start cell (${startKey}) with ${existingUnitId}.`);
                liveStartCells.set(startKey, unit.id);
            }

            assertRule(!!resolveUnitTemplate(unit.type, unit.templateId || unit.id),
                `${battleId}.${unit.id} must resolve a unit template for type '${unit.type}'.`);

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

function isAllowedWalkmaskPixel(r, g, b, a) {
    if (a === 0) return true;
    return a === 255 && (
        (r === 0 && g === 0 && b === 0) ||
        (r === 0 && g === 255 && b === 0) ||
        (r === 0 && g === 0 && b === 255)
    );
}

async function loadWalkmask(stem) {
    const walkmaskPath = path.join(projectRoot, 'public', 'assets', 'settings', 'walkmasks', `${stem}_walkmask.png`);
    if (!fs.existsSync(walkmaskPath)) return null;
    const { data, info } = await sharp(walkmaskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, info, path: walkmaskPath };
}

function readWalkmaskPixel(mask, x, y) {
    if (!mask) return null;
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= mask.info.width || py >= mask.info.height) return null;
    const offset = (py * mask.info.width + px) * mask.info.channels;
    return {
        r: mask.data[offset],
        g: mask.data[offset + 1],
        b: mask.data[offset + 2],
        a: mask.data[offset + 3],
        x: px,
        y: py
    };
}

function walkmaskLayerForActor(actor, activeForeground) {
    if (activeForeground && !actor.drawAboveForeground) return 'behind';
    return 'front';
}

function isExpectedWalkmaskPixel(pixel, layer) {
    if (!pixel || pixel.a === 0) return false;
    if (layer === 'behind') {
        return pixel.r === 0 && pixel.g === 0 && pixel.b === 255 && pixel.a === 255;
    }
    return pixel.r === 0 && pixel.g === 255 && pixel.b === 0 && pixel.a === 255;
}

function formatWalkmaskPixel(pixel) {
    if (!pixel) return 'off-mask';
    return `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a}) at ${pixel.x},${pixel.y}`;
}

function assertNarrativeFootpointOnWalkmask(mask, context, actor, x, y) {
    if (!mask) return;
    if (x < 0 || y < 0 || x >= mask.info.width || y >= mask.info.height) return;

    const layer = walkmaskLayerForActor(actor, context.fgKey);
    const pixel = readWalkmaskPixel(mask, x, y);
    if (isExpectedWalkmaskPixel(pixel, layer)) return;

    const expected = layer === 'behind' ? '#0000ff behind-foreground' : '#00ff00 front';
    failures.push(`${context.scriptId} step ${context.stepIndex} ${actor.id} must stand on ${expected} walkmask pixels for '${context.bgKey}', but found ${formatWalkmaskPixel(pixel)}.`);
}

function assertNarrativeMoveOnWalkmask(mask, context, actor, fromX, fromY, toX, toY) {
    if (!mask) return;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY))));
    for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        assertNarrativeFootpointOnWalkmask(
            mask,
            context,
            actor,
            fromX + ((toX - fromX) * t),
            fromY + ((toY - fromY) * t)
        );
        if (failures.length > 0 && failures[failures.length - 1].includes(`${context.scriptId} step ${context.stepIndex} ${actor.id}`)) {
            return;
        }
    }
}

async function checkInnNarrativeWalkmaskPaths() {
    const scriptId = 'noticeboard';
    const script = NARRATIVE_SCRIPTS[scriptId];
    assertRule(Array.isArray(script), `${scriptId} narrative script must exist for inn walkmask validation.`);
    if (!Array.isArray(script)) return;

    const bgToMask = {
        inn: 'village_inn',
        inn_evening: 'village_inn_evening'
    };
    const masks = new Map();
    for (const [bgKey, maskStem] of Object.entries(bgToMask)) {
        const mask = await loadWalkmask(maskStem);
        assertRule(!!mask, `${scriptId} ${bgKey} must have public/assets/settings/walkmasks/${maskStem}_walkmask.png.`);
        masks.set(bgKey, mask);
    }

    const actors = new Map();
    let bgKey = null;
    let fgKey = null;

    script.forEach((step, stepIndex) => {
        if (Object.prototype.hasOwnProperty.call(step, 'bg')) bgKey = step.bg;
        if (Object.prototype.hasOwnProperty.call(step, 'fg')) fgKey = step.fg;

        const mask = masks.get(bgKey);
        const context = { scriptId, stepIndex, bgKey, fgKey };

        if (step.type !== 'command') return;

        switch (step.action) {
            case 'clearActors':
                actors.clear();
                break;
            case 'addActor': {
                const actor = {
                    id: step.id,
                    x: Number(step.x),
                    y: Number(step.y),
                    drawAboveForeground: !!step.drawAboveForeground
                };
                actors.set(step.id, actor);
                assertNarrativeFootpointOnWalkmask(mask, context, actor, actor.x, actor.y);
                break;
            }
            case 'move': {
                const actor = actors.get(step.id);
                assertRule(!!actor, `${scriptId} step ${stepIndex} moves unknown actor '${step.id}'.`);
                if (!actor) break;
                const targetX = Number(step.x);
                const targetY = Number(step.y);
                assertNarrativeMoveOnWalkmask(mask, context, actor, actor.x, actor.y, targetX, targetY);
                actor.x = targetX;
                actor.y = targetY;
                break;
            }
            case 'setActorLayer': {
                const actor = actors.get(step.id);
                assertRule(!!actor, `${scriptId} step ${stepIndex} changes layer for unknown actor '${step.id}'.`);
                if (!actor) break;
                actor.drawAboveForeground = !!step.drawAboveForeground;
                assertNarrativeFootpointOnWalkmask(mask, context, actor, actor.x, actor.y);
                break;
            }
            case 'removeActor':
                actors.delete(step.id);
                break;
            default:
                break;
        }
    });
}

async function checkSettingWalkmasks() {
    const settingsDir = path.join(projectRoot, 'public', 'assets', 'settings');
    const walkmaskDir = path.join(settingsDir, 'walkmasks');
    if (!fs.existsSync(walkmaskDir)) return;

    const maskFiles = fs.readdirSync(walkmaskDir)
        .filter(fileName => fileName.endsWith('_walkmask.png'))
        .sort();

    for (const maskFile of maskFiles) {
        const maskPath = path.join(walkmaskDir, maskFile);
        const settingStem = maskFile.replace(/_walkmask\.png$/, '');
        const settingPath = path.join(settingsDir, `${settingStem}.png`);
        assertRule(fs.existsSync(settingPath),
            `${path.relative(projectRoot, maskPath)} must match an existing setting image.`);
        if (!fs.existsSync(settingPath)) continue;

        const [settingMeta, maskMeta] = await Promise.all([
            sharp(settingPath).metadata(),
            sharp(maskPath).metadata()
        ]);

        assertRule(maskMeta.width === settingMeta.width && maskMeta.height === settingMeta.height,
            `${path.relative(projectRoot, maskPath)} must match ${path.relative(projectRoot, settingPath)} dimensions.`);

        const { data, info } = await sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let walkablePixels = 0;
        for (let i = 0; i < data.length; i += info.channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (!isAllowedWalkmaskPixel(r, g, b, a)) {
                const pixel = i / info.channels;
                const x = pixel % info.width;
                const y = Math.floor(pixel / info.width);
                failures.push(`${path.relative(projectRoot, maskPath)} uses invalid walkmask color rgba(${r}, ${g}, ${b}, ${a}) at ${x},${y}.`);
                break;
            }
            if (a > 0 && ((r === 0 && g === 255 && b === 0) || (r === 0 && g === 0 && b === 255))) {
                walkablePixels += 1;
            }
        }

        assertRule(walkablePixels > 0,
            `${path.relative(projectRoot, maskPath)} must contain at least one walkable front or behind pixel.`);
    }
}

checkSharedForceState();
checkLegacyForceMigration();
checkBattleRows();
checkZhuoTrainingBattle();
checkQingzhouCityGatePrelude();
checkCanvasTextRendering();
checkNarrativeScriptImmutability();
checkBattleDialogueScriptImmutability();
await checkSettingWalkmasks();
await checkInnNarrativeWalkmaskPaths();

if (failures.length > 0) {
    console.error('Design rule validation failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Design rule validation passed.');

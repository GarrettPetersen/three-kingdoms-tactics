import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BATTLES } from '../src/data/Battles.js';
import { NARRATIVE_SCRIPTS } from '../src/data/NarrativeScripts.js';
import {
    getPortraitAssetKey,
    getSpeakerDialogueDefault,
    isNarratorPortrait,
    isNoticeboardPortrait,
    resolvePortraitId
} from '../src/data/PortraitRegistry.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portraitRoot = path.join(projectRoot, 'public/assets/portraits');
const sourceRoots = [
    path.join(projectRoot, 'src/scenes'),
    path.join(projectRoot, 'src/core')
];
const failures = [];
const warnings = [];
const records = [];
const seen = new Set();

const EXEMPT_NAMES = new Set(['system', 'title']);
const EXPECTED_LARGE_SIZE = { width: 80, height: 96 };

function addFailure(message) {
    failures.push(message);
}

function addWarning(message) {
    warnings.push(message);
}

function getText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.en || value.zh || '';
    return '';
}

function makeChoiceDialogueStep(step, opt) {
    const fallbackText = opt?.buttonText || '';
    const dialogueText = opt?.text !== undefined && opt?.text !== null ? opt.text : fallbackText;
    const speakerKey = opt?.speaker ? String(opt.speaker).trim().toLowerCase() : '';
    const speakerDefault = getSpeakerDialogueDefault(speakerKey) || {};
    return {
        type: 'dialogue',
        speaker: opt?.speaker || step.speaker,
        portraitKey: opt?.portraitKey || speakerDefault.portraitKey || step.portraitKey || 'liubei',
        name: opt?.name || speakerDefault.name || step.name || 'Liu Bei',
        text: dialogueText,
        voiceId: opt?.voiceId,
        position: opt?.position || step.position
    };
}

function isDialogueLike(step) {
    if (!step || typeof step !== 'object') return false;
    if (step.type === 'narrator' || step.type === 'title') return false;
    if (step.type === 'dialogue') return true;
    return !!step.text && (!!step.voiceId || !!step.name || !!step.speaker || !!step.portraitKey);
}

function recordDialogue(step, sourcePath) {
    if (!step || typeof step !== 'object') return;
    const name = String(step.name || '').trim();
    if (EXEMPT_NAMES.has(name.toLowerCase())) return;
    const portraitId = resolvePortraitId(step);
    if (isNarratorPortrait(step, portraitId) || isNoticeboardPortrait(step, portraitId)) return;

    const key = `${sourcePath}:${step.voiceId || ''}:${name}:${step.speaker || ''}:${step.portraitKey || ''}:${getText(step.text)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const assetKey = getPortraitAssetKey(portraitId);
    records.push({
        sourcePath,
        name: name || '(unnamed)',
        speaker: step.speaker || '',
        voiceId: step.voiceId || '',
        portraitId,
        assetKey
    });
}

function visitScriptValue(value, sourcePath) {
    if (Array.isArray(value)) {
        value.forEach((item, index) => visitScriptValue(item, `${sourcePath}[${index}]`));
        return;
    }
    if (!value || typeof value !== 'object') return;

    if (value.type === 'choice' && Array.isArray(value.options)) {
        value.options.forEach((option, index) => {
            const choiceStep = makeChoiceDialogueStep(value, option);
            recordDialogue(choiceStep, `${sourcePath}.options[${index}]`);
            visitScriptValue(option.result || [], `${sourcePath}.options[${index}].result`);
            visitScriptValue(option.branch || [], `${sourcePath}.options[${index}].branch`);
        });
        Object.entries(value).forEach(([key, child]) => {
            if (key !== 'options') visitScriptValue(child, `${sourcePath}.${key}`);
        });
        return;
    }

    if (isDialogueLike(value)) {
        recordDialogue(value, sourcePath);
    }

    Object.entries(value).forEach(([key, child]) => {
        visitScriptValue(child, `${sourcePath}.${key}`);
    });
}

function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return listFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

function readStringField(block, fieldName) {
    const match = new RegExp(`${fieldName}\\s*:\\s*['"]([^'"]+)['"]`).exec(block);
    return match ? match[1] : '';
}

function readTextField(block) {
    const enMatch = /text\s*:\s*\{[\s\S]*?en\s*:\s*(['"`])([\s\S]*?)\1/.exec(block);
    if (enMatch) return { en: enMatch[2], zh: '' };
    const directMatch = /text\s*:\s*(['"`])([\s\S]*?)\1/.exec(block);
    if (directMatch) return directMatch[2];
    return '';
}

function findObjectStart(text, markerIndex) {
    for (let i = markerIndex; i >= 0; i--) {
        if (text[i] === '{') return i;
        if (text[i] === '\n' && markerIndex - i > 1200) return -1;
    }
    return -1;
}

function findObjectEnd(text, start) {
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }
        if (ch === '"' || ch === '\'' || ch === '`') {
            quote = ch;
            continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
            depth--;
            if (depth === 0) return i + 1;
        }
    }
    return -1;
}

function scanSourceDialogueBlocks() {
    const files = sourceRoots.flatMap(listFiles);
    files.forEach(filePath => {
        const text = fs.readFileSync(filePath, 'utf8');
        const re = /type\s*:\s*['"]dialogue['"]/g;
        let match;
        while ((match = re.exec(text)) !== null) {
            const start = findObjectStart(text, match.index);
            const end = start >= 0 ? findObjectEnd(text, start) : -1;
            if (start < 0 || end < 0) continue;
            const block = text.slice(start, end);
            recordDialogue({
                type: 'dialogue',
                name: readStringField(block, 'name'),
                speaker: readStringField(block, 'speaker'),
                portraitKey: readStringField(block, 'portraitKey'),
                voiceId: readStringField(block, 'voiceId'),
                text: readTextField(block)
            }, path.relative(projectRoot, filePath));
        }
    });
}

async function checkAssets() {
    const portraitIds = new Map();
    records.forEach(record => {
        const key = record.assetKey || `(unresolved:${record.portraitId})`;
        if (!portraitIds.has(key)) portraitIds.set(key, []);
        portraitIds.get(key).push(record);
    });

    for (const [assetKey, uses] of [...portraitIds.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (assetKey.startsWith('(unresolved:')) {
            addFailure(`${assetKey} has no portrait asset mapping; first use: ${uses[0].sourcePath}`);
            continue;
        }

        const smallPath = path.join(portraitRoot, 'small', `${assetKey}.png`);
        const generatedPath = path.join(portraitRoot, 'generated', `${assetKey}.png`);
        const largePath = path.join(portraitRoot, 'large', `${assetKey}.png`);
        const hasSmall = fs.existsSync(smallPath) || fs.existsSync(generatedPath);
        const hasLarge = fs.existsSync(largePath);

        if (!hasSmall) {
            addWarning(`${assetKey} has no small fallback portrait.`);
        }
        if (!hasLarge) {
            addFailure(`${assetKey} is used by dialogue but has no 80x96 large portrait; first use: ${uses[0].sourcePath}`);
            continue;
        }

        const metadata = await sharp(largePath).metadata();
        if (metadata.width !== EXPECTED_LARGE_SIZE.width || metadata.height !== EXPECTED_LARGE_SIZE.height) {
            addFailure(`${assetKey} large portrait must be ${EXPECTED_LARGE_SIZE.width}x${EXPECTED_LARGE_SIZE.height}, got ${metadata.width}x${metadata.height}.`);
        }
    }
}

visitScriptValue(NARRATIVE_SCRIPTS, 'NARRATIVE_SCRIPTS');
visitScriptValue(BATTLES, 'BATTLES');
scanSourceDialogueBlocks();
await checkAssets();

const uniquePortraits = new Set(records.map(record => record.assetKey).filter(Boolean));
console.log(`Portrait audit: ${records.length} dialogue uses, ${uniquePortraits.size} portrait assets.`);

if (warnings.length > 0) {
    console.warn('\nWarnings:');
    warnings.forEach(message => console.warn(`- ${message}`));
}

if (failures.length > 0) {
    console.error('\nFailures:');
    failures.forEach(message => console.error(`- ${message}`));
    process.exit(1);
}

console.log('All speaking dialogue has a mapped large portrait.');

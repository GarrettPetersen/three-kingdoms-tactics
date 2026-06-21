import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { BATTLES } from '../data/Battles.js';
import { NARRATIVE_SCRIPTS } from '../data/NarrativeScripts.js';
import { STORY_ROUTES, getStoryNodeNextIds } from '../data/StoryGraph.js';
import {
    collectChapterSceneMetadata,
    resolveStoryLaunchTarget
} from '../core/StoryFlow.js';

const HEADER_H = 24;
const FOOTER_H = 15;
const NODE_X = 8;
const NODE_Y = 30;
const NODE_W = 140;
const NODE_ROW_H = 15;
const DETAIL_X = 156;
const PREVIEW_Y = 30;
const PREVIEW_W = 104;
const PREVIEW_H = 58;
const BEAT_Y = 96;
const BEAT_MIN_ROW_H = 18;
const BEAT_ROW_GAP = 2;
const BEAT_PAD_X = 5;
const BEAT_PAD_Y = 3;
const BEAT_LINE_H = 9;
const BEAT_DRAG_THRESHOLD = 3;

const ROUTE_LABELS = {
    liubei: 'Liu Bei Ch. 1',
    caocao: 'Cao Cao Ch. 1',
    chapter2_oath: 'Liu Bei Ch. 2',
    hejin: 'He Jin Ch. 2'
};

const ROUTE_TINTS = {
    liubei: { fill: '#10243a', selectedFill: '#233f5a', text: '#8fd0ff' },
    caocao: { fill: '#2a1834', selectedFill: '#463052', text: '#d3a6ff' },
    chapter2_oath: { fill: '#16301f', selectedFill: '#2d5035', text: '#8ee8a1' },
    hejin: { fill: '#352015', selectedFill: '#583825', text: '#ffba7a' }
};

export class StoryScriptReaderScene extends BaseScene {
    constructor() {
        super();
        this.entries = [];
        this.selectedEntryIndex = 0;
        this.selectedBeatIndex = 0;
        this.nodeScroll = 0;
        this.beatScroll = 0;
        this.nodeRows = [];
        this.beatRows = [];
        this.beatLayouts = [];
        this.beatTotalHeight = 0;
        this.dragScroll = null;
        this.backRect = null;
        this.expandAllChoices = true;
        this.expandedKeys = new Set();
        this.beats = [];
        collectChapterSceneMetadata();
    }

    enter() {
        this.entries = this.buildEntries();
        this.selectedEntryIndex = 0;
        this.selectedBeatIndex = 0;
        this.nodeScroll = 0;
        this.beatScroll = 0;
        this.nodeRows = [];
        this.beatRows = [];
        this.beatLayouts = [];
        this.beatTotalHeight = 0;
        this.dragScroll = null;
        this.backRect = null;
        this.refreshBeats();
    }

    buildEntries() {
        const metadata = collectChapterSceneMetadata();
        const entries = [];
        for (const route of Object.values(STORY_ROUTES || {})) {
            for (const [nodeId, node] of Object.entries(route.nodes || {})) {
                const launch = resolveStoryLaunchTarget(route.id, nodeId);
                entries.push({
                    routeId: route.id,
                    routeLabel: ROUTE_LABELS[route.id] || route.id,
                    nodeId,
                    node,
                    launch,
                    sceneMeta: metadata[nodeId] || null
                });
            }
        }
        return entries;
    }

    getEntry() {
        return this.entries[this.selectedEntryIndex] || null;
    }

    getRouteTint(routeId) {
        return ROUTE_TINTS[routeId] || { fill: '#181818', selectedFill: '#333', text: '#9fd3ff' };
    }

    getText(value) {
        if (value == null) return '';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map(item => this.getText(item)).filter(Boolean).join(' ');
        if (typeof value === 'object') {
            if (value.en != null) return this.getText(value.en);
            if (value.zh != null) return this.getText(value.zh);
            const fallback = Object.values(value).find(v => typeof v === 'string' || Array.isArray(v));
            return this.getText(fallback);
        }
        return String(value);
    }

    getOptionLabel(option, index = 0) {
        return this.getText(option?.buttonText)
            || this.getText(option?.lines)
            || this.getText(option?.text)
            || option?.id
            || `Choice ${index + 1}`;
    }

    truncateText(text, maxChars = 64) {
        const value = String(text || '');
        if (value.length <= maxChars) return value;
        return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
    }

    addBeat(beats, context, beat) {
        beats.push({
            bg: context.bg || null,
            fg: context.fg || null,
            mapLabel: context.mapLabel || '',
            depth: 0,
            ...beat
        });
    }

    applyStepVisualState(step, context) {
        if (!step || typeof step !== 'object') return [];
        const notes = [];
        if (Object.prototype.hasOwnProperty.call(step, 'bg')) {
            context.bg = step.bg || null;
            notes.push(step.bg ? `Background: ${step.bg}` : 'Background cleared');
        }
        if (Object.prototype.hasOwnProperty.call(step, 'fg')) {
            context.fg = step.fg || null;
            notes.push(step.fg ? `Foreground: ${step.fg}` : 'Foreground cleared');
        }
        return notes;
    }

    describeCommand(step) {
        const action = step.action || 'command';
        if (action === 'clearActors') return 'Clear actors';
        if (action === 'addActor') {
            const flags = [
                step.flip ? 'flipped' : '',
                step.drawAboveForeground ? 'above foreground' : '',
                step.actorAction ? `action ${step.actorAction}` : ''
            ].filter(Boolean).join(', ');
            return `Add ${step.id || 'actor'} (${step.imgKey || 'sprite'}) at ${step.x ?? '?'}, ${step.y ?? '?'}${flags ? ` (${flags})` : ''}`;
        }
        if (action === 'removeActor') return `Remove ${step.id || 'actor'}`;
        if (action === 'move') {
            return `${step.id || 'actor'} walks to ${step.x ?? '?'}, ${step.y ?? '?'}${step.wait === false ? ' while scene continues' : ''}`;
        }
        if (action === 'wait') return `Wait ${step.duration ?? 0} ms`;
        if (action === 'fade') return `Fade to ${step.target ?? '?'} at speed ${step.speed ?? '?'}`;
        if (action === 'jump') return `Jump to label ${step.label || '?'}`;
        if (action === 'saveReturn') return 'Save return point';
        if (action === 'return') return 'Return to saved point';
        if (action === 'setStoryChoice') return `Set ${step.routeId ? `${step.routeId}.` : ''}${step.key || 'choice'} = ${step.value ?? '?'}`;
        if (action === 'setClickable') return `Make ${step.id || 'actor'} clickable`;
        if (action === 'clearClickable') return `Clear clickable ${step.id || 'actor'}`;
        if (action === 'setClickableRegion') return `Clickable region ${step.id || '?'} at ${step.x ?? '?'}, ${step.y ?? '?'} (${step.w ?? '?'}x${step.h ?? '?'})`;
        return `${action}${step.id ? `: ${step.id}` : ''}`;
    }

    formatLabel(value) {
        return String(value || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    describeBattleMap(battle, battleId) {
        const map = battle?.map || {};
        const layout = map.layout || 'generated';
        const biome = map.biome || 'default';
        const side = map.cityGateDefenderSide ? `, defenders ${map.cityGateDefenderSide}` : '';
        return `${this.formatLabel(layout)} / ${this.formatLabel(biome)}${side}`;
    }

    getChoiceKey(sourceId, index, prefix = 'choice') {
        return `${sourceId}:${prefix}:${index}`;
    }

    addScriptSteps(beats, script, sourceId, context, depth = 0) {
        if (!Array.isArray(script)) return;
        script.forEach((step, index) => {
            this.addStepBeat(beats, step, sourceId, index, context, depth);
        });
    }

    addStepBeat(beats, step, sourceId, index, context, depth = 0) {
        if (!step || typeof step !== 'object') return;
        const visualNotes = this.applyStepVisualState(step, context);
        const notePrefix = visualNotes.length ? `${visualNotes.join('. ')}. ` : '';

        const isImplicitDialogue = !step.type && step.text && (step.name || step.speaker || step.portraitKey || step.voiceId);
        if (step.type === 'dialogue' || step.type === 'narrator' || isImplicitDialogue) {
            const speaker = step.type === 'narrator' ? 'Narrator' : (step.name || step.speaker || 'Speaker');
            this.addBeat(beats, context, {
                kind: 'dialogue',
                depth,
                title: `${speaker}:`,
                body: `${notePrefix}${this.getText(step.text)}`,
                meta: step.voiceId ? `voice ${step.voiceId}` : ''
            });
            return;
        }

        if (step.type === 'title') {
            const title = this.getText(step.text);
            const subtext = this.getText(step.subtext);
            this.addBeat(beats, context, {
                kind: 'title',
                depth,
                title: 'Title card',
                body: `${notePrefix}${title}${subtext ? ` - ${subtext}` : ''}`,
                meta: step.duration ? `${step.duration} ms` : ''
            });
            return;
        }

        if (step.type === 'command') {
            this.addBeat(beats, context, {
                kind: 'command',
                depth,
                title: 'Stage direction',
                body: `${notePrefix}${this.describeCommand(step)}`,
                meta: step.wait === false ? 'nonblocking' : ''
            });
            return;
        }

        if (step.type === 'label') {
            this.addBeat(beats, context, {
                kind: 'label',
                depth,
                title: 'Label',
                body: `${notePrefix}${step.name || '(unnamed)'}`,
                meta: ''
            });
            return;
        }

        if (step.type === 'choice') {
            const key = this.getChoiceKey(sourceId, index, 'choice');
            const options = Array.isArray(step.options) ? step.options : [];
            const expanded = this.expandAllChoices || this.expandedKeys.has(key);
            this.addBeat(beats, context, {
                kind: 'choice',
                depth,
                title: `Choice: ${step.name || step.speaker || 'Player'}`,
                body: `${notePrefix}${options.map((opt, optionIndex) => this.getOptionLabel(opt, optionIndex)).filter(Boolean).join(' / ')}`,
                meta: expanded ? 'paths shown' : 'enter/click to show paths',
                choiceKey: key
            });
            if (expanded) {
                options.forEach((option, optionIndex) => {
                    const optionContext = { ...context };
                    this.addBeat(beats, optionContext, {
                        kind: 'option',
                        depth: depth + 1,
                        title: `Path ${optionIndex + 1}: ${this.getOptionLabel(option, optionIndex)}`,
                        body: this.getText(option.text),
                        meta: option.voiceId ? `voice ${option.voiceId}` : ''
                    });
                    this.addScriptSteps(beats, option.result || option.branch, `${key}:option${optionIndex}`, optionContext, depth + 2);
                });
            }
            return;
        }

        if (step.type === 'interactive' || step.type === 'prompt') {
            const key = this.getChoiceKey(sourceId, index, 'interactive');
            const expanded = this.expandAllChoices || this.expandedKeys.has(key);
            const prompts = Array.isArray(step.promptOptions)
                ? step.promptOptions.map(opt => this.getText(opt.text) || opt.id).filter(Boolean)
                : [];
            const actors = Object.keys(step.clickableActors || {});
            const regions = Object.keys(step.clickableRegions || {});
            this.addBeat(beats, context, {
                kind: 'interactive',
                depth,
                title: 'Interactive beat',
                body: `${notePrefix}${[
                    prompts.length ? `Prompts: ${prompts.join(' / ')}` : '',
                    actors.length ? `Actors: ${actors.join(', ')}` : '',
                    regions.length ? `Regions: ${regions.join(', ')}` : ''
                ].filter(Boolean).join('. ')}`,
                meta: expanded ? 'click paths shown' : 'enter/click to show click paths',
                choiceKey: key
            });
            if (expanded) this.addInteractiveBranches(beats, step, key, context, depth + 1);
            return;
        }

        this.addBeat(beats, context, {
            kind: step.type || 'step',
            depth,
            title: step.type || 'Step',
            body: `${notePrefix}${JSON.stringify(step)}`,
            meta: ''
        });
    }

    addInteractiveBranches(beats, step, key, context, depth) {
        const addHandler = (label, handler, index) => {
            const branchContext = { ...context };
            this.addBeat(beats, branchContext, {
                kind: 'option',
                depth,
                title: `Click: ${label}`,
                body: '',
                meta: ''
            });
            if (Array.isArray(handler)) {
                this.addScriptSteps(beats, handler, `${key}:click${index}`, branchContext, depth + 1);
            } else if (handler?.branch) {
                if (Array.isArray(handler.branch)) {
                    this.addScriptSteps(beats, handler.branch, `${key}:click${index}`, branchContext, depth + 1);
                } else if (typeof handler.branch === 'string') {
                    this.addBeat(beats, branchContext, {
                        kind: 'command',
                        depth: depth + 1,
                        title: 'Stage direction',
                        body: `Jump to label ${handler.branch}`,
                        meta: ''
                    });
                }
            } else if (typeof handler === 'string') {
                this.addBeat(beats, branchContext, {
                    kind: 'command',
                    depth: depth + 1,
                    title: 'Stage direction',
                    body: `Jump to label ${handler}`,
                    meta: ''
                });
            }
        };

        Object.entries(step.clickableActors || {}).forEach(([actorId, actor], index) => {
            addHandler(actorId, actor?.onClick, index);
        });
        Object.entries(step.clickableRegions || {}).forEach(([regionId, region], index) => {
            addHandler(regionId, region?.onClick, index + 1000);
        });
        (step.promptOptions || []).forEach((prompt, index) => {
            const label = this.getText(prompt.text) || prompt.id || `prompt ${index + 1}`;
            addHandler(label, prompt.onClick || prompt.branch, index + 2000);
        });
    }

    getDefaultBattleChoiceOptions(battleId) {
        if (battleId === 'guangzong_encounter') {
            return [
                { lines: { en: ['Stay your hand,', 'brother!'], zh: ['住手，', '兄弟！'] } },
                { lines: { en: ['Free him,', 'brothers!'], zh: ['放了他，', '兄弟们！'] } }
            ];
        }
        return [];
    }

    getBattleChoiceBranchSummary(battleId, optionIndex) {
        if (battleId === 'guangzong_encounter') {
            return optionIndex === 0
                ? 'Callback branch: restrain Zhang Fei, part ways with Lu Zhi, and return to the map.'
                : 'Callback branch: fight the escort, free Lu Zhi on victory, and continue from the battle outcome.';
        }
        if (battleId === 'chapter2_oath_dongzhuo_choice') {
            return optionIndex === 0
                ? 'Callback branch: set chapter2_oath_dongzhuo_choice=restrain, play the restraint dialogue, then march toward Zhu Jun.'
                : 'Callback branch: set chapter2_oath_dongzhuo_choice=strike and start the fight with Dong Zhuo.';
        }
        return 'Callback branch handled by TacticsScene.';
    }

    addBattleChoiceBeats(beats, entry, battle, battleId, context, depth = 1) {
        if (!battle?.hasChoice) return;
        const options = Array.isArray(battle.choiceOptions) && battle.choiceOptions.length
            ? battle.choiceOptions
            : this.getDefaultBattleChoiceOptions(battleId);
        if (!options.length) return;

        const key = `${entry.routeId}:${entry.nodeId}:battleUiChoice`;
        const expanded = this.expandAllChoices || this.expandedKeys.has(key);
        this.addBeat(beats, context, {
            kind: 'choice',
            depth,
            title: 'Battle UI choice',
            body: options.map((option, index) => this.getOptionLabel(option, index)).join(' / '),
            meta: expanded ? 'callback paths shown' : 'enter/click to show callback paths',
            choiceKey: key
        });
        if (!expanded) return;

        options.forEach((option, index) => {
            this.addBeat(beats, context, {
                kind: 'option',
                depth: depth + 1,
                title: `Path ${index + 1}: ${this.getOptionLabel(option, index)}`,
                body: this.getBattleChoiceBranchSummary(battleId, index),
                meta: ''
            });
        });
    }

    addBattleBeats(beats, entry, battleId, context) {
        const battle = BATTLES[battleId];
        if (!battle) {
            this.addBeat(beats, context, {
                kind: 'battle',
                title: 'Battle missing',
                body: battleId,
                meta: ''
            });
            return;
        }

        const units = Array.isArray(battle.units) ? battle.units : [];
        const unitCounts = units.reduce((acc, unit) => {
            const faction = unit.faction || (unit.type?.includes('enemy') ? 'enemy' : 'player');
            acc[faction] = (acc[faction] || 0) + 1;
            return acc;
        }, {});
        const map = battle.map || {};
        const battleContext = {
            ...context,
            mapLabel: this.describeBattleMap(battle, battleId)
        };
        this.addBeat(beats, battleContext, {
            kind: 'battle',
            title: `Battle: ${battle.name || battleId}`,
            body: `${battleId}. Map ${map.layout || 'generated'} / ${map.biome || 'default'}. Units: player ${unitCounts.player || 0}, allied ${unitCounts.allied || 0}, enemy ${unitCounts.enemy || 0}.`,
            meta: battle.cutsceneAutoCombat ? 'cutscene battle' : ''
        });

        const addScriptSection = (label, script) => {
            if (!Array.isArray(script) || script.length === 0) return;
            this.addBeat(beats, battleContext, {
                kind: 'section',
                title: label,
                body: `${script.length} beat${script.length === 1 ? '' : 's'}`,
                meta: ''
            });
            this.addScriptSteps(beats, script, `${entry.routeId}:${entry.nodeId}:${label}`, battleContext, 1);
        };

        addScriptSection('Intro script', battle.introScript);
        this.addBattleChoiceBeats(beats, entry, battle, battleId, battleContext, 1);
        addScriptSection('Post-combat script', battle.postCombatScript);
        addScriptSection('Defeat script', battle.defeatScript || battle.failureScript);
    }

    addGraphTransitionBeat(beats, entry, context) {
        const node = entry.node || {};
        if (Array.isArray(node.transitions)) {
            const body = node.transitions.map(transition => {
                const condition = transition.choice
                    ? `${transition.choice}=${transition.value ?? '*'}`
                    : (transition.milestone ? `milestone ${transition.milestone}` : 'default');
                return `${condition} -> ${transition.to || 'end'}`;
            }).join(' / ');
            this.addBeat(beats, context, {
                kind: 'route',
                title: 'Story graph branches',
                body,
                meta: ''
            });
            return;
        }
        const next = getStoryNodeNextIds(node)[0] || null;
        this.addBeat(beats, context, {
            kind: 'route',
            title: 'Story graph next',
            body: next ? `Next node: ${next}` : 'Route ends here',
            meta: ''
        });
    }

    buildBeatsForEntry(entry) {
        if (!entry) return [];
        const beats = [];
        const context = { bg: null, fg: null };
        this.addBeat(beats, context, {
            kind: 'node',
            title: `${entry.routeLabel}: ${entry.nodeId}`,
            body: entry.launch?.label || 'story node',
            meta: entry.launch?.scene || entry.sceneMeta?.type || ''
        });

        if (entry.launch?.scene === 'narrative') {
            const scriptId = entry.launch.params?.scriptId || entry.sceneMeta?.scriptId;
            const script = NARRATIVE_SCRIPTS[scriptId];
            this.addBeat(beats, context, {
                kind: 'section',
                title: `Narrative: ${scriptId || '(inline)'}`,
                body: script ? `${script.length} beat${script.length === 1 ? '' : 's'}` : 'No script found',
                meta: ''
            });
            this.addScriptSteps(beats, script || [], `${entry.routeId}:${entry.nodeId}:${scriptId || 'narrative'}`, context, 0);
        } else if (entry.launch?.scene === 'tactics') {
            const battleId = entry.launch.params?.battleId || entry.sceneMeta?.battleId || entry.nodeId;
            this.addBattleBeats(beats, entry, battleId, context);
        } else if (entry.launch?.scene === 'map') {
            this.addBeat(beats, context, {
                kind: 'map',
                title: 'Map beat',
                body: `Campaign ${entry.launch.params?.campaignId || entry.routeId}${entry.launch.params?.mapScreenId ? `, screen ${entry.launch.params.mapScreenId}` : ''}`,
                meta: ''
            });
        } else {
            this.addBeat(beats, context, {
                kind: entry.launch?.scene || 'scene',
                title: 'Launch',
                body: entry.launch?.label || 'No launch target',
                meta: ''
            });
        }

        this.addGraphTransitionBeat(beats, entry, context);
        return beats;
    }

    refreshBeats() {
        this.beats = this.buildBeatsForEntry(this.getEntry());
        this.beatLayouts = [];
        this.beatTotalHeight = 0;
        this.selectedBeatIndex = Math.max(0, Math.min(this.beats.length - 1, this.selectedBeatIndex));
        this.clampBeatScroll();
    }

    visibleNodeCount() {
        const h = (this.manager?.canvas?.height || 256) - NODE_Y - FOOTER_H;
        return Math.max(1, Math.floor(h / NODE_ROW_H));
    }

    getNodePanelRect(canvas = this.manager?.canvas) {
        const height = (canvas?.height || 256) - NODE_Y - FOOTER_H;
        return { x: NODE_X, y: NODE_Y, w: NODE_W, h: height };
    }

    visibleBeatCount() {
        const h = (this.manager?.canvas?.height || 256) - BEAT_Y - FOOTER_H;
        return Math.max(1, Math.floor(h / BEAT_MIN_ROW_H));
    }

    getBeatPanelRect(canvas = this.manager?.canvas) {
        const width = (canvas?.width || 455) - DETAIL_X - 8;
        const height = (canvas?.height || 256) - BEAT_Y - FOOTER_H;
        return { x: DETAIL_X, y: BEAT_Y, w: width, h: height };
    }

    measureBeatLayouts(ctx = this.manager?.ctx, panelW = this.getBeatPanelRect().w) {
        if (!ctx) return [];
        let y = 0;
        const layouts = this.beats.map((beat, index) => {
            const indent = Math.min(28, (beat.depth || 0) * 10);
            const textW = Math.max(32, panelW - BEAT_PAD_X * 2 - indent - (beat.choiceKey ? 14 : 0));
            const bodyLines = this.wrapText(ctx, beat.body || '', textW, '8px Tiny5');
            const metaLines = this.wrapText(ctx, beat.meta || '', textW, '8px Tiny5');
            const bodyH = bodyLines.length ? 2 + bodyLines.length * BEAT_LINE_H : 0;
            const metaH = metaLines.length ? 2 + metaLines.length * BEAT_LINE_H : 0;
            const height = Math.max(BEAT_MIN_ROW_H, BEAT_PAD_Y * 2 + BEAT_LINE_H + bodyH + metaH);
            const layout = {
                index,
                top: y,
                height,
                indent,
                textW,
                bodyLines,
                metaLines
            };
            y += height + BEAT_ROW_GAP;
            return layout;
        });
        this.beatLayouts = layouts;
        this.beatTotalHeight = Math.max(0, y - BEAT_ROW_GAP);
        return layouts;
    }

    getMaxBeatScroll(ctx = this.manager?.ctx) {
        const rect = this.getBeatPanelRect();
        if (!this.beatLayouts.length && this.beats.length) this.measureBeatLayouts(ctx, rect.w);
        return Math.max(0, this.beatTotalHeight - rect.h);
    }

    setBeatScroll(value) {
        const maxScroll = this.getMaxBeatScroll();
        this.beatScroll = Math.max(0, Math.min(maxScroll, value || 0));
    }

    scrollBeatPixels(delta) {
        if (!Number.isFinite(delta) || delta === 0) return;
        this.setBeatScroll(this.beatScroll + delta);
        this.selectFirstVisibleBeat();
    }

    selectFirstVisibleBeat() {
        const layouts = this.beatLayouts.length ? this.beatLayouts : this.measureBeatLayouts();
        const visibleTop = this.beatScroll + 1;
        const visibleBeat = layouts.find(layout => layout.top + layout.height > visibleTop);
        if (visibleBeat) this.selectedBeatIndex = visibleBeat.index;
    }

    clampNodeScroll() {
        this.selectedEntryIndex = Math.max(0, Math.min(this.entries.length - 1, this.selectedEntryIndex));
        const visible = this.visibleNodeCount();
        if (this.selectedEntryIndex < this.nodeScroll) this.nodeScroll = this.selectedEntryIndex;
        if (this.selectedEntryIndex >= this.nodeScroll + visible) this.nodeScroll = this.selectedEntryIndex - visible + 1;
        this.nodeScroll = Math.max(0, Math.min(Math.max(0, this.entries.length - visible), this.nodeScroll));
    }

    setNodeScroll(value) {
        const visible = this.visibleNodeCount();
        this.nodeScroll = Math.max(0, Math.min(Math.max(0, this.entries.length - visible), value || 0));
    }

    scrollNodeRows(deltaRows) {
        if (!Number.isFinite(deltaRows) || deltaRows === 0) return;
        this.setNodeScroll(this.nodeScroll + deltaRows);
    }

    clampBeatScroll() {
        this.selectedBeatIndex = Math.max(0, Math.min(this.beats.length - 1, this.selectedBeatIndex));
        const rect = this.getBeatPanelRect();
        const layouts = this.measureBeatLayouts(this.manager?.ctx, rect.w);
        const selectedLayout = layouts[this.selectedBeatIndex];
        if (selectedLayout) {
            if (selectedLayout.top < this.beatScroll) this.beatScroll = selectedLayout.top;
            const selectedBottom = selectedLayout.top + selectedLayout.height;
            if (selectedBottom > this.beatScroll + rect.h) this.beatScroll = selectedBottom - rect.h;
        }
        this.setBeatScroll(this.beatScroll);
    }

    selectEntry(index) {
        this.selectedEntryIndex = Math.max(0, Math.min(this.entries.length - 1, index));
        this.selectedBeatIndex = 0;
        this.beatScroll = 0;
        this.clampNodeScroll();
        this.refreshBeats();
    }

    moveBeat(delta) {
        this.selectedBeatIndex += delta;
        this.clampBeatScroll();
    }

    toggleSelectedBeatExpansion() {
        const beat = this.beats[this.selectedBeatIndex];
        if (!beat?.choiceKey) return false;
        if (this.expandedKeys.has(beat.choiceKey)) this.expandedKeys.delete(beat.choiceKey);
        else this.expandedKeys.add(beat.choiceKey);
        const key = beat.choiceKey;
        this.refreshBeats();
        const nextIndex = this.beats.findIndex(b => b.choiceKey === key);
        if (nextIndex >= 0) this.selectedBeatIndex = nextIndex;
        this.clampBeatScroll();
        assets.playSound('ui_click', 0.45);
        return true;
    }

    goBack() {
        assets.playSound('ui_click');
        this.manager.switchTo('campaign_selection');
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveBeat(-1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveBeat(1);
            return;
        }
        if (e.key === 'PageUp') {
            e.preventDefault();
            this.moveBeat(-this.visibleBeatCount());
            return;
        }
        if (e.key === 'PageDown') {
            e.preventDefault();
            this.moveBeat(this.visibleBeatCount());
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.selectEntry(this.selectedEntryIndex - 1);
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.selectEntry(this.selectedEntryIndex + 1);
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!this.toggleSelectedBeatExpansion()) assets.playSound('ui_click', 0.25);
            return;
        }
        if (e.key.toLowerCase() === 'b') {
            e.preventDefault();
            this.expandAllChoices = !this.expandAllChoices;
            this.refreshBeats();
            assets.playSound('ui_click', 0.45);
            return;
        }
        if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault();
            this.goBack();
        }
    }

    handleWheel(e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const { x } = this.getMousePos(e);
        if (x < DETAIL_X) {
            const rows = Math.sign(e.deltaY) * (Math.abs(e.deltaY) >= 80 ? 3 : 1);
            this.scrollNodeRows(rows);
        } else {
            const amount = Math.sign(e.deltaY) * Math.max(12, Math.min(48, Math.abs(e.deltaY)));
            this.scrollBeatPixels(amount);
        }
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        if (this.backRect && x >= this.backRect.x && x <= this.backRect.x + this.backRect.w && y >= this.backRect.y && y <= this.backRect.y + this.backRect.h) {
            this.goBack();
            return;
        }
        const nodePanel = this.getNodePanelRect(this.manager?.canvas);
        if (x >= nodePanel.x && x <= nodePanel.x + nodePanel.w && y >= nodePanel.y && y <= nodePanel.y + nodePanel.h) {
            const node = this.nodeRows.find(row => x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h);
            this.dragScroll = {
                pane: 'nodes',
                lastY: y,
                startY: y,
                moved: false,
                rowRemainder: 0,
                pendingNodeIndex: node?.index ?? null
            };
            return;
        }
        const beat = this.beatRows.find(row => x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h);
        if (beat) {
            this.dragScroll = {
                pane: 'beats',
                lastY: y,
                startY: y,
                moved: false,
                pendingBeatIndex: beat.index
            };
        }
    }

    onMouseInput(x, y) {
        if (!this.dragScroll) return;
        const delta = this.dragScroll.lastY - y;
        if (Math.abs(y - this.dragScroll.startY) >= BEAT_DRAG_THRESHOLD) {
            this.dragScroll.moved = true;
        }
        this.dragScroll.lastY = y;
        if (!this.dragScroll.moved) return;
        if (this.dragScroll.pane === 'nodes') {
            this.dragScroll.rowRemainder += delta;
            const rows = Math.trunc(this.dragScroll.rowRemainder / NODE_ROW_H);
            if (rows !== 0) {
                this.scrollNodeRows(rows);
                this.dragScroll.rowRemainder -= rows * NODE_ROW_H;
            }
        } else {
            this.scrollBeatPixels(delta);
        }
    }

    handlePointerUp(e) {
        if (!this.dragScroll) return;
        const drag = this.dragScroll;
        this.dragScroll = null;
        if (drag.moved) return;
        if (drag.pendingNodeIndex != null) {
            this.selectEntry(drag.pendingNodeIndex);
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (drag.pendingBeatIndex != null) {
            this.selectedBeatIndex = drag.pendingBeatIndex;
            this.clampBeatScroll();
            this.toggleSelectedBeatExpansion();
        }
    }

    drawPanel(ctx, x, y, w, h, color = '#333') {
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    getPreviewLabel(beat) {
        if (!beat) return 'no background';
        if (beat.bg) return beat.bg;
        if (beat.mapLabel) return beat.mapLabel;
        return 'no background';
    }

    drawBackgroundPreview(ctx, beat) {
        const x = DETAIL_X;
        const y = PREVIEW_Y;
        this.drawPanel(ctx, x, y, PREVIEW_W, PREVIEW_H, '#555');
        if (beat?.bg === 'black') {
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 1, y + 1, PREVIEW_W - 2, PREVIEW_H - 2);
        } else if (beat?.bg) {
            const img = assets.getImage(beat.bg);
            if (img) {
                const scale = Math.max(PREVIEW_W / img.width, PREVIEW_H / img.height);
                const sw = Math.floor(PREVIEW_W / scale);
                const sh = Math.floor(PREVIEW_H / scale);
                const sx = Math.max(0, Math.floor((img.width - sw) / 2));
                const sy = Math.max(0, Math.floor((img.height - sh) / 2));
                ctx.drawImage(img, sx, sy, sw, sh, x, y, PREVIEW_W, PREVIEW_H);
            }
        }
        this.drawPixelText(ctx, this.truncateText(this.getPreviewLabel(beat), 30), x + 4, y + PREVIEW_H - 11, {
            color: '#ffd700',
            font: '8px Tiny5',
            outline: true
        });
    }

    drawSelectedBeatSummary(ctx, canvas, beat) {
        const x = DETAIL_X + PREVIEW_W + 8;
        const y = PREVIEW_Y;
        const w = canvas.width - x - 8;
        const h = PREVIEW_H;
        this.drawPanel(ctx, x, y, w, h, '#333');
        if (!beat) return;
        this.drawPixelText(ctx, beat.title, x + 5, y + 5, { color: '#ffd700', font: '8px Tiny5' });
        const lines = this.wrapText(ctx, beat.body || '', w - 10, '8px Tiny5').slice(0, 3);
        lines.forEach((line, index) => {
            this.drawPixelText(ctx, line, x + 5, y + 18 + index * 10, { color: '#ddd', font: '8px Tiny5' });
        });
        if (beat.meta) {
            this.drawPixelText(ctx, beat.meta, x + 5, y + h - 11, { color: '#888', font: '8px Tiny5' });
        }
    }

    renderNodes(ctx, canvas) {
        this.nodeRows = [];
        const { x, y: panelY, w, h } = this.getNodePanelRect(canvas);
        this.drawPanel(ctx, x, panelY, w, h, '#333');
        const visible = this.visibleNodeCount();
        const end = Math.min(this.entries.length, this.nodeScroll + visible);
        for (let i = this.nodeScroll; i < end; i++) {
            const entry = this.entries[i];
            const y = panelY + (i - this.nodeScroll) * NODE_ROW_H;
            const selected = i === this.selectedEntryIndex;
            const tint = this.getRouteTint(entry.routeId);
            ctx.fillStyle = selected ? tint.selectedFill : tint.fill;
            ctx.fillRect(x + 1, y + 1, w - 2, NODE_ROW_H - 2);
            if (selected) {
                ctx.strokeStyle = '#ffd700';
                ctx.strokeRect(x + 1.5, y + 1.5, w - 3, NODE_ROW_H - 3);
            }
            this.drawPixelText(ctx, this.truncateText(entry.nodeId, 22), x + 5, y + 3, {
                color: selected ? '#fff' : tint.text,
                font: '8px Tiny5'
            });
            this.nodeRows.push({ x, y, w, h: NODE_ROW_H, index: i });
        }

        const maxScroll = Math.max(0, this.entries.length - visible);
        if (maxScroll > 0) {
            const trackX = x + w - 4;
            const trackY = panelY + 3;
            const trackH = h - 6;
            const thumbH = Math.max(10, Math.floor(trackH * (visible / this.entries.length)));
            const thumbY = trackY + Math.floor((trackH - thumbH) * (this.nodeScroll / maxScroll));
            ctx.fillStyle = '#242424';
            ctx.fillRect(trackX, trackY, 2, trackH);
            ctx.fillStyle = '#777';
            ctx.fillRect(trackX, thumbY, 2, thumbH);
        }
    }

    renderBeats(ctx, canvas) {
        this.beatRows = [];
        const { x, y: panelY, w, h } = this.getBeatPanelRect(canvas);
        this.drawPanel(ctx, x, panelY, w, h, '#333');
        const layouts = this.measureBeatLayouts(ctx, w);
        this.setBeatScroll(this.beatScroll);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, panelY + 1, w - 2, h - 2);
        ctx.clip();

        for (const layout of layouts) {
            const i = layout.index;
            const beat = this.beats[i];
            const y = panelY + layout.top - this.beatScroll;
            if (y + layout.height < panelY || y > panelY + h) continue;
            const selected = i === this.selectedBeatIndex;
            ctx.fillStyle = selected ? '#3a3315' : (i % 2 ? '#141414' : '#101010');
            ctx.fillRect(x + 1, y + 1, w - 2, layout.height - 1);
            if (selected) {
                ctx.strokeStyle = '#ffd700';
                ctx.strokeRect(x + 1.5, y + 1.5, w - 3, layout.height - 2);
            }
            const color = beat.kind === 'choice' || beat.kind === 'interactive'
                ? '#ffba7a'
                : (beat.kind === 'command' ? '#8fd0ff' : '#ddd');
            const textX = x + BEAT_PAD_X + layout.indent;
            let textY = y + BEAT_PAD_Y;
            this.drawPixelText(ctx, this.truncateText(beat.title, 34), textX, textY, {
                color,
                font: '8px Tiny5'
            });
            textY += BEAT_LINE_H + 2;
            layout.bodyLines.forEach(line => {
                this.drawPixelText(ctx, line, textX, textY, {
                    color: '#aaa',
                    font: '8px Tiny5'
                });
                textY += BEAT_LINE_H;
            });
            if (layout.metaLines.length) {
                textY += 1;
                layout.metaLines.forEach(line => {
                    this.drawPixelText(ctx, line, textX, textY, {
                        color: '#777',
                        font: '8px Tiny5'
                    });
                    textY += BEAT_LINE_H;
                });
            }
            if (beat.choiceKey) {
                this.drawPixelText(ctx, this.expandedKeys.has(beat.choiceKey) || this.expandAllChoices ? '-' : '+', x + w - 12, y + 5, {
                    color: '#ffd700',
                    font: '8px Tiny5'
                });
            }
            this.beatRows.push({ x, y, w, h: layout.height, index: i });
        }
        ctx.restore();

        const maxScroll = this.getMaxBeatScroll(ctx);
        if (maxScroll > 0) {
            const trackX = x + w - 4;
            const trackY = panelY + 3;
            const trackH = h - 6;
            const thumbH = Math.max(10, Math.floor(trackH * (h / (this.beatTotalHeight || h))));
            const thumbY = trackY + Math.floor((trackH - thumbH) * (this.beatScroll / maxScroll));
            ctx.fillStyle = '#242424';
            ctx.fillRect(trackX, trackY, 2, trackH);
            ctx.fillStyle = '#777';
            ctx.fillRect(trackX, thumbY, 2, thumbH);
        }
    }

    render(timestamp) {
        const ctx = this.manager.ctx;
        const canvas = this.manager.canvas;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#070707';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const entry = this.getEntry();
        const beat = this.beats[this.selectedBeatIndex] || null;
        this.drawPixelText(ctx, 'STORY SCRIPT READER', 8, 7, { color: '#ffd700', font: '8px Silkscreen' });
        this.drawPixelText(ctx, 'Wheel/drag panels. Enter opens paths.', 160, 8, { color: '#aaa', font: '8px Tiny5' });
        this.backRect = { x: canvas.width - 50, y: 5, w: 42, h: 15 };
        ctx.fillStyle = '#151515';
        ctx.fillRect(this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(this.backRect.x + 0.5, this.backRect.y + 0.5, this.backRect.w - 1, this.backRect.h - 1);
        this.drawPixelText(ctx, 'BACK', this.backRect.x + this.backRect.w / 2, this.backRect.y + 4, {
            color: '#eee',
            font: '8px Tiny5',
            align: 'center'
        });

        const routeTint = this.getRouteTint(entry?.routeId);
        this.drawPixelText(ctx, entry ? entry.routeLabel : 'No route', NODE_X, 20, { color: routeTint.text, font: '8px Tiny5' });
        this.drawPixelText(ctx, `${this.selectedEntryIndex + 1}/${this.entries.length}`, NODE_X + NODE_W - 2, 20, {
            color: '#777',
            font: '8px Tiny5',
            align: 'right'
        });
        this.renderNodes(ctx, canvas);
        this.drawBackgroundPreview(ctx, beat);
        this.drawSelectedBeatSummary(ctx, canvas, beat);
        this.renderBeats(ctx, canvas);

        const footer = `${this.selectedBeatIndex + 1}/${Math.max(1, this.beats.length)} beats - arrows select - B ${this.expandAllChoices ? 'hides' : 'shows'} branches`;
        this.drawPixelText(ctx, footer, 8, canvas.height - 12, { color: '#666', font: '8px Tiny5' });
        ctx.restore();
    }
}

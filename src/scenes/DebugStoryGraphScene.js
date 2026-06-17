import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { STORY_ROUTES, getStoryNodeNextIds } from '../data/StoryGraph.js';
import { CHAPTERS } from '../data/Chapters.js';
import { BATTLES } from '../data/Battles.js';

const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 42;
const FOOTER_HEIGHT = 26;

const ROUTE_LABELS = {
    liubei: 'Liu Bei Ch. 1',
    caocao: 'Cao Cao Ch. 1',
    chapter2_oath: 'Liu Bei Ch. 2',
    hejin: 'He Jin Ch. 2'
};

const NODE_LAUNCH_OVERRIDES = {
    prologue: { scene: 'tactics', params: { battleId: 'yellow_turban_rout' }, label: 'battle: yellow_turban_rout' },
    prologue_complete: { scene: 'map', params: { campaignId: 'liubei', partyX: 190, partyY: 70 }, label: 'map: Zhuo County' },
    chapter1_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    caocao_intro: {
        scene: 'narrative',
        params: {
            scriptId: 'caocao_dunqiu_intro',
            musicKey: 'grim_refugees',
            musicVolume: 0.42,
            keepMusic: false
        },
        label: 'narrative: caocao_dunqiu_intro'
    },
    caocao_intro_complete: { scene: 'map', params: { campaignId: 'caocao', partyX: 168, partyY: 98 }, label: 'map: Yingchuan' },
    caocao_chapter1_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    chapter2_zhujun_camp: { scene: 'map', params: { campaignId: 'chapter2_oath', partyX: 220, partyY: 95 }, label: 'map: Zhu Jun camp' },
    chapter2_oath_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' },
    chapter2_hejin_gate_complete: { scene: 'campaign_selection', params: {}, label: 'campaign select' }
};

const PARTY_POSITIONS = {
    liubei: {
        default: { partyX: 190, partyY: 70 },
        qingzhou_siege: { partyX: 210, partyY: 110 },
        qingzhou_cleanup: { partyX: 220, partyY: 95 },
        guangzong_camp: { partyX: 205, partyY: 55 },
        yingchuan_aftermath: { partyX: 205, partyY: 55 },
        guangzong_encounter: { partyX: 205, partyY: 55 },
        dongzhuo_battle: { partyX: 190, partyY: 70 }
    },
    caocao: {
        default: { partyX: 168, partyY: 98 }
    },
    chapter2_oath: {
        default: { partyX: 220, partyY: 95 }
    }
};

function collectChapterSceneMetadata() {
    const byNodeId = {};
    for (const chapter of Object.values(CHAPTERS || {})) {
        const addScenes = (scenes = []) => {
            scenes.forEach(scene => {
                if (scene?.id) byNodeId[scene.id] = scene;
            });
        };
        addScenes(chapter.scenes);
        for (const route of Object.values(chapter.routes || {})) {
            addScenes(route.scenes);
        }
    }
    return byNodeId;
}

export class DebugStoryGraphScene extends BaseScene {
    constructor() {
        super();
        this.entries = [];
        this.selectedIndex = 0;
        this.scroll = 0;
        this.rowRects = [];
        this.backRect = null;
        this.dragScroll = null;
        this.chapterMetadata = collectChapterSceneMetadata();
    }

    enter() {
        this.entries = this.buildEntries();
        this.selectedIndex = 0;
        this.scroll = 0;
        this.rowRects = [];
    }

    buildEntries() {
        const entries = [];
        for (const route of Object.values(STORY_ROUTES || {})) {
            for (const nodeId of Object.keys(route.nodes || {})) {
                entries.push({
                    routeId: route.id,
                    routeLabel: ROUTE_LABELS[route.id] || route.id,
                    nodeId,
                    launch: this.resolveLaunchTarget(route.id, nodeId)
                });
            }
        }
        return entries;
    }

    resolveLaunchTarget(routeId, nodeId) {
        if (NODE_LAUNCH_OVERRIDES[nodeId]) return NODE_LAUNCH_OVERRIDES[nodeId];

        const chapterScene = this.chapterMetadata[nodeId];
        if (chapterScene?.type === 'battle' && chapterScene.battleId) {
            return {
                scene: 'tactics',
                params: { battleId: chapterScene.battleId },
                label: `battle: ${chapterScene.battleId}`
            };
        }
        if (chapterScene?.type === 'narrative' && chapterScene.scriptId) {
            return {
                scene: 'narrative',
                params: { scriptId: chapterScene.scriptId },
                label: `narrative: ${chapterScene.scriptId}`
            };
        }
        if (BATTLES?.[nodeId]) {
            return {
                scene: 'tactics',
                params: { battleId: nodeId },
                label: `battle: ${nodeId}`
            };
        }

        const pos = PARTY_POSITIONS[routeId]?.[nodeId] || PARTY_POSITIONS[routeId]?.default || {};
        return {
            scene: 'map',
            params: { campaignId: routeId, ...pos },
            label: 'map'
        };
    }

    getNextNodeId(routeId, nodeId) {
        const node = STORY_ROUTES?.[routeId]?.nodes?.[nodeId];
        const nextIds = getStoryNodeNextIds(node);
        return nextIds[0] || null;
    }

    continueAfterGraphBattle(routeId, nodeId) {
        const nextNodeId = this.getNextNodeId(routeId, nodeId);
        const gs = this.manager.gameState;
        gs.addMilestone(nodeId, routeId);

        if (!nextNodeId) {
            this.manager.switchTo('campaign_selection');
            return;
        }

        gs.setStoryCursor(nextNodeId, routeId);
        const nextLaunch = this.resolveLaunchTarget(routeId, nextNodeId);
        const params = this.buildGraphLaunchParams(routeId, nextNodeId, nextLaunch);
        this.manager.switchTo(nextLaunch.scene, params);
    }

    buildGraphLaunchParams(routeId, nodeId, launch) {
        const params = { ...(launch.params || {}) };
        if (launch.scene === 'map') {
            params.campaignId = params.campaignId || routeId;
        } else if (launch.scene === 'tactics') {
            params.onVictory = () => this.continueAfterGraphBattle(routeId, nodeId);
        } else if (launch.scene === 'narrative') {
            params.onComplete = () => this.continueAfterGraphBattle(routeId, nodeId);
        }
        return params;
    }

    getVisibleCount() {
        const canvas = this.manager?.canvas;
        const height = canvas?.height || 256;
        return Math.max(1, Math.floor((height - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT));
    }

    clampSelection() {
        this.selectedIndex = Math.max(0, Math.min(this.entries.length - 1, this.selectedIndex));
        const visible = this.getVisibleCount();
        if (this.selectedIndex < this.scroll) this.scroll = this.selectedIndex;
        if (this.selectedIndex >= this.scroll + visible) this.scroll = this.selectedIndex - visible + 1;
        this.scroll = Math.max(0, Math.min(Math.max(0, this.entries.length - visible), this.scroll));
    }

    scrollByRows(deltaRows) {
        const visible = this.getVisibleCount();
        const maxScroll = Math.max(0, this.entries.length - visible);
        this.scroll = Math.max(0, Math.min(maxScroll, this.scroll + deltaRows));
        this.selectedIndex = Math.max(this.scroll, Math.min(this.scroll + visible - 1, this.selectedIndex));
    }

    isPointInList(x, y) {
        const canvas = this.manager?.canvas;
        if (!canvas) return false;
        return x >= 10 && x <= canvas.width - 10 && y >= HEADER_HEIGHT && y <= canvas.height - FOOTER_HEIGHT;
    }

    prepareRouteForJump(routeId, nodeId) {
        const gs = this.manager.gameState;
        gs.setCurrentCampaign(routeId);

        if (routeId === 'chapter2_oath' || routeId === 'hejin') {
            gs.setStoryCursor('chapter1_complete', 'liubei');
            gs.addMilestone('chapter1_complete', 'liubei');
        }

        if (routeId === 'chapter2_oath') {
            gs.setStoryChoice('chapter2_oath_dongzhuo_choice', 'restrain', routeId);
            gs.setWorldChoice('chapter2_oath_dongzhuo_choice', 'restrain');
        }

        gs.setStoryCursor(nodeId, routeId);
        gs.addMilestone(nodeId, routeId);
        ['map', 'tactics', 'narrative', 'levelup', 'liubo'].forEach(sceneName => {
            gs.clearSceneState(sceneName, routeId);
        });
    }

    jumpToEntry(index = this.selectedIndex) {
        const entry = this.entries[index];
        if (!entry) return;
        const launch = entry.launch || this.resolveLaunchTarget(entry.routeId, entry.nodeId);
        this.prepareRouteForJump(entry.routeId, entry.nodeId);
        this.manager.gameState.setLastScene(launch.scene);
        const params = this.buildGraphLaunchParams(entry.routeId, entry.nodeId, launch);
        assets.playSound('ui_click');
        console.log(`[CHEAT] Story graph jump: ${entry.routeId}:${entry.nodeId} -> ${launch.scene}`, params);
        this.manager.switchTo(launch.scene, params);
    }

    goBack() {
        assets.playSound('ui_click');
        this.manager.switchTo('campaign_selection');
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex -= 1;
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex += 1;
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'PageUp') {
            e.preventDefault();
            this.selectedIndex -= this.getVisibleCount();
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'PageDown') {
            e.preventDefault();
            this.selectedIndex += this.getVisibleCount();
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            this.selectedIndex = 0;
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            this.selectedIndex = this.entries.length - 1;
            this.clampSelection();
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.jumpToEntry();
            return;
        }
        if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault();
            this.goBack();
        }
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        if (this.backRect && x >= this.backRect.x && x <= this.backRect.x + this.backRect.w && y >= this.backRect.y && y <= this.backRect.y + this.backRect.h) {
            this.goBack();
            return;
        }
        if (this.isPointInList(x, y)) {
            this.dragScroll = {
                pointerId: e.pointerId,
                startX: x,
                startY: y,
                lastY: y,
                moved: false
            };
        }
        const row = this.rowRects.find(rect => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
        if (row) {
            this.selectedIndex = row.index;
            this.clampSelection();
            if (!this.dragScroll) this.jumpToEntry(row.index);
        }
    }

    onMouseInput(mouseX, mouseY) {
        super.onMouseInput(mouseX, mouseY);
        if (this.dragScroll) {
            const delta = mouseY - this.dragScroll.lastY;
            if (Math.abs(mouseY - this.dragScroll.startY) > 4 || Math.abs(mouseX - this.dragScroll.startX) > 4) {
                this.dragScroll.moved = true;
            }
            if (Math.abs(delta) >= ROW_HEIGHT * 0.6) {
                const rows = Math.trunc(delta / ROW_HEIGHT);
                this.scrollByRows(-rows);
                this.dragScroll.lastY += rows * ROW_HEIGHT;
            }
            return;
        }
        const row = this.rowRects.find(rect => mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y && mouseY <= rect.y + rect.h);
        if (row && row.index !== this.selectedIndex) {
            this.selectedIndex = row.index;
            this.clampSelection();
        }
    }

    handlePointerUp(e) {
        if (!this.dragScroll) return;
        const { x, y } = this.getMousePos(e);
        const wasDrag = this.dragScroll.moved;
        this.dragScroll = null;
        if (wasDrag) return;
        const row = this.rowRects.find(rect => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
        if (row) {
            this.selectedIndex = row.index;
            this.clampSelection();
            this.jumpToEntry(row.index);
        }
    }

    handleWheel(e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const rawRows = Math.abs(e.deltaY) >= 40 ? Math.trunc(e.deltaY / 40) : Math.sign(e.deltaY);
        const rows = rawRows || Math.sign(e.deltaY);
        if (rows) this.scrollByRows(rows);
    }

    render(timestamp) {
        const ctx = this.manager.ctx;
        const canvas = this.manager.canvas;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#070707';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.drawPixelText(ctx, 'STORY GRAPH JUMP', 10, 8, { color: '#ffd700', font: '8px Silkscreen' });
        this.drawPixelText(ctx, 'Select a route node. Enter/click jumps there.', 10, 23, { color: '#aaa', font: '8px Tiny5' });

        this.backRect = { x: canvas.width - 54, y: 7, w: 44, h: 15 };
        ctx.strokeStyle = '#666';
        ctx.fillStyle = '#151515';
        ctx.fillRect(this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h);
        ctx.strokeRect(this.backRect.x + 0.5, this.backRect.y + 0.5, this.backRect.w - 1, this.backRect.h - 1);
        this.drawPixelText(ctx, 'BACK', this.backRect.x + this.backRect.w / 2, this.backRect.y + 3, { color: '#eee', font: '8px Tiny5', align: 'center' });

        this.clampSelection();
        this.rowRects = [];
        const visible = this.getVisibleCount();
        const start = this.scroll;
        const end = Math.min(this.entries.length, start + visible);
        const listX = 10;
        const listY = HEADER_HEIGHT;
        const listW = canvas.width - 20;

        for (let i = start; i < end; i++) {
            const entry = this.entries[i];
            const rowY = listY + (i - start) * ROW_HEIGHT;
            const selected = i === this.selectedIndex;
            this.rowRects.push({ x: listX, y: rowY, w: listW, h: ROW_HEIGHT - 2, index: i });

            ctx.fillStyle = selected ? '#2f2610' : (i % 2 === 0 ? '#111' : '#0c0c0c');
            ctx.fillRect(listX, rowY, listW, ROW_HEIGHT - 2);
            if (selected) {
                ctx.strokeStyle = '#ffd700';
                ctx.strokeRect(listX + 0.5, rowY + 0.5, listW - 1, ROW_HEIGHT - 3);
            }

            this.drawPixelText(ctx, entry.routeLabel, listX + 5, rowY + 3, { color: '#9fd3ff', font: '8px Tiny5' });
            this.drawPixelText(ctx, entry.nodeId, listX + 122, rowY + 3, { color: '#fff', font: '8px Tiny5' });
            this.drawPixelText(ctx, entry.launch.label, listX + 286, rowY + 3, { color: '#aaa', font: '8px Tiny5' });
        }

        const footerY = canvas.height - 18;
        const countText = `${this.selectedIndex + 1}/${this.entries.length}`;
        this.drawPixelText(ctx, countText, 10, footerY, { color: '#888', font: '8px Tiny5' });
        this.drawPixelText(ctx, 'wheel/drag to scroll - graphjump', canvas.width - 10, footerY, { color: '#555', font: '8px Tiny5', align: 'right' });

        const scrollbarVisibleRows = this.getVisibleCount();
        if (this.entries.length > scrollbarVisibleRows) {
            const trackX = canvas.width - 7;
            const trackY = HEADER_HEIGHT;
            const trackH = canvas.height - HEADER_HEIGHT - FOOTER_HEIGHT;
            const thumbH = Math.max(12, Math.round(trackH * (scrollbarVisibleRows / this.entries.length)));
            const maxScroll = Math.max(1, this.entries.length - scrollbarVisibleRows);
            const thumbY = trackY + Math.round((trackH - thumbH) * (this.scroll / maxScroll));
            ctx.fillStyle = '#222';
            ctx.fillRect(trackX, trackY, 3, trackH);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(trackX, thumbY, 3, thumbH);
        }

        ctx.restore();
    }
}

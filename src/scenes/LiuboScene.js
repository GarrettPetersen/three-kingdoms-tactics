import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { getCurrentLanguage, getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';
import {
    LIUBO_BOARD_PADDED_SIZE,
    getBoardPointPosition
} from '../minigames/liubo/LiuboBoard.js';
import {
    applyLiuboMove,
    beginTurnRoll,
    chooseAiMove,
    createLiuboState,
    getAllLegalMoves,
    getLegalMovesForPiece,
    getPiece,
    getPlayerPieces,
    rollLiuboSticks,
    selectLiuboPiece
} from '../minigames/liubo/LiuboRules.js';

const BOARD_DRAW_SIZE = 236;
const PIECE_W = 16;
const PIECE_H = 10;
const OWL_W = 10;
const OWL_H = 18;
const MOVE_SEGMENT_MS = 150;
const MOVE_MIN_MS = 260;
const ROLL_ANIMATION_MS = 760;
const CUP_PASS_MS = 560;

export class LiuboScene extends BaseScene {
    constructor() {
        super();
        this.state = createLiuboState();
        this.pieceRects = [];
        this.moveRects = [];
        this.rollRect = null;
        this.rollAnimation = null;
        this.returnRect = null;
        this.confirmReturn = false;
        this.confirmYesRect = null;
        this.confirmNoRect = null;
        this.resultPlayAgainRect = null;
        this.resultReturnRect = null;
        this.resultContinueRect = null;
        this.startOptions = {};
        this.mode = 'menu';
        this.activityId = null;
        this.resultRecorded = false;
        this.previousActivityPlays = 0;
        this.campaignComplete = false;
        this.aiTimer = 0;
        this.lastTime = 0;
        this.moveAnimations = [];
        this.floatTexts = [];
        this.cupCarrier = this.state.currentPlayer;
        this.cupPassAnimation = null;
    }

    enter(params = {}) {
        assets.playMusic('liubo', 0.35);
        const savedState = params.isResume ? this.manager.gameState.getSceneState('liubo') : null;
        if (savedState) {
            this.restoreState(savedState);
        } else {
            this.mode = params.mode || 'menu';
            this.activityId = params.activityId || null;
            this.resultRecorded = false;
            this.campaignComplete = false;
            const record = this.mode === 'campaign' ? this.manager.gameState.getCampaignLiuboRecord() : null;
            this.previousActivityPlays = record?.activities?.[this.activityId]?.played || 0;
            this.startOptions = {
                humanPlayer: params.humanPlayer || 'white',
                firstPlayer: params.firstPlayer || 'white'
            };
            this.state = createLiuboState(this.startOptions);
            this.saveState();
        }
        this.pieceRects = [];
        this.moveRects = [];
        this.confirmReturn = false;
        this.confirmYesRect = null;
        this.confirmNoRect = null;
        this.resultPlayAgainRect = null;
        this.resultReturnRect = null;
        this.resultContinueRect = null;
        this.aiTimer = 0;
        this.lastTime = 0;
        this.moveAnimations = [];
        this.floatTexts = [];
        this.cupCarrier = this.state.currentPlayer;
        this.cupPassAnimation = null;
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;
        this.updateCupPassAnimation(dt);
        this.updateMoveAnimations(dt);
        this.updateFloatTexts(dt);
        this.updateRollAnimation(dt);
        if (this.confirmReturn) return;
        if (this.cupPassAnimation) return;
        if (this.rollAnimation) return;
        if (this.moveAnimations.length) return;
        if (this.state.winner) return;
        if (this.state.currentPlayer !== this.state.humanPlayer) {
            this.aiTimer += dt;
            if (this.aiTimer >= 450) {
                this.aiTimer = 0;
                this.stepAi();
            }
        }
    }

    stepAi() {
        if (this.state.phase === 'roll') {
            if (this.startStickRoll()) assets.playSound('ui_click', 0.35);
            return;
        }
        if (this.state.phase === 'choose_piece') {
            const move = chooseAiMove(this.state);
            if (move) {
                this.playLiuboMove(move);
                assets.playSound('ui_click', 0.35);
            }
        }
    }

    render() {
        const { ctx, canvas } = this.manager;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#17120e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const layout = this.getLayout(canvas);
        this.renderHeader(ctx, canvas, layout);
        this.renderBoard(ctx, layout);
        this.renderPieces(ctx);
        this.renderMoveAffordances(ctx);
        this.renderMoveAnimations(ctx);
        this.renderFloatTexts(ctx);
        this.renderControls(ctx, canvas, layout);
        this.renderLog(ctx, canvas, layout);
        if (this.state.winner) this.renderResultOverlay(ctx, canvas);
        if (this.confirmReturn) this.renderReturnConfirm(ctx, canvas);
        ctx.restore();
    }

    getLayout(canvas) {
        const portrait = canvas.height > canvas.width;
        if (portrait) {
            return {
                portrait,
                boardX: Math.floor((canvas.width - BOARD_DRAW_SIZE) / 2),
                boardY: 42,
                panelX: 10,
                panelY: 288,
                panelW: canvas.width - 16,
                panelH: 144,
                titleX: Math.floor(canvas.width / 2),
                titleY: 14,
                logY: canvas.height - 12
            };
        }
        return {
            portrait,
            boardX: 10,
            boardY: 10,
            panelX: 258,
            panelY: 22,
            panelW: canvas.width - 268,
            panelH: 216,
            titleX: 351,
            titleY: 8,
            logY: canvas.height - 13
        };
    }

    renderHeader(ctx, canvas, layout) {
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['LIUBO']), layout.titleX, layout.titleY, {
            color: '#ffd77a',
            font: '16px Silkscreen',
            align: 'center'
        });
        const turnText = this.state.winner
            ? `${this.getPlayerLabel(this.state.winner)} WINS`
            : this.getStatusText();
        this.drawPixelText(ctx, fitText(turnText, layout.portrait ? 28 : 24), layout.titleX, layout.titleY + 20, {
            color: this.state.currentPlayer === 'white' ? '#f0dfc2' : '#b98f6b',
            font: '8px Tiny5',
            align: 'center'
        });

        if (this.isCampaignMode()) {
            this.returnRect = null;
            return;
        }

        this.returnRect = { x: canvas.width - 68, y: 1, w: 48, h: 16 };
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(this.returnRect.x, this.returnRect.y, this.returnRect.w, this.returnRect.h);
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['RETURN']), this.returnRect.x + this.returnRect.w / 2, this.returnRect.y + 4, {
            color: '#d6c299',
            font: '8px Tiny5',
            align: 'center'
        });
    }

    renderBoard(ctx, layout) {
        this.boardLayout = layout;
        const board = assets.getImage('liubo_board');
        if (board) {
            ctx.drawImage(board, layout.boardX, layout.boardY, BOARD_DRAW_SIZE, BOARD_DRAW_SIZE);
        } else {
            ctx.fillStyle = '#8d6a40';
            ctx.fillRect(layout.boardX, layout.boardY, BOARD_DRAW_SIZE, BOARD_DRAW_SIZE);
        }

        this.moveRects = [];
        const legalMoves = this.state.legalMoves || [];
        legalMoves.forEach(move => this.renderMovePath(ctx, move));
        this.renderEntryGateAffordances(ctx, legalMoves, layout);
        legalMoves.forEach(move => {
            const pos = this.boardToScreen(getBoardPointPosition(move.toSpaceId));
            if (!pos) return;
            this.moveRects.push({ x: pos.x - 10, y: pos.y - 10, w: 20, h: 20, move });
        });
    }

    renderMoveAffordances(ctx) {
        const legalMoves = this.state.legalMoves || [];
        legalMoves.forEach(move => {
            const pos = this.boardToScreen(getBoardPointPosition(move.toSpaceId));
            if (!pos) return;
            const style = this.getMoveAffordance(move);
            ctx.save();
            ctx.fillStyle = style.fill;
            ctx.fillRect(pos.x - 9, pos.y - 9, 18, 18);
            ctx.strokeStyle = 'rgba(38, 28, 21, 0.78)';
            ctx.lineWidth = 3;
            ctx.strokeRect(pos.x - 9.5, pos.y - 9.5, 18, 18);
            ctx.strokeStyle = style.stroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x - 8.5, pos.y - 8.5, 16, 16);
            this.drawMoveAffordanceIcon(ctx, pos.x, pos.y, style.kind, style.stroke);
            ctx.restore();
        });
    }

    renderEntryGateAffordances(ctx, legalMoves, layout) {
        const selected = getPiece(this.state, this.state.selectedPieceId);
        if (!selected || selected.state !== 'offboard' || !legalMoves.length) return;

        const entrySpaces = new Set();
        legalMoves.forEach(move => {
            const entrySpace = move.path?.[0];
            if (entrySpace) entrySpaces.add(entrySpace);
        });

        const pulse = getUiPulse();
        const center = {
            x: layout.boardX + BOARD_DRAW_SIZE / 2,
            y: layout.boardY + BOARD_DRAW_SIZE / 2
        };
        ctx.save();
        ctx.globalAlpha = 0.72 + pulse * 0.24;
        for (const spaceId of entrySpaces) {
            const pos = this.boardToScreen(getBoardPointPosition(spaceId));
            if (!pos) continue;
            this.drawEntryGateAffordance(ctx, pos, center);
        }
        ctx.restore();
    }

    drawEntryGateAffordance(ctx, pos, center) {
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;
        const outer = { x: pos.x + nx * 20, y: pos.y + ny * 20 };
        const inner = { x: pos.x + nx * 4, y: pos.y + ny * 4 };

        ctx.strokeStyle = '#9ad7ff';
        ctx.fillStyle = 'rgba(95, 189, 226, 0.32)';
        ctx.lineWidth = 2;
        ctx.fillRect(pos.x - 9, pos.y - 9, 18, 18);
        ctx.strokeRect(pos.x - 9.5, pos.y - 9.5, 18, 18);

        ctx.beginPath();
        ctx.moveTo(outer.x + 0.5, outer.y + 0.5);
        ctx.lineTo(inner.x + 0.5, inner.y + 0.5);
        ctx.lineTo(inner.x + nx * 6 + px * 4 + 0.5, inner.y + ny * 6 + py * 4 + 0.5);
        ctx.moveTo(inner.x + 0.5, inner.y + 0.5);
        ctx.lineTo(inner.x + nx * 6 - px * 4 + 0.5, inner.y + ny * 6 - py * 4 + 0.5);
        ctx.stroke();

        ctx.strokeStyle = '#e3f7ff';
        ctx.beginPath();
        ctx.moveTo(pos.x + px * 7 - nx * 5 + 0.5, pos.y + py * 7 - ny * 5 + 0.5);
        ctx.lineTo(pos.x + px * 7 + nx * 5 + 0.5, pos.y + py * 7 + ny * 5 + 0.5);
        ctx.moveTo(pos.x - px * 7 - nx * 5 + 0.5, pos.y - py * 7 - ny * 5 + 0.5);
        ctx.lineTo(pos.x - px * 7 + nx * 5 + 0.5, pos.y - py * 7 + ny * 5 + 0.5);
        ctx.stroke();
    }

    getMoveAffordance(move) {
        const kind = classifyLiuboMove(this.state, move);
        if (kind === 'score') return { kind, fill: 'rgba(255, 226, 84, 0.62)', stroke: '#ffe254', path: 'rgba(255, 226, 84, 0.46)' };
        if (kind === 'promote') return { kind, fill: 'rgba(95, 189, 226, 0.55)', stroke: '#9ad7ff', path: 'rgba(154, 215, 255, 0.38)' };
        if (kind === 'capture') return { kind, fill: 'rgba(221, 92, 71, 0.58)', stroke: '#ff8a70', path: 'rgba(255, 138, 112, 0.38)' };
        if (kind === 'contest') return { kind, fill: 'rgba(229, 145, 58, 0.54)', stroke: '#ffc06d', path: 'rgba(229, 145, 58, 0.34)' };
        if (kind === 'block') return { kind, fill: 'rgba(105, 176, 101, 0.55)', stroke: '#b8e083', path: 'rgba(130, 205, 112, 0.32)' };
        return { kind, fill: 'rgba(101, 202, 120, 0.45)', stroke: '#fff0a4', path: 'rgba(255, 240, 164, 0.24)' };
    }

    drawMoveAffordanceIcon(ctx, x, y, kind, color) {
        if (kind === 'move' || kind === 'score' || kind === 'promote') return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        if (kind === 'block') {
            ctx.fillRect(x - 5, y - 5, 3, 10);
            ctx.fillRect(x + 2, y - 5, 3, 10);
        } else if (kind === 'contest') {
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 1, y - 5);
            ctx.lineTo(x + 4, y);
            ctx.lineTo(x - 1, y + 5);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 6, y);
            ctx.lineTo(x + 1, y - 5);
            ctx.lineTo(x - 4, y);
            ctx.lineTo(x + 1, y + 5);
            ctx.closePath();
            ctx.stroke();
        } else if (kind === 'capture') {
            ctx.beginPath();
            ctx.moveTo(x - 5, y - 5);
            ctx.lineTo(x + 5, y + 5);
            ctx.moveTo(x + 5, y - 5);
            ctx.lineTo(x - 5, y + 5);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderPieces(ctx) {
        this.pieceRects = [];
        const stacks = new Map();
        const active = this.state.pieces.filter(piece => piece.state === 'board');
        const selectablePieces = this.getSelectablePieceIds();
        active.forEach(piece => {
            if (this.moveAnimations.some(animation => animation.pieceId === piece.id)) return;
            const key = String(piece.spaceId);
            const count = stacks.get(key) || 0;
            stacks.set(key, count + 1);
            const pos = this.boardToScreen(getBoardPointPosition(piece.spaceId));
            if (!pos) return;
            const offsetX = (count % 3 - 1) * 5;
            const offsetY = Math.floor(count / 3) * 5 - 2;
            const selected = this.state.selectedPieceId === piece.id;
            const img = this.getPieceImage(piece, Math.abs(pos.x - (this.boardLayout?.boardX || 0) - 118) < Math.abs(pos.y - (this.boardLayout?.boardY || 0) - 118));
            const dims = this.getPieceDimensions(piece, img);
            const x = Math.floor(pos.x - dims.w / 2 + offsetX);
            const y = Math.floor(pos.y + PIECE_H / 2 - dims.h + offsetY);
            if (selectablePieces.has(piece.id)) {
                this.drawActionGlow(ctx, x + dims.w / 2, y + dims.h / 2, piece.player === 'white' ? '#fff0a4' : '#d6a35d');
            }
            if (selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fillRect(x - 3, y - 3, dims.w + 6, dims.h + 6);
            }
            if (img) {
                ctx.drawImage(img, x, y);
            } else {
                ctx.fillStyle = piece.player === 'white' ? '#eee0c7' : '#3d2c24';
                ctx.fillRect(x, y, dims.w, dims.h);
            }
            this.pieceRects.push({ x: x - 3, y: y - 3, w: dims.w + 6, h: dims.h + 6, pieceId: piece.id });
        });
    }

    renderControls(ctx, canvas, layout) {
        const panelY = layout.panelY;
        const panelX = layout.panelX;
        const panelW = layout.panelW;
        ctx.fillStyle = '#231914';
        ctx.fillRect(panelX, panelY, panelW, layout.panelH);
        ctx.strokeStyle = '#60472c';
        ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, layout.panelH - 1);

        this.renderPieceBenches(ctx, panelX, panelW, panelY + 36, layout.portrait);

        this.renderCupLane(ctx, layout);
        const cupPos = this.getCupPosition(layout);
        this.rollRect = { x: Math.floor(cupPos.x - 24), y: Math.floor(cupPos.y - 17), w: 48, h: 34 };
        const canRoll = this.state.phase === 'roll' && this.state.currentPlayer === this.state.humanPlayer && !this.state.winner && !this.cupPassAnimation;
        this.renderRollCup(ctx, canRoll);
        this.renderSticks(ctx, layout);

        if (this.state.phase === 'choose_piece') {
            const moves = getAllLegalMoves(this.state, this.state.currentPlayer).length;
            this.drawPixelText(ctx, `${moves}`, this.rollRect.x + this.rollRect.w / 2, this.rollRect.y + 36, {
                color: '#9ebf92',
                font: '8px Tiny5',
                align: 'center'
            });
        }
    }

    renderCupLane(ctx, layout) {
        const white = this.getCupAnchor('white', layout);
        const black = this.getCupAnchor('black', layout);
        const active = this.getCupPosition(layout);
        const x = Math.floor(white.x);
        const top = Math.floor(Math.min(white.y, black.y));
        const h = Math.floor(Math.abs(black.y - white.y));
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#2d211a';
        ctx.fillRect(x - 3, top - 14, 6, h + 28);
        ctx.strokeStyle = '#60472c';
        ctx.strokeRect(x - 3.5, top - 14.5, 6, h + 28);
        ctx.fillStyle = this.state.currentPlayer === 'white' ? '#f0dfc2' : '#b98f6b';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(Math.floor(active.x - 18), Math.floor(active.y - 10), 36, 20);
        ctx.restore();
    }

    getCupAnchor(player, layout) {
        const x = layout.panelX + layout.panelW - (layout.portrait ? 47 : 45);
        const topY = layout.panelY + (layout.portrait ? 18 : 27);
        const bottomY = layout.panelY + layout.panelH - (layout.portrait ? 21 : 26);
        return {
            x,
            y: player === 'white' ? bottomY : topY
        };
    }

    getCupPosition(layout) {
        if (!this.cupPassAnimation) return this.getCupAnchor(this.cupCarrier || this.state.currentPlayer, layout);
        const from = this.getCupAnchor(this.cupPassAnimation.fromPlayer, layout);
        const to = this.getCupAnchor(this.cupPassAnimation.toPlayer, layout);
        const progress = Math.max(0, Math.min(1, this.cupPassAnimation.age / this.cupPassAnimation.duration));
        const eased = easeInOut(progress);
        const arc = Math.sin(progress * Math.PI) * 10;
        return {
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased,
            tilt: arc
        };
    }

    renderRollCup(ctx, canRoll) {
        const isRolling = !!this.rollAnimation;
        const cup = assets.getImage(isRolling ? 'liubo_cup_empty' : 'liubo_cup') || assets.getImage('liubo_cup');
        const cx = this.rollRect.x + this.rollRect.w / 2;
        const cy = this.rollRect.y + this.rollRect.h / 2;
        const pulse = getUiPulse();
        if (canRoll || isRolling) {
            ctx.save();
            ctx.globalAlpha = isRolling ? 0.5 : 0.22 + pulse * 0.24;
            ctx.fillStyle = '#ffd77a';
            ctx.fillRect(this.rollRect.x - 4, this.rollRect.y - 3, this.rollRect.w + 8, this.rollRect.h + 6);
            ctx.restore();
        }

        const shake = isRolling ? Math.sin(this.rollAnimation.age * 0.045) * 3 : 0;
        const lift = isRolling ? Math.sin(this.rollAnimation.age * 0.028) * 2 : 0;
        const flip = this.getCupFacingPlayer() === 'black';
        ctx.save();
        ctx.globalAlpha = canRoll || isRolling ? 1 : 0.58;
        if (cup) {
            ctx.translate(Math.floor(cx + shake), Math.floor(cy + lift));
            ctx.rotate(((this.getCupPosition(this.boardLayout || this.getLayout(this.manager.canvas)).tilt || 0) * Math.PI) / 180);
            if (flip) ctx.scale(-1, -1);
            ctx.drawImage(cup, Math.floor(-cup.width / 2), Math.floor(-cup.height / 2));
        } else {
            ctx.fillStyle = '#754125';
            ctx.fillRect(Math.floor(cx - 15 + shake), Math.floor(cy - 10 + lift), 30, 22);
        }
        ctx.restore();

        if (isRolling) this.renderRollingStickBurst(ctx, cx, cy);
    }

    renderRollingStickBurst(ctx, cx, cy) {
        const progress = Math.max(0, Math.min(1, this.rollAnimation.age / ROLL_ANIMATION_MS));
        const eased = easeInOut(progress);
        const direction = this.getStickThrowDirection();
        const launchX = cx + 10;
        const launchY = cy - 6 * direction;
        for (let i = 0; i < 6; i++) {
            const target = this.getStickLandingPoint(i);
            const spin = (1.7 + i * 0.17) * (i % 2 ? -1 : 1);
            const arc = Math.sin(progress * Math.PI) * (16 + (i % 3) * 3);
            const wobble = Math.sin(progress * Math.PI * 5 + i) * (1 - eased) * 3;
            const x = launchX + (target.x - launchX) * eased + wobble;
            const y = launchY + (target.y - launchY) * eased - arc;
            const rotation = target.rotation + (1 - eased) * spin;
            this.drawLiuboStick(ctx, x, y, rotation, this.rollAnimation.sticks[i] === 3, i >= 3);
        }
    }

    renderSticks(ctx, layout) {
        const direction = this.getStickThrowDirection();
        const labelX = this.rollRect.x + this.rollRect.w / 2 - (layout.portrait ? 48 : 54);
        const labelY = this.rollRect.y + this.rollRect.h / 2 + 31 * direction;
        if (this.rollAnimation) {
            this.drawPixelText(ctx, '- / -', labelX, labelY, {
                color: '#8b7559',
                font: '8px Silkscreen',
                align: 'center'
            });
            return;
        }

        const sticks = this.state.phase === 'roll' ? [] : (this.rollAnimation?.sticks || this.state.sticks || []);
        if (!sticks.length && !this.rollAnimation) {
            this.drawPixelText(ctx, '- / -', labelX, labelY, {
                color: '#8b7559',
                font: '8px Silkscreen',
                align: 'center'
            });
            return;
        }

        for (let i = 0; i < 6; i++) {
            const target = this.getStickLandingPoint(i);
            this.drawLiuboStick(ctx, target.x, target.y, target.rotation, (sticks[i] || 2) === 3, i >= 3);
        }
        const values = this.state.moveValues?.length ? this.state.moveValues.join(' / ') : '- / -';
        this.drawPixelText(ctx, values, labelX, labelY, {
            color: '#ffd77a',
            font: '8px Silkscreen',
            align: 'center'
        });
    }

    getStickLandingPoint(i) {
        const cx = this.rollRect.x + this.rollRect.w / 2;
        const direction = this.getStickThrowDirection();
        const baseX = cx - 12;
        const baseY = this.rollRect.y + this.rollRect.h / 2 + 34 * direction;
        const points = [
            { x: baseX - 22, y: baseY - 8 * direction, rotation: -0.18 },
            { x: baseX - 2, y: baseY - 3 * direction, rotation: 0.08 },
            { x: baseX + 18, y: baseY - 9 * direction, rotation: -0.1 },
            { x: baseX - 18, y: baseY + 7 * direction, rotation: 0.14 },
            { x: baseX + 3, y: baseY + 10 * direction, rotation: -0.06 },
            { x: baseX + 23, y: baseY + 4 * direction, rotation: 0.18 }
        ];
        return points[i] || points[0];
    }

    getStickThrowDirection() {
        return this.getCupFacingPlayer() === 'black' ? 1 : -1;
    }

    getCupFacingPlayer() {
        if (this.cupPassAnimation) return this.cupPassAnimation.toPlayer;
        return this.cupCarrier || this.state.currentPlayer;
    }

    drawLiuboStick(ctx, x, y, rotation, faceUp, darkSet) {
        const w = 22;
        const h = 5;
        const body = darkSet ? '#4b3127' : '#eee3c8';
        const edge = darkSet ? '#1a100d' : '#5a4128';
        const high = faceUp ? (darkSet ? '#8a6047' : '#fff4cd') : (darkSet ? '#2b1c17' : '#b9965f');
        const mark = faceUp ? (darkSet ? '#f0d49c' : '#4b251a') : null;
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.rotate(rotation);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
        ctx.fillStyle = body;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = high;
        ctx.fillRect(-w / 2 + 2, -h / 2 + 1, w - 6, 2);
        ctx.strokeStyle = edge;
        ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
        if (mark) {
            ctx.fillStyle = mark;
            ctx.fillRect(-5, -1, 2, 2);
            ctx.fillRect(5, -1, 2, 2);
        }
        ctx.restore();
    }

    renderPieceBenches(ctx, panelX, panelW, y, portrait) {
        const selectablePieces = this.getSelectablePieceIds();
        for (const player of ['white', 'black']) {
            const x = portrait
                ? (player === 'white' ? panelX + 14 : panelX + panelW - 88)
                : panelX + 10;
            const lineGap = getCurrentLanguage() === 'zh' ? 15 : 12;
            const blockY = portrait ? y : y + (player === 'white' ? 0 : 64);
            const label = this.getPlayerLabel(player);
            this.drawPixelText(ctx, label, x + 38, blockY, {
                color: player === 'white' ? '#f0dfc2' : '#b98f6b',
                font: '8px Silkscreen',
                align: 'center'
            });
            const pieces = getPlayerPieces(this.state, player);
            const offboardPieces = pieces.filter(p => p.state === 'offboard');
            const counts = {
                off: offboardPieces.length,
                gone: pieces.filter(p => p.state === 'removed').length,
                owl: pieces.filter(p => p.isOwl && p.state === 'board').length,
                fish: pieces.filter(p => p.carryingFish && p.state === 'board').length,
                score: this.state.scores?.[player] || 0
            };
            const row1 = `${getLocalizedText(UI_TEXT['SCORE'])} ${counts.score}  ${getLocalizedText(UI_TEXT['OFF'])} ${counts.off}`;
            const row2 = `${getLocalizedText(UI_TEXT['OWL'])} ${counts.owl}  ${getLocalizedText(UI_TEXT['FISH'])} ${counts.fish}  ${getLocalizedText(UI_TEXT['LOST'])} ${counts.gone}`;
            this.drawPixelText(ctx, fitText(row1, getCurrentLanguage() === 'zh' ? 14 : 16), x + 38, blockY + lineGap, {
                color: '#c8b08d',
                font: '8px Tiny5',
                align: 'center'
            });
            this.drawPixelText(ctx, fitText(row2, getCurrentLanguage() === 'zh' ? 14 : 16), x + 38, blockY + lineGap * 2, {
                color: '#c8b08d',
                font: '8px Tiny5',
                align: 'center'
            });
            offboardPieces.slice(0, 6).forEach((piece, i) => {
                const px = x + 9 + (i % 3) * 21;
                const py = blockY + lineGap * 3 + 3 + Math.floor(i / 3) * 13;
                const selected = this.state.selectedPieceId === piece.id;
                if (selectablePieces.has(piece.id)) {
                    this.drawActionGlow(ctx, px + PIECE_W / 2, py + PIECE_H / 2, player === 'white' ? '#fff0a4' : '#d6a35d');
                }
                if (selected) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.fillRect(px - 2, py - 2, 20, 14);
                }
                const img = this.getPieceImage(piece, false);
                const dims = this.getPieceDimensions(piece, img);
                const drawX = Math.floor(px + PIECE_W / 2 - dims.w / 2);
                const drawY = Math.floor(py + PIECE_H - dims.h);
                if (img) ctx.drawImage(img, drawX, drawY);
                else {
                    ctx.fillStyle = player === 'white' ? '#eee0c7' : '#3d2c24';
                    ctx.fillRect(drawX, drawY, dims.w, dims.h);
                }
                this.pieceRects.push({ x: drawX - 2, y: drawY - 2, w: dims.w + 4, h: dims.h + 4, pieceId: piece.id });
            });
        }
    }

    renderLog(ctx, canvas, layout) {
        if (!layout.portrait) return;
        const y = layout.logY;
        const text = (this.state.log && this.state.log[0]) || '';
        if (!text) return;
        ctx.fillStyle = '#0f0c0a';
        ctx.fillRect(0, y - 12, canvas.width, 24);
        this.drawPixelText(ctx, fitText(text, 42), 128, y - 4, {
            color: '#9f927d',
            font: '8px Tiny5',
            align: 'center'
        });
    }

    renderResultOverlay(ctx, canvas) {
        const won = this.state.winner === this.state.humanPlayer;
        const w = Math.min(184, canvas.width - 28);
        const h = 104;
        const x = Math.floor((canvas.width - w) / 2);
        const y = Math.floor((canvas.height - h) / 2);
        const pulse = getUiPulse();

        ctx.save();
        ctx.fillStyle = 'rgba(8, 6, 5, 0.78)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = won ? '#2b2114' : '#241816';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = won ? '#ffd77a' : '#d96c55';
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.globalAlpha = 0.18 + pulse * 0.1;
        ctx.fillStyle = won ? '#ffe254' : '#ff8a70';
        ctx.fillRect(x + 5, y + 5, w - 10, 19);
        ctx.globalAlpha = 1;

        this.drawPixelText(ctx, getLocalizedText(UI_TEXT[won ? 'YOU WIN' : 'YOU LOSE']), x + w / 2, y + 11, {
            color: won ? '#ffe254' : '#ff8a70',
            font: '16px Silkscreen',
            align: 'center'
        });
        const scoreText = `${this.getPlayerLabel('white')} ${this.state.scores.white}  ${this.getPlayerLabel('black')} ${this.state.scores.black}`;
        this.drawPixelText(ctx, scoreText, x + w / 2, y + 39, {
            color: '#e8d7b7',
            font: '8px Silkscreen',
            align: 'center'
        });
        this.drawPixelText(ctx, fitText(this.state.message || '', getCurrentLanguage() === 'zh' ? 13 : 22), x + w / 2, y + 53, {
            color: '#c8b08d',
            font: '8px Tiny5',
            align: 'center'
        });

        if (this.isCampaignMode()) {
            this.resultPlayAgainRect = null;
            this.resultReturnRect = null;
            this.resultContinueRect = { x: Math.floor(x + w / 2 - 40), y: y + 72, w: 80, h: 17 };
            this.drawDialogButton(ctx, this.resultContinueRect, getLocalizedText(UI_TEXT['CONTINUE']), '#744226', '#ffd77a');
        } else {
            this.resultContinueRect = null;
            this.resultPlayAgainRect = { x: x + 16, y: y + 72, w: 70, h: 17 };
            this.resultReturnRect = { x: x + w - 86, y: y + 72, w: 70, h: 17 };
            this.drawDialogButton(ctx, this.resultPlayAgainRect, getLocalizedText(UI_TEXT['PLAY AGAIN']), '#744226', '#ffd77a');
            this.drawDialogButton(ctx, this.resultReturnRect, getLocalizedText(UI_TEXT['RETURN']), '#1e1815', '#d6c299');
        }
        ctx.restore();
    }

    renderReturnConfirm(ctx, canvas) {
        const w = Math.min(178, canvas.width - 24);
        const h = 76;
        const x = Math.floor((canvas.width - w) / 2);
        const y = Math.floor((canvas.height - h) / 2);

        ctx.save();
        ctx.fillStyle = 'rgba(8, 6, 5, 0.76)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#221815';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ffd77a';
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['END LIUBO GAME?']), x + w / 2, y + 12, {
            color: '#ffe254',
            font: '8px Silkscreen',
            align: 'center'
        });
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['CURRENT GAME WILL BE LOST']), x + w / 2, y + 29, {
            color: '#c8b08d',
            font: '8px Tiny5',
            align: 'center'
        });

        this.confirmYesRect = { x: x + 22, y: y + 48, w: 52, h: 16 };
        this.confirmNoRect = { x: x + w - 74, y: y + 48, w: 52, h: 16 };
        this.drawDialogButton(ctx, this.confirmYesRect, getLocalizedText(UI_TEXT['YES']), '#5f2f25', '#fff0a4');
        this.drawDialogButton(ctx, this.confirmNoRect, getLocalizedText(UI_TEXT['NO']), '#1e1815', '#d6c299');
        ctx.restore();
    }

    drawDialogButton(ctx, rect, label, fill, color) {
        ctx.fillStyle = fill;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = color;
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        this.drawPixelText(ctx, fitText(label, getCurrentLanguage() === 'zh' ? 5 : 10), rect.x + rect.w / 2, rect.y + 5, {
            color,
            font: '8px Silkscreen',
            align: 'center'
        });
    }

    boardToScreen(point) {
        if (!point) return null;
        const scale = BOARD_DRAW_SIZE / LIUBO_BOARD_PADDED_SIZE;
        const layout = this.boardLayout || this.getLayout(this.manager.canvas);
        return {
            x: Math.round(layout.boardX + point.x * scale),
            y: Math.round(layout.boardY + point.y * scale)
        };
    }

    getSelectablePieceIds() {
        if (
            this.state.phase !== 'choose_piece'
            || this.state.currentPlayer !== this.state.humanPlayer
            || this.moveAnimations.length
        ) {
            return new Set();
        }
        const ids = new Set();
        getPlayerPieces(this.state, this.state.currentPlayer).forEach(piece => {
            if (getLegalMovesForPiece(this.state, piece).length) ids.add(piece.id);
        });
        return ids;
    }

    drawActionGlow(ctx, cx, cy, color) {
        const pulse = getUiPulse();
        ctx.save();
        ctx.globalAlpha = 0.35 + pulse * 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(cx - 11) + 0.5, Math.floor(cy - 8) + 0.5, 21, 15);
        ctx.globalAlpha = 0.16 + pulse * 0.12;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(cx - 10), Math.floor(cy - 7), 20, 14);
        ctx.restore();
    }

    getPieceScreenCenter(piece) {
        if (!piece) return null;
        if (piece.state === 'board') {
            return this.boardToScreen(getBoardPointPosition(piece.spaceId));
        }
        const rect = this.pieceRects.find(candidate => candidate.pieceId === piece.id);
        if (!rect) return null;
        return {
            x: Math.round(rect.x + rect.w / 2),
            y: Math.round(rect.y + rect.h / 2)
        };
    }

    playLiuboMove(move) {
        const piece = getPiece(this.state, move.pieceId);
        if (!piece) return false;
        const start = this.getPieceScreenCenter(piece);
        const route = (move.path || [move.toSpaceId])
            .map(spaceId => this.boardToScreen(getBoardPointPosition(spaceId)))
            .filter(Boolean);
        if (start && (!route.length || distance(start, route[0]) > 2)) route.unshift(start);

        const animationPiece = {
            id: piece.id,
            player: piece.player,
            isOwl: piece.isOwl,
            state: 'board'
        };
        const previousPlayer = this.state.currentPlayer;
        const result = applyLiuboMove(this.state, move);
        if (!result) return false;
        this.startCupPassIfTurnChanged(previousPlayer);
        this.saveState();

        const destination = route[route.length - 1] || this.boardToScreen(getBoardPointPosition(move.toSpaceId));
        if (destination && (result.scoredFish || result.captured?.length)) {
            const points = (result.scoredFish ? 1 : 0) + (result.captured?.length || 0);
            this.floatTexts.push({
                text: `+${points}`,
                x: destination.x,
                y: destination.y - 14,
                vy: -0.018,
                age: 0,
                duration: 900,
                color: result.scoredFish ? '#ffe254' : '#ff8a70'
            });
        }

        if (route.length >= 2) {
            this.moveAnimations.push({
                pieceId: piece.id,
                piece: animationPiece,
                route,
                age: 0,
                duration: Math.max(MOVE_MIN_MS, (route.length - 1) * MOVE_SEGMENT_MS),
                hop: result.scoredFish || result.promotedToOwl ? 5 : 3
            });
        }
        return true;
    }

    startStickRoll() {
        if (this.rollAnimation || this.state.phase !== 'roll' || this.state.winner) return false;
        const rolled = rollLiuboSticks();
        this.rollAnimation = {
            age: 0,
            seed: Math.floor(Math.random() * 1000),
            sticks: rolled.sticks,
            moveValues: rolled.moveValues
        };
        return true;
    }

    updateRollAnimation(dt) {
        if (!this.rollAnimation) return;
        this.rollAnimation.age += dt;
        if (this.rollAnimation.age < ROLL_ANIMATION_MS) return;
        const rolled = {
            sticks: this.rollAnimation.sticks,
            moveValues: this.rollAnimation.moveValues
        };
        this.rollAnimation = null;
        const previousPlayer = this.state.currentPlayer;
        beginTurnRoll(this.state, Math.random, rolled);
        this.startCupPassIfTurnChanged(previousPlayer);
        this.saveState();
    }

    startCupPassIfTurnChanged(previousPlayer) {
        if (!previousPlayer || previousPlayer === this.state.currentPlayer || this.state.winner) {
            this.cupCarrier = this.state.currentPlayer;
            this.cupPassAnimation = null;
            return;
        }
        this.cupCarrier = previousPlayer;
        this.cupPassAnimation = {
            fromPlayer: previousPlayer,
            toPlayer: this.state.currentPlayer,
            age: 0,
            duration: CUP_PASS_MS
        };
    }

    updateCupPassAnimation(dt) {
        if (!this.cupPassAnimation) return;
        this.cupPassAnimation.age += dt;
        if (this.cupPassAnimation.age < this.cupPassAnimation.duration) return;
        this.cupCarrier = this.cupPassAnimation.toPlayer;
        this.cupPassAnimation = null;
    }

    updateMoveAnimations(dt) {
        this.moveAnimations = this.moveAnimations
            .map(animation => ({ ...animation, age: animation.age + dt }))
            .filter(animation => animation.age < animation.duration);
    }

    updateFloatTexts(dt) {
        this.floatTexts = this.floatTexts
            .map(text => ({
                ...text,
                age: text.age + dt,
                y: text.y + text.vy * dt
            }))
            .filter(text => text.age < text.duration);
    }

    renderMovePath(ctx, move) {
        const points = (move.path || [])
            .map(spaceId => this.boardToScreen(getBoardPointPosition(spaceId)))
            .filter(Boolean);
        if (points.length < 2) return;
        const color = this.getMoveAffordance(move).path;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x + 0.5, points[0].y + 0.5);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + 0.5, points[i].y + 0.5);
        ctx.stroke();
        ctx.fillStyle = color;
        points.slice(1, -1).forEach(point => ctx.fillRect(point.x - 2, point.y - 2, 4, 4));
        ctx.restore();
    }

    renderMoveAnimations(ctx) {
        this.moveAnimations.forEach(animation => {
            const point = sampleRoute(animation.route, animation.age / animation.duration);
            const hop = Math.sin(Math.min(1, animation.age / animation.duration) * Math.PI) * animation.hop;
            const img = this.getPieceImage(animation.piece, Math.abs(point.x - (this.boardLayout?.boardX || 0) - 118) < Math.abs(point.y - (this.boardLayout?.boardY || 0) - 118));
            const dims = this.getPieceDimensions(animation.piece, img);
            const x = Math.floor(point.x - dims.w / 2);
            const y = Math.floor(point.y + PIECE_H / 2 - dims.h - hop);
            ctx.save();
            ctx.globalAlpha = 0.95;
            if (img) ctx.drawImage(img, x, y);
            else {
                ctx.fillStyle = animation.piece.player === 'white' ? '#eee0c7' : '#3d2c24';
                ctx.fillRect(x, y, dims.w, dims.h);
            }
            ctx.restore();
        });
    }

    renderFloatTexts(ctx) {
        this.floatTexts.forEach(text => {
            const alpha = Math.max(0, 1 - text.age / text.duration);
            ctx.save();
            ctx.globalAlpha = alpha;
            this.drawPixelText(ctx, text.text, Math.round(text.x), Math.round(text.y), {
                color: text.color,
                font: '8px Silkscreen',
                align: 'center'
            });
            ctx.restore();
        });
    }

    getPieceImage(piece, vertical) {
        const type = piece.isOwl ? 'owl' : 'piece';
        const orientation = piece.isOwl && vertical ? 'v' : 'h';
        return assets.getImage(`liubo_${type}_${piece.player}_${orientation}`);
    }

    getPieceDimensions(piece, img = null) {
        if (img) return { w: img.width, h: img.height };
        if (piece?.isOwl) return { w: OWL_W, h: OWL_H };
        return { w: PIECE_W, h: PIECE_H };
    }

    getPlayerLabel(player) {
        return getLocalizedText(UI_TEXT[player === 'white' ? 'WHITE' : 'BLACK']);
    }

    getStatusText() {
        const player = this.getPlayerLabel(this.state.currentPlayer);
        if (this.state.phase === 'roll') {
            return `${player} ${getLocalizedText(UI_TEXT['ROLL'])}`;
        }
        const values = this.state.movesRemaining?.length
            ? this.state.movesRemaining.join('/')
            : (this.state.moveValues?.join('/') || '');
        return `${player} ${getLocalizedText(UI_TEXT['MOVE'])} ${values}`.trim();
    }

    handleInput(e) {
        const { x, y } = this.getMousePos(e);
        if (this.confirmReturn) {
            if (this.confirmYesRect && pointInRect(x, y, this.confirmYesRect)) {
                assets.playSound('ui_click', 0.4);
                this.manager.switchTo('title');
                return;
            }
            if (this.confirmNoRect && pointInRect(x, y, this.confirmNoRect)) {
                assets.playSound('ui_click', 0.35);
                this.confirmReturn = false;
                return;
            }
            return;
        }
        if (this.state.winner) {
            if (this.resultContinueRect && pointInRect(x, y, this.resultContinueRect)) {
                assets.playSound('ui_click', 0.4);
                this.finishCampaignLiubo();
                return;
            }
            if (this.resultPlayAgainRect && pointInRect(x, y, this.resultPlayAgainRect)) {
                assets.playSound('ui_click', 0.4);
                this.resetGame();
                return;
            }
            if (this.resultReturnRect && pointInRect(x, y, this.resultReturnRect)) {
                assets.playSound('ui_click', 0.4);
                this.manager.switchTo('title');
                return;
            }
        }
        if (this.returnRect && pointInRect(x, y, this.returnRect)) {
            assets.playSound('ui_click', 0.4);
            this.requestReturn();
            return;
        }
        if (this.state.winner) return;
        if (this.state.currentPlayer !== this.state.humanPlayer || this.moveAnimations.length || this.cupPassAnimation) return;

        if (this.state.phase === 'roll' && this.rollRect && pointInRect(x, y, this.rollRect)) {
            if (this.startStickRoll()) assets.playSound('ui_click', 0.4);
            return;
        }

        if (this.state.phase !== 'choose_piece') return;

        const moveHit = this.moveRects.find(rect => pointInRect(x, y, rect));
        if (moveHit) {
            this.playLiuboMove(moveHit.move);
            assets.playSound('ui_click', 0.45);
            return;
        }

        const pieceHit = [...this.pieceRects].reverse().find(rect => pointInRect(x, y, rect));
        if (pieceHit) {
            const piece = getPiece(this.state, pieceHit.pieceId);
            if (piece && piece.player === this.state.humanPlayer) {
                selectLiuboPiece(this.state, piece.id);
                assets.playSound('ui_click', 0.35);
            }
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.isCampaignMode()) return;
            if (this.confirmReturn) {
                this.confirmReturn = false;
            } else if (this.state.winner) {
                this.manager.switchTo('title');
            } else {
                this.requestReturn();
            }
            return;
        }
        if (this.confirmReturn) {
            if (e.key === 'Enter') {
                this.manager.switchTo('title');
                return;
            }
            if (e.key === 'n' || e.key === 'N') {
                this.confirmReturn = false;
                return;
            }
        }
        if (this.state.winner) {
            if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
                if (this.isCampaignMode()) this.finishCampaignLiubo();
                else this.resetGame();
                return;
            }
        }
        if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
            if (this.state.currentPlayer === this.state.humanPlayer && this.state.phase === 'roll') {
                if (this.startStickRoll()) assets.playSound('ui_click', 0.4);
            }
        }
    }

    resetGame() {
        this.state = createLiuboState(this.startOptions);
        this.rollAnimation = null;
        this.moveAnimations = [];
        this.floatTexts = [];
        this.cupCarrier = this.state.currentPlayer;
        this.cupPassAnimation = null;
        this.confirmReturn = false;
        this.resultPlayAgainRect = null;
        this.resultReturnRect = null;
        this.resultContinueRect = null;
        this.resultRecorded = false;
        this.saveState();
    }

    requestReturn() {
        if (this.isCampaignMode()) return;
        if (this.isGameInProgress()) {
            this.confirmReturn = true;
            return;
        }
        this.manager.switchTo('title');
    }

    isGameInProgress() {
        if (this.state.winner) return false;
        return this.state.turn > 1
            || this.state.phase !== 'roll'
            || (this.state.log && this.state.log.length > 0)
            || (this.state.sticks && this.state.sticks.length > 0);
    }

    isCampaignMode() {
        return this.mode === 'campaign';
    }

    saveState() {
        if (!this.isCampaignMode() || this.campaignComplete || !this.manager?.gameState) return;
        this.manager.gameState.setSceneState('liubo', {
            mode: this.mode,
            activityId: this.activityId,
            startOptions: this.startOptions,
            state: this.clonePlain(this.state),
            resultRecorded: this.resultRecorded,
            previousActivityPlays: this.previousActivityPlays
        });
        this.manager.gameState.setLastScene('liubo');
    }

    restoreState(savedState) {
        this.mode = savedState.mode || 'campaign';
        this.activityId = savedState.activityId || null;
        this.campaignComplete = false;
        this.startOptions = savedState.startOptions || { humanPlayer: 'white', firstPlayer: 'white' };
        this.state = savedState.state || createLiuboState(this.startOptions);
        this.resultRecorded = !!savedState.resultRecorded;
        this.previousActivityPlays = savedState.previousActivityPlays || 0;
    }

    clonePlain(value) {
        return JSON.parse(JSON.stringify(value));
    }

    finishCampaignLiubo() {
        if (!this.isCampaignMode() || !this.state.winner) return;
        const won = this.state.winner === this.state.humanPlayer;
        if (!this.resultRecorded) {
            this.manager.gameState.recordCampaignLiuboResult(this.activityId, won);
            this.resultRecorded = true;
        }
        this.campaignComplete = true;
        const narrativeResumeState = this.manager.gameState.getSceneState('narrative');
        if (narrativeResumeState) {
            this.manager.gameState.setCampaignVar('narrativeResumeAfterLiubo', narrativeResumeState);
        }
        this.manager.gameState.clearSceneState('liubo');
        this.manager.switchTo('narrative', {
            keepMusic: true,
            script: buildCampaignLiuboResultScript({ won, previousActivityPlays: this.previousActivityPlays })
        });
    }
}

function buildCampaignLiuboResultScript({ won, previousActivityPlays = 0 }) {
    const returning = previousActivityPlays > 0;
    let result;
    if (won && returning) {
        result = {
            speaker: 'farmer',
            voiceId: 'inn_liubo_win_repeat_01',
            text: {
                en: "Again! You read the sticks like a market scale. I will have to stop wagering with you.",
                zh: "又赢了！你看箸如看秤。我可不能再同你下注了。"
            }
        };
    } else if (won) {
        result = {
            speaker: 'farmer',
            voiceId: 'inn_liubo_win_first_01',
            text: {
                en: "Ha! A fine first game. You saw the Owl's path before I did.",
                zh: "哈！第一局便下得漂亮。枭棋的路数，你比我还先看出来。"
            }
        };
    } else if (returning) {
        result = {
            speaker: 'farmer',
            voiceId: 'inn_liubo_loss_repeat_01',
            text: {
                en: "The board has humbled many travelers. Come back after your battles and we will set the pieces again.",
                zh: "这棋盘让许多过客低头。打完仗再来，我们再摆一局。"
            }
        };
    } else {
        result = {
            speaker: 'farmer',
            voiceId: 'inn_liubo_loss_first_01',
            text: {
                en: "No shame in losing the first game. Liubo rewards patience more than pride.",
                zh: "第一局输了不丢人。六博赏的是耐心，不是骄气。"
            }
        };
    }
    return [
        {
            type: 'dialogue',
            portraitKey: 'farmer-v2',
            position: 'top',
            name: 'Villager',
            voiceId: result.voiceId,
            text: result.text
        },
        { type: 'command', action: 'resumeSavedNarrative' }
    ];
}

function pointInRect(x, y, rect) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function classifyLiuboMove(state, move) {
    if (move.scoreFish) return 'score';
    if (move.promoteToOwl) return 'promote';
    const mover = state.pieces.find(piece => piece.id === move.pieceId);
    if (!mover) return 'move';
    const pieces = state.pieces.filter(piece => (
        piece.state === 'board'
        && piece.spaceId === move.toSpaceId
        && piece.id !== mover.id
    ));
    const friendly = pieces.filter(piece => piece.player === mover.player);
    const enemies = pieces.filter(piece => piece.player !== mover.player);
    if (enemies.length) {
        if (friendly.length === 1) return 'capture';
        if (enemies.some(piece => piece.isOwl !== mover.isOwl)) return 'capture';
        return 'contest';
    }
    if (friendly.length) return 'block';
    return 'move';
}

function sampleRoute(route, amount) {
    if (!route.length) return { x: 0, y: 0 };
    if (route.length === 1) return route[0];
    const clamped = Math.max(0, Math.min(1, amount));
    const scaled = clamped * (route.length - 1);
    const index = Math.min(route.length - 2, Math.floor(scaled));
    const local = easeInOut(scaled - index);
    const from = route[index];
    const to = route[index + 1];
    return {
        x: from.x + (to.x - from.x) * local,
        y: from.y + (to.y - from.y) * local
    };
}

function easeInOut(t) {
    return t * t * (3 - 2 * t);
}

function getUiPulse() {
    return 0.5 + Math.sin(performance.now() * 0.006) * 0.5;
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function fitText(text, maxChars) {
    const value = String(text || '');
    if (value.length <= maxChars) return value;
    return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

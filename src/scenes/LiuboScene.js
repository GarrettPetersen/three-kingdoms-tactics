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
    getPiece,
    getPlayerPieces,
    selectLiuboPiece
} from '../minigames/liubo/LiuboRules.js';

const BOARD_DRAW_SIZE = 236;
const PIECE_W = 16;
const PIECE_H = 10;
const MOVE_SEGMENT_MS = 150;
const MOVE_MIN_MS = 260;

export class LiuboScene extends BaseScene {
    constructor() {
        super();
        this.state = createLiuboState();
        this.pieceRects = [];
        this.moveRects = [];
        this.rollRect = null;
        this.returnRect = null;
        this.aiTimer = 0;
        this.lastTime = 0;
        this.moveAnimations = [];
        this.floatTexts = [];
    }

    enter(params = {}) {
        assets.playMusic('campaign', 0.25);
        this.state = createLiuboState({
            humanPlayer: params.humanPlayer || 'white',
            firstPlayer: params.firstPlayer || 'white'
        });
        this.pieceRects = [];
        this.moveRects = [];
        this.aiTimer = 0;
        this.lastTime = 0;
        this.moveAnimations = [];
        this.floatTexts = [];
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;
        this.updateMoveAnimations(dt);
        this.updateFloatTexts(dt);
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
            beginTurnRoll(this.state);
            assets.playSound('ui_click', 0.35);
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
        this.renderMoveAnimations(ctx);
        this.renderFloatTexts(ctx);
        this.renderControls(ctx, canvas, layout);
        this.renderLog(ctx, canvas, layout);
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
        legalMoves.forEach(move => {
            const pos = this.boardToScreen(getBoardPointPosition(move.toSpaceId));
            if (!pos) return;
            const enemies = getPiecesAtDestination(this.state, move);
            ctx.fillStyle = move.scoreFish ? 'rgba(255, 226, 84, 0.62)' : move.promoteToOwl ? 'rgba(95, 189, 226, 0.55)' : enemies ? 'rgba(221, 92, 71, 0.55)' : 'rgba(101, 202, 120, 0.45)';
            ctx.fillRect(pos.x - 8, pos.y - 8, 16, 16);
            ctx.strokeStyle = move.scoreFish ? '#ffe254' : move.promoteToOwl ? '#9ad7ff' : enemies ? '#ff8a70' : '#fff0a4';
            ctx.strokeRect(pos.x - 8.5, pos.y - 8.5, 16, 16);
            this.moveRects.push({ x: pos.x - 10, y: pos.y - 10, w: 20, h: 20, move });
        });
    }

    renderPieces(ctx) {
        this.pieceRects = [];
        const stacks = new Map();
        const active = this.state.pieces.filter(piece => piece.state === 'board');
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
            const x = Math.floor(pos.x - PIECE_W / 2 + offsetX);
            const y = Math.floor(pos.y - PIECE_H / 2 + offsetY);
            if (selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fillRect(x - 3, y - 3, PIECE_W + 6, PIECE_H + 6);
            }
            if (img) {
                ctx.drawImage(img, x, y);
            } else {
                ctx.fillStyle = piece.player === 'white' ? '#eee0c7' : '#3d2c24';
                ctx.fillRect(x, y, PIECE_W, PIECE_H);
            }
            this.pieceRects.push({ x: x - 3, y: y - 3, w: PIECE_W + 6, h: PIECE_H + 6, pieceId: piece.id });
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

        this.renderSticks(ctx, panelX, panelW, panelY + 14);
        this.renderPieceBenches(ctx, panelX, panelW, panelY + 48, layout.portrait);

        this.rollRect = { x: Math.floor(panelX + panelW / 2 - 50), y: panelY + (layout.portrait ? 108 : 174), w: 100, h: 22 };
        const canRoll = this.state.phase === 'roll' && this.state.currentPlayer === this.state.humanPlayer && !this.state.winner;
        ctx.fillStyle = canRoll ? '#6d3d22' : '#3a2b22';
        ctx.fillRect(this.rollRect.x, this.rollRect.y, this.rollRect.w, this.rollRect.h);
        ctx.strokeStyle = canRoll ? '#d6a35d' : '#665448';
        ctx.strokeRect(this.rollRect.x + 0.5, this.rollRect.y + 0.5, this.rollRect.w - 1, this.rollRect.h - 1);
        this.drawPixelText(ctx, this.state.winner ? getLocalizedText(UI_TEXT['NEW GAME']) : getLocalizedText(UI_TEXT['ROLL STICKS']), this.rollRect.x + this.rollRect.w / 2, this.rollRect.y + 7, {
            color: canRoll || this.state.winner ? '#ffd77a' : '#8c7967',
            font: '8px Silkscreen',
            align: 'center'
        });

        if (this.state.phase === 'choose_piece') {
            const moves = getAllLegalMoves(this.state, this.state.currentPlayer).length;
            this.drawPixelText(ctx, `${moves}`, this.rollRect.x + this.rollRect.w / 2, this.rollRect.y + 29, {
                color: '#9ebf92',
                font: '8px Tiny5',
                align: 'center'
            });
        }
    }

    renderSticks(ctx, panelX, panelW, y) {
        const startX = Math.floor(panelX + panelW / 2 - 82);
        for (let i = 0; i < 6; i++) {
            const marked = (this.state.sticks[i] || 2) === 3;
            const img = assets.getImage(marked ? 'liubo_stick_marked_h' : 'liubo_stick_unmarked_h');
            const x = startX + i * 28;
            if (img) ctx.drawImage(img, x, y);
            else {
                ctx.fillStyle = marked ? '#c79a58' : '#8f6940';
                ctx.fillRect(x, y, 28, 5);
            }
        }
        const values = this.state.moveValues?.length ? this.state.moveValues.join(' / ') : '- / -';
        this.drawPixelText(ctx, values, panelX + panelW / 2, y + 12, {
            color: '#ffd77a',
            font: '8px Silkscreen',
            align: 'center'
        });
    }

    renderPieceBenches(ctx, panelX, panelW, y, portrait) {
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
                if (selected) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.fillRect(px - 2, py - 2, 20, 14);
                }
                const img = this.getPieceImage(piece, false);
                if (img) ctx.drawImage(img, px, py);
                else {
                    ctx.fillStyle = player === 'white' ? '#eee0c7' : '#3d2c24';
                    ctx.fillRect(px, py, PIECE_W, PIECE_H);
                }
                this.pieceRects.push({ x: px - 2, y: py - 2, w: 20, h: 14, pieceId: piece.id });
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

    boardToScreen(point) {
        if (!point) return null;
        const scale = BOARD_DRAW_SIZE / LIUBO_BOARD_PADDED_SIZE;
        const layout = this.boardLayout || this.getLayout(this.manager.canvas);
        return {
            x: Math.round(layout.boardX + point.x * scale),
            y: Math.round(layout.boardY + point.y * scale)
        };
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
        const result = applyLiuboMove(this.state, move);
        if (!result) return false;

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
        const color = move.scoreFish ? 'rgba(255, 226, 84, 0.46)' : move.promoteToOwl ? 'rgba(154, 215, 255, 0.38)' : getPiecesAtDestination(this.state, move) ? 'rgba(255, 138, 112, 0.38)' : 'rgba(255, 240, 164, 0.24)';
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
            const x = Math.floor(point.x - PIECE_W / 2);
            const y = Math.floor(point.y - PIECE_H / 2 - hop);
            ctx.save();
            ctx.globalAlpha = 0.95;
            if (img) ctx.drawImage(img, x, y);
            else {
                ctx.fillStyle = animation.piece.player === 'white' ? '#eee0c7' : '#3d2c24';
                ctx.fillRect(x, y, PIECE_W, PIECE_H);
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
        const orientation = vertical ? 'v' : 'h';
        return assets.getImage(`liubo_${type}_${piece.player}_${orientation}`);
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
        if (this.returnRect && pointInRect(x, y, this.returnRect)) {
            assets.playSound('ui_click', 0.4);
            this.manager.switchTo('title');
            return;
        }
        if (this.state.winner && this.rollRect && pointInRect(x, y, this.rollRect)) {
            assets.playSound('ui_click', 0.4);
            this.state = createLiuboState();
            return;
        }
        if (this.state.currentPlayer !== this.state.humanPlayer || this.moveAnimations.length) return;

        if (this.state.phase === 'roll' && this.rollRect && pointInRect(x, y, this.rollRect)) {
            beginTurnRoll(this.state);
            assets.playSound('ui_click', 0.4);
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
            this.manager.switchTo('title');
            return;
        }
        if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
            if (this.state.currentPlayer === this.state.humanPlayer && this.state.phase === 'roll') {
                beginTurnRoll(this.state);
                assets.playSound('ui_click', 0.4);
            }
        }
    }
}

function pointInRect(x, y, rect) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function getPiecesAtDestination(state, move) {
    const mover = state.pieces.find(piece => piece.id === move.pieceId);
    if (!mover) return 0;
    return state.pieces.filter(piece => (
        piece.state === 'board'
        && piece.spaceId === move.toSpaceId
        && piece.player !== mover.player
    )).length;
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

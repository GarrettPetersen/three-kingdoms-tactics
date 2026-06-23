import { BaseScene } from './BaseScene.js';
import { assets } from '../core/AssetLoader.js';
import { getCurrentLanguage, getLocalizedText } from '../core/Language.js';
import { UI_TEXT } from '../data/Translations.js';
import {
    LIUBO_BOARD_PADDED_SIZE,
    LIUBO_PLAYERS,
    getBoardPointPosition,
    isLiuboNest
} from '../minigames/liubo/LiuboBoard.js';
import {
    applyLiuboMove,
    beginTurnRoll,
    chooseAiMove,
    createLiuboState,
    getAllLegalMoves,
    getLegalMovesForPiece,
    getLiuboMoveCaptureIds,
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
const INN_LIUBO_TUTORIAL_ACTIVITY = 'inn_first_liubo';
const LIUBO_PLAYER_DIALOGUE = {
    speaker: 'xiaoer',
    portraitKey: 'xiaoer',
    position: 'bottom',
    name: 'Liubo Player'
};
const LIUBO_RULE_SECTIONS = [
    {
        title: { en: 'TURN', zh: '回合' },
        lines: [
            { en: 'Throw sticks for two move values.', zh: '掷箸得到两个步数。' },
            { en: 'Move up to two different birds.', zh: '最多移动两只不同的鸟。' },
            { en: 'Birds enter from your two corner gates.', zh: '鸟从己方两个角门入场。' }
        ]
    },
    {
        title: { en: 'BOARD', zh: '棋盘' },
        lines: [
            { en: 'Corners connect to nests and outer L perches.', zh: '角位连巢和外侧L位。' },
            { en: 'Outer L -> inner L -> T -> pond.', zh: '外L到内L，再到T和池塘。' },
            { en: 'Capacity: perches 2, nests 1, pond 6.', zh: '容量：栖位二，巢一，池塘六。' }
        ]
    },
    {
        title: { en: 'BLOCKS', zh: '堵塞' },
        lines: [
            { en: 'Two same-side pieces block a perch.', zh: '同方两枚棋子会堵住栖位。' },
            { en: 'One bird vs one bird contests; a helper captures.', zh: '一鸟对一鸟为争夺；同伴再入则吃子。' }
        ]
    },
    {
        title: { en: 'SCORE', zh: '得分' },
        lines: [
            { en: 'Goal: 6 points.', zh: '目标：六分。' },
            { en: 'Captures score 1 and send targets off-board.', zh: '吃子得一分，并送对方出局重入。' },
            { en: 'Cross the pond to catch a fish and become an owl.', zh: '过池捕鱼，鸟变为枭。' },
            { en: 'Owls score by reaching an enemy nest.', zh: '枭到敌方巢可得分。' },
            { en: 'Birds and owls can capture each other.', zh: '鸟和枭可以互相吃掉。' }
        ]
    }
];
const INN_LIUBO_TUTORIAL_LINES = {
    before_first_action: [
        {
            voiceId: 'inn_liubo_tutorial_start_01',
            text: {
                en: 'You start the game by throwing your sticks.',
                zh: '你先掷箸，游戏就从这里开始。'
            }
        }
    ],
    after_throw_move: [
        {
            voiceId: 'inn_liubo_tutorial_move_01',
            text: {
                en: 'You get to move two of your birds on your turn.',
                zh: '每回合你可以移动两只鸟。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_move_02',
            text: {
                en: 'The number of face up sticks determines the distance.',
                zh: '朝上的箸数决定移动距离。'
            }
        }
    ],
    after_throw_goal: [
        {
            voiceId: 'inn_liubo_tutorial_goal_01',
            text: {
                en: 'The goal of the game is to get 6 points.',
                zh: '游戏的目标是得到六分。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_goal_02',
            text: {
                en: 'You can get a point by capturing the opponent\'s birds.',
                zh: '吃掉对手的鸟可以得一分。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_goal_03',
            text: {
                en: 'You can also catch a fish in the central pond.',
                zh: '你也可以到中央池塘捕鱼。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_goal_04',
            text: {
                en: 'Deposit that fish in the opponent\'s nest to score.',
                zh: '把鱼送到对手的巢里，也能得分。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_goal_05',
            text: {
                en: 'A bird with a fish becomes an owl. Simple!',
                zh: '叼着鱼的鸟会变成枭。很简单！'
            }
        }
    ],
    first_block: [
        {
            voiceId: 'inn_liubo_tutorial_block_01',
            text: {
                en: 'These two birds together have blocked a perch.',
                zh: '这两只鸟一起堵住了这个栖位。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_block_02',
            text: {
                en: 'Other birds can\'t get past them.',
                zh: '其他鸟不能从这里通过。'
            }
        }
    ],
    first_contest: [
        {
            voiceId: 'inn_liubo_tutorial_contest_01',
            text: {
                en: 'This perch is contested.',
                zh: '这个栖位正在争夺中。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_contest_02',
            text: {
                en: 'The next bird to move there will capture the opposing player\'s bird.',
                zh: '下一只移动到这里的鸟会吃掉对方的鸟。'
            }
        }
    ],
    first_owl: [
        {
            voiceId: 'inn_liubo_tutorial_owl_01',
            text: {
                en: 'This piece has caught a fish and become an owl.',
                zh: '这枚棋子捉到鱼，变成了枭。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_owl_02',
            text: {
                en: 'Owls and birds can capture each other by landing in the same perch.',
                zh: '枭和鸟落在同一栖位时可以互相吃掉。'
            }
        },
        {
            voiceId: 'inn_liubo_tutorial_owl_03',
            text: {
                en: 'The owl can also score by reaching a nest on the opponent\'s side.',
                zh: '枭也能到达对手一侧的巢来得分。'
            }
        }
    ]
};

export class LiuboScene extends BaseScene {
    constructor() {
        super();
        this.state = createLiuboState();
        this.pieceRects = [];
        this.moveRects = [];
        this.rollRect = null;
        this.rollAnimation = null;
        this.rulesRect = null;
        this.showRules = false;
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
        this.tutorialQueue = [];
        this.activeTutorialDialogue = null;
        this.tutorialSubStep = 0;
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
            this.startOptions = this.createStartOptions(params);
            this.state = createLiuboState(this.startOptions);
            this.saveState();
        }
        this.pieceRects = [];
        this.moveRects = [];
        this.rulesRect = null;
        this.showRules = false;
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
        this.queueInnLiuboTutorialLine('before_first_action');
        this.playActiveTutorialVoice();
    }

    exit() {
        if (this.activeTutorialDialogue?.voiceId) assets.stopVoice();
    }

    update(timestamp) {
        const dt = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;
        this.updateCupPassAnimation(dt);
        this.updateMoveAnimations(dt);
        this.updateFloatTexts(dt);
        this.updateRollAnimation(dt);
        if (this.activeTutorialDialogue || this.tutorialQueue.length) {
            this.startNextTutorialDialogue();
            return;
        }
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
        if (this.activeTutorialDialogue) this.renderTutorialDialogue(ctx, canvas);
        if (this.showRules) this.renderRulesOverlay(ctx, canvas);
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
        const titleX = layout.portrait ? 10 : layout.panelX;
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['LIUBO']), titleX, layout.titleY, {
            color: '#ffd77a',
            font: '16px Silkscreen',
            align: 'left'
        });
        const turnText = this.state.winner
            ? `${this.getPlayerLabel(this.state.winner)} WINS`
            : this.getStatusText();
        this.drawPixelText(ctx, fitText(turnText, layout.portrait ? 28 : 24), titleX, layout.titleY + 20, {
            color: this.state.currentPlayer === 'white' ? '#f0dfc2' : '#b98f6b',
            font: '8px Tiny5',
            align: 'left'
        });

        const topButtonY = 1;
        const topButtonW = 48;
        const topButtonH = 16;
        const returnVisible = !this.isCampaignMode();
        const returnX = canvas.width - 68;
        const rulesX = returnVisible ? returnX - topButtonW - 5 : returnX;
        this.rulesRect = { x: rulesX, y: topButtonY, w: topButtonW, h: topButtonH };
        this.drawLiuboTopButton(ctx, this.rulesRect, getLocalizedText(UI_TEXT['RULES']), this.showRules);

        if (this.isCampaignMode()) {
            this.returnRect = null;
            return;
        }

        this.returnRect = { x: returnX, y: topButtonY, w: topButtonW, h: topButtonH };
        this.drawLiuboTopButton(ctx, this.returnRect, getLocalizedText(UI_TEXT['RETURN']), false);
    }

    drawLiuboTopButton(ctx, rect, label, active = false) {
        ctx.fillStyle = active ? 'rgba(116, 66, 38, 0.82)' : 'rgba(0,0,0,0.4)';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = active ? '#ffd77a' : 'rgba(214, 194, 153, 0.45)';
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        this.drawPixelText(ctx, fitText(label, getCurrentLanguage() === 'zh' ? 4 : 7), rect.x + rect.w / 2, rect.y + 4, {
            color: '#d6c299',
            font: '8px Tiny5',
            align: 'center'
        });
    }

    renderBoard(ctx, layout) {
        this.boardLayout = layout;
        const board = assets.getImage('liubo_board');
        if (board) {
            ctx.save();
            if (this.shouldFlipBoardForHuman()) {
                ctx.translate(layout.boardX + BOARD_DRAW_SIZE, layout.boardY + BOARD_DRAW_SIZE);
                ctx.rotate(Math.PI);
                ctx.drawImage(board, 0, 0, BOARD_DRAW_SIZE, BOARD_DRAW_SIZE);
            } else {
                ctx.drawImage(board, layout.boardX, layout.boardY, BOARD_DRAW_SIZE, BOARD_DRAW_SIZE);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = '#8d6a40';
            ctx.fillRect(layout.boardX, layout.boardY, BOARD_DRAW_SIZE, BOARD_DRAW_SIZE);
        }

        this.moveRects = [];
        const legalMoves = this.state.legalMoves || [];
        legalMoves.forEach(move => this.renderMovePath(ctx, move));
        this.renderEntryGateAffordances(ctx, legalMoves, layout);
        getBestLiuboMovesByDestination(this.state, legalMoves).forEach(move => {
            const pos = this.boardToScreen(getBoardPointPosition(move.toSpaceId));
            if (!pos) return;
            this.moveRects.push({ x: pos.x - 10, y: pos.y - 10, w: 20, h: 20, move });
        });
    }

    renderMoveAffordances(ctx) {
        const legalMoves = this.state.legalMoves || [];
        getBestLiuboMovesByDestination(this.state, legalMoves).forEach(move => {
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

    getCupAnchor(player, layout) {
        const x = layout.panelX + layout.panelW - (layout.portrait ? 47 : 45);
        const topY = layout.panelY + (layout.portrait ? 18 : 27);
        const bottomY = layout.panelY + layout.panelH - (layout.portrait ? 21 : 26);
        return {
            x,
            y: player === this.state.humanPlayer ? bottomY : topY
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
        const flip = this.getCupFacingPlayer() !== this.state.humanPlayer;
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
        return this.getCupFacingPlayer() === this.state.humanPlayer ? -1 : 1;
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
        const humanPlayer = this.state.humanPlayer || 'white';
        const opponentPlayer = humanPlayer === 'white' ? 'black' : 'white';
        const playerOrder = [opponentPlayer, humanPlayer];
        for (let playerIndex = 0; playerIndex < playerOrder.length; playerIndex++) {
            const player = playerOrder[playerIndex];
            const x = portrait
                ? (playerIndex === 0 ? panelX + 14 : panelX + panelW - 88)
                : panelX + 10;
            const lineGap = getCurrentLanguage() === 'zh' ? 15 : 12;
            const blockY = portrait ? y : y + (playerIndex === 0 ? 0 : 64);
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

    renderRulesOverlay(ctx, canvas) {
        const lang = getCurrentLanguage();
        const isZh = lang === 'zh';
        const w = Math.max(
            Math.min(canvas.width - 12, isZh ? 244 : 270),
            Math.min(canvas.width - 12, 430)
        );
        const lineH = isZh ? 11 : 10;
        const gutter = 12;
        const innerW = w - 20;
        const colW = Math.floor((innerW - gutter) / 2);
        const bodyMaxChars = Math.max(isZh ? 12 : 18, Math.floor((colW - 14) / (isZh ? 8 : 5)));
        const sections = LIUBO_RULE_SECTIONS.map(section => ({
            title: section.title[lang] || section.title.en,
            lines: section.lines.flatMap(line => wrapRuleText(line[lang] || line.en, bodyMaxChars, isZh))
        }));
        const scoreIndex = Math.max(1, sections.findIndex(section => section.title === (isZh ? '得分' : 'SCORE')));
        const columns = [sections.slice(0, scoreIndex), sections.slice(scoreIndex)];
        const columnHeight = column => column.reduce((sum, section) => (
            sum + (lineH + 1) + section.lines.length * lineH + 5
        ), 0);
        const contentH = Math.max(...columns.map(columnHeight));
        const h = Math.min(canvas.height - 18, 48 + contentH);
        const x = Math.floor((canvas.width - w) / 2);
        const y = Math.floor((canvas.height - h) / 2);

        ctx.save();
        ctx.fillStyle = 'rgba(8, 6, 5, 0.82)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#221815';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ffd77a';
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        this.drawPixelText(ctx, getLocalizedText(UI_TEXT['RULES']), x + w / 2, y + 10, {
            color: '#ffe254',
            font: '8px Silkscreen',
            align: 'center'
        });

        this.drawLiuboRulesLegend(ctx, x + 12, y + 23, w - 24, lang);

        columns.forEach((column, colIndex) => {
            const colX = x + 10 + colIndex * (colW + gutter);
            let textY = y + 43;
            for (const section of column) {
                this.drawPixelText(ctx, section.title, colX, textY, {
                    color: '#ffd77a',
                    font: '8px Silkscreen'
                });
                textY += lineH + 1;
                for (const line of section.lines) {
                    this.drawPixelText(ctx, line.first ? '-' : ' ', colX + 2, textY, {
                        color: '#c8b08d',
                        font: '8px Tiny5'
                    });
                    this.drawPixelText(ctx, line.text, colX + 10, textY, {
                        color: '#d6c299',
                        font: '8px Tiny5'
                    });
                    textY += lineH;
                }
                textY += 5;
            }
        });
        ctx.restore();
    }

    drawLiuboRulesLegend(ctx, x, y, w, lang) {
        const bird = { player: 'white', isOwl: false };
        const owl = { player: 'white', isOwl: true };
        const birdImg = this.getPieceImage(bird, false);
        const owlImg = this.getPieceImage(owl, true);
        const birdDims = this.getPieceDimensions(bird, birdImg);
        const owlDims = this.getPieceDimensions(owl, owlImg);
        const birdX = x + Math.floor(w * 0.22) - Math.floor(birdDims.w / 2);
        const owlX = x + Math.floor(w * 0.62) - Math.floor(owlDims.w / 2);
        const baselineY = y + 14;

        ctx.save();
        if (birdImg) ctx.drawImage(birdImg, birdX, baselineY - birdDims.h);
        else {
            ctx.fillStyle = '#eee0c7';
            ctx.fillRect(birdX, baselineY - birdDims.h, birdDims.w, birdDims.h);
        }
        if (owlImg) ctx.drawImage(owlImg, owlX, baselineY - owlDims.h);
        else {
            ctx.fillStyle = '#eee0c7';
            ctx.fillRect(owlX, baselineY - owlDims.h, owlDims.w, owlDims.h);
        }
        this.drawPixelText(ctx, lang === 'zh' ? '鸟' : 'bird', birdX + birdDims.w + 5, y + 2, {
            color: '#d6c299',
            font: '8px Tiny5'
        });
        this.drawPixelText(ctx, lang === 'zh' ? '枭' : 'owl + fish', owlX + owlDims.w + 5, y + 2, {
            color: '#d6c299',
            font: '8px Tiny5'
        });
        ctx.strokeStyle = 'rgba(214, 194, 153, 0.38)';
        ctx.beginPath();
        ctx.moveTo(x, y + 18.5);
        ctx.lineTo(x + w, y + 18.5);
        ctx.stroke();
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
        const px = point.x * scale;
        const py = point.y * scale;
        if (this.shouldFlipBoardForHuman()) {
            return {
                x: Math.round(layout.boardX + BOARD_DRAW_SIZE - px),
                y: Math.round(layout.boardY + BOARD_DRAW_SIZE - py)
            };
        }
        return {
            x: Math.round(layout.boardX + px),
            y: Math.round(layout.boardY + py)
        };
    }

    shouldFlipBoardForHuman() {
        return this.state?.humanPlayer === 'black';
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
        this.queueInnLiuboTutorialForMoveResult(result);
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
        if (previousPlayer === this.state.humanPlayer) {
            this.queueInnLiuboTutorialLine('after_throw_move');
            this.queueInnLiuboTutorialLine('after_throw_goal');
        }
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
        if (this.rulesRect && pointInRect(x, y, this.rulesRect)) {
            this.showRules = !this.showRules;
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (this.showRules) {
            this.showRules = false;
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (this.activeTutorialDialogue) {
            this.advanceTutorialDialogue();
            return;
        }
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
        if (e.key === '?' || e.key === 'F1') {
            e.preventDefault();
            this.showRules = !this.showRules;
            assets.playSound('ui_click', 0.35);
            return;
        }
        if (this.showRules) {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                this.showRules = false;
                assets.playSound('ui_click', 0.35);
            }
            return;
        }
        if (this.activeTutorialDialogue) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                this.advanceTutorialDialogue();
            }
            return;
        }
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
        this.startOptions = this.refreshStartOptionsForNewGame(this.startOptions);
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

    shouldUseInnLiuboTutorial() {
        return this.isCampaignMode()
            && this.activityId === INN_LIUBO_TUTORIAL_ACTIVITY
            && this.previousActivityPlays === 0
            && !this.campaignComplete;
    }

    createStartOptions(params = {}) {
        if (this.shouldForceInnTutorialStart()) {
            return {
                humanPlayer: 'white',
                firstPlayer: 'white',
                randomizeHumanPlayer: false
            };
        }
        const forcedHumanPlayer = normalizeLiuboPlayer(params.humanPlayer);
        const randomizeHumanPlayer = !forcedHumanPlayer;
        return {
            humanPlayer: forcedHumanPlayer || randomLiuboPlayer(),
            firstPlayer: 'white',
            randomizeHumanPlayer
        };
    }

    refreshStartOptionsForNewGame(startOptions = {}) {
        if (!startOptions.randomizeHumanPlayer) {
            return {
                humanPlayer: normalizeLiuboPlayer(startOptions.humanPlayer) || 'white',
                firstPlayer: 'white',
                randomizeHumanPlayer: false
            };
        }
        return {
            ...startOptions,
            humanPlayer: randomLiuboPlayer(),
            firstPlayer: 'white',
            randomizeHumanPlayer: true
        };
    }

    shouldForceInnTutorialStart() {
        return this.isCampaignMode()
            && this.activityId === INN_LIUBO_TUTORIAL_ACTIVITY
            && this.previousActivityPlays === 0
            && !this.campaignComplete;
    }

    getInnLiuboTutorialFlags() {
        if (!this.shouldUseInnLiuboTutorial() || !this.manager?.gameState) return null;
        const record = this.manager.gameState.getCampaignLiuboRecord();
        if (!record.activities[this.activityId]) {
            record.activities[this.activityId] = { played: 0, wins: 0, losses: 0 };
        }
        const activity = record.activities[this.activityId];
        activity.tutorialFlags = activity.tutorialFlags || {};
        return activity.tutorialFlags;
    }

    queueInnLiuboTutorialLine(flagId) {
        if (!this.shouldUseInnLiuboTutorial()) return;
        const lines = INN_LIUBO_TUTORIAL_LINES[flagId];
        if (!lines?.length) return;
        const flags = this.getInnLiuboTutorialFlags();
        if (!flags || flags[flagId]) return;
        flags[flagId] = true;
        lines.forEach(line => {
            this.tutorialQueue.push({
                ...LIUBO_PLAYER_DIALOGUE,
                voiceId: line.voiceId,
                text: { ...line.text }
            });
        });
        this.manager.gameState.save();
        this.saveState();
        this.startNextTutorialDialogue();
    }

    queueInnLiuboTutorialForMoveResult(result) {
        if (!this.shouldUseInnLiuboTutorial()) return;
        if (result?.promotedToOwl) {
            this.queueInnLiuboTutorialLine('first_owl');
        }
        if (hasBlockedPerch(this.state)) {
            this.queueInnLiuboTutorialLine('first_block');
        }
        if (hasContestedPerch(this.state)) {
            this.queueInnLiuboTutorialLine('first_contest');
        }
    }

    startNextTutorialDialogue() {
        if (this.activeTutorialDialogue || !this.tutorialQueue.length) return;
        this.activeTutorialDialogue = this.tutorialQueue.shift();
        this.tutorialSubStep = 0;
        this.activeTutorialDialogue._voicePlayed = false;
        this.playActiveTutorialVoice();
        this.saveState();
    }

    playActiveTutorialVoice() {
        if (!this.activeTutorialDialogue?.voiceId || this.activeTutorialDialogue._voicePlayed) return;
        this.activeTutorialDialogue._voicePlayed = true;
        assets.playVoice(this.activeTutorialDialogue.voiceId);
    }

    advanceTutorialDialogue() {
        if (!this.activeTutorialDialogue) return;
        if (this.activeTutorialDialogue.hasNextChunk) {
            this.tutorialSubStep += 1;
        } else {
            this.activeTutorialDialogue = null;
            this.tutorialSubStep = 0;
            this.startNextTutorialDialogue();
        }
        assets.playSound('ui_click', 0.35);
        this.saveState();
    }

    renderTutorialDialogue(ctx, canvas) {
        if (!this.activeTutorialDialogue) return;
        const renderInfo = this.renderDialogueBox(ctx, canvas, this.activeTutorialDialogue, {
            subStep: this.tutorialSubStep
        });
        this.activeTutorialDialogue.hasNextChunk = !!renderInfo?.hasNextChunk;
    }

    saveState() {
        if (!this.isCampaignMode() || this.campaignComplete || !this.manager?.gameState) return;
        this.manager.gameState.setSceneState('liubo', {
            mode: this.mode,
            activityId: this.activityId,
            startOptions: this.startOptions,
            state: this.clonePlain(this.state),
            resultRecorded: this.resultRecorded,
            previousActivityPlays: this.previousActivityPlays,
            tutorialQueue: this.clonePlain(this.tutorialQueue || []),
            activeTutorialDialogue: this.clonePlain(this.activeTutorialDialogue || null),
            tutorialSubStep: this.tutorialSubStep || 0
        });
        this.manager.gameState.setLastScene('liubo');
    }

    restoreState(savedState) {
        this.mode = savedState.mode || 'campaign';
        this.activityId = savedState.activityId || null;
        this.campaignComplete = false;
        this.startOptions = savedState.startOptions || { humanPlayer: 'white', firstPlayer: 'white', randomizeHumanPlayer: false };
        this.state = savedState.state || createLiuboState(this.startOptions);
        this.resultRecorded = !!savedState.resultRecorded;
        this.previousActivityPlays = savedState.previousActivityPlays || 0;
        this.tutorialQueue = savedState.tutorialQueue || [];
        this.activeTutorialDialogue = savedState.activeTutorialDialogue || null;
        this.tutorialSubStep = savedState.tutorialSubStep || 0;
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
        const resultScript = buildCampaignLiuboResultScript({
            won,
            previousActivityPlays: this.previousActivityPlays,
            activityId: this.activityId
        });
        if (narrativeResumeState) {
            this.manager.gameState.setSceneState('narrative', narrativeResumeState);
            this.manager.gameState.setCampaignVar('pendingNarrativeRuntimeFrameAfterLiubo', resultScript);
            this.manager.gameState.setCampaignVar('narrativeResumeAfterLiubo', null);
        }
        this.manager.gameState.clearSceneState('liubo');
        if (narrativeResumeState) {
            this.manager.switchTo('narrative', { keepMusic: true, isResume: true });
        } else {
            this.manager.switchTo('narrative', { keepMusic: true, script: resultScript });
        }
    }
}

function buildCampaignLiuboResultScript({ won, previousActivityPlays = 0, activityId = null }) {
    if (activityId === 'chapter2_luoyang_wait_liubo') {
        const result = won ? {
            speaker: 'merchant',
            voiceId: 'ch2_luoyang_liubo_win_01',
            text: {
                en: 'A clean victory. May the court read merit as clearly as you read the board.',
                zh: '胜得干净。只愿朝廷看功劳，也能如你看棋局这般分明。'
            }
        } : {
            speaker: 'merchant',
            voiceId: 'ch2_luoyang_liubo_loss_01',
            text: {
                en: 'Liubo teaches patience. A useful lesson when palace doors open slowly.',
                zh: '六博教人耐心。宫门开得慢时，这道理倒也有用。'
            }
        };
        return [
            {
                type: 'dialogue',
                portraitKey: 'merchant',
                position: 'top',
                name: 'Liubo Player',
                voiceId: result.voiceId,
                speaker: result.speaker,
                text: result.text
            }
        ];
    }

    const returning = previousActivityPlays > 0;
    let result;
    if (won && returning) {
        result = {
            speaker: 'xiaoer',
            voiceId: 'inn_liubo_win_repeat_01',
            text: {
                en: "Again! You read the sticks like a market scale. I will have to stop wagering with you.",
                zh: "又赢了！你看箸如看秤。我可不能再同你下注了。"
            }
        };
    } else if (won) {
        result = {
            speaker: 'xiaoer',
            voiceId: 'inn_liubo_win_first_01',
            text: {
                en: "Ha! A fine first game. You saw the Owl's path before I did.",
                zh: "哈！第一局便下得漂亮。枭棋的路数，你比我还先看出来。"
            }
        };
    } else if (returning) {
        result = {
            speaker: 'xiaoer',
            voiceId: 'inn_liubo_loss_repeat_01',
            text: {
                en: "The board has humbled many travelers. Come back after your battles and we will set the pieces again.",
                zh: "这棋盘让许多过客低头。打完仗再来，我们再摆一局。"
            }
        };
    } else {
        result = {
            speaker: 'xiaoer',
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
            portraitKey: 'xiaoer',
            position: 'top',
            name: 'Liubo Player',
            voiceId: result.voiceId,
            speaker: result.speaker,
            text: result.text
        }
    ];
}

function pointInRect(x, y, rect) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function normalizeLiuboPlayer(player) {
    return LIUBO_PLAYERS.includes(player) ? player : null;
}

function randomLiuboPlayer() {
    return Math.random() < 0.5 ? 'white' : 'black';
}

function classifyLiuboMove(state, move) {
    const mover = state.pieces.find(piece => piece.id === move.pieceId);
    if (!mover) return 'move';
    if (getLiuboMoveCaptureIds(state, move).length) return 'capture';
    if (move.scoreFish) return 'score';
    if (move.promoteToOwl) return 'promote';
    const moverIsOwlAfterMove = mover.isOwl || !!move.promoteToOwl;
    const pieces = state.pieces.filter(piece => (
        piece.state === 'board'
        && piece.spaceId === move.toSpaceId
        && piece.id !== mover.id
    ));
    const friendly = pieces.filter(piece => piece.player === mover.player);
    const enemies = pieces.filter(piece => piece.player !== mover.player);
    if (enemies.length) {
        if (friendly.length === 1) return 'capture';
        if (enemies.some(piece => piece.isOwl !== moverIsOwlAfterMove)) return 'capture';
        return 'contest';
    }
    if (friendly.length) return 'block';
    return 'move';
}

function getBestLiuboMovesByDestination(state, moves) {
    const bestByDestination = new Map();
    for (const move of moves || []) {
        const key = move.toSpaceId || move.key;
        const existing = bestByDestination.get(key);
        if (!existing || getLiuboMovePriority(state, move) > getLiuboMovePriority(state, existing)) {
            bestByDestination.set(key, move);
        }
    }
    return [...bestByDestination.values()];
}

function getLiuboMovePriority(state, move) {
    const kind = classifyLiuboMove(state, move);
    if (kind === 'score') return 60;
    if (kind === 'capture') return 50;
    if (kind === 'promote') return 40;
    if (kind === 'contest') return 30;
    if (kind === 'block') return 20;
    return 10;
}

function getPerchPieces(state) {
    return (state.pieces || []).filter(piece => (
        piece.state === 'board'
        && piece.spaceId
        && piece.spaceId !== 'pond'
        && !isLiuboNest(piece.spaceId)
    ));
}

function hasBlockedPerch(state) {
    const counts = new Map();
    getPerchPieces(state).forEach(piece => {
        const key = `${piece.spaceId}:${piece.player}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.values()].some(count => count >= 2);
}

function hasContestedPerch(state) {
    const grouped = new Map();
    getPerchPieces(state).forEach(piece => {
        const key = `${piece.spaceId}:${piece.isOwl ? 'owl' : 'bird'}`;
        if (!grouped.has(key)) grouped.set(key, new Set());
        grouped.get(key).add(piece.player);
    });
    return [...grouped.values()].some(players => players.has('white') && players.has('black'));
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

function wrapRuleText(text, maxChars, isZh = false) {
    const value = String(text || '').trim();
    if (!value) return [];
    if (isZh) {
        const lines = [];
        for (let i = 0; i < value.length; i += maxChars) {
            lines.push({ text: value.slice(i, i + maxChars), first: i === 0 });
        }
        return lines;
    }

    const words = value.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxChars) {
            current = next;
            continue;
        }
        if (current) lines.push(current);
        current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
    if (current) lines.push(current);
    return lines.map((line, index) => ({ text: line, first: index === 0 }));
}

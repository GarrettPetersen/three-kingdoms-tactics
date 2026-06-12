import {
    LIUBO_ENTRY_SPACES,
    LIUBO_PLAYERS,
    getAdjacentLiuboSpaces,
    getLiuboFeatureCapacity,
    getLiuboFeatureId,
    getLiuboSpaceCapacity,
    isLiuboNest,
    isScoringNest,
    otherPlayer
} from './LiuboBoard.js';

const PIECES_PER_PLAYER = 6;
const TARGET_SCORE = 6;

export function createLiuboState(options = {}) {
    const pieces = [];
    for (const player of LIUBO_PLAYERS) {
        for (let i = 0; i < PIECES_PER_PLAYER; i++) {
            pieces.push({
                id: `${player[0]}${i + 1}`,
                player,
                index: i,
                state: 'offboard',
                spaceId: null,
                isOwl: false,
                carryingFish: false
            });
        }
    }

    return {
        ruleset: 'liubo_lab_reconstruction',
        humanPlayer: options.humanPlayer || 'white',
        currentPlayer: options.firstPlayer || 'white',
        phase: 'roll',
        pieces,
        scores: { white: 0, black: 0 },
        targetScore: TARGET_SCORE,
        sticks: [],
        moveValues: [],
        movesRemaining: [],
        usedPieceIds: [],
        selectedPieceId: null,
        legalMoves: [],
        mustRollAgain: false,
        message: '',
        winner: null,
        turn: 1,
        log: []
    };
}

export function rollLiuboSticks(rng = Math.random) {
    const sticks = Array.from({ length: 6 }, () => rng() < 0.5 ? 2 : 3);
    const a = sticks.slice(0, 3).reduce((sum, value) => sum + value, 0) - 5;
    const b = sticks.slice(3).reduce((sum, value) => sum + value, 0) - 5;
    return {
        sticks,
        moveValues: [Math.max(1, a), Math.max(1, b)]
    };
}

export function beginTurnRoll(state, rng = Math.random, presetRoll = null) {
    if (state.winner) return state;
    const rolled = presetRoll || rollLiuboSticks(rng);
    state.sticks = rolled.sticks;
    state.moveValues = rolled.moveValues;
    state.movesRemaining = [...rolled.moveValues];
    state.usedPieceIds = [];
    state.selectedPieceId = null;
    state.legalMoves = [];
    state.phase = 'choose_piece';
    state.mustRollAgain = false;
    state.message = `${playerName(state.currentPlayer)} rolled ${rolled.moveValues.join(' and ')}.`;
    state.log.unshift(state.message);
    trimLog(state);
    if (!getAllLegalMoves(state, state.currentPlayer).length) {
        state.message = `${playerName(state.currentPlayer)} has no legal move.`;
        state.log.unshift(state.message);
        endTurn(state);
    }
    return state;
}

export function getPiece(state, pieceId) {
    return state.pieces.find(piece => piece.id === pieceId) || null;
}

export function getPlayerPieces(state, player) {
    return state.pieces.filter(piece => piece.player === player);
}

export function getActiveOwl(state, player) {
    return getPlayerPieces(state, player).find(piece => piece.isOwl && isActive(piece)) || null;
}

export function isActive(piece) {
    return piece && piece.state === 'board';
}

export function getPiecesAt(state, spaceId, player = null) {
    return state.pieces.filter(piece => isActive(piece) && piece.spaceId === spaceId && (!player || piece.player === player));
}

export function selectLiuboPiece(state, pieceId) {
    const piece = getPiece(state, pieceId);
    if (!piece || piece.player !== state.currentPlayer || state.phase !== 'choose_piece') return [];
    const moves = getLegalMovesForPiece(state, piece);
    state.selectedPieceId = moves.length ? pieceId : null;
    state.legalMoves = moves;
    state.message = moves.length ? `Choose a destination for ${pieceLabel(piece)}.` : `${pieceLabel(piece)} cannot move.`;
    return moves;
}

export function getAllLegalMoves(state, player = state.currentPlayer) {
    return getPlayerPieces(state, player).flatMap(piece => getLegalMovesForPiece(state, piece));
}

export function getLegalMovesForPiece(state, piece) {
    if (!piece || piece.player !== state.currentPlayer || state.phase !== 'choose_piece') return [];
    if (state.usedPieceIds.includes(piece.id)) return [];

    const moves = [];
    for (const value of state.movesRemaining) {
        const resolved = resolveMove(state, piece, value);
        if (resolved) moves.push(...resolved);
    }
    return dedupeMoves(moves);
}

export function applyLiuboMove(state, move) {
    const piece = getPiece(state, move.pieceId);
    if (!piece || state.phase !== 'choose_piece') return false;

    const legal = getLegalMovesForPiece(state, piece).find(candidate => candidate.key === move.key);
    if (!legal) return false;

    const wasOwl = piece.isOwl;
    piece.state = legal.toState;
    piece.spaceId = legal.toSpaceId;

    if (legal.promoteToOwl) {
        piece.isOwl = true;
        piece.carryingFish = true;
    }

    const captured = resolveCaptures(state, piece);
    let scoredFish = false;
    if (legal.scoreFish && piece.carryingFish) {
        state.scores[piece.player] += 1;
        scoredFish = true;
        piece.isOwl = false;
        piece.carryingFish = false;
    }

    if (!state.usedPieceIds.includes(piece.id)) state.usedPieceIds.push(piece.id);
    state.movesRemaining.splice(state.movesRemaining.indexOf(legal.value), 1);
    state.selectedPieceId = null;
    state.legalMoves = [];

    const captureText = captured.length ? ` +${captured.length}` : '';
    const fishText = scoredFish ? ' fish' : legal.promoteToOwl ? ' Owl' : '';
    state.message = `${pieceLabel(piece)} ${legal.value}${fishText}${captureText}`;
    state.log.unshift(state.message);
    trimLog(state);

    updateWinner(state);
    if (state.winner) {
        state.phase = 'game_over';
        state.message = `${playerName(state.winner)} wins.`;
        state.log.unshift(state.message);
        trimLog(state);
        return {
            applied: true,
            captured,
            scoredFish,
            promotedToOwl: legal.promoteToOwl,
            winner: state.winner
        };
    }

    if (state.movesRemaining.length === 0 || getAllLegalMoves(state, state.currentPlayer).length === 0) {
        if (state.mustRollAgain) {
            state.phase = 'roll';
            state.movesRemaining = [];
            state.usedPieceIds = [];
            state.mustRollAgain = false;
            state.message = `${playerName(state.currentPlayer)} rolls again.`;
        } else {
            endTurn(state);
        }
    }

    return {
        applied: true,
        captured,
        scoredFish,
        promotedToOwl: legal.promoteToOwl,
        winner: state.winner
    };
}

export function chooseAiMove(state) {
    const moves = getAllLegalMoves(state, state.currentPlayer);
    if (!moves.length) return null;
    const scored = moves.map(move => ({ move, score: scoreMove(state, move) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
}

function scoreMove(state, move) {
    const piece = getPiece(state, move.pieceId);
    let score = 0;
    if (move.scoreFish) score += 120;
    if (move.promoteToOwl) score += 60;
    if (piece?.isOwl) score += 8;
    const enemies = getCapturablePiecesAt(state, piece, move.toSpaceId);
    score += enemies.length * 45;
    if (piece?.state === 'offboard') score += 10;
    score += Math.random() * 2;
    return score;
}

function resolveMove(state, piece, value) {
    if (piece.state === 'removed' || piece.state === 'captured') return null;
    const startSpaces = piece.state === 'offboard' ? (LIUBO_ENTRY_SPACES[piece.player] || []) : [piece.spaceId];
    const steps = piece.state === 'offboard' ? Math.max(0, value - 1) : value;
    const canEnterPond = true;
    const paths = startSpaces.flatMap(startSpace => {
        if (piece.state === 'offboard' && !canMoveThroughOrLand(state, piece, startSpace, steps === 0)) return [];
        return findLiuboPaths(state, piece, startSpace, steps, {
            allowPond: canEnterPond,
            startsOffboard: piece.state === 'offboard'
        });
    });

    return paths.map(path => {
        const crossedPond = path.visitedPond;
        const promoteToOwl = !piece.isOwl && crossedPond;
        const wouldCarryFish = piece.carryingFish || promoteToOwl;
        return buildMove(piece, value, path.spaceId, {
            promoteToOwl,
            scoreFish: wouldCarryFish && isScoringNest(piece.player, path.spaceId),
            crossedPond,
            path: path.path
        });
    });
}

function findLiuboPaths(state, piece, startSpace, steps, options = {}) {
    if (!startSpace) return [];
    let paths = [{
        spaceId: startSpace,
        path: [startSpace],
        visitedPond: startSpace === 'pond'
    }];

    for (let step = 0; step < steps; step++) {
        const nextPaths = [];
        for (const path of paths) {
            for (const next of getAdjacentLiuboSpaces(path.spaceId, { allowPond: options.allowPond })) {
                if (next !== 'pond' && path.path.includes(next)) continue;
                const isFinalStep = step === steps - 1;
                if (!canMoveThroughOrLand(state, piece, next, isFinalStep, path)) continue;
                nextPaths.push({
                    spaceId: next,
                    path: [...path.path, next],
                    visitedPond: path.visitedPond || next === 'pond'
                });
            }
        }
        paths = nextPaths;
    }

    const seen = new Set();
    return paths.filter(path => {
        const key = `${path.spaceId}:${path.visitedPond ? 'pond' : 'dry'}:${path.path.join('.')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function canMoveThroughOrLand(state, piece, spaceId, isFinalStep, path = null) {
    if (isLiuboNest(spaceId)) {
        const canEnterNest = isFinalStep
            && isScoringNest(piece.player, spaceId)
            && (piece.carryingFish || piece.isOwl || path?.visitedPond);
        if (!canEnterNest) return false;
    }

    const friendly = getPiecesAt(state, spaceId, piece.player).filter(other => other.id !== piece.id);
    const enemies = getPiecesAt(state, spaceId, otherPlayer(piece.player));
    const spaceCapacity = getLiuboSpaceCapacity(spaceId);
    const featurePieces = getPiecesOnFeature(state, spaceId).filter(other => other.id !== piece.id);
    const featureEnemies = featurePieces.filter(other => other.player !== piece.player);

    if (enemies.length) {
        if (!isFinalStep) return false;
        return canCaptureOnSpace(state, piece, spaceId, friendly, enemies);
    }

    if (friendly.length >= spaceCapacity) return false;
    if (featureEnemies.some(enemy => enemy.isOwl !== piece.isOwl)) return isFinalStep;
    return featurePieces.length < getLiuboFeatureCapacity(spaceId);
}

function canCaptureOnSpace(state, piece, spaceId, friendly, enemies) {
    if (friendly.length > 0 || enemies.length !== 1) return false;
    const target = enemies[0];
    const contested = isContestedFeature(state, spaceId, piece.id);
    if (contested) return true;
    if (!piece.isOwl && target.isOwl) return true;
    if (piece.isOwl && !target.isOwl) return true;
    return false;
}

function buildMove(piece, value, toSpaceId, extra = {}) {
    return {
        key: `${piece.id}:${value}:${toSpaceId}:${extra.promoteToOwl ? 'owl' : ''}:${extra.scoreFish ? 'score' : ''}:${extra.path?.join('.') || ''}`,
        pieceId: piece.id,
        value,
        direction: 1,
        toState: 'board',
        toSpaceId,
        ...extra
    };
}

function resolveCaptures(state, mover) {
    const captured = [];
    for (const target of getCapturablePiecesAt(state, mover, mover.spaceId)) {
        target.wasOwlWhenCaptured = target.isOwl;
        target.isOwl = false;
        target.carryingFish = false;
        target.state = 'offboard';
        target.spaceId = null;
        captured.push(target);
    }
    if (captured.length) state.scores[mover.player] += captured.length;
    return captured;
}

function getCapturablePiecesAt(state, mover, spaceId) {
    if (!mover || !spaceId) return [];
    const featureEnemies = getPiecesOnFeature(state, spaceId).filter(piece => (
        piece.id !== mover.id
        && piece.player === otherPlayer(mover.player)
    ));
    const mixedTypeEnemy = featureEnemies.find(enemy => enemy.isOwl !== mover.isOwl);
    if (mixedTypeEnemy) return [mixedTypeEnemy];

    const friendly = getPiecesAt(state, spaceId, mover.player).filter(other => other.id !== mover.id);
    const enemies = getPiecesAt(state, spaceId, otherPlayer(mover.player)).filter(other => other.id !== mover.id);
    if (!canCaptureOnSpace(state, mover, spaceId, friendly, enemies)) return [];
    return enemies;
}

function getPiecesOnFeature(state, spaceId) {
    const feature = getLiuboFeatureId(spaceId);
    return state.pieces.filter(piece => isActive(piece) && getLiuboFeatureId(piece.spaceId) === feature);
}

function isContestedFeature(state, spaceId, movingPieceId = null) {
    const pieces = getPiecesOnFeature(state, spaceId).filter(piece => piece.id !== movingPieceId);
    return [false, true].some(isOwl => (
        LIUBO_PLAYERS.every(player => pieces.some(piece => piece.player === player && piece.isOwl === isOwl))
    ));
}

function updateWinner(state) {
    for (const player of LIUBO_PLAYERS) {
        if ((state.scores[player] || 0) >= (state.targetScore || TARGET_SCORE)) {
            state.winner = player;
            return;
        }

        const enemy = otherPlayer(player);
        const enemyCanPlay = getPlayerPieces(state, enemy).some(piece => piece.state !== 'removed');
        if (!enemyCanPlay) {
            state.winner = player;
            return;
        }
    }
}

function endTurn(state) {
    state.currentPlayer = otherPlayer(state.currentPlayer);
    state.phase = 'roll';
    state.movesRemaining = [];
    state.usedPieceIds = [];
    state.selectedPieceId = null;
    state.legalMoves = [];
    state.turn += state.currentPlayer === 'white' ? 1 : 0;
    state.message = `${playerName(state.currentPlayer)} to roll.`;
}

function dedupeMoves(moves) {
    const result = [];
    const seen = new Set();
    for (const move of moves.flat()) {
        if (!move || seen.has(move.key)) continue;
        seen.add(move.key);
        result.push(move);
    }
    return result;
}

function trimLog(state) {
    state.log = state.log.slice(0, 6);
}

export function playerName(player) {
    return player === 'white' ? 'White' : 'Black';
}

export function pieceLabel(piece) {
    return `${playerName(piece.player)} ${piece.isOwl ? 'Owl' : 'bird'} ${piece.index + 1}`;
}

export function formatSpace(spaceId) {
    if (spaceId === 'pond') return 'the pond';
    if (typeof spaceId === 'string') return spaceId.replace(/_/g, ' ');
    return 'off-board';
}

export const LIUBO_PLAYERS = ['white', 'black'];
export const LIUBO_BOARD_SIZE = 220;
export const LIUBO_BOARD_PADDED_SIZE = 256;

// Liubo Lab's board reads as visible marks with separate branch landing points:
// each V/corner, L, and T can hold two pieces because each arm is its own space.
export const LIUBO_SPACES = {
    l_top_left: { id: 'l_top_left', feature: 'l_top', kind: 'l', x: 118, y: 82 },
    l_top_right: { id: 'l_top_right', feature: 'l_top', kind: 'l', x: 128, y: 62 },
    l_right_top: { id: 'l_right_top', feature: 'l_right', kind: 'l', x: 194, y: 128 },
    l_right_bottom: { id: 'l_right_bottom', feature: 'l_right', kind: 'l', x: 214, y: 138 },
    l_bottom_right: { id: 'l_bottom_right', feature: 'l_bottom', kind: 'l', x: 138, y: 194 },
    l_bottom_left: { id: 'l_bottom_left', feature: 'l_bottom', kind: 'l', x: 128, y: 214 },
    l_left_bottom: { id: 'l_left_bottom', feature: 'l_left', kind: 'l', x: 62, y: 128 },
    l_left_top: { id: 'l_left_top', feature: 'l_left', kind: 'l', x: 42, y: 118 },

    corner_ne_top: { id: 'corner_ne_top', feature: 'corner_ne', kind: 'v', x: 198, y: 42 },
    corner_ne_right: { id: 'corner_ne_right', feature: 'corner_ne', kind: 'v', x: 214, y: 58 },
    corner_se_right: { id: 'corner_se_right', feature: 'corner_se', kind: 'v', x: 214, y: 198 },
    corner_se_bottom: { id: 'corner_se_bottom', feature: 'corner_se', kind: 'v', x: 198, y: 214 },
    corner_sw_bottom: { id: 'corner_sw_bottom', feature: 'corner_sw', kind: 'v', x: 58, y: 214 },
    corner_sw_left: { id: 'corner_sw_left', feature: 'corner_sw', kind: 'v', x: 42, y: 198 },
    corner_nw_left: { id: 'corner_nw_left', feature: 'corner_nw', kind: 'v', x: 42, y: 58 },
    corner_nw_top: { id: 'corner_nw_top', feature: 'corner_nw', kind: 'v', x: 58, y: 42 },

    circle_ne: { id: 'circle_ne', feature: 'circle_ne', kind: 'nest', x: 174, y: 82 },
    circle_se: { id: 'circle_se', feature: 'circle_se', kind: 'nest', x: 174, y: 174 },
    circle_sw: { id: 'circle_sw', feature: 'circle_sw', kind: 'nest', x: 82, y: 174 },
    circle_nw: { id: 'circle_nw', feature: 'circle_nw', kind: 'nest', x: 82, y: 82 },

    t_top_outer: { id: 't_top_outer', feature: 't_top', kind: 't', x: 128, y: 82 },
    t_top_inner: { id: 't_top_inner', feature: 't_top', kind: 't', x: 128, y: 104 },
    t_right_outer: { id: 't_right_outer', feature: 't_right', kind: 't', x: 174, y: 128 },
    t_right_inner: { id: 't_right_inner', feature: 't_right', kind: 't', x: 152, y: 128 },
    t_bottom_outer: { id: 't_bottom_outer', feature: 't_bottom', kind: 't', x: 128, y: 174 },
    t_bottom_inner: { id: 't_bottom_inner', feature: 't_bottom', kind: 't', x: 128, y: 152 },
    t_left_outer: { id: 't_left_outer', feature: 't_left', kind: 't', x: 82, y: 128 },
    t_left_inner: { id: 't_left_inner', feature: 't_left', kind: 't', x: 104, y: 128 },

    pond: { id: 'pond', feature: 'pond', kind: 'pond', x: 128, y: 128 }
};

export const LIUBO_ENTRY_SPACES = {
    white: ['corner_sw_bottom', 'corner_se_bottom'],
    black: ['corner_nw_top', 'corner_ne_top']
};

export const LIUBO_SCORING_NESTS = {
    white: ['circle_ne', 'circle_nw'],
    black: ['circle_se', 'circle_sw']
};

export const LIUBO_GRAPH = {
    l_top_left: ['corner_nw_top', 'l_top_right', 't_top_outer'],
    l_top_right: ['corner_ne_top', 'l_top_left', 't_top_outer'],
    l_right_top: ['corner_ne_right', 'l_right_bottom', 't_right_outer'],
    l_right_bottom: ['corner_se_right', 'l_right_top', 't_right_outer'],
    l_bottom_right: ['corner_se_bottom', 'l_bottom_left', 't_bottom_outer'],
    l_bottom_left: ['corner_sw_bottom', 'l_bottom_right', 't_bottom_outer'],
    l_left_bottom: ['corner_sw_left', 'l_left_top', 't_left_outer'],
    l_left_top: ['corner_nw_left', 'l_left_bottom', 't_left_outer'],

    corner_ne_top: ['l_top_right', 'corner_ne_right', 'circle_ne'],
    corner_ne_right: ['l_right_top', 'corner_ne_top', 'circle_ne'],
    corner_se_right: ['l_right_bottom', 'corner_se_bottom', 'circle_se'],
    corner_se_bottom: ['l_bottom_right', 'corner_se_right', 'circle_se'],
    corner_sw_bottom: ['l_bottom_left', 'corner_sw_left', 'circle_sw'],
    corner_sw_left: ['l_left_bottom', 'corner_sw_bottom', 'circle_sw'],
    corner_nw_left: ['l_left_top', 'corner_nw_top', 'circle_nw'],
    corner_nw_top: ['l_top_left', 'corner_nw_left', 'circle_nw'],

    circle_ne: ['corner_ne_top', 'corner_ne_right'],
    circle_se: ['corner_se_right', 'corner_se_bottom'],
    circle_sw: ['corner_sw_bottom', 'corner_sw_left'],
    circle_nw: ['corner_nw_left', 'corner_nw_top'],

    t_top_outer: ['l_top_left', 'l_top_right', 't_top_inner'],
    t_top_inner: ['t_top_outer', 'pond'],
    t_right_outer: ['l_right_top', 'l_right_bottom', 't_right_inner'],
    t_right_inner: ['t_right_outer', 'pond'],
    t_bottom_outer: ['l_bottom_right', 'l_bottom_left', 't_bottom_inner'],
    t_bottom_inner: ['t_bottom_outer', 'pond'],
    t_left_outer: ['l_left_bottom', 'l_left_top', 't_left_inner'],
    t_left_inner: ['t_left_outer', 'pond'],

    pond: ['t_top_inner', 't_right_inner', 't_bottom_inner', 't_left_inner']
};

export function getBoardPointPosition(spaceId) {
    return LIUBO_SPACES[spaceId] || null;
}

export function getAdjacentLiuboSpaces(spaceId, options = {}) {
    const neighbors = LIUBO_GRAPH[spaceId] || [];
    if (options.allowPond !== false) return neighbors;
    return neighbors.filter(id => id !== 'pond');
}

export function isLiuboNest(spaceId) {
    return LIUBO_SPACES[spaceId]?.kind === 'nest';
}

export function isScoringNest(player, spaceId) {
    return LIUBO_SCORING_NESTS[player]?.includes(spaceId) || false;
}

export function getLiuboSpaceCapacity(spaceId) {
    const kind = LIUBO_SPACES[spaceId]?.kind;
    if (kind === 'pond') return 6;
    if (kind === 'nest') return 1;
    return 2;
}

export function getLiuboFeatureId(spaceId) {
    return LIUBO_SPACES[spaceId]?.feature || spaceId;
}

export function getLiuboSpaceKind(spaceId) {
    return LIUBO_SPACES[spaceId]?.kind || null;
}

export function getLiuboFeatureCapacity(spaceId) {
    if (LIUBO_SPACES[spaceId]?.kind === 'pond') return 6;
    const feature = getLiuboFeatureId(spaceId);
    return Object.values(LIUBO_SPACES).filter(space => space.feature === feature).length || 1;
}

export function otherPlayer(player) {
    return player === 'white' ? 'black' : 'white';
}

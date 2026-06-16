export const STORY_ROUTES = {
    liubei: {
        id: 'liubei',
        startNode: 'prologue',
        terminalNode: 'chapter1_complete',
        nodes: {
            prologue: { next: 'prologue_complete' },
            prologue_complete: { next: 'daxing' },
            daxing: { next: 'qingzhou_siege' },
            qingzhou_siege: { next: 'qingzhou_cleanup' },
            qingzhou_cleanup: { next: 'guangzong_camp' },
            guangzong_camp: { next: 'yingchuan_aftermath' },
            yingchuan_aftermath: { next: 'guangzong_encounter' },
            guangzong_encounter: { next: 'dongzhuo_battle' },
            dongzhuo_battle: { next: 'chapter1_complete' },
            chapter1_complete: { next: null }
        }
    },
    caocao: {
        id: 'caocao',
        startNode: 'caocao_intro',
        terminalNode: 'caocao_chapter1_complete',
        nodes: {
            caocao_intro: { next: 'caocao_intro_complete' },
            caocao_intro_complete: { next: 'caocao_yingchuan_intercept' },
            caocao_yingchuan_intercept: { next: 'caocao_chapter1_complete' },
            caocao_chapter1_complete: { next: null }
        }
    },
    chapter2_oath: {
        id: 'chapter2_oath',
        startNode: 'chapter2_oath_dongzhuo_choice',
        terminalNode: 'chapter2_oath_complete',
        nodes: {
            chapter2_oath_dongzhuo_choice: { next: 'chapter2_zhujun_camp' },
            chapter2_zhujun_camp: { next: 'chapter2_zhangbao_probe' },
            chapter2_zhangbao_probe: { next: 'chapter2_oath_complete' },
            chapter2_oath_complete: { next: null }
        }
    },
    hejin: {
        id: 'hejin',
        startNode: 'chapter2_hejin_gate',
        terminalNode: 'chapter2_hejin_gate_complete',
        nodes: {
            chapter2_hejin_gate: { next: 'chapter2_hejin_gate_complete' },
            chapter2_hejin_gate_complete: { next: null }
        }
    }
};

export function buildParentMap(routeId) {
    const route = STORY_ROUTES[routeId];
    const parents = {};
    if (!route || !route.nodes) return parents;
    for (const [nodeId, node] of Object.entries(route.nodes)) {
        const nextNodes = getStoryNodeNextIds(node);
        for (const next of nextNodes) {
            if (!parents[next]) parents[next] = nodeId;
        }
    }
    return parents;
}

export function getStoryNodeNextIds(node) {
    if (!node) return [];
    if (Array.isArray(node.transitions)) {
        return node.transitions
            .map(transition => transition?.to)
            .filter(Boolean);
    }
    return node.next ? [node.next] : [];
}

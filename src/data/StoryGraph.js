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
            chapter2_zhangbao_probe: { next: 'chapter2_zhangbao_counter_council' },
            chapter2_zhangbao_counter_council: { next: 'chapter2_zhangbao_counter' },
            chapter2_zhangbao_counter: { next: 'chapter2_yangcheng_surrender' },
            chapter2_yangcheng_surrender: { next: 'chapter2_wan_strategy' },
            chapter2_wan_strategy: {
                transitions: [
                    { choice: 'chapter2_wan_strategy', value: 'open_southeast', to: 'chapter2_wan_field' },
                    { choice: 'chapter2_wan_strategy', value: 'assault_walls', to: 'chapter2_wan_gate' },
                    { to: 'chapter2_wan_field' }
                ]
            },
            chapter2_wan_field: { next: 'chapter2_wan_reversal' },
            chapter2_wan_gate: { next: 'chapter2_wan_reversal' },
            chapter2_wan_reversal: {
                transitions: [
                    { choice: 'chapter2_wan_second_siege', value: 'hold_north_road', to: 'chapter2_wan_north_road' },
                    { choice: 'chapter2_wan_second_siege', value: 'join_wall', to: 'chapter2_wan_final_assault' },
                    { to: 'chapter2_wan_north_road' }
                ]
            },
            chapter2_wan_north_road: { next: 'chapter2_anxi_appointment' },
            chapter2_wan_final_assault: { next: 'chapter2_anxi_appointment' },
            chapter2_anxi_appointment: {
                transitions: [
                    { choice: 'chapter2_oath_political_outcome', value: 'pardoned_outlaw', to: 'chapter2_liuhui_shelter' },
                    { choice: 'chapter2_oath_political_outcome', value: 'anxi_commandant', to: 'chapter2_anxi_governance' },
                    { choice: 'chapter2_oath_political_outcome', value: 'anxi_assistant', to: 'chapter2_anxi_governance' },
                    { to: 'chapter2_anxi_governance' }
                ]
            },
            chapter2_anxi_governance: { next: 'chapter2_liuhui_shelter' },
            chapter2_liuhui_shelter: { next: 'chapter2_oath_complete' },
            chapter2_oath_complete: { next: null }
        }
    },
    hejin: {
        id: 'hejin',
        startNode: 'chapter2_hejin_gate',
        terminalNode: 'chapter2_hejin_gate_complete',
        nodes: {
            chapter2_hejin_gate: { next: 'chapter2_hejin_council' },
            chapter2_hejin_council: { next: 'chapter2_hejin_enthronement' },
            chapter2_hejin_enthronement: { next: 'chapter2_hejin_jian_shuo' },
            chapter2_hejin_jian_shuo: { next: 'chapter2_hejin_gate_complete' },
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

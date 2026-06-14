import { BATTLES } from '../data/Battles.js';

function clonePlain(value) {
    if (!value || typeof value !== 'object') return value;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_err) {
        return Array.isArray(value) ? [...value] : { ...value };
    }
}

function getDefaultDefeatScript(battleId) {
    const battleName = BATTLES[battleId]?.name || 'the battle';
    return [
        {
            type: 'dialogue',
            portraitKey: 'liu-bei',
            name: 'Liu Bei',
            text: {
                en: `We lost ground at ${battleName}. Regroup the men; we try again.`,
                zh: '此战失利。收拢兵马，再战一次。'
            }
        }
    ];
}

export function returnToBattleRetry(manager, battleId) {
    if (!manager) return;
    const battleDef = BATTLES[battleId] || {};
    const defeat = battleDef.defeat || {};
    const retry = defeat.retry || { scene: 'tactics', params: { battleId } };
    const retryScene = retry.scene || 'tactics';
    const retryParams = clonePlain(retry.params || { battleId });
    const script = Array.isArray(defeat.script) && defeat.script.length > 0
        ? clonePlain(defeat.script)
        : getDefaultDefeatScript(battleId);

    const runRetry = () => {
        if (retryScene === 'tactics' && retryParams?.battleId) {
            manager.gameState.setCurrentBattleId(retryParams.battleId);
        }
        manager.switchTo(retryScene, retryParams || {});
    };

    if (!script || script.length === 0) {
        runRetry();
        return;
    }

    manager.switchTo('narrative', {
        musicKey: defeat.musicKey || 'grim_refugees',
        musicVolume: defeat.musicVolume || 0.45,
        script,
        onComplete: runRetry
    });
}

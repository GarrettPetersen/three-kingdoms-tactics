import { UPGRADE_PATHS } from '../core/Constants.js';
import { UNIT_TEMPLATES } from './Battles.js';

const DEFAULT_TEMPLATE_IDS = {
    allied_soldier: 'ally',
    enemy_soldier: 'rebel',
    enemy_soldier_weak: 'rebel',
    imperial_soldier: 'soldier',
    yellow_turban: 'rebel'
};

const TEMPLATE_TYPE_ALIASES = {
    hero_force: 'hero',
    yellow_turban: 'enemy_soldier'
};

export function getLevelFromXP(xp) {
    if (xp < 10) return 1;
    // Formula: TotalXP(L) = 2.5*L^2 + 2.5*L - 5
    return Math.floor((-1 + Math.sqrt(9 + 1.6 * xp)) / 2);
}

export function getMaxHpForLevel(level, baseHp = 4) {
    const bonus = Math.floor(6 * (level - 1) / (level + 5));
    return Math.min(10, baseHp + bonus);
}

export function applyLevelAttackUpgrades(baseAttacks, unitClass, level, isArcher = false, isCrossbowman = false) {
    let attacks = Array.isArray(baseAttacks) ? [...baseAttacks] : [];
    if (isArcher) {
        attacks = ['arrow_shot'];
    } else if (isCrossbowman) {
        attacks = ['crossbow_bolt'];
    }

    const path = UPGRADE_PATHS[unitClass];
    if (!path) return attacks;

    Object.keys(path).forEach(lvl => {
        if (level >= parseInt(lvl, 10)) {
            const upgrade = path[lvl];
            if (upgrade.attack) {
                attacks[0] = upgrade.attack;
            }
            if (upgrade.secondaryAttack) {
                if (attacks.length < 2) attacks.push(upgrade.secondaryAttack);
                else attacks[1] = upgrade.secondaryAttack;
            }
        }
    });
    return attacks;
}

export function resolveUnitTemplate(type, unitIdOrTemplateId) {
    const templateType = TEMPLATE_TYPE_ALIASES[type] || type;
    const typeTemplates = UNIT_TEMPLATES[templateType];
    if (!typeTemplates) return null;
    const raw = (unitIdOrTemplateId || '').toString();
    const baseId = raw.replace(/\d+$/, '');
    const defaultId = DEFAULT_TEMPLATE_IDS[type];
    return typeTemplates[raw] || typeTemplates[raw.split('_')[0]] || typeTemplates[baseId] || typeTemplates[defaultId] || null;
}

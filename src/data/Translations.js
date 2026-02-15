import { getLocalizedText } from '../core/Language.js';

/**
 * UI and common text translations
 */
export const UI_TEXT = {
    'CLICK TO START': {
        en: 'CLICK TO START',
        zh: '点击开始'
    },
    'CONTINUE': {
        en: 'CONTINUE',
        zh: '继续'
    },
    'NEW GAME': {
        en: 'NEW GAME',
        zh: '新游戏'
    },
    'CUSTOM BATTLE': {
        en: 'CUSTOM BATTLE',
        zh: '自定义战斗'
    },
    'YES': {
        en: 'YES',
        zh: '是'
    },
    'NO': {
        en: 'NO',
        zh: '否'
    },
    'NEXT': {
        en: 'NEXT',
        zh: '下一步'
    },
    'RETURN': {
        en: 'RETURN',
        zh: '返回'
    },
    'CLICK TO CONTINUE': {
        en: 'CLICK TO CONTINUE',
        zh: '点击继续'
    },
    'START A NEW GAME?': {
        en: 'START A NEW GAME?',
        zh: '开始新游戏？'
    },
    'EXISTING PROGRESS WILL BE LOST': {
        en: 'EXISTING PROGRESS WILL BE LOST',
        zh: '现有进度将丢失'
    },
    'STORY SELECTION': {
        en: 'STORY SELECTION',
        zh: '故事选择'
    },
    'Chapter 1': {
        en: 'Chapter 1',
        zh: '第一章'
    },
    'Chapter 2': {
        en: 'Chapter 2',
        zh: '第二章'
    },
    'Chapter 3': {
        en: 'Chapter 3',
        zh: '第三章'
    },
    'Chapter 4': {
        en: 'Chapter 4',
        zh: '第四章'
    },
    'Chapter 5': {
        en: 'Chapter 5',
        zh: '第五章'
    },
    'THE OATH IN THE PEACH GARDEN': {
        en: 'THE OATH IN THE PEACH GARDEN',
        zh: '桃园结义'
    },
    'THE OATH - STORY COMPLETE': {
        en: 'THE OATH - STORY COMPLETE',
        zh: '桃园结义 - 故事完成'
    },
    'CAMPAIGN LOCKED': {
        en: 'CAMPAIGN LOCKED',
        zh: '战役已锁定'
    },
    'STORY COMPLETE': {
        en: 'STORY COMPLETE',
        zh: '故事完成'
    },
    'CLICK CHARACTER TO CONTINUE': {
        en: 'CLICK CHARACTER TO CONTINUE',
        zh: '点击角色继续'
    },
    'CLICK CHARACTER TO BEGIN': {
        en: 'CLICK CHARACTER TO BEGIN',
        zh: '点击角色开始'
    },
    'COMING SOON!': {
        en: 'COMING SOON!',
        zh: '即将推出！'
    },
    'This story is complete.': {
        en: 'This story is complete.',
        zh: '这个故事已完成。'
    },
    'campaign_liubei_description': {
        en: 'In the waning days of the Han, three heroes meet to swear an oath that will change history.',
        zh: '在汉朝衰微之际，三位英雄相遇，立下将改变历史的誓言。'
    },
    'campaign_liubei_complete_base': {
        en: 'You formed a brotherhood to fight the Yellow Turban rebels and rescued general Dong Zhuo from certain death.',
        zh: '你组建了一支兄弟会来对抗黄巾叛军，并从必死之境中救出了董卓将军。'
    },
    'campaign_liubei_complete_freed': {
        en: ' You chose the path of loyalty, freeing Lu Zhi and becoming an outlaw in the eyes of the corrupt court.',
        zh: '你选择了忠诚之路，释放了卢植，在腐败朝廷眼中成为了叛徒。'
    },
    'campaign_liubei_complete_law': {
        en: ' You followed the law, allowing Lu Zhi to be taken to the capital despite the injustice of the charges.',
        zh: '你遵循了法律，尽管指控不公，仍允许卢植被带到首都。'
    },
    'Zhuo County': {
        en: 'Zhuo County',
        zh: '涿郡'
    },
    'click to march': {
        en: 'click to march',
        zh: '点击进军'
    },
    'COMPLETED': {
        en: 'COMPLETED',
        zh: '已完成'
    },
    'Magistrate Zhou Jing': {
        en: 'Magistrate Zhou Jing',
        zh: '邹靖县令'
    },
    'Qingzhou Region': {
        en: 'Qingzhou Region',
        zh: '青州'
    },
    'Guangzong Region': {
        en: 'Guangzong Region',
        zh: '广宗'
    }
};

/**
 * Character name translations
 */
export const CHARACTER_NAMES = {
    'Liu Bei': { en: 'Liu Bei', zh: '刘备' },
    'Guan Yu': { en: 'Guan Yu', zh: '关羽' },
    'Zhang Fei': { en: 'Zhang Fei', zh: '张飞' },
    'Zhou Jing': { en: 'Zhou Jing', zh: '邹靖' },
    'Gong Jing': { en: 'Gong Jing', zh: '龚景' },
    'Protector Gong Jing': { en: 'Protector Gong Jing', zh: '龚景' },
    'Lu Zhi': { en: 'Lu Zhi', zh: '卢植' },
    'Dong Zhuo': { en: 'Dong Zhuo', zh: '董卓' },
    'Zhang Jue': { en: 'Zhang Jue', zh: '张角' },
    'Zhang Bao': { en: 'Zhang Bao', zh: '张宝' },
    'Zhang Liang': { en: 'Zhang Liang', zh: '张梁' },
    'Cheng Yuanzhi': { en: 'Cheng Yuanzhi', zh: '程远志' },
    'Deng Mao': { en: 'Deng Mao', zh: '邓茂' },
    'Narrator': { en: 'Narrator', zh: '旁白' },
    'The Noticeboard': { en: 'The Noticeboard', zh: '告示板' },
    'Villager': { en: 'Villager', zh: '村民' },
    'Volunteer': { en: 'Volunteer', zh: '志愿者' },
    'Messenger': { en: 'Messenger', zh: '信使' },
    'Soldier': { en: 'Soldier', zh: '士兵' },
    '???': { en: '???', zh: '???' }
};

/**
 * Get localized character name
 */
export function getLocalizedCharacterName(name) {
    if (!name) return '';
    const translation = CHARACTER_NAMES[name];
    if (translation) {
        return getLocalizedText(translation);
    }
    // Fallback: try to translate common patterns
    return name;
}


import { STEAM_STORE_URL } from '../core/Constants.js';

export function createDemoWishlistCard() {
    return {
        bg: 'black',
        type: 'title',
        text: { en: 'THREE KINGDOMS STRATAGEM', zh: '三国玄机' },
        titleImageKey: { en: 'title_en', zh: 'title_zh' },
        linkText: { en: 'Wishlist on Steam', zh: '在 Steam 上加入愿望单' },
        linkUrl: STEAM_STORE_URL,
        linkColor: '#7ec8ff',
        linkHoverColor: '#ffd700',
        continueText: { en: 'CLICK TO RETURN TO MAIN MENU', zh: '点击返回主菜单' },
        continuePromptDelayMs: 10000,
        blockAdvanceBeforeMs: 10000,
        entrySoundKey: 'gong',
        entrySoundVolume: 0.9
    };
}

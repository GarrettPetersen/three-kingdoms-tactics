import { STEAM_STORE_URL } from '../core/Constants.js';

export function createDemoWishlistCard(duration = 7000) {
    return {
        bg: 'black',
        type: 'title',
        text: { en: 'THREE KINGDOMS STRATAGEM', zh: '三国玄机' },
        titleImageKey: { en: 'title_en', zh: 'title_zh' },
        linkText: { en: 'Wishlist on Steam', zh: '在 Steam 上加入愿望单' },
        linkUrl: STEAM_STORE_URL,
        duration
    };
}

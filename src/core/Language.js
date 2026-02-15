/**
 * Language configuration for the game.
 * Controls which language is used for text and voice files.
 */
export const LANGUAGE = {
    current: 'en', // Current language code (ISO 639-1)
    supported: ['en', 'zh'], // List of supported language codes
    names: {
        'en': 'English',
        'zh': '中文'
    }
};

/**
 * Get the current language code
 */
export function getCurrentLanguage() {
    return LANGUAGE.current;
}

/**
 * Set the current language (if supported)
 */
export function setLanguage(langCode) {
    if (LANGUAGE.supported.includes(langCode)) {
        LANGUAGE.current = langCode;
        return true;
    }
    console.warn(`Language ${langCode} is not supported. Supported languages: ${LANGUAGE.supported.join(', ')}`);
    return false;
}

/**
 * Get localized text from a text object or string.
 * If text is a string, returns it (backward compatibility).
 * If text is an object, returns the value for the current language, or falls back to 'en'.
 */
export function getLocalizedText(text) {
    // Handle null/undefined
    if (text == null) {
        console.warn('getLocalizedText: text is null or undefined');
        return '';
    }
    
    if (typeof text === 'string') {
        // Backward compatibility: treat plain strings as English
        // Always return the string (fallback to English if no translation available)
        return text;
    }
    if (typeof text === 'object' && text !== null) {
        // Try current language first, then fall back to 'en'
        const result = text[LANGUAGE.current] || text['en'];
        if (result) {
            return result;
        }
        // If neither exists, log a warning and return empty string
        console.warn(`getLocalizedText: No translation found for language '${LANGUAGE.current}' or 'en' in:`, text);
        return '';
    }
    console.warn('getLocalizedText: Unexpected text type:', typeof text, text);
    return '';
}

/**
 * Get the appropriate font for the current language.
 * Chinese (zh) uses zpix at 12px, other languages use the default font.
 */
export function getFontForLanguage(defaultFont = '8px Silkscreen') {
    if (LANGUAGE.current === 'zh') {
        // For Chinese, always use 12px zpix (required for proper character display)
        // Extract size from default font to maintain relative sizing, but minimum 12px
        const sizeMatch = defaultFont.match(/(\d+)px/);
        let size = sizeMatch ? parseInt(sizeMatch[1]) : 8;
        // Scale up proportionally: 8px -> 12px, 10px -> 15px, etc.
        size = Math.max(12, Math.round(size * 1.5));
        return `${size}px zpix`;
    }
    return defaultFont;
}

/**
 * Get UI sizing multiplier for current language.
 * Chinese needs larger UI elements due to larger font size.
 */
export function getUIScale() {
    return LANGUAGE.current === 'zh' ? 1.5 : 1.0;
}

/**
 * Calculate the container size needed to fit text, accounting for Chinese characters.
 * Chinese characters in zpix font are 12px wide and 12px tall (monospace).
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to measure
 * @param {string} font - Font string (e.g., '8px Silkscreen')
 * @param {number} padding - Horizontal padding to add (default: 10)
 * @param {number} minHeight - Minimum height in pixels (default: 12)
 * @returns {{width: number, height: number}} Container dimensions
 */
export function getTextContainerSize(ctx, text, font = '8px Silkscreen', padding = 10, minHeight = 12) {
    if (!text) {
        return { width: padding * 2, height: minHeight };
    }
    
    ctx.save();
    ctx.font = getFontForLanguage(font);
    
    // Check if text contains Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const isChineseMode = LANGUAGE.current === 'zh';
    
    let width;
    if (hasChinese && isChineseMode) {
        // Chinese characters in zpix are 12px wide (monospace)
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        
        // Measure non-Chinese characters (if any)
        const nonChineseText = text.replace(/[\u4e00-\u9fff]/g, '');
        const nonChineseWidth = nonChineseText ? ctx.measureText(nonChineseText).width : 0;
        
        // Chinese chars are 12px each (monospace)
        width = chineseChars * 12 + nonChineseWidth;
    } else {
        // Regular measurement for non-Chinese text
        width = ctx.measureText(text).width;
    }
    
    // Calculate height: Chinese characters are 12px tall, otherwise use font size
    let height = minHeight;
    if (hasChinese && isChineseMode) {
        // Chinese text uses 12px zpix, so each line is 12px tall
        // For single-line text, height is 12px
        height = 12;
    } else {
        // For non-Chinese, use font size
        const sizeMatch = font.match(/(\d+)px/);
        const fontSize = sizeMatch ? parseInt(sizeMatch[1]) : 8;
        height = Math.max(minHeight, fontSize + 4); // Add some line spacing
    }
    
    ctx.restore();
    
    return {
        width: Math.ceil(width + padding * 2),
        height: Math.ceil(height)
    };
}


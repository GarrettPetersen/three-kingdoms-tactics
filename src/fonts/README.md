# Pixel font scaling guide

These fonts are pixel fonts. To keep them crisp, use **only** the sizes listed below. Other sizes will stretch or blur the pixels.

| Font | File | Intended sizes | Notes |
|------|------|----------------|-------|
| **Silkscreen** | `Silkscreen-Regular.ttf` | **8px**, **10px**, **12px**, **16px** | Latin UI headings and labels. Use 8px for small text, 10px for emphasis (e.g. “End Turn” when ready), 16px for titles. |
| **Tiny5** | `Tiny5-Regular.ttf` | **8px**, **10px** | Latin body and secondary text. Default for descriptions, tooltips, and small labels. Prefer 8px. |
| **Dogica** | `dogicapixel.ttf` | **8px** | Latin dialogue and narrative. Use 8px only so glyphs stay sharp. |
| **zpix** | `zpix.ttf` | **12px**, **24px** | Chinese (CJK) pixel font. Monospace: each character is 12×12 at 12px. Use 12px for normal UI; use 24px when the English equivalent would be 16px or larger. Do **not** use other sizes. |

## Usage in code

- **English / default:** Use Silkscreen or Tiny5 at the sizes above (e.g. `'8px Silkscreen'`, `'8px Tiny5'`).
- **Chinese:** Use `getFontForLanguage(font)` so the game substitutes **zpix** at 12px or 24px. Do not pass arbitrary sizes to zpix.
- **Dogica:** Use only `'8px Dogica'` for dialogue/narrative panels and order numbers.

## Why it matters

Pixel fonts are drawn at a fixed resolution. Scaling them (e.g. 9px or 11px) forces the browser to interpolate, which blurs the pixels. Stick to the intended sizes so each pixel maps 1:1 to the screen where possible.

# Pixel font scaling guide

These fonts are pixel fonts: they are drawn at a fixed resolution (their **design size**). They only stay crisp when used at that size or at **integer multiples** of it (2×, 3×, …). Any other size (e.g. 10px when the base is 8) forces sub-pixel scaling and blurs the pixels.

| Font | File | Design size | Allowed sizes | Notes |
|------|------|-------------|---------------|-------|
| **Silkscreen** | `Silkscreen-Regular.ttf` | 8px | **8px**, **16px**, **24px**, … | Jason Kottke. Hand-drawn for tiny web graphics; characters 4×5 / 5×5 px. Use at 8pt multiples only. |
| **Tiny5** | `Tiny5-Regular.ttf` | 5px | **5px**, **10px**, **15px**, **20px**, … | Stefan Schmidt. Variable-width 5-pixel font. Use 5px or 10px for body, tooltips, labels. |
| **Dogica** | `dogicapixel.ttf` | 8px | **8px**, **16px**, **24px**, … | Roberto Mocci. Monospace 8×8 grid. Use for dialogue, narrative, order numbers. |
| **zpix** | `zpix.ttf` | 12px | **12px**, **24px**, **36px**, **48px**, … | SolidZORO (最像素). Optimized for 12px; pixel-perfect at 12-based sizes. Chinese/Japanese/English. |

## Usage in code

- Use only the **design size** or an **integer multiple** (e.g. 8px or 16px for 8px-base fonts; 12px or 24px for zpix).
- **Chinese:** Use `getFontForLanguage(font)` so the game substitutes zpix at 12px or 24px.
- Avoid sizes that aren’t multiples of the design size (e.g. 10px for Silkscreen/Dogica, or 8px for Tiny5)—they will look soft.

## Why multiples only

Pixel fonts are effectively bitmaps at one resolution. Scaling by 2× or 3× doubles or triples each pixel, so the result stays sharp. Scaling to 1.25× (e.g. 10px from 8px) has no clean 1:1 mapping, so the renderer interpolates and blurs.

## Reference

- **Silkscreen**: [Kottke](https://kottke.org/plus/type/silkscreen/) — “8pt multiples (8pt, 16pt, 24pt, etc.) with anti-aliasing turned off”.
- **Tiny5**: [GitHub font_tiny5](https://github.com/Gissio/font_tiny5) — “variable-width, 5-pixel font”.
- **Dogica**: [Roberto Mocci / Tiny Archive](https://rmocci.itch.io/dogica) — “8×8 grid format”.
- **zpix**: [GitHub zpix-pixel-font](https://github.com/SolidZORO/zpix-pixel-font) — “pixel perfect when used at 12px, 24px, 36px, 48px”.

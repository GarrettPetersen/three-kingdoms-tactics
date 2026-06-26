# Portrait Style Guide

This is the visual target for dialogue portraits in **Three Kingdoms: Stratagem**. Use it when generating, reviewing, redrawing, or replacing portraits.

The goal is **cartoony historical pixel-art busts with strong silhouettes, thick outlines, prominent eyes, flat readable colors, and high saturation**. The portraits should feel at home beside the game's saturated pixel-art backgrounds and sprites, not like small crops from painterly character art.

---

## Format

- Runtime large portraits are exactly `80x96`.
- The source crop is `5:6`, matching the runtime portrait shape.
- Portraits are vertical busts, not landscape crops.
- Show head, hair or hat, shoulders, and enough upper torso to read as a character bust.
- The face should sit in the upper-middle third.
- Avoid edge contact unless the character's old accepted portrait intentionally did that.
- Downscale once from the high-resolution source with nearest-neighbor scaling.
- Do not repair composition after downscaling. Fix crop, padding, and framing at source resolution first.

## Current Style Anchors

These portraits define the target family:

- **Liu Bei:** clean cartoony face planes, readable robe and hair silhouette.
- **Zhang Fei:** bold expression, fierce brow, simple high-contrast feature groups.
- **Cao Cao:** stylized but controlled, clear face angle, limited texture noise.
- **Dong Zhuo:** exaggerated heavy features without muddy rendering.
- **He Jin:** strong hat silhouette, simple shadows, readable at small size.

Sun Jian, Yuan Shao, Zhu Jun, and the Zhang brothers are useful for mood and palette, but new revisions should pull them toward the simpler cartoony read above.

## Shape Language

- Use big, simple masses: head, hat, hair, beard, collar, shoulder plates, robe.
- Prefer clean silhouettes over small decorative detail.
- Use a single dominant face angle: front or 3/4.
- Avoid twisted head/eye directions that become confusing at `80x96`.
- Costume cues matter more than texture: Guan Yu's green and long beard, Yuan Shao's gold helmet, Zhang Fei's red headband, Cao Cao's composed purple/black palette, etc.

## Linework

- Use thick dark outlines around the head, hair, beard, hat, shoulders, and major clothing shapes.
- Internal lines should be chunky and purposeful.
- Avoid thin hair strands, tiny fabric patterns, and subtle wrinkles. They alias into noise.
- Black or near-black outline groups are preferred over soft painterly edges.
- No white or light halo around the figure.

## Faces

- Eyes are a priority. They should be large enough to read at runtime size, with strong dark pupils and clear contrast.
- Brows should be bold and expressive.
- Nose and mouth should be simple, graphic shapes, not tiny realistic rendering.
- Facial hair should read as a distinct mass with a few strong highlights, not many hair strands.
- Skin should use a controlled set of warm tones. Avoid both washed-out realism and hot pink/orange skin.
- Character should have a clear expression, but avoid over-acting unless the character calls for it.

## Color And Saturation

- Portraits should be high saturation compared with conservative image-model output.
- As a practical baseline, finished portraits have been pushed about `+30%` saturation so they stand up against the setting backgrounds.
- Keep skin tones controlled even when clothing and backgrounds are vibrant.
- Use a limited number of highlight/shadow steps per material.
- Prefer saturated but period-appropriate color groups: deep greens, reds, purples, golds, browns, dark blues.
- Avoid candy-neon color, muddy browns, low-contrast grey shading, and photo-like gradients.

## Shading

- Favor flat, readable planes over painterly blending.
- Use two or three meaningful shade levels on skin and clothing.
- Large highlight blocks are better than many tiny texture strokes.
- Shadows should clarify the face and silhouette, not make the portrait grimy.
- If a generated portrait has good identity but too much texture, use a low-strength style pass instead of raising detail.

## Backgrounds

- A simple colored background is part of the target style.
- Use broad fields or soft two-step gradients.
- Good background families: muted purple, blue, dark green, smoky red, warm brown.
- The background should separate the silhouette without competing with the face.
- Avoid scenery, detailed patterns, hard halos, high-contrast shapes, and anything that looks like a location image.

## Generation Prompt Baseline

Use this as the base for new high-resolution source images:

```text
high-quality pixel art bust portrait, Three Kingdoms era Chinese character,
cartoony historical strategy RPG style, thick dark outlines, prominent readable eyes,
bold brows, simplified flat colour planes, clean nose and mouth shapes,
high-saturation vibrant SNES palette with controlled skin tones,
simple coloured background, head and upper torso visible, portrait-oriented 5:6 crop,
not an extreme close-up, no text, no watermark, no white outline
```

Then add the character identity in concrete terms:

```text
Guan Yu, stern middle-aged warrior-general, long black beard and moustache,
deep green robe and green headwrap, dignified 3/4 view, subtle gold accent
```

## Negative Prompt Baseline

```text
photorealistic, modern clothing, modern hairstyle, low saturation, washed out,
muddy colours, blurry, soft focus, airbrushed, thin outlines, tiny eyes,
malformed eyes, malformed mouth, extreme close-up, cropped head, cropped shoulders,
white outline, light halo, busy background, text, watermark
```

## Review Checklist

Before replacing a live portrait, check:

- File is exactly `80x96`.
- Character fills the frame as a bust without awkward edge cuts.
- Eyes, brows, nose, mouth, and major costume cues read at actual size.
- Silhouette is clear at actual size and at 3x/4x nearest-neighbor preview.
- Palette is saturated enough to stand against setting backgrounds.
- Skin tones still look intentional after saturation.
- Background helps the portrait, but does not compete with it.
- No white outline, light fringe, text, watermark, or busy scenery.
- Identity has not drifted from the sprite/source.
- The source image is archived in `public/assets/portraits/large_sources/` if the live portrait changes.

## Rejection Rules

Reject or regenerate if:

- It looks like a realistic painting downscaled to pixel art.
- The portrait is an extreme close-up rather than a bust.
- The eyes are small, muddy, misaligned, or hard to read.
- Thick outlines are missing.
- The crop cuts off important identity cues.
- The model invents a wrong hat, headwrap, helmet, beard, or costume color.
- The figure has a white/light edge artifact.
- The image is less saturated than the backgrounds after final processing.
- It only looks good enlarged and fails at `80x96`.

## Asset Locations

| Purpose | Path |
| --- | --- |
| Live large portraits | `public/assets/portraits/large/<Name>.png` |
| Large source archive | `public/assets/portraits/large_sources/<Name>-source.png` |
| Small fallback archive | `public/assets/portraits/small/<Name>.png` |
| Generated review variants | `public/assets/portraits/generated/` |
| Built-in image review outputs | `public/assets/portraits/generated/builtin_cartoon_review/` |
| Prompt files | `public/assets/portraits/img2img_refs/prompts/` |

## Replacement Policy

- Generate candidates into a review folder first.
- Compare contact sheets before replacing live art.
- Replace only approved portraits.
- Keep the matching large source whenever a live portrait is replaced.
- Do not upscale old small portraits as final art.
- Do not bulk-replace the cast solely because a batch completed. Review still matters.

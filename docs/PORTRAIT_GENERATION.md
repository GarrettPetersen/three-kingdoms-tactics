# Portrait Generation

This doc explains how to create or update character portraits used in dialogue. The pipeline has two stages: **building the reference image** from modular parts, then **running img2img** to produce the final portrait.

---

## Prerequisites

- **Project Python venv:** Use `./tools/venv_xtts/bin/python3` for all portrait-related scripts. The Makefile and existing tooling assume this venv (it has Pillow, torch, diffusers, and the SD model path config).
- **Stable Diffusion model:** `generate_portraits.py` loads a model via `tools/model_paths.py` (e.g. RetroDiffusion). Ensure the model path is set up for your environment.

---

## Stage 1: Build the character creator reference

References are composite images built from parts (heads, hair, hats, shirts, etc.) and define pose, silhouette, and colors for img2img.

### 1.1 Edit the character spec

- **File:** `tools/build_character_creator_refs.py`
- Find the character entry in the `_char_specs()` dict (e.g. `"yellowturban"`, `"zhangjiao"`).
- **Layers:** List of `(filename, {})` tuples, in draw order (back to front). Parts live in `assets/portraits/character_creator/` (or `public/assets/portraits/female_character_creator/` for female parts).
  - Common parts: `head_normal.png`, `shirt_robe.png`, `hair_long.png`, `eyebrows_thin.png`, `hat_headscarf.png`, `hat_headcloth.png`, `hat_conical.png`, `moustache_thick.png`, etc.
- **manual_palette:** Colors for skin, shirt, and headwear so the ref matches the desired look.
  - For **headscarf:** use `"headscarf_colors": [[R,G,B,A], [R,G,B,A]]` (dark, light). Remove `headcloth_tones` if switching from headcloth to headscarf.
  - For **headcloth:** use `"headcloth_tones": { "dark": [...], "mid": [...], "light": [...] }`.
- **source_sprite:** Optional path to a game sprite used for palette extraction (e.g. `assets/characters/097_yellowturban.png`).
- **bg_gradient:** Optional `top` / `bottom` RGB for the ref background.

### 1.2 Run the build script

From the **project root**:

```bash
./tools/venv_xtts/bin/python3 tools/build_character_creator_refs.py
```

This regenerates **all** character refs. Outputs go to:

- `assets/portraits/img2img_refs/creator_refs/<char_id>_creator_ref.png` (320×384)
- `assets/portraits/img2img_refs/creator_refs/<char_id>_creator_ref_40x48.png` (small)
- `assets/portraits/img2img_refs/creator_refs/<char_id>_creator_color_profile.json` (palette + config for tooling)

Use the **full-size ref** (`_creator_ref.png`) as the img2img input in Stage 2.

---

## Stage 2: Generate the final portrait (img2img)

The final portrait is produced by img2img from the creator ref, using a text prompt and optional negative prompt.

### 2.1 Prompt files

- **Directory:** `public/assets/portraits/img2img_refs/prompts/`
- **Positive prompt:** `<name>.prompt.txt` — one line, pixel-art portrait style, era, character description, and “preserve source sprite silhouette and palette relationships” (or similar). Keep under ~77 tokens if possible (CLIP limit).
- **Negative prompt:** `<name>.negative_prompt.txt` — one line (e.g. photorealistic, modern, blurry, malformed). You can copy from `dengmao.negative_prompt.txt` or `creator_img2img_simple.negative_prompt.txt`.

### 2.2 Run img2img with custom ref

For a character that uses a **creator ref** (not a raw photo in `source_raw`), run from the **project root**:

```bash
./tools/venv_xtts/bin/python3 tools/generate_portraits.py \
  --input-ref assets/portraits/img2img_refs/creator_refs/<char_id>_creator_ref.png \
  --output public/assets/portraits/generated/<Output-Name>.png \
  --prompt-file public/assets/portraits/img2img_refs/prompts/<name>.prompt.txt \
  --negative-prompt-file public/assets/portraits/img2img_refs/prompts/<name>.negative_prompt.txt
```

- **`<char_id>`:** Key from `build_character_creator_refs.py` (e.g. `yellowturban`, `zhangjiao`).
- **`<Output-Name>`:** Exact portrait name the game expects (e.g. `Yellow-Turban`, `Liu-Bei`). Must match the names in `src/main.js` (e.g. `'Yellow-Turban'` in the portrait list) and the key used in dialogue (e.g. `portraitKey: 'yellow-turban'` → asset `Yellow-Turban.png`).
- **`<name>`:** Base name for the prompt files (e.g. `yellowturban`, `dengmao`).

Output path: use **`public/assets/portraits/generated/`** so the built app finds the portrait at `assets/portraits/generated/<Output-Name>.png`.

### 2.3 Alternative: portraits from source_raw

If the character has a source image in `assets/portraits/source_raw/` (e.g. `Liu-Bei.png`), you can use the Makefile:

```bash
make portrait NAME=liu-bei
# or
make portraits   # regenerate all from source_raw
```

`make portrait NAME=...` passes the name as a substring to filter files in `source_raw`; it does **not** use `--input-ref`. For creator-ref–based characters, use the full `generate_portraits.py` command above.

---

## Worked example: Yellow Turban

1. **Spec (in `build_character_creator_refs.py`):** `"yellowturban"` with layers including `("hat_headscarf.png", {})` and `manual_palette` with `headscarf_colors` (no `headcloth_tones`).
2. **Build refs:**  
   `./tools/venv_xtts/bin/python3 tools/build_character_creator_refs.py`
3. **Prompts:**  
   `public/assets/portraits/img2img_refs/prompts/yellowturban.prompt.txt` and `yellowturban.negative_prompt.txt`.
4. **Generate portrait:**  
   `./tools/venv_xtts/bin/python3 tools/generate_portraits.py --input-ref assets/portraits/img2img_refs/creator_refs/yellowturban_creator_ref.png --output public/assets/portraits/generated/Yellow-Turban.png --prompt-file public/assets/portraits/img2img_refs/prompts/yellowturban.prompt.txt --negative-prompt-file public/assets/portraits/img2img_refs/prompts/yellowturban.negative_prompt.txt`
5. **Game:** Portrait is loaded as `portrait_Yellow-Turban` from `assets/portraits/generated/Yellow-Turban.png`; dialogue uses `portraitKey: 'yellow-turban'` which maps to that asset.

---

## Path summary

| Purpose | Path |
|--------|------|
| Character parts (heads, hats, etc.) | `assets/portraits/character_creator/` |
| Creator refs (built) | `assets/portraits/img2img_refs/creator_refs/` |
| Prompt / negative prompt files | `public/assets/portraits/img2img_refs/prompts/` |
| **Final portraits (game loads these)** | `public/assets/portraits/generated/` |
| Source raw (for make portrait NAME=...) | `assets/portraits/source_raw/` |

Always use **`./tools/venv_xtts/bin/python3`** (the project venv), not a different venv, so dependencies and model paths match.

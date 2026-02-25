#!/usr/bin/env python3
"""
Build portrait img2img references from character sprites plus per-character prompts.

Usage:
  tools/venv/bin/python tools/build_portrait_references.py
  tools/venv/bin/python tools/build_portrait_references.py liubei
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROFILE_PATH = PROJECT_ROOT / "tools" / "portrait_prompt_profiles.json"


def _join_parts(parts):
    cleaned = []
    for part in parts:
        text = str(part).strip().strip(",")
        if text:
            cleaned.append(text)
    return ", ".join(cleaned)


def _frame_box(frame_index, frame_width, frame_height, columns):
    col = frame_index % columns
    row = frame_index // columns
    x0 = col * frame_width
    y0 = row * frame_height
    return (x0, y0, x0 + frame_width, y0 + frame_height)


def _make_vertical_gradient(width, height, top_rgb, bottom_rgb):
    base = Image.new("RGBA", (width, height))
    px = base.load()
    for y in range(height):
        t = 0 if height <= 1 else (y / (height - 1))
        r = int(round(top_rgb[0] * (1 - t) + bottom_rgb[0] * t))
        g = int(round(top_rgb[1] * (1 - t) + bottom_rgb[1] * t))
        b = int(round(top_rgb[2] * (1 - t) + bottom_rgb[2] * t))
        for x in range(width):
            px[x, y] = (r, g, b, 255)
    return base


def _build_prompt(global_cfg, char_cfg):
    prompt_cfg = char_cfg["prompt_en"]
    prompt_parts = [
        global_cfg["base_prompt_en"],
        prompt_cfg["identity"],
        _join_parts(prompt_cfg.get("character_focus", [])),
        _join_parts(prompt_cfg.get("wardrobe_and_era", [])),
        _join_parts(prompt_cfg.get("style_controls", [])),
    ]
    prompt = _join_parts(prompt_parts)

    negative_parts = [
        global_cfg["base_negative_prompt_en"],
        _join_parts(prompt_cfg.get("negative_additions", [])),
    ]
    negative_prompt = _join_parts(negative_parts)
    return prompt, negative_prompt


def _build_reference(global_cfg, char_id, char_cfg):
    source_path = PROJECT_ROOT / char_cfg["source_sprite"]
    if not source_path.exists():
        raise FileNotFoundError(f"Sprite not found: {source_path}")

    target_w, target_h = global_cfg["target_size"]
    output_dir = PROJECT_ROOT / global_cfg["reference_output_dir"]
    prompt_dir = PROJECT_ROOT / global_cfg["prompt_output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)
    prompt_dir.mkdir(parents=True, exist_ok=True)

    sheet_cfg = char_cfg["sheet"]
    crop_cfg = char_cfg["face_crop"]
    zoom_multiplier = int(char_cfg.get("zoom_multiplier", 1))

    sprite_sheet = Image.open(source_path).convert("RGBA")
    frame = sprite_sheet.crop(
        _frame_box(
            frame_index=int(sheet_cfg["frame_index"]),
            frame_width=int(sheet_cfg["frame_width"]),
            frame_height=int(sheet_cfg["frame_height"]),
            columns=int(sheet_cfg["columns"]),
        )
    )

    # Optional deterministic cleanup for known sprite artifacts (e.g., eye dots that
    # over-expand when used as img2img references). Each mapping clones a nearby pixel.
    eye_cleanup = char_cfg.get("eye_cleanup_pixels", [])
    if eye_cleanup:
        frame_px = frame.load()
        fw, fh = frame.size
        for item in eye_cleanup:
            x = int(item["x"])
            y = int(item["y"])
            sample_dx = int(item.get("sample_dx", 0))
            sample_dy = int(item.get("sample_dy", 1))
            sx = min(max(0, x + sample_dx), fw - 1)
            sy = min(max(0, y + sample_dy), fh - 1)
            frame_px[x, y] = frame_px[sx, sy]

    face_crop = frame.crop(
        (
            int(crop_cfg["x"]),
            int(crop_cfg["y"]),
            int(crop_cfg["x"]) + int(crop_cfg["w"]),
            int(crop_cfg["y"]) + int(crop_cfg["h"]),
        )
    )

    if zoom_multiplier > 1:
        face_crop = face_crop.resize(
            (face_crop.width * zoom_multiplier, face_crop.height * zoom_multiplier),
            Image.Resampling.NEAREST,
        )

    # Optional per-character pre-scaling before final cover/crop. This is useful to
    # de-chibi references by compressing width while keeping height.
    pre_scale_x = float(char_cfg.get("pre_scale_x", 1.0))
    pre_scale_y = float(char_cfg.get("pre_scale_y", 1.0))
    if pre_scale_x != 1.0 or pre_scale_y != 1.0:
        face_crop = face_crop.resize(
            (
                max(1, int(round(face_crop.width * pre_scale_x))),
                max(1, int(round(face_crop.height * pre_scale_y))),
            ),
            Image.Resampling.NEAREST,
        )

    # Cover resize then center-crop to exact img2img dimensions.
    cover_scale = max(target_w / face_crop.width, target_h / face_crop.height)
    cover_size = (
        max(1, int(round(face_crop.width * cover_scale))),
        max(1, int(round(face_crop.height * cover_scale))),
    )
    cover = face_crop.resize(cover_size, Image.Resampling.NEAREST)
    left = max(0, (cover.width - target_w) // 2)
    top = max(0, (cover.height - target_h) // 2)
    reference = cover.crop((left, top, left + target_w, top + target_h))

    # Flatten transparency onto a configurable background so img2img does not
    # interpret transparent pixels as black.
    bg_cfg = global_cfg.get("reference_background", {})
    bg_style = bg_cfg.get("style", "")
    if bg_style == "soft_blue_gray_gradient":
        top_rgb = bg_cfg.get("top_rgb", [130, 146, 168])
        bottom_rgb = bg_cfg.get("bottom_rgb", [74, 88, 108])
        gradient = _make_vertical_gradient(target_w, target_h, top_rgb, bottom_rgb)
        gradient.alpha_composite(reference.convert("RGBA"))
        reference = gradient
    else:
        # If no background style selected, keep prior behavior.
        reference = reference.convert("RGBA")

    # Optional eye-guide paint pass on the enlarged reference image.
    # This gives img2img explicit pupil/sclera hints independent of prompt wording.
    eye_guide = char_cfg.get("eye_guide", {})
    if eye_guide and eye_guide.get("enabled", False):
        draw = ImageDraw.Draw(reference, "RGBA")

        crop_x = int(crop_cfg["x"])
        crop_y = int(crop_cfg["y"])
        zoom = float(zoom_multiplier)
        pre_x = float(char_cfg.get("pre_scale_x", 1.0))
        pre_y = float(char_cfg.get("pre_scale_y", 1.0))

        def to_ref_xy(src_x, src_y):
            lx = (float(src_x) - crop_x) * zoom * pre_x * cover_scale
            ly = (float(src_y) - crop_y) * zoom * pre_y * cover_scale
            return (lx - left, ly - top)

        pupil_color = tuple(eye_guide.get("pupil_color", [12, 12, 12, 255]))
        sclera_color = tuple(eye_guide.get("sclera_color", [238, 246, 255, 255]))
        pupil_radius = int(eye_guide.get("pupil_radius_px", 6))
        sclera_radius_x = int(eye_guide.get("sclera_radius_x_px", 7))
        sclera_radius_y = int(eye_guide.get("sclera_radius_y_px", 5))
        sclera_offset_x = int(eye_guide.get("sclera_offset_x_px", 10))
        pupil_nudge_x = int(eye_guide.get("pupil_nudge_x_px", 0))
        pupil_nudge_y = int(eye_guide.get("pupil_nudge_y_px", 0))
        upper_lid_offset_y = int(eye_guide.get("upper_lid_offset_y_px", 8))
        upper_lid_radius_x = int(eye_guide.get("upper_lid_radius_x_px", 6))
        upper_lid_radius_y = int(eye_guide.get("upper_lid_radius_y_px", 3))

        for pt in eye_guide.get("pupil_source_points", []):
            cx, cy = to_ref_xy(int(pt["x"]), int(pt["y"]))
            cx += pupil_nudge_x
            cy += pupil_nudge_y

            # White sclera hints to the left and right of pupil.
            for ox in (-sclera_offset_x, sclera_offset_x):
                sx = int(round(cx + ox))
                sy = int(round(cy))
                draw.ellipse(
                    (
                        sx - sclera_radius_x,
                        sy - sclera_radius_y,
                        sx + sclera_radius_x,
                        sy + sclera_radius_y,
                    ),
                    fill=sclera_color,
                )

            # Pupil anchor.
            px = int(round(cx))
            py = int(round(cy))
            draw.ellipse(
                (px - pupil_radius, py - pupil_radius, px + pupil_radius, py + pupil_radius),
                fill=pupil_color,
            )

            # Dark upper-lid/brow anchor above the pupil.
            ux = px
            uy = py - upper_lid_offset_y
            draw.ellipse(
                (
                    ux - upper_lid_radius_x,
                    uy - upper_lid_radius_y,
                    ux + upper_lid_radius_x,
                    uy + upper_lid_radius_y,
                ),
                fill=pupil_color,
            )

    ref_path = output_dir / f"{char_id}_face_ref.png"
    reference.save(ref_path)

    prompt, negative_prompt = _build_prompt(global_cfg, char_cfg)
    (prompt_dir / f"{char_id}.prompt.txt").write_text(prompt + "\n", encoding="utf-8")
    (prompt_dir / f"{char_id}.negative_prompt.txt").write_text(
        negative_prompt + "\n", encoding="utf-8"
    )

    manifest = {
        "character_id": char_id,
        "display_name": char_cfg.get("display_name", char_id),
        "reference_image": str(ref_path.relative_to(PROJECT_ROOT)),
        "source_sprite": char_cfg["source_sprite"],
        "target_size": [target_w, target_h],
        "sheet": sheet_cfg,
        "face_crop": crop_cfg,
        "zoom_multiplier": zoom_multiplier,
        "prompt_file": str((prompt_dir / f"{char_id}.prompt.txt").relative_to(PROJECT_ROOT)),
        "negative_prompt_file": str(
            (prompt_dir / f"{char_id}.negative_prompt.txt").relative_to(PROJECT_ROOT)
        ),
        "novel_reference": char_cfg.get("novel_reference", {}),
    }
    (prompt_dir / f"{char_id}.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def main():
    if not PROFILE_PATH.exists():
        raise FileNotFoundError(f"Missing profile file: {PROFILE_PATH}")

    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    global_cfg = profile["global"]
    characters = profile["characters"]

    target_char = sys.argv[1].strip().lower() if len(sys.argv) > 1 else None
    char_ids = [target_char] if target_char else sorted(characters.keys())

    for char_id in char_ids:
        if char_id not in characters:
            raise KeyError(f"Character '{char_id}' not found in {PROFILE_PATH.name}")
        manifest = _build_reference(global_cfg, char_id, characters[char_id])
        print(
            f"[ok] {manifest['character_id']}: "
            f"{manifest['reference_image']} "
            f"({manifest['target_size'][0]}x{manifest['target_size'][1]})"
        )


if __name__ == "__main__":
    main()

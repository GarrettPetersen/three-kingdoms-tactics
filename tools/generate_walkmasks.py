#!/usr/bin/env python3
"""Create and clean three-color walkability masks for narrative settings.

The intended workflow is:
1. Use the generated prompt with an img2img model to make a draft mask.
2. Save the draft in an AI draft directory, named after the source setting.
3. Run this tool to snap the draft to the exact mask palette.
4. Touch up the output in Aseprite when needed.

When no AI draft is provided, the tool can create a conservative local first pass
for common scene shapes. These masks are deliberately simple and editable.
"""

from __future__ import annotations

import argparse
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SETTINGS_DIR = PROJECT_ROOT / "public" / "assets" / "settings"
DEFAULT_OUTPUT_DIR = SETTINGS_DIR / "walkmasks"
DEFAULT_PROMPT_DIR = PROJECT_ROOT / "tools" / "walkmask_prompts"

UNWALKABLE = (0, 0, 0, 255)
WALK_FRONT = (0, 255, 0, 255)
WALK_BEHIND = (0, 0, 255, 255)
PALETTE = (UNWALKABLE, WALK_FRONT, WALK_BEHIND)

VILLAGE_INN_PRESET = {
    "front": [
        [(0, 169), (56, 148), (119, 128), (255, 119), (255, 255), (0, 255)],
    ],
}

PRESETS = {
    "village_inn": VILLAGE_INN_PRESET,
    "village_inn_evening": VILLAGE_INN_PRESET,
    "urban_street": {
        "front": [
            [(70, 62), (186, 62), (232, 255), (24, 255)],
        ],
        "behind": [
            [(0, 58), (52, 58), (63, 255), (0, 255)],
            [(204, 58), (255, 58), (255, 255), (193, 255)],
        ],
    },
    "luoyang_imperial_palace_gate": {
        "front": [
            [(0, 134), (255, 130), (255, 255), (0, 255)],
        ],
        "behind": [
            [(83, 82), (183, 82), (178, 164), (89, 164)],
            [(117, 62), (153, 62), (153, 134), (117, 134)],
        ],
    },
    "luoyang_imperial_palace_gateway": {
        "front": [
            [(77, 72), (179, 72), (231, 255), (25, 255)],
        ],
        "behind": [
            [(104, 75), (152, 75), (161, 122), (95, 122)],
        ],
    },
}


def setting_path(name_or_path: str) -> Path:
    path = Path(name_or_path)
    if path.suffix:
        return path if path.is_absolute() else PROJECT_ROOT / path
    return SETTINGS_DIR / f"{name_or_path}.png"


def setting_name(path: Path) -> str:
    return path.stem


def has_foreground(name: str) -> bool:
    return (SETTINGS_DIR / f"{name}_foreground.png").exists()


def output_path_for(source: Path, output_dir: Path) -> Path:
    return output_dir / f"{source.stem}_walkmask.png"


def prompt_path_for(source: Path, prompt_dir: Path) -> Path:
    return prompt_dir / f"{source.stem}_walkmask_prompt.txt"


def candidate_ai_drafts(source: Path, ai_draft_dir: Path) -> list[Path]:
    stem = source.stem
    names = [
        f"{stem}.png",
        f"{stem}_walkmask.png",
        f"{stem}_walkmask_ai.png",
        f"{stem}.jpg",
        f"{stem}_walkmask.jpg",
        f"{stem}_walkmask_ai.jpg",
        f"{stem}.webp",
        f"{stem}_walkmask.webp",
        f"{stem}_walkmask_ai.webp",
    ]
    return [ai_draft_dir / name for name in names]


def build_prompt(source: Path) -> str:
    name = source.stem
    foreground_line = (
        f"The scene has a separate foreground overlay named {name}_foreground.png. "
        "Use blue only for floor/path pixels where a character should be drawn behind that foreground overlay."
        if has_foreground(name)
        else "This scene has no foreground overlay; use blue only for true doorway/occlusion regions if clearly needed."
    )

    return textwrap.dedent(
        f"""
        Img2img task: create a walkability mask for the provided 256x256 pixel-art location image.

        Output requirements:
        - Return a mask image at exactly the same dimensions as the input.
        - Use only three perfectly flat colors, no antialiasing, no gradients, no texture, no labels.
        - #000000 black = unwalkable walls, furniture, props, sky, water, counters, roofs, and decorative background.
        - #00ff00 green = walkable floor/path where the character should draw in front of the foreground.
        - #0000ff blue = walkable floor/path where the character should draw behind a foreground object, wall, doorway, column, or arch.
        - Keep the mask blocky and pixel-perfect. Do not preserve original art colors.
        - Be conservative: if a spot is visually ambiguous, mark it black.

        Scene: {name}
        Foreground/occlusion note: {foreground_line}
        """
    ).strip() + "\n"


def create_prompt(source: Path, prompt_dir: Path) -> Path:
    prompt_dir.mkdir(parents=True, exist_ok=True)
    path = prompt_path_for(source, prompt_dir)
    path.write_text(build_prompt(source), encoding="utf-8")
    return path


def nearest_palette_color(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    r, g, b, a = pixel
    if a < 16:
        return UNWALKABLE

    def distance(color: tuple[int, int, int, int]) -> int:
        cr, cg, cb, _ = color
        return (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2

    return min(PALETTE, key=distance)


def clean_ai_draft(draft_path: Path, source: Path, output_path: Path) -> None:
    with Image.open(source) as source_img:
        size = source_img.size

    with Image.open(draft_path) as draft:
        draft = draft.convert("RGBA")
        if draft.size != size:
            draft = draft.resize(size, Image.Resampling.NEAREST)

        cleaned = Image.new("RGBA", size, UNWALKABLE)
        cleaned.putdata([nearest_palette_color(pixel) for pixel in draft.getdata()])
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cleaned.save(output_path)


def create_heuristic_mask(source: Path, output_path: Path) -> None:
    with Image.open(source) as source_img:
        width, height = source_img.size

    mask = Image.new("RGBA", (width, height), UNWALKABLE)
    draw = ImageDraw.Draw(mask)
    preset = PRESETS.get(source.stem)

    if preset:
        for polygon in preset.get("front", []):
            draw.polygon(polygon, fill=WALK_FRONT)
        for polygon in preset.get("behind", []):
            draw.polygon(polygon, fill=WALK_BEHIND)
    else:
        margin = max(8, width // 16)
        horizon = int(height * 0.58)
        draw.polygon(
            [(margin, horizon), (width - margin, horizon), (width - margin, height - margin), (margin, height - margin)],
            fill=WALK_FRONT,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    mask.save(output_path)


def list_default_sources() -> list[Path]:
    return [
        path
        for path in sorted(SETTINGS_DIR.glob("*.png"))
        if not path.stem.endswith("_foreground")
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate or clean setting walkability masks.")
    parser.add_argument(
        "settings",
        nargs="*",
        help="Setting stems or image paths. Defaults to all non-foreground settings.",
    )
    parser.add_argument(
        "--ai-draft-dir",
        type=Path,
        help="Directory containing img2img mask drafts to clean before falling back to local first-pass masks.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for final palette-valid masks.",
    )
    parser.add_argument(
        "--prompt-dir",
        type=Path,
        default=DEFAULT_PROMPT_DIR,
        help="Directory for generated img2img prompt text files.",
    )
    parser.add_argument(
        "--write-prompts",
        action="store_true",
        help="Write one img2img prompt file per source image.",
    )
    parser.add_argument(
        "--prompts-only",
        action="store_true",
        help="Only write prompts; do not create mask images.",
    )
    parser.add_argument(
        "--require-ai-draft",
        action="store_true",
        help="Fail instead of using a local first-pass mask when no AI draft exists.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sources = [setting_path(value) for value in args.settings] if args.settings else list_default_sources()

    for source in sources:
        if not source.exists():
            print(f"Missing setting image: {source}")
            return 1
        if source.stem.endswith("_foreground"):
            print(f"Skipping foreground overlay: {source}")
            continue

        if args.write_prompts or args.prompts_only:
            prompt_path = create_prompt(source, args.prompt_dir)
            print(f"Wrote prompt: {prompt_path.relative_to(PROJECT_ROOT)}")

        if args.prompts_only:
            continue

        output_path = output_path_for(source, args.output_dir)
        draft_path = None
        if args.ai_draft_dir:
            draft_path = next((path for path in candidate_ai_drafts(source, args.ai_draft_dir) if path.exists()), None)

        if draft_path:
            clean_ai_draft(draft_path, source, output_path)
            print(f"Cleaned AI draft: {draft_path.relative_to(PROJECT_ROOT)} -> {output_path.relative_to(PROJECT_ROOT)}")
        elif args.require_ai_draft:
            print(f"No AI draft found for {source.stem} in {args.ai_draft_dir}")
            return 1
        else:
            create_heuristic_mask(source, output_path)
            print(f"Wrote local first-pass mask: {output_path.relative_to(PROJECT_ROOT)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

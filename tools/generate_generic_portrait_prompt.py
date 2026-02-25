#!/usr/bin/env python3
"""
Write a reusable, non-character-specific portrait prompt pair.

This is meant for minor/generic characters where we do not want
custom identity descriptors.
"""

from __future__ import annotations

import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = (
    PROJECT_ROOT / "assets" / "portraits" / "img2img_refs" / "prompts"
)


def build_prompt() -> str:
    # Keep this compact so critical tokens are less likely to be truncated.
    return (
        "pixel art portrait, late Eastern Han era Chinese character, "
        "neutral good expression, clear eyes, proportionate facial features, "
        "crisp outlines, non-blocky face shading, "
        "clean 16-bit SNES style, original silhouette"
    )


def build_negative_prompt() -> str:
    return (
        "photorealistic, modern clothing, modern hairstyle, "
        "anime exaggeration, blurry, muddy colors, voxel block face, "
        "angular blocky cheeks, sinister expression, evil glare, "
        "malformed eyes, malformed mouth, "
        "traced silhouette, copied portrait contour"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate generic (non-character-specific) prompt files "
            "for portrait img2img runs."
        )
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory to write prompt files into.",
    )
    parser.add_argument(
        "--name",
        default="generic_any_character",
        help="Filename prefix for output prompt files.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    prompt_path = output_dir / f"{args.name}.prompt.txt"
    negative_path = output_dir / f"{args.name}.negative_prompt.txt"

    prompt_path.write_text(build_prompt() + "\n", encoding="utf-8")
    negative_path.write_text(build_negative_prompt() + "\n", encoding="utf-8")

    print(f"[ok] prompt: {prompt_path.relative_to(PROJECT_ROOT)}")
    print(f"[ok] negative: {negative_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()

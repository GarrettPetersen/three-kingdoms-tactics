#!/usr/bin/env python3
"""
Batch outpaint 256x256 settings images to 455x256 using local safetensors.

Default input:
  public/assets/settings

Default output:
  public/assets/settings_wide

Example:
  python tools/outpaint_settings_wide.py \
    --model "/Users/garrettpetersen/diffusion_models/your_model.safetensors"
"""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
from typing import Iterable, Optional

import torch
from PIL import Image, ImageFilter

# Keep MPS memory usage safer on macOS.
os.environ.setdefault("PYTORCH_MPS_HIGH_WATERMARK_RATIO", "0.0")

# Match existing project workaround for single-file safetensors loading.
try:
    import transformers.utils.import_utils as t_utils
    t_utils.check_torch_load_is_safe = lambda: True
    import transformers.modeling_utils as t_model
    t_model.check_torch_load_is_safe = lambda: True
except Exception:
    pass

try:
    import diffusers.loaders.single_file_utils as d_utils
    d_utils.check_torch_load_is_safe = lambda: True
except Exception:
    pass

from diffusers import AutoPipelineForInpainting

from model_paths import resolve_sd_model_path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = PROJECT_ROOT / "public" / "assets" / "settings"
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "assets" / "settings_wide"
TARGET_W = 455
TARGET_H = 256


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def pick_dtype(device: str) -> torch.dtype:
    # Safer defaults for Apple MPS and CPU.
    if device == "cuda":
        return torch.float16
    return torch.float32


def list_pngs(folder: Path) -> Iterable[Path]:
    return sorted(p for p in folder.glob("*.png") if p.is_file())


def make_outpaint_inputs(src: Image.Image, target_w: int, target_h: int, feather_px: int) -> tuple[Image.Image, Image.Image]:
    """
    Returns:
      base_rgb  - image pasted onto larger canvas (centered)
      mask_l    - L mode mask, white where model should generate
    """
    src = src.convert("RGB")
    w, h = src.size
    if (w, h) != (256, 256):
        # Keep intended behavior predictable for this tool.
        src = src.resize((256, 256), Image.NEAREST)
        w, h = src.size

    canvas = Image.new("RGB", (target_w, target_h), (0, 0, 0))
    left = (target_w - w) // 2
    top = (target_h - h) // 2
    canvas.paste(src, (left, top))

    mask = Image.new("L", (target_w, target_h), 255)
    # Preserve center image; outpaint side bands.
    keep = Image.new("L", (w, h), 0)
    mask.paste(keep, (left, top))
    if feather_px > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(radius=feather_px))
    return canvas, mask


def seed_from_name(name: str, base_seed: int) -> int:
    digest = hashlib.sha256(name.encode("utf-8")).hexdigest()
    stable = int(digest[:8], 16)
    return (stable + base_seed) % (2**31 - 1)


def resolve_model_path(explicit_model: Optional[str]) -> Path:
    if explicit_model:
        p = Path(explicit_model).expanduser().resolve()
        if not p.exists():
            raise FileNotFoundError(f"Model not found: {p}")
        return p
    p = resolve_sd_model_path()
    if not p.exists():
        raise FileNotFoundError(
            f"No model found. Provide --model, or set TKT_SD_MODEL_PATH. Checked default: {p}"
        )
    return p


def load_pipe(model_path: Path, device: str, dtype: torch.dtype):
    print(f"[load] model={model_path}")
    pipe = AutoPipelineForInpainting.from_single_file(
        str(model_path),
        torch_dtype=dtype,
        use_safetensors=True,
        safety_checker=None,
    )
    pipe = pipe.to(device)
    pipe.safety_checker = None
    if device in ("mps", "cpu"):
        pipe.enable_attention_slicing()
    return pipe


def main() -> None:
    parser = argparse.ArgumentParser(description="Outpaint settings images from 256x256 to 455x256.")
    parser.add_argument("--model", default=None, help="Path to .safetensors model file.")
    parser.add_argument("--input-dir", default=str(DEFAULT_INPUT), help="Input folder with PNG files.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT), help="Output folder.")
    parser.add_argument("--overwrite", action="store_true", help="Write outputs back into input folder.")
    parser.add_argument("--prompt", default="pixel art Three Kingdoms scene background, seamless extension, coherent lighting, clean edges, crisp details", help="Positive prompt.")
    parser.add_argument("--negative-prompt", default="people, characters, text, logo, watermark, blurry, smudged, deformed geometry", help="Negative prompt.")
    parser.add_argument("--steps", type=int, default=28, help="Inference steps.")
    parser.add_argument("--guidance", type=float, default=6.5, help="Guidance scale.")
    parser.add_argument("--strength", type=float, default=1.0, help="Inpaint strength.")
    parser.add_argument("--feather", type=int, default=2, help="Mask feather radius in pixels.")
    parser.add_argument("--seed", type=int, default=1337, help="Base seed (mixed with filename for stable per-file outputs).")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N files (0 = all).")
    args = parser.parse_args()

    input_dir = Path(args.input_dir).expanduser().resolve()
    output_dir = input_dir if args.overwrite else Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    files = list(list_pngs(input_dir))
    if args.limit > 0:
        files = files[: args.limit]
    if not files:
        print(f"[done] no PNG files in {input_dir}")
        return

    model_path = resolve_model_path(args.model)
    device = pick_device()
    dtype = pick_dtype(device)
    print(f"[env] device={device} dtype={dtype} files={len(files)}")

    pipe = load_pipe(model_path, device, dtype)

    for i, src_path in enumerate(files, start=1):
        dst_path = output_dir / src_path.name
        try:
            src = Image.open(src_path).convert("RGB")
            base, mask = make_outpaint_inputs(src, TARGET_W, TARGET_H, max(0, args.feather))
            file_seed = seed_from_name(src_path.name, args.seed)
            gen = torch.Generator(device=device).manual_seed(file_seed)

            result = pipe(
                prompt=args.prompt,
                negative_prompt=args.negative_prompt,
                image=base,
                mask_image=mask,
                width=TARGET_W,
                height=TARGET_H,
                num_inference_steps=args.steps,
                guidance_scale=args.guidance,
                strength=args.strength,
                generator=gen,
            ).images[0]

            # Ensure exact output dimensions and pixel-friendly save.
            result = result.resize((TARGET_W, TARGET_H), Image.NEAREST)
            result.save(dst_path)
            print(f"[{i}/{len(files)}] ok  {src_path.name} -> {dst_path}")
        except Exception as exc:
            print(f"[{i}/{len(files)}] ERR {src_path.name}: {exc}")

        if device == "mps":
            torch.mps.empty_cache()

    print("[done]")


if __name__ == "__main__":
    main()


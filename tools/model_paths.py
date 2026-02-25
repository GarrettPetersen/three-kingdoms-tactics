#!/usr/bin/env python3
"""
Shared local model path resolution for portrait-generation tools.

This keeps large model binaries out of git while standardizing how scripts
locate local checkpoints across machines.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Tuple


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_NAME = os.environ.get("TKT_SD_MODEL_NAME", "RetroDiffusion24x-64xModel.safetensors")


def _expand(p: str) -> Path:
    return Path(os.path.expanduser(p)).resolve()


def resolve_sd_model_path() -> Path:
    """
    Resolve the Stable Diffusion checkpoint path in priority order:
      1) explicit file env vars
      2) directory env vars + model filename
      3) common local fallback directories
    """
    file_env_keys = ("TKT_SD_MODEL_PATH", "SD_MODEL_PATH", "RETRODIFFUSION_MODEL_PATH")
    for key in file_env_keys:
        value = os.environ.get(key)
        if not value:
            continue
        p = _expand(value)
        if p.exists():
            return p

    dir_env_keys = ("TKT_SD_MODELS_DIR", "SD_MODELS_DIR", "RETRODIFFUSION_MODELS_DIR")
    for key in dir_env_keys:
        value = os.environ.get(key)
        if not value:
            continue
        candidate = _expand(value) / DEFAULT_MODEL_NAME
        if candidate.exists():
            return candidate

    fallback_dirs = (
        "~/Image Gen Models",
        "~/diffusion_models",
        "~/Models",
        "~/StableDiffusion",
        str(PROJECT_ROOT / "models"),
        str(PROJECT_ROOT / ".models"),
    )
    for directory in fallback_dirs:
        candidate = _expand(directory) / DEFAULT_MODEL_NAME
        if candidate.exists():
            return candidate

    # Final deterministic default for better error messaging.
    return _expand("~/Image Gen Models") / DEFAULT_MODEL_NAME


def resolve_sd_model_dir_and_name() -> Tuple[str, str]:
    model_path = resolve_sd_model_path()
    return str(model_path.parent), model_path.name


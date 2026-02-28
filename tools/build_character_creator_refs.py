#!/usr/bin/env python3
"""
Build portrait references from character_creator modular parts.
"""

from __future__ import annotations

import colorsys
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PARTS_DIR = PROJECT_ROOT / "assets" / "portraits" / "character_creator"
FEMALE_PARTS_DIR = PROJECT_ROOT / "public" / "assets" / "portraits" / "female_character_creator"
OUT_DIR = PROJECT_ROOT / "assets" / "portraits" / "img2img_refs" / "creator_refs"

BASE_W = 40
BASE_H = 48
REF_W = 320
REF_H = 384


RGBA = Tuple[int, int, int, int]
RGB = Tuple[int, int, int]


def _frame_box(frame_index: int, frame_width: int, frame_height: int, columns: int) -> Tuple[int, int, int, int]:
    col = frame_index % columns
    row = frame_index // columns
    x0 = col * frame_width
    y0 = row * frame_height
    return (x0, y0, x0 + frame_width, y0 + frame_height)


def _make_vertical_gradient(width: int, height: int, top_rgb: RGB, bottom_rgb: RGB) -> Image.Image:
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


def _load_rgba(name: str, parts_dir: Optional[Path] = None) -> Image.Image:
    p = (parts_dir or PARTS_DIR) / name
    if not p.exists():
        raise FileNotFoundError(f"Missing layer part: {p}")
    return Image.open(p).convert("RGBA")


def _palette_swap_exact(image: Image.Image, rgba_map: Dict[RGBA, RGBA]) -> Image.Image:
    if not rgba_map:
        return image
    out = image.copy()
    src = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            px = src[x, y]
            src[x, y] = rgba_map.get(px, px)
    return out


def _compose(layers: Iterable[Image.Image]) -> Image.Image:
    canvas = Image.new("RGBA", (BASE_W, BASE_H), (0, 0, 0, 0))
    for layer in layers:
        canvas.alpha_composite(layer)
    return canvas


def _is_skin_like(rgb: RGB) -> bool:
    r, g, b = rgb
    if r > 95 and g > 60 and b < 150 and r > g > b and (r - b) > 25:
        return True
    return False


def _is_chromatic_candidate(rgb: RGB) -> bool:
    r, g, b = rgb
    if max(rgb) < 35:
        return False
    if min(rgb) > 235:
        return False
    if _is_skin_like(rgb):
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    if s < 0.18:
        return False
    if v < 0.20:
        return False
    return True


def _lerp_rgb(a: RGB, b: RGB, t: float) -> RGB:
    return (
        int(round(a[0] * (1 - t) + b[0] * t)),
        int(round(a[1] * (1 - t) + b[1] * t)),
        int(round(a[2] * (1 - t) + b[2] * t)),
    )


def _brightness(rgb: RGB) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _clamp_u8(v: float) -> int:
    return max(0, min(255, int(round(v))))


def _scale_rgb(rgb: RGB, factor: float) -> RGB:
    return (_clamp_u8(rgb[0] * factor), _clamp_u8(rgb[1] * factor), _clamp_u8(rgb[2] * factor))


def _derive_shaded_ramp_from_mid(mid: RGB, src_dark: RGBA, src_mid: RGBA, src_light: RGBA) -> Tuple[RGB, RGB, RGB]:
    """
    Preserve shading by keeping the original dark/mid/light value ratios from source palette.
    """
    src_dark_b = max(1e-6, _brightness((src_dark[0], src_dark[1], src_dark[2])))
    src_mid_b = max(1e-6, _brightness((src_mid[0], src_mid[1], src_mid[2])))
    src_light_b = max(1e-6, _brightness((src_light[0], src_light[1], src_light[2])))

    dark_ratio = src_dark_b / src_mid_b
    light_ratio = src_light_b / src_mid_b

    dark = _scale_rgb(mid, dark_ratio)
    light = _scale_rgb(mid, light_ratio)
    return dark, mid, light


def _hue_distance(a: float, b: float) -> float:
    d = abs(a - b)
    return min(d, 1.0 - d)


def _extract_full_palette(sprite_rel_path: str) -> List[dict]:
    """
    Pull a fuller palette from sprite frame 0, preserving counts + HSV metadata.
    """
    sprite_path = PROJECT_ROOT / sprite_rel_path
    sprite = Image.open(sprite_path).convert("RGBA")
    frame = sprite.crop(_frame_box(frame_index=0, frame_width=72, frame_height=72, columns=8))
    rgb = frame.convert("RGB").quantize(colors=56, method=Image.Quantize.FASTOCTREE).convert("RGB")

    frame_px = frame.load()
    rgb_px = rgb.load()
    counts: Dict[RGB, int] = {}
    for y in range(frame.height):
        for x in range(frame.width):
            _, _, _, a = frame_px[x, y]
            if a == 0:
                continue
            c = rgb_px[x, y]
            counts[c] = counts.get(c, 0) + 1

    total = sum(counts.values()) or 1
    palette: List[dict] = []
    for rgb_color, count in sorted(counts.items(), key=lambda item: item[1], reverse=True):
        r, g, b = rgb_color
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        palette.append(
            {
                "rgb": [r, g, b],
                "rgba": [r, g, b, 255],
                "count": count,
                "ratio": round(count / total, 6),
                "h": round(h, 6),
                "s": round(s, 6),
                "v": round(v, 6),
                "brightness": round(_brightness((r, g, b)), 3),
                "is_skin_like": _is_skin_like((r, g, b)),
                "is_chromatic": _is_chromatic_candidate((r, g, b)),
            }
        )
    return palette


def _palette_candidates(palette: List[dict]) -> List[dict]:
    return [
        p
        for p in palette
        if p["is_chromatic"] and not p["is_skin_like"] and p["count"] > 0
    ]


def _select_color(
    candidates: List[dict],
    target_hue: Optional[float] = None,
    prefer_dark: bool = False,
    prefer_light: bool = False,
) -> Optional[RGB]:
    if not candidates:
        return None
    best = None
    best_score = -10**9
    max_count = max(c["count"] for c in candidates) or 1
    for c in candidates:
        h = float(c["h"])
        s = float(c["s"])
        v = float(c["v"])
        count_term = c["count"] / max_count
        score = (count_term * 2.2) + (s * 1.6)
        if target_hue is not None:
            hd = _hue_distance(h, target_hue)
            score += (1.2 - (hd * 2.4))
        if prefer_dark:
            score += (1.0 - v) * 1.25
        if prefer_light:
            score += v * 1.25
        if score > best_score:
            best_score = score
            best = c
    if not best:
        return None
    r, g, b = best["rgb"]
    return (r, g, b)


def _derive_tones(mid: RGB) -> Tuple[RGB, RGB]:
    dark = _lerp_rgb((0, 0, 0), mid, 0.62)
    light = _lerp_rgb(mid, (255, 255, 255), 0.26)
    return dark, light


def _build_garment_tones(palette: List[dict], target_hue: Optional[float] = None) -> Dict[str, RGBA]:
    candidates = _palette_candidates(palette)
    mid = _select_color(candidates, target_hue=target_hue)
    if mid is None:
        mid = (106, 190, 48)
    dark, mid, light = _derive_shaded_ramp_from_mid(mid, GARMENT_DARK, GARMENT_MID, GARMENT_LIGHT)
    if mid is None:
        # Defensive fallback (should not happen because of assignment above).
        dark, mid, light = (55, 148, 110), (106, 190, 48), (153, 229, 80)
    else:
        # no-op branch, kept for readability symmetry after fallback block
        pass
    return {
        "dark": (dark[0], dark[1], dark[2], 255),
        "mid": (mid[0], mid[1], mid[2], 255),
        "light": (light[0], light[1], light[2], 255),
    }


def _build_hat_tones(palette: List[dict], hue_a: float, hue_b: float) -> Tuple[RGBA, RGBA]:
    candidates = _palette_candidates(palette)
    a = _select_color(candidates, target_hue=hue_a)
    b = _select_color(candidates, target_hue=hue_b, prefer_light=True)
    if a is None and b is None:
        return (55, 148, 110, 255), (251, 242, 54, 255)
    if a is None and b is not None:
        a = _lerp_rgb((0, 0, 0), b, 0.66)
    if b is None and a is not None:
        b = _lerp_rgb(a, (255, 255, 255), 0.28)
    return (a[0], a[1], a[2], 255), (b[0], b[1], b[2], 255)


# Common creator palette swatches in source parts.
SKIN_LIGHT: RGBA = (238, 195, 154, 255)
SKIN_MID: RGBA = (217, 160, 102, 255)
SKIN_DARK: RGBA = (143, 86, 59, 255)
ACCENT_RED: RGBA = (168, 64, 32, 255)
ACCENT_GOLD: RGBA = (200, 136, 32, 255)
EYE_WHITE: RGBA = (232, 232, 232, 255)
OUTLINE: RGBA = (0, 0, 0, 255)
HAIR_BLACK: RGBA = (0, 0, 0, 255)
GARMENT_DARK: RGBA = (55, 148, 110, 255)
GARMENT_MID: RGBA = (106, 190, 48, 255)
GARMENT_LIGHT: RGBA = (153, 229, 80, 255)
HAT_GUAN_DARK: RGBA = (118, 66, 138, 255)
HAT_GUAN_ACCENT: RGBA = (172, 50, 50, 255)
SCARF_DARK: RGBA = (223, 113, 38, 255)
SCARF_LIGHT: RGBA = (251, 242, 54, 255)
SKIN_LAYER_PARTS = {"head_normal.png", "head_chubby.png", "head_obese.png", "big_nose.png", "long_earlobe.png"}


def _char_specs() -> Dict[str, dict]:
    return {
        "liubei": {
            "source_sprite": "assets/characters/048_liubei.png",
            "bg_gradient": {
                "top": [116, 102, 170],
                "bottom": [66, 54, 114],
            },
            "layers": [
                (
                    "head_normal.png",
                    {
                        SKIN_LIGHT: (255, 206, 164, 255),
                        SKIN_MID: (234, 170, 128, 255),
                        SKIN_DARK: (186, 124, 88, 255),
                    },
                ),
                ("shirt_robe.png", {}),
                ("long_earlobe.png", {}),
                ("hair_short_bun.png", {}),
                ("eyebrows_thin.png", {}),
                ("moustache_thin.png", {}),
                ("beard_pointy.png", {}),
                (
                    "hat_guan.png",
                    {},
                ),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 206, 164, 255],
                    "mid": [234, 170, 128, 255],
                    "dark": [186, 124, 88, 255]
                },
                "shirt_tones": {
                    "dark": [23, 86, 27, 255],
                    "mid": [56, 134, 51, 255],
                    "light": [215, 192, 50, 255]
                },
                "guan_hat_colors": [
                    [56, 134, 51, 255],
                    [215, 192, 50, 255]
                ]
            },
        },
        "caocao": {
            "source_sprite": "assets/characters/031_caocao.png",
            "bg_gradient": {
                "top": [120, 108, 152],
                "bottom": [64, 54, 96],
            },
            "layers": [
                (
                    "head_normal.png",
                    {
                        SKIN_LIGHT: (255, 233, 210, 255),
                        SKIN_MID: (205, 168, 152, 255),
                        SKIN_DARK: (159, 107, 95, 255),
                    },
                ),
                ("shirt_robe.png", {}),
                ("hair_short_bun.png", {
                    (0, 0, 0, 255): (72, 72, 71, 255),
                }),
                ("eyebrows_thick.png", {}),
                ("beard_pointy.png", {}),
                ("smirk.png", {
                    SKIN_LIGHT: (255, 233, 210, 255),
                    SKIN_MID: (205, 168, 152, 255),
                    SKIN_DARK: (159, 107, 95, 255),
                }),
                ("moustache_fu_manchu.png", {}),
                ("hat_guan.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 233, 210, 255],
                    "mid": [205, 168, 152, 255],
                    "dark": [159, 107, 95, 255]
                },
                "shirt_tones": {
                    "dark": [20, 10, 26, 255],
                    "mid": [84, 44, 104, 255],
                    "light": [131, 88, 133, 255]
                },
                "guan_hat_colors": [
                    [174, 96, 34, 255],
                    [225, 157, 52, 255]
                ]
            },
        },
        "guanyu": {
            "source_sprite": "assets/characters/049_guanyu.png",
            "bg_gradient": {
                "top": [150, 118, 164],
                "bottom": [86, 62, 106],
            },
            "layers": [
                (
                    "head_normal.png",
                    {
                        SKIN_LIGHT: (216, 148, 118, 255),
                        SKIN_MID: (181, 92, 78, 255),
                        SKIN_DARK: (128, 62, 52, 255),
                    },
                ),
                ("shirt_high_collar.png", {}),
                ("hair_long.png", {}),
                ("eyebrows_spock.png", {}),
                ("moustache_thick.png", {}),
                ("beard_long.png", {}),
                ("hat_headscarf.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [216, 148, 118, 255],
                    "mid": [181, 92, 78, 255],
                    "dark": [128, 62, 52, 255]
                },
                "shirt_tones": {
                    "dark": [24, 85, 27, 255],
                    "mid": [56, 135, 49, 255],
                    "light": [61, 145, 54, 255]
                },
                "headcloth_tones": {
                    "dark": [24, 85, 27, 255],
                    "mid": [56, 135, 49, 255],
                    "light": [61, 145, 54, 255]
                }
            },
        },
        "zhangfei": {
            "source_sprite": "assets/characters/050_zhangfei.png",
            "bg_gradient": {
                "top": [92, 156, 170],
                "bottom": [42, 96, 114],
            },
            "layers": [
                (
                    "head_chubby.png",
                    {
                        SKIN_LIGHT: (193, 97, 85, 255),
                        SKIN_MID: (149, 76, 66, 255),
                        SKIN_DARK: (107, 53, 46, 255),
                    },
                ),
                ("shirt_armour.png", {}),
                ("hair_long.png", {}),
                ("hair_long_bun.png", {}),
                ("eyebrows_thick.png", {}),
                ("big_nose.png", {}),
                ("moustache_thick.png", {}),
                ("beard_bushy.png", {}),
                ("hat_headscarf.png", {}),
                ("short_bangs.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [193, 97, 85, 255],
                    "mid": [149, 76, 66, 255],
                    "dark": [107, 53, 46, 255]
                },
                "headscarf_colors": [
                    [116, 11, 0, 255],
                    [229, 23, 7, 255]
                ]
            },
        },
        "zhoujing": {
            "source_sprite": "assets/characters/071_chendeng.png",
            "bg_gradient": {
                "top": [126, 128, 142],
                "bottom": [78, 80, 92],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_short_bun.png", {}),
                ("eyebrows_thin.png", {}),
                ("moustache_thin.png", {}),
                ("hat_guan.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 214, 194, 255],
                    "mid": [203, 126, 113, 255],
                    "dark": [176, 113, 99, 255]
                },
                "shirt_tones": {
                    "dark": [120, 109, 76, 255],
                    "mid": [196, 196, 196, 255],
                    "light": [255, 238, 214, 255]
                },
                "guan_hat_colors": [
                    [106, 98, 15, 255],
                    [226, 210, 32, 255]
                ]
            },
        },
        "farmer": {
            "source_sprite": "assets/characters/083_nongfu01.png",
            "bg_gradient": {
                "top": [150, 136, 108],
                "bottom": [94, 78, 56],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_short.png", {}),
                ("eyebrows_thin.png", {}),
                ("hat_conical.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 194, 148, 255],
                    "mid": [185, 126, 38, 255],
                    "dark": [119, 83, 43, 255]
                },
                "shirt_tones": {
                    "dark": [93, 53, 22, 255],
                    "mid": [154, 100, 34, 255],
                    "light": [221, 161, 43, 255]
                }
            },
        },
        "farmer_female": {
            "source_sprite": "assets/characters/084_nongfu02.png",
            "parts_dir": "public/assets/portraits/female_character_creator",
            "bg_gradient": {
                "top": [164, 148, 124],
                "bottom": [104, 88, 66],
            },
            "layers": [
                ("head_normal.png", {}),
                (
                    "robe.png",
                    {
                        (168, 64, 32, 255): (86, 54, 30, 255),
                        (200, 136, 32, 255): (126, 86, 48, 255),
                        (221, 90, 50, 255): (110, 70, 40, 255),
                        (232, 200, 136, 255): (172, 132, 86, 255),
                    },
                ),
                ("long_hair.png", {(0, 0, 0, 255): (72, 56, 43, 255)}),
                ("hair_bun.png", {(0, 0, 0, 255): (72, 56, 43, 255)}),
                ("eyebrows_thin.png", {(0, 0, 0, 255): (72, 56, 43, 255)}),
                ("bangs_strands.png", {(0, 0, 0, 255): (72, 56, 43, 255)}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [225, 163, 147, 255],
                    "mid": [197, 118, 107, 255],
                    "dark": [154, 102, 93, 255]
                }
            },
        },
        "xiaoer": {
            "source_sprite": "assets/characters/086_xiaoer01.png",
            "bg_gradient": {
                "top": [118, 126, 148],
                "bottom": [72, 80, 104],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_short.png", {}),
                ("eyebrows_thin.png", {}),
                ("hat_cloth_cap.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [252, 201, 162, 255],
                    "mid": [204, 154, 106, 255],
                    "dark": [142, 97, 66, 255]
                },
                "shirt_tones": {
                    "dark": [54, 58, 83, 255],
                    "mid": [101, 122, 183, 255],
                    "light": [187, 201, 239, 255]
                }
            },
        },
        "merchant": {
            "source_sprite": "assets/characters/090_fushang01.png",
            "bg_gradient": {
                "top": [124, 120, 146],
                "bottom": [74, 68, 98],
            },
            "layers": [
                ("head_obese.png", {}),
                ("shirt_robe.png", {}),
                ("hair_short.png", {}),
                ("eyebrows_thin.png", {}),
                ("moustache_fu_manchu.png", {}),
                ("beard_long.png", {}),
                (
                    "hat_square_futou.png",
                    {
                        (64, 64, 96, 255): (72, 72, 82, 255),
                        (32, 32, 32, 255): (24, 24, 28, 255),
                    },
                ),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [249, 199, 159, 255],
                    "mid": [206, 150, 102, 255],
                    "dark": [143, 97, 62, 255]
                },
                "shirt_tones": {
                    "dark": [62, 47, 29, 255],
                    "mid": [108, 86, 62, 255],
                    "light": [182, 160, 122, 255]
                }
            },
        },
        "blacksmith": {
            "source_sprite": "assets/characters/091_tiejiang01.png",
            "bg_gradient": {
                "top": [132, 110, 88],
                "bottom": [82, 62, 44],
            },
            "layers": [
                ("head_chubby.png", {}),
                ("shirt_high_collar.png", {}),
                ("hair_short_bun.png", {
                    (0, 0, 0, 255): (96, 96, 104, 255),
                    (34, 32, 52, 255): (146, 146, 154, 255),
                }),
                ("eyebrows_thick.png", {
                    (0, 0, 0, 255): (96, 96, 104, 255),
                }),
                ("moustache_thick.png", {
                    (0, 0, 0, 255): (110, 110, 118, 255),
                }),
                ("beard_pointy.png", {
                    (0, 0, 0, 255): (118, 118, 126, 255),
                }),
                ("hat_headscarf.png", {}),
                ("short_bangs.png", {
                    (0, 0, 0, 255): (96, 96, 104, 255),
                    (106, 106, 108, 255): (146, 146, 154, 255),
                }),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [248, 194, 149, 255],
                    "mid": [198, 142, 95, 255],
                    "dark": [132, 91, 60, 255]
                },
                "shirt_tones": {
                    "dark": [73, 50, 32, 255],
                    "mid": [122, 83, 52, 255],
                    "light": [188, 147, 95, 255]
                },
                "headscarf_colors": [
                    [70, 41, 19, 255],
                    [190, 128, 66, 255]
                ],
                "headcloth_tones": {
                    "dark": [70, 41, 19, 255],
                    "mid": [125, 74, 36, 255],
                    "light": [190, 128, 66, 255]
                }
            },
        },
        "chengyuanzhi": {
            "source_sprite": "assets/characters/027_chengpu.png",
            "bg_gradient": {
                "top": [126, 118, 96],
                "bottom": [74, 62, 44],
            },
            "layers": [
                ("head_chubby.png", {}),
                ("shirt_armour.png", {}),
                ("eyebrows_thick.png", {
                    (0, 0, 0, 255): (132, 132, 132, 255),
                }),
                ("beard_long.png", {
                    (0, 0, 0, 255): (128, 128, 128, 255),
                }),
                (
                    "helmet.png",
                    {
                        # Bronze helmet body (former silver areas).
                        (142, 142, 142, 255): (176, 128, 66, 255),
                        (103, 103, 103, 255): (122, 84, 44, 255),
                        # Leave plume reds unchanged.
                    },
                ),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [220, 154, 102, 255],
                    "mid": [167, 119, 70, 255],
                    "dark": [103, 72, 42, 255]
                },
                "shirt_tones": {
                    "dark": [54, 37, 24, 255],
                    "mid": [87, 37, 20, 255],
                    "light": [154, 44, 25, 255]
                }
            },
        },
        "dengmao": {
            "source_sprite": "assets/characters/028_xusheng.png",
            "bg_gradient": {
                "top": [122, 114, 98],
                "bottom": [74, 62, 46],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_armour.png", {}),
                ("eyebrows_thick.png", {}),
                (
                    "helmet.png",
                    {
                        # Helmet body: silver -> bronze
                        (142, 142, 142, 255): (176, 128, 66, 255),
                        (103, 103, 103, 255): (122, 84, 44, 255),
                        # Plume: red -> white/silver
                        (168, 64, 32, 255): (230, 230, 230, 255),
                        (142, 54, 27, 255): (176, 176, 176, 255),
                    },
                ),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [253, 184, 138, 255],
                    "mid": [216, 156, 102, 255],
                    "dark": [151, 94, 83, 255]
                },
                "shirt_tones": {
                    "dark": [23, 6, 6, 255],
                    "mid": [94, 35, 25, 255],
                    "light": [148, 37, 31, 255]
                }
            },
        },
        "soldier": {
            "source_sprite": "assets/characters/081_shibing001.png",
            "bg_gradient": {
                "top": [108, 120, 138],
                "bottom": [62, 74, 92],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_armour.png", {}),
                ("eyebrows_thin.png", {}),
                (
                    "helmet.png",
                    {
                        (142, 142, 142, 255): (173, 173, 173, 255),
                        (103, 103, 103, 255): (98, 98, 98, 255),
                        (168, 64, 32, 255): (152, 52, 49, 255),
                        (142, 54, 27, 255): (121, 46, 38, 255),
                    },
                ),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 194, 148, 255],
                    "mid": [249, 173, 126, 255],
                    "dark": [149, 98, 66, 255]
                },
                "shirt_tones": {
                    "dark": [32, 32, 32, 255],
                    "mid": [98, 98, 98, 255],
                    "light": [173, 173, 173, 255]
                }
            },
        },
        "yellowturban": {
            "source_sprite": "assets/characters/097_yellowturban.png",
            "bg_gradient": {
                "top": [142, 124, 86],
                "bottom": [86, 70, 42],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_long.png", {}),
                ("eyebrows_thin.png", {}),
                ("hat_headcloth.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 203, 164, 255],
                    "mid": [208, 154, 105, 255],
                    "dark": [144, 99, 64, 255]
                },
                "shirt_tones": {
                    "dark": [68, 56, 42, 255],
                    "mid": [124, 98, 72, 255],
                    "light": [196, 168, 128, 255]
                },
                "headcloth_tones": {
                    "dark": [156, 112, 24, 255],
                    "mid": [215, 160, 42, 255],
                    "light": [246, 210, 92, 255]
                }
            },
        },
        "zhangjiao": {
            "source_sprite": "assets/characters/005_zhangjiao.png",
            "bg_gradient": {
                "top": [132, 116, 86],
                "bottom": [78, 66, 44],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_long.png", {}),
                ("hair_long_bun.png", {}),
                ("eyebrows_thin.png", {}),
                ("moustache_thick.png", {}),
                ("beard_long.png", {}),
                ("hat_headscarf.png", {}),
                ("hat_guan.png", {}),
                ("long_bangs.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [234, 158, 111, 255],
                    "mid": [178, 112, 72, 255],
                    "dark": [124, 71, 38, 255]
                },
                "shirt_tones": {
                    "dark": [58, 36, 17, 255],
                    "mid": [130, 80, 6, 255],
                    "light": [210, 143, 42, 255]
                },
                "headscarf_colors": [
                    [130, 80, 6, 255],
                    [210, 143, 42, 255]
                ],
                "guan_hat_colors": [
                    [104, 68, 5, 255],
                    [210, 143, 42, 255]
                ]
            },
        },
        "zhangbao": {
            "source_sprite": "assets/characters/006_zhangbao.png",
            "bg_gradient": {
                "top": [140, 124, 90],
                "bottom": [84, 70, 46],
            },
            "layers": [
                ("head_chubby.png", {}),
                ("shirt_high_collar.png", {}),
                ("hair_male_pattern_baldness.png", {}),
                ("eyebrows_thick.png", {}),
                ("moustache_thick.png", {}),
                ("beard_bushy.png", {}),
                ("hat_headscarf.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [255, 216, 194, 255],
                    "mid": [220, 198, 179, 255],
                    "dark": [143, 89, 86, 255]
                },
                "shirt_tones": {
                    "dark": [51, 51, 51, 255],
                    "mid": [110, 110, 110, 255],
                    "light": [202, 202, 202, 255]
                },
                "headscarf_colors": [
                    [168, 125, 14, 255],
                    [252, 166, 13, 255]
                ]
            },
        },
        "zhangliang": {
            "source_sprite": "assets/characters/007_zhangliang.png",
            "bg_gradient": {
                "top": [124, 118, 104],
                "bottom": [74, 68, 54],
            },
            "layers": [
                ("head_normal.png", {}),
                ("shirt_robe.png", {}),
                ("hair_short_bun.png", {}),
                ("eyebrows_thin.png", {}),
                ("moustache_thin.png", {}),
                ("beard_pointy.png", {}),
                ("hat_headscarf.png", {}),
            ],
            "manual_palette": {
                "skin_tones": {
                    "light": [245, 164, 115, 255],
                    "mid": [133, 109, 91, 255],
                    "dark": [82, 68, 53, 255]
                },
                "shirt_tones": {
                    "dark": [53, 52, 51, 255],
                    "mid": [107, 89, 71, 255],
                    "light": [163, 151, 141, 255]
                },
                "headscarf_colors": [
                    [99, 77, 24, 255],
                    [245, 204, 104, 255]
                ]
            },
        },
    }


def build_reference(char_id: str, spec: dict) -> Tuple[Path, Path]:
    palette = _extract_full_palette(spec["source_sprite"]) if spec.get("source_sprite") else []
    parts_dir = PROJECT_ROOT / spec["parts_dir"] if spec.get("parts_dir") else PARTS_DIR
    manual_cfg = spec.get("manual_palette", {})
    skin_tones: Dict[str, RGBA] = {}
    shirt_tones: Dict[str, RGBA] = {}
    headcloth_tones: Dict[str, RGBA] = {}
    guan_hat_colors: Tuple[RGBA, RGBA] = ((55, 148, 110, 255), (251, 242, 54, 255))
    headscarf_colors: Tuple[RGBA, RGBA] = ((223, 113, 38, 255), (251, 242, 54, 255))
    if "skin_tones" in manual_cfg:
        sk = manual_cfg["skin_tones"]
        skin_tones = {"light": tuple(sk["light"]), "mid": tuple(sk["mid"]), "dark": tuple(sk["dark"])}
    if "shirt_tones" in manual_cfg:
        st = manual_cfg["shirt_tones"]
        shirt_tones = {"dark": tuple(st["dark"]), "mid": tuple(st["mid"]), "light": tuple(st["light"])}
    if "headcloth_tones" in manual_cfg:
        ht = manual_cfg["headcloth_tones"]
        headcloth_tones = {"dark": tuple(ht["dark"]), "mid": tuple(ht["mid"]), "light": tuple(ht["light"])}
    if "guan_hat_colors" in manual_cfg:
        guan_hat_colors = (tuple(manual_cfg["guan_hat_colors"][0]), tuple(manual_cfg["guan_hat_colors"][1]))
    if "headscarf_colors" in manual_cfg:
        headscarf_colors = (tuple(manual_cfg["headscarf_colors"][0]), tuple(manual_cfg["headscarf_colors"][1]))

    layers: List[Image.Image] = []
    for part_name, swap_map in spec["layers"]:
        layer = _load_rgba(part_name, parts_dir=parts_dir)
        local_swap_map = dict(swap_map)
        # Smart manual mapping using full extracted palette + role hints.
        if skin_tones and part_name in SKIN_LAYER_PARTS:
            local_swap_map.update(
                {
                    SKIN_LIGHT: skin_tones["light"],
                    SKIN_MID: skin_tones["mid"],
                    SKIN_DARK: skin_tones["dark"],
                }
            )
        if shirt_tones and part_name.startswith("shirt_"):
            local_swap_map.update(
                {
                    GARMENT_DARK: shirt_tones["dark"],
                    GARMENT_MID: shirt_tones["mid"],
                    GARMENT_LIGHT: shirt_tones["light"],
                }
            )
        if headcloth_tones and part_name == "hat_headcloth.png":
            local_swap_map.update(
                {
                    GARMENT_DARK: headcloth_tones["dark"],
                    GARMENT_MID: headcloth_tones["mid"],
                    GARMENT_LIGHT: headcloth_tones["light"],
                }
            )
        if part_name == "hat_guan.png":
            local_swap_map.update(
                {
                    HAT_GUAN_DARK: guan_hat_colors[0],
                    HAT_GUAN_ACCENT: guan_hat_colors[1],
                }
            )
        if part_name == "hat_headscarf.png":
            local_swap_map.update(
                {
                    SCARF_DARK: headscarf_colors[0],
                    SCARF_LIGHT: headscarf_colors[1],
                }
            )
        layer = _palette_swap_exact(layer, local_swap_map)
        layers.append(layer)

    portrait_40 = _compose(layers)
    portrait_320 = portrait_40.resize((REF_W, REF_H), Image.Resampling.NEAREST)

    bg_cfg = spec.get("bg_gradient", {})
    bg_top = tuple(bg_cfg.get("top", [130, 146, 168]))
    bg_bottom = tuple(bg_cfg.get("bottom", [74, 88, 108]))
    bg = _make_vertical_gradient(REF_W, REF_H, bg_top, bg_bottom)
    bg.alpha_composite(portrait_320)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_small = OUT_DIR / f"{char_id}_creator_ref_40x48.png"
    out_full = OUT_DIR / f"{char_id}_creator_ref.png"
    out_profile = OUT_DIR / f"{char_id}_creator_color_profile.json"
    portrait_40.save(out_small)
    bg.save(out_full)
    if palette:
        payload = {
            "source_sprite": spec.get("source_sprite"),
            "palette": palette,
            "manual_palette_config": manual_cfg,
            "resolved_swaps": {
                "skin_tones": skin_tones,
                "shirt_tones": shirt_tones,
                "headcloth_tones": headcloth_tones,
                "guan_hat_colors": [list(guan_hat_colors[0]), list(guan_hat_colors[1])],
                "headscarf_colors": [list(headscarf_colors[0]), list(headscarf_colors[1])],
                "bg_gradient": {"top": list(bg_top), "bottom": list(bg_bottom)},
            },
        }
        out_profile.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return out_small, out_full


def main() -> None:
    specs = _char_specs()
    for char_id, spec in specs.items():
        out_small, out_full = build_reference(char_id, spec)
        print(f"[ok] {char_id}: {out_small.relative_to(PROJECT_ROOT)}")
        print(f"[ok] {char_id}: {out_full.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()

import os
import sys
import argparse
import torch
import shutil
from PIL import Image

# --- MAC MEMORY OPTIMIZATION ---
os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"

# --- SURGICAL STANDALONE PATCH ---
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

from diffusers import StableDiffusionImg2ImgPipeline
from model_paths import resolve_sd_model_path

# --- Configuration ---
MODEL_PATH = str(resolve_sd_model_path())
INPUT_DIR = "assets/portraits/source_raw"
OUTPUT_DIR = "assets/portraits/generated"
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"

TARGET_W = 40
TARGET_H = 48
GEN_W = 320
GEN_H = 384

# --- Character Database ---
YOUNG_CHARS = [
    "cao-pi", "sun-quan", "lu-xun", "zhou-yu", "zhao-yun", "guan-ping", 
    "guan-xing", "zhang-bao", "ma-chao", "jiang-wei", "sun-ce", "ling-tong",
    "diaochan", "zhen-ji", "sun-shangxiang", "da-qiao", "xiao-qiao", "lu-bu", "zhuge-liang"
]

ELDERLY_CHARS = [
    "huang-zhong", "yan-yan", "qiao-xuan", "lu-zhi", "wang-yun", "dong-zhuo"
]

# Character-specific physical traits from lore
CHAR_FEATURES = {
    "liu-bei": "long earlobes, virtuous expression",
    "guan-yu": "long flowing beard, majestic phoenix eyes",
    "zhang-fei": "bristly beard, wide round eyes, fierce and wild",
    "diaochan": "incredibly beautiful, elegant features",
    "lu-bu": "handsome, powerful, ornate feathered headgear",
    "zhuge-liang": "refined scholar, holding feather fan",
    "cao-cao": "ambitious gaze, sharp refined features",
    "dong-zhuo": "greedy expression, corpulent features",
    "zhou-jing": "authoritative magistrate, refined beard",
}

def get_age_gender_features(filename):
    fn = filename.lower().replace(".png", "")
    
    # Gender
    gender = "woman" if any(f in fn for f in ["female", "diaochan", "zhen-ji", "sun-shangxiang", "da-qiao", "xiao-qiao", "zhu-rong"]) else "man"
    
    # Age
    age = "adult"
    if any(y in fn for y in YOUNG_CHARS):
        age = "young"
    elif any(e in fn for e in ELDERLY_CHARS):
        age = "elderly"
        
    # Specific Features
    feature_text = ""
    for key, value in CHAR_FEATURES.items():
        if key in fn:
            feature_text = f"{value}, "
            break
            
    return age, gender, feature_text

def load_pipeline():
    print(f"Loading model from {MODEL_PATH}...")
    try:
        pipe = StableDiffusionImg2ImgPipeline.from_single_file(
            MODEL_PATH,
            load_safety_checker=False,
            torch_dtype=torch.float32,
            use_safetensors=True
        )
        if DEVICE == "mps":
            pipe.enable_attention_slicing()
        pipe.to(DEVICE)
        pipe.safety_checker = None
        from diffusers import EulerAncestralDiscreteScheduler
        pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
        return pipe
    except Exception as e:
        print(f"Failed to load model: {e}")
        return None

def process_portrait(
    pipe,
    filename,
    input_path_override=None,
    output_path_override=None,
    prompt_override=None,
    negative_prompt_override=None,
    strength_override=None,
    guidance_override=None,
    steps_override=None,
):
    input_path = input_path_override or os.path.join(INPUT_DIR, filename)
    name_clean = filename.replace("-generic", "").replace(".png", "").replace("-", " ")
    
    age, gender, features = get_age_gender_features(filename)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"--- Processing: {name_clean} ({age} {gender}) ---")
    
    init_image = Image.open(input_path).convert("RGB")
    init_image = init_image.resize((GEN_W, GEN_H), Image.NEAREST)
    
    age_keywords = ""
    negative_age = ""
    if age == "young":
        age_keywords = "youthful, smooth skin, clear face,"
        negative_age = "wrinkles, old, aged, weathered face, deep lines, beard, mustache, facial hair,"
    elif age == "elderly":
        age_keywords = "elderly, weathered, wrinkled, aged,"
        negative_age = "young, smooth skin,"
    else:
        age_keywords = "mature,"
        negative_age = "childish, extreme wrinkles,"

    # Final refined prompt:
    eye_prompt = "distinct high-contrast eyes with visible whites and dark black pupils"
    strength = 0.30 if strength_override is None else float(strength_override)  # The safe remaster sweet spot
    guidance = 7.5 if guidance_override is None else float(guidance_override)
    steps = 20 if steps_override is None else int(steps_override)

    prompt = prompt_override or f"pixel art portrait of Chinese Han Dynasty {age} {gender} {name_clean}, {features} {age_keywords} {eye_prompt}, distinct nose and mouth, proportionate facial features, sharp crisp outlines, cleaned up, refined, consistent palette, sharp pixels, 16-bit style"
    negative_prompt = negative_prompt_override or f"blurry, low quality, photographic, realistic, gradient, 3d render, soft, smooth, fuzzy outlines, merged nose and mouth, short face, distorted anatomy, {negative_age} changed face, different character"
    
    try:
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=init_image,
            strength=strength, 
            guidance_scale=guidance, 
            num_inference_steps=steps
        ).images[0]
        
        final_image = image.resize((TARGET_W, TARGET_H), Image.NEAREST)
        output_path = output_path_override or os.path.join(OUTPUT_DIR, filename)
        final_image.save(output_path)
        print(f"  SUCCESS! Saved to {output_path}")
        return True
    except Exception as e:
        print(f"  Generation error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Generate portrait(s) with local RetroDiffusion img2img.")
    parser.add_argument("target_name", nargs="?", default=None, help="Optional character filename substring (legacy behavior).")
    parser.add_argument("--input-ref", dest="input_ref", default=None, help="Path to custom img2img reference image.")
    parser.add_argument("--output", dest="output_path", default=None, help="Output portrait path for single custom run.")
    parser.add_argument("--prompt-file", dest="prompt_file", default=None, help="Text file containing prompt.")
    parser.add_argument("--negative-prompt-file", dest="negative_prompt_file", default=None, help="Text file containing negative prompt.")
    parser.add_argument("--strength", dest="strength", type=float, default=None, help="Img2img strength override.")
    parser.add_argument("--guidance", dest="guidance", type=float, default=None, help="Guidance scale override.")
    parser.add_argument("--steps", dest="steps", type=int, default=None, help="Inference steps override.")
    args = parser.parse_args()

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    pipe = load_pipeline()
    if not pipe: return

    prompt_override = None
    negative_prompt_override = None
    if args.prompt_file:
        with open(args.prompt_file, "r", encoding="utf-8") as f:
            prompt_override = f.read().strip()
    if args.negative_prompt_file:
        with open(args.negative_prompt_file, "r", encoding="utf-8") as f:
            negative_prompt_override = f.read().strip()

    # One-off custom run: use explicit reference/prompt/output but preserve model pipeline from this script.
    if args.input_ref:
        output_path = args.output_path or os.path.join(OUTPUT_DIR, "custom_portrait.png")
        success = process_portrait(
            pipe,
            filename=os.path.basename(output_path),
            input_path_override=args.input_ref,
            output_path_override=output_path,
            prompt_override=prompt_override,
            negative_prompt_override=negative_prompt_override,
            strength_override=args.strength,
            guidance_override=args.guidance,
            steps_override=args.steps,
        )
        print(f"\nFinished! Successfully processed {1 if success else 0}/1 portrait.")
        return

    # Get list of all input files
    all_input_files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".png")]
    all_input_files.sort()
    
    # Check if a specific character name was provided as an argument
    target_name = args.target_name.lower() if args.target_name else None
    
    if target_name:
        # Filter files that contain the target name (e.g. "liu-bei" matches "Liu-Bei.png")
        files = [f for f in all_input_files if target_name in f.lower()]
        if not files:
            print(f"No portrait found matching '{target_name}' in {INPUT_DIR}")
            return
        print(f"Generating matching portrait(s): {', '.join(files)}")
    else:
        # Default: Process everything
        files = all_input_files
        print(f"Generating {len(files)} final remastered portraits (Strength 0.30).")
    
    success_count = 0
    for i, f in enumerate(files):
        if DEVICE == "mps":
            torch.mps.empty_cache()
            
        if process_portrait(
            pipe,
            f,
            prompt_override=prompt_override,
            negative_prompt_override=negative_prompt_override,
            strength_override=args.strength,
            guidance_override=args.guidance,
            steps_override=args.steps,
        ):
            success_count += 1
            
    print(f"\nFinished! Successfully processed {success_count}/{len(files)} portraits.")

if __name__ == "__main__":
    main()

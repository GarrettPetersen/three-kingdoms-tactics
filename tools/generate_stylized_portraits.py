import os
import sys
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

# --- Configuration ---
MODEL_PATH = "/Users/garrettpetersen/Image Gen Models/RetroDiffusion24x-64xModel.safetensors"
INPUT_DIR = "assets/portraits/snes_raw"
OUTPUT_DIR = "assets/portraits/stylized"
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"

TARGET_W = 40
TARGET_H = 48
GEN_W = 320
GEN_H = 384

# --- Character Database ---
YOUNG_CHARS = [
    "cao-pi", "sun-quan", "lu-xun", "zhou-yu", "zhao-yun", "guan-ping", 
    "guan-xing", "zhang-bao", "ma-chao", "jiang-wei", "sun-ce", "ling-tong",
    "diaochan", "zhen-ji", "sun-shangxiang", "da-qiao", "xiao-qiao"
]

ELDERLY_CHARS = [
    "huang-zhong", "yan-yan", "qiao-xuan", "lu-zhi", "wang-yun", "dong-zhuo"
]

def get_age_and_gender(filename):
    fn = filename.lower().replace(".png", "")
    
    # Gender
    gender = "woman" if any(f in fn for f in ["female", "diaochan", "zhen-ji", "sun-shangxiang", "da-qiao", "xiao-qiao", "zhu-rong"]) else "man"
    
    # Age
    if any(y in fn for y in YOUNG_CHARS):
        return "young", gender
    if any(e in fn for e in ELDERLY_CHARS):
        return "elderly", gender
    return "adult", gender

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

def process_portrait(pipe, filename):
    input_path = os.path.join(INPUT_DIR, filename)
    name_clean = filename.replace("-generic", "").replace(".png", "").replace("-", " ")
    
    age, gender = get_age_and_gender(filename)
    
    print(f"--- Processing: {name_clean} ({age} {gender}) ---")
    
    init_image = Image.open(input_path).convert("RGB")
    init_image = init_image.resize((GEN_W, GEN_H), Image.NEAREST)
    
    # Custom keywords for age
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

    # STYLIZED PROMPT: Added "cartoon, stylized, simplified"
    prompt = f"pixel art portrait of Chinese Han Dynasty {age} {gender} {name_clean}, cartoon, stylized, simplified, {age_keywords} distinct high-contrast eyes with visible whites, distinct nose and mouth, proportionate facial features, sharp crisp outlines, cleaned up, refined, consistent palette, sharp pixels, 16-bit snes style"
    negative_prompt = f"blurry, low quality, photographic, realistic, gradient, 3d render, soft, smooth, fuzzy outlines, merged nose and mouth, short face, distorted anatomy, detailed realism, hyper-realistic, {negative_age} changed face, different character"
    
    try:
        # Strength 0.35 might be better for "stylized" to allow more change
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=init_image,
            strength=0.35, 
            guidance_scale=8.0, # Higher guidance for more stylization
            num_inference_steps=20
        ).images[0]
        
        final_image = image.resize((TARGET_W, TARGET_H), Image.NEAREST)
        
        output_path = os.path.join(OUTPUT_DIR, filename)
        final_image.save(output_path)
        print(f"  SUCCESS! Saved to {output_path}")
        return True
    except Exception as e:
        print(f"  Generation error: {e}")
        return False

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    pipe = load_pipeline()
    if not pipe:
        return

    # Process test characters
    test_chars = ["Cao-Pi.png", "Cai-Mao.png", "Liu-Bei.png", "Guan-Yu.png", "Zhang-Fei.png"]
    
    print(f"Generating stylized test portraits (Strength 0.35).")
    
    success_count = 0
    for f in test_chars:
        if DEVICE == "mps":
            torch.mps.empty_cache()
            
        if process_portrait(pipe, f):
            success_count += 1
            
    print(f"\nFinished! Successfully generated {success_count}/{len(test_chars)} stylized test portraits in {OUTPUT_DIR}.")

if __name__ == "__main__":
    main()




import os
import shutil

# --- Configuration ---
RAW_DIR = "assets/portraits/snes_raw"

# Character name mapping: (Filename in raw) -> (Internal name used in code)
CHARACTER_MAP = {
    "Liu-Bei.png": "Liu-Bei.png",
    "Guan-Yu.png": "Guan-Yu.png",
    "Zhang-Fei.png": "Zhang-Fei.png",
    "Diaochan.png": "Diaochan.png",
    "Zou-Jing-generic-converted.png": "Zou-Jing.png",
    "Deng-Ai.png": "Deng-Mao.png", # Using Deng Ai as placeholder for Deng Mao
    "Cheng-Yu.png": "Cheng-Yuanzhi.png", # Using Cheng Yu as placeholder
}

def rename_for_game():
    for raw_name, game_name in CHARACTER_MAP.items():
        src = os.path.join(RAW_DIR, raw_name)
        dst = os.path.join(RAW_DIR, game_name)
        
        if os.path.exists(src):
            if src == dst:
                print(f"Skipping identical: {game_name}")
                continue
            print(f"Creating link: {raw_name} -> {game_name}")
            shutil.copy(src, dst)
        else:
            print(f"Warning: {src} not found.")

if __name__ == "__main__":
    rename_for_game()

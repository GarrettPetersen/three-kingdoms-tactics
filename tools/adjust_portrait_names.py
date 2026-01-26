import os

# --- Configuration ---
PORTRAITS_DIR = "assets/portraits/snes_raw"

# Mapping of (Incorrect/Atypical) -> (Correct/Common)
# We use hyphens to match the filename pattern
RENAMES = {
    "Chou-Sen": "Diaochan",
    "Dong-Tuno": "Dongtuna",
    "Guan-Chun": "Min-Chun",
    "Han-Ze": "Kan-Ze",
    "Huang-Zhu": "Huang-Zu",
    "Jia-Xue": "Jia-Xu",
    "Jinhuan-Jie": "Jinhuansanjie",
    "Li-Yi": "Li-Yiqi",
    "Liu-Chan": "Liu-Shan",
    "Liu-Yong": "Liu-Yao",
    "Niou-Jin": "Niu-Jin",
    "Shamo-Ke": "King-Shamoke",
    "Shang-Long": "Xiang-Chong",
    "Wen-Pin": "Wen-Ping",
    "Wu-Anquo": "Wu-Anguo",
    "Yang-Kai": "Yong-Kai",
    "Yi-Ji": "Yi-Ji", # As requested, though looks identical
    "Yuan-Pu": "Yan-Pu",
    "Yue-Jiou": "Yue-Jiu",
    "Zhang-Xiou": "Zhang-Xiu",
    "Zhuge-Luo": "Zhuge-Ke",
}

def adjust_names():
    if not os.path.exists(PORTRAITS_DIR):
        print(f"Error: Directory {PORTRAITS_DIR} not found.")
        return

    files = os.listdir(PORTRAITS_DIR)
    rename_count = 0

    for old_prefix, new_prefix in RENAMES.items():
        # Look for files that start with the old prefix (ignoring case for safety)
        for filename in files:
            if filename.lower().startswith(old_prefix.lower()):
                # Preserve the rest of the filename (e.g. -generic.png)
                # find where the old_prefix ends
                suffix = filename[len(old_prefix):]
                new_filename = new_prefix + suffix
                
                old_path = os.path.join(PORTRAITS_DIR, filename)
                new_path = os.path.join(PORTRAITS_DIR, new_filename)
                
                print(f"Renaming: {filename} -> {new_filename}")
                os.rename(old_path, new_path)
                rename_count += 1

    print(f"Finished! Applied {rename_count} name adjustments.")

if __name__ == "__main__":
    adjust_names()




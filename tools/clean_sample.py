import os
import sys
import subprocess
import shutil

# --- Configuration ---
VENV_PYTHON = "./tools/venv_uvr/bin/python3"
DEMUCS_BIN = "./tools/venv_uvr/bin/demucs"
INPUT_DIR = "assets/voice_samples/movies/raw"
OUTPUT_DIR = "assets/voice_samples/movies/clean"


def clean_sample(filename):
    input_path = os.path.join(INPUT_DIR, filename)
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"--- Cleaning: {filename} ---")
    print("Running Demucs AI separation (this may take a minute)...")

    # Run Demucs
    # --two-stems=vocals creates 'vocals' and 'no_vocals'
    # -d cpu for compatibility (Mac Silicon can use mps but cpu is safer for first run)
    result = subprocess.run(
        [DEMUCS_BIN, "--two-stems=vocals", "-o", "tools/temp_separation", input_path]
    )

    if result.returncode != 0:
        print("Error: Demucs failed.")
        return

    # Find the resulting vocal file
    # Demucs output structure: tools/temp_separation/htdemucs/[filename_no_ext]/vocals.wav
    name_no_ext = os.path.splitext(filename)[0]
    vocal_source = os.path.join(
        "tools/temp_separation", "htdemucs", name_no_ext, "vocals.wav"
    )

    if os.path.exists(vocal_source):
        output_filename = f"clean_{name_no_ext}.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.copy(vocal_source, output_path)
        print(f"SUCCESS! Cleaned vocals saved to: {output_path}")

        # Cleanup temp files
        shutil.rmtree("tools/temp_separation")
    else:
        print(f"Error: Could not find separated vocal file at {vocal_source}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tools/clean_sample.py [filename_in_assets_voice_samples]")
        sys.exit(1)

    clean_sample(sys.argv[1])

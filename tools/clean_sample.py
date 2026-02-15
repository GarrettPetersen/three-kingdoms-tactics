import os
import sys
import subprocess
import shutil

# --- Configuration ---
VENV_PYTHON = "./tools/venv_uvr/bin/python3"
DEMUCS_BIN = "./tools/venv_uvr/bin/demucs"
INPUT_DIR = "assets/voice_samples/movies/raw"
OUTPUT_DIR = "assets/voice_samples/movies/clean"


def clean_sample(filepath):
    # Support both relative paths (e.g., "mandarin/raw/file.mp3") and filenames
    if "/" in filepath:
        # Full path provided
        input_path = os.path.join("assets/voice_samples", filepath)
        # Determine output directory from input path
        parts = filepath.split("/")
        if len(parts) >= 2:
            lang_or_type = parts[0]  # e.g., "mandarin" or "movies"
            output_dir = f"assets/voice_samples/{lang_or_type}/clean"
        else:
            output_dir = OUTPUT_DIR
    else:
        # Just filename, use default directories
        input_path = os.path.join(INPUT_DIR, filepath)
        output_dir = OUTPUT_DIR
    
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = os.path.basename(filepath)
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
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"Normalizing volume and saving to: {output_path}")
        # Use ffmpeg to normalize volume (loudnorm) and convert to wav
        # I=-16 is a standard loudness for speech
        result = subprocess.run([
            "ffmpeg", "-i", vocal_source,
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-y", output_path
        ], capture_output=True)

        if result.returncode != 0:
            print(f"Error: FFmpeg normalization failed: {result.stderr.decode('utf-8')}")
            # Fallback to copy if normalization fails
            shutil.copy(vocal_source, output_path)
        else:
            print(f"SUCCESS! Cleaned and normalized vocals saved to: {output_path}")

        # Cleanup temp files
        shutil.rmtree("tools/temp_separation")
    else:
        print(f"Error: Could not find separated vocal file at {vocal_source}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tools/clean_sample.py [filename_or_path]")
        print("  Examples:")
        print("    python tools/clean_sample.py mandarin/raw/deep_male_mandarin.mp3")
        print("    python tools/clean_sample.py clean_li-shang-captain-from-mulan.wav")
        sys.exit(1)

    clean_sample(sys.argv[1])

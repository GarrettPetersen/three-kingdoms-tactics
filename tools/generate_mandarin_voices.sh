#!/bin/bash
# Script to generate Mandarin voice lines
# First cleans the Mandarin samples, then extracts Chinese text and generates voices

set -e  # Exit on error, but we'll handle individual failures

echo "=== Step 1: Cleaning Mandarin voice samples ==="
cd "$(dirname "$0")/.."

# Clean all Mandarin samples
for file in assets/voice_samples/mandarin/raw/*.mp3; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Cleaning: $filename"
        python3 tools/clean_sample.py "mandarin/raw/$filename" || echo "Warning: Failed to clean $filename, continuing..."
    fi
done

echo ""
echo "=== Step 2: Extracting Chinese voice lines ==="
EXTRACT_LANG=zh python3 tools/extract_voice_lines.py

echo ""
echo "=== Step 3: Generating Mandarin voices ==="
VOICE_LANG=zh ./tools/venv_xtts/bin/python3.11 tools/generate_voices_xtts.py

echo ""
echo "=== Done! Mandarin voices generated in public/assets/audio/voices/zh/ ==="


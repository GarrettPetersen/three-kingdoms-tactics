#!/usr/bin/env python3
"""
Verify voice lines by running speech-to-text (Whisper) on generated audio
and comparing to the original text.
"""

import os
import json
import whisper
from jiwer import wer

# Paths
VOICES_DIR = "assets/audio/voices"
REPORT_FILE = "voice_verification_report.json"

# Import the game script from generate_voices_xtts.py
from generate_voices_xtts import game_script, VOICE_SAMPLES

# WER threshold for marking as bad
WER_THRESHOLD = 0.3  # 30% word error rate


def load_whisper_model():
    """Load the Whisper model (using 'base' for speed, 'medium' for accuracy)"""
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    print("Model loaded!")
    return model


def transcribe_audio(model, audio_path):
    """Transcribe an audio file using Whisper"""
    try:
        result = model.transcribe(audio_path, language="en")
        return result["text"].strip()
    except Exception as e:
        print(f"Error transcribing {audio_path}: {e}")
        return ""


def calculate_wer(original, transcribed):
    """Calculate Word Error Rate between original and transcribed text"""
    if not original or not transcribed:
        return 0.0
    
    # Normalize texts for comparison
    original_clean = original.lower().strip()
    transcribed_clean = transcribed.lower().strip()
    
    # Remove punctuation for WER calculation
    import re
    original_clean = re.sub(r'[^\w\s]', '', original_clean)
    transcribed_clean = re.sub(r'[^\w\s]', '', transcribed_clean)
    
    if not original_clean:
        return 0.0
    
    try:
        return wer(original_clean, transcribed_clean)
    except Exception as e:
        print(f"Error calculating WER: {e}")
        return 0.0


def check_for_duplicates(lines):
    """Check for duplicate voice IDs with different text"""
    seen_ids = {}
    duplicates = []
    for line in lines:
        line_id = line['id']
        line_text = line['text']
        if line_id in seen_ids:
            if seen_ids[line_id] != line_text:
                duplicates.append({
                    'id': line_id,
                    'text1': seen_ids[line_id],
                    'text2': line_text
                })
        else:
            seen_ids[line_id] = line_text
    return duplicates


def verify_all_voices():
    """Verify all voice files and generate report"""
    
    # Check for duplicates first
    duplicates = check_for_duplicates(game_script)
    if duplicates:
        print("\n" + "=" * 60)
        print("ERROR: Duplicate voice IDs with different text detected!")
        print("=" * 60)
        for dup in duplicates:
            print(f"\nID: {dup['id']}")
            print(f"  Text 1: \"{dup['text1'][:60]}...\"" if len(dup['text1']) > 60 else f"  Text 1: \"{dup['text1']}\"")
            print(f"  Text 2: \"{dup['text2'][:60]}...\"" if len(dup['text2']) > 60 else f"  Text 2: \"{dup['text2']}\"")
        print("\nFix these duplicates before verifying voices!")
        import sys
        sys.exit(1)
    
    model = load_whisper_model()
    report = {}
    
    total = len(game_script)
    bad_count = 0
    
    for i, line in enumerate(game_script):
        line_id = line["id"]
        character = line["char"]
        original_text = line["text"]
        
        audio_path = os.path.join(VOICES_DIR, f"{line_id}.ogg")
        
        print(f"[{i+1}/{total}] Verifying: {line_id}...")
        
        if not os.path.exists(audio_path):
            print(f"  WARNING: Audio file not found: {audio_path}")
            report[line_id] = {
                "character": character,
                "original_text": original_text,
                "stt_output": "",
                "wer": 1.0,
                "is_bad": True,
                "error": "File not found"
            }
            bad_count += 1
            continue
        
        # Transcribe
        stt_output = transcribe_audio(model, audio_path)
        
        # Calculate WER
        error_rate = calculate_wer(original_text, stt_output)
        is_bad = error_rate > WER_THRESHOLD
        
        if is_bad:
            bad_count += 1
            print(f"  BAD (WER={error_rate:.2f})")
            print(f"    Original: {original_text}")
            print(f"    STT:      {stt_output}")
        
        report[line_id] = {
            "character": character,
            "original_text": original_text,
            "stt_output": stt_output,
            "wer": error_rate,
            "is_bad": is_bad
        }
    
    # Save report
    with open(REPORT_FILE, "w") as f:
        json.dump(report, f, indent=4)
    
    print(f"\n{'='*60}")
    print(f"Verification complete!")
    print(f"Total lines: {total}")
    print(f"Bad lines (WER > {WER_THRESHOLD*100:.0f}%): {bad_count}")
    print(f"Report saved to: {REPORT_FILE}")
    
    return report


def verify_single(line_id):
    """Verify a single voice line"""
    model = load_whisper_model()
    
    # Find the line in game_script
    line = next((l for l in game_script if l["id"] == line_id), None)
    if not line:
        print(f"Line ID '{line_id}' not found in game_script")
        return None
    
    audio_path = os.path.join(VOICES_DIR, f"{line_id}.ogg")
    if not os.path.exists(audio_path):
        print(f"Audio file not found: {audio_path}")
        return None
    
    stt_output = transcribe_audio(model, audio_path)
    error_rate = calculate_wer(line["text"], stt_output)
    
    print(f"Line ID: {line_id}")
    print(f"Character: {line['char']}")
    print(f"Original: {line['text']}")
    print(f"STT:      {stt_output}")
    print(f"WER:      {error_rate:.2f}")
    print(f"Status:   {'BAD' if error_rate > WER_THRESHOLD else 'OK'}")
    
    return {
        "stt_output": stt_output,
        "wer": error_rate,
        "is_bad": error_rate > WER_THRESHOLD
    }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Verify specific line
        verify_single(sys.argv[1])
    else:
        # Verify all lines
        verify_all_voices()


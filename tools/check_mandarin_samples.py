#!/usr/bin/env python3
"""
Check the language of voice samples in the mandarin folder using Whisper.
This will detect if files are actually Mandarin or if they're Japanese/other languages.
"""

import os
from pathlib import Path
from faster_whisper import WhisperModel

# Path to mandarin voice samples
MANDARIN_RAW_DIR = "assets/voice_samples/mandarin/raw"

def check_languages():
    """Check the language of all files in the mandarin raw folder"""
    print("Loading Whisper model...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    
    raw_dir = Path(MANDARIN_RAW_DIR)
    if not raw_dir.exists():
        print(f"Error: Directory not found: {raw_dir}")
        return
    
    audio_files = list(raw_dir.glob("*.mp3")) + list(raw_dir.glob("*.wav")) + list(raw_dir.glob("*.ogg"))
    
    if not audio_files:
        print(f"No audio files found in {raw_dir}")
        return
    
    print(f"\nFound {len(audio_files)} audio file(s). Checking languages...\n")
    print("=" * 80)
    
    results = []
    for audio_file in sorted(audio_files):
        print(f"\nChecking: {audio_file.name}")
        print("-" * 80)
        
        try:
            # Transcribe with language detection
            segments, info = model.transcribe(str(audio_file), language=None)  # None = auto-detect
            detected_language = info.language
            language_probability = info.language_probability
            
            # Get transcription
            text = " ".join([segment.text for segment in segments]).strip()
            
            print(f"  Detected Language: {detected_language} (confidence: {language_probability:.2%})")
            print(f"  Transcription: {text[:100]}{'...' if len(text) > 100 else ''}")
            
            # Check if it's actually Mandarin
            is_mandarin = detected_language in ['zh', 'zh-cn', 'zh-tw']
            status = "✓ MANDARIN" if is_mandarin else f"✗ NOT MANDARIN (detected: {detected_language})"
            print(f"  Status: {status}")
            
            results.append({
                'file': audio_file.name,
                'detected_language': detected_language,
                'confidence': language_probability,
                'is_mandarin': is_mandarin,
                'transcription': text
            })
            
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({
                'file': audio_file.name,
                'error': str(e)
            })
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    mandarin_count = sum(1 for r in results if r.get('is_mandarin', False))
    non_mandarin = [r for r in results if not r.get('is_mandarin', True) and 'error' not in r]
    
    print(f"\nTotal files: {len(results)}")
    print(f"Mandarin: {mandarin_count}")
    print(f"Non-Mandarin: {len(non_mandarin)}")
    
    if non_mandarin:
        print("\n⚠️  NON-MANDARIN FILES DETECTED:")
        for r in non_mandarin:
            print(f"  - {r['file']}: {r['detected_language']} (confidence: {r['confidence']:.2%})")
    
    return results


if __name__ == "__main__":
    check_languages()






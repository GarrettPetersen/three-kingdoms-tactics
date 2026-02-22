#!/usr/bin/env python3
"""
Extract voice lines from game data files (JS) to keep voice generation in sync.

This script parses JavaScript files to find all dialogue entries with voiceId fields,
extracts the text, and outputs a JSON file that can be used by generate_voices_xtts.py.

Phonetic overrides can be specified in phonetic_overrides.json to adjust pronunciation
without losing track of the original text.
"""

import re
import json
import os
from pathlib import Path

# Files to scan for voice lines
SOURCE_FILES = [
    'src/data/NarrativeScripts.js',
    'src/data/Battles.js',
    'src/scenes/TacticsScene.js',
    'src/scenes/MapScene.js',
    'src/scenes/BattleSummaryScene.js',
    'src/scenes/LevelUpScene.js',
    'src/scenes/RecoveryScene.js',
    'src/main.js',
]

# Map portrait keys to character IDs for voice generation
PORTRAIT_TO_CHAR = {
    'liu-bei': 'liubei',
    'guan-yu': 'guanyu',
    'zhang-fei': 'zhangfei',
    'zhou-jing': 'zhoujing',
    'custom-male-10': 'zhangjue',
    'custom-male-12': 'zhangliang',
    'zhang-bao': 'zhangbao',
    'custom-male-17': 'gongjing',
    'custom-male-22': 'luzhi',
    'Huangfu-Song-generic': 'huangfusong',
    'Zhu-Jun-generic': 'zhujun',
    'bandit1': 'dengmao',
    'bandit2': 'chengyuanzhi',
    'dong-zhuo': 'dongzhuo',
    'peach_garden': 'narrator',
    'noticeboard': 'noticeboard',  # Noticeboard has its own voice
    'narrator': 'narrator',
}

# Fallback: if no portrait key, try to derive from name
NAME_TO_CHAR = {
    'Liu Bei': 'liubei',
    'Guan Yu': 'guanyu',
    'Zhang Fei': 'zhangfei',
    'Zhang Jue': 'zhangjue',
    'Zhang Bao': 'zhangbao',
    'Zhang Liang': 'zhangliang',
    'Zhou Jing': 'zhoujing',
    'Gong Jing': 'gongjing',
    'Protector Gong Jing': 'gongjing',
    'Lu Zhi': 'luzhi',
    'Huangfu Song': 'huangfusong',
    'Zhu Jun': 'zhujun',
    'Deng Mao': 'dengmao',
    'Cheng Yuanzhi': 'chengyuanzhi',
    'Dong Zhuo': 'dongzhuo',
    'Narrator': 'narrator',
}


def extract_voice_lines_from_file(filepath):
    """Extract all voice lines from a single JS file."""
    lines = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all voiceId occurrences
    vid_pattern = r'voiceId\s*:\s*[\'"]([^\'"]+)[\'"]'
    
    for match in re.finditer(vid_pattern, content):
        voice_id = match.group(1)
        start_pos = match.start()
        
        # Find start of object (backwards from voiceId)
        bracket_count = 0
        obj_start = -1
        for i in range(start_pos, -1, -1):
            if content[i] == '}': bracket_count += 1
            if content[i] == '{':
                if bracket_count == 0:
                    obj_start = i
                    break
                else:
                    bracket_count -= 1
        
        if obj_start == -1: continue
        
        # Find end of object (forwards from voiceId)
        bracket_count = 0
        obj_end = -1
        for i in range(start_pos, len(content)):
            if content[i] == '{': bracket_count += 1
            if content[i] == '}':
                if bracket_count == 0:
                    obj_end = i + 1
                    break
                else:
                    bracket_count -= 1
        
        if obj_end == -1: continue
        
        obj_str = content[obj_start:obj_end]
        
        # Extract text field - support both string and object formats
        # Determine which language to extract based on EXTRACT_LANG env var or default to 'en'
        lang_to_extract = os.environ.get('EXTRACT_LANG', 'en')
        
        # First try object format: text: { en: "...", zh: "..." }
        # Use word boundary to avoid matching buttonText.
        text_obj_start = re.search(r'\btext\s*:\s*\{', obj_str, re.DOTALL)
        if text_obj_start:
            # Search language keys only within/after the true text field so
            # option.buttonText does not get extracted as spoken dialogue.
            text_region = obj_str[text_obj_start.start():]
            # Try to extract the specified language - handle multiline strings with \n
            lang_key = lang_to_extract
            # Pattern: look for 'zh': or "zh": followed by the text
            # Use a more precise pattern that matches the language key and captures the text until the closing quote
            # Handle both single and double quotes
            # Pattern to match language key and extract text until closing quote
            # Try without quotes around lang_key first (actual format in JS files)
            # Then try with quotes, then single quotes
            # Use non-greedy match (.+?) to capture everything between quotes
            # Escape braces in f-string: {{ and }}
            pattern_no_quotes = rf'{lang_key}\s*:\s*"(.+?)"(?=\s*[,{{}}])'
            pattern_double = rf'"{lang_key}"\s*:\s*"(.+?)"(?=\s*[,{{}}])'
            pattern_single = rf"'{lang_key}'\s*:\s*'(.+?)'(?=\s*[,{{}}])"
            text_obj_match = re.search(pattern_no_quotes, text_region, re.DOTALL)
            if not text_obj_match:
                text_obj_match = re.search(pattern_double, text_region, re.DOTALL)
            if not text_obj_match:
                text_obj_match = re.search(pattern_single, text_region, re.DOTALL)
            
            if text_obj_match:
                text = text_obj_match.group(1)
                # Handle escaped newlines - convert \n to actual newlines for multiline text
                text = text.replace('\\n', '\n')
                # Handle escaped quotes
                text = text.replace('\\"', '"').replace("\\'", "'")
            else:
                # Fallback: if requested language not found, try 'en'
                if lang_to_extract != 'en':
                    pattern_en_no_quotes = r'en\s*:\s*"(.+?)"(?=\s*[,}])'
                    pattern_en_double = r'"en"\s*:\s*"(.+?)"(?=\s*[,}])'
                    text_obj_match = re.search(pattern_en_no_quotes, text_region, re.DOTALL)
                    if not text_obj_match:
                        text_obj_match = re.search(pattern_en_double, text_region, re.DOTALL)
                    if text_obj_match:
                        text = text_obj_match.group(1)
                        text = text.replace('\\n', '\n')
                        text = text.replace('\\"', '"').replace("\\'", "'")
                    else:
                        text = None
                else:
                    text = None
        else:
            # Fall back to string format: text: "..."
            text_match = re.search(r'\btext\s*:\s*[\'"](.+?)[\'"](?:\s*[,}])', obj_str, re.DOTALL)
            if not text_match:
                # Try escaped quotes or other formats
                text_match = re.search(r'text\s*:\s*[\'"](.+?)[\'"]', obj_str, re.DOTALL)
            if text_match:
                text = text_match.group(1)
            else:
                print(f"  Warning: No text found for voiceId '{voice_id}' in {filepath}")
                continue
        
        # Skip if text is None
        if text is None:
            print(f"  Warning: Text is None for voiceId '{voice_id}' in {filepath}")
            continue
        
        # Clean up escaped characters
        text = text.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
        
        # Extract character from portraitKey, speaker, or name
        char = None
        
        # Try speaker field first
        speaker_match = re.search(r'speaker\s*:\s*[\'"]([^\'"]+)[\'"]', obj_str)
        if speaker_match:
            char = speaker_match.group(1)
        
        # Try portraitKey
        if not char:
            portrait_match = re.search(r'portraitKey\s*:\s*[\'"]([^\'"]+)[\'"]', obj_str)
            if portrait_match:
                portrait_key = portrait_match.group(1)
                char = PORTRAIT_TO_CHAR.get(portrait_key, portrait_key.replace('-', ''))
        
        # Try name as fallback
        if not char:
            name_match = re.search(r'name\s*:\s*[\'"]([^\'"]+)[\'"]', obj_str)
            if name_match:
                name = name_match.group(1)
                char = NAME_TO_CHAR.get(name, name.lower().replace(' ', ''))
        
        # Check for narrator type
        if not char:
            type_match = re.search(r'type\s*:\s*[\'"]narrator[\'"]', obj_str)
            if type_match:
                char = 'narrator'
        
        # Try to infer character from voiceId prefix
        if not char or char == 'unknown':
            vid_parts = voice_id.split('_')
            char_abbrev_map = {
                'lb': 'liubei', 'gy': 'guanyu', 'zf': 'zhangfei',
                'zj': 'zhoujing', 'gj': 'gongjing', 'lz': 'luzhi',
                'dz': 'dongzhuo', 'nar': 'narrator', 'nb': 'noticeboard',  # noticeboard uses its own voice
                'yt': 'yellowturban', 'dm': 'dengmao', 'cyz': 'chengyuanzhi',
            }
            for part in vid_parts:
                if part in char_abbrev_map:
                    char = char_abbrev_map[part]
                    break
        
        if not char:
            char = 'unknown'
        
        lines.append({
            'id': voice_id,
            'char': char,
            'text': text,
            'source': os.path.basename(filepath)
        })
    
    return lines


def load_phonetic_overrides(filepath):
    """Load phonetic overrides from JSON file."""
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def main():
    project_root = Path(__file__).parent.parent
    
    all_lines = []
    seen_ids = set()
    
    print("Extracting voice lines from game data files...")
    
    for source_file in SOURCE_FILES:
        filepath = project_root / source_file
        if not filepath.exists():
            print(f"  Skipping (not found): {source_file}")
            continue
            
        print(f"  Scanning: {source_file}")
        lines = extract_voice_lines_from_file(filepath)
        
        for line in lines:
            if line['id'] in seen_ids:
                # Skip duplicates (same voiceId in multiple places)
                continue
            seen_ids.add(line['id'])
            all_lines.append(line)
    
    # Sort by voiceId for consistency
    all_lines.sort(key=lambda x: x['id'])
    
    # Load phonetic overrides (only apply for English - they're pronunciation guides for English names)
    # Phonetic overrides are English-specific pronunciation guides (e.g., "Leeoo Bay" for "Liu Bei")
    # They should not be applied to other languages
    lang_to_extract = os.environ.get('EXTRACT_LANG', 'en')
    if lang_to_extract == 'en':
        overrides_file = project_root / 'tools' / 'phonetic_overrides.json'
        overrides = load_phonetic_overrides(overrides_file)
        
        # Apply overrides only for English
        for line in all_lines:
            if line['id'] in overrides:
                line['phonetic_text'] = overrides[line['id']]
    
    # Output
    # Use language-specific filename to avoid overwriting different language extractions
    lang_to_extract = os.environ.get('EXTRACT_LANG', 'en')
    if lang_to_extract != 'en':
        output_file = project_root / 'tools' / f'extracted_voice_lines_{lang_to_extract}.json'
    else:
        output_file = project_root / 'tools' / 'extracted_voice_lines.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_lines, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtracted {len(all_lines)} voice lines for language: {lang_to_extract}")
    print(f"Saved to: {output_file}")
    
    print(f"\nExtracted {len(all_lines)} voice lines to {output_file}")
    
    # Also output a summary
    chars = {}
    for line in all_lines:
        char = line['char']
        chars[char] = chars.get(char, 0) + 1
    
    print("\nVoice lines by character:")
    for char, count in sorted(chars.items(), key=lambda x: -x[1]):
        print(f"  {char}: {count}")
    
    # Check for missing lines in current voice files (check in 'en' subfolder)
    voices_dir = project_root / 'public' / 'assets' / 'audio' / 'voices' / 'en'
    if voices_dir.exists():
        existing = set(f.stem for f in voices_dir.glob('*.ogg'))
        extracted = set(line['id'] for line in all_lines)
        
        missing = extracted - existing
        orphaned = existing - extracted
        
        if missing:
            print(f"\nMissing voice files ({len(missing)}):")
            for vid in sorted(missing)[:10]:
                print(f"  {vid}")
            if len(missing) > 10:
                print(f"  ... and {len(missing) - 10} more")
        
        if orphaned:
            print(f"\nOrphaned voice files (no matching voiceId in game data) ({len(orphaned)}):")
            for vid in sorted(orphaned)[:10]:
                print(f"  {vid}")
            if len(orphaned) > 10:
                print(f"  ... and {len(orphaned) - 10} more")


if __name__ == '__main__':
    main()


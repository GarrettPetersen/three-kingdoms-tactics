import os
import sys
import subprocess
import string
import hashlib

try:
    import whisper
except ImportError:
    whisper = None  # Optional dependency
import json
from pathlib import Path

try:
    from jiwer import wer
except ImportError:
    wer = None  # Optional dependency
try:
    from TTS.api import TTS
except ImportError:
    TTS = None  # Optional dependency
try:
    from pydub import AudioSegment
    from pydub.silence import split_on_silence
except ImportError:
    AudioSegment = None  # Optional dependency

# --- Configuration ---
# Use the Python 3.11 virtual environment we just set up
PROJECT_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = "./tools/venv_xtts/bin/python3.11"
OUTPUT_DIR = "public/assets/audio/voices"
# LANGUAGE is set above when determining EXTRACTED_LINES_FILE
TARGETS_DIR = "public/assets/voice_samples"
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
REPORT_FILE = "voice_verification_report.json"  # Will be language-specific: voice_verification_report_{lang}.json
# Language-specific extracted lines file
LANGUAGE = os.environ.get("VOICE_LANG", "en")  # Current language for voice generation
if LANGUAGE != "en":
    EXTRACTED_LINES_FILE = f"tools/extracted_voice_lines_{LANGUAGE}.json"
else:
    EXTRACTED_LINES_FILE = "tools/extracted_voice_lines.json"
VOICE_SETTINGS_FILE = "tools/voice_settings.json"
PHONETIC_OVERRIDES_FILE = "tools/phonetic_overrides.json"

# Map characters to target wav/mp3 files for cloning in assets/voice_samples/
CHAR_TARGETS = {
    "liubei": "movies/clean/clean_li-shang-captain-from-mulan.wav",
    "zhangfei": "movies/clean/clean_kublai-khan.wav",
    "guanyu": "movies/clean/clean_master_xehanort.wav",
    "zhoujing": "movies/clean/clean_mulans-dad.wav",
    "chengyuanzhi": "movies/clean/clean_anton-ego-villainous-food-critic.wav",
    "dengmao": "movies/clean/clean_mulan-emperor.wav",
    "yellowturban": "movies/clean/clean_kublai-khan.wav",  # Aggressive warrior voice (shared with zhangfei, dongzhuo, zhangbao)
    "narrator": "movies/clean/clean_uncle-iroh.wav",
    "noticeboard": "movies/clean/clean_mulan-emperor.wav",  # Authoritative voice (shared with dengmao, luzhi, zhangliang)
    "volunteer": "movies/clean/clean_dark_riku_young_adult.wav",  # Young, earnest volunteer voice
    "gongjing": "movies/clean/clean_anton-ego-villainous-food-critic.wav",
    "luzhi": "movies/clean/clean_mulan-emperor.wav",
    "huangfusong": "movies/clean/clean_mulan-emperor.wav",
    "zhujun": "movies/clean/clean_anton-ego-villainous-food-critic.wav",
    "yanzheng": "movies/clean/clean_brash_australian_man.wav",
    "hejin": "movies/clean/clean_thanos_deep_villain.wav",  # Middle-aged, powerful court voice
    "panyin": "movies/clean/clean_mulans-dad.wav",  # Urgent but grounded official
    "yuanshao": "movies/clean/clean_brash_australian_man.wav",  # Confident aristocratic hawk
    "eunuch": "movies/clean/clean_disney_hades.wav",  # Slippery palace functionary
    "eunuchguard": "movies/clean/clean_master_xehanort.wav",  # Cold palace enforcer
    "xiaoer": "movies/clean/clean_dark_riku_young_adult.wav",  # Distinct young inn/game player voice
    "dongzhuo": "movies/clean/clean_kublai-khan.wav",  # Gruff and arrogant
    "caocao": "movies/clean/clean_thanos_deep_villain.wav",  # Deep, commanding contrast vs guanyu
    "caoren": "movies/clean/clean_hercules_young_adult_hero.wav",  # Cao Ren's original fallback voice
    "zhangjue": "movies/clean/clean_anton-ego-villainous-food-critic.wav",  # Villainous, commanding
    "zhangbao": "movies/clean/clean_kublai-khan.wav",  # Aggressive, warrior-like
    "zhangliang": "movies/clean/clean_mulan-emperor.wav",  # Authoritative, imperial
    "sunjian": "movies/clean/clean_large_vaguely_russian_man.wav",  # Tough commander in his prime
    "soldier": "movies/clean/clean_devious_adult_male.wav",  # Stern common soldier voice
    "soldierv2": "movies/clean/clean_dark_riku_young_adult.wav",  # Alternate young soldier
    "soldierv3": "movies/clean/clean_angry-mulans-dad.wav",  # Older anxious soldier
    "farmer": "movies/clean/clean_mulans-dad.wav",  # Older male villager voice
    "farmer2": "movies/clean/clean_anna_frozen_young_adult_woman.wav",  # Female villager voice
    "default": "movies/clean/clean_hercules_young_adult_hero.wav",  # Younger fallback voice for unmapped speakers
}

# Map characters to Mandarin voice samples
# Available Mandarin voices:
# - deep_male_mandarin (deep, authoritative)
# - young_adult_female_mandarin (young female)
# - bipolar_male_mandarin (expressive male)
# - gruff_mature_male_mandarin (rough, warrior-like)
# - mature_yet_jovial_male_mandarin (wise, cheerful)
# - serious_female_mandarin (serious, commanding)
# - serious_male_mandarin (serious, authoritative)
# - young_adult_male_mandarin (young male)
CHAR_TARGETS_MANDARIN = {
    "liubei": "mandarin/clean/clean_serious_male_mandarin.wav",  # Serious, noble
    "zhangfei": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Gruff, warrior
    "guanyu": "mandarin/clean/clean_deep_male_mandarin.wav",  # Deep, authoritative
    "zhoujing": "mandarin/clean/clean_mature_yet_jovial_male_mandarin.wav",  # Wise, friendly
    "chengyuanzhi": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Villainous (shared)
    "dengmao": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative (shared)
    "yellowturban": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Aggressive (shared)
    "narrator": "mandarin/clean/clean_calm_baritone_male_mandarin.wav",  # Calm, baritone narrator
    "noticeboard": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative (shared)
    "volunteer": "mandarin/clean/clean_bipolar_male_mandarin.wav",  # Young, expressive
    "gongjing": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative (shared)
    "luzhi": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative (shared)
    "huangfusong": "mandarin/clean/clean_serious_male_mandarin.wav",  # Commanding imperial general
    "zhujun": "mandarin/clean/clean_deep_male_mandarin.wav",  # Veteran field commander
    "yanzheng": "mandarin/clean/clean_bipolar_male_mandarin.wav",  # Rebel subordinate turning on Zhang Bao
    "hejin": "mandarin/clean/clean_villainous_middle_aged_male_mandarin.wav",  # Powerful middle-aged court voice
    "panyin": "mandarin/clean/clean_calm_wise_male_mandarin.wav",  # Calm warning voice
    "yuanshao": "mandarin/clean/clean_bipolar_male_mandarin.wav",  # Forceful aristocratic hawk
    "eunuch": "mandarin/clean/clean_grandiose_male_mandarin.wav",  # Palace functionary
    "eunuchguard": "mandarin/clean/clean_fearsome_elder_male_mandarin.wav",  # Cold palace enforcer
    "xiaoer": "mandarin/clean/clean_young_adult_male_mandarin.wav",  # Distinct inn/game player voice
    "dongzhuo": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Gruff, arrogant (shared)
    "caocao": "mandarin/clean/clean_deep_male_mandarin.wav",  # Cool-headed strategist
    "caoren": "mandarin/clean/clean_serious_male_mandarin.wav",  # Cao Ren's original fallback voice
    "zhangjue": "mandarin/clean/clean_fearsome_elder_male_mandarin.wav",  # Fearsome, commanding elder
    "zhangbao": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Aggressive (shared)
    "zhangliang": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative (shared)
    "sunjian": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Tough frontline commander
    "soldier": "mandarin/clean/clean_young_adult_male_mandarin.wav",  # Young soldier
    "soldierv2": "mandarin/clean/clean_bipolar_male_mandarin.wav",  # Alternate young soldier
    "soldierv3": "mandarin/clean/clean_gruff_mature_male_mandarin.wav",  # Older anxious soldier
    "farmer": "mandarin/clean/clean_mature_yet_jovial_male_mandarin.wav",  # Common villager
    "farmer2": "mandarin/clean/clean_young_adult_female_mandarin.wav",  # Female villager
    "default": "mandarin/clean/clean_serious_male_mandarin.wav",  # Authoritative fallback
}

# --- Initialize ---
# Models will be loaded lazily only when needed (after checking if there are lines to generate)
tts = None
stt_model = None
_SOURCE_PATH_CACHE = {}
VOICE_HASH_VERSION = 1


def project_relative_path(path):
    """Return a compact path for logs."""
    try:
        return str(Path(path).resolve().relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def resolve_project_path(path_value):
    """Resolve a stored relative path from the project root."""
    path = Path(path_value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path


def resolve_line_source_path(line):
    """Find the JS source file that owns a voice line."""
    source_path = line.get("source_path") or line.get("sourcePath")
    if source_path:
        path = resolve_project_path(source_path)
        if path.exists():
            return path

    source_name = line.get("source")
    if not source_name:
        return None

    if source_name in _SOURCE_PATH_CACHE:
        return _SOURCE_PATH_CACHE[source_name]

    matches = list((PROJECT_ROOT / "src").rglob(source_name))
    path = matches[0] if len(matches) == 1 else None
    _SOURCE_PATH_CACHE[source_name] = path
    return path


def voice_hash_manifest_path(lang_code):
    return PROJECT_ROOT / "tools" / f"voice_line_hashes_{lang_code}.json"


def load_voice_hash_manifest(lang_code):
    path = voice_hash_manifest_path(lang_code)
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return {}
    return data if isinstance(data, dict) else {}


def voice_target_filename(character, lang_code):
    char_key = character.lower().replace(" ", "")
    if lang_code == "zh":
        return CHAR_TARGETS_MANDARIN.get(char_key, CHAR_TARGETS_MANDARIN["default"])
    return CHAR_TARGETS.get(char_key, CHAR_TARGETS["default"])


def voice_line_hash(line, lang_code):
    payload = {
        "version": VOICE_HASH_VERSION,
        "language": lang_code,
        "id": line["id"],
        "character": line["char"],
        "text": line["text"],
        "original_text": line.get("original_text", line["text"]),
        "speed": line.get("speed", 1.0),
        "emotion": line.get("emotion"),
        "phonetic_text": line.get("phonetic_text"),
        "voice_target": voice_target_filename(line["char"], lang_code),
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def voice_hash_entry(line, lang_code):
    return {
        "hash": voice_line_hash(line, lang_code),
        "version": VOICE_HASH_VERSION,
        "character": line["char"],
        "text": line.get("original_text", line["text"]),
        "voice_target": voice_target_filename(line["char"], lang_code),
    }


def save_voice_hash_manifest(voice_lines, lang_code):
    manifest = {}
    for line in voice_lines:
        output_ogg = Path(OUTPUT_DIR) / lang_code / f"{line['id']}.ogg"
        if output_ogg.exists() and output_ogg.stat().st_size > 0:
            manifest[line["id"]] = voice_hash_entry(line, lang_code)

    path = voice_hash_manifest_path(lang_code)
    existing = load_voice_hash_manifest(lang_code)
    if existing == manifest:
        return
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")


def verification_report_path(lang_code):
    return Path(f"voice_verification_report_{lang_code}.json")


def load_verification_report(lang_code):
    path = verification_report_path(lang_code)
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return {}
    return data if isinstance(data, dict) else {}


def save_verification_report(lang_code, report):
    path = verification_report_path(lang_code)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4, ensure_ascii=False)
        f.write("\n")


def report_metadata_entry(line, lang_code):
    return {
        "id": line["id"],
        "character": line["char"],
        "original_text": line.get("original_text", line["text"]),
        "voice_target": voice_target_filename(line["char"], lang_code),
        "language": lang_code,
    }


def metadata_only_report_entry(line, lang_code):
    return {
        **report_metadata_entry(line, lang_code),
        "stt_output": "",
        "wer": None,
        "is_bad": False,
        "verification_status": "metadata_only",
    }


def sync_verification_report_metadata(voice_lines, lang_code, report=None):
    report = report if report is not None else load_verification_report(lang_code)

    changed = False
    for line in voice_lines:
        unique_key = f"{lang_code}:{line['id']}"
        existing = report.get(unique_key)
        if not isinstance(existing, dict):
            output_ogg = Path(OUTPUT_DIR) / lang_code / f"{line['id']}.ogg"
            if output_ogg.exists() and output_ogg.stat().st_size > 0:
                report[unique_key] = metadata_only_report_entry(line, lang_code)
                changed = True
            continue

        for key, value in report_metadata_entry(line, lang_code).items():
            if existing.get(key) != value:
                existing[key] = value
                changed = True

    if changed:
        save_verification_report(lang_code, report)
    return report


def voice_file_generation_status(line, lang_code, hash_manifest=None):
    """Decide whether a voice line needs audio generated or regenerated."""
    output_ogg = Path(OUTPUT_DIR) / lang_code / f"{line['id']}.ogg"
    hash_manifest = hash_manifest or {}

    if not output_ogg.exists():
        return {"needs_generation": True, "reason": "missing", "details": "no audio file"}

    audio_stat = output_ogg.stat()
    if audio_stat.st_size == 0:
        return {"needs_generation": True, "reason": "empty", "details": "0-byte audio file"}

    stored = hash_manifest.get(line["id"])
    if not stored:
        return {
            "needs_generation": True,
            "reason": "untracked",
            "details": "no voice generation manifest entry",
        }

    expected_target = voice_target_filename(line["char"], lang_code)
    if isinstance(stored, dict):
        stored_character = stored.get("character")
        if stored_character and stored_character != line["char"]:
            return {
                "needs_generation": True,
                "reason": "stale",
                "details": f"voice character changed from {stored_character} to {line['char']}",
            }

        stored_target = stored.get("voice_target")
        if not stored_target:
            return {
                "needs_generation": True,
                "reason": "stale",
                "details": "voice target not recorded",
            }
        if stored_target != expected_target:
            return {
                "needs_generation": True,
                "reason": "stale",
                "details": f"voice target changed from {stored_target} to {expected_target}",
            }

    stored_hash = stored.get("hash") if isinstance(stored, dict) else stored
    if not stored_hash:
        return {
            "needs_generation": True,
            "reason": "stale",
            "details": "generation hash not recorded",
        }

    current_hash = voice_line_hash(line, lang_code)
    if stored_hash != current_hash:
        return {
            "needs_generation": True,
            "reason": "stale",
            "details": "line generation hash changed",
        }

    return {"needs_generation": False, "reason": "current", "details": ""}


def load_models():
    """Load TTS and Whisper models. Called only when we actually need to generate voices."""
    global tts, stt_model
    if tts is not None:
        return  # Already loaded

    print("Loading XTTS v2 model (this may take a long time on first run)...")
    # You must accept the Coqui TTS terms of service
    os.environ["COQUI_TOS_AGREED"] = "1"

    try:
        # Use CPU for Intel Mac. If you have a GPU, change to "cuda"
        tts = TTS(MODEL_NAME).to("cpu")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load TTS model: {e}")
        sys.exit(1)

    print("Loading Whisper model for verification...")
    if whisper:
        stt_model = whisper.load_model("base")
    else:
        stt_model = None


def load_voice_lines_from_extracted():
    """
    Load voice lines from the extracted JSON file (generated by extract_voice_lines.py).
    This ensures voice generation uses the actual text from the game data files.
    """
    if not os.path.exists(EXTRACTED_LINES_FILE):
        print(f"WARNING: {EXTRACTED_LINES_FILE} not found!")
        print(
            "Run 'python tools/extract_voice_lines.py' first to extract lines from game data."
        )
        return []

    with open(EXTRACTED_LINES_FILE, "r", encoding="utf-8") as f:
        lines = json.load(f)

    # Load voice settings (speed, emotion overrides)
    settings = {}
    if os.path.exists(VOICE_SETTINGS_FILE):
        with open(VOICE_SETTINGS_FILE, "r", encoding="utf-8") as f:
            settings = json.load(f)

    # Load phonetic overrides
    phonetic_overrides = {}
    if os.path.exists(PHONETIC_OVERRIDES_FILE):
        with open(PHONETIC_OVERRIDES_FILE, "r", encoding="utf-8") as f:
            phonetic_overrides = json.load(f)

    # Merge settings into lines
    result = []
    for line in lines:
        line_id = line["id"]
        entry = {
            "id": line_id,
            "char": line["char"],
            "text": line.get(
                "phonetic_text", line["text"]
            ),  # Use phonetic if available
            "original_text": line["text"],  # Keep original for reference
        }

        for metadata_key in ("source", "source_path", "sourcePath"):
            if metadata_key in line:
                entry[metadata_key] = line[metadata_key]

        voice_dependencies = []

        # Apply phonetic overrides from external file
        # Only apply phonetic overrides for English (they're English pronunciation guides)
        # For other languages, use the original text
        if line_id in phonetic_overrides and LANGUAGE == "en":
            entry["text"] = phonetic_overrides[line_id]
            voice_dependencies.append(PHONETIC_OVERRIDES_FILE)

        # Apply per-line settings
        if line_id in settings:
            s = settings[line_id]
            if "speed" in s:
                entry["speed"] = s["speed"]
            if "emotion" in s:
                entry["emotion"] = s["emotion"]
            if "phonetic_text" in s:
                entry["text"] = s["phonetic_text"]
            voice_dependencies.append(VOICE_SETTINGS_FILE)

        if voice_dependencies:
            entry["voice_dependencies"] = voice_dependencies

        result.append(entry)

    return result


def verify_audio(audio_path, expected_text, lang_code="en"):
    print(f"  Verifying audio quality (language: {lang_code})...")
    try:
        # Transcribe (Whisper handles wav/ogg/mp3)
        # Use language parameter for better accuracy
        result = stt_model.transcribe(audio_path, language=lang_code)
        transcribed_text = result["text"].strip()
        original_text = expected_text.strip()

        # Cleanup punctuation for comparison
        table = str.maketrans("", "", string.punctuation)
        transcribed_clean = transcribed_text.lower().translate(table)
        original_clean = original_text.lower().translate(table)

        # Calculate Word Error Rate (WER)
        error_rate = wer(original_clean, transcribed_clean)

        print(f'    Transcribed: "{transcribed_text}"')
        print(f"    WER: {error_rate:.2f}")

        # Use more lenient threshold for Mandarin (0.7) vs English (0.4)
        # Mandarin transcription can vary more due to character recognition differences
        wer_threshold = 0.7 if lang_code == "zh" else 0.4

        return {
            "transcribed": transcribed_text,
            "wer": error_rate,
            "is_bad": error_rate > wer_threshold,
            "language": lang_code,
        }
    except Exception as e:
        print(f"    Verification error: {e}")
        return {"error": str(e), "is_bad": True, "language": lang_code}


def trim_long_pauses(audio_path, max_pause_ms=300):
    """Detects pauses longer than max_pause_ms and trims them down to that length."""
    print(f"  Trimming long pauses (max {max_pause_ms}ms)...")
    try:
        audio = AudioSegment.from_file(audio_path)

        # Split on silence
        # min_silence_len: how long silence needs to be to be considered a 'pause'
        # silence_thresh: dB below average to be considered silence
        chunks = split_on_silence(
            audio,
            min_silence_len=250,
            silence_thresh=audio.dBFS - 16,
            keep_silence=100,  # Keep a bit of silence on each end of chunks
        )

        if not chunks:
            return  # Nothing to do

        # Recombine chunks
        combined = AudioSegment.empty()
        for i, chunk in enumerate(chunks):
            combined += chunk
            # Add a small normalized silence between chunks if not the last chunk
            if i < len(chunks) - 1:
                combined += AudioSegment.silent(duration=150)

        combined.export(audio_path, format="wav")
    except Exception as e:
        print(f"    Trimming error: {e}")


def convert_to_ogg(input_wav, output_ogg):
    """Convert wav to ogg using ffmpeg with libopus codec (more stable than native vorbis)."""
    print(f"  Converting to OGG: {output_ogg}")
    try:
        # Using libopus for better stability and quality in OGG container
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_wav,
                "-ac",
                "2",
                "-c:a",
                "libopus",
                "-b:a",
                "64k",
                output_ogg,
            ],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"    FFmpeg error: {result.stderr.decode('utf-8')}")
            return False
        return True
    except Exception as e:
        print(f"    Conversion error: {e}")
        return False


def generate_voice(
    line_id,
    character,
    text,
    speed=1.0,
    emotion=None,
    phonetic_text=None,
    lang_code="en",
    force=False,
    regeneration_reason=None,
):
    # Create language subdirectory if it doesn't exist
    lang_dir = os.path.join(OUTPUT_DIR, lang_code)
    os.makedirs(lang_dir, exist_ok=True)
    output_ogg = os.path.join(lang_dir, f"{line_id}.ogg")
    temp_wav = f"temp_{line_id}.wav"

    verification_result = None

    if os.path.exists(output_ogg):
        # Skip if file exists and has content
        if os.path.getsize(output_ogg) > 0:
            if force:
                if regeneration_reason:
                    print(f"Regenerating stale file: {line_id} ({regeneration_reason})")
                else:
                    print(f"Regenerating stale file: {line_id}")
            else:
                # Already exists - skip entirely (no re-processing)
                return None
        else:
            print(f"Regenerating 0-byte file: {line_id}")

    char_key = character.lower().replace(" ", "")
    # Select appropriate voice targets based on language
    if lang_code == "zh":
        target_filename = CHAR_TARGETS_MANDARIN.get(
            char_key, CHAR_TARGETS_MANDARIN["default"]
        )
        tts_language = "zh"
    else:
        target_filename = CHAR_TARGETS.get(char_key, CHAR_TARGETS["default"])
        tts_language = "en"

    target_path = os.path.join(TARGETS_DIR, target_filename)

    if not os.path.exists(target_path):
        print(f"ERROR: Reference voice for '{character}' not found at '{target_path}'.")
        sys.exit(1)

    # Use phonetic text for generation if provided, but verify against original text
    gen_text = phonetic_text if phonetic_text else text
    print(f"\n[{line_id}] Generating (XTTS): {character} -> {line_id} [{lang_code}]")
    if phonetic_text:
        print(f'  Using phonetic override: "{phonetic_text}"')

    try:
        # Generate high quality audio using cloning
        tts.tts_to_file(
            text=gen_text,
            speaker_wav=target_path,
            language=tts_language,
            file_path=temp_wav,
            speed=speed,
            emotion=emotion,
            temperature=0.75,
            repetition_penalty=2.0,
            top_k=50,
            top_p=0.85,
        )

        # Trim excessive pauses
        trim_long_pauses(temp_wav)

        # Verify quality before converting
        verification_result = verify_audio(temp_wav, text, lang_code)

        # Convert to OGG using our fixed converter
        if not convert_to_ogg(temp_wav, output_ogg):
            raise Exception("FFmpeg conversion failed")

        if os.path.exists(temp_wav):
            os.remove(temp_wav)

    except Exception as e:
        print(f"CRITICAL ERROR generating {line_id}: {e}")
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
        sys.exit(1)

    return verification_result


# FULL GAME SCRIPT
game_script = [
    # --- Daxing Briefing (main.js) ---
    {
        "id": "daxing_zj_01",
        "char": "zhoujing",
        "text": "Who goes there? These men behind you... they have the look of tigers. You do not look like common recruits.",
    },
    {
        "id": "daxing_lb_01",
        "char": "liubei",
        "text": "I am Liu Bei, a descendant of Prince Jing of Zhongshan and great-great-grandson of Emperor Jing. These are my sworn brothers, Guan Yu and Zhang Fei.",
        "phonetic_text": "I am Leeoo Bay. A descendant of Prince Jing of Zhongshan and great great grandson of Emperor Jing. These are my sworn brothers, Guan Yoo and Zhang Fay.",
    },
    {
        "id": "daxing_lb_02",
        "char": "liubei",
        "text": "We have raised a force of five hundred volunteers to serve our country and protect the people.",
    },
    {
        "id": "daxing_zj_02",
        "char": "zhoujing",
        "text": "An Imperial kinsman with a true heart! Truly, the Heavens have not abandoned the Han. Your arrival is most timely.",
        "phonetic_text": "Ahn Imperial kinsman with a true heart. Truly, the Heavens have not abandoned the Han. Your arrival is most timely.",
    },
    {
        "id": "daxing_lb_choice_01",
        "char": "liubei",
        "text": "The people cry out for justice. We cannot stand idle.",
    },
    {
        "id": "daxing_lb_choice_02",
        "char": "liubei",
        "text": "We seek glory in service to the Han.",
    },
    {
        "id": "daxing_zj_02_alt",
        "char": "zhoujing",
        "text": "An Imperial kinsman! Your ambition serves the Han well. Your arrival is most timely.",
    },
    {
        "id": "daxing_zj_03",
        "char": "zhoujing",
        "text": "Scouts report that the rebel general Cheng Yuanzhi is marching upon us with fifty thousand Yellow Turbans.",
    },
    {
        "id": "daxing_zf_01",
        "char": "zhangfei",
        "text": "Fifty thousand? Hah! They are but a mob of ants! Give us the order, Magistrate, and we shall scatter them like dust!",
        "speed": 0.9,
    },
    {
        "id": "daxing_gy_01",
        "char": "guanyu",
        "text": "Third brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march.",
    },
    {
        "id": "daxing_lb_03",
        "char": "liubei",
        "text": "Magistrate Zhou, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion.",
    },
    {
        "id": "daxing_lb_choice_03",
        "char": "liubei",
        "text": "Fifty thousand rebels? We three alone could handle them!",
    },
    {
        "id": "daxing_gy_choice_01",
        "char": "guanyu",
        "text": "Brother, your courage is admirable, but even heroes need strategy. Let us work with the magistrate.",
    },
    {
        "id": "daxing_zj_04",
        "char": "zhoujing",
        "text": "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Cheng Yuanzhi's army!",
    },
    # --- Prologue Noticeboard (MapScene.js) ---
    {
        "id": "pro_nb_01",
        "char": "noticeboard",
        "text": "NOTICE: The Yellow Turban rebels under Zhang Jue have risen!",
    },
    {
        "id": "pro_nb_02",
        "char": "noticeboard",
        "text": "All able-bodied men are called to defend the Han.",
    },
    {
        "id": "pro_nb_03",
        "char": "noticeboard",
        "text": "Report to the local Magistrate at once.",
    },
    {
        "id": "pro_lb_01",
        "char": "liubei",
        "text": "The Imperial Clan's blood flows in my veins...",
    },
    {
        "id": "pro_lb_02",
        "char": "liubei",
        "text": "...yet I am but a poor straw-shoe seller.",
    },
    {
        "id": "pro_lb_03",
        "char": "liubei",
        "text": "How can I possibly save the people from this chaos?",
    },
    {
        "id": "pro_zf_01",
        "char": "zhangfei",
        "text": "Why sigh, O hero, if you do not help your country?",
    },
    {
        "id": "pro_lb_choice_01",
        "char": "liubei",
        "text": "I sigh for the suffering people.",
    },
    {
        "id": "pro_lb_choice_02",
        "char": "liubei",
        "text": "I sigh for my own lost status.",
    },
    {
        "id": "pro_zf_02",
        "char": "zhangfei",
        "text": "A true hero's heart! You and I are of one mind.",
    },
    {
        "id": "pro_zf_03",
        "char": "zhangfei",
        "text": "Status? Bah! In these times of chaos, only courage and wine matter!",
        "speed": 0.9,
    },
    {
        "id": "pro_zf_04",
        "char": "zhangfei",
        "text": "I am Zhang Fei, also known as Yide.",
    },
    {
        "id": "pro_zf_05",
        "char": "zhangfei",
        "text": "I live in this county, where I have a farm. I sell wine and slaughter hogs.",
    },
    {
        "id": "pro_lb_04",
        "char": "liubei",
        "text": "I am of the Imperial Clan. My name is Liu Bei.",
        "phonetic_text": "I am of the Imperial Clan. My name is Leeoo Bay.",
    },
    {
        "id": "pro_lb_05",
        "char": "liubei",
        "text": "I wish I could destroy these rebels and restore peace...",
    },
    {
        "id": "pro_zf_06",
        "char": "zhangfei",
        "text": "I have some wealth! I am willing to use it to recruit volunteers.",
    },
    {
        "id": "pro_zf_07",
        "char": "zhangfei",
        "text": "What say you to that?",
        "phonetic_text": "What say you, to that?",
    },
    {
        "id": "pro_lb_06",
        "char": "liubei",
        "text": "That would be a great blessing for the people!",
    },
    {
        "id": "pro_zf_08",
        "char": "zhangfei",
        "text": "Then come! Let us go to the village inn and discuss our plans over wine.",
    },
    # --- Map Reminders ---
    {
        "id": "map_lb_rem_01",
        "char": "liubei",
        "text": "Off to the Magistrate! Magistrate Zhou Jing's H-Q awaits our enlistment.",
    },
    {
        "id": "map_lb_rem_02",
        "char": "liubei",
        "text": "Qingzhou is under siege. We must march there at once to relieve Imperial Protector Gong Jing!",
    },
    {
        "id": "map_lb_rem_03",
        "char": "liubei",
        "text": "The siege is lifted. We should return to the Magistrate to see where else we can be of service.",
    },
    # --- Inn Scene (MapScene.js) ---
    {
        "id": "inn_zf_01",
        "char": "zhangfei",
        "text": "This wine is good! Together, we shall raise an army that will make the rebels tremble.",
        "speed": 1.1,
    },
    {"id": "inn_lb_01", "char": "liubei", "text": "Indeed. Honor and duty call us."},
    {
        "id": "inn_gy_01",
        "char": "guanyu",
        "text": "Quick! Bring me wine! I am in a hurry to get to town and join the volunteers!",
    },
    {
        "id": "inn_lb_02a",
        "char": "liubei",
        "text": "That man...",
        "phonetic_text": "That man.",
    },
    {
        "id": "inn_lb_02b",
        "char": "liubei",
        "text": "His presence is extraordinary. Look at his majestic beard and phoenix-like eyes.",
    },
    {
        "id": "inn_zf_02",
        "char": "zhangfei",
        "text": "Hey! You there! You're joining the volunteers too? Come, drink with us!",
        "speed": 1.1,
    },
    {
        "id": "inn_gy_02",
        "char": "guanyu",
        "text": "I am Guan Yu, courtesy name Yunchang. For years I have been a fugitive, for I slew a local bully who oppressed the weak.",
    },
    {
        "id": "inn_gy_03",
        "char": "guanyu",
        "text": "Now I hear there is a call for volunteers, and I have come to join the cause.",
    },
    {
        "id": "inn_lb_03",
        "char": "liubei",
        "text": "A noble heart! I am Liu Bei, and this is Zhang Fei. We have just agreed to raise a volunteer army ourselves.",
        "phonetic_text": "A noble heart! I am Leeoo Bay. And this is Zhang Fay. We have just agreed to raise a volunteer army ourselves.",
    },
    {
        "id": "inn_zf_03",
        "char": "zhangfei",
        "text": "Haha! The more the merrier! Drink, Yunchang! Let us toast to our new brotherhood!",
        "speed": 1.2,
    },
    {
        "id": "inn_zf_04",
        "char": "zhangfei",
        "text": "...and that is why the pig escaped! Haha! But seriously, my friends...",
        "speed": 1.3,
    },
    {
        "id": "inn_zf_05",
        "char": "zhangfei",
        "text": "I feel as though I have known you both for a lifetime.",
        "speed": 1.3,
    },
    {
        "id": "inn_gy_04",
        "char": "guanyu",
        "text": "The heavens have surely brought us together. We share one mind and one purpose.",
    },
    {
        "id": "inn_lb_04",
        "char": "liubei",
        "text": "To restore the Han and bring peace to the common people. That is our shared destiny.",
    },
    {
        "id": "inn_zf_06",
        "char": "zhangfei",
        "text": "Listen! Behind my farm is a peach garden. The flowers are in full bloom.",
        "speed": 1.2,
    },
    {
        "id": "inn_zf_07",
        "char": "zhangfei",
        "text": "Tomorrow, let us offer sacrifices there and swear to be brothers! To live and die as one!",
        "speed": 1.2,
    },
    {
        "id": "inn_lb_05",
        "char": "liubei",
        "text": "An excellent proposal. We shall do it!",
    },
    {
        "id": "inn_gy_05",
        "char": "guanyu",
        "text": "I agree... We swear by the peach garden.",
    },
    # --- Peach Garden Oath (MapScene.js) ---
    {
        "id": "pg_nar_01",
        "char": "narrator",
        "text": "In the peach garden, among the blooming flowers, a black ox and a white horse are sacrificed.",
    },
    {
        "id": "pg_lb_01",
        "char": "liubei",
        "text": "We three, Liu Bei, Guan Yu, and Zhang Fei, though of different lineages, swear brotherhood and promise mutual help to one end.",
    },
    {
        "id": "pg_gy_01",
        "char": "guanyu",
        "text": "We will rescue each other in difficulty; we will aid each other in danger.",
    },
    {
        "id": "pg_zf_01",
        "char": "zhangfei",
        "text": "We swear to serve the state and save the people.",
    },
    {
        "id": "pg_lb_02",
        "char": "liubei",
        "text": "We ask not the same day of birth, but we seek to die together on the same day.",
    },
    {
        "id": "pg_lb_03",
        "char": "liubei",
        "text": "May the Heaven and the Earth read our hearts. If we turn aside from righteousness, may the Heaven and the Human smite us!",
    },
    {
        "id": "pg_nar_02",
        "char": "narrator",
        "text": "The ritual complete, Liu Bei is acknowledged as the eldest brother, Guan Yu the second, and Zhang Fei the youngest.",
    },
    {
        "id": "pg_lb_04",
        "char": "liubei",
        "text": "The path ahead is long and full of peril, but together, we shall restore the Han!",
    },
    # --- Recruiting (MapScene.js) ---
    {
        "id": "rec_zf_01",
        "char": "zhangfei",
        "text": "CITIZENS OF ZHUO! The Yellow Turbans are coming! Who among you is brave enough to fight for your homes?",
    },
    {
        "id": "rec_gy_01",
        "char": "guanyu",
        "text": "We offer no riches, only the chance to serve with honor under the banner of Liu Bei.",
    },
    {
        "id": "rec_vol_01",
        "char": "volunteer",
        "text": "We have heard of your brotherhood! We are but simple men, but we will follow you to the death!",
    },
    {
        "id": "rec_lb_01",
        "char": "liubei",
        "text": "Welcome, brothers. Today we are but a few, but tomorrow we shall be an army.",
    },
    {
        "id": "rec_lb_02",
        "char": "liubei",
        "text": "Let us march! Our first destination: the headquarters of the local Magistrate.",
    },
    # --- Daxing Battle (TacticsScene.js) ---
    {
        "id": "dx_lb_01",
        "char": "liubei",
        "text": "The Yellow Turban vanguard is here. They seek to plunder Zhuo County!",
    },
    {
        "id": "dx_gy_01",
        "char": "guanyu",
        "text": "Their numbers are great, but they are but a rabble without leadership.",
    },
    {
        "id": "dx_zf_01",
        "char": "zhangfei",
        "text": "Let me at them! My Serpent Spear is thirsty for rebel blood!",
        "emotion": "Angry",
    },
    {
        "id": "dx_dm_01",
        "char": "dengmao",
        "text": "Imperial dogs! You dare stand in the way of the Lord of Heaven?",
        "emotion": "Angry",
    },
    {
        "id": "dx_cyz_01",
        "char": "chengyuanzhi",
        "text": "Slay them all! The Han is dead, the Yellow Heavens shall rise!",
        "emotion": "Angry",
    },
    {
        "id": "dx_lb_02",
        "char": "liubei",
        "text": "Their resolve is weak. If we defeat these captains, the rest will be turned to flight!",
        "emotion": "Surprise",
    },
    {
        "id": "dx_lb_03",
        "char": "liubei",
        "text": "They keep coming! We must defeat Deng Mao and Cheng Yuanzhi to break them!",
    },
    {"id": "dx_yt_01", "char": "yellowturban", "text": "Our leaders are dead! Run!"},
    {
        "id": "debug_narrative_01",
        "char": "narrator",
        "text": "Cheat code accepted. Narrative scene is functional.",
    },
    # --- Qingzhou Briefing (MapScene.js) ---
    {
        "id": "qz_ms_01",
        "char": "volunteer",  # Using volunteer as placeholder for messenger
        "text": "URGENT! Imperial Protector Gong Jing of Qingzhou Region is under siege! The city is near falling!",
    },
    {
        "id": "qz_lb_01",
        "char": "liubei",
        "text": "I will go. We cannot let the people of Qingzhou suffer.",
        "phonetic_text": "I will go. We cannot let the people of Qingzhou suffer.",
    },
    {
        "id": "qz_lb_choice_01",
        "char": "liubei",
        "text": "The people cry out for aid. We must answer their call at once.",
    },
    {
        "id": "qz_zf_choice_01",
        "char": "zhangfei",
        "text": "That's the spirit, brother! Let's show those rebels what we're made of!",
        "speed": 0.9,
    },
    {
        "id": "qz_vic_lb_choice_01",
        "char": "liubei",
        "text": "A fine victory, but we must remain vigilant. The city gates await us.",
    },
    {
        "id": "qz_vic_zf_choice_01",
        "char": "zhangfei",
        "text": "Right you are, eldest brother! Let's make sure the city is truly secure.",
        "speed": 0.9,
    },
    {
        "id": "qz_ret_lb_choice_01",
        "char": "liubei",
        "text": "It was an honor to serve. The people of Qingzhou can rest easy now.",
    },
    {
        "id": "qz_ret_gj_choice_01",
        "char": "gongjing",
        "text": "Your humility does you credit, but your deeds speak louder than words.",
    },
    {
        "id": "qz_ret_lb_choice_02",
        "char": "liubei",
        "text": "Commander Lu Zhi needs aid. We cannot abandon a loyal servant of the Han.",
    },
    {
        "id": "qz_ret_gy_choice_01",
        "char": "guanyu",
        "text": "A noble cause, brother. We stand with you.",
    },
    {
        "id": "inn_lb_choice_01",
        "char": "liubei",
        "text": "Your cause is just. Join us, and together we shall serve the Han.",
    },
    {
        "id": "inn_gy_choice_01",
        "char": "guanyu",
        "text": "Your words ring true. I would be honored to join your cause.",
    },
    {
        "id": "inn_lb_choice_02",
        "char": "liubei",
        "text": "We fight not for glory, but for the people who suffer under this chaos.",
    },
    {
        "id": "inn_gy_choice_02",
        "char": "guanyu",
        "text": "Spoken like a true leader. The people need men like you.",
    },
    {
        "id": "qz_zj_01",
        "char": "zhoujing",
        "text": "I shall reinforce you with five thousand of my best soldiers. March at once!",
    },
    {
        "id": "qz_lb_02",
        "char": "liubei",
        "text": "They are many and we but few. We cannot prevail in a direct assault.",
    },
    {
        "id": "qz_lb_03",
        "char": "liubei",
        "text": "Guan Yu, Zhang Fei—take half our forces and hide behind the hills. When the gongs beat, strike from the flanks!",
        "phonetic_text": "Guan Yoo, Zhang Fay. Take half our forces and hide behind the hills. When the gongs beat, strike from the flanks!",
    },
    {
        "id": "qz_gy_01",
        "char": "guanyu",
        "text": "A superior strategy, brother. We go at once.",
    },
    {
        "id": "qz_lb_amb_01",
        "char": "liubei",
        "text": "BEAT THE GONGS! Brothers, strike now!",
    },
    {
        "id": "qz_gy_surp_01",
        "char": "guanyu",
        "text": "Brother! We heard the signal was... oh. They are all fallen.",
    },
    # --- Qingzhou Battle Intro (TacticsScene.js) ---
    {
        "id": "qz_bt_lb_01",
        "char": "liubei",
        "text": "The rebels have surrounded the city. We must break their lines!",
    },
    {
        "id": "qz_bt_lb_02",
        "char": "liubei",
        "text": "But look at their numbers... we must be cautious. I will draw them toward the hills.",
    },
    {
        "id": "qz_bt_lb_03",
        "char": "liubei",
        "text": "I must reach the flag to signal the ambush!",
    },
    # --- Map Scene Reminders & Events (MapScene.js) ---
    {
        "id": "map_lb_defeat",
        "char": "liubei",
        "text": "We were overwhelmed! We must regroup and strike again.",
    },
    {
        "id": "qz_victory_lb_01",
        "char": "liubei",
        "text": "The siege is lifted. We should report back to Magistrate Zhou Jing for our next assignment.",
    },
    {
        "id": "map_lb_rem_01",
        "char": "liubei",
        "text": "Off to the Magistrate! Magistrate Zhou Jing's HQ awaits our enlistment.",
    },
    {
        "id": "map_lb_rem_02",
        "char": "liubei",
        "text": "Qingzhou is under siege. We must march there at once to relieve Imperial Protector Gong Jing!",
    },
    {
        "id": "map_lb_rem_03",
        "char": "liubei",
        "text": "The siege is lifted. We should return to the Magistrate to see where else we can be of service.",
    },
    # --- Recovery Lines ---
    {
        "id": "recov_lb_01",
        "char": "liubei",
        "text": "My apologies, brothers. I let my guard down, but my spirit remains unbroken.",
    },
    {
        "id": "recov_gy_01",
        "char": "guanyu",
        "text": "A momentary lapse in focus. I shall return to the field with renewed vigor.",
    },
    {
        "id": "recov_zf_01",
        "char": "zhangfei",
        "text": "Bah! Those rascals got a lucky hit in! Next time, they won't be so fortunate!",
    },
    # --- Qingzhou Siege Intro (TacticsScene.js) ---
    {
        "id": "qz_zf_01",
        "char": "zhangfei",
        "text": "Let's crush these vermin! My spear thirsts for rebel blood!",
        "speed": 0.9,
    },
    {
        "id": "qz_nar_01",
        "char": "narrator",
        "text": "Liu Bei rides boldly toward the rebel host, daring them to give chase...",
    },
    {
        "id": "qz_gj_01",
        "char": "gongjing",
        "text": "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered.",
    },
    {
        "id": "qz_gj_02",
        "char": "gongjing",
        "text": "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
        "phonetic_text": "Indeed. I have heard that Commander Loo Jir is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
    },
    # --- Qingzhou Victory Dialogue (NarrativeScripts.js) ---
    {
        "id": "qz_vic_zf_01",
        "char": "zhangfei",
        "text": "Look at them run! Like rats from a sinking ship! We've broken their spirit.",
        "speed": 0.9,
    },
    {
        "id": "qz_vic_gy_01",
        "char": "guanyu",
        "text": "A well-executed trap, Brother. The high ground served us well.",
    },
    {
        "id": "qz_vic_lb_01",
        "char": "liubei",
        "text": "Let us not tarry. The city is still in peril. We must return to the gates and ensure the Imperial Protector is safe.",
    },
    {
        "id": "qz_vic_nar_01",
        "char": "narrator",
        "text": "Though fierce as tigers soldiers be, Battles are won by strategy. A hero comes; he gains renown, Already destined for a crown.",
    },
    # --- Qingzhou Return Dialogue (TacticsScene.js) ---
    {
        "id": "qz_ret_gj_01",
        "char": "gongjing",
        "text": "Heroic brothers! You have saved Qingzhou! When your signal echoed through the pass, we charged from the gates. The rebels were caught between us and slaughtered.",
    },
    {
        "id": "qz_ret_lb_01",
        "char": "liubei",
        "text": "We are glad to have served, Imperial Protector. Peace is restored here, but the rebellion still rages elsewhere.",
    },
    {
        "id": "qz_ret_gj_02",
        "char": "gongjing",
        "text": "Indeed. I have heard that Commander Lu Zhi is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
        "phonetic_text": "Indeed. I have heard that Commander Loo Jir is hard-pressed at Guangzong by the chief rebel, Zhang Jue himself.",
    },
    {
        "id": "qz_ret_lb_02",
        "char": "liubei",
        "text": "Lu Zhi! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!",
        "phonetic_text": "Loo Jir! He was my teacher years ago. I cannot let him face such a horde alone. Brothers, we march for Guangzong!",
    },
    # --- Map Reminder (MapScene.js) ---
    {
        "id": "map_lb_rem_04",
        "char": "liubei",
        "text": "Commander Lu Zhi fights alone at Guangzong against the rebel horde. We must reach him before it is too late!",
        "phonetic_text": "Commander Loo Jir fights alone at Guangzong against the rebel horde. We must reach him before it is too late!",
    },
    # --- Inn Scene Additional (MapScene.js) ---
    {
        "id": "inn_lb_02",
        "char": "liubei",
        "text": "His presence is extraordinary. Look at his majestic beard and phoenix-like eyes.",
    },
    # --- Guangzong Scene (MapScene.js) - Following the novel ---
    # Scene 1: Lu Zhi arrested
    {
        "id": "gz_lb_01",
        "char": "liubei",
        "text": "What is this? Commander Lu Zhi... in chains?",
        "phonetic_text": "What is this? Commander Loo Jir... in chains?",
    },
    {
        "id": "gz_zf_01",
        "char": "zhangfei",
        "text": "This is outrage! Let me slay these dogs and free him! He is a loyal commander!",
        "speed": 0.9,
    },
    {
        "id": "gz_lb_02",
        "char": "liubei",
        "text": "Stay your hand, brother! The government will take its due course. We must not act rashly.",
    },
    {
        "id": "gz_gy_01",
        "char": "guanyu",
        "text": "Lu Zhi has been arrested. There is no point continuing to Guangzong. Let us return toward Zhuo.",
        "phonetic_text": "Loo Jir has been arrested. There is no point continuing to Guangzong. Let us return toward Zhuo.",
    },
    # Scene 2: Encountering Zhang Jue's forces
    {
        "id": "gz_nar_01",
        "char": "narrator",
        "text": "Two days later, the brothers heard the thunder of battle. From a hilltop, they beheld government soldiers in full retreat, pursued by a sea of Yellow Scarves.",
    },
    {
        "id": "gz_lb_03",
        "char": "liubei",
        "text": "That banner reads 'Zhang Jue, Lord of Heaven!' Brothers, we attack!",
    },
    {
        "id": "gz_nar_02",
        "char": "narrator",
        "text": "The three brothers dashed into Zhang Jue's army, threw his ranks into confusion, and drove him back fifteen miles.",
    },
    # Scene 3: Dong Zhuo's insult
    {
        "id": "gz_dz_01",
        "char": "dongzhuo",
        "text": "What offices do you three hold?",
    },
    {
        "id": "gz_lb_04",
        "char": "liubei",
        "text": "We hold no official positions, my lord. We are but volunteers who answered the call to arms.",
    },
    {
        "id": "gz_dz_02",
        "char": "dongzhuo",
        "text": "Hmph. Common men with no rank. You may go.",
    },
    # --- Guangzong Choice Dialogue ---
    {
        "id": "gz_lb_restrain_01",
        "char": "liubei",
        "text": "The court will have its own public judgment. How can you act rashly?",
    },
    {
        "id": "gz_lb_fight_01",
        "char": "liubei",
        "text": "Brother, we cannot stand idle while injustice is done. Free him!",
    },
    {
        "id": "gz_gy_restrain_01",
        "char": "guanyu",
        "text": "It was wise to stay your hand, brother. The law must take its course. Let us return toward Zhuo.",
    },
    {
        "id": "gz_zf_restrain_01",
        "char": "zhangfei",
        "text": "BAH! This stinks of corruption! But... I will follow your lead, eldest brother.",
        "speed": 0.9,
    },
    {
        "id": "gz_nar_restrain_01",
        "char": "narrator",
        "text": "And so the escort and the three brothers went two ways. It was useless to continue on that road to Guangzong.",
    },
    {
        "id": "gz_gy_return_01",
        "char": "guanyu",
        "text": "Let us return toward Zhuo County. There is nothing more for us here.",
    },
    {
        "id": "gz_zf_02",
        "char": "zhangfei",
        "text": "We saved that wretch in bloody battle and he treats us with contempt! Let me go back and take his head!",
        "speed": 0.9,
    },
    {
        "id": "gz_lb_05",
        "char": "liubei",
        "text": "Patience, brother. A man's worth is not measured by titles. Our day will come. Let us seek another commander who values true courage.",
    },
    # Alternate path: Freeing Lu Zhi
    {
        "id": "gz_lb_free_01",
        "char": "liubei",
        "text": "Very well. Free him, brothers!",
    },
    {
        "id": "gz_zf_free_01",
        "char": "zhangfei",
        "text": "HA! Now you're talking, brother! Come on!",
        "speed": 0.9,
    },
    {
        "id": "gz_gy_free_01",
        "char": "guanyu",
        "text": "Brother, there may be consequences for this...",
    },
    {
        "id": "gz_lb_free_02",
        "char": "liubei",
        "text": "We have made our choice. Now we fight!",
    },
    # Lu Zhi explains his situation (from the novel)
    {
        "id": "gz_lz_explain_01",
        "char": "luzhi",
        "text": "Xuande! I had the rebels surrounded and was on the point of smashing them, when Zhang Jue employed sorcery to prevent my victory.",
        "phonetic_text": "Shwan Day! I had the rebels surrounded and was on the point of smashing them, when Zhang Jway employed sorcery to prevent my victory.",
    },
    {
        "id": "gz_lz_explain_02",
        "char": "luzhi",
        "text": "The court sent Eunuch Zuo Feng to inquire. He demanded a bribe, but where could I find gold in such circumstances? He reported that I hid behind ramparts and disheartened my army.",
        "phonetic_text": "The court sent Yoonuck Zwoh Fung to inquire. He demanded a bribe, but where could I find gold in such circumstances? He reported that I hid behind ramparts and disheartened my army.",
    },
    {
        "id": "gz_lz_explain_03",
        "char": "luzhi",
        "text": "So I was superseded by Dong Zhuo, and now I go to the capital to answer false charges.",
        "phonetic_text": "So I was superseded by Dong Jwoh, and now I go to the capital to answer false charges.",
    },
    {
        "id": "gz_lz_freed_01",
        "char": "luzhi",
        "text": "Xuande! You have saved me, but at great cost. The court will brand you as rebels for attacking imperial soldiers.",
        "phonetic_text": "Shwan Day! You have saved me, but at great cost. The court will brand you as rebels for attacking imperial soldiers.",
    },
    {
        "id": "gz_lb_freed_02",
        "char": "liubei",
        "text": "Master, I could not stand by while a loyal commander was led to unjust execution.",
    },
    {
        "id": "gz_lz_freed_02",
        "char": "luzhi",
        "text": "Your loyalty does you credit, but now you must flee. I will return to Guangzong in secret. Perhaps one day, when the dynasty is restored, your name will be cleared.",
    },
    {
        "id": "gz_zf_freed_02",
        "char": "zhangfei",
        "text": "Cleared? Bah! We did what was right! Let the corrupt court call us what they will!",
        "speed": 0.9,
    },
    {
        "id": "gz_lb_freed_03",
        "char": "liubei",
        "text": "We shall continue to fight for the people, regardless of titles or recognition. That is our oath.",
    },
]

if __name__ == "__main__":
    # Try to load from extracted JSON first (preferred - stays in sync with game data)
    extracted_lines = load_voice_lines_from_extracted()

    if extracted_lines:
        print(f"\nUsing {len(extracted_lines)} voice lines from extracted game data")
        print(f"Current language: {LANGUAGE}")
        print(
            f"Expected source: tools/extracted_voice_lines.json (should be extracted with EXTRACT_LANG={LANGUAGE})"
        )
        voice_lines = extracted_lines
    else:
        # Fallback to hardcoded game_script only for English
        if LANGUAGE == "en":
            print(
                "\nFalling back to hardcoded game_script (run extract_voice_lines.py to update)"
            )
            voice_lines = game_script
        else:
            print(f"\nERROR: No extracted voice lines found for language '{LANGUAGE}'!")
            print(
                f"Please run: EXTRACT_LANG={LANGUAGE} python3 tools/extract_voice_lines.py"
            )
            print(
                "The hardcoded game_script only contains English lines and cannot be used as a fallback."
            )
            sys.exit(1)

    # Check for duplicate voice IDs with different text
    seen_ids = {}
    duplicates = []
    for line in voice_lines:
        line_id = line["id"]
        line_text = line["text"]
        if line_id in seen_ids:
            if seen_ids[line_id] != line_text:
                duplicates.append(
                    {"id": line_id, "text1": seen_ids[line_id], "text2": line_text}
                )
        else:
            seen_ids[line_id] = line_text

    if duplicates:
        print("\n" + "=" * 60)
        print("ERROR: Duplicate voice IDs with different text detected!")
        print("=" * 60)
        for dup in duplicates:
            print(f"\nID: {dup['id']}")
            print(
                f"  Text 1: \"{dup['text1'][:60]}...\""
                if len(dup["text1"]) > 60
                else f"  Text 1: \"{dup['text1']}\""
            )
            print(
                f"  Text 2: \"{dup['text2'][:60]}...\""
                if len(dup["text2"]) > 60
                else f"  Text 2: \"{dup['text2']}\""
            )
        print("\nFix these duplicates before generating voices!")
        sys.exit(1)

    # Pre-fill list of lines that need generation.
    hash_manifest = load_voice_hash_manifest(LANGUAGE)
    lines_to_generate = []
    generation_statuses = {}
    for line in voice_lines:
        status = voice_file_generation_status(line, LANGUAGE, hash_manifest)
        if status["needs_generation"]:
            lines_to_generate.append(line)
            generation_statuses[line["id"]] = status

    if len(lines_to_generate) == 0:
        save_voice_hash_manifest(voice_lines, LANGUAGE)
        sync_verification_report_metadata(voice_lines, LANGUAGE)
        print("All voice files are current. Nothing to generate.")
        sys.exit(0)

    # Only load models if we actually need to generate something
    load_models()

    print(f"=== Generating voices for language: {LANGUAGE} ===")
    print(f"Output directory: {os.path.join(OUTPUT_DIR, LANGUAGE)}")
    print(f"Need to generate {len(lines_to_generate)} voice file(s)...")
    print("\nLines to generate:")
    for line in lines_to_generate:
        status = generation_statuses[line["id"]]
        print(
            f"  - {line['id']} ({line['char']}, {status['reason']}): "
            f"\"{line['text'][:60]}{'...' if len(line['text']) > 60 else ''}\""
        )
        if status["details"]:
            print(f"    {status['details']}")
    print()

    report = {}
    for line in lines_to_generate:
        status = generation_statuses[line["id"]]
        res = generate_voice(
            line["id"],
            line["char"],
            line["text"],
            speed=line.get("speed", 1.0),
            emotion=line.get("emotion"),
            phonetic_text=line.get("phonetic_text"),
            lang_code=LANGUAGE,
            force=status["reason"] == "stale",
            regeneration_reason=status["details"],
        )
        # Use language+id as unique key since same ID can exist in multiple languages
        unique_key = f"{LANGUAGE}:{line['id']}"
        report[unique_key] = {
            "id": line["id"],
            "character": line["char"],
            "original_text": line.get("original_text", line["text"]),
            "voice_target": voice_target_filename(line["char"], LANGUAGE),
            "stt_output": res.get("transcribed", "") if res else "",
            "wer": res.get("wer", 0) if res else 0,
            "is_bad": res.get("is_bad", False) if res else False,
            "language": LANGUAGE,
        }

    # Save report - use language-specific report file
    lang_report_file = f"voice_verification_report_{LANGUAGE}.json"
    existing_report = load_verification_report(LANGUAGE)

    for unique_key, data in report.items():
        if data is not None:
            existing_report[unique_key] = data

    sync_verification_report_metadata(voice_lines, LANGUAGE, existing_report)
    save_verification_report(LANGUAGE, existing_report)
    print(f"\nVerification report updated in {lang_report_file}")
    save_voice_hash_manifest(voice_lines, LANGUAGE)

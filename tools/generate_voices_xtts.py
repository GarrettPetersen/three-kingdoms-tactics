import os
import sys
import subprocess
import string
import whisper
import json
from jiwer import wer
from TTS.api import TTS
from pydub import AudioSegment
from pydub.silence import split_on_silence

# --- Configuration ---
# Use the Python 3.11 virtual environment we just set up
VENV_PYTHON = "./tools/venv_xtts/bin/python3.11"
OUTPUT_DIR = "assets/audio/voices"
TARGETS_DIR = "assets/voice_samples"
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
REPORT_FILE = "voice_verification_report.json"

# Map characters to target wav/mp3 files for cloning in assets/voice_samples/
CHAR_TARGETS = {
    "liubei": "movies/clean/clean_li-shang-captain-from-mulan.wav",
    "zhangfei": "movies/clean/clean_kublai-khan.wav",
    "guanyu": "movies/clean/clean_angry-mulans-dad.wav",
    "zhoujing": "movies/clean/clean_mulans-dad.wav",
    "chengyuanzhi": "movies/clean/clean_uncle-iroh.wav",
    "dengmao": "movies/clean/clean_mulan-emperor.wav",
    "yellowturban": "ai/jimmy_young_adult_male.mp3",
    "narrator": "ai/julia_young_adult_smooth_neutral_female.mp3",
    "noticeboard": "ai/keith_nonchalant_male.mp3",
    "volunteer": "ai/tungwong_young_adult_funny_friendly_male.mp3",
    "default": "ai/keith_nonchalant_male.mp3",
}

# --- Initialize ---
print(f"Loading XTTS v2 model (this may take a long time on first run)...")
# You must accept the Coqui TTS terms of service
os.environ["COQUI_TOS_AGREED"] = "1"

try:
    # Use CPU for Intel Mac. If you have a GPU, change to "cuda"
    tts = TTS(MODEL_NAME).to("cpu")
except Exception as e:
    print(f"CRITICAL ERROR: Failed to load TTS model: {e}")
    sys.exit(1)

print("Loading Whisper model for verification...")
stt_model = whisper.load_model("base")


def verify_audio(audio_path, expected_text):
    print(f"  Verifying audio quality...")
    try:
        # Transcribe (Whisper handles wav/ogg/mp3)
        result = stt_model.transcribe(audio_path)
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

        return {
            "transcribed": transcribed_text,
            "wer": error_rate,
            "is_bad": error_rate > 0.4,
        }
    except Exception as e:
        print(f"    Verification error: {e}")
        return {"error": str(e), "is_bad": True}


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
    line_id, character, text, speed=1.0, emotion=None, phonetic_text=None
):
    output_ogg = os.path.join(OUTPUT_DIR, f"{line_id}.ogg")
    temp_wav = f"temp_{line_id}.wav"

    verification_result = None

    if os.path.exists(output_ogg):
        # Even if it exists, let's re-trim it to ensure the silence fixes are applied
        # But only if it's 0 bytes or we want to force re-processing
        if os.path.getsize(output_ogg) == 0:
            print(f"Regenerating 0-byte file: {line_id}")
        else:
            print(f"Skipping generation (already exists): {line_id}")
            try:
                # Convert ogg to temp wav for trimming
                audio = AudioSegment.from_file(output_ogg)
                audio.export(temp_wav, format="wav")
                trim_long_pauses(temp_wav)
                # Re-export to ogg using our fixed converter
                if convert_to_ogg(temp_wav, output_ogg):
                    if os.path.exists(temp_wav):
                        os.remove(temp_wav)
                else:
                    print(f"    Failed to re-trim {line_id}")
            except Exception as e:
                print(f"    Re-trim error: {e}")
            return None

    char_key = character.lower().replace(" ", "")
    target_filename = CHAR_TARGETS.get(char_key, CHAR_TARGETS["default"])
    target_path = os.path.join(TARGETS_DIR, target_filename)

    if not os.path.exists(target_path):
        print(f"ERROR: Reference voice for '{character}' not found at '{target_path}'.")
        sys.exit(1)

    # Use phonetic text for generation if provided, but verify against original text
    gen_text = phonetic_text if phonetic_text else text
    print(f"Generating (XTTS): {character} -> {line_id}")
    if phonetic_text:
        print(f'  Using phonetic override: "{phonetic_text}"')

    try:
        # Generate high quality audio using cloning
        tts.tts_to_file(
            text=gen_text,
            speaker_wav=target_path,
            language="en",
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
        verification_result = verify_audio(temp_wav, text)

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
        "text": "An Imperial kinsman! Truly, the Heavens have not abandoned the Han. Your arrival is most timely.",
        "phonetic_text": "Ahn Imperial kinsman. Truly, the Heavens have not abandoned the Han. Your arrival is most timely.",
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
        "text": "Magistrate Zhou Jing, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion.",
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
]

if __name__ == "__main__":
    report = {}
    for line in game_script:
        res = generate_voice(
            line["id"],
            line["char"],
            line["text"],
            speed=line.get("speed", 1.0),
            emotion=line.get("emotion"),
            phonetic_text=line.get("phonetic_text"),
        )
        report[line["id"]] = {
            "character": line["char"],
            "original_text": line["text"],
            "stt_output": res.get("transcribed", "") if res else "",
            "wer": res.get("wer", 0) if res else 0,
            "is_bad": res.get("is_bad", False) if res else False,
        }

    # Save report
    if os.path.exists(REPORT_FILE):
        with open(REPORT_FILE, "r") as f:
            try:
                existing_report = json.load(f)
            except:
                existing_report = {}
    else:
        existing_report = {}

    for line_id, data in report.items():
        if data is not None:
            existing_report[line_id] = data

    with open(REPORT_FILE, "w") as f:
        json.dump(existing_report, f, indent=4)
    print(f"\nVerification report updated in {REPORT_FILE}")

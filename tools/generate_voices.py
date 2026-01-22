import subprocess
import os
import json
import sys

# Configuration - Update paths to where you download your models
# Models should be in your /models folder
# Configuration - Mapping to exactly what is in your /models folder
VOICE_MODELS = {
    "liubei": "models/en_GB-alan-medium.onnx",
    "zhangfei": "models/en_GB-northern_english_male-medium.onnx",
    "guanyu": "models/en_US-ryan-high.onnx",
    "zhoujing": "models/en_US-ryan-high.onnx",  # Authoritative US voice for the Magistrate
    "yellowturban": "models/en_US-patrick-medium.onnx",
    "dengmao": "models/en_US-patrick-medium.onnx",
    "chengyuanzhi": "models/en_US-patrick-medium.onnx",
    "narrator": "models/en_US-picard_7399-medium.onnx",
    "noticeboard": "models/en_US-picard_7399-medium.onnx",
    "volunteer": "models/en_US-patrick-medium.onnx",
    "default": "models/en_GB-alan-medium.onnx",
}

OUTPUT_DIR = "assets/audio/voices"


def generate_voice(line_id, character, text, speed=1.0, speaker_id=None):
    model = VOICE_MODELS.get(
        character.lower().replace(" ", ""), VOICE_MODELS["default"]
    )

    # Zhang Fei is a bit quiet, boost his volume
    volume = 1.0
    if character.lower() == "zhangfei":
        volume = 1.5

    # Piper outputs wav by default
    temp_wav = f"temp_{line_id}.wav"
    output_ogg = os.path.join(OUTPUT_DIR, f"{line_id}.ogg")

    if os.path.exists(output_ogg):
        # Even if it exists, check if it's a zhangfei line to boost it if we haven't yet
        # For now, let's just allow force-regeneration via rm or check for specific char
        pass

    if not os.path.exists(os.path.dirname(output_ogg)):
        os.makedirs(os.path.dirname(output_ogg))

    print(f"Generating: {character} -> {line_id}")

    try:
        piper_cmd = [
            "./tools/venv/bin/piper",
            "--model",
            model,
            "--length-scale",
            str(speed),
            "--volume",
            str(volume),
            "--output_file",
            temp_wav,
        ]

        # Some models (like vctk) have multiple speakers
        if speaker_id is not None:
            piper_cmd.extend(["--speaker", str(speaker_id)])
        elif "vctk" in model:
            piper_cmd.extend(
                ["--speaker", "2"]
            )  # Default to Speaker 2 for Guan Yu/Cheng Yuanzhi

        process = subprocess.Popen(
            piper_cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate(input=text.encode("utf-8"))

        if process.returncode != 0:
            raise Exception(
                f"Piper failed with code {process.returncode}: {stderr.decode('utf-8')}"
            )

        # Convert to OGG using ffmpeg
        result = subprocess.run(
            [
                "ffmpeg",
                "-i",
                temp_wav,
                "-ac",
                "2",
                "-c:a",
                "vorbis",
                "-strict",
                "-2",
                "-q:a",
                "4",
                "-y",
                output_ogg,
            ],
            capture_output=True,
        )

        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr.decode('utf-8')}")

        if os.path.exists(temp_wav):
            os.remove(temp_wav)

    except Exception as e:
        print(f"CRITICAL ERROR generating {line_id}: {e}")
        sys.exit(1)


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
        "text": "I am Lee-oh Bay, a descendant of Prince Jing of Zhong-shahn and great-great-grandson of Emperor Jing. These are my sworn brothers, Gwan Yoo and Jahng Fay.",
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
    },
    {
        "id": "daxing_zj_03",
        "char": "zhoujing",
        "text": "Scouts report that the rebel general Chung Ywan-Jur is marching upon us with fifty thousand Yellow Turbans.",
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
        "text": "Eldest brother is right. We have sworn to destroy these traitors and restore peace. We are ready to march.",
    },
    {
        "id": "daxing_lb_03",
        "char": "liubei",
        "text": "Magistrate Joe Jing, we seek only to serve. Lead us to Daxing District; let us put an end to this rebellion.",
    },
    {
        "id": "daxing_zj_04",
        "char": "zhoujing",
        "text": "Very well! I shall lead the main force myself. Together, we shall strike at the heart of Chung Ywan-Jur's army!",
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
        "text": "I am Jahng Fay, also known as Yee-Duh.",
    },
    {
        "id": "pro_zf_05",
        "char": "zhangfei",
        "text": "I live in this county, where I have a farm. I sell wine and slaughter hogs.",
    },
    {
        "id": "pro_lb_04",
        "char": "liubei",
        "text": "I am of the Imperial Clan. My name is Lee-oh Bay.",
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
    {"id": "pro_zf_07", "char": "zhangfei", "text": "What say you to that?"},
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
        "text": "Off to the Magistrate! Magistrate Joe Jing's H-Q awaits our enlistment.",
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
        "id": "inn_lb_02",
        "char": "liubei",
        "text": "That man... his presence is extraordinary. Look at his majestic beard and phoenix-like eyes.",
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
        "text": "I am Gwan Yoo, courtesy name Yoon-Chahng. For years I have been a fugitive, for I slew a local bully who oppressed the weak.",
    },
    {
        "id": "inn_gy_03",
        "char": "guanyu",
        "text": "Now I hear there is a call for volunteers, and I have come to join the cause.",
    },
    {
        "id": "inn_lb_03",
        "char": "liubei",
        "text": "A noble heart! I am Lee-oh Bay, and this is Jahng Fay. We have just agreed to raise a volunteer army ourselves.",
    },
    {
        "id": "inn_zf_03",
        "char": "zhangfei",
        "text": "Haha! The more the merrier! Drink, Yoon-Chahng! Let us toast to our new brotherhood!",
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
        "text": "I agree. We swear by the peach garden.",
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
        "text": "We three, Lee-oh Bay, Gwan Yoo, and Jahng Fay, though of different lineages, swear brotherhood and promise mutual help to one end.",
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
        "text": "The ritual complete, Lee-oh Bay is acknowledged as the eldest brother, Gwan Yoo the second, and Jahng Fay the youngest.",
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
        "text": "We offer no riches, only the chance to serve with honor under the banner of the Imperial Uncle, Liu Bei.",
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
    },
    {
        "id": "dx_dm_01",
        "char": "dengmao",
        "text": "Imperial dogs! You dare stand in the way of the Lord of Heaven?",
    },
    {
        "id": "dx_cyz_01",
        "char": "chengyuanzhi",
        "text": "Slay them all! The Han is dead, the Yellow Heavens shall rise!",
    },
    {
        "id": "dx_lb_02",
        "char": "liubei",
        "text": "Their resolve is weak. If we defeat these captains, the rest will be turned to flight!",
    },
    {
        "id": "dx_lb_03",
        "char": "liubei",
        "text": "They keep coming! We must defeat Dung Mao and Chung Ywan-Jur to break them!",
    },
    {"id": "dx_yt_01", "char": "yellowturban", "text": "Our leaders are dead! Run!"},
    {
        "id": "debug_narrative_01",
        "char": "narrator",
        "text": "Cheat code accepted. Narrative scene is functional.",
    },
]

if __name__ == "__main__":
    for line in game_script:
        generate_voice(
            line["id"],
            line["char"],
            line["text"],
            line.get("speed", 1.0),
            line.get("speaker_id"),
        )

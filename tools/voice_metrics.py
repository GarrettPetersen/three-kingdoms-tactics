"""Shared voice verification scoring helpers."""

import string
import unicodedata

try:
    from jiwer import wer
except ImportError:
    wer = None


CHINESE_EQUIVALENTS = str.maketrans(
    {
        "嚴": "严",
        "軍": "军",
        "宮": "宫",
        "見": "见",
        "護": "护",
        "儲": "储",
        "趨": "趋",
        "璽": "玺",
        "綬": "绶",
        "別": "别",
        "點": "点",
        "約": "约",
        "駕": "驾",
        "挾": "挟",
        "興": "兴",
        "槍": "枪",
        "盡": "尽",
        "諸": "诸",
        "門": "门",
        "還": "还",
        "為": "为",
        "懼": "惧",
        "萬": "万",
        "羅": "罗",
        "網": "网",
        "會": "会",
        "傳": "传",
        "衛": "卫",
        "開": "开",
        "鋒": "锋",
        "膽": "胆",
    }
)


def is_cjk_char(ch):
    code = ord(ch)
    return (
        0x3400 <= code <= 0x4DBF
        or 0x4E00 <= code <= 0x9FFF
        or 0xF900 <= code <= 0xFAFF
    )


def normalize_for_wer(text, lang_code):
    text = unicodedata.normalize("NFKC", text or "").lower()

    if lang_code == "zh":
        text = text.translate(CHINESE_EQUIVALENTS)
        tokens = [
            ch
            for ch in text
            if (is_cjk_char(ch) or ch.isalnum())
            and not unicodedata.category(ch).startswith(("P", "S", "Z"))
        ]
        return " ".join(tokens)

    table = str.maketrans("", "", string.punctuation)
    return text.translate(table)


def calculate_text_error_rate(expected_text, transcribed_text, lang_code):
    if wer is None:
        raise RuntimeError("jiwer is required for voice verification")

    return wer(
        normalize_for_wer(expected_text, lang_code),
        normalize_for_wer(transcribed_text, lang_code),
    )

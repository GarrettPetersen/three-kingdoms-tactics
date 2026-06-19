#!/usr/bin/env python3
"""Repair high-WER voice lines by keeping only improved regenerations."""

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

import generate_voices_xtts as voices


DEFAULT_WER_THRESHOLDS = {
    "en": 0.4,
    "zh": 0.7,
}


def report_path(lang_code):
    return Path(f"voice_verification_report_{lang_code}.json")


def legacy_report_path(lang_code):
    if lang_code == "en":
        return Path("voice_verification_report.json")
    return report_path(lang_code)


def load_json(path, default):
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")


def report_entry_key(lang_code, line_id):
    return f"{lang_code}:{line_id}"


def line_audio_path(lang_code, line_id):
    return Path(voices.OUTPUT_DIR) / lang_code / f"{line_id}.ogg"


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Regenerate high-WER voice lines, but only keep a candidate if its "
            "WER is lower than the current report entry."
        )
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=None,
        help="Repair lines with WER above this value. Defaults to the generator threshold for the language.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=int(os.environ.get("VOICE_REPAIR_LIMIT", "0")),
        help="Maximum number of lines to attempt. 0 means no limit.",
    )
    parser.add_argument(
        "--line",
        action="append",
        default=[],
        help="Repair a specific voice ID. Can be passed multiple times.",
    )
    parser.add_argument(
        "--include-ok",
        action="store_true",
        help="Allow --line entries even if they are not marked bad and are under the threshold.",
    )
    return parser.parse_args()


def find_repair_candidates(report, lines_by_id, lang_code, threshold, requested_lines, include_ok):
    candidates = []
    requested = set(requested_lines)

    for line_id, line in lines_by_id.items():
        if requested and line_id not in requested:
            continue

        key = report_entry_key(lang_code, line_id)
        entry = report.get(key)
        if not entry:
            continue

        try:
            old_wer = float(entry.get("wer", 0))
        except (TypeError, ValueError):
            old_wer = 0

        is_high_wer = bool(entry.get("is_bad")) or old_wer > threshold
        if requested and include_ok:
            is_high_wer = True

        if is_high_wer:
            candidates.append((old_wer, line, entry))

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates


def report_result(line, lang_code, verification_result):
    return {
        "id": line["id"],
        "character": line["char"],
        "original_text": line.get("original_text", line["text"]),
        "stt_output": verification_result.get("transcribed", ""),
        "wer": verification_result.get("wer", 1.0),
        "is_bad": verification_result.get("is_bad", False),
        "language": lang_code,
    }


def repair_line(line, old_entry, lang_code, backup_dir):
    line_id = line["id"]
    audio_path = line_audio_path(lang_code, line_id)
    if not audio_path.exists() or audio_path.stat().st_size == 0:
        print(f"Skipping {line_id}: existing audio file is missing or empty")
        return "skipped", old_entry

    backup_path = Path(backup_dir) / f"{line_id}.ogg"
    shutil.copy2(audio_path, backup_path)

    old_wer = float(old_entry.get("wer", 1.0))
    print(f"\nRepairing {line_id} ({line['char']}): old WER {old_wer:.2f}")

    result = voices.generate_voice(
        line["id"],
        line["char"],
        line["text"],
        speed=line.get("speed", 1.0),
        emotion=line.get("emotion"),
        phonetic_text=line.get("phonetic_text"),
        lang_code=lang_code,
        force=True,
        regeneration_reason=f"voice repair: old WER {old_wer:.2f}",
    )

    if not result or "wer" not in result:
        shutil.copy2(backup_path, audio_path)
        print(f"  Rejected {line_id}: candidate did not produce a WER")
        return "rejected", old_entry

    new_wer = float(result["wer"])
    if new_wer < old_wer:
        print(f"  Kept {line_id}: WER improved {old_wer:.2f} -> {new_wer:.2f}")
        return "kept", report_result(line, lang_code, result)

    shutil.copy2(backup_path, audio_path)
    print(f"  Restored {line_id}: candidate WER {new_wer:.2f} was not lower than {old_wer:.2f}")
    return "rejected", old_entry


def main():
    args = parse_args()
    lang_code = voices.LANGUAGE
    threshold = args.threshold
    if threshold is None:
        threshold = float(
            os.environ.get(
                "VOICE_REPAIR_WER_THRESHOLD",
                DEFAULT_WER_THRESHOLDS.get(lang_code, 0.4),
            )
        )

    active_report_path = report_path(lang_code)
    report = load_json(active_report_path, None)
    if report is None and legacy_report_path(lang_code) != active_report_path:
        report = load_json(legacy_report_path(lang_code), None)

    if report is None:
        print(
            f"No voice verification report found for {lang_code}. "
            "Run make voices or a voice verification pass first."
        )
        return 1

    lines = voices.load_voice_lines_from_extracted()
    lines_by_id = {line["id"]: line for line in lines}
    candidates = find_repair_candidates(
        report,
        lines_by_id,
        lang_code,
        threshold,
        args.line,
        args.include_ok,
    )

    if args.limit > 0:
        candidates = candidates[: args.limit]

    if not candidates:
        print(f"No {lang_code} voice lines need repair at WER threshold {threshold:.2f}.")
        return 0

    print(
        f"Repairing {len(candidates)} {lang_code} voice line(s) "
        f"above WER threshold {threshold:.2f}."
    )
    voices.load_models()

    counts = {"kept": 0, "rejected": 0, "skipped": 0}
    with tempfile.TemporaryDirectory(prefix=f"voice-repair-{lang_code}-") as backup_dir:
        for _, line, old_entry in candidates:
            key = report_entry_key(lang_code, line["id"])
            status, entry = repair_line(line, old_entry, lang_code, backup_dir)
            counts[status] += 1
            report[key] = entry
            save_json(active_report_path, report)

    voices.save_voice_hash_manifest(lines, lang_code)
    print(
        f"\nVoice repair complete for {lang_code}: "
        f"{counts['kept']} kept, {counts['rejected']} rejected, {counts['skipped']} skipped."
    )
    print(f"Report updated: {active_report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

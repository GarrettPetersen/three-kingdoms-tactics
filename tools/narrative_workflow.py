#!/usr/bin/env python3
"""
File-driven narrative workflow helper.

Flow:
Q1 major characters -> Q2 prior POV -> Q3 chapter POV set ->
Per POV character: A (scene arc) -> B (story title) -> C (teaser)
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHAPTERS_DIR = PROJECT_ROOT / "三國志演義_章節"
STATE_FILE = PROJECT_ROOT / "tools" / "narrative_workflow_state.json"
PROMPT_FILE = PROJECT_ROOT / "tools" / "narrative_prompt.md"
OUTLINES_ROOT = PROJECT_ROOT / "tools" / "story_outlines"
POV_CHARACTER_KEYS = {"liubei", "caocao"}
POV_QUESTIONS = ("A", "B", "C")
TEASER_MAX_CHARS = 150


@dataclass
class ChapterInfo:
    number: int
    file_name: str
    title: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_name(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum())


def slugify_name(value: str) -> str:
    raw = []
    last_dash = False
    for ch in value.strip().lower():
        if ch.isalnum():
            raw.append(ch)
            last_dash = False
        elif not last_dash:
            raw.append("-")
            last_dash = True
    slug = "".join(raw).strip("-")
    return slug or "unknown"


def parse_list(raw: str) -> list[str]:
    items = [x.strip() for x in raw.replace("\n", ",").split(",")]
    items = [x for x in items if x]
    seen = set()
    out = []
    for item in items:
        k = item.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(item)
    return out


def chapter_info(chapter_number: int) -> ChapterInfo:
    prefix = f"{chapter_number:03d}-"
    matches = sorted(CHAPTERS_DIR.glob(f"{prefix}*.md"))
    if not matches:
        raise ValueError(
            f"Chapter {chapter_number} not found in {CHAPTERS_DIR} (expected file prefix: {prefix})"
        )
    p = matches[0]
    return ChapterInfo(number=chapter_number, file_name=p.name, title=p.stem)


def _migrate_state(state: dict) -> dict:
    if not state:
        return state
    current_version = state.get("version", 1)
    if current_version >= 3:
        return state

    if current_version < 2:
        state["version"] = 2
    if current_version < 3:
        # Convert B/C answers from plain strings to {en, zh}.
        pov_answers = state.get("pov_answers", {}) or {}
        for _name, entry in pov_answers.items():
            if not isinstance(entry, dict):
                continue
            for key in ("B", "C"):
                value = entry.get(key)
                if isinstance(value, str):
                    entry[key] = {"en": value.strip(), "zh": ""}
        state["pov_answers"] = pov_answers
        state["version"] = 3

    state.setdefault("major_characters", [])
    state.setdefault("player_pov_characters", [])
    state.setdefault("chapter_pov_set", [])
    state.setdefault("chapter_pov_notes", "")
    state.setdefault("active_pov_index", 0)
    state.setdefault("active_question", "A")

    # Old field -> new structure
    old_qa = state.pop("pov_question_a", {}) or {}
    pov_answers = state.get("pov_answers", {})
    for name, answer in old_qa.items():
        entry = pov_answers.get(name, {})
        entry["A"] = answer
        pov_answers[name] = entry
    state["pov_answers"] = pov_answers

    old_step = state.get("step", "uninitialized")
    if old_step == "pov_question_a":
        state["step"] = "pov_questions"
        state["active_question"] = "A"
    elif old_step == "pov_question_a_completed":
        # Move to next unanswered B/C if any, otherwise completed.
        pov_set = state.get("chapter_pov_set", [])
        next_idx = None
        next_q = None
        for idx, name in enumerate(pov_set):
            ans = state["pov_answers"].get(name, {})
            for q in POV_QUESTIONS:
                if not ans.get(q):
                    next_idx = idx
                    next_q = q
                    break
            if next_idx is not None:
                break
        if next_idx is None:
            state["step"] = "pov_questions_completed"
            state["active_pov_index"] = 0
            state["active_question"] = "A"
        else:
            state["step"] = "pov_questions"
            state["active_pov_index"] = next_idx
            state["active_question"] = next_q

    reconcile_progress_state(state)
    return state


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    original_version = state.get("version", 1)
    migrated = _migrate_state(state)
    if migrated.get("version", 1) != original_version or reconcile_progress_state(migrated):
        save_state(migrated)
    return migrated


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def infer_pov_chars(major_chars: list[str]) -> list[str]:
    aliases = {"liubei": "liubei", "caocao": "caocao"}
    out = []
    seen = set()
    for name in major_chars:
        canonical = aliases.get(normalize_name(name))
        if canonical in POV_CHARACTER_KEYS and canonical not in seen:
            seen.add(canonical)
            out.append(name)
    return out


def is_answer_complete(value, question_key: str) -> bool:
    if question_key == "A":
        return isinstance(value, str) and bool(value.strip())
    if question_key in ("B", "C"):
        return (
            isinstance(value, dict)
            and bool((value.get("en") or "").strip())
            and bool((value.get("zh") or "").strip())
        )
    return bool(value)


def format_localized_value(value) -> dict[str, str]:
    if isinstance(value, dict):
        return {
            "en": (value.get("en") or "").strip(),
            "zh": (value.get("zh") or "").strip(),
        }
    if isinstance(value, str):
        return {"en": value.strip(), "zh": ""}
    return {"en": "", "zh": ""}


def parse_localized_input(en: str, zh: str, field_name: str, max_chars: int | None = None) -> dict[str, str]:
    en_val = (en or "").strip()
    zh_val = (zh or "").strip()
    if not en_val or not zh_val:
        raise ValueError(f"{field_name} requires both English and Chinese values.")
    if max_chars is not None:
        if len(en_val) > max_chars:
            raise ValueError(f"{field_name} English must be <= {max_chars} characters.")
        if len(zh_val) > max_chars:
            raise ValueError(f"{field_name} Chinese must be <= {max_chars} characters.")
    return {"en": en_val, "zh": zh_val}


def first_unanswered_slot(state: dict) -> tuple[int, str] | None:
    pov_set = state.get("chapter_pov_set", []) or []
    answers = state.get("pov_answers", {}) or {}
    for idx, name in enumerate(pov_set):
        entry = answers.get(name, {}) or {}
        for q in POV_QUESTIONS:
            if not is_answer_complete(entry.get(q), q):
                return idx, q
    return None


def reconcile_progress_state(state: dict) -> bool:
    changed = False
    slot = first_unanswered_slot(state)
    if slot is None:
        if state.get("step") != "pov_questions_completed":
            state["step"] = "pov_questions_completed"
            changed = True
        if state.get("active_pov_index") != 0:
            state["active_pov_index"] = 0
            changed = True
        if state.get("active_question") != "A":
            state["active_question"] = "A"
            changed = True
        return changed

    idx, q = slot
    if state.get("chapter_pov_set"):
        if state.get("step") in ("pov_questions_completed", "pov_questions"):
            if state.get("step") != "pov_questions":
                state["step"] = "pov_questions"
                changed = True
            if int(state.get("active_pov_index", 0)) != idx:
                state["active_pov_index"] = idx
                changed = True
            if state.get("active_question") != q:
                state["active_question"] = q
                changed = True
    return changed


def get_active_pov_context(state: dict) -> tuple[str | None, str]:
    pov_set = state.get("chapter_pov_set", [])
    if not pov_set:
        return None, "A"
    idx = int(state.get("active_pov_index", 0))
    if idx < 0 or idx >= len(pov_set):
        idx = 0
    q = state.get("active_question", "A")
    if q not in POV_QUESTIONS:
        q = "A"
    return pov_set[idx], q


def advance_after_answer(state: dict) -> None:
    pov_set = state.get("chapter_pov_set", [])
    if not pov_set:
        state["step"] = "chapter_pov_set_answered"
        return
    current_name, current_q = get_active_pov_context(state)
    if current_name is None:
        state["step"] = "chapter_pov_set_answered"
        return
    idx = int(state.get("active_pov_index", 0))

    q_index = POV_QUESTIONS.index(current_q)
    if q_index < len(POV_QUESTIONS) - 1:
        state["active_question"] = POV_QUESTIONS[q_index + 1]
        state["step"] = "pov_questions"
        return

    # Was C, advance to next POV character.
    if idx + 1 < len(pov_set):
        state["active_pov_index"] = idx + 1
        state["active_question"] = "A"
        state["step"] = "pov_questions"
    else:
        state["active_pov_index"] = 0
        state["active_question"] = "A"
        state["step"] = "pov_questions_completed"


def write_outline_docs(state: dict) -> None:
    chapter = state.get("chapter", {})
    chapter_num = chapter.get("number")
    if not chapter_num:
        return
    chapter_dir = OUTLINES_ROOT / f"chapter-{int(chapter_num):03d}"
    chapter_dir.mkdir(parents=True, exist_ok=True)

    pov_set = state.get("chapter_pov_set", [])
    answers = state.get("pov_answers", {})
    chapter_title = chapter.get("title", "")
    chapter_file = chapter.get("file_name", "")

    for name in pov_set:
        a = (answers.get(name, {}) or {}).get("A", "").strip()
        b = format_localized_value((answers.get(name, {}) or {}).get("B"))
        c = format_localized_value((answers.get(name, {}) or {}).get("C"))
        title_en = b["en"] or f"{name} - Chapter {chapter_num}"
        title_zh = b["zh"] or "(not answered yet)"
        teaser_en = c["en"] or "(not answered yet)"
        teaser_zh = c["zh"] or "(not answered yet)"
        scenes = a or "(not answered yet)"
        out = [
            f"# Chapter {int(chapter_num):03d} POV Outline - {name}",
            "",
            f"- Chapter title: {chapter_title}",
            f"- Source chapter file: `{chapter_file}`",
            "",
            "## Story Title",
            f"- EN: {title_en}",
            f"- ZH: {title_zh}",
            "",
            "## Teaser",
            f"- EN: {teaser_en}",
            f"- ZH: {teaser_zh}",
            "",
            "## Scene Arc",
            scenes,
            "",
        ]
        outline_file = chapter_dir / f"{slugify_name(name)}.md"
        outline_file.write_text("\n".join(out), encoding="utf-8")


def write_prompt(state: dict) -> None:
    chapter = state.get("chapter", {})
    chapter_num = chapter.get("number")
    chapter_title = chapter.get("title", "Unknown chapter")
    chapter_file = chapter.get("file_name", "Unknown file")
    step = state.get("step", "uninitialized")
    major_chars = state.get("major_characters", [])
    pov_chars = state.get("player_pov_characters", [])
    chapter_pov_set = state.get("chapter_pov_set", [])
    chapter_pov_notes = state.get("chapter_pov_notes", "")
    pov_answers = state.get("pov_answers", {})
    active_name, active_q = get_active_pov_context(state)

    lines = [
        "# Narrative Workflow Prompt",
        "",
        f"- Updated: {state.get('updated_at', now_iso())}",
        f"- Chapter: {chapter_num if chapter_num is not None else 'Not set'}",
        f"- Chapter title: {chapter_title}",
        f"- Chapter file: `{chapter_file}`",
        f"- Current step: `{step}`",
        "",
    ]

    if step == "major_characters":
        lines += [
            "## Question 1",
            "Who are the major characters of this chapter?",
            "",
            "Answer with:",
            "`make plot-answer-major CHARS=\"Liu Bei, Guan Yu, Zhang Fei\"`",
            "",
        ]
    elif step == "pov_characters":
        lines += [
            "## Question 1 Answer Saved",
            f"- Major characters: {', '.join(major_chars) if major_chars else '(none)'}",
            "",
            "## Question 2",
            "Which of those characters have already been the player POV character in-game",
            "(selectable on story selection)?",
            "",
            "Auto-answer with:",
            "`make plot-answer-pov`",
            "",
        ]
    elif step == "pov_characters_answered":
        lines += [
            "## Question 1 Answer Saved",
            f"- Major characters: {', '.join(major_chars) if major_chars else '(none)'}",
            "",
            "## Question 2 Answer Saved",
            f"- Already-playable POV characters: {', '.join(pov_chars) if pov_chars else '(none)'}",
            "",
            "## Question 3",
            "Choose a POV set for this chapter (coverage + low overlap).",
            "",
            "Answer with:",
            "`make plot-answer-pov-set CHARS=\"Liu Bei, He Jin\" NOTES=\"...\"`",
            "",
        ]
    elif step == "chapter_pov_set_answered":
        lines += [
            "## Question 1 Answer Saved",
            f"- Major characters: {', '.join(major_chars) if major_chars else '(none)'}",
            "",
            "## Question 2 Answer Saved",
            f"- Already-playable POV characters: {', '.join(pov_chars) if pov_chars else '(none)'}",
            "",
            "## Question 3 Answer Saved",
            f"- Chapter POV set: {', '.join(chapter_pov_set) if chapter_pov_set else '(none)'}",
            f"- Notes: {chapter_pov_notes or '(none)'}",
            "",
            "Start per-POV A->B->C flow:",
            "`make plot-pov-qa-start`",
            "",
        ]
    elif step == "pov_questions":
        lines += [
            "## Context",
            f"- Major characters: {', '.join(major_chars) if major_chars else '(none)'}",
            f"- Chapter POV set: {', '.join(chapter_pov_set) if chapter_pov_set else '(none)'}",
            "",
            f"## Current POV Character: **{active_name or '(none)'}**",
            f"## Current Question: **{active_q}**",
            "",
        ]
        if active_q == "A":
            lines += [
                "POV Character Question A:",
                "Break this character's chapter arc into distinct scenes.",
                "For each scene include:",
                "- scene label",
                "- type (`narrative`, `battle`, or `map`)",
                "- 1-3 sentence description of events",
                "",
                "Answer with:",
                "`make plot-answer-pov-qa CHAR=\"Name\" ANSWER=\"1) Scene - [type] ... (1-3 sentences) | 2) ...\"`",
                "",
            ]
        elif active_q == "B":
            lines += [
                "POV Character Question B:",
                'Write a title for this POV character\'s story in this chapter (e.g. "The Oath in the Peach Garden").',
                "Provide both English and Chinese.",
                "",
                "Answer with:",
                "`make plot-answer-pov-b TITLE_EN=\"...\" TITLE_ZH=\"...\"`",
                "",
            ]
        else:
            lines += [
                "POV Character Question C:",
                "Write a short teaser description of the early events of this story.",
                f"Provide both English and Chinese, each <= {TEASER_MAX_CHARS} characters.",
                "",
                "Answer with:",
                "`make plot-answer-pov-c TEASER_EN=\"...\" TEASER_ZH=\"...\"`",
                "",
            ]
        lines += ["### Progress"]
        for name in chapter_pov_set:
            ans = pov_answers.get(name, {})
            marks = "".join(q if is_answer_complete(ans.get(q), q) else "-" for q in POV_QUESTIONS)
            lines.append(f"- {name}: {marks}")
        lines.append("")
    elif step == "pov_questions_completed":
        lines += [
            "## POV A/B/C Completed",
            f"- Chapter POV set: {', '.join(chapter_pov_set) if chapter_pov_set else '(none)'}",
            "",
            "Outline files are written under:",
            f"`{OUTLINES_ROOT}`",
            "",
        ]
    else:
        lines += [
            "Workflow not initialized.",
            "",
            "Start with:",
            "`make plot-init CHAPTER=1`",
            "",
        ]

    PROMPT_FILE.parent.mkdir(parents=True, exist_ok=True)
    PROMPT_FILE.write_text("\n".join(lines), encoding="utf-8")
    write_outline_docs(state)


def cmd_init(chapter_number: int) -> None:
    info = chapter_info(chapter_number)
    state = {
        "version": 3,
        "chapter": {"number": info.number, "file_name": info.file_name, "title": info.title},
        "step": "major_characters",
        "major_characters": [],
        "player_pov_characters": [],
        "chapter_pov_set": [],
        "chapter_pov_notes": "",
        "pov_answers": {},
        "active_pov_index": 0,
        "active_question": "A",
        "updated_at": now_iso(),
    }
    save_state(state)
    write_prompt(state)
    print(f"Initialized workflow for Chapter {info.number}: {info.title}")
    print(f"State: {STATE_FILE}")
    print(f"Prompt: {PROMPT_FILE}")


def cmd_answer_major(chars_raw: str) -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    chars = parse_list(chars_raw)
    if not chars:
        raise ValueError('No characters provided. Use CHARS="Name A, Name B"')
    state["major_characters"] = chars
    state["player_pov_characters"] = []
    state["chapter_pov_set"] = []
    state["chapter_pov_notes"] = ""
    state["pov_answers"] = {}
    state["active_pov_index"] = 0
    state["active_question"] = "A"
    state["step"] = "pov_characters"
    state["updated_at"] = now_iso()
    save_state(state)
    write_prompt(state)
    print("Saved major characters.")


def cmd_answer_pov() -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    major_chars = state.get("major_characters", [])
    if not major_chars:
        raise RuntimeError('Major characters are empty. Run: make plot-answer-major CHARS="..."')
    state["player_pov_characters"] = infer_pov_chars(major_chars)
    state["step"] = "pov_characters_answered"
    state["updated_at"] = now_iso()
    save_state(state)
    write_prompt(state)
    print("Saved Question 2 answer.")


def cmd_answer_pov_set(chars_raw: str, notes: str) -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    selected = parse_list(chars_raw)
    if not selected:
        raise ValueError('No POV set provided. Use CHARS="Name A, Name B"')
    state["chapter_pov_set"] = selected
    state["chapter_pov_notes"] = (notes or "").strip()
    state["pov_answers"] = {}
    state["active_pov_index"] = 0
    state["active_question"] = "A"
    state["step"] = "chapter_pov_set_answered"
    state["updated_at"] = now_iso()
    save_state(state)
    write_prompt(state)
    print("Saved Question 3 answer.")


def cmd_start_pov_questions() -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    pov_set = state.get("chapter_pov_set", [])
    if not pov_set:
        raise RuntimeError('Chapter POV set is empty. Run: make plot-answer-pov-set CHARS="..."')
    state["step"] = "pov_questions"
    state["active_pov_index"] = 0
    state["active_question"] = "A"
    state["updated_at"] = now_iso()
    save_state(state)
    write_prompt(state)
    print(f"Started POV A->B->C flow with: {pov_set[0]}")


def _store_active_answer(state: dict, expected_q: str, value, char_name: str | None = None) -> None:
    active_name, active_q = get_active_pov_context(state)
    if active_name is None:
        raise RuntimeError("No active POV character. Run: make plot-pov-qa-start")
    if active_q != expected_q:
        raise RuntimeError(f"Current question is {active_q}, not {expected_q}.")
    if char_name and char_name != active_name:
        raise RuntimeError(f'Active POV character is "{active_name}", not "{char_name}".')
    if expected_q == "A":
        if not isinstance(value, str) or not value.strip():
            raise ValueError("Answer is empty.")
        stored = value.strip().replace(" | ", "\n")
    else:
        if not isinstance(value, dict):
            raise ValueError("Answer is malformed.")
        if not value.get("en", "").strip() or not value.get("zh", "").strip():
            raise ValueError("Both English and Chinese answers are required.")
        stored = {
            "en": value["en"].strip(),
            "zh": value["zh"].strip(),
        }
    answers = state.get("pov_answers", {})
    entry = answers.get(active_name, {})
    entry[expected_q] = stored
    answers[active_name] = entry
    state["pov_answers"] = answers
    advance_after_answer(state)
    state["updated_at"] = now_iso()


def cmd_answer_pov_qa(char_name: str, answer: str) -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    _store_active_answer(state, "A", answer, char_name=char_name)
    save_state(state)
    write_prompt(state)
    active_name, active_q = get_active_pov_context(state)
    print("Saved POV Question A answer.")
    if state.get("step") == "pov_questions":
        print(f"Next: {active_name} Question {active_q}")
    else:
        print("All POV A/B/C answers complete.")


def cmd_answer_pov_b(title_en: str, title_zh: str) -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    title = parse_localized_input(title_en, title_zh, "Question B title")
    _store_active_answer(state, "B", title)
    save_state(state)
    write_prompt(state)
    active_name, active_q = get_active_pov_context(state)
    print("Saved POV Question B answer.")
    if state.get("step") == "pov_questions":
        print(f"Next: {active_name} Question {active_q}")
    else:
        print("All POV A/B/C answers complete.")


def cmd_answer_pov_c(teaser_en: str, teaser_zh: str) -> None:
    state = load_state()
    if not state:
        raise RuntimeError("Workflow is not initialized. Run: make plot-init CHAPTER=<n>")
    teaser = parse_localized_input(
        teaser_en,
        teaser_zh,
        "Question C teaser",
        max_chars=TEASER_MAX_CHARS,
    )
    _store_active_answer(state, "C", teaser)
    save_state(state)
    write_prompt(state)
    active_name, active_q = get_active_pov_context(state)
    print("Saved POV Question C answer.")
    if state.get("step") == "pov_questions":
        print(f"Next: {active_name} Question {active_q}")
    else:
        print("All POV A/B/C answers complete.")


def cmd_prompt() -> None:
    state = load_state()
    write_prompt(state)
    print(f"Prompt updated: {PROMPT_FILE}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Narrative workflow helper")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="Initialize workflow for chapter")
    p_init.add_argument("--chapter", type=int, required=True, help="Chapter number (1-120)")

    p_major = sub.add_parser("answer-major", help="Save major character list for Q1")
    p_major.add_argument("--chars", type=str, required=True, help="Comma-separated names")

    sub.add_parser("answer-pov", help="Auto-answer Q2 from current in-game POV routes")
    p_set = sub.add_parser("answer-pov-set", help="Save Q3 chapter POV set")
    p_set.add_argument("--chars", type=str, required=True, help="Comma-separated POV names")
    p_set.add_argument("--notes", type=str, default="", help="Short rationale notes")

    # A/B/C flow
    sub.add_parser("start-pov-questions", help="Start POV A->B->C flow")
    sub.add_parser("start-pov-qa", help="Alias: start POV A->B->C flow")
    p_a = sub.add_parser("answer-pov-qa", help="Answer POV Question A")
    p_a.add_argument("--char", type=str, required=True, help="Active POV character name")
    p_a.add_argument("--answer", type=str, required=True, help="Scene breakdown text")
    p_b = sub.add_parser("answer-pov-b", help="Answer POV Question B")
    p_b.add_argument("--title-en", type=str, required=True, help="POV story title (English)")
    p_b.add_argument("--title-zh", type=str, required=True, help="POV story title (Chinese)")
    p_c = sub.add_parser("answer-pov-c", help="Answer POV Question C")
    p_c.add_argument("--teaser-en", type=str, required=True, help="Short teaser (English)")
    p_c.add_argument("--teaser-zh", type=str, required=True, help="Short teaser (Chinese)")

    sub.add_parser("prompt", help="Regenerate prompt from current state")

    args = parser.parse_args()
    try:
        if args.command == "init":
            cmd_init(args.chapter)
        elif args.command == "answer-major":
            cmd_answer_major(args.chars)
        elif args.command == "answer-pov":
            cmd_answer_pov()
        elif args.command == "answer-pov-set":
            cmd_answer_pov_set(args.chars, args.notes)
        elif args.command in ("start-pov-questions", "start-pov-qa"):
            cmd_start_pov_questions()
        elif args.command == "answer-pov-qa":
            cmd_answer_pov_qa(args.char, args.answer)
        elif args.command == "answer-pov-b":
            cmd_answer_pov_b(args.title_en, args.title_zh)
        elif args.command == "answer-pov-c":
            cmd_answer_pov_c(args.teaser_en, args.teaser_zh)
        elif args.command == "prompt":
            cmd_prompt()
    except Exception as exc:
        print(f"Error: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


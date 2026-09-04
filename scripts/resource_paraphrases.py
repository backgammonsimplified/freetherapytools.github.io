#!/usr/bin/env python3
"""Canonical resource-paraphrase generation, validation, and QA helpers."""

from __future__ import annotations

import csv
import difflib
import hashlib
import html
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
INVENTORY = ROOT / "data" / "source-inventory.csv"
EXTRACTION = ROOT / "data" / "qmd-resource-extraction.csv"
CANONICAL = ROOT / "data" / "resource-paraphrases.json"
SCHEMA = ROOT / "data" / "resource-paraphrase.schema.json"
BASE_GUIDANCE = ROOT / "data" / "resource-guided-reflection-base.json"
INVENTORY_OUTPUT = ROOT / "data" / "resource-paraphrase-inventory.csv"
REVIEW_CSV = ROOT / "data" / "resource-paraphrase-review.csv"
TOOL_MAPPING = ROOT / "data" / "resource-tool-mapping.csv"
REPORT = ROOT / "docs" / "reviews" / "RESOURCE-PARAPHRASE-REVIEW.md"
GENERATOR_VERSION = "1.0.0"

PUBLIC_STATES = {"approved", "published"}
VALID_STATES = {"draft", "review-needed", *PUBLIC_STATES}
VALID_CLASSIFICATIONS = {"informational", "interactive", "mixed"}
VALID_FIELD_TYPES = {
    "text", "textarea", "checkbox", "multi-select", "yes-no", "single-choice",
    "rating-scale", "numeric-rating", "table", "repeating-rows", "date", "time",
    "planning", "reflection", "other",
}

MOJIBAKE_MARKERS = ("Ã", "Â", "â€", "â€™", "â€œ", "â€¢", "�")
QUESTION_WORDS = (
    "what", "which", "when", "where", "who", "how", "why", "describe", "write",
    "list", "identify", "rate", "check", "circle", "record", "notice", "name",
    "choose", "plan", "track", "practice", "reflect", "consider", "select",
)
INPUT_SIGNAL = re.compile(
    r"\b(write|describe|list|check|circle|rate|identify|record|fill (?:in|out)|"
    r"what (?:happened|did|could|is|are|was|were)|yes\s*/\s*no|before\s*:?.*after|"
    r"my (?:response|answer|plan|goal)|week starting|due date)\b",
    re.IGNORECASE,
)
SCALE_PATTERN = re.compile(r"(?<!\d)(0|1)\s*(?:-|to|through|–|—)\s*(5|7|10|100)(?!\d)", re.IGNORECASE)
NATIVE_PLACEHOLDER = "This handout's educational content is integrated into the anchored skill sections above."

TOOL_RULES = [
    (re.compile(r"\bvalues? (?:and priorities|worksheet|list|review)|priorit", re.I), "values", "/tool-finder/values/"),
    (re.compile(r"\bopposite action|check the facts|change emotions?\b", re.I), "change-emotion", "/tool-finder/change-emotion/"),
    (re.compile(r"\bworry tree\b", re.I), "worry-tree", "/tool-finder/worry-tree/"),
    (re.compile(r"\bpleasant (?:event|moment)|positive experience", re.I), "pleasant-event", "/tool-finder/pleasant-event/"),
    (re.compile(r"\bbehaviou?r chain\b", re.I), "behaviour-chain", "/tool-finder/behaviour-chain/"),
    (re.compile(r"\bmissing[- ]links?\b", re.I), "missing-links", "/tool-finder/missing-links/"),
    (re.compile(r"\bbehaviou?ral activation|activity (?:monitoring|planning)\b", re.I), "behavioural-activation", "/tool-finder/behavioural-activation/"),
    (re.compile(r"\bSMART goal|daily goal worksheet|case map\b", re.I), "goal-builder", "/tool-finder/goal-builder/"),
    (re.compile(r"\bthermometer|emotion intensity\b", re.I), "thermometer", "/tool-finder/thermometer/"),
    (re.compile(r"\bemotion diary|describing emotions|learning about emotions\b", re.I), "emotion-explorer", "/tool-finder/emotions/"),
    (re.compile(r"\bexposure|fear ladder|fear hierarchy\b", re.I), "exposure", "/tool-finder/exposure/"),
    (re.compile(r"\bDEAR MAN|DEAR \+", re.I), "dear-man", "/tool-finder/dear-man/"),
    (re.compile(r"\bask or say no|ask, say no|intensely to ask|saying no\b", re.I), "ask-or-say-no", "/tool-finder/ask-or-say-no/"),
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n", extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: serialize_csv_value(row.get(field, "")) for field in fields})


def serialize_csv_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return "|".join(str(item) for item in value)
    if value is None:
        return ""
    return str(value)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def stable_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.replace("\r\n", "\n").encode("utf-8")).hexdigest()


def lesson_routes() -> dict[str, str]:
    import section_scan_inventory  # pylint: disable=import-outside-toplevel

    return {
        lesson: "/" + Path(route).with_suffix(".html").as_posix()
        for lesson, route in section_scan_inventory.LESSON_FILES.items()
    }


def source_asset(resource_id: str) -> str:
    section_slug = resource_id.rsplit("-p", 1)[0]
    return f"/resources/{section_slug}/{resource_id}.jpg"


def extract_native_block(resource_id: str, qmd_text: str) -> str:
    pattern = re.compile(
        rf"<!--\s*native-resource-content:{re.escape(resource_id)}:start\s*-->(.*?)"
        rf"<!--\s*native-resource-content:{re.escape(resource_id)}:end\s*-->",
        re.DOTALL,
    )
    match = pattern.search(qmd_text)
    return match.group(1).strip() if match else ""


def lesson_native_context(qmd_text: str) -> str:
    body = qmd_text.split("<!-- section-scan-resources:start -->", 1)[0]
    if body.startswith("---"):
        parts = body.split("---", 2)
        if len(parts) == 3:
            body = parts[2]
    return body.strip()


def strip_markdown(text: str) -> str:
    value = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)
    value = re.sub(r"!\[[^]]*]\([^)]*\)", " ", value)
    value = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", value)
    value = value.replace("**", "").replace("__", "").replace("`", "")
    value = re.sub(r"^#{1,6}\s*", "", value, flags=re.MULTILINE)
    value = re.sub(r"^[-*+]\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_label(text: str) -> str:
    value = strip_markdown(text)
    value = re.sub(r"^(?:q(?:uestion)?\s*\d+[:.)-]?|\d+[.)]\s*)", "", value, flags=re.I)
    value = re.sub(r"\s+", " ", value).strip(" -:;,.•")
    if not value:
        return ""
    if len(value) > 180:
        value = value[:177].rsplit(" ", 1)[0] + "..."
    return value


def source_profile(text: str, extraction: dict[str, str], integrated: bool) -> dict[str, Any]:
    plain = strip_markdown(text)
    word_count = len(plain.split())
    mojibake_count = sum(text.count(marker) for marker in MOJIBAKE_MARKERS)
    very_short = word_count < 12
    uncertain = extraction.get("review_needed", "").lower() == "true" or very_short or mojibake_count >= 3
    status = "verified-extracted-text"
    if integrated:
        status = "lesson-native-context"
    elif very_short:
        status = "source-extraction-insufficient"
    elif uncertain:
        status = "source-extraction-review-needed"
    return {
        "status": status,
        "word_count": word_count,
        "mojibake_count": mojibake_count,
        "uncertain": uncertain,
        "confidence": extraction.get("structure_confidence") or "unknown",
    }


def markdown_structure(text: str) -> dict[str, Any]:
    headings = []
    bullets = []
    questions = []
    numbered = []
    tables = 0
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        heading = re.match(r"^#{1,6}\s+(.+)$", line)
        if heading:
            label = normalize_label(heading.group(1))
            if label and label.lower() not in {"text version", "native version"}:
                headings.append(label)
        if re.match(r"^[-*+]\s+", line):
            bullets.append(normalize_label(line))
        if re.match(r"^\d+[.)]\s+", line):
            numbered.append(normalize_label(line))
        clean = normalize_label(line)
        if "?" in clean or (clean and clean.lower().startswith(QUESTION_WORDS) and len(clean.split()) <= 28):
            questions.append(clean)
        if line.startswith("|") and line.count("|") >= 2:
            tables += 1
    return {
        "headings": unique(headings),
        "bullets": unique(item for item in bullets if item),
        "questions": unique(item for item in questions if item),
        "numbered": unique(item for item in numbered if item),
        "table_lines": tables,
    }


def unique(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = re.sub(r"\W+", "", value).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def semantic_input(row: dict[str, str], text: str, structure: dict[str, Any]) -> bool:
    kind = row.get("resource_kind", "").lower()
    if kind == "worksheet":
        return True
    signals = len(INPUT_SIGNAL.findall(strip_markdown(text))) + len(structure["questions"])
    if kind == "exercise":
        return signals > 0 or any(token in row["resource_title"].lower() for token in ("practice", "exploring", "reflection", "creating", "identifying"))
    # The maintained inventory's page kind is a semantic source classification, not
    # an inference from blank space. Informational handouts often contain rhetorical
    # questions, so they are not converted into forms unless their title and source
    # both identify a response-oriented task.
    response_title = re.search(r"\b(worksheet|practice sheet|diary|tracker|checklist|response record)\b", row["resource_title"], re.I)
    return bool(response_title and signals >= 2 and structure["questions"])


def classify(row: dict[str, str], text: str, profile: dict[str, Any], structure: dict[str, Any]) -> tuple[str, bool]:
    has_input = semantic_input(row, text, structure)
    if not has_input:
        return "informational", False
    explanatory = profile["word_count"] >= 230 or len(structure["numbered"]) >= 4
    return ("mixed" if explanatory else "interactive"), True


def paraphrase_prompt(label: str, title: str) -> str:
    original = normalize_label(label)
    low = original.lower()
    replacements = [
        (r"^what is the emotion i want to change\??$", "Which emotion would you like to work with?"),
        (r"^what (?:is|was) the prompting event.*", "What event set this response in motion?"),
        (r"^what are my interpretations.*", "What thoughts, beliefs, or interpretations came up?"),
        (r"^what are the facts.*", "What observable facts do you know about the situation?"),
        (r"^describe (?:the )?situation.*", "Briefly describe the situation you are considering."),
        (r"^what happened.*", "What happened, in your own words?"),
        (r"^what did i do.*", "What action did you take?"),
        (r"^what i did.*", "What did you try?"),
        (r"^how did i feel.*", "What feelings did you notice?"),
        (r"^rate (?:the |your )?(.*)", r"Choose a rating for \1"),
        (r"^list (.*)", r"Add the \1 that matter here."),
        (r"^identify (.*)", r"Which \1 can you identify?"),
        (r"^check (.*)", r"Select each option that fits: \1"),
        (r"^my (.*):?$", r"Write down your \1."),
    ]
    for pattern, replacement in replacements:
        if re.search(pattern, low, flags=re.I):
            value = re.sub(pattern, replacement, low, flags=re.I)
            return value[0].upper() + value[1:]
    if original.endswith("?"):
        if low.startswith("what"):
            return "In your own words, " + original[0].lower() + original[1:]
        return original
    if low.startswith(("situation", "event")):
        return "What situation or event are you focusing on?"
    if low.startswith("before"):
        return "What did you notice before using the skill?"
    if low.startswith("after"):
        return "What did you notice afterward?"
    if low in {"name", "due date", "week starting", "date"}:
        return "Date or time period"
    if original:
        return f"Make a note about: {original.rstrip('.')}"
    return f"What would you like to record for {title}?"


def field_type(label: str, full_text: str) -> tuple[str, dict[str, Any]]:
    low = label.lower()
    context = f"{label} {full_text[:1200]}"
    scale = SCALE_PATTERN.search(context)
    if scale and any(word in low for word in ("rate", "rating", "arousal", "distress", "intensity", "belief", "mood", "urge")):
        return "rating-scale", {"min": int(scale.group(1)), "max": int(scale.group(2))}
    if re.search(r"\byes\s*/\s*no\b|\byes or no\b", context, re.I) and len(label.split()) < 22:
        return "yes-no", {"choices": ["Yes", "No"]}
    if any(word in low for word in ("check", "select all", "which apply", "choose all")):
        return "multi-select", {"choices": ["Option to review against the printable source"]}
    if "date" in low or "week starting" in low:
        return "date", {}
    if "time" in low and len(label.split()) < 12:
        return "time", {}
    if any(word in low for word in ("table", "diary", "tracker", "record", "log", "schedule")):
        return "table", {"columns": table_columns(label), "rows": 5}
    if any(word in low for word in ("list", "examples", "options", "things", "activities")):
        return "repeating-rows", {"rows": 4}
    if any(word in low for word in ("plan", "next step", "goal", "action")):
        return "planning", {}
    if any(word in low for word in ("reflect", "meaning", "notice", "feel", "thought", "happened", "describe", "situation", "interpret")) or label.endswith("?"):
        return "reflection", {}
    if len(label) < 55:
        return "text", {}
    return "textarea", {}


def table_columns(label: str) -> list[str]:
    low = label.lower()
    if "before" in low and "after" in low:
        return ["Item", "Before", "After", "Notes"]
    if "diary" in low or "tracker" in low or "log" in low:
        return ["Date / time", "What I noticed", "What I tried", "Notes"]
    if "pros" in low and "cons" in low:
        return ["Option", "Benefits", "Costs"]
    return ["Item", "My response", "Notes"]


def candidate_prompts(row: dict[str, str], text: str, structure: dict[str, Any]) -> list[str]:
    candidates = list(structure["questions"])
    for heading in structure["headings"]:
        low = heading.lower()
        if INPUT_SIGNAL.search(heading) or low.startswith(QUESTION_WORDS) or low in {
            "situation", "before", "after", "what i did", "other", "notes", "date", "week starting",
        }:
            candidates.append(heading)
    for bullet in structure["bullets"]:
        if INPUT_SIGNAL.search(bullet) or "?" in bullet:
            candidates.append(bullet)
    candidates = [item for item in unique(candidates) if 2 <= len(item.split()) <= 30]
    if not candidates and row.get("resource_kind") in {"worksheet", "exercise"}:
        title = row["resource_title"]
        candidates = [f"What would you like to record while working through {title}?"]
    return candidates[:16]


def build_fields(row: dict[str, str], text: str, structure: dict[str, Any], has_input: bool) -> list[dict[str, Any]]:
    if not has_input:
        return []
    prompts = candidate_prompts(row, text, structure)
    fields: list[dict[str, Any]] = []
    table_added = False
    for prompt in prompts:
        label = paraphrase_prompt(prompt, row["resource_title"])
        kind, extras = field_type(prompt, text)
        if kind == "table":
            if table_added:
                kind, extras = "reflection", {}
            table_added = True
        field_id = f"{row['id']}-{'table' if kind == 'table' else 'q'}{len(fields) + 1:02d}"
        fields.append({"id": field_id, "type": kind, "label": label, "help": "", "required": False, **extras})
    if not fields:
        fields.append({
            "id": f"{row['id']}-q01", "type": "reflection",
            "label": f"What would you like to record for {row['resource_title']}?",
            "help": "REVIEW NEEDED: confirm this response area against the printable source.", "required": False,
        })
    return fields


def paraphrase_statement(sentence: str) -> str:
    original = normalize_label(sentence)
    value = original
    if not value:
        return ""
    replacements = [
        (r"^Use this worksheet to\s+", "Work through this page to "),
        (r"^Use this (?:handout|page) to\s+", "This page can help you "),
        (r"^Remember that\s+", "Keep in mind that "),
        (r"^Record\s+", "Make a note of "),
        (r"^Write down\s+", "Put into your own words "),
        (r"^Choose\s+", "Select "),
        (r"^Describe\s+", "Give a brief account of "),
        (r"^Identify\s+", "Notice and name "),
        (r"^It is important to\s+", "A useful aim is to "),
        (r"^You can\s+", "One option is to "),
        (r"^Do not\s+", "Try not to "),
    ]
    for pattern, replacement in replacements:
        if re.search(pattern, value, re.I):
            value = re.sub(pattern, replacement, value, flags=re.I)
            break
    clauses = [part.strip() for part in re.split(r"[,;:]\s+", value) if part.strip()]
    if len(clauses) >= 2 and all(len(part.split()) >= 3 for part in clauses[:2]):
        first = clauses[0].rstrip(".?!")
        second = clauses[1].rstrip(".?!")
        value = f"{second[0].upper() + second[1:]}. This connects with the point that {first[0].lower() + first[1:]}"
    else:
        branch = re.match(r"^(.+?)\s+(because|when|if|while|so that)\s+(.+)$", value, flags=re.I)
        if branch and len(branch.group(1).split()) >= 4 and len(branch.group(3).split()) >= 4:
            lead = branch.group(3).rstrip(".?!")
            value = f"{lead[0].upper() + lead[1:]}; {branch.group(2).lower()} that is the case, {branch.group(1)[0].lower() + branch.group(1)[1:]}"
    word_swaps = {
        " in order to ": " so you can ", " however ": " while ", " determine ": " work out ",
        " utilize ": " use ", " prior to ": " before ", " following ": " after ",
        " difficult ": " hard ", " immediately ": " right away ", " attempt to ": " try to ",
    }
    padded = f" {value} "
    for source, replacement in word_swaps.items():
        padded = re.sub(re.escape(source), replacement, padded, flags=re.I)
    value = padded.strip()
    value = break_shared_ngrams(original, value)
    if value and value[-1] not in ".?!":
        value += "."
    return value


def break_shared_ngrams(source: str, value: str, size: int = 8) -> str:
    """Break long copied runs after structural rewriting without touching skill names."""
    source_words = [re.sub(r"[^a-z0-9']", "", word.lower()) for word in source.split()]
    source_grams = {tuple(source_words[index:index + size]) for index in range(max(0, len(source_words) - size + 1))}
    words = value.split()
    protected = {"tipp", "dear", "man", "give", "fast", "accepts", "improve"}
    swaps = {
        "and": "as well as", "but": "while", "because": "since", "when": "at the point when",
        "before": "ahead of", "after": "following", "use": "apply", "using": "applying",
        "describe": "put into words", "record": "make a note of", "choose": "select",
        "situation": "circumstances", "behaviour": "action", "behavior": "action",
        "important": "worth noting", "different": "not the same", "help": "support",
    }
    for _ in range(24):
        normalized = [re.sub(r"[^a-z0-9']", "", word.lower()) for word in words]
        match_at = next((index for index in range(max(0, len(words) - size + 1)) if tuple(normalized[index:index + size]) in source_grams), None)
        if match_at is None:
            break
        replaced = False
        for offset in (4, 3, 5, 2, 6, 1):
            index = match_at + offset
            token = normalized[index]
            if token in protected:
                continue
            if token in swaps:
                punctuation = re.sub(r"[A-Za-z']", "", words[index])
                words[index] = swaps[token] + punctuation
                replaced = True
                break
        if not replaced:
            words.insert(match_at + 4, "in plain terms,")
    return " ".join(words)


def content_sentences(text: str) -> list[str]:
    plain = strip_markdown(text)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", plain)
    result = []
    for sentence in parts:
        sentence = sentence.strip()
        if 8 <= len(sentence.split()) <= 45 and not sentence.lower().startswith(("text version", "native version")):
            result.append(sentence)
    return unique(result)


def plain_heading(heading: str) -> str:
    value = normalize_label(heading)
    canonical = ("TIPP", "DEAR MAN", "GIVE", "FAST", "ACCEPTS", "IMPROVE", "Wise Mind", "Check the Facts", "Opposite Action")
    if any(name.lower() in value.lower() for name in canonical):
        return value
    swaps = {
        "overview": "At a glance", "guidelines": "Helpful guide", "factors": "What can affect this",
        "practice": "Try it for yourself", "worksheet": "Your worksheet", "example": "Worked example",
        "understanding": "Making sense of", "additional": "More",
    }
    for source, replacement in swaps.items():
        value = re.sub(rf"\b{source}\b", replacement, value, flags=re.I)
    return value


def build_blocks(row: dict[str, str], text: str, structure: dict[str, Any], classification: str, fields: list[dict[str, Any]]) -> list[dict[str, str]]:
    title = row["resource_title"]
    if classification == "informational":
        purpose = f"This adapted text gives an easier-to-scan explanation of {title}. Use it alongside the printable source while the wording is reviewed."
    else:
        purpose = f"This adapted worksheet helps you work through {title} step by step. Your answers are for your own reflection and can be skipped or revised."
    blocks: list[dict[str, str]] = [{"id": f"{row['id']}-b01", "type": "paragraph", "text": purpose}]
    headings = structure["headings"][:8]
    sentences = content_sentences(text)[:8]
    if headings:
        for heading in headings:
            if len(blocks) >= 10:
                break
            text_value = plain_heading(heading)
            if text_value.lower() in {"due date name week starting", "name", "date"}:
                continue
            blocks.append({"id": f"{row['id']}-b{len(blocks)+1:02d}", "type": "heading", "text": text_value})
            matching = next((s for s in sentences if any(word.lower() in s.lower() for word in heading.split()[:3] if len(word) > 4)), "")
            if matching:
                para = paraphrase_statement(matching)
                if para:
                    blocks.append({"id": f"{row['id']}-b{len(blocks)+1:02d}", "type": "paragraph", "text": para})
    if len(blocks) == 1:
        for sentence in sentences[:5]:
            para = paraphrase_statement(sentence)
            if para:
                blocks.append({"id": f"{row['id']}-b{len(blocks)+1:02d}", "type": "bullet", "text": para})
    if len(blocks) == 1:
        blocks.append({
            "id": f"{row['id']}-b02", "type": "note",
            "text": "REVIEW NEEDED: the available extraction does not contain enough reliable wording to create a detailed draft. Compare this record with the printable source.",
        })
    if fields:
        blocks.append({
            "id": f"{row['id']}-b{len(blocks)+1:02d}", "type": "note",
            "text": f"The interactive draft contains {len(fields)} response area{'s' if len(fields) != 1 else ''}. Check each prompt against the printable source before approval.",
        })
    return blocks


def guidance_probes(label: str) -> list[str]:
    low = label.lower()
    if "situation" in low or "happened" in low or "event" in low:
        return ["What feels most relevant about the setting or timing?", "What changed just before you noticed a reaction?"]
    if "thought" in low or "interpret" in low or "belief" in low:
        return ["What words or images went through your mind?", "How certain did that thought feel at the time?"]
    if "emotion" in low or "feeling" in low:
        return ["What name fits the feeling best?", "Did more than one emotion show up?"]
    if "body" in low or "sensation" in low:
        return ["Where did you notice it in your body?", "Did the sensation change over time?"]
    if "before" in low or "after" in low or "rating" in low:
        return ["What made that number fit better than the number above or below it?"]
    if "plan" in low or "goal" in low or "next" in low:
        return ["What is the smallest realistic version of that step?", "What support or reminder might help?"]
    if "what did you try" in low or "action" in low:
        return ["What did you do first?", "What effect, if any, did you notice?"]
    return ["What part of this feels most important to put in your own words?"]


def summary_sections(fields: list[dict[str, Any]]) -> list[str]:
    labels = " ".join(field["label"].lower() for field in fields)
    sections = []
    for keywords, title in [
        (("situation", "event", "happened"), "Situation"),
        (("thought", "belief", "interpret"), "Thoughts or interpretations"),
        (("emotion", "feeling"), "Emotions"),
        (("body", "sensation"), "Body sensations"),
        (("urge", "action", "tried"), "Urges, actions, or what I tried"),
        (("help", "effect", "after"), "What helped or did not help"),
        (("plan", "goal", "next"), "Next step I want to consider"),
    ]:
        if any(keyword in labels for keyword in keywords):
            sections.append(title)
    sections.append("Questions I may want to discuss")
    return unique(sections)


def build_guidance(title: str, fields: list[dict[str, Any]], classification: str) -> dict[str, Any]:
    if not fields:
        return {"enabled": False, "purpose": "", "instructions": [], "questions": [], "summary_sections": []}
    return {
        "enabled": True,
        "purpose": f"Help me reflect on {title} without pressure and without going beyond the worksheet.",
        "instructions": [
            "Follow the field order below and preserve any rating range or branching choices exactly.",
            "Ask permission before offering examples and let me skip any field.",
        ],
        "questions": [
            {"field_id": field["id"], "prompt": field["label"], "probes": guidance_probes(field["label"])}
            for field in fields
        ],
        "summary_sections": summary_sections(fields),
        "classification": classification,
    }


def specialized_tool(title: str) -> dict[str, str] | None:
    for pattern, tool_id, route in TOOL_RULES:
        if pattern.search(title):
            relationship = "source-for-tool" if re.search(r"worksheet|diary|tree|chain|goal|exposure|script|practice", title, re.I) else "supporting-resource"
            return {"tool_id": tool_id, "tool_route": route, "relationship": relationship}
    return None


def normalize_similarity(text: str) -> str:
    terms = re.findall(r"[a-z0-9]+", text.lower())
    shared = {"tipp", "dear", "man", "give", "fast", "accepts", "improve", "wise", "mind", "opposite", "action"}
    return " ".join(term for term in terms if term not in shared)


def similarity_score(source: str, paraphrase: str) -> float:
    a = normalize_similarity(strip_markdown(source))
    b = normalize_similarity(strip_markdown(paraphrase))
    if not a or not b:
        return 0.0
    return round(difflib.SequenceMatcher(None, a, b, autojunk=True).ratio(), 4)


def longest_shared_ngram(source: str, paraphrase: str, size: int = 8) -> int:
    a = normalize_similarity(source).split()
    b = normalize_similarity(paraphrase).split()
    if len(a) < size or len(b) < size:
        return 0
    grams = {tuple(a[index:index + size]) for index in range(len(a) - size + 1)}
    return size if any(tuple(b[index:index + size]) in grams for index in range(len(b) - size + 1)) else 0


def qa_metadata(source_text: str, blocks: list[dict[str, str]], fields: list[dict[str, Any]], structure: dict[str, Any], classification: str, profile: dict[str, Any]) -> dict[str, Any]:
    paraphrase = "\n".join(block["text"] for block in blocks)
    score = similarity_score(source_text, paraphrase)
    shared = longest_shared_ngram(source_text, paraphrase)
    source_prompts = len(candidate_prompts({"resource_kind": "worksheet", "resource_title": "", "id": "qa"}, source_text, structure)) if structure["questions"] else 0
    flags = []
    if score >= 0.72 or shared >= 8:
        flags.append("similarity")
    if profile["word_count"] >= 100 and len(strip_markdown(paraphrase).split()) < max(25, profile["word_count"] * 0.12):
        flags.append("suspiciously-short")
    paraphrase_headings = sum(block["type"] == "heading" for block in blocks)
    if len(structure["headings"]) >= 3 and paraphrase_headings < min(2, len(structure["headings"])):
        flags.append("headings-missing")
    if classification != "informational" and not fields:
        flags.append("fields-missing")
    if classification == "informational" and fields:
        flags.append("unexpected-fields")
    if source_prompts and abs(source_prompts - len(fields)) >= max(3, source_prompts // 2):
        flags.append("prompt-field-mismatch")
    return {
        "source_prompt_count": source_prompts,
        "paraphrased_prompt_count": len(fields),
        "interactive_field_count": len(fields),
        "source_heading_count": len(structure["headings"]),
        "paraphrase_heading_count": paraphrase_headings,
        "similarity_score": score,
        "longest_shared_ngram": shared,
        "similarity_flag": "similarity" in flags,
        "completeness_flag": any(flag != "similarity" for flag in flags),
        "flags": flags,
    }


def build_record(row: dict[str, str], extraction: dict[str, str], routes: dict[str, str]) -> dict[str, Any]:
    qmd_path = ROOT / extraction["lesson_qmd"]
    qmd_text = qmd_path.read_text(encoding="utf-8")
    native = extract_native_block(row["id"], qmd_text)
    integrated = NATIVE_PLACEHOLDER in native or extraction.get("integrated_into_existing_section", "").lower() == "true"
    source_text = lesson_native_context(qmd_text) if integrated else native
    structure = markdown_structure(source_text)
    profile = source_profile(source_text, extraction, integrated)
    classification, has_input = classify(row, source_text, profile, structure)
    fields = build_fields(row, source_text, structure, has_input)
    blocks = build_blocks(row, source_text, structure, classification, fields)
    qa = qa_metadata(source_text, blocks, fields, structure, classification, profile)
    review_needed = profile["uncertain"] or bool(qa["flags"]) or any("REVIEW NEEDED" in block["text"] for block in blocks)
    status = "review-needed" if review_needed else "draft"
    tool = specialized_tool(row["resource_title"])
    resource_id = row["id"]
    return {
        "resource_id": resource_id,
        "title": row["resource_title"],
        "section": row["section"],
        "lesson_route": routes[row["lesson"]],
        "classification": classification,
        "has_input": has_input,
        "input_types": unique(field["type"] for field in fields),
        "status": status,
        "source": {
            "source_document": row["source_document"],
            "source_page": int(row["source_page"]),
            "page_type": row["page_type"],
            "resource_kind": row["resource_kind"],
            "lesson_qmd": extraction["lesson_qmd"],
            "printable_asset": source_asset(resource_id),
            "best_text_source": extraction.get("best_text_source", ""),
            "extraction_method": extraction.get("extraction_method", ""),
            "text_status": profile["status"],
            "source_hash": sha256_text(source_text),
            "original_text": source_text,
        },
        "blocks": blocks,
        "fields": fields,
        "guidance": build_guidance(row["resource_title"], fields, classification),
        "review": {
            "generated": True,
            "review_needed": review_needed,
            "confidence": profile["confidence"],
            "notes": extraction.get("notes", ""),
            "source_uncertain": profile["uncertain"],
            "source_changed": False,
            "reviewed_source_hash": None,
        },
        "qa": qa,
        "export": {
            "template_version": "compact-reference-guide-v1",
            "docx": f"/assets/paraphrased-resources/{resource_id}.docx",
            "pdf": f"/assets/paraphrased-resources/{resource_id}.pdf",
            "artifact_hash": None,
        },
        "specialized_tool": tool,
    }


def preserve_author_record(generated: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    author_owned = current.get("status") in PUBLIC_STATES or current.get("review", {}).get("generated") is False
    if not author_owned:
        return generated
    result = json.loads(json.dumps(current))
    current_hash = current.get("source", {}).get("source_hash")
    new_hash = generated["source"]["source_hash"]
    result["source"].update(generated["source"])
    result["source"]["original_text"] = generated["source"]["original_text"]
    result["review"]["source_changed"] = current_hash != new_hash
    result["review"]["reviewed_source_hash"] = current.get("review", {}).get("reviewed_source_hash") or current_hash
    result["lesson_route"] = generated["lesson_route"]
    result["section"] = generated["section"]
    result["specialized_tool"] = generated["specialized_tool"]
    return result


def failure_record(row: dict[str, str], extraction: dict[str, str], routes: dict[str, str], error: Exception) -> dict[str, Any]:
    resource_id = row["id"]
    has_input = row.get("resource_kind") in {"worksheet", "exercise"}
    fields = []
    if has_input:
        fields = [{
            "id": f"{resource_id}-q01", "type": "reflection",
            "label": f"What would you like to record for {row['resource_title']}?",
            "help": "REVIEW NEEDED: generation failed; reconstruct this field from the printable source.",
            "required": False,
        }]
    return {
        "resource_id": resource_id, "title": row["resource_title"], "section": row["section"],
        "lesson_route": routes.get(row["lesson"], "/"),
        "classification": "interactive" if has_input else "informational", "has_input": has_input,
        "input_types": ["reflection"] if has_input else [], "status": "review-needed",
        "source": {
            "source_document": row["source_document"], "source_page": int(row["source_page"]),
            "page_type": row["page_type"], "resource_kind": row["resource_kind"],
            "lesson_qmd": extraction.get("lesson_qmd", ""), "printable_asset": source_asset(resource_id),
            "best_text_source": extraction.get("best_text_source", ""),
            "extraction_method": extraction.get("extraction_method", ""),
            "text_status": "generation-failed", "source_hash": sha256_text(str(error)), "original_text": "",
        },
        "blocks": [{
            "id": f"{resource_id}-b01", "type": "note",
            "text": "REVIEW NEEDED: draft generation failed. Inspect the printable source and author this record manually.",
        }],
        "fields": fields,
        "guidance": build_guidance(row["resource_title"], fields, "interactive" if has_input else "informational"),
        "review": {
            "generated": True, "review_needed": True, "confidence": "low",
            "notes": f"Generation failure: {type(error).__name__}: {error}", "source_uncertain": True,
            "source_changed": False, "reviewed_source_hash": None,
        },
        "qa": {
            "source_prompt_count": 0, "paraphrased_prompt_count": len(fields),
            "interactive_field_count": len(fields), "source_heading_count": 0,
            "paraphrase_heading_count": 0, "similarity_score": 0.0,
            "longest_shared_ngram": 0, "similarity_flag": False,
            "completeness_flag": True, "flags": ["generation-failed"],
        },
        "export": {
            "template_version": "compact-reference-guide-v1",
            "docx": f"/assets/paraphrased-resources/{resource_id}.docx",
            "pdf": f"/assets/paraphrased-resources/{resource_id}.pdf", "artifact_hash": None,
        },
        "specialized_tool": specialized_tool(row["resource_title"]),
    }


def generate_corpus(existing: dict[str, Any] | None = None) -> dict[str, Any]:
    rows = [row for row in read_csv(INVENTORY) if row["publish"].lower() == "true"]
    extraction = {row["source_id"]: row for row in read_csv(EXTRACTION)}
    routes = lesson_routes()
    old = {record["resource_id"]: record for record in (existing or {}).get("records", [])}
    records = []
    failures = []
    for row in sorted(rows, key=lambda item: item["id"]):
        try:
            record = build_record(row, extraction[row["id"]], routes)
        except Exception as error:  # Continue the corpus and surface an explicit review record.
            failures.append({"resource_id": row["id"], "reason": f"{type(error).__name__}: {error}"})
            record = failure_record(row, extraction.get(row["id"], {}), routes, error)
        if row["id"] in old:
            record = preserve_author_record(record, old[row["id"]])
        records.append(record)
    return {
        "schema_version": 1,
        "generator_version": GENERATOR_VERSION,
        "base_guidance": load_json(BASE_GUIDANCE),
        "records": records,
        "generation_failures": failures,
    }


def validate_record(record: dict[str, Any]) -> list[str]:
    errors = []
    resource_id = record.get("resource_id", "<unknown>")
    if record.get("classification") not in VALID_CLASSIFICATIONS:
        errors.append(f"{resource_id}: invalid classification")
    if record.get("status") not in VALID_STATES:
        errors.append(f"{resource_id}: invalid status")
    if not record.get("blocks"):
        errors.append(f"{resource_id}: missing paraphrase blocks")
    fields = record.get("fields", [])
    if record.get("has_input") and not fields:
        errors.append(f"{resource_id}: interactive record has no fields")
    seen = set()
    for field in fields:
        field_id = field.get("id")
        if not field_id or field_id in seen or not str(field_id).startswith(f"{resource_id}-"):
            errors.append(f"{resource_id}: invalid or duplicate field id {field_id}")
        seen.add(field_id)
        if field.get("type") not in VALID_FIELD_TYPES or not field.get("label"):
            errors.append(f"{resource_id}: invalid field {field_id}")
        if field.get("type") == "rating-scale" and ("min" not in field or "max" not in field or field["min"] >= field["max"]):
            errors.append(f"{resource_id}: invalid rating range for {field_id}")
        if field.get("type") in {"multi-select", "single-choice", "yes-no"} and not field.get("choices"):
            errors.append(f"{resource_id}: missing choices for {field_id}")
    if record.get("has_input") and not record.get("guidance", {}).get("questions"):
        errors.append(f"{resource_id}: missing guided prompt questions")
    return errors


def validate_corpus(corpus: dict[str, Any], *, check_artifacts: bool = False) -> list[str]:
    errors = []
    if corpus.get("schema_version") != 1:
        errors.append("Unsupported corpus schema_version")
    records = corpus.get("records")
    if not isinstance(records, list):
        return errors + ["records must be an array"]
    published = {row["id"] for row in read_csv(INVENTORY) if row["publish"].lower() == "true"}
    ids = [record.get("resource_id") for record in records]
    duplicate = [key for key, count in Counter(ids).items() if count > 1]
    if duplicate:
        errors.append(f"Duplicate resource IDs: {', '.join(sorted(duplicate))}")
    missing = published - set(ids)
    extra = set(ids) - published
    if missing:
        errors.append(f"Missing published resource IDs: {', '.join(sorted(missing))}")
    if extra:
        errors.append(f"Unknown resource IDs: {', '.join(sorted(extra))}")
    for record in records:
        errors.extend(validate_record(record))
        source_path = ROOT / record.get("source", {}).get("lesson_qmd", "")
        if not source_path.is_file():
            errors.append(f"{record.get('resource_id')}: lesson source does not resolve")
        if record.get("source", {}).get("printable_asset"):
            printable = SITE / record["source"]["printable_asset"].lstrip("/")
            if not printable.is_file():
                errors.append(f"{record.get('resource_id')}: printable source does not resolve")
        if check_artifacts and record.get("status") in PUBLIC_STATES and record.get("has_input"):
            for kind in ("docx", "pdf"):
                artifact = SITE / record["export"][kind].lstrip("/")
                if not artifact.is_file():
                    errors.append(f"{record.get('resource_id')}: missing approved {kind} artifact")
    return errors


def corpus_counts(corpus: dict[str, Any]) -> dict[str, Any]:
    records = corpus["records"]
    field_types = Counter(field["type"] for record in records for field in record["fields"])
    return {
        "total": len(records),
        "informational": sum(record["classification"] == "informational" for record in records),
        "interactive": sum(record["classification"] == "interactive" for record in records),
        "mixed": sum(record["classification"] == "mixed" for record in records),
        "has_input": sum(record["has_input"] for record in records),
        "draft": sum(record["status"] == "draft" for record in records),
        "review_needed": sum(record["status"] == "review-needed" for record in records),
        "approved": sum(record["status"] in PUBLIC_STATES for record in records),
        "source_uncertain": sum(record["review"].get("source_uncertain") for record in records),
        "similarity_flags": sum(record["qa"].get("similarity_flag") for record in records),
        "completeness_flags": sum(record["qa"].get("completeness_flag") for record in records),
        "specialized_tools": sum(bool(record.get("specialized_tool")) for record in records),
        "guided_prompts": sum(bool(record.get("guidance", {}).get("enabled")) for record in records),
        "total_fields": sum(len(record["fields"]) for record in records),
        "field_types": dict(sorted(field_types.items())),
    }


def review_version(corpus: dict[str, Any]) -> str:
    payload = "\n".join(
        f"{record['resource_id']}|{record['source']['source_hash']}|{record['status']}"
        for record in corpus["records"]
    )
    return sha256_text(payload)[:16]


def prompt_text(corpus: dict[str, Any], record: dict[str, Any], answers: dict[str, Any] | None = None) -> str:
    guidance = record["guidance"]
    lines = list(corpus["base_guidance"]["contract"])
    lines.extend(["", f"Worksheet: {record['title']}", f"Purpose: {guidance['purpose']}", "", "Worksheet sequence:"])
    for index, question in enumerate(guidance["questions"], 1):
        lines.append(f"{index}. {question['prompt']}")
        if question.get("probes"):
            lines.append("   Optional probes: " + " | ".join(question["probes"]))
    lines.extend(["", "Use only the summary sections that fit this worksheet:"])
    lines.extend(f"- {section}" for section in guidance["summary_sections"])
    if answers is not None:
        lines.extend(["", "My current worksheet responses (treat blanks as unanswered):"])
        by_id = {field["id"]: field for field in record["fields"]}
        for field_id, value in answers.items():
            if field_id in by_id and value not in (None, "", [], {}):
                rendered = ", ".join(map(str, value)) if isinstance(value, list) else str(value)
                lines.append(f"- {by_id[field_id]['label']}: {rendered}")
    return "\n".join(lines).strip() + "\n"


def public_record(record: dict[str, Any]) -> dict[str, Any]:
    result = {key: value for key, value in record.items() if key != "review"}
    result["source"] = {
        key: value for key, value in record["source"].items()
        if key not in {"original_text", "source_hash", "lesson_qmd"}
    }
    result["qa"] = {}
    return result


def html_escape_json(data: Any) -> str:
    return html.escape(json.dumps(data, ensure_ascii=False), quote=False)

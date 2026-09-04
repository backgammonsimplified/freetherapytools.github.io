#!/usr/bin/env python3
"""Record and extract visually verified clean DBT resource matches.

The section-scan inventory remains the curriculum authority. This script records
one row for every published curriculum resource, and extracts only the pages that
have a high-confidence printed identifier/title match in the reference book.
"""

from __future__ import annotations

import argparse
import csv
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "data" / "source-inventory.csv"
MATCHES = ROOT / "data" / "book-matches.csv"
CLEAN_ROOT = ROOT / "site" / "resources" / "clean"


# source_id: (physical PDF page, module, printed identifier, printed title)
# Each entry was checked against the identifier/title visible on the curriculum
# page and against the corresponding rendered reference-book PDF page.
HIGH_MATCHES = {
    # Distress Tolerance
    "distress-tolerance-p004": (350, "Distress Tolerance", "Handout 3", "When to Use Crisis Survival Skills"),
    "distress-tolerance-p005": (369, "Distress Tolerance", "Handout 12", "Turning the Mind"),
    "distress-tolerance-p006": (370, "Distress Tolerance", "Handout 13", "Willingness"),
    "distress-tolerance-p007": (351, "Distress Tolerance", "Handout 4", "STOP Skill"),
    "distress-tolerance-p008": (420, "Distress Tolerance", "Worksheet 10", "Turning the Mind, Willingness, Willfulness"),
    "distress-tolerance-p012": (353, "Distress Tolerance", "Handout 6", "TIP Skills: Changing Your Body Chemistry"),
    "distress-tolerance-p013": (354, "Distress Tolerance", "Handout 6a", "Using Cold Water, Step by Step"),
    "distress-tolerance-p014": (355, "Distress Tolerance", "Handout 6b", "Paired Muscle Relaxation, Step by Step"),
    "distress-tolerance-p016": (400, "Distress Tolerance", "Worksheet 4", "Changing Body Chemistry with TIP Skills"),
    "distress-tolerance-p018": (357, "Distress Tolerance", "Handout 7", "Distracting"),
    "distress-tolerance-p020": (358, "Distress Tolerance", "Handout 8", "Self-Soothing"),
    "distress-tolerance-p022": (405, "Distress Tolerance", "Worksheet 5b", "Distracting with Wise Mind ACCEPTS"),
    "distress-tolerance-p025": (360, "Distress Tolerance", "Handout 9", "Improving the Moment"),
    "distress-tolerance-p030": (352, "Distress Tolerance", "Handout 5", "Pros and Cons"),
    "distress-tolerance-p032": (398, "Distress Tolerance", "Worksheet 3", "Pros and Cons of Acting on Crisis Urges"),
    "distress-tolerance-p037": (366, "Distress Tolerance", "Handout 11", "Radical Acceptance"),
    "distress-tolerance-p038": (367, "Distress Tolerance", "Handout 11a", "Radical Acceptance: Factors That Interfere"),
    "distress-tolerance-p040": (368, "Distress Tolerance", "Handout 11b", "Practicing Radical Acceptance Step by Step"),
    "distress-tolerance-p041": (371, "Distress Tolerance", "Handout 14", "Half-Smiling and Willing Hands"),
    "distress-tolerance-p046": (418, "Distress Tolerance", "Worksheet 9", "Radical Acceptance"),
    "distress-tolerance-p047": (372, "Distress Tolerance", "Handout 14a", "Practicing Half-Smiling and Willing Hands (1 of 2)"),
    "distress-tolerance-p048": (373, "Distress Tolerance", "Handout 14a", "Practicing Half-Smiling and Willing Hands (2 of 2)"),
    # Interpersonal Effectiveness
    "interpersonal-effectiveness-p009": (142, "Interpersonal Effectiveness", "Handout 2", "Factors in the Way of Interpersonal Effectiveness"),
    "interpersonal-effectiveness-p010": (143, "Interpersonal Effectiveness", "Handout 2a", "Myths in the Way of Interpersonal Effectiveness"),
    "interpersonal-effectiveness-p011": (192, "Interpersonal Effectiveness", "Worksheet 2", "Challenging Myths in the Way of Obtaining Objectives"),
    "interpersonal-effectiveness-p012": (193, "Interpersonal Effectiveness", "Worksheet 2", "Challenging Myths in the Way of Relationship and Self-Respect Effectiveness"),
    "interpersonal-effectiveness-p013": (147, "Interpersonal Effectiveness", "Handout 3", "Overview: Obtaining Objectives Skillfully"),
    "interpersonal-effectiveness-p014": (148, "Interpersonal Effectiveness", "Handout 4", "Clarifying Goals in Interpersonal Situations"),
    "interpersonal-effectiveness-p015": (197, "Interpersonal Effectiveness", "Worksheet 3", "Clarifying Priorities in Interpersonal Situations"),
    "interpersonal-effectiveness-p017": (149, "Interpersonal Effectiveness", "Handout 5", "Guidelines for Objectives Effectiveness: DEAR MAN (1 of 2)"),
    "interpersonal-effectiveness-p018": (150, "Interpersonal Effectiveness", "Handout 5", "Guidelines for Objectives Effectiveness: DEAR MAN (2 of 2)"),
    "interpersonal-effectiveness-p019": (151, "Interpersonal Effectiveness", "Handout 5a", "Applying DEAR MAN Skills to a Difficult Current Interaction"),
    "interpersonal-effectiveness-p023": (152, "Interpersonal Effectiveness", "Handout 6", "Guidelines for Relationship Effectiveness: GIVE"),
    "interpersonal-effectiveness-p024": (153, "Interpersonal Effectiveness", "Handout 6a", "Expanding the V in GIVE: Levels of Validation"),
    "interpersonal-effectiveness-p033": (154, "Interpersonal Effectiveness", "Handout 7", "Guidelines for Self-Respect Effectiveness: FAST"),
    "interpersonal-effectiveness-p037": (155, "Interpersonal Effectiveness", "Handout 8", "Evaluating Options for Whether or How Intensely to Ask or Say No (1 of 3)"),
    "interpersonal-effectiveness-p038": (156, "Interpersonal Effectiveness", "Handout 8", "Factors to Consider (2 of 3)"),
    "interpersonal-effectiveness-p039": (157, "Interpersonal Effectiveness", "Handout 8", "Factors to Consider (3 of 3)"),
    "interpersonal-effectiveness-p040": (158, "Interpersonal Effectiveness", "Handout 9", "Troubleshooting: When What You Are Doing Is Not Working (1 of 2)"),
    "interpersonal-effectiveness-p041": (159, "Interpersonal Effectiveness", "Handout 9", "Troubleshooting: When What You Are Doing Is Not Working (2 of 2)"),
    "interpersonal-effectiveness-p042": (202, "Interpersonal Effectiveness", "Worksheet 7", "Troubleshooting Interpersonal Effectiveness Skills (1 of 2)"),
    "interpersonal-effectiveness-p043": (203, "Interpersonal Effectiveness", "Worksheet 7", "Troubleshooting Interpersonal Effectiveness Skills (2 of 2)"),
    "interpersonal-effectiveness-p045": (98, "Mindfulness", "Handout 10", "Walking the Middle Path: Finding the Synthesis between Opposites"),
    "interpersonal-effectiveness-p046": (168, "Interpersonal Effectiveness", "Handout 12a", "Identifying Mindfulness of Others"),
    "interpersonal-effectiveness-p047": (176, "Interpersonal Effectiveness", "Handout 16a", "Examples of Opposite Sides That Can Both Be True"),
    "interpersonal-effectiveness-p048": (177, "Interpersonal Effectiveness", "Handout 16b", "Important Opposites to Balance"),
    "interpersonal-effectiveness-p049": (178, "Interpersonal Effectiveness", "Handout 16c", "Identifying Dialectics"),
    # Wellness / general behavior analysis
    "wellness-p002": (281, "Emotion Regulation", "Handout 20", "Taking Care of Your Mind by Taking Care of Your Body"),
    "wellness-p008": (331, "Emotion Regulation", "Worksheet 14b", "Sleep Hygiene Practice Sheet"),
    "wellness-p023": (43, "General", "Handout 6", "Overview: Analyzing Behavior"),
    "wellness-p032": (62, "General", "Worksheet 3", "Missing-Links Analysis"),
    # Emotion Regulation
    "emotion-regulation-p004": (229, "Emotion Regulation", "Handout 1", "Goals of Emotion Regulation"),
    "emotion-regulation-p005": (234, "Emotion Regulation", "Handout 3", "What Emotions Do for You"),
    "emotion-regulation-p006": (235, "Emotion Regulation", "Handout 4", "What Makes It Hard to Regulate Your Emotions"),
    "emotion-regulation-p007": (236, "Emotion Regulation", "Handout 4a", "Myths about Emotions"),
    "emotion-regulation-p008": (302, "Emotion Regulation", "Worksheet 2c", "Example: Emotion Diary"),
    "emotion-regulation-p009": (301, "Emotion Regulation", "Worksheet 2b", "Emotion Diary"),
    "emotion-regulation-p012": (237, "Emotion Regulation", "Handout 5", "Model for Describing Emotions"),
    "emotion-regulation-p014": (238, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Anger"),
    "emotion-regulation-p015": (239, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Disgust"),
    "emotion-regulation-p016": (240, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Envy"),
    "emotion-regulation-p017": (241, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Fear"),
    "emotion-regulation-p018": (242, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Happiness"),
    "emotion-regulation-p019": (243, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Jealousy"),
    "emotion-regulation-p020": (244, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Love"),
    "emotion-regulation-p021": (245, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Sadness"),
    "emotion-regulation-p022": (246, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Shame"),
    "emotion-regulation-p023": (247, "Emotion Regulation", "Handout 6", "Ways to Describe Emotions: Guilt"),
    "emotion-regulation-p025": (306, "Emotion Regulation", "Worksheet 4a", "Observing and Describing Emotions"),
    "emotion-regulation-p031": (251, "Emotion Regulation", "Handout 7", "Overview: Changing Emotional Responses"),
    "emotion-regulation-p032": (252, "Emotion Regulation", "Handout 8", "Check the Facts"),
    "emotion-regulation-p033": (253, "Emotion Regulation", "Handout 8a", "Examples of Emotions That Fit the Facts"),
    "emotion-regulation-p037": (254, "Emotion Regulation", "Handout 9", "Opposite Action and Problem Solving: Deciding Which to Use"),
    "emotion-regulation-p038": (255, "Emotion Regulation", "Handout 10", "Opposite Action"),
    "emotion-regulation-p039": (265, "Emotion Regulation", "Handout 12", "Problem Solving"),
    "emotion-regulation-p040": (266, "Emotion Regulation", "Handout 13", "Reviewing Opposite Action and Problem Solving (1 of 3)"),
    "emotion-regulation-p041": (267, "Emotion Regulation", "Handout 13", "Reviewing Opposite Action and Problem Solving (2 of 3)"),
    "emotion-regulation-p042": (268, "Emotion Regulation", "Handout 13", "Reviewing Opposite Action and Problem Solving (3 of 3)"),
    "emotion-regulation-p044": (256, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Fear"),
    "emotion-regulation-p045": (257, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Anger"),
    "emotion-regulation-p046": (258, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Disgust"),
    "emotion-regulation-p047": (259, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Envy"),
    "emotion-regulation-p048": (260, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Jealousy"),
    "emotion-regulation-p049": (261, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Love"),
    "emotion-regulation-p050": (262, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Sadness"),
    "emotion-regulation-p051": (263, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Shame"),
    "emotion-regulation-p052": (264, "Emotion Regulation", "Handout 11", "Figuring Out Opposite Actions: Guilt"),
    "emotion-regulation-p053": (312, "Emotion Regulation", "Worksheet 7", "Opposite Action to Change Emotions"),
    "emotion-regulation-p054": (313, "Emotion Regulation", "Worksheet 8", "Problem Solving to Change Emotions (1 of 2)"),
    "emotion-regulation-p055": (314, "Emotion Regulation", "Worksheet 8", "Problem Solving to Change Emotions (2 of 2)"),
    "emotion-regulation-p057": (271, "Emotion Regulation", "Handout 14", "Overview: Reducing Vulnerability to Emotion Mind - ABC PLEASE"),
    "emotion-regulation-p058": (272, "Emotion Regulation", "Handout 15", "Accumulating Positive Emotions: Short Term"),
    "emotion-regulation-p059": (273, "Emotion Regulation", "Handout 16", "Pleasant Events List (1 of 3)"),
    "emotion-regulation-p060": (274, "Emotion Regulation", "Handout 16", "Pleasant Events List (2 of 3)"),
    "emotion-regulation-p061": (275, "Emotion Regulation", "Handout 16", "Pleasant Events List (3 of 3)"),
    "emotion-regulation-p062": (276, "Emotion Regulation", "Handout 17", "Accumulating Positive Emotions: Long Term"),
    "emotion-regulation-p063": (277, "Emotion Regulation", "Handout 18", "Values and Priorities List (1 of 3)"),
    "emotion-regulation-p064": (278, "Emotion Regulation", "Handout 18", "Values and Priorities List (2 of 3)"),
    "emotion-regulation-p065": (279, "Emotion Regulation", "Handout 18", "Values and Priorities List (3 of 3)"),
}


# Plausible conceptual counterparts that are deliberately not published. Their
# section pages are custom/adapted or the exact multi-page sequence is uncertain.
CANDIDATE_MATCHES = {
    "interpersonal-effectiveness-p020": (198, "Interpersonal Effectiveness", "Worksheet 4", "Writing Out Interpersonal Effectiveness Scripts"),
    "interpersonal-effectiveness-p028": (198, "Interpersonal Effectiveness", "Worksheet 4", "Writing Out Interpersonal Effectiveness Scripts"),
    "interpersonal-effectiveness-p035": (198, "Interpersonal Effectiveness", "Worksheet 4", "Writing Out Interpersonal Effectiveness Scripts"),
    "wellness-p024": (44, "General", "Handout 7", "Chain Analysis"),
    "emotion-regulation-p034": (309, "Emotion Regulation", "Worksheet 5", "Check the Facts"),
    "emotion-regulation-p036": (311, "Emotion Regulation", "Worksheet 6", "Figuring Out How to Change Unwanted Emotions"),
    "emotion-regulation-p066": (319, "Emotion Regulation", "Worksheet 10", "Pleasant Events Diary"),
    "emotion-regulation-p067": (319, "Emotion Regulation", "Worksheet 10", "Pleasant Events Diary"),
    "emotion-regulation-p068": (320, "Emotion Regulation", "Worksheet 11", "Getting from Values to Specific Action Steps"),
    "emotion-regulation-p069": (321, "Emotion Regulation", "Worksheet 11", "Getting from Values to Specific Action Steps"),
    "emotion-regulation-p071": (280, "Emotion Regulation", "Handout 19", "Build Mastery and Cope Ahead"),
    "emotion-regulation-p072": (280, "Emotion Regulation", "Handout 19", "Build Mastery and Cope Ahead"),
    "emotion-regulation-p073": (280, "Emotion Regulation", "Handout 19", "Build Mastery and Cope Ahead"),
    "emotion-regulation-p076": (325, "Emotion Regulation", "Worksheet 12", "Build Mastery and Cope Ahead"),
}


FIELDS = [
    "source_id", "source_document", "source_page", "resource_title", "resource_kind",
    "match_status", "confidence", "book_pdf_page", "book_printed_page", "book_module",
    "book_handout_or_worksheet_number", "book_title", "match_evidence", "clean_asset",
    "match_id", "match_source", "publicly_displayed", "review_state",
    "review_needed", "notes",
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def asset_paths(module: str, number: str, title: str) -> tuple[Path, Path]:
    module_slug = slugify(module)
    stem = slugify(f"{module} {number} {title}")
    directory = CLEAN_ROOT / module_slug
    return directory / f"{stem}-clean.pdf", directory / f"{stem}-clean.jpg"


def build_rows() -> list[dict[str, str]]:
    inventory = list(csv.DictReader(INVENTORY.open(encoding="utf-8-sig")))
    rows: list[dict[str, str]] = []
    for source in inventory:
        if source["publish"].lower() != "true":
            continue
        source_id = source["id"]
        match = HIGH_MATCHES.get(source_id)
        candidate = CANDIDATE_MATCHES.get(source_id)
        values = match or candidate
        row = {
            "source_id": source_id,
            "source_document": source["source_document"],
            "source_page": source["source_page"],
            "resource_title": source["resource_title"],
            "resource_kind": source["resource_kind"],
            "match_status": "none",
            "confidence": "none",
            "book_pdf_page": "",
            "book_printed_page": "",
            "book_module": "",
            "book_handout_or_worksheet_number": "",
            "book_title": "",
            "match_evidence": "No exact printed identifier/title match verified.",
            "clean_asset": "",
            "match_id": "",
            "match_source": "",
            "publicly_displayed": "false",
            "review_state": "unmatched",
            "review_needed": "false",
            "notes": "Current curriculum resource remains the only public copy.",
        }
        if values:
            pdf_page, module, number, title = values
            row.update({
                "match_status": "matched" if match else "candidate",
                "confidence": "high" if match else "candidate",
                "book_pdf_page": str(pdf_page),
                "book_printed_page": str(pdf_page - 24),
                "book_module": module,
                "book_handout_or_worksheet_number": number,
                "book_title": title,
                "review_needed": "false" if match else "true",
            })
            if match:
                pdf_path, _ = asset_paths(module, number, title)
                row["match_evidence"] = "Printed identifier and title agree; content visually verified against the reference-book PDF."
                row["clean_asset"] = "/" + pdf_path.relative_to(ROOT / "site").as_posix()
                row["match_id"] = f"linehan-book:{source_id}"
                row["match_source"] = "linehan-book"
                row["publicly_displayed"] = "true"
                row["review_state"] = "pending"
                row["notes"] = "High-confidence clean copy is displayed below the selected curriculum handout."
            else:
                row["match_evidence"] = "Conceptually related page found, but printed title or page sequence is not an exact one-to-one match."
                row["review_state"] = "possible"
                row["notes"] = "Review needed; candidate is not published."
        rows.append(row)
    return rows


def write_rows(rows: list[dict[str, str]]) -> None:
    MATCHES.parent.mkdir(parents=True, exist_ok=True)
    with MATCHES.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def command_path(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Required command not found: {name}")
    return path


def extract_assets(book: Path, rows: list[dict[str, str]]) -> None:
    if not book.is_file():
        raise FileNotFoundError(book)
    ghostscript = command_path("gswin64c")
    pdftoppm = command_path("pdftoppm")
    expected: set[Path] = set()
    for row in rows:
        if row["confidence"] != "high":
            continue
        pdf_path, preview_path = asset_paths(
            row["book_module"], row["book_handout_or_worksheet_number"], row["book_title"]
        )
        expected.update({pdf_path, preview_path})
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        page = row["book_pdf_page"]
        subprocess.run(
            [ghostscript, "-q", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite",
             f"-dFirstPage={page}", f"-dLastPage={page}", f"-sOutputFile={pdf_path}", str(book)],
            check=True,
        )
        prefix = preview_path.with_suffix("")
        subprocess.run(
            [pdftoppm, "-f", "1", "-l", "1", "-singlefile", "-jpeg", "-r", "144",
             str(pdf_path), str(prefix)],
            check=False,
        )
        if not preview_path.is_file() or preview_path.stat().st_size == 0:
            raise RuntimeError(f"Preview extraction failed: {preview_path}")
    for stale in CLEAN_ROOT.rglob("*-clean.*") if CLEAN_ROOT.exists() else ():
        if stale not in expected:
            stale.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", type=Path, required=True)
    parser.add_argument("--extract", action="store_true", help="Extract high-confidence single-page PDF and preview assets.")
    args = parser.parse_args()
    rows = build_rows()
    write_rows(rows)
    if args.extract:
        extract_assets(args.book, rows)
    counts = {status: sum(row["confidence"] == status for row in rows) for status in ("high", "candidate", "none")}
    print(f"Book matches: {len(rows)} checked; {counts['high']} high; {counts['candidate']} candidate; {counts['none']} none.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

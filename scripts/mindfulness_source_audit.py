"""Generate and validate both Mindfulness source authorities.

The legacy records preserve the DBT-book pages already assigned to the
curriculum. Program records describe the separately supplied 104-page source
scan without making the production build depend on the private source file.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUTPUT = SITE / "data" / "mindfulness-source-audit.json"
DBT_SOURCE = "dbt_skills_training_handouts_and_worksheets_-_linehan_marsha_srg_.pdf"
PROGRAM_SOURCE = "3-mindfulness.pdf"
PROGRAM_SHA256 = "04b7a5746ae9aec78d683d337015d75e4d28ad9191b4613dda318eba1162ec26"
DBT_SHA256 = "5638f76999ffb3d19a6eee3b4404f71a82e85676d7d237baa0782defb28b132e"

LEGACY_BLANK = {68, 72, 88, 90, 100, 118, 120}
LEGACY_GROUPS = [
    (range(63, 77), "Mindfulness foundations and Wise Mind", "/learn/mindfulness/mindfulness-foundations.html", "mindfulness-foundations.qmd", "/resources/mindfulness/mindfulness-foundations-source.pdf", "thermometer"),
    (range(77, 82), "Observe", "/learn/mindfulness/what-skills.html#observe", "what-skills.qmd", "/resources/mindfulness/mindfulness-observe-source.pdf", "grounding"),
    (range(82, 83), "Describe", "/learn/mindfulness/describe.html", "describe.qmd", "/resources/mindfulness/mindfulness-describe-source.pdf", "emotions"),
    (range(83, 84), "Participate", "/learn/mindfulness/participate.html", "participate.qmd", "/resources/mindfulness/mindfulness-participate-source.pdf", None),
    (range(84, 86), "Non-Judgmentally", "/learn/mindfulness/how-skills.html#non-judgmentally", "how-skills.qmd", "/resources/mindfulness/mindfulness-nonjudgmentally-source.pdf", None),
    (range(86, 87), "One-Mindfully", "/learn/mindfulness/one-mindfully.html", "one-mindfully.qmd", "/resources/mindfulness/mindfulness-one-mindfully-source.pdf", None),
    (range(87, 88), "Effectively", "/learn/mindfulness/effectively.html", "effectively.qmd", "/resources/mindfulness/mindfulness-effectively-source.pdf", None),
    (range(88, 99), "Other mindfulness perspectives", "/learn/mindfulness/loving-kindness-self-compassion.html", "loving-kindness-self-compassion.qmd", "/resources/mindfulness/mindfulness-other-perspectives-source.pdf", "positive-self-talk"),
    (range(99, 108), "Core mindfulness practice worksheets", "/learn/mindfulness/mindfulness-foundations.html#practising-wise-mind", "mindfulness-foundations.qmd", "/resources/mindfulness/mindfulness-core-practice-source.pdf", "thermometer"),
    (range(108, 112), "WHAT skills practice", "/learn/mindfulness/what-skills.html", "what-skills.qmd", "/resources/mindfulness/mindfulness-what-practice-source.pdf", "grounding"),
    (range(112, 121), "HOW skills practice", "/learn/mindfulness/how-skills.html", "how-skills.qmd", "/resources/mindfulness/mindfulness-how-practice-source.pdf", None),
    (range(121, 133), "Emotion, being/doing, and middle-path practice", "/learn/mindfulness/mindfulness-of-emotions.html", "mindfulness-of-emotions.qmd", "/resources/mindfulness/mindfulness-emotions-and-middle-path-source.pdf", None),
]

SESSIONS = [
    (1, "Introduction & States of Mind", range(6, 21), "mindfulness-foundations.qmd", "/learn/mindfulness/mindfulness-foundations.html"),
    (2, "Observe", range(21, 29), "what-skills.qmd", "/learn/mindfulness/what-skills.html"),
    (3, "Describe", range(29, 35), "describe.qmd", "/learn/mindfulness/describe.html"),
    (4, "Participate", range(35, 41), "participate.qmd", "/learn/mindfulness/participate.html"),
    (5, "Non-Judgmentally", range(41, 48), "how-skills.qmd", "/learn/mindfulness/how-skills.html"),
    (6, "One-Mindfully", range(48, 52), "one-mindfully.qmd", "/learn/mindfulness/one-mindfully.html"),
    (7, "Effectively", range(52, 58), "effectively.qmd", "/learn/mindfulness/effectively.html"),
    (8, "Self-Compassion & Loving Kindness", range(58, 75), "loving-kindness-self-compassion.qmd", "/learn/mindfulness/loving-kindness-self-compassion.html"),
    (9, "Mindfulness of Emotions", range(75, 79), "mindfulness-of-emotions.qmd", "/learn/mindfulness/mindfulness-of-emotions.html"),
    (10, "Mindfulness of Thoughts", range(79, 83), "mindfulness-of-thoughts.qmd", "/learn/mindfulness/mindfulness-of-thoughts.html"),
    (11, "Grounding", range(83, 95), "grounding.qmd", "/learn/mindfulness/grounding.html"),
    (12, "Being & Doing Mind", range(95, 103), "being-mind-doing-mind.qmd", "/learn/mindfulness/being-mind-doing-mind.html"),
]

BLANK_PAGES = {2, 5, 20, 28, 34, 40, 57, 72, 74, 104}
COVER_PAGES = {6, 21, 29, 35, 41, 48, 52, 58, 75, 79, 83, 95}
REFERENCE_ONLY_PAGES = {73}
CURRICULUM_BOUNDARY_PAGES = {103}
RIGHTS_UNCONFIRMED_PAGES = {
    7, 11, *range(14, 20), 45, *range(59, 72), 73, 76,
    *range(80, 83), *range(85, 95),
}

PROGRAM_TITLES = {
    1: "Mindfulness objectives and twelve-session contents",
    2: "Blank page",
    3: "Mindfulness summary sheet and States of Mind",
    4: "WHAT and HOW skills summary",
    5: "Blank page",
    7: "How Mindful Am I? reflection",
    8: "Mindfulness Handout 1A - Mindfulness Definitions",
    9: "Mindfulness Handout 3 - Wise Mind: States of Mind",
    10: "States of Mind reflection",
    11: "Ten Steps to Mindfulness Meditation",
    12: "Mindfulness Handout 3A - Ideas for Practicing Wise Mind (1 of 2)",
    13: "Mindfulness Handout 3A - Ideas for Practicing Wise Mind (2 of 2)",
    22: "Observe teaching (1 of 2)", 23: "Observe teaching (2 of 2)",
    24: "Mindfulness Handout 4A - Ideas for Practicing Observing (1 of 4)",
    25: "Mindfulness Handout 4A - Ideas for Practicing Observing (2 of 4)",
    26: "Mindfulness Handout 4A - Ideas for Practicing Observing (3 of 4)",
    27: "Mindfulness Handout 4A - Ideas for Practicing Observing (4 of 4)",
    30: "Describe teaching (1 of 3)", 31: "Describe teaching (2 of 3)", 32: "Describe teaching (3 of 3)",
    33: "Mindfulness Handout 4B - Ideas for Practicing Describing",
    36: "Participate teaching (1 of 3)", 37: "Participate teaching (2 of 3)", 38: "Participate teaching (3 of 3)",
    39: "Mindfulness Handout 4C - Ideas for Practicing Participating",
    42: "Non-Judgmentally teaching (1 of 3)", 43: "Non-Judgmentally teaching (2 of 3)", 44: "Non-Judgmentally teaching (3 of 3)",
    45: "Observation, description, and judgment example", 46: "Reframing judgments exercise",
    47: "Mindfulness Handout 5A - Ideas for Practicing Nonjudgmentalness",
    49: "One-Mindfully teaching (1 of 2)", 50: "One-Mindfully teaching (2 of 2)",
    51: "Mindfulness Handout 5B - Ideas for Practicing One-Mindfulness",
    53: "Effectively teaching (1 of 2)", 54: "Effectively teaching (2 of 2)", 55: "Effectiveness reflection",
    56: "Mindfulness Handout 5C - Ideas for Practicing Effectiveness",
    59: "Discovering Self-Compassion", 60: "Common Myths About Self-Compassion",
    61: "Three parts of self-compassion", 62: "Self-Compassion Break", 63: "Rephrase inner criticisms",
    64: "Self-compassionate statements", 65: "Loving Kindness: what, how, and why", 66: "Loving Kindness practice",
    67: "Practicing Self-Kindness (1 of 5)", 68: "Practicing Self-Kindness (2 of 5)",
    69: "Practicing Self-Kindness (3 of 5)", 70: "Practicing Self-Kindness (4 of 5)",
    71: "Practicing Self-Kindness (5 of 5)", 73: "Self-compassion source and video links",
    76: "Mindfulness of Emotions summary", 77: "Emotion Regulation Handout 22 - Mindfulness of Current Emotions",
    78: "Practicing Mindfulness of Emotions at Home",
    80: "Mindfulness of Current Thoughts and Cognitive Defusion", 81: "Cognitive defusion practices", 82: "Mindfulness of Thoughts: How To",
    84: "Grounding overview", 85: "Breathing-oriented grounding (1 of 3)", 86: "Breathing-oriented grounding (2 of 3)",
    87: "Breathing-oriented grounding (3 of 3)", 88: "Tactile grounding", 89: "Sensory grounding (1 of 2)",
    90: "Sensory and cognitive grounding (2 of 2)", 91: "Social grounding", 92: "Body scan",
    93: "Short-term intense exercise", 94: "Supportive self-talk",
    96: "Balancing Doing Mind and Being Mind", 97: "Doing Mind", 98: "Being Mind",
    99: "Mindfulness Handout 9A - Balancing Doing and Being (1 of 2)",
    100: "Mindfulness Handout 9A - Balancing Doing and Being (2 of 2)",
    101: "Mindfulness Worksheet 7A - Being and Doing Calendar (1 of 2)",
    102: "Mindfulness Worksheet 7A - Being and Doing Calendar (2 of 2)",
    103: "Interpersonal Effectiveness begins", 104: "Blank page",
}

SAFE_PUBLIC_PACKETS = {
    **{page: "/resources/mindfulness/program-source/mindfulness-foundations-program-teaching.pdf" for page in (1, 3, 4, 10)},
    **{page: "/resources/mindfulness/program-source/mindfulness-observe-program-teaching.pdf" for page in (22, 23)},
    **{page: "/resources/mindfulness/program-source/mindfulness-describe-program-teaching.pdf" for page in range(30, 33)},
    **{page: "/resources/mindfulness/program-source/mindfulness-participate-program-teaching.pdf" for page in range(36, 39)},
    **{page: "/resources/mindfulness/program-source/mindfulness-nonjudgmentally-program-teaching.pdf" for page in (42, 43, 44, 46)},
    **{page: "/resources/mindfulness/program-source/mindfulness-one-mindfully-program-teaching.pdf" for page in (49, 50)},
    **{page: "/resources/mindfulness/program-source/mindfulness-effectively-program-teaching.pdf" for page in (53, 54, 55)},
    78: "/resources/mindfulness/program-source/mindfulness-emotions-program-practice.pdf",
    84: "/resources/mindfulness/program-source/mindfulness-grounding-program-overview.pdf",
    **{page: "/resources/mindfulness/program-source/mindfulness-being-doing-program-teaching.pdf" for page in (96, 97, 98)},
}

MATCHES = [
    ("Mindfulness Handout 1A", [8], [70], "mindfulness-handout-1a-definitions"),
    ("Mindfulness Handout 3", [9], [74], "mindfulness-handout-3-wise-mind-states-of-mind"),
    ("Mindfulness Handout 3A", [12, 13], [75, 76], "mindfulness-handout-3a-practicing-wise-mind"),
    ("Mindfulness Handout 4A", [24, 25, 26, 27], [78, 79, 80, 81], "mindfulness-handout-4a-practicing-observing"),
    ("Mindfulness Handout 4B", [33], [82], "mindfulness-handout-4b-practicing-describing"),
    ("Mindfulness Handout 4C", [39], [83], "mindfulness-handout-4c-practicing-participating"),
    ("Mindfulness Handout 5A", [47], [85], "mindfulness-handout-5a-practicing-nonjudgmentalness"),
    ("Mindfulness Handout 5B", [51], [86], "mindfulness-handout-5b-practicing-one-mindfulness"),
    ("Mindfulness Handout 5C", [56], [87], "mindfulness-handout-5c-practicing-effectiveness"),
    ("Emotion Regulation Handout 22", [77], [288], "emotion-regulation-handout-22-mindfulness-current-emotions"),
    ("Mindfulness Handout 9A", [99, 100], [96, 97], "mindfulness-handout-9a-balancing-doing-being-mind"),
    ("Mindfulness Worksheet 7A", [101, 102], [123, 124], "mindfulness-worksheet-7a-being-doing-calendar"),
]


def legacy_records() -> list[dict[str, object]]:
    records = []
    for pages, title, href, qmd, pdf, tool in LEGACY_GROUPS:
        for page in pages:
            excluded = page in LEGACY_BLANK
            records.append({
                "source_file": DBT_SOURCE, "source_page": page,
                "source_title": "Blank reverse/structural page" if excluded else title,
                "assigned_learn_href": None if excluded else href,
                "assigned_source_qmd": None if excluded else f"site/learn/mindfulness/{qmd}",
                "pdf_href": None if excluded else pdf, "pdf_linked": not excluded,
                "adapted_text_present": not excluded, "interactive_tool_id": None if excluded else tool,
                "interactive_tool_linked": bool(tool) and not excluded, "excluded": excluded,
                "exclusion_reason": "Blank reverse/structural page; no educational content." if excluded else None,
            })
    return records


def session_for_page(page: int) -> tuple[int, str, range, str, str] | None:
    return next((session for session in SESSIONS if page in session[2]), None)


def exact_match_for_page(page: int) -> dict[str, object] | None:
    for handout, program_pages, book_pages, slug in MATCHES:
        if page in program_pages:
            index = program_pages.index(page)
            return {
                "source_file": DBT_SOURCE,
                "page": book_pages[index],
                "handout_number": handout,
                "exact_match": True,
                "verified_by": ["handout_or_worksheet_number", "exact_title", "internal_wording", "visual_layout"],
                "original_asset": f"/resources/mindfulness/program-source/{slug}-original.pdf",
                "clean_asset": f"/resources/clean/mindfulness/{slug}-clean.pdf",
            }
    return None


def program_records() -> list[dict[str, object]]:
    rows = []
    for page in range(1, 105):
        session = session_for_page(page)
        blank = page in BLANK_PAGES
        cover = page in COVER_PAGES
        reference_only = page in REFERENCE_ONLY_PAGES
        boundary = page in CURRICULUM_BOUNDARY_PAGES
        excluded = blank or cover or reference_only or boundary
        if page <= 5 and not blank:
            session_number, session_title, qmd, href = 1, "Introduction & States of Mind", "mindfulness-foundations.qmd", "/learn/mindfulness/mindfulness-foundations.html"
        elif session:
            session_number, session_title, _, qmd, href = session
        else:
            session_number = session_title = qmd = href = None
        match = exact_match_for_page(page)
        original = match["original_asset"] if match else SAFE_PUBLIC_PACKETS.get(page)
        if boundary:
            reason = "Interpersonal Effectiveness begins on this page; outside the Mindfulness curriculum."
        elif blank:
            reason = "Blank page; no educational content."
        elif cover:
            reason = "Session cover/structural page; the session is mapped without separate Learn content."
        elif reference_only:
            reason = "Reference/link-list page; source leads were reviewed but are not republished as curriculum content."
        else:
            reason = None
        status = "excluded" if excluded else "exact-clean-match" if match else "original-and-adapted" if original else "adapted-only-rights-unconfirmed"
        rows.append({
            "program_source_page": page,
            "program_source_title": PROGRAM_TITLES.get(page, f"{session_title} supplementary material" if session_title else "Structural page"),
            "session": session_number,
            "topic": session_title if session_title else "Curriculum boundary",
            "assigned_learn_href": None if excluded else href,
            "assigned_source_qmd": None if excluded else f"site/learn/mindfulness/{qmd}",
            "dbt_match": match,
            "older_scan_match": {
                "source_file": "3 Mindfullness.pdf", "page": page, "exact_match": True,
                "same_binary_as_program_source": True, "higher_resolution": False,
            },
            "original_source_public_asset": original,
            "clean_printable_public_asset": match["clean_asset"] if match else None,
            "adapted_text_present": not excluded,
            "third_party_redistribution_unconfirmed": page in RIGHTS_UNCONFIRMED_PAGES,
            "status": status,
            "excluded": excluded,
            "exclusion_reason": reason,
        })
    return rows


def exact_matches() -> list[dict[str, object]]:
    return [{
        "handout_number": handout,
        "program_source_pages": program_pages,
        "dbt_source_file": DBT_SOURCE,
        "dbt_source_pages": book_pages,
        "original_source_public_asset": f"/resources/mindfulness/program-source/{slug}-original.pdf",
        "clean_printable_public_asset": f"/resources/clean/mindfulness/{slug}-clean.pdf",
        "exact_match": True,
        "verified_by": ["handout_or_worksheet_number", "exact_title", "internal_wording", "visual_layout"],
    } for handout, program_pages, book_pages, slug in MATCHES]


def build() -> dict[str, object]:
    program = program_records()
    return {
        "schema_version": 2,
        "sources": {
            "dbt_book": {"source_file": DBT_SOURCE, "sha256": DBT_SHA256, "role": "existing clean-printable and curriculum authority"},
            "mindfulness_program": {"source_file": PROGRAM_SOURCE, "sha256": PROGRAM_SHA256, "page_count": 104, "role": "private authoring and provenance source", "whole_pdf_published": False},
            "older_scan": {"source_file": "3 Mindfullness.pdf", "sha256": PROGRAM_SHA256, "same_binary_as_program_source": True, "higher_resolution": False},
        },
        "scope": {"first_page": 63, "last_page": 132, "identified_pages": 70, "mapped_pages": 63, "excluded_pages": 7},
        "program_scope": {
            "first_page": 1, "last_page": 104, "identified_pages": 104,
            "substantive_pages": sum(not row["excluded"] for row in program),
            "excluded_pages": sum(row["excluded"] for row in program),
            "sessions": 12,
        },
        "session_map": [{
            "session": number, "title": title, "program_source_pages": [pages.start, pages.stop - 1],
            "assigned_source_qmd": f"site/learn/mindfulness/{qmd}", "assigned_learn_href": href,
        } for number, title, pages, qmd, href in SESSIONS],
        "exact_matches": exact_matches(),
        "records": legacy_records(),
        "program_records": program,
    }


def validate(data: dict[str, object]) -> None:
    legacy = data["records"]
    program = data["program_records"]
    assert [row["source_page"] for row in legacy] == list(range(63, 133))
    assert [row["program_source_page"] for row in program] == list(range(1, 105))
    assert len(data["session_map"]) == 12
    assert next(row for row in program if row["program_source_page"] == 103)["excluded"]
    assert data["sources"]["mindfulness_program"]["whole_pdf_published"] is False
    for row in legacy:
        if row["excluded"]:
            assert row["exclusion_reason"]
        else:
            assert (ROOT / row["assigned_source_qmd"]).is_file()
            assert (SITE / row["pdf_href"].lstrip("/")).is_file()
    for row in program:
        if row["excluded"]:
            assert row["exclusion_reason"]
            continue
        qmd = ROOT / row["assigned_source_qmd"]
        assert qmd.is_file()
        assert row["adapted_text_present"]
        if row["original_source_public_asset"]:
            assert (SITE / row["original_source_public_asset"].lstrip("/")).is_file()
        if row["clean_printable_public_asset"]:
            clean = row["clean_printable_public_asset"]
            original = row["original_source_public_asset"]
            assert (SITE / clean.lstrip("/")).is_file()
            text = qmd.read_text(encoding="utf-8")
            assert text.index(original) < text.index(clean)
        if row["third_party_redistribution_unconfirmed"] and not row["dbt_match"]:
            assert row["original_source_public_asset"] is None


def main() -> None:
    data = build()
    validate(data)
    OUTPUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    scope = data["program_scope"]
    print(f"Mindfulness source audit: 12 sessions; {scope['substantive_pages']} substantive program pages; {scope['excluded_pages']} structural/boundary exclusions; {len(data['exact_matches'])} exact clean matches")


if __name__ == "__main__":
    main()

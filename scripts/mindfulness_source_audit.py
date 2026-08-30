"""Generate and validate the page-level Mindfulness source coverage audit."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "site" / "data" / "mindfulness-source-audit.json"
SOURCE = "dbt_skills_training_handouts_and_worksheets_-_linehan_marsha_srg_.pdf"
BLANK = {68, 72, 88, 90, 100, 118, 120}
GROUPS = [
    (range(63, 77), "Mindfulness foundations and Wise Mind", "/learn/mindfulness/mindfulness-foundations.html", "mindfulness-foundations.qmd", "/resources/mindfulness/mindfulness-foundations-source.pdf", "thermometer"),
    (range(77, 82), "Observe", "/learn/mindfulness/what-skills.html#observe", "what-skills.qmd", "/resources/mindfulness/mindfulness-observe-source.pdf", "grounding"),
    (range(82, 83), "Describe", "/learn/mindfulness/describe.html", "describe.qmd", "/resources/mindfulness/mindfulness-describe-source.pdf", "emotions"),
    (range(83, 84), "Participate", "/learn/mindfulness/participate.html", "participate.qmd", "/resources/mindfulness/mindfulness-participate-source.pdf", None),
    (range(84, 86), "Non-Judgmentally", "/learn/mindfulness/how-skills.html#non-judgmentally", "how-skills.qmd", "/resources/mindfulness/mindfulness-nonjudgmentally-source.pdf", None),
    (range(86, 87), "One-Mindfully", "/learn/mindfulness/one-mindfully.html", "one-mindfully.qmd", "/resources/mindfulness/mindfulness-one-mindfully-source.pdf", None),
    (range(87, 88), "Effectively", "/learn/mindfulness/effectively.html", "effectively.qmd", "/resources/mindfulness/mindfulness-effectively-source.pdf", None),
    (range(88, 99), "Other mindfulness perspectives", "/learn/mindfulness/loving-kindness-self-compassion.html", "loving-kindness-self-compassion.qmd", "/resources/mindfulness/mindfulness-other-perspectives-source.pdf", "positive-self-talk"),
    (range(99, 108), "Core mindfulness practice worksheets", "/learn/mindfulness/mindfulness-foundations.html#practice", "mindfulness-foundations.qmd", "/resources/mindfulness/mindfulness-core-practice-source.pdf", "thermometer"),
    (range(108, 112), "WHAT skills practice", "/learn/mindfulness/what-skills.html", "what-skills.qmd", "/resources/mindfulness/mindfulness-what-practice-source.pdf", "grounding"),
    (range(112, 121), "HOW skills practice", "/learn/mindfulness/how-skills.html", "how-skills.qmd", "/resources/mindfulness/mindfulness-how-practice-source.pdf", None),
    (range(121, 133), "Emotion, being/doing, and middle-path practice", "/learn/mindfulness/mindfulness-of-emotions.html", "mindfulness-of-emotions.qmd", "/resources/mindfulness/mindfulness-emotions-and-middle-path-source.pdf", None),
]

def build() -> dict:
    records = []
    for pages, title, href, qmd, pdf, tool in GROUPS:
        for page in pages:
            excluded = page in BLANK
            records.append({
                "source_file": SOURCE,
                "source_page": page,
                "source_title": "Blank reverse/structural page" if excluded else title,
                "assigned_learn_href": None if excluded else href,
                "assigned_source_qmd": None if excluded else f"site/learn/mindfulness/{qmd}",
                "pdf_href": None if excluded else pdf,
                "pdf_linked": not excluded,
                "adapted_text_present": not excluded,
                "interactive_tool_id": None if excluded else tool,
                "interactive_tool_linked": bool(tool) and not excluded,
                "excluded": excluded,
                "exclusion_reason": "Blank reverse/structural page; no educational content." if excluded else None,
            })
    return {"schema_version": 1, "scope": {"first_page": 63, "last_page": 132, "identified_pages": 70, "mapped_pages": 63, "excluded_pages": 7}, "records": records}

def validate(data: dict) -> None:
    records = data["records"]
    assert [record["source_page"] for record in records] == list(range(63, 133))
    for record in records:
        if record["excluded"]:
            assert record["exclusion_reason"]
            continue
        qmd = ROOT / record["assigned_source_qmd"]
        pdf = ROOT / "site" / record["pdf_href"].lstrip("/")
        assert qmd.exists(), qmd
        assert pdf.exists(), pdf
        text = qmd.read_text(encoding="utf-8")
        assert record["pdf_href"] in text, f"{record['pdf_href']} not linked from {qmd}"

def main() -> None:
    data = build()
    validate(data)
    OUTPUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Mindfulness source audit: {len(data['records'])} pages; 63 mapped; 7 documented blank exclusions")

if __name__ == "__main__":
    main()

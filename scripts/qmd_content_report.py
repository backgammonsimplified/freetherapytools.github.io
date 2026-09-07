#!/usr/bin/env python3
"""Generate the committed native-QMD extraction review report."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source-inventory.csv"
EXTRACTIONS = ROOT / "data" / "qmd-resource-extraction.csv"
REPORT = ROOT / "docs" / "reviews" / "QMD-CONTENT-REVIEW.md"


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    published = [row for row in rows(SOURCE) if row["publish"] == "true"]
    extractions = rows(EXTRACTIONS)
    source_by_id = {row["id"]: row for row in published}
    by_section: dict[str, list[dict[str, str]]] = defaultdict(list)
    for record in extractions:
        by_section[source_by_id[record["source_id"]]["section"]].append(record)

    source_counts = Counter(row["best_text_source"] for row in extractions)
    method_counts = Counter(row["extraction_method"] for row in extractions)
    integrated = [row for row in extractions if row["integrated_into_existing_section"] == "true"]
    text_versions = [row for row in extractions if row["integrated_into_existing_section"] == "false"]
    review = [row for row in extractions if row["review_needed"] == "true"]
    qmds = sorted({row["lesson_qmd"] for row in extractions})

    lines = [
        "# QMD Content Review",
        "",
        "This development report tracks native educational content reconstructed directly in the existing authoritative Quarto lesson files. No parallel Markdown resource library was created.",
        "",
        "## Summary",
        "",
        f"- Published resources processed: **{len(extractions)}**",
        f"- Lesson QMD files containing resource content: **{len(qmds)}**",
        f"- Resources integrated into existing anchored sections: **{len(integrated)}**",
        f"- Resources using a local **Text Version** subsection: **{len(text_versions)}**",
        "- Tracked resources marked already-native before this pass: **0** (the existing Values workbook and Mindfulness lessons were outside the 266-resource scan inventory and were left unchanged)",
        f"- Resources requiring manual transcription/structure review: **{len(review)}**",
        "",
        "## Source Quality and Extraction",
        "",
        f"- Searchable DBT-book sources: **{source_counts['searchable-dbt-book']}**",
        f"- High-resolution `php.pdf` sources: **{source_counts['php-high-res']}**",
        f"- Current section-scan sources: **{source_counts['section-scan']}**",
        f"- Direct PDF text extractions: **{method_counts['direct_pdf_text']}**",
        f"- Windows OCR drafts: **{method_counts['windows_ocr']}**",
        f"- OCR plus manual visual transcription: **{method_counts['manual_transcription']}**",
        "",
        "Searchable-book pages use embedded text rather than OCR. Image-only pages were OCRed individually and structured in QMD; unless manually integrated or visually corrected, they remain explicitly flagged for human review. Repeated page numbers and publication boilerplate were omitted. Handwriting was not intentionally transcribed.",
        "",
        "## Curriculum Status",
        "",
        "| Curriculum | Resources | Integrated | Text Version | Review needed |",
        "|---|---:|---:|---:|---:|",
    ]
    section_order = (
        "Distress Tolerance", "Emotion Regulation", "CBT Skills",
        "Interpersonal Effectiveness", "Wellness",
        "Goal Setting & Tracking", "General Skills",
    )
    for section in section_order:
        group = by_section[section]
        lines.append(
            f"| {section} | {len(group)} | "
            f"{sum(row['integrated_into_existing_section'] == 'true' for row in group)} | "
            f"{sum(row['integrated_into_existing_section'] == 'false' for row in group)} | "
            f"{sum(row['review_needed'] == 'true' for row in group)} |"
        )
    lines.extend([
        "| Mindfulness | 0 scan resources | Existing native lessons unchanged | - | 0 |",
        "",
        "## Resources Requiring Manual Review",
        "",
        "These items are present natively but remain review-needed because their text or layout was reconstructed automatically. Review against the retained visual before treating the transcription as final.",
        "",
    ])
    for section in section_order:
        group = [row for row in by_section[section] if row["review_needed"] == "true"]
        if not group:
            continue
        lines.extend([f"### {section}", ""])
        for row in group:
            lines.append(
                f"- `{row['source_id']}` — {row['resource_title']} "
                f"([{row['lesson_qmd']}]({row['lesson_qmd']})) — "
                f"{row['best_text_source']}; {row['structure_confidence']} structure confidence"
            )
        lines.append("")

    lines.extend([
        "## Visuals Worth Recreating Natively Later",
        "",
        "- Skill Thermometer and Window of Tolerance",
        "- Emotion body map",
        "- Worry Tree",
        "- Opposite Action / Problem Solving decision tree",
        "- Behaviour Chain map",
        "- Five Factor Model",
        "- Exposure / Fear Ladder",
        "- Wide diary cards and weekly tracking tables",
        "",
        "## Representative Quality Checks",
        "",
        "- Direct searchable book page: TIPP safety and four-part layout",
        "- High-resolution PHP page: Window of Tolerance, manually linearized",
        "- Current blurry scan: progressive muscle relaxation exercise, manually transcribed without handwritten numbering",
        "- Multi-column page: Anger emotion profile, linearized into six semantic sections",
        "- Diagram: Opposite Action / Problem Solving and Worry Tree decision paths",
        "- Giant form: Thought Record linearized into eight ordered prompts",
        "- Worksheet blanks: native prompts retained without invented answers",
        "",
        "## Review Guidance",
        "",
        "Start with the review-needed list above. Compare each native section with the visual immediately above it, correct reading order and OCR errors directly in the QMD marker block, then change that inventory row to `review_needed=false`. The resource-block refresh command preserves all native marker blocks.",
    ])
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {REPORT.name}: {len(extractions)} resources; {len(review)} review-needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

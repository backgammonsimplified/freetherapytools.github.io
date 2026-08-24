#!/usr/bin/env python3
"""Generate or validate the full published resource paraphrase corpus."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import resource_paraphrases as rp


INVENTORY_FIELDS = [
    "resource_id", "lesson_route", "source_file", "source_page", "section", "title",
    "classification", "has_input", "input_types", "source_text_status", "paraphrase_status",
    "confidence", "review_needed", "notes",
]
REVIEW_FIELDS = [
    "resource_id", "section", "title", "classification", "source_page", "status", "interactive",
    "field_count", "prompt_count", "similarity_flag", "completeness_flag", "source_uncertain",
    "specialized_tool", "notes",
]
TOOL_FIELDS = ["resource_id", "tool_id", "tool_route", "relationship"]


def inventory_rows(corpus: dict) -> list[dict]:
    return [{
        "resource_id": record["resource_id"], "lesson_route": record["lesson_route"],
        "source_file": record["source"]["source_document"], "source_page": record["source"]["source_page"],
        "section": record["section"], "title": record["title"],
        "classification": record["classification"], "has_input": record["has_input"],
        "input_types": record["input_types"], "source_text_status": record["source"]["text_status"],
        "paraphrase_status": record["status"], "confidence": record["review"]["confidence"],
        "review_needed": record["review"]["review_needed"], "notes": record["review"]["notes"],
    } for record in corpus["records"]]


def review_rows(corpus: dict) -> list[dict]:
    return [{
        "resource_id": record["resource_id"], "section": record["section"], "title": record["title"],
        "classification": record["classification"], "source_page": record["source"]["source_page"],
        "status": record["status"], "interactive": record["has_input"], "field_count": len(record["fields"]),
        "prompt_count": record["qa"]["source_prompt_count"],
        "similarity_flag": record["qa"]["similarity_flag"],
        "completeness_flag": record["qa"]["completeness_flag"],
        "source_uncertain": record["review"]["source_uncertain"],
        "specialized_tool": (record.get("specialized_tool") or {}).get("tool_id", ""),
        "notes": record["review"]["notes"],
    } for record in corpus["records"]]


def tool_rows(corpus: dict) -> list[dict]:
    rows = []
    for record in corpus["records"]:
        tool = record.get("specialized_tool")
        rows.append({
            "resource_id": record["resource_id"],
            "tool_id": tool["tool_id"] if tool else "",
            "tool_route": tool["tool_route"] if tool else "",
            "relationship": tool["relationship"] if tool else "no-specialized-tool",
        })
    return rows


def render_report(corpus: dict) -> str:
    counts = rp.corpus_counts(corpus)
    excluded = len(rp.read_csv(rp.INVENTORY)) - counts["total"]
    failures = corpus.get("generation_failures", [])
    flagged = [record for record in corpus["records"] if record["qa"]["flags"] or record["review"]["source_uncertain"]]
    uncertain = [record for record in corpus["records"] if record["review"]["source_uncertain"]]
    lines = [
        "# Resource Paraphrase Review\n\n",
        "This durable report summarizes the generated draft corpus. Draft and review-needed records are not public.\n\n",
        "## Corpus\n\n",
        f"- Published target count: **{counts['total']}**\n",
        f"- Excluded source pages: **{excluded}**\n",
        f"- Informational: **{counts['informational']}**\n",
        f"- Interactive: **{counts['interactive']}**\n",
        f"- Mixed informational + interactive: **{counts['mixed']}**\n",
        f"- Total interactive/fillable resources: **{counts['has_input']}**\n",
        f"- Total structured fields: **{counts['total_fields']}**\n\n",
        "## Review status\n\n",
        f"- Draft: **{counts['draft']}**\n",
        f"- Review needed: **{counts['review_needed']}**\n",
        f"- Approved/published: **{counts['approved']}**\n",
        f"- Source extraction uncertain: **{counts['source_uncertain']}**\n",
        f"- Similarity flags: **{counts['similarity_flags']}**\n",
        f"- Completeness flags: **{counts['completeness_flags']}**\n\n",
        "## Generated systems\n\n",
        f"- Guided-reflection prompt drafts: **{counts['guided_prompts']}**\n",
        f"- Specialized Skill Finder overlaps: **{counts['specialized_tools']}**\n",
        "- Blank DOCX/PDF artifacts are generated only for approved/published interactive records.\n",
        "- Draft exports remain available in review mode as local browser-generated previews and are never copied into public asset paths.\n\n",
        "## Field types\n\n",
    ]
    lines.extend(f"- `{field_type}`: {count}\n" for field_type, count in counts["field_types"].items())
    lines.extend(["\n## Generation failures\n\n"])
    if failures:
        lines.extend(f"- `{item['resource_id']}`: {item['reason']}\n" for item in failures)
    else:
        lines.append("No record-level generator failures.\n")
    lines.extend([
        "\n## Review queue\n\n",
        f"The compact queue is in `data/resource-paraphrase-review.csv` ({len(flagged)} flagged or uncertain records). ",
        "Use the review dashboard for source/paraphrase/form/prompt comparison; this report intentionally does not duplicate full drafts.\n",
        "\n## Source extraction review queue\n\n",
        "These records could not be treated as source-certain. The draft exists, but the author must compare it with the retained page image before approval.\n\n",
    ])
    lines.extend(
        f"- `{record['resource_id']}` — {record['source']['source_document']}, page {record['source']['source_page']}\n"
        for record in uncertain
    )
    return "".join(lines)


def write_outputs(corpus: dict) -> None:
    rp.CANONICAL.write_text(rp.stable_json(corpus), encoding="utf-8", newline="\n")
    rp.write_csv(rp.INVENTORY_OUTPUT, INVENTORY_FIELDS, inventory_rows(corpus))
    rp.write_csv(rp.REVIEW_CSV, REVIEW_FIELDS, review_rows(corpus))
    rp.write_csv(rp.TOOL_MAPPING, TOOL_FIELDS, tool_rows(corpus))
    rp.REPORT.write_text(render_report(corpus), encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--update", action="store_true", help="Generate/update canonical drafts and audit artifacts")
    mode.add_argument("--validate", action="store_true", help="Validate the existing canonical corpus")
    mode.add_argument("--dry-run", action="store_true", help="Generate in memory and report counts without writing")
    parser.add_argument("--check-artifacts", action="store_true", help="Require artifacts for approved interactive records")
    args = parser.parse_args()

    existing = rp.load_json(rp.CANONICAL) if rp.CANONICAL.is_file() else None
    corpus = existing if args.validate else rp.generate_corpus(existing)
    if corpus is None:
        print("Canonical corpus does not exist", flush=True)
        return 2
    errors = rp.validate_corpus(corpus, check_artifacts=args.check_artifacts)
    counts = rp.corpus_counts(corpus)
    print(json.dumps({"counts": counts, "generation_failures": corpus.get("generation_failures", []), "validation_errors": errors}, indent=2, sort_keys=True))
    if errors:
        return 2
    if args.update:
        write_outputs(corpus)
        print(f"Wrote {len(corpus['records'])} stable records; review inventory {rp.review_version(corpus)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

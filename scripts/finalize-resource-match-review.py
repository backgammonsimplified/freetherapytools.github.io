#!/usr/bin/env python3
"""Finalize a complete exported resource-match review, with dry-run support."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
BOOK_MATCHES = ROOT / "data" / "book-matches.csv"
PHP_MATCHES = ROOT / "data" / "php-matches.csv"
SOURCE_INVENTORY = ROOT / "data" / "source-inventory.csv"

sys.path.insert(0, str(ROOT / "scripts"))
import resource_match_review  # noqa: E402


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def validate_payload(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValueError("Review file must contain a JSON object")
    if payload.get("schema_version") != 1:
        raise ValueError("Unsupported review schema_version")
    if payload.get("review_complete") is not True:
        raise ValueError("Refusing finalization: review_complete must be true")
    incorrect = payload.get("incorrect_matches")
    if not isinstance(incorrect, list):
        raise ValueError("incorrect_matches must be an array")
    return payload


def source_context(
    book_rows: list[dict[str, str]], php_rows: list[dict[str, str]],
) -> tuple[dict[str, dict[str, str]], dict[str, str], list[dict[str, str]]]:
    _, source_rows = read_csv(SOURCE_INVENTORY)
    sources = {row["id"]: row for row in source_rows if row["publish"] == "true"}
    routes = resource_match_review.route_map()
    matches = resource_match_review.displayed_matches(book_rows, php_rows, sources, routes)
    return sources, routes, matches


def validate_decisions(payload: dict[str, object], matches: list[dict[str, str]]) -> set[str]:
    expected_version = resource_match_review.inventory_version(matches)
    if payload.get("match_inventory_version") != expected_version:
        raise ValueError(
            f"Review inventory mismatch: expected {expected_version}, got "
            f"{payload.get('match_inventory_version')}"
        )
    by_id = {row["match_id"]: row for row in matches}
    rejected: set[str] = set()
    for decision in payload["incorrect_matches"]:  # type: ignore[index]
        if not isinstance(decision, dict):
            raise ValueError("Each incorrect match must be an object")
        match_id = decision.get("match_id")
        if not isinstance(match_id, str) or match_id not in by_id:
            raise ValueError(f"Unknown incorrect match_id: {match_id}")
        expected = by_id[match_id]
        for field in ("source_id", "match_source", "candidate_asset"):
            if decision.get(field) != expected[field]:
                raise ValueError(f"Incorrect match metadata does not agree for {match_id}: {field}")
        if match_id in rejected:
            raise ValueError(f"Duplicate incorrect match_id: {match_id}")
        rejected.add(match_id)
    return rejected


def current_asset(source_id: str) -> Path:
    return SITE / "resources" / source_id.rsplit("-p", 1)[0] / f"{source_id}.jpg"


def referenced_in_site(asset: Path) -> bool:
    href = "/" + asset.relative_to(SITE).as_posix()
    text_extensions = {".qmd", ".md", ".html", ".js", ".json", ".yml", ".yaml", ".css"}
    for path in SITE.rglob("*"):
        if not path.is_file() or path == asset or path.suffix.lower() not in text_extensions:
            continue
        try:
            if href in path.read_text(encoding="utf-8"):
                return True
        except UnicodeDecodeError:
            continue
    return False


def apply_states(
    rows: list[dict[str, str]], rejected: set[str], *, book: bool,
) -> set[str]:
    accepted_sources: set[str] = set()
    for row in rows:
        is_high = row["confidence"] == "high" if book else row["php_match_status"] == "high"
        if not is_high:
            continue
        if row["match_id"] in rejected:
            row["review_state"] = "rejected"
            row["publicly_displayed"] = "false"
            row["notes"] = "Rejected during complete human resource-match review; original copy retained."
        else:
            row["review_state"] = "accepted"
            row["publicly_displayed"] = "true"
            row["notes"] = "Accepted during complete human resource-match review; higher-quality copy is primary."
            accepted_sources.add(row["source_id"])
    return accepted_sources


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_json", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        payload = validate_payload(json.loads(args.review_json.read_text(encoding="utf-8")))
        book_fields, book_rows = read_csv(BOOK_MATCHES)
        php_fields, php_rows = read_csv(PHP_MATCHES)
        sources, _, matches = source_context(book_rows, php_rows)
        rejected = validate_decisions(payload, matches)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2

    accepted = {row["match_id"] for row in matches} - rejected
    better_sources = {row["source_id"] for row in matches}
    unmatched = set(sources) - better_sources
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "review_complete": True,
        "accepted_matches": len(accepted),
        "rejected_matches": len(rejected),
        "unmatched_resources": len(unmatched),
    }
    print(json.dumps(summary, sort_keys=True))
    if args.dry_run:
        return 0

    accepted_sources = apply_states(book_rows, rejected, book=True)
    accepted_sources.update(apply_states(php_rows, rejected, book=False))
    write_csv(BOOK_MATCHES, book_fields, book_rows)
    write_csv(PHP_MATCHES, php_fields, php_rows)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "section_scan_inventory.py"), "--refresh-resource-blocks"], check=True)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "resource_match_review.py")], check=True)
    removed = 0
    for source_id in sorted(accepted_sources):
        asset = current_asset(source_id)
        if asset.is_file() and not referenced_in_site(asset):
            asset.unlink()
            removed += 1
    print(f"Removed {removed} unreferenced lower-resolution generated assets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

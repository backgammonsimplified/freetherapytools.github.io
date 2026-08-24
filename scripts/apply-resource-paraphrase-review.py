#!/usr/bin/env python3
"""Safely apply exported resource-paraphrase review JSON to canonical data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import resource_paraphrases as rp


ALLOWED_CHANGES = {"title", "blocks", "fields", "guidance", "review_notes", "status"}


def load_payload(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise ValueError("Review file must be a schema_version 1 JSON object")
    if not isinstance(payload.get("changes"), list):
        raise ValueError("Review file changes must be an array")
    return payload


def validate_change(change: Any, records: dict[str, dict], seen: set[str]) -> tuple[str, dict]:
    if not isinstance(change, dict):
        raise ValueError("Every change must be an object")
    resource_id = change.get("resource_id")
    if not isinstance(resource_id, str) or resource_id not in records:
        raise ValueError(f"Unknown resource_id: {resource_id}")
    if resource_id in seen:
        raise ValueError(f"Duplicate review change: {resource_id}")
    seen.add(resource_id)
    expected = change.get("expected_source_hash")
    actual = records[resource_id]["source"]["source_hash"]
    if expected != actual:
        raise ValueError(f"Source hash mismatch for {resource_id}: expected current {actual}, got {expected}")
    patch = change.get("changes")
    if not isinstance(patch, dict) or not patch:
        raise ValueError(f"{resource_id}: changes must be a non-empty object")
    unknown = set(patch) - ALLOWED_CHANGES
    if unknown:
        raise ValueError(f"{resource_id}: unsupported change keys: {', '.join(sorted(unknown))}")
    if "status" in patch and patch["status"] not in rp.VALID_STATES:
        raise ValueError(f"{resource_id}: invalid status {patch['status']}")
    if "title" in patch and (not isinstance(patch["title"], str) or not patch["title"].strip()):
        raise ValueError(f"{resource_id}: title must not be empty")
    return resource_id, patch


def apply_patch_to_record(record: dict, patch: dict) -> None:
    for key in ("title", "blocks", "fields", "guidance", "status"):
        if key in patch:
            record[key] = patch[key]
    if "review_notes" in patch:
        record["review"]["notes"] = str(patch["review_notes"])
    record["review"]["generated"] = False
    record["review"]["reviewed_source_hash"] = record["source"]["source_hash"]
    record["review"]["source_changed"] = False
    record["review"]["review_needed"] = record["status"] == "review-needed"
    record["has_input"] = bool(record["fields"])
    record["input_types"] = rp.unique(field["type"] for field in record["fields"])
    if not record["has_input"]:
        record["classification"] = "informational"
    elif record["classification"] == "informational":
        record["classification"] = "interactive"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_json", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        payload = load_payload(args.review_json)
        corpus = rp.load_json(rp.CANONICAL)
        current_version = rp.review_version(corpus)
        if payload.get("corpus_version") != current_version:
            raise ValueError(f"Corpus version mismatch: expected {current_version}, got {payload.get('corpus_version')}")
        records = {record["resource_id"]: record for record in corpus["records"]}
        seen: set[str] = set()
        validated = [validate_change(change, records, seen) for change in payload["changes"]]
        for resource_id, patch in validated:
            apply_patch_to_record(records[resource_id], patch)
        errors = rp.validate_corpus(corpus)
        if errors:
            raise ValueError("\n".join(errors))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(str(error))
        return 2
    summary = {"mode": "apply" if args.apply else "dry-run", "records_scanned": len(corpus["records"]), "records_changed": len(validated), "records_skipped": len(corpus["records"]) - len(validated), "validation_errors": 0}
    print(json.dumps(summary, sort_keys=True))
    if args.dry_run:
        return 0
    backup_dir = rp.ROOT / "tmp" / "resource-paraphrase-backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"resource-paraphrases-{current_version}.json"
    if not backup.exists():
        backup.write_text(rp.CANONICAL.read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
    rp.CANONICAL.write_text(rp.stable_json(corpus), encoding="utf-8", newline="\n")
    print(f"Backup: {backup.relative_to(rp.ROOT).as_posix()}")
    print("Changed records: " + ", ".join(resource_id for resource_id, _ in validated))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

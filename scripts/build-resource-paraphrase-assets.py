#!/usr/bin/env python3
"""Build public-gated and optional local-review JSON assets."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import resource_paraphrases as rp


OUTPUT = rp.SITE / "data" / "resource-paraphrases"
REVIEW_ASSET = OUTPUT / "review.json"


def bundle_name(route: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", route.lower()).strip("-") or "root"
    return f"public-{slug}.json"


def build(*, review: bool, dry_run: bool = False) -> dict:
    corpus = rp.load_json(rp.CANONICAL)
    errors = rp.validate_corpus(corpus)
    if errors:
        raise ValueError("\n".join(errors))
    public = [record for record in corpus["records"] if record["status"] in rp.PUBLIC_STATES]
    by_route: dict[str, list[dict]] = {}
    for record in public:
        by_route.setdefault(record["lesson_route"], []).append(rp.public_record(record))
    manifest = {
        "schema_version": 1,
        "corpus_version": rp.review_version(corpus),
        "published_count": len(public),
        "base_guidance": corpus["base_guidance"],
        "routes": {route: bundle_name(route) for route in sorted(by_route)},
    }
    summary = {"public_records": len(public), "public_bundles": len(by_route), "review_asset": review}
    if dry_run:
        return summary
    OUTPUT.mkdir(parents=True, exist_ok=True)
    expected = {bundle_name(route) for route in by_route}
    for stale in OUTPUT.glob("public-*.json"):
        if stale.name not in expected:
            stale.unlink()
    for route, records in sorted(by_route.items()):
        payload = {"schema_version": 1, "lesson_route": route, "records": records}
        (OUTPUT / bundle_name(route)).write_text(rp.stable_json(payload), encoding="utf-8", newline="\n")
    (OUTPUT / "index.json").write_text(rp.stable_json(manifest), encoding="utf-8", newline="\n")
    if review:
        review_payload = {**corpus, "corpus_version": rp.review_version(corpus)}
        REVIEW_ASSET.write_text(rp.stable_json(review_payload), encoding="utf-8", newline="\n")
    elif REVIEW_ASSET.is_file():
        REVIEW_ASSET.unlink()
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review", action="store_true", help="Also write the local-only full review asset")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        summary = build(review=args.review, dry_run=args.dry_run)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error))
        return 2
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

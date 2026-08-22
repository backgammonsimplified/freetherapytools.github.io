#!/usr/bin/env python3
"""Generate development-only resource-match review pages from CSV inventories."""

from __future__ import annotations

import csv
import hashlib
import html
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
BOOK_MATCHES = ROOT / "data" / "book-matches.csv"
PHP_MATCHES = ROOT / "data" / "php-matches.csv"
SOURCE_INVENTORY = ROOT / "data" / "source-inventory.csv"
REVIEW_ROOT = SITE / "review"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def route_map() -> dict[str, str]:
    sys.path.insert(0, str(ROOT / "scripts"))
    import section_scan_inventory  # pylint: disable=import-outside-toplevel

    return {
        lesson: "/" + Path(route).with_suffix(".html").as_posix()
        for lesson, route in section_scan_inventory.LESSON_FILES.items()
    }


def displayed_matches(
    book_rows: list[dict[str, str]], php_rows: list[dict[str, str]],
    sources: dict[str, dict[str, str]], routes: dict[str, str],
) -> list[dict[str, str]]:
    matches: list[dict[str, str]] = []
    for row in book_rows:
        if row["confidence"] != "high" or row.get("review_state") == "rejected":
            continue
        source = sources[row["source_id"]]
        matches.append({
            "match_id": row["match_id"], "source_id": row["source_id"],
            "match_source": "linehan-book", "candidate_asset": row["clean_asset"],
            "resource_title": row["resource_title"], "area": source["section"],
            "lesson_route": routes[source["lesson"]],
        })
    for row in php_rows:
        if row["php_match_status"] != "high" or row.get("review_state") == "rejected":
            continue
        matches.append({
            "match_id": row["match_id"], "source_id": row["source_id"],
            "match_source": "php-high-res", "candidate_asset": row["high_res_asset"],
            "resource_title": row["resource_title"], "area": row["curriculum_area"],
            "lesson_route": row["lesson_route"],
        })
    return sorted(matches, key=lambda row: (row["area"], row["lesson_route"], row["source_id"], row["match_source"]))


def inventory_version(matches: list[dict[str, str]]) -> str:
    payload = "\n".join(
        f"{row['match_id']}|{row['source_id']}|{row['match_source']}|{row['candidate_asset']}"
        for row in sorted(matches, key=lambda item: item["match_id"])
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def review_link(route: str, source_id: str) -> str:
    return f"{route}?review=1#resource-{source_id}"


def page_header(title: str) -> str:
    return (
        "---\n"
        f"title: \"{title}\"\n"
        "toc: false\n"
        "search: false\n"
        "robots: \"noindex, nofollow\"\n"
        "page-layout: full\n"
        "format:\n"
        "  html:\n"
        "    include-in-header:\n"
        "      text: |\n"
        "        <meta name=\"robots\" content=\"noindex, nofollow\">\n"
        "---\n\n"
    )


def dashboard_markdown(
    matches: list[dict[str, str]], linehan_count: int, php_count: int,
    candidate_count: int, unmatched_count: int, version: str,
) -> str:
    lines = [page_header("Resource Match Review"),
        "This development-only dashboard supports local review. Open lesson links below and compare both displayed copies.\n\n",
        "## Match Summary\n\n",
        f"- Existing Linehan book high-confidence matches: **{linehan_count}**\n",
        f"- New php high-confidence matches: **{php_count}**\n",
        f"- Candidate php matches: **{candidate_count}**\n",
        f"- Unmatched resources: **{unmatched_count}**\n",
        "- Incorrect flags stored in this browser: **<span data-match-review-incorrect-count>0</span>**\n\n",
        "\n[Open unmatched-resource gallery](/review/unmatched-resources.html?review=1)\n\n",
        "## Controls\n\n",
        f"<div data-match-review-dashboard data-match-inventory-version=\"{version}\">\n",
        "<div data-review-only hidden>\n",
        "<p><label><input type=\"checkbox\" data-match-review-complete> I have reviewed all displayed matches</label></p>\n",
        "<p><button type=\"button\" class=\"btn btn-primary\" data-export-match-review>Export Review Decisions</button> ",
        "<button type=\"button\" class=\"btn btn-outline-secondary\" data-clear-match-review>Clear Incorrect-Match Flags</button></p>\n",
        "</div>\n</div>\n\n",
        "Review controls appear on localhost, 127.0.0.1, or when `?review=1` is present. An unflagged match is not accepted unless the checkbox above is explicitly selected before export.\n\n",
        "## Displayed Matches\n\n",
    ]
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for match in matches:
        grouped[match["area"]].append(match)
    for area, area_matches in grouped.items():
        lines.append(f"### {area}\n\n<ul class=\"bs-review-link-list\">\n")
        for match in area_matches:
            title = html.escape(match["resource_title"])
            source_id = html.escape(match["source_id"])
            source = "Linehan clean copy" if match["match_source"] == "linehan-book" else "Higher-resolution copy"
            link = review_link(match["lesson_route"], match["source_id"])
            lines.append(
                f"<li><a href=\"{html.escape(link)}\">{title}</a> "
                f"<small class=\"bs-review-meta\">{source_id} - {source}</small></li>\n"
            )
        lines.append("</ul>\n\n")
    return "".join(lines)


def resource_card(row: dict[str, str], status: str, route: str) -> str:
    source_id = row["source_id"]
    current = f"/resources/{source_id.rsplit('-p', 1)[0]}/{source_id}.jpg"
    link = review_link(route, source_id)
    return (
        '<div class="bs-review-card">\n'
        f'<a href="{html.escape(link)}"><img src="{current}" alt="{html.escape(row["resource_title"])}"></a>\n'
        f'<h3>{html.escape(row["resource_title"])}</h3>\n'
        f'<p><a href="{html.escape(link)}">Open actual lesson</a></p>\n'
        f'<p class="bs-review-meta">{html.escape(source_id)} - {html.escape(status)}</p>\n'
        '</div>\n'
    )


def possible_card(row: dict[str, str]) -> str:
    source_id = row["source_id"]
    current = f"/resources/{source_id.rsplit('-p', 1)[0]}/{source_id}.jpg"
    link = review_link(row["lesson_route"], source_id)
    return (
        '<div class="bs-review-card bs-review-card-possible">\n'
        f'<h3>{html.escape(row["resource_title"])}</h3>\n'
        '<div class="row g-2"><div class="col-md-6"><strong>Current Copy</strong>'
        f'<img src="{current}" alt="Current copy of {html.escape(row["resource_title"])}"></div>'
        '<div class="col-md-6"><strong>Possible High-Resolution Copy</strong>'
        f'<img src="{html.escape(row["high_res_preview"])}" alt="Possible copy of {html.escape(row["resource_title"])}"></div></div>\n'
        f'<p><a href="{html.escape(link)}">Open actual lesson</a></p>\n'
        f'<p class="bs-review-meta">{html.escape(source_id)} - possible match - '
        f'{html.escape(row["match_evidence"])}</p>\n'
        '</div>\n'
    )


def unmatched_markdown(
    unmatched: list[dict[str, str]], candidates: list[dict[str, str]],
    sources: dict[str, dict[str, str]], routes: dict[str, str],
) -> str:
    lines = [page_header("Unmatched Resource Review"),
        "This development-only gallery contains every published resource with no high-confidence better copy. Current lesson resources remain unchanged.\n\n",
        f"## Unmatched Resources ({len(unmatched)})\n\n",
    ]
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in unmatched:
        grouped[sources[row["source_id"]]["section"]].append(row)
    for area, area_rows in grouped.items():
        lines.append(f"### {area}\n\n<div class=\"bs-review-gallery\">\n")
        for row in area_rows:
            source = sources[row["source_id"]]
            lines.append(resource_card(row, "no high-confidence better copy", routes[source["lesson"]]))
        lines.append("</div>\n\n")
    lines.append(f"## Possible Matches ({len(candidates)})\n\n")
    if candidates:
        lines.append('<div class="bs-review-gallery">\n')
        lines.extend(possible_card(row) for row in candidates)
        lines.append("</div>\n")
    else:
        lines.append("No uncertain php candidates survived the same-page visual audit.\n")
    return "".join(lines)


def main() -> int:
    book_rows = read_csv(BOOK_MATCHES)
    php_rows = read_csv(PHP_MATCHES)
    source_rows = [row for row in read_csv(SOURCE_INVENTORY) if row["publish"] == "true"]
    sources = {row["id"]: row for row in source_rows}
    routes = route_map()
    matches = displayed_matches(book_rows, php_rows, sources, routes)
    book_high = {row["source_id"] for row in book_rows if row["confidence"] == "high" and row.get("review_state") != "rejected"}
    php_high = {row["source_id"] for row in php_rows if row["php_match_status"] == "high" and row.get("review_state") != "rejected"}
    php_by_source = {row["source_id"]: row for row in php_rows}
    candidates = [row for row in php_rows if row["php_match_status"] == "candidate"]
    unmatched = [
        {"source_id": source_id, "resource_title": sources[source_id]["resource_title"]}
        for source_id in sources if source_id not in book_high and source_id not in php_high
        and php_by_source[source_id]["php_match_status"] != "candidate"
    ]
    version = inventory_version(matches)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    (REVIEW_ROOT / "resource-matches.qmd").write_text(
        dashboard_markdown(matches, len(book_high), len(php_high), len(candidates), len(unmatched), version),
        encoding="utf-8", newline="\n",
    )
    (REVIEW_ROOT / "unmatched-resources.qmd").write_text(
        unmatched_markdown(unmatched, candidates, sources, routes), encoding="utf-8", newline="\n",
    )
    print(
        f"Review inventory {version}: {len(book_high)} Linehan, {len(php_high)} php, "
        f"{len(candidates)} candidate, {len(unmatched)} unmatched."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

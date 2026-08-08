from __future__ import annotations

import html
import json
import os
import re
import sys
from collections.abc import Mapping
from datetime import date, datetime, time, timezone
from email.utils import format_datetime, parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree

try:
    from publication_config import (
        load_legacy_dispositions,
        load_publication_identity,
        publication_mode,
    )
except ModuleNotFoundError:  # Imported as scripts.bs_post_render in tests.
    from scripts.publication_config import (
        load_legacy_dispositions,
        load_publication_identity,
        publication_mode,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLICATION = load_publication_identity()
LEGACY_DISPOSITIONS = load_legacy_dispositions(PUBLICATION)
CANONICAL_ORIGIN = PUBLICATION["canonical-origin"]
OUTPUT_ROOT = REPO_ROOT / "site" / "_site"
SITEMAP_PATH = OUTPUT_ROOT / "sitemap.xml"
ROBOTS_PATH = OUTPUT_ROOT / "robots.txt"
NOT_FOUND_PATH = OUTPUT_ROOT / "404.html"
FULL_BUILD_MARKER = OUTPUT_ROOT / ".bs-full-build.json"
UPDATES_FEED_PATH = OUTPUT_ROOT / "updates" / "index.xml"
GLOSSARY_DATA_PATH = REPO_ROOT / "site" / "data" / "glossary.json"
LEGACY_GLOSSARY_PATH = OUTPUT_ROOT / "learn" / "glossary" / "index.html"
FULL_BUILD_MARKER_SCHEMA = 1
GLOSSARY_INDEX_URL = CANONICAL_ORIGIN + "/glossary/index.html"
NOT_FOUND_ROUTE_MAP = {
    "/.": "/",
    "/./": "/",
    "/./learn/": "/learn/",
    "/./glossary/": "/glossary/",
    "/./research/": "/research/",
}
FOOTER_PATTERN = re.compile(r"<footer\b.*?</footer>", flags=re.DOTALL)
HREF_PATTERN = re.compile(r'(\bhref=")([^"]+)(")')
ROBOTS_META_PATTERN = re.compile(
    r'<meta\s+name=["\']robots["\'][^>]*>\s*',
    flags=re.IGNORECASE,
)
CANONICAL_LINK_PATTERN = re.compile(
    r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\'][^>]*>',
    flags=re.IGNORECASE,
)
GLOSSARY_CANONICAL_URL = CANONICAL_ORIGIN + "/glossary/"
GLOSSARY_FEED_URL_PREFIX = GLOSSARY_CANONICAL_URL + "#"
RSS_NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "media": "http://search.yahoo.com/mrss/",
}


def legacy_glossary_redirect_text(
    target: str = "/glossary/",
    indexing: str = "noindex, follow",
) -> str:
    canonical = CANONICAL_ORIGIN + target
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="{indexing}">
  <link rel="canonical" href="{canonical}">
  <meta http-equiv="refresh" content="0; url={target}">
  <title>Glossary moved</title>
  <script>
    window.location.replace("{target}" + window.location.search + window.location.hash);
  </script>
</head>
<body>
  <p>The glossary has moved to <a href="{target}">{target}</a>.</p>
</body>
</html>
"""


def write_legacy_glossary_redirect(
    path: Path = LEGACY_GLOSSARY_PATH,
) -> bool:
    route = LEGACY_DISPOSITIONS["routes"][0]
    content = legacy_glossary_redirect_text(
        target=route["target"],
        indexing=route["indexing"],
    )
    current = path.read_text(encoding="utf-8") if path.exists() else None
    if current == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def write_legacy_route_redirects(output_root: Path = OUTPUT_ROOT) -> int:
    changed = 0
    for route in LEGACY_DISPOSITIONS["routes"]:
        source = route["source"].strip("/")
        path = output_root / source / "index.html"
        content = legacy_glossary_redirect_text(
            target=route["target"],
            indexing=route["indexing"],
        )
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current == content:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        changed += 1
    return changed


def glossary_feed_records(data: object) -> list[dict[str, str]]:
    if not isinstance(data, dict) or not isinstance(data.get("entries"), list):
        raise RuntimeError("Glossary RSS source must contain an entries list")
    records: list[dict[str, str]] = []
    for index, entry in enumerate(data["entries"]):
        if not isinstance(entry, dict):
            raise RuntimeError(f"Glossary RSS entry {index} must be an object")
        if entry.get("date_added") in (None, ""):
            continue
        required: dict[str, str] = {}
        for field in ("date_added", "definition", "slug", "term"):
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                raise RuntimeError(
                    f"Glossary RSS entry {index} requires non-empty {field}"
                )
            required[field] = value.strip()
        try:
            date.fromisoformat(required["date_added"])
        except ValueError as error:
            raise RuntimeError(
                f"Glossary RSS entry {required['slug']} has invalid date_added"
            ) from error
        records.append({
            "date": required["date_added"],
            "definition": required["definition"],
            "link": GLOSSARY_FEED_URL_PREFIX + required["slug"],
            "title": f"Glossary: {required['term']}",
        })
    records.sort(
        key=lambda record: (
            -date.fromisoformat(record["date"]).toordinal(),
            record["title"].casefold(),
            record["link"],
        )
    )
    return records


def rss_publication_date(value: str) -> str:
    published = datetime.combine(
        date.fromisoformat(value),
        time.min,
        tzinfo=timezone.utc,
    )
    return format_datetime(published, usegmt=True)


def glossary_feed_item(record: dict[str, str]) -> ElementTree.Element:
    item = ElementTree.Element("item")
    ElementTree.SubElement(item, "title").text = record["title"]
    ElementTree.SubElement(item, "link").text = record["link"]
    guid = ElementTree.SubElement(item, "guid", {"isPermaLink": "true"})
    guid.text = record["link"]
    ElementTree.SubElement(item, "pubDate").text = rss_publication_date(
        record["date"]
    )
    ElementTree.SubElement(item, "category").text = "Glossary"
    ElementTree.SubElement(item, "description").text = record["definition"]
    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n\s*\n", record["definition"])
        if paragraph.strip()
    ]
    encoded = ElementTree.SubElement(
        item,
        f"{{{RSS_NAMESPACES['content']}}}encoded",
    )
    encoded.text = "".join(
        f"<p>{html.escape(paragraph)}</p>"
        for paragraph in paragraphs
    )
    return item


def feed_item_sort_key(item: ElementTree.Element) -> tuple[float, str, str]:
    raw_date = item.findtext("pubDate", "")
    try:
        parsed_date = parsedate_to_datetime(raw_date)
        if parsed_date.tzinfo is None:
            parsed_date = parsed_date.replace(tzinfo=timezone.utc)
        timestamp = parsed_date.timestamp()
    except (TypeError, ValueError):
        timestamp = float("-inf")
    return (
        -timestamp,
        item.findtext("title", "").casefold(),
        item.findtext("link", ""),
    )


def augmented_updates_feed_text(
    text: str,
    glossary_records: list[dict[str, str]],
) -> tuple[str, bool]:
    for prefix, namespace in RSS_NAMESPACES.items():
        ElementTree.register_namespace(prefix, namespace)
    try:
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError as error:
        raise RuntimeError("Updates RSS feed is invalid XML") from error
    channel = root.find("channel")
    if channel is None:
        raise RuntimeError("Updates RSS feed has no channel")

    for item in list(channel.findall("item")):
        if item.findtext("link", "").startswith(GLOSSARY_FEED_URL_PREFIX):
            channel.remove(item)
    for record in glossary_records:
        channel.append(glossary_feed_item(record))

    items = list(channel.findall("item"))
    for item in items:
        channel.remove(item)
    for item in sorted(items, key=feed_item_sort_key):
        channel.append(item)

    ElementTree.indent(root, space="  ")
    updated = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        + ElementTree.tostring(root, encoding="unicode", short_empty_elements=True)
        + "\n"
    )
    return updated, updated != text


def augment_updates_rss_feed(
    feed_path: Path = UPDATES_FEED_PATH,
    data_path: Path = GLOSSARY_DATA_PATH,
) -> int:
    if not feed_path.exists():
        print(f"Updates RSS feed not present; glossary items skipped: {feed_path}")
        return 0
    data = json.loads(data_path.read_text(encoding="utf-8"))
    records = glossary_feed_records(data)
    current = feed_path.read_text(encoding="utf-8")
    updated, changed = augmented_updates_feed_text(current, records)
    if changed:
        feed_path.write_text(updated, encoding="utf-8", newline="\n")
    return len(records)


def normalized_glossary_sitemap_text(text: str) -> tuple[str, bool]:
    dirty_location = f"<loc>{GLOSSARY_INDEX_URL}</loc>"
    clean_location = f"<loc>{GLOSSARY_CANONICAL_URL}</loc>"
    dirty_count = text.count(dirty_location)
    clean_count = text.count(clean_location)

    if dirty_count == 0 and clean_count == 1:
        return text, False
    if dirty_count == 1 and clean_count == 1:
        clean_entry = re.compile(
            r"\s*<url>\s*"
            + re.escape(clean_location)
            + r".*?</url>",
            re.DOTALL,
        )
        without_stale_clean, removed = clean_entry.subn("", text, count=1)
        if removed != 1:
            raise RuntimeError("Could not remove the stale clean glossary sitemap entry")
        return without_stale_clean.replace(dirty_location, clean_location), True
    if dirty_count != 1 or clean_count != 0:
        raise RuntimeError(
            "Glossary sitemap contract requires exactly one dirty or one clean "
            f"location; found dirty={dirty_count}, clean={clean_count}"
        )

    return text.replace(dirty_location, clean_location), True


def normalize_glossary_sitemap_url(path: Path = SITEMAP_PATH) -> bool:
    if not path.exists():
        print(f"Sitemap not present; clean-URL normalization skipped: {path}")
        return False

    text = path.read_text(encoding="utf-8")
    normalized, changed = normalized_glossary_sitemap_text(text)
    if not changed:
        return False
    path.write_text(
        normalized,
        encoding="utf-8",
        newline="\n",
    )
    return True


def normalized_404_text(text: str) -> tuple[str, bool]:
    def replace_href(match: re.Match[str]) -> str:
        href = match.group(2)
        clean_href = NOT_FOUND_ROUTE_MAP.get(href.replace("\\", "/"))
        if clean_href is None:
            return match.group(0)
        return f"{match.group(1)}{clean_href}{match.group(3)}"

    normalized = HREF_PATTERN.sub(replace_href, text)
    return normalized, normalized != text


def normalize_404_links(path: Path = NOT_FOUND_PATH) -> bool:
    if not path.exists():
        print(f"Rendered 404 not present; clean-link normalization skipped: {path}")
        return False
    text = path.read_text(encoding="utf-8")
    normalized, changed = normalized_404_text(text)
    if changed:
        path.write_text(normalized, encoding="utf-8", newline="\n")
    return changed


def normalized_footer_rss_text(text: str) -> tuple[str, bool]:
    def normalize_footer(match: re.Match[str]) -> str:
        footer = match.group(0)

        def replace_href(href_match: re.Match[str]) -> str:
            href = href_match.group(2).replace("\\", "/")
            if not re.fullmatch(r"(?:/|\./|\.\./)*updates/index\.xml", href):
                return href_match.group(0)
            return (
                f'{href_match.group(1)}/updates/index.xml'
                f"{href_match.group(3)}"
            )

        return HREF_PATTERN.sub(replace_href, footer)

    normalized = FOOTER_PATTERN.sub(normalize_footer, text)
    return normalized, normalized != text


def normalize_footer_rss_links(output_root: Path = OUTPUT_ROOT) -> int:
    if not output_root.exists():
        print(f"Rendered output not present; footer normalization skipped: {output_root}")
        return 0
    changed = 0
    for path in sorted(output_root.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        normalized, path_changed = normalized_footer_rss_text(text)
        if not path_changed:
            continue
        path.write_text(normalized, encoding="utf-8", newline="\n")
        changed += 1
    return changed


def indexed_html_text(
    text: str,
    robots_meta: str,
    canonical_url: str | None = None,
) -> tuple[str, bool]:
    without_existing = ROBOTS_META_PATTERN.sub("", text)
    without_existing = CANONICAL_LINK_PATTERN.sub("", without_existing)
    if "</head>" not in without_existing.lower():
        raise RuntimeError("Rendered HTML has no closing head element")
    meta = f'<meta name="robots" content="{html.escape(robots_meta, quote=True)}">\n'
    if canonical_url is not None:
        meta += (
            '<link rel="canonical" href="'
            + html.escape(canonical_url, quote=True)
            + '">\n'
        )
    updated, count = re.subn(
        r"</head>",
        meta + "</head>",
        without_existing,
        count=1,
        flags=re.IGNORECASE,
    )
    if count != 1:
        raise RuntimeError("Could not apply rendered indexing metadata")
    return updated, updated != text


def canonical_url_for_rendered_path(
    path: Path,
    output_root: Path = OUTPUT_ROOT,
    canonical_origin: str = CANONICAL_ORIGIN,
) -> str:
    relative = path.relative_to(output_root).as_posix()
    if relative == "index.html":
        route = "/"
    elif relative == "glossary/index.html":
        route = "/glossary/"
    else:
        route = "/" + relative
    return canonical_origin + route


def apply_rendered_indexing(
    robots_meta: str,
    output_root: Path = OUTPUT_ROOT,
) -> int:
    if not output_root.exists():
        raise RuntimeError(f"Rendered output is missing: {output_root}")
    legacy_paths = {
        (output_root / route["source"].strip("/") / "index.html").resolve()
        for route in LEGACY_DISPOSITIONS["routes"]
    }
    changed = 0
    for path in sorted(output_root.rglob("*.html")):
        if path.resolve() in legacy_paths:
            continue
        text = path.read_text(encoding="utf-8")
        path_robots_meta = (
            "noindex, follow" if path.name == "404.html" else robots_meta
        )
        updated, path_changed = indexed_html_text(
            text,
            path_robots_meta,
            canonical_url_for_rendered_path(path, output_root),
        )
        if path_changed:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
    return changed


def robots_text(mode_config: Mapping[str, object]) -> str:
    lines = mode_config["robots-txt"]
    if not isinstance(lines, list):
        raise RuntimeError("robots-txt must be a list")
    return "\n".join(str(line) for line in lines) + "\n"


def write_robots_txt(
    mode_config: Mapping[str, object],
    path: Path = ROBOTS_PATH,
) -> bool:
    content = robots_text(mode_config)
    current = path.read_text(encoding="utf-8") if path.exists() else None
    if current == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def validate_rendered_canonicals(
    output_root: Path = OUTPUT_ROOT,
    canonical_origin: str = CANONICAL_ORIGIN,
) -> int:
    canonical_count = 0
    legacy_origins = {
        str(host["origin"]).rstrip("/")
        for host in LEGACY_DISPOSITIONS["hosts"]
    }
    for path in sorted(output_root.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        canonicals = CANONICAL_LINK_PATTERN.findall(text)
        if len(canonicals) != 1:
            raise RuntimeError(
                f"Rendered page must contain exactly one canonical link: {path}"
            )
        for canonical in canonicals:
            canonical_count += 1
            if not canonical.startswith(canonical_origin + "/"):
                raise RuntimeError(
                    f"Rendered canonical is outside the canonical origin: {path}: {canonical}"
                )
            if any(canonical.startswith(origin + "/") for origin in legacy_origins):
                raise RuntimeError(f"Legacy host used as canonical: {path}: {canonical}")
    if canonical_count == 0:
        raise RuntimeError("Rendered site contains no canonical links")
    return canonical_count


def validate_sitemap_origin(
    path: Path = SITEMAP_PATH,
    canonical_origin: str = CANONICAL_ORIGIN,
) -> int:
    if not path.exists():
        raise RuntimeError(f"Rendered sitemap is missing: {path}")
    try:
        root = ElementTree.fromstring(path.read_text(encoding="utf-8"))
    except ElementTree.ParseError as error:
        raise RuntimeError("Rendered sitemap is invalid XML") from error
    locations = [
        (element.text or "").strip()
        for element in root.iter()
        if element.tag.rsplit("}", 1)[-1] == "loc"
    ]
    if not locations:
        raise RuntimeError("Rendered sitemap contains no locations")
    invalid = [url for url in locations if not url.startswith(canonical_origin + "/")]
    if invalid:
        raise RuntimeError(f"Rendered sitemap has non-canonical locations: {invalid[:3]}")
    return len(locations)


def write_full_build_marker(path: Path = FULL_BUILD_MARKER) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": FULL_BUILD_MARKER_SCHEMA,
        "complete_full_build": True,
    }
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> int:
    mode, mode_config = publication_mode(PUBLICATION)
    print(f"Applying {mode} publication indexing.")
    glossary_feed_count = augment_updates_rss_feed()
    print(
        f"Updates RSS includes {glossary_feed_count} approved glossary definitions."
    )
    sitemap_changed = normalize_glossary_sitemap_url()
    print(
        "Glossary sitemap clean URL "
        + ("normalized." if sitemap_changed else "already current.")
    )
    not_found_changed = normalize_404_links()
    print(
        "Rendered 404 clean links "
        + ("normalized." if not_found_changed else "already current.")
    )
    footer_count = normalize_footer_rss_links()
    print(f"Normalized Updates RSS footer links in {footer_count} rendered pages.")
    indexed_count = apply_rendered_indexing(str(mode_config["robots-meta"]))
    print(f"Applied {mode_config['robots-meta']} to {indexed_count} rendered pages.")
    robots_changed = write_robots_txt(mode_config)
    print("Robots policy " + ("written." if robots_changed else "already current."))
    redirect_count = write_legacy_route_redirects()
    print(f"Updated {redirect_count} legacy route redirects from the registry.")
    canonical_count = validate_rendered_canonicals()
    print(f"Validated {canonical_count} rendered canonical links.")
    if SITEMAP_PATH.exists() or os.getenv("QUARTO_PROJECT_RENDER_ALL") == "1":
        sitemap_count = validate_sitemap_origin()
        print(f"Validated {sitemap_count} canonical sitemap locations.")

    if os.getenv("QUARTO_PROJECT_RENDER_ALL") == "1":
        write_full_build_marker()
        print(f"Recorded complete full build: {FULL_BUILD_MARKER}")
    else:
        print("Partial render: no full-build completion marker recorded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

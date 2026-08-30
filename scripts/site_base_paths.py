#!/usr/bin/env python3
"""Make rendered internal root URLs portable across root and project sites."""

from __future__ import annotations

import posixpath
import re
from pathlib import Path, PurePosixPath
from urllib.parse import SplitResult, urlsplit, urlunsplit


REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = REPO_ROOT / "site" / "_site"
URL_ATTRIBUTE_PATTERN = re.compile(
    r"(?P<prefix>\b(?:href|src|poster|action|formaction)\s*=\s*(?P<quote>[\"']))"
    r"(?P<url>/(?!/)[^\"']*)(?P=quote)",
    flags=re.IGNORECASE,
)
CSS_URL_PATTERN = re.compile(
    r"(?P<prefix>url\(\s*(?P<quote>[\"']?))(?P<url>/(?!/)[^\"')\s]+)(?P=quote)\s*\)",
    flags=re.IGNORECASE,
)
META_REFRESH_PATTERN = re.compile(
    r"(?P<prefix>\bcontent\s*=\s*(?P<quote>[\"'])\s*\d+\s*;\s*url=)"
    r"(?P<url>/(?!/)[^\"']*)(?P=quote)",
    flags=re.IGNORECASE,
)


def portable_url(url: str, rendered_path: PurePosixPath) -> str:
    """Convert one internal root URL to a page-relative URL."""
    if not url.startswith("/") or url.startswith("//"):
        return url
    parsed = urlsplit(url)
    source_dir = str(rendered_path.parent) or "."
    target = parsed.path.lstrip("/") or "."
    relative = posixpath.relpath(target, source_dir)
    if parsed.path.endswith("/"):
        relative = ("./" if relative == "." else relative.rstrip("/") + "/")
    rebuilt = SplitResult("", "", relative, parsed.query, parsed.fragment)
    return urlunsplit(rebuilt)


def rewrite_html_text(text: str, rendered_path: PurePosixPath) -> tuple[str, bool]:
    def replace_attribute(match: re.Match[str]) -> str:
        return f"{match.group('prefix')}{portable_url(match.group('url'), rendered_path)}{match.group('quote')}"

    def replace_css_url(match: re.Match[str]) -> str:
        return (
            f"{match.group('prefix')}"
            f"{portable_url(match.group('url'), rendered_path)}"
            f"{match.group('quote')})"
        )

    def replace_refresh(match: re.Match[str]) -> str:
        return f"{match.group('prefix')}{portable_url(match.group('url'), rendered_path)}{match.group('quote')}"

    updated = URL_ATTRIBUTE_PATTERN.sub(replace_attribute, text)
    updated = CSS_URL_PATTERN.sub(replace_css_url, updated)
    updated = META_REFRESH_PATTERN.sub(replace_refresh, updated)
    return updated, updated != text


def rewrite_rendered_site(output_root: Path = OUTPUT_ROOT) -> int:
    if not output_root.exists():
        raise RuntimeError(f"Rendered output is missing: {output_root}")
    changed = 0
    for path in sorted(output_root.rglob("*.html")):
        current = path.read_text(encoding="utf-8")
        relative = PurePosixPath(path.relative_to(output_root).as_posix())
        updated, path_changed = rewrite_html_text(current, relative)
        if not path_changed:
            continue
        path.write_text(updated, encoding="utf-8", newline="\n")
        changed += 1
    return changed


def main() -> int:
    changed = rewrite_rendered_site()
    print(f"Normalized internal root URLs in {changed} rendered HTML page(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

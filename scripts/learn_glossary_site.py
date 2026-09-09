#!/usr/bin/env python3
"""Run Learn glossary generation with site-specific navigation extensions."""

from __future__ import annotations

import sys
from pathlib import Path

import learn_glossary as glossary


TIPP_PARENT_SOURCE = "learn/distress-tolerance/tipp.qmd"
TIPP_SUBPAGES = (
    ("Temperature", "learn/distress-tolerance/temperature.qmd"),
    ("Intense Exercise", "learn/distress-tolerance/intense-exercise.qmd"),
    ("Paced Breathing", "learn/distress-tolerance/paced-breathing.qmd"),
    (
        "Progressive Muscle Relaxation",
        "learn/distress-tolerance/progressive-muscle-relaxation.qmd",
    ),
)
TIPP_SUBPAGE_SOURCES = {source for _, source in TIPP_SUBPAGES}


def site_source(path: Path) -> str | None:
    try:
        return path.relative_to(glossary.SITE_ROOT).as_posix()
    except ValueError:
        return None


def install_extensions() -> None:
    """Extend the generated navigation without changing curriculum numbering."""
    distress_tools = list(glossary.TOOL_FINDER_GROUPS["Distress Tolerance"])
    for tool in (
        ("TIPP Practice Tool", "tool-finder/tipp/index.qmd"),
        ("Window of Tolerance Tool", "tool-finder/window-of-tolerance/index.qmd"),
    ):
        if tool not in distress_tools:
            distress_tools.append(tool)
    glossary.TOOL_FINDER_GROUPS["Distress Tolerance"] = tuple(distress_tools)

    original_parse_complete = glossary.parse_complete_front_matter

    def parse_complete_front_matter(path: Path) -> dict[str, object]:
        metadata = original_parse_complete(path)
        if site_source(path) in TIPP_SUBPAGE_SOURCES:
            metadata = dict(metadata)
            # These are supporting pages, not separately numbered curriculum lessons.
            # A truthy non-string value skips lesson discovery while remaining invisible
            # to track discovery, which only accepts string track ids.
            metadata["learn-track-index"] = True
        return metadata

    glossary.parse_complete_front_matter = parse_complete_front_matter

    original_build_navigation_yaml = glossary.build_navigation_yaml

    def build_navigation_yaml(curriculum: list[dict[str, object]]) -> str:
        content = original_build_navigation_yaml(curriculum)
        old = (
            '            - text: "2. TIPP"\n'
            '              href: learn/distress-tolerance/tipp.qmd\n'
        )
        child_lines = [
            '            - section: "2. TIPP"',
            '              href: learn/distress-tolerance/tipp.qmd',
            '              contents:',
        ]
        for title, source in TIPP_SUBPAGES:
            safe_title = title.replace('"', "'")
            child_lines.extend(
                [
                    f'                - text: "{safe_title}"',
                    f"                  href: {source}",
                ]
            )
        replacement = "\n".join(child_lines) + "\n"
        if old not in content:
            raise glossary.ValidationError("Generated navigation is missing the TIPP lesson entry")
        return content.replace(old, replacement, 1)

    glossary.build_navigation_yaml = build_navigation_yaml


def main() -> int:
    install_extensions()
    sys.argv[0] = str(Path(glossary.__file__).resolve())
    return glossary.main()


if __name__ == "__main__":
    raise SystemExit(main())

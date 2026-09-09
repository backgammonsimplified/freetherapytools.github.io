#!/usr/bin/env python3
"""Site-specific supporting pages and compatibility CLI for the canonical generator."""

from __future__ import annotations

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


def main() -> int:
    import learn_glossary
    return learn_glossary.main()


if __name__ == "__main__":
    raise SystemExit(main())

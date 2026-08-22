#!/usr/bin/env python3
"""Sync source-derived emotion profile fields from lesson QMD into app data."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QMD = ROOT / "site" / "learn" / "emotion-regulation" / "observing-describing-emotions.qmd"
DATA = ROOT / "site" / "data" / "skill-apps" / "emotions.json"

EMOTIONS = (
    "Anger", "Disgust", "Envy", "Fear", "Happiness",
    "Jealousy", "Love", "Sadness", "Shame", "Guilt",
)

FIELD_HEADINGS = {
    "Prompting Events": "prompting_events",
    "Interpretations": "interpretations",
    "Expressions and Actions": "expressions_actions",
    "Aftereffects": "aftereffects",
}


def plain(text: str) -> str:
    text = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("**", "").replace("*", "")
    return re.sub(r"\s+", " ", text).strip()


def values(block: str) -> list[str]:
    chunks: list[str] = []
    paragraph: list[str] = []
    for line in block.splitlines():
        stripped = line.strip()
        if stripped.startswith("-"):
            if paragraph:
                chunks.append(plain(" ".join(paragraph)))
                paragraph.clear()
            chunks.append(plain(stripped[1:]))
        elif stripped:
            paragraph.append(stripped)
        elif paragraph:
            chunks.append(plain(" ".join(paragraph)))
            paragraph.clear()
    if paragraph:
        chunks.append(plain(" ".join(paragraph)))
    return [chunk for chunk in chunks if chunk]


def main() -> int:
    source = QMD.read_text(encoding="utf-8")
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    by_name = {emotion["name"]: emotion for emotion in payload["emotions"]}
    for index, name in enumerate(EMOTIONS):
        next_name = EMOTIONS[index + 1] if index + 1 < len(EMOTIONS) else None
        start = source.index(f"## {name} {{#")
        end = source.index(f"## {next_name} {{#", start) if next_name else source.index("<!-- section-scan-resources:start -->", start)
        profile = source[start:end]
        for heading, key in FIELD_HEADINGS.items():
            match = re.search(
                rf"^### {re.escape(heading)}\s*$\n(.*?)(?=^### |^## |\Z)",
                profile,
                flags=re.MULTILINE | re.DOTALL,
            )
            if not match:
                raise ValueError(f"Missing {heading} for {name}")
            by_name[name][key] = values(match.group(1))
    DATA.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"Synchronized {len(EMOTIONS)} emotion profiles from {QMD.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

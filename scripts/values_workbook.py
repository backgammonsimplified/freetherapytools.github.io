#!/usr/bin/env python3
"""Extract the authored Master Values Dictionary from the local workbook."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(
    r"C:\Users\andre\Downloads\scans\Core_Values_and_Valued_Action_Workbook_v0.2.docx"
)
DEFAULT_OUTPUT = ROOT / "site" / "data" / "skill-apps" / "values.json"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

DOMAINS = [
    ("close-relationships", "Close Relationships, Family & Caregiving"),
    ("friendship", "Friendship & Social Connection"),
    ("work-education", "Work, Education & Contribution"),
    ("health", "Health, Self-Care & Vitality"),
    ("personal-growth", "Personal Growth, Character & Autonomy"),
    ("leisure", "Leisure, Creativity & Adventure"),
    ("community", "Community, Service & Environment"),
    ("spirituality", "Spirituality, Meaning & Inner Life"),
    ("home-resources", "Home, Resources, Security & Lifestyle"),
]


def paragraphs(source: Path) -> list[str]:
    with zipfile.ZipFile(source) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    result: list[str] = []
    for paragraph in root.iter(W + "p"):
        text = "".join(node.text or "" for node in paragraph.iter(W + "t")).strip()
        if text:
            result.append(text)
    return result


def identifier(name: str) -> str:
    value = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def extract_values(lines: list[str]) -> list[dict[str, object]]:
    start = lines.index("Part 1 - Master Values Dictionary")
    end = lines.index("Part 2 - Group Highlighted Values by Life Area")
    section = lines[start + 1 : end]
    values: list[dict[str, object]] = []
    index = 0
    while index < len(section):
        match = re.match(r"^\[\s*\]\s+(.+)$", section[index])
        if not match:
            index += 1
            continue
        name = match.group(1).strip()
        definition = section[index + 1].strip() if index + 1 < len(section) else ""
        if not definition or definition.startswith("["):
            raise ValueError(f"Missing working definition for {name}")
        values.append(
            {
                "id": identifier(name),
                "name": name,
                "definition": definition,
                "suggested_domains": [],
                "aliases": [],
            }
        )
        index += 2
    names = [value["name"].casefold() for value in values]
    ids = [value["id"] for value in values]
    if len(names) != len(set(names)) or len(ids) != len(set(ids)):
        raise ValueError("The workbook contains duplicate value names or identifiers")
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    lines = paragraphs(args.source)
    values = extract_values(lines)
    payload = {
        "schema_version": 1,
        "source_document": args.source.name,
        "process": ["DISCOVER", "CATEGORIZE", "ASSIGN", "ASSESS", "ACT", "BARRIERS", "MISSION"],
        "domains": [{"id": key, "name": name} for key, name in DOMAINS],
        "values": values,
        "custom_values_allowed": True,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Values: {len(values)} definitions; {len(DOMAINS)} public life domains.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

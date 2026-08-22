#!/usr/bin/env python3
"""Extract resource text and place native content in authoritative lesson QMD files.

Searchable clean-book pages use their embedded PDF text. Image-only php and
section-scan pages use the local Windows OCR engine one page at a time. Raw
extraction is cached only under tmp/; published text is written exclusively to
the existing lesson QMD resource block.
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import re
import subprocess
from pathlib import Path

from section_scan_inventory import LESSON_FILES


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCE_INVENTORY = ROOT / "data" / "source-inventory.csv"
BOOK_MATCHES = ROOT / "data" / "book-matches.csv"
PHP_MATCHES = ROOT / "data" / "php-matches.csv"
EXTRACTION_INVENTORY = ROOT / "data" / "qmd-resource-extraction.csv"
CACHE = ROOT / "tmp" / "qmd-resource-extraction"
OCR_SCRIPT = ROOT / "scripts" / "windows_ocr.ps1"
GS = Path(r"C:\Program Files\gs\gs10.07.0\bin\gswin64c.exe")

FIELDS = (
    "source_id", "lesson_qmd", "resource_title", "best_text_source",
    "extraction_method", "integrated_into_existing_section", "ocr_used",
    "structure_confidence", "review_needed", "notes",
)

BOILERPLATE_START = (
    "from dbt skills training", "from cognitive behavior therapy",
    "copyright ", "permission to photocopy", "©",
)
BOILERPLATE_CONTAINS = (
    "www.mindmypeelings", "www.mindmyfeelings", "scan page",
)

# These multipart skill handouts are represented in existing stable anchored
# sections. Their visual resource block points readers back to that native
# version instead of publishing a second transcription.
INTEGRATED_SOURCE_IDS = {
    "distress-tolerance-p005", "distress-tolerance-p006",
    "distress-tolerance-p007", "distress-tolerance-p012",
    "distress-tolerance-p018", "distress-tolerance-p020",
    "distress-tolerance-p025", "distress-tolerance-p041",
    "emotion-regulation-p014", "emotion-regulation-p015",
    "emotion-regulation-p016", "emotion-regulation-p017",
    "emotion-regulation-p018", "emotion-regulation-p019",
    "emotion-regulation-p020", "emotion-regulation-p021",
    "emotion-regulation-p022", "emotion-regulation-p023",
    "emotion-regulation-p031", "emotion-regulation-p037",
    "emotion-regulation-p044", "emotion-regulation-p045",
    "emotion-regulation-p046", "emotion-regulation-p047",
    "emotion-regulation-p048", "emotion-regulation-p049",
    "emotion-regulation-p050", "emotion-regulation-p051",
    "emotion-regulation-p052", "emotion-regulation-p057",
}


def read_csv(path: Path, key: str) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return {row[key]: row for row in csv.DictReader(handle)}


def published_rows() -> list[dict[str, str]]:
    with SOURCE_INVENTORY.open(encoding="utf-8-sig", newline="") as handle:
        return [row for row in csv.DictReader(handle) if row["publish"] == "true"]


def normalize_text(text: str) -> str:
    replacements = {
        "\ufb01": "fi", "\ufb02": "fl", "\u00ad": "", "\u2011": "-",
        "\u2013": "-", "\u2014": "-", "\uf0b7": "•", "\uf0a7": "•",
        "\uf0fc": "", "\uf0d8": "•", "\uf8eb": "", "\uf8f1": "",
        "\uf8f2": "", "\uf8f3": "", "\uf8f4": "", "\uf8f5": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"[ \t]+", " ", text).strip()
    def normalize_mixed_caps(match: re.Match[str]) -> str:
        word = match.group(0)
        internal_caps = sum(char.isupper() for char in word[1:])
        if any(char.islower() for char in word) and internal_caps >= 1:
            return word[:1].upper() + word[1:].lower()
        return word
    text = re.sub(r"[A-Za-z]{4,}", normalize_mixed_caps, text)
    return text


def extract_pdf_text(pdf: Path, cache: Path) -> list[str]:
    if not cache.is_file():
        result = subprocess.run(
            [str(GS), "-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=txtwrite",
             "-sOutputFile=-", str(pdf)],
            cwd=ROOT, check=True, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(result.stdout, encoding="utf-8")
    return cache.read_text(encoding="utf-8").splitlines()


def extract_ocr_lines(image: Path, cache: Path) -> list[str]:
    if not cache.is_file():
        result = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
             str(OCR_SCRIPT), "-ImagePath", str(image)],
            cwd=ROOT, check=True, capture_output=True, text=True,
            encoding="utf-8-sig", errors="replace",
        )
        payload = result.stdout.strip()
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(payload, encoding="utf-8")
    payload = cache.read_text(encoding="utf-8").strip()
    if not payload:
        return []
    records = json.loads(payload)
    if isinstance(records, dict):
        records = [records]
    # Windows OCR returns visual line order. Keep that order; page images, not
    # inferred coordinates, remain the authority for later manual refinement.
    return [str(record["text"]) for record in records]


def title_similarity(line: str, title: str) -> float:
    simplify = lambda value: re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return difflib.SequenceMatcher(None, simplify(line), simplify(title)).ratio()


def clean_lines(lines: list[str], title: str) -> list[str]:
    cleaned: list[str] = []
    footer = False
    section_phrases = (
        "prompting events for feeling", "interpretations of events that prompt",
        "biological changes and experiences", "expressions and actions of",
        "aftereffects of",
    )
    expanded: list[str] = []
    for original in lines:
        line = normalize_text(original)
        for phrase in section_phrases:
            match = re.search(rf"\s+({re.escape(phrase)}\b.*)$", line, re.I)
            if match and match.start() > 0:
                expanded.extend([line[:match.start()].strip(), match.group(1).strip()])
                line = ""
                break
        if line:
            parts = re.split(r"\s*•{2}\s*", line)
            if len(parts) > 1:
                expanded.append(parts[0])
                expanded.extend("• " + part for part in parts[1:] if part)
            else:
                expanded.append(line)

    for line in expanded:
        if not line:
            continue
        lower = line.lower()
        if lower.startswith(BOILERPLATE_START):
            footer = True
            continue
        if footer:
            continue
        if any(token in lower.replace(" ", "") for token in BOILERPLATE_CONTAINS):
            continue
        if re.fullmatch(r"\d{1,3}", line):
            continue
        if not re.search(r"[A-Za-z0-9]", line):
            continue
        line = re.sub(r"^[TPI]\s*[•]{1,2}\s*", "• ", line)
        line = re.sub(r"^[•·▪◦]{1,3}\s*", "• ", line)
        line = re.sub(r"^o\s+(?=[A-Z])", "• ", line)
        line = re.sub(r"_{3,}", "[Your response]", line)
        if not cleaned and title_similarity(line, title) >= 0.68:
            continue
        if cleaned and title_similarity(line, title) >= 0.9:
            continue
        cleaned.append(line)
    return cleaned


def is_heading(line: str) -> bool:
    bare = line.rstrip(":")
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", bare)
    if not (1 <= len(words) <= 10) or len(bare) > 90 or line.endswith(('.', '?')):
        return False
    letters = [char for char in bare if char.isalpha()]
    all_caps = bool(letters) and sum(char.isupper() for char in letters) / len(letters) > 0.82
    title_case = sum(word[:1].isupper() for word in words) >= max(1, len(words) - 1)
    return all_caps or line.endswith(":") or title_case


def format_qmd(lines: list[str], title: str) -> str:
    lines = clean_lines(lines, title)
    output = ["#### Text Version", ""]
    paragraph: list[str] = []
    continuation_index: int | None = None

    def flush() -> None:
        nonlocal continuation_index
        if paragraph:
            output.append(" ".join(paragraph))
            output.append("")
            paragraph.clear()
        continuation_index = None

    for line in lines:
        caution = re.match(r"^\*?(?:caution|warning|important)\*?\s*:?\s*(.*)$", line, re.I)
        if caution:
            flush()
            output.extend(["> **Safety note:** " + caution.group(1).strip(), ""])
            continuation_index = len(output) - 2
            continue
        bullet = re.match(r"^•\s*(.+)$", line)
        numbered = re.match(r"^(\d+)[.)]\s*(.+)$", line)
        if bullet:
            flush()
            output.extend([f"- {bullet.group(1).strip()}", ""])
            continuation_index = len(output) - 2
        elif numbered:
            flush()
            output.extend([f"{numbered.group(1)}. {numbered.group(2).strip()}", ""])
            continuation_index = len(output) - 2
        elif is_heading(line):
            flush()
            heading = line.rstrip(":").strip(" *")
            heading = re.sub(r"^[A-Z]\s+(?=[A-Z])", "", heading)
            source_label = re.match(
                r"^(distress tolerance|emotion regulation|interpersonal effectiveness) "
                r"(handout|worksheet)\b", heading, re.I,
            )
            if source_label:
                output.extend([f"*{heading}*", ""])
            else:
                output.extend([f"##### {heading}", ""])
        elif line.endswith("?") or "[Your response]" in line:
            flush()
            output.extend([f"**{line}**", ""])
        elif line.startswith("(") and line.endswith(")"):
            flush()
            output.extend([f"*{line[1:-1]}*", ""])
        else:
            if continuation_index is not None:
                output[continuation_index] += " " + line
                if output[continuation_index].rstrip().endswith(('.', '!', '?')):
                    continuation_index = None
            else:
                paragraph.append(line)
    flush()
    while output and not output[-1]:
        output.pop()
    if len(output) == 1:
        output.extend(["", "Printed content could not be extracted reliably from this page."])
    rendered = "\n".join(output)
    rendered = re.sub(r"\b([A-Za-z]{5,})- ([a-z]{2,})\b", r"\1\2", rendered)
    return rendered


def replace_native_block(qmd: Path, source_id: str, content: str) -> None:
    source = qmd.read_text(encoding="utf-8")
    start = f"<!-- native-resource-content:{source_id}:start -->"
    end = f"<!-- native-resource-content:{source_id}:end -->"
    block = f"{start}\n\n{content.strip()}\n\n{end}"
    existing = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
    if existing.search(source):
        updated = existing.sub(lambda _: block, source)
    else:
        resource = re.compile(
            rf"(?ms)(^:::: \{{\.bs-practice-resource #resource-{re.escape(source_id)}\b.*?)(^::::\s*$)"
        )
        if not resource.search(source):
            raise ValueError(f"Resource block not found for {source_id} in {qmd}")
        updated = resource.sub(lambda match: match.group(1).rstrip() + "\n\n" + block + "\n" + match.group(2), source, count=1)
    qmd.write_text(updated, encoding="utf-8", newline="\n")


def initial_status(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    existing: dict[str, dict[str, str]] = {}
    if EXTRACTION_INVENTORY.is_file():
        existing = read_csv(EXTRACTION_INVENTORY, "source_id")
    status: dict[str, dict[str, str]] = {}
    for row in rows:
        source_id = row["id"]
        status[source_id] = existing.get(source_id, {
            "source_id": source_id,
            "lesson_qmd": "site/" + LESSON_FILES[row["lesson"]],
            "resource_title": row["resource_title"],
            "best_text_source": "pending",
            "extraction_method": "pending",
            "integrated_into_existing_section": "false",
            "ocr_used": "false",
            "structure_confidence": "pending",
            "review_needed": "true",
            "notes": "Awaiting native-content extraction.",
        })
    return status


def write_status(status: dict[str, dict[str, str]]) -> None:
    with EXTRACTION_INVENTORY.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(status[key] for key in sorted(status))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--section", action="append", help="Process one curriculum section; repeat as needed.")
    args = parser.parse_args()

    rows = published_rows()
    book = read_csv(BOOK_MATCHES, "source_id")
    php = read_csv(PHP_MATCHES, "source_id")
    status = initial_status(rows)
    selected = set(args.section or [row["section"] for row in rows])
    processed = 0
    for row in rows:
        if row["section"] not in selected:
            continue
        source_id = row["id"]
        if status[source_id].get("extraction_method") == "manual_transcription":
            print(f"{source_id}: preserved manual transcription")
            processed += 1
            continue
        qmd = SITE / LESSON_FILES[row["lesson"]]
        book_match = book.get(source_id, {})
        php_match = php.get(source_id, {})
        if book_match.get("confidence") == "high" and book_match.get("clean_asset"):
            source_asset = SITE / book_match["clean_asset"].lstrip("/")
            method = "direct_pdf_text"
            source_label = "searchable-dbt-book"
            lines = extract_pdf_text(source_asset, CACHE / f"{source_id}.txt")
            confidence = "medium"
            review = "true"
            notes = "Embedded searchable PDF text normalized and structured in QMD; repeated publication footer omitted. Visual structure still requires review unless integrated into an authored section."
        else:
            if php_match.get("php_match_status") == "high" and php_match.get("high_res_preview"):
                source_asset = SITE / php_match["high_res_preview"].lstrip("/")
                source_label = "php-high-res"
            else:
                slug = source_id.rsplit("-p", 1)[0]
                source_asset = SITE / "resources" / slug / f"{source_id}.jpg"
                source_label = "section-scan"
            method = "windows_ocr"
            lines = extract_ocr_lines(source_asset, CACHE / f"{source_id}.json")
            confidence = "medium" if len(" ".join(lines)) >= 120 else "low"
            review = "true"
            notes = "Printed text OCR was normalized and structured from the page image; visual comparison is required before final acceptance."
        integrated = source_id in INTEGRATED_SOURCE_IDS
        if integrated:
            confidence = "high"
            review = "false"
        content = (
            "#### Native Version\n\n"
            "This handout's educational content is integrated into the anchored skill sections above."
            if integrated else format_qmd(lines, row["resource_title"])
        )
        replace_native_block(qmd, source_id, content)
        status[source_id] = {
            "source_id": source_id,
            "lesson_qmd": "site/" + LESSON_FILES[row["lesson"]],
            "resource_title": row["resource_title"],
            "best_text_source": source_label,
            "extraction_method": method,
            "integrated_into_existing_section": str(integrated).lower(),
            "ocr_used": str(method == "windows_ocr").lower(),
            "structure_confidence": confidence,
            "review_needed": review,
            "notes": (
                notes + " Native wording is integrated into existing stable lesson anchors."
                if integrated else notes
            ),
        }
        processed += 1
        print(f"{source_id}: {source_label} ({len(lines)} lines)")
    write_status(status)
    print(f"Processed {processed} resources across {len(selected)} section(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

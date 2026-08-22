#!/usr/bin/env python3
"""Match published curriculum resources against physical pages in php.pdf.

The current section-scan inventory remains authoritative.  This tool renders the
old scan only as a comparison corpus, scores every published resource that does
not already display a high-confidence Linehan-book copy, and extracts assets only
for high/candidate review results.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import math
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCE_INVENTORY = ROOT / "data" / "source-inventory.csv"
BOOK_MATCHES = ROOT / "data" / "book-matches.csv"
PHP_MATCHES = ROOT / "data" / "php-matches.csv"
PHP_ASSETS = SITE / "resources" / "high-res" / "php"
DEFAULT_PHP = Path(r"C:\Users\andre\Downloads\book-scans\php.pdf")
DEFAULT_CACHE = ROOT / "tmp" / "pdfs" / "php-matching" / "rendered"

MATCH_SCHEMA_VERSION = "1"
PHP_PAGE_COUNT = 152
# Deliberate decisions made after viewing the generated audit sheets.  Keeping
# them here makes the final publication inventory reproducible and auditable.
HIGH_OVERRIDES: set[str] = {
    "distress-tolerance-p011", "general-p002", "wellness-p021",
    "goal-setting-p006", "general-p005", "wellness-p050", "wellness-p052",
    "wellness-p061", "wellness-p060", "cbt-skills-p038",
    "emotion-regulation-p003", "goal-setting-p005", "cbt-skills-p017",
    "cbt-skills-p037", "wellness-p031", "cbt-skills-p030",
    "emotion-regulation-p024", "goal-setting-p003",
    "interpersonal-effectiveness-p003", "wellness-p004",
    "distress-tolerance-p031", "interpersonal-effectiveness-p004",
    "emotion-regulation-p069", "cbt-skills-p018",
    "interpersonal-effectiveness-p034", "cbt-skills-p048", "wellness-p013",
    "cbt-skills-p039", "interpersonal-effectiveness-p025", "wellness-p012",
    "cbt-skills-p028", "cbt-skills-p027", "distress-tolerance-p021",
    "cbt-skills-p016", "emotion-regulation-p036", "cbt-skills-p029",
    "emotion-regulation-p068", "interpersonal-effectiveness-p035",
    "emotion-regulation-p011", "emotion-regulation-p034",
    "emotion-regulation-p071", "goal-setting-p007",
}
CANDIDATE_OVERRIDES: set[str] = set()
NONE_OVERRIDES: set[str] = set()

FIELDS = [
    "source_id", "source_document", "source_page", "resource_title",
    "resource_kind", "curriculum_area", "lesson_route", "php_match_status",
    "php_confidence", "php_pdf_page", "php_internal_id", "top_candidate_page",
    "second_best_page", "match_score", "second_best_score", "uniqueness_margin", "matched_orientation",
    "match_evidence", "high_res_asset", "high_res_preview", "match_id",
    "match_source", "publicly_displayed", "review_state", "notes",
]


@dataclass(frozen=True)
class Features:
    full: np.ndarray
    cropped: np.ndarray
    layout: np.ndarray
    projection: np.ndarray


def command_path(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise RuntimeError(f"Required command not found: {name}")
    return value


def render_php_pages(pdf: Path, cache: Path) -> None:
    if not pdf.is_file():
        raise FileNotFoundError(pdf)
    cache.mkdir(parents=True, exist_ok=True)
    for stale in cache.glob("php-p*.jpg"):
        stale.unlink()
    command = [
        command_path("gswin64c"), "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE",
        "-sDEVICE=jpeggray", "-dJPEGQ=85", "-r110",
        "-dAutoRotatePages=/PageByPage",
        f"-sOutputFile={cache / 'php-p%04d.jpg'}", str(pdf),
    ]
    subprocess.run(command, check=True)


def _unit(vector: np.ndarray) -> np.ndarray:
    vector = vector.astype(np.float32, copy=False).ravel()
    vector -= vector.mean()
    norm = float(np.linalg.norm(vector))
    return vector / (norm or 1.0)


def _resize(array: np.ndarray, size: tuple[int, int], resample: int) -> np.ndarray:
    image = Image.fromarray(np.clip(array * 255, 0, 255).astype("uint8"))
    return np.asarray(image.resize(size, resample), dtype=np.float32) / 255.0


def image_features(path: Path, rotation: int = 0) -> Features:
    with Image.open(path) as source:
        image = source.convert("L")
        if rotation:
            image = image.rotate(rotation, expand=True, fillcolor=255)
        gray = np.asarray(image, dtype=np.float32)
    low, high = np.percentile(gray, [2.0, 98.5])
    normalized = np.clip((gray - low) / max(float(high - low), 1.0), 0, 1)
    ink = 1.0 - normalized
    ys, xs = np.where(ink > 0.10)
    crop = ink
    if len(xs) > 100:
        pad = max(5, int(min(ink.shape) * 0.015))
        x0, x1 = max(0, int(xs.min()) - pad), min(ink.shape[1], int(xs.max()) + pad + 1)
        y0, y1 = max(0, int(ys.min()) - pad), min(ink.shape[0], int(ys.max()) + pad + 1)
        crop = ink[y0:y1, x0:x1]
    full = _unit(_resize(ink, (96, 96), Image.Resampling.BILINEAR))
    cropped = _unit(_resize(crop, (96, 96), Image.Resampling.BILINEAR))
    layout = np.clip(_resize(crop, (48, 48), Image.Resampling.BOX), 0, 0.4) / 0.4
    projection_source = _resize(crop, (96, 128), Image.Resampling.BOX)
    projection = np.concatenate((projection_source.mean(axis=0), projection_source.mean(axis=1)))
    return Features(full, cropped, _unit(layout), _unit(projection))


def similarity(left: Features, right: Features) -> float:
    return float(
        0.25 * np.dot(left.full, right.full)
        + 0.45 * np.dot(left.cropped, right.cropped)
        + 0.20 * np.dot(left.layout, right.layout)
        + 0.10 * np.dot(left.projection, right.projection)
    )


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def lesson_routes() -> dict[str, str]:
    sys.path.insert(0, str(ROOT / "scripts"))
    import section_scan_inventory  # pylint: disable=import-outside-toplevel

    return {
        lesson: "/" + Path(route).with_suffix(".html").as_posix()
        for lesson, route in section_scan_inventory.LESSON_FILES.items()
    }


def classify(source_id: str, score: float, margin: float) -> str:
    del score, margin
    if source_id in NONE_OVERRIDES:
        return "none"
    if source_id in HIGH_OVERRIDES:
        return "high"
    if source_id in CANDIDATE_OVERRIDES:
        return "candidate"
    return "none"


def build_matches(cache: Path) -> list[dict[str, str]]:
    php_pages = sorted(cache.glob("php-p*.jpg"))
    if not php_pages:
        raise RuntimeError(f"No rendered php pages in {cache}; use --render-cache")
    if len(php_pages) != PHP_PAGE_COUNT:
        raise RuntimeError(f"Expected {PHP_PAGE_COUNT} physical php pages, found {len(php_pages)}")
    expected = [f"php-p{page:04d}.jpg" for page in range(1, len(php_pages) + 1)]
    if [path.name for path in php_pages] != expected:
        raise RuntimeError("Rendered php page identifiers are not contiguous physical-page IDs")

    source_rows = {row["id"]: row for row in load_rows(SOURCE_INVENTORY) if row["publish"] == "true"}
    book_rows = load_rows(BOOK_MATCHES)
    targets = [row for row in book_rows if row["confidence"] != "high"]
    routes = lesson_routes()
    php_features = [image_features(path) for path in php_pages]
    output: list[dict[str, str]] = []

    for source in targets:
        source_id = source["source_id"]
        curriculum = source_rows[source_id]
        current_asset = SITE / "resources" / source_id.rsplit("-p", 1)[0] / f"{source_id}.jpg"
        orientations = [(angle, image_features(current_asset, angle)) for angle in (0, 90, 180, 270)]
        ranked: list[tuple[float, int, int]] = []
        for page_number, candidate in enumerate(php_features, start=1):
            scores = [(similarity(features, candidate), angle) for angle, features in orientations]
            score, angle = max(scores)
            ranked.append((score, page_number, angle))
        ranked.sort(reverse=True)
        best_score, best_page, best_angle = ranked[0]
        second_score, second_page, _ = ranked[1]
        margin = best_score - second_score
        status = classify(source_id, best_score, margin)
        internal_id = f"php-p{best_page:04d}" if status != "none" else ""
        preview = f"/resources/high-res/php/{internal_id}.jpg" if status != "none" else ""
        pdf_asset = f"/resources/high-res/php/{internal_id}.pdf" if status == "high" else ""
        match_id = f"php-high-res:{source_id}:{internal_id}" if status == "high" else ""
        evidence = (
            f"Orientation-aware visual score {best_score:.4f}; second-best physical page "
            f"{second_page} scored {second_score:.4f}; uniqueness margin {margin:.4f}."
        )
        if status == "high":
            evidence += " Manual audit confirmed the same printed title/content and distinctive layout."
        elif status == "candidate":
            evidence += " Plausible visual counterpart retained only for development review."
        else:
            evidence += " No sufficiently distinct same-page visual counterpart."
        output.append({
            "source_id": source_id,
            "source_document": source["source_document"],
            "source_page": source["source_page"],
            "resource_title": source["resource_title"],
            "resource_kind": source["resource_kind"],
            "curriculum_area": curriculum["section"],
            "lesson_route": routes[curriculum["lesson"]],
            "php_match_status": status,
            "php_confidence": status,
            "php_pdf_page": str(best_page) if status != "none" else "",
            "php_internal_id": internal_id,
            "top_candidate_page": str(best_page),
            "second_best_page": str(second_page),
            "match_score": f"{best_score:.6f}",
            "second_best_score": f"{second_score:.6f}",
            "uniqueness_margin": f"{margin:.6f}",
            "matched_orientation": str(best_angle),
            "match_evidence": evidence,
            "high_res_asset": pdf_asset,
            "high_res_preview": preview,
            "match_id": match_id,
            "match_source": "php-high-res" if status == "high" else "",
            "publicly_displayed": "true" if status == "high" else "false",
            "review_state": "pending" if status == "high" else ("possible" if status == "candidate" else "unmatched"),
            "notes": (
                "Higher-resolution comparison is displayed below the current copy."
                if status == "high" else
                "Possible match is not displayed on the lesson page."
                if status == "candidate" else
                "Current curriculum resource remains the only public copy."
            ),
        })
    return output


def write_matches(rows: list[dict[str, str]]) -> None:
    PHP_MATCHES.parent.mkdir(parents=True, exist_ok=True)
    with PHP_MATCHES.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def extract_assets(pdf: Path, rows: list[dict[str, str]]) -> None:
    if not pdf.is_file():
        raise FileNotFoundError(pdf)
    PHP_ASSETS.mkdir(parents=True, exist_ok=True)
    expected: set[Path] = set()
    ghostscript = command_path("gswin64c")
    extracted_previews: set[Path] = set()
    extracted_pdfs: set[Path] = set()
    for row in rows:
        status = row["php_match_status"]
        if status == "none":
            continue
        page = row["php_pdf_page"]
        preview = SITE / row["high_res_preview"].lstrip("/")
        expected.add(preview)
        if preview not in extracted_previews:
            subprocess.run([
                ghostscript, "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE",
                "-sDEVICE=jpeg", "-dJPEGQ=90", "-r160", f"-dFirstPage={page}",
                f"-dLastPage={page}", "-dAutoRotatePages=/PageByPage",
                f"-sOutputFile={preview}", str(pdf),
            ], check=True)
            extracted_previews.add(preview)
        if status == "high":
            asset = SITE / row["high_res_asset"].lstrip("/")
            expected.add(asset)
            if asset not in extracted_pdfs:
                subprocess.run([
                    ghostscript, "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE",
                    "-sDEVICE=pdfwrite", f"-dFirstPage={page}", f"-dLastPage={page}",
                    f"-sOutputFile={asset}", str(pdf),
                ], check=True)
                extracted_pdfs.add(asset)
    for stale in PHP_ASSETS.glob("*"):
        if stale.is_file() and stale not in expected:
            stale.unlink()


def _fit_preview(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "white")
    canvas.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def write_audit_sheets(rows: list[dict[str, str]], cache: Path, directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for stale in directory.glob("php-audit-*.jpg"):
        stale.unlink()
    ordered = sorted(rows, key=lambda row: float(row["match_score"]), reverse=True)
    page_size = 8
    font = ImageFont.load_default()
    for sheet_number in range(math.ceil(len(ordered) / page_size)):
        subset = ordered[sheet_number * page_size:(sheet_number + 1) * page_size]
        sheet = Image.new("RGB", (1200, 430 * len(subset)), "white")
        draw = ImageDraw.Draw(sheet)
        for index, row in enumerate(subset):
            y = index * 430
            current = SITE / "resources" / row["source_id"].rsplit("-p", 1)[0] / f"{row['source_id']}.jpg"
            page = int(row["top_candidate_page"])
            candidate = cache / f"php-p{page:04d}.jpg"
            sheet.paste(_fit_preview(current, (360, 380)), (0, y + 45))
            sheet.paste(_fit_preview(candidate, (360, 380)), (380, y + 45))
            label = (
                f"{row['source_id']} | {row['php_match_status']}\n"
                f"{row['resource_title'][:65]}\n"
                f"page {row['top_candidate_page']} rot {row['matched_orientation'] or '-'} "
                f"score {row['match_score']} margin {row['uniqueness_margin']}"
            )
            draw.multiline_text((760, y + 55), label, fill="black", font=font, spacing=6)
        sheet.save(directory / f"php-audit-{sheet_number + 1:02d}.jpg", quality=88)


def inventory_version(rows: list[dict[str, str]]) -> str:
    payload = "\n".join(
        f"{row['source_id']}|{row['php_match_status']}|{row['php_internal_id']}|{row['match_score']}"
        for row in rows
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--php", type=Path, default=DEFAULT_PHP)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--render-cache", action="store_true")
    parser.add_argument("--extract", action="store_true")
    parser.add_argument("--audit-dir", type=Path)
    args = parser.parse_args()
    if args.render_cache:
        render_php_pages(args.php, args.cache)
    rows = build_matches(args.cache)
    write_matches(rows)
    if args.extract:
        extract_assets(args.php, rows)
    if args.audit_dir:
        write_audit_sheets(rows, args.cache, args.audit_dir)
    counts = {status: sum(row["php_match_status"] == status for row in rows) for status in ("high", "candidate", "none")}
    print(
        f"PHP match inventory {inventory_version(rows)}: {len(rows)} targets; "
        f"{counts['high']} high, {counts['candidate']} candidate, {counts['none']} none."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

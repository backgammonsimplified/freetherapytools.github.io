import csv
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MATCHES = ROOT / "data" / "php-matches.csv"
PHP_PAGE_COUNT = 152


class PhpMatchInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with MATCHES.open(encoding="utf-8-sig", newline="") as handle:
            cls.rows = list(csv.DictReader(handle))

    def test_targets_every_resource_without_displayed_linehan_match(self):
        with (ROOT / "data" / "book-matches.csv").open(encoding="utf-8-sig", newline="") as handle:
            book_rows = list(csv.DictReader(handle))
        expected = {row["source_id"] for row in book_rows if row["confidence"] != "high"}
        actual = {row["source_id"] for row in self.rows}
        self.assertEqual(expected, actual)
        self.assertEqual(167, len(actual))

    def test_every_recorded_php_page_is_a_valid_physical_page(self):
        for row in self.rows:
            for field in ("top_candidate_page", "second_best_page"):
                self.assertTrue(row[field].isdigit())
                self.assertIn(int(row[field]), range(1, PHP_PAGE_COUNT + 1))
            if row["php_match_status"] != "none":
                self.assertIn(int(row["php_pdf_page"]), range(1, PHP_PAGE_COUNT + 1))
                self.assertEqual(f"php-p{int(row['php_pdf_page']):04d}", row["php_internal_id"])

    def test_high_matches_have_deduplicated_pdf_and_preview_assets(self):
        high = [row for row in self.rows if row["php_match_status"] == "high"]
        self.assertEqual(42, len(high))
        for row in high:
            self.assertEqual("high", row["php_confidence"])
            self.assertEqual("true", row["publicly_displayed"])
            self.assertEqual("pending", row["review_state"])
            self.assertTrue(row["match_id"].startswith(f"php-high-res:{row['source_id']}:php-p"))
            for field in ("high_res_asset", "high_res_preview"):
                asset = SITE / row[field].lstrip("/")
                self.assertTrue(asset.is_file(), asset)
                self.assertGreater(asset.stat().st_size, 0)
        expected_pdfs = {SITE / row["high_res_asset"].lstrip("/") for row in high}
        expected_previews = {SITE / row["high_res_preview"].lstrip("/") for row in high}
        self.assertEqual(41, len(expected_pdfs))
        self.assertEqual(expected_pdfs, set((SITE / "resources/high-res/php").glob("*.pdf")))
        self.assertEqual(expected_previews, set((SITE / "resources/high-res/php").glob("*.jpg")))

    def test_none_matches_create_no_php_assets(self):
        counts = Counter(row["php_match_status"] for row in self.rows)
        self.assertEqual({"high": 42, "none": 125}, dict(counts))
        for row in self.rows:
            if row["php_match_status"] == "none":
                self.assertEqual("", row["php_internal_id"])
                self.assertEqual("", row["high_res_asset"])
                self.assertEqual("", row["high_res_preview"])
                self.assertEqual("false", row["publicly_displayed"])

    def test_high_matches_are_on_lessons_and_candidates_are_not(self):
        lesson_text = "\n".join(path.read_text(encoding="utf-8") for path in (SITE / "learn").rglob("*.qmd"))
        lesson_text += (SITE / "skill-finder/index.qmd").read_text(encoding="utf-8")
        for row in self.rows:
            if row["php_match_status"] == "high":
                self.assertIn(f'data-match-id="{row["match_id"]}"', lesson_text)
                self.assertIn(row["high_res_asset"], lesson_text)
            elif row["php_match_status"] == "candidate":
                self.assertNotIn(row["high_res_asset"], lesson_text)

    def test_duplicate_curriculum_copies_reuse_one_physical_asset(self):
        rows = {row["source_id"]: row for row in self.rows}
        first = rows["wellness-p060"]
        second = rows["wellness-p061"]
        self.assertEqual(first["php_internal_id"], second["php_internal_id"])
        self.assertEqual(first["high_res_asset"], second["high_res_asset"])


if __name__ == "__main__":
    unittest.main()

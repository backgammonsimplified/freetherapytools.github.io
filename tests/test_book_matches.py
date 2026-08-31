import csv
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MATCHES = ROOT / "data" / "book-matches.csv"
SITE = ROOT / "site"


class BookMatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with MATCHES.open(encoding="utf-8-sig") as handle:
            cls.rows = list(csv.DictReader(handle))

    def test_every_published_resource_has_one_match_row(self):
        with (ROOT / "data" / "source-inventory.csv").open(encoding="utf-8-sig") as handle:
            inventory = list(csv.DictReader(handle))
        published = {row["id"] for row in inventory if row["publish"] == "true"}
        self.assertEqual(published, {row["source_id"] for row in self.rows})
        self.assertEqual(len(self.rows), len({row["source_id"] for row in self.rows}))

    def test_high_matches_have_existing_clean_assets_and_provenance(self):
        high = [row for row in self.rows if row["confidence"] == "high"]
        self.assertGreater(len(high), 50)
        for row in high:
            self.assertEqual(row["match_status"], "matched")
            self.assertTrue(row["book_pdf_page"].isdigit())
            self.assertTrue(row["book_handout_or_worksheet_number"])
            self.assertTrue(row["book_title"])
            self.assertTrue(row["match_evidence"])
            self.assertEqual(f"linehan-book:{row['source_id']}", row["match_id"])
            self.assertEqual("linehan-book", row["match_source"])
            self.assertEqual("true", row["publicly_displayed"])
            self.assertEqual("pending", row["review_state"])
            asset = SITE / row["clean_asset"].lstrip("/")
            self.assertTrue(asset.is_file(), asset)
            self.assertTrue(asset.with_suffix(".jpg").is_file(), asset.with_suffix(".jpg"))

    def test_candidates_are_not_published(self):
        for row in self.rows:
            if row["confidence"] == "candidate":
                self.assertEqual(row["clean_asset"], "")
                self.assertEqual(row["review_needed"], "true")

    def test_no_unmapped_clean_assets_or_full_book_import(self):
        expected = {
            (SITE / row["clean_asset"].lstrip("/")).resolve()
            for row in self.rows if row["confidence"] == "high"
        }
        mindfulness_audit = json.loads(
            (SITE / "data" / "mindfulness-source-audit.json").read_text(encoding="utf-8")
        )
        expected.update(
            (SITE / row["clean_printable_public_asset"].lstrip("/")).resolve()
            for row in mindfulness_audit["exact_matches"]
            if row["exact_match"]
        )
        actual_pdf = {path.resolve() for path in (SITE / "resources" / "clean").rglob("*.pdf")}
        self.assertEqual(expected, actual_pdf)
        self.assertFalse(any(path.stat().st_size > 2_000_000 for path in actual_pdf))
        self.assertFalse(any("dbt_skills_training" in path.name.lower() for path in actual_pdf))

    def test_clean_match_sequence_is_unique_by_source(self):
        seen = set()
        for row in self.rows:
            key = row["source_id"]
            self.assertNotIn(key, seen)
            seen.add(key)
            if row["confidence"] == "high":
                self.assertGreater(int(row["book_pdf_page"]), 0)


if __name__ == "__main__":
    unittest.main()

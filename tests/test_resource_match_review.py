import csv
import json
import re
import subprocess
import sys
import unittest
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
BOOK_MATCHES = ROOT / "data/book-matches.csv"
PHP_MATCHES = ROOT / "data/php-matches.csv"
DASHBOARD = SITE / "review/resource-matches.qmd"
UNMATCHED = SITE / "review/unmatched-resources.qmd"
REVIEW_JS = SITE / "assets/resource-match-review.js"
FINALIZER = ROOT / "scripts/finalize-resource-match-review.py"


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


class ResourceMatchReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book_rows = rows(BOOK_MATCHES)
        cls.php_rows = rows(PHP_MATCHES)
        cls.lesson_files = list((SITE / "learn").rglob("*.qmd")) + [SITE / "skill-finder/index.qmd"]
        cls.lesson_text = "\n".join(path.read_text(encoding="utf-8") for path in cls.lesson_files)
        cls.dashboard = DASHBOARD.read_text(encoding="utf-8")
        cls.unmatched = UNMATCHED.read_text(encoding="utf-8")
        cls.review_js = REVIEW_JS.read_text(encoding="utf-8")

    def test_all_displayed_alternatives_have_stable_ids_and_exact_button(self):
        self.assertEqual(99, self.lesson_text.count('data-match-source="linehan-book"'))
        self.assertEqual(42, self.lesson_text.count('data-match-source="php-high-res"'))
        self.assertEqual(141, self.lesson_text.count('data-match-id="'))
        self.assertEqual(141, self.lesson_text.count(">Incorrect match</button>"))
        self.assertEqual(141, self.lesson_text.count("bs-match-review-control\" hidden"))

    def test_review_controls_are_local_or_explicit_query_only(self):
        self.assertIn('new Set(["localhost", "127.0.0.1", "::1"])', self.review_js)
        self.assertIn('get("review") === "1"', self.review_js)
        self.assertIn("if (!reviewEnabled())", self.review_js)
        self.assertNotIn("hidden=false", self.lesson_text.replace(" ", ""))

    def test_review_storage_is_scoped_and_never_transmitted(self):
        self.assertIn("therapy-skill-kit.resource-match-review.v1", self.review_js)
        self.assertIn("window.localStorage", self.review_js)
        for network_api in ("fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket"):
            self.assertNotIn(network_api, self.review_js)

    def test_export_schema_and_explicit_completion_control_are_present(self):
        for field in (
            "schema_version", "generated_at", "match_inventory_version",
            "review_complete", "incorrect_matches", "match_id", "source_id",
            "match_source", "candidate_asset",
        ):
            self.assertIn(field, self.review_js)
        self.assertIn("therapy-skill-kit-match-review.json", self.review_js)
        self.assertIn("I have reviewed all displayed matches", self.dashboard)
        self.assertIn("Export Review Decisions", self.dashboard)

    def test_dashboard_summary_and_review_routes(self):
        self.assertIn("Existing Linehan book high-confidence matches: **99**", self.dashboard)
        self.assertIn("New php high-confidence matches: **42**", self.dashboard)
        self.assertIn("Candidate php matches: **0**", self.dashboard)
        self.assertIn("Unmatched resources: **125**", self.dashboard)
        self.assertIn('robots: "noindex, nofollow"', self.dashboard)
        self.assertIn("/review/unmatched-resources.html?review=1", self.dashboard)

    def test_unmatched_gallery_contains_exactly_all_low_resolution_only_resources(self):
        book_high = {row["source_id"] for row in self.book_rows if row["confidence"] == "high"}
        php_high = {row["source_id"] for row in self.php_rows if row["php_match_status"] == "high"}
        with (ROOT / "data/source-inventory.csv").open(encoding="utf-8-sig", newline="") as handle:
            published = {row["id"] for row in csv.DictReader(handle) if row["publish"] == "true"}
        expected = published - book_high - php_high
        actual = set(re.findall(r'<p class="bs-review-meta">([^ <]+) - no high-confidence better copy</p>', self.unmatched))
        self.assertEqual(125, len(actual))
        self.assertEqual(expected, actual)
        self.assertIn("## Possible Matches (0)", self.unmatched)

    def test_normal_source_pages_do_not_link_to_review_routes(self):
        for path in SITE.rglob("*.qmd"):
            if SITE / "review" in path.parents:
                continue
            self.assertNotIn("/review/", path.read_text(encoding="utf-8"), path)

    def test_finalizer_refuses_incomplete_review(self):
        payload = {"schema_version": 1, "review_complete": False, "incorrect_matches": []}
        path = ROOT / "task-work" / f"resource-match-review-test-{uuid.uuid4().hex}.json"
        try:
            path.write_text(json.dumps(payload), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(FINALIZER), str(path), "--dry-run"],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
        finally:
            path.unlink(missing_ok=True)
        self.assertEqual(2, result.returncode)
        self.assertIn("review_complete must be true", result.stderr)

    def test_finalizer_dry_run_handles_accepted_rejected_and_unmatched(self):
        version = re.search(r'data-match-inventory-version="([a-f0-9]+)"', self.dashboard).group(1)
        rejected = next(row for row in self.book_rows if row["confidence"] == "high")
        payload = {
            "schema_version": 1,
            "generated_at": "2026-08-21T00:00:00.000Z",
            "match_inventory_version": version,
            "review_complete": True,
            "incorrect_matches": [{
                "match_id": rejected["match_id"],
                "source_id": rejected["source_id"],
                "match_source": rejected["match_source"],
                "candidate_asset": rejected["clean_asset"],
            }],
        }
        path = ROOT / "task-work" / f"resource-match-review-test-{uuid.uuid4().hex}.json"
        try:
            path.write_text(json.dumps(payload), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(FINALIZER), str(path), "--dry-run"],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
        finally:
            path.unlink(missing_ok=True)
        self.assertEqual(0, result.returncode, result.stderr)
        summary = json.loads(result.stdout)
        self.assertEqual(140, summary["accepted_matches"])
        self.assertEqual(1, summary["rejected_matches"])
        self.assertEqual(125, summary["unmatched_resources"])
        self.assertEqual("dry-run", summary["mode"])


if __name__ == "__main__":
    unittest.main()

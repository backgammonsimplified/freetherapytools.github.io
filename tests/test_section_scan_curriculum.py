from __future__ import annotations

import csv
import json
import re
import unittest
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
INVENTORY = ROOT / "data" / "source-inventory.csv"


class SectionScanCurriculumTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with INVENTORY.open(encoding="utf-8", newline="") as handle:
            cls.rows = list(csv.DictReader(handle))

    def test_every_new_source_page_is_classified_once(self) -> None:
        expected_documents = {
            "0 general handouts and skills to turn to app.pdf": 6,
            "1 goal setting and tracking.pdf": 34,
            "2 Distress Tolerance.pdf": 48,
            "4 Distress Tolerance.pdf": 49,
            "5 Wellness.pdf": 62,
            "6 Emotional Regulation.pdf": 78,
            "7 CBT SKills.pdf": 54,
        }
        self.assertEqual(len(self.rows), 331)
        by_document: dict[str, list[int]] = {}
        for row in self.rows:
            by_document.setdefault(row["source_document"], []).append(
                int(row["source_page"])
            )
        self.assertEqual(set(by_document), set(expected_documents))
        for document, pages in expected_documents.items():
            self.assertEqual(sorted(by_document[document]), list(range(1, pages + 1)))

        allowed = {
            "section-cover",
            "session-divider",
            "content-handout",
            "worksheet",
            "exercise",
            "reference",
            "blank-notes",
            "duplicate",
            "other",
        }
        self.assertTrue(all(row["page_type"] in allowed for row in self.rows))
        self.assertEqual(len({row["id"] for row in self.rows}), 331)

    def test_publication_and_asset_accounting(self) -> None:
        published = [row for row in self.rows if row["publish"] == "true"]
        structural = [
            row
            for row in self.rows
            if row["page_type"] in {"section-cover", "session-divider"}
        ]
        duplicates = [row for row in self.rows if row["page_type"] == "duplicate"]
        self.assertEqual((len(published), len(structural), len(duplicates)), (266, 37, 28))
        self.assertTrue(all(row["lesson"] and row["resource_title"] for row in published))
        self.assertTrue(all(row["publish"] == "false" for row in structural + duplicates))

        expected_assets = {
            SITE
            / "resources"
            / row["id"].rsplit("-p", 1)[0]
            / f"{row['id']}.jpg"
            for row in published
        }
        actual_assets = set((SITE / "resources").rglob("*.jpg"))
        self.assertEqual(actual_assets, expected_assets)

        landscape_derivatives = {
            "general-p004",
            "goal-setting-p002",
            "goal-setting-p008",
            "goal-setting-p033",
            "goal-setting-p034",
            "wellness-p008",
            "wellness-p048",
            "wellness-p049",
            "emotion-regulation-p008",
            "emotion-regulation-p009",
            "emotion-regulation-p012",
            "cbt-skills-p032",
            "cbt-skills-p033",
            "cbt-skills-p034",
        }
        for identifier in landscape_derivatives:
            slug = identifier.rsplit("-p", 1)[0]
            with Image.open(SITE / "resources" / slug / f"{identifier}.jpg") as image:
                self.assertGreater(image.width, image.height, identifier)

    def test_authoritative_lesson_sequences(self) -> None:
        dbt = json.loads((SITE / "assets" / "bs-learn-sequence.json").read_text())
        cbt = json.loads((SITE / "assets" / "bs-cbt-sequence.json").read_text())

        by_track: dict[str, list[str]] = {}
        for lesson in dbt["lessons"]:
            by_track.setdefault(lesson["track_id"], []).append(lesson["title"])
        self.assertEqual(
            by_track,
            {
                "goal-setting": [
                    "Goal Setting Guidelines",
                    "Skills & Strengths List",
                    "Weekly Goal Worksheets",
                    "Weekly Home Practice Trackers",
                ],
                "doubling-cube": [
                    "Introduction & STOP",
                    "TIPP",
                    "Distraction & Self-Soothing",
                    "IMPROVE",
                    "Pros & Cons",
                    "Radical Acceptance",
                ],
                "interpersonal-effectiveness": [
                    "Boundaries",
                    "Clarifying Priorities & Myths",
                    "DEAR MAN",
                    "DEAR + GIVE",
                    "DEAR + FAST",
                    "How to Ask & Say No & Troubleshooting",
                ],
                "wellness": [
                    "Sleep",
                    "Behaviour Activation",
                    "Behaviour Chain Analysis and Missing Links",
                    "Addictions",
                    "Balanced Eating",
                    "Medication & Doctor's Visits",
                ],
                "emotion-regulation": [
                    "What Emotions Do for You",
                    "Emotions",
                    "Check the Facts",
                    "Opposite Action & Problem Solving",
                    "Accumulating Positive Emotions",
                    "Building Mastery & Cope Ahead",
                ],
            },
        )
        self.assertEqual(
            [lesson["title"] for lesson in cbt["lessons"]],
            [
                "Introduction to CBT",
                "Thinking Traps",
                "Thought Records Part 1",
                "Thought Records Part 2",
                "Understanding Worry",
                "Safety Behaviours & Exposure",
            ],
        )

    def test_objectives_are_native_index_content(self) -> None:
        required = {
            "learn/goal-setting/index.qmd": [
                "Set and achieve meaningful goals",
                "Engage in behavioural activation",
                "developing a life worth living",
            ],
            "learn/cube/index.qmd": [
                "Survive crisis situations",
                "Accept reality",
                "Become free",
            ],
            "learn/interpersonal-effectiveness/index.qmd": [
                "getting what you want and need from others",
                "Build relationships and end destructive ones",
                "Walk the middle path",
            ],
            "learn/wellness/index.qmd": [
                "healthy habits on a daily and consistent basis",
                "vulnerabilities that impact emotion mind",
            ],
            "learn/emotion-regulation/index.qmd": [
                "Understand and name your own emotions",
                "Decrease the frequency of unwanted emotions",
                "Decrease emotional vulnerability",
                "Decrease emotional suffering",
            ],
            "cbt-skills/index.qmd": [
                "Learn to identify and change unhelpful thought patterns",
                "Take control of interpretations",
                "Develop an action plan",
            ],
        }
        for relative, phrases in required.items():
            source = (SITE / relative).read_text(encoding="utf-8")
            for phrase in phrases:
                self.assertIn(phrase, source)

    def test_no_obsolete_source_system_is_active(self) -> None:
        self.assertFalse((ROOT / "data" / "binder-curriculum.yml").exists())
        self.assertFalse((ROOT / "data" / "binder-section-covers.yml").exists())
        self.assertFalse((SITE / "assets" / "binder").exists())
        self.assertFalse((SITE / "review" / "index.qmd").exists())
        self.assertFalse((SITE / "assets" / "bs-review-sequence.json").exists())
        public_files = [
            *SITE.rglob("*.qmd"),
            *SITE.rglob("*.html"),
            SITE / "_quarto.yml",
            SITE / "_learn-navigation.yml",
        ]
        public_text = "\n".join(
            path.read_text(encoding="utf-8", errors="replace")
            for path in public_files
            if "_site" not in path.parts
        )
        self.assertIsNone(re.search(r"binder", public_text, re.IGNORECASE))
        self.assertNotIn("php.pdf", public_text.lower())

    def test_skill_finder_and_mindfulness_status(self) -> None:
        general = [
            row for row in self.rows if row["lesson"] == "skill-finder" and row["publish"] == "true"
        ]
        self.assertEqual(len(general), 5)
        source = (SITE / "skill-finder" / "index.qmd").read_text(encoding="utf-8")
        for title in ("Dialectics", "Emotional Overload", "Skills Use Guideline", "Skills Overview"):
            self.assertIn(title, source)
        mindfulness_text = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (SITE / "learn" / "mindfulness").glob("*.qmd")
        )
        self.assertNotIn("/resources/", mindfulness_text)


if __name__ == "__main__":
    unittest.main()

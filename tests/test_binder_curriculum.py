from __future__ import annotations

import re
import unittest
from collections import defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
MAPPING = ROOT / "data" / "binder-curriculum.yml"
RESOURCE_ROOT = ROOT / "site" / "assets" / "binder"
LEARN_ROOT = ROOT / "site" / "learn"

TRACK_DIRECTORIES = {
    "Daily Goal Setting and Tracking": "goal-setting",
    "Distress Tolerance": "cube",
    "Interpersonal Effectiveness": "interpersonal-effectiveness",
    "Wellness": "wellness",
    "Emotion Regulation": "emotion-regulation",
    "Mindfulness": "mindfulness",
    "CBT and Managing Anxiety": "cbt-anxiety",
    "Other Skills / Resources": "other-resources",
}


class BinderCurriculumTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.records = yaml.safe_load(MAPPING.read_text(encoding="utf-8"))

    def test_all_physical_page_ids_are_present_once(self) -> None:
        expected = [f"binder-p{page:04d}" for page in range(1, 153)]
        actual = [record["id"] for record in self.records]
        self.assertEqual(actual, expected)
        self.assertEqual(
            [record["pdf_page"] for record in self.records],
            list(range(1, 153)),
        )

    def test_every_record_has_a_complete_placement(self) -> None:
        required = {
            "id",
            "pdf_page",
            "provisional_title",
            "track",
            "lesson",
            "order",
            "review_needed",
            "notes",
        }
        for record in self.records:
            self.assertEqual(set(record), required)
            self.assertIn(record["track"], TRACK_DIRECTORIES)
            self.assertTrue(record["provisional_title"])
            self.assertTrue(record["lesson"])
            self.assertIsInstance(record["review_needed"], bool)

    def test_resource_order_is_contiguous_within_each_lesson(self) -> None:
        orders: dict[tuple[str, str], list[int]] = defaultdict(list)
        for record in self.records:
            orders[(record["track"], record["lesson"])].append(record["order"])
        for values in orders.values():
            self.assertEqual(values, list(range(1, len(values) + 1)))

    def test_every_scan_exists_and_is_reachable_once(self) -> None:
        discovered = sorted(path.stem for path in RESOURCE_ROOT.glob("binder-p????.jpg"))
        expected = [f"binder-p{page:04d}" for page in range(1, 153)]
        self.assertEqual(discovered, expected)

        qmd_text = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted(LEARN_ROOT.rglob("*.qmd"))
        )
        markers = re.findall(r"binder-resource: (binder-p\d{4})", qmd_text)
        self.assertEqual(sorted(markers), expected)

        for record in self.records:
            identifier = record["id"]
            lesson_path = (
                LEARN_ROOT
                / TRACK_DIRECTORIES[record["track"]]
                / f"{record['lesson']}.qmd"
            )
            self.assertTrue(lesson_path.is_file(), lesson_path)
            source = lesson_path.read_text(encoding="utf-8")
            self.assertIn(f"{{#{identifier}}}", source)
            self.assertIn(f"../../assets/binder/{identifier}.jpg", source)
            self.assertEqual(source.count(f"binder-resource: {identifier}"), 1)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import csv
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCE_INVENTORY = ROOT / "data" / "source-inventory.csv"
EXTRACTION_INVENTORY = ROOT / "data" / "qmd-resource-extraction.csv"


class QmdResourceExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with SOURCE_INVENTORY.open(encoding="utf-8-sig", newline="") as handle:
            cls.published = [row for row in csv.DictReader(handle) if row["publish"] == "true"]
        with EXTRACTION_INVENTORY.open(encoding="utf-8-sig", newline="") as handle:
            cls.extractions = list(csv.DictReader(handle))
        cls.by_id = {row["source_id"]: row for row in cls.extractions}

    def test_tracking_inventory_covers_every_published_resource(self) -> None:
        self.assertEqual(266, len(self.published))
        self.assertEqual(266, len(self.extractions))
        self.assertEqual(
            {row["id"] for row in self.published},
            set(self.by_id),
        )

    def test_native_content_is_in_qmd_or_explicitly_review_needed(self) -> None:
        for resource in self.published:
            source_id = resource["id"]
            record = self.by_id[source_id]
            lesson = ROOT / record["lesson_qmd"]
            self.assertEqual(".qmd", lesson.suffix, source_id)
            self.assertTrue(lesson.is_file(), source_id)
            marker = f"<!-- native-resource-content:{source_id}:start -->"
            if marker not in lesson.read_text(encoding="utf-8"):
                self.assertEqual("true", record["review_needed"], source_id)

    def test_distress_tolerance_resources_have_native_qmd_content(self) -> None:
        distress = [row for row in self.published if row["section"] == "Distress Tolerance"]
        self.assertEqual(39, len(distress))
        for resource in distress:
            source_id = resource["id"]
            lesson = ROOT / self.by_id[source_id]["lesson_qmd"]
            source = lesson.read_text(encoding="utf-8")
            self.assertIn(f"<!-- native-resource-content:{source_id}:start -->", source)
            self.assertNotEqual("pending", self.by_id[source_id]["extraction_method"])

    def test_no_parallel_markdown_resource_library_exists(self) -> None:
        self.assertFalse((SITE / "resources-text").exists())
        resource_markdown = [
            path for path in SITE.rglob("*.md")
            if "resource" in path.name.lower() or "resources-text" in path.parts
        ]
        self.assertEqual([], resource_markdown)

    def test_representative_stable_anchors_and_native_headings_remain(self) -> None:
        checks = {
            "site/learn/cube/tipp.qmd": (
                "## Temperature {#temperature}",
                "## Intense Exercise {#intense-exercise}",
                "## Paced Breathing {#paced-breathing}",
                "## Paired / Progressive Muscle Relaxation {#progressive-muscle-relaxation}",
            ),
            "site/learn/cube/self-soothe.qmd": (
                "### Activities {#activities}",
                "### Contributing {#contributing}",
            ),
            "site/learn/cube/improve.qmd": ("## Imagery {#imagery}",),
        }
        for relative, expected in checks.items():
            source = (ROOT / relative).read_text(encoding="utf-8")
            for heading in expected:
                self.assertIn(heading, source)

    def test_resource_generator_preserves_native_qmd_blocks(self) -> None:
        generator = (ROOT / "scripts/section_scan_inventory.py").read_text(encoding="utf-8")
        self.assertIn("native-resource-content:", generator)
        self.assertIn("native_content.get", generator)

    def test_match_review_comparisons_and_controls_remain_intact(self) -> None:
        lessons = "\n".join(
            path.read_text(encoding="utf-8")
            for path in SITE.rglob("*.qmd")
            if "review" not in path.relative_to(SITE).parts
        )
        self.assertEqual(141, len(re.findall(r"data-match-id=", lessons)))
        self.assertEqual(141, lessons.count(">Incorrect match</button>"))
        self.assertIn("php-high-res:distress-tolerance-p011:php-p0126", lessons)
        self.assertIn("linehan-book:distress-tolerance-p012", lessons)


if __name__ == "__main__":
    unittest.main()

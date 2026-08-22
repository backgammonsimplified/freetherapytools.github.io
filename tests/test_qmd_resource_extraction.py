from __future__ import annotations

import csv
import json
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

    def test_emotion_regulation_resources_have_native_qmd_content(self) -> None:
        emotion_rows = [row for row in self.published if row["section"] == "Emotion Regulation"]
        self.assertEqual(70, len(emotion_rows))
        for resource in emotion_rows:
            source_id = resource["id"]
            lesson = ROOT / self.by_id[source_id]["lesson_qmd"]
            self.assertIn(
                f"<!-- native-resource-content:{source_id}:start -->",
                lesson.read_text(encoding="utf-8"),
            )
            self.assertNotEqual("pending", self.by_id[source_id]["extraction_method"])

    def test_cbt_resources_have_native_qmd_content(self) -> None:
        cbt_rows = [row for row in self.published if row["section"] == "CBT Skills"]
        self.assertEqual(46, len(cbt_rows))
        for resource in cbt_rows:
            source_id = resource["id"]
            lesson = ROOT / self.by_id[source_id]["lesson_qmd"]
            self.assertIn(
                f"<!-- native-resource-content:{source_id}:start -->",
                lesson.read_text(encoding="utf-8"),
            )
            self.assertNotEqual("pending", self.by_id[source_id]["extraction_method"])

    def test_interpersonal_resources_have_native_qmd_content(self) -> None:
        rows = [row for row in self.published if row["section"] == "Interpersonal Effectiveness"]
        self.assertEqual(41, len(rows))
        for resource in rows:
            source_id = resource["id"]
            lesson = ROOT / self.by_id[source_id]["lesson_qmd"]
            self.assertIn(
                f"<!-- native-resource-content:{source_id}:start -->",
                lesson.read_text(encoding="utf-8"),
            )
            self.assertNotEqual("pending", self.by_id[source_id]["extraction_method"])

    def test_wellness_resources_have_native_qmd_content(self) -> None:
        rows = [row for row in self.published if row["section"] == "Wellness"]
        self.assertEqual(55, len(rows))
        for resource in rows:
            source_id = resource["id"]
            lesson = ROOT / self.by_id[source_id]["lesson_qmd"]
            self.assertIn(
                f"<!-- native-resource-content:{source_id}:start -->",
                lesson.read_text(encoding="utf-8"),
            )
            self.assertNotEqual("pending", self.by_id[source_id]["extraction_method"])

    def test_ten_emotion_profiles_use_source_structure_and_sync_to_app_data(self) -> None:
        profile = (SITE / "learn/emotion-regulation/observing-describing-emotions.qmd").read_text(encoding="utf-8")
        emotions = (
            "Anger", "Disgust", "Envy", "Fear", "Happiness",
            "Jealousy", "Love", "Sadness", "Shame", "Guilt",
        )
        for emotion in emotions:
            section = profile.split(f"## {emotion} {{#", 1)[1].split("\n## ", 1)[0]
            for heading in (
                "Words That Describe This Emotion", "Prompting Events",
                "Interpretations", "Biological Changes and Body Sensations",
                "Expressions and Actions", "Aftereffects",
            ):
                self.assertIn(f"### {heading}", section, (emotion, heading))
        payload = json.loads((SITE / "data/skill-apps/emotions.json").read_text(encoding="utf-8"))
        self.assertEqual(10, len(payload["emotions"]))
        for emotion in payload["emotions"]:
            for field in ("prompting_events", "interpretations", "expressions_actions", "aftereffects"):
                self.assertTrue(emotion[field], (emotion["id"], field))

    def test_pleasant_event_source_and_app_counts_agree(self) -> None:
        payload = json.loads((SITE / "data/skill-apps/pleasant-events.json").read_text(encoding="utf-8"))
        self.assertEqual(225, len(payload["events"]))
        source = (SITE / "learn/emotion-regulation/abc-please.qmd").read_text(encoding="utf-8")
        self.assertIn("full 225-item source list", source)

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
            "site/learn/emotion-regulation/check-the-facts.qmd": (
                "## Check the Facts {#check-the-facts}",
            ),
            "site/learn/emotion-regulation/opposite-action.qmd": (
                "## Opposite Action {#opposite-action}",
                "## Decision Path {#opposite-action-decision-path}",
            ),
            "site/learn/cbt-anxiety/introduction-to-cbt.qmd": (
                "## Five Factor Model {#five-factor-model}",
            ),
            "site/learn/cbt-anxiety/thinking-traps.qmd": (
                "## Thinking Traps {#thinking-traps}",
            ),
            "site/learn/cbt-anxiety/understanding-worry.qmd": (
                "## Worry Tree {#worry-tree}",
                "### Decision Sequence",
            ),
            "site/learn/interpersonal-effectiveness/dear-man.qmd": (
                "## Describe {#describe}",
                "## Express {#express}",
                "## Assert {#assert}",
                "## Reinforce {#reinforce}",
                "## Mindful {#mindful}",
                "## Appear Confident {#appear-confident}",
                "## Negotiate {#negotiate}",
            ),
            "site/learn/wellness/behavior-chain-missing-links.qmd": (
                "## Behaviour Chain Analysis {#behaviour-chain-analysis}",
                "### Vulnerability Factors",
                "### Prompting Event",
                "### Links in the Chain",
                "### Problem Behaviour",
                "### Consequences",
                "### Skillful Alternatives",
                "### Prevention",
                "### Repair",
            ),
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

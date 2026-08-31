import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MINDFULNESS = SITE / "learn" / "mindfulness"


class MindfulnessEmotionPassTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.audit = json.loads(
            (SITE / "data" / "mindfulness-source-audit.json").read_text(encoding="utf-8")
        )
        cls.emotions = json.loads(
            (SITE / "data" / "skill-apps" / "emotions.json").read_text(encoding="utf-8")
        )["emotions"]

    def test_long_emotion_page_uses_compact_toc_without_removing_h3_content(self) -> None:
        page = (SITE / "learn" / "emotion-regulation" / "observing-describing-emotions.qmd").read_text(encoding="utf-8")
        self.assertRegex(page, r"(?m)^toc-depth: 2$")
        self.assertNotRegex(page, r"(?m)^toc-depth: 3$")
        for heading in (
            "Prompting Events", "Interpretations", "Biological Changes and Body Sensations",
            "Expressions and Actions", "Aftereffects", "Opposite Action",
        ):
            self.assertIn(f"### {heading}", page)
        self.assertIn("Try the Emotion Explorer", page)

    def test_program_source_map_covers_twelve_sessions_and_excludes_boundary(self) -> None:
        self.assertEqual(self.audit["sources"]["mindfulness_program"]["page_count"], 104)
        self.assertFalse(self.audit["sources"]["mindfulness_program"]["whole_pdf_published"])
        self.assertEqual(len(self.audit["session_map"]), 12)
        self.assertEqual({item["session"] for item in self.audit["session_map"]}, set(range(1, 13)))
        self.assertEqual(len(self.audit["program_records"]), 104)
        page_103 = next(record for record in self.audit["program_records"] if record["program_source_page"] == 103)
        self.assertTrue(page_103["excluded"])
        self.assertIn("Interpersonal Effectiveness", page_103["exclusion_reason"])

    def test_all_known_exact_matches_have_original_then_clean_public_assets(self) -> None:
        expected = {
            "Mindfulness Handout 1A", "Mindfulness Handout 3", "Mindfulness Handout 3A",
            "Mindfulness Handout 4A", "Mindfulness Handout 4B", "Mindfulness Handout 4C",
            "Mindfulness Handout 5A", "Mindfulness Handout 5B", "Mindfulness Handout 5C",
            "Emotion Regulation Handout 22", "Mindfulness Handout 9A", "Mindfulness Worksheet 7A",
        }
        matches = self.audit["exact_matches"]
        self.assertEqual({item["handout_number"] for item in matches}, expected)
        for item in matches:
            self.assertTrue(item["exact_match"], item["handout_number"])
            self.assertEqual(
                set(item["verified_by"]),
                {"handout_or_worksheet_number", "exact_title", "internal_wording", "visual_layout"},
            )
            original = SITE / item["original_source_public_asset"].lstrip("/")
            clean = SITE / item["clean_printable_public_asset"].lstrip("/")
            self.assertTrue(original.is_file(), item["handout_number"])
            self.assertTrue(clean.is_file(), item["handout_number"])
            lesson = next(
                (MINDFULNESS / Path(record["assigned_source_qmd"]).name)
                for record in self.audit["program_records"]
                if record["program_source_page"] in item["program_source_pages"]
                and record.get("assigned_source_qmd")
            )
            text = lesson.read_text(encoding="utf-8")
            self.assertLess(text.index(item["original_source_public_asset"]), text.index(item["clean_printable_public_asset"]))

    def test_private_source_is_not_published_or_referenced_by_production_pages(self) -> None:
        self.assertFalse(any(path.name.lower() == "3-mindfulness.pdf" for path in SITE.rglob("*.pdf")))
        for path in SITE.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".qmd", ".yml", ".yaml", ".json", ".js", ".css", ".html"}:
                self.assertNotIn("tmp/source", path.read_text(encoding="utf-8", errors="ignore"), path)

    def test_all_twelve_lessons_contain_substantive_adapted_teaching(self) -> None:
        lesson_names = [Path(item["assigned_source_qmd"]).name for item in self.audit["session_map"]]
        self.assertEqual(len(set(lesson_names)), 12)
        for name in lesson_names:
            text = (MINDFULNESS / name).read_text(encoding="utf-8")
            prose = re.sub(r"\{[^}]*\}|\[[^]]*\]\([^)]*\)|[#*_>`-]", " ", text)
            self.assertGreater(len(prose.split()), 180, name)

    def test_emotion_explorer_static_contract_and_links(self) -> None:
        javascript = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        for label in (
            "Words or feelings", "Body sensations / changes", "What was happening",
            "Thoughts / interpretations", "Action urges", "Expressions / actions", "Aftereffects",
        ):
            self.assertIn(label, javascript)
        self.assertIn('mode: next?.mode === "explore" ? "explore" : "identify"', javascript)
        self.assertIn("matchedSelectedClues / totalSelectedClues", javascript.replace("contributingClues.length", "matchedSelectedClues").replace("selected.length", "totalSelectedClues"))
        self.assertIn('role="progressbar"', javascript)
        self.assertIn(".emotion-match-track", css)
        self.assertIn("They are not probabilities, scores, or a diagnosis", javascript)
        self.assertIn("Why this matched", javascript)
        self.assertIn("Other common features", javascript)
        self.assertEqual(len(self.emotions), 10)
        emotion_page = (SITE / "learn" / "emotion-regulation" / "observing-describing-emotions.qmd").read_text(encoding="utf-8")
        for emotion in self.emotions:
            self.assertEqual(
                emotion["learn_route"],
                f'/learn/emotion-regulation/observing-describing-emotions.html#{emotion["id"]}',
            )
            self.assertIn(f'{{#{emotion["id"]}}}', emotion_page)


if __name__ == "__main__":
    unittest.main()

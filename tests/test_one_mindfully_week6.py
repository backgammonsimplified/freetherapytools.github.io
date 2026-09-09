from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "site/learn/mindfulness/one-mindfully.qmd").read_text(encoding="utf-8")
LAYOUT_JS = (ROOT / "site/assets/learn-layout-stability.js").read_text(encoding="utf-8")
SCRIPTS = (ROOT / "site/includes/bs-scripts.html").read_text(encoding="utf-8")
QUARTO = (ROOT / "site/_quarto.yml").read_text(encoding="utf-8")


class OneMindfullyWeekSixTests(unittest.TestCase):
    def test_switch_tasking_video_is_at_top_of_lesson(self):
        self.assertIn("5eQyfirx2HA", PAGE)
        self.assertIn("youtube-nocookie.com/embed/5eQyfirx2HA", PAGE)
        self.assertLess(PAGE.index("5eQyfirx2HA"), PAGE.index('## What is "One-Mindfully"?'))

    def test_source_structure_is_summarized_with_original_headers(self):
        self.assertIn('## What is "One-Mindfully"?', PAGE)
        self.assertIn("## Benefits of One-Mindfulness: Why do it?", PAGE)
        self.assertIn("## One-Mindfully: How to do it?", PAGE)
        self.assertIn("### The past is over", PAGE)
        self.assertIn("### The future has not come into existence", PAGE)
        self.assertIn("### Do only one thing at a time", PAGE)
        self.assertIn("Returning is the practice", PAGE)

    def test_therapy_taxonomy_replaces_stale_backgammon_tag(self):
        self.assertIn("  - Mindfulness", PAGE)
        self.assertNotIn("Checker Play", PAGE)

    def test_learn_layout_helper_preserves_empty_toc_rail(self):
        self.assertIn("bs-learn-toc-layout-placeholder", LAYOUT_JS)
        self.assertIn("reservedWidths", LAYOUT_JS)
        self.assertIn("toc.hidden = false", LAYOUT_JS)
        self.assertIn("MutationObserver", LAYOUT_JS)
        self.assertIn("learn-layout-stability.js?v=20260909-stable-learn-rail", SCRIPTS)
        self.assertIn("- assets/learn-layout-stability.js", QUARTO)


if __name__ == "__main__":
    unittest.main()

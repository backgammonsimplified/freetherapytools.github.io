from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
QUESTION_JS = (ROOT / "site/assets/tool-question-flow.js").read_text(encoding="utf-8")
QUESTION_CSS = (ROOT / "site/assets/tool-question-flow.css").read_text(encoding="utf-8")
PROGRESS_JS = (ROOT / "site/assets/skill-progress-bar.js").read_text(encoding="utf-8")
SCRIPTS = (ROOT / "site/includes/bs-scripts.html").read_text(encoding="utf-8")


class ToolUiStabilityTests(unittest.TestCase):
    def test_progress_ui_is_outside_progressive_question_contract(self):
        self.assertIn('[data-skill-progress-final]', QUESTION_JS)
        self.assertIn('.skill-progress-persistent', QUESTION_JS)
        self.assertNotIn('header.hidden = true', QUESTION_JS)
        self.assertNotIn('Review what I have entered', QUESTION_JS)
        self.assertNotIn('Question ${', QUESTION_JS)
        self.assertIn('data-skill-progress-final', PROGRESS_JS)

    def test_progressive_reveal_keeps_previous_answers_visible(self):
        self.assertIn('is-answered', QUESTION_JS)
        self.assertIn('is-current', QUESTION_JS)
        self.assertIn('is-entering', QUESTION_JS)
        self.assertIn('Show all questions', QUESTION_JS)
        self.assertIn('scrollIntoView({ behavior: "smooth"', QUESTION_JS)

    def test_standard_text_controls_use_readable_full_width_typography(self):
        self.assertIn('font-family: inherit;', QUESTION_CSS)
        self.assertIn('font-size: 1.05rem;', QUESTION_CSS)
        self.assertIn('width: 100%;', QUESTION_CSS)
        self.assertIn('.skill-app.tool-progressive-enabled > .skill-app-shell', QUESTION_CSS)
        self.assertIn('max-width: none;', QUESTION_CSS)

    def test_avoidance_is_presented_as_one_worked_example(self):
        self.assertIn('tool-single-example', QUESTION_JS)
        self.assertIn('tool-avoidance-primary', QUESTION_JS)
        self.assertIn('[data-cbt-action="add"]', QUESTION_JS)
        self.assertIn('[data-cbt-action="practice"]', QUESTION_JS)
        self.assertIn('[data-cbt-action="remove"]', QUESTION_JS)

    def test_current_assets_are_cache_busted(self):
        self.assertIn('tool-question-flow.css?v=20260907-progressive-reveal-4', SCRIPTS)
        self.assertIn('tool-question-flow.js?v=20260907-progressive-reveal-4', SCRIPTS)


if __name__ == "__main__":
    unittest.main()

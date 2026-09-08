from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
QUESTION_JS = (ROOT / "site/assets/tool-question-flow.js").read_text(encoding="utf-8")
QUESTION_CSS = (ROOT / "site/assets/tool-question-flow.css").read_text(encoding="utf-8")
PROGRESS_JS = (ROOT / "site/assets/skill-progress-bar.js").read_text(encoding="utf-8")
PROGRESS_CSS = (ROOT / "site/assets/skill-progress-bar.css").read_text(encoding="utf-8")
SCRIPTS = (ROOT / "site/includes/bs-scripts.html").read_text(encoding="utf-8")
QUARTO = (ROOT / "site/_quarto.yml").read_text(encoding="utf-8")


class ToolUiStabilityTests(unittest.TestCase):
    def test_progress_ui_is_outside_progressive_question_contract(self):
        self.assertIn('[data-skill-progress-final]', QUESTION_JS)
        self.assertIn('.skill-progress-persistent', QUESTION_JS)
        self.assertNotIn('header.hidden = true', QUESTION_JS)
        self.assertNotIn('Review what I have entered', QUESTION_JS)
        self.assertNotIn('Question ${', QUESTION_JS)
        self.assertIn('data-skill-progress-final', PROGRESS_JS)

    def test_persistent_bar_assets_survive_clean_quarto_render(self):
        self.assertIn('- assets/skill-progress-bar.js', QUARTO)
        self.assertIn('- assets/skill-progress-bar.css', QUARTO)
        self.assertIn('position: fixed;', PROGRESS_CSS)
        self.assertIn('bottom: 0;', PROGRESS_CSS)
        self.assertIn('left: 50%;', PROGRESS_CSS)
        self.assertIn('width: min(72rem, calc(100vw - 2rem));', PROGRESS_CSS)
        self.assertIn('transform: translateX(-50%);', PROGRESS_CSS)
        self.assertNotIn('.skill-app.skill-progress-persistent-enabled .skill-app-shell', PROGRESS_CSS)

    def test_persistent_bar_keeps_privacy_reminder(self):
        self.assertIn('skill-progress-persistent-privacy', PROGRESS_JS)
        self.assertIn('Static site hosted on GitHub Pages', PROGRESS_JS)
        self.assertIn('no Free Therapy Tools application server or database receiving your entries', PROGRESS_JS)
        self.assertIn('do not add analytics, tracking scripts, or cookies', PROGRESS_JS)
        self.assertIn('Browser autosave stays on this device', PROGRESS_JS)
        self.assertIn('.skill-progress-persistent-privacy', PROGRESS_CSS)

    def test_progressive_reveal_uses_explicit_next(self):
        self.assertIn('data-tool-question-next', QUESTION_JS)
        self.assertIn('Next</button>', QUESTION_JS)
        self.assertIn('revealNext', QUESTION_JS)
        self.assertIn('is-answered', QUESTION_JS)
        self.assertIn('is-current', QUESTION_JS)
        self.assertIn('is-entering', QUESTION_JS)
        self.assertIn('Show all questions', QUESTION_JS)
        self.assertIn('scrollIntoView({ behavior: "smooth"', QUESTION_JS)
        self.assertNotIn('setTimeout(() => {\n        if (!blockAnswered(block))', QUESTION_JS)

    def test_standard_text_controls_use_readable_full_width_typography(self):
        self.assertIn('font-family: inherit;', QUESTION_CSS)
        self.assertIn('font-size: 1.05rem;', QUESTION_CSS)
        self.assertIn('width: 100%;', QUESTION_CSS)
        self.assertIn('.skill-app.tool-progressive-enabled .skill-app-panel', QUESTION_CSS)
        self.assertNotIn('.skill-app.tool-progressive-enabled > .skill-app-shell', QUESTION_CSS)
        self.assertNotIn('.skill-app [data-skill-progress-final].skill-progress-persistent', QUESTION_CSS)

    def test_avoidance_is_presented_as_one_worked_example(self):
        self.assertIn('tool-single-example', QUESTION_JS)
        self.assertIn('tool-avoidance-primary', QUESTION_JS)
        self.assertIn('[data-cbt-action="add"]', QUESTION_JS)
        self.assertIn('[data-cbt-action="practice"]', QUESTION_JS)
        self.assertIn('[data-cbt-action="remove"]', QUESTION_JS)

    def test_current_assets_are_cache_busted(self):
        self.assertIn('skill-progress-bar.css?v=20260907-persistent-bar-3-restored', SCRIPTS)
        self.assertIn('skill-progress-bar.js?v=20260907-persistent-bar-4-privacy', SCRIPTS)
        self.assertIn('tool-question-flow.css?v=20260907-progressive-reveal-6-geometry', SCRIPTS)
        self.assertIn('tool-question-flow.js?v=20260907-progressive-reveal-5-next', SCRIPTS)


if __name__ == "__main__":
    unittest.main()

import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
JS = SITE / "assets" / "skill-practice-apps.js"


class PracticeAppTests(unittest.TestCase):
    def test_routes_render_app_containers(self):
        routes = ["behaviour-chain", "missing-links", "exposure", "dear-man", "ask-or-say-no", "goal-builder", "behavioural-activation", "values-review"]
        for route in routes:
            text = (SITE / "skill-finder" / route / "index.qmd").read_text(encoding="utf-8")
            self.assertIn("data-practice-app", text, route)

    def test_behaviour_chain_and_exposure_have_keyboard_controls(self):
        text = JS.read_text(encoding="utf-8")
        for token in ("Add chain link", "Move up", "Move down", "Remove", "actions", "body sensations", "cognitions / thoughts", "environment / events", "feelings"):
            self.assertIn(token, text)
        for token in ("Add safe step", "Move easier", "Move harder", "Before rating 0-100", "After rating 0-100", "objectively safe"):
            self.assertIn(token, text)

    def test_dear_man_give_fast_and_goal_components_complete(self):
        text = JS.read_text(encoding="utf-8")
        for component in ("Describe", "Express", "Assert", "Reinforce", "Mindful", "Appear Confident", "Negotiate", "Gentle", "Interested", "Validate", "Easy Manner", "Fair", "No Unnecessary Apologies", "Stick to Values", "Truthful"):
            self.assertIn(component, text)
        for component in ("Specific", "Measurable", "Achievable", "Relevant / Realistic", "Time-Oriented"):
            self.assertIn(component, text)

    def test_values_review_supports_weekly_and_monthly_check_ins(self):
        text = JS.read_text(encoding="utf-8")
        for token in ("Values Review", "Weekly", "Monthly", "Where did my actions align", "Which value or life domain needs more attention", "Next review date"):
            self.assertIn(token, text)

    def test_no_external_transmission_and_deep_links_resolve(self):
        text = JS.read_text(encoding="utf-8")
        self.assertNotRegex(text, r"fetch\(|XMLHttpRequest|sendBeacon")
        self.assertIn("https://calendar.google.com/calendar/r/eventedit", text)
        self.assertIn('root.querySelectorAll("[data-google-calendar]").forEach((button) => button.addEventListener("click"', text)
        hrefs = re.findall(r'href:\s*"([^"]+)"', text)
        self.assertTrue(hrefs)
        for href in hrefs:
            parts = urlsplit(href)
            relative = parts.path.strip("/")
            source = SITE / (relative[:-5] + ".qmd") if relative.endswith(".html") else SITE / relative / "index.qmd"
            self.assertTrue(source.is_file(), href)
            if parts.fragment:
                source_text = source.read_text(encoding="utf-8")
                self.assertRegex(source_text, rf"\{{#{re.escape(parts.fragment)}\}}", href)


if __name__ == "__main__":
    unittest.main()

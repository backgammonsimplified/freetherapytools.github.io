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
            self.assertRegex(text, r"data-(?:practice|skill)-app", route)

    def test_behaviour_chain_and_exposure_have_keyboard_controls(self):
        text = JS.read_text(encoding="utf-8")
        self.assertNotIn("Add chain link", text)
        for token in ("What exactly is the behaviour I am analyzing?", "Unbalanced sleep", "Unbalanced eating", "Unbalanced exercise", "Actions", "Body sensations", "Cognitions / thoughts", "Events", "Feelings", "Short-term pros", "Long-term cons", "Plans to correct or repair"):
            self.assertIn(token, text)
        for token in ("Add safe step", "Move easier", "Move harder", "Before rating 0-100", "After rating 0-100", "objectively safe"):
            self.assertIn(token, text)

    def test_dear_man_give_fast_and_goal_components_complete(self):
        text = JS.read_text(encoding="utf-8")
        for component in ("Describe", "Express", "Assert", "Reinforce", "Mindful", "Appear Confident", "Negotiate", "Gentle", "Interested", "Validate", "Easy Manner", "Fair", "No Unnecessary Apologies", "Stick to Values", "Truthful"):
            self.assertIn(component, text)
        for component in ("Specific", "Measurable", "Achievable", "Relevant / Realistic", "Time-Oriented"):
            self.assertIn(component, text)
        for component in ("Can we simplify the goal?", "What is a smaller thing we could do and still feel satisfied?", "What could get in the way?", "What could prevent us from completing the goal", "What could support follow-through?"):
            self.assertIn(component, text)
        self.assertNotIn("Smallest useful version", text)

    def test_values_review_supports_weekly_and_monthly_check_ins(self):
        text = JS.read_text(encoding="utf-8")
        for token in ("Values Review", "Weekly", "Monthly", "Where did my actions align", "Which value or life domain needs more attention", "Next review date"):
            self.assertIn(token, text)
        for token in ("Schedule my next Values review", "Revisit my Values plan", "data-values-review-calendar"):
            self.assertIn(token, text)

    def test_shared_calendar_consumers_and_activity_library(self):
        text = JS.read_text(encoding="utf-8")
        calendar = (SITE / "assets" / "therapy-calendar.js").read_text(encoding="utf-8")
        for token in ("TherapyCalendar", "buildIcsEvent", "buildGoogleCalendarUrl", "recurrenceRule", "mountEditor", "Timezone"):
            self.assertIn(token, calendar)
        for token in ("data-activation-event", "Custom activity", "behavioural-activation", "values-review", "SharedCalendar.mountEditor"):
            self.assertIn(token, text)

    def test_no_external_transmission_and_deep_links_resolve(self):
        text = JS.read_text(encoding="utf-8")
        self.assertNotRegex(text, r"XMLHttpRequest|sendBeacon")
        self.assertIn('fetch("/data/skill-apps/pleasant-events.json", { credentials: "same-origin" })', text)
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

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class FocusedDistressInterpersonalToolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.quick = (SITE / "assets/skill-quick-tools.js").read_text(encoding="utf-8")
        cls.css = (SITE / "assets/skill-apps.css").read_text(encoding="utf-8")
        cls.progress = (SITE / "assets/skill-progress.js").read_text(encoding="utf-8")
        cls.catalogue = json.loads((SITE / "data/tool-finder/catalogue.json").read_text(encoding="utf-8"))

    def entry(self, entry_id):
        return next(item for item in self.catalogue["entries"] if item["id"] == entry_id)

    def test_routes_catalogue_learn_and_project_path_support(self):
        expected = {
            "pros-and-cons": ("Distress Tolerance", "/learn/distress-tolerance/pros-and-cons.html"),
            "interpersonal-troubleshooting": ("Interpersonal Effectiveness", "/learn/interpersonal-effectiveness/saying-no.html#interpersonal-troubleshooting"),
        }
        for tool_id, (topic, learn) in expected.items():
            page = SITE / "tool-finder" / tool_id / "index.qmd"
            self.assertTrue(page.is_file())
            text = page.read_text(encoding="utf-8")
            self.assertIn("sidebar: tool-finder", text)
            self.assertIn(f'data-quick-app="{tool_id}"', text)
            self.assertIn(f'"{tool_id}": "/tool-finder/{tool_id}/"', self.progress)
            self.assertIn(f'"{tool_id}": init', self.quick)
            entry = self.entry(tool_id)
            self.assertEqual(entry["official_topic"], topic)
            self.assertEqual(entry["tool_href"], f"/tool-finder/{tool_id}/")
            self.assertEqual(entry["learn_href"], learn)
            self.assertEqual(entry["kind"], "tool")
        self.assertIn("Site.path", self.quick)
        self.assertNotRegex(self.quick, r"[?&](?:urge|goal|context|answer)=")

    def test_pros_and_cons_source_structure_and_no_score(self):
        for text in (
            "What urge or problem behavior are you considering?",
            "What is happening right now?",
            "Pros of acting on the urge",
            "Cons of acting on the urge",
            "Pros of resisting the urge",
            "Cons of resisting the urge",
            "Short term / today",
            "Longer term / beyond today",
            "Both",
            "Not sure",
            "Looking beyond the immediate moment",
            "Review my list",
            "What choice feels most consistent with what matters to you right now?",
        ):
            self.assertIn(text, self.quick)
        for action in ("Add another", "Edit", "Remove", "Move up", "Move down"):
            self.assertIn(action, self.quick)
        self.assertIn("slice(0, 500)", self.quick)
        self.assertNotIn("Resisting wins", self.quick)
        self.assertNotRegex(self.quick, r"pros.{0,20}(?:score|winner)", re.IGNORECASE)
        self.assertIn('grid-template-areas: "acting-pros resisting-pros" "acting-cons resisting-cons"', self.css)
        self.assertIn('grid-template-areas: "acting-pros" "acting-cons" "resisting-pros" "resisting-cons"', self.css)

    def test_pros_learn_uses_clean_exact_matches_and_omits_duplicates(self):
        page = (SITE / "learn/distress-tolerance/pros-and-cons.qmd").read_text(encoding="utf-8")
        self.assertIn("/tool-finder/pros-and-cons/", page)
        self.assertIn("distress-tolerance-handout-5-pros-and-cons-clean.pdf", page)
        self.assertIn("distress-tolerance-worksheet-3-pros-and-cons-of-acting-on-crisis-urges-clean.pdf", page)
        self.assertNotIn("/resources/distress-tolerance/distress-tolerance-p030.jpg", page)
        self.assertNotIn("/resources/distress-tolerance/distress-tolerance-p032.jpg", page)
        self.assertNotIn("/resources/distress-tolerance/distress-tolerance-p033.jpg", page)
        self.assertNotIn("#resource-distress-tolerance-p033", page)
        self.assertIn("p033 is retained in the source inventory", page)
        self.assertNotIn("imp15ive", page)
        for phrase in ("When Pros & Cons can help", "Look at all four sides", "Short term and longer term", "Prepare before the urge is strongest"):
            self.assertIn(phrase, page)

    def test_troubleshooting_six_areas_editing_and_results(self):
        headings = [
            "Do I have the skills I need?",
            "Am I clear about what I want in this interaction?",
            "Are short-term goals getting in the way of longer-term goals?",
            "Are my emotions making it hard to use the skill?",
            "Are worries, assumptions, or beliefs getting in the way?",
            "Is the environment more powerful than the skill right now?",
        ]
        self.assertEqual(len(re.findall(r"id: \"(?:skills|clarity|timeGoals|emotions|beliefs|environment)\"", self.quick)), 6)
        for heading in headings:
            self.assertIn(heading, self.quick)
        for text in ("Yes", "No", "Not sure", "Optional note", "Worth looking at", "What is the next adjustment you want to try?", "What would tell you whether that adjustment helped?"):
            self.assertIn(text, self.quick)
        self.assertIn("data-trouble-completed", self.quick)
        self.assertIn("Review this area", self.quick)
        self.assertNotIn("delete state.areas", self.quick)
        focused_runtime = self.quick.split("const TROUBLESHOOTING_AREAS", 1)[1]
        self.assertNotRegex(focused_runtime, r"(?:percentage|diagnos(?:e|tic)|clinical score)")
        self.assertIn("real power differences", self.quick)
        self.assertIn("may still say no", self.quick)
        self.assertIn("grid-template-columns: minmax(0, 1fr);", self.css)

    def test_troubleshooting_learn_clean_parts_and_related_tool_links(self):
        page = (SITE / "learn/interpersonal-effectiveness/saying-no.qmd").read_text(encoding="utf-8")
        self.assertIn("Troubleshooting When What You're Doing Isn't Working {#interpersonal-troubleshooting}", page)
        self.assertIn("/tool-finder/interpersonal-troubleshooting/", page)
        for part in ("1-of-2-clean.pdf", "2-of-2-clean.pdf"):
            self.assertIn(part, page)
        self.assertNotIn("/resources/interpersonal-effectiveness/interpersonal-effectiveness-p040.jpg", page)
        self.assertNotIn("/resources/interpersonal-effectiveness/interpersonal-effectiveness-p041.jpg", page)
        self.assertNotIn("skills breakdown point", page)
        for route in ("dear-man", "ask-or-say-no", "dime-game"):
            tool_page = (SITE / "tool-finder" / route / "index.qmd").read_text(encoding="utf-8")
            self.assertIn("Not working as expected? Troubleshoot the interaction.", tool_page)
            self.assertIn("/tool-finder/interpersonal-troubleshooting/", tool_page)

    def test_progress_exports_and_safety_copy(self):
        for token in (
            'toolId: "pros-and-cons"',
            'toolId: "interpersonal-troubleshooting"',
            "getState:", "setState:", "validateState:", "getReadableSummary:",
            "# Pros & Cons", "# Troubleshooting Interpersonal Effectiveness",
            "immediate danger to you or another person",
        ):
            self.assertIn(token, self.quick)
        self.assertIn("Printable worksheet:", self.quick)
        self.assertIn("Handout 9, part 1:", self.quick)
        self.assertIn("Handout 9, part 2:", self.quick)


if __name__ == "__main__":
    unittest.main()

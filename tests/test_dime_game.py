import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
FLOW_PATH = SITE / "data" / "skill-apps" / "flows" / "dime-game.json"


class DimeGameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.flow = json.loads(FLOW_PATH.read_text(encoding="utf-8"))
        cls.factors = [node for node in cls.flow["nodes"] if node.get("dime_factor")]
        cls.javascript = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        cls.css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")

    def test_route_exists_and_uses_shared_guided_app(self):
        route = SITE / "skill-finder" / "dime-game" / "index.qmd"
        self.assertTrue(route.is_file())
        page = route.read_text(encoding="utf-8")
        self.assertIn('title: "The DIME Game"', page)
        self.assertIn('data-skill-app="dime-game"', page)
        self.assertNotIn("<iframe", page.lower())
        self.assertNotIn("<canvas", page.lower())

    def test_route_is_registered_in_progress_and_navigation(self):
        progress = (SITE / "assets" / "skill-progress.js").read_text(encoding="utf-8")
        navigation = (SITE / "_learn-navigation.yml").read_text(encoding="utf-8")
        generator = (ROOT / "scripts" / "learn_glossary.py").read_text(encoding="utf-8")
        self.assertIn('"dime-game": "/skill-finder/dime-game/"', progress)
        self.assertIn("skill-finder/dime-game/index.qmd", navigation)
        self.assertIn("skill-finder/dime-game/index.qmd", generator)

    def test_landing_choice_precedes_mode_specific_situation(self):
        self.assertEqual(self.flow["start"], "mode")
        mode = self.flow["nodes"][0]
        self.assertEqual(mode["prompt"], "What are you deciding?")
        self.assertEqual([choice["value"] for choice in mode["choices"]], ["ask", "say-no"])
        self.assertTrue(all(choice["next"] == "situation" for choice in mode["choices"]))
        situation = self.flow["nodes"][1]
        self.assertIn("Who is involved", situation["help_by_mode"]["ask"])
        self.assertIn("Who is involved", situation["help_by_mode"]["say-no"])

    def test_ten_factors_follow_required_order_and_scoring(self):
        self.assertEqual(
            [node["heading"] for node in self.factors],
            ["Capability", "Priorities", "Self-respect", "Rights", "Authority", "Relationship", "Goals", "Give and Take", "Homework", "Timing"],
        )
        self.assertEqual(len(self.factors), 10)
        self.assertTrue(all(node["dime_for"] == {"ask": "yes", "say-no": "no"} for node in self.factors))

    def test_authoritative_ask_questions_are_present(self):
        expected = [
            "Is this person capable of giving or doing what you want?",
            "Is getting your objective more important than maintaining your relationship with this person?",
            "Will asking help you feel competent and self-respecting?",
            "Is the person legally or morally obliged to do or give you what you want?",
            "Are you in a position of responsibility or authority to tell the person what to do?",
            "Is what you want appropriate and reasonable within the context of this relationship?",
            "Is asking important to achieving a long-term goal of yours?",
            "Do you generally give as much as you get in this relationship?",
            "Have you done your research on what the request entails?",
            "Is this an opportune moment to ask — is the person likely in the right mood?",
        ]
        self.assertEqual([node["prompt_by_mode"]["ask"] for node in self.factors], expected)

    def test_authoritative_say_no_questions_are_present(self):
        expected = [
            "Can you give this person what is wanted?",
            "Is your relationship more important than saying no?",
            "Will saying no make you feel bad about yourself?",
            "Are you legally or morally obliged to give or do what is wanted, or does saying no violate this person's rights?",
            "Is this other person in a position of responsibility or authority to tell you what to do?",
            "Is what the person is requesting of you appropriate and reasonable within the context of your relationship?",
            "In the long term, will you regret saying no?",
            "Do you owe this person a favor — does this person do a lot for you when you ask and need something?",
            "Are you well-informed about what you are saying no to? Is the other person clear about what is being asked for?",
            "Is it good timing for the request?",
        ]
        self.assertEqual([node["prompt_by_mode"]["say-no"] for node in self.factors], expected)

    def test_complete_response_tables_and_zero_ambiguity_note(self):
        self.assertEqual(len(self.flow["guidance"]["ask"]), 11)
        self.assertEqual(len(self.flow["guidance"]["say-no"]), 11)
        self.assertEqual(self.flow["guidance"]["ask"][4], "Ask tentatively, and accept no.")
        self.assertEqual(self.flow["guidance"]["ask"][10], "Ask and don't take no for an answer.")
        self.assertEqual(self.flow["guidance"]["say-no"][10], "Don't do it.")
        self.assertIn("exact response table begins at level 1", self.flow["zero_guidance_note"])

    def test_accessible_score_visual_and_mobile_vertical_layout(self):
        for token in ("Dimes collected:", "Intensity:", "$1.00", "out of 10 dimes", "cents out of one dollar", "dime-scale-dimes"):
            self.assertIn(token, self.javascript)
        self.assertIn('.skill-guided-choice--yes { background: #237846', self.css)
        self.assertIn('.skill-guided-choice--no { background: #a83b3b', self.css)
        self.assertIn('.skill-app[data-skill-app="dime-game"] .skill-guided-choices { grid-template-columns: 1fr; }', self.css)
        self.assertNotIn("horizontal", json.dumps(self.flow).lower())

    def test_previous_answers_revision_and_derived_summary_contract(self):
        for token in ("Change this answer", "removed.forEach", "dimeScore(this.flow, this.answers)", "Source-Backed Result Guidance", "getReadableSummary"):
            self.assertIn(token, self.javascript)
        self.assertNotIn("score:", self.javascript, "score must remain derived rather than stored independently")

    def test_source_links_are_complete_and_printables_open_new_tab(self):
        result = self.flow["nodes"][-1]
        hrefs = [link["href"] for link in result["links"]]
        self.assertIn("/learn/interpersonal-effectiveness/saying-no.html#ask-say-no-intensity", hrefs)
        self.assertIn("/skill-finder/dear-man/", hrefs)
        pdfs = [link for link in result["links"] if link["href"].endswith(".pdf")]
        self.assertEqual(len(pdfs), 3)
        self.assertTrue(all(link.get("new_tab") is True for link in pdfs))
        self.assertTrue(all((SITE / link["href"].lstrip("/")).is_file() for link in pdfs))

    def test_no_template_markers(self):
        combined = FLOW_PATH.read_text(encoding="utf-8") + self.javascript + (SITE / "skill-finder" / "dime-game" / "index.qmd").read_text(encoding="utf-8")
        self.assertNotIn("{{var:", combined)
        self.assertNotIn("{{", combined)


if __name__ == "__main__":
    unittest.main()

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data" / "skill-apps" / "values.json"
APP = ROOT / "site" / "assets" / "skill-apps.js"
CSS = ROOT / "site" / "assets" / "skill-apps.css"
PAGE = ROOT / "site" / "skill-finder" / "values" / "index.qmd"


class ValuesModuleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA.read_text(encoding="utf-8"))
        cls.javascript = APP.read_text(encoding="utf-8")
        cls.css = CSS.read_text(encoding="utf-8")
        cls.page = PAGE.read_text(encoding="utf-8")

    def test_values_dictionary_is_unique_and_substantial(self):
        values = self.data["values"]
        self.assertGreaterEqual(len(values), 250)
        self.assertEqual(len(values), len({value["id"] for value in values}))
        self.assertEqual(len(values), len({value["name"].casefold() for value in values}))
        self.assertTrue(all(value["definition"].strip() for value in values))

    def test_nine_required_domains_exist(self):
        self.assertEqual(
            [domain["name"] for domain in self.data["domains"]],
            [
                "Close Relationships, Family & Caregiving",
                "Friendship & Social Connection",
                "Work, Education & Contribution",
                "Health, Self-Care & Vitality",
                "Personal Growth, Character & Autonomy",
                "Leisure, Creativity & Adventure",
                "Community, Service & Environment",
                "Spirituality, Meaning & Inner Life",
                "Home, Resources, Security & Lifestyle",
            ],
        )

    def test_process_custom_values_gap_and_privacy_contract(self):
        self.assertEqual(self.data["process"], ["DISCOVER", "SORT", "NARROW", "ASSESS", "ACT", "BARRIERS", "MISSION", "REVIEW"])
        self.assertTrue(self.data["custom_values_allowed"])
        self.assertRegex(self.javascript, re.compile(r"Number\(desired\)\s*-\s*Number\(current\)"))
        self.assertIn("Your entries are not saved in this browser", self.javascript)
        self.assertIn("Nothing you enter here is uploaded", self.javascript)
        self.assertNotIn("localStorage", self.javascript)
        self.assertNotIn("https://", self.javascript)
        self.assertNotIn("http://", self.javascript)

    def test_discover_title_subtitle_and_explicit_download_contract(self):
        title = "Discover and Work Towards Your Values"
        subtitle = "Discover and create a plan to work towards your values and accumulate long term positive emotions."
        self.assertIn(title, self.javascript)
        self.assertIn(title, self.page)
        self.assertIn(subtitle, self.javascript)
        self.assertIn(subtitle, self.page)
        self.assertIn("browserAutosave: false", self.javascript)
        self.assertIn("showFloating: false", self.javascript)
        self.assertIn('finalHeading: "Download your results"', self.javascript)

    def test_discover_cards_are_alphabetical_compact_and_expandable(self):
        self.assertIn("localeCompare", self.javascript)
        self.assertIn('<details class="values-definition"><summary>', self.javascript)
        self.assertIn("View definition", self.javascript)
        self.assertIn("Hide definition", self.javascript)
        self.assertIn("values-select-button", self.javascript)
        self.assertIn("values-custom-row", self.javascript)
        self.assertIn("minmax(13rem, 1fr)", self.css)
        self.assertIn("grid-template-columns: minmax(0, 1fr) auto", self.css)
        self.assertIn("margin-block: 0.75rem 2rem", self.css)
        self.assertIn("padding-bottom: 1.75rem", self.css)
        self.assertIn(".values-definition[open] summary::after", self.css)

    def test_importance_buttons_and_clear_selections_replace_old_controls(self):
        self.assertIn("[1, 2, 3, 4, 5]", self.javascript)
        self.assertIn("Importance:", self.javascript)
        self.assertIn("data-importance-value", self.javascript)
        self.assertIn("Clear selections", self.javascript)
        self.assertIn("values-discover-title", self.javascript)
        self.assertNotIn("Clear Saved Data", self.javascript)
        self.assertNotIn("Optional importance label", self.javascript)
        self.assertNotRegex(self.javascript, r'<select[^>]+data-rating')

    def test_values_routes_exist(self):
        self.assertTrue((ROOT / "site" / "skill-finder" / "values" / "index.qmd").is_file())
        self.assertTrue((ROOT / "site" / "learn" / "goal-setting" / "values-valued-action.qmd").is_file())


if __name__ == "__main__":
    unittest.main()

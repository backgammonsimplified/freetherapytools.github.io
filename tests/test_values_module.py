import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data" / "skill-apps" / "values.json"
APP = ROOT / "site" / "assets" / "skill-apps.js"


class ValuesModuleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA.read_text(encoding="utf-8"))
        cls.javascript = APP.read_text(encoding="utf-8")

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
        self.assertIn("Saved only in this browser", self.javascript)
        self.assertIn("Clear Saved Data", self.javascript)
        self.assertNotIn("https://", self.javascript)
        self.assertNotIn("http://", self.javascript)

    def test_values_routes_exist(self):
        self.assertTrue((ROOT / "site" / "skill-finder" / "values" / "index.qmd").is_file())
        self.assertTrue((ROOT / "site" / "learn" / "goal-setting" / "values-valued-action.qmd").is_file())


if __name__ == "__main__":
    unittest.main()

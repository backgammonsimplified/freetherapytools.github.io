import json
import re
import unittest
from pathlib import Path

from scripts import tool_finder_topics


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class ToolFinderTocTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogue = json.loads((SITE / "data/tool-finder/catalogue.json").read_text(encoding="utf-8"))
        cls.page = (SITE / "tool-finder/index.qmd").read_text(encoding="utf-8")
        cls.include = (SITE / "includes/tool-finder-topics.qmd").read_text(encoding="utf-8")
        cls.javascript = (SITE / "assets/tool-finder.js").read_text(encoding="utf-8")
        cls.css = (SITE / "assets/skill-apps.css").read_text(encoding="utf-8")

    def test_native_toc_is_enabled_and_generated_include_is_used(self):
        self.assertIn("toc: true", self.page)
        self.assertIn("toc-depth: 2", self.page)
        self.assertIn("{{< include ../includes/tool-finder-topics.qmd >}}", self.page)
        self.assertNotIn("data-tool-finder-catalogue", self.page)

    def test_catalogue_is_the_single_topic_authority(self):
        self.assertEqual(self.include, tool_finder_topics.expected_output())
        labels = re.findall(r'data-tool-finder-topic="([^"]+)"', self.include)
        anchors = re.findall(r"^## .+ \{#([^}]+)\}$", self.include, re.MULTILINE)
        self.assertEqual(labels, [topic.replace("&", "&amp;") for topic in self.catalogue["topics"]])
        self.assertEqual(anchors, [tool_finder_topics.topic_slug(topic) for topic in self.catalogue["topics"]])
        self.assertEqual(len(anchors), len(set(anchors)))

    def test_runtime_populates_static_sections_and_syncs_native_toc(self):
        for token in (
            'document.querySelectorAll("#TOC a[href]")',
            "section.hidden = !visible",
            "item.hidden = !visible",
            'cards.innerHTML = entries.map(card).join("")',
            "thermometer.before(results)",
            "thermometer.after(results)",
            'Site.path("/data/tool-finder/catalogue.json")',
        ):
            self.assertIn(token, self.javascript)
        self.assertNotIn("host.innerHTML", self.javascript)

    def test_cards_featured_area_and_mobile_overflow_guards_remain(self):
        for token in ('data-skill-app="thermometer"', "data-tool-finder-search", 'data-tool-finder-kind="all"'):
            self.assertIn(token, self.page)
        self.assertIn("overflow-wrap: anywhere", self.css)
        self.assertIn("minmax(min(100%, 19rem), 1fr)", self.css)


if __name__ == "__main__":
    unittest.main()

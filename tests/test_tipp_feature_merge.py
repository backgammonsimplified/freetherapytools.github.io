import json
from pathlib import Path
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SUBPAGES = ("temperature", "intense-exercise", "paced-breathing", "progressive-muscle-relaxation")


def entries(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from entries(child)
    elif isinstance(value, list):
        for child in value:
            yield from entries(child)


class TippFeatureMergeTests(unittest.TestCase):
    def test_generated_sidebar_groups_the_four_supporting_pages(self):
        navigation = yaml.safe_load((SITE / "_learn-navigation.yml").read_text(encoding="utf-8"))
        parent = next(row for row in entries(navigation) if row.get("section") == "2. TIPP")
        self.assertEqual("learn/distress-tolerance/tipp.qmd", parent["href"])
        self.assertEqual(
            ["learn/distress-tolerance/" + slug + ".qmd" for slug in SUBPAGES],
            [row["href"] for row in parent["contents"]],
        )
        self.assertEqual("Progressive Muscle Relaxation", parent["contents"][-1]["text"])
        self.assertTrue(any(row.get("href") == "tool-finder/tipp/index.qmd" for row in entries(navigation)))
        self.assertTrue(any(row.get("href") == "tool-finder/window-of-tolerance/index.qmd" for row in entries(navigation)))
        pre = (ROOT / "scripts/bs_pre_render.py").read_text(encoding="utf-8")
        self.assertEqual(2, pre.count('"learn_glossary_site.py"'))

    def test_both_landing_page_contributions_and_accessible_image_remain(self):
        source = (SITE / "learn/distress-tolerance/index.qmd").read_text(encoding="utf-8")
        for value in ("**spectrum**", "river in nature", "A partial shift counts",
                      "/tool-finder/window-of-tolerance/", "/tool-finder/thermometer/",
                      "[Tool Finder]", "[Wellness]", "[Interpersonal Effectiveness]",
                      "[Thought Records and CBT]", "[Emotion Regulation]", "[Mindfulness]",
                      'fig-alt="A river', "workable regulated range", "toward hypoarousal"):
            self.assertIn(value, source)
        self.assertNotIn("IMAGE TODO", source)
        self.assertTrue((SITE / "assets/distress-tolerance/window-of-tolerance-river.png").is_file())

    def test_tipp_routes_are_discoverable_in_canonical_catalogue(self):
        catalogue = json.loads((SITE / "data/tool-finder/catalogue.json").read_text(encoding="utf-8"))
        rows = {row["id"]: row for row in catalogue["entries"]}
        self.assertEqual("/tool-finder/tipp/", rows["tipp"]["tool_href"])
        self.assertEqual("tool", rows["tipp"]["kind"])
        for key, slug in zip(("temperature", "intense-exercise", "paced-breathing", "pmr"), SUBPAGES):
            self.assertEqual("/learn/distress-tolerance/" + slug + ".html", rows[key]["learn_href"])
        self.assertEqual("/tool-finder/window-of-tolerance/", rows["window-of-tolerance"]["tool_href"])

    def test_video_and_safe_new_tab_learn_links_remain(self):
        lesson = (SITE / "learn/distress-tolerance/tipp.qmd").read_text(encoding="utf-8")
        tool = (SITE / "tool-finder/tipp/index.qmd").read_text(encoding="utf-8")
        self.assertIn("{{< video https://www.youtube.com/watch?v=UuvH_j9O0f4 >}}", lesson)
        for slug in SUBPAGES:
            self.assertIn(slug + ".qmd", lesson)
            self.assertIn("/learn/distress-tolerance/" + slug + ".html", tool)
        self.assertIn('href="${skill.href}" target="_blank" rel="noopener"', tool)
        self.assertIn('aria-label="Learn about TIPP (opens in a new tab)"', tool)
        exercise = (SITE / "learn/distress-tolerance/intense-exercise.qmd").read_text(encoding="utf-8")
        for value in ("5+minute+intense+bodyweight+workout", "Examples, not endorsements",
                      "R0mMyV5OtcM", "BR0jT6JxH-o", "ZCcX2Egirp4", "OFibSNpw2hE"):
            self.assertIn(value, exercise)
        for slug in ("tipp", "paced-breathing", "progressive-muscle-relaxation"):
            text = (SITE / ("learn/distress-tolerance/" + slug + ".qmd")).read_text(encoding="utf-8")
            self.assertNotIn("Progressive / Paired Muscle Relaxation", text)
        relaxation = (SITE / "learn/distress-tolerance/progressive-muscle-relaxation.qmd").read_text(encoding="utf-8")
        self.assertIn("out-breath", relaxation)
        self.assertIn("**relax**", relaxation)
        self.assertNotIn("search_query=DBT+paired", relaxation)


if __name__ == "__main__":
    unittest.main()

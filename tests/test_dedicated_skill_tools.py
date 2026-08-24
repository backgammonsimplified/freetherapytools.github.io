import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ROUTES = (
    "five-factor-model", "thinking-traps", "thought-record", "worry-time",
    "box-breathing", "gratitude-journal", "positive-self-talk", "grounding",
)


class DedicatedSkillToolTests(unittest.TestCase):
    def test_routes_are_unique_registered_and_initialized(self):
        progress = (SITE / "assets" / "skill-progress.js").read_text(encoding="utf-8")
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        route_pairs = re.findall(r'^\s*(?:"([^"]+)"|([a-z][a-z-]*)):\s*"(/skill-finder/[^\"]+/)"', progress, re.MULTILINE)
        ids = [quoted or bare for quoted, bare, _route in route_pairs]
        paths = [route for _quoted, _bare, route in route_pairs]
        self.assertEqual(len(ids), len(set(ids)), "duplicate Skill Finder tool IDs")
        self.assertEqual(len(paths), len(set(paths)), "duplicate Skill Finder routes")
        for route in ROUTES:
            page = SITE / "skill-finder" / route / "index.qmd"
            self.assertTrue(page.is_file(), route)
            text = page.read_text(encoding="utf-8")
            self.assertIn("sidebar: skill-finder", text)
            self.assertIn(f'data-quick-app="{route}"', text)
            self.assertIn(f'"{route}": init', quick)
            self.assertIn(f'toolId: "{route}"', quick)
            self.assertIn(f'"{route}": "/skill-finder/{route}/"', progress)

    def test_shared_assets_and_progress_are_wired_once(self):
        quarto = (SITE / "_quarto.yml").read_text(encoding="utf-8")
        scripts = (SITE / "includes" / "bs-scripts.html").read_text(encoding="utf-8")
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        self.assertEqual(quarto.count("assets/skill-quick-tools.js"), 1)
        self.assertEqual(scripts.count("/assets/skill-quick-tools.js"), 1)
        self.assertIn("TherapySkillProgress", quick)
        self.assertIn("TherapyCalendar", quick)
        for token in ("getState", "setState", "validateState", "getReadableSummary"):
            self.assertIn(token, quick)

    def test_source_taxonomy_and_session_only_handoff(self):
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        for name in ("All-or-Nothing Thinking", "Overgeneralizing", "Mental Filter", "Disqualifying the Positive", "Mind Reading", "Fortune Telling", "Emotional Reasoning", "Should Statements", "Labelling", "Personalization", "Overestimating Danger"):
            self.assertIn(name, quick)
        self.assertIn("sessionStorage.setItem(HANDOFF_KEY", quick)
        self.assertIn("sessionStorage.getItem(HANDOFF_KEY", quick)
        self.assertNotRegex(quick, r"thought-record/\?(?:thought|context)=")

    def test_mobile_and_reduced_motion_styles_exist(self):
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        for token in (".five-factor-map", ".thinking-trap-grid", ".thought-record-steps", ".box-breathing-circle", ".grounding-guide"):
            self.assertIn(token, css)
        self.assertIn("@media (max-width: 780px)", css)
        self.assertIn("@media (prefers-reduced-motion: reduce)", css)

    def test_all_quick_tool_destinations_resolve(self):
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        hrefs = set(re.findall(r'"(/(?:learn|skill-finder|resources)/[^"`]+)"', quick))
        self.assertTrue(hrefs)
        for href in hrefs:
            parts = urlsplit(href)
            relative = parts.path.strip("/")
            if relative.startswith("resources/"):
                source = SITE / relative
            elif relative.endswith(".html"):
                source = SITE / (relative[:-5] + ".qmd")
            else:
                source = SITE / relative / "index.qmd"
            self.assertTrue(source.is_file(), href)
            if parts.fragment and source.suffix == ".qmd":
                text = source.read_text(encoding="utf-8")
                self.assertRegex(
                    text,
                    rf'\{{#{re.escape(parts.fragment)}\}}|#(?:{re.escape(parts.fragment)})\b|(?:id|data-source-id)=["\']{re.escape(parts.fragment)}["\']',
                    href,
                )


if __name__ == "__main__":
    unittest.main()

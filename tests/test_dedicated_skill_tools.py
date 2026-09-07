import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ROUTES = (
    "five-factor-model", "case-map", "thinking-traps", "thought-record", "worry-time",
    "box-breathing", "gratitude-journal", "positive-self-talk", "grounding",
)


class DedicatedSkillToolTests(unittest.TestCase):
    def test_routes_are_unique_registered_and_initialized(self):
        progress = (SITE / "assets" / "skill-progress.js").read_text(encoding="utf-8")
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        route_pairs = re.findall(r'^\s*(?:"([^"]+)"|([a-z][a-z-]*)):\s*"(/tool-finder/[^\"]+/)"', progress, re.MULTILINE)
        ids = [quoted or bare for quoted, bare, _route in route_pairs]
        paths = [route for _quoted, _bare, route in route_pairs]
        self.assertEqual(len(ids), len(set(ids)), "duplicate Tool Finder tool IDs")
        self.assertEqual(len(paths), len(set(paths)), "duplicate Tool Finder routes")
        for route in ROUTES:
            page = SITE / "tool-finder" / route / "index.qmd"
            self.assertTrue(page.is_file(), route)
            text = page.read_text(encoding="utf-8")
            self.assertIn("sidebar: tool-finder", text)
            self.assertIn(f'data-quick-app="{route}"', text)
            self.assertIn(f'"{route}": init', quick)
            self.assertIn(f'toolId: "{route}"', quick)
            self.assertIn(f'"{route}": "/tool-finder/{route}/"', progress)

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

    def test_box_breathing_uses_unclipped_four_side_geometry(self):
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        page = (SITE / "tool-finder" / "box-breathing" / "index.qmd").read_text(encoding="utf-8")
        self.assertIn('data-quick-app="box-breathing"', page)
        for phase in ("inhale", "holdIn", "exhale", "holdOut"):
            self.assertIn(f'data-breath-side="{phase}"', quick)
        for label in (">Inhale<", ">Exhale<", ">Hold<"):
            self.assertIn(label, quick)
        self.assertIn('label.setAttribute("aria-current", "step")', quick)
        self.assertRegex(css, r"\.box-breathing-stage\s*\{[^}]*overflow:\s*visible")
        self.assertRegex(css, r"\.box-breathing-side--inhale\s*\{[^}]*grid-column:\s*1")
        self.assertNotRegex(css, r"\.box-breathing-side--inhale\s*\{[^}]*(?:left:\s*-|translateX\s*\(\s*-)")
        self.assertIn("@media (max-width: 390px)", css)

    def test_five_factor_print_uses_live_text_and_css_not_raster_capture(self):
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        self.assertIn('data-quick-app="five-factor-model"', (SITE / "tool-finder" / "five-factor-model" / "index.qmd").read_text(encoding="utf-8"))
        self.assertIn("@media print", css)
        self.assertIn('.skill-app[data-quick-app="five-factor-model"] textarea', css)
        for raster_token in ("html2canvas", "toDataURL", "canvas.toBlob"):
            self.assertNotIn(raster_token, quick)

    def test_manual_qa_tool_contracts(self):
        quick = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")

        # Thinking Traps is one card per row and uses the curriculum's challenge prompts.
        self.assertRegex(css, r"\.thinking-trap-grid\s*\{[^}]*grid-template-columns:\s*1fr", "Thinking Trap cards must stack")
        for prompt in ("Challenge the thought", "What evidence supports this thought?", "What evidence does not support it?", "Is there another way of seeing the situation?", "What would I say to a close friend in the same situation?", "What is a more balanced thought?"):
            self.assertIn(prompt, quick)
        self.assertIn("Continue in Thought Record", quick)
        self.assertNotRegex(quick, r"thought-record/\?(?:thought|context)=")

        # Worry Time stays inline and returns to the tree without URL-encoded worry text.
        for token in ("Optional worry-time window", "data-worry-time-calendar", "When the thought returns:", "Open Worry Tree"):
            self.assertIn(token, quick)
        self.assertNotRegex(quick, r"worry-tree/\?worry=")

        # Breath holds can be zero and the user-facing safety note remains close to timing controls.
        for text in ("Please consult your doctor or health care practitioner before holding your breath", "Everyone has different breathing needs", "Be mindful of what feels safe and works for you"):
            self.assertIn(text, quick)
        self.assertIn('["holdIn", "Hold after inhale", 0]', quick)
        self.assertIn('["holdOut", "Hold after exhale", 0]', quick)
        self.assertIn("prefers-reduced-motion", quick + css)

        # Compact tools can suppress only the intrusive open-progress control.
        self.assertRegex(quick, r'toolId: "positive-self-talk"[^\n]+showOpenPreviousProgress: false')

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

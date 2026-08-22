import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ASSETS = SITE / "assets"
PROGRESS = (ASSETS / "skill-progress.js").read_text(encoding="utf-8")
CSS = (ASSETS / "skill-progress.css").read_text(encoding="utf-8")


TOOLS = {
    "values": "values",
    "thermometer": "thermometer",
    "emotion-explorer": "emotions",
    "change-emotion": "change-emotion",
    "worry-tree": "worry-tree",
    "pleasant-event": "pleasant-event",
    "behaviour-chain": "behaviour-chain",
    "missing-links": "missing-links",
    "exposure": "exposure",
    "dear-man": "dear-man",
    "ask-or-say-no": "ask-or-say-no",
    "goal-builder": "goal-builder",
    "behavioural-activation": "behavioural-activation",
}


class SkillProgressTests(unittest.TestCase):
    def test_all_interactive_tools_have_unique_stable_ids_and_routes(self):
        self.assertEqual(len(TOOLS), len(set(TOOLS)))
        for tool_id, route in TOOLS.items():
            self.assertTrue((SITE / "skill-finder" / route / "index.qmd").is_file(), tool_id)
            self.assertRegex(PROGRESS, rf'(?:"{re.escape(tool_id)}"|{re.escape(tool_id)}): "/skill-finder/{re.escape(route)}/"')

    def test_shared_framework_contract_and_ui(self):
        for token in ("registerTool", "getState", "setState", "validateState", "getReadableSummary", "schemaVersion"):
            self.assertIn(token, PROGRESS)
        for label in (
            "Open previous progress", "Save progress", "Save Markdown", "Save JSON",
            "Choose progress file", "Export DOCX", "Print / Save as PDF",
            "Clear browser progress", "Start again",
        ):
            self.assertIn(label, PROGRESS)
        self.assertIn("Your progress stays on this device unless you save a copy to your computer.", PROGRESS)
        self.assertIn("Nothing you enter here is uploaded.", PROGRESS)

    def test_every_app_family_registers_validated_state_and_readable_export(self):
        values = (ASSETS / "skill-apps.js").read_text(encoding="utf-8")
        finder = (ASSETS / "skill-finder-apps.js").read_text(encoding="utf-8")
        practice = (ASSETS / "skill-practice-apps.js").read_text(encoding="utf-8")
        for source in (values, finder, practice):
            for token in ("registerTool", "getState", "setState", "validateState", "getReadableSummary"):
                self.assertIn(token, source)
        for tool_id in ("missing-links", "dear-man", "ask-or-say-no", "goal-builder", "behavioural-activation"):
            self.assertRegex(practice, rf'"{re.escape(tool_id)}"\s*:\s*\{{')
        for tool_id in ("thermometer", "emotion-explorer", "pleasant-event"):
            self.assertIn(f'toolId: "{tool_id}"', finder)
        for tool_id in ("behaviour-chain", "exposure"):
            self.assertIn(f'toolId: "{tool_id}"', practice)

    def test_local_only_storage_and_untrusted_import_guards(self):
        self.assertIn('therapy-skill-kit:progress:', PROGRESS)
        self.assertIn("MAX_FILE_SIZE", PROGRESS)
        self.assertIn("file.text()", PROGRESS)
        self.assertIn("JSON.parse", PROGRESS)
        self.assertNotIn("eval(", PROGRESS)
        self.assertNotRegex(PROGRESS, r"fetch\(|XMLHttpRequest|sendBeacon")
        self.assertIn("textContent", PROGRESS)
        self.assertNotIn("innerHTML", PROGRESS)

    def test_accessibility_mobile_and_print_contract(self):
        for token in ('role: "dialog"', '"aria-modal": "true"', 'aria-live', 'event.key === "Escape"', 'prefers-reduced-motion'):
            self.assertIn(token, PROGRESS + CSS)
        self.assertIn("@media (max-width: 575.98px)", CSS)
        self.assertIn("box-sizing: border-box", CSS)
        self.assertIn("@media print", CSS)
        self.assertIn("body.skill-progress-printing > *:not(.skill-progress-print)", CSS)

    def test_progress_assets_load_before_tool_adapters(self):
        scripts = (SITE / "includes" / "bs-scripts.html").read_text(encoding="utf-8")
        self.assertLess(scripts.index("skill-progress.js"), scripts.index("skill-apps.js"))
        quarto = (SITE / "_quarto.yml").read_text(encoding="utf-8")
        self.assertIn("assets/skill-progress.js", quarto)
        self.assertIn("assets/skill-progress.css", quarto)

    def test_normal_learn_sources_do_not_contain_progress_controls(self):
        labels = ("Open previous progress", "Save progress", "skill-progress-drawer")
        for folder in (SITE / "learn", SITE / "cbt-skills", SITE / "mindfulness"):
            for page in folder.rglob("*.qmd"):
                text = page.read_text(encoding="utf-8")
                for label in labels:
                    self.assertNotIn(label, text, page)


if __name__ == "__main__":
    unittest.main()

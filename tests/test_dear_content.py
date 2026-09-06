import json
import re
import unittest
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from unittest.mock import MagicMock
from scripts.bs_post_render import ensure_listing_index

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class DearContentTests(unittest.TestCase):
    def test_listing_fallback_preserves_quarto_generated_index(self):
        output = MagicMock()
        path = output.__truediv__.return_value
        path.exists.return_value = False
        self.assertTrue(ensure_listing_index(output))
        path.write_text.assert_called_once_with("[]\n", encoding="utf-8", newline="\n")
        path.write_text.reset_mock()
        path.exists.return_value = True
        self.assertFalse(ensure_listing_index(output))
        path.write_text.assert_not_called()

    def test_teaching_example_and_source_provenance(self):
        text = (SITE / "learn/interpersonal-effectiveness/dear-man.qmd").read_text(encoding="utf-8")
        for phrase in ("### Passive", "### Aggressive", "### Passive-aggressive", "### Assertive", "DEAR — What We Say", "MAN — How We Say It", "Objective priority", "Relationship priority", "Self-respect priority", "good morning", "mental-health concerns", "sink was broken", "Have the repair scheduled promptly", "communication-styles-triangle.svg"):
            self.assertIn(phrase, text)
        for tool in ("dear-man", "dear-give", "dear-fast"):
            self.assertIn(f"/tool-finder/{tool}/", text)
        sources = text.split("## Source Transcriptions", 1)[1].split("<!-- section-scan-resources:start -->", 1)[0]
        blocks = re.findall(r"(?:^>.*\n)+\n\*Source: [^\n]+", sources, re.M)
        self.assertEqual(len(blocks), 5, "Every transcription needs immediate provenance")
        self.assertIn("What are my OBJECTIVES", sources)
        self.assertIn("turn-the-table comments", sources)
        self.assertNotIn("### Text Version", text.split("#resource-interpersonal-effectiveness-p020", 1)[1])
        for source_id in ("p017", "p018", "p019", "p020"):
            self.assertIn(f'data-source-id="interpersonal-effectiveness-{source_id}"', text)

    def test_blank_worksheet_opens_and_all_prompts_are_present(self):
        folder = SITE / "resources/interpersonal-effectiveness"
        with ZipFile(folder / "dear-man-script-worksheet.docx") as package:
            self.assertIsNone(package.testzip())
            for name in package.namelist():
                if name.endswith(".xml") or name.endswith(".rels"):
                    ET.fromstring(package.read(name))
            xml = ET.fromstring(package.read("word/document.xml"))
        text = " ".join(xml.itertext())
        for phrase in ("DEAR MAN Script Worksheet", "Situation", "Objective", "Describe", "Express", "Assert", "Reinforce", "Mindful", "Appear Confident", "Negotiate", "Final script", "What worked?", "What would I change next time?"):
            self.assertIn(phrase, text)
        self.assertNotIn("Think of a situation you are currently experiencing", text)
        pdf = (folder / "dear-man-script-worksheet.pdf").read_bytes()
        self.assertTrue(pdf.startswith(b"%PDF-"))
        self.assertIn(b"%%EOF", pdf[-20:])
        for page in (SITE / "learn/interpersonal-effectiveness/dear-man.qmd", SITE / "tool-finder/dear-man/index.qmd"):
            for extension in ("docx", "pdf"):
                self.assertIn(f"dear-man-script-worksheet.{extension}", page.read_text(encoding="utf-8"))

    def test_new_tools_have_educational_links_and_search_aliases(self):
        entries = json.loads((SITE / "data/tool-finder/catalogue.json").read_text())["entries"]
        by_id = {entry["id"]: entry for entry in entries}
        for skill, words in (("give", ["relationship effectiveness", "gentle", "interested", "validate", "easy manner"]), ("fast", ["self respect", "self-respect", "fair", "apologies", "values", "truthful"])):
            tool = by_id[f"dear-{skill}"]
            self.assertEqual(tool["tool_type"], "worksheet")
            self.assertEqual(by_id[skill]["kind"], "skill")
            for word in words:
                self.assertIn(word, tool["aliases"])
            page = (SITE / f"tool-finder/dear-{skill}/index.qmd").read_text(encoding="utf-8")
            self.assertIn(f"/learn/interpersonal-effectiveness/{skill}.html", page)


if __name__ == "__main__":
    unittest.main()

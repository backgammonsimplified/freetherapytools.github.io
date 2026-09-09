from __future__ import annotations

import json
import os
import subprocess
import unittest
from pathlib import Path

from scripts import learn_glossary


ROOT = Path(__file__).resolve().parents[1]
PANDOC = Path(r"C:\Program Files\Quarto\bin\tools\pandoc.exe")
FILTER = ROOT / "site" / "_extensions" / "bs-inline-glossary" / "bs-inline-glossary.lua"
LOOKUP = ROOT / "site" / "assets" / "bs-glossary-lookup.json"


class LessonInlineGlossaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not PANDOC.exists():
            raise unittest.SkipTest(f"Bundled Pandoc not found at {PANDOC}")
        data = json.loads(learn_glossary.PUBLIC_DATA_PATH.read_text(encoding="utf-8"))
        cls.entries = learn_glossary.validate_public_data(data)

    def render(self, source: str) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment["BS_GLOSSARY_LOOKUP"] = str(LOOKUP)
        return subprocess.run(
            [str(PANDOC), "--from", "markdown", "--to", "html", "--lua-filter", str(FILTER)],
            cwd=ROOT,
            env=environment,
            input=source,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )

    def test_first_safe_occurrence_is_linked(self) -> None:
        source = """---
terms: [wise-mind]
highlighted-terms: [wise-mind]
---
# Wise Mind heading

`Wise Mind` in code. [Wise Mind](https://example.com/) in a link.

Wise Mind in prose. Wise Mind appears again.
"""
        result = self.render(source)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.count('class="bs-inline-glossary"'), 1)
        self.assertIn('data-bs-glossary-slug="wise-mind">Wise Mind</a>', result.stdout)
        self.assertIn('<code>Wise Mind</code>', result.stdout)

    def test_absent_highlighted_metadata_disables_markup(self) -> None:
        result = self.render("---\nterms: [wise-mind]\n---\n\nWise Mind in prose.\n")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("bs-inline-glossary", result.stdout)

    def test_highlighted_metadata_validation(self) -> None:
        with self.assertRaisesRegex(learn_glossary.ValidationError, "YAML list"):
            learn_glossary.highlighted_terms_from_metadata(
                {"highlighted-terms": "wise-mind"}, "Fixture"
            )
        with self.assertRaisesRegex(learn_glossary.ValidationError, "duplicate normalized"):
            learn_glossary.highlighted_terms_from_metadata(
                {"highlighted-terms": ["wise-mind", "Wise-Mind"]}, "Fixture"
            )

    def test_lesson_backlinks_use_broad_terms(self) -> None:
        lesson = {
            "relative_path": "fixture.qmd",
            "categories": ["Beginner"],
            "tags": ["Mindfulness"],
            "terms": ["wise-mind"],
            "highlighted_terms": ["wise-mind"],
            "title": "Fixture",
        }
        related = learn_glossary.validate_lessons([lesson], self.entries)
        self.assertEqual([item["title"] for item in related["wise-mind"]], ["Fixture"])

    def test_real_lesson_uses_current_canonical_term(self) -> None:
        lessons = learn_glossary.discover_lessons()
        highlighted = [lesson for lesson in lessons if lesson.get("highlighted_terms")]
        self.assertEqual(len(highlighted), 1)
        self.assertEqual(highlighted[0]["highlighted_terms"], ["wise-mind"])


if __name__ == "__main__":
    unittest.main()

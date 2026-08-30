from __future__ import annotations

import json
import re
import unittest
from pathlib import Path, PurePosixPath

import yaml

from scripts.site_base_paths import portable_url, rewrite_html_text


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class PagesDeploymentTests(unittest.TestCase):
    def test_pages_workflow_contract(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        self.assertIn("branches:\n      - master", workflow)
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("quarto render site", workflow)
        self.assertIn("BS_SKIP_SOCIAL_CARDS", workflow)
        self.assertIn("unset TSK_RESOURCE_REVIEW", workflow)
        self.assertIn("path: site/_site", workflow)
        self.assertIn("site/_site/index.html", workflow)

    def test_public_resources_are_therapy_resources(self) -> None:
        quarto = yaml.safe_load((SITE / "_quarto.yml").read_text(encoding="utf-8"))
        resources = quarto["project"]["resources"]
        serialized = "\n".join(resources)
        for obsolete in ("positions", "checker-sage-gnu", "engine-benchmark"):
            self.assertNotIn(obsolete, serialized)
        self.assertIn("assets/bs-glossary-lookup.json", resources)
        self.assertIn("assets/site-path.js", resources)
        self.assertIn("resources/wellness/stages-of-change/**", resources)

    def test_priority_sources_and_compatibility_routes_remain(self) -> None:
        self.assertTrue((SITE / "tool-finder" / "index.qmd").is_file())
        self.assertTrue((SITE / "glossary" / "index.qmd").is_file())
        legacy = (SITE / "legacy-dispositions.yml").read_text(encoding="utf-8")
        self.assertIn('source: "/skill-finder/"', legacy)
        self.assertIn('source: "/learn/cube/"', legacy)

    def test_stages_images_are_production_assets(self) -> None:
        location = SITE / "resources" / "wellness" / "stages-of-change"
        self.assertTrue((location / "stages-of-change.png").is_file())
        self.assertTrue((location / "stages-of-change-cycle.png").is_file())
        lesson = (SITE / "learn" / "wellness" / "maladaptive-coping.qmd").read_text(encoding="utf-8")
        self.assertIn("/resources/wellness/stages-of-change/stages-of-change.png", lesson)
        self.assertIn("/resources/wellness/stages-of-change/stages-of-change-cycle.png", lesson)

    def test_no_private_or_temporary_paths_in_public_source(self) -> None:
        offenders: list[str] = []
        for path in SITE.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in {".qmd", ".html", ".js", ".json", ".yml", ".yaml", ".css"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if re.search(r"C:\\Users\\", text, flags=re.IGNORECASE) or "file:///" in text or re.search(r"(?:^|[\"'(])/tmp/", text):
                offenders.append(str(path.relative_to(ROOT)))
        self.assertEqual(offenders, [])

    def test_static_internal_links_become_portable(self) -> None:
        source = '<a href="/tool-finder/values/">Values</a><img src="/assets/logo.svg"><a href="https://example.org/">External</a>'
        updated, changed = rewrite_html_text(source, PurePosixPath("learn/wellness/index.html"))
        self.assertTrue(changed)
        self.assertIn('href="../../tool-finder/values/"', updated)
        self.assertIn('src="../../assets/logo.svg"', updated)
        self.assertIn('href="https://example.org/"', updated)
        self.assertEqual(portable_url("/", PurePosixPath("tool-finder/values/index.html")), "../../")

    def test_thermometer_is_featured_not_duplicated(self) -> None:
        catalogue = json.loads((SITE / "data" / "tool-finder" / "catalogue.json").read_text(encoding="utf-8"))
        thermometer = next(entry for entry in catalogue["entries"] if entry["id"] == "thermometer")
        self.assertTrue(thermometer["featured_on_home"])
        self.assertNotEqual(thermometer["learn_href"], "/learn/")
        runtime = (SITE / "assets" / "tool-finder.js").read_text(encoding="utf-8")
        self.assertIn('!entry.featured_on_home', runtime)


if __name__ == "__main__":
    unittest.main()

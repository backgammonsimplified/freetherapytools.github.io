from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import yaml

from scripts import bs_post_render
from scripts.publication_config import (
    PUBLICATION_PATH,
    load_legacy_dispositions,
    load_publication_identity,
    publication_mode,
)


ROOT = Path(__file__).resolve().parents[1]


class PublicationIdentityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.publication = load_publication_identity()
        self.registry = load_legacy_dispositions(self.publication)

    def test_shared_identity_is_free_therapy_tools(self) -> None:
        source = yaml.safe_load(PUBLICATION_PATH.read_text(encoding="utf-8"))
        self.assertEqual(source["website"]["title"], "Free Therapy Tools")
        self.assertEqual(
            source["website"]["site-url"],
            "https://backgammonsimplified.github.io/freetherapytools.github.io",
        )
        self.assertEqual(self.publication["acronym"], "FTT")
        quarto = (ROOT / "site" / "_quarto.yml").read_text(encoding="utf-8")
        self.assertIn("- _publication.yml", quarto)

    def test_indexing_modes_are_explicit_and_default_to_development(self) -> None:
        mode, development = publication_mode(self.publication, {})
        self.assertEqual(mode, "development")
        self.assertEqual(development["robots-meta"], "noindex, follow")
        mode, production = publication_mode(
            self.publication, {"BS_PUBLICATION_MODE": "production"}
        )
        self.assertEqual(mode, "production")
        self.assertIn("freetherapytools.github.io/sitemap.xml", bs_post_render.robots_text(production))

    def test_rendered_indexing_replaces_existing_policy(self) -> None:
        origin = self.publication["canonical-origin"]
        source = (
            '<html><head><meta name="robots" content="index">'
            f'<link rel="canonical" href="{origin}/"></head><body></body></html>'
        )
        updated, changed = bs_post_render.indexed_html_text(
            source, "noindex, follow", origin + "/"
        )
        self.assertTrue(changed)
        self.assertEqual(updated.count('name="robots"'), 1)
        self.assertEqual(updated.count('rel="canonical"'), 1)

    def test_legacy_routes_are_redirects_to_distinct_current_routes(self) -> None:
        self.assertTrue(self.registry["hosts"])
        self.assertTrue(self.registry["routes"])
        for route in self.registry["routes"]:
            self.assertNotEqual(route["source"], route["target"])
            self.assertIs(route["canonical"], False)
            self.assertNotIn("/learn/cube/", route["source"])

    def test_release_builds_select_production_mode(self) -> None:
        for relative in ("scripts/bs-build-and-publish.sh", "scripts/windows-clean-release.sh"):
            source = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("BS_PUBLICATION_MODE=production", source)

    def test_canonical_validator_rejects_an_outside_origin(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text(
                '<html><head><link rel="canonical" href="https://example.invalid/"></head></html>',
                encoding="utf-8",
            )
            with self.assertRaisesRegex(RuntimeError, "outside the canonical origin"):
                bs_post_render.validate_rendered_canonicals(root)


if __name__ == "__main__":
    unittest.main()

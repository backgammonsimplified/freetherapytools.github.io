from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts import page_publication as pp


class PagePublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = pp.load_page_policy()
        pp.validate_page_policy(cls.policy)

    def test_policy_controls_only_current_site_routes(self) -> None:
        routes = self.policy["routes"]
        self.assertEqual(
            set(routes),
            {"/", "/about.html", "/glossary/", "/licensing.html", "/learn/index.html"},
        )
        serialized = json.dumps(routes)
        for obsolete in ("engine-benchmark", "/research/", "/analyze/", "match-predictor"):
            self.assertNotIn(obsolete, serialized)

    def test_every_controlled_source_exists(self) -> None:
        for route, config in self.policy["routes"].items():
            with self.subTest(route=route):
                self.assertTrue((pp.REPO_ROOT / config["source"]).is_file())

    def test_default_policy_is_draft_and_known_routes_resolve(self) -> None:
        default = pp.resolve_route_policy(self.policy, "/unregistered.html")
        self.assertEqual(default["status"], "draft")
        known = pp.resolve_route_policy(self.policy, "/learn/index.html")
        self.assertEqual(known["type"], "learn-index")
        self.assertEqual(known["status"], "published")

    def test_canonical_urls_keep_the_project_site_path(self) -> None:
        origin = pp.load_publication_identity()["canonical-origin"]
        self.assertEqual(
            pp.canonical_url("/tool-finder/", origin),
            "https://backgammonsimplified.github.io/freetherapytools.github.io/tool-finder/",
        )

    def test_rendered_title_fallback_uses_current_brand(self) -> None:
        self.assertEqual(pp.rendered_title("<html></html>"), "Free Therapy Tools")
        self.assertEqual(
            pp.rendered_title("<title>Check the Facts - Free Therapy Tools</title>"),
            "Check the Facts",
        )

    def test_stable_feed_guid_uses_current_namespace(self) -> None:
        self.assertEqual(
            pp.stable_rss_guid("/learn/index.html"),
            "urn:freetherapytools:route:/learn/index.html",
        )

    def test_publication_marker_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / ".bs-full-build.json"
            pp.write_full_build_marker(marker)
            self.assertTrue(marker.is_file())
            self.assertTrue(pp.invalidate_full_build_marker(marker))
            self.assertFalse(marker.exists())

    def test_source_validation_command_contract(self) -> None:
        self.assertEqual(pp.main(["page_publication.py", "validate-source"]), 0)


if __name__ == "__main__":
    unittest.main()

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

    def test_project_urls_resolve_to_policy_routes_without_crossing_projects(self) -> None:
        origin = pp.load_publication_identity()["canonical-origin"]
        self.assertEqual("/", pp.route_from_public_url(origin + "/index.html", origin))
        self.assertEqual("/glossary/", pp.route_from_public_url(origin + "/glossary/index.html", origin))
        self.assertIsNone(pp.route_from_public_url("https://backgammonsimplified.github.io/another-project/", origin))
        self.assertIsNone(pp.route_from_public_url(origin + "-other/glossary/", origin))
        self.assertIsNone(pp.route_from_public_url("https://example.org/glossary/", origin))

    def test_sitemap_keeps_published_project_routes_and_removes_drafts(self) -> None:
        origin = pp.load_publication_identity()["canonical-origin"]
        source = (
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f"<url><loc>{origin}/glossary/index.html</loc></url>"
            f"<url><loc>{origin}/unregistered.html</loc></url></urlset>"
        )
        updated, changed, removed = pp.filtered_sitemap_text(source, self.policy, origin)
        self.assertTrue(changed)
        self.assertEqual(1, removed)
        self.assertIn(origin + "/glossary/", updated)
        self.assertNotIn("unregistered", updated)
        self.assertNotIn("freetherapytools.github.io/freetherapytools.github.io", updated)

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

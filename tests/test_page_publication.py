from __future__ import annotations

import copy
import unittest

from scripts import page_publication as pp


class PagePublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.policy = pp.load_page_policy()
        pp.validate_page_policy(cls.policy)

    def test_controlled_page_type_and_status_values_reject_unknowns(self) -> None:
        invalid_type = copy.deepcopy(self.policy)
        invalid_type["routes"]["/learn/index.html"]["type"] = "unknown-type"
        with self.assertRaisesRegex(RuntimeError, "Unknown page type"):
            pp.validate_page_policy(
                invalid_type,
                repo_root=None,
                research_source_path=None,
            )

        invalid_status = copy.deepcopy(self.policy)
        invalid_status["routes"]["/learn/index.html"]["status"] = "unknown-status"
        with self.assertRaisesRegex(RuntimeError, "Unknown publication status"):
            pp.validate_page_policy(
                invalid_status,
                repo_root=None,
                research_source_path=None,
            )

    def test_development_and_production_indexing_are_page_aware(self) -> None:
        development = {"robots-meta": "noindex, follow"}
        production = {"robots-meta": "index, follow"}
        published = pp.resolve_route_policy(self.policy, "/learn/index.html")
        preliminary = pp.resolve_route_policy(
            self.policy,
            "/engine-benchmark/sage-vs-gnu-stage1/index.html",
        )

        self.assertEqual(
            pp.page_robots_meta("development", development, published),
            "noindex, follow",
        )
        self.assertEqual(
            pp.page_robots_meta("production", production, published),
            "index, follow",
        )
        self.assertEqual(
            pp.page_robots_meta("production", production, preliminary),
            "noindex, follow",
        )

    def test_rendered_identity_and_breadcrumbs_share_one_url(self) -> None:
        source = """<!doctype html><html><head>
<meta name="description" content="A clear lesson">
<meta property="og:url" content="https://wrong.example/">
<link rel="canonical" href="https://wrong.example/">
</head><body><main><header id="title-block-header"><h1 class="title">Learn</h1></header></main></body></html>"""
        route = "/learn/index.html"
        config = pp.resolve_route_policy(self.policy, route)
        updated, changed = pp.enriched_html_text(
            source,
            "index, follow",
            config,
            route,
            "https://backgammonsimplified.github.io",
            "Backgammon Simplified",
        )
        canonical = "https://backgammonsimplified.github.io/learn/index.html"

        self.assertTrue(changed)
        self.assertIn(f'rel="canonical" href="{canonical}"', updated)
        self.assertIn(f'property="og:url" content="{canonical}"', updated)
        self.assertIn('"@type":"CollectionPage"', updated)
        self.assertIn('"@type":"BreadcrumbList"', updated)
        self.assertIn('class="bs-publication-breadcrumbs"', updated)
        pp.validate_rendered_identity(updated, canonical)

    def test_preliminary_pages_are_excluded_from_sitemap(self) -> None:
        source = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://backgammonsimplified.github.io/index.html</loc></url>
  <url><loc>https://backgammonsimplified.github.io/learn/index.html</loc></url>
  <url><loc>https://backgammonsimplified.github.io/engine-benchmark/sage-vs-gnu-stage1/index.html</loc></url>
</urlset>
"""
        updated, changed, removed = pp.filtered_sitemap_text(
            source,
            self.policy,
            "https://backgammonsimplified.github.io",
        )

        self.assertTrue(changed)
        self.assertEqual(removed, 1)
        self.assertIn("https://backgammonsimplified.github.io/</loc>", updated)
        self.assertIn("/learn/index.html", updated)
        self.assertNotIn("sage-vs-gnu-stage1", updated)

    def test_rss_excludes_preliminary_and_uses_stable_authored_guid(self) -> None:
        source = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item><title>Learn</title><link>https://backgammonsimplified.github.io/learn/index.html</link><guid>https://backgammonsimplified.github.io/learn/index.html</guid></item>
<item><title>Preliminary</title><link>https://backgammonsimplified.github.io/engine-benchmark/sage-vs-gnu-stage1/index.html</link><guid>old</guid></item>
<item><title>Glossary</title><link>https://backgammonsimplified.github.io/glossary/#take</link><guid isPermaLink="true">https://backgammonsimplified.github.io/glossary/#take</guid></item>
</channel></rss>"""
        updated, changed, removed, stabilized = pp.filtered_updates_feed_text(
            source,
            self.policy,
            "https://backgammonsimplified.github.io",
        )

        self.assertTrue(changed)
        self.assertEqual(removed, 1)
        self.assertEqual(stabilized, 1)
        self.assertIn(
            "urn:backgammonsimplified:route:/learn/index.html",
            updated,
        )
        self.assertIn(
            "https://backgammonsimplified.github.io/glossary/#take",
            updated,
        )
        self.assertNotIn("sage-vs-gnu-stage1", updated)

    def test_unfinished_markers_ignore_comments_and_code(self) -> None:
        source = """Normal prose.
<!-- TODO private note -->
```
TODO example
[PENDING EXAMPLE]
```
TODO visible work
[PENDING FIGURE :: real]
"""
        self.assertEqual(
            pp.unfinished_markers(source),
            ["[PENDING FIGURE :: real]", "TODO"],
        )

    def test_published_source_with_author_marker_is_rejected(self) -> None:
        invalid = copy.deepcopy(self.policy)
        route = "/engine-benchmark/sage-vs-gnu-stage1/index.html"
        invalid["routes"][route]["status"] = "published"
        with self.assertRaisesRegex(RuntimeError, "unresolved author marker"):
            pp.validate_page_policy(invalid)

    def test_404_remains_noindex_in_production(self) -> None:
        config = pp.resolve_route_policy(self.policy, "/404.html")
        self.assertEqual(config["status"], "error")
        self.assertEqual(
            pp.page_robots_meta(
                "production",
                {"robots-meta": "index, follow"},
                config,
            ),
            "noindex, follow",
        )

    def test_research_category_registry_matches_source_and_consumer(self) -> None:
        pp.validate_page_policy(self.policy)
        javascript = (
            pp.REPO_ROOT / "site" / "assets" / "bs-research-index.js"
        ).read_text(encoding="utf-8")
        self.assertIn("/assets/bs-research-categories.json", javascript)
        self.assertIn("applyCategoryRegistry", javascript)


if __name__ == "__main__":
    unittest.main()

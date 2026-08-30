import hashlib
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ASSETS = SITE / "assets"
RENDERED = SITE / "_site"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class NavigationParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.learn = read(ASSETS / "bs-learn.js")
        cls.scroll = read(ASSETS / "bs-learn-scroll.js")
        cls.learn_css = read(ASSETS / "bs-learn.css")
        cls.shared_css = read(ASSETS / "bs-shared.css")
        cls.progress_css = read(ASSETS / "skill-progress.css")
        cls.navigation = read(SITE / "_learn-navigation.yml")
        cls.config = read(SITE / "_quarto.yml")

    def test_backgammon_authority_files_that_need_no_therapy_adaptation_are_exact(self) -> None:
        expected = {
            "bs-glossary.js": "d89a9ce1677dcb833aa46f0958bdd131db5a8a6ccd58df2197594cbb7e7e6a63",
            "bs-shared.css": "d52c75fd08226296efcc593d86937c5af97f836ae83a276616e4ee9ff7289454",
        }
        for name, digest in expected.items():
            self.assertEqual(
                hashlib.sha256((ASSETS / name).read_bytes()).hexdigest(),
                digest,
                name,
            )

    def test_rendered_lessons_have_compatible_dom_and_a_deployed_initializer(self) -> None:
        if not RENDERED.exists():
            self.skipTest("site/_site is unavailable until Quarto renders the site")
        initializer = RENDERED / "assets" / "bs-learn.js"
        self.assertTrue(initializer.is_file(), "rendered navigation initializer is missing")
        self.assertGreater(initializer.stat().st_size, 20_000)

        pages = {
            "DBT": RENDERED / "learn" / "cube" / "tipp.html",
            "CBT": RENDERED / "learn" / "cbt-anxiety" / "thinking-traps.html",
            "Mindfulness": RENDERED / "learn" / "mindfulness" / "what-skills.html",
        }
        expected_tracks = {
            "DBT": ("Distress Tolerance", "/learn/distress-tolerance/"),
            "CBT": ("CBT Skills", "/learn/cbt-anxiety/"),
            "Mindfulness": ("Mindfulness", "/learn/mindfulness/"),
        }
        for curriculum, page in pages.items():
            self.assertTrue(page.is_file(), f"missing rendered {curriculum} fixture")
            html = read(page)
            self.assertRegex(html, r'<body class="[^"]*\bbs-learn-article\b')
            for marker in (
                'id="quarto-sidebar"',
                'class="sidebar-menu-container"',
                "sidebar-item-section",
                "sidebar-item-container",
                "sidebar-item-toggle",
                'id="quarto-margin-sidebar"',
                'id="TOC"',
                "data-bs-term-lookup",
                "data-bs-lesson-track-nav",
            ):
                self.assertIn(marker, html, f"{curriculum}: {marker}")
            self.assertRegex(
                html,
                r'<script src="\.\./\.\./assets/bs-learn\.js\?v=20260822-visible-navigation" defer',
            )
            self.assertEqual(
                len(re.findall(r"sidebar-item sidebar-item-section", html)),
                len(re.findall(r'class="sidebar-item-toggle', html)),
                curriculum,
            )
            track_label, track_href = expected_tracks[curriculum]
            self.assertIn(track_label, html)
            self.assertIn(f'href="../../{track_href.lstrip("/")}"', html)
            self.assertIn("Look up a term", html)

    def test_left_sidebar_has_section_and_whole_sidebar_controls(self) -> None:
        for token in (
            "initializeLearnSidebarControls",
            "Collapse all",
            "Expand all",
            "initializeLearnLeftSidebarToggle",
            "bs-learn-left-sidebar-collapsed",
            'toggle.style.left = "0.5rem"',
            "pageScrollingDown = currentScrollY > lastScrollY",
            "!scrollingDown &&",
            "manuallyCollapsed",
            'new CustomEvent("bs:left-sidebar-change")',
        ):
            self.assertIn(token, self.learn)
        for token in (
            "body.bs-learn-left-sidebar-collapsed",
            "grid-column-start: page-start",
            "bs-learn-active-section",
        ):
            self.assertIn(token, self.learn + self.learn_css)

    def test_sidebar_active_lesson_and_track_follow_continuous_scroll(self) -> None:
        for token in (
            "setActiveSidebar(sidebar, record.route, window.location.href)",
            'link.classList.remove("active")',
            'activeLink.classList.add("active")',
            'activeLink.setAttribute("aria-current", "page")',
            "shouldExpandTrack",
            "sidebar.scrollTop",
        ):
            self.assertIn(token, self.scroll)

    def test_learning_track_toc_lookup_and_right_rail_controls_remain(self) -> None:
        for token in (
            "placeLessonTrackLinks",
            "bs-lesson-track-nav",
            "bs-lesson-track-content",
            "placeLessonRightRailCards",
            "On this page",
            "Look up a term",
            "data-bs-toc-heading-toggle",
            "Collapse all right sidebar content",
            "Expand all right sidebar content",
            "bs-margin-sidebar-collapsed",
            "bs-learn-right-sidebar-collapsed",
            "updateRightRailForScroll",
        ):
            self.assertIn(token, self.learn)

    def test_inline_glossary_and_back_to_top_remain_accessible(self) -> None:
        for token in (
            "initializeInlineGlossary",
            "inlineGlossaryTooltipPosition",
            'aria-expanded="false"',
            "Escape",
            "data-bs-site-back-to-top",
            "Back to top",
            "window.scrollY <= window.innerHeight",
            "prefers-reduced-motion: reduce",
        ):
            self.assertIn(token, self.learn + self.learn_css)

    def test_mobile_drawer_and_navbar_breakpoint_match_authority_contract(self) -> None:
        for token in (
            "bs-mobile-tools-edge",
            "bs-mobile-tools-drawer",
            "bs-mobile-tools-backdrop",
            "isMobileDrawerSwipe",
            'aria-label", "Page contents"',
            "setMobileDrawerOpen(false)",
            "mobileDrawerEdge.focus()",
            "initializeMobileLessonBar",
            "Expand Lesson Index",
            "data-bs-mobile-term-toggle",
            "data-bs-mobile-tools-track",
        ):
            self.assertIn(token, self.learn)
        self.assertRegex(self.config, r"navbar:\s+[\s\S]*?collapse-below: xl")
        self.assertIn("@media (max-width: 991.98px)", self.learn_css)
        self.assertIn(".bs-mobile-term-lookup", self.learn_css)

    def test_navigation_initializer_is_an_explicit_quarto_resource(self) -> None:
        self.assertRegex(
            self.config,
            r"resources:[\s\S]*?- assets/bs-learn\.js",
        )

    def test_real_links_anchors_and_continuous_scroll_manifests_are_preserved(self) -> None:
        for token in (
            "isSamePageTocHref",
            "rewriteIdReferences",
            "tocHashTargets",
            'getAttribute("href")',
            'getAttribute("data-scroll-target")',
            "next_route",
            "previous_route",
            "setActiveSidebar",
        ):
            self.assertIn(token, self.learn + self.scroll)
        for route in (
            "/assets/bs-learn-sequence.json",
            "/assets/bs-cbt-sequence.json",
            "/assets/bs-mindfulness-sequence.json",
            "/assets/bs-review-sequence.json",
        ):
            self.assertIn(route, self.scroll)
        self.assertNotIn("pushState", self.scroll)

    def test_skill_finder_sidebar_contains_every_tool_and_learn_area(self) -> None:
        tool_pages = sorted((SITE / "tool-finder").glob("*/index.qmd"))
        self.assertGreaterEqual(len(tool_pages), 14)
        for page in tool_pages:
            self.assertIn(f"tool-finder/{page.parent.name}/index.qmd", self.navigation)
        for text in (
            'section: "Goal Setting"',
            'section: "Distress Tolerance"',
            'section: "Mindfulness"',
            'section: "Emotional Regulation"',
            'section: "CBT and Managing Anxiety"',
            'section: "Interpersonal Effectiveness"',
            'section: "Wellness (Actions & Patterns)"',
        ):
            self.assertIn(text, self.navigation)

    def test_save_progress_and_page_tools_have_explicit_collision_guards(self) -> None:
        for token in (
            "body.bs-skill-finder-page .bs-site-tools--floating",
            "body.bs-skill-finder-page:has(.bs-term-lookup--site:not([hidden]))",
            "body.skill-progress-dialog-open .bs-site-tools",
            "body.skill-progress-dialog-open .bs-term-lookup",
            "body.skill-progress-dialog-open .bs-learn-left-sidebar-toggle",
            "pointer-events: none",
        ):
            self.assertIn(token, self.progress_css)
        self.assertRegex(
            self.progress_css,
            r"body\.bs-skill-finder-page \.bs-site-tools--floating \{\s+bottom:",
        )


if __name__ == "__main__":
    unittest.main()

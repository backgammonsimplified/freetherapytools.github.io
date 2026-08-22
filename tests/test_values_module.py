import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data" / "skill-apps" / "values.json"
APP = ROOT / "site" / "assets" / "skill-apps.js"
CSS = ROOT / "site" / "assets" / "skill-apps.css"
LEARN_CSS = ROOT / "site" / "assets" / "bs-learn.css"
LEARN_JS = ROOT / "site" / "assets" / "bs-learn.js"
PAGE = ROOT / "site" / "skill-finder" / "values" / "index.qmd"
GENERATOR = ROOT / "scripts" / "values_workbook.py"

EXPECTED_FIRST_128 = """Acceptance
Authenticity
Balance
Care
Compassion
Connection
Courage
Creativity
Curiosity
Growth
Health
Honesty
Kindness
Love
Purpose
Responsibility
Achievement
Adventure
Autonomy
Commitment
Community
Contribution
Family
Freedom
Friendship
Gratitude
Integrity
Joy
Learning
Mindfulness
Respect
Trust
Accountability
Awareness
Collaboration
Communication
Competence
Discipline
Empathy
Fairness
Flexibility
Forgiveness
Generosity
Hope
Humor
Independence
Justice
Loyalty
Mastery
Meaning
Open-Mindedness
Patience
Peace
Persistence
Playfulness
Reliability
Resilience
Safety
Self-Awareness
Self-Care
Service
Spirituality
Stability
Wisdom
Adaptability
Advocacy
Appreciation
Assertiveness
Attentiveness
Beauty
Benevolence
Boldness
Bravery
Calmness
Candor
Challenge
Charity
Cheerfulness
Clarity
Cleanliness
Common Sense
Consistency
Contentment
Cooperation
Courtesy
Decisiveness
Dedication
Dependability
Determination
Dignity
Effectiveness
Encouragement
Endurance
Energy
Enjoyment
Equality
Ethics
Excellence
Exploration
Expressiveness
Fitness
Focus
Fortitude
Friendliness
Fun
Giving
Grace
Harmony
Hard Work
Improvement
Inclusiveness
Individuality
Insight
Inspiration
Intimacy
Knowledge
Leadership
Moderation
Motivation
Openness
Optimism
Organization
Passion
Presence
Recreation
Reflectiveness
Self-Control
Supportiveness""".splitlines()


class ValuesModuleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA.read_text(encoding="utf-8"))
        cls.javascript = APP.read_text(encoding="utf-8")
        cls.css = CSS.read_text(encoding="utf-8")
        cls.learn_css = LEARN_CSS.read_text(encoding="utf-8")
        cls.learn_javascript = LEARN_JS.read_text(encoding="utf-8")
        cls.page = PAGE.read_text(encoding="utf-8")
        cls.generator = GENERATOR.read_text(encoding="utf-8")

    def test_values_dictionary_is_unique_and_substantial(self):
        values = self.data["values"]
        self.assertEqual(len(values), 256)
        self.assertEqual(len(values), len({value["id"] for value in values}))
        self.assertEqual(len(values), len({value["name"].casefold() for value in values}))
        self.assertTrue(all(value["definition"].strip() for value in values))

    def test_progressive_display_ranks_are_unique_contiguous_and_exact(self):
        ordered = sorted(self.data["values"], key=lambda value: value["display_rank"])
        self.assertEqual([value["display_rank"] for value in ordered], list(range(1, 257)))
        names = [value["name"] for value in ordered]
        self.assertEqual(names[:16], EXPECTED_FIRST_128[:16])
        self.assertEqual(names[:32], EXPECTED_FIRST_128[:32])
        self.assertEqual(names[:64], EXPECTED_FIRST_128[:64])
        self.assertEqual(names[:128], EXPECTED_FIRST_128)
        self.assertEqual(len([value for value in ordered if value["display_rank"] <= 256]), 256)
        self.assertEqual(names[-1], "Perfection")
        self.assertNotIn("Efficiency", names)

    def test_progressive_dictionary_controls_search_and_selection_contract(self):
        self.assertIn("const VALUE_DISPLAY_OPTIONS = [16, 32, 64, 128, 256, \"all\"]", self.javascript)
        self.assertIn("const DEFAULT_VALUE_DISPLAY = 32", self.javascript)
        self.assertIn("let displaySize = DEFAULT_VALUE_DISPLAY", self.javascript)
        self.assertIn("canonicalValuesForDisplay(data.values, displaySize, searchQuery)", self.javascript)
        self.assertIn("const CANONICAL_VALUE_COUNT = 256", self.javascript)
        self.assertIn("Search all ${CANONICAL_VALUE_COUNT} values and definitions", self.javascript)
        self.assertIn("complete ${CANONICAL_VALUE_COUNT}-value dictionary", self.javascript)
        self.assertIn("values-selected-summary", self.javascript)
        self.assertIn("Selected values", self.javascript)
        self.assertIn("Remove ${escapeHtml(value.name)} from selected values", self.javascript)
        self.assertIn("data-values-tier", self.javascript)
        self.assertIn("input:checked + span", self.css)
        self.assertIn('content: "✓"', self.css)
        self.assertIn("input:focus-visible + span", self.css)
        self.assertIn("flex-wrap: wrap", self.css)

    def test_display_tier_is_not_exported_and_later_stages_use_all_selections(self):
        top_keys = re.search(r'const topKeys = \[(.*?)\];', self.javascript, re.DOTALL)
        self.assertIsNotNone(top_keys)
        self.assertNotIn("displaySize", top_keys.group(1))
        selected_values = re.search(r"function selectedValues\(data, state\) \{(.*?)\n  \}", self.javascript, re.DOTALL)
        self.assertIsNotNone(selected_values)
        self.assertIn("allValues(data, state)", selected_values.group(1))
        self.assertNotIn("display_rank", selected_values.group(1))

    def test_nine_required_domains_exist(self):
        self.assertEqual(
            [domain["name"] for domain in self.data["domains"]],
            [
                "Close Relationships, Family & Caregiving",
                "Friendship & Social Connection",
                "Work, Education & Contribution",
                "Health, Self-Care & Vitality",
                "Personal Growth, Character & Autonomy",
                "Leisure, Creativity & Adventure",
                "Community, Service & Environment",
                "Spirituality, Meaning & Inner Life",
                "Home, Resources, Security & Lifestyle",
            ],
        )

    def test_process_custom_values_gap_and_privacy_contract(self):
        self.assertEqual(self.data["process"], ["DISCOVER", "CATEGORIZE", "ASSIGN", "ASSESS", "ACT", "BARRIERS", "MISSION"])
        self.assertIn('["DISCOVER", "CATEGORIZE", "ASSIGN", "ASSESS", "ACT", "BARRIERS", "MISSION"]', self.generator)
        self.assertNotIn('"NARROW"', self.generator)
        self.assertTrue(self.data["custom_values_allowed"])
        self.assertRegex(self.javascript, re.compile(r"Number\(desired\)\s*-\s*Number\(current\)"))
        self.assertIn("Your entries are not saved on our servers", self.javascript)
        self.assertIn("A temporary draft is saved in this browser", self.javascript)
        self.assertIn("Nothing you enter here is uploaded", self.javascript)
        self.assertNotIn("localStorage", self.javascript)
        self.assertNotIn("https://", self.javascript)
        self.assertNotIn("http://", self.javascript)

    def test_discover_title_subtitle_and_explicit_download_contract(self):
        title = "Discover and Work Towards Your Values"
        subtitle = "Discover and create a plan to work towards your values and accumulate long term positive emotions."
        self.assertIn(title, self.javascript)
        self.assertIn(title, self.page)
        self.assertIn(subtitle, self.javascript)
        self.assertIn(subtitle, self.page)
        self.assertNotIn("browserAutosave: false", self.javascript)
        self.assertIn("showFloating: false", self.javascript)
        self.assertIn('finalHeading: "Download your results"', self.javascript)

    def test_discover_cards_are_alphabetical_compact_and_expandable(self):
        self.assertIn("localeCompare", self.javascript)
        self.assertIn('<details class="values-definition"><summary>', self.javascript)
        self.assertIn("View definition", self.javascript)
        self.assertIn("Hide definition", self.javascript)
        self.assertIn("values-select-button", self.javascript)
        self.assertIn("values-custom-row", self.javascript)
        self.assertLess(self.javascript.index('data-value-list'), self.javascript.index('values-custom-row'))
        self.assertIn("minmax(13rem, 1fr)", self.css)
        self.assertIn("grid-template-columns: minmax(0, 1fr) auto", self.css)
        self.assertIn("margin-block: 2rem 0.75rem", self.css)
        self.assertIn("padding-top: 1.75rem", self.css)
        self.assertIn(".values-definition[open] summary::after", self.css)
        self.assertIn("font-size: clamp(1.25rem, 1.5vw, 1.45rem)", self.css)
        self.assertIn("font-size: 0.76rem", self.css)
        self.assertIn("font-size: 0.78rem", self.css)

    def test_importance_buttons_and_clear_selections_replace_old_controls(self):
        self.assertIn('{ label: "H", value: "High" }', self.javascript)
        self.assertIn('{ label: "M", value: "Medium" }', self.javascript)
        self.assertIn('{ label: "L", value: "Low" }', self.javascript)
        self.assertNotIn("[1, 2, 3, 4, 5]", self.javascript)
        self.assertIn("Importance:", self.javascript)
        self.assertIn("data-importance-value", self.javascript)
        self.assertIn("Clear selections", self.javascript)
        self.assertIn("values-discover-title", self.javascript)
        self.assertNotIn("Clear Saved Data", self.javascript)
        self.assertNotIn("Optional importance label", self.javascript)
        self.assertNotRegex(self.javascript, r'<select[^>]+data-rating')

    def test_discover_range_and_partial_progress_guidance(self):
        self.assertIn("10-20 is a useful starting range", self.javascript)
        self.assertNotIn("15-30 is a useful starting range", self.javascript)
        self.assertIn("download partial or completed results", self.javascript)
        self.assertNotIn("If you partly finish the form", self.page)

    def test_categorize_assign_and_domain_assessment_flow(self):
        self.assertIn("function categorizeMarkup", self.javascript)
        self.assertIn("Selecting 2-4 is a useful starting range", self.javascript)
        self.assertNotIn("data-select-all-domains", self.javascript)
        self.assertIn("data-selected-domain", self.javascript)
        self.assertIn("data-domain-importance", self.javascript)
        self.assertIn("domainImportance", self.javascript)
        self.assertIn("Choose H, M, or L for every selected life domain before continuing", self.javascript)
        self.assertIn("const categorizationComplete", self.javascript)
        self.assertIn("state.step === 1 && !categorizationComplete", self.javascript)
        self.assertIn("function assignMarkup", self.javascript)
        self.assertIn("Assign each chosen value", self.javascript)
        self.assertIn("values-assignment-value", self.javascript)
        self.assertIn("Current Score", self.javascript)
        self.assertIn("Desired Score", self.javascript)
        self.assertIn("How much time and effort do you put toward this life domain now?", self.javascript)
        self.assertIn("How much time and effort do you want to put toward this life domain?", self.javascript)
        self.assertNotIn("Importance 1-10", self.javascript)
        self.assertIn("values-domain-assessment-list", self.javascript)
        self.assertIn("selectedDomains", self.javascript)

    def test_narrow_is_removed_and_assessment_explains_resource_balance(self):
        self.assertNotIn('"NARROW"', self.javascript)
        self.assertNotIn("function narrowMarkup", self.javascript)
        self.assertIn("Priority areas receiving less than you want", self.javascript)
        self.assertIn("Areas receiving more than you want", self.javascript)
        self.assertIn("High", self.javascript)
        self.assertIn("Medium", self.javascript)
        self.assertNotIn("desired minus current", self.javascript)

    def test_mission_is_generated_editable_and_links_to_follow_up_tools(self):
        self.assertIn("function generatedMissionStatement", self.javascript)
        self.assertIn("data-mission-statement", self.javascript)
        self.assertIn("Regenerate from my selected values", self.javascript)
        self.assertIn("Where you may want to work on your values", self.javascript)
        self.assertIn("/skill-finder/goal-builder/", self.javascript)
        self.assertIn("/skill-finder/values-review/", self.javascript)
        self.assertNotIn("function reviewMarkup", self.javascript)

    def test_completed_process_steps_are_clickable_for_back_navigation(self):
        self.assertIn('data-values-step="${index}"', self.javascript)
        self.assertIn('index > step ? "disabled" : ""', self.javascript)
        self.assertIn('root.querySelectorAll("[data-values-step]")', self.javascript)
        self.assertIn("target <= state.step", self.javascript)
        self.assertIn('.skill-app[data-skill-app="values"] .skill-app-progress button', self.css)

    def test_assign_value_names_are_larger_than_domain_categories(self):
        self.assertIn("font-size: clamp(1.3rem, 1.8vw, 1.55rem)", self.css)
        self.assertIn(".values-assignment-domain", self.css)
        self.assertIn("font-size: 0.9rem", self.css)

    def test_values_actions_stay_visible_without_covering_content(self):
        self.assertRegex(
            self.css,
            re.compile(
                r'\.skill-app\[data-skill-app="values"\] \.skill-app-footer \{'
                r'[^}]*position: fixed;[^}]*bottom: var\(--values-action-bar-bottom\);[^}]*'
                r'width: var\(--values-action-bar-width\);',
                re.DOTALL,
            ),
        )
        self.assertIn("--values-action-bar-space: 8.5rem", self.css)
        self.assertIn("--values-action-bar-space: 13.5rem", self.css)
        self.assertIn("grid-template-columns: repeat(3, minmax(0, 1fr))", self.css)
        self.assertIn("overflow-y: auto", self.css)
        self.assertIn("background: var(--bs-page-background, #faf7f2)", self.css)
        self.assertIn('document.querySelector(".nav-footer, .page-footer")', self.javascript)
        self.assertIn('root.style.setProperty("--values-action-bar-bottom", `${visibleSiteFooter}px`)', self.javascript)
        self.assertIn('root.style.setProperty("--values-action-bar-left", `${bounds.left}px`)', self.javascript)
        self.assertIn('root.style.setProperty("--values-action-bar-width", `${bounds.width}px`)', self.javascript)
        self.assertIn('gridTemplateColumns.split(/\\s+/)', self.javascript)
        self.assertIn("cards[columns * 2]", self.javascript)
        self.assertIn('root.classList.toggle("values-action-bar-visible", visible)', self.javascript)
        self.assertIn("Collapse bar", self.javascript)
        self.assertIn("Show bottom bar", self.javascript)
        self.assertIn("data-values-action-bar-toggle", self.javascript)
        self.assertIn("values-action-bar-collapsed", self.javascript)
        self.assertIn("atPageBottom && !wasAtPageBottom", self.javascript)
        self.assertIn("--values-action-bar-height", self.css)
        self.assertIn(".values-action-bar-toggle", self.css)

    def test_values_starts_at_app_heading_without_duplicate_page_intro(self):
        self.assertIn('body:has(.skill-app[data-skill-app="values"]) #title-block-header', self.css)
        self.assertIn("showDraftPrompt: false", self.javascript)
        body = self.page.split("---", 2)[-1]
        self.assertTrue(body.lstrip().startswith('::: {.skill-app data-skill-app="values"'))
        self.assertNotIn("Previous browser progress found", body)

    def test_page_tools_are_compact_vertical_and_content_aligned(self):
        self.assertRegex(
            self.learn_css,
            re.compile(
                r'@media \(min-width: 992px\).*?body\.bs-skill-finder-page '
                r'\.bs-site-tools--floating \{'
                r'[^}]*flex-direction: column;[^}]*align-items: flex-end;',
                re.DOTALL,
            ),
        )
        self.assertRegex(
            self.learn_css,
            re.compile(
                r'body\.bs-skill-finder-page\s+\.bs-site-tools--floating\s+'
                r'> \.bs-term-lookup-reveal \{'
                r'[^}]*width: auto;[^}]*padding-inline: 0\.45rem;'
                r'[^}]*white-space: nowrap;',
                re.DOTALL,
            ),
        )
        self.assertIn('document.querySelector(".skill-app-shell")', self.learn_javascript)
        self.assertIn("const preferredLeft = bounds.right + 12", self.learn_javascript)
        self.assertIn('tools.style.right = "auto"', self.learn_javascript)
        self.assertIn('"bs:left-sidebar-change"', self.learn_javascript)

    def test_values_routes_exist(self):
        self.assertTrue((ROOT / "site" / "skill-finder" / "values" / "index.qmd").is_file())
        self.assertTrue((ROOT / "site" / "learn" / "goal-setting" / "values-valued-action.qmd").is_file())


if __name__ == "__main__":
    unittest.main()

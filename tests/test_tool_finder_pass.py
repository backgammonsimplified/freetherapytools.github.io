import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class ToolFinderPassTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogue = json.loads((SITE / "data/tool-finder/catalogue.json").read_text(encoding="utf-8"))
        cls.entries = cls.catalogue["entries"]

    def test_canonical_routes_and_legacy_redirects(self):
        self.assertTrue((SITE / "tool-finder/index.qmd").exists())
        self.assertFalse((SITE / "skill-finder").exists())
        legacy = (SITE / "legacy-dispositions.yml").read_text(encoding="utf-8")
        for page in (SITE / "tool-finder").glob("*/index.qmd"):
            route = f"/tool-finder/{page.parent.name}/"
            self.assertIn(route, {entry.get("tool_href") for entry in self.entries})
            if page.parent.name not in {"stop", "sleep-hygiene", "stages-of-change", "urge-surfing"}:
                self.assertIn(route.replace("/tool-finder/", "/skill-finder/"), legacy)
        self.assertTrue((SITE / "learn/distress-tolerance/stop-crisis-survival.qmd").exists())
        self.assertIn('/learn/cube/stop-crisis-survival.html', legacy)

    def test_static_redirect_pages_include_non_javascript_meta_refresh(self):
        from scripts import bs_post_render
        tool_redirect = bs_post_render.legacy_glossary_redirect_text("/tool-finder/dime-game/", "noindex, follow")
        lesson_redirect = bs_post_render.legacy_glossary_redirect_text("/learn/distress-tolerance/tipp.html", "noindex, follow")
        self.assertIn('http-equiv="refresh"', tool_redirect)
        self.assertIn('/tool-finder/dime-game/', tool_redirect)
        self.assertIn('/learn/distress-tolerance/tipp.html', lesson_redirect)
        writer = (ROOT / "scripts/bs_post_render.py").read_text(encoding="utf-8")
        self.assertIn('source.endswith(".html")', writer)

    def test_no_current_source_links_use_legacy_routes(self):
        offenders = []
        for path in SITE.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in {".qmd", ".js", ".json", ".yml", ".yaml"}:
                continue
            if path.name == "legacy-dispositions.yml" or "_site" in path.parts or ".quarto" in path.parts or path.name == "skill-progress.js":
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if "/skill-finder/" in text or "/learn/cube/" in text:
                offenders.append(str(path.relative_to(ROOT)))
        self.assertEqual(offenders, [])

    def test_home_search_thermometer_and_topics(self):
        home = (SITE / "tool-finder/index.qmd").read_text(encoding="utf-8")
        runtime = (SITE / "assets/tool-finder.js").read_text(encoding="utf-8")
        shared_apps = (SITE / "assets/skill-finder-apps.js").read_text(encoding="utf-8")
        self.assertIn('title: "Tool Finder"', home)
        self.assertIn("data-tool-finder-search", home)
        self.assertIn("data-tool-finder-kind", home)
        self.assertIn('data-skill-app="thermometer"', home)
        self.assertIn("tool-finder-featured-thermometer", home)
        self.assertIn("data-tool-finder-results", home)
        self.assertNotIn('/tool-finder/thermometer/', home)
        self.assertNotIn("data-tool-finder-thermometer", runtime)
        self.assertIn("thermometer.before(results)", runtime)
        self.assertIn("thermometer.after(results)", runtime)
        self.assertIn('getJson("thermometer.json")', shared_apps)
        thermometer = next(entry for entry in self.entries if entry["id"] == "thermometer")
        self.assertTrue(thermometer["featured_on_home"])
        self.assertEqual(self.catalogue["topics"], ["Goal Setting", "Distress Tolerance", "Mindfulness", "Emotional Regulation", "CBT and Managing Anxiety", "Interpersonal Effectiveness", "Wellness (Actions & Patterns)"])

    def test_wise_mind_includes_thought_record(self):
        thermometer = json.loads((SITE / "data/skill-apps/thermometer.json").read_text(encoding="utf-8"))
        wise_mind = next(zone for zone in thermometer["zones"] if zone["id"] == "wise-mind")
        distressed = next(zone for zone in thermometer["zones"] if zone["id"] == "distressed-wise-mind")
        numbness = next(zone for zone in thermometer["zones"] if zone["id"] == "numbness")
        thought_record = next(skill for skill in wise_mind["skills"] if skill["name"] == "Thought Record")
        self.assertEqual(thought_record["href"], "/tool-finder/thought-record/")
        self.assertNotIn("Thought Record", {skill["name"] for skill in distressed["skills"]})
        numbness_names = {skill["name"] for skill in numbness["skills"]}
        self.assertIn("Accumulating Long-Term Positive Emotions (Values)", numbness_names)
        self.assertIn("Accumulating Short-Term Positive Emotions", numbness_names)

    def test_thermometer_has_no_save_panel_and_stable_disclosures(self):
        runtime = (SITE / "assets/skill-finder-apps.js").read_text(encoding="utf-8")
        thermometer_runtime = runtime.split("async function initThermometer", 1)[1].split("async function initEmotionExplorer", 1)[0]
        self.assertNotIn("Progress.registerTool", thermometer_runtime)
        self.assertNotIn("skill-app-footer", thermometer_runtime)
        self.assertIn("const openZones = new Set()", thermometer_runtime)
        self.assertIn("preventScroll: true", thermometer_runtime)
        self.assertIn("result.hidden = !opening", thermometer_runtime)

    def test_pleasant_event_uses_short_term_positive_emotions_label(self):
        page = (SITE / "tool-finder/pleasant-event/index.qmd").read_text(encoding="utf-8")
        runtime = (SITE / "assets/skill-finder-apps.js").read_text(encoding="utf-8")
        entry = next(entry for entry in self.entries if entry["id"] == "pleasant-event")
        self.assertIn("Accumulating Short-Term Positive Emotions", page)
        self.assertIn("Accumulating Short-Term Positive Emotions", runtime)
        self.assertEqual(entry["name"], "Accumulating Short-Term Positive Emotions")
        self.assertEqual(entry["subtopic"], "Pleasant Event Planner")
        self.assertEqual(entry["learn_href"], "/learn/emotion-regulation/abc-please.html#accumulating-short-term-positive-emotions")

    def test_strengths_are_merged_alphabetically_into_goal_guidelines(self):
        guidelines = (SITE / "learn/goal-setting/goal-setting-guidelines.qmd").read_text(encoding="utf-8")
        self.assertFalse((SITE / "learn/goal-setting/strengths.qmd").exists())
        self.assertIn('class="strengths-grid"', guidelines)
        strengths = re.findall(r"<li>([^<]+)</li>", guidelines.split('class="strengths-grid"', 1)[1].split("</ul>", 1)[0])
        self.assertGreater(len(strengths), 1)
        self.assertEqual(strengths, sorted(strengths, key=str.casefold))
        catalogue_entry = next(entry for entry in self.entries if entry["id"] == "strengths-focus")
        self.assertEqual(catalogue_entry["learn_href"], "/learn/goal-setting/goal-setting-guidelines.html#strengths")
        legacy = (SITE / "legacy-dispositions.yml").read_text(encoding="utf-8")
        self.assertIn('/learn/goal-setting/strengths.html', legacy)

    def test_automatic_previous_browser_progress_banner_is_removed_globally(self):
        progress = (SITE / "assets/skill-progress.js").read_text(encoding="utf-8")
        self.assertNotIn("Previous browser progress found", progress)
        self.assertNotIn("data-skill-progress-draft", progress)
        self.assertIn("Browser progress", progress)
        self.assertIn("saveDraftNow", progress)

    def test_required_concepts_are_searchable(self):
        required = ["STOP", "Pros and Cons", "TIPP", "Temperature", "Intense Exercise", "Progressive Muscle Relaxation", "Paced Breathing", "Wise Mind ACCEPTS", "Activities", "Contributing", "Comparisons", "Opposite Emotion", "Pushing Away", "Thoughts", "Sensations", "Self-Soothe", "IMPROVE", "Imagery", "Meaning", "Prayer", "Relaxation", "One Thing in the Moment", "Vacation", "Self-Encouragement", "Radical Acceptance", "Willingness", "Recognizing States of Mind", "Wise Mind", "WHAT Skills", "Observe", "Describe", "Participate", "HOW Skills", "Non-Judgmentally", "One-Mindfully", "Effectively", "Positive Self-Talk", "Grounding", "Mindfulness of Current Emotions", "Emotion Surfing", "ABC PLEASE", "Accumulating Positive Emotions", "Build Mastery", "Cope Ahead", "Treat Physical Illness", "Balanced Eating", "Avoid Mood-Altering Substances", "Balanced Sleep", "Exercise", "Observing and Describing Emotions", "Check the Facts", "Opposite Action", "Problem Solving", "Pleasant Events", "Thought Records", "Facing Fears", "Fear Ladder", "Challenging Negative Thoughts", "Recognizing Thinking Traps", "Worry Time", "Worry Tree", "Box Breathing", "Five Factor Model", "Case Map", "Clarifying Priorities", "DEAR MAN", "GIVE", "FAST", "Boundaries", "Walking the Middle Path", "DIME Game", "Ask / Say No", "Sleep Hygiene", "Behavioural Activation", "Behaviour Chain Analysis", "Gratitude Journaling", "Stages of Change", "Urge Surfing", "Determination", "Medication Adherence"]
        haystack = json.dumps(self.catalogue, ensure_ascii=False).casefold()
        self.assertEqual([term for term in required if term.casefold() not in haystack], [])

    def test_tool_learn_links_and_planned_routes(self):
        for entry in self.entries:
            self.assertRegex(entry["learn_href"], r"^/learn/")
            source = SITE / (entry["learn_href"].split("#", 1)[0].strip("/").replace(".html", ".qmd"))
            if source.is_dir():
                source = source / "index.qmd"
            self.assertTrue(source.exists(), (entry["id"], source))
            if "#" in entry["learn_href"]:
                anchor = entry["learn_href"].split("#", 1)[1]
                self.assertIn(f"{{#{anchor}}}", source.read_text(encoding="utf-8"), (entry["id"], anchor))
            if entry["kind"] == "tool" and entry["status"] == "available":
                self.assertTrue(entry.get("tool_href"))
            if entry["status"] == "planned":
                self.assertFalse(entry.get("tool_href"), entry["id"])

    def test_audio_is_local_and_attributed(self):
        data = json.loads((SITE / "data/audio/recordings.json").read_text(encoding="utf-8"))
        for record in data["recordings"]:
            self.assertTrue(record["source_url"].startswith("http"))
            if record["availability"] == "local":
                self.assertTrue((SITE / record["local_href"].lstrip("/")).exists())
        pages = "\n".join(path.read_text(encoding="utf-8") for path in [SITE / "learn/distress-tolerance/stop-crisis-survival.qmd", SITE / "learn/wellness/urge-surfing.qmd", SITE / "tool-finder/urge-surfing/index.qmd", SITE / "learn/mindfulness/mindfulness-of-emotions.qmd"])
        self.assertIn('data-therapy-audio="sober-space"', pages)
        self.assertIn('data-therapy-audio="emotion-surfing-jason-dean"', pages)
        runtime = (SITE / "assets/therapy-audio.js").read_text(encoding="utf-8")
        self.assertIn("<audio controls preload=", runtime)
        self.assertNotIn("autoplay", runtime)
        self.assertNotRegex(pages, r"<audio[^>]+src=[\"']https?://")
        self.assertNotIn("file:///", pages)

    def test_urge_surfing_image_and_learn_grouping(self):
        image = SITE / "resources/wellness/urge-surfing/urge-surfing-wave.png"
        lesson_path = SITE / "learn/wellness/urge-surfing.qmd"
        tool_path = SITE / "tool-finder/urge-surfing/index.qmd"
        parent_path = SITE / "learn/wellness/maladaptive-coping.qmd"
        lesson = lesson_path.read_text(encoding="utf-8")
        tool = tool_path.read_text(encoding="utf-8")
        parent = parent_path.read_text(encoding="utf-8")
        image_href = "/resources/wellness/urge-surfing/urge-surfing-wave.png"
        self.assertTrue(image.exists())
        self.assertIn(image_href, lesson)
        self.assertIn(image_href, tool)
        self.assertNotIn("<iframe", lesson.casefold())
        self.assertNotIn("<iframe", tool.casefold())
        self.assertIn("therapist-aid-urge-surfing-handout.pdf", lesson)
        self.assertIn("https://www.therapistaid.com/worksheets/urge-surfing-handout", lesson)
        self.assertIn('title: "Facing Urges, Addictions and Maladaptive Coping Behaviours"', parent)
        self.assertIn("learn-parent: wellness/maladaptive-coping", lesson)
        quick = (SITE / "assets/skill-quick-tools.js").read_text(encoding="utf-8")
        for label in ("Trigger", "Rise", "Peak", "Fall", "Minutes since urge started", "Urge intensity"):
            self.assertIn(label, quick)
        self.assertIn("data-add-urge-checkpoint", quick)
        self.assertIn("urgeGraphPoints", quick)
        navigation = (SITE / "_learn-navigation.yml").read_text(encoding="utf-8")
        self.assertRegex(
            navigation,
            r'section: "4\. Facing Urges, Addictions and Maladaptive Coping Behaviours"[\s\S]+contents:[\s\S]+text: "5\. Urge Surfing"',
        )

    def test_mindfulness_audit_complete(self):
        audit = json.loads((SITE / "data/mindfulness-source-audit.json").read_text(encoding="utf-8"))
        self.assertEqual(audit["scope"], {"first_page": 63, "last_page": 132, "identified_pages": 70, "mapped_pages": 63, "excluded_pages": 7})
        self.assertEqual([row["source_page"] for row in audit["records"]], list(range(63, 133)))
        for row in audit["records"]:
            if row["excluded"]:
                self.assertTrue(row["exclusion_reason"])
            else:
                self.assertTrue(row["pdf_linked"] and row["adapted_text_present"])

    def test_dime_and_five_factor_flags(self):
        guided = (SITE / "assets/skill-finder-apps.js").read_text(encoding="utf-8")
        quick = (SITE / "assets/skill-quick-tools.js").read_text(encoding="utf-8")
        self.assertIn('this.flow.id === "dime-game" ? ""', guided)
        self.assertIn("is-dime-complete", guided)
        self.assertIn("data-dime-edit", guided)
        self.assertIn("showDraftPrompt: false, showOpenPreviousProgress: false", quick)


if __name__ == "__main__":
    unittest.main()

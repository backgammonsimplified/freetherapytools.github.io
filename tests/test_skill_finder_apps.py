import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DATA = SITE / "data" / "skill-apps"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


class SkillFinderAppTests(unittest.TestCase):
    def test_skill_finder_sidebar_uses_shared_scroll_and_arrow_controls(self):
        javascript = (SITE / "assets" / "bs-learn.js").read_text(encoding="utf-8")
        self.assertIn("const skillFinderPage = isToolFinderPage()", javascript)
        self.assertNotIn("isSkillFinderPage", javascript)
        self.assertIn('"Show Tool Finder navigation"', javascript)
        self.assertIn('"Hide Tool Finder navigation"', javascript)
        self.assertIn('"\\u2192 Show navigation"', javascript)
        self.assertIn("let collapsed = false", javascript)
        self.assertIn("const active = desktopQuery.matches && collapsed", javascript)
        self.assertNotIn("manuallyCollapsed", javascript)
        self.assertNotIn("autoHidden", javascript)
        self.assertIn("autoCollapsePending = true", javascript)
        self.assertIn("pageScrollingDown = currentScrollY > lastScrollY", javascript)
        self.assertIn('toggle.style.left = "0.5rem"', javascript)
        self.assertIn('backToTop.hidden = window.scrollY <= window.innerHeight', javascript)
        self.assertIn('window.dispatchEvent(new CustomEvent("bs:left-sidebar-change"))', javascript)

    def test_every_skill_finder_page_uses_the_shared_sidebar(self):
        pages = sorted((SITE / "tool-finder").rglob("index.qmd"))
        self.assertEqual(len(pages), 29)
        for page in pages:
            self.assertIn("sidebar: tool-finder", page.read_text(encoding="utf-8"), page)

        navigation = (SITE / "_learn-navigation.yml").read_text(encoding="utf-8")
        self.assertIn("    - id: tool-finder", navigation)
        for heading in ("Goal Setting", "Distress Tolerance", "Mindfulness", "Emotional Regulation", "CBT and Managing Anxiety", "Interpersonal Effectiveness", "Wellness (Actions & Patterns)"):
            self.assertIn(f'        - section: "{heading}"', navigation)
        for route in (
            "values", "thermometer", "emotions", "case-map", "change-emotion", "worry-tree",
            "pleasant-event", "behaviour-chain", "missing-links", "exposure",
            "dear-man", "ask-or-say-no", "goal-builder", "behavioural-activation", "values-review",
            "five-factor-model", "thinking-traps", "thought-record", "worry-time",
            "box-breathing", "gratitude-journal", "positive-self-talk", "grounding", "dime-game",
            "stop", "sleep-hygiene", "stages-of-change", "urge-surfing",
        ):
            self.assertIn(f"tool-finder/{route}/index.qmd", navigation)

    def test_flagship_routes_and_assets_exist(self):
        routes = ["values", "thermometer", "emotions", "change-emotion", "worry-tree", "pleasant-event"]
        for route in routes:
            page = SITE / "tool-finder" / route / "index.qmd"
            self.assertTrue(page.is_file(), route)
            self.assertIn("data-skill-app", page.read_text(encoding="utf-8"), route)
        self.assertTrue((SITE / "assets" / "skill-finder-apps.js").is_file())

    def test_flow_definitions_are_complete_and_reachable(self):
        for filename in ("worry-tree.json", "change-emotion.json", "missing-links.json", "dime-game.json"):
            flow = load(f"flows/{filename}")
            nodes = {node["id"]: node for node in flow["nodes"]}
            self.assertEqual(len(nodes), len(flow["nodes"]), filename)
            self.assertIn(flow["start"], nodes)
            targets = set()
            for node in nodes.values():
                if node.get("next"):
                    targets.add(node["next"])
                targets.update(choice["next"] for choice in node.get("choices", []) if choice.get("next"))
            self.assertFalse(targets - nodes.keys(), f"missing flow targets in {filename}")
            reachable = {flow["start"]}
            while True:
                discovered = set(reachable)
                for node_id in reachable:
                    node = nodes[node_id]
                    if node.get("next"):
                        discovered.add(node["next"])
                    discovered.update(choice["next"] for choice in node.get("choices", []) if choice.get("next"))
                if discovered == reachable:
                    break
                reachable = discovered
            self.assertEqual(set(nodes), reachable, filename)
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8") + "\n" + "\n".join(
            path.read_text(encoding="utf-8") for path in (DATA / "flows").glob("*.json")
        )
        for token in ("information", "question", "choice", "yesno", "rating", "text", "result", "Back", "Restart"):
            self.assertIn(token, source)

    def test_thermometer_and_emotion_data(self):
        thermometer = load("thermometer.json")
        self.assertEqual([zone["id"] for zone in thermometer["zones"]], ["overload", "distressed-wise-mind", "wise-mind", "numbness"])
        self.assertTrue(all(zone["skills"] for zone in thermometer["zones"]))
        self.assertTrue(all(all(skill.get(key) for key in ("category", "summary", "best_for", "description", "href", "provenance")) for zone in thermometer["zones"] for skill in zone["skills"]))
        self.assertTrue(all(skill["provenance"] in {"source-guideline", "therapy-skill-kit"} for zone in thermometer["zones"] for skill in zone["skills"]))
        names = {skill["name"] for zone in thermometer["zones"] for skill in zone["skills"]}
        for name in ("Recognizing Thinking Traps", "Worry Time", "Box Breathing", "Gratitude Journal", "Positive Self-Talk", "Grounding", "Behavioural Activation", "Five Factor Model", "Thought Record"):
            self.assertIn(name, names)
        emotions = load("emotions.json")["emotions"]
        self.assertEqual([item["name"] for item in emotions], ["Anger", "Disgust", "Envy", "Fear", "Happiness", "Jealousy", "Love", "Sadness", "Shame", "Guilt"])
        self.assertTrue(all(item["related_words"] and item["body_changes"] and item["source_reference"] and item["definition"] and item["color"] and item["learn_route"] and item["fit_facts"] for item in emotions))
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        for token in ("skill-thermometer-recommendations", "skill-thermometer-skill-grid", "aria-expanded", "Best for:", 'target="_blank"', "Broader Therapy Skill Kit curriculum"):
            self.assertIn(token, source)
        self.assertIn("Choose the emotional state of mind that feels closest right now to find a skill or tool to try.", source)
        self.assertNotIn('toolId: "thermometer"', source)
        self.assertIn("const openZones = new Set()", source)
        self.assertIn('button.focus({ preventScroll: true })', source)
        self.assertIn('result.hidden = !opening', source)
        self.assertNotIn('tabindex="-1"', source.split("async function initThermometer", 1)[1].split("async function initEmotionExplorer", 1)[0])
        for token in ("skill-thermometer-zone--overload", "skill-thermometer-zone--distressed-wise-mind", "skill-thermometer-zone--wise-mind", "skill-thermometer-zone--numbness"):
            self.assertIn(token, css)
        for token in ("createForceViewport", "emotion-force-map", "emotion-node-toggle-badge", "emotion-selected-words", "Explore this emotion", "Full screen", "change-emotion-handoff"):
            self.assertIn(token, source)
        self.assertNotIn("?emotion=", source)

    def test_ten_source_backed_emotion_pages_exist(self):
        emotions = load("emotions.json")["emotions"]
        self.assertEqual(10, len(emotions))
        for emotion in emotions:
            page = SITE / "learn" / "emotion-regulation" / "emotions" / f"{emotion['id']}.qmd"
            self.assertTrue(page.is_file(), page)
            text = page.read_text(encoding="utf-8")
            for heading in ("Words describing", "Prompting events and interpretations", "Body changes, expressions, and action urges", "Aftereffects", "When", "Check the Facts"):
                self.assertIn(heading, text, page)
            self.assertIn("/tool-finder/emotions/", text)
            self.assertIn("/tool-finder/change-emotion/", text)
            self.assertIn("emotion-regulation-handout-6", text)

    def test_change_emotion_uses_handout_9_tree_and_local_check_facts_editor(self):
        flow = load("flows/change-emotion.json")
        nodes = {node["id"]: node for node in flow["nodes"]}
        self.assertEqual({choice["next"] for choice in nodes["fits-facts"]["choices"]}, {"effective-fit", "effective-no-fit"})
        self.assertEqual({"mindful-act-problem-solve", "opposite-action-fit", "change-thoughts-opposite", "mindful-act-reconsider"}, {node["id"] for node in flow["nodes"] if node["type"] == "result"})
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        for token in ("class ConstrainedTreeEngine", "skill-guided-history", "facts-event", "facts-interpretations", "facts-threat", "facts-catastrophe", "Examples of Emotions That Fit the Facts", "data-tree-revisit", "removed.forEach"):
            self.assertIn(token, source)
        handout_page = SITE / "learn" / "emotion-regulation" / "examples-emotions-fit-facts.qmd"
        self.assertTrue(handout_page.is_file())
        self.assertIn('target="_blank"', handout_page.read_text(encoding="utf-8"))

    def test_worry_tree_and_missing_links_use_shared_constrained_tree(self):
        worry = load("flows/worry-tree.json")
        missing = load("flows/missing-links.json")
        self.assertEqual({"action", "acknowledge"}, {choice["next"] for choice in next(node for node in worry["nodes"] if node["id"] == "actionable")["choices"]})
        self.assertTrue(any(node.get("editor") == "calendar" for node in worry["nodes"]))
        self.assertTrue(any(node.get("calendar", {}).get("label") == "Schedule worry time (optional)" for node in worry["nodes"]))
        self.assertEqual(["knew", "willing", "thought", "immediate-block"], [node["id"] for node in missing["nodes"] if node["id"] in {"knew", "willing", "thought", "immediate-block"}])
        missing_nodes = {node["id"]: node for node in missing["nodes"]}
        self.assertEqual({"willing", "knowing-block"}, {choice["next"] for choice in missing_nodes["knew"]["choices"]})
        self.assertEqual({"thought", "willing-block"}, {choice["next"] for choice in missing_nodes["willing"]["choices"]})
        self.assertEqual({"immediate-block", "thought-solution"}, {choice["next"] for choice in missing_nodes["thought"]["choices"]})
        self.assertEqual("text", missing_nodes["immediate-block"]["control"], "source question 4 is a direct follow-up, not an invented yes/no")
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        for token in ('"worry-tree": (root) => initConstrainedFlow', '"missing-links": (root) => initConstrainedFlow', "mountCalendar", "data-tree-text", "data-tree-calendar"):
            self.assertIn(token, source)

    def test_tree_workspaces_use_guided_vertical_history_and_optional_roadmap(self):
        css = (SITE / "assets" / "skill-apps.css").read_text(encoding="utf-8")
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        for token in (".skill-guided-history", ".skill-guided-step.is-current", ".skill-guided-layout.is-roadmap-hidden", "grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem)"):
            self.assertIn(token, css)
        for token in ("Completed", "Change this answer", "Hide roadmap", "Show roadmap", "removed.forEach", "data-tree-text"):
            self.assertIn(token, source)
        self.assertIn('target="_blank" rel="noopener"', source)

    def test_pleasant_events_keep_full_source_library_and_calendar(self):
        data = load("pleasant-events.json")
        self.assertEqual(225, len(data["events"]))
        self.assertGreaterEqual(len(data["categories"]), 6)
        self.assertGreaterEqual(len(data["activation_suggestions"]), 20)
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        for token in ("pleasant-event-grid", "Custom activity", "TherapyCalendar", "allowRecurrence: true", "What I can do now", "Things I know worked in the past", "Things I want to try", "data-add-list", "data-remove-item"):
            self.assertIn(token, source)

    def test_case_map_route_uses_source_backed_model(self):
        case_page = (SITE / "tool-finder" / "case-map" / "index.qmd").read_text(encoding="utf-8")
        quick_tools = (SITE / "assets" / "skill-quick-tools.js").read_text(encoding="utf-8")
        for field in ("Behaviours", "Body and physical concerns", "Thoughts", "Emotions", "Environmental stressors", "Strengths and resources"):
            self.assertIn(field, quick_tools)
        self.assertIn('data-quick-app="case-map"', case_page)

    def test_pleasant_events_and_privacy(self):
        events = load("pleasant-events.json")["events"]
        self.assertEqual(len(events), 225)
        self.assertEqual([item["id"] for item in events], list(range(1, 226)))
        self.assertTrue(all(item["title"].strip() for item in events))
        combined = "\n".join((SITE / "assets" / name).read_text(encoding="utf-8") for name in ("skill-apps.js", "skill-finder-apps.js"))
        self.assertNotRegex(combined, r"https?://")
        self.assertNotIn("XMLHttpRequest", combined)
        self.assertIn('credentials: "same-origin"', combined)
        self.assertIn("Your progress stays on this device", combined)
        self.assertIn("Nothing you enter here is uploaded", combined)

    def test_all_app_deep_links_resolve_to_source_routes_and_anchors(self):
        files = [SITE / "assets" / "skill-finder-apps.js", DATA / "thermometer.json"] + list((DATA / "flows").glob("*.json"))
        hrefs = set()
        for file in files:
            hrefs.update(re.findall(r'"href"\s*:\s*"([^"?]+)', file.read_text(encoding="utf-8")))
        for href in hrefs:
            path, fragment = urlsplit(href).path, urlsplit(href).fragment
            self.assertTrue(path.startswith("/"), href)
            relative = path.strip("/")
            if not relative:
                continue
            if relative.startswith("resources/"):
                source = SITE / relative
            elif relative.endswith(".html"):
                source = SITE / (relative[:-5] + ".qmd")
            else:
                source = SITE / relative / "index.qmd"
            self.assertTrue(source.is_file(), href)
            if fragment:
                text = source.read_text(encoding="utf-8")
                self.assertRegex(text, rf"\{{#{re.escape(fragment)}\}}|id=[\"']{re.escape(fragment)}[\"']", href)


if __name__ == "__main__":
    unittest.main()

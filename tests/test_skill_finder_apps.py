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
    def test_flagship_routes_and_assets_exist(self):
        routes = ["values", "thermometer", "emotions", "change-emotion", "worry-tree", "pleasant-event"]
        for route in routes:
            page = SITE / "skill-finder" / route / "index.qmd"
            self.assertTrue(page.is_file(), route)
            self.assertIn("data-skill-app", page.read_text(encoding="utf-8"), route)
        self.assertTrue((SITE / "assets" / "skill-finder-apps.js").is_file())

    def test_flow_definitions_are_complete_and_reachable(self):
        for filename in ("worry-tree.json", "change-emotion.json"):
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
        emotions = load("emotions.json")["emotions"]
        self.assertEqual([item["name"] for item in emotions], ["Anger", "Disgust", "Envy", "Fear", "Happiness", "Jealousy", "Love", "Sadness", "Shame", "Guilt"])
        self.assertTrue(all(item["related_words"] and item["body_changes"] and item["source_reference"] for item in emotions))
        source = (SITE / "assets" / "skill-finder-apps.js").read_text(encoding="utf-8")
        self.assertIn("Clickable body region map", source)
        self.assertIn("Body region checklist", source)
        self.assertIn("Accessible emotion list", source)

    def test_pleasant_events_and_privacy(self):
        events = load("pleasant-events.json")["events"]
        self.assertEqual(len(events), 225)
        self.assertEqual([item["id"] for item in events], list(range(1, 226)))
        self.assertTrue(all(item["title"].strip() for item in events))
        combined = "\n".join((SITE / "assets" / name).read_text(encoding="utf-8") for name in ("skill-apps.js", "skill-finder-apps.js"))
        self.assertNotRegex(combined, r"https?://")
        self.assertNotIn("XMLHttpRequest", combined)
        self.assertIn('credentials: "same-origin"', combined)
        self.assertIn("Saved only in this browser", combined)
        self.assertIn("Clear Saved Data", combined)

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
            if relative.endswith(".html"):
                source = SITE / (relative[:-5] + ".qmd")
            else:
                source = SITE / relative / "index.qmd"
            self.assertTrue(source.is_file(), href)
            if fragment:
                text = source.read_text(encoding="utf-8")
                self.assertRegex(text, rf"\{{#{re.escape(fragment)}\}}|id=[\"']{re.escape(fragment)}[\"']", href)


if __name__ == "__main__":
    unittest.main()

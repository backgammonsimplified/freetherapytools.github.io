import re
import unittest
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
LESSON = SITE / "learn/cbt-anxiety/safety-behaviours-exposure.qmd"

class CbtWeek6Tests(unittest.TestCase):
    def test_authored_sequence(self):
        text = LESSON.read_text(encoding="utf-8")
        ids = re.findall(r"^## .*?\{#([^}]+)\}", text, re.M)
        self.assertEqual(ids[:13], ["safety-behaviours", "why-safety-behaviours", "safety-behaviour-or-coping", "safety-behaviour-checklist", "avoidance-and-approach", "situational-exposure", "practice-ideas", "fear-ladder", "behavioural-experiments", "review-practice", "bringing-the-skills-together", "videos", "handouts-worksheets"])
        for word in ["WHAT DID I DO?", "HOW DID I FEEL?", "GOAL / VICTORY", "thinking process", "self-fulfilling", "headphones", "perfectionistic", "consent", "conceptual"]:
            self.assertIn(word.lower(), text.lower())
        self.assertNotRegex(text.lower(), r"\btax\b|\bpaperwork\b")

    def test_sources_diagram_and_videos(self):
        text = LESSON.read_text(encoding="utf-8")
        for p in ["047", "049", "051", "052"]:
            native = re.search(rf"<!-- native-resource-content:cbt-skills-p{p}:start -->(.*?)<!-- native-resource-content:cbt-skills-p{p}:end -->", text, re.S).group(1)
            self.assertIn("Native Version", native)
            self.assertIn("integrated into the lesson above", native)
            self.assertLess(len(native), 200)
            self.assertIn(f"/resources/cbt-skills/cbt-skills-p{p}.jpg", text)
        svg = SITE / "assets/cbt/anxiety-over-time.svg"
        root = ET.parse(svg).getroot()
        self.assertIn("aria-labelledby", root.attrib)
        self.assertIn("Two conceptual panels", svg.read_text(encoding="utf-8"))
        self.assertIn('alt="Two conceptual panels', text)
        for video in ["2z-ZGt_vD5A", "qzpoO0oVRr8", "n2rKVj75P3M", "TYQ2qWgVJrY"]:
            self.assertRegex(text, rf'<iframe[^>]+youtube-nocookie.com/embed/{video}[^>]+title="[^"]+"[^>]+loading="lazy"')
            self.assertIn(f"https://www.youtube.com/watch?v={video}", text)
        self.assertNotIn("autoplay", text)

    def test_catalogue_routes_and_learn_links(self):
        entries = json.loads((SITE / "data/tool-finder/catalogue.json").read_text())["entries"]
        text = LESSON.read_text(encoding="utf-8")
        for tool in ["avoidance", "safety-behaviours", "exposure"]:
            entry = next(e for e in entries if e["id"] == tool)
            self.assertEqual(entry["tool_href"], f"/tool-finder/{tool}/")
            self.assertEqual(entry["official_topic"], "CBT and Managing Anxiety")
            self.assertTrue((SITE / f"tool-finder/{tool}/index.qmd").is_file())
            self.assertIn(entry["tool_href"], text)
            self.assertIn("{#" + entry["learn_href"].split("#")[1] + "}", text)
        self.assertEqual(sum(e.get("tool_href") == "/tool-finder/exposure/" for e in entries), 1)

    def test_original_downloads(self):
        attributes = (ROOT / ".gitattributes").read_text(encoding="utf-8")
        for ext in ["pdf", "docx"]:
            self.assertIn(f"site/resources/free-therapy-tools/cbt/*.{ext} binary", attributes)
        stem = SITE / "resources/free-therapy-tools/cbt/avoidance-and-approach-planner"
        with zipfile.ZipFile(stem.with_suffix(".docx")) as archive:
            self.assertIsNone(archive.testzip())
            for name in archive.namelist():
                if name.endswith((".xml", ".rels")): ET.fromstring(archive.read(name))
            xml = archive.read("word/document.xml").decode()
            self.assertIn("What does avoidance cost over time?", xml)
            self.assertIn("What did I do?", xml)
            self.assertEqual(xml.count('w:type="page"'), 2)
            self.assertNotIn("<w:drawing", xml)
        pdf = stem.with_suffix(".pdf").read_bytes()
        self.assertTrue(pdf.startswith(b"%PDF-"))
        self.assertIn(b"/Count 3", pdf)
        self.assertIn(b"Original Free Therapy Tools practice sheet", pdf)
        for ext in ["pdf", "docx"]:
            self.assertIn(f"avoidance-and-approach-planner.{ext}", (SITE / "tool-finder/avoidance/index.qmd").read_text())

    def test_box_progress_exception(self):
        js = (SITE / "assets/skill-quick-tools.js").read_text(encoding="utf-8")
        box = js.split("function initBoxBreathing(root)")[1].split("function initGratitude")[0]
        self.assertNotIn("register(root", box)
        for label in ["Inhale", "Hold after inhale", "Exhale", "Hold after exhale", "Start", "Pause", "Reset"]:
            self.assertIn(label, box)
        qmd = (SITE / "tool-finder/box-breathing/index.qmd").read_text()
        self.assertIn("grid-template-columns: minmax(0, 1fr)", qmd)

if __name__ == "__main__":
    unittest.main()

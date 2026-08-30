from __future__ import annotations

import unittest
from pathlib import Path

import yaml

from scripts import learn_glossary


ROOT = Path(__file__).resolve().parents[1]
LEARN_ROOT = ROOT / "site" / "learn"


class TherapyCurriculumTests(unittest.TestCase):
    def test_tracks_and_section_sequences_are_contiguous(self) -> None:
        tracks = learn_glossary.discover_tracks()
        lessons = learn_glossary.discover_lessons()
        curriculum = learn_glossary.build_curriculum(tracks, lessons)

        self.assertEqual(
            [track["title"] for track in curriculum],
            [
                "Goal Setting & Tracking",
                "Distress Tolerance",
                "Interpersonal Effectiveness",
                "Wellness",
                "Emotion Regulation",
                "Mindfulness",
                "CBT Skills",
            ],
        )
        self.assertEqual(len(lessons), 59)
        expected_counts = {"dbt": 41, "cbt": 6, "mindfulness": 12}
        for section_id, expected_count in expected_counts.items():
            section = learn_glossary.curriculum_for_section(curriculum, section_id)
            sequence = learn_glossary.build_learn_sequence(section)
            self.assertEqual(len(sequence["lessons"]), expected_count)
            self.assertEqual(
                [lesson["sequence_index"] for lesson in sequence["lessons"]],
                list(range(expected_count)),
            )
        dbt_sequence = learn_glossary.build_learn_sequence(
            learn_glossary.curriculum_for_section(curriculum, "dbt")
        )
        self.assertTrue(
            any(lesson["next_starts_new_track"] for lesson in dbt_sequence["lessons"])
        )

    def test_multipart_skill_anchors_are_authored_as_visible_headings(self) -> None:
        expected = {
            "distress-tolerance/tipp.qmd": [
                "temperature",
                "intense-exercise",
                "progressive-muscle-relaxation",
                "paced-breathing",
            ],
            "distress-tolerance/self-soothe.qmd": [
                "activities",
                "contributing",
                "comparisons",
                "opposite-emotion",
                "pushing-away",
                "thoughts",
                "sensations",
                "vision",
                "hearing",
                "taste",
                "smell",
                "touch",
            ],
            "distress-tolerance/improve.qmd": [
                "imagery",
                "meaning",
                "prayer",
                "relaxation",
                "one-thing-in-the-moment",
                "vacation",
                "self-encouragement",
            ],
            "distress-tolerance/radical-acceptance.qmd": [
                "turning-the-mind",
                "willingness",
                "willing-hands",
                "half-smiling",
            ],
            "interpersonal-effectiveness/dear-man.qmd": [
                "describe",
                "express",
                "assert",
                "reinforce",
                "mindful",
                "appear-confident",
                "negotiate",
            ],
            "interpersonal-effectiveness/give.qmd": [
                "gentle",
                "interested",
                "validate",
                "easy-manner",
            ],
            "interpersonal-effectiveness/fast.qmd": [
                "fair",
                "no-unnecessary-apologies",
                "stick-to-values",
                "truthful",
            ],
            "emotion-regulation/abc-please.qmd": [
                "accumulating-positive-emotions",
                "build-mastery",
                "cope-ahead",
                "treat-physical-illness",
                "balanced-eating",
                "avoid-mood-altering-substances",
                "balanced-sleep",
                "exercise",
            ],
            "mindfulness/what-skills.qmd": ["observe"],
            "mindfulness/describe.qmd": ["describe"],
            "mindfulness/participate.qmd": ["participate"],
            "mindfulness/how-skills.qmd": ["non-judgmentally"],
            "mindfulness/one-mindfully.qmd": ["one-mindfully"],
            "mindfulness/effectively.qmd": ["effectively"],
        }
        for relative, anchors in expected.items():
            source = (LEARN_ROOT / relative).read_text(encoding="utf-8")
            for anchor in anchors:
                self.assertIn(f"{{#{anchor}}}", source)
                self.assertNotIn(f'<span id="{anchor}"', source)

    def test_generated_navigation_and_sequence_match_sources(self) -> None:
        learn_glossary.validate_generated()
        navigation = (ROOT / "site" / "_learn-navigation.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn('section: "Distress Tolerance"', navigation)
        self.assertIn('text: "2. TIPP"', navigation)
        self.assertIn('id: cbt', navigation)
        self.assertIn('id: mindfulness', navigation)
        expected = {
            "bs-learn-sequence.json": 41,
            "bs-cbt-sequence.json": 6,
            "bs-mindfulness-sequence.json": 12,
        }
        for filename, count in expected.items():
            sequence = yaml.safe_load(
                (ROOT / "site" / "assets" / filename).read_text(encoding="utf-8")
            )
            self.assertEqual(len(sequence["lessons"]), count)

    def test_cbt_index_uses_source_objectives_and_exact_lesson_order(self) -> None:
        source = (ROOT / "site" / "cbt-skills" / "index.qmd").read_text(
            encoding="utf-8"
        )
        for objective in (
            "Learn to identify and change unhelpful thought patterns.",
            "Take control of interpretations when managing situations in your environment.",
            "Develop an action plan to manage unhelpful thought patterns.",
        ):
            self.assertIn(objective, source)
        sequence = yaml.safe_load(
            (ROOT / "site" / "assets" / "bs-cbt-sequence.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(
            [lesson["title"] for lesson in sequence["lessons"]],
            [
                "Introduction to CBT",
                "Thinking Traps",
                "Thought Records Part 1",
                "Thought Records Part 2",
                "Understanding Worry",
                "Safety Behaviours & Exposure",
            ],
        )

    def test_primary_navigation_matches_therapy_sections(self) -> None:
        config = yaml.safe_load((ROOT / "site" / "_quarto.yml").read_text(encoding="utf-8"))
        left = config["website"]["navbar"]["left"]
        self.assertEqual(
            [item["text"] for item in left],
            ["Tool Finder", "DBT Skills", "CBT Skills", "Mindfulness"],
        )
        self.assertEqual(
            [item["text"] for item in config["website"]["navbar"]["right"]],
            ["Glossary", "About"],
        )


if __name__ == "__main__":
    unittest.main()

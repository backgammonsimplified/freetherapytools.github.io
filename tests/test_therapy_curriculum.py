from __future__ import annotations

import unittest
from pathlib import Path

import yaml

from scripts import learn_glossary


ROOT = Path(__file__).resolve().parents[1]
LEARN_ROOT = ROOT / "site" / "learn"


class TherapyCurriculumTests(unittest.TestCase):
    def test_tracks_and_sequences_are_contiguous(self) -> None:
        tracks = learn_glossary.discover_tracks()
        lessons = learn_glossary.discover_lessons()
        curriculum = learn_glossary.build_curriculum(tracks, lessons)
        sequence = learn_glossary.build_learn_sequence(curriculum)

        self.assertEqual(
            [track["title"] for track in curriculum],
            [
                "Daily Goal Setting and Tracking",
                "Distress Tolerance",
                "Interpersonal Effectiveness",
                "Wellness",
                "Emotion Regulation",
                "Mindfulness",
                "CBT and Managing Anxiety",
                "Other Skills / Resources",
            ],
        )
        self.assertEqual(len(lessons), 56)
        self.assertEqual(
            [lesson["sequence_index"] for lesson in sequence["lessons"]],
            list(range(56)),
        )
        self.assertTrue(
            any(lesson["next_starts_new_track"] for lesson in sequence["lessons"])
        )

    def test_multipart_skill_anchors_are_authored_as_visible_headings(self) -> None:
        expected = {
            "cube/tipp.qmd": [
                "temperature",
                "intense-exercise",
                "progressive-muscle-relaxation",
                "paced-breathing",
            ],
            "cube/accepts.qmd": [
                "activities",
                "contributing",
                "comparisons",
                "opposite-emotion",
                "pushing-away",
                "thoughts",
                "sensations",
            ],
            "cube/improve.qmd": [
                "imagery",
                "meaning",
                "prayer",
                "relaxation",
                "one-thing-in-the-moment",
                "vacation",
                "self-encouragement",
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
            "mindfulness/what-skills.qmd": ["observe", "describe", "participate"],
            "mindfulness/how-skills.qmd": [
                "non-judgmentally",
                "one-mindfully",
                "effectively",
            ],
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
        sequence = yaml.safe_load(
            (ROOT / "site" / "assets" / "bs-learn-sequence.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(len(sequence["lessons"]), 56)


if __name__ == "__main__":
    unittest.main()

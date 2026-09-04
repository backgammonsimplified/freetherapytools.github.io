from __future__ import annotations

import json
import unittest

from scripts import learn_glossary


class LearnGlossaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tracks = learn_glossary.discover_tracks()
        cls.lessons = learn_glossary.discover_lessons()
        cls.curriculum = learn_glossary.build_curriculum(cls.tracks, cls.lessons)

    def test_current_therapy_tracks_are_the_only_curriculum_tracks(self) -> None:
        self.assertEqual(
            [track["id"] for track in self.tracks],
            [
                "goal-setting",
                "distress-tolerance",
                "interpersonal-effectiveness",
                "wellness",
                "emotion-regulation",
                "mindfulness",
                "cbt-anxiety",
            ],
        )

    def test_lessons_have_valid_topic_metadata(self) -> None:
        for lesson in self.lessons:
            self.assertTrue(lesson["tags"])
            self.assertLessEqual(set(lesson["tags"]), set(learn_glossary.TRACKS))

    def test_distress_tolerance_sequence_is_metadata_driven(self) -> None:
        lessons = learn_glossary.discover_cube_lessons()
        self.assertEqual(lessons[0]["relative_path"], "stop-crisis-survival.qmd")
        self.assertEqual(
            [lesson["cube-order"] for lesson in lessons],
            list(range(1, len(lessons) + 1)),
        )

    def test_generated_sequences_match_curriculum(self) -> None:
        paths = {
            "dbt": learn_glossary.GENERATED_LEARN_SEQUENCE_PATH,
            "cbt": learn_glossary.GENERATED_CBT_SEQUENCE_PATH,
            "mindfulness": learn_glossary.GENERATED_MINDFULNESS_SEQUENCE_PATH,
        }
        for section_id, path in paths.items():
            expected = learn_glossary.build_learn_sequence(
                learn_glossary.curriculum_for_section(self.curriculum, section_id)
            )
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), expected)

    def test_every_sequence_route_is_unique_and_chained(self) -> None:
        sequence = learn_glossary.build_learn_sequence(self.curriculum)
        routes = [lesson["route"] for lesson in sequence["lessons"]]
        self.assertEqual(len(routes), len(set(routes)))
        for index, lesson in enumerate(sequence["lessons"]):
            previous = routes[index - 1] if index else None
            following = routes[index + 1] if index + 1 < len(routes) else None
            self.assertEqual(lesson["previous_route"], previous)
            self.assertEqual(lesson["next_route"], following)

    def test_glossary_contains_only_current_therapy_terms(self) -> None:
        source = json.loads(learn_glossary.PUBLIC_DATA_PATH.read_text(encoding="utf-8"))
        entries = learn_glossary.validate_public_data(source)
        self.assertEqual([entry["slug"] for entry in entries], ["wise-mind"])
        self.assertEqual(entries[0]["categories"], ["Mindfulness"])

    def test_glossary_lookup_is_current_and_public_safe(self) -> None:
        lookup = json.loads(
            learn_glossary.GENERATED_LOOKUP_DATA_PATH.read_text(encoding="utf-8")
        )
        self.assertEqual([entry["slug"] for entry in lookup["entries"]], ["wise-mind"])
        serialized = json.dumps(lookup)
        for forbidden in learn_glossary.FORBIDDEN_KEYS:
            self.assertNotIn(forbidden, serialized)

    def test_generated_catalogues_cover_every_lesson(self) -> None:
        generated = (
            learn_glossary.GENERATED_LESSON_CATALOGUE_PATH.read_text(encoding="utf-8")
            + learn_glossary.GENERATED_CBT_CATALOGUE_PATH.read_text(encoding="utf-8")
            + learn_glossary.GENERATED_MINDFULNESS_CATALOGUE_PATH.read_text(encoding="utf-8")
        )
        self.assertEqual(generated.count("data-bs-learn-item"), len(self.lessons))
        self.assertNotIn("Checker Play", generated)
        self.assertNotIn("doubling-cube", generated)

    def test_generated_navigation_has_all_three_learning_surfaces(self) -> None:
        navigation = learn_glossary.GENERATED_NAVIGATION_PATH.read_text(encoding="utf-8")
        for sidebar_id in ("learn", "cbt", "mindfulness"):
            self.assertIn(f"  - id: {sidebar_id}", navigation)

    def test_generic_learn_sidebar_and_scroll_assets_remain(self) -> None:
        for name in ("bs-learn.js", "bs-learn-scroll.js", "bs-learn.css"):
            self.assertTrue((learn_glossary.SITE_ROOT / "assets" / name).is_file())

    def test_404_links_to_current_destinations(self) -> None:
        content = (learn_glossary.SITE_ROOT / "404.qmd").read_text(encoding="utf-8")
        self.assertIn('title: "Page not found"', content)
        self.assertIn("[Tool Finder](/tool-finder/)", content)
        self.assertNotIn("/research/", content)

    def test_generated_sources_validate(self) -> None:
        result = learn_glossary.validate_generated()
        self.assertEqual(result["lessons"], len(self.lessons))
        self.assertEqual(result["canonical_entries"], 1)
        self.assertEqual(result["research_articles"], 0)


if __name__ == "__main__":
    unittest.main()

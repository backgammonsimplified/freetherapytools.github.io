from __future__ import annotations

import copy
import inspect
import json
import unittest

from scripts import glossary_source as source
from scripts import learn_glossary


class CanonicalGlossaryJsonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.entries = source.load_contract_json()
        cls.serialized, cls.report = source.build_production_source()
        cls.data = json.loads(cls.serialized)

    def test_canonical_json_is_the_only_production_input(self) -> None:
        self.assertEqual(
            source.GLOSSARY_SOURCE_PATH,
            learn_glossary.REPOSITORY_ROOT / "glossary" / "glossary.json",
        )
        implementation = inspect.getsource(source.build_production_source)
        self.assertIn("load_contract_json", implementation)
        self.assertNotIn("parse_markdown", implementation)

    def test_current_therapy_entry_is_projected_without_rewriting(self) -> None:
        self.assertEqual(set(self.entries), {"wise-mind"})
        self.assertEqual(self.report["canonical_entries"], 1)
        self.assertEqual(self.report["published_entries"], 1)
        self.assertEqual(len(self.data["entries"]), 1)
        generated = self.data["entries"][0]
        canonical = self.entries["wise-mind"]
        self.assertEqual(generated["term"], canonical["term"])
        self.assertEqual(generated["short_definition"], canonical["short_definition"])
        self.assertEqual(generated["definition"], canonical["long_definition"])
        self.assertEqual(generated["categories"], canonical["categories"])

    def test_duplicate_raw_json_keys_fail_before_normal_parsing(self) -> None:
        with self.assertRaisesRegex(source.ValidationError, "Duplicate raw JSON key"):
            json.loads(
                '{"one":{"term":"One"},"one":{"term":"Other"}}',
                object_pairs_hook=source._reject_duplicate_keys,
            )

    def test_alias_collision_and_broken_inline_target_fail(self) -> None:
        entries = copy.deepcopy(self.entries)
        reasonable = copy.deepcopy(entries["wise-mind"])
        reasonable.update(
            {"term": "Reasonable Mind", "aliases": ["Wise Mind"], "inline_terms": {}}
        )
        entries = {"reasonable-mind": reasonable, "wise-mind": entries["wise-mind"]}
        with self.assertRaisesRegex(source.ValidationError, "conflicts with a canonical"):
            source.validate_contract_entries(entries)

        broken = copy.deepcopy(self.entries)
        broken["wise-mind"]["inline_terms"] = {
            "balanced perspective": "not-published"
        }
        with self.assertRaisesRegex(source.ValidationError, "broken inline target"):
            source.validate_contract_entries(broken)

    def test_generation_is_deterministic_and_tracked_output_is_current(self) -> None:
        first, _ = source.build_production_source()
        second, _ = source.build_production_source()
        self.assertEqual(first, second)
        self.assertEqual(learn_glossary.PUBLIC_DATA_PATH.read_text(encoding="utf-8"), first)


if __name__ == "__main__":
    unittest.main()

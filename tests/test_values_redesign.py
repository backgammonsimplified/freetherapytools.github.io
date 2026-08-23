import csv
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALUES = json.loads((ROOT / "site/data/skill-apps/values.json").read_text(encoding="utf-8"))
ACTIONS = json.loads((ROOT / "site/data/skill-apps/values-actions.json").read_text(encoding="utf-8"))
VALUES_JS = (ROOT / "site/assets/skill-apps.js").read_text(encoding="utf-8")
GOAL_JS = (ROOT / "site/assets/skill-practice-apps.js").read_text(encoding="utf-8")
PROGRESS_JS = (ROOT / "site/assets/skill-progress.js").read_text(encoding="utf-8")


class ValuesRedesignTests(unittest.TestCase):
    def test_complete_dictionary_audit_covers_original_source(self):
        with (ROOT / "data/values-dictionary-review.csv").open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(len(rows), 256)
        self.assertEqual(len({row["current_id"] for row in rows}), 256)
        self.assertEqual(
            set(rows[0]),
            {"current_id", "current_label", "current_rank", "classification", "synonym_cluster", "proposed_canonical", "decision", "aliases", "reason"},
        )
        self.assertEqual(sum(row["decision"] == "REVIEW" for row in rows), 42)
        self.assertEqual(next(row for row in rows if row["current_id"] == "perfection")["decision"], "REMOVE")
        excluded = {"MERGE_ALIAS", "MOVE_TO_DOMAIN", "REMOVE"}
        self.assertEqual(len(VALUES["values"]), sum(row["decision"] not in excluded for row in rows))
        self.assertTrue((ROOT / "VALUES-DICTIONARY-REVIEW.md").is_file())

    def test_canonical_cleanup_and_legacy_vocabulary(self):
        ids = [value["id"] for value in VALUES["values"]]
        labels = [value["name"].casefold() for value in VALUES["values"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(labels), len(set(labels)))
        self.assertNotIn("perfection", ids)
        self.assertEqual(VALUES["legacy_value_migrations"]["bravery"], "courage")
        self.assertEqual(VALUES["legacy_value_migrations"]["dependability"], "reliability")
        self.assertIn("Bravery", next(value for value in VALUES["values"] if value["id"] == "courage")["aliases"])
        self.assertEqual(
            {value["id"] for value in VALUES["legacy_noncanonical_values"]},
            {"health", "family", "friendship", "community", "spirituality", "perfection"},
        )

    def test_action_library_is_large_domain_complete_and_maintainable(self):
        self.assertEqual(set(ACTIONS["domains"]), {domain["id"] for domain in VALUES["domains"]})
        whats = [item for items in ACTIONS["domains"].values() for item in items]
        hows = [how for item in whats for how in item["hows"]]
        self.assertEqual(len(whats), 135)
        self.assertEqual(len(hows), 422)
        self.assertTrue(all(15 <= len(items) <= 25 for items in ACTIONS["domains"].values()))
        self.assertTrue(all(len(item["hows"]) >= 3 and item["value_tags"] for item in whats))
        self.assertEqual(len(next(item for item in whats if item["what"] == "Reconnect with an old relationship.")["hows"]), 20)
        self.assertEqual(len({item["id"] for item in whats}), len(whats))
        self.assertEqual(len({how["id"] for how in hows}), len(hows))
        duplicate_parents = {}
        for item in whats:
            for how in item["hows"]:
                duplicate_parents.setdefault(how["text"], []).append(item["what"])
        widespread = {text: parents for text, parents in duplicate_parents.items() if len(set(parents)) > 3}
        self.assertFalse(widespread, f"Excessively reused HOW text: {widespread}")
        self.assertGreaterEqual(len(ACTIONS["implementation_supports"]), 5)
        self.assertIn("data-values-actions-url", (ROOT / "site/skill-finder/values/index.qmd").read_text(encoding="utf-8"))

    def test_workflow_and_accessibility_contracts_are_visible(self):
        for token in (
            "Values are directions for living", "A value can guide an ongoing way of acting", "What could I work on?", "How could I start?",
            "click here for 10 new ideas", "Another 10 ways to start", "Write my own How", "My What:</label><input",
            "Add to SMART Goal", "Add to Google Calendar", "Add another goal for", "Move to the next life domain",
            "opens in a new tab", "<details", "<fieldset", "<legend",
        ):
            self.assertIn(token, VALUES_JS)
        self.assertIn('render();\n        root.querySelector(`[data-domain-importance=', VALUES_JS)
        self.assertNotIn("Add this action to my short-term list", VALUES_JS)
        self.assertNotIn("data-add-shortlist", VALUES_JS)
        self.assertIn("showActionDomain(nextDomainId)", VALUES_JS)

    def test_what_specific_hows_are_parent_linked_and_stale_selection_clears(self):
        whats = [item for items in ACTIONS["domains"].values() for item in items]
        for item in whats:
            self.assertTrue(item["hows"])
            self.assertTrue(all(how["id"].startswith(item["id"] + "-how-") for how in item["hows"]))
        handler = VALUES_JS.split('root.querySelectorAll("[data-action-what]")', 1)[1].split('root.querySelectorAll("[data-custom-what]")', 1)[0]
        self.assertIn('explore.selectedWhat = input.value', handler)
        self.assertIn('explore.selectedHow = ""', handler)
        self.assertIn('explore.howPage = 0', handler)
        self.assertNotIn('shortlist =', handler)
        self.assertIn("Make this easier to start", VALUES_JS)
        self.assertIn("These general follow-through supports are separate", VALUES_JS)

    def test_goal_builder_specialization_and_save_export_wording(self):
        for token in (
            "function initGoalBuilder", "Target date / deadline", "Schedule an event or reminder", "Times use your browser timezone",
            "Event or reminder date", "Starts at", "Duration in minutes", "data-calendar-duration=\"30\"", "step=\"any\"",
            "Schedule type", "One time", "Recurring", "Selected days of week", "No end date", "After occurrences", "Add another time",
            "Download calendar event (.ics)", "Add to Google Calendar", "No event details are sent to Google before you click",
            "BEGIN:VCALENDAR", "DTSTART", "DURATION", "RRULE", "goalGtdMarkdown", "due_date", "therapy-skill-kit-progress",
        ):
            self.assertIn(token, GOAL_JS)
        for token in ("Save progress (.md)", "Recommended. You can reopen this Markdown file later and continue.", "Export JSON", "Export DOCX", "Print / Save as PDF"):
            self.assertIn(token, PROGRESS_JS)
        self.assertNotIn('text: "Save JSON"', PROGRESS_JS)


if __name__ == "__main__":
    unittest.main()

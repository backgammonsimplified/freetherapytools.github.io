import csv
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
SITE = ROOT / "site"
sys.path.insert(0, str(SCRIPTS))

import resource_paraphrases as rp  # noqa: E402


def import_script(name, filename):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


asset_builder = import_script("resource_asset_builder", "build-resource-paraphrase-assets.py")
review_apply = import_script("resource_review_apply", "apply-resource-paraphrase-review.py")
exporter = import_script("resource_exporter", "generate-resource-exports.py")


class ResourceParaphraseCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = rp.load_json(rp.CANONICAL)
        cls.records = cls.corpus["records"]

    def test_every_current_published_resource_has_one_record(self):
        with rp.INVENTORY.open(encoding="utf-8-sig", newline="") as handle:
            inventory = list(csv.DictReader(handle))
        published = {row["id"] for row in inventory if row["publish"] == "true"}
        record_ids = [record["resource_id"] for record in self.records]
        self.assertGreater(len(published), 0)
        self.assertEqual(published, set(record_ids))
        self.assertEqual(len(record_ids), len(set(record_ids)))
        self.assertGreaterEqual(len(inventory) - len(published), 0)

    def test_schema_and_corpus_validation_pass(self):
        self.assertEqual([], rp.validate_corpus(self.corpus))
        self.assertEqual(1, self.corpus["schema_version"])
        self.assertTrue((ROOT / "data/resource-paraphrase.schema.json").is_file())

    def test_every_record_is_review_gated_and_source_linked(self):
        for record in self.records:
            self.assertIn(record["status"], {"draft", "review-needed"})
            self.assertNotIn(record["status"], rp.PUBLIC_STATES)
            self.assertTrue((SITE / record["source"]["printable_asset"].lstrip("/")).is_file(), record["resource_id"])
            self.assertTrue((ROOT / record["source"]["lesson_qmd"]).is_file(), record["resource_id"])
            self.assertTrue(record["source"]["source_hash"])

    def test_interactive_records_have_stable_generic_fields_and_guidance(self):
        interactive = [record for record in self.records if record["has_input"]]
        self.assertGreater(len(interactive), 0)
        self.assertGreater(sum(len(record["fields"]) for record in interactive), 0)
        for record in interactive:
            self.assertIn(record["classification"], {"interactive", "mixed"})
            self.assertTrue(record["fields"], record["resource_id"])
            self.assertTrue(record["guidance"]["enabled"], record["resource_id"])
            self.assertEqual(len(record["fields"]), len(record["guidance"]["questions"]))
            for field in record["fields"]:
                self.assertTrue(field["id"].startswith(f"{record['resource_id']}-"))
                self.assertIn(field["type"], rp.VALID_FIELD_TYPES)
                self.assertTrue(field["label"])

    def test_regeneration_is_deterministic_and_preserves_author_owned_record(self):
        generated = rp.generate_corpus(self.corpus)
        self.assertEqual(self.records, generated["records"])
        edited = json.loads(json.dumps(self.corpus))
        edited_record = edited["records"][0]
        edited_record["status"] = "approved"
        edited_record["review"]["generated"] = False
        edited_record["blocks"][0]["text"] = "Author-owned wording."
        regenerated = rp.generate_corpus(edited)
        kept = next(record for record in regenerated["records"] if record["resource_id"] == edited_record["resource_id"])
        self.assertEqual("Author-owned wording.", kept["blocks"][0]["text"])
        self.assertEqual("approved", kept["status"])

    def test_guided_prompt_does_not_include_answers_unless_explicit(self):
        record = next(record for record in self.records if record["has_input"])
        answer = "PRIVATE SYNTHETIC ANSWER"
        plain = rp.prompt_text(self.corpus, record)
        included = rp.prompt_text(self.corpus, record, {record["fields"][0]["id"]: answer})
        self.assertNotIn(answer, plain)
        self.assertIn(answer, included)
        for boundary in ("not as a therapist", "Do not diagnose", "one main worksheet question at a time", "Draft summary for me to review"):
            self.assertIn(boundary, plain)

    def test_specialized_tool_routes_resolve(self):
        mapped = [record for record in self.records if record["specialized_tool"]]
        self.assertGreaterEqual(len(mapped), 50)
        for record in mapped:
            route = record["specialized_tool"]["tool_route"]
            self.assertTrue((SITE / route.strip("/") / "index.qmd").is_file(), (record["resource_id"], route))

    def test_public_projection_excludes_original_and_review_text(self):
        projected = rp.public_record(self.records[0])
        self.assertNotIn("review", projected)
        self.assertNotIn("original_text", projected["source"])
        self.assertNotIn("source_hash", projected["source"])

    def test_review_apply_marks_only_explicit_change_author_owned(self):
        record = json.loads(json.dumps(self.records[0]))
        records = {record["resource_id"]: record}
        change = {
            "resource_id": record["resource_id"],
            "expected_source_hash": record["source"]["source_hash"],
            "changes": {"title": "Reviewed title", "status": "approved", "review_notes": "Checked."},
        }
        resource_id, patch = review_apply.validate_change(change, records, set())
        review_apply.apply_patch_to_record(records[resource_id], patch)
        self.assertEqual("Reviewed title", record["title"])
        self.assertEqual("approved", record["status"])
        self.assertFalse(record["review"]["generated"])
        untouched = self.records[1]
        self.assertNotEqual("approved", untouched["status"])

    def test_export_generator_is_deterministic_and_structurally_valid(self):
        record = next(record for record in self.records if record["has_input"])
        output = ROOT / "tmp" / "resource-paraphrase-draft-exports"
        output.mkdir(parents=True, exist_ok=True)
        docx = output / f"{record['resource_id']}.docx"
        pdf = output / f"{record['resource_id']}.pdf"
        exporter.write_docx(docx, record)
        exporter.write_pdf(pdf, record)
        first_docx = docx.read_bytes()
        first_pdf = pdf.read_bytes()
        exporter.write_docx(docx, record)
        exporter.write_pdf(pdf, record)
        self.assertEqual(first_docx, docx.read_bytes())
        self.assertEqual(first_pdf, pdf.read_bytes())
        self.assertEqual([], exporter.validate_docx(docx, record))
        self.assertEqual([], exporter.validate_pdf(pdf, record))

    def test_production_assets_have_no_unapproved_records_or_review_bundle(self):
        index = rp.load_json(SITE / "data/resource-paraphrases/index.json")
        self.assertEqual(0, index["published_count"])
        self.assertEqual({}, index["routes"])
        self.assertFalse((SITE / "data/resource-paraphrases/review.json").exists())
        self.assertEqual({}, rp.load_json(SITE / "assets/paraphrased-resources/manifest.json")["artifacts"])

    def test_quarto_copies_all_runtime_assets(self):
        quarto = (SITE / "_quarto.yml").read_text(encoding="utf-8")
        scripts = (SITE / "includes/bs-scripts.html").read_text(encoding="utf-8")
        for token in ("data/resource-paraphrases/**", "assets/paraphrased-resources/**", "assets/resource-paraphrases.js", "assets/resource-review-app.js", "assets/resource-review-app.css", "assets/resource-paraphrases.css"):
            self.assertIn(token, quarto)
        self.assertLess(scripts.index("skill-progress.js"), scripts.index("resource-paraphrases.js"))

    def test_privacy_and_review_mode_contract_is_visible_in_runtime(self):
        runtime = (SITE / "assets/resource-paraphrases.js").read_text(encoding="utf-8")
        for label in ("Nothing is sent automatically", "Copy guided reflection prompt", "Copy prompt + my responses", "Save progress (.md)"):
            self.assertIn(label, runtime + (SITE / "assets/skill-progress.js").read_text(encoding="utf-8"))
        self.assertNotIn("sendBeacon", runtime)
        self.assertNotIn("XMLHttpRequest", runtime)
        self.assertNotRegex(runtime, r"answers.*location\.(?:search|href)")

    def test_review_route_uses_dedicated_full_viewport_authoring_shell(self):
        qmd = (SITE / "review/resource-paraphrases.qmd").read_text(encoding="utf-8")
        css = (SITE / "assets/resource-review-app.css").read_text(encoding="utf-8")
        runtime = (SITE / "assets/resource-review-app.js").read_text(encoding="utf-8")
        self.assertIn("resource-review-app.css", qmd)
        self.assertIn("resource-review-app.js", qmd)
        self.assertIn(".tsk-review-app", css)
        self.assertIn("height: 100dvh", css)
        self.assertIn(".bs-resource-review-page > .navbar", css)
        self.assertIn("grid-template-columns", css)
        for label in (
            "Resource queue", "Source page", "Extracted text", "Adapted version",
            "Worksheet", "Guided reflection", "Metadata / QA", "Approve & next",
            "Needs changes & next", "Export review JSON",
        ):
            self.assertIn(label, runtime)
        self.assertNotIn("Plain-language draft", runtime)
        self.assertNotIn("LLM prompt", runtime)

    def test_public_resource_copy_uses_concise_labels(self):
        runtime = (SITE / "assets/resource-paraphrases.js").read_text(encoding="utf-8")
        for label in ("Text version", "Interactive worksheet", "Printable source", "Download worksheet (PDF)", "Download worksheet (DOCX)"):
            self.assertIn(label, runtime)
        for deprecated in ("Plain-language version", "Paraphrased draft", "Generated interactive worksheet", "LLM prompt"):
            self.assertNotIn(deprecated, runtime)


class ResourceParaphraseJavaScriptTests(unittest.TestCase):
    def test_node_unit_checks(self):
        result = subprocess.run(["node", "tests/test_resource_paraphrases.js"], cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()

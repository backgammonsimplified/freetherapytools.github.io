"use strict";

const assert = require("node:assert/strict");
const progress = require("../site/assets/skill-progress.js");

const config = {
  toolId: "worry-tree",
  toolTitle: "Worry Tree",
  route: "/skill-finder/worry-tree/",
  schemaVersion: 1,
  validateState: (state) => progress.isPlainObject(state)
    && typeof state.nodeId === "string"
    && Array.isArray(state.history)
    && progress.isPlainObject(state.answers),
};
const state = {
  nodeId: "when",
  history: ["worry", "actionable", "action"],
  answers: { worry: "Synthetic test worry", action: "Write a plan", timing: "later" },
};
const savedAt = new Date("2026-08-22T14:28:00.000Z");
const record = progress.makeRecord(config, state, savedAt);
const readable = "# Worry Tree\n\n## Worry\n\nSynthetic test worry\n\n## Action Plan\n\nWrite a plan";

assert.deepEqual(JSON.parse(progress.serializeJson(record)), record, "JSON should round-trip");
const markdown = progress.serializeMarkdown(record, readable);
assert.match(markdown, /^<!-- therapy-skill-kit-progress/);
assert.match(markdown, /# Worry Tree/);
assert.match(markdown, /## Action Plan/);
assert.deepEqual(progress.parseProgress(markdown).record, record, "Markdown metadata should round-trip");
assert.deepEqual(progress.validateForTool(record, config).state, state);

const wrong = progress.validateForTool({ ...record, tool_id: "values", tool_title: "Values & Valued Action" }, config);
assert.equal(wrong.code, "wrong-tool");
assert.equal(progress.validateForTool({ ...record, schema_version: 2 }, config).code, "future-version");
assert.equal(progress.validateForTool({ ...record, route: "/wrong/" }, config).code, "damaged");
assert.equal(progress.validateForTool({ ...record, state: { broken: true } }, config).code, "damaged");
assert.equal(progress.parseProgress("ordinary notes").code, "not-progress");
assert.equal(progress.parseProgress("<!-- therapy-skill-kit-progress\n{bad}\n-->").code, "damaged");

const dangerous = { ...record, state: { ...state, answers: { worry: "</script><script>alert(1)</script><!-- -->" } } };
const safeMarkdown = progress.serializeMarkdown(dangerous, readable);
assert.ok(!safeMarkdown.match(/<!--\s*therapy-skill-kit-progress[\s\S]*?-->[\s\S]*?<script>/), "metadata must not end its comment early");
assert.equal(progress.parseProgress(safeMarkdown).record.state.answers.worry, dangerous.state.answers.worry);

const filename = progress.localFilename("worry-tree", new Date(2026, 7, 22, 10, 28));
assert.equal(filename, "worry-tree-2026-08-22-1028");
assert.equal(progress.sanitizeFilename(' goal: "test" / answer '), "goal-test-answer");

(async () => {
  const docx = progress.makeDocx("Worry Tree", readable, savedAt);
  assert.equal(docx.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const bytes = new Uint8Array(await docx.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], "DOCX must be a ZIP package");
  const text = new TextDecoder().decode(bytes);
  for (const part of ["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels", "word/document.xml", "word/styles.xml"]) assert.ok(text.includes(part), part);
  assert.ok(text.includes("Worry Tree"));
  console.log("skill progress unit checks passed");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

"use strict";

const assert = require("node:assert/strict");
const runtime = require("../site/assets/resource-paraphrases.js");
const progress = require("../site/assets/skill-progress.js");

const base = { contract: ["Base contract"] };
const record = {
  resource_id: "test-p001",
  title: "Synthetic worksheet",
  lesson_route: "/learn/test.html",
  fields: [
    { id: "test-p001-q01", type: "reflection", label: "What happened?" },
    { id: "test-p001-q02", type: "multi-select", label: "What fits?" },
  ],
  guidance: {
    enabled: true,
    purpose: "Notice a source-backed sequence.",
    questions: [{ field_id: "test-p001-q01", prompt: "What happened, in your own words?", probes: ["Where were you?"] }],
    summary_sections: ["Situation", "Questions I may want to discuss"],
  },
};
const answers = { "test-p001-q01": "PRIVATE SYNTHETIC ANSWER", "test-p001-q02": ["A", "B"] };

assert.equal(runtime.answerIsSet(""), false);
assert.equal(runtime.answerIsSet([]), false);
assert.equal(runtime.answerIsSet("answer"), true);
assert.equal(runtime.answerIsSet([["", "x"]]), true);
assert.doesNotMatch(runtime.promptText(base, record), /PRIVATE SYNTHETIC ANSWER/);
assert.match(runtime.promptText(base, record, answers), /PRIVATE SYNTHETIC ANSWER/);
assert.match(runtime.promptText(base, record, answers), /My current worksheet responses/);

const summary = runtime.readableSummary(record, { resource_id: record.resource_id, answers });
assert.match(summary, /^# Synthetic worksheet - My Progress/);
assert.match(summary, /## What happened\?/);
assert.match(summary, /PRIVATE SYNTHETIC ANSWER/);
assert.equal(progress.routeForTool("resource-test-p001", "/learn/test.html"), "/learn/test.html");
assert.equal(progress.routeForTool("unknown", "/learn/test.html"), null);

console.log("resource paraphrase unit checks passed");

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const progress = require("../site/assets/skill-progress.js");
global.TherapySkillProgress = progress;
const dime = require("../site/assets/skill-finder-apps.js");
const flow = JSON.parse(fs.readFileSync(path.join(__dirname, "../site/data/skill-apps/flows/dime-game.json"), "utf8"));
const factors = flow.nodes.filter((node) => node.dime_factor);

assert.equal(factors.length, 10);
assert.ok(factors.every((node) => node.dime_for.ask === "yes"));
assert.ok(factors.every((node) => node.dime_for["say-no"] === "no"));

const askAnswers = { mode: "ask", situation: "A synthetic request" };
factors.forEach((node) => { askAnswers[node.field] = "no"; });
assert.equal(dime.dimeScore(flow, askAnswers), 0);

factors.slice(0, 4).forEach((node) => { askAnswers[node.field] = "yes"; });
assert.equal(dime.dimeScore(flow, askAnswers), 4);
assert.equal(dime.dimeMoney(4), "$0.40");
assert.equal(dime.dimeGuidance(flow, askAnswers), "Ask tentatively, and accept no.");

factors.forEach((node) => { askAnswers[node.field] = "yes"; });
assert.equal(dime.dimeScore(flow, askAnswers), 10);
assert.equal(dime.dimeMoney(10), "$1.00");

const sayNoAnswers = { mode: "say-no", situation: "A synthetic refusal" };
factors.forEach((node) => { sayNoAnswers[node.field] = "yes"; });
assert.equal(dime.dimeScore(flow, sayNoAnswers), 0);
factors.slice(0, 6).forEach((node) => { sayNoAnswers[node.field] = "no"; });
assert.equal(dime.dimeScore(flow, sayNoAnswers), 6);

for (let expected = 0; expected <= 10; expected += 1) {
  const answers = { mode: "ask" };
  factors.forEach((node, index) => { answers[node.field] = index < expected ? "yes" : "no"; });
  assert.equal(dime.dimeScore(flow, answers), expected);
  assert.equal(dime.dimeMoney(expected), `$${(expected / 10).toFixed(2)}`);
}

const retained = { ...askAnswers };
retained[factors[0].field] = "no";
assert.equal(dime.dimeScore(flow, retained), 9, "changing an earlier answer recalculates immediately");
assert.equal(retained[factors[9].field], "yes", "later answers remain available to the scoring authority");

const state = { nodeId: "result", history: flow.nodes.slice(0, -1).map((node) => node.id), answers: askAnswers };
const config = {
  toolId: "dime-game",
  toolTitle: "The DIME Game",
  route: "/tool-finder/dime-game/",
  schemaVersion: 1,
  validateState: (value) => progress.isPlainObject(value) && typeof value.nodeId === "string" && Array.isArray(value.history) && progress.isPlainObject(value.answers),
};
const record = progress.makeRecord(config, state, new Date("2026-08-27T12:00:00.000Z"));
const markdown = progress.serializeMarkdown(record, dime.flowSummary(flow, state));
assert.deepEqual(progress.validateForTool(progress.parseProgress(markdown).record, config).state, state, "DIME progress should round-trip");

const readable = dime.flowSummary(flow, state);
for (const label of ["The DIME Game", "Decision", "Situation", "Capability", "Priorities", "Self-respect", "Rights", "Authority", "Relationship", "Goals", "Give and Take", "Homework", "Timing", "Dimes", "Intensity", "Source-Backed Result Guidance"]) {
  assert.match(readable, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log("DIME Game unit checks passed");

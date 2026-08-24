"use strict";

const assert = require("node:assert/strict");
const tools = require("../site/assets/skill-quick-tools.js");
const progress = require("../site/assets/skill-progress.js");

assert.equal(tools.FIVE_FACTORS.length, 5);
assert.deepEqual(tools.FIVE_FACTORS.map(([id]) => id), ["situation", "thoughts", "emotions", "body", "behaviours"]);
assert.equal(tools.THINKING_TRAPS.length, 12);
assert.equal(new Set(tools.THINKING_TRAPS.map(([id]) => id)).size, 12);

const machine = new tools.BoxBreathingMachine({ inhale: 2, holdIn: 3, exhale: 4, holdOut: 5 });
assert.equal(machine.snapshot().phase, "inhale");
machine.start();
machine.advance(2);
assert.equal(machine.snapshot().phase, "holdIn");
assert.equal(machine.snapshot().remaining, 3);
machine.advance(3);
assert.equal(machine.snapshot().phase, "exhale");
machine.pause();
const paused = machine.snapshot();
machine.advance(20);
assert.deepEqual(machine.snapshot(), paused, "pause freezes the phase state");
machine.start();
machine.advance(9);
assert.equal(machine.snapshot().phase, "inhale");
assert.equal(machine.snapshot().cycles, 1);
machine.reset();
assert.equal(machine.snapshot().cycles, 0);
assert.equal(machine.snapshot().running, false);

const thought = tools.normalizeThoughtRecord({
  situation: "A meeting",
  automaticThoughts: "I will fail",
  hotThought: "I will fail",
  traps: ["fortune-telling"],
});
assert.equal(thought.situation, "A meeting");
assert.equal(thought.evidenceFor, "");
assert.equal(tools.validateThoughtRecordState(thought), true);
assert.equal(tools.validateThoughtRecordState({ ...thought, traps: ["invented-trap"] }), false);
assert.equal(tools.validateThoughtRecordState({ ...thought, initialIntensity: "101" }), false);

const config = { toolId: "thought-record", toolTitle: "Thought Record", route: "/skill-finder/thought-record/", schemaVersion: 1 };
const record = progress.makeRecord(config, thought, new Date("2026-08-24T15:00:00Z"));
for (const serialized of [progress.serializeMarkdown(record, "# Thought Record"), progress.serializeJson(record)]) {
  const restored = progress.parseProgress(serialized).record.state;
  assert.deepEqual(restored, thought);
  assert.equal(tools.validateThoughtRecordState(restored), true);
}

console.log("Dedicated quick tool state, breathing timer, and Thought Record restore checks passed");

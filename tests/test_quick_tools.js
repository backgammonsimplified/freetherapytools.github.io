"use strict";

const assert = require("node:assert/strict");
const tools = require("../site/assets/skill-quick-tools.js");
const progress = require("../site/assets/skill-progress.js");

assert.equal(tools.FIVE_FACTORS.length, 5);
assert.deepEqual(tools.FIVE_FACTORS.map(([id]) => id), ["situation", "thoughts", "emotions", "body", "behaviours"]);
assert.equal(tools.THINKING_TRAPS.length, 12);
assert.equal(new Set(tools.THINKING_TRAPS.map(([id]) => id)).size, 12);
assert.deepEqual(tools.CANONICAL_EMOTION_IDS, ["anger", "disgust", "envy", "fear", "happiness", "jealousy", "love", "sadness", "shame", "guilt"]);
assert.equal(tools.CASE_MAP_FIELDS.length, 6);

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

const noHoldMachine = new tools.BoxBreathingMachine({ inhale: 2, holdIn: 0, exhale: 3, holdOut: 0 });
noHoldMachine.start();
noHoldMachine.advance(2);
assert.equal(noHoldMachine.snapshot().phase, "exhale", "a zero first hold is skipped");
noHoldMachine.advance(3);
assert.equal(noHoldMachine.snapshot().phase, "inhale", "a zero second hold is skipped");
assert.equal(noHoldMachine.snapshot().cycles, 1);

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

const completeThought = tools.normalizeThoughtRecord({
  situation: "Team meeting",
  emotionRatings: { fear: { intensity: "72", notes: "tight shoulders", afterIntensity: "41" } },
  automaticThoughts: [{ id: "t1", text: "They will reject the idea" }, { id: "t2", text: "I cannot explain it" }],
  hotThoughtId: "t1",
  traps: ["fortune-telling"],
  evidenceFor: "One person questioned it before",
  evidenceAgainst: "Two people asked to hear more",
  balancedThought: "Some questions do not mean rejection",
});
const emotionNames = tools.CANONICAL_EMOTION_IDS.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
const thoughtSummary = JSON.stringify(tools.thoughtRecordSummarySections(completeThought, emotionNames));
for (const entered of ["Team meeting", "Fear: initial 72/100; notes/sensations: tight shoulders; after 41/100", "They will reject the idea", "I cannot explain it", "One person questioned it before", "Two people asked to hear more", "Some questions do not mean rejection"]) {
  assert.ok(thoughtSummary.includes(entered), `Thought Record summary includes ${entered}`);
}

const gratitudeSummary = JSON.stringify(tools.gratitudeSummarySections([
  { id: "g1", date: "2026-08-27", appreciation: "A quiet cup of tea", meaning: "I slowed down" },
  { id: "g2", date: "", appreciation: "A helpful message", meaning: "I felt connected" },
]));
for (const entered of ["2026-08-27", "A quiet cup of tea", "I slowed down", "A helpful message", "I felt connected"]) {
  assert.ok(gratitudeSummary.includes(entered), `Gratitude summary includes ${entered}`);
}

const config = { toolId: "thought-record", toolTitle: "Thought Record", route: "/skill-finder/thought-record/", schemaVersion: 1 };
const record = progress.makeRecord(config, thought, new Date("2026-08-24T15:00:00Z"));
for (const serialized of [progress.serializeMarkdown(record, "# Thought Record"), progress.serializeJson(record)]) {
  const restored = progress.parseProgress(serialized).record.state;
  assert.deepEqual(restored, thought);
  assert.equal(tools.validateThoughtRecordState(restored), true);
}

const caseState = Object.fromEntries(tools.CASE_MAP_FIELDS.map(([id, label]) => [id, `${label} entry`]));
const caseConfig = { toolId: "case-map", toolTitle: "Case Map", route: "/skill-finder/case-map/", schemaVersion: 1 };
const caseRecord = progress.makeRecord(caseConfig, caseState, new Date("2026-08-27T15:00:00Z"));
assert.deepEqual(progress.parseProgress(progress.serializeJson(caseRecord)).record.state, caseState);

console.log("Dedicated quick tool state, breathing timer, and Thought Record restore checks passed");

"use strict";

const assert = require("node:assert/strict");
const practice = require("../site/assets/interpersonal-priorities.js");

const empty = practice.initialState();
assert.equal(practice.validState(empty), true);
assert.equal(practice.priorityHint(empty).includes("Rank the goals"), true);

const filled = {
  ...empty,
  situation: "A colleague changed our plan without telling me.",
  obstacles: ["strong-feelings", "prediction"],
  assumptions: ["mind-reading"],
  thought: "They ignored me on purpose.",
  evidenceAgainst: "I do not know why the plan changed.",
  balancedResponse: "I can ask what happened before deciding why.",
  objective: "Ask for notice next time.",
  relationship: "Keep the conversation respectful.",
  selfRespect: "Speak honestly and calmly.",
  objectiveRank: "1",
  relationshipRank: "2",
  selfRespectRank: "3",
};
assert.equal(practice.validState(filled), true);
assert.match(practice.priorityHint(filled), /DEAR MAN/);
const summary = practice.readable(filled);
assert.match(summary, /Strong feelings may make it harder/);
assert.match(summary, /I can ask what happened before deciding why/);
assert.match(summary, /Objective: 1/);

assert.equal(practice.validState({ ...filled, obstacles: ["unknown"] }), false);
assert.equal(practice.validState({ ...filled, assumptions: ["mind-reading", "mind-reading"] }), false);
assert.equal(practice.validState({ ...filled, objectiveRank: "4" }), false);
assert.match(practice.priorityHint({ ...filled, relationshipRank: "1" }), /same rank/);

console.log("Interpersonal priorities practice checks passed.");

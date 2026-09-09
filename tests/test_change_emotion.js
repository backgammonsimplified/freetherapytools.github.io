"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const progress = require("../site/assets/skill-progress.js");
global.TherapySkillProgress = progress;
const app = require("../site/assets/skill-finder-apps.js");
const flow = JSON.parse(fs.readFileSync(path.join(__dirname, "../site/data/skill-apps/flows/change-emotion.json"), "utf8"));
global.__therapyEmotionNames = { fear: "Fear" };

const allowed = new Set(app.allowedFlowAnswerKeys(flow));
for (const legacyKey of ["facts-event", "facts-interpretations", "facts-threat", "facts-catastrophe"]) {
  assert.ok(allowed.has(legacyKey), `legacy answer ${legacyKey} remains accepted`);
}
for (const [key] of app.CHECK_FACT_FIELDS) assert.ok(allowed.has(key), `${key} is accepted`);

const legacyState = {
  nodeId: "fits-facts",
  history: ["emotion"],
  answers: {
    emotion: "fear",
    "facts-event": "A message arrived.",
    "facts-interpretations": "I assumed it meant bad news.",
    "facts-threat": "I predicted a conflict.",
    "facts-catastrophe": "I could pause and ask for support.",
  },
};
const config = {
  toolId: "change-emotion",
  toolTitle: "Change an Emotion",
  route: "/tool-finder/change-emotion/",
  schemaVersion: 1,
  validateState: (state) => progress.isPlainObject(state)
    && flow.nodes.some((node) => node.id === state.nodeId)
    && Array.isArray(state.history)
    && progress.isPlainObject(state.answers)
    && Object.entries(state.answers).every(([key, value]) => allowed.has(key) && typeof value === "string"),
};

const oldRecord = progress.makeRecord(config, legacyState, new Date("2026-09-03T12:00:00Z"));
const oldMarkdown = progress.serializeMarkdown(oldRecord, app.flowSummary(flow, legacyState));
assert.deepEqual(progress.validateForTool(progress.parseProgress(oldMarkdown).record, config).state, legacyState);

const currentState = {
  nodeId: "change-thoughts-opposite",
  history: ["emotion", "fits-facts", "effective-no-fit"],
  answers: {
    ...legacyState.answers,
    "facts-observations": "The message contained a request and a date.",
    "facts-likelihood": "Possible, but not certain.",
    "facts-fit-reflection": "Fear fits some uncertainty, though I lack evidence of danger.",
    "facts-intensity": "The intensity may be higher than the current facts suggest.",
    "fits-facts": "no",
    "effective-no-fit": "no",
  },
};
const readable = app.flowSummary(flow, currentState);
for (const text of [
  "Emotion I Noticed", "Fear", "Check the Facts Reflection",
  "Which details could a camera or recording have captured",
  "Possible, but not certain.",
  "The intensity may be higher than the current facts suggest.",
  "Change thoughts and act opposite",
]) assert.ok(readable.includes(text), `readable export includes ${text}`);
for (const rawKey of ["facts-observations:", "facts-likelihood:", "facts-intensity:"]) assert.ok(!readable.includes(rawKey));

const record = progress.makeRecord(config, currentState, new Date("2026-09-03T12:00:00Z"));
for (const serialized of [progress.serializeMarkdown(record, readable), progress.serializeJson(record)]) {
  assert.deepEqual(progress.validateForTool(progress.parseProgress(serialized).record, config).state, currentState);
}

const fits = flow.nodes.find((node) => node.id === "fits-facts");
assert.deepEqual(fits.choices.map((choice) => choice.value), ["yes", "no"]);
assert.deepEqual(fits.choices.map((choice) => choice.next), ["effective-fit", "effective-no-fit"]);
assert.ok(fits.choices.every((choice) => /fit/.test(choice.label)));

console.log("Change Emotion paraphrased Check the Facts and progress checks passed");

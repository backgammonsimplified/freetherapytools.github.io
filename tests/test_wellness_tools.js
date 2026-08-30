"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const progress = require("../site/assets/skill-progress.js");
const quickTools = require("../site/assets/skill-quick-tools.js");

const quick = fs.readFileSync("site/assets/skill-quick-tools.js", "utf8");
const styles = fs.readFileSync("site/assets/skill-apps.css", "utf8");
const pages = {
  sleep: fs.readFileSync("site/tool-finder/sleep-hygiene/index.qmd", "utf8"),
  stages: fs.readFileSync("site/tool-finder/stages-of-change/index.qmd", "utf8"),
  urge: fs.readFileSync("site/tool-finder/urge-surfing/index.qmd", "utf8"),
};

for (const [name, id] of [["sleep", "sleep-hygiene"], ["stages", "stages-of-change"], ["urge", "urge-surfing"]]) {
  assert.match(pages[name], new RegExp(`data-quick-app="${id}"`));
  assert.match(quick, new RegExp(`toolId: "${id}"`));
  assert.equal(progress.TOOL_ROUTES[id], `/tool-finder/${id}/`);
}

const records = [
  ["sleep-hygiene", { checks: ["timing", "routine"], pattern: "Late weekends", change: "Keep wake time", support: "Set an alarm" }],
  ["stages-of-change", { stage: "Contemplation", behaviour: "A pattern", readiness: "Both sides", benefits: "Short relief", costs: "Longer cost", ambivalence: "Unsure", nextStep: "Talk to support", support: "A trusted person" }],
  ["urge-surfing", { urge: "do something", trigger: "a cue", body: "tightness", thoughts: "a story", observe: "notice", noticed: "movement", changed: "shifted", helped: "feet", acted: "no", nextTime: "pause", nextAction: "call support", intensity: "82", initialMinutes: "0", afterIntensity: "61", afterMinutes: "8", checkpoints: [{ id: "checkpoint-1", minutes: "3", intensity: "91" }], timer: { duration: 180, remaining: 97, running: false } }],
];

for (const [toolId, state] of records) {
  const config = { toolId, toolTitle: toolId, route: progress.TOOL_ROUTES[toolId], schemaVersion: 1, validateState: () => true };
  const record = progress.makeRecord(config, state, new Date("2026-08-29T12:00:00Z"));
  assert.deepEqual(progress.parseProgress(progress.serializeJson(record)).record.state, state);
  assert.match(progress.serializeMarkdown(record, progress.nonEmptySections(toolId, Object.entries(state))), new RegExp(`# ${toolId}`));
}

const legacyStagesState = {
  stage: "Contemplation",
  behaviour: "A coping pattern",
  readiness: "I am starting to notice it",
  benefits: "Short-term relief",
  costs: "Longer-term costs",
  ambivalence: "I feel pulled both ways",
  nextStep: "Write down one practical step",
  support: "A trusted person",
};
assert.ok(quickTools.validateStagesOfChangeState(legacyStagesState));
const normalizedStages = quickTools.normalizeStagesOfChangeState(legacyStagesState);
assert.equal(normalizedStages.change, legacyStagesState.behaviour);
assert.equal(normalizedStages.stage, "contemplation");
assert.equal(normalizedStages.responses.pre_minimizing, legacyStagesState.readiness);
assert.equal(normalizedStages.responses.cont_reasons_same, legacyStagesState.benefits);
assert.equal(normalizedStages.responses.cont_reasons_change, legacyStagesState.costs);
assert.equal(normalizedStages.responses.cont_feelings, legacyStagesState.ambivalence);
assert.equal(normalizedStages.responses.prep_steps, legacyStagesState.nextStep);
assert.equal(normalizedStages.responses.action_support, legacyStagesState.support);

assert.equal(quickTools.STAGES_OF_CHANGE.length, 6);
assert.equal(quickTools.STAGES_RESPONSE_KEYS.length, 19);
const completeStagesState = quickTools.initialStagesOfChangeState();
completeStagesState.change = "A pattern I want to change";
completeStagesState.date = "2026-08-30";
completeStagesState.stage = "preparation";
completeStagesState.additionalNotes = "I want to revisit this after trying my plan.";
quickTools.STAGES_RESPONSE_KEYS.forEach((key, index) => { completeStagesState.responses[key] = `Answer ${index + 1}`; });
assert.ok(quickTools.validateStagesOfChangeState(completeStagesState));
const changedStage = quickTools.selectStagesOfChangeStage(completeStagesState, "maintenance");
assert.equal(changedStage.stage, "maintenance");
assert.deepEqual(changedStage.responses, completeStagesState.responses, "changing the selected stage must retain every response");
assert.equal(changedStage.additionalNotes, completeStagesState.additionalNotes);
const stagesRecord = progress.makeRecord({
  toolId: "stages-of-change",
  toolTitle: "Stages of Change Reflection",
  route: progress.TOOL_ROUTES["stages-of-change"],
  schemaVersion: 1,
  validateState: quickTools.validateStagesOfChangeState,
}, completeStagesState, new Date("2026-08-30T12:00:00Z"));
const stagesRoundTrip = progress.parseProgress(progress.serializeJson(stagesRecord));
assert.equal(stagesRoundTrip.ok, true);
assert.deepEqual(stagesRoundTrip.record.state, completeStagesState);
const stagesSummary = quickTools.stagesOfChangeSummary(completeStagesState);
for (const token of [
  "# Stages of Change Reflection",
  "A pattern I want to change",
  "Current stage that feels closest",
  "Preparation",
  "## Precontemplation",
  "## Contemplation",
  "## Action",
  "## Maintenance",
  "## Return to an old pattern",
  "Answer 19",
  "## Additional notes",
]) assert.match(stagesSummary, new RegExp(token));
const changePath = quickTools.stagesChangePathMarkup("action");
assert.equal((changePath.match(/data-stage-choice=/g) || []).length, 6);
assert.match(changePath, /Feels closest right now/);
assert.match(changePath, /Change can move forward, pause, or loop back\./);
for (const token of ["Expand all", "Collapse all", "data-stage-response", "data-stage-owner", "scrollIntoView"]) assert.match(quick, new RegExp(token));
assert.match(quick, /STAGES_RESPONSE_KEYS\.indexOf\(key\) \+ 1/);
assert.ok(!/\bName\b|Signature/.test(pages.stages));

const validRating = (value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100);
for (const value of ["", "0", "40", "100"]) assert.ok(validRating(value));
for (const value of ["-1", "101", "4.5", "text"]) assert.ok(!validRating(value));
const plotted = quickTools.urgeGraphPoints({
  intensity: "82",
  initialMinutes: "0",
  checkpoints: [{ id: "checkpoint-1", minutes: "3", intensity: "91" }],
  afterMinutes: "8",
  afterIntensity: "61",
});
assert.deepEqual(plotted.map(({ minutes, intensity }) => [minutes, intensity]), [[0, 82], [3, 91], [8, 61]]);
const graph = quickTools.urgeGraphMarkup({ intensity: "82", initialMinutes: "0", checkpoints: [], afterMinutes: "", afterIntensity: "" });
assert.match(graph, /Minutes since urge started/);
assert.match(graph, /Urge intensity/);
assert.match(graph, /Initial: 0 minutes — 82\/100/);
for (const token of ["Trigger", "Rise", "Peak", "Fall", "Add a checkpoint", "Minutes since the urge started", "Start", "Pause", "Reset", "running: false", "getReadableSummary"]) assert.match(quick, new RegExp(token));
assert.match(styles, /prefers-reduced-motion/);
assert.ok(!quick.includes("URLSearchParams"), "personal tool state must not be encoded in URLs");

console.log("Wellness tool progress, export, rating, timer, and route checks passed");

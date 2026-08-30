"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const progress = require("../site/assets/skill-progress.js");

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

const validRating = (value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100);
for (const value of ["", "0", "40", "100"]) assert.ok(validRating(value));
for (const value of ["-1", "101", "4.5", "text"]) assert.ok(!validRating(value));
const plotted = require("../site/assets/skill-quick-tools.js").urgeGraphPoints({
  intensity: "82",
  initialMinutes: "0",
  checkpoints: [{ id: "checkpoint-1", minutes: "3", intensity: "91" }],
  afterMinutes: "8",
  afterIntensity: "61",
});
assert.deepEqual(plotted.map(({ minutes, intensity }) => [minutes, intensity]), [[0, 82], [3, 91], [8, 61]]);
const graph = require("../site/assets/skill-quick-tools.js").urgeGraphMarkup({ intensity: "82", initialMinutes: "0", checkpoints: [], afterMinutes: "", afterIntensity: "" });
assert.match(graph, /Minutes since urge started/);
assert.match(graph, /Urge intensity/);
assert.match(graph, /Initial: 0 minutes — 82\/100/);
for (const token of ["Trigger", "Rise", "Peak", "Fall", "Add a checkpoint", "Minutes since the urge started", "Start", "Pause", "Reset", "running: false", "getReadableSummary"]) assert.match(quick, new RegExp(token));
assert.match(styles, /prefers-reduced-motion/);
assert.ok(!quick.includes("URLSearchParams"), "personal tool state must not be encoded in URLs");

console.log("Wellness tool progress, export, rating, timer, and route checks passed");

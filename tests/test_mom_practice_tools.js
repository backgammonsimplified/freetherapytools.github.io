"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Progress = require("../site/assets/skill-progress.js");
const logs = require("../site/assets/mom-practice-tools.js");
const guided = require("../site/assets/skill-practice-apps.js");
const catalogue = JSON.parse(fs.readFileSync("site/data/tool-finder/catalogue.json", "utf8"));
const ids = ["activity-mood-log", "core-belief-evidence-log", "anger-response-review", "responsibility-repair"];
(async () => {
  for (const id of ids) {
    const definition = logs.TYPES[id] || guided.FORM_DEFINITIONS[id];
    assert.ok(definition, id);
    assert.equal(catalogue.entries.filter((entry) => entry.id === id).length, 1);
    assert.equal(Progress.TOOL_ROUTES[id], `/tool-finder/${id}/`);
    assert.ok(fs.existsSync(`site/tool-finder/${id}/index.qmd`));
    const isLog = Boolean(logs.TYPES[id]);
    const state = isLog ? logs.initialState(id) : { fields: Object.fromEntries(definition.fields.map(([key]) => [key, `Example ${key} <test>`])), summaryBuilt: true };
    if (isLog) {
      state.entries[0][definition.fields[1][0]] = "A specific observation <test>";
      state.entries.push({ ...state.entries[0], id: "second", [definition.fields[1][0]]: "A second observation" });
      if (id === "activity-mood-log") { state.entries[0].rating = "45"; state.entries[1].rating = "65"; assert.match(logs.trendText(id, state), /45\/100 and 65\/100/); }
      else { state.entries[0].direction = "supports"; state.entries[1].direction = "complicates"; assert.match(logs.trendText(id, state), /1 supporting, 1 complicating/); }
    }
    const valid = (next) => isLog ? logs.validState(id, next) : guided.guidedStateValid(definition, next);
    const readable = (next) => isLog ? logs.readable(id, next) : guided.guidedSummary(definition, next);
    assert.equal(valid(state), true, id);
    const config = { toolId: id, toolTitle: definition.title, route: Progress.TOOL_ROUTES[id], schemaVersion: 1, validateState: valid };
    const text = readable(state);
    const record = Progress.makeRecord(config, state);
    const saved = Progress.serializeMarkdown(record, text);
    assert.deepEqual(Progress.validateForTool(Progress.parseProgress(saved).record, config).state, state);
    assert.match(text, /## Source/);
    const docx = new TextDecoder().decode(new Uint8Array(await Progress.makeDocx(definition.title, text).arrayBuffer()));
    assert.ok(docx.includes("&lt;test&gt;"), id + " DOCX escapes answers");
    if (isLog) {
      if (id === "activity-mood-log") assert.equal(valid({ ...state, entries: [{ ...state.entries[0], rating: "101" }] }), false);
      assert.equal(valid({ ...state, entries: [{ ...state.entries[0], id: "same" }, { ...state.entries[0], id: "same" }] }), false);
    } else {
      assert.equal(valid({ ...state, fields: { ...state.fields, unknown: "x" } }), false);
    }
  }
  const maintenance = guided.FORM_DEFINITIONS["maintaining-progress"];
  assert.ok(guided.guidedStateValid(maintenance, { fields: Object.fromEntries(maintenance.fields.filter(([key]) => key !== "skillsReview").map(([key]) => [key, ""])), summaryBuilt: false }), "older maintenance files remain valid");
  console.log("Mind Over Mood logs and guided tools: routes, save/reopen, DOCX, trend, validation, compatibility passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });

"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const P = require("../site/assets/skill-progress.js");
const D = require("../site/assets/skill-practice-apps.js");

(async () => {
  for (const id of ["dear-man", "dear-give", "dear-fast"]) {
    const state = D.normalizeDearState(id);
    assert.equal(Object.keys(state.fields).length, id === "dear-man" ? 10 : 11);
    for (const key of Object.keys(state.fields)) state.fields[key] = `My ${key} <&> words`;
    state.summaryBuilt = true;
    assert.ok(D.dearStateValid(id, state));
    assert.equal(D.dearStateValid(id, { ...state, unexpected: true }), false);
    assert.equal(D.dearStateValid(id, { ...state, fields: { ...state.fields, describe: [] } }), false);
    const config = { toolId: id, toolTitle: D.DEAR_DEFINITIONS[id].title, route: P.TOOL_ROUTES[id], schemaVersion: 1, validateState: next => D.dearStateValid(id, next) };
    const record = P.makeRecord(config, state);
    const summary = D.dearSummary(id, state);
    for (const value of Object.values(state.fields)) assert.ok(summary.includes(value), `${id} missing export field: ${value}`);
    const parsed = P.parseProgress(P.serializeMarkdown(record, summary));
    assert.deepEqual(P.validateForTool(parsed.record, config).state, state);
    const bytes = await P.makeDocx(config.toolTitle, summary).arrayBuffer();
    const xml = new TextDecoder().decode(bytes);
    assert.ok(xml.includes("My finalScript &lt;&amp;&gt; words"));
    assert.ok(xml.includes("word/document.xml"));
  }
  const legacy = { fields: Object.fromEntries(["describe", "express", "assert", "reinforce", "mindful", "appear", "negotiate", "gentle"].map(k => [k, k])), summaryBuilt: true };
  assert.ok(D.dearStateValid("dear-man", legacy));
  const normalized = D.normalizeDearState("dear-man", legacy);
  assert.equal(normalized.fields.situation, "");
  assert.equal(normalized.fields.finalScript, "describe express assert reinforce");
  assert.ok(!D.dearSummary("dear-man", legacy).includes("gentle"));
  assert.equal(D.normalizeDearState("dear-man", { ...normalized, fields: { ...normalized.fields, finalScript: "My edited script" } }).fields.finalScript, "My edited script");
  assert.match(D.DEAR_PROMPT, /Do not use threats, guilt, deception or pressure tactics/);
  assert.match(D.DEAR_PROMPT, /several options/);
  const catalogue = JSON.parse(fs.readFileSync("site/data/tool-finder/catalogue.json"));
  assert.equal(new Set(catalogue.entries.map(e => e.id)).size, catalogue.entries.length);
  for (const id of Object.keys(D.DEAR_DEFINITIONS)) {
    const entry = catalogue.entries.find(e => e.id === id);
    assert.equal(entry.tool_href, P.TOOL_ROUTES[id]);
    assert.equal(entry.kind, "tool");
    assert.equal(entry.official_topic, "Interpersonal Effectiveness");
  }
  console.log("DEAR tools: fields, validation, legacy normalization, Markdown round-trip, complete DOCX exports, prompt and catalogue passed");
})().catch(error => { console.error(error); process.exitCode = 1; });

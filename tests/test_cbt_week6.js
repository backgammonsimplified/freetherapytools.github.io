"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const cbt = require("../site/assets/cbt-practice.js");
const progress = require("../site/assets/skill-progress.js");
const site = require("../site/assets/site-path.js");

for (const kind of ["avoidance", "safety-behaviours", "exposure"]) {
  const state = cbt.initial(kind);
  state.items = [cbt.newItem(kind), cbt.newItem(kind)];
  const fields = kind === "avoidance" ? cbt.AVOIDANCE : kind === "exposure" ? cbt.RUNG : cbt.BEHAVIOUR;
  state.items.forEach((item, i) => {
    fields.forEach(([key, , , type]) => { item[key] = type === "number" ? "72" : `Synthetic ${i} ${key} <>&`; });
    if (kind === "safety-behaviours") { item.name = i ? "Custom behaviour" : cbt.CATEGORIES[0][1][0]; item.selected = i === 0; }
    else item.practice = [0, 1].map(n => Object.fromEntries(cbt.PRACTICE.map(([key, , , type]) => [key, type === "number" ? "90" : type === "date" ? "2026-09-05" : `Attempt ${n}: ${key}`])));
  });
  if (kind === "exposure") { state.fear = "Group discussion"; state.goal = "Join a book club"; state.safety = "Rehearsal"; state.next = "Repeat"; }
  const config = { toolId: kind, toolTitle: kind, route: progress.TOOL_ROUTES[kind], schemaVersion: 1, validateState: s => cbt.validate(kind, s) };
  assert.equal(cbt.validate(kind, state), true);
  const text = cbt.summary(kind, state);
  const record = progress.makeRecord(config, state);
  for (const serialized of [progress.serializeJson(record), progress.serializeMarkdown(record, text)]) {
    const parsed = progress.parseProgress(serialized).record;
    assert.deepEqual(progress.validateForTool(parsed, config).state, state);
  }
  fields.forEach(([key]) => state.items.forEach(item => assert.ok(text.includes(item[key]), `Export includes ${kind}/${key}`)));
  assert.equal(site.path(config.route, "/freetherapytools.github.io"), `/freetherapytools.github.io/tool-finder/${kind}/`);
  if (kind !== "safety-behaviours") {
    assert.match(text, /Attempt 0: learned/); assert.match(text, /Attempt 1: learned/);
    assert.match(text, /90/); // High after-anxiety never fails an attempt.
    const bad = structuredClone(state); bad.items[0].difficulty = "101"; assert.equal(cbt.validate(kind, bad), false);
    bad.items[0].difficulty = ""; assert.equal(cbt.validate(kind, bad), true);
    bad.items[0].practice[0].after = "-1"; assert.equal(cbt.validate(kind, bad), false);
  }
  assert.equal(cbt.validate(kind, {items:[null]}), false);
  assert.equal(cbt.validate(kind, []), false);
}
const old = { theme: "Old fear", safety: "Old safety", next: "Old next", steps: [{situation:"First step", before:"0", after:"95"}] };
assert.equal(cbt.validate("exposure", old), true);
const migrated = cbt.normalize("exposure", old);
assert.equal(migrated.items[0].practice[0].after, "95");
assert.equal(migrated.fear, old.theme);
assert.equal(migrated.safety, old.safety);
assert.equal(migrated.next, old.next);
assert.equal(migrated.goal, "");
assert.equal(cbt.validate("exposure", migrated), true);
assert.equal(cbt.CATEGORIES.length, 7);
assert.equal(new Set(cbt.CATEGORIES.flatMap(([,names])=>names)).size, cbt.CATEGORIES.flatMap(([,names])=>names).length);
assert.match(cbt.prompt(), /\[DESCRIBE THE FEAR\]/);
assert.match(cbt.prompt("fear", "goal"), /15–25/);
assert.match(cbt.prompt("fear", "goal"), /medical limitations, trauma boundaries/);
const runtime = fs.readFileSync(require.resolve("../site/assets/cbt-practice.js"), "utf8");
assert.ok(!/fetch\(|localStorage|sessionStorage|URLSearchParams|location\./.test(runtime), "No second storage system or transmission of personal text");
// Exercise the real event handlers with a small DOM boundary stub. Browser QA
// separately checks actual layout, labels, focus and clipboard interaction.
function mount(kind) {
  let config, notifications = 0;
  const listeners = {}, nodes = new Map();
  const root = {
    innerHTML: "",
    addEventListener: (name, handler) => { listeners[name] = handler; },
    querySelectorAll: () => [],
    querySelector: selector => {
      if (!nodes.has(selector)) nodes.set(selector, { value: "", textContent: "", focus() {} });
      return nodes.get(selector);
    },
  };
  global.TherapySite = { path: value => site.path(value, "/freetherapytools.github.io") };
  global.TherapySkillProgress = { TOOL_ROUTES: progress.TOOL_ROUTES, registerTool: next => { config = next; return {notifyChange: () => { notifications++; }}; } };
  global.confirm = () => true;
  cbt.init(root, kind);
  const click = (action, index = 0) => listeners.click({target: {closest: () => ({dataset: {cbtAction: action, item: String(index)}, disabled: false})}});
  const input = (key, value, index = 0, attempt) => listeners.input({target: {value, dataset: {cbtField: key, item: String(index), ...(attempt === undefined ? {} : {practice: String(attempt)})}}});
  const choice = (value, checked) => listeners.change({target: {matches: () => true, checked, dataset: {cbtChoice: value}}});
  return {root, click, input, choice, state: () => config.getState(), config: () => config, notifications: () => notifications};
}
for (const kind of ["avoidance", "exposure"]) {
  const app = mount(kind);
  if (kind === "avoidance") app.click("add");
  app.input("situation", "First <safe> step");
  app.click("practice"); app.input("learned", "Learning despite anxiety", 0, 0); app.input("after", "95", 0, 0);
  app.click("practice"); app.input("learned", "Repeated learning", 0, 1);
  app.click("add"); app.input("situation", "Second step", 1);
  assert.equal(app.state().items.length, 2);
  assert.equal(app.state().items[0].practice.length, 2);
  assert.ok(app.root.innerHTML.includes("First &lt;safe&gt; step"));
  if (kind === "exposure") {
    app.click("up", 0);
    assert.equal(app.state().items[1].practice[0].after, "95");
    assert.ok(app.root.innerHTML.indexOf("First &lt;safe&gt; step") < app.root.innerHTML.indexOf("Second step"));
    app.click("down", 1);
    app.click("duplicate", 0);
    assert.equal(app.state().items[1].situation, "First <safe> step");
    assert.deepEqual(app.state().items[1].practice, []);
    app.click("remove", 1);
  }
  app.click("remove", 1);
  assert.equal(app.state().items.length, 1);
  assert.equal(app.state().items[0].practice[1].learned, "Repeated learning");
  assert.ok(app.notifications() >= 4);
  const saved = app.state(); app.config().setState(saved);
  assert.deepEqual(app.state(), saved);
  saved.items[0].situation = "Changed returned copy";
  assert.notEqual(app.state().items[0].situation, saved.items[0].situation);
  assert.ok(app.root.innerHTML.includes("/freetherapytools.github.io/learn/"));
}
const safetyApp = mount("safety-behaviours");
safetyApp.choice("0-0", true); safetyApp.input("fear", "Feared outcome"); safetyApp.choice("1-0", true);
safetyApp.root.querySelector("#cbt-custom").value = "My custom behaviour";
safetyApp.click("custom");
assert.equal(safetyApp.state().items.length, 3);
safetyApp.choice("0-0", false);
assert.equal(safetyApp.state().items[0].selected, false);
assert.equal(safetyApp.state().items[0].fear, "Feared outcome");
safetyApp.choice("0-0", true);
assert.equal(safetyApp.state().items.length, 3);
assert.equal(safetyApp.state().items[0].selected, true);
for (const [, label] of cbt.BEHAVIOUR) assert.ok(safetyApp.root.innerHTML.includes(label));
console.log("CBT Week 6 state, event workflows, migration, repeated practice, export, privacy, and base-path checks passed");

"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("../site/assets/site-path.js");
const catalogue = JSON.parse(fs.readFileSync("site/data/tool-finder/catalogue.json", "utf8"));

async function test(base) {
  const nodes = new Map();
  function element(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: "", innerHTML: "", textContent: "", hidden: false, events: {},
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute() {}, before() {}, after() {},
    });
    return nodes.get(selector);
  }
  let ready, requested;
  const context = {
    window: { TherapySite: { path: value => path.path(value, base) } },
    document: { querySelector: element, querySelectorAll: () => [], addEventListener: (_name, fn) => { ready = fn; } },
    fetch: async url => { requested = url; return {ok: true, json: async () => catalogue}; },
    console: {error: error => { throw error; }},
  };
  vm.runInNewContext(fs.readFileSync("site/assets/tool-finder.js", "utf8"), context);
  await ready();
  assert.equal(requested, base + "/data/tool-finder/catalogue.json");
  const search = element("[data-tool-finder-search]"), host = element("[data-tool-finder-catalogue]");
  for (const [query, id, anchor] of [
    ["putting things off", "avoidance", "avoidance-and-approach"],
    ["approach", "avoidance", "avoidance-and-approach"],
    ["safety behavior", "safety-behaviours", "safety-behaviours"],
    ["rehearsing", "safety-behaviours", "safety-behaviours"],
    ["fear ladder", "exposure", "fear-ladder"],
    ["graded exposure", "exposure", "fear-ladder"],
  ]) {
    search.value = query; search.events.input();
    assert.ok(host.innerHTML.includes(`data-tool-finder-entry="${id}"`), query);
    assert.ok(host.innerHTML.includes(`${base}/tool-finder/${id}/`), query);
    assert.ok(host.innerHTML.includes(`${base}/learn/cbt-anxiety/safety-behaviours-exposure.html#${anchor}`), query);
    assert.equal(element("[data-tool-finder-empty]").hidden, true);
  }
}
Promise.all([test(""), test("/freetherapytools.github.io")]).then(() => {
  console.log("CBT Tool Finder runtime search, canonical links and base-path checks passed");
}).catch(error => { console.error(error); process.exitCode = 1; });

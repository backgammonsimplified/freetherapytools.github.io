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
  const tocItems = new Map();
  const sections = catalogue.topics.map((topic, index) => {
    const cards = element(`cards-${index}`);
    const heading = {id: `topic-${index}`};
    const item = element(`toc-${index}`);
    tocItems.set(topic, item);
    return {
      dataset: {toolFinderTopic: topic}, hidden: false, setAttribute() {},
      querySelector: selector => selector === "h2[id]" ? heading : cards,
    };
  });
  const tocLinks = sections.map((section, index) => ({
    hash: `#topic-${index}`, closest: () => tocItems.get(section.dataset.toolFinderTopic),
  }));
  let ready, requested;
  const context = {
    window: { TherapySite: { path: value => path.path(value, base) } },
    document: {
      querySelector: element,
      querySelectorAll: selector => selector === "[data-tool-finder-topic]" ? sections : selector === "#TOC a[href]" ? tocLinks : [],
      addEventListener: (_name, fn) => { ready = fn; },
    },
    fetch: async url => { requested = url; return {ok: true, json: async () => catalogue}; },
    console: {error: error => { throw error; }},
  };
  vm.runInNewContext(fs.readFileSync("site/assets/tool-finder.js", "utf8"), context);
  await ready();
  assert.equal(requested, base + "/data/tool-finder/catalogue.json");
  const search = element("[data-tool-finder-search]");
  const cbt = sections.find(section => section.dataset.toolFinderTopic === "CBT and Managing Anxiety");
  const host = cbt.querySelector("[data-tool-finder-cards]");
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
    assert.equal(cbt.hidden, false, query);
    assert.equal(tocItems.get("CBT and Managing Anxiety").hidden, false, query);
  }
  search.value = "no-matching-tool-12345"; search.events.input();
  assert.equal(element("[data-tool-finder-empty]").hidden, false);
  assert.ok(sections.every(section => section.hidden));
  assert.ok([...tocItems.values()].every(item => item.hidden));
}
Promise.all([test(""), test("/freetherapytools.github.io")]).then(() => {
  console.log("CBT Tool Finder runtime search, canonical links and base-path checks passed");
}).catch(error => { console.error(error); process.exitCode = 1; });

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apps = require(path.join(root, "site", "assets", "skill-apps.js"));
const progress = require(path.join(root, "site", "assets", "skill-progress.js"));
const data = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "skill-apps", "values.json"), "utf8"));

assert.equal(apps.DEFAULT_VALUE_DISPLAY, 32);
const expectedTiers = [...[16, 32, 64, 128].filter((size) => size < data.values.length), data.values.length];
assert.deepEqual(apps.valueDisplayOptions(data.values), expectedTiers);
assert.equal(apps.valueDisplayOptions(data.values).at(-1), data.values.length);

let previous = new Set();
for (const size of apps.valueDisplayOptions(data.values)) {
  const visible = apps.canonicalValuesForDisplay(data.values, size);
  assert.equal(visible.length, size);
  assert.deepEqual(visible.map((value) => value.name), [...visible].map((value) => value.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  const ids = new Set(visible.map((value) => value.id));
  for (const id of previous) assert.ok(ids.has(id), `${id} disappeared from the ${size} tier`);
  previous = ids;
}

const courage = data.values.find((value) => value.id === "courage");
assert.ok(courage.aliases.includes("Bravery"));
assert.deepEqual(apps.canonicalValuesForDisplay(data.values, 16, "bravery").map((value) => value.id), ["courage"]);
const stewardship = data.values.find((value) => value.id === "stewardship");
assert.ok(stewardship.display_rank > 16);
assert.deepEqual(apps.canonicalValuesForDisplay(data.values, 16, "Stewardship").map((value) => value.id), [stewardship.id]);
assert.equal(apps.canonicalValuesForDisplay(data.values, 16, "resources").some((value) => value.id === stewardship.id), true);

assert.equal(apps.isCategorizationComplete({ selectedDomains: [], domainImportance: {} }), false);
assert.equal(apps.isCategorizationComplete({ selectedDomains: ["health"], domainImportance: {} }), false);
assert.equal(apps.isCategorizationComplete({ selectedDomains: ["health"], domainImportance: { health: "High" } }), true);
assert.equal(apps.isCategorizationComplete({ selectedDomains: ["health", "friendship"], domainImportance: { health: "High" } }), false);
assert.equal(apps.isCategorizationComplete({ selectedDomains: ["health", "friendship"], domainImportance: { health: "High", friendship: "Low" } }), true);

const domains = [{ id: "high", name: "High" }, { id: "medium", name: "Medium" }, { id: "low", name: "Low" }];
const ranked = apps.rankDomainAssessments(domains, {
  domainImportance: { high: "High", medium: "Medium", low: "Low" },
  assessments: Object.fromEntries(domains.map((domain) => [domain.id, { current: 3, desired: 7 }])),
});
assert.deepEqual(ranked.map((item) => item.domain.id), ["high", "medium", "low"]);
assert.equal(ranked[0].attentionScore, 4);
assert.equal(ranked[1].attentionScore, 8 / 3);
assert.equal(ranked[2].attentionScore, 4 / 3);
assert.ok(Math.abs(ranked[0].relativeScore - 50) < 1e-9);
assert.ok(Math.abs(ranked[1].relativeScore - 33.3333333333) < 0.001);
assert.ok(Math.abs(ranked[2].relativeScore - 16.6666666667) < 0.001);
assert.deepEqual(ranked.map((item) => item.displayPercent), [50, 33, 17]);
assert.equal(ranked.reduce((sum, item) => sum + item.displayPercent, 0), 100);

const exampleShares = apps.rankDomainAssessments(domains, {
  domainImportance: { high: "High", medium: "Medium", low: "Low" },
  assessments: { high: { current: 3, desired: 7 }, medium: { current: 3, desired: 6 }, low: { current: 3, desired: 6 } },
});
assert.deepEqual(exampleShares.map((item) => item.attentionScore), [4, 2, 1]);
assert.ok(Math.abs(exampleShares[0].relativeScore - 57.142857142857) < 1e-9);
assert.ok(Math.abs(exampleShares[1].relativeScore - 28.571428571429) < 1e-9);
assert.ok(Math.abs(exampleShares[2].relativeScore - 14.285714285714) < 1e-9);
assert.deepEqual(exampleShares.map((item) => item.displayPercent), [57, 29, 14]);

for (let seed = 1; seed <= 50; seed += 1) {
  const syntheticDomains = Array.from({ length: 9 }, (_unused, index) => ({ id: `domain-${index}`, name: `Domain ${index}` }));
  const synthetic = apps.rankDomainAssessments(syntheticDomains, {
    domainImportance: Object.fromEntries(syntheticDomains.map((domain, index) => [domain.id, ["High", "Medium", "Low"][(seed + index) % 3]])),
    assessments: Object.fromEntries(syntheticDomains.map((domain, index) => [domain.id, { current: 1, desired: 1 + ((seed * (index + 3)) % 10) }])),
  });
  const hasPositiveScore = synthetic.some((item) => item.attentionScore > 0);
  assert.equal(synthetic.reduce((sum, item) => sum + item.displayPercent, 0), hasPositiveScore ? 100 : 0, `display allocation ${seed} has an exact total`);
  assert.ok(synthetic.filter((item) => item.attentionScore === 0).every((item) => item.displayPercent === 0));
}

const single = apps.rankDomainAssessments(domains.slice(0, 2), { domainImportance: { high: "High", medium: "Medium" }, assessments: { high: { current: 1, desired: 2 }, medium: { current: 5, desired: 5 } } });
assert.deepEqual(single.map((item) => item.displayPercent), [100, 0]);
const equal = apps.rankDomainAssessments(domains.slice(0, 2), { domainImportance: { high: "High", medium: "High" }, assessments: { high: { current: 1, desired: 2 }, medium: { current: 1, desired: 2 } } });
assert.deepEqual(equal.map((item) => item.displayPercent), [50, 50]);

const zeroes = apps.rankDomainAssessments(domains.slice(0, 2), {
  domainImportance: { high: "High", medium: "Medium" },
  assessments: { high: { current: 7, desired: 3 }, medium: { current: 5, desired: 5 } },
});
assert.deepEqual(zeroes.map((item) => item.attentionScore), [0, 0]);
assert.deepEqual(zeroes.map((item) => item.relativeScore), [0, 0]);
assert.deepEqual(zeroes.map((item) => item.displayPercent), [0, 0]);

const custom = { id: "custom-1", name: "My wording", definition: "Mine", suggested_domains: [], aliases: [] };
const migrated = apps.migrateValueRecords(data, {
  selected: { courage: { rating: "Medium" }, bravery: { rating: "High" }, perfection: { rating: "Low" }, "custom-1": { rating: "High" } },
  custom: [custom],
  domains: { courage: ["health"], bravery: ["friendship"], perfection: ["health"], "custom-1": ["health"] },
  actions: {}, focus: ["bravery", "courage"],
});
assert.deepEqual(Object.keys(migrated.selected).sort(), ["courage", "custom-1", "perfection"]);
assert.equal(migrated.selected.courage.rating, "High");
assert.deepEqual(migrated.domains.courage.sort(), ["friendship", "health"]);
assert.deepEqual(migrated.focus, ["courage"]);
assert.equal(migrated.legacy.find((value) => value.id === "perfection").name, "Perfection");
assert.equal(migrated.selected[custom.id].rating, "High");

const legacyState = { step: 1, selected: { bravery: { rating: "High" } }, custom: [], selectedDomains: ["health"], domainImportance: { health: "Medium" }, domains: { bravery: ["health"] }, assessments: {}, focus: [], actions: {}, barriers: {}, mission: { statement: "Manual mission", autoGenerated: false } };
const record = progress.makeRecord({ toolId: "values", toolTitle: "Values", route: "/skill-finder/values/", schemaVersion: 1 }, legacyState, new Date("2026-08-23T12:00:00Z"));
for (const serialized of [progress.serializeMarkdown(record, "# Values"), progress.serializeJson(record)]) {
  const restored = progress.parseProgress(serialized).record.state;
  assert.equal(apps.isCategorizationComplete(restored), true);
  assert.ok(apps.migrateValueRecords(data, restored).selected.courage);
  assert.equal(restored.mission.statement, "Manual mission");
  assert.equal(restored.mission.autoGenerated, false);
}

const historyState = { ...legacyState, step: 1, furthestStep: 3 };
const historyRecord = progress.makeRecord({ toolId: "values", toolTitle: "Values", route: "/skill-finder/values/", schemaVersion: 1 }, historyState, new Date("2026-08-23T12:05:00Z"));
for (const serialized of [progress.serializeMarkdown(historyRecord, "# Values"), progress.serializeJson(historyRecord)]) {
  const restored = progress.parseProgress(serialized).record.state;
  assert.equal(restored.step, 1);
  assert.equal(restored.furthestStep, 3);
}

assert.equal(apps.migrateValuesStep({ step: 4, domainImportance: {} }), 5);
assert.equal(apps.migrateValuesStep({ step: 6, domainImportance: {} }), 4);
assert.equal(apps.migrateValuesStep({ step: 4, domainImportance: {}, act: {} }), 4);
assert.equal(apps.migrateValuesFurthestStep({ step: 1, furthestStep: 3 }, 1), 3);
assert.equal(apps.migrateValuesFurthestStep({ step: 1, assessments: { health: { current: 3, desired: 7 } } }, 1), 3);
assert.equal(apps.migrateValuesFurthestStep({ step: 1 }, 1), 1);

const missionData = {
  domains: [{ id: "a", name: "Domain A" }, { id: "b", name: "Domain B" }],
  values: [
    { id: "x", name: "Value X", definition: "", aliases: [] },
    { id: "z", name: "Value Z", definition: "", aliases: [] },
    { id: "shared", name: "Shared", definition: "", aliases: [] },
  ],
};
const missionState = {
  selectedDomains: ["a", "b"], domainImportance: { a: "High", b: "Medium" },
  assessments: { a: { current: 2, desired: 6 }, b: { current: 2, desired: 5 } },
  selected: { x: { rating: "Medium" }, z: { rating: "High" }, shared: { rating: "Low" } }, custom: [], legacy: [],
  domains: { x: ["a"], z: ["b"], shared: ["a", "b"] },
};
const missionDirections = apps.rankedMissionDirections(missionData, missionState);
assert.deepEqual(missionDirections.map((item) => item.domain.id), ["a", "b"]);
assert.deepEqual(missionDirections[0].values.map((value) => value.id), ["x", "shared"]);
assert.deepEqual(missionDirections[1].values.map((value) => value.id), ["z"]);

const choices = Array.from({ length: 20 }, (_unused, index) => ({ id: `choice-${index}` }));
const orderedA = apps.deterministicOrder(choices, "test-seed", "scope");
const orderedB = apps.deterministicOrder(choices, "test-seed", "scope");
assert.deepEqual(orderedA, orderedB);
const pageOne = apps.suggestionPage(orderedA, 0);
const pageTwo = apps.suggestionPage(orderedA, 1);
assert.equal(pageOne.length, 10);
assert.equal(pageTwo.length, 10);
assert.equal(pageOne.some((item) => pageTwo.includes(item)), false);
assert.equal(apps.suggestionPage(orderedA, 1, 10, pageOne[0].id)[0].id, pageOne[0].id);

console.log("Values tiers, ranking, migration, and suggestion checks passed");

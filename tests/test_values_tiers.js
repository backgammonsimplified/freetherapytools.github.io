"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apps = require(path.join(root, "site", "assets", "skill-apps.js"));
const data = JSON.parse(fs.readFileSync(path.join(root, "site", "data", "skill-apps", "values.json"), "utf8"));

assert.equal(apps.DEFAULT_VALUE_DISPLAY, 32);
assert.deepEqual(apps.VALUE_DISPLAY_OPTIONS, [16, 32, 64, 128, 256, "all"]);

let previous = new Set();
for (const size of [16, 32, 64, 128, 256]) {
  const visible = apps.canonicalValuesForDisplay(data.values, size);
  assert.equal(visible.length, size);
  const ids = new Set(visible.map((value) => value.id));
  for (const id of previous) assert.ok(ids.has(id), `${id} disappeared from the ${size} tier`);
  previous = ids;
}

assert.equal(apps.canonicalValuesForDisplay(data.values, "all").length, 257);
assert.deepEqual(
  apps.canonicalValuesForDisplay(data.values, 16).map((value) => value.name),
  data.values.filter((value) => value.display_rank <= 16).sort((a, b) => a.display_rank - b.display_rank).map((value) => value.name),
);

const stewardship = data.values.find((value) => value.name === "Stewardship");
assert.ok(stewardship.display_rank > 16);
assert.deepEqual(apps.canonicalValuesForDisplay(data.values, 16, "Stewardship").map((value) => value.id), [stewardship.id]);
assert.equal(apps.canonicalValuesForDisplay(data.values, 16, "resources").map((value) => value.id).includes(stewardship.id), true);

const selected = { [stewardship.id]: { rating: "High" } };
const before = JSON.stringify(selected);
apps.canonicalValuesForDisplay(data.values, 16);
assert.equal(JSON.stringify(selected), before, "changing tiers must not mutate selected values");

console.log("Values tier unit checks passed");

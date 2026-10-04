const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../site/assets/resource-match-review.js"), "utf8");
const button = { hidden: true, setAttribute(key, value) { this[key] = value; } };
const status = { textContent: "" };
const cards = [
  { dataset: { matchId: "published" }, querySelector() { return null; } },
  { dataset: { matchId: "reviewable" }, querySelector(selector) {
    return selector === ".bs-match-review-control" ? button : status;
  } }
];
const counts = [{ textContent: "" }];
vm.runInNewContext(script, {
  URLSearchParams,
  window: {
    location: { hostname: "localhost", search: "" },
    localStorage: { getItem() {
      return JSON.stringify({ schema_version: 1, incorrect_matches: { reviewable: {} } });
    } }
  },
  document: {
    documentElement: { classList: { add() {} } },
    addEventListener(event, callback) { if (event === "DOMContentLoaded") callback(); },
    querySelectorAll(selector) {
      if (selector === ".bs-resource-match") return cards;
      if (selector === "[data-match-review-incorrect-count]") return counts;
      if (selector === ".bs-match-review-control, [data-review-only]") return [button];
      return [];
    }
  }
});
assert.equal(cards[0].dataset.matchReviewState, "unflagged");
assert.equal(cards[1].dataset.matchReviewState, "incorrect");
assert.equal(button["aria-pressed"], "true");
assert.equal(status.textContent, "Marked incorrect");
assert.equal(counts[0].textContent, "1");
console.log("Resource review tolerates published cards without controls and paints reviewable cards.");

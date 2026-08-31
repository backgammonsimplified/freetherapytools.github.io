"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
global.TherapySkillProgress = {
  isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  },
  nonEmptySections(title, sections) {
    return [title, ...sections.flatMap(([heading, value]) => {
      const values = Array.isArray(value) ? value : [value];
      const present = values.filter(Boolean);
      return present.length ? [heading, ...present] : [];
    })].join("\n");
  },
};

const app = require(path.join(root, "site", "assets", "skill-finder-apps.js"));
const emotions = JSON.parse(
  fs.readFileSync(path.join(root, "site", "data", "skill-apps", "emotions.json"), "utf8")
).emotions;
const index = app.buildEmotionClueIndex(emotions);

assert.equal(app.EMOTION_CLUE_CATEGORIES.length, 7);
assert.deepEqual(
  app.EMOTION_CLUE_CATEGORIES.map(({ label }) => label),
  [
    "Words or feelings",
    "Body sensations / changes",
    "What was happening",
    "Thoughts / interpretations",
    "Action urges",
    "Expressions / actions",
    "Aftereffects",
  ]
);
assert.equal(emotions.length, 10);
assert.ok(index.flatMap(({ clues }) => clues).some(({ emotionIds }) => emotionIds.length > 1));

const sharedClue = index.flatMap(({ clues }) => clues).find(({ emotionIds }) => emotionIds.length > 1);
const singleClue = index.flatMap(({ clues }) => clues).find(({ emotionIds }) => emotionIds.length === 1);
const selectedClues = Object.fromEntries(app.EMOTION_CLUE_CATEGORIES.map(({ key }) => [key, []]));
selectedClues[sharedClue.category].push(sharedClue.id);
selectedClues[singleClue.category].push(singleClue.id);
const state = app.normalizeEmotionExplorerState({ selectedClues }, emotions, index);
const matches = app.emotionRoughMatches(emotions, index, state);
assert.ok(matches.some(({ percentage }) => percentage === 50));
assert.ok(matches.some(({ percentage }) => percentage === 100));
assert.notEqual(matches.reduce((sum, match) => sum + match.percentage, 0), 100);
matches.forEach((match) => {
  assert.equal(
    match.percentage,
    Math.round(match.matchedSelectedClues / match.totalSelectedClues * 100)
  );
});

const oldState = {
  step: 3,
  emotion: "fear",
  words: [emotions.find(({ id }) => id === "fear").related_words[0]],
  regions: ["chest / heart"],
  details: { body: "tight chest" },
};
const migrated = app.normalizeEmotionExplorerState(oldState, emotions, index);
assert.equal(migrated.mode, "explore");
assert.equal(migrated.explore.emotion, "fear");
assert.deepEqual(migrated.legacy.regions, oldState.regions);
assert.deepEqual(migrated.legacy.details, oldState.details);
assert.deepEqual(
  app.normalizeEmotionExplorerState(JSON.parse(JSON.stringify(migrated)), emotions, index),
  migrated
);

const summary = app.emotionExplorerSummary(state, emotions, index);
assert.match(summary, /selected clues/);
assert.match(summary, /\d+% - \d+ of 2 selected clues/);
assert.ok(summary.includes(app.EMOTION_MATCH_DISCLAIMER));

console.log("Emotion Explorer clue matching, migration, and export tests passed.");

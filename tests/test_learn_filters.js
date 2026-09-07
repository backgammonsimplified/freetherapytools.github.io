"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const learn = require("../site/assets/bs-learn.js");
const glossary = require("../site/assets/bs-glossary.js");

const lessons = [
  {
    difficulties: ["Beginner"],
    tracks: ["Mindfulness"],
    terms: ["wise-mind"],
    primarySearchValues: ["Introduction and States of Mind"],
    bodySearchValues: ["Balance emotion and reason"],
    searchValues: ["Introduction and States of Mind", "Balance emotion and reason"],
    originalIndex: 0
  },
  {
    difficulties: ["Intermediate"],
    tracks: ["Emotional Regulation"],
    terms: [],
    primarySearchValues: ["Check the Facts"],
    bodySearchValues: ["Separate observations from interpretations"],
    searchValues: ["Check the Facts", "Separate observations from interpretations"],
    originalIndex: 1
  }
];

assert.equal(learn.isMobileDrawerSwipe(20, 100, 48, 103), true);
assert.equal(learn.isMobileDrawerSwipe(80, 100, 20, 102), false);
assert.equal(learn.normalizeLearnSearch("  Wise-Mínd  "), "wise mind");
assert.equal(
  learn.itemMatchesTaxonomy(lessons[0], ["Beginner"], ["Mindfulness"]),
  true
);
assert.equal(
  learn.itemMatchesTaxonomy(lessons[0], ["Intermediate"], ["Mindfulness"]),
  false
);
assert.equal(
  learn.itemMatchesLesson(lessons[0], "states", ["Beginner"], ["wise-mind"]),
  true
);
assert.equal(
  learn.itemMatchesLesson(lessons[0], "facts", ["Beginner"], []),
  false
);
assert.deepEqual(
  learn.rankLessonItems(lessons, "check the facts").map((item) => item.originalIndex),
  [1, 0]
);

const groups = [{ open: true, hidden: false }, { open: true, hidden: false }];
assert.deepEqual(learn.groupControlState(groups), {
  collapseDisabled: false,
  expandDisabled: true
});
learn.setAllGroupsExpanded(groups, false);
assert.equal(groups.every((group) => group.open === false), true);

const lookupData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "site", "assets", "bs-glossary-lookup.json"),
    "utf8"
  )
);
assert.equal(lookupData.entries.length, 1);
assert.equal(learn.bestLookupEntry(lookupData.entries, "Wise Mind").slug, "wise-mind");
assert.equal(
  learn.canonicalShortDefinition(lookupData.entries, "wise-mind"),
  "Wise Mind is the integrated perspective that draws on both emotion and reason."
);

const glossaryItem = {
  category: "Mindfulness",
  categories: ["Mindfulness"],
  tracks: [],
  searchValues: ["Wise Mind", "emotion and reason"],
  canonical: "Wise Mind",
  aliases: [],
  element: { open: false }
};
assert.equal(
  glossary.itemMatchesGlossary(glossaryItem, "emotion", ["Mindfulness"], []),
  true
);
assert.equal(
  glossary.itemMatchesGlossary(glossaryItem, "emotion", ["Goal Setting"], []),
  false
);
assert.equal(glossary.normalizeSearch("Wise-Mínd"), "wise mind");
assert.equal(glossary.expandBestGlossaryMatch([glossaryItem], [glossaryItem], "wise").canonical, "Wise Mind");
assert.equal(glossaryItem.element.open, true);
glossary.closeTermEntries([glossaryItem]);
assert.equal(glossaryItem.element.open, false);

assert.deepEqual(glossary.glossaryStateFromSearch("?q=wise+mind&category=Mindfulness"), {
  query: "wise mind",
  categories: ["Mindfulness"],
  tracks: []
});
assert.equal(
  glossary.urlWithoutGlossaryFilters(
    "https://example.test/glossary/?q=wise&category=Mindfulness#wise-mind"
  ),
  "https://example.test/glossary/#wise-mind"
);
assert.equal(
  glossary.canonicalSlugForFragment(
    [{ slug: "wise-mind", aliasSlugs: [] }],
    "wise-mind"
  ),
  "wise-mind"
);

console.log("Learn and glossary filter checks passed.");

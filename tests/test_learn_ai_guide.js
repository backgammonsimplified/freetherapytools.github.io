"use strict";

const assert = require("node:assert/strict");
const guide = require("../site/assets/learn-ai-guide.js");

const context = {
  title: "Clarifying Priorities & Myths",
  description: "Balance objectives, the relationship, and self-respect in an interaction.",
  track: "interpersonal-effectiveness",
  topics: ["Clarifying Goals", "Clarifying Priorities"],
  resources: [{ id: "sheet-1", title: "Clarifying Priorities in Interpersonal Situations", kind: "Printable Worksheet", shape: "planner", summary: "Describe and rank three goals for one interaction." }],
};

assert.equal(guide.resourceShape("Factors in the Way", "Printable Handout"), "checklist");
assert.equal(guide.resourceShape("Challenging Myths: Objectives Effectiveness", "Printable Worksheet"), "worksheet");
assert.equal(guide.resourceShape("Weekly Mood Log", "Printable Worksheet"), "record");
assert.equal(guide.resourceShape("Weekly Goal", "Printable Worksheet"), "planner");
assert.equal(guide.resourceShape("Wise Mind", "Printable Handout"), "handout");

const worksheet = guide.promptText(context, { resourceId: "sheet-1", mode: "worksheet", delivery: "spoken" });
assert.match(worksheet, /Clarifying Priorities in Interpersonal Situations/);
assert.match(worksheet, /Describe and rank three goals/);
assert.match(worksheet, /follow the fields I read to you/);
assert.match(worksheet, /talk this through aloud/);
assert.match(worksheet, /You cannot see this sheet/);
assert.match(worksheet, /bring to my therapist/);
assert.doesNotMatch(worksheet, /PRIVATE WORKSHEET ANSWER/);

const practice = guide.promptText(context, { resourceId: "sheet-1", mode: "practice", delivery: "written" });
assert.match(practice, /two or three concrete options/);
assert.match(practice, /setting, time, energy/);
assert.match(practice, /safety, power differences/);
assert.match(practice, /work in writing/);

const generic = guide.promptText({ ...context, resources: [] }, {});
assert.match(generic, /do not pretend to see an unshared worksheet/i);
assert.doesNotMatch(generic, /Selected printable worksheet/);

for (const track of ["act", "cbt-anxiety", "distress-tolerance", "emotion-regulation", "goal-setting", "interpersonal-effectiveness", "mindfulness", "wellness"]) {
  const prompt = guide.promptText({ ...context, track, resources: [] }, { mode: "practice" });
  assert.match(prompt, /Lesson: Clarifying Priorities & Myths/);
  assert.doesNotMatch(prompt, /Stay within the lesson's educational scope/, track);
}

const toolPrompt = guide.promptText({ ...context, toolPage: true }, { resourceId: "sheet-1" });
assert.match(toolPrompt, /Interactive tool: Clarifying Priorities & Myths/);

console.log("Learn AI guide prompt checks passed.");

const assert = require("node:assert/strict");

global.TherapySkillProgress = require("../site/assets/skill-progress.js");
global.TherapyCalendar = {};
const tools = require("../site/assets/skill-quick-tools.js");

const pros = tools.initialProsConsState();
pros.urge = "Send an angry message";
pros.context = "I feel dismissed";
pros.lists.actingPros.push({ id: "a", text: "Immediate release", timeFrame: "short" });
pros.lists.actingCons.push({ id: "b", text: "Could damage trust", timeFrame: "long" });
pros.lists.resistingPros.push({ id: "c", text: "Time to choose words", timeFrame: "both" });
pros.lists.resistingCons.push({ id: "d", text: "Discomfort continues", timeFrame: "unsure" });
pros.standsOut = "The relationship matters";
pros.choice = "Wait and draft first";
pros.support = "Ask a friend to read it";
assert.equal(tools.validateProsConsState(pros), true);
assert.deepEqual(tools.prosConsTimeGroups(pros).short, ["Acting on the urge — pro: Immediate release"]);
assert.deepEqual(tools.prosConsTimeGroups(pros).long, ["Acting on the urge — con: Could damage trust"]);
assert.equal(tools.prosConsTimeGroups(pros).other.length, 2);
const moved = tools.reorderProsConsItem({ ...pros, lists: { ...pros.lists, actingPros: [{ id: "a", text: "one", timeFrame: "" }, { id: "e", text: "two", timeFrame: "" }] } }, "actingPros", 1, -1);
assert.equal(moved.lists.actingPros[0].id, "e");
const prosSummary = tools.prosConsSummary(pros);
for (const text of ["# Pros & Cons", "## Urge or problem behavior", "## Pros of acting on the urge", "Immediate release — Short term / today", "## Looking beyond the immediate moment", "Printable worksheet:", "Reference handout:"]) assert.match(prosSummary, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
const prosRecord = global.TherapySkillProgress.makeRecord({ toolId: "pros-and-cons", toolTitle: "Pros & Cons", route: "/tool-finder/pros-and-cons/", schemaVersion: 1 }, pros, new Date("2026-09-01T12:00:00Z"));
const prosRoundTrip = global.TherapySkillProgress.parseProgress(global.TherapySkillProgress.serializeJson(prosRecord));
assert.equal(prosRoundTrip.ok, true);
assert.deepEqual(prosRoundTrip.record.state, pros);

const trouble = tools.initialTroubleshootingState();
trouble.goal = "Set a boundary";
trouble.tried = "Used a DEAR MAN draft";
trouble.happened = "The other person refused";
const answers = ["yes", "no", "unsure", "yes", "no", "unsure"];
tools.TROUBLESHOOTING_AREAS.forEach((area, index) => {
  trouble.areas[area.id].answer = answers[index];
  trouble.areas[area.id].note = `note ${index + 1}`;
});
trouble.nextAdjustment = "Change timing and seek support";
trouble.successMeasure = "I can state the boundary clearly";
assert.equal(tools.validateTroubleshootingState(trouble), true);
const result = tools.troubleshootingResultAreas(trouble);
assert.deepEqual(result.yes.map((area) => area.id), ["skills", "emotions"]);
assert.deepEqual(result.unsure.map((area) => area.id), ["timeGoals", "environment"]);
trouble.areas.skills.answer = "no";
assert.equal(trouble.areas.environment.note, "note 6", "changing an earlier answer retains later notes");
assert.equal(trouble.areas.environment.answer, "unsure", "changing an earlier answer retains later answers");
const troubleSummary = tools.troubleshootingSummary(trouble);
for (const text of ["# Troubleshooting Interpersonal Effectiveness", "## What I am trying to do", "## Environment / power", "## What may be getting in the way", "## Next adjustment", "Handout 9, part 1:", "Handout 9, part 2:"]) assert.match(troubleSummary, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
const troubleRecord = global.TherapySkillProgress.makeRecord({ toolId: "interpersonal-troubleshooting", toolTitle: "Troubleshooting Interpersonal Effectiveness", route: "/tool-finder/interpersonal-troubleshooting/", schemaVersion: 1 }, trouble, new Date("2026-09-01T12:05:00Z"));
const troubleRoundTrip = global.TherapySkillProgress.parseProgress(global.TherapySkillProgress.serializeMarkdown(troubleRecord));
assert.equal(troubleRoundTrip.ok, true);
assert.deepEqual(troubleRoundTrip.record.state, trouble);

console.log("Focused distress/interpersonal tool tests passed");

"use strict";

const assert = require("node:assert/strict");
const handoff = require("../site/assets/skill-handoff.js");
const goal = require("../site/assets/skill-practice-apps.js");
const progress = require("../site/assets/skill-progress.js");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  setItem(key, value) { this.values.set(key, String(value)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const cryptoObject = { getRandomValues(bytes) { bytes.forEach((_value, index) => { bytes[index] = index + 1; }); return bytes; } };
const personal = { domain: "Close Relationships", values: ["Connection", "Courage"], what: "Reconnect with Sam", how: "Send Sam a message", mission: "Keep making room for connection" };
const token = handoff.storePayload(personal, { storage, cryptoObject, now: () => 1000, ttlMs: 5000 });
assert.match(token, /^[a-f0-9]{32}$/);
const route = handoff.goalBuilderUrl(token);
assert.equal(route, `/skill-finder/goal-builder/?handoff=${token}`);
for (const text of Object.values(personal).flat()) assert.equal(route.includes(String(text)), false);
assert.deepEqual(handoff.consumePayload(token, { storage, now: () => 2000 }), personal);
assert.equal(handoff.consumePayload(token, { storage, now: () => 2000 }), null, "handoff is consumed once");

const expired = handoff.storePayload(personal, { storage, cryptoObject, now: () => 1000, ttlMs: 10 });
assert.equal(handoff.consumePayload(expired, { storage, now: () => 1011 }), null);
assert.equal(storage.getItem(handoff.STORAGE_PREFIX + expired), null);

const prefill = goal.goalBuilderPrefill(personal);
assert.equal(prefill.fields.direction, "Connection and Courage in Close Relationships");
assert.equal(prefill.fields.specific, personal.how);
for (const key of ["measurable", "achievable", "relevant", "time", "smallest", "support"]) assert.equal(prefill.fields[key], "", `${key} must remain the person's answer`);
assert.deepEqual(prefill.context.values, personal.values);
const oldProgress = { fields: { direction: "Legacy direction", specific: "Legacy action", measurable: "", achievable: "", relevant: "", time: "", smallest: "", support: "" }, summaryBuilt: false };
const normalizedOld = goal.normalizeGoalState(oldProgress);
assert.equal(normalizedOld.fields.direction, "Legacy direction");
assert.equal(normalizedOld.fields.specific, "Legacy action");
assert.equal(normalizedOld.targetDate, "");
assert.equal(normalizedOld.calendar.enabled, false);
assert.equal(normalizedOld.calendar.scheduleType, "one-time");

const calendar = { enabled: true, date: "2026-09-15", startTime: "19:00", durationMinutes: "30" };
assert.equal(goal.calendarWindow(calendar).end.getTime() - goal.calendarWindow(calendar).start.getTime(), 30 * 60 * 1000, "the default 30-minute duration works");
for (const durationMinutes of ["0.5", "1", "15", "30", "75", "1440", "1500", "10080"]) {
  assert.ok(goal.calendarWindow({ ...calendar, durationMinutes }), `${durationMinutes} minutes should be accepted`);
}
for (const durationMinutes of ["", "0", "-1", "not-a-number"]) {
  assert.equal(goal.calendarWindow({ ...calendar, durationMinutes }), null, `${durationMinutes || "blank"} is not a positive duration`);
}
assert.equal(goal.calendarHelpText({ ...calendar, date: "" }), "Choose the event or reminder date.");
assert.equal(goal.calendarHelpText({ ...calendar, startTime: "" }), "Choose at least one time for the event or reminder.");
assert.match(goal.calendarHelpText({ ...calendar, durationMinutes: "0" }), /any positive duration/);
assert.match(goal.calendarHelpText(calendar), /^Ready\./);
assert.equal(goal.calendarDateFromOffset(1, new Date(2026, 7, 23, 23, 30)), "2026-08-24");
const ics = goal.buildIcsEvent({ title: "Call, Sam; check in", description: "Line 1\nPath C:\\Temp", calendar, timezone: "America/Toronto", now: new Date("2026-08-23T12:00:00Z"), uid: "smart@example" });
for (const line of ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Therapy Skill Kit//SMART Goal Builder//EN", "BEGIN:VEVENT", "UID:smart@example", "DTSTAMP:20260823T120000Z", "DTSTART;TZID=America/Toronto:20260915T190000", "DURATION:PT30M", "SUMMARY:Call\\, Sam\\; check in", "DESCRIPTION:Line 1\\nPath C:\\\\Temp", "END:VEVENT", "END:VCALENDAR"]) assert.ok(ics.includes(line), line);
assert.equal(goal.buildIcsEvent({ title: "Call Sam", calendar: { ...calendar, startTime: "" } }), null);

const google = new URL(goal.buildGoogleCalendarUrl({ title: "Call Sam", description: "Private details", calendar, timezone: "America/Toronto" }));
assert.equal(google.origin, "https://calendar.google.com");
assert.equal(google.pathname, "/calendar/r/eventedit");
assert.equal(google.searchParams.get("action"), "TEMPLATE");
assert.equal(google.searchParams.get("dates"), "20260915T190000/20260915T193000");
assert.equal(google.searchParams.get("ctz"), "America/Toronto");
assert.equal(google.searchParams.get("stz"), "America/Toronto");
assert.equal(google.searchParams.get("etz"), "America/Toronto");
assert.equal(google.searchParams.get("text"), "Call Sam");
assert.equal(google.searchParams.get("details"), "Private details");
const fractionalGoogle = new URL(goal.buildGoogleCalendarUrl({ title: "Brief practice", calendar: { ...calendar, durationMinutes: "0.5" }, timezone: "America/Toronto" }));
assert.equal(fractionalGoogle.searchParams.get("dates"), "20260915T190000/20260915T190030", "sub-minute supported durations retain their exact Google Calendar end time");

const recurringBase = {
  enabled: true, scheduleType: "recurring", date: "2026-03-01", startTime: "", times: ["08:00"], durationMinutes: "10",
  frequency: "daily", interval: "1", weekdays: [], endType: "never", untilDate: "", occurrenceCount: "10",
};
assert.equal(goal.recurrenceRule(recurringBase, "America/Toronto"), "FREQ=DAILY");
assert.equal(goal.recurrenceRule({ ...recurringBase, frequency: "weekdays" }, "America/Toronto"), "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
assert.equal(goal.recurrenceRule({ ...recurringBase, frequency: "selected-days", weekdays: ["MO", "WE", "FR"] }, "America/Toronto"), "FREQ=WEEKLY;BYDAY=MO,WE,FR");
assert.equal(goal.recurrenceStartDate({ ...recurringBase, frequency: "selected-days", weekdays: ["MO", "WE", "FR"] }), "2026-03-02", "a non-selected start day does not become an extra occurrence");
assert.equal(goal.recurrenceRule({ ...recurringBase, frequency: "weekly", interval: "2", endType: "count", occurrenceCount: "5" }, "America/Toronto"), "FREQ=WEEKLY;BYDAY=SU;INTERVAL=2;COUNT=5");
assert.equal(goal.recurrenceRule({ ...recurringBase, frequency: "monthly" }, "America/Toronto"), "FREQ=MONTHLY");
assert.equal(goal.recurrenceRule({ ...recurringBase, endType: "until", untilDate: "2026-03-20" }, "America/Toronto"), "FREQ=DAILY;UNTIL=20260321T035959Z");

const beforeDst = goal.zonedDateTimeToDate("2026-03-01", "08:00", "America/Toronto");
const afterDst = goal.zonedDateTimeToDate("2026-03-10", "08:00", "America/Toronto");
assert.equal(beforeDst.toISOString(), "2026-03-01T13:00:00.000Z");
assert.equal(afterDst.toISOString(), "2026-03-10T12:00:00.000Z");

for (const times of [["08:00"], ["08:00", "13:00"], ["08:00", "13:00", "20:00"]]) {
  const recurring = { ...recurringBase, times };
  const recurringIcs = goal.buildIcsEvent({ title: "Practice a skill", calendar: recurring, timezone: "America/Toronto", now: new Date("2026-02-20T12:00:00Z"), uid: "practice@example" });
  assert.equal((recurringIcs.match(/BEGIN:VEVENT/g) || []).length, times.length);
  assert.equal((recurringIcs.match(/RRULE:FREQ=DAILY/g) || []).length, times.length);
  assert.equal((recurringIcs.match(/DURATION:PT10M/g) || []).length, times.length);
  assert.equal(new Set([...recurringIcs.matchAll(/^UID:(.+)$/gm)].map((match) => match[1])).size, times.length);
  for (const time of times) assert.ok(recurringIcs.includes(`DTSTART;TZID=America/Toronto:20260301T${time.replace(":", "")}00`));
  const googleSeries = goal.buildGoogleCalendarUrls({ title: "Practice a skill", calendar: recurring, timezone: "America/Toronto" });
  assert.equal(googleSeries.length, times.length);
  for (const [index, series] of googleSeries.entries()) {
    const url = new URL(series.url);
    assert.equal(series.time, times[index]);
    assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=DAILY");
    assert.equal(url.searchParams.get("ctz"), "America/Toronto");
  }
}
assert.deepEqual(goal.calendarTimeSlots({ ...recurringBase, times: ["08:00", "08:00", "13:00"] }), ["08:00", "13:00"], "duplicate daily times do not create duplicate occurrences");

const state = {
  fields: { ...prefill.fields, measurable: "Message sent", achievable: "Contact details are available", time: "This week", smallest: "Draft the message", support: "Reminder" },
  summaryBuilt: true,
  context: prefill.context,
  targetDate: "2026-09-15",
  calendar,
  gtd: { taskId: "smart_goal_test_001", captureSequence: 1787500000000001, createdAt: "2026-08-23T12:00:00.000Z" },
};
const config = { toolId: "goal-builder", toolTitle: "SMART Goal Builder", route: "/skill-finder/goal-builder/", schemaVersion: 1 };
const record = progress.makeRecord(config, state, new Date("2026-08-23T12:30:00Z"));
const markdown = goal.goalGtdMarkdown(record, state);
assert.match(markdown, /^---\nrecord_version: 1/);
assert.match(markdown, /task_id: smart_goal_test_001/);
assert.match(markdown, /title: "Send Sam a message"/);
assert.match(markdown, /type: capture\nstate: inbox/);
assert.match(markdown, /due_date: 2026-09-15/);
assert.doesNotMatch(markdown, /scheduled_date:/);
assert.match(markdown, /# Send Sam a message/);
assert.match(markdown, /<!-- therapy-skill-kit-progress/);
assert.deepEqual(progress.parseProgress(markdown).record.state, state, "dual-compatible Markdown reloads in Therapy Skill Kit");

console.log("Values handoff, Goal Builder calendar, ICS, Google, and GTD Markdown checks passed");

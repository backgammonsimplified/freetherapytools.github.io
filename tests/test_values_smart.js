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
assert.equal(prefill.fields.relevant, "This supports Connection and Courage in Close Relationships.");
assert.equal(prefill.fields.measurable, "");
assert.equal(prefill.fields.achievable, "");
assert.deepEqual(prefill.context.values, personal.values);
const oldProgress = { fields: { direction: "Legacy direction", specific: "Legacy action", measurable: "", achievable: "", relevant: "", time: "", smallest: "", support: "" }, summaryBuilt: false };
const normalizedOld = goal.normalizeGoalState(oldProgress);
assert.equal(normalizedOld.fields.direction, "Legacy direction");
assert.equal(normalizedOld.fields.specific, "Legacy action");
assert.equal(normalizedOld.targetDate, "");
assert.equal(normalizedOld.calendar.enabled, false);

const calendar = { enabled: true, date: "2026-09-15", startTime: "19:00", durationMinutes: "30" };
const ics = goal.buildIcsEvent({ title: "Call, Sam; check in", description: "Line 1\nPath C:\\Temp", calendar, now: new Date("2026-08-23T12:00:00Z"), uid: "smart@example" });
for (const line of ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Therapy Skill Kit//SMART Goal Builder//EN", "BEGIN:VEVENT", "UID:smart@example", "DTSTAMP:20260823T120000Z", "DTSTART:", "DTEND:", "SUMMARY:Call\\, Sam\\; check in", "DESCRIPTION:Line 1\\nPath C:\\\\Temp", "END:VEVENT", "END:VCALENDAR"]) assert.ok(ics.includes(line), line);
assert.equal(goal.buildIcsEvent({ title: "Call Sam", calendar: { ...calendar, startTime: "" } }), null);

const google = new URL(goal.buildGoogleCalendarUrl({ title: "Call Sam", description: "Private details", calendar, timezone: "America/Toronto" }));
assert.equal(google.origin, "https://calendar.google.com");
assert.equal(google.pathname, "/calendar/r/eventedit");
assert.equal(google.searchParams.get("action"), "TEMPLATE");
assert.match(google.searchParams.get("dates"), /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
assert.equal(google.searchParams.get("stz"), "America/Toronto");
assert.equal(google.searchParams.get("etz"), "America/Toronto");
assert.equal(google.searchParams.get("text"), "Call Sam");
assert.equal(google.searchParams.get("details"), "Private details");

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

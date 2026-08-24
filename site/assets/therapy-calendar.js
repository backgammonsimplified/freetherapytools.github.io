(function (global) {
  "use strict";

  const WEEKDAYS = [["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"], ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"]];
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const pad = (number) => String(number).padStart(2, "0");

  function localDateValue(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function calendarDateFromOffset(days, now = new Date()) {
    const date = new Date(now.getTime()); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + Number(days || 0)); return localDateValue(date);
  }
  function utcCalendarStamp(date) { return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`; }
  function validDateParts(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number); const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null;
  }
  function validTimeParts(value) {
    const match = String(value || "").match(/^(\d{2}):(\d{2})$/); if (!match) return null;
    const [hour, minute] = match.slice(1).map(Number); return hour <= 23 && minute <= 59 ? { hour, minute } : null;
  }
  function localCalendarStamp(dateValue, timeValue) {
    const date = validDateParts(dateValue); const time = validTimeParts(timeValue);
    return date && time ? `${date.year}${pad(date.month)}${pad(date.day)}T${pad(time.hour)}${pad(time.minute)}00` : "";
  }
  function localCalendarEndStamp(dateValue, timeValue, durationMinutes) {
    const date = validDateParts(dateValue); const time = validTimeParts(timeValue); const seconds = Math.round(Number(durationMinutes) * 60);
    if (!date || !time || !Number.isInteger(seconds) || seconds < 1) return "";
    const end = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, seconds));
    return `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}${pad(end.getUTCSeconds())}`;
  }
  function calendarTimeSlots(calendar) {
    const source = calendar?.scheduleType === "recurring" ? calendar.times : [calendar?.startTime];
    return [...new Set((Array.isArray(source) ? source : []).filter(validTimeParts))];
  }
  function recurrenceStartDate(calendar) {
    const date = validDateParts(calendar?.date); if (!date) return "";
    const frequency = String(calendar?.frequency || "daily");
    const allowed = frequency === "weekdays" ? new Set(["MO", "TU", "WE", "TH", "FR"]) : frequency === "selected-days" ? new Set(calendar.weekdays || []) : null;
    if (!allowed) return calendar.date;
    const cursor = new Date(Date.UTC(date.year, date.month - 1, date.day)); const codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    for (let offset = 0; offset < 7; offset += 1) { if (allowed.has(codes[cursor.getUTCDay()])) return `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`; cursor.setUTCDate(cursor.getUTCDate() + 1); }
    return "";
  }
  function zonedDateTimeToDate(dateValue, timeValue, timezone) {
    const date = validDateParts(dateValue); const time = validTimeParts(timeValue); if (!date || !time) return null;
    const target = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute); let guess = target;
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (let attempt = 0; attempt < 3; attempt += 1) { const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])); guess += target - Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute); }
    const check = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    return check.year === date.year && check.month === date.month && check.day === date.day && check.hour === time.hour && check.minute === time.minute ? new Date(guess) : null;
  }
  function recurrenceRule(calendar, timezone = "UTC") {
    if (calendar?.scheduleType !== "recurring") return "";
    const interval = Number(calendar.interval); if (!Number.isInteger(interval) || interval < 1) return "";
    const frequency = String(calendar.frequency || "daily"); const parts = [];
    if (frequency === "daily") parts.push("FREQ=DAILY");
    else if (frequency === "weekdays") parts.push("FREQ=WEEKLY", "BYDAY=MO,TU,WE,TH,FR");
    else if (frequency === "selected-days") { const selected = WEEKDAYS.map(([value]) => value).filter((day) => calendar.weekdays?.includes(day)); if (!selected.length) return ""; parts.push("FREQ=WEEKLY", `BYDAY=${selected.join(",")}`); }
    else if (frequency === "weekly") { const date = validDateParts(calendar.date); if (!date) return ""; const weekday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()]; parts.push("FREQ=WEEKLY", `BYDAY=${weekday}`); }
    else if (frequency === "monthly") parts.push("FREQ=MONTHLY"); else return "";
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    if (calendar.endType === "count") { const count = Number(calendar.occurrenceCount); if (!Number.isInteger(count) || count < 1) return ""; parts.push(`COUNT=${count}`); }
    else if (calendar.endType === "until") { const until = validDateParts(calendar.untilDate); if (!until || calendar.untilDate < recurrenceStartDate(calendar)) return ""; const nextDay = new Date(Date.UTC(until.year, until.month - 1, until.day + 1)); const nextDate = `${nextDay.getUTCFullYear()}-${pad(nextDay.getUTCMonth() + 1)}-${pad(nextDay.getUTCDate())}`; const boundary = zonedDateTimeToDate(nextDate, "00:00", timezone); if (!boundary) return ""; parts.push(`UNTIL=${utcCalendarStamp(new Date(boundary.getTime() - 1000))}`); }
    return parts.join(";");
  }
  function calendarWindow(calendar) {
    const date = validDateParts(calendar?.date); const time = validTimeParts(calendar?.startTime); const duration = Number(calendar?.durationMinutes);
    if (!date || !time || !Number.isFinite(duration) || duration <= 0) return null;
    const start = new Date(date.year, date.month - 1, date.day, time.hour, time.minute); const end = new Date(start.getTime() + duration * 60000); return Number.isFinite(end.getTime()) ? { start, end } : null;
  }
  function calendarCommitmentValid(calendar, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
    const duration = Number(calendar?.durationMinutes); if (!validDateParts(calendar?.date) || !Number.isFinite(duration) || duration <= 0 || !calendarTimeSlots(calendar).length) return false;
    return calendar?.scheduleType !== "recurring" || Boolean(recurrenceRule(calendar, timezone));
  }
  function calendarHelpText(calendar) {
    if (!String(calendar?.date || "").trim()) return "Choose the event or reminder date.";
    if (calendar?.scheduleType === "recurring" && !recurrenceRule(calendar, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")) return "Complete the recurrence pattern and ending rule.";
    if (!calendarTimeSlots(calendar).length) return "Choose at least one time for the event or reminder.";
    if (!(Number(calendar?.durationMinutes) > 0)) return "Enter any positive duration in minutes.";
    return calendarCommitmentValid(calendar) ? "Ready. You can download the calendar file or open Google Calendar." : "Check the date and start time, then try again.";
  }
  function escapeIcsText(value) { return String(value || "").replaceAll("\\", "\\\\").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;"); }
  function buildIcsEvent(options) {
    const title = String(options.title || "").trim(); const timezone = String(options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); if (!calendarCommitmentValid(options.calendar, timezone) || !title) return null;
    const now = options.now instanceof Date ? options.now : new Date(); const uid = String(options.uid || `event-${now.getTime()}@therapyskillkit.local`).replace(/[^A-Za-z0-9@._-]/g, "-"); const seconds = Math.round(Number(options.calendar.durationMinutes) * 60); const duration = seconds % 60 ? `PT${seconds}S` : seconds % 3600 ? `PT${seconds / 60}M` : `PT${seconds / 3600}H`; const rule = recurrenceRule(options.calendar, timezone);
    const events = calendarTimeSlots(options.calendar).flatMap((time, index) => { const start = localCalendarStamp(options.calendar.scheduleType === "recurring" ? recurrenceStartDate(options.calendar) : options.calendar.date, time); return start ? ["BEGIN:VEVENT", `UID:${index ? `${uid}-${index + 1}` : uid}`, `DTSTAMP:${utcCalendarStamp(now)}`, `DTSTART;TZID=${timezone}:${start}`, `DURATION:${duration}`, ...(rule ? [`RRULE:${rule}`] : []), `SUMMARY:${escapeIcsText(title)}`, `DESCRIPTION:${escapeIcsText(options.description || "")}`, "END:VEVENT"] : []; });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Therapy Skill Kit//SMART Goal Builder//EN", "CALSCALE:GREGORIAN", `X-WR-TIMEZONE:${timezone}`, ...events, "END:VCALENDAR", ""].join("\r\n");
  }
  function buildGoogleCalendarUrls(options) {
    const title = String(options.title || "").trim(); const timezone = String(options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); if (!calendarCommitmentValid(options.calendar, timezone) || !title) return []; const rule = recurrenceRule(options.calendar, timezone);
    return calendarTimeSlots(options.calendar).map((time, index) => { const date = options.calendar.scheduleType === "recurring" ? recurrenceStartDate(options.calendar) : options.calendar.date; const params = new URLSearchParams({ action: "TEMPLATE", dates: `${localCalendarStamp(date, time)}/${localCalendarEndStamp(date, time, options.calendar.durationMinutes)}`, ctz: timezone, stz: timezone, etz: timezone, text: title, details: String(options.description || "") }); if (rule) params.set("recur", `RRULE:${rule}`); return { time, index, url: `https://calendar.google.com/calendar/r/eventedit?${params.toString()}` }; });
  }
  const buildGoogleCalendarUrl = (options) => buildGoogleCalendarUrls(options)[0]?.url || null;
  function initialState(options = {}) { return { scheduleType: options.recurring ? "recurring" : "one-time", date: options.date || "", startTime: options.startTime || "", times: [options.startTime || ""], durationMinutes: String(options.durationMinutes || "30"), frequency: options.frequency || "weekly", interval: "1", weekdays: [], endType: "never", untilDate: "", occurrenceCount: "10" }; }
  function normalizeState(next) { const state = { ...initialState(), ...(next || {}) }; state.scheduleType = state.scheduleType === "recurring" ? "recurring" : "one-time"; state.times = Array.isArray(state.times) && state.times.length ? [...state.times] : [state.startTime || ""]; state.weekdays = Array.isArray(state.weekdays) ? [...state.weekdays] : []; return state; }
  function downloadIcs(options) { const content = buildIcsEvent(options); if (!content || typeof document === "undefined") return false; const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" })); link.download = `${String(options.filename || options.title || "calendar-event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "calendar-event"}.ics`; document.body.append(link); link.click(); URL.revokeObjectURL(link.href); link.remove(); return true; }

  function mountEditor(container, options) {
    const state = options.state; const allowRecurrence = options.allowRecurrence !== false; const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    function render() {
      const recurring = allowRecurrence && state.scheduleType === "recurring";
      container.innerHTML = `<div class="therapy-calendar-editor"><fieldset class="goal-schedule-type"><legend>Schedule</legend><label><input type="radio" name="${escapeHtml(options.id)}-type" value="one-time" data-calendar-type ${recurring ? "" : "checked"}> One time</label>${allowRecurrence ? `<label><input type="radio" name="${escapeHtml(options.id)}-type" value="recurring" data-calendar-type ${recurring ? "checked" : ""}> Recurring</label>` : ""}</fieldset><div class="skill-app-inline-fields"><div><label>Date<input type="date" data-calendar-edit="date" value="${escapeHtml(state.date)}"></label></div><div><label>Time<input type="time" data-calendar-edit="${recurring ? "times.0" : "startTime"}" value="${escapeHtml(recurring ? state.times[0] : state.startTime)}"></label></div><div><label>Duration (minutes)<input type="number" min="1" step="1" data-calendar-edit="durationMinutes" value="${escapeHtml(state.durationMinutes)}"></label></div>${recurring ? `<div><label>Repeats<select data-calendar-edit="frequency">${[["daily","Daily"],["weekdays","Weekdays"],["selected-days","Selected days"],["weekly","Weekly"],["monthly","Monthly"]].map(([value,label]) => `<option value="${value}" ${state.frequency === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><div><label>Repeat every<input type="number" min="1" step="1" data-calendar-edit="interval" value="${escapeHtml(state.interval)}"></label></div>` : ""}</div>${recurring && state.frequency === "selected-days" ? `<fieldset class="goal-weekdays"><legend>Days of week</legend>${WEEKDAYS.map(([value,label]) => `<label><input type="checkbox" data-calendar-day value="${value}" ${state.weekdays.includes(value) ? "checked" : ""}> ${label}</label>`).join("")}</fieldset>` : ""}${recurring ? `<fieldset class="goal-schedule-type"><legend>Ends</legend>${[["never","No end date"],["count","After a number of occurrences"],["until","On a date"]].map(([value,label]) => `<label><input type="radio" name="${escapeHtml(options.id)}-end" value="${value}" data-calendar-end ${state.endType === value ? "checked" : ""}> ${label}</label>`).join("")}</fieldset>${state.endType === "count" ? `<label>Occurrences<input type="number" min="1" data-calendar-edit="occurrenceCount" value="${escapeHtml(state.occurrenceCount)}"></label>` : state.endType === "until" ? `<label>End date<input type="date" data-calendar-edit="untilDate" value="${escapeHtml(state.untilDate)}"></label>` : ""}` : ""}<p class="skill-app-field-help" data-calendar-help>${escapeHtml(calendarHelpText(state))} Timezone: ${escapeHtml(timezone)}.</p><div class="skill-app-actions"><button type="button" data-calendar-ics ${calendarCommitmentValid(state, timezone) ? "" : "disabled"}>Download .ics</button><button type="button" class="secondary" data-calendar-google ${calendarCommitmentValid(state, timezone) ? "" : "disabled"}>Google Calendar</button></div></div>`;
      container.querySelectorAll("[data-calendar-type]").forEach((field) => field.addEventListener("change", () => { state.scheduleType = field.value; render(); options.onChange?.(state); }));
      container.querySelectorAll("[data-calendar-end]").forEach((field) => field.addEventListener("change", () => { state.endType = field.value; render(); options.onChange?.(state); }));
      container.querySelectorAll("[data-calendar-day]").forEach((field) => field.addEventListener("change", () => { state.weekdays = [...container.querySelectorAll("[data-calendar-day]:checked")].map((item) => item.value); render(); options.onChange?.(state); }));
      container.querySelectorAll("[data-calendar-edit]").forEach((field) => field.addEventListener("change", () => { const key = field.dataset.calendarEdit; if (key === "times.0") state.times[0] = field.value; else state[key] = field.value; if (["frequency"].includes(key)) render(); else { container.querySelector("[data-calendar-help]").textContent = `${calendarHelpText(state)} Timezone: ${timezone}.`; const ready = calendarCommitmentValid(state, timezone); container.querySelectorAll("[data-calendar-ics],[data-calendar-google]").forEach((button) => { button.disabled = !ready; }); } options.onChange?.(state); }));
      container.querySelector("[data-calendar-ics]")?.addEventListener("click", () => downloadIcs({ ...options, calendar: state, timezone }));
      container.querySelector("[data-calendar-google]")?.addEventListener("click", () => { const url = buildGoogleCalendarUrl({ ...options, calendar: state, timezone }); if (url) global.open(url, "_blank", "noopener"); });
    }
    render(); return { render };
  }

  const api = { WEEKDAYS, calendarDateFromOffset, calendarWindow, calendarTimeSlots, recurrenceStartDate, recurrenceRule, zonedDateTimeToDate, calendarHelpText, calendarCommitmentValid, escapeIcsText, buildIcsEvent, buildGoogleCalendarUrl, buildGoogleCalendarUrls, initialState, normalizeState, downloadIcs, mountEditor };
  global.TherapyCalendar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);

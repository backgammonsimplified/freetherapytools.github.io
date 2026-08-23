(function () {
  "use strict";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const Progress = typeof window !== "undefined" ? window.TherapySkillProgress : null;

  const LINKS = {
    chain: [{ label: "Learn Behaviour Chain Analysis", href: "/learn/wellness/behavior-chain-missing-links.html#behaviour-chain-analysis" }],
    missing: [{ label: "Learn Missing-Links Analysis", href: "/learn/wellness/behavior-chain-missing-links.html#missing-links-analysis" }],
    exposure: [{ label: "Learn Safety Behaviours & Exposure", href: "/learn/cbt-anxiety/safety-behaviours-exposure.html" }],
    dear: [{ label: "Learn DEAR MAN", href: "/learn/interpersonal-effectiveness/dear-man.html" }, { label: "Learn GIVE", href: "/learn/interpersonal-effectiveness/give.html" }, { label: "Learn FAST", href: "/learn/interpersonal-effectiveness/fast.html" }],
    ask: [{ label: "Learn How to Ask & Say No", href: "/learn/interpersonal-effectiveness/saying-no.html" }],
    goals: [{ label: "Values", href: "/skill-finder/values/" }, { label: "Behavioural Activation", href: "/skill-finder/behavioural-activation/" }, { label: "Build Mastery", href: "/learn/emotion-regulation/positive-emotions-mastery-cope-ahead.html#build-mastery" }, { label: "Pleasant Event Planner", href: "/skill-finder/pleasant-event/" }],
    activation: [{ label: "Pleasant Event Planner", href: "/skill-finder/pleasant-event/" }, { label: "Values", href: "/skill-finder/values/" }, { label: "SMART Goal Builder", href: "/skill-finder/goal-builder/" }, { label: "Learn Behavioural Activation", href: "/learn/wellness/behavioral-activation.html" }],
    review: [{ label: "Values & Valued Action", href: "/skill-finder/values/" }, { label: "SMART Goal Builder", href: "/skill-finder/goal-builder/" }],
  };

  const FORM_DEFINITIONS = {
    "missing-links": {
      title: "Missing Links",
      intro: "Explore why an intended effective behaviour did not happen.",
      fields: [
        ["intended", "What effective behaviour did I intend to do?"],
        ["knowledge", "Did I know what needed to be done? What information or skill was missing?"],
        ["willingness", "Was I willing to do it? What competing urge or belief showed up?"],
        ["thoughts", "Did thoughts get in the way?"],
        ["emotion", "Did emotion or distress get in the way?"],
        ["environment", "Did the environment, timing, resources, or another person get in the way?"],
        ["next", "What link could I repair before the next opportunity?"],
      ], links: LINKS.missing,
    },
    "dear-man": {
      title: "DEAR MAN Builder",
      intro: "Enter your own words. The summary preserves them without adding persuasion language.",
      fields: [
        ["describe", "Describe — What are the observable facts?"], ["express", "Express — What do I feel or think?"],
        ["assert", "Assert — What am I asking for or saying no to?"], ["reinforce", "Reinforce — What positive outcome could follow?"],
        ["mindful", "Mindful — What will help me stay with my objective?"], ["appear", "Appear Confident — What posture or tone fits?"],
        ["negotiate", "Negotiate — Where can I be flexible?"], ["gentle", "GIVE: Gentle"],
        ["interested", "GIVE: Interested"], ["validate", "GIVE: Validate"], ["easy", "GIVE: Easy Manner"],
        ["fair", "FAST: Fair"], ["apologies", "FAST: No Unnecessary Apologies"],
        ["values", "FAST: Stick to Values"], ["truthful", "FAST: Truthful"],
      ], links: LINKS.dear,
    },
    "ask-or-say-no": {
      title: "Ask or Say No Planner",
      intro: "Use the factors as prompts. This tool does not calculate how forceful you should be.",
      fields: [
        ["choice", "Am I preparing to ask, say no, or clarify a boundary?"],
        ["objective", "What outcome matters most?"], ["relationship", "What matters for the relationship?"],
        ["selfRespect", "What matters for self-respect and values?"], ["capability", "Can the other person reasonably do what I am asking?"],
        ["priorities", "What are my priorities in this situation?"], ["intensity", "How strongly do I want to ask or say no, and why?"],
        ["troubleshooting", "What may make this difficult? What could help?"],
      ], links: LINKS.ask,
    },
    "goal-builder": {
      title: "SMART Goal Builder",
      intro: "Connect a meaningful direction with an observable next step.",
      fields: [
        ["direction", "Direction or value this goal supports"], ["specific", "Specific — What exactly will I do?"],
        ["measurable", "Measurable — How will I know it happened?"], ["achievable", "Achievable — What makes this within reach?"],
        ["relevant", "Relevant / Realistic — Why does it matter, and does it fit current circumstances?"],
        ["time", "Time-Oriented — By when, or at what time and place?"], ["smallest", "Smallest useful version"],
        ["support", "What could support follow-through?"],
      ], links: LINKS.goals,
    },
    "behavioural-activation": {
      title: "Behavioural Activation Planner",
      intro: "Choose one small, realistic action. A feeling does not have to change before action begins.",
      fields: [
        ["harder", "What has become harder to do?"], ["action", "What is one small action?"],
        ["connection", "Could it offer pleasure, mastery, self-care, or values connection?"],
        ["when", "When and where?"], ["barrier", "What may get in the way?"],
        ["help", "What could help?"], ["smallest", "What is the smallest version?"],
      ], links: LINKS.activation,
    },
    "values-review": {
      title: "Values Review",
      intro: "Use this as a weekly or monthly check-in. Notice patterns without grading yourself.",
      fields: [
        ["period", "Review rhythm", "select", [["weekly", "Weekly"], ["monthly", "Monthly"]]],
        ["values", "Which values did I want to prioritize?"],
        ["aligned", "Where did my actions align with my values?"],
        ["drifted", "Where did my time or effort drift away from what mattered?"],
        ["attention", "Which value or life domain needs more attention?"],
        ["discomfort", "What discomfort did I make room for while acting on my values?"],
        ["continue", "What do I want to continue?"],
        ["change", "What do I want to change?"],
        ["next", "What is my smallest value-aligned next action?"],
        ["reviewDate", "Next review date", "date"],
      ], links: LINKS.review,
    },
  };

  function linksMarkup(links) {
    return `<div class="skill-app-result-links">${links.map((link) => `<a class="skill-app-link-button secondary" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</div>`;
  }

  function stringsOnly(object, keys) {
    return Progress?.isPlainObject(object)
      && Object.keys(object).every((key) => keys.includes(key))
      && keys.every((key) => typeof object[key] === "string");
  }

  const GOAL_FIELD_KEYS = ["direction", "specific", "measurable", "achievable", "relevant", "time", "smallest", "support"];

  function pad(number) { return String(number).padStart(2, "0"); }

  function localDateValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function calendarDateFromOffset(days, now = new Date()) {
    const date = new Date(now.getTime());
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + Number(days || 0));
    return localDateValue(date);
  }

  function utcCalendarStamp(date) {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  const WEEKDAYS = [
    ["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"], ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"],
  ];

  function validDateParts(dateValue) {
    const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null;
  }

  function validTimeParts(timeValue) {
    const match = String(timeValue || "").match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [hour, minute] = match.slice(1).map(Number);
    return hour <= 23 && minute <= 59 ? { hour, minute } : null;
  }

  function localCalendarStamp(dateValue, timeValue) {
    const date = validDateParts(dateValue);
    const time = validTimeParts(timeValue);
    return date && time ? `${date.year}${pad(date.month)}${pad(date.day)}T${pad(time.hour)}${pad(time.minute)}00` : "";
  }

  function localCalendarEndStamp(dateValue, timeValue, durationMinutes) {
    const date = validDateParts(dateValue);
    const time = validTimeParts(timeValue);
    const seconds = Math.round(Number(durationMinutes) * 60);
    if (!date || !time || !Number.isInteger(seconds) || seconds < 1) return "";
    const end = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, seconds));
    return `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}${pad(end.getUTCSeconds())}`;
  }

  function calendarTimeSlots(calendar) {
    const source = calendar?.scheduleType === "recurring" ? calendar.times : [calendar?.startTime];
    return [...new Set((Array.isArray(source) ? source : []).filter((time) => validTimeParts(time)))];
  }

  function recurrenceStartDate(calendar) {
    const date = validDateParts(calendar?.date);
    if (!date) return "";
    const frequency = String(calendar?.frequency || "daily");
    const allowed = frequency === "weekdays" ? new Set(["MO", "TU", "WE", "TH", "FR"])
      : frequency === "selected-days" ? new Set(calendar.weekdays || []) : null;
    if (!allowed) return calendar.date;
    const cursor = new Date(Date.UTC(date.year, date.month - 1, date.day));
    const dayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    for (let offset = 0; offset < 7; offset += 1) {
      if (allowed.has(dayCodes[cursor.getUTCDay()])) return `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return "";
  }

  function recurrenceRule(calendar, timezone = "UTC") {
    if (calendar?.scheduleType !== "recurring") return "";
    const interval = Number(calendar.interval);
    if (!Number.isInteger(interval) || interval < 1) return "";
    const frequency = String(calendar.frequency || "daily");
    const parts = [];
    if (frequency === "daily") parts.push("FREQ=DAILY");
    else if (frequency === "weekdays") parts.push("FREQ=WEEKLY", "BYDAY=MO,TU,WE,TH,FR");
    else if (frequency === "selected-days") {
      const selected = WEEKDAYS.map(([value]) => value).filter((day) => calendar.weekdays?.includes(day));
      if (!selected.length) return "";
      parts.push("FREQ=WEEKLY", `BYDAY=${selected.join(",")}`);
    } else if (frequency === "weekly") {
      const date = validDateParts(calendar.date);
      if (!date) return "";
      const weekday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()];
      parts.push("FREQ=WEEKLY", `BYDAY=${weekday}`);
    } else if (frequency === "monthly") parts.push("FREQ=MONTHLY");
    else return "";
    if (interval > 1) parts.push(`INTERVAL=${interval}`);
    if (calendar.endType === "count") {
      const count = Number(calendar.occurrenceCount);
      if (!Number.isInteger(count) || count < 1) return "";
      parts.push(`COUNT=${count}`);
    } else if (calendar.endType === "until") {
      const until = validDateParts(calendar.untilDate);
      if (!until || calendar.untilDate < recurrenceStartDate(calendar)) return "";
      const nextDay = new Date(Date.UTC(until.year, until.month - 1, until.day + 1));
      const nextDate = `${nextDay.getUTCFullYear()}-${pad(nextDay.getUTCMonth() + 1)}-${pad(nextDay.getUTCDate())}`;
      const boundary = zonedDateTimeToDate(nextDate, "00:00", timezone);
      if (!boundary) return "";
      parts.push(`UNTIL=${utcCalendarStamp(new Date(boundary.getTime() - 1000))}`);
    }
    return parts.join(";");
  }

  function zonedDateTimeToDate(dateValue, timeValue, timezone) {
    const date = validDateParts(dateValue);
    const time = validTimeParts(timeValue);
    if (!date || !time) return null;
    const target = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
    let guess = target;
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
      const represented = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
      guess += target - represented;
    }
    const check = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    return check.year === date.year && check.month === date.month && check.day === date.day && check.hour === time.hour && check.minute === time.minute ? new Date(guess) : null;
  }

  function calendarWindow(calendar) {
    const dateParts = validDateParts(calendar?.date);
    const timeParts = validTimeParts(calendar?.startTime);
    const duration = Number(calendar?.durationMinutes);
    if (!dateParts || !timeParts || !Number.isFinite(duration) || duration <= 0) return null;
    const start = new Date(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hour, timeParts.minute, 0, 0);
    if (start.getFullYear() !== dateParts.year || start.getMonth() !== dateParts.month - 1 || start.getDate() !== dateParts.day || start.getHours() !== timeParts.hour || start.getMinutes() !== timeParts.minute) return null;
    const end = new Date(start.getTime() + duration * 60000);
    return Number.isFinite(end.getTime()) ? { start, end } : null;
  }

  function calendarHelpText(calendar) {
    if (!String(calendar?.date || "").trim()) return "Choose the event or reminder date.";
    if (calendar?.scheduleType === "recurring" && !recurrenceRule(calendar, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")) return "Complete the recurrence pattern and ending rule.";
    if (!calendarTimeSlots(calendar).length) return "Choose at least one time for the event or reminder.";
    const duration = Number(calendar?.durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) return "Enter any positive duration in minutes. For example: 10, 30, 75, or 180.";
    return calendarCommitmentValid(calendar)
      ? "Ready. You can download the calendar file or open the prefilled Google Calendar event or series."
      : "Check the date and start time, then try again.";
  }

  function calendarCommitmentValid(calendar, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
    const duration = Number(calendar?.durationMinutes);
    if (!validDateParts(calendar?.date) || !Number.isFinite(duration) || duration <= 0 || !calendarTimeSlots(calendar).length) return false;
    return calendar?.scheduleType !== "recurring" || Boolean(recurrenceRule(calendar, timezone));
  }

  function escapeIcsText(value) {
    return String(value || "").replaceAll("\\", "\\\\").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  }

  function buildIcsEvent(options) {
    const title = String(options.title || "").trim();
    const timezone = String(options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    if (!calendarCommitmentValid(options.calendar, timezone) || !title) return null;
    const now = options.now instanceof Date ? options.now : new Date();
    const uid = String(options.uid || `goal-${now.getTime()}@therapyskillkit.local`).replace(/[^A-Za-z0-9@._-]/g, "-");
    const durationSeconds = Math.round(Number(options.calendar.durationMinutes) * 60);
    const duration = durationSeconds % 60 ? `PT${durationSeconds}S` : durationSeconds % 3600 ? `PT${durationSeconds / 60}M` : `PT${durationSeconds / 3600}H`;
    const rule = recurrenceRule(options.calendar, timezone);
    const events = calendarTimeSlots(options.calendar).flatMap((time, index) => {
      const start = localCalendarStamp(options.calendar.scheduleType === "recurring" ? recurrenceStartDate(options.calendar) : options.calendar.date, time);
      if (!start) return [];
      return ["BEGIN:VEVENT", `UID:${index ? `${uid}-${index + 1}` : uid}`, `DTSTAMP:${utcCalendarStamp(now)}`, `DTSTART;TZID=${timezone}:${start}`, `DURATION:${duration}`,
        ...(rule ? [`RRULE:${rule}`] : []), `SUMMARY:${escapeIcsText(title)}`, `DESCRIPTION:${escapeIcsText(options.description || "")}`, "END:VEVENT"];
    });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Therapy Skill Kit//SMART Goal Builder//EN", "CALSCALE:GREGORIAN", `X-WR-TIMEZONE:${timezone}`, ...events, "END:VCALENDAR", ""].join("\r\n");
  }

  function buildGoogleCalendarUrls(options) {
    const title = String(options.title || "").trim();
    const timezone = String(options.timezone || "UTC");
    if (!calendarCommitmentValid(options.calendar, timezone) || !title) return [];
    const rule = recurrenceRule(options.calendar, timezone);
    return calendarTimeSlots(options.calendar).map((time, index) => {
      const seriesDate = options.calendar.scheduleType === "recurring" ? recurrenceStartDate(options.calendar) : options.calendar.date;
      const params = new URLSearchParams({
        action: "TEMPLATE",
        dates: `${localCalendarStamp(seriesDate, time)}/${localCalendarEndStamp(seriesDate, time, options.calendar.durationMinutes)}`,
        ctz: timezone,
        stz: timezone,
        etz: timezone,
        text: title,
        details: String(options.description || ""),
      });
      if (rule) params.set("recur", `RRULE:${rule}`);
      return { time, index, url: `https://calendar.google.com/calendar/r/eventedit?${params.toString()}` };
    });
  }

  function buildGoogleCalendarUrl(options) {
    return buildGoogleCalendarUrls(options)[0]?.url || null;
  }

  function goalBuilderPrefill(payload) {
    const values = Array.isArray(payload?.values) ? payload.values.filter((value) => typeof value === "string") : [];
    const domain = typeof payload?.domain === "string" ? payload.domain : "";
    const valueText = values.join(" and ");
    const direction = [valueText, domain && `in ${domain}`].filter(Boolean).join(" ");
    return {
      calendarIntent: payload?.calendarIntent === true,
      fields: {
        direction,
        specific: typeof payload?.how === "string" ? payload.how : "",
        measurable: "",
        achievable: "",
        relevant: "",
        time: "",
        smallest: "",
        support: "",
      },
      context: {
        domain,
        values,
        what: typeof payload?.what === "string" ? payload.what : "",
        how: typeof payload?.how === "string" ? payload.how : "",
        mission: typeof payload?.mission === "string" ? payload.mission : "",
      },
    };
  }

  function makeGtdIdentity(now = new Date()) {
    const milliseconds = now.getTime();
    const suffix = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint16Array(1))[0].toString(16).padStart(4, "0") : "0000";
    return { taskId: `smart_goal_${milliseconds.toString(36)}_${suffix}`, captureSequence: milliseconds * 1000 + parseInt(suffix, 16) % 1000, createdAt: now.toISOString() };
  }

  function initialGoalState(now = new Date()) {
    return {
      fields: Object.fromEntries(GOAL_FIELD_KEYS.map((key) => [key, ""])),
      summaryBuilt: false,
      context: { domain: "", values: [], what: "", how: "", mission: "" },
      targetDate: "",
      calendar: {
        enabled: false, scheduleType: "one-time", date: "", startTime: "", times: [""], durationMinutes: "30",
        frequency: "daily", interval: "1", weekdays: [], endType: "never", untilDate: "", occurrenceCount: "10",
      },
      gtd: makeGtdIdentity(now),
    };
  }

  function normalizeGoalState(next) {
    const normalized = initialGoalState();
    GOAL_FIELD_KEYS.forEach((key) => { normalized.fields[key] = typeof next?.fields?.[key] === "string" ? next.fields[key] : ""; });
    normalized.summaryBuilt = Boolean(next?.summaryBuilt);
    if (next?.context) normalized.context = { ...normalized.context, ...next.context, values: Array.isArray(next.context.values) ? [...next.context.values] : [] };
    normalized.targetDate = typeof next?.targetDate === "string" ? next.targetDate : "";
    if (next?.calendar) {
      normalized.calendar = { ...normalized.calendar, ...next.calendar, enabled: Boolean(next.calendar.enabled) };
      normalized.calendar.scheduleType = next.calendar.scheduleType === "recurring" ? "recurring" : "one-time";
      normalized.calendar.times = Array.isArray(next.calendar.times) && next.calendar.times.every((time) => typeof time === "string")
        ? [...next.calendar.times] : [typeof next.calendar.startTime === "string" ? next.calendar.startTime : ""];
      if (!normalized.calendar.times.length) normalized.calendar.times = [""];
      normalized.calendar.weekdays = Array.isArray(next.calendar.weekdays) ? next.calendar.weekdays.filter((day) => WEEKDAYS.some(([value]) => value === day)) : [];
    }
    if (next?.gtd && typeof next.gtd.taskId === "string" && Number.isSafeInteger(next.gtd.captureSequence) && typeof next.gtd.createdAt === "string") normalized.gtd = { ...next.gtd };
    return normalized;
  }

  function goalTitle(state) {
    return String(state.fields.specific || state.context.how || state.context.what || "Define a concrete next action").replace(/\s+/g, " ").trim().slice(0, 240);
  }

  function goalDescription(state) {
    return [state.context.mission && `Mission: ${state.context.mission}`, state.context.what && `What: ${state.context.what}`, ...GOAL_FIELD_KEYS.map((key) => state.fields[key] && `${key[0].toUpperCase()}${key.slice(1)}: ${state.fields[key]}`)].filter(Boolean).join("\n");
  }

  function goalReadableSummary(state) {
    const sections = [
      ["Life Domain", state.context.domain], ["Values", state.context.values.join(", ")], ["Mission", state.context.mission], ["What", state.context.what], ["How", state.context.how],
      ["Direction or Value", state.fields.direction], ["Specific", state.fields.specific], ["Measurable", state.fields.measurable], ["Achievable", state.fields.achievable],
      ["Relevant / Realistic", state.fields.relevant], ["Time-Oriented", state.fields.time], ["Target Date", state.targetDate], ["Smallest Useful Version", state.fields.smallest], ["Support", state.fields.support],
      ["Calendar Commitment", state.calendar.enabled && calendarCommitmentValid(state.calendar) ? (state.calendar.scheduleType === "recurring" ? `Recurring ${state.calendar.frequency} from ${state.calendar.date} at ${calendarTimeSlots(state.calendar).join(", ")} for ${state.calendar.durationMinutes} minutes` : `${state.calendar.date} at ${state.calendar.startTime} for ${state.calendar.durationMinutes} minutes`) : ""],
    ];
    if (Progress?.nonEmptySections) return Progress.nonEmptySections(goalTitle(state), sections);
    const lines = [`# ${goalTitle(state)}`];
    sections.forEach(([heading, value]) => { if (String(value || "").trim()) lines.push("", `## ${heading}`, "", String(value)); });
    return lines.join("\n");
  }

  function yamlString(value) { return JSON.stringify(String(value || "")); }

  function goalGtdMarkdown(record, state) {
    const title = goalTitle(state);
    const metadata = JSON.stringify(record, null, 2).replaceAll("--", "\\u002d\\u002d");
    const tags = state.context.values.map((value) => String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean).slice(0, 30);
    const frontMatter = [
      "---", "record_version: 1", `task_id: ${state.gtd.taskId}`, `title: ${yamlString(title)}`, "type: capture", "state: inbox",
      `capture_sequence: ${state.gtd.captureSequence}`, `original_capture: ${yamlString(title)}`, "capture_source: manual",
      state.context.domain ? `area: ${yamlString(state.context.domain.slice(0, 100))}` : "",
      state.targetDate ? `due_date: ${state.targetDate}` : "",
      `priority: none`, `energy: unspecified`, `tags: ${JSON.stringify(tags)}`, `created_at: ${yamlString(state.gtd.createdAt)}`, `updated_at: ${yamlString(record.saved_at)}`, "---",
    ].filter((line) => line !== "").join("\n");
    const readable = goalReadableSummary(state);
    return `${frontMatter}\n\n${readable}\n\n<!-- therapy-skill-kit-progress\n${metadata}\n-->\n`;
  }

  function register(root, config) {
    if (Progress) Progress.registerTool({ schemaVersion: 1, root, ...config });
  }

  function initGuidedForm(root, definition) {
    const fieldMarkup = ([key, label, type = "textarea", options = []]) => {
      const id = `practice-${key}`;
      if (type === "select") return `<label for="${id}">${escapeHtml(label)}</label><select id="${id}" name="${escapeHtml(key)}">${options.map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join("")}</select>`;
      if (type === "date") return `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" name="${escapeHtml(key)}" type="date">`;
      return `<label for="${id}">${escapeHtml(label)}</label><textarea id="${id}" name="${escapeHtml(key)}"></textarea>`;
    };
    root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>${escapeHtml(definition.title)}</h2><p>${escapeHtml(definition.intro)} Your progress stays on this device unless you save a copy to your computer. Nothing you enter here is uploaded.</p></header><form class="skill-app-panel" data-guided-form>${definition.fields.map(fieldMarkup).join("")}<button type="submit">Build my summary</button></form><section class="skill-app-panel" data-guided-summary aria-live="polite" tabindex="-1"></section><footer class="skill-app-footer"><button type="button" class="secondary" data-clear-form>Clear</button>${linksMarkup(definition.links)}</footer></div>`;
    const form = root.querySelector("[data-guided-form]");
    let summaryBuilt = false;
    const keys = definition.fields.map(([key]) => key);
    const fieldState = () => Object.fromEntries(definition.fields.map(([key]) => [key, form.elements[key]?.value || ""]));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      summaryBuilt = true;
      const values = new FormData(form);
      const summary = root.querySelector("[data-guided-summary]");
      summary.innerHTML = `<h3>Editable planning summary</h3><dl class="skill-app-summary">${definition.fields.map(([key, label]) => `<dt>${escapeHtml(label.split(" — ")[0])}</dt><dd>${escapeHtml(values.get(key) || "Not answered")}</dd>`).join("")}</dl>`;
      summary.focus();
    });
    root.querySelector("[data-clear-form]").addEventListener("click", () => { form.reset(); summaryBuilt = false; root.querySelector("[data-guided-summary]").innerHTML = ""; form.querySelector("textarea, select, input")?.focus(); });
    const toolId = root.dataset.practiceApp;
    register(root, {
      toolId,
      toolTitle: definition.title,
      route: Progress.TOOL_ROUTES[toolId],
      getState: () => ({ fields: fieldState(), summaryBuilt }),
      setState: (next) => {
        definition.fields.forEach(([key]) => { form.elements[key].value = next.fields[key] || ""; });
        summaryBuilt = next.summaryBuilt;
        if (summaryBuilt) form.requestSubmit();
        else root.querySelector("[data-guided-summary]").replaceChildren();
      },
      validateState: (next) => Progress.isPlainObject(next) && Object.keys(next).every((key) => ["fields", "summaryBuilt"].includes(key)) && stringsOnly(next.fields, keys) && typeof next.summaryBuilt === "boolean",
      getReadableSummary: (next) => Progress.nonEmptySections(definition.title, definition.fields.map(([key, label]) => [label, next.fields[key]])),
    });
  }

  function goalStateValid(next) {
    if (!Progress?.isPlainObject(next) || !Progress.isPlainObject(next.fields) || typeof next.summaryBuilt !== "boolean") return false;
    if (!stringsOnly(next.fields, GOAL_FIELD_KEYS)) return false;
    const keys = Object.keys(next);
    if (keys.every((key) => ["fields", "summaryBuilt"].includes(key))) return true;
    if (!keys.every((key) => ["fields", "summaryBuilt", "context", "targetDate", "calendar", "gtd"].includes(key))) return false;
    return Progress.isPlainObject(next.context)
      && Object.keys(next.context).every((key) => ["domain", "values", "what", "how", "mission"].includes(key))
      && ["domain", "what", "how", "mission"].every((key) => typeof next.context[key] === "string")
      && Array.isArray(next.context.values) && next.context.values.every((value) => typeof value === "string")
      && typeof next.targetDate === "string"
      && Progress.isPlainObject(next.calendar)
      && Object.keys(next.calendar).every((key) => ["enabled", "scheduleType", "date", "startTime", "times", "durationMinutes", "frequency", "interval", "weekdays", "endType", "untilDate", "occurrenceCount"].includes(key))
      && typeof next.calendar.enabled === "boolean"
      && ["date", "startTime", "durationMinutes"].every((key) => typeof next.calendar[key] === "string")
      && (next.calendar.scheduleType === undefined || ["one-time", "recurring"].includes(next.calendar.scheduleType))
      && (next.calendar.times === undefined || (Array.isArray(next.calendar.times) && next.calendar.times.every((time) => typeof time === "string")))
      && (next.calendar.weekdays === undefined || (Array.isArray(next.calendar.weekdays) && next.calendar.weekdays.every((day) => typeof day === "string")))
      && ["frequency", "interval", "endType", "untilDate", "occurrenceCount"].every((key) => next.calendar[key] === undefined || typeof next.calendar[key] === "string")
      && Progress.isPlainObject(next.gtd)
      && Object.keys(next.gtd).every((key) => ["taskId", "captureSequence", "createdAt"].includes(key))
      && typeof next.gtd.taskId === "string" && Number.isSafeInteger(next.gtd.captureSequence) && typeof next.gtd.createdAt === "string";
  }

  function initGoalBuilder(root) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let state = initialGoalState();
    let focusCalendarOnLoad = false;
    const token = new URLSearchParams(window.location.search).get("handoff");
    if (token && window.TherapySkillHandoff) {
      const payload = window.TherapySkillHandoff.consumePayload(token);
      if (payload) {
        const prefill = goalBuilderPrefill(payload);
        state.fields = prefill.fields;
        state.context = prefill.context;
        if (prefill.calendarIntent) {
          state.calendar.enabled = true;
          focusCalendarOnLoad = true;
        }
      }
      const clean = new URL(window.location.href);
      clean.searchParams.delete("handoff");
      window.history.replaceState(null, "", `${clean.pathname}${clean.search}${clean.hash}`);
    }

    function calendarReady() { return state.calendar.enabled && calendarCommitmentValid(state.calendar, timezone) && Boolean(goalTitle(state)); }

    function render() {
      const fields = [
        ["direction", "Direction or value this goal supports"], ["specific", "Specific — What exactly will I do?"],
        ["measurable", "Measurable — How will I know it happened?"], ["achievable", "Achievable — What makes this within reach?"],
        ["relevant", "Relevant / Realistic — Why does it matter, and does it fit current circumstances?"],
        ["time", "Time-Oriented — What timing, rhythm, or review point matters?"], ["smallest", "Smallest useful version"], ["support", "What could support follow-through?"],
      ];
      const recurring = state.calendar.scheduleType === "recurring";
      const repeatUnit = state.calendar.frequency === "daily" ? "day(s)" : state.calendar.frequency === "monthly" ? "month(s)" : "week(s)";
      const googleTimeSlots = recurring ? calendarTimeSlots(state.calendar) : [];
      const googleButtonCount = recurring ? googleTimeSlots.length : 1;
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>SMART Goal Builder</h2><p>Connect a meaningful direction with an observable next step. A formal goal is optional; use it when structure would help. Your answers stay in this browser unless you save or explicitly open a calendar handoff.</p></header>
        <form class="skill-app-panel" data-goal-form>${state.context.domain || state.context.what ? `<aside class="skill-app-note"><strong>From your Values plan</strong>${state.context.domain ? `<span>Life Domain: ${escapeHtml(state.context.domain)}</span>` : ""}${state.context.values.length ? `<span>Values: ${escapeHtml(state.context.values.join(", "))}</span>` : ""}${state.context.what ? `<span>What: ${escapeHtml(state.context.what)}</span>` : ""}${state.context.how ? `<span>How: ${escapeHtml(state.context.how)}</span>` : ""}</aside>` : ""}
          ${fields.map(([key, label]) => `<label for="goal-${key}">${escapeHtml(label)}</label><textarea id="goal-${key}" name="${key}" data-goal-field="${key}">${escapeHtml(state.fields[key])}</textarea>`).join("")}
          <fieldset class="skill-app-fieldset"><legend>Target date / deadline</legend><p class="skill-app-field-help">This is goal or task metadata. It does not automatically create a calendar event.</p><label for="goal-target-date">Target date</label><input id="goal-target-date" type="date" data-goal-target-date value="${escapeHtml(state.targetDate)}"></fieldset>
          <fieldset class="skill-app-fieldset" id="goal-calendar-commitment"><legend>Specific calendar commitment</legend><label class="skill-app-check"><input type="checkbox" data-calendar-enabled ${state.calendar.enabled ? "checked" : ""}> <span>Schedule an event or reminder</span></label><p>A target date is a deadline. This separate calendar commitment is for an action that belongs at a particular local date and time.</p>
            <div data-calendar-fields ${state.calendar.enabled ? "" : "hidden"}>
              <fieldset class="goal-schedule-type"><legend>Schedule type</legend><label><input type="radio" name="schedule-type" value="one-time" data-calendar-schedule-type ${recurring ? "" : "checked"}> One time</label><label><input type="radio" name="schedule-type" value="recurring" data-calendar-schedule-type ${recurring ? "checked" : ""}> Recurring</label></fieldset>
              <div class="skill-app-inline-fields goal-calendar-fields">
                <div class="goal-calendar-field"><label for="goal-calendar-date">${recurring ? "Start date" : "Event or reminder date"}</label><input id="goal-calendar-date" type="date" data-calendar-field="date" value="${escapeHtml(state.calendar.date)}"><div class="goal-calendar-shortcuts" aria-label="Date shortcuts"><button type="button" class="secondary" data-calendar-date-offset="0">Today</button><button type="button" class="secondary" data-calendar-date-offset="1">Tomorrow</button><button type="button" class="secondary" data-calendar-date-offset="7">In one week</button></div></div>
                ${recurring ? `<div class="goal-calendar-field"><label for="goal-calendar-frequency">Repeats</label><select id="goal-calendar-frequency" data-calendar-field="frequency"><option value="daily" ${state.calendar.frequency === "daily" ? "selected" : ""}>Daily</option><option value="weekdays" ${state.calendar.frequency === "weekdays" ? "selected" : ""}>Weekdays</option><option value="selected-days" ${state.calendar.frequency === "selected-days" ? "selected" : ""}>Selected days of week</option><option value="weekly" ${state.calendar.frequency === "weekly" ? "selected" : ""}>Weekly</option><option value="monthly" ${state.calendar.frequency === "monthly" ? "selected" : ""}>Monthly</option></select><label for="goal-calendar-interval">Repeat every</label><div class="goal-repeat-every"><input id="goal-calendar-interval" type="number" min="1" step="1" inputmode="numeric" data-calendar-field="interval" value="${escapeHtml(state.calendar.interval)}"><span>${repeatUnit}</span></div></div>` : `<div class="goal-calendar-field"><label for="goal-calendar-time">Starts at</label><input id="goal-calendar-time" type="time" data-calendar-field="startTime" value="${escapeHtml(state.calendar.startTime)}"><div class="goal-calendar-shortcuts" aria-label="Start-time shortcuts"><button type="button" class="secondary" data-calendar-start-time="09:00">9:00 AM</button><button type="button" class="secondary" data-calendar-start-time="13:00">1:00 PM</button><button type="button" class="secondary" data-calendar-start-time="18:00">6:00 PM</button></div></div>`}
                <div class="goal-calendar-field"><label for="goal-calendar-duration">Duration in minutes</label><input id="goal-calendar-duration" type="number" min="0.1" step="any" inputmode="decimal" data-calendar-field="durationMinutes" aria-describedby="goal-calendar-duration-help" value="${escapeHtml(state.calendar.durationMinutes)}"><p class="skill-app-field-help" id="goal-calendar-duration-help">Each occurrence uses this positive duration.</p><div class="goal-calendar-shortcuts" aria-label="Duration shortcuts"><button type="button" class="secondary" data-calendar-duration="15">15 min</button><button type="button" class="secondary" data-calendar-duration="30">30 min</button><button type="button" class="secondary" data-calendar-duration="45">45 min</button><button type="button" class="secondary" data-calendar-duration="60">1 hour</button><button type="button" class="secondary" data-calendar-duration="90">90 min</button></div></div>
              </div>
              ${recurring && state.calendar.frequency === "selected-days" ? `<fieldset class="goal-weekdays"><legend>Days of week</legend>${WEEKDAYS.map(([value, label]) => `<label><input type="checkbox" data-calendar-weekday value="${value}" ${state.calendar.weekdays.includes(value) ? "checked" : ""}> ${label}</label>`).join("")}</fieldset>` : ""}
              ${recurring ? `<fieldset class="goal-calendar-times"><legend>Times</legend>${state.calendar.times.map((time, index) => `<div><label for="goal-calendar-time-${index}">Time ${index + 1}</label><input id="goal-calendar-time-${index}" type="time" data-calendar-time-index="${index}" value="${escapeHtml(time)}"><button type="button" class="secondary" data-remove-calendar-time="${index}" ${state.calendar.times.length === 1 ? "disabled" : ""}>Remove</button></div>`).join("")}<button type="button" class="secondary" data-add-calendar-time>Add another time</button></fieldset>
                <fieldset class="goal-recurrence-end"><legend>Ending rule</legend><label><input type="radio" name="recurrence-end" value="never" data-calendar-end-type ${state.calendar.endType === "never" ? "checked" : ""}> No end date</label><label><input type="radio" name="recurrence-end" value="until" data-calendar-end-type ${state.calendar.endType === "until" ? "checked" : ""}> Until date</label>${state.calendar.endType === "until" ? `<input type="date" aria-label="Recurrence until date" data-calendar-field="untilDate" value="${escapeHtml(state.calendar.untilDate)}">` : ""}<label><input type="radio" name="recurrence-end" value="count" data-calendar-end-type ${state.calendar.endType === "count" ? "checked" : ""}> After occurrences</label>${state.calendar.endType === "count" ? `<input type="number" min="1" step="1" inputmode="numeric" aria-label="Number of occurrences" data-calendar-field="occurrenceCount" value="${escapeHtml(state.calendar.occurrenceCount)}">` : ""}</fieldset>` : ""}
              <p id="goal-calendar-timezone">Times use your browser timezone: <strong>${escapeHtml(timezone)}</strong></p><p id="goal-calendar-help" role="status" aria-live="polite">${escapeHtml(calendarHelpText(state.calendar))}</p>
              <div class="skill-app-actions goal-calendar-actions"><button type="button" data-download-ics ${calendarReady() ? "" : "disabled"} aria-describedby="goal-calendar-help">Download calendar event (.ics)</button>${Array.from({ length: googleButtonCount }, (_unused, index) => `<button type="button" data-google-calendar="${index}" ${calendarReady() ? "" : "disabled"} aria-describedby="goal-google-copy">${recurring && googleButtonCount > 1 ? `Add ${escapeHtml(googleTimeSlots[index] || `time ${index + 1}`)} series to Google Calendar` : recurring ? "Add recurring series to Google Calendar" : "Add to Google Calendar"} <span class="visually-hidden">(opens in a new tab)</span></button>`).join("")}</div>
              <p id="goal-google-copy">${recurring && googleButtonCount > 1 ? "Google Calendar receives one recurring series per daily time so none of your times are lost. " : ""}Each button opens a prefilled event or series in a new tab only after you click. You choose whether to save it. No event details are sent to Google before you click.</p>
            </div></fieldset>
          <button type="submit">Build my summary</button></form>
        <section class="skill-app-panel" data-goal-summary aria-live="polite" tabindex="-1">${state.summaryBuilt ? `<h3>Planning summary</h3><dl class="skill-app-summary">${fields.map(([key, label]) => `<dt>${escapeHtml(label.split(" — ")[0])}</dt><dd>${escapeHtml(state.fields[key] || "Not answered")}</dd>`).join("")}<dt>Target date</dt><dd>${escapeHtml(state.targetDate || "Not set")}</dd></dl>` : ""}</section>
        <footer class="skill-app-footer"><button type="button" class="secondary" data-clear-goal>Clear</button>${linksMarkup(LINKS.goals)}</footer></div>`;
      bind();
    }

    function updateCalendarActions() {
      const ready = calendarReady();
      root.querySelector("[data-download-ics]")?.toggleAttribute("disabled", !ready);
      root.querySelectorAll("[data-google-calendar]").forEach((button) => button.toggleAttribute("disabled", !ready));
      const help = root.querySelector("#goal-calendar-help");
      if (help) help.textContent = calendarHelpText(state.calendar);
    }

    function bind() {
      root.querySelectorAll("[data-goal-field]").forEach((field) => field.addEventListener("input", () => { state.fields[field.dataset.goalField] = field.value; updateCalendarActions(); }));
      root.querySelector("[data-goal-target-date]")?.addEventListener("change", (event) => { state.targetDate = event.target.value; });
      root.querySelector("[data-calendar-enabled]")?.addEventListener("change", (event) => {
        state.calendar.enabled = event.target.checked;
        root.querySelector("[data-calendar-fields]").hidden = !event.target.checked;
        updateCalendarActions();
      });
      root.querySelectorAll("[data-calendar-schedule-type]").forEach((input) => input.addEventListener("change", () => {
        if (!input.checked) return;
        state.calendar.scheduleType = input.value;
        if (input.value === "recurring" && !state.calendar.times.some(Boolean) && state.calendar.startTime) state.calendar.times = [state.calendar.startTime];
        render();
      }));
      root.querySelectorAll("[data-calendar-field]").forEach((field) => {
        const update = () => {
          const key = field.dataset.calendarField;
          state.calendar[key] = field.value;
          if (key === "frequency") render();
          else updateCalendarActions();
        };
        field.addEventListener("input", update);
        field.addEventListener("change", update);
      });
      root.querySelectorAll("[data-calendar-date-offset]").forEach((button) => button.addEventListener("click", () => {
        state.calendar.date = calendarDateFromOffset(button.dataset.calendarDateOffset);
        const input = root.querySelector('[data-calendar-field="date"]');
        if (input) input.value = state.calendar.date;
        updateCalendarActions();
      }));
      root.querySelectorAll("[data-calendar-start-time]").forEach((button) => button.addEventListener("click", () => {
        state.calendar.startTime = button.dataset.calendarStartTime;
        const input = root.querySelector('[data-calendar-field="startTime"]');
        if (input) input.value = state.calendar.startTime;
        updateCalendarActions();
      }));
      root.querySelectorAll("[data-calendar-duration]").forEach((button) => button.addEventListener("click", () => {
        state.calendar.durationMinutes = button.dataset.calendarDuration;
        const input = root.querySelector('[data-calendar-field="durationMinutes"]');
        if (input) input.value = state.calendar.durationMinutes;
        updateCalendarActions();
      }));
      root.querySelectorAll("[data-calendar-time-index]").forEach((input) => {
        const update = () => { state.calendar.times[Number(input.dataset.calendarTimeIndex)] = input.value; updateCalendarActions(); };
        input.addEventListener("input", update);
        input.addEventListener("change", update);
      });
      root.querySelector("[data-add-calendar-time]")?.addEventListener("click", () => { state.calendar.times.push(""); render(); });
      root.querySelectorAll("[data-remove-calendar-time]").forEach((button) => button.addEventListener("click", () => {
        if (state.calendar.times.length <= 1) return;
        state.calendar.times.splice(Number(button.dataset.removeCalendarTime), 1);
        render();
      }));
      root.querySelectorAll("[data-calendar-weekday]").forEach((input) => input.addEventListener("change", () => {
        const selected = new Set(state.calendar.weekdays);
        input.checked ? selected.add(input.value) : selected.delete(input.value);
        state.calendar.weekdays = WEEKDAYS.map(([value]) => value).filter((value) => selected.has(value));
        updateCalendarActions();
      }));
      root.querySelectorAll("[data-calendar-end-type]").forEach((input) => input.addEventListener("change", () => {
        if (!input.checked) return;
        state.calendar.endType = input.value;
        render();
      }));
      root.querySelector("[data-goal-form]")?.addEventListener("submit", (event) => { event.preventDefault(); state.summaryBuilt = true; render(); root.querySelector("[data-goal-summary]")?.focus(); });
      root.querySelector("[data-clear-goal]")?.addEventListener("click", () => { state = initialGoalState(); render(); root.querySelector("textarea")?.focus(); });
      root.querySelector("[data-download-ics]")?.addEventListener("click", () => {
        const ics = buildIcsEvent({ title: goalTitle(state), description: goalDescription(state), calendar: state.calendar, timezone, uid: `${state.gtd.taskId}@therapyskillkit.local` });
        if (!ics) return;
        const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url; link.download = `${state.gtd.taskId}.ics`; link.hidden = true; document.body.append(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      root.querySelectorAll("[data-google-calendar]").forEach((button) => button.addEventListener("click", () => {
        const series = buildGoogleCalendarUrls({ title: goalTitle(state), description: goalDescription(state), calendar: state.calendar, timezone });
        const url = series[Number(button.dataset.googleCalendar)]?.url;
        if (url) window.open(url, "_blank", "noopener");
      }));
    }

    render();
    if (focusCalendarOnLoad) window.requestAnimationFrame(() => {
      const target = root.querySelector("#goal-calendar-commitment");
      target?.scrollIntoView?.({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth" });
      target?.querySelector('[data-calendar-field="date"]')?.focus?.({ preventScroll: true });
      focusCalendarOnLoad = false;
    });
    register(root, {
      toolId: "goal-builder", toolTitle: "SMART Goal Builder", route: Progress.TOOL_ROUTES["goal-builder"],
      getState: () => state,
      setState: (next) => { state = normalizeGoalState(next); render(); },
      validateState: goalStateValid,
      getReadableSummary: goalReadableSummary,
      getSaveFilename: () => state.gtd.taskId,
      serializeMarkdown: (record) => goalGtdMarkdown(record, state),
    });
  }

  function initBehaviourChain(root) {
    const state = { problem: "", vulnerability: "", prompt: "", links: [{ type: "actions", detail: "" }], consequences: "", skills: "", prevention: "", repair: "" };
    const types = ["actions", "body sensations", "cognitions / thoughts", "environment / events", "feelings"];
    function render(focus = false) {
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Behaviour Chain Builder</h2><p>Map what happened without reducing it to one cause. Entries stay on this page.</p></header><section class="skill-app-panel"><label for="chain-problem">Problem behaviour</label><textarea id="chain-problem" data-chain-field="problem">${escapeHtml(state.problem)}</textarea><label for="chain-vulnerability">Vulnerability factors</label><textarea id="chain-vulnerability" data-chain-field="vulnerability">${escapeHtml(state.vulnerability)}</textarea><label for="chain-prompt">Prompting event</label><textarea id="chain-prompt" data-chain-field="prompt">${escapeHtml(state.prompt)}</textarea><h3>Ordered chain links</h3><div data-chain-links>${state.links.map((link, index) => `<fieldset class="skill-app-fieldset"><legend>Link ${index + 1}</legend><label for="chain-type-${index}">Type</label><select id="chain-type-${index}" data-chain-type="${index}">${types.map((type) => `<option ${link.type === type ? "selected" : ""}>${type}</option>`).join("")}</select><label for="chain-detail-${index}">What happened?</label><textarea id="chain-detail-${index}" data-chain-detail="${index}">${escapeHtml(link.detail)}</textarea><div class="skill-app-actions"><button type="button" class="secondary" data-chain-up="${index}" ${index ? "" : "disabled"}>Move up</button><button type="button" class="secondary" data-chain-down="${index}" ${index < state.links.length - 1 ? "" : "disabled"}>Move down</button><button type="button" class="secondary" data-chain-remove="${index}" ${state.links.length > 1 ? "" : "disabled"}>Remove</button></div></fieldset>`).join("")}</div><button type="button" data-chain-add>Add chain link</button><label for="chain-consequences">Consequences</label><textarea id="chain-consequences" data-chain-field="consequences">${escapeHtml(state.consequences)}</textarea><label for="chain-skills">Alternative skills</label><textarea id="chain-skills" data-chain-field="skills">${escapeHtml(state.skills)}</textarea><label for="chain-prevention">Prevention</label><textarea id="chain-prevention" data-chain-field="prevention">${escapeHtml(state.prevention)}</textarea><label for="chain-repair">Repair / solution analysis</label><textarea id="chain-repair" data-chain-field="repair">${escapeHtml(state.repair)}</textarea><h3>Chain view</h3><ol class="skill-app-chain-view">${state.links.map((link) => `<li><strong>${escapeHtml(link.type)}</strong><span>${escapeHtml(link.detail || "Add details above")}</span></li>`).join("")}</ol></section><footer class="skill-app-footer">${linksMarkup(LINKS.chain)}</footer></div>`;
      bind(); if (focus) root.querySelector("[data-chain-links] fieldset:last-child textarea")?.focus();
    }
    function swap(a, b) { [state.links[a], state.links[b]] = [state.links[b], state.links[a]]; render(); }
    function bind() {
      root.querySelectorAll("[data-chain-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.chainField] = field.value; }));
      root.querySelectorAll("[data-chain-type]").forEach((field) => field.addEventListener("change", () => { state.links[Number(field.dataset.chainType)].type = field.value; render(); }));
      root.querySelectorAll("[data-chain-detail]").forEach((field) => field.addEventListener("input", () => { state.links[Number(field.dataset.chainDetail)].detail = field.value; root.querySelectorAll(".skill-app-chain-view li span")[Number(field.dataset.chainDetail)].textContent = field.value || "Add details above"; }));
      root.querySelector("[data-chain-add]").addEventListener("click", () => { state.links.push({ type: "actions", detail: "" }); render(true); });
      root.querySelectorAll("[data-chain-up]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.chainUp), Number(button.dataset.chainUp) - 1)));
      root.querySelectorAll("[data-chain-down]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.chainDown), Number(button.dataset.chainDown) + 1)));
      root.querySelectorAll("[data-chain-remove]").forEach((button) => button.addEventListener("click", () => { state.links.splice(Number(button.dataset.chainRemove), 1); render(); }));
    }
    render();
    const scalarKeys = ["problem", "vulnerability", "prompt", "consequences", "skills", "prevention", "repair"];
    register(root, {
      toolId: "behaviour-chain",
      toolTitle: "Behaviour Chain Builder",
      route: Progress.TOOL_ROUTES["behaviour-chain"],
      getState: () => state,
      setState: (next) => { Object.assign(state, next); state.links = next.links.map((link) => ({ ...link })); render(); },
      validateState: (next) => Progress.isPlainObject(next)
        && Object.keys(next).every((key) => [...scalarKeys, "links"].includes(key))
        && scalarKeys.every((key) => typeof next[key] === "string")
        && Array.isArray(next.links) && next.links.length >= 1 && next.links.length <= 100
        && next.links.every((link) => Progress.isPlainObject(link) && Object.keys(link).every((key) => ["type", "detail"].includes(key)) && types.includes(link.type) && typeof link.detail === "string"),
      getReadableSummary: (next) => {
        const lines = ["# Behaviour Chain", ""];
        [["Vulnerability Factors", next.vulnerability], ["Prompting Event", next.prompt]].forEach(([heading, value]) => { if (value) lines.push(`## ${heading}`, "", value, ""); });
        const usedLinks = next.links.filter((link) => link.detail);
        if (usedLinks.length) { lines.push("## Chain", ""); usedLinks.forEach((link, index) => lines.push(`${index + 1}. ${link.type}: ${link.detail}`)); lines.push(""); }
        [["Problem Behaviour", next.problem], ["Consequences", next.consequences], ["Skillful Alternatives", next.skills], ["Prevention", next.prevention], ["Repair", next.repair]].forEach(([heading, value]) => { if (value) lines.push(`## ${heading}`, "", value, ""); });
        return lines.join("\n").trim();
      },
    });
  }

  function initExposure(root) {
    const state = { theme: "", safety: "", steps: [{ situation: "", before: "0", after: "" }], next: "" };
    function render(focus = false) {
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Exposure Ladder</h2><p>Include only objectively safe, appropriate steps. Entries stay on this page.</p></header><section class="skill-app-panel"><label for="exposure-theme">Feared situation or theme</label><textarea id="exposure-theme" data-exposure-field="theme">${escapeHtml(state.theme)}</textarea><label for="exposure-safety">Safety behaviours I want to notice</label><textarea id="exposure-safety" data-exposure-field="safety">${escapeHtml(state.safety)}</textarea><h3>Graded steps: easier to harder</h3>${state.steps.map((step, index) => `<fieldset class="skill-app-fieldset"><legend>Step ${index + 1}</legend><label for="exposure-step-${index}">Objectively safe practice situation</label><textarea id="exposure-step-${index}" data-exposure-step="${index}">${escapeHtml(step.situation)}</textarea><div class="skill-app-inline-fields"><div><label for="exposure-before-${index}">Before rating 0-100</label><input id="exposure-before-${index}" type="number" min="0" max="100" data-exposure-before="${index}" value="${step.before}"></div><div><label for="exposure-after-${index}">After rating 0-100</label><input id="exposure-after-${index}" type="number" min="0" max="100" data-exposure-after="${index}" value="${escapeHtml(step.after)}"></div></div><div class="skill-app-actions"><button type="button" class="secondary" data-exposure-up="${index}" ${index ? "" : "disabled"}>Move easier</button><button type="button" class="secondary" data-exposure-down="${index}" ${index < state.steps.length - 1 ? "" : "disabled"}>Move harder</button><button type="button" class="secondary" data-exposure-remove="${index}" ${state.steps.length > 1 ? "" : "disabled"}>Remove</button></div></fieldset>`).join("")}<button type="button" data-exposure-add>Add safe step</button><label for="exposure-next">Next practice step</label><textarea id="exposure-next" data-exposure-field="next">${escapeHtml(state.next)}</textarea></section><footer class="skill-app-footer">${linksMarkup(LINKS.exposure)}</footer></div>`;
      bind(); if (focus) root.querySelector("fieldset:last-of-type textarea")?.focus();
    }
    function swap(a, b) { [state.steps[a], state.steps[b]] = [state.steps[b], state.steps[a]]; render(); }
    function bind() {
      root.querySelectorAll("[data-exposure-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.exposureField] = field.value; }));
      root.querySelectorAll("[data-exposure-step]").forEach((field) => field.addEventListener("input", () => { state.steps[Number(field.dataset.exposureStep)].situation = field.value; }));
      root.querySelectorAll("[data-exposure-before]").forEach((field) => field.addEventListener("input", () => { state.steps[Number(field.dataset.exposureBefore)].before = field.value; }));
      root.querySelectorAll("[data-exposure-after]").forEach((field) => field.addEventListener("input", () => { state.steps[Number(field.dataset.exposureAfter)].after = field.value; }));
      root.querySelector("[data-exposure-add]").addEventListener("click", () => { state.steps.push({ situation: "", before: "0", after: "" }); render(true); });
      root.querySelectorAll("[data-exposure-up]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.exposureUp), Number(button.dataset.exposureUp) - 1)));
      root.querySelectorAll("[data-exposure-down]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.exposureDown), Number(button.dataset.exposureDown) + 1)));
      root.querySelectorAll("[data-exposure-remove]").forEach((button) => button.addEventListener("click", () => { state.steps.splice(Number(button.dataset.exposureRemove), 1); render(); }));
    }
    render();
    register(root, {
      toolId: "exposure",
      toolTitle: "Exposure Ladder",
      route: Progress.TOOL_ROUTES.exposure,
      getState: () => state,
      setState: (next) => { Object.assign(state, next); state.steps = next.steps.map((step) => ({ ...step })); render(); },
      validateState: (next) => Progress.isPlainObject(next)
        && Object.keys(next).every((key) => ["theme", "safety", "steps", "next"].includes(key))
        && ["theme", "safety", "next"].every((key) => typeof next[key] === "string")
        && Array.isArray(next.steps) && next.steps.length >= 1 && next.steps.length <= 100
        && next.steps.every((step) => Progress.isPlainObject(step)
          && Object.keys(step).every((key) => ["situation", "before", "after"].includes(key))
          && ["situation", "before", "after"].every((key) => typeof step[key] === "string")
          && [step.before, step.after].every((value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100))),
      getReadableSummary: (next) => {
        const lines = ["# Exposure Ladder", ""];
        [["Feared Theme", next.theme], ["Safety Behaviours", next.safety]].forEach(([heading, value]) => { if (value) lines.push(`## ${heading}`, "", value, ""); });
        const used = next.steps.filter((step) => step.situation || step.before || step.after);
        if (used.length) { lines.push("## Exposure Steps", ""); used.forEach((step, index) => lines.push(`${index + 1}. ${step.situation || "Unnamed step"}${step.before !== "" ? ` — before: ${step.before}/100` : ""}${step.after !== "" ? `; after: ${step.after}/100` : ""}`)); lines.push(""); }
        if (next.next) lines.push("## Next Practice Step", "", next.next);
        return lines.join("\n").trim();
      },
    });
  }

  function start() {
    document.querySelectorAll("[data-practice-app]").forEach((root) => {
      const name = root.dataset.practiceApp;
      if (name === "behaviour-chain") initBehaviourChain(root);
      else if (name === "exposure") initExposure(root);
      else if (name === "goal-builder") initGoalBuilder(root);
      else if (FORM_DEFINITIONS[name]) initGuidedForm(root, FORM_DEFINITIONS[name]);
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = {
    FORM_DEFINITIONS, WEEKDAYS, calendarDateFromOffset, calendarWindow, calendarTimeSlots, recurrenceStartDate, calendarCommitmentValid,
    recurrenceRule, zonedDateTimeToDate, calendarHelpText, escapeIcsText, buildIcsEvent, buildGoogleCalendarUrl,
    buildGoogleCalendarUrls, goalBuilderPrefill, normalizeGoalState, goalGtdMarkdown, goalTitle,
  };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", start);
})();

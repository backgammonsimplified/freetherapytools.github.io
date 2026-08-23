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

  function utcCalendarStamp(date) {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  function calendarWindow(calendar) {
    const dateMatch = String(calendar?.date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = String(calendar?.startTime || "").match(/^(\d{2}):(\d{2})$/);
    const duration = Number(calendar?.durationMinutes);
    if (!dateMatch || !timeMatch || !Number.isInteger(duration) || duration < 1 || duration > 1440) return null;
    const parts = [...dateMatch.slice(1), ...timeMatch.slice(1)].map(Number);
    const start = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], 0, 0);
    if (start.getFullYear() !== parts[0] || start.getMonth() !== parts[1] - 1 || start.getDate() !== parts[2] || start.getHours() !== parts[3] || start.getMinutes() !== parts[4]) return null;
    return { start, end: new Date(start.getTime() + duration * 60000) };
  }

  function escapeIcsText(value) {
    return String(value || "").replaceAll("\\", "\\\\").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  }

  function buildIcsEvent(options) {
    const range = calendarWindow(options.calendar);
    const title = String(options.title || "").trim();
    if (!range || !title) return null;
    const now = options.now instanceof Date ? options.now : new Date();
    const uid = String(options.uid || `goal-${now.getTime()}@therapyskillkit.local`).replace(/[^A-Za-z0-9@._-]/g, "-");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Therapy Skill Kit//SMART Goal Builder//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${utcCalendarStamp(now)}`, `DTSTART:${utcCalendarStamp(range.start)}`, `DTEND:${utcCalendarStamp(range.end)}`,
      `SUMMARY:${escapeIcsText(title)}`, `DESCRIPTION:${escapeIcsText(options.description || "")}`, "END:VEVENT", "END:VCALENDAR", "",
    ].join("\r\n");
  }

  function buildGoogleCalendarUrl(options) {
    const range = calendarWindow(options.calendar);
    const title = String(options.title || "").trim();
    if (!range || !title) return null;
    const timezone = String(options.timezone || "UTC");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      dates: `${utcCalendarStamp(range.start)}/${utcCalendarStamp(range.end)}`,
      stz: timezone,
      etz: timezone,
      text: title,
      details: String(options.description || ""),
    });
    return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
  }

  function goalBuilderPrefill(payload) {
    const values = Array.isArray(payload?.values) ? payload.values.filter((value) => typeof value === "string") : [];
    const domain = typeof payload?.domain === "string" ? payload.domain : "";
    const valueText = values.join(" and ");
    const direction = [valueText, domain && `in ${domain}`].filter(Boolean).join(" ");
    return {
      fields: {
        direction,
        specific: typeof payload?.how === "string" ? payload.how : "",
        measurable: "",
        achievable: "",
        relevant: direction ? `This supports ${direction}.` : "",
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
      calendar: { enabled: false, date: "", startTime: "", durationMinutes: "30" },
      gtd: makeGtdIdentity(now),
    };
  }

  function normalizeGoalState(next) {
    const normalized = initialGoalState();
    GOAL_FIELD_KEYS.forEach((key) => { normalized.fields[key] = typeof next?.fields?.[key] === "string" ? next.fields[key] : ""; });
    normalized.summaryBuilt = Boolean(next?.summaryBuilt);
    if (next?.context) normalized.context = { ...normalized.context, ...next.context, values: Array.isArray(next.context.values) ? [...next.context.values] : [] };
    normalized.targetDate = typeof next?.targetDate === "string" ? next.targetDate : "";
    if (next?.calendar) normalized.calendar = { ...normalized.calendar, ...next.calendar, enabled: Boolean(next.calendar.enabled) };
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
      ["Calendar Commitment", state.calendar.enabled && calendarWindow(state.calendar) ? `${state.calendar.date} at ${state.calendar.startTime} for ${state.calendar.durationMinutes} minutes` : ""],
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
      && Object.keys(next.calendar).every((key) => ["enabled", "date", "startTime", "durationMinutes"].includes(key))
      && typeof next.calendar.enabled === "boolean"
      && ["date", "startTime", "durationMinutes"].every((key) => typeof next.calendar[key] === "string")
      && Progress.isPlainObject(next.gtd)
      && Object.keys(next.gtd).every((key) => ["taskId", "captureSequence", "createdAt"].includes(key))
      && typeof next.gtd.taskId === "string" && Number.isSafeInteger(next.gtd.captureSequence) && typeof next.gtd.createdAt === "string";
  }

  function initGoalBuilder(root) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let state = initialGoalState();
    const token = new URLSearchParams(window.location.search).get("handoff");
    if (token && window.TherapySkillHandoff) {
      const payload = window.TherapySkillHandoff.consumePayload(token);
      if (payload) {
        const prefill = goalBuilderPrefill(payload);
        state.fields = prefill.fields;
        state.context = prefill.context;
      }
      const clean = new URL(window.location.href);
      clean.searchParams.delete("handoff");
      window.history.replaceState(null, "", `${clean.pathname}${clean.search}${clean.hash}`);
    }

    function calendarReady() { return state.calendar.enabled && Boolean(calendarWindow(state.calendar)) && Boolean(goalTitle(state)); }

    function render() {
      const fields = [
        ["direction", "Direction or value this goal supports"], ["specific", "Specific — What exactly will I do?"],
        ["measurable", "Measurable — How will I know it happened?"], ["achievable", "Achievable — What makes this within reach?"],
        ["relevant", "Relevant / Realistic — Why does it matter, and does it fit current circumstances?"],
        ["time", "Time-Oriented — What timing, rhythm, or review point matters?"], ["smallest", "Smallest useful version"], ["support", "What could support follow-through?"],
      ];
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>SMART Goal Builder</h2><p>Connect a meaningful direction with an observable next step. A formal goal is optional; use it when structure would help. Your answers stay in this browser unless you save or explicitly open a calendar handoff.</p></header>
        <form class="skill-app-panel" data-goal-form>${state.context.domain || state.context.what ? `<aside class="skill-app-note"><strong>From your Values plan</strong>${state.context.domain ? `<span>Life Domain: ${escapeHtml(state.context.domain)}</span>` : ""}${state.context.values.length ? `<span>Values: ${escapeHtml(state.context.values.join(", "))}</span>` : ""}${state.context.what ? `<span>What: ${escapeHtml(state.context.what)}</span>` : ""}${state.context.how ? `<span>How: ${escapeHtml(state.context.how)}</span>` : ""}</aside>` : ""}
          ${fields.map(([key, label]) => `<label for="goal-${key}">${escapeHtml(label)}</label><textarea id="goal-${key}" name="${key}" data-goal-field="${key}">${escapeHtml(state.fields[key])}</textarea>`).join("")}
          <fieldset class="skill-app-fieldset"><legend>Target date / deadline</legend><p class="skill-app-field-help">This is goal or task metadata. It does not automatically create a calendar event.</p><label for="goal-target-date">Target date</label><input id="goal-target-date" type="date" data-goal-target-date value="${escapeHtml(state.targetDate)}"></fieldset>
          <fieldset class="skill-app-fieldset"><legend>Specific calendar commitment</legend><label class="skill-app-check"><input type="checkbox" data-calendar-enabled ${state.calendar.enabled ? "checked" : ""}> <span>Schedule a specific action</span></label><p>Use this only for a date-and-time commitment such as a call, meeting, or focused work session.</p>
            <div data-calendar-fields ${state.calendar.enabled ? "" : "hidden"}><div class="skill-app-inline-fields"><div><label for="goal-calendar-date">Date</label><input id="goal-calendar-date" type="date" data-calendar-field="date" value="${escapeHtml(state.calendar.date)}"></div><div><label for="goal-calendar-time">Start time</label><input id="goal-calendar-time" type="time" data-calendar-field="startTime" value="${escapeHtml(state.calendar.startTime)}"></div><div><label for="goal-calendar-duration">Duration (minutes)</label><input id="goal-calendar-duration" type="number" min="1" max="1440" step="5" inputmode="numeric" data-calendar-field="durationMinutes" value="${escapeHtml(state.calendar.durationMinutes)}"></div></div>
              <p id="goal-calendar-timezone">Browser-local timezone: <strong>${escapeHtml(timezone)}</strong></p><p id="goal-calendar-help">Enter a date, start time, and duration to enable calendar actions.</p>
              <div class="skill-app-actions"><button type="button" data-download-ics ${calendarReady() ? "" : "disabled"} aria-describedby="goal-calendar-help">Download calendar event (.ics)</button><button type="button" data-google-calendar ${calendarReady() ? "" : "disabled"} aria-describedby="goal-google-copy">Add to Google Calendar <span class="visually-hidden">(opens in a new tab)</span></button></div>
              <p id="goal-google-copy">Opens a prefilled Google Calendar event in a new tab. You choose whether to save it. No event details are sent to Google before you click.</p>
            </div></fieldset>
          <button type="submit">Build my summary</button></form>
        <section class="skill-app-panel" data-goal-summary aria-live="polite" tabindex="-1">${state.summaryBuilt ? `<h3>Planning summary</h3><dl class="skill-app-summary">${fields.map(([key, label]) => `<dt>${escapeHtml(label.split(" — ")[0])}</dt><dd>${escapeHtml(state.fields[key] || "Not answered")}</dd>`).join("")}<dt>Target date</dt><dd>${escapeHtml(state.targetDate || "Not set")}</dd></dl>` : ""}</section>
        <footer class="skill-app-footer"><button type="button" class="secondary" data-clear-goal>Clear</button>${linksMarkup(LINKS.goals)}</footer></div>`;
      bind();
    }

    function updateCalendarActions() {
      const ready = calendarReady();
      root.querySelector("[data-download-ics]")?.toggleAttribute("disabled", !ready);
      root.querySelector("[data-google-calendar]")?.toggleAttribute("disabled", !ready);
    }

    function bind() {
      root.querySelectorAll("[data-goal-field]").forEach((field) => field.addEventListener("input", () => { state.fields[field.dataset.goalField] = field.value; updateCalendarActions(); }));
      root.querySelector("[data-goal-target-date]")?.addEventListener("change", (event) => { state.targetDate = event.target.value; });
      root.querySelector("[data-calendar-enabled]")?.addEventListener("change", (event) => {
        state.calendar.enabled = event.target.checked;
        root.querySelector("[data-calendar-fields]").hidden = !event.target.checked;
        updateCalendarActions();
      });
      root.querySelectorAll("[data-calendar-field]").forEach((field) => field.addEventListener("input", () => { state.calendar[field.dataset.calendarField] = field.value; updateCalendarActions(); }));
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
      root.querySelector("[data-google-calendar]")?.addEventListener("click", () => {
        const url = buildGoogleCalendarUrl({ title: goalTitle(state), description: goalDescription(state), calendar: state.calendar, timezone });
        if (url) window.open(url, "_blank", "noopener");
      });
    }

    render();
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

  if (typeof module !== "undefined" && module.exports) module.exports = { FORM_DEFINITIONS, calendarWindow, escapeIcsText, buildIcsEvent, buildGoogleCalendarUrl, goalBuilderPrefill, normalizeGoalState, goalGtdMarkdown, goalTitle };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", start);
})();

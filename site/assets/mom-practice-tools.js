(function (global) {
  "use strict";
  const Progress = global.TherapySkillProgress || (typeof require === "function" ? require("./skill-progress.js") : null);
  const Site = global.TherapySite || { path: (value) => value };
  const source = "Dennis Greenberger and Christine A. Padesky, Mind Over Mood, second edition (2016)";
  const TYPES = Object.freeze({
    "activity-mood-log": {
      title: "Activity & Mood Log",
      intro: "Notice patterns across ordinary days. An entry can record an activity, a mood, or both. A useful action does not have to improve mood immediately.",
      general: [["focus", "What pattern or question would I like to notice?"], ["reflection", "Across these entries, what helps, and what might I adjust?"]],
      fields: [["date", "Date", "date"], ["activity", "Activity or situation (optional)"], ["mood", "Mood or feeling in my own words"], ["rating", "Mood intensity (0-100, optional)", "number"], ["engagement", "What offered enjoyment, connection, care, or accomplishment?"], ["noticing", "What did I notice afterward, including any uncertainty?"]],
      reference: source + ", Chapter 13, printed pp. 201-218; Chapter 15, printed pp. 252-254.",
      lesson: "/learn/cbt-anxiety/maintaining-progress.html",
      related: "/tool-finder/behavioural-activation/",
      relatedLabel: "Plan one small activity",
    },
    "core-belief-evidence-log": {
      title: "Core Belief Evidence Log",
      intro: "Gather specific observations over time for a more flexible view. Confidence is optional and is not proof that a belief is true.",
      general: [["oldBelief", "Which broad belief or rule am I examining?"], ["newBelief", "What fairer possibility would I like to investigate?"], ["confidenceBefore", "Confidence in that possibility before reviewing (0-100, optional)", "number"], ["confidenceAfter", "Confidence after reviewing (0-100, optional)", "number"], ["reflection", "What is the whole pattern, including gaps or uncertainty?"]],
      fields: [["date", "Date", "date"], ["observation", "What actually happened? Separate observations from interpretations."], ["direction", "How does it relate to the new possibility?", "select"], ["partial", "Where was there even a partial exception to the old all-or-nothing rule?"], ["next", "What might I try or notice next?"]],
      reference: source + ", Chapter 12, printed pp. 152-187.",
      lesson: "/learn/cbt-anxiety/assumptions-core-beliefs.html",
      related: "/tool-finder/behavioural-experiment/",
      relatedLabel: "Plan a safe experiment",
    },
  });
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const plain = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const keys = (fields) => fields.map(([key]) => key);
  const emptyFields = (fields) => Object.fromEntries(keys(fields).map((key) => [key, ""]));
  const newId = () => "entry-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  function initialState(type) {
    const definition = TYPES[type];
    return { general: emptyFields(definition.general), entries: [{ id: newId(), ...emptyFields(definition.fields) }] };
  }
  function validRating(value) { return value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100); }
  function validState(type, state) {
    const definition = TYPES[type];
    if (!definition || !plain(state) || !Object.keys(state).every((key) => ["general", "entries"].includes(key)) || !plain(state.general)) return false;
    const gkeys = keys(definition.general);
    if (!gkeys.every((key) => typeof state.general[key] === "string") || !Object.keys(state.general).every((key) => gkeys.includes(key))) return false;
    if (!Array.isArray(state.entries) || !state.entries.length || state.entries.length > 100) return false;
    const ekeys = keys(definition.fields), seen = new Set();
    if (type === "core-belief-evidence-log" && !["confidenceBefore", "confidenceAfter"].every((key) => validRating(state.general[key]))) return false;
    return state.entries.every((entry) => {
      if (!plain(entry) || typeof entry.id !== "string" || !entry.id || seen.has(entry.id)) return false;
      seen.add(entry.id);
      if (!ekeys.every((key) => typeof entry[key] === "string") || !Object.keys(entry).every((key) => key === "id" || ekeys.includes(key))) return false;
      return type === "activity-mood-log" ? validRating(entry.rating) : ["", "supports", "complicates", "unclear"].includes(entry.direction);
    });
  }
  function readable(type, state) {
    const definition = TYPES[type];
    const sections = definition.general.map(([key, label]) => [label, state.general[key]]);
    state.entries.forEach((entry, index) => {
      sections.push(["Entry " + (index + 1), definition.fields.map(([key, label]) => entry[key] ? label + ": " + entry[key] : "").filter(Boolean)]);
    });
    sections.push(["Source", "Original educational prompts informed by " + definition.reference]);
    return Progress.nonEmptySections(definition.title, sections);
  }
  function fieldMarkup(type, scope, id, [key, label, kind = "textarea"], value) {
    const controlId = type + "-" + scope + "-" + id + "-" + key;
    const attr = scope === "general" ? "data-mom-general" : "data-mom-field";
    const labelHtml = '<label for="' + escapeHtml(controlId) + '">' + escapeHtml(label) + "</label>";
    if (kind === "select") {
      const options = [["", "Choose only if useful"], ["supports", "Supports this possibility"], ["complicates", "Complicates this possibility"], ["unclear", "Unclear or mixed"]];
      return labelHtml + '<select id="' + escapeHtml(controlId) + '" ' + attr + '="' + key + '">' + options.map(([code, text]) => '<option value="' + code + '"' + (value === code ? " selected" : "") + ">" + text + "</option>").join("") + "</select>";
    }
    if (kind === "date" || kind === "number") {
      return labelHtml + '<input id="' + escapeHtml(controlId) + '" type="' + kind + '" ' + (kind === "number" ? 'min="0" max="100" step="1" inputmode="numeric" ' : "") + attr + '="' + key + '" value="' + escapeHtml(value) + '">';
    }
    return labelHtml + '<textarea id="' + escapeHtml(controlId) + '" ' + attr + '="' + key + '">' + escapeHtml(value) + "</textarea>";
  }
  function trendText(type, state) {
    if (type === "activity-mood-log") {
      const records = state.entries.filter((entry) => entry.mood || entry.activity || entry.rating);
      const ratings = records.filter((entry) => validRating(entry.rating) && entry.rating !== "");
      if (!records.length) return "Entries will appear here as you add them.";
      const lines = records.map((entry, index) => (entry.date || "Entry " + (index + 1)) + ": " + (entry.mood || "Mood not named") + (entry.rating ? " (" + entry.rating + "/100)" : "") + (entry.activity ? " during " + entry.activity : ""));
      const span = ratings.length > 1 ? " First and last recorded intensity: " + ratings[0].rating + "/100 and " + ratings[ratings.length - 1].rating + "/100. Ratings describe your entries; they are not a diagnosis or a grade." : "";
      return records.length + " recorded moment(s). " + lines.join(" | ") + span;
    }
    const counts = { supports: 0, complicates: 0, unclear: 0 };
    state.entries.forEach((entry) => { if (counts[entry.direction] !== undefined) counts[entry.direction] += 1; });
    return counts.supports + " supporting, " + counts.complicates + " complicating, and " + counts.unclear + " uncertain observation(s). Unlabelled entries remain in your log. Consider the details, not just the counts.";
  }
  function mount(root, type) {
    const definition = TYPES[type];
    let state = initialState(type);
    const clone = (value) => JSON.parse(JSON.stringify(value));
    function updateTrend() { root.querySelector("[data-mom-trend]").textContent = trendText(type, state); }
    function render(focusId) {
      root.innerHTML = '<div class="skill-app-shell"><header class="skill-app-header"><h2>' + escapeHtml(definition.title) + '</h2><p>' + escapeHtml(definition.intro) + '</p></header>'
        + '<section class="skill-app-panel"><h3>What I am looking at</h3>'
        + definition.general.map((field) => fieldMarkup(type, "general", "overview", field, state.general[field[0]])).join("")
        + '<h3>My entries</h3><div data-mom-entries>'
        + state.entries.map((entry, index) => '<fieldset class="skill-app-fieldset" data-mom-entry="' + escapeHtml(entry.id) + '"><legend>Entry ' + (index + 1) + '</legend>'
          + definition.fields.map((field) => fieldMarkup(type, "entry", entry.id, field, entry[field[0]])).join("")
          + (state.entries.length > 1 ? '<button class="secondary" type="button" data-mom-remove>Remove entry</button>' : "") + "</fieldset>").join("")
        + '</div><button type="button" data-mom-add>Add another entry</button></section>'
        + '<section class="skill-app-panel" aria-live="polite"><h3>' + (type === "activity-mood-log" ? "Pattern review" : "Evidence review") + '</h3><p data-mom-trend></p></section>'
        + '<footer class="skill-app-footer"><div class="skill-app-result-links"><a class="skill-app-link-button secondary" href="' + escapeHtml(Site.path(definition.lesson)) + '" target="_blank" rel="noopener">Learn this skill</a><a class="skill-app-link-button secondary" href="' + escapeHtml(Site.path(definition.related)) + '" target="_blank" rel="noopener">' + escapeHtml(definition.relatedLabel) + "</a></div></footer></div>";
      updateTrend();
      if (focusId) root.querySelector('[data-mom-entry="' + focusId + '"] textarea')?.focus();
    }
    root.addEventListener("input", (event) => {
      const generalKey = event.target.dataset.momGeneral;
      const fieldKey = event.target.dataset.momField;
      if (generalKey) state.general[generalKey] = event.target.value;
      if (fieldKey) {
        const entry = state.entries.find((item) => item.id === event.target.closest("[data-mom-entry]")?.dataset.momEntry);
        if (entry) entry[fieldKey] = event.target.value;
      }
      updateTrend();
    });
    root.addEventListener("change", (event) => {
      if (event.target.dataset.momGeneral || event.target.dataset.momField) event.target.dispatchEvent(new Event("input", { bubbles: true }));
    });
    root.addEventListener("click", (event) => {
      if (event.target.matches("[data-mom-add]") && state.entries.length < 100) {
        const entry = { id: newId(), ...emptyFields(definition.fields) };
        state.entries.push(entry); render(entry.id);
      }
      if (event.target.matches("[data-mom-remove]") && state.entries.length > 1) {
        const id = event.target.closest("[data-mom-entry]")?.dataset.momEntry;
        state.entries = state.entries.filter((entry) => entry.id !== id);
        render();
      }
    });
    render();
    Progress.registerTool({ schemaVersion: 1, root, toolId: type, toolTitle: definition.title, route: Progress.TOOL_ROUTES[type],
      getState: () => clone(state), setState: (next) => { state = clone(next); render(); },
      validateState: (next) => validState(type, next), getReadableSummary: (next) => readable(type, next) });
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { TYPES, initialState, validState, readable, trendText };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-mom-app]").forEach((root) => { if (TYPES[root.dataset.momApp]) mount(root, root.dataset.momApp); });
  });
})(typeof window !== "undefined" ? window : globalThis);

(function (global) {
  "use strict";

  const SkillApps = {
    calculateGap(current, desired) {
      return Number(desired) - Number(current);
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SkillApps;
  }
  global.SkillApps = SkillApps;

  if (typeof document === "undefined") return;

  const STEPS = ["DISCOVER", "SORT", "NARROW", "ASSESS", "ACT", "BARRIERS", "MISSION", "REVIEW"];
  const VALUE_IMPORTANCE = [
    { label: "H", value: "High" },
    { label: "M", value: "Medium" },
    { label: "L", value: "Low" },
  ];
  const Progress = global.TherapySkillProgress;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function valueAt(object, path, fallback = "") {
    return path.split(".").reduce((value, key) => value && value[key], object) ?? fallback;
  }

  function setValue(object, path, value) {
    const parts = path.split(".");
    let target = object;
    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] || {};
      target = target[part];
    });
    target[parts.at(-1)] = value;
  }

  function initialValuesState() {
    return {
      step: 0,
      selected: {},
      custom: [],
      domains: {},
      core: {},
      assessments: {},
      focus: [],
      actions: {},
      barriers: {},
      mission: {},
      review: {},
    };
  }

  function allValues(data, state) {
    return [...data.values, ...state.custom].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }

  function selectedValues(data, state) {
    return allValues(data, state).filter((value) => state.selected[value.id]);
  }

  function normalizedValueImportance(value) {
    const rating = String(value || "");
    if (["High", "Medium", "Low"].includes(rating)) return rating;
    if (["4", "5"].includes(rating)) return "High";
    if (rating === "3") return "Medium";
    if (["1", "2"].includes(rating)) return "Low";
    return "";
  }

  function coreValues(data, state) {
    return selectedValues(data, state).filter((value) => state.core[value.id]?.chosen);
  }

  function progressMarkup(step) {
    return `<ol class="skill-app-progress" aria-label="Values process">${STEPS.map((name, index) =>
      `<li${index === step ? ' aria-current="step"' : ""}>${index + 1}. ${name}</li>`
    ).join("")}</ol>`;
  }

  function discoverMarkup(data, state) {
    const selected = state.selected;
    const cards = allValues(data, state).map((value) => {
      const active = Boolean(selected[value.id]);
      const importance = normalizedValueImportance(selected[value.id]?.rating);
      return `<article class="skill-app-card" data-value-card data-search="${escapeHtml(`${value.name} ${value.definition}`.toLowerCase())}">
        <h4>${escapeHtml(value.name)}</h4>
        <details class="values-definition"><summary><span class="values-definition-show">View definition</span><span class="values-definition-hide">Hide definition</span></summary><p>${escapeHtml(value.definition)}</p></details>
        <div class="values-card-controls">
          <button type="button" class="values-select-button ${active ? "secondary" : ""}" data-toggle-value="${escapeHtml(value.id)}" aria-pressed="${active}">${active ? "Remove" : "Select"}</button>
          ${active ? `<fieldset class="values-importance"><legend>Importance:</legend><div class="values-importance-buttons" role="group" aria-label="Importance for ${escapeHtml(value.name)}">${VALUE_IMPORTANCE.map(({ label, value: rating }) => `<button type="button" class="${importance === rating ? "" : "secondary"}" data-rating="${escapeHtml(value.id)}" data-importance-value="${rating}" aria-label="${rating} importance" aria-pressed="${importance === rating}">${label}</button>`).join("")}</div></fieldset>` : ""}
        </div>
      </article>`;
    }).join("");
    return `<div class="values-discover-title"><h3>Discover</h3><button type="button" class="secondary values-clear-button" data-clear>Clear selections</button></div>
      <p>Search the workbook's Master Values Dictionary. Select words that resonate; 10-20 is a useful starting range, not a requirement.</p>
      <p class="skill-app-count" aria-live="polite"><span data-selected-count>${Object.keys(selected).length}</span> selected</p>
      <label for="values-search">Search values and definitions</label>
      <input id="values-search" type="search" data-values-search autocomplete="off">
      <div class="skill-app-actions values-custom-row">
        <input type="text" data-custom-value aria-label="Custom value name" placeholder="Add your own value">
        <button type="button" data-add-custom>Add custom value</button>
      </div>
      <div class="skill-app-card-grid" data-value-list>${cards}</div>`;
  }

  function sortMarkup(data, state) {
    const values = selectedValues(data, state);
    if (!values.length) return `<h3>Sort</h3><p class="skill-app-note">Return to Discover and select at least one value.</p>`;
    return `<h3>Sort</h3><p>Assign each selected value to one or more life domains. A value can belong in several areas.</p>
      <div class="skill-app-grid">${values.map((value) => `<fieldset class="skill-app-fieldset"><legend>${escapeHtml(value.name)}</legend>
        <div class="skill-app-domain-grid">${data.domains.map((domain) => `<label class="skill-app-check"><input type="checkbox" data-domain-value="${escapeHtml(value.id)}" value="${escapeHtml(domain.id)}" ${(state.domains[value.id] || []).includes(domain.id) ? "checked" : ""}> <span>${escapeHtml(domain.name)}</span></label>`).join("")}</div>
      </fieldset>`).join("")}</div>`;
  }

  function narrowMarkup(data, state) {
    const values = selectedValues(data, state);
    return `<h3>Narrow</h3>
      <p>Group related selections into value families. Choose the representative core value that best captures each family. Aim around 5-10 if useful; no exact number is required.</p>
      <div class="skill-app-card-grid">${values.map((value) => {
        const current = state.core[value.id] || {};
        return `<article class="skill-app-card"><label class="skill-app-check"><input type="checkbox" data-core-value="${escapeHtml(value.id)}" ${current.chosen ? "checked" : ""}> <span>Use <strong>${escapeHtml(value.name)}</strong> as a core value</span></label>
          <label for="family-${escapeHtml(value.id)}">Optional family label or related values</label>
          <input id="family-${escapeHtml(value.id)}" type="text" data-field="core.${escapeHtml(value.id)}.family" value="${escapeHtml(current.family)}">
        </article>`;
      }).join("")}</div>`;
  }

  function assessMarkup(data, state) {
    const values = coreValues(data, state);
    if (!values.length) return `<h3>Assess</h3><p class="skill-app-note">Choose at least one representative core value in Narrow.</p>`;
    return `<h3>Assess</h3><p>Rate a value in context. The gap is desired minus current. A larger gap is information, not a command.</p>
      <div class="skill-app-grid">${values.map((value) => {
        const a = Object.assign({ importance: 5, current: 5, desired: 5, domain: "" }, state.assessments[value.id]);
        return `<fieldset class="skill-app-fieldset" data-assessment-card="${escapeHtml(value.id)}"><legend>${escapeHtml(value.name)}</legend>
          <label for="assess-domain-${escapeHtml(value.id)}">Life domain</label><select id="assess-domain-${escapeHtml(value.id)}" data-assess="domain"><option value="">Choose a domain</option>${data.domains.map((domain) => `<option value="${escapeHtml(domain.id)}" ${a.domain === domain.id ? "selected" : ""}>${escapeHtml(domain.name)}</option>`).join("")}</select>
          <div class="skill-app-inline-fields">
            <div><label for="importance-${escapeHtml(value.id)}">Importance 1-10</label><input id="importance-${escapeHtml(value.id)}" type="number" min="1" max="10" value="${a.importance}" data-assess="importance"></div>
            <div><label for="current-${escapeHtml(value.id)}">Current alignment 1-10</label><input id="current-${escapeHtml(value.id)}" type="number" min="1" max="10" value="${a.current}" data-assess="current"></div>
            <div><label for="desired-${escapeHtml(value.id)}">Desired alignment 1-10</label><input id="desired-${escapeHtml(value.id)}" type="number" min="1" max="10" value="${a.desired}" data-assess="desired"></div>
          </div><output class="skill-app-gap" data-gap>Gap: ${SkillApps.calculateGap(a.current, a.desired)}</output>
        </fieldset>`;
      }).join("")}</div>`;
  }

  function actionFields(value, state) {
    const base = `actions.${value.id}`;
    const fields = [
      ["why", "Why this matters"], ["direction", "Longer-term direction"],
      ["actions", "Short-term actions"], ["improvement", "What would a 10% improvement look like?"],
      ["next", "Smallest useful next step"], ["when", "When and where?"], ["support", "Who or what could support you?"],
    ];
    return `<fieldset class="skill-app-fieldset"><legend>${escapeHtml(value.name)}</legend>${fields.map(([key, label]) => `<label for="${key}-${escapeHtml(value.id)}">${label}</label><textarea id="${key}-${escapeHtml(value.id)}" data-field="${base}.${key}">${escapeHtml(valueAt(state, `${base}.${key}`))}</textarea>`).join("")}</fieldset>`;
  }

  function actMarkup(data, state) {
    const values = coreValues(data, state);
    const chosen = values.filter((value) => state.focus.includes(value.id));
    return `<h3>Act</h3><p>Choose up to three focus areas. Numbers do not decide for you; consider meaning, readiness, responsibilities, safety, and energy.</p>
      <fieldset class="skill-app-fieldset"><legend>Focus areas</legend>${values.map((value) => `<label class="skill-app-check"><input type="checkbox" data-focus-value="${escapeHtml(value.id)}" ${state.focus.includes(value.id) ? "checked" : ""}> <span>${escapeHtml(value.name)}</span></label>`).join("")}</fieldset>
      <div class="skill-app-grid">${chosen.map((value) => actionFields(value, state)).join("")}</div>`;
  }

  function barriersMarkup(state) {
    const type = valueAt(state, "barriers.type");
    return `<h3>Barriers</h3><p>Name what is showing up, then choose a response that fits.</p>
      <label for="barrier-type">Barrier type</label><select id="barrier-type" data-field="barriers.type"><option value="">Choose one</option>${[
        ["practical", "Practical barrier"], ["emotion", "Emotion or action urge"], ["willfulness", "Willfulness / fighting reality"], ["skill", "Missing skill"],
      ].map(([key, label]) => `<option value="${key}" ${type === key ? "selected" : ""}>${label}</option>`).join("")}</select>
      <label for="barrier-notes">What is getting in the way?</label><textarea id="barrier-notes" data-field="barriers.notes">${escapeHtml(valueAt(state, "barriers.notes"))}</textarea>
      <label for="barrier-response">What response or skill could fit?</label><textarea id="barrier-response" data-field="barriers.response">${escapeHtml(valueAt(state, "barriers.response"))}</textarea>
      <label for="barrier-next">Smallest next step</label><textarea id="barrier-next" data-field="barriers.next">${escapeHtml(valueAt(state, "barriers.next"))}</textarea>
      <div class="skill-app-card-grid">
        <a class="skill-app-link-button secondary" href="/learn/emotion-regulation/opposite-action.html#problem-solving">Problem Solving</a>
        <a class="skill-app-link-button secondary" href="/learn/emotion-regulation/opposite-action.html#opposite-action">Opposite Action</a>
        <a class="skill-app-link-button secondary" href="/learn/cube/radical-acceptance.html#willingness">Radical Acceptance / Willingness</a>
        <a class="skill-app-link-button secondary" href="/learn/goal-setting/goal-setting-guidelines.html#smart-goals">SMART Goal Builder</a>
        <a class="skill-app-link-button secondary" href="/learn/wellness/behavioral-activation.html">Behavioural Activation</a>
      </div>`;
  }

  function missionMarkup(state) {
    return `<h3>Mission</h3><p>Use only your own selected qualities, actions, people, purposes, or contributions.</p>
      <label for="mission-qualities">Core qualities</label><input id="mission-qualities" type="text" data-field="mission.qualities" value="${escapeHtml(valueAt(state, "mission.qualities"))}">
      <label for="mission-actions">Repeatable actions</label><input id="mission-actions" type="text" data-field="mission.actions" value="${escapeHtml(valueAt(state, "mission.actions"))}">
      <label for="mission-service">People, purpose, or contribution</label><input id="mission-service" type="text" data-field="mission.service" value="${escapeHtml(valueAt(state, "mission.service"))}">
      <button type="button" data-build-mission>Build from my words</button>
      <label for="mission-result">Editable mission statement</label><textarea id="mission-result" data-field="mission.statement">${escapeHtml(valueAt(state, "mission.statement"))}</textarea>
      <p class="skill-app-note">I want to live as someone who [core qualities], by [repeatable actions], in service of [people, purpose, or contribution].</p>`;
  }

  function reviewMarkup(state) {
    const prompts = [
      ["aligned", "Where did my actions align?"], ["drifted", "Where did I drift?"],
      ["attention", "Which value received too little attention?"], ["discomfort", "What discomfort did I make room for?"],
      ["continue", "What will I continue?"], ["change", "What will I change?"],
      ["next", "Smallest value-aligned action"],
    ];
    return `<h3>Review</h3><p>Use this weekly review as information, not a grade.</p>${prompts.map(([key, label]) => `<label for="review-${key}">${label}</label><textarea id="review-${key}" data-field="review.${key}">${escapeHtml(valueAt(state, `review.${key}`))}</textarea>`).join("")}
      <label for="review-date">Next review date</label><input id="review-date" type="date" data-field="review.date" value="${escapeHtml(valueAt(state, "review.date"))}">`;
  }

  async function initValues(root) {
    const response = await fetch(root.dataset.valuesUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Values data could not be loaded");
    const data = await response.json();
    let state = initialValuesState();

    function render() {
      state.step = Math.max(0, Math.min(STEPS.length - 1, Number(state.step) || 0));
      const panels = [discoverMarkup, sortMarkup, narrowMarkup, assessMarkup, actMarkup];
      let panel;
      if (state.step <= 4) panel = panels[state.step](data, state);
      else if (state.step === 5) panel = barriersMarkup(state);
      else if (state.step === 6) panel = missionMarkup(state);
      else panel = reviewMarkup(state);
      root.innerHTML = `<div class="skill-app-shell">
        <header class="skill-app-header"><h2>Discover and Work Towards Your Values</h2><p>Discover and create a plan to work towards your values and accumulate long term positive emotions.</p>${progressMarkup(state.step)}</header>
        <section class="skill-app-panel" aria-live="polite">${panel}</section>
        <footer class="skill-app-footer"><div><strong data-values-status aria-live="polite">Your entries are not saved on our servers.</strong><br><small>A temporary draft is saved in this browser. You can download partial or completed results below.</small></div>
          <div class="skill-app-actions"><button type="button" class="secondary" data-back ${state.step === 0 ? "disabled" : ""}>Back</button><button type="button" data-next ${state.step === STEPS.length - 1 ? "disabled" : ""}>Continue</button></div></footer>
      </div>`;
      bind();
      root.querySelector(".skill-app-panel h3")?.focus?.();
    }

    function bind() {
      root.querySelector("[data-values-search]")?.addEventListener("input", (event) => {
        const query = event.target.value.toLowerCase().trim();
        root.querySelectorAll("[data-value-card]").forEach((card) => {
          card.hidden = Boolean(query && !card.dataset.search.includes(query));
        });
      });
      root.querySelectorAll("[data-toggle-value]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.toggleValue;
        if (state.selected[id]) delete state.selected[id];
        else state.selected[id] = { rating: "" };
        render();
      }));
      root.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.rating;
        state.selected[id].rating = button.dataset.importanceValue;
        root.querySelectorAll(`[data-rating="${CSS.escape(id)}"]`).forEach((option) => {
          const chosen = option === button;
          option.setAttribute("aria-pressed", String(chosen));
          option.classList.toggle("secondary", !chosen);
        });
      }));
      root.querySelector("[data-add-custom]")?.addEventListener("click", () => {
        const input = root.querySelector("[data-custom-value]");
        const name = input.value.trim();
        if (!name) return;
        const id = `custom-${Date.now()}`;
        state.custom.push({ id, name, definition: "Your own wording", suggested_domains: [], aliases: [] });
        state.selected[id] = { rating: "" };
        render();
      });
      root.querySelectorAll("[data-domain-value]").forEach((checkbox) => checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.domainValue;
        const domains = new Set(state.domains[id] || []);
        checkbox.checked ? domains.add(checkbox.value) : domains.delete(checkbox.value);
        state.domains[id] = [...domains];
      }));
      root.querySelectorAll("[data-core-value]").forEach((checkbox) => checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.coreValue;
        state.core[id] = Object.assign(state.core[id] || {}, { chosen: checkbox.checked });
      }));
      root.querySelectorAll("[data-assessment-card]").forEach((card) => {
        const id = card.dataset.assessmentCard;
        card.querySelectorAll("[data-assess]").forEach((input) => input.addEventListener("input", () => {
          state.assessments[id] = state.assessments[id] || {};
          state.assessments[id][input.dataset.assess] = input.value;
          const a = state.assessments[id];
          card.querySelector("[data-gap]").textContent = `Gap: ${SkillApps.calculateGap(a.current ?? 5, a.desired ?? 5)}`;
        }));
      });
      root.querySelectorAll("[data-focus-value]").forEach((checkbox) => checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.focusValue;
        if (checkbox.checked && state.focus.length >= 3) {
          checkbox.checked = false;
          const status = root.querySelector("[data-values-status]");
          if (status) status.textContent = "Choose up to three focus areas";
          return;
        }
        state.focus = checkbox.checked ? [...new Set([...state.focus, id])] : state.focus.filter((value) => value !== id);
        render();
      }));
      root.querySelectorAll("[data-field]").forEach((field) => {
        const update = () => { setValue(state, field.dataset.field, field.value); };
        field.addEventListener("input", update);
        field.addEventListener("change", update);
      });
      root.querySelector("[data-build-mission]")?.addEventListener("click", () => {
        const m = state.mission;
        m.statement = `I want to live as someone who ${m.qualities || "[core qualities]"}, by ${m.actions || "[repeatable actions]"}, in service of ${m.service || "[people, purpose, or contribution]"}.`;
        render();
      });
      root.querySelector("[data-back]")?.addEventListener("click", () => { state.step -= 1; render(); });
      root.querySelector("[data-next]")?.addEventListener("click", () => { state.step += 1; render(); });
      root.querySelector("[data-clear]")?.addEventListener("click", () => {
        if (!global.confirm("Clear all current Values selections and entries?")) return;
        state = initialValuesState();
        render();
      });
    }

    render();
    if (Progress) {
      const topKeys = ["step", "selected", "custom", "domains", "core", "assessments", "focus", "actions", "barriers", "mission", "review"];
      const objectOf = (value, validate) => Progress.isPlainObject(value) && Object.entries(value).every(([id, item]) => typeof id === "string" && validate(item));
      const strings = (value, allowed) => Progress.isPlainObject(value) && Object.keys(value).every((key) => allowed.includes(key)) && Object.values(value).every((item) => typeof item === "string");
      const validateState = (next) => Progress.isPlainObject(next) && Object.keys(next).every((key) => topKeys.includes(key))
        && Number.isInteger(next.step) && next.step >= 0 && next.step < STEPS.length
        && objectOf(next.selected, (item) => strings(item, ["rating"]))
        && Array.isArray(next.custom) && next.custom.length <= 100 && next.custom.every((item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["id", "name", "definition", "suggested_domains", "aliases"].includes(key)) && typeof item.id === "string" && typeof item.name === "string" && typeof item.definition === "string" && Array.isArray(item.suggested_domains) && item.suggested_domains.every((value) => typeof value === "string") && Array.isArray(item.aliases) && item.aliases.every((value) => typeof value === "string"))
        && objectOf(next.domains, (item) => Array.isArray(item) && item.every((entry) => typeof entry === "string"))
        && objectOf(next.core, (item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["chosen", "family"].includes(key)) && (item.chosen === undefined || typeof item.chosen === "boolean") && (item.family === undefined || typeof item.family === "string"))
        && objectOf(next.assessments, (item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["importance", "current", "desired", "domain"].includes(key)) && Object.values(item).every((value) => typeof value === "string" || typeof value === "number"))
        && Array.isArray(next.focus) && next.focus.length <= 3 && next.focus.every((item) => typeof item === "string")
        && objectOf(next.actions, (item) => strings(item, ["why", "direction", "actions", "improvement", "next", "when", "support"]))
        && strings(next.barriers, ["type", "notes", "response", "next"])
        && strings(next.mission, ["qualities", "actions", "service", "statement"])
        && strings(next.review, ["aligned", "drifted", "attention", "discomfort", "continue", "change", "next", "date"]);
      const valueName = (id, next) => [...data.values, ...next.custom].find((value) => value.id === id)?.name || id;
      Progress.registerTool({
        root, toolId: "values", toolTitle: "Discover and Work Towards Your Values", route: Progress.TOOL_ROUTES.values, schemaVersion: 1,
        showFloating: false,
        showFinalStartAgain: false,
        finalHeading: "Download your results",
        privacyText: "Your entries are not saved on our servers. A temporary draft is saved in this browser. Download your results to keep a copy. Nothing you enter here is uploaded.",
        getState: () => state,
        setState: (next) => { state = JSON.parse(JSON.stringify(next)); render(); },
        validateState,
        getReadableSummary: (next) => {
          const selected = Object.keys(next.selected).map((id) => valueName(id, next));
          const core = Object.entries(next.core).filter(([, item]) => item.chosen).map(([id]) => id);
          const lines = ["# Discover and Work Towards Your Values", ""];
          if (selected.length) lines.push("## Selected Values", "", ...Object.keys(next.selected).map((id) => {
            const importance = normalizedValueImportance(next.selected[id].rating);
            return `- ${valueName(id, next)}${importance ? ` — Importance: ${importance}` : ""}`;
          }), "");
          if (core.length) {
            lines.push("## Core Values and Alignment", "");
            core.forEach((id) => {
              const assessment = next.assessments[id] || {};
              lines.push(`### ${valueName(id, next)}`);
              if (next.core[id].family) lines.push(`- Value family: ${next.core[id].family}`);
              if (assessment.importance !== undefined) lines.push(`- Importance: ${assessment.importance}`);
              if (assessment.current !== undefined) lines.push(`- Current alignment: ${assessment.current}`);
              if (assessment.desired !== undefined) lines.push(`- Desired alignment: ${assessment.desired}`);
              if (assessment.current !== undefined && assessment.desired !== undefined) lines.push(`- Gap: ${SkillApps.calculateGap(assessment.current, assessment.desired)}`);
              lines.push("");
            });
          }
          const focus = next.focus.map((id) => valueName(id, next));
          if (focus.length) lines.push("## Focus Areas", "", ...focus.map((name) => `- ${name}`), "");
          next.focus.forEach((id) => {
            const action = next.actions[id] || {};
            const sections = [["Why this matters", action.why], ["Longer-term direction", action.direction], ["Short-term actions", action.actions], ["10% improvement", action.improvement], ["Smallest next step", action.next], ["When and where", action.when], ["Support", action.support]].filter(([, value]) => value);
            if (sections.length) { lines.push(`## Action Plan: ${valueName(id, next)}`, ""); sections.forEach(([label, value]) => lines.push(`### ${label}`, "", value, "")); }
          });
          [["Barriers", next.barriers.notes], ["Barrier Response", next.barriers.response], ["Mission Statement", next.mission.statement], ["Next Review Action", next.review.next]].forEach(([heading, value]) => { if (value) lines.push(`## ${heading}`, "", value, ""); });
          return lines.join("\n").trim();
        },
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-skill-app="values"]').forEach((root) => {
      initValues(root).catch((error) => {
        root.innerHTML = `<p class="skill-app-note" role="alert">${escapeHtml(error.message)}. Please reload the page.</p>`;
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);

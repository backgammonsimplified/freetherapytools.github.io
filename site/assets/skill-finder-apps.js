(function (global) {
  "use strict";

  const DATA_ROOT = "/data/skill-apps";
  const BODY_REGIONS = ["head / face", "jaw", "throat", "neck / shoulders", "chest / heart", "stomach / gut", "back", "arms", "hands", "legs", "feet", "whole body", "other"];
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  async function getJson(path) {
    const response = await fetch(`${DATA_ROOT}/${path}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }

  function linkCards(links = []) {
    return `<div class="skill-app-result-links">${links.map((link) =>
      `<a class="skill-app-link-button${link.kind === "app" ? "" : " secondary"}" href="${escapeHtml(link.href)}">${escapeHtml(link.label || link.name)}</a>`
    ).join("")}</div>`;
  }

  class FlowEngine {
    constructor(root, flow, context = {}) {
      this.root = root;
      this.flow = flow;
      this.context = context;
      this.nodes = new Map(flow.nodes.map((node) => [node.id, node]));
      this.nodeId = flow.start;
      this.history = [];
      this.answers = {};
      this.render();
    }
    go(next) { if (this.nodes.has(next)) { this.history.push(this.nodeId); this.nodeId = next; this.render(true); } }
    back() { if (this.history.length) { this.nodeId = this.history.pop(); this.render(true); } }
    restart() { this.nodeId = this.flow.start; this.history = []; this.answers = {}; this.render(true); }

    questionMarkup(node) {
      if (node.control === "text") return `<form data-flow-text><label for="flow-${escapeHtml(node.id)}">${escapeHtml(node.prompt)}</label><textarea id="flow-${escapeHtml(node.id)}" name="answer">${escapeHtml(this.answers[node.field])}</textarea><button type="submit">Continue</button></form>`;
      if (node.control === "rating") return `<form data-flow-rating><label for="flow-${escapeHtml(node.id)}">${escapeHtml(node.prompt)}</label><input id="flow-${escapeHtml(node.id)}" name="answer" type="range" min="${node.min || 0}" max="${node.max || 10}" value="${escapeHtml(this.answers[node.field] || node.value || 5)}"><output data-flow-rating-output>${escapeHtml(this.answers[node.field] || node.value || 5)}</output><button type="submit">Continue</button></form>`;
      const choices = node.dynamic_choices === "emotions" ? this.context.emotions.map((emotion) => ({ label: emotion.name, value: emotion.id, next: node.next })) : node.choices;
      return `<fieldset class="skill-app-fieldset"><legend>${escapeHtml(node.prompt)}</legend><div class="skill-app-choice-grid">${choices.map((choice) => `<button type="button" class="secondary" data-flow-choice data-value="${escapeHtml(choice.value || choice.label)}" data-next="${escapeHtml(choice.next || node.next)}">${escapeHtml(choice.label)}</button>`).join("")}</div></fieldset>`;
    }

    resultMarkup(node) {
      let dynamic = "";
      if (node.dynamic_result === "opposite-action") {
        const emotion = this.context.emotions.find((item) => item.id === this.answers.emotion);
        if (emotion) dynamic = `<h4>${escapeHtml(emotion.name)}</h4><p><strong>Typical action urges:</strong> ${escapeHtml(emotion.action_urges.join(", ") || "Notice your own action urge.")}</p>${emotion.opposite_actions.length ? `<p><strong>Possible opposite actions:</strong></p><ul>${emotion.opposite_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>The source does not list a standard opposite action for this emotion. Mindful observation may fit better.</p>"}<p class="skill-app-note">That doesn't fit my experience? Use your own observed urge and choose a safe action that is truly opposite.</p>`;
      }
      const summary = (node.summary_fields || []).filter((field) => this.answers[field]).map((field) => `<dt>${escapeHtml(field.replaceAll("-", " "))}</dt><dd>${escapeHtml(this.answers[field])}</dd>`).join("");
      return `<h3>${escapeHtml(node.title)}</h3>${node.body ? `<p>${escapeHtml(node.body)}</p>` : ""}${dynamic}${summary ? `<dl class="skill-app-summary">${summary}</dl>` : ""}${linkCards(node.links)}`;
    }

    render(moveFocus = false) {
      const node = this.nodes.get(this.nodeId);
      let content = "";
      if (node.type === "question") content = this.questionMarkup(node);
      if (node.type === "information") content = `<h3>${escapeHtml(node.title)}</h3><p>${escapeHtml(node.body)}</p><button type="button" data-flow-continue>Continue</button>`;
      if (node.type === "result") content = this.resultMarkup(node);
      this.root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>${escapeHtml(this.flow.title)}</h2><p>Your answers stay on this page and are not transmitted.</p></header><section class="skill-app-panel" aria-live="polite" tabindex="-1">${content}</section><footer class="skill-app-footer"><button type="button" class="secondary" data-flow-back ${this.history.length ? "" : "disabled"}>Back</button><button type="button" class="secondary" data-flow-restart>Restart</button></footer></div>`;
      this.bind(node);
      if (moveFocus) this.root.querySelector(".skill-app-panel")?.focus();
    }

    bind(node) {
      this.root.querySelector("[data-flow-back]")?.addEventListener("click", () => this.back());
      this.root.querySelector("[data-flow-restart]")?.addEventListener("click", () => this.restart());
      this.root.querySelector("[data-flow-continue]")?.addEventListener("click", () => this.go(node.next));
      this.root.querySelectorAll("[data-flow-choice]").forEach((button) => button.addEventListener("click", () => { if (node.field) this.answers[node.field] = button.dataset.value; this.go(button.dataset.next); }));
      this.root.querySelector("[data-flow-text]")?.addEventListener("submit", (event) => { event.preventDefault(); this.answers[node.field] = new FormData(event.currentTarget).get("answer").trim(); this.go(node.next); });
      const rating = this.root.querySelector("[data-flow-rating]");
      rating?.querySelector("input")?.addEventListener("input", (event) => { rating.querySelector("output").textContent = event.target.value; });
      rating?.addEventListener("submit", (event) => { event.preventDefault(); this.answers[node.field] = new FormData(event.currentTarget).get("answer"); this.go(node.next); });
    }
  }

  async function initFlow(root, filename) {
    const [flow, emotionData] = await Promise.all([getJson(`flows/${filename}.json`), getJson("emotions.json")]);
    const engine = new FlowEngine(root, flow, emotionData);
    const requested = new URLSearchParams(global.location.search).get("emotion");
    if (filename === "change-emotion" && emotionData.emotions.some((item) => item.id === requested)) {
      engine.answers.emotion = requested; engine.nodeId = "fits-facts"; engine.history = ["emotion"]; engine.render();
    }
  }

  async function initThermometer(root) {
    const data = await getJson("thermometer.json");
    root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Where do you feel closest right now?</h2><p>Choose a zone. The words describe a state, not a diagnosis.</p></header><div class="skill-app-thermometer" role="list">${data.zones.map((zone) => `<button type="button" role="listitem" data-zone="${zone.id}" aria-pressed="false"><strong>${escapeHtml(zone.name)}</strong><span>${escapeHtml(zone.description)}</span></button>`).join("")}</div><section class="skill-app-panel" data-zone-result tabindex="-1"><p>Choose a zone to see skills that may fit where you are right now.</p></section></div>`;
    root.querySelectorAll("[data-zone]").forEach((button) => button.addEventListener("click", () => {
      root.querySelectorAll("[data-zone]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      const zone = data.zones.find((item) => item.id === button.dataset.zone);
      const result = root.querySelector("[data-zone-result]");
      result.innerHTML = `<h3>Skills that may fit where you are right now</h3><p>${escapeHtml(zone.description)}</p>${linkCards(zone.skills.map((skill) => ({ ...skill, kind: skill.href.startsWith("/skill-finder") ? "app" : "learn", label: skill.name })))}`;
      result.focus();
    }));
  }

  function emotionSelector(emotions, selected) {
    const buttons = emotions.map((emotion) => `<button type="button" data-emotion="${emotion.id}" aria-pressed="${emotion.id === selected}">${escapeHtml(emotion.name)}</button>`).join("");
    return `<div class="emotion-wheel" aria-label="Emotion family wheel">${buttons}</div><fieldset class="skill-app-fieldset emotion-list"><legend>Accessible emotion list</legend>${emotions.map((emotion) => `<label class="skill-app-check"><input type="radio" name="emotion-list" value="${emotion.id}" ${emotion.id === selected ? "checked" : ""}> <span>${escapeHtml(emotion.name)}</span></label>`).join("")}</fieldset>`;
  }

  async function initEmotionExplorer(root) {
    const { emotions } = await getJson("emotions.json");
    const state = { step: 0, emotion: "", words: [], regions: [], details: {} };
    const detailFields = [["event", "Prompting event"], ["interpretations", "Interpretations"], ["body", "Body changes"], ["urge", "Action urge"], ["expression", "Face or body expression"], ["said", "What I said"], ["did", "What I did"], ["aftereffects", "Aftereffects"]];
    function render(focus = false) {
      const emotion = emotions.find((item) => item.id === state.emotion);
      let panel;
      if (state.step === 0) panel = `<h3>Choose a broad emotion family</h3><p>Which option is worth exploring?</p>${emotionSelector(emotions, state.emotion)}`;
      if (state.step === 1) panel = `<h3>What words fit what you're noticing?</h3><p>Select any that fit. These are possibilities, not conclusions.</p><div class="skill-app-chip-grid">${emotion.related_words.map((word) => `<label class="skill-app-chip"><input type="checkbox" value="${escapeHtml(word)}" ${state.words.includes(word) ? "checked" : ""}> <span>${escapeHtml(word)}</span></label>`).join("")}</div>`;
      if (state.step === 2) panel = `<h3>Where do you notice it in your body?</h3><p>Typical source examples for ${escapeHtml(emotion.name)} include ${escapeHtml(emotion.body_changes.join(", "))}. Your experience may differ.</p><div class="body-selector"><div class="body-map" aria-label="Clickable body region map">${BODY_REGIONS.slice(0, 12).map((region) => `<button type="button" data-body-region="${escapeHtml(region)}" aria-pressed="${state.regions.includes(region)}">${escapeHtml(region)}</button>`).join("")}</div><fieldset class="skill-app-fieldset body-checklist"><legend>Body region checklist</legend>${BODY_REGIONS.map((region) => `<label class="skill-app-check"><input type="checkbox" value="${escapeHtml(region)}" ${state.regions.includes(region) ? "checked" : ""}> <span>${escapeHtml(region)}</span></label>`).join("")}</fieldset></div>`;
      if (state.step === 3) panel = `<h3>Observe and describe</h3><p>Use any fields that are helpful; all are optional.</p>${detailFields.map(([key, label]) => `<label for="emotion-${key}">${label}</label><textarea id="emotion-${key}" data-detail="${key}">${escapeHtml(state.details[key])}</textarea>`).join("")}`;
      if (state.step === 4) panel = `<h3>What I noticed</h3><dl class="skill-app-summary"><dt>Broad emotion family</dt><dd>${escapeHtml(emotion.name)}</dd><dt>Words that fit</dt><dd>${escapeHtml(state.words.join(", ") || "None selected")}</dd><dt>Body regions</dt><dd>${escapeHtml(state.regions.join(", ") || "None selected")}</dd>${detailFields.filter(([key]) => state.details[key]).map(([key, label]) => `<dt>${label}</dt><dd>${escapeHtml(state.details[key])}</dd>`).join("")}</dl>${linkCards([{ label: "Mindfulness of Current Emotions", href: "/learn/emotion-regulation/observing-describing-emotions.html", kind: "learn" }, { label: "Check the Facts", href: "/learn/emotion-regulation/check-the-facts.html", kind: "learn" }, { label: "Change This Emotion", href: `/skill-finder/change-emotion/?emotion=${emotion.id}`, kind: "app" }, { label: "Learn About This Emotion", href: "/learn/emotion-regulation/observing-describing-emotions.html#handouts-worksheets", kind: "learn" }])}`;
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Emotion Explorer</h2><p>Step ${state.step + 1} of 5 · Your responses remain on this page.</p></header><section class="skill-app-panel" tabindex="-1">${panel}</section><footer class="skill-app-footer"><button type="button" class="secondary" data-emotion-back ${state.step ? "" : "disabled"}>Back</button>${state.step < 4 ? `<button type="button" data-emotion-next ${state.step === 0 && !state.emotion ? "disabled" : ""}>Continue</button>` : `<button type="button" class="secondary" data-emotion-restart>Restart</button>`}</footer></div>`;
      bind(); if (focus) root.querySelector(".skill-app-panel")?.focus();
    }
    function toggleRegion(region) { state.regions = state.regions.includes(region) ? state.regions.filter((item) => item !== region) : [...state.regions, region]; render(); }
    function bind() {
      root.querySelectorAll("[data-emotion]").forEach((button) => button.addEventListener("click", () => { state.emotion = button.dataset.emotion; render(); }));
      root.querySelectorAll('input[name="emotion-list"]').forEach((radio) => radio.addEventListener("change", () => { state.emotion = radio.value; render(); }));
      if (state.step === 1) root.querySelectorAll(".skill-app-chip input").forEach((check) => check.addEventListener("change", () => { state.words = [...root.querySelectorAll(".skill-app-chip input:checked")].map((item) => item.value); }));
      root.querySelectorAll("[data-body-region]").forEach((button) => button.addEventListener("click", () => toggleRegion(button.dataset.bodyRegion)));
      root.querySelectorAll(".body-checklist input").forEach((check) => check.addEventListener("change", () => toggleRegion(check.value)));
      root.querySelectorAll("[data-detail]").forEach((field) => field.addEventListener("input", () => { state.details[field.dataset.detail] = field.value; }));
      root.querySelector("[data-emotion-next]")?.addEventListener("click", () => { state.step += 1; render(true); });
      root.querySelector("[data-emotion-back]")?.addEventListener("click", () => { state.step -= 1; render(true); });
      root.querySelector("[data-emotion-restart]")?.addEventListener("click", () => { Object.assign(state, { step: 0, emotion: "", words: [], regions: [], details: {} }); render(true); });
    }
    render();
  }

  async function initPleasantEvent(root) {
    const { events } = await getJson("pleasant-events.json");
    const state = { selected: null, query: "", tag: "", plan: {} };
    const tags = ["low energy", "outdoors", "with others"];
    function render(focus = false) {
      const matches = events.filter((event) => (!state.query || event.title.toLowerCase().includes(state.query.toLowerCase())) && (!state.tag || event.tags.includes(state.tag)));
      const selected = events.find((event) => event.id === state.selected);
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Pleasant Event Planner</h2><p>Browse 225 source activities. Tags are limited to what can be reasonably inferred from the wording.</p></header><section class="skill-app-panel" tabindex="-1"><div class="skill-app-inline-fields"><div><label for="pleasant-search">Search activities</label><input id="pleasant-search" type="search" value="${escapeHtml(state.query)}"></div><div><label for="pleasant-tag">Browse by tag</label><select id="pleasant-tag"><option value="">All activities</option>${tags.map((tag) => `<option ${state.tag === tag ? "selected" : ""}>${tag}</option>`).join("")}</select></div></div><div class="skill-app-actions"><button type="button" class="secondary" data-surprise>Surprise me</button><span aria-live="polite">${matches.length} activities shown</span></div><div class="pleasant-event-list">${matches.map((event) => `<button type="button" class="secondary" data-event-id="${event.id}" aria-pressed="${event.id === state.selected}">${escapeHtml(event.title)}</button>`).join("")}</div>${selected ? `<section class="skill-app-plan"><h3>Plan: ${escapeHtml(selected.title)}</h3>${[["when", "When?"], ["duration", "How long?"], ["smallest", "Smallest version I could do?"], ["support", "What would help me follow through?"]].map(([key, label]) => `<label for="pleasant-${key}">${label}</label><input id="pleasant-${key}" type="${key === "when" ? "datetime-local" : "text"}" data-plan="${key}" value="${escapeHtml(state.plan[key])}">`).join("")}<p class="skill-app-note">Be mindful of the pleasant moment: gently return attention to what you see, hear, feel, smell, taste, or appreciate.</p>${linkCards([{ label: "Behavioural Activation", href: "/learn/wellness/behavioral-activation.html", kind: "learn" }, { label: "Build Mastery", href: "/learn/emotion-regulation/positive-emotions-mastery-cope-ahead.html#build-mastery", kind: "learn" }, { label: "Values", href: "/skill-finder/values/", kind: "app" }, { label: "SMART Goal Builder", href: "/learn/goal-setting/goal-setting-guidelines.html#smart-goals", kind: "learn" }])}</section>` : ""}</section></div>`;
      bind(); if (focus) root.querySelector(".skill-app-plan")?.scrollIntoView({ block: "nearest" });
    }
    function bind() {
      root.querySelector("#pleasant-search")?.addEventListener("change", (event) => { state.query = event.target.value; render(); });
      root.querySelector("#pleasant-tag")?.addEventListener("change", (event) => { state.tag = event.target.value; render(); });
      root.querySelector("[data-surprise]")?.addEventListener("click", () => { const pool = events.filter((event) => !state.tag || event.tags.includes(state.tag)); state.selected = pool[Math.floor(Math.random() * pool.length)].id; render(true); });
      root.querySelectorAll("[data-event-id]").forEach((button) => button.addEventListener("click", () => { state.selected = Number(button.dataset.eventId); render(true); }));
      root.querySelectorAll("[data-plan]").forEach((field) => field.addEventListener("input", () => { state.plan[field.dataset.plan] = field.value; }));
    }
    render();
  }

  async function start() {
    const initializers = { thermometer: initThermometer, emotions: initEmotionExplorer, "change-emotion": (root) => initFlow(root, "change-emotion"), "worry-tree": (root) => initFlow(root, "worry-tree"), "pleasant-event": initPleasantEvent };
    for (const root of document.querySelectorAll("[data-skill-app]")) {
      const initializer = initializers[root.dataset.skillApp];
      if (!initializer) continue;
      try { await initializer(root); } catch (error) { root.innerHTML = `<p class="skill-app-note">This tool could not load. Please refresh the page or use the linked Learn material.</p>`; global.console?.error(error); }
    }
  }

  global.SkillFinderFlowEngine = FlowEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = { FlowEngine, BODY_REGIONS };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", start);
})(typeof window === "undefined" ? globalThis : window);

(function (global) {
  "use strict";

  const DATA_ROOT = "/data/skill-apps";
  const BODY_REGIONS = ["head / face", "jaw", "throat", "neck / shoulders", "chest / heart", "stomach / gut", "back", "arms", "hands", "legs", "feet", "whole body", "other"];
  const Progress = global.TherapySkillProgress;
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

  function plainObjectWithKeys(value, keys) {
    return Progress.isPlainObject(value) && Object.keys(value).every((key) => keys.includes(key));
  }

  function flowSummary(flow, state) {
    if (flow.id === "worry-tree") {
      const type = state.history.includes("action") || ["action", "when", "schedule", "how", "plan-result"].includes(state.nodeId)
        ? "Current actionable problem"
        : state.history.includes("hypothetical") || state.nodeId === "hypothetical-result" ? "Hypothetical or outside my control" : "Not selected yet";
      return Progress.nonEmptySections("Worry Tree", [
        ["Worry", state.answers.worry], ["Type", type], ["What I Could Do", state.answers.action],
        ["When", state.answers.timing], ["Scheduled Time or Cue", state.answers.schedule], ["How / First Step", state.answers.how],
      ]);
    }
    const emotion = state.answers.emotion && global.__therapyEmotionNames?.[state.answers.emotion];
    return Progress.nonEmptySections(flow.title, [
      ["Emotion", emotion || state.answers.emotion],
      ["Decision Path", [...state.history, state.nodeId].map((id) => { const node = flow.nodes.find((item) => item.id === id); return node?.title || node?.prompt || id; })],
      ["Current Decision Point", flow.nodes.find((node) => node.id === state.nodeId)?.title || flow.nodes.find((node) => node.id === state.nodeId)?.prompt],
      ["Recorded Answers", Object.entries(state.answers).filter(([key]) => key !== "emotion").map(([key, value]) => `${key.replaceAll("-", " ")}: ${value}`)],
    ]);
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
      if (Progress) {
        const allowedAnswers = flow.nodes.map((node) => node.field).filter(Boolean);
        Progress.registerTool({
          root,
          toolId: flow.id,
          toolTitle: flow.title,
          route: Progress.TOOL_ROUTES[flow.id],
          schemaVersion: 1,
          getState: () => ({ nodeId: this.nodeId, history: this.history, answers: this.answers }),
          setState: (state) => { this.nodeId = state.nodeId; this.history = [...state.history]; this.answers = { ...state.answers }; this.render(); },
          validateState: (state) => plainObjectWithKeys(state, ["nodeId", "history", "answers"])
            && typeof state.nodeId === "string" && this.nodes.has(state.nodeId)
            && Array.isArray(state.history) && state.history.length <= 100 && state.history.every((node) => typeof node === "string" && this.nodes.has(node))
            && plainObjectWithKeys(state.answers, allowedAnswers) && Object.values(state.answers).every((value) => typeof value === "string"),
          getReadableSummary: (state) => flowSummary(flow, state),
        });
      }
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
      this.root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>${escapeHtml(this.flow.title)}</h2><p>Your progress stays on this device unless you save a copy to your computer. Nothing you enter here is uploaded.</p></header><section class="skill-app-panel" aria-live="polite" tabindex="-1">${content}</section><footer class="skill-app-footer"><button type="button" class="secondary" data-flow-back ${this.history.length ? "" : "disabled"}>Back</button><button type="button" class="secondary" data-flow-restart>Restart</button></footer></div>`;
      this.bind(node);
      if (moveFocus) this.root.querySelector(".skill-app-panel")?.focus();
    }

    bind(node) {
      this.root.querySelector("[data-flow-back]")?.addEventListener("click", () => this.back());
      this.root.querySelector("[data-flow-restart]")?.addEventListener("click", () => this.restart());
      this.root.querySelector("[data-flow-continue]")?.addEventListener("click", () => this.go(node.next));
      this.root.querySelectorAll("[data-flow-choice]").forEach((button) => button.addEventListener("click", () => { if (node.field) this.answers[node.field] = button.dataset.value; this.go(button.dataset.next); }));
      const textForm = this.root.querySelector("[data-flow-text]");
      textForm?.querySelector("textarea")?.addEventListener("input", (event) => { this.answers[node.field] = event.target.value; });
      textForm?.addEventListener("submit", (event) => { event.preventDefault(); this.answers[node.field] = new FormData(event.currentTarget).get("answer").trim(); this.go(node.next); });
      const rating = this.root.querySelector("[data-flow-rating]");
      rating?.querySelector("input")?.addEventListener("input", (event) => { this.answers[node.field] = event.target.value; rating.querySelector("output").textContent = event.target.value; });
      rating?.addEventListener("submit", (event) => { event.preventDefault(); this.answers[node.field] = new FormData(event.currentTarget).get("answer"); this.go(node.next); });
    }
  }

  function treeLabelLines(value, max = 24, limit = 4) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines = [];
    words.forEach((word) => {
      if (lines.length && `${lines.at(-1)} ${word}`.length <= max) lines[lines.length - 1] += ` ${word}`;
      else lines.push(word);
    });
    if (lines.length > limit) {
      lines.length = limit;
      lines[limit - 1] = `${lines[limit - 1].slice(0, Math.max(1, max - 1))}…`;
    }
    return lines;
  }

  class ConstrainedTreeEngine {
    constructor(root, flow, context = {}) {
      this.root = root;
      this.flow = flow;
      this.context = context;
      this.nodes = new Map(flow.nodes.map((node) => [node.id, node]));
      this.nodeId = flow.start;
      this.history = [];
      this.answers = {};
      this.graph = null;
      this.mount();
      this.registerProgress();
    }

    mount() {
      const arrowId = `tree-arrow-${this.flow.id}`;
      this.root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>${escapeHtml(this.flow.title)}</h2><p>${escapeHtml(this.flow.source || "Source-backed decision process")} · Your entries stay on this device.</p></header>
        <section class="skill-tree-app" data-force-graph-root><div class="values-map-toolbar" role="group" aria-label="Decision tree view controls"><button type="button" class="secondary" data-graph-action="zoom-out" aria-label="Zoom out">−</button><button type="button" class="secondary" data-graph-action="zoom-in" aria-label="Zoom in">+</button><button type="button" class="secondary" data-graph-action="fit">Fit</button><button type="button" class="secondary" data-graph-action="reset">Reset</button><button type="button" class="secondary" data-graph-action="fullscreen" aria-pressed="false">Full screen</button></div>
          <div class="skill-tree-layout"><div class="skill-tree-viewport" data-force-viewport><div class="skill-tree-canvas" data-force-canvas><svg class="skill-tree-svg" role="group" aria-label="Interactive decision tree"><defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs><g data-force-scene><g data-force-links style="--tree-arrow:url(#${arrowId})"></g><g data-force-nodes></g></g></svg></div><p class="visually-hidden" aria-live="polite" data-force-status></p></div><aside class="skill-tree-editor" data-tree-editor tabindex="-1"></aside></div>
        </section><footer class="skill-app-footer"><button type="button" class="secondary" data-tree-back disabled>Back</button><button type="button" class="secondary" data-tree-restart>Start over</button></footer></div>`;
      const container = this.root.querySelector("[data-force-viewport]");
      this.graph = global.TherapyForceGraph?.createConstrainedTreeViewport({
        container,
        initialNodeIds: this.flow.nodes.filter((node) => Number(node.level) <= 1).map((node) => node.id),
        levelGap: 210,
        laneGap: 128,
        minZoom: .42,
        maxZoom: 3.2,
        renderNode: (element, node) => {
          const label = node.title || node.prompt;
          const lines = treeLabelLines(label);
          const start = -((lines.length - 1) * 8);
          element.innerHTML = `<rect class="skill-tree-node-shape" x="-76" y="-38" width="152" height="76" rx="14"></rect><text class="skill-tree-node-label" text-anchor="middle">${lines.map((line, index) => `<tspan x="0" y="${start + index * 16}">${escapeHtml(line)}</tspan>`).join("")}</text>`;
        },
        updateNode: (element, node) => {
          element.classList.toggle("is-current", node.pathState === "current");
          element.classList.toggle("is-visited", node.pathState === "visited");
          element.classList.toggle("is-future", node.pathState === "future");
          element.classList.toggle("is-result", node.type === "result");
          element.setAttribute("aria-current", node.pathState === "current" ? "step" : "false");
        },
        nodeRole: () => "button",
        ariaLabel: (node) => `${node.title || node.prompt}. ${node.pathState === "current" ? "Current step" : node.pathState === "visited" ? "Visited step; activate to revise this branch" : "Future step"}.`,
        onNodeActivate: (node) => this.revisit(node.id),
      });
      if (!this.graph) throw new Error("Shared constrained tree is unavailable");
      this.root.querySelector("[data-tree-back]").addEventListener("click", () => this.back());
      this.root.querySelector("[data-tree-restart]").addEventListener("click", () => this.restart());
      this.render();
    }

    graphState() {
      const path = [...this.history, this.nodeId];
      const visited = new Set(path);
      const nodes = this.flow.nodes.map((node) => ({
        ...node,
        type: node.type === "result" ? "result" : "question",
        pathState: node.id === this.nodeId ? "current" : visited.has(node.id) ? "visited" : "future",
        x: Number(node.level || 0) * 210,
        y: Number(node.lane || 0) * 128,
        collisionRadius: 82,
      }));
      const links = [];
      this.flow.nodes.forEach((node) => {
        const targets = node.choices?.map((choice) => choice.next) || (node.next ? [node.next] : []);
        targets.forEach((target, index) => {
          const sourceIndex = path.indexOf(node.id);
          const chosen = sourceIndex >= 0 && path[sourceIndex + 1] === target;
          links.push({ id: `${node.id}-${target}-${index}`, source: node.id, target, type: chosen ? "tree-chosen" : "tree-future" });
        });
      });
      return { nodes, links };
    }

    render(focus = false) {
      const graphState = this.graphState();
      this.graph.update(graphState.nodes, graphState.links, { reheat: .46 });
      this.renderEditor();
      const back = this.root.querySelector("[data-tree-back]");
      if (back) back.disabled = !this.history.length;
      if (focus) this.root.querySelector("[data-tree-editor]")?.focus({ preventScroll: true });
    }

    checkFactsMarkup(node) {
      const emotion = this.context.emotions.find((item) => item.id === this.answers.emotion);
      return `<div class="check-facts-editor"><p>Use the Handout 8 sequence before answering the tree question. Observable facts are different from judgments, absolutes, and black-and-white descriptions.</p>
        ${[["facts-event", "What event prompted the emotion? Describe observable facts."], ["facts-interpretations", "What interpretations, thoughts, and assumptions are present? What other interpretations are possible?"], ["facts-threat", "Am I assuming a threat? What is it, and how likely is it?"], ["facts-catastrophe", "What is the catastrophe? How could I cope through problem solving, coping ahead, or acceptance?"]].map(([field, label]) => `<label for="tree-${field}">${escapeHtml(label)}</label><textarea id="tree-${field}" data-tree-fact="${field}">${escapeHtml(this.answers[field] || "")}</textarea>`).join("")}
        ${emotion ? `<aside class="skill-app-note"><strong>Events that can justify ${escapeHtml(emotion.name)}</strong><ul>${emotion.fit_facts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>Intensity and duration also depend on likelihood, importance, and effectiveness.</p></aside>` : ""}
        <p><a href="/learn/emotion-regulation/check-the-facts.html">Review Check the Facts</a> · <a href="/resources/clean/emotion-regulation/emotion-regulation-handout-8a-examples-of-emotions-that-fit-the-facts-clean.pdf">Open Handout 8A examples</a></p></div>`;
    }

    dynamicResult(node) {
      if (node.dynamic_result !== "opposite-action") return "";
      const emotion = this.context.emotions.find((item) => item.id === this.answers.emotion);
      if (!emotion) return "";
      return `<section class="skill-app-note"><h4>${escapeHtml(emotion.name)}</h4><p><strong>Common action urges:</strong> ${escapeHtml(emotion.action_urges.join(", "))}</p>${emotion.opposite_actions.length ? `<p><strong>Source-backed opposite actions to consider:</strong></p><ul>${emotion.opposite_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>The source set does not list a standard opposite action for this emotion.</p>"}</section>`;
    }

    renderEditor() {
      const node = this.nodes.get(this.nodeId);
      const editor = this.root.querySelector("[data-tree-editor]");
      if (node.type === "result") {
        editor.innerHTML = `<p class="skill-tree-kicker">Source outcome</p><h3>${escapeHtml(node.title)}</h3><p>${escapeHtml(node.body || "")}</p>${this.dynamicResult(node)}${linkCards(node.links)}`;
        return;
      }
      const choices = node.dynamic_choices === "emotions" ? this.context.emotions.map((emotion) => ({ label: emotion.name, value: emotion.id, next: node.next })) : node.choices || [];
      editor.innerHTML = `<p class="skill-tree-kicker">Current decision</p><h3>${escapeHtml(node.prompt)}</h3>${node.editor === "check-facts" ? this.checkFactsMarkup(node) : ""}<div class="skill-app-choice-grid">${choices.map((choice) => `<button type="button" data-tree-choice data-value="${escapeHtml(choice.value || choice.label)}" data-next="${escapeHtml(choice.next || node.next)}">${escapeHtml(choice.label)}</button>`).join("")}</div>`;
      editor.querySelectorAll("[data-tree-fact]").forEach((field) => field.addEventListener("input", () => { this.answers[field.dataset.treeFact] = field.value; }));
      editor.querySelectorAll("[data-tree-choice]").forEach((control) => control.addEventListener("click", () => this.choose(node, control.dataset.value, control.dataset.next)));
    }

    choose(node, value, next) {
      if (node.field) this.answers[node.field] = value;
      if (!this.nodes.has(next)) return;
      this.history.push(this.nodeId);
      this.nodeId = next;
      this.render(true);
    }

    revisit(id) {
      if (id === this.nodeId) {
        this.render(true);
        return;
      }
      const index = this.history.indexOf(id);
      if (index < 0) return;
      const removed = this.history.slice(index + 1).concat(this.nodeId);
      removed.forEach((nodeId) => {
        const field = this.nodes.get(nodeId)?.field;
        if (field) delete this.answers[field];
      });
      this.history = this.history.slice(0, index);
      this.nodeId = id;
      this.render(true);
    }

    back() {
      if (!this.history.length) return;
      const currentField = this.nodes.get(this.nodeId)?.field;
      if (currentField) delete this.answers[currentField];
      this.nodeId = this.history.pop();
      this.render(true);
    }

    restart() {
      this.nodeId = this.flow.start;
      this.history = [];
      this.answers = {};
      this.render(true);
    }

    registerProgress() {
      if (!Progress) return;
      const allowed = new Set([...this.flow.nodes.map((node) => node.field).filter(Boolean), "facts-event", "facts-interpretations", "facts-threat", "facts-catastrophe"]);
      Progress.registerTool({
        root: this.root, toolId: this.flow.id, toolTitle: this.flow.title, route: Progress.TOOL_ROUTES[this.flow.id], schemaVersion: 1,
        getState: () => ({ nodeId: this.nodeId, history: this.history, answers: this.answers }),
        setState: (state) => { this.nodeId = state.nodeId; this.history = [...state.history]; this.answers = { ...state.answers }; this.render(); },
        validateState: (state) => plainObjectWithKeys(state, ["nodeId", "history", "answers"]) && this.nodes.has(state.nodeId) && Array.isArray(state.history) && state.history.every((id) => this.nodes.has(id)) && Progress.isPlainObject(state.answers) && Object.entries(state.answers).every(([key, value]) => allowed.has(key) && typeof value === "string"),
        getReadableSummary: (state) => flowSummary(this.flow, state),
      });
    }
  }

  async function initFlow(root, filename) {
    const [flow, emotionData] = await Promise.all([getJson(`flows/${filename}.json`), getJson("emotions.json")]);
    const engine = new FlowEngine(root, flow, emotionData);
    global.__therapyEmotionNames = Object.fromEntries(emotionData.emotions.map((emotion) => [emotion.id, emotion.name]));
    const requested = new URLSearchParams(global.location.search).get("emotion");
    if (filename === "change-emotion" && emotionData.emotions.some((item) => item.id === requested)) {
      engine.answers.emotion = requested; engine.nodeId = "fits-facts"; engine.history = ["emotion"]; engine.render();
    }
  }

  async function initConstrainedFlow(root, filename) {
    const [flow, emotionData] = await Promise.all([getJson(`flows/${filename}.json`), getJson("emotions.json")]);
    const engine = new ConstrainedTreeEngine(root, flow, emotionData);
    global.__therapyEmotionNames = Object.fromEntries(emotionData.emotions.map((emotion) => [emotion.id, emotion.name]));
    if (filename === "change-emotion") {
      try {
        const handoff = JSON.parse(global.sessionStorage.getItem("therapy-skill-kit.change-emotion-handoff") || "null");
        global.sessionStorage.removeItem("therapy-skill-kit.change-emotion-handoff");
        if (emotionData.emotions.some((item) => item.id === handoff?.emotion)) {
          engine.answers.emotion = handoff.emotion;
          engine.nodeId = "fits-facts";
          engine.history = ["emotion"];
          engine.render();
        }
      } catch (_error) { /* direct emotion selection remains available */ }
    }
  }

  async function initThermometer(root) {
    const data = await getJson("thermometer.json");
    const state = { selectedZone: "" };
    function render(focus = false) {
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Skill Thermometer</h2><p>Choose the state that feels closest right now. The words describe a state, not a diagnosis.</p></header><div class="skill-app-thermometer" role="list">${data.zones.map((item) => {
        const selected = item.id === state.selectedZone;
        return `<section class="skill-thermometer-zone skill-thermometer-zone--${escapeHtml(item.id)}" role="listitem">
          <button type="button" data-zone="${escapeHtml(item.id)}" aria-expanded="${selected}" aria-controls="zone-${escapeHtml(item.id)}-skills"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span></button>
          <div id="zone-${escapeHtml(item.id)}-skills" class="skill-thermometer-recommendations" data-zone-result="${escapeHtml(item.id)}" ${selected ? "" : "hidden"} tabindex="-1">
            <h3>Skills that may fit</h3>
            <div class="skill-thermometer-skill-grid">${item.skills.map((skill) => `<details class="skill-thermometer-skill"><summary><span><strong>${escapeHtml(skill.name)}</strong><small>${escapeHtml(skill.category)}</small><span>${escapeHtml(skill.summary)}</span></span></summary><div><p><strong>Best fit:</strong> ${escapeHtml(skill.best_for)}</p><a class="skill-app-link-button${skill.href.startsWith("/skill-finder") ? "" : " secondary"}" href="${escapeHtml(skill.href)}">Open ${escapeHtml(skill.name)}</a></div></details>`).join("")}</div>
          </div>
        </section>`;
      }).join("")}</div><footer class="skill-app-footer"></footer></div>`;
      root.querySelectorAll("[data-zone]").forEach((button) => button.addEventListener("click", () => { state.selectedZone = button.dataset.zone; render(true); }));
      if (focus) root.querySelector(`[data-zone-result="${global.CSS?.escape ? global.CSS.escape(state.selectedZone) : state.selectedZone}"]`)?.focus();
    }
    render();
    if (Progress) Progress.registerTool({
      root, toolId: "thermometer", toolTitle: "Skill Thermometer", route: Progress.TOOL_ROUTES.thermometer, schemaVersion: 1,
      getState: () => state,
      setState: (next) => { state.selectedZone = next.selectedZone; render(); },
      validateState: (next) => plainObjectWithKeys(next, ["selectedZone"]) && typeof next.selectedZone === "string" && (!next.selectedZone || data.zones.some((zone) => zone.id === next.selectedZone)),
      getReadableSummary: (next) => {
        const zone = data.zones.find((item) => item.id === next.selectedZone);
        return Progress.nonEmptySections("Skill Thermometer", [["Selected Zone", zone?.name], ["Description", zone?.description], ["Skills to Consider", zone?.skills.map((skill) => skill.name) || []]]);
      },
    });
  }

  async function initEmotionExplorer(root) {
    const { emotions } = await getJson("emotions.json");
    const state = { step: 0, emotion: "", words: [], regions: [], details: {} };
    const detailFields = [["event", "Prompting event"], ["interpretations", "Interpretations"], ["body", "Body changes"], ["urge", "Action urge"], ["expression", "Face or body expression"], ["said", "What I said"], ["did", "What I did"], ["aftereffects", "Aftereffects"]];
    let graph = null;

    root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Emotion Explorer</h2><p>Select an emotion to see its descriptive words. Your selections stay on this device.</p></header>
      <section class="emotion-force-map" data-force-graph-root aria-labelledby="emotion-graph-heading">
        <div class="values-map-toolbar" role="group" aria-label="Emotion graph view controls"><button type="button" class="secondary" data-graph-action="zoom-out" aria-label="Zoom out">−</button><button type="button" class="secondary" data-graph-action="zoom-in" aria-label="Zoom in">+</button><button type="button" class="secondary" data-graph-action="fit">Fit</button><button type="button" class="secondary" data-graph-action="reset">Reset</button><button type="button" class="secondary" data-graph-action="fullscreen" aria-pressed="false">Full screen</button></div>
        <div class="emotion-force-viewport" data-force-viewport><div class="emotion-force-canvas" data-force-canvas><svg class="emotion-force-svg" role="group" aria-labelledby="emotion-graph-heading"><title id="emotion-graph-heading">Interactive graph of ten broad emotion families and their descriptive words</title><g data-force-scene><g data-force-links></g><g data-force-nodes></g></g></svg></div><p class="visually-hidden" aria-live="polite" data-force-status>Showing You and ten broad emotions.</p></div>
        <section class="emotion-explorer-context" data-emotion-context aria-live="polite"></section>
      </section><footer class="skill-app-footer"></footer></div>`;

    const container = root.querySelector("[data-force-viewport]");
    const context = root.querySelector("[data-emotion-context]");

    function graphData() {
      const ring = container.getBoundingClientRect().width < 480 ? 160 : 230;
      const center = { id: "emotion-you", type: "center", label: "You", radius: 35, collisionRadius: 42, x: 0, y: 0 };
      const primary = emotions.map((emotion, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / emotions.length;
        return { ...emotion, type: "emotion", radius: 38, collisionRadius: 53, expanded: emotion.id === state.emotion, x: Math.cos(angle) * ring, y: Math.sin(angle) * ring };
      });
      const active = emotions.find((emotion) => emotion.id === state.emotion);
      const parent = primary.find((emotion) => emotion.id === state.emotion);
      const words = (active?.related_words || []).map((word, index) => {
        const angle = (index / Math.max(1, active.related_words.length)) * Math.PI * 2;
        const distance = 110 + (index % 3) * 24;
        return { id: `word-${active.id}-${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, type: "word", emotionId: active.id, label: word, color: active.color, selected: state.words.includes(word), radius: 18, collisionRadius: Math.max(27, word.length * 3.1), x: (parent?.x || 0) + Math.cos(angle) * distance, y: (parent?.y || 0) + Math.sin(angle) * distance };
      });
      const links = [...primary.map((emotion) => ({ id: `emotion-link-${emotion.id}`, source: center.id, target: emotion.id, type: "emotion", distance: ring * .85 })), ...words.map((word) => ({ id: `word-link-${word.id}`, source: state.emotion, target: word.id, type: "word", distance: 112 }))];
      return { nodes: [center, ...primary, ...words], links, newNodeIds: words.map((word) => word.id) };
    }

    function renderContext() {
      const emotion = emotions.find((item) => item.id === state.emotion);
      if (!emotion) {
        context.innerHTML = `<h3>Choose an emotion</h3><p>Activate any emotion node to expand its source-listed descriptive words.</p>`;
        return;
      }
      context.innerHTML = `<h3>${escapeHtml(emotion.name)}</h3><p>${escapeHtml(emotion.definition)}</p>
        <div class="emotion-selected-words" aria-label="Selected descriptive words">${state.words.length ? state.words.map((word) => `<button type="button" class="skill-app-chip" data-remove-emotion-word="${escapeHtml(word)}" aria-label="Remove ${escapeHtml(word)}">${escapeHtml(word)} <span aria-hidden="true">×</span></button>`).join("") : '<span class="skill-app-field-help">Select any descriptive word that fits.</span>'}</div>
        <div class="skill-app-actions"><a class="skill-app-link-button" href="${escapeHtml(emotion.learn_route)}">Explore this emotion</a><button type="button" class="secondary" data-change-emotion>Change this emotion</button></div>`;
      context.querySelectorAll("[data-remove-emotion-word]").forEach((control) => control.addEventListener("click", () => {
        state.words = state.words.filter((word) => word !== control.dataset.removeEmotionWord);
        updateGraph();
      }));
      context.querySelector("[data-change-emotion]")?.addEventListener("click", () => {
        try { global.sessionStorage.setItem("therapy-skill-kit.change-emotion-handoff", JSON.stringify({ emotion: emotion.id })); } catch (_error) { /* direct selection remains available */ }
        global.location.href = "/skill-finder/change-emotion/";
      });
    }

    function renderNode(element, node) {
      if (node.type === "center") element.innerHTML = `<circle class="emotion-node-hit" r="39"></circle><circle class="emotion-node-center" r="35"></circle><text class="emotion-node-label emotion-node-label--inverse" y="5" text-anchor="middle">You</text>`;
      if (node.type === "emotion") element.innerHTML = `<circle class="emotion-node-hit" r="48"></circle><circle class="emotion-node-primary" r="38" style="--emotion-color:${escapeHtml(node.color)}"></circle><text class="emotion-node-label emotion-node-label--inverse" y="5" text-anchor="middle">${escapeHtml(node.name)}</text><circle class="emotion-node-toggle-badge" cx="29" cy="-29" r="15"></circle><text class="emotion-node-toggle" x="29" y="-30" dominant-baseline="middle" text-anchor="middle">+</text>`;
      if (node.type === "word") element.innerHTML = `<circle class="emotion-node-hit" r="25"></circle><circle class="emotion-node-word" r="18" style="--emotion-color:${escapeHtml(node.color)}"></circle><text class="emotion-word-label" y="35" text-anchor="middle">${escapeHtml(node.label)}</text>`;
    }

    function updateNode(element, node) {
      element.classList.toggle("is-expanded", Boolean(node.expanded));
      element.classList.toggle("is-selected", Boolean(node.selected));
      if (node.type === "emotion") {
        element.setAttribute("aria-expanded", String(Boolean(node.expanded)));
        const toggle = element.querySelector(".emotion-node-toggle");
        if (toggle) toggle.textContent = node.expanded ? "−" : "+";
      }
      if (node.type === "word") element.setAttribute("aria-pressed", String(Boolean(node.selected)));
    }

    function updateGraph() {
      const data = graphData();
      graph.update(data.nodes, data.links, { reheat: .62, newNodeIds: data.newNodeIds });
      renderContext();
    }

    graph = global.TherapyForceGraph?.createForceViewport({
      container,
      initialNodeIds: ["emotion-you", ...emotions.map((emotion) => emotion.id)],
      minZoom: .38,
      maxZoom: 3.2,
      linkDistance: (link) => link.distance,
      linkStrength: (link) => link.type === "emotion" ? .48 : .68,
      charge: (node) => node.type === "center" ? -280 : node.type === "emotion" ? -260 : -90,
      collisionRadius: (node) => node.collisionRadius,
      dragAlphaTarget: (node) => node.type === "center" ? .48 : .12,
      persistDrop: (node) => node.type === "center",
      renderNode,
      updateNode,
      ariaLabel: (node) => node.type === "center" ? "You, draggable center of the emotion graph" : node.type === "emotion" ? `${node.expanded ? "Collapse" : "Expand"} descriptive words for ${node.name}` : `${node.label}, descriptive word for ${emotions.find((emotion) => emotion.id === node.emotionId)?.name}. ${node.selected ? "Selected" : "Not selected"}.`,
      onNodeActivate: (node) => {
        if (node.type === "emotion") {
          const switching = state.emotion !== node.id;
          state.emotion = node.expanded ? "" : node.id;
          if (switching || !state.emotion) state.words = [];
          updateGraph();
        } else if (node.type === "word") {
          state.words = state.words.includes(node.label) ? state.words.filter((word) => word !== node.label) : [...state.words, node.label];
          updateGraph();
        }
      },
    });
    if (!graph) throw new Error("Shared force graph is unavailable");
    updateGraph();
    if (Progress) Progress.registerTool({
      root, toolId: "emotion-explorer", toolTitle: "Emotion Explorer", route: Progress.TOOL_ROUTES["emotion-explorer"], schemaVersion: 1,
      getState: () => state,
      setState: (next) => { Object.assign(state, next, { words: [...next.words], regions: [...next.regions], details: { ...next.details } }); updateGraph(); },
      validateState: (next) => {
        if (!plainObjectWithKeys(next, ["step", "emotion", "words", "regions", "details"]) || !Number.isInteger(next.step) || typeof next.emotion !== "string") return false;
        const emotion = emotions.find((item) => item.id === next.emotion);
        if (next.emotion && !emotion) return false;
        if (!Array.isArray(next.words) || next.words.length > 100 || next.words.some((word) => typeof word !== "string" || (emotion && !emotion.related_words.includes(word)))) return false;
        if (!Array.isArray(next.regions) || next.regions.some((region) => !BODY_REGIONS.includes(region))) return false;
        return plainObjectWithKeys(next.details, detailFields.map(([key]) => key)) && Object.values(next.details).every((value) => typeof value === "string");
      },
      getReadableSummary: (next) => {
        const emotion = emotions.find((item) => item.id === next.emotion);
        return Progress.nonEmptySections("Emotion Explorer", [["Emotion Family", emotion?.name], ["Words That Fit", next.words], ["Definition", emotion?.definition]]);
      },
    });
  }

  async function initPleasantEvent(root) {
    const { events } = await getJson("pleasant-events.json");
    const state = { selected: null, query: "", tag: "", plan: {} };
    const tags = ["low energy", "outdoors", "with others"];
    function render(focus = false) {
      const matches = events.filter((event) => (!state.query || event.title.toLowerCase().includes(state.query.toLowerCase())) && (!state.tag || event.tags.includes(state.tag)));
      const selected = events.find((event) => event.id === state.selected);
      root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>Pleasant Event Planner</h2><p>Browse 225 source activities. Tags are limited to what can be reasonably inferred from the wording.</p></header><section class="skill-app-panel" tabindex="-1"><div class="skill-app-inline-fields"><div><label for="pleasant-search">Search activities</label><input id="pleasant-search" type="search" value="${escapeHtml(state.query)}"></div><div><label for="pleasant-tag">Browse by tag</label><select id="pleasant-tag"><option value="">All activities</option>${tags.map((tag) => `<option ${state.tag === tag ? "selected" : ""}>${tag}</option>`).join("")}</select></div></div><div class="skill-app-actions"><button type="button" class="secondary" data-surprise>Surprise me</button><span aria-live="polite">${matches.length} activities shown</span></div><div class="pleasant-event-list">${matches.map((event) => `<button type="button" class="secondary" data-event-id="${event.id}" aria-pressed="${event.id === state.selected}">${escapeHtml(event.title)}</button>`).join("")}</div>${selected ? `<section class="skill-app-plan"><h3>Plan: ${escapeHtml(selected.title)}</h3>${[["when", "When?"], ["duration", "How long?"], ["smallest", "Smallest version I could do?"], ["support", "What would help me follow through?"]].map(([key, label]) => `<label for="pleasant-${key}">${label}</label><input id="pleasant-${key}" type="${key === "when" ? "datetime-local" : "text"}" data-plan="${key}" value="${escapeHtml(state.plan[key])}">`).join("")}<p class="skill-app-note">Be mindful of the pleasant moment: gently return attention to what you see, hear, feel, smell, taste, or appreciate.</p>${linkCards([{ label: "Behavioural Activation", href: "/learn/wellness/behavioral-activation.html", kind: "learn" }, { label: "Build Mastery", href: "/learn/emotion-regulation/positive-emotions-mastery-cope-ahead.html#build-mastery", kind: "learn" }, { label: "Values", href: "/skill-finder/values/", kind: "app" }, { label: "SMART Goal Builder", href: "/learn/goal-setting/goal-setting-guidelines.html#smart-goals", kind: "learn" }])}</section>` : ""}</section><footer class="skill-app-footer"></footer></div>`;
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
    if (Progress) Progress.registerTool({
      root, toolId: "pleasant-event", toolTitle: "Pleasant Event Planner", route: Progress.TOOL_ROUTES["pleasant-event"], schemaVersion: 1,
      getState: () => state,
      setState: (next) => { Object.assign(state, next, { plan: { ...next.plan } }); render(); },
      validateState: (next) => plainObjectWithKeys(next, ["selected", "query", "tag", "plan"])
        && (next.selected === null || (Number.isInteger(next.selected) && events.some((event) => event.id === next.selected)))
        && typeof next.query === "string" && typeof next.tag === "string" && (!next.tag || tags.includes(next.tag))
        && plainObjectWithKeys(next.plan, ["when", "duration", "smallest", "support"]) && Object.values(next.plan).every((value) => typeof value === "string"),
      getReadableSummary: (next) => {
        const selected = events.find((event) => event.id === next.selected);
        return Progress.nonEmptySections("Pleasant Event Planner", [["Pleasant Event", selected?.title], ["When", next.plan.when], ["Duration", next.plan.duration], ["Smallest Version", next.plan.smallest], ["Support", next.plan.support]]);
      },
    });
  }

  async function start() {
    const initializers = { thermometer: initThermometer, emotions: initEmotionExplorer, "change-emotion": (root) => initConstrainedFlow(root, "change-emotion"), "worry-tree": (root) => initFlow(root, "worry-tree"), "pleasant-event": initPleasantEvent };
    for (const root of document.querySelectorAll("[data-skill-app]")) {
      const initializer = initializers[root.dataset.skillApp];
      if (!initializer) continue;
      try { await initializer(root); } catch (error) { root.innerHTML = `<p class="skill-app-note">This tool could not load. Please refresh the page or use the linked Learn material.</p>`; global.console?.error(error); }
    }
  }

  global.SkillFinderFlowEngine = FlowEngine;
  global.SkillFinderConstrainedTreeEngine = ConstrainedTreeEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = { FlowEngine, ConstrainedTreeEngine, BODY_REGIONS };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", start);
})(typeof window === "undefined" ? globalThis : window);

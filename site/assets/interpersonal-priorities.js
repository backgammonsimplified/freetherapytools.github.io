(function (global) {
  "use strict";

  const getProgress = () => global.TherapySkillProgress || (typeof require === "function" ? require("./skill-progress.js") : null);
  const sitePath = (value) => global.TherapySite?.path(value) || value;
  const ROUTE = "/learn/interpersonal-effectiveness/clarifying-priorities.html";
  const OBSTACLES = [
    ["unclear-goal", "I have not decided what I want from this conversation."],
    ["strong-feelings", "Strong feelings may make it harder to choose how to respond."],
    ["short-term-urge", "An immediate urge may pull me away from a longer-term goal."],
    ["other-person", "The other person's ability, willingness, or priorities may limit the outcome."],
    ["power-safety", "Power, timing, or safety may affect what is possible right now."],
    ["prediction", "I may be treating a feared response as though it has already happened."],
  ];
  const ASSUMPTIONS = [
    ["must-know-answer", "I need to know the answer before I can make a request."],
    ["upset-means-wrong", "If someone is upset, my request or refusal must be wrong."],
    ["help-means-failure", "Needing help means I have failed."],
    ["no-is-selfish", "Saying no is always selfish."],
    ["mind-reading", "People who care about me should know what I need without being told."],
    ["approval-required", "I need everyone to approve of me to preserve this relationship."],
    ["all-or-nothing", "If I cannot get exactly what I want, there is no point trying."],
    ["values-optional", "How I treat myself or others does not matter if I get the outcome."],
  ];
  const TEXT_FIELDS = [
    "situation", "otherObstacle", "thought", "evidenceFor", "evidenceAgainst",
    "balancedResponse", "objective", "relationship", "selfRespect", "context", "nextStep",
  ];
  const RANK_FIELDS = ["objectiveRank", "relationshipRank", "selfRespectRank"];
  const RANKS = ["", "1", "2", "3"];
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const plain = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function initialState() {
    return {
      ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, ""])),
      ...Object.fromEntries(RANK_FIELDS.map((key) => [key, ""])),
      obstacles: [], assumptions: [],
    };
  }

  function validState(value) {
    if (!plain(value)) return false;
    const keys = [...TEXT_FIELDS, ...RANK_FIELDS, "obstacles", "assumptions"];
    if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return false;
    if (!TEXT_FIELDS.every((key) => typeof value[key] === "string" && value[key].length <= 10000)) return false;
    if (!RANK_FIELDS.every((key) => RANKS.includes(value[key]))) return false;
    return [["obstacles", OBSTACLES], ["assumptions", ASSUMPTIONS]].every(([key, options]) =>
      Array.isArray(value[key]) && value[key].length <= options.length
      && new Set(value[key]).size === value[key].length
      && value[key].every((item) => typeof item === "string" && options.some(([id]) => id === item)));
  }

  function selectedLabels(values, options) {
    return options.filter(([id]) => values.includes(id)).map(([, label]) => label);
  }

  function priorityHint(state) {
    const assigned = RANK_FIELDS.map((key) => state[key]).filter(Boolean);
    if (new Set(assigned).size !== assigned.length) return "Two goals have the same rank. Give each a different rank, or leave a goal unranked for now.";
    const first = [
      ["objectiveRank", "DEAR MAN can help you make a clear request or refusal."],
      ["relationshipRank", "GIVE can help you attend to the relationship."],
      ["selfRespectRank", "FAST can help you act in line with self-respect."],
    ].find(([key]) => state[key] === "1");
    return first ? `Your first priority is set. ${first[1]} The other goals still matter.` : "Rank the goals if it helps you decide what to emphasize first.";
  }

  function readable(state) {
    const sections = [
      ["Situation", state.situation],
      ["What may get in the way", selectedLabels(state.obstacles, OBSTACLES).concat(state.otherObstacle ? [state.otherObstacle] : [])],
      ["Assumptions worth checking", selectedLabels(state.assumptions, ASSUMPTIONS)],
      ["Thought to examine", state.thought],
      ["What supports the thought", state.evidenceFor],
      ["What complicates the thought", state.evidenceAgainst],
      ["A fairer response", state.balancedResponse],
      ["Objective", state.objective],
      ["Relationship", state.relationship],
      ["Self-respect", state.selfRespect],
      ["Priority ranking", [
        ["Objective", state.objectiveRank], ["Relationship", state.relationshipRank], ["Self-respect", state.selfRespectRank],
      ].filter(([, rank]) => rank).map(([label, rank]) => `${label}: ${rank}`)],
      ["Context and safety", state.context],
      ["Next step", state.nextStep],
      ["Reference", "Original practice prompts informed by Marsha M. Linehan, DBT Skills Training Handouts and Worksheets, second edition (2015), Interpersonal Effectiveness Handouts 2–4 and Worksheets 2–3."],
    ];
    return getProgress().nonEmptySections("Interpersonal Priorities Practice", sections);
  }

  function checklist(name, options, values) {
    return options.map(([id, label]) => `<label class="skill-app-check" for="ip-${id}"><input id="ip-${id}" name="${name}" type="checkbox" value="${id}"${values.includes(id) ? " checked" : ""}><span>${escapeHtml(label)}</span></label>`).join("");
  }

  function field(key, label, value, rows = 3) {
    return `<label for="ip-${key}">${escapeHtml(label)}</label><textarea id="ip-${key}" name="${key}" rows="${rows}">${escapeHtml(value)}</textarea>`;
  }

  function rank(key, label, value) {
    return `<label for="ip-${key}">${escapeHtml(label)}</label><select id="ip-${key}" name="${key}"><option value="">Leave unranked</option>${[1, 2, 3].map((number) => `<option value="${number}"${value === String(number) ? " selected" : ""}>${number} — ${["most important", "next", "least important"][number - 1]}</option>`).join("")}</select>`;
  }

  function render(root, state) {
    root.innerHTML = `<div class="skill-app-shell">
      <header class="skill-app-header"><h2>Practice: clarify this interaction</h2><p>Choose only what fits. The checklists are starting points for reflection, not scores or diagnoses. You can leave any field blank.</p></header>
      <form class="skill-app-panel" data-priorities-form>
        <fieldset class="skill-app-fieldset" id="priority-obstacles"><legend>1. What may be getting in the way?</legend>
          ${field("situation", "What is happening? Describe the situation without guessing the other person's motives.", state.situation)}
          <p>Check anything you want to consider:</p>${checklist("obstacles", OBSTACLES, state.obstacles)}
          ${field("otherObstacle", "Another obstacle or useful detail", state.otherObstacle, 2)}
        </fieldset>
        <fieldset class="skill-app-fieldset" id="priority-assumptions"><legend>2. Which assumptions are worth checking?</legend>
          <p>These are possible thought patterns, not statements about you. Select any that sound familiar in this situation.</p>
          ${checklist("assumptions", ASSUMPTIONS, state.assumptions)}
          ${field("thought", "Put one thought you want to examine into your own words.", state.thought, 2)}
          ${field("evidenceFor", "What facts support it?", state.evidenceFor, 2)}
          ${field("evidenceAgainst", "What facts or other explanations complicate it?", state.evidenceAgainst, 2)}
          ${field("balancedResponse", "What is a fairer, more flexible response?", state.balancedResponse, 2)}
        </fieldset>
        <fieldset class="skill-app-fieldset" id="priority-goals"><legend>3. Name and rank your goals</legend>
          <p>Consider what you want to accomplish, how you want to treat the relationship, and how you want to act toward yourself.</p>
          ${field("objective", "Objective: what specific request, refusal, or outcome matters?", state.objective, 2)}
          ${field("relationship", "Relationship: what do you want to preserve or communicate?", state.relationship, 2)}
          ${field("selfRespect", "Self-respect: what value or limit do you want your actions to reflect?", state.selfRespect, 2)}
          <p>Optional: give each goal a different rank, with 1 as the first priority.</p>
          ${rank("objectiveRank", "Objective rank", state.objectiveRank)}
          ${rank("relationshipRank", "Relationship rank", state.relationshipRank)}
          ${rank("selfRespectRank", "Self-respect rank", state.selfRespectRank)}
          <p data-priority-hint role="status" aria-live="polite">${escapeHtml(priorityHint(state))}</p>
          ${field("context", "What about safety, timing, power, or capacity affects your plan?", state.context, 2)}
          ${field("nextStep", "What is one workable next step?", state.nextStep, 2)}
        </fieldset>
      </form>
      <footer class="skill-app-footer"><p>Use a skill that fits the situation. A thoughtful request may still receive a no.</p><div class="skill-app-actions">
        <a class="skill-app-link-button secondary" href="${sitePath("/tool-finder/dear-man/")}" target="_blank" rel="noopener">DEAR MAN</a>
        <a class="skill-app-link-button secondary" href="${sitePath("/tool-finder/dear-give/")}" target="_blank" rel="noopener">GIVE</a>
        <a class="skill-app-link-button secondary" href="${sitePath("/tool-finder/dear-fast/")}" target="_blank" rel="noopener">FAST</a>
      </div></footer>
    </div>`;
  }

  function readForm(root) {
    const form = root.querySelector("[data-priorities-form]");
    const next = initialState();
    [...TEXT_FIELDS, ...RANK_FIELDS].forEach((key) => { next[key] = form.elements.namedItem(key).value; });
    next.obstacles = [...form.querySelectorAll('input[name="obstacles"]:checked')].map((input) => input.value);
    next.assumptions = [...form.querySelectorAll('input[name="assumptions"]:checked')].map((input) => input.value);
    return next;
  }

  function mount(root) {
    const Progress = getProgress();
    if (!Progress) return;
    let state = initialState();
    render(root, state);
    root.addEventListener("input", (event) => {
      if (!event.target.closest("[data-priorities-form]")) return;
      state = readForm(root);
      root.querySelector("[data-priority-hint]").textContent = priorityHint(state);
    });
    root.addEventListener("change", (event) => {
      if (event.target.closest("[data-priorities-form]")) {
        state = readForm(root);
        root.querySelector("[data-priority-hint]").textContent = priorityHint(state);
      }
    });
    root.addEventListener("submit", (event) => event.preventDefault());
    Progress.registerTool({
      schemaVersion: 1, root, toolId: "resource-interpersonal-priorities",
      toolTitle: "Interpersonal Priorities Practice", route: ROUTE,
      getState: () => clone(state),
      setState: (next) => { state = clone(next); render(root, state); },
      validateState: validState,
      getReadableSummary: readable,
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { OBSTACLES, ASSUMPTIONS, initialState, validState, priorityHint, readable };
  if (typeof document !== "undefined") {
    const start = () => {
      const root = document.querySelector("[data-priorities-app]");
      if (!root || !getProgress() || root.dataset.prioritiesMounted) return false;
      root.dataset.prioritiesMounted = "true";
      mount(root);
      return true;
    };
    if (document.readyState === "complete") start();
    else global.addEventListener("load", start, { once: true });
  }
})(typeof window !== "undefined" ? window : globalThis);

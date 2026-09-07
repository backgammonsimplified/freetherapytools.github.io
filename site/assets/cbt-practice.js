(function (global) {
  "use strict";
  const TITLE = { avoidance: "Avoidance & Approach Planner", "safety-behaviours": "Safety Behaviour Check", exposure: "Fear Ladder / Graded Exposure" };
  const LEARN = "/learn/cbt-anxiety/safety-behaviours-exposure.html";
  const SAFETY = "Choose situations that are reasonably safe to approach. Do not use practice to override genuine danger, consent, legal limits, medical restrictions, accessibility needs, or boundaries in coercive situations. Keep medically necessary supports and prescribed treatment.";
  const CATEGORIES = [
    ["Social / attention", ["Keeping to the edge so others will not notice me", "Looking away to avoid eye contact", "Using a phone to withdraw from an interaction", "Rehearsing conversations far beyond what helps", "Reviewing messages repeatedly to avoid embarrassment", "Using clothing or accessories mainly to avoid attention"]],
    ["Reassurance / dependence", ["Checking repeatedly that someone else is safe", "Going places only with a trusted companion", "Asking for reassurance again after receiving an answer", "Carrying an object because coping without it feels impossible"]],
    ["Escape / control", ["Mapping exits mainly to keep escape available", "Keeping every task under my control", "Avoiding delegation because uncertainty feels intolerable"]],
    ["Checking", ["Returning to check locks after a reasonable check", "Monitoring bodily signs or vital readings repeatedly", "Seeking repeated health reassurance", "Checking work or messages far beyond what the task needs"]],
    ["Preparation / perfectionism", ["Preparing much more than is useful", "Repeating a rehearsal until it feels certain", "Avoiding ordinary low-stakes risks unless success feels guaranteed"]],
    ["Avoidance", ["Staying away from places that bring up anxiety", "Putting off actions because of worry", "Avoiding situations with an uncertain outcome"]],
    ["Substances / rituals", ["Using substances mainly to suppress anxiety", "Performing superstitious rituals to prevent a feared outcome"]]
  ];
  // Original Free Therapy Tools prompts; not a transcription of source worksheets.
  const AVOIDANCE = [
    ["situation", "What are you avoiding or putting off?", "Avoided situation"],
    ["difficult", "What feels frightening, uncomfortable, uncertain, or overwhelming about it?", "What feels difficult"],
    ["prediction", "What do you predict might happen?", "Prediction"],
    ["control", "Which parts are within your control or possible to change?", "Possible to change"],
    ["thoughts", "What thoughts or rules are getting in the way?", "Thoughts getting in the way"],
    ["instead", "What do you currently do instead?", "Current response"],
    ["relief", "What short-term relief does avoiding it give you?", "Short-term relief"],
    ["cost", "What does avoidance cost you over time?", "Longer-term cost"],
    ["outcome", "What would you like to be able to do in this situation?", "Desired outcome"],
    ["visualize", "Picture a successful-enough outcome. What would you be doing if anxiety were not making the decision for you?", "Successful-enough outcome"],
    ["step", "What is one small, safe approach step?", "Safe approach step"],
    ["support", "What could make that step manageable?", "Support"],
    ["difficulty", "Predicted difficulty 0–100 (optional)", "Predicted difficulty", "number"],
    ["safety", "Safety behaviour to notice or reduce, if useful", "Safety behaviours"],
    ["plan", "When and where could you try it?", "Practice plan"]
  ];
  const BEHAVIOUR = [
    ["fear", "What are you afraid might happen without this behaviour?", "Feared outcome"],
    ["relief", "What relief or protection does it give you in the short term?", "Short-term effects"],
    ["cost", "What might relying on it cost in the longer term?", "Longer-term effects"],
    ["learning", "What does it make harder to learn or test directly?", "Learning blocked"],
    ["coping", "Could it be serving a useful coping purpose in this situation? Does it help you participate?", "Useful coping purpose"],
    ["experiment", "What is one small, safe way you could experiment with relying on it a little less?", "Safe experiment"],
    ["observe", "What would you observe to learn from the experiment?", "What to observe"]
  ];
  const RUNG = [
    ["situation", "Practice step / situation: what will you do?", "Practice step"],
    ["difficulty", "Predicted difficulty 0–100 (optional)", "Predicted difficulty", "number"],
    ["prediction", "What prediction could this help you test?", "Prediction"],
    ["support", "Who will be there / what support will you use?", "Who / support"],
    ["change", "What changes from the previous rung?", "What changes"],
    ["plan", "When / where will you practise?", "When / where"],
    ["duration", "How long will you stay engaged to learn?", "How long"],
    ["safety", "Safety behaviours I might reduce", "Safety behaviours"],
    ["notes", "Notes", "Notes"]
  ];
  const PRACTICE = [
    ["date", "Date", "Date", "date"],
    ["attempt", "Approach step attempted / what I attempted", "Attempt"],
    ["before", "Before difficulty/anxiety 0–100 (optional)", "Before difficulty/anxiety", "number"],
    ["happened", "What happened?", "Observed outcome"],
    ["did", "What did I do?", "What I actually did"],
    ["felt", "How anxious or uncomfortable did I feel?", "How I felt"],
    ["after", "After difficulty/anxiety 0–100 (optional)", "After difficulty/anxiety", "number"],
    ["coped", "What did I cope with?", "Coping"],
    ["learned", "What did I learn?", "Learning"],
    ["next", "What might I try next: repeat, adjust, move upward, or add an in-between rung?", "Next useful step"]
  ];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const obj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const blank = (fields) => Object.fromEntries(fields.map(([key]) => [key, ""]));
  function newItem(kind) { return { ...blank(kind === "avoidance" ? AVOIDANCE : kind === "exposure" ? RUNG : BEHAVIOUR), ...(kind === "safety-behaviours" ? { name: "", selected: true } : { practice: [] }) }; }
  function initial(kind) { return kind === "exposure" ? { fear: "", goal: "", safety: "", next: "", items: [newItem(kind)] } : { items: [] }; }
  function normalize(kind, value) {
    if (kind === "exposure" && Array.isArray(value.steps)) {
      return { fear: value.theme, goal: "", safety: value.safety, next: value.next, items: value.steps.map((old) => ({ ...newItem(kind), situation: old.situation, difficulty: old.before, practice: old.after !== "" ? [{ ...blank(PRACTICE), after: old.after, attempt: old.situation }] : [] })) };
    }
    return clone(value);
  }
  function validFields(value, fields) {
    return obj(value) && fields.every(([key, , , type]) => typeof value[key] === "string" && (type !== "number" || value[key] === "" || (/^\d{1,3}$/.test(value[key]) && Number(value[key]) <= 100)));
  }
  function validate(kind, value) {
    if (!obj(value)) return false;
    if (kind === "exposure" && Array.isArray(value.steps)) {
      if (!["theme", "safety", "next"].every((k) => typeof value[k] === "string") || !value.steps.every(s => validFields(s, [["situation"], ["before", "", "", "number"], ["after", "", "", "number"]]))) return false;
      value = normalize(kind, value);
    }
    if (!Array.isArray(value.items)) return false;
    if (kind === "exposure" && !["fear", "goal", "safety", "next"].every(k => typeof value[k] === "string")) return false;
    return value.items.every(item => validFields(item, kind === "avoidance" ? AVOIDANCE : kind === "exposure" ? RUNG : BEHAVIOUR) && (kind === "safety-behaviours" ? typeof item.name === "string" && typeof item.selected === "boolean" : Array.isArray(item.practice) && item.practice.every(p => validFields(p, PRACTICE))));
  }
  function summary(kind, saved) {
    const state = normalize(kind, saved), lines = [`# ${TITLE[kind]}`];
    const sections = (item, fields, level = "##") => fields.forEach(([key, , heading]) => { if (item[key]) lines.push("", `${level} ${heading}`, "", item[key]); });
    if (kind === "exposure") sections(state, [["fear", "", "Fear / avoided situation"], ["goal", "", "Victory / Goal"], ["safety", "", "Safety behaviours"], ["next", "", "Next practice step"]]);
    state.items.forEach((item, i) => {
      lines.push("", `## ${kind === "exposure" ? "Rung" : kind === "avoidance" ? "Situation" : "Behaviour"} ${i + 1}${item.name ? `: ${item.name}` : ""}`);
      if (kind === "safety-behaviours") lines.push("", item.selected ? "Selected behaviour — this may be worth examining." : "Not currently selected; previous reflection retained.");
      sections(item, kind === "avoidance" ? AVOIDANCE : kind === "exposure" ? RUNG : BEHAVIOUR);
      if (item.practice?.length) {
        lines.push("", "## Practice history");
        item.practice.forEach((p, j) => { lines.push("", `### Practice ${j + 1}`); sections(p, PRACTICE, "####"); });
      }
    });
    return lines.join("\n");
  }
  function prompt(fear = "", goal = "") {
    return `I am building a graded practice ladder for this fear or avoided situation:\n${fear.trim() || "[DESCRIBE THE FEAR]"}\n\nMy meaningful goal is:\n${goal.trim() || "[GOAL]"}\n\nPlease brainstorm 15–25 possible practice steps from easier to harder.\n\nVary who is present; what I do; when I do it; where I do it; how long I remain in the situation; how much support I use; and which unnecessary safety behaviours I reduce.\n\nKeep suggestions specific, gradual, legal, consensual, realistically safe, and connected to my goal. Do not assume every suggestion is appropriate for me. Do not tell me to ignore real danger, medical limitations, trauma boundaries, or other people's consent. Do not suggest stopping prescribed treatment or removing medically necessary supports.\n\nFor each idea give:\n1. The practice step.\n2. Why it may be easier or harder.\n3. What prediction it could help me test.\n\nI will edit the suggestions myself and can bring useful ideas to my therapist or another qualified support person.`;
  }
  function promptMarkup() {
    return `<div class="cbt-prompt"><p>Need ideas for ladder steps?</p><button type="button" data-cbt-copy aria-label="Copy fear ladder brainstorming prompt">Copy brainstorming prompt</button><span data-cbt-copy-status role="status"></span><details><summary>Read or select the brainstorming prompt</summary><pre data-cbt-prompt-text tabindex="0">${esc(prompt())}</pre></details><p>AI suggestions are brainstorming material. Edit them for your circumstances and, when useful, bring them to your therapist or support person.</p></div>`;
  }
  function bindPrompt(root, getState = () => ({})) {
    root.querySelectorAll("[data-cbt-copy]").forEach(button => button.addEventListener("click", async () => {
      const state = getState(), text = prompt(state.fear, state.goal), area = button.closest(".cbt-prompt");
      area.querySelector("[data-cbt-prompt-text]").textContent = text;
      try { await global.navigator.clipboard.writeText(text); area.querySelector("[data-cbt-copy-status]").textContent = "Prompt copied. You choose where to paste it."; }
      catch (_) { area.querySelector("details").open = true; area.querySelector("[data-cbt-copy-status]").textContent = "Copy is unavailable. Select and copy the prompt below."; }
    }));
  }
  function fieldMarkup(fields, value, prefix, attrs) {
    return `<div class="cbt-fields">${fields.map(([key, label, , type]) => `<div class="cbt-field"><label for="${prefix}-${key}">${label}</label>${type ? `<input id="${prefix}-${key}" type="${type}" ${type === "number" ? 'min="0" max="100" step="1"' : ""} value="${esc(value[key])}"` : `<textarea id="${prefix}-${key}" rows="3"`} data-cbt-field="${key}" ${attrs}>${type ? "" : `${esc(value[key])}</textarea>`}</div>`).join("")}</div>`;
  }
  function init(root, kind) {
    let state = initial(kind), adapter;
    const path = global.TherapySite?.path || (v => v);
    const action = (text, name, i = "", extra = "") => `<button type="button" class="secondary" data-cbt-action="${name}" data-item="${i}" ${extra}>${text}</button>`;
    function render(focus) {
      const downloads = kind === "avoidance" ? `<p class="skill-app-actions">${["pdf", "docx"].map(ext => `<a href="${path(`/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.${ext}`)}" download>Download ${ext === "pdf" ? "printable" : "editable"} worksheet (${ext.toUpperCase()})</a>`).join(" ")}</p>` : "";
      const checklist = kind === "safety-behaviours" ? `<p>This is a reflection checklist, not a diagnostic test. A selection means only: this may be worth examining. Purpose matters more than the action's appearance.</p><div class="cbt-checklist">${CATEGORIES.map(([category, names], c) => `<fieldset><legend>${category}</legend>${names.map((name, n) => `<label class="cbt-check"><input type="checkbox" data-cbt-choice="${c}-${n}" ${state.items.some(item => item.name === name && item.selected) ? "checked" : ""}> <span>${name}</span></label>`).join("")}</fieldset>`).join("")}</div><label for="cbt-custom">Custom behaviour</label><input id="cbt-custom" type="text">${action("Add custom behaviour", "custom")}` : "";
      const setup = kind === "exposure" ? `${fieldMarkup([["fear", "What fear or avoided situation are you working on?"], ["goal", "What would greater freedom look like? What is the meaningful goal at the top of this ladder?"], ["safety", "Safety behaviours I want to notice"], ["next", "Next practice step"]], state, "cbt-setup", 'data-setup="true"')}${promptMarkup()}<p>Arrange rungs toward your goal. WHO, WHAT, WHEN, WHERE, HOW long, support, and safety behaviours can change difficulty. Ratings are optional planning estimates, not clinical scores.</p><div class="cbt-victory"><strong>VICTORY / GOAL</strong><p data-cbt-goal>${esc(state.goal || "Something meaningful you want to be able to do")}</p></div>` : "";
      const fields = kind === "avoidance" ? AVOIDANCE : kind === "exposure" ? RUNG : BEHAVIOUR;
      // State stays easier-to-harder for compatibility. Display the highest rung beside the goal.
      const ordered = state.items.map((item, i) => ({ item, i }));
      if (kind === "exposure") ordered.reverse();
      root.innerHTML = `<div class="skill-app-shell cbt-tool"><header class="skill-app-header"><h2>${TITLE[kind]}</h2><p>${kind === "avoidance" ? "Notice what anxiety is keeping you from, identify a safe direction of progress, and choose a manageable next step." : kind === "safety-behaviours" ? "Notice behaviours that may reduce anxiety now but make it harder to test fears or build confidence over time." : "Build toward a meaningful goal and learn from repeated practice."}</p></header><section class="skill-app-panel">${downloads}<p class="skill-app-note">${SAFETY}</p>${checklist}${setup}${kind === "avoidance" ? action("Add an avoided situation", "add") : ""}<div class="${kind === "exposure" ? "cbt-ladder" : "cbt-items"}">${ordered.map(({ item, i }) => `<details class="cbt-item" data-item-card="${i}" ${item.selected === false ? "" : "open"}><summary>${kind === "exposure" ? `Rung ${i + 1}` : kind === "avoidance" ? `Avoided situation ${i + 1}` : esc(item.name)}${item.selected === false ? " (reflection retained)" : ""}</summary>${kind === "safety-behaviours" ? '<p>This may be worth examining. Consider both useful coping and avoidance in this context.</p>' : ""}${fieldMarkup(fields, item, `cbt-item-${i}`, `data-item="${i}"`)}<div class="skill-app-actions">${kind === "exposure" ? action("Move up", "up", i, i === state.items.length - 1 ? "disabled" : "") + action("Move down", "down", i, i === 0 ? "disabled" : "") + action("Duplicate rung", "duplicate", i) : ""}${action(kind === "exposure" ? "Remove rung" : "Remove item", "remove", i)}</div>${item.practice ? `<h3>Practice history</h3><p>Review both what you did and how you felt. Practice can be useful even when anxiety remains high.</p>${item.practice.map((p, j) => `<details class="cbt-practice" open><summary>Practice ${j + 1}</summary>${fieldMarkup(PRACTICE, p, `cbt-practice-${i}-${j}`, `data-item="${i}" data-practice="${j}"`)}</details>`).join("")}${action("Add practice entry", "practice", i)}` : ""}</details>`).join("")}</div>${kind === "exposure" ? action("Add rung", "add") + '<p>Start with a workable lower rung. Repeat or add a smaller step when useful; you do not need to feel completely comfortable to move upward.</p>' : ""}<p data-cbt-status role="status"></p></section><footer class="skill-app-footer"><a href="${path(LEARN + (kind === "avoidance" ? "#avoidance-and-approach" : kind === "exposure" ? "#fear-ladder" : "#safety-behaviours"))}">Learn Safety Behaviours &amp; Exposure</a></footer></div>`;
      bindPrompt(root, () => state);
      if (focus) root.querySelector(focus)?.focus();
    }
    root.addEventListener("input", e => {
      const el = e.target, key = el.dataset.cbtField;
      if (!key) return;
      const target = el.dataset.setup ? state : el.dataset.practice !== undefined ? state.items[Number(el.dataset.item)].practice[Number(el.dataset.practice)] : state.items[Number(el.dataset.item)];
      target[key] = el.value;
      if (key === "goal") root.querySelector("[data-cbt-goal]").textContent = el.value || "Something meaningful you want to be able to do";
    });
    root.addEventListener("change", e => {
      if (!e.target.matches("[data-cbt-choice]")) return;
      const [c, n] = e.target.dataset.cbtChoice.split("-").map(Number), name = CATEGORIES[c][1][n];
      const item = state.items.find(item => item.name === name);
      if (item) item.selected = e.target.checked;
      else state.items.push({ ...newItem(kind), name });
      const choice = e.target.dataset.cbtChoice;
      render(`[data-cbt-choice="${choice}"]`);
      adapter?.notifyChange();
    });
    root.addEventListener("click", e => {
      const button = e.target.closest("[data-cbt-action]");
      if (!button || button.disabled) return;
      const name = button.dataset.cbtAction, i = Number(button.dataset.item);
      let focus, message;
      if (name === "add") { state.items.push(newItem(kind)); focus = `#cbt-item-${state.items.length - 1}-situation`; }
      if (name === "custom") {
        const input = root.querySelector("#cbt-custom"), value = input.value.trim();
        if (!value) { input.focus(); return; }
        const existing = state.items.find(item => item.name === value);
        if (existing) existing.selected = true; else state.items.push({ ...newItem(kind), name: value });
        focus = `#cbt-item-${state.items.findIndex(item => item.name === value)}-fear`;
      }
      if (name === "remove") {
        if (!global.confirm("Remove this item and its saved reflection/practice entries from the current plan?")) return;
        state.items.splice(i, 1); focus = state.items.length ? `[data-item-card="${Math.min(i, state.items.length - 1)}"] summary` : '[data-cbt-action="add"], #cbt-custom';
      }
      if (name === "practice") { state.items[i].practice.push(blank(PRACTICE)); focus = `#cbt-practice-${i}-${state.items[i].practice.length - 1}-date`; }
      if (name === "duplicate") { const copy = clone(state.items[i]); copy.practice = []; state.items.splice(i + 1, 0, copy); focus = `#cbt-item-${i + 1}-situation`; }
      if (name === "up" || name === "down") {
        const to = i + (name === "up" ? 1 : -1);
        if (to < 0 || to >= state.items.length) return;
        [state.items[i], state.items[to]] = [state.items[to], state.items[i]];
        focus = `[data-item-card="${to}"] summary`; message = `Moved to rung ${to + 1}.`;
      }
      render(focus);
      if (message) root.querySelector("[data-cbt-status]").textContent = message;
      adapter?.notifyChange();
    });
    render();
    if (global.TherapySkillProgress) adapter = global.TherapySkillProgress.registerTool({ root, toolId: kind, toolTitle: TITLE[kind], route: global.TherapySkillProgress.TOOL_ROUTES[kind], schemaVersion: 1, getState: () => clone(state), setState: value => { state = normalize(kind, value); render(); }, validateState: value => validate(kind, value), getReadableSummary: value => summary(kind, value) });
  }
  const api = { CATEGORIES, AVOIDANCE, BEHAVIOUR, RUNG, PRACTICE, initial, newItem, normalize, validate, summary, prompt, init, promptMarkup };
  global.TherapyCbtPractice = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-cbt-app]").forEach(root => init(root, root.dataset.cbtApp));
    document.querySelectorAll("[data-cbt-learn-prompt]").forEach(root => { root.innerHTML = promptMarkup(); bindPrompt(root); });
  });
})(typeof window === "undefined" ? globalThis : window);

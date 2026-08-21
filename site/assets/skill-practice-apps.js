(function () {
  "use strict";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const LINKS = {
    chain: [{ label: "Learn Behaviour Chain Analysis", href: "/learn/wellness/behavior-chain-missing-links.html#behaviour-chain-analysis" }],
    missing: [{ label: "Learn Missing-Links Analysis", href: "/learn/wellness/behavior-chain-missing-links.html#missing-links-analysis" }],
    exposure: [{ label: "Learn Safety Behaviours & Exposure", href: "/learn/cbt-anxiety/safety-behaviours-exposure.html" }],
    dear: [{ label: "Learn DEAR MAN", href: "/learn/interpersonal-effectiveness/dear-man.html" }, { label: "Learn GIVE", href: "/learn/interpersonal-effectiveness/give.html" }, { label: "Learn FAST", href: "/learn/interpersonal-effectiveness/fast.html" }],
    ask: [{ label: "Learn How to Ask & Say No", href: "/learn/interpersonal-effectiveness/saying-no.html" }],
    goals: [{ label: "Values", href: "/skill-finder/values/" }, { label: "Behavioural Activation", href: "/skill-finder/behavioural-activation/" }, { label: "Build Mastery", href: "/learn/emotion-regulation/positive-emotions-mastery-cope-ahead.html#build-mastery" }, { label: "Pleasant Event Planner", href: "/skill-finder/pleasant-event/" }],
    activation: [{ label: "Pleasant Event Planner", href: "/skill-finder/pleasant-event/" }, { label: "Values", href: "/skill-finder/values/" }, { label: "SMART Goal Builder", href: "/skill-finder/goal-builder/" }, { label: "Learn Behavioural Activation", href: "/learn/wellness/behavioral-activation.html" }],
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
  };

  function linksMarkup(links) {
    return `<div class="skill-app-result-links">${links.map((link) => `<a class="skill-app-link-button secondary" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</div>`;
  }

  function initGuidedForm(root, definition) {
    root.innerHTML = `<div class="skill-app-shell"><header class="skill-app-header"><h2>${escapeHtml(definition.title)}</h2><p>${escapeHtml(definition.intro)} Your entries stay on this page.</p></header><form class="skill-app-panel" data-guided-form>${definition.fields.map(([key, label]) => `<label for="practice-${key}">${escapeHtml(label)}</label><textarea id="practice-${key}" name="${escapeHtml(key)}"></textarea>`).join("")}<button type="submit">Build my summary</button></form><section class="skill-app-panel" data-guided-summary aria-live="polite" tabindex="-1"></section><footer class="skill-app-footer"><button type="button" class="secondary" data-clear-form>Clear</button>${linksMarkup(definition.links)}</footer></div>`;
    const form = root.querySelector("[data-guided-form]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(form);
      const summary = root.querySelector("[data-guided-summary]");
      summary.innerHTML = `<h3>Editable planning summary</h3><dl class="skill-app-summary">${definition.fields.map(([key, label]) => `<dt>${escapeHtml(label.split(" — ")[0])}</dt><dd>${escapeHtml(values.get(key) || "Not answered")}</dd>`).join("")}</dl>`;
      summary.focus();
    });
    root.querySelector("[data-clear-form]").addEventListener("click", () => { form.reset(); root.querySelector("[data-guided-summary]").innerHTML = ""; form.querySelector("textarea")?.focus(); });
  }

  function initBehaviourChain(root) {
    const state = { links: [{ type: "actions", detail: "" }] };
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
  }

  function initExposure(root) {
    const state = { steps: [{ situation: "", before: 0, after: "" }] };
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
      root.querySelector("[data-exposure-add]").addEventListener("click", () => { state.steps.push({ situation: "", before: 0, after: "" }); render(true); });
      root.querySelectorAll("[data-exposure-up]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.exposureUp), Number(button.dataset.exposureUp) - 1)));
      root.querySelectorAll("[data-exposure-down]").forEach((button) => button.addEventListener("click", () => swap(Number(button.dataset.exposureDown), Number(button.dataset.exposureDown) + 1)));
      root.querySelectorAll("[data-exposure-remove]").forEach((button) => button.addEventListener("click", () => { state.steps.splice(Number(button.dataset.exposureRemove), 1); render(); }));
    }
    render();
  }

  function start() {
    document.querySelectorAll("[data-practice-app]").forEach((root) => {
      const name = root.dataset.practiceApp;
      if (name === "behaviour-chain") initBehaviourChain(root);
      else if (name === "exposure") initExposure(root);
      else if (FORM_DEFINITIONS[name]) initGuidedForm(root, FORM_DEFINITIONS[name]);
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { FORM_DEFINITIONS };
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", start);
})();

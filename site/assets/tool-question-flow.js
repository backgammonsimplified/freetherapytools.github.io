(function (global) {
  "use strict";

  const stateByRoot = new WeakMap();
  const scheduled = new WeakSet();
  const VERSION = "20260907-question-flow-1";
  const CHATGPT_URL = "https://chatgpt.com/";
  const PROGRESSIVE_EXCLUSIONS = new Set([
    "box-breathing",
    "grounding",
    "stop",
    "thermometer",
    "emotions",
    "change-emotion",
    "worry-tree",
    "missing-links",
    "dime-game",
    "pleasant-event",
    "values",
    "stages-of-change",
    "urge-surfing",
    "pros-and-cons",
    "interpersonal-troubleshooting",
  ]);
  const UTILITY_ANCESTORS = [
    ".values-map-toolbar",
    ".skill-app-inline-fields",
    ".box-breathing-settings",
    ".urge-timer",
    ".pleasant-event-grid",
    ".pleasant-event-list",
    "[data-calendar-fields]",
    "[data-values-review-calendar]",
    "[data-activation-calendar]",
    ".tool-question-flow-toolbar",
    ".tool-question-help",
  ].join(",");

  function toolId(root) {
    return root.dataset.cbtApp
      || root.dataset.practiceApp
      || root.dataset.quickApp
      || root.dataset.skillApp
      || root.dataset.valuesApp
      || root.id?.replace(/-app$/, "")
      || "tool";
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function pageDescription() {
    return cleanText(document.querySelector("#title-block-header .description, #title-block-header .lead")?.textContent || "");
  }

  function wordSet(value) {
    return new Set(cleanText(value).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((word) => word.length > 2));
  }

  function similarity(left, right) {
    const a = wordSet(left);
    const b = wordSet(right);
    if (!a.size || !b.size) return 0;
    let shared = 0;
    a.forEach((word) => { if (b.has(word)) shared += 1; });
    return shared / Math.min(a.size, b.size);
  }

  function simplifyAppHeader(root, shell) {
    const header = shell.querySelector(":scope > .skill-app-header");
    if (!header || header.dataset.toolHeaderSimplified === VERSION) return;
    header.dataset.toolHeaderSimplified = VERSION;

    const heading = header.querySelector(":scope > h2");
    if (heading) heading.classList.add("tool-duplicate-heading");

    const description = pageDescription();
    const context = [];
    header.querySelectorAll(":scope > p").forEach((paragraph) => {
      const text = cleanText(paragraph.textContent);
      paragraph.classList.add("tool-duplicate-subtitle");
      const hasContext = /device|browser|uploaded|upload|privacy|source|handout|worksheet|save a copy/i.test(text);
      if (hasContext && similarity(text, description) < 0.7) context.push(text);
    });

    const meaningfulChildren = [...header.children].filter((element) => {
      if (element === heading || element.matches("p")) return false;
      return !element.hidden;
    });
    header.classList.toggle("tool-header-empty", meaningfulChildren.length === 0);
    header.classList.toggle("tool-header-compact", meaningfulChildren.length > 0);

    if (context.length) {
      const panel = shell.querySelector(":scope > .skill-app-panel, :scope > form.skill-app-panel, :scope > .skill-guided-tree, :scope > .skill-tree-app");
      if (panel && !panel.querySelector(":scope > .tool-header-context")) {
        const details = document.createElement("details");
        details.className = "tool-header-context";
        details.innerHTML = `<summary>About this tool and privacy</summary>${[...new Set(context)].map((text) => `<p>${escapeHtml(text)}</p>`).join("")}`;
        panel.prepend(details);
      }
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function associatedLabel(control, scope) {
    if (control.closest("label")) return control.closest("label");
    if (!control.id) return null;
    try { return scope.querySelector(`label[for="${global.CSS?.escape ? global.CSS.escape(control.id) : control.id}"]`); }
    catch (_error) { return null; }
  }

  function promptLabel(control, scope) {
    const label = associatedLabel(control, scope);
    if (label) return cleanText(label.textContent);
    const aria = control.getAttribute("aria-label");
    if (aria) return cleanText(aria);
    return cleanText(control.getAttribute("placeholder")) || "this reflection question";
  }

  function isProgressControl(control) {
    if (!(control instanceof HTMLElement) || control.disabled || control.closest(UTILITY_ANCESTORS)) return false;
    if (control.matches("textarea")) return true;
    if (control.matches("select")) return true;
    if (!control.matches("input")) return false;
    const type = (control.getAttribute("type") || "text").toLowerCase();
    return ["text", "number"].includes(type);
  }

  function isHelpControl(control) {
    if (control.matches("textarea")) return true;
    if (!control.matches("input")) return false;
    return (control.getAttribute("type") || "text").toLowerCase() === "text";
  }

  function safePairBlock(control, panel) {
    const preset = control.closest(".cbt-field, .thought-record-steps > li, .case-map-field");
    if (preset && panel.contains(preset)) return preset;

    const containingLabel = control.closest("label");
    if (containingLabel && containingLabel !== panel && panel.contains(containingLabel)) {
      const parent = containingLabel.parentElement;
      if (parent && parent.querySelectorAll(":scope > label").length === 1 && parent.querySelectorAll("textarea, input, select").length === 1) return parent;
      return null;
    }

    const label = associatedLabel(control, panel);
    if (!label || label.parentElement !== control.parentElement) return null;
    const nodes = [];
    let current = label;
    for (let count = 0; current && count < 5; count += 1, current = current.nextSibling) {
      nodes.push(current);
      if (current === control) break;
      if (current.nodeType === Node.ELEMENT_NODE && current.matches("h2,h3,h4,button,fieldset,section,details")) return null;
    }
    if (!nodes.includes(control)) return null;

    const wrapper = document.createElement("section");
    wrapper.className = "tool-question-step";
    label.before(wrapper);
    nodes.forEach((node) => wrapper.append(node));
    return wrapper;
  }

  function ensureQuestionClass(block) {
    if (!block) return null;
    block.classList.add("tool-question-step");
    return block;
  }

  function addHelp(control, block, scope) {
    if (!isHelpControl(control) || !block || control.dataset.toolPromptHelp === VERSION) return;
    control.dataset.toolPromptHelp = VERSION;
    const label = promptLabel(control, scope);
    if (!label || /search|filter|date|time|duration|seconds|minutes/i.test(label)) return;

    const prompt = `Help me think through this reflection question: “${label}” Ask me one brief question at a time and help me find my own answer.`;
    const details = document.createElement("details");
    details.className = "tool-question-help";
    details.innerHTML = `<summary>Need help with this question?</summary><p>${escapeHtml(prompt)}</p><div class="tool-question-help-actions"><button type="button" class="secondary" data-tool-copy-prompt>Copy prompt</button><a href="${CHATGPT_URL}" target="_blank" rel="noopener">Open ChatGPT <span class="visually-hidden">(opens in a new tab)</span></a><span role="status" data-tool-prompt-status></span></div>`;
    details.dataset.prompt = prompt;

    const anchor = control.closest("label") === block ? block : control;
    if (anchor === block) block.after(details);
    else anchor.after(details);

    details.querySelector("[data-tool-copy-prompt]")?.addEventListener("click", async () => {
      const status = details.querySelector("[data-tool-prompt-status]");
      try {
        await global.navigator.clipboard.writeText(prompt);
        if (status) status.textContent = "Prompt copied.";
      } catch (_error) {
        details.open = true;
        if (status) status.textContent = "Copy unavailable; select the prompt above.";
      }
    });
  }

  function answersForBlock(block) {
    const answers = [];
    block.querySelectorAll("textarea, input, select").forEach((control) => {
      if (!isProgressControl(control)) return;
      const value = cleanText(control.value);
      if (!value) return;
      answers.push({ label: promptLabel(control, block), value });
    });
    return answers;
  }

  function buildToolbar(root, panel, blocks, state) {
    const toolbar = document.createElement("div");
    toolbar.className = "tool-question-flow-toolbar";
    toolbar.innerHTML = `<div class="tool-question-flow-actions"><strong data-tool-question-count></strong><button type="button" class="secondary" data-tool-question-back>Back</button><button type="button" data-tool-question-next>Next</button><button type="button" class="secondary" data-tool-question-reveal>Reveal all questions</button></div><details class="tool-answer-review"><summary>Review what I have entered</summary><ol data-tool-answer-list></ol></details>`;
    panel.prepend(toolbar);

    const update = (focus = false) => {
      state.index = Math.max(0, Math.min(state.index, blocks.length - 1));
      root.classList.toggle("tool-question-flow-all", state.revealAll);
      blocks.forEach((block, index) => { block.hidden = !state.revealAll && index !== state.index; });

      toolbar.querySelector("[data-tool-question-count]").textContent = state.revealAll ? `${blocks.length} questions` : `Question ${state.index + 1} of ${blocks.length}`;
      const back = toolbar.querySelector("[data-tool-question-back]");
      const next = toolbar.querySelector("[data-tool-question-next]");
      back.hidden = state.revealAll;
      next.hidden = state.revealAll;
      back.disabled = state.index === 0;
      next.disabled = state.index === blocks.length - 1;
      toolbar.querySelector("[data-tool-question-reveal]").textContent = state.revealAll ? "Show one question at a time" : "Reveal all questions";

      const review = toolbar.querySelector("[data-tool-answer-list]");
      const items = blocks.map((block, index) => {
        const answers = answersForBlock(block);
        if (!answers.length) return "";
        const label = answers[0].label || `Question ${index + 1}`;
        const snippet = answers.map((item) => item.value).join(" · ").slice(0, 160);
        return `<li><button type="button" data-tool-review-index="${index}">${escapeHtml(label)}<small>${escapeHtml(snippet)}</small></button></li>`;
      }).filter(Boolean).join("");
      review.innerHTML = items || "<li>No answers entered yet.</li>";
      review.querySelectorAll("[data-tool-review-index]").forEach((button) => button.addEventListener("click", () => {
        state.revealAll = false;
        state.index = Number(button.dataset.toolReviewIndex);
        update(true);
      }));

      if (focus && !state.revealAll) {
        const target = blocks[state.index].querySelector("textarea, input, select, button");
        target?.focus({ preventScroll: true });
        blocks[state.index].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    toolbar.querySelector("[data-tool-question-back]").addEventListener("click", () => { state.index -= 1; update(true); });
    toolbar.querySelector("[data-tool-question-next]").addEventListener("click", () => { state.index += 1; update(true); });
    toolbar.querySelector("[data-tool-question-reveal]").addEventListener("click", () => { state.revealAll = !state.revealAll; update(false); });
    panel.addEventListener("input", () => update(false));
    panel.addEventListener("change", () => update(false));
    update(false);
  }

  function enhanceQuestions(root, shell) {
    const panel = shell.querySelector(":scope > .skill-app-panel, :scope > form.skill-app-panel");
    if (!panel) return;

    const controls = [...panel.querySelectorAll("textarea, input, select")].filter(isProgressControl);
    const blocks = [];
    const seen = new Set();

    controls.forEach((control) => {
      let block = safePairBlock(control, panel);
      block = ensureQuestionClass(block);
      if (!block) return;
      addHelp(control, block, panel);
      if (!seen.has(block)) {
        seen.add(block);
        blocks.push(block);
      }
    });

    const id = toolId(root);
    if (blocks.length < 3 || PROGRESSIVE_EXCLUSIONS.has(id) || shell.querySelector(".skill-guided-tree, .skill-tree-app, .grounding-guide, .values-action-bar-toggle")) return;

    const state = stateByRoot.get(root) || { index: 0, revealAll: false };
    stateByRoot.set(root, state);
    buildToolbar(root, panel, blocks, state);
  }

  function enhanceRoot(root) {
    const shell = root.querySelector(":scope > .skill-app-shell");
    if (!shell || shell.dataset.toolQuestionFlowVersion === VERSION) return;
    shell.dataset.toolQuestionFlowVersion = VERSION;
    simplifyAppHeader(root, shell);
    enhanceQuestions(root, shell);
  }

  function schedule(root) {
    if (scheduled.has(root)) return;
    scheduled.add(root);
    global.requestAnimationFrame(() => {
      scheduled.delete(root);
      enhanceRoot(root);
    });
  }

  function start() {
    const roots = [...document.querySelectorAll(".skill-app")];
    roots.forEach((root) => {
      schedule(root);
      const observer = new MutationObserver(() => schedule(root));
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);

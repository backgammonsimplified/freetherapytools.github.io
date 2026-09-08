(function (global) {
  "use strict";

  const VERSION = "20260907-progressive-reveal-4";
  const CHATGPT_URL = "https://chatgpt.com/";
  const stateByRoot = new WeakMap();
  const scheduled = new WeakSet();

  // Purpose-built tools keep their existing interaction. This layer only
  // removes their repeated app-level heading/intro; it does not restructure
  // their controls.
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
    "exposure",
    "safety-behaviours",
    "behaviour-chain",
    "gratitude-journal"
  ]);

  // Shared infrastructure is outside the progressive-question contract. In
  // particular, never wrap, hide, or otherwise mutate the progress/save UI.
  const UTILITY_ANCESTORS = [
    "[data-skill-progress-final]",
    ".skill-progress-persistent",
    ".skill-progress-title-row",
    ".skill-progress-content",
    ".values-map-toolbar",
    ".skill-app-inline-fields",
    ".box-breathing-settings",
    ".urge-timer",
    ".pleasant-event-grid",
    ".pleasant-event-list",
    "[data-calendar-fields]",
    "[data-values-review-calendar]",
    "[data-activation-calendar]",
    ".tool-question-help",
    ".tool-progressive-controls"
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

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Quarto already supplies the public H1 and description. Remove only the
  // duplicated app heading/intro. Never hide the whole header: the progress
  // component may put a live control there later.
  function simplifyAppHeader(shell) {
    const header = shell.querySelector(":scope > .skill-app-header");
    if (!header || header.dataset.toolHeaderSimplified === VERSION) return;
    header.dataset.toolHeaderSimplified = VERSION;

    const directHeading = header.querySelector(":scope > h2");
    const progressHeading = header.querySelector(":scope > .skill-progress-title-row > h2");
    (directHeading || progressHeading)?.remove();

    const intro = header.querySelector(":scope > p");
    intro?.remove();

    header.querySelectorAll(":scope > .skill-progress-title-row").forEach((row) => {
      if (!row.children.length) row.remove();
    });

    if (!header.children.length && !cleanText(header.textContent)) header.remove();
    else header.classList.add("tool-header-functional-only");
  }

  function prepareAvoidance(root) {
    if (toolId(root) !== "avoidance") return true;
    root.classList.add("tool-single-example");

    const add = root.querySelector('[data-cbt-action="add"]');
    const items = [...root.querySelectorAll(".cbt-item")];
    if (!items.length && add && add.dataset.autoCreated !== VERSION) {
      add.dataset.autoCreated = VERSION;
      add.click();
      return false;
    }

    const currentItems = [...root.querySelectorAll(".cbt-item")];
    currentItems.forEach((item, index) => {
      item.open = true;
      item.classList.toggle("tool-avoidance-primary", index === 0);
      item.classList.toggle("tool-avoidance-extra", index > 0);
      item.hidden = index > 0;
      const summary = item.querySelector(":scope > summary");
      if (summary) summary.hidden = true;
    });

    // The public planner is deliberately one worked example. Additional items
    // from older saves remain in state for backward compatibility but are not
    // exposed as another-situation or practice-entry UI.
    root.querySelectorAll('[data-cbt-action="add"], [data-cbt-action="practice"], [data-cbt-action="remove"]').forEach((button) => {
      button.hidden = true;
    });

    const primary = root.querySelector(".tool-avoidance-primary");
    if (primary) {
      primary.querySelectorAll(":scope > h3").forEach((heading) => {
        if (/practice history/i.test(cleanText(heading.textContent))) {
          heading.hidden = true;
          if (heading.nextElementSibling?.matches("p")) heading.nextElementSibling.hidden = true;
        }
      });
      primary.querySelectorAll(":scope > .cbt-practice").forEach((entry) => { entry.hidden = true; });
      const itemActions = primary.querySelector(":scope > .skill-app-actions");
      if (itemActions) itemActions.hidden = true;
    }
    return true;
  }

  function associatedLabel(control, scope) {
    const wrapping = control.closest("label");
    if (wrapping && scope.contains(wrapping)) return wrapping;
    if (!control.id) return null;
    try {
      const escaped = global.CSS?.escape ? global.CSS.escape(control.id) : control.id;
      return scope.querySelector(`label[for="${escaped}"]`);
    } catch (_error) {
      return null;
    }
  }

  function promptLabel(control, scope) {
    const label = associatedLabel(control, scope);
    if (label) return cleanText(label.textContent);
    return cleanText(control.getAttribute("aria-label") || control.getAttribute("placeholder")) || "this reflection question";
  }

  function isProgressControl(control) {
    if (!(control instanceof HTMLElement) || control.disabled || control.closest(UTILITY_ANCESTORS)) return false;
    if (control.matches("textarea, select")) return true;
    if (!control.matches("input")) return false;
    return ["text", "number"].includes((control.getAttribute("type") || "text").toLowerCase());
  }

  function isPromptHelpControl(control) {
    if (control.matches("textarea")) return true;
    return control.matches('input[type="text"], input:not([type])');
  }

  function safeQuestionBlock(control, panel) {
    const existing = control.closest(".tool-question-step");
    if (existing && panel.contains(existing)) return existing;

    const preset = control.closest(".cbt-field, .case-map-field, .five-factor-card, .thought-record-steps > li");
    if (preset && panel.contains(preset)) return preset;

    const wrappingLabel = control.closest("label");
    if (wrappingLabel && wrappingLabel !== panel && panel.contains(wrappingLabel)) return wrappingLabel;

    const label = associatedLabel(control, panel);
    if (!label || label.parentElement !== control.parentElement) return null;

    const nodes = [label];
    let cursor = label.nextSibling;
    while (cursor && cursor !== control) {
      if (cursor.nodeType === Node.ELEMENT_NODE && cursor.matches("h2,h3,h4,button,fieldset,section,details,label")) return null;
      nodes.push(cursor);
      cursor = cursor.nextSibling;
    }
    if (cursor !== control) return null;
    nodes.push(control);

    // A lightweight wrapper is only used when the original tool has no natural
    // field wrapper. It stays inside the original panel and contains only the
    // existing label/help/control nodes; no tool state or progress DOM moves.
    const wrapper = document.createElement("div");
    wrapper.className = "tool-question-step";
    label.before(wrapper);
    nodes.forEach((node) => wrapper.append(node));
    return wrapper;
  }

  function addPromptHelp(control, block, scope) {
    if (!isPromptHelpControl(control) || block.querySelector(":scope > .tool-question-help")) return;
    const label = promptLabel(control, scope);
    if (!label || /search|filter|date|time|duration|seconds|minutes/i.test(label)) return;

    const prompt = `Help me think through this question: “${label}” Ask me one short question at a time and help me find my own answer.`;
    const details = document.createElement("details");
    details.className = "tool-question-help";
    details.innerHTML = `<summary>Need help with this question?</summary><p>${escapeHtml(prompt)}</p><div><button type="button" class="secondary" data-tool-copy-prompt>Copy prompt</button> <a href="${CHATGPT_URL}" target="_blank" rel="noopener">Open ChatGPT<span class="visually-hidden"> (opens in a new tab)</span></a> <span role="status" data-tool-prompt-status></span></div>`;
    block.append(details);

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

  function blockControls(block) {
    return [...block.querySelectorAll("textarea, input, select")].filter(isProgressControl);
  }

  function blockAnswered(block) {
    return blockControls(block).some((control) => cleanText(control.value));
  }

  function collectQuestionBlocks(panel) {
    const blocks = [];
    const seen = new Set();
    [...panel.querySelectorAll("textarea, input, select")].filter(isProgressControl).forEach((control) => {
      const block = safeQuestionBlock(control, panel);
      if (!block || seen.has(block)) return;
      seen.add(block);
      block.classList.add("tool-question-step");
      addPromptHelp(control, block, panel);
      blocks.push(block);
    });
    return blocks;
  }

  function enhanceQuestions(root, shell) {
    const id = toolId(root);
    if (PROGRESSIVE_EXCLUSIONS.has(id)) return;
    const panel = shell.querySelector(":scope > .skill-app-panel, :scope > form.skill-app-panel");
    if (!panel) return;

    const blocks = collectQuestionBlocks(panel);
    if (blocks.length < 2) return;

    root.classList.add("tool-progressive-enabled");

    const savedMax = blocks.reduce((max, block, index) => blockAnswered(block) ? index : max, -1);
    const previous = stateByRoot.get(root);
    const state = previous || { revealed: Math.min(blocks.length, Math.max(1, savedMax + 2)), showAll: false, timers: new WeakMap() };
    state.revealed = Math.max(state.revealed, Math.min(blocks.length, savedMax + 2));
    stateByRoot.set(root, state);

    let controls = panel.querySelector(":scope > .tool-progressive-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "tool-progressive-controls";
      controls.innerHTML = '<button type="button" class="secondary" data-tool-show-all>Show all questions</button>';
      blocks[0].before(controls);
    }

    const apply = (animateIndex = -1) => {
      blocks.forEach((block, index) => {
        const visible = state.showAll || index < state.revealed;
        block.classList.toggle("is-concealed", !visible);
        block.classList.toggle("is-revealed", visible);
        block.classList.toggle("is-answered", visible && blockAnswered(block));
        block.classList.toggle("is-current", visible && !state.showAll && index === state.revealed - 1);
        block.setAttribute("aria-hidden", visible ? "false" : "true");
        if (visible && index === animateIndex) {
          block.classList.remove("is-entering");
          void block.offsetWidth;
          block.classList.add("is-entering");
          global.setTimeout(() => block.classList.remove("is-entering"), 700);
        }
      });
      const toggle = controls.querySelector("[data-tool-show-all]");
      if (toggle) toggle.textContent = state.showAll ? "Return to progressive questions" : "Show all questions";
    };

    const revealAfter = (block) => {
      const index = blocks.indexOf(block);
      if (index < 0 || state.showAll || index >= blocks.length - 1 || index + 1 < state.revealed || !blockAnswered(block)) {
        apply();
        return;
      }
      const existing = state.timers.get(block);
      if (existing) global.clearTimeout(existing);
      const timer = global.setTimeout(() => {
        if (!blockAnswered(block)) return;
        state.revealed = Math.max(state.revealed, index + 2);
        apply(index + 1);
        blocks[index + 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 600);
      state.timers.set(block, timer);
      apply();
    };

    panel.addEventListener("input", (event) => {
      const block = event.target.closest(".tool-question-step");
      if (block) revealAfter(block);
    });
    panel.addEventListener("change", (event) => {
      const block = event.target.closest(".tool-question-step");
      if (block) revealAfter(block);
    });
    controls.querySelector("[data-tool-show-all]")?.addEventListener("click", () => {
      state.showAll = !state.showAll;
      apply();
    });

    apply();
  }

  function enhanceRoot(root) {
    if (!prepareAvoidance(root)) return;
    const shell = root.querySelector(":scope > .skill-app-shell");
    if (!shell || shell.dataset.toolProgressiveVersion === VERSION) return;
    shell.dataset.toolProgressiveVersion = VERSION;
    simplifyAppHeader(shell);
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
    document.querySelectorAll(".skill-app").forEach((root) => {
      schedule(root);
      const observer = new MutationObserver(() => schedule(root));
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);

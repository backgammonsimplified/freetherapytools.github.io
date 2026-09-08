(function () {
  "use strict";

  const STORAGE_KEY = "free-therapy-tools:window-of-tolerance:v1";
  const root = document.querySelector("[data-window-of-tolerance-app]");
  if (!root) return;

  const ratingOrder = { high: 3, medium: 2, low: 1 };
  const ratingLabel = { high: "High", medium: "Medium", low: "Low" };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const makeRow = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: "", rating: "medium" });

  function blankState() {
    return { narrow: [makeRow()], widen: [makeRow()] };
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows)) return [makeRow()];
    const normalized = rows.slice(0, 30).map((row) => ({
      id: typeof row?.id === "string" ? row.id : makeRow().id,
      text: typeof row?.text === "string" ? row.text.slice(0, 240) : "",
      rating: ["low", "medium", "high"].includes(row?.rating) ? row.rating : "medium",
    }));
    return normalized.length ? normalized : [makeRow()];
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return blankState();
      return { narrow: normalizeRows(saved.narrow), widen: normalizeRows(saved.widen) };
    } catch (_error) {
      return blankState();
    }
  }

  let state = loadState();
  let saveTimer = null;

  function saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const status = root.querySelector("[data-wot-save-status]");
      if (status) status.textContent = "Saved in this browser";
    } catch (_error) {
      const status = root.querySelector("[data-wot-save-status]");
      if (status) status.textContent = "Browser saving is unavailable";
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    const status = root.querySelector("[data-wot-save-status]");
    if (status) status.textContent = "Saving…";
    saveTimer = window.setTimeout(saveNow, 250);
  }

  function ratingOptions(selected) {
    return ["high", "medium", "low"].map((value) =>
      `<option value="${value}"${selected === value ? " selected" : ""}>${ratingLabel[value]}</option>`
    ).join("");
  }

  function rowMarkup(kind, row, index) {
    const isNarrow = kind === "narrow";
    const prompt = isNarrow ? "What tends to narrow my window?" : "What helps widen my window?";
    const rating = isNarrow ? "Impact" : "How much it helps";
    return `<div class="wot-row" data-wot-row data-kind="${kind}" data-index="${index}">
      <label class="visually-hidden" for="wot-${kind}-${escapeHtml(row.id)}">${prompt}</label>
      <input id="wot-${kind}-${escapeHtml(row.id)}" type="text" maxlength="240" value="${escapeHtml(row.text)}" data-wot-text placeholder="${isNarrow ? "e.g., poor sleep, conflict, a stressful conversation" : "e.g., food, water, rest, movement, music, supportive connection"}">
      <label class="wot-rating-label" for="wot-${kind}-rating-${escapeHtml(row.id)}">${rating}</label>
      <select id="wot-${kind}-rating-${escapeHtml(row.id)}" data-wot-rating>${ratingOptions(row.rating)}</select>
      <button type="button" class="secondary wot-remove" data-wot-remove aria-label="Remove this item">Remove</button>
    </div>`;
  }

  function panelMarkup(kind) {
    const isNarrow = kind === "narrow";
    const rows = state[kind].map((row, index) => rowMarkup(kind, row, index)).join("");
    return `<section class="skill-app-panel wot-panel wot-panel--${kind}">
      <header>
        <p class="wot-kicker">${isNarrow ? "Notice vulnerabilities and stressors" : "Build your regulation plan"}</p>
        <h3>${isNarrow ? "What narrows my window" : "What widens my window"}</h3>
        <p>${isNarrow ? "List situations, conditions, or patterns that leave you with less room before you become overwhelmed or shut down." : "List actions, supports, routines, or conditions that help you feel steadier or give you more room to cope."}</p>
      </header>
      <div class="wot-rows" data-wot-rows="${kind}">${rows}</div>
      <button type="button" class="secondary" data-wot-add="${kind}">+ Add another</button>
    </section>`;
  }

  function activeRows(kind) {
    return state[kind]
      .filter((row) => row.text.trim())
      .sort((a, b) => ratingOrder[b.rating] - ratingOrder[a.rating] || a.text.localeCompare(b.text));
  }

  function summaryList(rows, emptyText) {
    if (!rows.length) return `<p class="wot-empty">${escapeHtml(emptyText)}</p>`;
    return `<ol>${rows.map((row) => `<li><span>${escapeHtml(row.text.trim())}</span><strong class="wot-rating-badge" data-rating="${row.rating}">${ratingLabel[row.rating]}</strong></li>`).join("")}</ol>`;
  }

  function updatePlan() {
    const plan = root.querySelector("[data-wot-plan]");
    if (!plan) return;
    const narrow = activeRows("narrow");
    const widen = activeRows("widen");
    plan.innerHTML = `<div class="wot-plan-grid">
      <section><h4>Protect against or plan around</h4><p>When possible, reduce high-impact stressors or add extra support around them.</p>${summaryList(narrow, "Add a narrowing factor above to build this list.")}</section>
      <section><h4>Try first when my fuse feels short</h4><p>Start with the things you rated as most helpful, then adjust based on what you need that day.</p>${summaryList(widen, "Add something that widens your window above to build this list.")}</section>
    </div>`;
  }

  function renderPrintSheet() {
    const sheet = root.querySelector("[data-wot-print-sheet]");
    if (!sheet) return;
    const narrow = activeRows("narrow");
    const widen = activeRows("widen");
    sheet.innerHTML = `<h1>My Window of Tolerance Plan</h1>
      <p class="wot-print-intro">When my window is narrower, my fuse may feel shorter and it can be harder to respond instead of react. This page records what tends to narrow my window and what can help widen it or help me return.</p>
      <section><h2>What tends to narrow my window</h2>${summaryList(narrow, "No items entered.")}</section>
      <section><h2>What helps widen my window</h2>${summaryList(widen, "No items entered.")}</section>
      <section><h2>When I notice my window getting narrow</h2><p>Reduce or plan around the highest-impact stressors where possible. Start with the high-effectiveness supports above, then use what fits the situation and what my nervous system needs that day.</p></section>`;
  }

  function bindRows(scope = root) {
    scope.querySelectorAll("[data-wot-row]").forEach((rowElement) => {
      const kind = rowElement.dataset.kind;
      const index = Number(rowElement.dataset.index);
      const text = rowElement.querySelector("[data-wot-text]");
      const rating = rowElement.querySelector("[data-wot-rating]");
      const remove = rowElement.querySelector("[data-wot-remove]");

      text?.addEventListener("input", () => {
        state[kind][index].text = text.value;
        updatePlan();
        scheduleSave();
      });
      rating?.addEventListener("change", () => {
        state[kind][index].rating = rating.value;
        updatePlan();
        scheduleSave();
      });
      remove?.addEventListener("click", () => {
        state[kind].splice(index, 1);
        if (!state[kind].length) state[kind].push(makeRow());
        renderRows(kind);
        updatePlan();
        scheduleSave();
      });
    });
  }

  function renderRows(kind) {
    const host = root.querySelector(`[data-wot-rows="${kind}"]`);
    if (!host) return;
    host.innerHTML = state[kind].map((row, index) => rowMarkup(kind, row, index)).join("");
    bindRows(host);
  }

  function render() {
    root.innerHTML = `<div class="skill-app-shell wot-shell">
      <header class="skill-app-header">
        <h2>Window of Tolerance Tool</h2>
        <p>Make a personal list of what tends to narrow your window and what helps widen it. Rate each item so the printed plan shows what to watch most closely and what to try first.</p>
        <p class="skill-app-note">Examples are prompts only. The same factor can help or strain you depending on balance, context, and the day.</p>
      </header>
      <div class="wot-grid">${panelMarkup("narrow")}${panelMarkup("widen")}</div>
      <section class="skill-app-panel wot-plan-panel">
        <h3>My quick plan</h3>
        <p>This summary automatically puts High-rated items first.</p>
        <div data-wot-plan></div>
      </section>
      <footer class="skill-app-footer wot-footer">
        <div class="skill-app-actions">
          <button type="button" data-wot-print>Print / Save as PDF</button>
          <button type="button" class="secondary" data-wot-clear>Clear all</button>
        </div>
        <p><span data-wot-save-status>Saved in this browser</span>. Nothing you type here is uploaded by this tool.</p>
      </footer>
      <section class="wot-print-sheet" data-wot-print-sheet aria-hidden="true"></section>
    </div>`;

    bindRows(root);
    updatePlan();

    root.querySelectorAll("[data-wot-add]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.wotAdd;
      if (state[kind].length >= 30) return;
      state[kind].push(makeRow());
      renderRows(kind);
      root.querySelector(`[data-wot-rows="${kind}"] .wot-row:last-child [data-wot-text]`)?.focus();
      scheduleSave();
    }));

    root.querySelector("[data-wot-print]")?.addEventListener("click", () => {
      renderPrintSheet();
      window.print();
    });

    root.querySelector("[data-wot-clear]")?.addEventListener("click", () => {
      if (!window.confirm("Clear everything in this Window of Tolerance plan?")) return;
      state = blankState();
      try { localStorage.removeItem(STORAGE_KEY); } catch (_error) { /* Tool still works without storage. */ }
      render();
    });

    saveNow();
  }

  window.addEventListener("beforeprint", renderPrintSheet);
  render();
}());

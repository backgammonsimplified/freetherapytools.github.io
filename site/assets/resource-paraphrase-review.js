(function (global) {
  "use strict";

  const ROOT_ID = "resource-paraphrase-review-app";
  const STORAGE_KEY = "therapy-skill-kit.resource-paraphrase-review.v1";
  let corpus = null;
  let records = [];
  let filtered = [];
  let selectedId = null;
  let changes = {};
  let ui = {};

  function el(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function changedRecord(record) {
    const result = clone(record);
    const patch = changes[record.resource_id]?.changes || {};
    ["title", "blocks", "fields", "guidance", "status"].forEach((key) => { if (key in patch) result[key] = clone(patch[key]); });
    if ("review_notes" in patch) result.review.notes = patch.review_notes;
    return result;
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ corpus_version: corpus.corpus_version, changes })); } catch (_error) { /* export remains available */ }
  }

  function loadLocal() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (state?.corpus_version === corpus.corpus_version && state.changes && typeof state.changes === "object") changes = state.changes;
    } catch (_error) { changes = {}; }
  }

  function setChange(record, key, value) {
    const entry = changes[record.resource_id] || { resource_id: record.resource_id, expected_source_hash: record.source.source_hash, changes: {} };
    entry.changes[key] = clone(value);
    changes[record.resource_id] = entry;
    saveLocal();
    renderCounts();
  }

  function select(label, values, current) {
    const control = el("select", { attrs: { "aria-label": label } });
    values.forEach(([value, text]) => {
      const option = el("option", { text, attrs: { value } });
      option.selected = value === current;
      control.append(option);
    });
    return control;
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { attrs: { href: url, download: filename } });
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderCounts() {
    if (!ui.counts) return;
    const view = records.map(changedRecord);
    const count = (predicate) => view.filter(predicate).length;
    const values = [
      ["Total", records.length], ["Draft", count((r) => r.status === "draft")],
      ["Review needed", count((r) => r.status === "review-needed")], ["Approved", count((r) => ["approved", "published"].includes(r.status))],
      ["Interactive", count((r) => r.has_input)], ["Informational", count((r) => !r.has_input)],
      ["Edited locally", Object.keys(changes).length],
    ];
    ui.counts.replaceChildren(...values.map(([label, value]) => el("span", { className: "bs-review-count", text: `${label}: ${value}` })));
  }

  function filterRecords() {
    const query = ui.search.value.trim().toLowerCase();
    filtered = records.filter((base) => {
      const record = changedRecord(base);
      if (query && !`${record.resource_id} ${record.title} ${record.section}`.toLowerCase().includes(query)) return false;
      if (ui.section.value && record.section !== ui.section.value) return false;
      if (ui.classification.value && record.classification !== ui.classification.value) return false;
      if (ui.status.value && record.status !== ui.status.value) return false;
      if (ui.priority.value === "interactive" && !record.has_input) return false;
      if (ui.priority.value === "tool" && !record.specialized_tool) return false;
      if (ui.priority.value === "uncertain" && !record.review.source_uncertain) return false;
      return true;
    });
    if (ui.priority.value === "interactive") filtered.sort((a, b) => Number(b.has_input) - Number(a.has_input) || a.resource_id.localeCompare(b.resource_id));
    else if (ui.priority.value === "tool") filtered.sort((a, b) => Number(Boolean(b.specialized_tool)) - Number(Boolean(a.specialized_tool)) || a.resource_id.localeCompare(b.resource_id));
    else if (ui.priority.value === "uncertain") filtered.sort((a, b) => Number(b.review.source_uncertain) - Number(a.review.source_uncertain) || a.resource_id.localeCompare(b.resource_id));
    else filtered.sort((a, b) => a.resource_id.localeCompare(b.resource_id));
    if (!filtered.some((record) => record.resource_id === selectedId)) selectedId = filtered[0]?.resource_id || null;
    renderList(); renderDetail();
  }

  function renderList() {
    ui.list.replaceChildren();
    filtered.forEach((base) => {
      const record = changedRecord(base);
      const button = el("button", { type: "button", attrs: { "aria-current": String(record.resource_id === selectedId) } });
      button.append(el("strong", { text: record.title }), el("br"), el("small", { text: `${record.resource_id} · ${record.status} · ${record.classification}` }));
      button.addEventListener("click", () => { selectedId = record.resource_id; renderList(); renderDetail(); });
      ui.list.append(button);
    });
    if (!filtered.length) ui.list.append(el("p", { text: "No records match these filters." }));
  }

  function labeled(labelText, control) {
    const label = el("label", { text: labelText });
    label.append(control);
    return label;
  }

  function blockEditor(record, editor) {
    editor.append(el("h3", { text: "Paraphrased blocks" }));
    record.blocks.forEach((block, index) => {
      const area = el("textarea", { attrs: { "aria-label": `Block ${index + 1} (${block.type})` } });
      area.value = block.text;
      area.addEventListener("input", () => {
        const next = clone(changedRecord(records.find((item) => item.resource_id === record.resource_id)).blocks);
        next[index].text = area.value;
        setChange(record, "blocks", next);
      });
      editor.append(labeled(`Block ${index + 1} · ${block.type}`, area));
    });
  }

  function fieldEditor(record, editor) {
    editor.append(el("h3", { text: "Interactive-field draft" }));
    if (!record.fields.length) { editor.append(el("p", { text: "No interactive fields are classified for this resource." })); return; }
    record.fields.forEach((field, index) => {
      const heading = el("h4", { text: `${index + 1}. ${field.id}` });
      const label = el("textarea", { attrs: { "aria-label": `${field.id} label` } }); label.value = field.label;
      const help = el("textarea", { attrs: { "aria-label": `${field.id} help text` } }); help.value = field.help || "";
      const type = select(`${field.id} type`, ["text", "textarea", "checkbox", "multi-select", "yes-no", "single-choice", "rating-scale", "numeric-rating", "table", "repeating-rows", "date", "time", "planning", "reflection", "other"].map((value) => [value, value]), field.type);
      const update = () => {
        const next = clone(changedRecord(records.find((item) => item.resource_id === record.resource_id)).fields);
        next[index].label = label.value; next[index].help = help.value; next[index].type = type.value;
        setChange(record, "fields", next);
      };
      label.addEventListener("input", update); help.addEventListener("input", update); type.addEventListener("change", update);
      editor.append(heading, labeled("Prompt / label", label), labeled("Help text", help), labeled("Control type", type));
    });
  }

  function guidanceEditor(record, editor) {
    editor.append(el("h3", { text: "LLM prompt draft" }));
    if (!record.guidance.enabled) { editor.append(el("p", { text: "No guided-reflection prompt is generated for an informational page." })); return; }
    const purpose = el("textarea"); purpose.value = record.guidance.purpose;
    purpose.addEventListener("input", () => { const next = clone(changedRecord(records.find((item) => item.resource_id === record.resource_id)).guidance); next.purpose = purpose.value; setChange(record, "guidance", next); renderPromptPreview(record); });
    editor.append(labeled("Prompt purpose", purpose));
    record.guidance.questions.forEach((question, index) => {
      const prompt = el("textarea"); prompt.value = question.prompt;
      const probes = el("textarea"); probes.value = (question.probes || []).join("\n");
      const update = () => { const next = clone(changedRecord(records.find((item) => item.resource_id === record.resource_id)).guidance); next.questions[index].prompt = prompt.value; next.questions[index].probes = probes.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean); setChange(record, "guidance", next); renderPromptPreview(record); };
      prompt.addEventListener("input", update); probes.addEventListener("input", update);
      editor.append(labeled(`Question ${index + 1}`, prompt), labeled("Optional probes (one per line)", probes));
    });
  }

  function renderPromptPreview(baseRecord) {
    if (!ui.promptPreview || baseRecord.resource_id !== selectedId) return;
    const record = changedRecord(baseRecord);
    ui.promptPreview.textContent = record.guidance.enabled ? global.TherapyResourceParaphrases.promptText(corpus.base_guidance, record) : "No prompt for this informational page.";
  }

  function interactivePreview(record, panel) {
    panel.append(el("h3", { text: "Interactive field preview" }));
    if (!record.fields.length) { panel.append(el("p", { text: "No fields." })); return; }
    const preview = el("div", { className: "bs-worksheet-shell" });
    record.fields.forEach((field) => preview.append(global.TherapyResourceParaphrases.renderField(field)));
    panel.append(preview);
  }

  function renderDetail() {
    ui.detail.replaceChildren();
    const base = records.find((record) => record.resource_id === selectedId);
    if (!base) return;
    const record = changedRecord(base);
    const header = el("div");
    header.append(el("h2", { text: record.title }), el("p", { className: "bs-review-meta", text: `${record.resource_id} · ${record.section} · source ${record.source.source_document} page ${record.source.source_page} · ${record.lesson_route}` }));
    if (record.qa.flags.length) header.append(el("p", { className: "bs-review-flag", text: `QA flags: ${record.qa.flags.join(", ")}` }));
    const actions = el("div", { className: "bs-review-actions" });
    const approve = el("button", { type: "button", className: "btn btn-success", text: "Approve" });
    const needs = el("button", { type: "button", className: "btn btn-warning", text: "Needs changes" });
    const previous = el("button", { type: "button", className: "btn btn-outline-secondary", text: "Previous" });
    const next = el("button", { type: "button", className: "btn btn-outline-secondary", text: "Next" });
    approve.addEventListener("click", () => { setChange(base, "status", "approved"); renderList(); renderDetail(); });
    needs.addEventListener("click", () => { setChange(base, "status", "review-needed"); renderList(); renderDetail(); });
    previous.addEventListener("click", () => navigate(-1)); next.addEventListener("click", () => navigate(1));
    actions.append(approve, needs, previous, next);
    header.append(actions);
    const comparison = el("div", { className: "bs-review-comparison" });
    const source = el("section", { className: "bs-review-panel" });
    source.append(el("h3", { text: "Source / extracted text" }), el("a", { text: "Open actual lesson", attrs: { href: `${record.lesson_route}?review=1#resource-${record.resource_id}` } }), el("img", { attrs: { src: record.source.printable_asset, alt: `Printable source for ${record.title}`, loading: "lazy" } }), el("pre", { className: "bs-review-source-text", text: record.source.original_text || "Source extraction unavailable; inspect image." }));
    const draft = el("section", { className: "bs-review-panel bs-review-editor" });
    const title = el("input", { type: "text" }); title.value = record.title;
    title.addEventListener("input", () => setChange(base, "title", title.value));
    const status = select("Review status", [["draft", "Draft"], ["review-needed", "Review needed"], ["approved", "Approved"], ["published", "Published"]], record.status);
    status.addEventListener("change", () => { setChange(base, "status", status.value); renderCounts(); renderList(); });
    const notes = el("textarea"); notes.value = record.review.notes || ""; notes.addEventListener("input", () => setChange(base, "review_notes", notes.value));
    draft.append(el("h3", { text: "Paraphrase / form editor" }), labeled("Title", title), labeled("Status", status), labeled("Review notes", notes));
    blockEditor(record, draft); fieldEditor(record, draft); guidanceEditor(record, draft);
    comparison.append(source, draft);
    const previews = el("div", { className: "bs-review-comparison" });
    const formPanel = el("section", { className: "bs-review-panel" }); interactivePreview(record, formPanel);
    const promptPanel = el("section", { className: "bs-review-panel" }); promptPanel.append(el("h3", { text: "Guided-reflection prompt preview" }));
    ui.promptPreview = el("pre", { className: "bs-review-source-text" }); promptPanel.append(ui.promptPreview); previews.append(formPanel, promptPanel);
    ui.detail.append(header, comparison, previews); renderPromptPreview(base);
  }

  function navigate(delta) {
    const index = filtered.findIndex((record) => record.resource_id === selectedId);
    const target = filtered[index + delta];
    if (!target) return;
    selectedId = target.resource_id; renderList(); renderDetail(); ui.detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildToolbar(root) {
    const toolbar = el("section", { className: "bs-review-toolbar", attrs: { "aria-label": "Review filters and export" } });
    ui.counts = el("div", { className: "bs-review-counts" });
    ui.search = el("input", { type: "search", attrs: { placeholder: "Search title or resource ID", "aria-label": "Search resources" } });
    const sections = [...new Set(records.map((record) => record.section))].sort();
    ui.section = select("Section", [["", "All sections"], ...sections.map((value) => [value, value])], "");
    ui.classification = select("Classification", [["", "All classifications"], ["informational", "Informational"], ["interactive", "Interactive"], ["mixed", "Mixed"]], "");
    ui.status = select("Status", [["", "All statuses"], ["draft", "Draft"], ["review-needed", "Review needed"], ["approved", "Approved"], ["published", "Published"]], "");
    ui.priority = select("Priority", [["", "Resource ID order"], ["interactive", "Interactive first"], ["tool", "Specialized tools first"], ["uncertain", "Uncertain source first"]], "interactive");
    const filters = el("div", { className: "bs-review-filters" });
    filters.append(labeled("Search", ui.search), labeled("Section", ui.section), labeled("Classification", ui.classification), labeled("Status", ui.status), labeled("Sort / priority", ui.priority));
    [ui.search, ui.section, ui.classification, ui.status, ui.priority].forEach((control) => control.addEventListener("input", filterRecords));
    const actions = el("div", { className: "bs-review-actions" });
    const exportButton = el("button", { type: "button", className: "btn btn-primary", text: "Export review JSON" });
    const clear = el("button", { type: "button", className: "btn btn-outline-secondary", text: "Clear local edits" });
    exportButton.addEventListener("click", () => downloadJson({ schema_version: 1, corpus_version: corpus.corpus_version, changes: Object.values(changes).filter((entry) => Object.keys(entry.changes || {}).length) }, `resource-paraphrase-review-${corpus.corpus_version}.json`));
    clear.addEventListener("click", () => { if (!global.confirm("Clear all locally stored review edits? Export first if you want to keep them.")) return; changes = {}; localStorage.removeItem(STORAGE_KEY); renderCounts(); filterRecords(); });
    actions.append(exportButton, clear, el("span", { className: "bs-review-meta", text: "Shortcuts: Alt+A approve · Alt+N next · Alt+P previous" }));
    toolbar.append(ui.counts, filters, actions); root.append(toolbar);
  }

  async function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    try {
      corpus = await fetch("/data/resource-paraphrases/review.json", { cache: "no-store", credentials: "same-origin" }).then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); });
    } catch (_error) {
      root.replaceChildren(el("div", { className: "callout callout-warning", text: "Draft review data is intentionally absent. Render locally with TSK_RESOURCE_REVIEW=1 to enable this dashboard." }));
      return;
    }
    records = corpus.records || []; loadLocal(); root.replaceChildren(); buildToolbar(root);
    const layout = el("div", { className: "bs-review-layout" }); ui.list = el("nav", { className: "bs-review-list", attrs: { "aria-label": "Resource review queue" } }); ui.detail = el("article", { className: "bs-review-detail" }); layout.append(ui.list, ui.detail); root.append(layout);
    renderCounts(); filterRecords();
    document.addEventListener("keydown", (event) => { if (!event.altKey) return; if (event.key.toLowerCase() === "a") { event.preventDefault(); const base = records.find((record) => record.resource_id === selectedId); if (base) { setChange(base, "status", "approved"); renderList(); renderDetail(); } } else if (event.key.toLowerCase() === "n") { event.preventDefault(); navigate(1); } else if (event.key.toLowerCase() === "p") { event.preventDefault(); navigate(-1); } });
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
})(typeof window === "undefined" ? globalThis : window);

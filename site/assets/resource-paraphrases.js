(function (global) {
  "use strict";

  const INDEX_URL = "/data/resource-paraphrases/index.json";
  const REVIEW_URL = "/data/resource-paraphrases/review.json";
  const REVIEW_PARAM = "review";

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function currentRoute() {
    let path = global.location?.pathname || "/";
    if (path.endsWith("/")) path += "index.html";
    return path;
  }

  function isReviewMode() {
    return new URLSearchParams(global.location?.search || "").get(REVIEW_PARAM) === "1";
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.json();
  }

  async function loadRecords() {
    if (isReviewMode()) {
      try {
        const review = await fetchJson(REVIEW_URL);
        return { records: review.records || [], baseGuidance: review.base_guidance, review: true };
      } catch (_error) {
        // Production intentionally omits review.json; fall through to approved data.
      }
    }
    const index = await fetchJson(INDEX_URL);
    const bundleName = index.routes?.[currentRoute()];
    if (!bundleName) return { records: [], baseGuidance: index.base_guidance || null, review: false };
    const bundle = await fetchJson(`/data/resource-paraphrases/${bundleName}`);
    return { records: bundle.records || [], baseGuidance: index.base_guidance || null, review: false };
  }

  function renderBlocks(record, container) {
    record.blocks.forEach((block) => {
      const tag = block.type === "heading" ? "h4" : block.type === "bullet" ? "li" : block.type === "numbered" ? "li" : block.type === "note" ? "aside" : "p";
      const node = element(tag, { text: block.text, className: block.type === "note" ? "bs-worksheet-help" : "" });
      if (tag === "li") {
        const listClass = block.type === "numbered" ? "bs-paraphrase-numbered" : "bs-paraphrase-bullets";
        let list = container.lastElementChild;
        if (!list?.classList.contains(listClass)) {
          list = element(block.type === "numbered" ? "ol" : "ul", { className: listClass });
          container.append(list);
        }
        list.append(node);
      } else container.append(node);
    });
  }

  function inputHelp(field, wrapper) {
    if (!field.help) return;
    const helpId = `${field.id}-help`;
    wrapper.append(element("p", { className: "bs-worksheet-help", text: field.help, attrs: { id: helpId } }));
    wrapper.querySelectorAll("input, textarea, select").forEach((input) => input.setAttribute("aria-describedby", helpId));
  }

  function renderOptions(field, wrapper, radio = false) {
    const options = element("div", { className: "bs-worksheet-options" });
    (field.choices || []).forEach((choice, index) => {
      const label = element("label", { className: "bs-worksheet-option" });
      const input = element("input", { type: radio ? "radio" : "checkbox", attrs: { name: field.id, value: choice, id: `${field.id}-${index + 1}` } });
      label.append(input, document.createTextNode(choice));
      options.append(label);
    });
    wrapper.append(options);
  }

  function renderTable(field, wrapper) {
    const scroll = element("div", { className: "bs-worksheet-table-wrap", attrs: { tabindex: "0", "aria-label": `${field.label} table` } });
    const table = element("table", { className: "bs-worksheet-table" });
    const head = element("thead");
    const headRow = element("tr");
    (field.columns || ["Item", "My response"]).forEach((column) => headRow.append(element("th", { text: column, attrs: { scope: "col" } })));
    head.append(headRow);
    const body = element("tbody");
    for (let rowIndex = 0; rowIndex < (field.rows || 4); rowIndex += 1) {
      const row = element("tr");
      (field.columns || ["Item", "My response"]).forEach((column, columnIndex) => {
        const cell = element("td", { attrs: { "data-column": column } });
        const id = `${field.id}-r${rowIndex + 1}-c${columnIndex + 1}`;
        const input = element("input", { type: "text", attrs: { id, "data-table-field": field.id, "data-row": rowIndex, "data-column-index": columnIndex, "aria-label": `${column}, row ${rowIndex + 1}` } });
        cell.append(input);
        row.append(cell);
      });
      body.append(row);
    }
    table.append(head, body);
    scroll.append(table);
    wrapper.append(scroll);
  }

  function renderField(field) {
    const choices = ["checkbox", "multi-select", "yes-no", "single-choice"].includes(field.type);
    const wrapper = element(choices ? "fieldset" : "div", { className: "bs-worksheet-field", attrs: { "data-field-id": field.id, "data-field-type": field.type } });
    const label = element(choices ? "legend" : "label", { text: field.label, attrs: choices ? {} : { for: field.id } });
    wrapper.append(label);
    if (field.type === "yes-no" || field.type === "single-choice") renderOptions(field, wrapper, true);
    else if (field.type === "checkbox" || field.type === "multi-select") renderOptions(field, wrapper, false);
    else if (field.type === "rating-scale" || field.type === "numeric-rating") {
      const row = element("div", { className: "bs-rating-row" });
      const min = Number(field.min ?? 0);
      const max = Number(field.max ?? 10);
      const output = element("output", { className: "bs-rating-output", text: "Not set", attrs: { for: field.id, "aria-live": "polite" } });
      const input = element("input", { type: "range", attrs: { id: field.id, min, max, value: min, "data-unset": "true", "aria-label": `${field.label}, ${min} to ${max}` } });
      input.addEventListener("input", () => { input.removeAttribute("data-unset"); output.textContent = input.value; });
      row.append(element("span", { text: String(min) }), input, element("span", { text: String(max) }), output);
      wrapper.append(row);
    } else if (field.type === "table") renderTable(field, wrapper);
    else if (field.type === "repeating-rows") {
      const rows = element("div", { className: "bs-repeating-rows" });
      for (let index = 0; index < (field.rows || 4); index += 1) rows.append(element("input", { type: "text", attrs: { id: `${field.id}-${index + 1}`, "data-repeat-field": field.id, "aria-label": `${field.label}, item ${index + 1}` } }));
      wrapper.append(rows);
    } else if (["reflection", "textarea", "planning", "other"].includes(field.type)) wrapper.append(element("textarea", { attrs: { id: field.id } }));
    else wrapper.append(element("input", { type: field.type === "date" || field.type === "time" ? field.type : field.type === "numeric-rating" ? "number" : "text", attrs: { id: field.id } }));
    inputHelp(field, wrapper);
    return wrapper;
  }

  function fieldValue(root, field) {
    const wrapper = root.querySelector(`[data-field-id="${CSS.escape(field.id)}"]`);
    if (!wrapper) return "";
    if (["checkbox", "multi-select"].includes(field.type)) return [...wrapper.querySelectorAll("input:checked")].map((input) => input.value);
    if (["yes-no", "single-choice"].includes(field.type)) return wrapper.querySelector("input:checked")?.value || "";
    if (["rating-scale", "numeric-rating"].includes(field.type)) {
      const input = wrapper.querySelector("input");
      return input?.hasAttribute("data-unset") ? "" : input?.value || "";
    }
    if (field.type === "table") {
      const rows = [];
      wrapper.querySelectorAll("tbody tr").forEach((row) => {
        const values = [...row.querySelectorAll("input")].map((input) => input.value);
        if (values.some((value) => value.trim())) rows.push(values);
      });
      return rows;
    }
    if (field.type === "repeating-rows") return [...wrapper.querySelectorAll("input")].map((input) => input.value).filter((value) => value.trim());
    return wrapper.querySelector("input, textarea, select")?.value || "";
  }

  function setFieldValue(root, field, value) {
    const wrapper = root.querySelector(`[data-field-id="${CSS.escape(field.id)}"]`);
    if (!wrapper) return;
    if (["checkbox", "multi-select"].includes(field.type)) wrapper.querySelectorAll("input").forEach((input) => { input.checked = Array.isArray(value) && value.includes(input.value); });
    else if (["yes-no", "single-choice"].includes(field.type)) wrapper.querySelectorAll("input").forEach((input) => { input.checked = value === input.value; });
    else if (field.type === "table") wrapper.querySelectorAll("tbody tr").forEach((row, rowIndex) => row.querySelectorAll("input").forEach((input, columnIndex) => { input.value = value?.[rowIndex]?.[columnIndex] || ""; }));
    else if (field.type === "repeating-rows") wrapper.querySelectorAll("input").forEach((input, index) => { input.value = value?.[index] || ""; });
    else {
      const input = wrapper.querySelector("input, textarea, select");
      if (!input) return;
      input.value = value ?? "";
      if (["rating-scale", "numeric-rating"].includes(field.type)) {
        if (value === "" || value == null) input.setAttribute("data-unset", "true");
        else input.removeAttribute("data-unset");
        const output = wrapper.querySelector("output");
        if (output) output.textContent = value === "" || value == null ? "Not set" : String(value);
      }
    }
  }

  function getAnswers(record, root) {
    return Object.fromEntries(record.fields.map((field) => [field.id, fieldValue(root, field)]));
  }

  function answerIsSet(value) {
    if (Array.isArray(value)) return value.some((item) => Array.isArray(item) ? item.some((cell) => String(cell).trim()) : String(item).trim());
    return value !== null && value !== undefined && String(value).trim() !== "";
  }

  function readableSummary(record, state) {
    const lines = [`# ${record.title} - My Progress`];
    record.fields.forEach((field) => {
      const value = state.answers?.[field.id];
      if (!answerIsSet(value)) return;
      lines.push("", `## ${field.label}`, "");
      if (Array.isArray(value)) {
        value.forEach((item) => lines.push(`- ${Array.isArray(item) ? item.join(" | ") : item}`));
      } else lines.push(String(value));
    });
    return lines.join("\n");
  }

  function promptText(baseGuidance, record, answers) {
    const lines = [...(baseGuidance?.contract || [])];
    lines.push("", `Worksheet: ${record.title}`, `Purpose: ${record.guidance.purpose}`, "", "Worksheet sequence:");
    record.guidance.questions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question.prompt}`);
      if (question.probes?.length) lines.push(`   Optional probes: ${question.probes.join(" | ")}`);
    });
    lines.push("", "Use only the summary sections that fit this worksheet:");
    record.guidance.summary_sections.forEach((section) => lines.push(`- ${section}`));
    if (answers) {
      lines.push("", "My current worksheet responses (treat blanks as unanswered):");
      record.fields.forEach((field) => {
        const value = answers[field.id];
        if (!answerIsSet(value)) return;
        const rendered = Array.isArray(value) ? value.map((item) => Array.isArray(item) ? item.join(" | ") : item).join("; ") : value;
        lines.push(`- ${field.label}: ${rendered}`);
      });
    }
    return `${lines.join("\n").trim()}\n`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const area = element("textarea");
    area.value = text;
    area.hidden = false;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function renderGuidance(baseGuidance, record, root) {
    if (!record.guidance?.enabled) return null;
    const details = element("details", { className: "bs-guided-reflection" });
    details.append(element("summary", { text: "Guided reflection prompt" }));
    const body = element("div");
    body.append(element("p", { text: "This creates a prompt you can choose to paste into an AI assistant. Nothing is sent automatically." }));
    const privacy = element("p", { className: "bs-guidance-privacy", text: "Including responses will place your current worksheet responses on your clipboard so you can choose where to paste them." });
    const status = element("p", { attrs: { role: "status", "aria-live": "polite" } });
    const actions = element("div", { className: "bs-guidance-actions" });
    const copyGuide = element("button", { type: "button", className: "btn btn-outline-primary", text: "Copy guided reflection prompt" });
    const copyAnswers = element("button", { type: "button", className: "btn btn-outline-secondary", text: "Copy prompt + my responses" });
    copyGuide.addEventListener("click", async () => { await copyText(promptText(baseGuidance, record)); status.textContent = "Guided reflection prompt copied. Nothing was sent."; });
    copyAnswers.addEventListener("click", async () => { await copyText(promptText(baseGuidance, record, getAnswers(record, root))); status.textContent = "Prompt and current responses copied. Nothing was sent."; });
    actions.append(copyGuide, copyAnswers);
    body.append(privacy, actions, status);
    details.append(body);
    return details;
  }

  function activateProgress(record, root, progress) {
    if (root.dataset.progressActive === "true" || !global.TherapySkillProgress) return;
    root.dataset.progressActive = "true";
    const route = record.lesson_route;
    progress.adapter = global.TherapySkillProgress.registerTool({
      root,
      toolId: `resource-${record.resource_id}`,
      toolTitle: record.title,
      route,
      schemaVersion: 1,
      getState: () => ({ resource_id: record.resource_id, answers: getAnswers(record, root) }),
      setState: (state) => { record.fields.forEach((field) => setFieldValue(root, field, state.answers?.[field.id])); updateCompletion(record, root); },
      validateState: (state) => state?.resource_id === record.resource_id && state.answers && typeof state.answers === "object" && !Array.isArray(state.answers),
      getReadableSummary: (state) => readableSummary(record, state),
      getSaveFilename: () => record.resource_id,
      finalHeading: "Save or export my responses",
      showFinalStartAgain: false,
    });
  }

  function updateCompletion(record, root) {
    const answers = getAnswers(record, root);
    const count = Object.values(answers).filter(answerIsSet).length;
    const indicator = root.querySelector("[data-worksheet-progress]");
    if (indicator) indicator.textContent = `${count} of ${record.fields.length} questions answered`;
  }

  function renderWorksheet(baseGuidance, record) {
    const root = element("section", { className: "bs-worksheet-shell skill-app-shell", attrs: { "data-resource-worksheet": record.resource_id, "aria-labelledby": `${record.resource_id}-worksheet-heading` } });
    root.append(element("h4", { text: "Interactive worksheet", attrs: { id: `${record.resource_id}-worksheet-heading` } }));
    root.append(element("p", { text: "Your answers stay in this browser unless you explicitly save or copy them." }));
    record.fields.forEach((field) => root.append(renderField(field)));
    const completion = element("p", { className: "bs-worksheet-progress", attrs: { "data-worksheet-progress": "", "aria-live": "polite" }, text: `0 of ${record.fields.length} questions answered` });
    const actions = element("div", { className: "bs-worksheet-actions skill-app-footer" });
    const clear = element("button", { type: "button", className: "btn btn-outline-secondary", text: "Clear this worksheet" });
    clear.addEventListener("click", () => {
      if (!global.confirm("Clear answers for this worksheet only?")) return;
      record.fields.forEach((field) => setFieldValue(root, field, ""));
      updateCompletion(record, root);
    });
    actions.append(clear);
    root.append(completion, actions);
    const guidance = renderGuidance(baseGuidance, record, root);
    if (guidance) root.append(guidance);
    const progress = {};
    const activate = () => activateProgress(record, root, progress);
    root.addEventListener("focusin", activate, { once: true });
    root.addEventListener("input", () => { activate(); updateCompletion(record, root); });
    root.addEventListener("change", () => { activate(); updateCompletion(record, root); });
    return root;
  }

  function renderDownloads(record) {
    const area = element("div", { className: "bs-worksheet-actions" });
    const pdf = element("a", { className: "btn btn-outline-primary", text: "Download worksheet (PDF)", attrs: { href: record.export.pdf, download: "" } });
    const docx = element("a", { className: "btn btn-outline-primary", text: "Download worksheet (DOCX)", attrs: { href: record.export.docx, download: "" } });
    area.append(pdf, docx);
    return area;
  }

  function attachRecord(record, baseGuidance, review) {
    const card = document.querySelector(`.bs-practice-resource[data-source-id="${CSS.escape(record.resource_id)}"]`);
    if (!card || card.querySelector(".bs-resource-paraphrase")) return;
    const details = element("details", { className: "bs-resource-paraphrase", attrs: { "data-resource-id": record.resource_id } });
    const label = review && !["approved", "published"].includes(record.status) ? "Adapted version" : "Text version";
    const summary = element("summary", { text: label });
    if (review) summary.append(element("span", { className: "bs-resource-draft-badge", text: record.status.replace("-", " ") }));
    details.append(summary);
    const body = element("div", { className: "bs-resource-paraphrase-body" });
    renderBlocks(record, body);
    const source = element("p");
    source.append(element("a", { text: "Printable source", attrs: { href: record.source.printable_asset } }));
    body.append(source);
    if (record.specialized_tool) {
      const handoff = element("p", { className: "bs-specialized-tool-handoff" });
      handoff.append(document.createTextNode("A specialized version is available: "), element("a", { text: `Open the ${record.specialized_tool.tool_id.replaceAll("-", " ")} tool`, attrs: { href: record.specialized_tool.tool_route } }));
      body.append(handoff);
    }
    if (record.has_input) {
      body.append(renderWorksheet(baseGuidance, record));
      if (["approved", "published"].includes(record.status)) body.append(renderDownloads(record));
    }
    details.append(body);
    card.append(details);
    if (review) details.open = true;
  }

  async function init() {
    if (!document.querySelector(".bs-practice-resource")) return;
    try {
      const payload = await loadRecords();
      const base = payload.baseGuidance || global.TherapyResourceBaseGuidance || null;
      payload.records.forEach((record) => attachRecord(record, base, payload.review));
    } catch (_error) {
      // Approved panes are progressive enhancement. A missing review asset is intentional in production.
    }
  }

  const api = { currentRoute, isReviewMode, renderField, fieldValue, setFieldValue, getAnswers, readableSummary, promptText, answerIsSet, loadRecords };
  global.TherapyResourceParaphrases = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
})(typeof window === "undefined" ? globalThis : window);

(function (global) {
  "use strict";

  const Site = global.TherapySite || { path: (value) => value };

  const ROOT_ID = "resource-paraphrase-review-app";
  const STORAGE_KEY = "therapy-skill-kit.resource-paraphrase-review.v1";
  const QA_LABELS = {
    similarity: ["Similarity", "Wording may be too close to the source; compare the highlighted meaning carefully."],
    completeness: ["Completeness", "The adapted version may omit a source heading, prompt, step, choice, or table."],
    "field-mismatch": ["Field mismatch", "The interactive fields may not match the prompts or controls in the source."],
    "input-field-mismatch": ["Field mismatch", "The interactive fields may not match the prompts or controls in the source."],
    "source-changed": ["Source changed", "The source hash changed after an earlier review; compare it again before approval."],
    "source-uncertain": ["Source uncertain", "Extraction or source identity needs a visual check against the printable page."],
  };

  let corpus = null;
  let records = [];
  let filtered = [];
  let selectedId = null;
  let changes = {};
  let ui = {};
  let activeAdaptedTab = "text";
  let activeSourceTab = "page";
  let activeMobilePane = "queue";
  let sourceZoom = 100;
  let previewFrame = null;

  function el(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function baseRecord(id = selectedId) { return records.find((record) => record.resource_id === id); }

  function displayStatus(status) {
    if (["approved", "published"].includes(status)) return "Approved";
    if (status === "review-needed") return "Needs changes";
    return "Not reviewed";
  }

  function statusGroup(status) {
    if (["approved", "published"].includes(status)) return "approved";
    if (status === "review-needed") return "needs-changes";
    return "not-reviewed";
  }

  function changedRecord(record) {
    const result = clone(record);
    const patch = changes[record.resource_id]?.changes || {};
    ["title", "blocks", "fields", "guidance", "status"].forEach((key) => {
      if (key in patch) result[key] = clone(patch[key]);
    });
    if ("review_notes" in patch) result.review.notes = patch.review_notes;
    return result;
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ corpus_version: corpus.corpus_version, changes }));
      renderSaveState();
    } catch (_error) {
      if (ui.saveState) ui.saveState.textContent = "Browser storage unavailable · export this session before leaving";
    }
  }

  function loadLocal() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (state?.corpus_version === corpus.corpus_version && state.changes && typeof state.changes === "object") changes = state.changes;
    } catch (_error) { changes = {}; }
  }

  function setChange(record, key, value) {
    const entry = changes[record.resource_id] || {
      resource_id: record.resource_id,
      expected_source_hash: record.source.source_hash,
      changes: {},
    };
    entry.changes[key] = clone(value);
    changes[record.resource_id] = entry;
    saveLocal();
    renderCounts();
  }

  function renderSaveState() {
    if (!ui.saveState) return;
    const count = Object.values(changes).filter((entry) => Object.keys(entry.changes || {}).length).length;
    ui.saveState.textContent = count
      ? `${count} resource${count === 1 ? "" : "s"} changed · saved in this browser · export required`
      : "No review changes in this browser";
  }

  function selectControl(label, values, current) {
    const control = el("select", { attrs: { "aria-label": label } });
    values.forEach(([value, text]) => {
      const option = el("option", { text, attrs: { value } });
      option.selected = value === current;
      control.append(option);
    });
    return control;
  }

  function button(text, className = "", attrs = {}) {
    return el("button", { type: "button", text, className: `tsk-review-button ${className}`.trim(), attrs });
  }

  function labeled(labelText, control, className = "") {
    const label = el("label", { className, text: labelText });
    label.append(control);
    return label;
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { attrs: { href: url, download: filename } });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function qaFlags(record) {
    const flags = new Set(record.qa?.flags || []);
    if (record.review?.source_uncertain) flags.add("source-uncertain");
    if (record.review?.source_changed) flags.add("source-changed");
    if (record.qa?.similarity_flag) flags.add("similarity");
    if (record.qa?.completeness_flag) flags.add("completeness");
    if (record.has_input && Number(record.qa?.source_prompt_count) !== Number(record.qa?.interactive_field_count)) flags.add("field-mismatch");
    return [...flags];
  }

  function renderCounts() {
    if (!ui.counts) return;
    const view = records.map(changedRecord);
    const count = (predicate) => view.filter(predicate).length;
    const values = [
      ["total", "Total", records.length],
      ["not-reviewed", "Not reviewed", count((r) => statusGroup(r.status) === "not-reviewed")],
      ["changes", "Needs changes", count((r) => statusGroup(r.status) === "needs-changes")],
      ["approved", "Approved", count((r) => statusGroup(r.status) === "approved")],
      ["flagged", "QA flagged", count((r) => qaFlags(r).length > 0)],
    ];
    ui.counts.replaceChildren(...values.map(([kind, label, value]) => el("span", {
      className: "tsk-review-count", text: `${label} ${value}`, attrs: { "data-kind": kind },
    })));
    renderSaveState();
  }

  function filterRecords() {
    const query = ui.search.value.trim().toLowerCase();
    filtered = records.filter((base) => {
      const record = changedRecord(base);
      if (query && !`${record.resource_id} ${record.title} ${record.section} ${record.source.source_document}`.toLowerCase().includes(query)) return false;
      if (ui.section.value && record.section !== ui.section.value) return false;
      if (ui.classification.value && record.classification !== ui.classification.value) return false;
      if (ui.status.value && statusGroup(record.status) !== ui.status.value) return false;
      if (ui.qa.value && !qaFlags(record).includes(ui.qa.value)) return false;
      if (ui.tool.value === "tool" && !record.specialized_tool) return false;
      if (ui.tool.value === "standard" && record.specialized_tool) return false;
      return true;
    }).sort((a, b) => a.resource_id.localeCompare(b.resource_id));

    if (!filtered.some((record) => record.resource_id === selectedId)) selectedId = filtered[0]?.resource_id || null;
    renderList();
    renderDetail();
  }

  function statusBadge(record) {
    return el("span", {
      className: "tsk-review-badge",
      text: displayStatus(record.status),
      attrs: { "data-status": statusGroup(record.status) },
    });
  }

  function renderList() {
    ui.list.replaceChildren();
    filtered.forEach((base) => {
      const record = changedRecord(base);
      const flags = qaFlags(record);
      const item = el("li");
      const control = el("button", {
        type: "button",
        className: "tsk-review-queue-item",
        attrs: { "aria-current": record.resource_id === selectedId, "data-resource-id": record.resource_id },
      });
      control.append(el("span", { className: "tsk-review-queue-title", text: record.title }));
      const meta = el("span", { className: "tsk-review-queue-meta" });
      meta.append(el("span", { text: record.section }), el("span", { text: `p. ${record.source.source_page}` }), statusBadge(record));
      control.append(meta);
      if (flags.length || record.specialized_tool) {
        const flagRow = el("span", { className: "tsk-review-queue-flags" });
        if (flags.length) flagRow.append(el("span", { className: "tsk-review-badge", text: `⚑ ${flags.length} QA`, attrs: { "data-flag": true } }));
        if (record.specialized_tool) flagRow.append(el("span", { className: "tsk-review-badge", text: "Tool" }));
        control.append(flagRow);
      }
      control.addEventListener("click", () => selectResource(record.resource_id));
      item.append(control);
      ui.list.append(item);
    });
    if (!filtered.length) ui.list.append(el("li", { className: "tsk-review-empty", text: "No resources match these filters." }));
    if (ui.queueCount) ui.queueCount.textContent = `${filtered.length} shown`;
  }

  function selectResource(id) {
    selectedId = id;
    sourceZoom = 100;
    renderList();
    renderDetail();
    const current = ui.list.querySelector(`[data-resource-id="${global.CSS?.escape ? global.CSS.escape(id) : id}"]`);
    current?.scrollIntoView({ block: "nearest" });
    if (global.matchMedia("(max-width: 640px)").matches) setMobilePane("adapted");
  }

  function makeTabs(name, tabs, active, onChange) {
    const tablist = el("div", { className: "tsk-review-tabs", attrs: { role: "tablist", "aria-label": name } });
    const controls = new Map();
    tabs.forEach(([id, label]) => {
      const control = el("button", {
        type: "button",
        className: "tsk-review-tab",
        text: label,
        attrs: { role: "tab", "aria-selected": id === active, tabindex: id === active ? 0 : -1 },
      });
      control.addEventListener("click", () => onChange(id));
      control.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const ids = tabs.map(([tabId]) => tabId);
        let index = ids.indexOf(id);
        if (event.key === "ArrowLeft") index = (index - 1 + ids.length) % ids.length;
        if (event.key === "ArrowRight") index = (index + 1) % ids.length;
        if (event.key === "Home") index = 0;
        if (event.key === "End") index = ids.length - 1;
        controls.get(ids[index])?.click();
        controls.get(ids[index])?.focus();
      });
      controls.set(id, control);
      tablist.append(control);
    });
    return tablist;
  }

  function sourcePane(record) {
    const pane = ui.sourcePane;
    const header = el("header", { className: "tsk-review-pane-header" });
    const heading = el("div");
    heading.append(el("h2", { text: "Source" }), el("div", {
      className: "tsk-review-meta",
      text: `${record.source.source_document} · page ${record.source.source_page} · ${record.source.extraction_method || "source text"}`,
    }));
    const tabs = makeTabs("Source view", [["page", "Source page"], ["text", "Extracted text"]], activeSourceTab, (id) => {
      activeSourceTab = id;
      sourcePane(changedRecord(baseRecord()));
    });
    header.append(heading, tabs);

    const body = el("div", { className: "tsk-review-pane-scroll" });
    if (activeSourceTab === "page") {
      const tools = el("div", { className: "tsk-review-source-tools" });
      const fitWidth = button("Fit width");
      const fitPage = button("Fit page");
      const zoomOut = button("−", "", { "aria-label": "Zoom source out" });
      const zoomIn = button("+", "", { "aria-label": "Zoom source in" });
      const open = el("a", { className: "tsk-review-button", text: "Open source", attrs: { href: record.source.printable_asset, target: "_blank", rel: "noopener" } });
      const stage = el("div", { className: "tsk-review-source-stage", attrs: { "data-fit": "width" } });
      const image = el("img", { attrs: { src: record.source.printable_asset, alt: `Source page for ${record.title}`, loading: "eager" } });
      stage.style.setProperty("--tsk-source-zoom", `${sourceZoom}%`);
      stage.append(image);
      fitWidth.addEventListener("click", () => { sourceZoom = 100; stage.dataset.fit = "width"; stage.style.setProperty("--tsk-source-zoom", "100%"); });
      fitPage.addEventListener("click", () => { stage.dataset.fit = "page"; });
      zoomOut.addEventListener("click", () => { sourceZoom = Math.max(40, sourceZoom - 15); stage.dataset.fit = "width"; stage.style.setProperty("--tsk-source-zoom", `${sourceZoom}%`); });
      zoomIn.addEventListener("click", () => { sourceZoom = Math.min(250, sourceZoom + 15); stage.dataset.fit = "width"; stage.style.setProperty("--tsk-source-zoom", `${sourceZoom}%`); });
      tools.append(fitWidth, fitPage, zoomOut, zoomIn, open);
      header.append(tools);
      body.append(stage);
    } else {
      body.append(el("pre", { className: "tsk-review-source-text", text: record.source.original_text || "Extracted text is unavailable. Check the source page." }));
    }
    pane.replaceChildren(header, body);
  }

  function editorCard(title) {
    const card = el("section", { className: "tsk-review-editor-card" });
    card.append(el("h3", { text: title }));
    return card;
  }

  function renderBlockEditor(record, container) {
    if (!(record.blocks || []).length) {
      container.append(el("p", { className: "tsk-review-meta", text: "No adapted text blocks are present." }));
      return;
    }
    record.blocks.forEach((block, index) => {
      const card = editorCard(`Block ${index + 1} · ${block.type}`);
      const area = el("textarea", { attrs: { "aria-label": `Adapted text block ${index + 1}` } });
      area.value = block.text;
      area.addEventListener("input", () => {
        const next = clone(changedRecord(baseRecord(record.resource_id)).blocks);
        next[index].text = area.value;
        setChange(baseRecord(record.resource_id), "blocks", next);
      });
      card.append(labeled("Adapted text", area));
      container.append(card);
    });
  }

  function choicesValue(field) {
    return (field.choices || []).map((choice) => typeof choice === "string" ? choice : choice.label || choice.value || "").join("\n");
  }

  function renderFieldEditor(record, container, preview) {
    if (!(record.fields || []).length) {
      container.append(el("p", { className: "tsk-review-meta", text: "This informational resource has no worksheet fields." }));
      preview.replaceChildren(el("p", { text: "No worksheet preview for this resource." }));
      return;
    }

    function schedulePreview() {
      cancelAnimationFrame(previewFrame);
      previewFrame = requestAnimationFrame(() => {
        const current = changedRecord(baseRecord(record.resource_id));
        const shell = el("div", { className: "bs-worksheet-shell" });
        current.fields.forEach((field) => shell.append(global.TherapyResourceParaphrases.renderField(field)));
        preview.replaceChildren(shell);
      });
    }

    record.fields.forEach((field, index) => {
      const card = editorCard(`${index + 1}. ${field.id}`);
      const label = el("textarea", { attrs: { "aria-label": `${field.id} label`, "data-size": "small" } });
      const help = el("textarea", { attrs: { "aria-label": `${field.id} help text`, "data-size": "small" } });
      const type = selectControl(`${field.id} control type`, ["text", "textarea", "checkbox", "multi-select", "yes-no", "single-choice", "rating-scale", "numeric-rating", "table", "repeating-rows", "date", "time", "planning", "reflection", "other"].map((value) => [value, value]), field.type);
      label.value = field.label || "";
      help.value = field.help || "";
      const choices = el("textarea", { attrs: { "aria-label": `${field.id} choices`, "data-size": "small" } });
      choices.value = choicesValue(field);
      const update = () => {
        const next = clone(changedRecord(baseRecord(record.resource_id)).fields);
        next[index].label = label.value;
        next[index].help = help.value;
        next[index].type = type.value;
        if ("choices" in next[index] || choices.value.trim()) next[index].choices = choices.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        setChange(baseRecord(record.resource_id), "fields", next);
        schedulePreview();
      };
      label.addEventListener("input", update);
      help.addEventListener("input", update);
      type.addEventListener("change", update);
      choices.addEventListener("input", update);
      card.append(labeled("Worksheet label", label), labeled("Help or instructions", help), labeled("Control type", type));
      if (field.choices?.length || ["multi-select", "single-choice", "yes-no"].includes(field.type)) card.append(labeled("Choices · one per line", choices));
      container.append(card);
    });
    schedulePreview();
  }

  function renderGuidanceEditor(record, container, preview) {
    if (!record.guidance?.enabled) {
      container.append(el("p", { className: "tsk-review-meta", text: "Guided reflection is not used for this informational resource." }));
      preview.textContent = "No guided reflection prompt for this resource.";
      return;
    }
    const purposeCard = editorCard("Guided reflection guidance");
    const purpose = el("textarea", { attrs: { "data-size": "small" } });
    purpose.value = record.guidance.purpose || "";
    function updatePreview() {
      const current = changedRecord(baseRecord(record.resource_id));
      preview.textContent = global.TherapyResourceParaphrases.promptText(corpus.base_guidance, current);
    }
    purpose.addEventListener("input", () => {
      const next = clone(changedRecord(baseRecord(record.resource_id)).guidance);
      next.purpose = purpose.value;
      setChange(baseRecord(record.resource_id), "guidance", next);
      updatePreview();
    });
    purposeCard.append(labeled("Purpose", purpose));
    container.append(purposeCard);
    record.guidance.questions.forEach((question, index) => {
      const card = editorCard(`Question ${index + 1} · ${question.field_id}`);
      const prompt = el("textarea", { attrs: { "data-size": "small" } });
      const probes = el("textarea", { attrs: { "data-size": "small" } });
      prompt.value = question.prompt || "";
      probes.value = (question.probes || []).join("\n");
      const update = () => {
        const next = clone(changedRecord(baseRecord(record.resource_id)).guidance);
        next.questions[index].prompt = prompt.value;
        next.questions[index].probes = probes.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        setChange(baseRecord(record.resource_id), "guidance", next);
        updatePreview();
      };
      prompt.addEventListener("input", update);
      probes.addEventListener("input", update);
      card.append(labeled("Guided reflection prompt", prompt), labeled("Optional follow-ups · one per line", probes));
      container.append(card);
    });
    updatePreview();
  }

  function qaItem(title, body, flagged = false) {
    const item = el("div", { className: "tsk-review-qa-item" });
    item.append(el("strong", { text: `${flagged ? "⚑ " : ""}${title}` }), el("span", { text: body }));
    return item;
  }

  function renderQaEditor(record, container) {
    const overview = editorCard("Review status");
    const title = el("input", { type: "text" });
    title.value = record.title;
    title.addEventListener("input", () => setChange(baseRecord(record.resource_id), "title", title.value));
    const status = selectControl("Review status", [["draft", "Not reviewed"], ["review-needed", "Needs changes"], ["approved", "Approved"], ["published", "Approved · published"]], record.status);
    status.addEventListener("change", () => {
      setChange(baseRecord(record.resource_id), "status", status.value);
      renderCounts();
      renderList();
    });
    const notes = el("textarea", { attrs: { "data-size": "small" } });
    notes.value = record.review.notes || "";
    notes.addEventListener("input", () => setChange(baseRecord(record.resource_id), "review_notes", notes.value));
    overview.append(labeled("Title", title), labeled("Review status", status), labeled("Review note", notes));
    container.append(overview);

    const flags = qaFlags(record);
    const qa = editorCard("QA inspection");
    const grid = el("div", { className: "tsk-review-qa-grid" });
    if (!flags.length) grid.append(qaItem("No current QA flags", "Automated checks found no flagged condition. Source review is still required before approval."));
    flags.forEach((flag) => {
      const [label, explanation] = QA_LABELS[flag] || [flag.replace(/-/g, " "), "Review this item against the source before approval."];
      grid.append(qaItem(label, explanation, true));
    });
    grid.append(
      qaItem("Prompt coverage", `${record.qa?.interactive_field_count || 0} worksheet fields for ${record.qa?.source_prompt_count || 0} detected source prompts.`, flags.includes("field-mismatch")),
      qaItem("Heading coverage", `${record.qa?.paraphrase_heading_count || 0} adapted headings for ${record.qa?.source_heading_count || 0} detected source headings.`, flags.includes("completeness")),
      qaItem("Similarity score", `${Math.round(Number(record.qa?.similarity_score || 0) * 100)}% · longest shared sequence ${record.qa?.longest_shared_ngram || 0} words.`, flags.includes("similarity")),
      qaItem("Source hash", record.source.source_hash || "Unavailable", flags.includes("source-changed")),
    );
    qa.append(grid);
    container.append(qa);

    const metadata = editorCard("Source and mapping");
    metadata.append(
      el("div", { className: "tsk-review-meta", text: `Resource ID: ${record.resource_id}` }),
      el("div", { className: "tsk-review-meta", text: `Lesson: ${record.lesson_route}` }),
      el("div", { className: "tsk-review-meta", text: `Classification: ${record.classification}` }),
      el("div", { className: "tsk-review-meta", text: `Specialized tool: ${record.specialized_tool?.route || record.specialized_tool?.id || "None"}` }),
    );
    container.append(metadata);
  }

  function adaptedPane(record) {
    const pane = ui.adaptedPane;
    const availableTabs = [["text", "Text"]];
    if (record.has_input || record.fields?.length) availableTabs.push(["worksheet", "Worksheet"], ["guidance", "Guided reflection"]);
    availableTabs.push(["qa", "Metadata / QA"]);
    if (!availableTabs.some(([id]) => id === activeAdaptedTab)) activeAdaptedTab = "text";

    const header = el("header", { className: "tsk-review-pane-header" });
    const heading = el("div");
    heading.append(el("h2", { text: record.title }), el("div", { className: "tsk-review-meta", text: `${record.resource_id} · ${record.section} · ${displayStatus(record.status)}` }));
    const tabs = makeTabs("Adapted version", availableTabs, activeAdaptedTab, (id) => {
      activeAdaptedTab = id;
      adaptedPane(changedRecord(baseRecord()));
    });
    header.append(heading, tabs);

    const body = el("div", { className: "tsk-review-adapted-body" });
    const panel = el("section", { className: "tsk-review-tabpanel", attrs: { role: "tabpanel", tabindex: 0 } });
    const editor = el("div", { className: "tsk-review-editor" });
    if (activeAdaptedTab === "text") {
      renderBlockEditor(record, editor);
      panel.append(editor);
    } else if (activeAdaptedTab === "worksheet") {
      const columns = el("div", { className: "tsk-review-two-column" });
      const preview = el("aside", { className: "tsk-review-preview", attrs: { "aria-label": "Worksheet preview" } });
      renderFieldEditor(record, editor, preview);
      columns.append(editor, preview);
      panel.append(columns);
    } else if (activeAdaptedTab === "guidance") {
      const columns = el("div", { className: "tsk-review-two-column" });
      const preview = el("pre", { className: "tsk-review-preview tsk-review-source-text", attrs: { "aria-label": "Guided reflection prompt preview" } });
      renderGuidanceEditor(record, editor, preview);
      columns.append(editor, preview);
      panel.append(columns);
    } else {
      renderQaEditor(record, editor);
      panel.append(editor);
    }
    body.append(panel);
    pane.replaceChildren(header, body);
  }

  function renderDetail() {
    const base = baseRecord();
    if (!base) {
      ui.sourcePane.replaceChildren(el("p", { className: "tsk-review-empty", text: "Choose a resource from the queue." }));
      ui.adaptedPane.replaceChildren();
      return;
    }
    const record = changedRecord(base);
    sourcePane(record);
    adaptedPane(record);
  }

  function navigate(delta) {
    const index = filtered.findIndex((record) => record.resource_id === selectedId);
    const target = filtered[index + delta];
    if (target) selectResource(target.resource_id);
  }

  function setStatus(status, moveNext) {
    const record = baseRecord();
    if (!record) return;
    setChange(record, "status", status);
    renderCounts();
    renderList();
    if (moveNext) navigate(1);
    else renderDetail();
  }

  function buildToolbar(root) {
    const toolbar = el("header", { className: "tsk-review-toolbar", attrs: { "aria-label": "Resource review toolbar" } });
    const filters = el("div", { className: "tsk-review-toolbar-row" });
    const brand = el("div", { className: "tsk-review-brand" });
    brand.append(el("strong", { text: "Resource review" }));
    ui.saveState = el("span", { className: "tsk-review-save-state", attrs: { "aria-live": "polite" } });
    brand.append(ui.saveState);

    ui.search = el("input", { type: "search", attrs: { placeholder: "Title, resource ID, or source", "aria-label": "Search resources" } });
    const sections = [...new Set(records.map((record) => record.section))].sort();
    ui.section = selectControl("Section", [["", "All sections"], ...sections.map((value) => [value, value])], "");
    ui.classification = selectControl("Classification", [["", "All"], ["informational", "Informational"], ["interactive", "Interactive"], ["mixed", "Mixed"]], "");
    ui.status = selectControl("Review status", [["", "All"], ["not-reviewed", "Not reviewed"], ["needs-changes", "Needs changes"], ["approved", "Approved"]], "");
    const allFlags = [...new Set(records.flatMap(qaFlags))].sort();
    ui.qa = selectControl("QA flags", [["", "All"], ...allFlags.map((value) => [value, (QA_LABELS[value]?.[0] || value.replace(/-/g, " "))])], "");
    ui.tool = selectControl("Specialized tool", [["", "All"], ["tool", "Specialized tools"], ["standard", "No specialized tool"]], "");

    filters.append(
      brand,
      labeled("Search", ui.search, "tsk-review-filter tsk-review-filter--search"),
      labeled("Section", ui.section, "tsk-review-filter"),
      labeled("Classification", ui.classification, "tsk-review-filter"),
      labeled("Review status", ui.status, "tsk-review-filter"),
      labeled("QA flags", ui.qa, "tsk-review-filter"),
      labeled("Specialized tool", ui.tool, "tsk-review-filter"),
    );
    [ui.search, ui.section, ui.classification, ui.status, ui.qa, ui.tool].forEach((control) => control.addEventListener("input", filterRecords));

    const commandRow = el("div", { className: "tsk-review-toolbar-row" });
    ui.counts = el("div", { className: "tsk-review-counts", attrs: { "aria-label": "Review counts" } });
    const actions = el("div", { className: "tsk-review-actions" });
    const previous = button("Previous", "", { "aria-label": "Previous resource" });
    const next = button("Next", "", { "aria-label": "Next resource" });
    const approve = button("Approve", "tsk-review-button--approve");
    const approveNext = button("Approve & next", "tsk-review-button--approve");
    const needsNext = button("Needs changes & next", "tsk-review-button--needs");
    const exportButton = button("Export review JSON", "tsk-review-button--primary");
    const clear = button("Clear local edits");
    previous.addEventListener("click", () => navigate(-1));
    next.addEventListener("click", () => navigate(1));
    approve.addEventListener("click", () => setStatus("approved", false));
    approveNext.addEventListener("click", () => setStatus("approved", true));
    needsNext.addEventListener("click", () => setStatus("review-needed", true));
    exportButton.addEventListener("click", () => downloadJson({
      schema_version: 1,
      corpus_version: corpus.corpus_version,
      changes: Object.values(changes).filter((entry) => Object.keys(entry.changes || {}).length),
    }, `resource-paraphrase-review-${corpus.corpus_version}.json`));
    clear.addEventListener("click", () => {
      if (!global.confirm("Clear all review edits stored in this browser? Export first if you want to keep them.")) return;
      changes = {};
      localStorage.removeItem(STORAGE_KEY);
      renderCounts();
      filterRecords();
    });
    actions.append(previous, next, approve, approveNext, needsNext, exportButton, clear);
    commandRow.append(ui.counts, actions);
    toolbar.append(filters, commandRow);
    root.append(toolbar);
  }

  function setMobilePane(id) {
    activeMobilePane = id;
    Object.entries({ queue: ui.queuePane, source: ui.sourcePane, adapted: ui.adaptedPane }).forEach(([key, pane]) => {
      pane.dataset.mobileActive = String(key === id);
    });
    ui.mobileNav?.querySelectorAll("[data-pane]").forEach((control) => {
      control.setAttribute("aria-selected", String(control.dataset.pane === id));
    });
  }

  function buildMobileNav(root) {
    ui.mobileNav = el("nav", { className: "tsk-review-mobile-nav", attrs: { "aria-label": "Review panes", role: "tablist" } });
    [["queue", "Queue"], ["source", "Source"], ["adapted", "Adapted"]].forEach(([id, label]) => {
      const control = el("button", {
        type: "button", className: "tsk-review-tab", text: label,
        attrs: { role: "tab", "data-pane": id, "aria-selected": id === activeMobilePane },
      });
      control.addEventListener("click", () => setMobilePane(id));
      ui.mobileNav.append(control);
    });
    root.append(ui.mobileNav);
  }

  function buildWorkspace(root) {
    const workspace = el("div", { className: "tsk-review-workspace" });
    ui.queuePane = el("aside", { className: "tsk-review-pane tsk-review-queue", attrs: { "data-mobile-active": true } });
    const queueHeader = el("header", { className: "tsk-review-pane-header" });
    queueHeader.append(el("h1", { text: "Resource queue" }));
    ui.queueCount = el("span", { className: "tsk-review-meta" });
    queueHeader.append(ui.queueCount);
    ui.list = el("ol", { className: "tsk-review-queue-list tsk-review-pane-scroll", attrs: { "aria-label": "Resource review queue" } });
    ui.queuePane.append(queueHeader, ui.list);

    ui.sourcePane = el("section", { className: "tsk-review-pane tsk-review-source", attrs: { "data-mobile-active": false, "aria-label": "Source" } });
    const splitter = el("button", { type: "button", className: "tsk-review-splitter", attrs: { "aria-label": "Resize source and adapted panes", tabindex: -1 } });
    ui.adaptedPane = el("section", { className: "tsk-review-pane tsk-review-adapted", attrs: { "data-mobile-active": false, "aria-label": "Adapted version" } });
    workspace.append(ui.queuePane, ui.sourcePane, splitter, ui.adaptedPane);
    root.append(workspace);

    splitter.addEventListener("pointerdown", (event) => {
      if (global.matchMedia("(max-width: 640px)").matches) return;
      splitter.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = ui.sourcePane.getBoundingClientRect().width;
      const move = (moveEvent) => {
        const available = workspace.getBoundingClientRect().width - ui.queuePane.getBoundingClientRect().width;
        const width = Math.max(320, Math.min(available - 390, startWidth + moveEvent.clientX - startX));
        workspace.style.setProperty("--tsk-source-width", `${width}px`);
      };
      const stop = () => {
        splitter.removeEventListener("pointermove", move);
        splitter.removeEventListener("pointerup", stop);
        splitter.removeEventListener("pointercancel", stop);
      };
      splitter.addEventListener("pointermove", move);
      splitter.addEventListener("pointerup", stop);
      splitter.addEventListener("pointercancel", stop);
    });
  }

  function isEditingTarget(target) {
    return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function bindKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "a") { event.preventDefault(); setStatus("approved", false); }
        if (key === "n") { event.preventDefault(); navigate(1); }
        if (key === "p") { event.preventDefault(); navigate(-1); }
        return;
      }
      if (isEditingTarget(event.target)) return;
      if (["ArrowDown", "j", "J"].includes(event.key)) { event.preventDefault(); navigate(1); }
      if (["ArrowUp", "k", "K"].includes(event.key)) { event.preventDefault(); navigate(-1); }
    });
  }

  async function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.add("tsk-review-app");
    try {
      corpus = await fetch(Site.path("/data/resource-paraphrases/review.json"), { cache: "no-store", credentials: "same-origin" }).then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      });
    } catch (_error) {
      root.replaceChildren(el("div", { className: "tsk-review-empty", text: "Review data is intentionally absent. Render locally with TSK_RESOURCE_REVIEW=1 to open this authoring workspace." }));
      return;
    }
    records = corpus.records || [];
    loadLocal();
    root.replaceChildren();
    buildToolbar(root);
    buildMobileNav(root);
    buildWorkspace(root);
    renderCounts();
    filterRecords();
    setMobilePane(activeMobilePane);
    bindKeyboard();
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
})(typeof window === "undefined" ? globalThis : window);

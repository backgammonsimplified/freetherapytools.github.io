(function (global) {
  "use strict";

  const FORMAT = "therapy-skill-kit-progress";
  const STORAGE_PREFIX = "therapy-skill-kit:progress:";
  const HANDOFF_KEY = "therapy-skill-kit:progress-handoff";
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const TOOL_ROUTES = Object.freeze({
    values: "/skill-finder/values/",
    thermometer: "/skill-finder/thermometer/",
    "emotion-explorer": "/skill-finder/emotions/",
    "change-emotion": "/skill-finder/change-emotion/",
    "worry-tree": "/skill-finder/worry-tree/",
    "pleasant-event": "/skill-finder/pleasant-event/",
    "behaviour-chain": "/skill-finder/behaviour-chain/",
    "missing-links": "/skill-finder/missing-links/",
    exposure: "/skill-finder/exposure/",
    "dear-man": "/skill-finder/dear-man/",
    "ask-or-say-no": "/skill-finder/ask-or-say-no/",
    "goal-builder": "/skill-finder/goal-builder/",
    "behavioural-activation": "/skill-finder/behavioural-activation/",
  });

  let active = null;
  let autosaveTimer = null;
  let restoreFocus = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || "progress")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-. ]+|[-. ]+$/g, "")
      .slice(0, 100);
    return cleaned || "progress";
  }

  function localFilename(slug, date = new Date()) {
    const pad = (number) => String(number).padStart(2, "0");
    return sanitizeFilename(`${slug}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`);
  }

  function localSavedLabel(date) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(date);
  }

  function makeRecord(config, state, savedAt = new Date()) {
    return {
      format: FORMAT,
      schema_version: config.schemaVersion,
      tool_id: config.toolId,
      tool_title: config.toolTitle,
      route: config.route,
      saved_at: savedAt.toISOString(),
      state: clone(state),
    };
  }

  function serializeJson(record) {
    return `${JSON.stringify(record, null, 2)}\n`;
  }

  function serializeMarkdown(record, readable) {
    const metadata = JSON.stringify(record, null, 2).replaceAll("--", "\\u002d\\u002d");
    const saved = localSavedLabel(new Date(record.saved_at));
    const body = String(readable || `# ${record.tool_title}`).trim();
    return `<!-- therapy-skill-kit-progress\n${metadata}\n-->\n\n${body}\n\nSaved: ${saved}\n`;
  }

  function parseProgress(text) {
    const value = String(text || "").replace(/^\uFEFF/, "").trim();
    let record;
    try {
      if (value.startsWith("{")) record = JSON.parse(value);
      else {
        const match = value.match(/<!--\s*therapy-skill-kit-progress\s*([\s\S]*?)-->/);
        if (!match) return { ok: false, code: "not-progress" };
        record = JSON.parse(match[1]);
      }
    } catch (_error) {
      return { ok: false, code: "damaged" };
    }
    if (!isPlainObject(record) || record.format !== FORMAT || typeof record.tool_id !== "string"
      || typeof record.tool_title !== "string" || typeof record.route !== "string" || typeof record.saved_at !== "string"
      || Number.isNaN(Date.parse(record.saved_at)) || !isPlainObject(record.state)) {
      return { ok: false, code: "not-progress" };
    }
    if (!Number.isInteger(record.schema_version) || record.schema_version < 1) return { ok: false, code: "damaged" };
    return { ok: true, record };
  }

  function validationMessage(code, details = {}) {
    if (code === "not-progress") return "This isn't a Therapy Skill Kit progress file.";
    if (code === "future-version") return "This progress file was created by a newer version of this tool.";
    if (code === "damaged") return "This progress file appears to be damaged or incomplete.";
    if (code === "too-large") return "This file is too large to be a Therapy Skill Kit progress file.";
    if (code === "wrong-tool") return `This file contains ${details.title || "another tool's"} progress.`;
    return "This progress file could not be opened.";
  }

  function validateForTool(record, config) {
    if (record.tool_id !== config.toolId) return { ok: false, code: "wrong-tool", record };
    if (record.schema_version > config.schemaVersion) return { ok: false, code: "future-version" };
    try {
      if (record.schema_version !== config.schemaVersion || record.route !== config.route || !config.validateState(record.state)) return { ok: false, code: "damaged" };
    } catch (_error) {
      return { ok: false, code: "damaged" };
    }
    return { ok: true, state: clone(record.state) };
  }

  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function setMessage(message, error = false) {
    if (!active?.message) return;
    active.message.textContent = message;
    active.message.className = error ? "skill-progress-error" : "skill-progress-status";
  }

  function currentRecord() {
    return makeRecord(active.config, active.config.getState());
  }

  function saveFile(extension) {
    try {
      const record = currentRecord();
      const base = sanitizeFilename(active.filename.value || localFilename(active.config.toolId));
      if (extension === "json") download(`${base}.json`, serializeJson(record), "application/json;charset=utf-8");
      else download(`${base}.md`, serializeMarkdown(record, active.config.getReadableSummary(record.state)), "text/markdown;charset=utf-8");
      setMessage(`Saved ${base}.${extension} to your computer.`);
    } catch (_error) {
      setMessage("Your progress could not be saved. Please try again.", true);
    }
  }

  function saveDraftNow() {
    if (!active || active.config.browserAutosave === false) return;
    try {
      const record = currentRecord();
      localStorage.setItem(STORAGE_PREFIX + active.config.toolId, JSON.stringify(record));
      active.lastSaved = new Date(record.saved_at);
      updateDraftUi();
    } catch (_error) {
      setMessage("Browser progress could not be saved. You can still save a file to your computer.", true);
    }
  }

  function scheduleDraft() {
    if (active?.config.browserAutosave === false) return;
    global.clearTimeout(autosaveTimer);
    autosaveTimer = global.setTimeout(saveDraftNow, 450);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + active.config.toolId);
      if (!raw) return null;
      const parsed = parseProgress(raw);
      const checked = parsed.ok ? validateForTool(parsed.record, active.config) : parsed;
      if (!checked.ok) return null;
      return { record: parsed.record, state: checked.state };
    } catch (_error) {
      return null;
    }
  }

  function clearDraft(confirmFirst = true) {
    if (confirmFirst && !global.confirm("Clear browser progress for this tool? Files already saved to your computer will not be affected.")) return;
    localStorage.removeItem(STORAGE_PREFIX + active.config.toolId);
    active.lastSaved = null;
    updateDraftUi();
    setMessage("Browser progress cleared.");
  }

  function continueDraft() {
    const draft = readDraft();
    if (!draft) {
      setMessage("No usable browser progress was found.", true);
      return;
    }
    active.config.setState(clone(draft.state));
    active.lastSaved = new Date(draft.record.saved_at);
    updateDraftUi();
    setMessage("Previous browser progress restored.");
  }

  function startOver() {
    if (!global.confirm("Start over and clear browser progress for this tool?")) return;
    active.config.setState(clone(active.initialState));
    clearDraft(false);
    setMessage("Started again with a blank tool.");
  }

  function updateDraftUi() {
    if (!active) return;
    if (active.config.browserAutosave === false) {
      ensurePageControls();
      return;
    }
    const draft = readDraft();
    const savedAt = active.lastSaved || (draft && new Date(draft.record.saved_at));
    active.lastSavedText.textContent = savedAt ? localSavedLabel(savedAt) : "Not yet saved";
    active.clearButton.disabled = !draft;
    ensurePageControls();
  }

  function openDrawer(trigger) {
    restoreFocus = trigger || document.activeElement;
    active.filename.value = localFilename(active.config.toolId);
    active.backdrop.hidden = false;
    active.drawer.hidden = false;
    document.body.classList.add("skill-progress-dialog-open");
    active.filename.focus();
  }

  function closeDrawer() {
    if (!active || active.drawer.hidden) return;
    active.drawer.hidden = true;
    active.backdrop.hidden = true;
    document.body.classList.remove("skill-progress-dialog-open");
    restoreFocus?.focus?.();
  }

  function openFilePicker() {
    active.fileInput.value = "";
    active.fileInput.click();
  }

  async function loadFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMessage(validationMessage("too-large"), true);
      return;
    }
    let parsed;
    try {
      parsed = parseProgress(await file.text());
    } catch (_error) {
      parsed = { ok: false, code: "damaged" };
    }
    if (!parsed.ok) {
      setMessage(validationMessage(parsed.code), true);
      return;
    }
    const checked = validateForTool(parsed.record, active.config);
    if (checked.code === "wrong-tool") {
      showWrongTool(parsed.record);
      return;
    }
    if (!checked.ok) {
      setMessage(validationMessage(checked.code), true);
      return;
    }
    active.config.setState(clone(checked.state));
    if (active.config.browserAutosave !== false) saveDraftNow();
    setMessage("Progress restored. You can continue where you left off.");
    closeDrawer();
  }

  function showWrongTool(record) {
    const title = typeof record.tool_title === "string" ? record.tool_title : record.tool_id;
    setMessage(validationMessage("wrong-tool", { title }), false);
    active.wrongTool.replaceChildren();
    const route = TOOL_ROUTES[record.tool_id];
    if (!route || record.schema_version !== 1) return;
    const button = element("button", { type: "button", text: `Open ${title}` });
    button.addEventListener("click", () => {
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(record));
        global.location.assign(route);
      } catch (_error) {
        setMessage("This progress could not be handed off to the other tool.", true);
      }
    });
    active.wrongTool.append(button);
  }

  function consumeHandoff() {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(HANDOFF_KEY);
      const parsed = parseProgress(raw);
      if (!parsed.ok || parsed.record.tool_id !== active.config.toolId) return;
      const checked = validateForTool(parsed.record, active.config);
      if (!checked.ok) {
        setMessage(validationMessage(checked.code), true);
        return;
      }
      active.config.setState(clone(checked.state));
      if (active.config.browserAutosave !== false) saveDraftNow();
      setMessage("Progress opened in the correct tool.");
    } catch (_error) {
      setMessage("The transferred progress could not be opened.", true);
    }
  }

  function renderMarkdownArticle(markdown, title) {
    const article = element("article", { className: "skill-progress-print" });
    article.setAttribute("aria-label", `${title} printable summary`);
    String(markdown).split(/\r?\n/).forEach((raw) => {
      const line = raw.trimEnd();
      if (!line) return;
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const bullet = line.match(/^[-*]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (heading) article.append(element(`h${heading[1].length}`, { text: heading[2] }));
      else if (bullet) article.append(element("p", { text: `• ${bullet[1]}` }));
      else if (numbered) article.append(element("p", { text: line }));
      else article.append(element("p", { text: line }));
    });
    return article;
  }

  function printSummary() {
    const record = currentRecord();
    const summary = active.config.getReadableSummary(record.state);
    const article = renderMarkdownArticle(`${summary}\n\nSaved: ${localSavedLabel(new Date(record.saved_at))}`, record.tool_title);
    document.body.append(article);
    document.body.classList.add("skill-progress-printing");
    const cleanup = () => {
      document.body.classList.remove("skill-progress-printing");
      article.remove();
      global.removeEventListener("afterprint", cleanup);
    };
    global.addEventListener("afterprint", cleanup);
    global.print();
    global.setTimeout(cleanup, 1000);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) { return [value & 255, (value >>> 8) & 255]; }
  function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
  function concatBytes(parts) {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    parts.forEach((part) => { result.set(part, offset); offset += part.length; });
    return result;
  }

  function zipStore(files) {
    const encoder = new TextEncoder();
    const local = [];
    const central = [];
    let offset = 0;
    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(content);
      const crc = crc32(data);
      const localHeader = new Uint8Array([
        ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0),
      ]);
      local.push(localHeader, nameBytes, data);
      const centralHeader = new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ]);
      central.push(centralHeader, nameBytes);
      offset += localHeader.length + nameBytes.length + data.length;
    });
    const centralBytes = concatBytes(central);
    const end = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(Object.keys(files).length), ...u16(Object.keys(files).length),
      ...u32(centralBytes.length), ...u32(offset), ...u16(0),
    ]);
    return concatBytes([...local, centralBytes, end]);
  }

  function xmlEscape(value) {
    return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  }

  function markdownToWordXml(markdown) {
    return String(markdown).split(/\r?\n/).filter((line) => line.trim()).map((line) => {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const bullet = line.match(/^[-*]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      const style = heading ? `<w:pStyle w:val="Heading${heading[1].length}"/>` : "";
      const text = heading ? heading[2] : bullet ? `• ${bullet[1]}` : numbered ? line : line;
      return `<w:p><w:pPr>${style}</w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
    }).join("");
  }

  function makeDocx(title, markdown, savedAt = new Date()) {
    const body = markdownToWordXml(`${markdown}\n\nSaved: ${localSavedLabel(savedAt)}`);
    const files = {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
      "word/styles.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>',
    };
    return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  function exportDocx() {
    try {
      const record = currentRecord();
      const base = sanitizeFilename(active.filename.value || localFilename(active.config.toolId));
      download(`${base}.docx`, makeDocx(record.tool_title, active.config.getReadableSummary(record.state), new Date(record.saved_at)));
      setMessage(`Exported ${base}.docx.`);
    } catch (_error) {
      setMessage("The DOCX could not be created. You can still save Markdown or print to PDF.", true);
    }
  }

  function buildUi(config) {
    const backdrop = element("div", { className: "skill-progress-backdrop" });
    backdrop.hidden = true;
    const drawer = element("aside", { className: "skill-progress-drawer", attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "skill-progress-heading" } });
    drawer.hidden = true;
    const heading = element("h2", { text: "Save progress", attrs: { id: "skill-progress-heading" } });
    const filenameLabel = element("label", { text: "File name", attrs: { for: "skill-progress-filename" } });
    const filename = element("input", { type: "text", attrs: { id: "skill-progress-filename", autocomplete: "off", maxlength: "100" } });
    const saveActions = element("div", { className: "skill-progress-actions" });
    const saveMarkdown = element("button", { type: "button", text: "Save Markdown" });
    const saveJson = element("button", { type: "button", text: "Save JSON" });
    saveActions.append(saveMarkdown, saveJson);

    const openSection = element("section");
    openSection.append(element("h3", { text: "Open previous progress" }));
    const fileLabel = element("label", { text: "Choose progress file", attrs: { for: "skill-progress-file" } });
    const fileInput = element("input", { type: "file", attrs: { id: "skill-progress-file", accept: ".md,.json,text/markdown,application/json" } });
    const wrongTool = element("div", { className: "skill-progress-actions" });
    openSection.append(fileLabel, fileInput, wrongTool);

    const exportSection = element("section");
    exportSection.append(element("h3", { text: "Export" }));
    const exportActions = element("div", { className: "skill-progress-actions" });
    const docx = element("button", { type: "button", text: "Export DOCX" });
    const print = element("button", { type: "button", text: "Print / Save as PDF" });
    exportActions.append(docx, print);
    exportSection.append(exportActions);

    let browserSection = null;
    let lastSavedText = null;
    let clearButton = null;
    if (config.browserAutosave !== false) {
      browserSection = element("section");
      browserSection.append(element("h3", { text: "Browser progress" }));
      const savedLine = element("p");
      savedLine.append(document.createTextNode("Last automatically saved: "));
      lastSavedText = element("strong", { text: "Not yet saved" });
      savedLine.append(lastSavedText);
      clearButton = element("button", { type: "button", text: "Clear browser progress" });
      browserSection.append(savedLine, clearButton);
    }

    const privacySection = element("section");
    privacySection.append(element("h3", { text: "Privacy" }), element("p", { className: "skill-progress-privacy", text: config.privacyText || "Your progress stays on this device unless you save a copy to your computer. Nothing you enter here is uploaded." }));
    const message = element("p", { className: "skill-progress-status", attrs: { role: "status", "aria-live": "polite" } });
    const close = element("button", { type: "button", text: "Close" });
    drawer.append(heading, filenameLabel, filename, saveActions, openSection, exportSection);
    if (browserSection) drawer.append(browserSection);
    drawer.append(privacySection, message, close);
    document.body.append(backdrop, drawer);

    saveMarkdown.addEventListener("click", () => saveFile("md"));
    saveJson.addEventListener("click", () => saveFile("json"));
    fileInput.addEventListener("change", () => loadFile(fileInput.files?.[0]));
    docx.addEventListener("click", exportDocx);
    print.addEventListener("click", printSummary);
    clearButton?.addEventListener("click", () => clearDraft(true));
    close.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDrawer();
      if (event.key !== "Tab") return;
      const focusable = [...drawer.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return { backdrop, drawer, filename, fileInput, wrongTool, lastSavedText, clearButton, message };
  }

  function ensurePageControls() {
    if (!active) return;
    const header = active.config.root.querySelector(".skill-app-header");
    if (header && !header.querySelector("[data-skill-progress-open]")) {
      const heading = header.querySelector("h2");
      if (heading) {
        const row = element("div", { className: "skill-progress-title-row" });
        heading.before(row);
        row.append(heading);
        const open = element("button", { className: "secondary skill-progress-open", type: "button", text: "Open previous progress", attrs: { "data-skill-progress-open": "" } });
        open.addEventListener("click", () => { openDrawer(open); openFilePicker(); });
        row.append(open);
      }
    }
    const footer = active.config.root.querySelector(".skill-app-footer") || active.config.root.querySelector(".skill-app-shell");
    if (footer && !active.config.root.querySelector("[data-skill-progress-final]")) {
      const area = element("section", { className: "skill-progress-final", attrs: { "data-skill-progress-final": "" } });
      area.append(element("h3", { text: active.config.finalHeading || "Save your work" }));
      const actions = element("div", { className: "skill-progress-final-actions" });
      const md = element("button", { type: "button", text: "Save Markdown" });
      const docx = element("button", { type: "button", text: "Export DOCX" });
      const print = element("button", { type: "button", text: "Print / Save as PDF" });
      md.addEventListener("click", () => saveFile("md"));
      docx.addEventListener("click", exportDocx);
      print.addEventListener("click", printSummary);
      actions.append(md, docx, print);
      if (active.config.showFinalStartAgain !== false) {
        const restart = element("button", { className: "secondary", type: "button", text: "Start again" });
        restart.addEventListener("click", startOver);
        actions.append(restart);
      }
      area.append(actions);
      footer.append(area);
    }
    const draft = active.config.browserAutosave === false ? null : readDraft();
    let prompt = active.config.root.previousElementSibling;
    if (draft && !prompt?.matches?.("[data-skill-progress-draft]")) {
      prompt = element("aside", { className: "skill-progress-draft-prompt", attrs: { "data-skill-progress-draft": "", "aria-label": "Previous browser progress" } });
      const text = element("p", { text: "Previous browser progress found" });
      const resume = element("button", { type: "button", text: "Continue" });
      const start = element("button", { className: "secondary", type: "button", text: "Start over" });
      resume.addEventListener("click", continueDraft);
      start.addEventListener("click", startOver);
      prompt.append(text, resume, start);
      active.config.root.before(prompt);
    } else if (!draft && prompt?.matches?.("[data-skill-progress-draft]")) prompt.remove();
  }

  function registerTool(config) {
    const required = ["getState", "setState", "validateState", "getReadableSummary"];
    if (!config || !config.root || !TOOL_ROUTES[config.toolId] || required.some((name) => typeof config[name] !== "function")) {
      throw new Error("Invalid Therapy Skill Kit progress adapter");
    }
    if (!Number.isInteger(config.schemaVersion) || config.schemaVersion < 1 || config.route !== TOOL_ROUTES[config.toolId]) {
      throw new Error("Invalid Therapy Skill Kit progress identity");
    }
    if (active && active.config.root !== config.root) throw new Error("Only one interactive progress tool can be active per page");
    if (active?.observer) active.observer.disconnect();
    active = { config, initialState: clone(config.getState()), lastSaved: null, ...buildUi(config) };
    if (config.showFloating !== false) {
      const floating = element("button", { className: "skill-progress-floating", type: "button", text: "Save progress", attrs: { "data-skill-progress-floating": "", "aria-haspopup": "dialog" } });
      floating.addEventListener("click", () => openDrawer(floating));
      document.body.append(floating);
      active.floating = floating;
    }
    if (config.browserAutosave !== false) {
      config.root.addEventListener("input", scheduleDraft);
      config.root.addEventListener("change", scheduleDraft);
      config.root.addEventListener("click", scheduleDraft);
    }
    active.observer = new MutationObserver(() => ensurePageControls());
    active.observer.observe(config.root, { childList: true, subtree: true });
    try {
      if (config.browserAutosave !== false && config.legacyState && config.validateState(config.legacyState) && !localStorage.getItem(STORAGE_PREFIX + config.toolId)) {
        localStorage.setItem(STORAGE_PREFIX + config.toolId, JSON.stringify(makeRecord(config, config.legacyState)));
      }
    } catch (_error) {
      // The tool remains usable when browser storage is unavailable or legacy data is invalid.
    }
    ensurePageControls();
    updateDraftUi();
    consumeHandoff();
    return { notifyChange: scheduleDraft, saveDraft: saveDraftNow, open: () => openDrawer(active.floating) };
  }

  function nonEmptySections(title, sections) {
    const lines = [`# ${title}`];
    sections.forEach(([heading, value]) => {
      const values = Array.isArray(value) ? value.filter((item) => String(item ?? "").trim()) : [value].filter((item) => String(item ?? "").trim());
      if (!values.length) return;
      lines.push("", `## ${heading}`, "");
      if (Array.isArray(value)) values.forEach((item) => lines.push(`- ${item}`));
      else lines.push(String(value));
    });
    return lines.join("\n");
  }

  const api = {
    FORMAT, STORAGE_PREFIX, TOOL_ROUTES, MAX_FILE_SIZE,
    registerTool, makeRecord, serializeJson, serializeMarkdown, parseProgress, validateForTool,
    sanitizeFilename, localFilename, nonEmptySections, makeDocx, isPlainObject,
  };
  global.TherapySkillProgress = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);

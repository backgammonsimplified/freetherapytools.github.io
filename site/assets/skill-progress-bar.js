(function () {
  "use strict";

  const APP_SELECTOR = ".skill-app";
  const AREA_SELECTOR = "[data-skill-progress-final]";

  function buttonByText(root, text) {
    return [...root.querySelectorAll("button")].find((button) => button.textContent.trim() === text) || null;
  }

  function ensureOpenProgressButton(app, area) {
    if (app.querySelector("[data-skill-progress-open-top]")) return;
    const fileInput = area.querySelector('input[type="file"]');
    if (!fileInput) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary skill-progress-open";
    button.textContent = "Open previous progress";
    button.setAttribute("data-skill-progress-open-top", "");
    button.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });

    const header = app.querySelector(".skill-app-header");
    if (header) {
      const heading = header.querySelector("h2");
      if (heading) {
        let row = header.querySelector(".skill-progress-title-row");
        if (!row) {
          row = document.createElement("div");
          row.className = "skill-progress-title-row";
          heading.before(row);
          row.append(heading);
        }
        row.append(button);
        return;
      }
      header.prepend(button);
      return;
    }

    const shell = app.querySelector(".skill-app-shell") || app;
    const row = document.createElement("div");
    row.className = "skill-progress-title-row skill-progress-title-row--standalone";
    row.append(button);
    shell.prepend(row);
  }

  function makePersistentBar(app, area) {
    if (area.dataset.skillProgressPersistent === "true") {
      app.classList.add("skill-progress-persistent-enabled");
      ensureOpenProgressButton(app, area);
      return;
    }

    const saveMarkdown = buttonByText(area, "Save progress (.md)");
    const exportDocx = buttonByText(area, "Export DOCX");
    const exportPdf = buttonByText(area, "Print / Save as PDF");
    if (!saveMarkdown || !exportDocx || !exportPdf) return;

    area.dataset.skillProgressPersistent = "true";
    area.classList.add("skill-progress-persistent");
    app.classList.add("skill-progress-persistent-enabled");
    area.open = true;

    const summary = area.querySelector(":scope > summary");
    if (summary) summary.hidden = true;

    exportPdf.textContent = "Export PDF";
    exportPdf.setAttribute("title", "Open the browser print dialog to save as PDF");

    const inner = document.createElement("div");
    inner.className = "skill-progress-persistent-inner";

    const label = document.createElement("div");
    label.className = "skill-progress-persistent-label";
    label.textContent = "Save your work";

    const actions = document.createElement("div");
    actions.className = "skill-progress-bar-actions";
    actions.append(saveMarkdown, exportDocx, exportPdf);

    const status = area.querySelector('[role="status"]');
    if (status) status.classList.add("skill-progress-bar-status");

    inner.append(label, actions);
    if (status) inner.append(status);
    area.append(inner);

    ensureOpenProgressButton(app, area);
  }

  function upgradeAll() {
    document.querySelectorAll(APP_SELECTOR).forEach((app) => {
      const area = app.querySelector(AREA_SELECTOR);
      if (area) makePersistentBar(app, area);
    });
  }

  const observer = new MutationObserver(upgradeAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", upgradeAll, { once: true });
  } else {
    upgradeAll();
  }
})();

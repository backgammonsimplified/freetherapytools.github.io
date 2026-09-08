(function () {
  "use strict";

  const APP_SELECTOR = ".skill-app";
  const AREA_SELECTOR = "[data-skill-progress-final]";

  function buttonByText(root, text) {
    return [...root.querySelectorAll("button")].find((button) => button.textContent.trim() === text) || null;
  }

  function syncPersistentBarGeometry(app, area) {
    const shell = app.querySelector(".skill-app-shell") || app;
    const rect = shell.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const gutter = viewportWidth <= 700 ? 8 : 16;
    const left = Math.max(gutter, rect.left);
    const right = Math.min(viewportWidth - gutter, rect.right);
    const width = Math.max(0, right - left);

    if (!width) return;
    area.style.setProperty("--skill-progress-bar-left", `${left}px`);
    area.style.setProperty("--skill-progress-bar-width", `${width}px`);
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
      syncPersistentBarGeometry(app, area);
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
    const labelTitle = document.createElement("span");
    labelTitle.textContent = "Save your work";
    const privacy = document.createElement("small");
    privacy.className = "skill-progress-persistent-privacy";
    privacy.textContent = "Your entries stay on this device. Free Therapy Tools is a static GitHub Pages site with no app server or database for entries and no analytics or tracking cookies in the site code. Save progress downloads a .md text file; use Open previous progress to select it later.";
    label.append(labelTitle, privacy);

    const actions = document.createElement("div");
    actions.className = "skill-progress-bar-actions";
    actions.append(saveMarkdown, exportDocx, exportPdf);

    const status = area.querySelector('[role="status"]');
    if (status) status.classList.add("skill-progress-bar-status");

    inner.append(label, actions);
    if (status) inner.append(status);
    area.append(inner);

    ensureOpenProgressButton(app, area);
    syncPersistentBarGeometry(app, area);
  }

  function upgradeAll() {
    document.querySelectorAll(APP_SELECTOR).forEach((app) => {
      const area = app.querySelector(AREA_SELECTOR);
      if (area) makePersistentBar(app, area);
    });
  }

  function syncAllGeometry() {
    document.querySelectorAll(APP_SELECTOR).forEach((app) => {
      const area = app.querySelector(`${AREA_SELECTOR}.skill-progress-persistent`);
      if (area) syncPersistentBarGeometry(app, area);
    });
  }

  const observer = new MutationObserver(upgradeAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", syncAllGeometry, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", upgradeAll, { once: true });
  } else {
    upgradeAll();
  }
})();

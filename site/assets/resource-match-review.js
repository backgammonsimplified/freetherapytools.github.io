(() => {
  "use strict";

  const STORAGE_KEY = "therapy-skill-kit.resource-match-review.v1";
  const DOWNLOAD_NAME = "therapy-skill-kit-match-review.json";

  function reviewEnabled() {
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    return localHosts.has(window.location.hostname)
      || new URLSearchParams(window.location.search).get("review") === "1";
  }

  function emptyState() {
    return { schema_version: 1, incorrect_matches: {} };
  }

  function readState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.schema_version === 1 && parsed.incorrect_matches) {
        return parsed;
      }
    } catch (_error) {
      // A corrupt local review value is isolated by replacing it on first edit.
    }
    return emptyState();
  }

  function writeState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function decisionFor(element) {
    return {
      match_id: element.dataset.matchId,
      source_id: element.dataset.sourceId,
      match_source: element.dataset.matchSource,
      candidate_asset: element.dataset.candidateAsset,
    };
  }

  function paintMatch(element, state) {
    const button = element.querySelector(".bs-match-review-control");
    const status = element.querySelector(".bs-match-review-status");
    const rejected = Boolean(state.incorrect_matches[element.dataset.matchId]);
    element.dataset.matchReviewState = rejected ? "incorrect" : "unflagged";
    button.setAttribute("aria-pressed", rejected ? "true" : "false");
    status.textContent = rejected ? "Marked incorrect" : "";
  }

  function paintAll() {
    const state = readState();
    document.querySelectorAll(".bs-resource-match").forEach((element) => paintMatch(element, state));
    document.querySelectorAll("[data-match-review-incorrect-count]").forEach((element) => {
      element.textContent = String(Object.keys(state.incorrect_matches).length);
    });
  }

  function toggleMatch(element) {
    const state = readState();
    const matchId = element.dataset.matchId;
    if (state.incorrect_matches[matchId]) {
      delete state.incorrect_matches[matchId];
    } else {
      state.incorrect_matches[matchId] = decisionFor(element);
    }
    writeState(state);
    paintAll();
  }

  function exportDecisions(dashboard) {
    const state = readState();
    const confirmation = dashboard.querySelector("[data-match-review-complete]");
    const payload = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      match_inventory_version: dashboard.dataset.matchInventoryVersion,
      review_complete: Boolean(confirmation && confirmation.checked),
      incorrect_matches: Object.values(state.incorrect_matches),
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = DOWNLOAD_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!reviewEnabled()) {
      return;
    }
    document.documentElement.classList.add("bs-match-review-enabled");
    document.querySelectorAll(".bs-match-review-control, [data-review-only]").forEach((element) => {
      element.hidden = false;
    });
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".bs-match-review-control");
      if (button) {
        toggleMatch(button.closest(".bs-resource-match"));
      }
    });
    document.querySelectorAll("[data-match-review-dashboard]").forEach((dashboard) => {
      dashboard.querySelector("[data-export-match-review]")?.addEventListener("click", () => {
        exportDecisions(dashboard);
      });
      dashboard.querySelector("[data-clear-match-review]")?.addEventListener("click", () => {
        writeState(emptyState());
        const confirmation = dashboard.querySelector("[data-match-review-complete]");
        if (confirmation) confirmation.checked = false;
        paintAll();
      });
    });
    paintAll();
  });
})();

(function () {
  "use strict";

  const GOOGLE_VIEWER = "https://docs.google.com/gview";
  const PRODUCTION_ORIGIN = "https://freetherapytools.github.io";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

  function isDocxLink(anchor) {
    const href = String(anchor.getAttribute("href") || "").trim();
    return /\.docx(?:$|[?#])/i.test(href);
  }

  function publicDocxUrl(anchor) {
    try {
      const url = new URL(anchor.getAttribute("href"), document.baseURI);
      if (!/^https?:$/.test(url.protocol)) return null;

      if (LOCAL_HOSTS.has(url.hostname)) {
        return `${PRODUCTION_ORIGIN}${url.pathname}${url.search}`;
      }

      return url.href;
    } catch (_error) {
      return null;
    }
  }

  function googleDocsUrl(docxUrl) {
    const viewer = new URL(GOOGLE_VIEWER);
    viewer.searchParams.set("url", docxUrl);
    return viewer.href;
  }

  function companionLink(anchor, docxUrl) {
    const link = document.createElement("a");
    link.href = googleDocsUrl(docxUrl);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.googleDocsDocx = "true";
    link.title = "Open this public DOCX in Google's document viewer. Editing requires saving or uploading a copy to Google Drive.";

    const fileName = (() => {
      try {
        return decodeURIComponent(new URL(docxUrl).pathname.split("/").filter(Boolean).at(-1) || "DOCX");
      } catch (_error) {
        return "DOCX";
      }
    })();
    link.setAttribute("aria-label", `Open ${fileName} in Google Docs`);

    if (anchor.classList.contains("btn")) {
      link.className = "btn btn-outline-secondary";
      if (anchor.classList.contains("btn-sm")) link.classList.add("btn-sm");
      link.textContent = "Open in Google Docs";
      link.style.marginInlineStart = "0.5rem";
      link.style.marginBlock = "0.25rem";
      return link;
    }

    link.textContent = "Open in Google Docs";
    link.className = "small";
    link.style.marginInlineStart = "0.35rem";
    return link;
  }

  function enhance(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.dataset.googleDocsEnhanced === "true") return;
    if (anchor.dataset.noGoogleDocs === "true") return;
    if (!isDocxLink(anchor)) return;

    const docxUrl = publicDocxUrl(anchor);
    if (!docxUrl) return;

    anchor.dataset.googleDocsEnhanced = "true";

    const next = anchor.nextElementSibling;
    if (next?.matches?.('[data-google-docs-docx="true"]')) return;

    anchor.insertAdjacentElement("afterend", companionLink(anchor, docxUrl));
  }

  function enhanceWithin(root) {
    if (!root) return;
    if (root instanceof HTMLAnchorElement) enhance(root);
    root.querySelectorAll?.("a[href]").forEach(enhance);
  }

  function start() {
    enhanceWithin(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) enhanceWithin(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

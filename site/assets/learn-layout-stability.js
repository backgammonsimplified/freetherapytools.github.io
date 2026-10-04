(function () {
  "use strict";

  const PLACEHOLDER_CLASS = "bs-learn-toc-layout-placeholder";
  const reservedWidths = new WeakMap();
  let scheduled = false;

  function isDesktopRail(rail) {
    if (!rail || typeof rail.getBoundingClientRect !== "function") return false;
    const rect = rail.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function railFor(toc) {
    return toc.closest("#quarto-margin-sidebar, .margin-sidebar") || toc.parentElement;
  }

  function clearPlaceholder(toc) {
    if (!toc.classList.contains(PLACEHOLDER_CLASS)) return;
    toc.classList.remove(PLACEHOLDER_CLASS);
    toc.style.removeProperty("visibility");
    toc.style.removeProperty("pointer-events");
    toc.style.removeProperty("min-height");
    if (toc.getAttribute("aria-hidden") === "true") {
      toc.removeAttribute("aria-hidden");
    }
  }

  function stabilizeToc(toc) {
    const rail = railFor(toc);
    if (!rail) return;

    const hasHeadingLinks = Boolean(toc.querySelector('a[href^="#"]'));
    const laidOut = isDesktopRail(rail);

    if (hasHeadingLinks && !toc.hidden && laidOut) {
      const width = rail.getBoundingClientRect().width;
      if (width > 0) {
        reservedWidths.set(rail, width);
        rail.style.minWidth = `${width}px`;
      }
      clearPlaceholder(toc);
      return;
    }

    const reservedWidth = reservedWidths.get(rail) || 0;
    if (!hasHeadingLinks && toc.hidden && reservedWidth > 0) {
      rail.style.minWidth = `${reservedWidth}px`;
      toc.hidden = false;
      toc.setAttribute("aria-hidden", "true");
      toc.classList.add(PLACEHOLDER_CLASS);
      toc.style.visibility = "hidden";
      toc.style.pointerEvents = "none";
      toc.style.minHeight = "1px";
    }
  }

  function stabilizeAll() {
    scheduled = false;
    if (!document.body || !document.body.classList.contains("bs-learn-article")) return;
    document.querySelectorAll("#TOC").forEach(stabilizeToc);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(stabilizeAll);
  }

  function resetForResize() {
    document.querySelectorAll("#quarto-margin-sidebar, .margin-sidebar").forEach((rail) => {
      rail.style.removeProperty("min-width");
      reservedWidths.delete(rail);
    });
    schedule();
  }

  function start() {
    if (!document.body || !document.body.classList.contains("bs-learn-article")) return;

    stabilizeAll();

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "aria-hidden"]
    });

    window.addEventListener("resize", resetForResize, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

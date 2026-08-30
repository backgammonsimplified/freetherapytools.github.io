(function (global) {
  "use strict";

  const PROJECT_SEGMENT = "freetherapytools.github.io";

  function normalizeBase(value) {
    const text = String(value || "").trim();
    if (!text || text === "/") return "";
    return `/${text.replace(/^\/+|\/+$/g, "")}`;
  }

  function detectBase(locationLike = global.location, configuredBase = "") {
    const configured = normalizeBase(configuredBase);
    if (configured) return configured;
    const hostname = String(locationLike?.hostname || "").toLowerCase();
    const pathname = String(locationLike?.pathname || "/");
    const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
    if (hostname === "backgammonsimplified.github.io" && firstSegment.toLowerCase() === PROJECT_SEGMENT) {
      return `/${PROJECT_SEGMENT}`;
    }
    return "";
  }

  function configuredBase(documentLike = global.document) {
    const meta = documentLike?.querySelector?.('meta[name="therapy-site-base"]');
    return meta?.getAttribute("content") || documentLike?.documentElement?.dataset?.siteBase || "";
  }

  const basePath = detectBase(global.location, configuredBase());

  function path(value, base = basePath) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return value;
    const normalized = normalizeBase(base);
    if (!normalized || value === normalized || value.startsWith(`${normalized}/`)) return value;
    return `${normalized}${value}`;
  }

  function canonicalPath(value, base = basePath) {
    if (typeof value !== "string") return value;
    const normalized = normalizeBase(base);
    if (!normalized) return value;
    if (value === normalized) return "/";
    return value.startsWith(`${normalized}/`) ? value.slice(normalized.length) : value;
  }

  const URL_ATTRIBUTES = ["href", "src", "poster", "action", "formaction"];

  function resolveElement(element) {
    if (!element?.getAttribute || !element?.setAttribute) return;
    URL_ATTRIBUTES.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      const resolved = path(current);
      if (resolved !== current) element.setAttribute(attribute, resolved);
    });
  }

  function resolveTree(root = global.document) {
    if (!root?.querySelectorAll) return root;
    if (root.nodeType === 1) resolveElement(root);
    root.querySelectorAll(URL_ATTRIBUTES.map((name) => `[${name}]`).join(",")).forEach(resolveElement);
    return root;
  }

  function observe(documentLike = global.document) {
    if (!documentLike?.documentElement || typeof global.MutationObserver !== "function") return null;
    resolveTree(documentLike);
    const observer = new global.MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "attributes") resolveElement(record.target);
        record.addedNodes?.forEach((node) => {
          if (node.nodeType === 1) resolveTree(node);
        });
      });
    });
    observer.observe(documentLike.documentElement, {
      attributes: true,
      attributeFilter: URL_ATTRIBUTES,
      childList: true,
      subtree: true,
    });
    return observer;
  }

  const api = Object.freeze({ PROJECT_SEGMENT, basePath, detectBase, normalizeBase, path, canonicalPath, resolveElement, resolveTree, observe });
  global.TherapySite = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  observe();
})(typeof window === "undefined" ? globalThis : window);

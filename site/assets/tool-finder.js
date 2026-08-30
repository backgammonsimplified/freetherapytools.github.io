(function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  const normalize = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const searchable = (entry) => normalize([entry.name, ...(entry.aliases || []), entry.official_topic, entry.subtopic, entry.summary, ...(entry.search_terms || [])].filter(Boolean).join(" "));
  const button = (href, label, primary) => `<a class="btn btn-sm ${primary ? "btn-primary" : "btn-outline-primary"}" href="${esc(href)}">${esc(label)}</a>`;
  function card(entry) {
    const availableTool = entry.kind === "tool" && entry.status === "available" && entry.tool_href;
    const badge = entry.kind === "tool" ? (entry.tool_type || "tool") : "skill";
    return `<article class="tool-finder-card" data-tool-finder-entry="${esc(entry.id)}"><div class="tool-finder-card-heading"><h3>${esc(entry.name)}</h3><span>${esc(badge)}</span></div>${entry.subtopic ? `<p class="tool-finder-subtopic">${esc(entry.subtopic)}</p>` : ""}<p>${esc(entry.summary)}</p><div class="tool-finder-actions">${availableTool ? button(entry.tool_href, "Open tool", true) : ""}${button(entry.learn_href, "Learn the skill", false)}${entry.status === "planned" ? '<span class="tool-finder-planned">Interactive tool: Planned/TBD</span>' : ""}</div></article>`;
  }
  async function init() {
    const host = document.querySelector("[data-tool-finder-catalogue]");
    if (!host) return;
    const catalogueResponse = await fetch("/data/tool-finder/catalogue.json");
    if (!catalogueResponse.ok) throw new Error("Tool Finder data could not be loaded");
    const catalogue = await catalogueResponse.json();
    const search = document.querySelector("[data-tool-finder-search]");
    const count = document.querySelector("[data-tool-finder-count]");
    const empty = document.querySelector("[data-tool-finder-empty]");
    let kind = "all";
    function render() {
      const query = normalize(search.value.trim());
      let shown = 0;
      host.innerHTML = catalogue.topics.map((topic) => {
        const entries = catalogue.entries.filter((entry) => !entry.featured_on_home && entry.official_topic === topic && (kind === "all" || entry.kind === kind) && (!query || searchable(entry).includes(query)));
        shown += entries.length;
        return entries.length ? `<section class="tool-finder-topic" data-tool-finder-topic="${esc(topic)}"><h2>${esc(topic)} Tools</h2><div class="tool-finder-grid">${entries.map(card).join("")}</div></section>` : "";
      }).join("");
      count.textContent = `${shown} ${shown === 1 ? "result" : "results"}`;
      empty.hidden = shown !== 0;
      host.setAttribute("aria-busy", "false");
    }
    search.addEventListener("input", render);
    document.querySelectorAll("[data-tool-finder-kind]").forEach((control) => control.addEventListener("click", () => {
      kind = control.dataset.toolFinderKind;
      document.querySelectorAll("[data-tool-finder-kind]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === control)));
      render();
    }));
    render();
  }
  document.addEventListener("DOMContentLoaded", () => init().catch((error) => {
    const count = document.querySelector("[data-tool-finder-count]");
    if (count) count.textContent = "The catalogue could not be loaded.";
    console.error(error);
  }));
}());

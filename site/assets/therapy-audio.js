(function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
  async function init() {
    const hosts = [...document.querySelectorAll("[data-therapy-audio]")];
    if (!hosts.length) return;
    const response = await fetch("/data/audio/recordings.json");
    if (!response.ok) throw new Error("Audio metadata could not be loaded");
    const records = new Map((await response.json()).recordings.map((record) => [record.id, record]));
    hosts.forEach((host) => {
      const record = records.get(host.dataset.therapyAudio);
      if (!record) return;
      const source = `<p class="therapy-audio-source">Source: <a href="${esc(record.source_url)}">${esc(record.source_name)} — ${esc(record.source_url)}</a></p>`;
      const player = record.local_href ? `<audio controls preload="none" aria-label="${esc(record.title)}"><source src="${esc(record.local_href)}" type="audio/mpeg">Your browser does not support audio playback.</audio><p><a href="${esc(record.local_href)}" download>Download ${esc(record.title)} audio</a></p>` : `<p><a href="${esc(record.source_url)}">Open this recording on ${esc(record.source_name)}</a></p>`;
      host.classList.add("therapy-audio-block");
      host.innerHTML = `<h3>${esc(record.title)}</h3><p>${esc(record.description)}</p>${source}${player}`;
    });
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
}());

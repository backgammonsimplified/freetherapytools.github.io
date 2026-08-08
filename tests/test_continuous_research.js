const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const research = require("../site/assets/bs-research-scroll.js");

const manifest = {
  schema_version: 1,
  articles: [
    {
      sequence_index: 0,
      route: "/research/alpha.html",
      title: "Alpha",
      previous_route: null,
      next_route: "/research/beta.html"
    },
    {
      sequence_index: 1,
      route: "/research/beta.html",
      title: "Beta",
      previous_route: "/research/alpha.html",
      next_route: null
    }
  ]
};

assert.equal(
  research.findCurrentArticle(manifest, "/research/alpha.html?x=1").title,
  "Alpha"
);
assert.equal(
  research.nextArticle(
    manifest,
    research.findCurrentArticle(manifest, "/research/alpha.html")
  ).title,
  "Beta"
);
assert.equal(
  research.nextArticle(
    manifest,
    research.findCurrentArticle(manifest, "/research/beta.html")
  ),
  null
);
assert.equal(
  research.idPrefixForArticle("/research/Article One.html"),
  "bs-research-scroll-article-one-"
);

const source = fs.readFileSync(
  path.join(__dirname, "../site/assets/bs-research-scroll.js"),
  "utf8"
);
for (const required of [
  "bs-research-scroll-sentinel",
  "data-bs-toc-toggle-divider",
  "IntersectionObserver",
  "rewriteIdReferences",
  "rewriteResourceUrls",
  "captureArticleToc",
  "replaceTocContents",
  "dataset.bsResearchScrollMarker"
]) {
  assert.ok(source.includes(required), `Research scroll includes ${required}`);
}
assert.ok(
  source.includes("!nextDocument.body.classList.contains(\"bs-research-article\")"),
  "fetched pages must remain Research articles"
);

console.log("continuous Research helper tests passed");

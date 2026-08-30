"use strict";

const assert = require("assert");
const Site = require("../site/assets/site-path.js");

assert.strictEqual(Site.detectBase({ hostname: "localhost", pathname: "/tool-finder/" }), "");
assert.strictEqual(Site.detectBase({ hostname: "127.0.0.1", pathname: "/learn/" }), "");
assert.strictEqual(Site.detectBase({ hostname: "example.org", pathname: "/tool-finder/" }), "");
assert.strictEqual(
  Site.detectBase({ hostname: "backgammonsimplified.github.io", pathname: "/freetherapytools.github.io/tool-finder/" }),
  "/freetherapytools.github.io",
);
assert.strictEqual(Site.path("/tool-finder/values/", ""), "/tool-finder/values/");
assert.strictEqual(
  Site.path("/tool-finder/values/", "/freetherapytools.github.io"),
  "/freetherapytools.github.io/tool-finder/values/",
);
assert.strictEqual(
  Site.path("/learn/wellness/urge-surfing.html", "/freetherapytools.github.io"),
  "/freetherapytools.github.io/learn/wellness/urge-surfing.html",
);
assert.strictEqual(
  Site.path("/resources/audio/sober-space.mp3", "/freetherapytools.github.io"),
  "/freetherapytools.github.io/resources/audio/sober-space.mp3",
);
assert.strictEqual(Site.path("https://example.org/", "/freetherapytools.github.io"), "https://example.org/");
assert.strictEqual(Site.path("#section", "/freetherapytools.github.io"), "#section");
assert.strictEqual(
  Site.path("/freetherapytools.github.io/glossary/", "/freetherapytools.github.io"),
  "/freetherapytools.github.io/glossary/",
);

console.log("site-path tests passed");

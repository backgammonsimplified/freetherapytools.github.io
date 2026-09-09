const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("site/assets/docx-google-docs.js", "utf8");
function harness(baseURI) {
  const anchors = [];
  let notify;
  class Anchor {
    constructor(href) {
      this.attrs = { href }; this.dataset = {}; this.style = {}; this.nodeType = 1;
      this.classList = { contains: () => false, add() {} };
    }
    getAttribute(key) { return this.attrs[key]; }
    setAttribute(key, value) { this.attrs[key] = value; }
    insertAdjacentElement(_position, link) { this.nextElementSibling = link; anchors.push(link); }
    matches() { return this.dataset.googleDocsDocx === "true"; }
    querySelectorAll() { return []; }
  }
  const document = {
    baseURI, body: {}, readyState: "complete",
    querySelectorAll: () => anchors.slice(), createElement: () => new Anchor()
  };
  const add = (href, data = {}) => {
    const link = new Anchor(href); Object.assign(link.dataset, data);
    anchors.push(link); return link;
  };
  vm.runInNewContext(source, {
    URL, Set, document, HTMLAnchorElement: Anchor, Node: { ELEMENT_NODE: 1 },
    MutationObserver: class {
      constructor(callback) { notify = callback; }
      observe() {}
    }
  });
  return { add, notify: (node) => notify([{ addedNodes: [node] }]), anchors };
}
const site = "https://backgammonsimplified.github.io/freetherapytools.github.io";
for (const base of ["http://localhost:8080/", "http://127.0.0.1:8080/freetherapytools.github.io/", "http://[::1]:8080/", site + "/"]) {
  const h = harness(base);
  const a = h.add("resources/original/test.docx");
  h.notify(a); h.notify(a);
  const companion = a.nextElementSibling;
  assert.ok(companion, base);
  assert.equal(new URL(companion.href).searchParams.get("url"), site + "/resources/original/test.docx");
  assert.equal(companion.target, "_blank");
  assert.equal(companion.rel, "noopener noreferrer");
  h.notify(companion);
  assert.equal(h.anchors.length, 2, "exactly one companion, including observer callbacks");
}
const h = harness("http://localhost:8080/");
for (const href of ["blob:http://localhost/a.docx", "data:application/vnd.docx", "https://docs.google.com/gview?url=https://example.org/a.docx", "/image.png?download=file.docx"]) {
  const a = h.add(href); h.notify(a); assert.equal(a.nextElementSibling, undefined, href);
}
const optOut = h.add("/resources/private.docx", { noGoogleDocs: "true" });
h.notify(optOut); assert.equal(optOut.nextElementSibling, undefined);
const remote = h.add("https://example.org/public.docx?version=2");
h.notify(remote);
assert.equal(new URL(remote.nextElementSibling.href).searchParams.get("url"), "https://example.org/public.docx?version=2");
console.log("PASS: Google Docs helper public URLs, project paths, IPv6, opt-out, blob exclusion and duplicate prevention.");

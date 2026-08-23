"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const learn = require(path.join(root, "site", "assets", "bs-learn.js"));

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.contains(name) : Boolean(force);
    if (enabled) this.add(name);
    else this.remove(name);
    return enabled;
  }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, value);
  }

  removeProperty(name) {
    this.values.delete(name);
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.style = new FakeStyle();
    this.hidden = false;
    this.disabled = false;
    this.scrollTop = 0;
    this.offsetWidth = 88;
    this.textContent = "";
  }

  set className(value) {
    this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get className() {
    return Array.from(this.classList.values).join(" ");
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set innerHTML(value) {
    this.children = [];
    if (String(value).includes("data-bs-sidebar-collapse-all")) {
      const collapse = new FakeElement("button");
      collapse.dataset.bsSidebarCollapseAll = "";
      collapse.textContent = "Collapse all";
      const expand = new FakeElement("button");
      expand.dataset.bsSidebarExpandAll = "";
      expand.textContent = "Expand all";
      this.append(collapse, expand);
    }
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  prepend(child) {
    child.parentElement = this;
    this.children.unshift(child);
  }

  addEventListener(name, callback) {
    const callbacks = this.listeners.get(name) || [];
    callbacks.push(callback);
    this.listeners.set(name, callbacks);
  }

  click() {
    (this.listeners.get("click") || []).forEach((callback) =>
      callback({ target: this })
    );
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return { top: 64, right: 280, bottom: 800, left: 0, width: 280, height: 736 };
  }

  matchesSelector(selector) {
    if (selector === ".sidebar-menu-container") {
      return this.classList.contains("sidebar-menu-container");
    }
    if (selector === ".sidebar-item-section") {
      return this.classList.contains("sidebar-item-section");
    }
    if (selector === ".bs-learn-sidebar-actions") {
      return this.classList.contains("bs-learn-sidebar-actions");
    }
    if (selector === ".sidebar-link.active") {
      return (
        this.classList.contains("sidebar-link") && this.classList.contains("active")
      );
    }
    if (selector === "[data-bs-sidebar-collapse-all]") {
      return Object.hasOwn(this.dataset, "bsSidebarCollapseAll");
    }
    if (selector === "[data-bs-sidebar-expand-all]") {
      return Object.hasOwn(this.dataset, "bsSidebarExpandAll");
    }
    return false;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      node.children.forEach((child) => {
        if (child.matchesSelector(selector)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    if (selector.includes(".sidebar-item-toggle") && this.sidebarToggle) {
      return this.sidebarToggle;
    }
    return this.querySelectorAll(selector)[0] || null;
  }
}

function renderedSidebarFixture(relativePath) {
  const htmlPath = path.join(root, "site", "_site", ...relativePath.split("/"));
  assert.ok(fs.existsSync(htmlPath), `rendered fixture is missing: ${relativePath}`);
  const html = fs.readFileSync(htmlPath, "utf8");
  assert.match(html, /id="quarto-sidebar"/);
  assert.match(html, /class="sidebar-menu-container"/);
  assert.match(html, /id="quarto-margin-sidebar"/);
  assert.match(html, /id="TOC"/);

  const sectionCount = (html.match(/sidebar-item sidebar-item-section/g) || []).length;
  const toggleCount = (html.match(/class="sidebar-item-toggle/g) || []).length;
  assert.ok(sectionCount > 0, `${relativePath} has no rendered sidebar sections`);
  assert.equal(toggleCount, sectionCount, `${relativePath} sidebar toggles mismatch`);

  const sidebar = new FakeElement("nav");
  sidebar.id = "quarto-sidebar";
  const menu = new FakeElement("div");
  menu.className = "sidebar-menu-container";
  sidebar.appendChild(menu);

  for (let index = 0; index < sectionCount; index += 1) {
    const section = new FakeElement("li");
    section.className = "sidebar-item sidebar-item-section";
    const link = new FakeElement("a");
    link.className = index === 0 ? "sidebar-link active" : "sidebar-link";
    section.appendChild(link);
    const toggle = new FakeElement("button");
    toggle.className = "sidebar-item-toggle";
    toggle.setAttribute("aria-expanded", "true");
    const group = new FakeElement("ul");
    group.hidden = false;
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      group.hidden = expanded;
    });
    section.sidebarToggle = toggle;
    section.append(toggle, group);
    menu.appendChild(section);
  }
  return { html, sidebar, menu };
}

const documentListeners = new Map();
const fakeBody = new FakeElement("body");
fakeBody.classList.add("bs-learn-article");
let activeSidebar = null;
global.document = {
  body: fakeBody,
  createElement: (tagName) => new FakeElement(tagName),
  getElementById(id) {
    if (id === "quarto-sidebar") return activeSidebar;
    if (id === "quarto-header") return null;
    return null;
  },
  addEventListener(name, callback) {
    const callbacks = documentListeners.get(name) || [];
    callbacks.push(callback);
    documentListeners.set(name, callbacks);
  },
  dispatchEvent(event) {
    (documentListeners.get(event.type) || []).forEach((callback) => callback(event));
  }
};
global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
global.window = {
  location: { pathname: "/learn/cube/tipp.html" },
  scrollY: 0,
  addEventListener() {},
  requestAnimationFrame(callback) {
    callback();
    return 1;
  },
  setTimeout(callback) {
    callback();
  },
  matchMedia() {
    return { matches: true, addEventListener() {} };
  },
  dispatchEvent() {}
};

for (const relativePath of [
  "learn/cube/tipp.html",
  "learn/cbt-anxiety/thinking-traps.html",
  "learn/mindfulness/what-skills.html"
]) {
  const fixture = renderedSidebarFixture(relativePath);
  activeSidebar = fixture.sidebar;
  learn.initializeLearnSidebarControls();

  const controls = fixture.menu.querySelector(".bs-learn-sidebar-actions");
  assert.ok(controls, `${relativePath} did not mount sidebar actions`);
  const collapse = controls.querySelector("[data-bs-sidebar-collapse-all]");
  const expand = controls.querySelector("[data-bs-sidebar-expand-all]");
  assert.equal(collapse.hidden, false);
  assert.equal(expand.hidden, false);
  assert.equal(collapse.disabled, false);
  assert.equal(expand.disabled, true);

  collapse.click();
  const sections = fixture.sidebar.querySelectorAll(".sidebar-item-section");
  assert.ok(
    sections.every((section) => section.sidebarToggle.getAttribute("aria-expanded") === "false"),
    `${relativePath} Collapse all did not close actual disclosure states`
  );
  assert.ok(
    sections.every((section) => section.children.at(-1).hidden),
    `${relativePath} Collapse all did not hide actual disclosure groups`
  );
  assert.equal(collapse.disabled, true);
  assert.equal(expand.disabled, false);

  expand.click();
  assert.ok(
    sections.every((section) => section.sidebarToggle.getAttribute("aria-expanded") === "true"),
    `${relativePath} Expand all did not restore actual disclosure states`
  );
  assert.ok(
    sections.every((section) => !section.children.at(-1).hidden),
    `${relativePath} Expand all did not reveal actual disclosure groups`
  );
}

const leftFixture = renderedSidebarFixture("learn/cube/tipp.html");
activeSidebar = leftFixture.sidebar;
learn.initializeLearnLeftSidebarToggle();
const wholeRailToggle = fakeBody.children.find((child) =>
  Object.hasOwn(child.dataset, "bsLearnLeftSidebarToggle")
);
assert.ok(wholeRailToggle, "whole-left-rail toggle did not mount");
assert.equal(wholeRailToggle.hidden, false, "desktop whole-left-rail toggle is hidden");
wholeRailToggle.click();
assert.equal(activeSidebar.hidden, true);
assert.equal(fakeBody.classList.contains("bs-learn-left-sidebar-collapsed"), true);
assert.equal(wholeRailToggle.getAttribute("aria-expanded"), "false");
wholeRailToggle.click();
assert.equal(activeSidebar.hidden, false);
assert.equal(fakeBody.classList.contains("bs-learn-left-sidebar-collapsed"), false);
assert.equal(wholeRailToggle.getAttribute("aria-expanded"), "true");

const lookupData = JSON.parse(
  fs.readFileSync(path.join(root, "site", "assets", "bs-glossary-lookup.json"), "utf8")
);
const wiseMind = learn.bestLookupEntry(lookupData.entries, "Wise Mind");
assert.equal(wiseMind.term, "Wise Mind");
assert.equal(wiseMind.slug, "wise-mind");
assert.match(wiseMind.short_definition, /emotion and reason/i);

console.log("Rendered navigation runtime interactions passed.");

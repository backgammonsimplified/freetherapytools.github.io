"use strict";

const assert = require("node:assert/strict");

const CATEGORY_SELECTOR = "[data-bs-filter-category]";
const TAG_SELECTOR = "[data-bs-filter-tag]";
const ITEM_SELECTOR = "[data-bs-research-item]";

function element(dataset) {
  return {
    dataset: dataset || {},
    hidden: false,
    disabled: false,
    textContent: "",
    children: [],
    classList: { toggle: function () {} },
    setAttribute: function () {},
    append: function (...children) {
      this.children.push(...children);
    },
    appendChild: function (child) {
      this.children.push(child);
      return child;
    },
    querySelector: function (selector) {
      if (selector === ".bs-research-filter-count") {
        return this.children.find(function (child) {
          return child.className === "bs-research-filter-count";
        }) || null;
      }
      return null;
    },
    closest: function (selector) {
      if (
        (selector === CATEGORY_SELECTOR && this.dataset.bsFilterCategory) ||
        (selector === TAG_SELECTOR && this.dataset.bsFilterTag)
      ) {
        return this;
      }
      return null;
    }
  };
}

const categoryCount = element();
categoryCount.className = "bs-research-filter-count";
const categoryButton = element({ bsFilterCategory: "analysis" });
categoryButton.appendChild(categoryCount);

const articleElements = [
  element({
    bsCategories: '["analysis"]',
    bsTags: '["GNU"]'
  }),
  element({
    bsCategories: '["history"]',
    bsTags: '["Sage"]'
  })
];
const tagButtons = [];
const queryCounts = { categories: 0, tags: 0 };
const tagContainer = {
  appendChild: function (button) {
    tagButtons.push(button);
  }
};
const handlers = {};
const panel = {
  querySelector: function (selector) {
    return {
      "[data-bs-tag-filters]": tagContainer,
      "[data-bs-tag-group]": element(),
      "[data-bs-result-count]": element(),
      "[data-bs-clear-filters]": element()
    }[selector] || null;
  },
  querySelectorAll: function (selector) {
    if (selector === CATEGORY_SELECTOR) {
      queryCounts.categories += 1;
      return [categoryButton];
    }
    if (selector === TAG_SELECTOR) {
      queryCounts.tags += 1;
      return tagButtons;
    }
    return [];
  },
  addEventListener: function (name, callback) {
    handlers[name] = callback;
  },
  scrollIntoView: function () {}
};
const list = {
  querySelectorAll: function (selector) {
    return selector === ITEM_SELECTOR ? articleElements : [];
  },
  addEventListener: function () {}
};

global.document = {
  createElement: function () {
    return element();
  },
  querySelector: function (selector) {
    return {
      "[data-bs-research-filters]": panel,
      "[data-bs-research-list]": list,
      "[data-bs-empty-state]": element()
    }[selector] || null;
  },
  addEventListener: function (name, callback) {
    if (name === "DOMContentLoaded") {
      callback();
    }
  }
};

require("../site/assets/bs-research-index.js");

assert.deepEqual(queryCounts, { categories: 1, tags: 1 });
assert.equal(categoryCount.textContent, "×1");
assert.equal(tagButtons.length, 2);

handlers.click({ target: categoryButton });

assert.deepEqual(
  queryCounts,
  { categories: 1, tags: 1 },
  "filter interactions reuse the initialized control lists"
);
assert.equal(articleElements[0].hidden, false);
assert.equal(articleElements[1].hidden, true);

console.log("Research filter control caching passed.");

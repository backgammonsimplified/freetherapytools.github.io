(function () {
  "use strict";

  const CATEGORY_SELECTOR = "[data-bs-filter-category]";
  const TAG_SELECTOR = "[data-bs-filter-tag]";
  const ITEM_SELECTOR = "[data-bs-research-item]";
  const CATEGORY_REGISTRY_URL = "/assets/bs-research-categories.json";

  function parseList(value) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_error) {
      return [];
    }
  }

  function createFilterButton(value, kind) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bs-research-filter bs-research-filter--" + kind;
    if (kind === "category") {
      button.dataset.bsFilterCategory = value;
    } else {
      button.dataset.bsFilterTag = value;
    }
    button.setAttribute("aria-pressed", "false");

    const label = document.createElement("span");
    label.textContent = value;

    const count = document.createElement("span");
    count.className = "bs-research-filter-count";
    count.setAttribute("aria-hidden", "true");
    count.textContent = "×0";

    button.append(label, count);
    return button;
  }

  async function applyCategoryRegistry(panel) {
    const container = panel.querySelector(
      ".bs-research-filter-group:not([data-bs-tag-group]) .bs-research-filter-options"
    );
    if (!container) {
      return;
    }

    try {
      const response = await fetch(CATEGORY_REGISTRY_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Research category registry request failed");
      }
      const payload = await response.json();
      const categories = Array.isArray(payload.categories)
        ? payload.categories.map(String).filter(Boolean)
        : [];
      if (categories.length === 0) {
        throw new Error("Research category registry is empty");
      }
      container.replaceChildren(
        ...categories.map(function (category) {
          return createFilterButton(category, "category");
        })
      );
    } catch (_error) {
      // Keep the validated source buttons as a no-network fallback.
    }
  }

  async function initializeResearchFilters() {
    const panel = document.querySelector("[data-bs-research-filters]");
    const list = document.querySelector("[data-bs-research-list]");

    if (!panel || !list) {
      return;
    }

    await applyCategoryRegistry(panel);

    const items = Array.from(list.querySelectorAll(ITEM_SELECTOR)).map(function (element) {
      return {
        element: element,
        categories: parseList(element.dataset.bsCategories),
        tags: parseList(element.dataset.bsTags)
      };
    });

    const tagContainer = panel.querySelector("[data-bs-tag-filters]");
    const tagGroup = panel.querySelector("[data-bs-tag-group]");
    const resultCount = panel.querySelector("[data-bs-result-count]");
    const clearButton = panel.querySelector("[data-bs-clear-filters]");
    const emptyState = document.querySelector("[data-bs-empty-state]");

    const allTags = Array.from(
      new Set(items.flatMap(function (item) {
        return item.tags;
      }))
    ).sort(function (left, right) {
      return left.localeCompare(right);
    });

    if (tagContainer) {
      allTags.forEach(function (tag) {
        tagContainer.appendChild(createFilterButton(tag, "tag"));
      });
    }

    if (tagGroup && allTags.length === 0) {
      tagGroup.hidden = true;
    }

    const categoryButtons = Array.from(panel.querySelectorAll(CATEGORY_SELECTOR));
    const tagButtons = Array.from(panel.querySelectorAll(TAG_SELECTOR));
    let activeCategory = "";
    let activeTag = "";

    function itemMatches(item, category, tag) {
      const categoryMatch = !category || item.categories.includes(category);
      const tagMatch = !tag || item.tags.includes(tag);
      return categoryMatch && tagMatch;
    }

    function setPressed(buttons, activeValue, datasetKey) {
      buttons.forEach(function (button) {
        const isActive = button.dataset[datasetKey] === activeValue;
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        button.classList.toggle("is-active", isActive);
      });
    }

    function updateCounts() {
      categoryButtons.forEach(function (button) {
        const category = button.dataset.bsFilterCategory || "";
        const count = items.filter(function (item) {
          return itemMatches(item, category, activeTag);
        }).length;
        const countElement = button.querySelector(".bs-research-filter-count");

        if (countElement) {
          countElement.textContent = "×" + count;
        }

        button.disabled = count === 0 && category !== activeCategory;
      });

      tagButtons.forEach(function (button) {
        const tag = button.dataset.bsFilterTag || "";
        const count = items.filter(function (item) {
          return itemMatches(item, activeCategory, tag);
        }).length;
        const countElement = button.querySelector(".bs-research-filter-count");

        if (countElement) {
          countElement.textContent = "×" + count;
        }

        button.disabled = count === 0 && tag !== activeTag;
      });
    }

    function applyFilters() {
      let visibleCount = 0;

      items.forEach(function (item) {
        const visible = itemMatches(item, activeCategory, activeTag);
        item.element.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      setPressed(categoryButtons, activeCategory, "bsFilterCategory");
      setPressed(tagButtons, activeTag, "bsFilterTag");
      updateCounts();

      if (resultCount) {
        resultCount.textContent =
          "Showing " +
          visibleCount +
          (visibleCount === 1 ? " article." : " articles.");
      }

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }

      if (clearButton) {
        clearButton.hidden = !activeCategory && !activeTag;
      }
    }

    panel.addEventListener("click", function (event) {
      const categoryButton = event.target.closest(CATEGORY_SELECTOR);
      const tagButton = event.target.closest(TAG_SELECTOR);
      const clear = event.target.closest("[data-bs-clear-filters]");

      if (categoryButton) {
        const category = categoryButton.dataset.bsFilterCategory || "";
        activeCategory = activeCategory === category ? "" : category;
        applyFilters();
        return;
      }

      if (tagButton) {
        const tag = tagButton.dataset.bsFilterTag || "";
        activeTag = activeTag === tag ? "" : tag;
        applyFilters();
        return;
      }

      if (clear) {
        activeCategory = "";
        activeTag = "";
        applyFilters();
      }
    });

    list.addEventListener("click", function (event) {
      const categoryButton = event.target.closest("[data-bs-card-category]");
      const tagButton = event.target.closest("[data-bs-card-tag]");

      if (categoryButton) {
        activeCategory = categoryButton.dataset.bsCardCategory || "";
        applyFilters();
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (tagButton) {
        activeTag = tagButton.dataset.bsCardTag || "";
        applyFilters();
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", function () {
    void initializeResearchFilters();
  });
})();

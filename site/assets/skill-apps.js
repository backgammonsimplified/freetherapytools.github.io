(function (global) {
  "use strict";

  const DEFAULT_VALUE_DISPLAY = 32;

  function valueDisplayOptions(values) {
    const count = values.length;
    return [...[16, 32, 64, 128].filter((size) => size < count), count];
  }

  function canonicalValuesForDisplay(values, displaySize = DEFAULT_VALUE_DISPLAY, searchQuery = "") {
    const query = String(searchQuery).trim().toLocaleLowerCase();
    const limit = Number(displaySize);
    return values
      .filter((value) => query
        ? `${value.name} ${value.definition} ${(value.aliases || []).join(" ")}`.toLocaleLowerCase().includes(query)
        : value.display_rank <= limit)
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }

  function importanceWeight(value) {
    return { High: 1, Medium: 2 / 3, Low: 1 / 3 }[String(value || "")] || 0;
  }

  function domainAttention(domain, state, stableIndex = 0) {
    const assessment = state.assessments?.[domain.id] || {};
    const complete = assessment.current !== "" && assessment.current !== undefined
      && assessment.desired !== "" && assessment.desired !== undefined
      && Number.isFinite(Number(assessment.current)) && Number.isFinite(Number(assessment.desired));
    const current = complete ? Number(assessment.current) : 0;
    const desired = complete ? Number(assessment.desired) : 0;
    const gap = complete ? desired - current : 0;
    const positiveGap = Math.max(gap, 0);
    const importance = String(state.domainImportance?.[domain.id] || "");
    const weight = importanceWeight(importance);
    return { domain, stableIndex, complete, current, desired, gap, positiveGap, importance, weight, attentionScore: positiveGap * weight, relativeScore: 0 };
  }

  function rankDomainAssessments(domains, state) {
    const ranked = domains.map((domain, index) => domainAttention(domain, state, index)).sort((left, right) =>
      right.attentionScore - left.attentionScore
      || right.weight - left.weight
      || right.positiveGap - left.positiveGap
      || left.stableIndex - right.stableIndex
      || left.domain.name.localeCompare(right.domain.name)
    );
    const maxScore = Math.max(0, ...ranked.map((item) => item.attentionScore));
    return ranked.map((item) => ({ ...item, relativeScore: maxScore > 0 ? item.attentionScore / maxScore * 100 : 0 }));
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicOrder(items, seed, scope, relevance = () => 0) {
    return [...items].sort((left, right) => relevance(right) - relevance(left)
      || stableHash(`${seed}:${scope}:${left.id}`) - stableHash(`${seed}:${scope}:${right.id}`)
      || String(left.id).localeCompare(String(right.id)));
  }

  function suggestionPage(items, page, pageSize = 10, selectedId = "") {
    if (!items.length) return [];
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const normalizedPage = (Math.max(0, Number(page) || 0)) % pageCount;
    const start = normalizedPage * pageSize;
    const visible = items.slice(start, start + pageSize);
    const selected = selectedId && items.find((item) => item.id === selectedId);
    return selected && !visible.some((item) => item.id === selected.id) ? [selected, ...visible] : visible;
  }

  function normalizedRating(value) {
    const rating = String(value || "");
    if (["High", "Medium", "Low"].includes(rating)) return rating;
    if (["4", "5"].includes(rating)) return "High";
    if (rating === "3") return "Medium";
    if (["1", "2"].includes(rating)) return "Low";
    return "";
  }

  function isCategorizationComplete(state) {
    return Array.isArray(state.selectedDomains) && state.selectedDomains.length > 0
      && state.selectedDomains.every((domainId) => normalizedRating(state.domainImportance?.[domainId]));
  }

  function migrateValueRecords(data, next) {
    const canonicalIds = new Set(data.values.map((value) => value.id));
    const customIds = new Set((next.custom || []).map((value) => value.id));
    const legacyById = new Map([...(next.legacy || []), ...(data.legacy_noncanonical_values || [])].map((value) => [value.id, { id: value.id, name: value.name, definition: value.definition || "Legacy Value preserved from an older save.", suggested_domains: [], aliases: [], legacy: true }]));
    const mergeId = (id) => data.legacy_value_migrations?.[id] || id;
    const ratingRank = (value) => ({ High: 0, Medium: 1, Low: 2 }[normalizedRating(value)] ?? 3);
    const selected = {};
    const domains = {};
    const actions = {};
    Object.entries(next.selected || {}).forEach(([sourceId, selection]) => {
      const targetId = mergeId(sourceId);
      if (!canonicalIds.has(targetId) && !customIds.has(targetId)) {
        const legacy = legacyById.get(sourceId) || { id: sourceId, name: sourceId, definition: "Legacy Value preserved from an older save.", suggested_domains: [], aliases: [], legacy: true };
        legacyById.set(targetId, { ...legacy, id: targetId });
      }
      const existing = selected[targetId];
      const candidate = normalizedRating(selection.rating);
      selected[targetId] = { rating: existing && ratingRank(existing.rating) <= ratingRank(candidate) ? existing.rating : candidate };
      domains[targetId] = [...new Set([...(domains[targetId] || []), ...(next.domains?.[sourceId] || [])])];
      actions[targetId] = Object.assign({}, next.actions?.[sourceId] || {}, actions[targetId] || {});
    });
    return {
      selected, domains, actions,
      focus: [...new Set((next.focus || []).map(mergeId))],
      legacy: [...legacyById.values()].filter((value) => selected[value.id]),
    };
  }

  function migrateValuesStep(next) {
    const oldToNew = [0, 1, 2, 3, 5, 6, 4];
    const nineStepMigration = [0, 1, 2, 3, 3, 4, 5, 6, 6];
    const legacyMigration = [0, 2, 3, 3, 4, 5, 6, 6];
    if (next.act) return Math.max(0, Math.min(6, Number(next.step) || 0));
    const oldStep = next.domainImportance !== undefined ? Math.min(Number(next.step) || 0, 6)
      : next.selectedDomains !== undefined ? nineStepMigration[Math.min(Number(next.step) || 0, nineStepMigration.length - 1)]
        : legacyMigration[Math.min(Number(next.step) || 0, legacyMigration.length - 1)];
    return oldToNew[oldStep] ?? 0;
  }

  const SkillApps = {
    DEFAULT_VALUE_DISPLAY,
    valueDisplayOptions,
    canonicalValuesForDisplay,
    importanceWeight,
    domainAttention,
    rankDomainAssessments,
    stableHash,
    deterministicOrder,
    suggestionPage,
    normalizedRating,
    isCategorizationComplete,
    migrateValueRecords,
    migrateValuesStep,
    calculateGap(current, desired) {
      return Number(desired) - Number(current);
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SkillApps;
  }
  global.SkillApps = SkillApps;

  if (typeof document === "undefined") return;

  const STEPS = ["DISCOVER", "CATEGORIZE", "ASSIGN", "ASSESS", "MISSION", "ACT", "BARRIERS"];
  const VALUE_IMPORTANCE = [
    { label: "H", value: "High" },
    { label: "M", value: "Medium" },
    { label: "L", value: "Low" },
  ];
  const Progress = global.TherapySkillProgress;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function valueAt(object, path, fallback = "") {
    return path.split(".").reduce((value, key) => value && value[key], object) ?? fallback;
  }

  function setValue(object, path, value) {
    const parts = path.split(".");
    let target = object;
    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] || {};
      target = target[part];
    });
    target[parts.at(-1)] = value;
  }

  function initialValuesState(seed = "values-session") {
    return {
      step: 0,
      selected: {},
      custom: [],
      legacy: [],
      selectedDomains: [],
      domainImportance: {},
      domains: {},
      assessments: {},
      focus: [],
      actions: {},
      barriers: {},
      mission: { statement: "", autoGenerated: true },
      act: { seed, domains: {}, shortlist: [], smartFocusId: "" },
    };
  }

  function allValues(data, state) {
    return [...data.values, ...(state.legacy || []), ...state.custom].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }

  function selectedValues(data, state) {
    return allValues(data, state).filter((value) => state.selected[value.id]);
  }

  function normalizedValueImportance(value) {
    return normalizedRating(value);
  }

  function importanceRank(value) {
    return { High: 0, Medium: 1, Low: 2 }[normalizedValueImportance(value)] ?? 3;
  }

  function prioritizedValues(data, state) {
    return selectedValues(data, state).sort((left, right) =>
      importanceRank(state.selected[left.id]?.rating) - importanceRank(state.selected[right.id]?.rating)
      || left.name.localeCompare(right.name)
    );
  }

  function naturalList(items) {
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
  }

  function generatedMissionStatement(data, state) {
    const selectedDomains = data.domains.filter((domain) => state.selectedDomains.includes(domain.id));
    const ranked = rankDomainAssessments(selectedDomains, state);
    const domains = (ranked.some((item) => item.attentionScore > 0) ? ranked.filter((item) => item.attentionScore > 0) : ranked).slice(0, 2);
    const assignedIds = new Set(domains.flatMap((item) => Object.entries(state.domains)
      .filter(([, domainIds]) => domainIds.includes(item.domain.id)).map(([valueId]) => valueId)));
    const assigned = prioritizedValues(data, state).filter((value) => assignedIds.has(value.id)).slice(0, 4);
    const fallback = prioritizedValues(data, state).slice(0, 4);
    const values = assigned.length ? assigned : fallback;
    if (!values.length) return "Select values in Discover to create an editable mission statement.";
    const domainNames = domains.map((item) => item.domain.name);
    if (!domainNames.length) return `I want to keep practicing ${naturalList(values.map((value) => value.name))} through small, repeatable actions.`;
    const verb = domains.some((item) => item.attentionScore > 0) ? "direct more of my time and attention toward" : "keep making room for";
    return `I want to ${verb} ${naturalList(domainNames)}, practicing ${naturalList(values.map((value) => value.name))} through small, repeatable actions.`;
  }

  function progressMarkup(step) {
    return `<ol class="skill-app-progress" aria-label="Values process">${STEPS.map((name, index) =>
      `<li${index === step ? ' aria-current="step"' : ""}><button type="button" data-values-step="${index}" ${index > step ? "disabled" : ""}>${index + 1}. ${name}</button></li>`
    ).join("")}</ol>`;
  }

  function valueCardMarkup(value, selected) {
      const active = Boolean(selected[value.id]);
      const importance = normalizedValueImportance(selected[value.id]?.rating);
      return `<article class="skill-app-card" data-value-card data-search="${escapeHtml(`${value.name} ${value.definition}`.toLowerCase())}">
        <h4>${escapeHtml(value.name)}</h4>
        <details class="values-definition"><summary><span class="values-definition-show">View definition</span><span class="values-definition-hide">Hide definition</span></summary><p>${escapeHtml(value.definition)}</p></details>
        <div class="values-card-controls">
          <button type="button" class="values-select-button ${active ? "secondary" : ""}" data-toggle-value="${escapeHtml(value.id)}" aria-pressed="${active}">${active ? "Remove" : "Select"}</button>
          ${active ? `<fieldset class="values-importance"><legend>Importance:</legend><div class="values-importance-buttons" role="group" aria-label="Importance for ${escapeHtml(value.name)}">${VALUE_IMPORTANCE.map(({ label, value: rating }) => `<button type="button" class="${importance === rating ? "" : "secondary"}" data-rating="${escapeHtml(value.id)}" data-importance-value="${rating}" aria-label="${rating} importance" aria-pressed="${importance === rating}">${label}</button>`).join("")}</div></fieldset>` : ""}
        </div>
      </article>`;
  }

  function discoverMarkup(data, state, displaySize, searchQuery) {
    const selected = state.selected;
    const searching = Boolean(searchQuery.trim());
    const visibleCanonical = canonicalValuesForDisplay(data.values, displaySize, searchQuery);
    const cards = visibleCanonical.map((value) => valueCardMarkup(value, selected)).join("");
    const selectedRecords = selectedValues(data, state);
    const customCards = [...(state.legacy || []), ...state.custom]
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
      .map((value) => valueCardMarkup(value, selected))
      .join("");
    const count = data.values.length;
    const options = valueDisplayOptions(data.values);
    const tierLabel = displaySize;
    const dictionaryHeading = searching ? "Search results" : displaySize === count ? "Complete values dictionary" : "Common values";
    const dictionaryDescription = searching
      ? `Showing ${visibleCanonical.length} match${visibleCanonical.length === 1 ? "" : "es"} from the complete ${count}-value dictionary.`
      : displaySize === count
        ? "Explore the complete values dictionary."
        : "A shorter set to help you get started.";
    return `<div class="values-discover-title"><h3>Discover</h3><button type="button" class="secondary values-clear-button" data-clear>Clear selections</button></div>
      <p><strong>Values are directions for living.</strong> A value can guide an ongoing way of acting, not just a goal to achieve. Goals are optional milestones; values keep guiding choices after a goal is complete.</p>
      <p>Search the curated Values Dictionary. Select words that resonate; 10-20 is a useful starting range, not a requirement. Labels such as Courage, Honesty, and Compassion can be useful compass directions without being rewritten as verbs.</p>
      <aside class="skill-app-note"><strong>Keep the layers distinct:</strong> a life domain says <em>where</em> in life; a Value says the ongoing direction or quality; a desired condition says what you hope to experience; a goal is a completable milestone; a standard evaluates performance; and an action is something concrete you can do.</aside>
      <details class="values-ranking-explanation"><summary>See two compass-to-action examples</summary><p><strong>Close Relationships → Connection →</strong> keep making room for meaningful conversations → reconnect with an old relationship → send one friend a simple message asking how they have been. Coffee this month could be an optional goal, but the plan is useful without it.</p><p><strong>Courage →</strong> practice approaching difficult things even when fear is present → speak up more when something matters → write down what I want to say before my next meeting.</p></details>
      <p class="skill-app-count" aria-live="polite"><span data-selected-count>${Object.keys(selected).length}</span> selected</p>
      <section class="values-selected-summary" aria-labelledby="selected-values-heading">
        <h4 id="selected-values-heading">Selected values</h4>
        ${selectedRecords.length ? `<div class="values-selected-list">${selectedRecords.map((value) => `<button type="button" class="secondary values-selected-chip" data-toggle-value="${escapeHtml(value.id)}" aria-label="Remove ${escapeHtml(value.name)} from selected values"><span>${escapeHtml(value.name)}</span><span aria-hidden="true">×</span></button>`).join("")}</div>` : "<p>No values selected yet.</p>"}
      </section>
      <section class="values-dictionary" aria-labelledby="values-dictionary-heading">
        <div class="values-dictionary-heading"><h4 id="values-dictionary-heading">${dictionaryHeading}</h4><p>${dictionaryDescription}</p></div>
        <fieldset class="values-tier-selector"><legend>Show:</legend><div class="values-tier-options">${options.map((option) => {
          const value = String(option);
          const label = option === count ? `Complete (${count})` : value;
          const checked = String(displaySize) === value;
          return `<label><input type="radio" name="values-display-size" value="${value}" data-values-tier aria-label="Show ${option === count ? `all ${count} values` : `${label} values`}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
        }).join("")}</div></fieldset>
        <label for="values-search">Search all ${count} values, definitions, and legacy aliases</label>
        <input id="values-search" type="search" data-values-search autocomplete="off" value="${escapeHtml(searchQuery)}">
        <p class="values-search-status" aria-live="polite">${searching ? dictionaryDescription : `Showing ${tierLabel === count ? `all ${count}` : tierLabel} values.`}</p>
        <div class="skill-app-card-grid" data-value-list>${cards}</div>
      </section>
      ${customCards ? `<section class="values-custom-values" aria-labelledby="custom-values-heading"><h4 id="custom-values-heading">Custom and legacy values</h4><p>Legacy selections are preserved so older progress is not lost; you can keep or remove them.</p><div class="skill-app-card-grid">${customCards}</div></section>` : ""}
      <div class="skill-app-actions values-custom-row">
        <input type="text" data-custom-value aria-label="Custom value name" placeholder="Add your own value">
        <button type="button" data-add-custom>Add custom value</button>
      </div>`;
  }

  function categorizeMarkup(data, state) {
    const selected = new Set(state.selectedDomains);
    return `<h3>Categorize</h3>
      <p>Choose the life domains that are most important to you right now. Selecting 2-4 is a useful starting range, not a requirement. Then mark each selected domain as high, medium, or low importance.</p>
      <div class="skill-app-actions values-domain-actions">
        <button type="button" class="secondary" data-clear-domains>Clear domains</button>
      </div>
      <p class="skill-app-count" aria-live="polite"><span data-domain-count>${selected.size}</span> of ${data.domains.length} life domains selected</p>
      <p class="skill-app-note">Choose H, M, or L for every selected life domain before continuing.</p>
      <div class="values-domain-choice-grid">${data.domains.map((domain) => {
        const active = selected.has(domain.id);
        const importance = normalizedValueImportance(state.domainImportance[domain.id]);
        return `<article class="values-domain-choice"><label class="values-domain-select"><input type="checkbox" data-selected-domain value="${escapeHtml(domain.id)}" ${active ? "checked" : ""}> <span>${escapeHtml(domain.name)}</span></label>
          ${active ? `<fieldset class="values-importance values-domain-importance"><legend>Importance:</legend><div class="values-importance-buttons" role="group" aria-label="Importance for ${escapeHtml(domain.name)}">${VALUE_IMPORTANCE.map(({ label, value }) => `<button type="button" class="${importance === value ? "" : "secondary"}" data-domain-importance="${escapeHtml(domain.id)}" data-importance-value="${value}" aria-label="${value} importance" aria-pressed="${importance === value}">${label}</button>`).join("")}</div></fieldset>` : ""}</article>`;
      }).join("")}</div>`;
  }

  function assignMarkup(data, state) {
    const values = selectedValues(data, state);
    const domains = data.domains.filter((domain) => state.selectedDomains.includes(domain.id));
    if (!values.length) return `<h3>Assign</h3><p class="skill-app-note">Return to Discover and select at least one value.</p>`;
    if (!domains.length) return `<h3>Assign</h3><p class="skill-app-note">Return to Categorize and select at least one important life domain.</p>`;
    return `<h3>Assign</h3><p>Assign each chosen value to one or more of your important life domains. A value can belong in several areas.</p>
      <div class="skill-app-grid">${values.map((value) => `<fieldset class="skill-app-fieldset values-assignment"><legend class="values-assignment-value">${escapeHtml(value.name)}</legend>
        <div class="skill-app-domain-grid">${domains.map((domain) => `<label class="skill-app-check values-assignment-domain"><input type="checkbox" data-domain-value="${escapeHtml(value.id)}" value="${escapeHtml(domain.id)}" ${(state.domains[value.id] || []).includes(domain.id) ? "checked" : ""}> <span>${escapeHtml(domain.name)}</span></label>`).join("")}</div>
      </fieldset>`).join("")}</div>`;
  }

  function domainInvestment(data, state, domain) {
    const item = domainAttention(domain, state, data.domains.findIndex((candidate) => candidate.id === domain.id));
    return { ...item, status: !item.complete ? "incomplete" : item.gap > 0 ? "under" : item.gap < 0 ? "over" : "balanced" };
  }

  function gapDescription(investment) {
    if (investment.status === "incomplete") return "Enter both scores to see the gap.";
    if (investment.status === "under") return `Gap: you want to put ${investment.gap} more point${investment.gap === 1 ? "" : "s"} of time and effort here.`;
    if (investment.status === "over") return `Gap: you want to put ${Math.abs(investment.gap)} fewer point${investment.gap === -1 ? "" : "s"} of time and effort here.`;
    return "Gap: your current and desired investment are the same.";
  }

  function assessmentInsightsMarkup(data, state, heading = "What your scores suggest") {
    const selected = data.domains.filter((domain) => state.selectedDomains.includes(domain.id));
    const ranked = rankDomainAssessments(selected, state).map((item) => ({ ...item, status: !item.complete ? "incomplete" : item.gap > 0 ? "under" : item.gap < 0 ? "over" : "balanced" }));
    const priority = ranked.filter((item) => item.attentionScore > 0);
    const over = ranked.filter((item) => item.status === "over");
    const balanced = ranked.filter((item) => item.status === "balanced");
    const incomplete = ranked.filter((item) => item.status === "incomplete");
    if (!ranked.length) return `<section class="values-investment-summary"><h4>${heading}</h4><p>Select life domains in Categorize to see where your resources may need attention.</p></section>`;
    const simpleGroup = (title, items, className, description) => items.length ? `<section class="values-investment-group ${className}"><h5>${title}</h5><p>${description}</p><ul>${items.map((item) => `<li><strong>${escapeHtml(item.domain.name)}</strong> <span>(${escapeHtml(item.importance)} importance; ${item.current} → ${item.desired})</span></li>`).join("")}</ul></section>` : "";
    return `<section class="values-investment-summary" data-assessment-insights><h4>${heading}</h4>
      <p>This is a planning aid calculated from your own ratings, not an objective psychological score.</p>
      ${priority.length ? `<ol class="values-attention-ranking">${priority.map((item) => `<li><strong>${escapeHtml(item.domain.name)}</strong><span>${escapeHtml(item.importance)} importance</span><span>Desired improvement: +${item.positiveGap}</span><span>Attention score: ${item.attentionScore.toFixed(2)}</span><span>Relative priority: ${Math.round(item.relativeScore)}%</span></li>`).join("")}</ol>` : `<p>No selected domain currently has a positive attention score. All selected domains remain available in Act.</p>`}
      <details class="values-ranking-explanation"><summary>How this ranking is calculated</summary><p>Positive desired improvement (desired minus current, with negative gaps treated as zero) is multiplied by importance: High = 3/3, Medium = 2/3, Low = 1/3. Scores are sorted before rounding. Relative priority compares each positive score with the highest score, which is 100%.</p></details>
      ${simpleGroup("Areas you may want to rebalance", over, "is-over", "You rated current investment above desired investment. That is not inherently bad; it may simply be worth reviewing how resources are allocated.")}
      ${simpleGroup("Close to your desired investment", balanced, "is-balanced", "Your current time and effort match your desired rating.")}
      ${incomplete.length ? `<p class="skill-app-note">Complete both scores for ${incomplete.length} remaining domain${incomplete.length === 1 ? "" : "s"}.</p>` : ""}
    </section>`;
  }

  function assessMarkup(data, state) {
    const domains = data.domains.filter((domain) => state.selectedDomains.includes(domain.id));
    if (!domains.length) return `<h3>Assess</h3><p class="skill-app-note">Return to Categorize and select at least one important life domain.</p>`;
    return `<h3>Assess</h3><p>Compare how much time and effort you put toward each selected life domain now with how much you want to put toward it.</p>
      <div class="skill-app-grid values-domain-assessment-list">${domains.map((domain) => {
        const a = Object.assign({ current: "", desired: "" }, state.assessments[domain.id]);
        const investment = domainInvestment(data, state, domain);
        return `<fieldset class="skill-app-fieldset" data-assessment-card="${escapeHtml(domain.id)}"><legend>${escapeHtml(domain.name)}</legend>
          <p class="values-domain-priority">${escapeHtml(normalizedValueImportance(state.domainImportance[domain.id]) || "Importance not selected")} importance</p>
          <div class="skill-app-inline-fields">
            <div><label for="current-${escapeHtml(domain.id)}">Current Score</label><p class="skill-app-field-help">How much time and effort do you put toward this life domain now?</p><input id="current-${escapeHtml(domain.id)}" type="number" min="1" max="10" value="${escapeHtml(a.current)}" data-assess="current"></div>
            <div><label for="desired-${escapeHtml(domain.id)}">Desired Score</label><p class="skill-app-field-help">How much time and effort do you want to put toward this life domain?</p><input id="desired-${escapeHtml(domain.id)}" type="number" min="1" max="10" value="${escapeHtml(a.desired)}" data-assess="desired"></div>
          </div><output class="skill-app-gap" data-gap>${escapeHtml(gapDescription(investment))}</output>
        </fieldset>`;
      }).join("")}</div>${assessmentInsightsMarkup(data, state)}`;
  }

  function assignedValuesForDomain(data, state, domainId) {
    return prioritizedValues(data, state).filter((value) => (state.domains[value.id] || []).includes(domainId));
  }

  function normalizedTag(value) {
    return String(value || "").toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function domainExplorerState(state, domainId) {
    state.act.domains[domainId] = Object.assign({ open: true, whatPage: 0, selectedWhat: "", customWhat: "", howPage: 0, selectedHow: "", customHow: "" }, state.act.domains[domainId]);
    return state.act.domains[domainId];
  }

  function whatChoicesForDomain(data, actionData, state, domainId) {
    const assigned = assignedValuesForDomain(data, state, domainId);
    const tags = new Set(assigned.flatMap((value) => [value.name, ...(value.aliases || [])]).map(normalizedTag));
    const relevance = (item) => (item.value_tags || []).reduce((score, tag) => score + (tags.has(normalizedTag(tag)) ? 1 : 0), 0);
    return deterministicOrder(actionData.domains[domainId] || [], state.act.seed, `${domainId}:what`, relevance);
  }

  function actionDomainMarkup(data, actionData, state, rankedItem) {
    const domain = rankedItem.domain;
    const explore = domainExplorerState(state, domain.id);
    const values = assignedValuesForDomain(data, state, domain.id);
    const orderedWhats = whatChoicesForDomain(data, actionData, state, domain.id);
    const whatPage = suggestionPage(orderedWhats, explore.whatPage, 10, explore.selectedWhat);
    const whatRecord = orderedWhats.find((item) => item.id === explore.selectedWhat);
    const howPool = whatRecord ? deterministicOrder(whatRecord.hows, state.act.seed, `${domain.id}:${whatRecord.id}:how`) : [];
    const howPage = suggestionPage(howPool, explore.howPage, 10, explore.selectedHow);
    const whatText = explore.selectedWhat === "custom" ? explore.customWhat.trim() : whatRecord?.what || "";
    const howRecord = howPool.find((item) => item.id === explore.selectedHow);
    const howText = explore.selectedHow === "custom" ? explore.customHow.trim() : howRecord?.text || "";
    return `<details class="values-action-domain" data-action-domain="${escapeHtml(domain.id)}" ${explore.open !== false ? "open" : ""}>
      <summary><span><strong>${escapeHtml(domain.name)}</strong><small>${escapeHtml(rankedItem.importance)} importance · ${rankedItem.complete ? `${rankedItem.current} → ${rankedItem.desired}` : "assessment incomplete"} · Attention ${rankedItem.attentionScore.toFixed(2)} · Relative ${Math.round(rankedItem.relativeScore)}%</small></span></summary>
      <div class="values-action-domain-body">
        <section><h4>Values you placed here</h4>${values.length ? `<ul class="values-assigned-list">${values.map((value) => `<li>${escapeHtml(value.name)}</li>`).join("")}</ul>` : `<p>No Values are assigned here yet. You can return to Assign without losing this page.</p>`}</section>
        <fieldset class="skill-app-fieldset values-what-choices"><legend>What could I work on?</legend><p>A WHAT is a meaningful direction, project, problem area, or possibility—not automatically a goal.</p>
          <div class="values-suggestion-list" aria-live="polite">${whatPage.map((item) => `<label class="skill-app-check"><input type="radio" name="what-${escapeHtml(domain.id)}" value="${escapeHtml(item.id)}" data-action-what="${escapeHtml(domain.id)}" ${explore.selectedWhat === item.id ? "checked" : ""}> <span>${escapeHtml(item.what)}</span></label>`).join("")}</div>
          <label class="skill-app-check values-custom-suggestion"><input type="radio" name="what-${escapeHtml(domain.id)}" value="custom" data-action-what="${escapeHtml(domain.id)}" ${explore.selectedWhat === "custom" ? "checked" : ""}> <span>Write my own What</span></label>
          <label for="custom-what-${escapeHtml(domain.id)}">My What</label><textarea id="custom-what-${escapeHtml(domain.id)}" data-custom-what="${escapeHtml(domain.id)}">${escapeHtml(explore.customWhat)}</textarea>
          <button type="button" class="secondary" data-another-whats="${escapeHtml(domain.id)}">Another 10 ideas</button>
        </fieldset>
        ${whatText ? `<fieldset class="skill-app-fieldset values-how-choices"><legend>How could I start?</legend><p>A HOW is a concrete action that could move you in that direction.</p>
          <div class="values-suggestion-list" aria-live="polite">${howPage.map((item) => `<label class="skill-app-check"><input type="radio" name="how-${escapeHtml(domain.id)}" value="${escapeHtml(item.id)}" data-action-how="${escapeHtml(domain.id)}" ${explore.selectedHow === item.id ? "checked" : ""}> <span>${escapeHtml(item.text)}</span></label>`).join("")}</div>
          <label class="skill-app-check values-custom-suggestion"><input type="radio" name="how-${escapeHtml(domain.id)}" value="custom" data-action-how="${escapeHtml(domain.id)}" ${explore.selectedHow === "custom" ? "checked" : ""}> <span>Write my own How</span></label>
          <label for="custom-how-${escapeHtml(domain.id)}">My How</label><textarea id="custom-how-${escapeHtml(domain.id)}" data-custom-how="${escapeHtml(domain.id)}">${escapeHtml(explore.customHow)}</textarea>
          ${howPool.length > 10 ? `<button type="button" class="secondary" data-another-hows="${escapeHtml(domain.id)}">Another 10 ways to start</button>` : ""}
          <button type="button" data-add-shortlist="${escapeHtml(domain.id)}" ${howText ? "" : "disabled"}>Add this action to my short-term list</button>
        </fieldset>` : ""}
      </div>
    </details>`;
  }

  function shortlistMarkup(state) {
    const items = state.act.shortlist;
    return `<section class="values-shortlist" aria-labelledby="values-shortlist-heading"><h4 id="values-shortlist-heading">My short-term valued-action list</h4><p>Choose a handful of realistic actions you could try in the short term.</p>
      ${items.length ? `<fieldset class="skill-app-fieldset"><legend>Choose one current SMART Goal focus</legend><ol>${items.map((item) => `<li><label><input type="radio" name="smart-focus" value="${escapeHtml(item.id)}" data-smart-focus ${state.act.smartFocusId === item.id ? "checked" : ""}> <strong>${escapeHtml(item.how)}</strong></label><span>${escapeHtml(item.domainName)} · ${escapeHtml(item.values.join(", ") || "No assigned Values")}</span><span>WHAT: ${escapeHtml(item.what)}</span><button type="button" class="secondary" data-remove-shortlist="${escapeHtml(item.id)}">Remove</button></li>`).join("")}</ol></fieldset>
        <button type="button" data-build-smart ${state.act.smartFocusId ? "" : "disabled"}>Build a SMART goal from this <span class="visually-hidden">(opens in a new tab)</span></button><p class="skill-app-field-help">Opens SMART Goal Builder in a new tab. Your Values plan stays open here.</p>` : `<p>No actions added yet.</p>`}
    </section>`;
  }

  function actMarkup(data, actionData, state) {
    const domains = data.domains.filter((domain) => state.selectedDomains.includes(domain.id));
    const ranked = rankDomainAssessments(domains, state);
    return `<h3>Act</h3><p>Explore from life domain to action: <strong>Where in my life? → What direction matters? → What could I work on? → How could I start?</strong> A useful Values plan does not have to end in a formal goal.</p>
      <div class="values-action-domains">${ranked.map((item) => actionDomainMarkup(data, actionData, state, item)).join("")}</div>
      ${shortlistMarkup(state)}
      <aside class="skill-app-note"><h4>Try, return, and reassess</h4><p>Choose a handful of realistic actions, try them, and save this Values plan with <strong>Save progress (.md)</strong>. Later, reopen that Markdown file to reassess your Values or life-domain ratings, or choose another shortlisted action to turn into a SMART goal. The file stays on your device unless you choose to share it.</p></aside>`;
  }

  function barriersMarkup(_data, state) {
    const type = valueAt(state, "barriers.type");
    return `<h3>Barriers</h3><p>Name what is showing up, then choose a response that fits.</p>
      <label for="barrier-type">Barrier type</label><select id="barrier-type" data-field="barriers.type"><option value="">Choose one</option>${[
        ["practical", "Practical barrier"], ["emotion", "Emotion or action urge"], ["willfulness", "Willfulness / fighting reality"], ["skill", "Missing skill"],
      ].map(([key, label]) => `<option value="${key}" ${type === key ? "selected" : ""}>${label}</option>`).join("")}</select>
      <label for="barrier-notes">What is getting in the way?</label><textarea id="barrier-notes" data-field="barriers.notes">${escapeHtml(valueAt(state, "barriers.notes"))}</textarea>
      <label for="barrier-response">What response or skill could fit?</label><textarea id="barrier-response" data-field="barriers.response">${escapeHtml(valueAt(state, "barriers.response"))}</textarea>
      <label for="barrier-next">Smallest next step</label><textarea id="barrier-next" data-field="barriers.next">${escapeHtml(valueAt(state, "barriers.next"))}</textarea>
      <div class="skill-app-card-grid">
        <a class="skill-app-link-button secondary" href="/learn/emotion-regulation/opposite-action.html#problem-solving">Problem Solving</a>
        <a class="skill-app-link-button secondary" href="/learn/emotion-regulation/opposite-action.html#opposite-action">Opposite Action</a>
        <a class="skill-app-link-button secondary" href="/learn/cube/radical-acceptance.html#willingness">Radical Acceptance / Willingness</a>
        <a class="skill-app-link-button secondary" href="/learn/goal-setting/goal-setting-guidelines.html#smart-goals">SMART Goal Builder</a>
        <a class="skill-app-link-button secondary" href="/learn/wellness/behavioral-activation.html">Behavioural Activation</a>
      </div>`;
  }

  function missionMarkup(data, state) {
    if (state.mission.autoGenerated !== false) {
      state.mission.statement = generatedMissionStatement(data, state);
      state.mission.autoGenerated = true;
    }
    return `<h3>Mission</h3><p>This draft uses your selected Values, assignments, life-domain importance, and Assessment ranking. Edit it until it sounds like you.</p>
      <label for="mission-result">Editable mission statement</label><textarea id="mission-result" data-mission-statement>${escapeHtml(state.mission.statement)}</textarea>
      <button type="button" class="secondary" data-regenerate-mission>Regenerate from my current rankings and assignments</button>
      ${assessmentInsightsMarkup(data, state, "Priorities informing this draft")}`;
  }

  function setupValuesActionBar(root, getState, getCollapsed, setCollapsed) {
    let frame = 0;
    let wasAtPageBottom = global.scrollY + global.innerHeight >= document.documentElement.scrollHeight - 8;
    const sync = () => {
      frame = 0;
      const shell = root.querySelector(".skill-app-shell");
      const footer = root.querySelector(".skill-app-footer");
      const toggle = root.querySelector("[data-values-action-bar-toggle]");
      if (!shell || !footer || !toggle) return;
      const bounds = shell.getBoundingClientRect();
      root.style.setProperty("--values-action-bar-left", `${bounds.left}px`);
      root.style.setProperty("--values-action-bar-width", `${bounds.width}px`);
      root.style.setProperty("--values-action-bar-x-shift", "0px");
      root.style.setProperty("--values-action-bar-height", `${footer.getBoundingClientRect().height}px`);
      const siteFooter = document.querySelector(".nav-footer, .page-footer");
      const siteFooterBounds = siteFooter?.getBoundingClientRect();
      const visibleSiteFooter = siteFooterBounds
        ? Math.max(0, Math.min(global.innerHeight, siteFooterBounds.bottom) - Math.max(0, siteFooterBounds.top))
        : 0;
      root.style.setProperty("--values-action-bar-bottom", `${visibleSiteFooter}px`);

      const atPageBottom = global.scrollY + global.innerHeight >= document.documentElement.scrollHeight - 8;
      if (getCollapsed() && atPageBottom && !wasAtPageBottom) setCollapsed(false);
      wasAtPageBottom = atPageBottom;

      const state = getState();
      let visible = state.step > 0;
      if (!visible) {
        const list = root.querySelector("[data-value-list]");
        const cards = list ? [...list.querySelectorAll("[data-value-card]:not([hidden])")] : [];
        const columns = list ? global.getComputedStyle(list).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
        const thirdRowFirstCard = columns > 0 ? cards[columns * 2] : null;
        visible = Boolean(thirdRowFirstCard && thirdRowFirstCard.getBoundingClientRect().top <= global.innerHeight - 16);
      }
      root.classList.toggle("values-action-bar-visible", visible);
    };
    const schedule = () => {
      if (frame) return;
      frame = global.requestAnimationFrame(sync);
    };
    global.addEventListener("scroll", schedule, { passive: true });
    global.addEventListener("resize", schedule);
    new MutationObserver(schedule).observe(root, { attributes: true, childList: true, subtree: true, attributeFilter: ["hidden"] });
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(schedule).observe(root);
    schedule();
    return schedule;
  }

  async function initValues(root) {
    const [response, actionResponse] = await Promise.all([
      fetch(root.dataset.valuesUrl, { credentials: "same-origin" }),
      fetch(root.dataset.valuesActionsUrl, { credentials: "same-origin" }),
    ]);
    if (!response.ok || !actionResponse.ok) throw new Error("Values data could not be loaded");
    const data = await response.json();
    const actionData = await actionResponse.json();
    const seedBytes = new Uint32Array(2);
    global.crypto?.getRandomValues?.(seedBytes);
    let state = initialValuesState(`${seedBytes[0] || Date.now()}-${seedBytes[1] || 0}`);
    let displaySize = DEFAULT_VALUE_DISPLAY;
    let searchQuery = "";
    let actionBarCollapsed = false;
    let updateActionBar = () => {};

    function setActionBarCollapsed(collapsed) {
      actionBarCollapsed = Boolean(collapsed);
      root.classList.toggle("values-action-bar-collapsed", actionBarCollapsed);
      const toggle = root.querySelector("[data-values-action-bar-toggle]");
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(!actionBarCollapsed));
        toggle.textContent = actionBarCollapsed ? "Show bottom bar" : "Collapse bar";
      }
      updateActionBar();
    }

    function render() {
      state.step = Math.max(0, Math.min(STEPS.length - 1, Number(state.step) || 0));
      const categorizationComplete = isCategorizationComplete(state);
      const continueDisabled = state.step === STEPS.length - 1 || (state.step === 1 && !categorizationComplete);
      let panel;
      if (state.step === 0) panel = discoverMarkup(data, state, displaySize, searchQuery);
      else if (state.step === 1) panel = categorizeMarkup(data, state);
      else if (state.step === 2) panel = assignMarkup(data, state);
      else if (state.step === 3) panel = assessMarkup(data, state);
      else if (state.step === 4) panel = missionMarkup(data, state);
      else if (state.step === 5) panel = actMarkup(data, actionData, state);
      else panel = barriersMarkup(data, state);
      root.innerHTML = `<div class="skill-app-shell">
        <header class="skill-app-header"><h2>Discover and Work Towards Your Values</h2><p>Values are compass directions, not destinations. Use them to choose ongoing practices and optional milestones.</p>${progressMarkup(state.step)}</header>
        <section class="skill-app-panel" aria-live="polite">${panel}</section>
        <footer class="skill-app-footer" id="values-action-bar"><div><strong data-values-status aria-live="polite">Your entries are not saved on our servers.</strong><br><small>A temporary draft is saved in this browser. You can download partial or completed results below.</small></div>
          <div class="skill-app-actions"><button type="button" class="secondary" data-back ${state.step === 0 ? "disabled" : ""}>Back</button><button type="button" data-next ${continueDisabled ? "disabled" : ""}>Continue</button></div></footer>
        <button type="button" class="secondary values-action-bar-toggle" data-values-action-bar-toggle aria-controls="values-action-bar" aria-expanded="${!actionBarCollapsed}">${actionBarCollapsed ? "Show bottom bar" : "Collapse bar"}</button>
      </div>`;
      setActionBarCollapsed(actionBarCollapsed);
      bind();
      updateActionBar();
      root.querySelector(".skill-app-panel h3")?.focus?.();
    }

    function bind() {
      root.querySelectorAll("[data-values-step]").forEach((button) => button.addEventListener("click", () => {
        const target = Number(button.dataset.valuesStep);
        if (Number.isInteger(target) && target <= state.step) {
          state.step = target;
          render();
        }
      }));
      root.querySelectorAll("[data-values-tier]").forEach((input) => input.addEventListener("change", () => {
        if (!input.checked) return;
        displaySize = Number(input.value);
        render();
        root.querySelector(`[data-values-tier][value="${CSS.escape(input.value)}"]`)?.focus();
      }));
      root.querySelector("[data-values-search]")?.addEventListener("input", (event) => {
        searchQuery = event.target.value;
        const cursor = event.target.selectionStart;
        render();
        const search = root.querySelector("[data-values-search]");
        search?.focus();
        if (Number.isInteger(cursor)) search?.setSelectionRange(cursor, cursor);
      });
      root.querySelectorAll("[data-toggle-value]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.toggleValue;
        if (state.selected[id]) delete state.selected[id];
        else state.selected[id] = { rating: "" };
        render();
      }));
      root.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.rating;
        state.selected[id].rating = button.dataset.importanceValue;
        root.querySelectorAll(`[data-rating="${CSS.escape(id)}"]`).forEach((option) => {
          const chosen = option === button;
          option.setAttribute("aria-pressed", String(chosen));
          option.classList.toggle("secondary", !chosen);
        });
      }));
      root.querySelector("[data-add-custom]")?.addEventListener("click", () => {
        const input = root.querySelector("[data-custom-value]");
        const name = input.value.trim();
        if (!name) return;
        const id = `custom-${Date.now()}`;
        state.custom.push({ id, name, definition: "Your own wording", suggested_domains: [], aliases: [] });
        state.selected[id] = { rating: "" };
        render();
      });
      root.querySelectorAll("[data-selected-domain]").forEach((checkbox) => checkbox.addEventListener("change", () => {
        const domains = new Set(state.selectedDomains);
        if (checkbox.checked) domains.add(checkbox.value);
        else {
          domains.delete(checkbox.value);
          delete state.domainImportance[checkbox.value];
          Object.keys(state.domains).forEach((valueId) => {
            state.domains[valueId] = state.domains[valueId].filter((domainId) => domainId !== checkbox.value);
          });
          delete state.assessments[checkbox.value];
        }
        state.selectedDomains = [...domains];
        render();
      }));
      root.querySelectorAll("[data-domain-importance]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.domainImportance;
        state.domainImportance[id] = button.dataset.importanceValue;
        render();
        root.querySelector(`[data-domain-importance="${CSS.escape(id)}"][data-importance-value="${CSS.escape(button.dataset.importanceValue)}"]`)?.focus();
      }));
      root.querySelector("[data-clear-domains]")?.addEventListener("click", () => {
        state.selectedDomains = [];
        state.domainImportance = {};
        state.domains = {};
        state.assessments = {};
        render();
      });
      root.querySelectorAll("[data-domain-value]").forEach((checkbox) => checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.domainValue;
        const domains = new Set(state.domains[id] || []);
        checkbox.checked ? domains.add(checkbox.value) : domains.delete(checkbox.value);
        state.domains[id] = [...domains];
      }));
      root.querySelectorAll("[data-assessment-card]").forEach((card) => {
        const id = card.dataset.assessmentCard;
        card.querySelectorAll("[data-assess]").forEach((input) => input.addEventListener("input", () => {
          state.assessments[id] = state.assessments[id] || {};
          state.assessments[id][input.dataset.assess] = input.value;
          card.querySelector("[data-gap]").textContent = gapDescription(domainInvestment(data, state, data.domains.find((domain) => domain.id === id)));
          const insights = root.querySelector("[data-assessment-insights]");
          if (insights) insights.outerHTML = assessmentInsightsMarkup(data, state);
        }));
      });
      root.querySelectorAll("[data-action-domain]").forEach((details) => details.addEventListener("toggle", () => { domainExplorerState(state, details.dataset.actionDomain).open = details.open; }));
      root.querySelectorAll("[data-action-what]").forEach((input) => input.addEventListener("change", () => {
        const explore = domainExplorerState(state, input.dataset.actionWhat);
        explore.selectedWhat = input.value;
        explore.selectedHow = "";
        explore.howPage = 0;
        render();
      }));
      root.querySelectorAll("[data-custom-what]").forEach((input) => input.addEventListener("input", () => {
        const domainId = input.dataset.customWhat;
        const explore = domainExplorerState(state, domainId);
        explore.customWhat = input.value;
        const needsHowPanel = explore.selectedWhat !== "custom" || !root.querySelector(`[data-action-domain="${CSS.escape(domainId)}"] .values-how-choices`);
        explore.selectedWhat = "custom";
        if (needsHowPanel && input.value.trim()) { render(); root.querySelector(`[data-custom-what="${CSS.escape(domainId)}"]`)?.focus(); }
      }));
      root.querySelectorAll("[data-another-whats]").forEach((button) => button.addEventListener("click", () => {
        domainExplorerState(state, button.dataset.anotherWhats).whatPage += 1;
        render();
        root.querySelector(`[data-another-whats="${CSS.escape(button.dataset.anotherWhats)}"]`)?.focus();
      }));
      root.querySelectorAll("[data-action-how]").forEach((input) => input.addEventListener("change", () => {
        const domainId = input.dataset.actionHow;
        domainExplorerState(state, domainId).selectedHow = input.value;
        const add = root.querySelector(`[data-add-shortlist="${CSS.escape(domainId)}"]`);
        if (add) add.disabled = input.value === "custom" && !domainExplorerState(state, domainId).customHow.trim();
      }));
      root.querySelectorAll("[data-custom-how]").forEach((input) => input.addEventListener("input", () => {
        const domainId = input.dataset.customHow;
        const explore = domainExplorerState(state, domainId);
        explore.selectedHow = "custom";
        explore.customHow = input.value;
        const radio = root.querySelector(`[data-action-how="${CSS.escape(domainId)}"][value="custom"]`);
        if (radio) radio.checked = true;
        const add = root.querySelector(`[data-add-shortlist="${CSS.escape(domainId)}"]`);
        if (add) add.disabled = !input.value.trim();
      }));
      root.querySelectorAll("[data-another-hows]").forEach((button) => button.addEventListener("click", () => {
        domainExplorerState(state, button.dataset.anotherHows).howPage += 1;
        render();
        root.querySelector(`[data-another-hows="${CSS.escape(button.dataset.anotherHows)}"]`)?.focus();
      }));
      root.querySelectorAll("[data-add-shortlist]").forEach((button) => button.addEventListener("click", () => {
        const domainId = button.dataset.addShortlist;
        const domain = data.domains.find((item) => item.id === domainId);
        const explore = domainExplorerState(state, domainId);
        const whats = whatChoicesForDomain(data, actionData, state, domainId);
        const what = whats.find((item) => item.id === explore.selectedWhat);
        const how = what?.hows.find((item) => item.id === explore.selectedHow);
        const whatText = explore.selectedWhat === "custom" ? explore.customWhat.trim() : what?.what || "";
        const howText = explore.selectedHow === "custom" ? explore.customHow.trim() : how?.text || "";
        if (!whatText || !howText) return;
        const duplicate = state.act.shortlist.find((item) => item.domainId === domainId && item.what === whatText && item.how === howText);
        if (!duplicate) state.act.shortlist.push({
          id: `action-${Date.now().toString(36)}-${state.act.shortlist.length}`,
          domainId, domainName: domain.name,
          values: assignedValuesForDomain(data, state, domainId).map((value) => value.name),
          what: whatText, how: howText,
          whatId: what?.id || "", howId: how?.id || "",
        });
        render();
        root.querySelector(".values-shortlist")?.scrollIntoView?.({ block: "nearest" });
      }));
      root.querySelectorAll("[data-remove-shortlist]").forEach((button) => button.addEventListener("click", () => {
        state.act.shortlist = state.act.shortlist.filter((item) => item.id !== button.dataset.removeShortlist);
        if (state.act.smartFocusId === button.dataset.removeShortlist) state.act.smartFocusId = "";
        render();
      }));
      root.querySelectorAll("[data-smart-focus]").forEach((input) => input.addEventListener("change", () => {
        if (input.checked) { state.act.smartFocusId = input.value; root.querySelector("[data-build-smart]").disabled = false; }
      }));
      root.querySelector("[data-build-smart]")?.addEventListener("click", () => {
        const item = state.act.shortlist.find((candidate) => candidate.id === state.act.smartFocusId);
        if (!item || !global.TherapySkillHandoff) return;
        try {
          const token = global.TherapySkillHandoff.storePayload({ domain: item.domainName, values: item.values, what: item.what, how: item.how, mission: state.mission.statement });
          const opened = global.open(global.TherapySkillHandoff.goalBuilderUrl(token), "_blank");
          if (opened) opened.opener = null;
          if (!opened) root.querySelector("[data-values-status]").textContent = "Your browser blocked the new tab. Allow pop-ups for this site and try again.";
        } catch (_error) {
          root.querySelector("[data-values-status]").textContent = "The private local handoff could not be created in this browser.";
        }
      });
      root.querySelectorAll("[data-field]").forEach((field) => {
        const update = () => { setValue(state, field.dataset.field, field.value); };
        field.addEventListener("input", update);
        field.addEventListener("change", update);
      });
      root.querySelector("[data-mission-statement]")?.addEventListener("input", (event) => {
        state.mission.statement = event.target.value;
        state.mission.autoGenerated = false;
      });
      root.querySelector("[data-regenerate-mission]")?.addEventListener("click", () => {
        state.mission.autoGenerated = true;
        render();
      });
      root.querySelector("[data-back]")?.addEventListener("click", () => { state.step -= 1; render(); });
      root.querySelector("[data-next]")?.addEventListener("click", () => { state.step += 1; render(); });
      root.querySelector("[data-values-action-bar-toggle]")?.addEventListener("click", () => {
        setActionBarCollapsed(!actionBarCollapsed);
      });
      root.querySelector("[data-clear]")?.addEventListener("click", () => {
        if (!global.confirm("Clear all current Values selections and entries?")) return;
        state = initialValuesState();
        render();
      });
    }

    render();
    updateActionBar = setupValuesActionBar(
      root,
      () => state,
      () => actionBarCollapsed,
      setActionBarCollapsed
    );
    updateActionBar();
    if (Progress) {
      const topKeys = ["step", "selected", "custom", "legacy", "selectedDomains", "domainImportance", "domains", "core", "assessments", "focus", "actions", "barriers", "mission", "act", "review"];
      const objectOf = (value, validate) => Progress.isPlainObject(value) && Object.entries(value).every(([id, item]) => typeof id === "string" && validate(item));
      const strings = (value, allowed) => Progress.isPlainObject(value) && Object.keys(value).every((key) => allowed.includes(key)) && Object.values(value).every((item) => typeof item === "string");
      const valueRecord = (item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["id", "name", "definition", "suggested_domains", "aliases", "legacy"].includes(key)) && typeof item.id === "string" && typeof item.name === "string" && typeof item.definition === "string" && Array.isArray(item.suggested_domains) && item.suggested_domains.every((value) => typeof value === "string") && Array.isArray(item.aliases) && item.aliases.every((value) => typeof value === "string") && (item.legacy === undefined || typeof item.legacy === "boolean");
      const validateAct = (act) => Progress.isPlainObject(act)
        && typeof act.seed === "string"
        && Progress.isPlainObject(act.domains)
        && Object.values(act.domains).every((item) => Progress.isPlainObject(item))
        && Array.isArray(act.shortlist) && act.shortlist.length <= 200
        && act.shortlist.every((item) => Progress.isPlainObject(item) && ["id", "domainId", "domainName", "what", "how", "whatId", "howId"].every((key) => typeof item[key] === "string") && Array.isArray(item.values) && item.values.every((value) => typeof value === "string"))
        && typeof act.smartFocusId === "string";
      const validateState = (next) => Progress.isPlainObject(next) && Object.keys(next).every((key) => topKeys.includes(key))
        && Number.isInteger(next.step) && next.step >= 0 && next.step <= 8
        && objectOf(next.selected, (item) => strings(item, ["rating"]))
        && Array.isArray(next.custom) && next.custom.length <= 100 && next.custom.every(valueRecord)
        && (next.legacy === undefined || (Array.isArray(next.legacy) && next.legacy.length <= 100 && next.legacy.every(valueRecord)))
        && (next.selectedDomains === undefined || (Array.isArray(next.selectedDomains) && next.selectedDomains.every((item) => typeof item === "string")))
        && (next.domainImportance === undefined || objectOf(next.domainImportance, (item) => typeof item === "string"))
        && objectOf(next.domains, (item) => Array.isArray(item) && item.every((entry) => typeof entry === "string"))
        && (next.core === undefined || objectOf(next.core, (item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["chosen", "family"].includes(key)) && (item.chosen === undefined || typeof item.chosen === "boolean") && (item.family === undefined || typeof item.family === "string")))
        && objectOf(next.assessments, (item) => Progress.isPlainObject(item) && Object.keys(item).every((key) => ["importance", "current", "desired", "domain"].includes(key)) && Object.values(item).every((value) => typeof value === "string" || typeof value === "number"))
        && Array.isArray(next.focus) && next.focus.length <= 200 && next.focus.every((item) => typeof item === "string")
        && objectOf(next.actions, (item) => strings(item, ["why", "direction", "actions", "improvement", "next", "when", "support"]))
        && strings(next.barriers, ["type", "notes", "response", "next"])
        && Progress.isPlainObject(next.mission) && Object.keys(next.mission).every((key) => ["qualities", "actions", "service", "statement", "autoGenerated"].includes(key)) && typeof next.mission.statement === "string" && (next.mission.autoGenerated === undefined || typeof next.mission.autoGenerated === "boolean") && ["qualities", "actions", "service"].every((key) => next.mission[key] === undefined || typeof next.mission[key] === "string")
        && (next.act === undefined || validateAct(next.act))
        && (next.review === undefined || strings(next.review, ["aligned", "drifted", "attention", "discomfort", "continue", "change", "next", "date"]));
      const valueName = (id, next) => [...data.values, ...(next.legacy || []), ...next.custom].find((value) => value.id === id)?.name || id;
      const domainName = (id) => data.domains.find((domain) => domain.id === id)?.name || id;
      const normalizeRestoredState = (next) => {
        const copied = JSON.parse(JSON.stringify(next));
        const restored = initialValuesState(copied.act?.seed || state.act.seed);
        ["custom", "assessments", "barriers"].forEach((key) => { restored[key] = copied[key]; });
        restored.step = migrateValuesStep(next);
        Object.assign(restored, migrateValueRecords(data, copied));
        const validDomains = new Set(data.domains.map((domain) => domain.id));
        const assignedDomains = Object.values(restored.domains).flat().filter((id) => validDomains.has(id));
        const legacyAssessmentDomains = Object.values(restored.assessments).map((item) => item.domain).filter((id) => validDomains.has(id));
        const requestedDomains = Array.isArray(next.selectedDomains) ? next.selectedDomains : [...assignedDomains, ...legacyAssessmentDomains];
        restored.selectedDomains = [...new Set(requestedDomains.filter((id) => validDomains.has(id)))];
        restored.domainImportance = {};
        const domainAssessments = {};
        Object.entries(restored.assessments).forEach(([id, assessment]) => {
          const target = validDomains.has(id) ? id : assessment.domain;
          if (validDomains.has(target) && !domainAssessments[target]) {
            domainAssessments[target] = { current: assessment.current ?? "", desired: assessment.desired ?? "" };
            const directImportance = normalizedValueImportance(next.domainImportance?.[target]);
            const oldImportance = Number(assessment.importance);
            restored.domainImportance[target] = directImportance || (Number.isFinite(oldImportance) ? oldImportance >= 7 ? "High" : oldImportance >= 4 ? "Medium" : "Low" : "");
          }
        });
        restored.selectedDomains.forEach((id) => {
          if (!(id in restored.domainImportance)) restored.domainImportance[id] = normalizedValueImportance(next.domainImportance?.[id]);
        });
        restored.assessments = domainAssessments;
        restored.mission = {
          statement: String(next.mission.statement || ""),
          autoGenerated: typeof next.mission.autoGenerated === "boolean" ? next.mission.autoGenerated : !next.mission.statement,
        };
        if (copied.act) {
          restored.act = copied.act;
        } else {
          restored.focus.forEach((valueId, index) => {
            const action = restored.actions[valueId] || {};
            const domainId = restored.domains[valueId]?.[0] || restored.selectedDomains[0];
            const domain = data.domains.find((item) => item.id === domainId);
            const how = action.next || action.actions || "";
            const what = action.direction || action.improvement || action.why || "";
            if (domain && (what || how)) restored.act.shortlist.push({ id: `legacy-action-${index}`, domainId, domainName: domain.name, values: [valueName(valueId, restored)], what: what || "Legacy action plan", how: how || "Review and choose a concrete next action", whatId: "", howId: "" });
          });
        }
        return restored;
      };
      Progress.registerTool({
        root, toolId: "values", toolTitle: "Discover and Work Towards Your Values", route: Progress.TOOL_ROUTES.values, schemaVersion: 1,
        showFloating: false,
        showDraftPrompt: false,
        showFinalStartAgain: false,
        finalHeading: "Save your Values plan",
        privacyText: "Your entries are not saved on our servers. A temporary draft is saved in this browser. Save progress as Markdown to reopen it later. Nothing you enter here is uploaded.",
        getState: () => state,
        setState: (next) => { state = normalizeRestoredState(next); render(); },
        validateState,
        getReadableSummary: (next) => {
          const selected = Object.keys(next.selected).map((id) => valueName(id, next));
          const lines = ["# Discover and Work Towards Your Values", ""];
          if (selected.length) lines.push("## Selected Values", "", ...Object.keys(next.selected).map((id) => {
            const importance = normalizedValueImportance(next.selected[id].rating);
            return `- ${valueName(id, next)}${importance ? ` — Importance: ${importance}` : ""}`;
          }), "");
          const selectedDomains = next.selectedDomains || [];
          if (selectedDomains.length) lines.push("## Important Life Domains", "", ...selectedDomains.map((id) => `- ${domainName(id)}${next.domainImportance[id] ? ` — Importance: ${next.domainImportance[id]}` : ""}`), "");
          const assignments = Object.entries(next.domains).filter(([, domainIds]) => domainIds.length);
          if (assignments.length) {
            lines.push("## Value Assignments", "");
            assignments.forEach(([id, domainIds]) => lines.push(`### ${valueName(id, next)}`, "", ...domainIds.map((domainId) => `- ${domainName(domainId)}`), ""));
          }
          const domainAssessments = data.domains.map((domain) => domain.id).filter((id) => next.assessments[id]);
          if (domainAssessments.length) {
            lines.push("## Life Domain Assessment", "");
            domainAssessments.forEach((id) => {
              const assessment = next.assessments[id];
              lines.push(`### ${domainName(id)}`);
              if (next.domainImportance[id]) lines.push(`- Importance: ${next.domainImportance[id]}`);
              if (assessment.current !== undefined && assessment.current !== "") lines.push(`- Current Score: ${assessment.current}`);
              if (assessment.desired !== undefined && assessment.desired !== "") lines.push(`- Desired Score: ${assessment.desired}`);
              const investment = domainInvestment(data, next, data.domains.find((domain) => domain.id === id));
              if (investment.status !== "incomplete") {
                const ranked = rankDomainAssessments(data.domains.filter((domain) => next.selectedDomains.includes(domain.id)), next).find((item) => item.domain.id === id);
                lines.push(`- ${gapDescription(investment)}`);
                lines.push(`- Attention score: ${ranked.attentionScore.toFixed(2)}`);
                lines.push(`- Relative priority: ${Math.round(ranked.relativeScore)}%`);
              }
              lines.push("");
            });
          }
          const focus = next.focus.map((id) => valueName(id, next));
          if (focus.length) lines.push("## Focus Areas", "", ...focus.map((name) => `- ${name}`), "");
          next.focus.forEach((id) => {
            const action = next.actions[id] || {};
            const sections = [["Why this matters", action.why], ["Longer-term direction", action.direction], ["Short-term actions", action.actions], ["10% improvement", action.improvement], ["Smallest next step", action.next], ["When and where", action.when], ["Support", action.support]].filter(([, value]) => value);
            if (sections.length) { lines.push(`## Action Plan: ${valueName(id, next)}`, ""); sections.forEach(([label, value]) => lines.push(`### ${label}`, "", value, "")); }
          });
          if (next.act?.shortlist?.length) {
            lines.push("## My Short-Term Valued-Action List", "");
            next.act.shortlist.forEach((item) => {
              lines.push(`### ${item.how}`, "", `- Life Domain: ${item.domainName}`, `- Values: ${item.values.join(", ") || "None assigned"}`, `- What: ${item.what}`, `- How: ${item.how}`, "");
            });
          }
          [["Barriers", next.barriers.notes], ["Barrier Response", next.barriers.response], ["Mission Statement", next.mission.statement]].forEach(([heading, value]) => { if (value) lines.push(`## ${heading}`, "", value, ""); });
          return lines.join("\n").trim();
        },
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-skill-app="values"]').forEach((root) => {
      initValues(root).catch((error) => {
        root.innerHTML = `<p class="skill-app-note" role="alert">${escapeHtml(error.message)}. Please reload the page.</p>`;
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);

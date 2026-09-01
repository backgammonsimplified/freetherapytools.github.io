(function (global) {
  "use strict";

  const Progress = global.TherapySkillProgress;
  const Calendar = global.TherapyCalendar;
  const Site = global.TherapySite || { path: (value) => value };
  const HANDOFF_KEY = "therapy-skill-kit:thought-record-handoff";
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const FIVE_FACTORS = Object.freeze([
    ["situation", "Event or Trigger", "What happened? Who was involved? Where and when did it occur? Describe observable facts."],
    ["thoughts", "Thoughts", "What went through your mind? Include words, meanings, memories, or images."],
    ["emotions", "Emotions", "What emotions did you feel? Name them and, when useful, note intensity."],
    ["body", "Body Sensations", "What happened in your body, such as tension, heat, heartbeat, dizziness, or breathing changes?"],
    ["behaviours", "Behaviours", "What did you do or not do? Include reactions, avoidance, and safety behaviours."],
  ]);

  const CASE_MAP_FIELDS = Object.freeze([
    ["behaviours", "Behaviours", "What actions, withdrawal, reduced activity, self-care changes, crying, substance use, or other behaviours are part of the recurring problem?"],
    ["body", "Body and physical concerns", "What is happening with sleep, eating, pain, energy, illness, headaches, or other body and health concerns?"],
    ["thoughts", "Thoughts", "What worry, self-criticism, hopelessness, mental images, or safety-related thoughts recur?"],
    ["emotions", "Emotions", "What sadness, anger, fear, guilt, overwhelm, numbness, or other emotions recur?"],
    ["stressors", "Environmental stressors", "What relationships, work, finances, loss, housing, or physical-health demands affect the pattern?"],
    ["strengths", "Strengths and resources", "What determination, resilience, hope, values, beliefs, people, services, or practical supports can help?"],
  ]);

  const THINKING_TRAPS = Object.freeze([
    ["all-or-nothing", "All-or-Nothing Thinking", "Seeing only absolute categories, with no middle ground.", "If this is not perfect, it is a complete failure."],
    ["overgeneralizing", "Overgeneralizing", "Taking one event as proof of a broad, continuing pattern.", "This happened once, so it will always happen."],
    ["mental-filter", "Mental Filter", "Focusing on one negative detail while filtering out other information.", "Only the one mistake counts."],
    ["disqualifying-positive", "Disqualifying the Positive", "Dismissing positive experiences as accidental or unimportant.", "That success does not count."],
    ["mind-reading", "Mind Reading", "Assuming you know what another person thinks without enough evidence.", "They must think badly of me."],
    ["fortune-telling", "Fortune Telling", "Predicting a negative outcome as though it were certain.", "I know this will go badly."],
    ["catastrophizing-minimizing", "Magnification, Catastrophizing, and Minimization", "Exaggerating danger or consequences while shrinking strengths and coping options.", "This would be unbearable, and nothing I can do would help."],
    ["emotional-reasoning", "Emotional Reasoning", "Treating a feeling as proof.", "I feel afraid, so this must be dangerous."],
    ["should-statements", "Should Statements", "Using rigid rules about how you, others, or the world must behave.", "I should never make mistakes."],
    ["labelling", "Labelling", "Turning a behaviour or mistake into a fixed global label.", "I made a mistake, so I am a failure."],
    ["personalization", "Personalization", "Taking excessive responsibility or assuming another person's behaviour is about you.", "Their mood must be my fault."],
    ["overestimating-danger", "Overestimating Danger", "Treating a threat as more likely or severe than the evidence supports.", "The worst outcome is very likely."],
  ]);

  function register(root, config) {
    if (!Progress) return;
    Progress.registerTool({ root, schemaVersion: 1, ...config });
  }

  function pageShell(title, intro, body, sourceLinks = "") {
    return `<div class="skill-app-shell quick-tool-shell"><header class="skill-app-header"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p></header><section class="skill-app-panel">${body}${sourceLinks}</section><footer class="skill-app-footer"></footer></div>`;
  }

  function learnLinks(items) {
    return `<nav class="quick-tool-source-links" aria-label="Learn and source links">${items.map(([label, href, external]) => `<a class="skill-app-link-button secondary" href="${escapeHtml(Site.path(href))}"${external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(label)}${external ? ' <span class="visually-hidden">(opens in a new tab)</span>' : ""}</a>`).join("")}</nav>`;
  }

  function stringsOnly(object, keys) {
    return isObject(object) && Object.keys(object).every((key) => keys.includes(key)) && keys.every((key) => typeof object[key] === "string");
  }

  function initFiveFactor(root) {
    let state = Object.fromEntries(FIVE_FACTORS.map(([key]) => [key, ""]));
    function render() {
      const cards = FIVE_FACTORS.map(([key, label, prompt], index) => `<label class="five-factor-card five-factor-card--${index + 1}" for="five-factor-${key}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(prompt)}</span><textarea id="five-factor-${key}" data-five-factor="${key}">${escapeHtml(state[key])}</textarea></label>`).join("");
      root.innerHTML = pageShell("Five Factor Model", "Map one situation as an interacting loop. Changing any factor can influence the others.", `<div class="five-factor-map" aria-label="Five interacting CBT factors"><div class="five-factor-center" aria-hidden="true">One current situation</div>${cards}</div><p class="skill-app-note">Use observable details where possible. This is a formulation aid, not a clinical score.</p>`, learnLinks([["Learn the Five Factor Model", "/learn/cbt-anxiety/introduction-to-cbt.html#five-factor-model"], ["Printable worksheet", "/resources/cbt-skills/cbt-skills-p010.jpg", true]]));
      root.querySelectorAll("[data-five-factor]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.fiveFactor] = field.value; }));
    }
    render();
    register(root, { toolId: "five-factor-model", toolTitle: "Five Factor Model", route: Progress.TOOL_ROUTES["five-factor-model"], showDraftPrompt: false, showOpenPreviousProgress: false, getState: () => state, setState: (next) => { state = { ...state, ...next }; render(); }, validateState: (next) => stringsOnly(next, FIVE_FACTORS.map(([key]) => key)), getReadableSummary: (next) => Progress.nonEmptySections("Five Factor Model", FIVE_FACTORS.map(([key, label]) => [label, next[key]])) });
  }

  function initCaseMap(root) {
    let state = Object.fromEntries(CASE_MAP_FIELDS.map(([key]) => [key, ""]));
    function render() {
      root.innerHTML = pageShell("Case Map", "Organize a broader recurring problem without treating any one part as the whole story.", `<div class="case-map-fields">${CASE_MAP_FIELDS.map(([key, label, prompt]) => `<label class="case-map-field" for="case-map-${key}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(prompt)}</span><textarea id="case-map-${key}" data-case-map="${key}">${escapeHtml(state[key])}</textarea></label>`).join("")}</div><p class="skill-app-note">This Case Map uses the project's source structure. The Five Factor Model is a separate tool for mapping five interacting parts of one current situation.</p>`, learnLinks([["Learn about the Case Map", "/learn/goal-setting/goal-setting-guidelines.html#case-map"], ["Open the source worksheet", "/resources/goal-setting/goal-setting-p002.jpg", true], ["Five Factor Model", "/tool-finder/five-factor-model/"]]));
      root.querySelectorAll("[data-case-map]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.caseMap] = field.value; }));
    }
    render();
    register(root, { toolId: "case-map", toolTitle: "Case Map", route: Progress.TOOL_ROUTES["case-map"], getState: () => state, setState: (next) => { state = { ...state, ...next }; render(); }, validateState: (next) => stringsOnly(next, CASE_MAP_FIELDS.map(([key]) => key)), getReadableSummary: (next) => Progress.nonEmptySections("Case Map", CASE_MAP_FIELDS.map(([key, label]) => [label, next[key]])) });
  }

  function initThinkingTraps(root) {
    const challengeFields = [["evidenceFor", "What evidence supports this thought?"], ["evidenceAgainst", "What evidence does not support it?"], ["alternativeView", "Is there another way of seeing the situation?"], ["friendResponse", "What would I say to a close friend in the same situation?"], ["balancedThought", "What is a more balanced thought?"]];
    let state = { context: "", thought: "", selected: [], ...Object.fromEntries(challengeFields.map(([key]) => [key, ""])) };
    function render() {
      const cards = THINKING_TRAPS.map(([id, name, description, example]) => `<label class="thinking-trap-card"><span class="thinking-trap-choice"><input type="checkbox" data-trap="${id}" ${state.selected.includes(id) ? "checked" : ""}><strong>${escapeHtml(name)}</strong></span><span>${escapeHtml(description)}</span><small>Example: ${escapeHtml(example)}</small></label>`).join("");
      root.innerHTML = pageShell("Recognizing Thinking Traps", "Enter a thought, identify any patterns that fit, and challenge the thought with the curriculum's evidence-based questions.", `<label for="trap-context">Situation or context</label><textarea id="trap-context" data-trap-field="context">${escapeHtml(state.context)}</textarea><label for="trap-thought">Thought I am examining</label><textarea id="trap-thought" data-trap-field="thought">${escapeHtml(state.thought)}</textarea><fieldset class="skill-app-fieldset"><legend>Which source-backed patterns may fit?</legend><p>Select any that seem relevant. A label is a prompt to check a thought, not proof that it is wrong.</p><div class="thinking-trap-grid">${cards}</div></fieldset><section class="challenge-thought"><h3>Challenge the thought</h3><p>Look for a fairer account that includes all the evidence rather than forcing a positive answer.</p>${challengeFields.map(([key, label]) => `<label for="trap-${key}">${escapeHtml(label)}</label><textarea id="trap-${key}" data-trap-field="${key}">${escapeHtml(state[key])}</textarea>`).join("")}</section><div class="skill-app-actions"><button type="button" data-start-thought-record>Continue in Thought Record</button></div><p class="skill-app-field-help">The handoff uses temporary session storage. Your text is not placed in the page URL.</p>`, learnLinks([["Thinking Traps lesson", "/learn/cbt-anxiety/thinking-traps.html#thinking-traps"], ["Thought Record Part 2", "/learn/cbt-anxiety/thought-records-part-2.html#thought-record-part-2"], ["Thinking Traps overview", "/resources/cbt-skills/cbt-skills-p012.jpg", true]]));
      root.querySelectorAll("[data-trap-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.trapField] = field.value; }));
      root.querySelectorAll("[data-trap]").forEach((field) => field.addEventListener("change", () => { state.selected = [...root.querySelectorAll("[data-trap]:checked")].map((item) => item.dataset.trap); }));
      root.querySelector("[data-start-thought-record]")?.addEventListener("click", () => {
        try { global.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(state)); } catch (_error) { /* direct navigation still works */ }
        global.location.href = Site.path("/tool-finder/thought-record/");
      });
    }
    render();
    register(root, { toolId: "thinking-traps", toolTitle: "Recognizing Thinking Traps", route: Progress.TOOL_ROUTES["thinking-traps"], getState: () => state, setState: (next) => { state = { context: next.context || "", thought: next.thought || "", selected: Array.isArray(next.selected) ? [...next.selected] : [], ...Object.fromEntries(challengeFields.map(([key]) => [key, next[key] || ""])) }; render(); }, validateState: (next) => isObject(next) && Object.keys(next).every((key) => ["context", "thought", "selected", ...challengeFields.map(([field]) => field)].includes(key)) && typeof next.context === "string" && typeof next.thought === "string" && challengeFields.every(([key]) => next[key] === undefined || typeof next[key] === "string") && Array.isArray(next.selected) && next.selected.every((id) => THINKING_TRAPS.some(([trapId]) => trapId === id)), getReadableSummary: (next) => Progress.nonEmptySections("Recognizing Thinking Traps", [["Situation or Context", next.context], ["Thought", next.thought], ["Thinking Traps", next.selected.map((id) => THINKING_TRAPS.find(([trapId]) => trapId === id)?.[1] || id)], ...challengeFields.map(([key, label]) => [label, next[key]])]) });
  }

  const THOUGHT_FIELDS = ["situation", "otherEmotion", "otherIntensity", "otherNotes", "otherAfterIntensity", "hotThoughtId", "customHotThought", "beliefBefore", "evidenceFor", "evidenceAgainst", "balancedThought", "beliefBalanced"];
  const CANONICAL_EMOTION_IDS = Object.freeze(["anger", "disgust", "envy", "fear", "happiness", "jealousy", "love", "sadness", "shame", "guilt"]);
  const emptyEmotionRatings = () => Object.fromEntries(CANONICAL_EMOTION_IDS.map((id) => [id, { intensity: "", notes: "", afterIntensity: "" }]));
  function initialThoughtRecord() { return { ...Object.fromEntries(THOUGHT_FIELDS.map((key) => [key, ""])), emotionRatings: emptyEmotionRatings(), automaticThoughts: [{ id: "thought-1", text: "" }], traps: [] }; }
  function normalizeThoughtRecord(next) {
    const base = initialThoughtRecord();
    const input = next || {};
    const ratings = emptyEmotionRatings();
    if (isObject(input.emotionRatings)) CANONICAL_EMOTION_IDS.forEach((id) => { if (isObject(input.emotionRatings[id])) ratings[id] = { intensity: String(input.emotionRatings[id].intensity || ""), notes: String(input.emotionRatings[id].notes || ""), afterIntensity: String(input.emotionRatings[id].afterIntensity || "") }; });
    const thoughts = Array.isArray(input.automaticThoughts) ? input.automaticThoughts.map((item, index) => isObject(item) ? { id: String(item.id || `thought-${index + 1}`), text: String(item.text || "") } : { id: `thought-${index + 1}`, text: String(item || "") }) : [{ id: "thought-1", text: String(input.automaticThoughts || "") }];
    const legacyHot = String(input.hotThought || "");
    const selectedLegacy = thoughts.find((item) => item.text.trim() && item.text.trim() === legacyHot.trim());
    return {
      ...base,
      ...Object.fromEntries(THOUGHT_FIELDS.map((key) => [key, typeof input[key] === "string" ? input[key] : base[key]])),
      situation: String(input.situation || ""),
      emotionRatings: ratings,
      otherEmotion: String(input.otherEmotion || (typeof input.emotions === "string" ? input.emotions : "")),
      otherIntensity: String(input.otherIntensity || input.initialIntensity || ""),
      otherNotes: String(input.otherNotes || ""),
      otherAfterIntensity: String(input.otherAfterIntensity || input.emotionAfter || ""),
      automaticThoughts: thoughts.length ? thoughts : [{ id: "thought-1", text: "" }],
      hotThoughtId: String(input.hotThoughtId || selectedLegacy?.id || ""),
      customHotThought: String(input.customHotThought || (!selectedLegacy ? legacyHot : "")),
      traps: Array.isArray(input.traps) ? [...input.traps] : [],
    };
  }
  function validateThoughtRecordState(next) {
    const validRating = (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100);
    const allowed = [...THOUGHT_FIELDS, "emotionRatings", "automaticThoughts", "traps", "emotions", "initialIntensity", "hotThought", "emotionAfter"];
    if (!isObject(next) || !Object.keys(next).every((key) => allowed.includes(key))) return false;
    const current = normalizeThoughtRecord(next);
    return THOUGHT_FIELDS.every((key) => typeof current[key] === "string")
      && [current.otherIntensity, current.otherAfterIntensity, current.beliefBefore, current.beliefBalanced].every(validRating)
      && CANONICAL_EMOTION_IDS.every((id) => isObject(current.emotionRatings[id]) && [current.emotionRatings[id].intensity, current.emotionRatings[id].afterIntensity].every(validRating) && typeof current.emotionRatings[id].notes === "string")
      && Array.isArray(current.automaticThoughts) && current.automaticThoughts.length >= 1 && current.automaticThoughts.length <= 100 && new Set(current.automaticThoughts.map((item) => item.id)).size === current.automaticThoughts.length && current.automaticThoughts.every((item) => isObject(item) && typeof item.id === "string" && typeof item.text === "string")
      && Array.isArray(current.traps) && current.traps.length <= THINKING_TRAPS.length && new Set(current.traps).size === current.traps.length
      && current.traps.every((id) => THINKING_TRAPS.some(([trapId]) => trapId === id));
  }

  function ratingField(id, label, value) {
    return `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="number" min="0" max="100" inputmode="numeric" value="${escapeHtml(value)}" data-thought-field="${id.replace("thought-", "")}">`;
  }

  function thoughtRecordSummarySections(next, emotions) {
    const current = normalizeThoughtRecord(next);
    const emotionSummary = emotions.map((emotion) => {
      const item = current.emotionRatings[emotion.id];
      const parts = [item.intensity && `initial ${item.intensity}/100`, item.notes && `notes/sensations: ${item.notes}`, item.afterIntensity && `after ${item.afterIntensity}/100`].filter(Boolean);
      return parts.length ? `${emotion.name}: ${parts.join("; ")}` : "";
    }).filter(Boolean);
    if (current.otherEmotion || current.otherIntensity || current.otherNotes || current.otherAfterIntensity) {
      emotionSummary.push(`Other (${current.otherEmotion || "not named"}): ${[current.otherIntensity && `initial ${current.otherIntensity}/100`, current.otherNotes && `notes/sensations: ${current.otherNotes}`, current.otherAfterIntensity && `after ${current.otherAfterIntensity}/100`].filter(Boolean).join("; ")}`);
    }
    const hotThought = current.automaticThoughts.find((item) => item.id === current.hotThoughtId)?.text || current.customHotThought;
    return [["1. Situation", current.situation], ["2. Emotions, Moods and Sensations", emotionSummary], ["3. Automatic Thoughts", current.automaticThoughts.map((item) => item.text).filter(Boolean)], ["Hot Thought", [hotThought, current.beliefBefore && `Belief: ${current.beliefBefore}/100`]], ["4. Thinking Traps", current.traps.map((id) => THINKING_TRAPS.find(([trapId]) => trapId === id)?.[1] || id)], ["5. Supporting Evidence", current.evidenceFor], ["6. Challenging Evidence", current.evidenceAgainst], ["7. Alternative Balanced Thought", [current.balancedThought, current.beliefBalanced && `Belief: ${current.beliefBalanced}/100`]]];
  }

  async function initThoughtRecord(root) {
    const response = await fetch(Site.path("/data/skill-apps/emotions.json"), { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not load the canonical emotion families");
    const emotions = (await response.json()).emotions.filter((emotion) => CANONICAL_EMOTION_IDS.includes(emotion.id));
    let state = initialThoughtRecord();
    try {
      const handoff = JSON.parse(global.sessionStorage.getItem(HANDOFF_KEY) || "null");
      global.sessionStorage.removeItem(HANDOFF_KEY);
      if (isObject(handoff)) state = normalizeThoughtRecord({ situation: String(handoff.context || ""), automaticThoughts: [{ id: "thought-1", text: String(handoff.thought || "") }], customHotThought: String(handoff.thought || ""), traps: Array.isArray(handoff.selected) ? handoff.selected : [], evidenceFor: String(handoff.evidenceFor || ""), evidenceAgainst: String(handoff.evidenceAgainst || ""), balancedThought: String(handoff.balancedThought || "") });
    } catch (_error) { /* begin with a blank record */ }
    function render(focusId = "") {
      const trapMarkup = THINKING_TRAPS.map(([id, name]) => `<label class="skill-app-check"><input type="checkbox" data-thought-trap="${id}" ${state.traps.includes(id) ? "checked" : ""}> <span>${escapeHtml(name)}</span></label>`).join("");
      const emotionCards = emotions.map((emotion) => { const rating = state.emotionRatings[emotion.id]; return `<article class="thought-emotion-card" data-emotion-id="${emotion.id}"><h4>${escapeHtml(emotion.name)}</h4><label for="thought-emotion-${emotion.id}">Intensity (0–100)</label><input id="thought-emotion-${emotion.id}" type="number" min="0" max="100" inputmode="numeric" data-emotion-field="intensity" value="${escapeHtml(rating.intensity)}"><label for="thought-emotion-notes-${emotion.id}">Notes / sensations</label><textarea id="thought-emotion-notes-${emotion.id}" data-emotion-field="notes">${escapeHtml(rating.notes)}</textarea></article>`; }).join("");
      const thoughts = state.automaticThoughts.map((thought, index) => `<div class="automatic-thought-row" data-thought-id="${escapeHtml(thought.id)}"><label for="${escapeHtml(thought.id)}">Thought ${index + 1}</label><textarea id="${escapeHtml(thought.id)}" data-automatic-thought>${escapeHtml(thought.text)}</textarea>${state.automaticThoughts.length > 1 ? '<button type="button" class="secondary" data-remove-thought>Remove</button>' : ""}</div>`).join("");
      const hotChoices = state.automaticThoughts.filter((item) => item.text.trim()).map((thought) => `<label class="skill-app-check"><input type="radio" name="hot-thought" value="${escapeHtml(thought.id)}" ${state.hotThoughtId === thought.id ? "checked" : ""}> <span>${escapeHtml(thought.text)}</span></label>`).join("");
      const reratings = emotions.map((emotion) => `<label class="thought-rerating" for="thought-after-${emotion.id}"><span>${escapeHtml(emotion.name)}</span><input id="thought-after-${emotion.id}" type="number" min="0" max="100" inputmode="numeric" data-after-emotion="${emotion.id}" value="${escapeHtml(state.emotionRatings[emotion.id].afterIntensity)}"></label>`).join("");
      const body = `<ol class="thought-record-steps">
        <li><h3>1. Situation</h3><label for="thought-situation">Who, what, when, and where? Describe the event briefly and factually.</label><textarea id="thought-situation" data-thought-field="situation">${escapeHtml(state.situation)}</textarea></li>
        <li><h3>2. Emotions, moods and sensations</h3><p>Use any of the same ten broad emotion families used by Emotion Explorer. Leave any card blank when it does not fit.</p><div class="thought-emotion-grid">${emotionCards}</div><details><summary>Another emotion, mood, or sensation</summary><label for="thought-otherEmotion">Name</label><input id="thought-otherEmotion" data-thought-field="otherEmotion" value="${escapeHtml(state.otherEmotion)}"><label for="thought-otherIntensity">Intensity (0–100)</label><input id="thought-otherIntensity" type="number" min="0" max="100" data-thought-field="otherIntensity" value="${escapeHtml(state.otherIntensity)}"><label for="thought-otherNotes">Notes / sensations</label><textarea id="thought-otherNotes" data-thought-field="otherNotes">${escapeHtml(state.otherNotes)}</textarea></details></li>
        <li><h3>3. Automatic Thoughts</h3><p>What words or images went through your mind? Write down all related thoughts, even if you don’t fully believe them.</p><div class="automatic-thought-list">${thoughts}</div><button type="button" data-add-thought>Add thought</button><fieldset class="skill-app-fieldset hot-thought-fieldset"><legend>Hot thought (most difficult)</legend><p>The thought most strongly connected with the difficult emotion.</p>${hotChoices || "<p>Enter an automatic thought above to select it here.</p>"}<label class="skill-app-check"><input type="radio" name="hot-thought" value="custom" ${!state.hotThoughtId && state.customHotThought ? "checked" : ""}> <span>Enter a custom hot thought</span></label><textarea data-custom-hot-thought aria-label="Custom hot thought">${escapeHtml(state.customHotThought)}</textarea>${ratingField("thought-beliefBefore", "How much did I believe the hot thought? (0-100)", state.beliefBefore)}</fieldset></li>
        <li><h3>4. Identify thinking traps</h3><div class="thought-record-traps">${trapMarkup}</div></li>
        <li><h3>5. Supporting evidence</h3><label for="thought-evidenceFor">What observable facts support the hot thought?</label><textarea id="thought-evidenceFor" data-thought-field="evidenceFor">${escapeHtml(state.evidenceFor)}</textarea></li>
        <li><h3>6. Challenging evidence</h3><label for="thought-evidenceAgainst">What facts does it overlook or contradict? What might a trusted person notice?</label><textarea id="thought-evidenceAgainst" data-thought-field="evidenceAgainst">${escapeHtml(state.evidenceAgainst)}</textarea></li>
        <li><h3>7. Alternative balanced thought</h3><label for="thought-balancedThought">Write a fair interpretation that includes all the evidence, without forced positivity.</label><textarea id="thought-balancedThought" data-thought-field="balancedThought">${escapeHtml(state.balancedThought)}</textarea>${ratingField("thought-beliefBalanced", "How much do I believe the balanced thought? (0-100)", state.beliefBalanced)}</li>
        <li><h3>8. Re-rate emotions</h3><p>Re-rate any emotion you used. Leave the others blank.</p><div class="thought-rerating-grid">${reratings}</div><label for="thought-otherAfterIntensity">Other emotion intensity now (0–100)</label><input id="thought-otherAfterIntensity" type="number" min="0" max="100" data-thought-field="otherAfterIntensity" value="${escapeHtml(state.otherAfterIntensity)}"><p class="skill-app-field-help">The goal is not to force a lower number; it is to notice what changes after considering a fuller account.</p></li>
      </ol>`;
      root.innerHTML = pageShell("Thought Record", "Complete the curriculum's Part 1 and Part 2 progression in one practical record.", body, learnLinks([["Thought Records Part 1", "/learn/cbt-anxiety/thought-records.html#thought-record-part-1"], ["Thought Records Part 2", "/learn/cbt-anxiety/thought-records-part-2.html#thought-record-part-2"], ["Blank printable record", "/resources/cbt-skills/cbt-skills-p034.jpg", true]]));
      root.querySelectorAll("[data-thought-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.thoughtField] = field.value; }));
      root.querySelectorAll("[data-emotion-id]").forEach((card) => card.querySelectorAll("[data-emotion-field]").forEach((field) => field.addEventListener("input", () => { state.emotionRatings[card.dataset.emotionId][field.dataset.emotionField] = field.value; })));
      root.querySelectorAll("[data-after-emotion]").forEach((field) => field.addEventListener("input", () => { state.emotionRatings[field.dataset.afterEmotion].afterIntensity = field.value; }));
      root.querySelectorAll("[data-thought-id]").forEach((row) => { const thought = state.automaticThoughts.find((item) => item.id === row.dataset.thoughtId); const editor = row.querySelector("[data-automatic-thought]"); editor.addEventListener("input", (event) => { thought.text = event.target.value; }); editor.addEventListener("change", () => render()); row.querySelector("[data-remove-thought]")?.addEventListener("click", () => { state.automaticThoughts = state.automaticThoughts.filter((item) => item.id !== thought.id); if (state.hotThoughtId === thought.id) state.hotThoughtId = ""; render(); }); });
      root.querySelector("[data-add-thought]")?.addEventListener("click", () => { const id = `thought-${Date.now().toString(36)}`; state.automaticThoughts.push({ id, text: "" }); render(id); });
      root.querySelectorAll('input[name="hot-thought"]').forEach((radio) => radio.addEventListener("change", () => { state.hotThoughtId = radio.value === "custom" ? "" : radio.value; }));
      root.querySelector("[data-custom-hot-thought]")?.addEventListener("input", (event) => { state.customHotThought = event.target.value; if (event.target.value.trim()) state.hotThoughtId = ""; });
      root.querySelectorAll("[data-thought-trap]").forEach((field) => field.addEventListener("change", () => { state.traps = [...root.querySelectorAll("[data-thought-trap]:checked")].map((item) => item.dataset.thoughtTrap); }));
      if (focusId) root.querySelector(`[data-thought-id="${focusId}"] textarea`)?.focus();
    }
    render();
    register(root, { toolId: "thought-record", toolTitle: "Thought Record", route: Progress.TOOL_ROUTES["thought-record"], getState: () => state, setState: (next) => { state = normalizeThoughtRecord(next); render(); }, validateState: validateThoughtRecordState, getReadableSummary: (next) => Progress.nonEmptySections("Thought Record", thoughtRecordSummarySections(next, emotions)) });
  }

  function initWorryTime(root) {
    let state = { worry: "", cue: "", response: "I have a time to return to this. For now, I will bring attention back to the present activity.", calendar: Calendar?.initialState({ recurring: true, frequency: "daily", durationMinutes: "20" }) || {} };
    function render() {
      root.innerHTML = pageShell("Worry Time", "Briefly note a worry, postpone extended thinking, and optionally schedule a consistent limited worry period.", `<label for="worry-time-worry">Worry to defer</label><textarea id="worry-time-worry" data-worry-field="worry">${escapeHtml(state.worry)}</textarea><label for="worry-time-cue">Brief cue I can recognize later</label><input id="worry-time-cue" type="text" data-worry-field="cue" value="${escapeHtml(state.cue)}"><label for="worry-time-response">What I will remind myself when the worry returns</label><textarea id="worry-time-response" data-worry-field="response">${escapeHtml(state.response)}</textarea><h3>Optional worry-time window</h3><p>Choose a consistent, limited period that is not close to bedtime. Calendar use is optional.</p><div data-worry-time-calendar></div><aside class="skill-app-note"><strong>When the thought returns:</strong> note a few cue words, remind yourself that you have a planned time for it, and gently return attention to the present task. During the worry period, use the Worry Tree to separate current problems from hypothetical worries.</aside>`, learnLinks([["Worry Time instructions", "/learn/cbt-anxiety/understanding-worry.html#worry-time"], ["Open Worry Tree", "/tool-finder/worry-tree/"], ["Postpone Your Worry source", "/resources/cbt-skills/cbt-skills-p040.jpg", true]]));
      root.querySelectorAll("[data-worry-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.worryField] = field.value; }));
      if (Calendar) Calendar.mountEditor(root.querySelector("[data-worry-time-calendar]"), { id: "worry-time", state: state.calendar, title: "Worry time", description: state.cue || "A contained time to review noted worries.", allowRecurrence: true, onChange: (next) => { state.calendar = clone(next); } });
    }
    render();
    register(root, { toolId: "worry-time", toolTitle: "Worry Time", route: Progress.TOOL_ROUTES["worry-time"], getState: () => state, setState: (next) => { state = { worry: next.worry, cue: next.cue, response: next.response, calendar: Calendar?.normalizeState(next.calendar) || next.calendar }; render(); }, validateState: (next) => isObject(next) && typeof next.worry === "string" && typeof next.cue === "string" && typeof next.response === "string" && isObject(next.calendar), getReadableSummary: (next) => Progress.nonEmptySections("Worry Time", [["Worry to Defer", next.worry], ["Brief Cue", next.cue], ["Reminder", next.response], ["Worry-time Window", Calendar?.calendarCommitmentValid(next.calendar) ? `${next.calendar.date} at ${Calendar.calendarTimeSlots(next.calendar).join(", ")}` : "Not scheduled"]]) });
  }

  const BREATH_PHASES = Object.freeze([
    ["inhale", "Inhale"], ["holdIn", "Hold"], ["exhale", "Exhale"], ["holdOut", "Hold"],
  ]);
  class BoxBreathingMachine {
    constructor(durations = {}) { this.configure(durations); this.reset(); }
    configure(durations = {}) {
      const phaseValue = (key, fallback, allowZero = false) => { const value = Number(durations[key]); if (!Number.isFinite(value)) return fallback; return allowZero ? Math.max(0, value) : Math.max(1, value); };
      this.durations = { inhale: phaseValue("inhale", 4), holdIn: phaseValue("holdIn", 4, true), exhale: phaseValue("exhale", 4), holdOut: phaseValue("holdOut", 4, true) };
    }
    reset() { this.phaseIndex = 0; this.remaining = this.durations.inhale; this.running = false; this.cycles = 0; }
    start() { this.running = true; }
    pause() { this.running = false; }
    advance(seconds) {
      let delta = Math.max(0, Number(seconds) || 0);
      if (!this.running) return this.snapshot();
      let guard = 0;
      while (guard < 100) {
        guard += 1;
        if (this.remaining > 0 && delta < this.remaining) { this.remaining -= delta; break; }
        if (this.remaining > 0) delta -= this.remaining;
        this.phaseIndex = (this.phaseIndex + 1) % BREATH_PHASES.length;
        if (this.phaseIndex === 0) this.cycles += 1;
        this.remaining = this.durations[BREATH_PHASES[this.phaseIndex][0]];
        if (delta <= 0 && this.remaining > 0) break;
      }
      return this.snapshot();
    }
    snapshot() { const [phase, label] = BREATH_PHASES[this.phaseIndex]; return { phase, label, remaining: this.remaining, duration: this.durations[phase], running: this.running, cycles: this.cycles }; }
  }

  function initBoxBreathing(root) {
    let state = { durations: { inhale: "4", holdIn: "4", exhale: "4", holdOut: "4" }, cycles: 0 };
    let machine = new BoxBreathingMachine(state.durations);
    let timer = 0;
    let lastTick = 0;
    function visualProgress(snapshot) { const elapsed = snapshot.duration - snapshot.remaining; const ratio = snapshot.duration ? elapsed / snapshot.duration : 0; if (snapshot.phase === "inhale") return ratio; if (snapshot.phase === "holdIn") return 1; if (snapshot.phase === "exhale") return 1 - ratio; return 0; }
    function updateStatus() {
      const snapshot = machine.snapshot();
      state.cycles = snapshot.cycles;
      const phase = root.querySelector("[data-breath-phase]");
      const remaining = root.querySelector("[data-breath-remaining]");
      const circle = root.querySelector("[data-breath-circle]");
      const pause = root.querySelector("[data-breath-pause]");
      if (phase) phase.textContent = snapshot.running ? snapshot.label : "Ready";
      if (remaining) remaining.textContent = snapshot.running ? `${Math.max(1, Math.ceil(snapshot.remaining))} seconds` : `${snapshot.cycles} completed cycle${snapshot.cycles === 1 ? "" : "s"}`;
      if (circle) { circle.dataset.phase = snapshot.phase; circle.style.setProperty("--breath-progress", visualProgress(snapshot).toFixed(3)); }
      if (pause) pause.disabled = !snapshot.running;
    }
    function stopTimer() { if (timer) global.clearInterval(timer); timer = 0; }
    function render() {
      stopTimer();
      machine = new BoxBreathingMachine(state.durations); machine.cycles = Number(state.cycles) || 0;
      const controls = [["inhale", "Inhale", 1], ["holdIn", "Hold after inhale", 0], ["exhale", "Exhale", 1], ["holdOut", "Hold after exhale", 0]].map(([key, label, minimum]) => `<label for="breath-${key}">${label} (seconds)<input id="breath-${key}" type="number" min="${minimum}" max="30" step="1" data-breath-duration="${key}" data-minimum="${minimum}" value="${escapeHtml(state.durations[key])}"></label>`).join("");
      root.innerHTML = pageShell("Box Breathing", "Use a configurable four-phase breathing timer. Either hold can be set to 0.", `<div class="box-breathing-tool"><div class="box-breathing-stage" aria-live="polite"><div class="box-breathing-circle" data-breath-circle style="--breath-progress:0"><span data-breath-phase>Ready</span><small data-breath-remaining>${state.cycles} completed cycles</small></div></div><div class="box-breathing-settings">${controls}<aside class="skill-app-note box-breathing-safety">Please consult your doctor or health care practitioner before holding your breath if you have concerns about whether breath-hold exercises are appropriate for you. Everyone has different breathing needs. Be mindful of what feels safe and works for you.</aside></div><div class="skill-app-actions box-breathing-actions"><button type="button" data-breath-start>Start</button><button type="button" class="secondary" data-breath-pause disabled>Pause</button><button type="button" class="secondary" data-breath-reset>Reset</button></div></div><p class="skill-app-note">The source curriculum names Box Breathing but does not prescribe timings. Four seconds per phase is a configurable starting setup, not a required pace.</p>`, learnLinks([["Goal Setting strengths", "/learn/goal-setting/goal-setting-guidelines.html#strengths"]]));
      root.querySelectorAll("[data-breath-duration]").forEach((field) => field.addEventListener("change", () => { const minimum = Number(field.dataset.minimum); const parsed = Number(field.value); const value = Math.max(minimum, Math.min(30, Number.isFinite(parsed) ? parsed : 4)); state.durations[field.dataset.breathDuration] = String(value); field.value = String(value); machine.configure(state.durations); machine.reset(); state.cycles = 0; updateStatus(); }));
      root.querySelector("[data-breath-start]")?.addEventListener("click", () => { if (machine.running) return; machine.start(); lastTick = performance.now(); stopTimer(); timer = global.setInterval(() => { const now = performance.now(); machine.advance((now - lastTick) / 1000); lastTick = now; updateStatus(); }, 100); updateStatus(); });
      root.querySelector("[data-breath-pause]")?.addEventListener("click", () => { machine.pause(); stopTimer(); updateStatus(); });
      root.querySelector("[data-breath-reset]")?.addEventListener("click", () => { stopTimer(); machine.reset(); state.cycles = 0; updateStatus(); });
      updateStatus();
    }
    render();
    register(root, { toolId: "box-breathing", toolTitle: "Box Breathing", route: Progress.TOOL_ROUTES["box-breathing"], getState: () => ({ durations: { ...state.durations }, cycles: state.cycles }), setState: (next) => { state = { durations: { ...next.durations }, cycles: next.cycles }; render(); }, validateState: (next) => isObject(next) && isObject(next.durations) && ["inhale", "exhale"].every((key) => Number.isInteger(Number(next.durations[key])) && Number(next.durations[key]) >= 1 && Number(next.durations[key]) <= 30) && ["holdIn", "holdOut"].every((key) => Number.isInteger(Number(next.durations[key])) && Number(next.durations[key]) >= 0 && Number(next.durations[key]) <= 30) && Number.isInteger(next.cycles) && next.cycles >= 0, getReadableSummary: (next) => Progress.nonEmptySections("Box Breathing", [["Inhale", `${next.durations.inhale} seconds`], ["First Hold", `${next.durations.holdIn} seconds`], ["Exhale", `${next.durations.exhale} seconds`], ["Second Hold", `${next.durations.holdOut} seconds`], ["Completed Cycles", String(next.cycles)]]) });
  }

  function initGratitude(root) {
    let state = { entries: [{ id: "gratitude-1", date: "", appreciation: "", meaning: "" }] };
    function render(focusId = "") {
      root.innerHTML = pageShell("Gratitude Journal", "Record specific things you appreciate without requiring yourself to feel a particular way.", `<div class="gratitude-entries">${state.entries.map((entry, index) => `<fieldset class="skill-app-fieldset" data-gratitude-entry="${escapeHtml(entry.id)}"><legend>Entry ${index + 1}</legend><label for="${entry.id}-date">Date (optional)</label><input id="${entry.id}-date" type="date" data-gratitude-field="date" value="${escapeHtml(entry.date || "")}"><label for="${entry.id}-appreciation">Something I appreciate or am thankful for</label><textarea id="${entry.id}-appreciation" data-gratitude-field="appreciation">${escapeHtml(entry.appreciation)}</textarea><label for="${entry.id}-meaning">What I noticed or why it matters to me</label><textarea id="${entry.id}-meaning" data-gratitude-field="meaning">${escapeHtml(entry.meaning)}</textarea>${state.entries.length > 1 ? '<button type="button" class="secondary" data-remove-gratitude>Remove entry</button>' : ""}</fieldset>`).join("")}</div><button type="button" data-add-gratitude>Add another entry</button><p class="skill-app-note">This is a small Therapy Skill Kit exercise built around the curriculum's named skill “Gratitude Journaling”; it does not claim that gratitude erases difficult experiences.</p>`, learnLinks([["Skills Overview", "/tool-finder/#resource-general-p003"]]));
      root.querySelectorAll("[data-gratitude-entry]").forEach((fieldset) => {
        const entry = state.entries.find((item) => item.id === fieldset.dataset.gratitudeEntry);
        fieldset.querySelectorAll("[data-gratitude-field]").forEach((field) => field.addEventListener("input", () => { entry[field.dataset.gratitudeField] = field.value; }));
        fieldset.querySelector("[data-remove-gratitude]")?.addEventListener("click", () => { state.entries = state.entries.filter((item) => item.id !== entry.id); render(); });
      });
      root.querySelector("[data-add-gratitude]")?.addEventListener("click", () => { const id = `gratitude-${Date.now().toString(36)}`; state.entries.push({ id, date: "", appreciation: "", meaning: "" }); render(id); });
      if (focusId) root.querySelector(`[data-gratitude-entry="${focusId}"] textarea`)?.focus();
    }
    render();
    register(root, { toolId: "gratitude-journal", toolTitle: "Gratitude Journal", route: Progress.TOOL_ROUTES["gratitude-journal"], getState: () => state, setState: (next) => { state = { entries: next.entries.map((entry) => ({ date: "", ...entry })) }; render(); }, validateState: (next) => isObject(next) && Array.isArray(next.entries) && next.entries.length >= 1 && next.entries.length <= 100 && new Set(next.entries.map((entry) => entry.id)).size === next.entries.length && next.entries.every((entry) => isObject(entry) && typeof entry.id === "string" && (entry.date === undefined || typeof entry.date === "string") && typeof entry.appreciation === "string" && typeof entry.meaning === "string"), getReadableSummary: (next) => Progress.nonEmptySections("Gratitude Journal", gratitudeSummarySections(next.entries)) });
  }

  function gratitudeSummarySections(entries) {
    return entries.map((entry, index) => [`Entry ${index + 1}`, [entry.date && `Date: ${entry.date}`, entry.appreciation, entry.meaning && `Reflection: ${entry.meaning}`].filter(Boolean)]);
  }

  function initPositiveSelfTalk(root) {
    const keys = ["context", "difficultThought", "emotion", "friendResponse", "evidence", "alternative", "nextStep"];
    let state = Object.fromEntries(keys.map((key) => [key, ""]));
    const prompts = [["context", "Situation or context"], ["difficultThought", "Difficult or self-critical thought"], ["emotion", "Emotion or body response I notice"], ["friendResponse", "What would I say to a close friend in the same situation?"], ["evidence", "What fuller evidence or perspective does the difficult thought leave out?"], ["alternative", "A fair, believable, supportive alternative"], ["nextStep", "One effective next step this alternative supports"]];
    function render() {
      root.innerHTML = pageShell("Positive Self-Talk", "Move from a difficult thought toward a fairer and more supportive response—not forced positivity.", `${prompts.map(([key, label]) => `<label for="self-talk-${key}">${escapeHtml(label)}</label><textarea id="self-talk-${key}" data-self-talk="${key}">${escapeHtml(state[key])}</textarea>`).join("")}<p class="skill-app-note">A useful alternative can acknowledge pain, uncertainty, responsibility, or limits. It does not have to deny what is difficult or promise that everything will work out.</p>`, learnLinks([["Learn Positive Self-Talk", "/learn/mindfulness/loving-kindness-self-compassion.html#positive-self-talk"], ["CBT balanced alternatives", "/learn/cbt-anxiety/thought-records-part-2.html#balanced-alternatives"], ["How to Get Out of a Thinking Trap", "/resources/cbt-skills/cbt-skills-p021.jpg", true]]));
      root.querySelectorAll("[data-self-talk]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.selfTalk] = field.value; }));
    }
    render();
    register(root, { toolId: "positive-self-talk", toolTitle: "Positive Self-Talk", route: Progress.TOOL_ROUTES["positive-self-talk"], showOpenPreviousProgress: false, getState: () => state, setState: (next) => { state = { ...next }; render(); }, validateState: (next) => stringsOnly(next, keys), getReadableSummary: (next) => Progress.nonEmptySections("Positive Self-Talk", prompts.map(([key, label]) => [label, next[key]])) });
  }

  const GROUNDING_STEPS = Object.freeze([
    ["Orient", "Notice where you are. Silently name the place and remind yourself that this is the present moment."],
    ["Look", "Let your eyes settle. Notice colours, shapes, light, and a few concrete details around you."],
    ["Listen", "Notice nearby and distant sounds without needing to identify every one."],
    ["Feel", "Notice contact with the floor, chair, clothing, or another safe surface, plus sensations in the body."],
    ["Return", "Choose one small present activity and bring your attention to doing it."],
  ]);
  function initGrounding(root) {
    let state = { step: 0, note: "" };
    function render(focus = false) {
      const [title, instruction] = GROUNDING_STEPS[state.step];
      root.innerHTML = pageShell("Grounding", "Use a brief guided progression to reconnect with sensory information, the body, and the current environment.", `<div class="grounding-guide" aria-live="polite"><p class="skill-tree-kicker">Step ${state.step + 1} of ${GROUNDING_STEPS.length}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(instruction)}</p><div class="grounding-progress" aria-label="Grounding progress">${GROUNDING_STEPS.map((item, index) => `<span class="${index <= state.step ? "is-complete" : ""}"><span class="visually-hidden">${escapeHtml(item[0])}</span></span>`).join("")}</div><div class="skill-app-actions grounding-actions"><button type="button" class="secondary" data-grounding-back ${state.step ? "" : "disabled"}>Back</button><button type="button" data-grounding-next>${state.step === GROUNDING_STEPS.length - 1 ? "Start again" : "Next"}</button></div></div><details><summary>Optional note</summary><label for="grounding-note">What helped me reconnect with the present?</label><textarea id="grounding-note" data-grounding-note>${escapeHtml(state.note)}</textarea></details><p class="skill-app-note">The available source defines grounding through present sensory information, the body, and the environment; it does not prescribe a numbered sensory count. This guided order stays within that framing.</p>`, learnLinks([["Grounding lesson", "/learn/mindfulness/grounding.html"], ["Mindfulness of Thoughts", "/learn/mindfulness/mindfulness-of-thoughts.html"]]));
      root.querySelector("[data-grounding-back]")?.addEventListener("click", () => { state.step = Math.max(0, state.step - 1); render(true); });
      root.querySelector("[data-grounding-next]")?.addEventListener("click", () => { state.step = state.step === GROUNDING_STEPS.length - 1 ? 0 : state.step + 1; render(true); });
      root.querySelector("[data-grounding-note]")?.addEventListener("input", (event) => { state.note = event.target.value; });
      if (focus) {
        const heading = root.querySelector(".grounding-guide h3");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus();
      }
    }
    render();
    register(root, { toolId: "grounding", toolTitle: "Grounding", route: Progress.TOOL_ROUTES.grounding, getState: () => state, setState: (next) => { state = { step: next.step, note: next.note }; render(); }, validateState: (next) => isObject(next) && Number.isInteger(next.step) && next.step >= 0 && next.step < GROUNDING_STEPS.length && typeof next.note === "string", getReadableSummary: (next) => Progress.nonEmptySections("Grounding", [["Current Step", GROUNDING_STEPS[next.step][0]], ["What Helped", next.note]]) });
  }

  function initStop(root) {
    const steps = [["Stop", "Do not react automatically. Pause if it is safe to do so."], ["Take a Step Back", "Create space: step back, pause, or take one comfortable breath."], ["Observe", "Notice facts, thoughts, feelings, body sensations, and urges."], ["Proceed Mindfully", "Ask what response fits your goals, values, and the current facts."]];
    let state = { step: 0, notes: Object.fromEntries(steps.map((_, index) => [String(index), ""])) };
    function render() {
      const [title, instruction] = steps[state.step];
      root.innerHTML = pageShell("STOP", "Move through STOP one step at a time before choosing what to do next.", `<p class="skill-tree-kicker">Step ${state.step + 1} of 4</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(instruction)}</p><label for="stop-note">Optional note for this step</label><textarea id="stop-note" data-stop-note>${escapeHtml(state.notes[state.step])}</textarea><div class="skill-app-actions"><button type="button" class="secondary" data-stop-back ${state.step ? "" : "disabled"}>Back</button><button type="button" data-stop-next>${state.step === 3 ? "Start again" : "Next"}</button></div>`, learnLinks([["Learn STOP", "/learn/distress-tolerance/stop-crisis-survival.html#stop"]]));
      root.querySelector("[data-stop-note]").addEventListener("input", (event) => { state.notes[state.step] = event.target.value; });
      root.querySelector("[data-stop-back]")?.addEventListener("click", () => { state.step = Math.max(0, state.step - 1); render(); });
      root.querySelector("[data-stop-next]").addEventListener("click", () => { state.step = state.step === 3 ? 0 : state.step + 1; render(); });
    }
    render();
    register(root, { toolId: "stop", toolTitle: "STOP", route: Progress.TOOL_ROUTES.stop, getState: () => state, setState: (next) => { state = clone(next); render(); }, validateState: (next) => isObject(next) && Number.isInteger(next.step) && next.step >= 0 && next.step < 4 && isObject(next.notes) && [0,1,2,3].every((index) => typeof next.notes[index] === "string"), getReadableSummary: (next) => Progress.nonEmptySections("STOP", steps.map(([title], index) => [title, next.notes[index]])) });
  }

  function initSleepHygiene(root) {
    const habits = [["timing","Keep sleep and wake timing reasonably consistent"],["routine","Use a repeatable wind-down routine"],["environment","Review light, noise, comfort, and room temperature"],["caffeine","Notice caffeine, nicotine, and other stimulants"],["substances","Notice alcohol, substances, and medication timing"],["activity","Include suitable daytime activity and natural light"],["naps","Notice whether naps affect sleep pressure"],["screens","Reduce bright light or screens during wind-down when helpful"]];
    let state = { checks: [], pattern: "", change: "", support: "" };
    function render() {
      root.innerHTML = pageShell("Sleep Hygiene Planner / Checklist", "Use the curriculum checklist to review patterns, then choose one realistic experiment.", `<fieldset class="skill-app-fieldset"><legend>Areas I want to try or review</legend>${habits.map(([id,label]) => `<label class="skill-app-check"><input type="checkbox" data-sleep-check="${id}" ${state.checks.includes(id) ? "checked" : ""}> <span>${escapeHtml(label)}</span></label>`).join("")}</fieldset><label for="sleep-pattern">What pattern have I noticed?</label><textarea id="sleep-pattern" data-sleep-field="pattern">${escapeHtml(state.pattern)}</textarea><label for="sleep-change">One realistic change to test</label><textarea id="sleep-change" data-sleep-field="change">${escapeHtml(state.change)}</textarea><label for="sleep-support">What could make it easier?</label><textarea id="sleep-support" data-sleep-field="support">${escapeHtml(state.support)}</textarea>`, learnLinks([["Learn about sleep", "/learn/wellness/sleep.html#sleep-practice"],["Printable sleep practice sheet", "/resources/clean/emotion-regulation/emotion-regulation-worksheet-14b-sleep-hygiene-practice-sheet-clean.pdf", true]]));
      root.querySelectorAll("[data-sleep-check]").forEach((control) => control.addEventListener("change", () => { state.checks = [...root.querySelectorAll("[data-sleep-check]:checked")].map((item) => item.dataset.sleepCheck); }));
      root.querySelectorAll("[data-sleep-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.sleepField] = field.value; }));
    }
    render();
    register(root, { toolId: "sleep-hygiene", toolTitle: "Sleep Hygiene Planner / Checklist", route: Progress.TOOL_ROUTES["sleep-hygiene"], getState: () => state, setState: (next) => { state = clone(next); render(); }, validateState: (next) => isObject(next) && Array.isArray(next.checks) && next.checks.every((id) => habits.some(([valid]) => valid === id)) && ["pattern","change","support"].every((key) => typeof next[key] === "string"), getReadableSummary: (next) => Progress.nonEmptySections("Sleep Hygiene Planner / Checklist", [["Areas selected", next.checks.map((id) => habits.find(([key]) => key === id)[1])],["Pattern noticed",next.pattern],["One realistic change",next.change],["Support",next.support]]) });
  }

  const STAGES_OF_CHANGE = Object.freeze([
    { id: "precontemplation", name: "Precontemplation", label: "Noticing", heading: "What am I noticing?", prompts: [
      ["pre_minimizing", "Is there a problem or coping pattern you may be minimizing, avoiding, or not yet ready to change? What do you notice about it?"],
      ["pre_effects", "In what ways, if any, is this pattern affecting you or other people?"],
    ] },
    { id: "contemplation", name: "Contemplation", label: "Weighing it up", heading: "What are both sides of this?", prompts: [
      ["cont_reasons_change", "What are your reasons for wanting to make a change?"],
      ["cont_reasons_same", "What are your reasons for not wanting to change yet, or for wanting things to stay as they are?"],
      ["cont_feelings", "What feelings come up when you think about making this change?"],
    ] },
    { id: "preparation", name: "Preparation", label: "Getting ready", heading: "How could I get ready?", prompts: [
      ["prep_barriers", "What challenges or barriers would you need to work through?"],
      ["prep_steps", "What practical steps could help you begin?"],
    ] },
    { id: "action", name: "Action", label: "Doing", heading: "What is my plan?", prompts: [
      ["action_plan", "Describe your current plan of action."],
      ["action_support", "Who or what could support you? How could that support help?"],
      ["action_roadblock", "If you encounter a roadblock, what will you do next?"],
      ["action_accountability", "How will you keep track of your follow-through or hold yourself accountable in a useful way?"],
    ] },
    { id: "maintenance", name: "Maintenance", label: "Keeping it going", heading: "What helps me keep going?", prompts: [
      ["maintenance_worked", "Which action steps have worked well?"],
      ["maintenance_adjust", "Which action steps have not worked, or need to be adjusted?"],
      ["maintenance_challenging", "What has been most challenging about maintaining the change?"],
      ["maintenance_sustain", "How do you plan to sustain the changes over time?"],
    ] },
    { id: "return-old-pattern", name: "Return to an old pattern", label: "Learn & restart", heading: "What can I learn?", prompts: [
      ["return_contributed", "What do you think contributed to returning to the old pattern?"],
      ["return_feelings", "How are you feeling about what happened?"],
      ["return_learn", "What can you learn from what happened?"],
      ["return_plan", "What is your plan for getting back on track or choosing your next step?"],
    ] },
  ]);
  const STAGES_RESPONSE_KEYS = Object.freeze(STAGES_OF_CHANGE.flatMap((stage) => stage.prompts.map(([key]) => key)));
  const LEGACY_STAGES_FIELDS = Object.freeze(["behaviour", "readiness", "benefits", "costs", "ambivalence", "nextStep", "support"]);
  const legacyStageIds = Object.freeze({
    Precontemplation: "precontemplation",
    Contemplation: "contemplation",
    Preparation: "preparation",
    Action: "action",
    Maintenance: "maintenance",
    "Return to an old pattern / lapse": "return-old-pattern",
    "Return to an old pattern": "return-old-pattern",
  });
  function initialStagesOfChangeState() {
    return { change: "", date: "", stage: "", responses: Object.fromEntries(STAGES_RESPONSE_KEYS.map((key) => [key, ""])), additionalNotes: "" };
  }
  function normalizeStagesOfChangeState(next) {
    const source = isObject(next) ? next : {};
    const current = initialStagesOfChangeState();
    if (isObject(source.responses)) {
      current.change = typeof source.change === "string" ? source.change : "";
      current.date = typeof source.date === "string" ? source.date : "";
      current.stage = STAGES_OF_CHANGE.some((stage) => stage.id === source.stage) ? source.stage : (legacyStageIds[source.stage] || "");
      STAGES_RESPONSE_KEYS.forEach((key) => { current.responses[key] = typeof source.responses[key] === "string" ? source.responses[key] : ""; });
      current.additionalNotes = typeof source.additionalNotes === "string" ? source.additionalNotes : "";
      return current;
    }
    current.change = typeof source.behaviour === "string" ? source.behaviour : "";
    current.stage = legacyStageIds[source.stage] || "";
    current.responses.pre_minimizing = typeof source.readiness === "string" ? source.readiness : "";
    current.responses.cont_reasons_same = typeof source.benefits === "string" ? source.benefits : "";
    current.responses.cont_reasons_change = typeof source.costs === "string" ? source.costs : "";
    current.responses.cont_feelings = typeof source.ambivalence === "string" ? source.ambivalence : "";
    current.responses.prep_steps = typeof source.nextStep === "string" ? source.nextStep : "";
    current.responses.action_support = typeof source.support === "string" ? source.support : "";
    return current;
  }
  function validateStagesOfChangeState(next) {
    if (!isObject(next)) return false;
    const isLegacy = LEGACY_STAGES_FIELDS.every((key) => typeof next[key] === "string")
      && typeof next.stage === "string" && (next.stage === "" || Object.prototype.hasOwnProperty.call(legacyStageIds, next.stage));
    if (isLegacy) return true;
    return typeof next.change === "string" && typeof next.date === "string" && typeof next.additionalNotes === "string"
      && (next.stage === "" || STAGES_OF_CHANGE.some((stage) => stage.id === next.stage))
      && isObject(next.responses) && STAGES_RESPONSE_KEYS.every((key) => typeof next.responses[key] === "string");
  }
  function selectStagesOfChangeStage(next, stageId) {
    const current = normalizeStagesOfChangeState(next);
    if (STAGES_OF_CHANGE.some((stage) => stage.id === stageId)) current.stage = stageId;
    return current;
  }
  function stagesOfChangeSummary(next) {
    const current = normalizeStagesOfChangeState(next);
    const lines = ["# Stages of Change Reflection"];
    if (current.change.trim()) lines.push("", "## Change or coping pattern:", "", current.change.trim());
    if (current.date.trim()) lines.push("", "## Date", "", current.date.trim());
    const selected = STAGES_OF_CHANGE.find((stage) => stage.id === current.stage);
    if (selected) lines.push("", "## Current stage that feels closest:", "", selected.name);
    STAGES_OF_CHANGE.forEach((stage) => {
      const answered = stage.prompts.filter(([key]) => current.responses[key].trim());
      if (!answered.length) return;
      lines.push("", `## ${stage.name}`, "");
      answered.forEach(([key, prompt]) => lines.push(`- **${prompt}**`, `  ${current.responses[key].trim()}`));
    });
    if (current.additionalNotes.trim()) lines.push("", "## Additional notes", "", current.additionalNotes.trim());
    return lines.join("\n");
  }
  function stagesChangePathMarkup(selectedStage = "") {
    const arrows = [
      "M520 105 C630 105 705 145 740 205",
      "M770 270 C790 335 775 390 735 430",
      "M660 500 C590 540 530 550 500 550",
      "M385 550 C300 540 240 505 210 470",
      "M145 395 C110 340 105 290 125 250",
      "M175 165 C240 105 310 90 390 100"
    ].map((path) => `<path d="${path}" marker-end="url(#change-path-arrow-tool)"></path>`).join("");
    return `<div class="change-path-graphic change-path-chooser" aria-labelledby="stages-change-path-caption"><svg class="change-path-arrows" viewBox="0 0 900 620" role="img" aria-labelledby="stages-change-path-title stages-change-path-desc"><title id="stages-change-path-title">Choose from six stages on a flexible change path</title><desc id="stages-change-path-desc">Curved arrows connect six stages and loop from learning and restarting toward earlier parts of the path.</desc><defs><marker id="change-path-arrow-tool" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${arrows}</svg><ol class="change-path-stages">${STAGES_OF_CHANGE.map((stage) => `<li class="change-path-node change-path-node--${stage.id}"><button type="button" class="change-path-choice ${selectedStage === stage.id ? "is-selected" : ""}" data-stage-choice="${stage.id}" aria-pressed="${selectedStage === stage.id}"><strong>${escapeHtml(stage.label)}</strong><span>${escapeHtml(stage.name)}</span>${selectedStage === stage.id ? "<small>Feels closest right now</small>" : ""}</button></li>`).join("")}</ol><p class="change-path-caption" id="stages-change-path-caption">Change can move forward, pause, or loop back.</p></div>`;
  }

  function initStagesOfChange(root) {
    let state = initialStagesOfChangeState();
    const openSections = new Set();
    function sectionStatus(stage) {
      const answered = stage.prompts.filter(([key]) => state.responses[key].trim()).length;
      if (answered === stage.prompts.length) return "Completed";
      return answered ? "In progress" : "";
    }
    function updateSectionStatus(stageId) {
      const stage = STAGES_OF_CHANGE.find((item) => item.id === stageId);
      const section = root.querySelector(`[data-stage-section="${stageId}"]`);
      const badge = section?.querySelector("[data-stage-status]");
      if (!stage || !section || !badge) return;
      const status = sectionStatus(stage);
      badge.textContent = status;
      badge.hidden = !status;
      section.classList.toggle("is-complete", status === "Completed");
    }
    function render(scrollStage = "") {
      const sections = STAGES_OF_CHANGE.map((stage) => {
        const status = sectionStatus(stage);
        const selected = state.stage === stage.id;
        return `<details class="stages-reflection-section ${selected ? "is-selected" : ""} ${status === "Completed" ? "is-complete" : ""}" data-stage-section="${stage.id}" ${openSections.has(stage.id) ? "open" : ""}><summary><span><strong>${escapeHtml(stage.name)}</strong><small>${escapeHtml(stage.heading)}</small></span><span class="stages-section-status" data-stage-status ${status ? "" : "hidden"}>${status}</span></summary><div class="stages-reflection-fields">${stage.prompts.map(([key, prompt]) => `<label for="stages-${key}"><span>${STAGES_RESPONSE_KEYS.indexOf(key) + 1}. ${escapeHtml(prompt)}</span><textarea id="stages-${key}" data-stage-response="${key}" data-stage-owner="${stage.id}">${escapeHtml(state.responses[key])}</textarea></label>`).join("")}</div></details>`;
      }).join("");
      root.innerHTML = pageShell("Stages of Change Reflection", "Explore readiness for one particular change without calculating or diagnosing a stage.", `<label for="stages-change"><strong>What change or coping pattern are you thinking about?</strong></label><p class="skill-app-field-help">Describe it in your own words.</p><textarea id="stages-change" data-stages-change>${escapeHtml(state.change)}</textarea><label for="stages-date">Date (optional)</label><input id="stages-date" type="date" data-stages-date value="${escapeHtml(state.date)}"><section class="stages-change-chooser" aria-labelledby="stages-choice-heading"><h3 id="stages-choice-heading">Which stage feels closest to where you are with this particular change right now?</h3>${stagesChangePathMarkup(state.stage)}<p class="skill-app-note">This choice is a personal reflection, not a calculated result or diagnosis. You can change it without losing any responses.</p></section><div class="skill-app-actions stages-expand-actions"><button type="button" class="secondary" data-stages-expand>Expand all</button><button type="button" class="secondary" data-stages-collapse>Collapse all</button></div><div class="stages-reflection-sections">${sections}</div><label for="stages-additional-notes"><strong>Additional notes</strong></label><textarea id="stages-additional-notes" data-stages-notes>${escapeHtml(state.additionalNotes)}</textarea>`, learnLinks([["Learn about the Stages of Change", "/learn/wellness/maladaptive-coping.html#stages-of-change"],["Learn Urge Surfing", "/learn/wellness/urge-surfing.html"]]));
      root.querySelector("[data-stages-change]").addEventListener("input", (event) => { state.change = event.target.value; });
      root.querySelector("[data-stages-date]").addEventListener("input", (event) => { state.date = event.target.value; });
      root.querySelector("[data-stages-notes]").addEventListener("input", (event) => { state.additionalNotes = event.target.value; });
      root.querySelectorAll("[data-stage-response]").forEach((field) => field.addEventListener("input", () => { state.responses[field.dataset.stageResponse] = field.value; updateSectionStatus(field.dataset.stageOwner); }));
      root.querySelectorAll("[data-stage-choice]").forEach((button) => button.addEventListener("click", () => { state = selectStagesOfChangeStage(state, button.dataset.stageChoice); openSections.add(state.stage); render(state.stage); }));
      root.querySelectorAll("[data-stage-section]").forEach((section) => section.addEventListener("toggle", () => { if (section.open) openSections.add(section.dataset.stageSection); else openSections.delete(section.dataset.stageSection); }));
      root.querySelector("[data-stages-expand]").addEventListener("click", () => { STAGES_OF_CHANGE.forEach((stage) => openSections.add(stage.id)); render(); });
      root.querySelector("[data-stages-collapse]").addEventListener("click", () => { openSections.clear(); render(); });
      if (scrollStage) global.requestAnimationFrame(() => {
        const section = root.querySelector(`[data-stage-section="${scrollStage}"]`);
        section?.querySelector(":scope > summary")?.focus({ preventScroll: true });
        section?.scrollIntoView({ behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    }
    render();
    register(root, { toolId: "stages-of-change", toolTitle: "Stages of Change Reflection", route: Progress.TOOL_ROUTES["stages-of-change"], getState: () => clone(state), setState: (next) => { state = normalizeStagesOfChangeState(next); openSections.clear(); if (state.stage) openSections.add(state.stage); render(); }, validateState: validateStagesOfChangeState, getReadableSummary: stagesOfChangeSummary });
  }

  const validUrgeRating = (value) => typeof value === "string" && (value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100));
  const validUrgeMinutes = (value) => typeof value === "string" && (value === "" || (/^\d{1,4}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 0 && Number(value) <= 1440));
  function validUrgeCheckpoint(point) {
    return isObject(point) && typeof point.id === "string" && validUrgeMinutes(point.minutes) && validUrgeRating(point.intensity);
  }
  function urgeGraphPoints(input) {
    const points = [];
    if (validUrgeRating(input?.intensity) && input.intensity !== "") {
      const minutes = validUrgeMinutes(input.initialMinutes) && input.initialMinutes !== "" ? Number(input.initialMinutes) : 0;
      points.push({ minutes, intensity: Number(input.intensity), label: "Initial" });
    }
    if (Array.isArray(input?.checkpoints)) {
      input.checkpoints.forEach((point, index) => {
        if (validUrgeCheckpoint(point) && point.minutes !== "" && point.intensity !== "") {
          points.push({ minutes: Number(point.minutes), intensity: Number(point.intensity), label: `Checkpoint ${index + 1}` });
        }
      });
    }
    if (validUrgeMinutes(input?.afterMinutes) && input.afterMinutes !== "" && validUrgeRating(input?.afterIntensity) && input.afterIntensity !== "") {
      points.push({ minutes: Number(input.afterMinutes), intensity: Number(input.afterIntensity), label: "Later check" });
    }
    return points.sort((left, right) => left.minutes - right.minutes);
  }
  function urgeGraphMarkup(input) {
    const points = urgeGraphPoints(input);
    const maxMinutes = Math.max(5, ...points.map((point) => point.minutes));
    const left = 64;
    const right = 610;
    const top = 22;
    const bottom = 252;
    const x = (minutes) => left + ((right - left) * minutes / maxMinutes);
    const y = (intensity) => bottom - ((bottom - top) * intensity / 100);
    const grid = [0,25,50,75,100].map((value) => `<g><line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" class="urge-graph-grid"/><text x="${left - 10}" y="${y(value) + 5}" text-anchor="end">${value}</text></g>`).join("");
    const xTicks = [0, maxMinutes / 2, maxMinutes].map((value) => `<g><line x1="${x(value)}" y1="${bottom}" x2="${x(value)}" y2="${bottom + 7}" class="urge-graph-axis"/><text x="${x(value)}" y="${bottom + 24}" text-anchor="middle">${Number(value.toFixed(2))}</text></g>`).join("");
    const line = points.length > 1 ? `<polyline class="urge-graph-line" points="${points.map((point) => `${x(point.minutes)},${y(point.intensity)}`).join(" ")}"/>` : "";
    const dots = points.map((point) => `<circle class="urge-graph-point" cx="${x(point.minutes)}" cy="${y(point.intensity)}" r="6"><title>${escapeHtml(point.label)}: ${point.minutes} minutes, intensity ${point.intensity} out of 100</title></circle>`).join("");
    const summary = points.length
      ? `<ol class="urge-graph-data">${points.map((point) => `<li>${escapeHtml(point.label)}: ${point.minutes} minutes — ${point.intensity}/100</li>`).join("")}</ol>`
      : '<p class="skill-app-field-help">Enter an intensity and time to add the first point to the graph.</p>';
    return `<svg class="urge-progress-graph" viewBox="0 0 680 320" role="img" aria-labelledby="urge-progress-title urge-progress-desc"><title id="urge-progress-title">Urge intensity over time</title><desc id="urge-progress-desc">A graph with minutes since the urge started on the horizontal axis and urge intensity from zero to one hundred on the vertical axis.</desc>${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" class="urge-graph-axis"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="urge-graph-axis"/>${xTicks}${line}${dots}<text class="urge-graph-axis-label" x="${(left + right) / 2}" y="310" text-anchor="middle">Minutes since urge started</text><text class="urge-graph-axis-label" x="18" y="${(top + bottom) / 2}" text-anchor="middle" transform="rotate(-90 18 ${(top + bottom) / 2})">Urge intensity</text></svg>${summary}`;
  }

  function urgeWaveMarkup() {
    return `<figure class="urge-wave"><svg viewBox="0 0 680 250" role="img" aria-labelledby="urge-wave-title urge-wave-desc"><title id="urge-wave-title">The shape of an urge wave</title><desc id="urge-wave-desc">A wave starts at a trigger, rises, reaches a peak, and falls. An urge may later return or shift.</desc><defs><linearGradient id="urge-wave-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9ed8"/><stop offset="1" stop-color="#d9eefb"/></linearGradient></defs><path class="urge-wave-fill" d="M45 205 C145 202 165 174 225 125 C285 76 330 45 385 58 C445 73 455 165 540 195 L540 215 L45 215 Z"/><path class="urge-wave-line" d="M45 205 C145 202 165 174 225 125 C285 76 330 45 385 58 C445 73 455 165 540 195"/><g class="urge-wave-marker"><circle cx="55" cy="203" r="7"/><text x="55" y="235" text-anchor="middle">Trigger</text></g><g class="urge-wave-marker"><circle cx="225" cy="125" r="7"/><text x="205" y="105" text-anchor="middle">Rise</text></g><g class="urge-wave-marker"><circle cx="385" cy="58" r="7"/><text x="385" y="34" text-anchor="middle">Peak</text></g><g class="urge-wave-marker"><circle cx="505" cy="180" r="7"/><text x="530" y="160" text-anchor="middle">Fall</text></g></svg><figcaption>An urge may rise, peak, fall, return, or shift. The shape is a metaphor, not a promised timeline.</figcaption></figure>`;
  }

  function initUrgeSurfing(root) {
    const fields = [["urge","I have the urge to…"],["trigger","Context or trigger"],["body","Body sensations"],["thoughts","Thoughts, images, emotions, or stories"],["observe","How I can acknowledge this urge without treating it as a command"],["noticed","What I noticed"],["changed","How the urge changed, if at all"],["helped","What helped me stay with it"],["acted","Did I act on it? What happened?"],["nextTime","What I would try next time"],["nextAction","Optional safe or value-aligned next action"]];
    const initialState = { ...Object.fromEntries(fields.map(([key]) => [key, ""])), intensity: "", initialMinutes: "0", afterIntensity: "", afterMinutes: "", checkpoints: [], timer: { duration: 120, remaining: 120, running: false } };
    let state = clone(initialState);
    let timerId = null;
    let checkpointCounter = 0;
    function stopTimer() { if (timerId) global.clearInterval(timerId); timerId = null; state.timer.running = false; }
    function nextCheckpointId() {
      checkpointCounter += 1;
      return `checkpoint-${checkpointCounter}`;
    }
    function updateGraph() {
      const graph = root.querySelector("[data-urge-graph]");
      if (graph) graph.innerHTML = urgeGraphMarkup(state);
    }
    function render() {
      const before = fields.slice(0,5).map(([key,label]) => `<label for="urge-${key}">${escapeHtml(label)}</label><textarea id="urge-${key}" data-urge-field="${key}">${escapeHtml(state[key])}</textarea>`).join("");
      const after = fields.slice(5).map(([key,label]) => `<label for="urge-${key}">${escapeHtml(label)}</label><textarea id="urge-${key}" data-urge-field="${key}">${escapeHtml(state[key])}</textarea>`).join("");
      const checkpoints = state.checkpoints.map((point, index) => `<div class="urge-checkpoint" data-urge-checkpoint="${escapeHtml(point.id)}"><label for="urge-minutes-${escapeHtml(point.id)}">Minutes since start<input id="urge-minutes-${escapeHtml(point.id)}" type="number" min="0" max="1440" step="0.5" inputmode="decimal" data-urge-checkpoint-field="minutes" value="${escapeHtml(point.minutes)}"></label><label for="urge-point-${escapeHtml(point.id)}">Intensity (0–100)<input id="urge-point-${escapeHtml(point.id)}" type="number" min="0" max="100" inputmode="numeric" data-urge-checkpoint-field="intensity" value="${escapeHtml(point.intensity)}"></label><button type="button" class="secondary" data-remove-urge-checkpoint aria-label="Remove checkpoint ${index + 1}">Remove</button></div>`).join("");
      root.innerHTML = pageShell("Urge Surfing", "Notice the urge, anchor attention, and ride the wave without treating it as a command.", `${before}${urgeWaveMarkup()}<section class="urge-rating-pair" aria-labelledby="urge-initial-heading"><h3 id="urge-initial-heading">First intensity check</h3><label for="urge-initial-minutes">Minutes since the urge started</label><input id="urge-initial-minutes" type="number" min="0" max="1440" step="0.5" inputmode="decimal" data-urge-minutes="initialMinutes" value="${escapeHtml(state.initialMinutes)}"><label for="urge-intensity">Urge intensity (0–100)</label><input id="urge-intensity" type="number" min="0" max="100" inputmode="numeric" data-urge-rating="intensity" value="${escapeHtml(state.intensity)}"></section><div class="urge-timer"><label for="urge-duration">Optional practice timer</label><select id="urge-duration" data-urge-duration>${[120,180,240,300].map((seconds) => `<option value="${seconds}" ${state.timer.duration === seconds ? "selected" : ""}>${seconds/60} minutes</option>`).join("")}</select><output aria-live="polite" data-urge-clock>${Math.floor(state.timer.remaining/60)}:${String(state.timer.remaining%60).padStart(2,"0")}</output><div class="skill-app-actions"><button type="button" data-urge-start>Start</button><button type="button" class="secondary" data-urge-pause>Pause</button><button type="button" class="secondary" data-urge-reset>Reset</button></div></div><section class="urge-checkpoint-panel" aria-labelledby="urge-tracker-heading"><h3 id="urge-tracker-heading">Track urge intensity over time</h3><p>Add as many observations as are useful. The graph updates from the minutes and intensity you enter; it does not assume that intensity must go down.</p><div class="urge-checkpoint-list" data-urge-checkpoints>${checkpoints}</div><button type="button" class="secondary" data-add-urge-checkpoint>Add a checkpoint</button><div class="urge-graph-wrap" data-urge-graph>${urgeGraphMarkup(state)}</div></section><section class="urge-rating-pair" aria-labelledby="urge-later-heading"><h3 id="urge-later-heading">Later intensity check</h3><label for="urge-after-minutes">Minutes since the urge started</label><input id="urge-after-minutes" type="number" min="0" max="1440" step="0.5" inputmode="decimal" data-urge-minutes="afterMinutes" value="${escapeHtml(state.afterMinutes)}"><label for="urge-after">Urge intensity (0–100, optional)</label><input id="urge-after" type="number" min="0" max="100" inputmode="numeric" data-urge-rating="afterIntensity" value="${escapeHtml(state.afterIntensity)}"></section>${after}<p class="skill-app-note">If an urge involves immediate danger to you or another person, prioritize safety and appropriate real-world support rather than relying on this exercise alone.</p>`, learnLinks([["Learn Urge Surfing", "/learn/wellness/urge-surfing.html"],["Mindfulness of Emotions", "/learn/mindfulness/mindfulness-of-emotions.html#emotion-surfing"]]));
      root.querySelectorAll("[data-urge-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.urgeField] = field.value; }));
      root.querySelectorAll("[data-urge-rating]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.urgeRating] = field.value; updateGraph(); }));
      root.querySelectorAll("[data-urge-minutes]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.urgeMinutes] = field.value; updateGraph(); }));
      root.querySelectorAll("[data-urge-checkpoint]").forEach((row) => {
        const point = state.checkpoints.find((item) => item.id === row.dataset.urgeCheckpoint);
        row.querySelectorAll("[data-urge-checkpoint-field]").forEach((field) => field.addEventListener("input", () => { point[field.dataset.urgeCheckpointField] = field.value; updateGraph(); }));
        row.querySelector("[data-remove-urge-checkpoint]").addEventListener("click", () => { state.checkpoints = state.checkpoints.filter((item) => item.id !== row.dataset.urgeCheckpoint); render(); });
      });
      root.querySelector("[data-add-urge-checkpoint]").addEventListener("click", () => { state.checkpoints.push({ id: nextCheckpointId(), minutes: "", intensity: "" }); render(); });
      root.querySelector("[data-urge-duration]").addEventListener("change", (event) => { stopTimer(); state.timer.duration = Number(event.target.value); state.timer.remaining = state.timer.duration; render(); });
      root.querySelector("[data-urge-start]").addEventListener("click", () => { if (state.timer.running) return; state.timer.running = true; timerId = global.setInterval(() => { state.timer.remaining = Math.max(0, state.timer.remaining - 1); const out = root.querySelector("[data-urge-clock]"); if (out) out.textContent = `${Math.floor(state.timer.remaining/60)}:${String(state.timer.remaining%60).padStart(2,"0")}`; if (!state.timer.remaining) stopTimer(); }, 1000); });
      root.querySelector("[data-urge-pause]").addEventListener("click", stopTimer);
      root.querySelector("[data-urge-reset]").addEventListener("click", () => { stopTimer(); state.timer.remaining = state.timer.duration; render(); });
    }
    render();
    register(root, { toolId: "urge-surfing", toolTitle: "Urge Surfing", route: Progress.TOOL_ROUTES["urge-surfing"], getState: () => ({...state, timer: {...state.timer, running: false}}), setState: (next) => { stopTimer(); state = { ...clone(initialState), ...clone(next), initialMinutes: typeof next.initialMinutes === "string" ? next.initialMinutes : "0", afterMinutes: typeof next.afterMinutes === "string" ? next.afterMinutes : "", checkpoints: Array.isArray(next.checkpoints) ? clone(next.checkpoints) : [] }; checkpointCounter = state.checkpoints.reduce((largest, point) => Math.max(largest, Number(String(point.id).match(/\d+$/)?.[0] || 0)), 0); state.timer.running = false; render(); }, validateState: (next) => isObject(next) && fields.every(([key]) => typeof next[key] === "string") && [next.intensity,next.afterIntensity].every(validUrgeRating) && (next.initialMinutes === undefined || validUrgeMinutes(next.initialMinutes)) && (next.afterMinutes === undefined || validUrgeMinutes(next.afterMinutes)) && Array.isArray(next.checkpoints) && next.checkpoints.every(validUrgeCheckpoint) && isObject(next.timer) && [120,180,240,300].includes(next.timer.duration) && Number.isInteger(next.timer.remaining) && next.timer.remaining >= 0 && next.timer.remaining <= next.timer.duration, getReadableSummary: (next) => Progress.nonEmptySections("Urge Surfing", [["Initial intensity",next.intensity && `${next.intensity}/100 at ${next.initialMinutes || 0} minutes`], ["Intensity checkpoints", urgeGraphPoints(next).map((point) => `${point.label}: ${point.intensity}/100 at ${point.minutes} minutes`)], ...fields.map(([key,label]) => [label,next[key]]), ["Later intensity",next.afterIntensity && `${next.afterIntensity}/100${next.afterMinutes ? ` at ${next.afterMinutes} minutes` : ""}`]]) });
  }

  const PROS_CONS_SECTIONS = Object.freeze([
    { key: "actingPros", title: "Pros of acting on the urge", prompt: "What might feel helpful, relieving, rewarding, or easier if you act on the urge?", review: "Acting on the urge — pro" },
    { key: "actingCons", title: "Cons of acting on the urge", prompt: "What problems, costs, or consequences could come from acting on the urge?", review: "Acting on the urge — con" },
    { key: "resistingPros", title: "Pros of resisting the urge", prompt: "What could be helpful about not acting on the urge and tolerating the distress?", review: "Resisting the urge — pro" },
    { key: "resistingCons", title: "Cons of resisting the urge", prompt: "What might feel difficult, uncomfortable, or costly about resisting the urge?", review: "Resisting the urge — con" },
  ]);
  const PROS_CONS_TIME_FRAMES = Object.freeze([
    ["", "Choose a time frame (optional)"],
    ["short", "Short term / today"],
    ["long", "Longer term / beyond today"],
    ["both", "Both"],
    ["unsure", "Not sure"],
  ]);
  const prosConsTimeLabel = (value) => PROS_CONS_TIME_FRAMES.find(([key]) => key === value)?.[1] || "";
  function initialProsConsState() {
    return { urge: "", context: "", lists: Object.fromEntries(PROS_CONS_SECTIONS.map(({ key }) => [key, []])), standsOut: "", choice: "", support: "" };
  }
  function normalizeProsConsState(next) {
    const source = isObject(next) ? next : {};
    const current = initialProsConsState();
    ["urge", "context", "standsOut", "choice", "support"].forEach((key) => { current[key] = typeof source[key] === "string" ? source[key] : ""; });
    if (isObject(source.lists)) PROS_CONS_SECTIONS.forEach(({ key }) => {
      const seen = new Set();
      current.lists[key] = Array.isArray(source.lists[key]) ? source.lists[key].slice(0, 500).map((item, index) => {
        const row = isObject(item) ? item : { text: item };
        let id = typeof row.id === "string" && row.id ? row.id : `${key}-${index + 1}`;
        while (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
        return { id, text: typeof row.text === "string" ? row.text : "", timeFrame: PROS_CONS_TIME_FRAMES.some(([value]) => value === row.timeFrame) ? row.timeFrame : "" };
      }) : [];
    });
    return current;
  }
  function validateProsConsState(next) {
    if (!isObject(next) || !isObject(next.lists) || !["urge", "context", "standsOut", "choice", "support"].every((key) => typeof next[key] === "string")) return false;
    return PROS_CONS_SECTIONS.every(({ key }) => Array.isArray(next.lists[key]) && next.lists[key].length <= 500 && new Set(next.lists[key].map((item) => item.id)).size === next.lists[key].length && next.lists[key].every((item) => isObject(item) && typeof item.id === "string" && typeof item.text === "string" && PROS_CONS_TIME_FRAMES.some(([value]) => value === item.timeFrame)));
  }
  function reorderProsConsItem(next, listKey, index, offset) {
    const current = normalizeProsConsState(next);
    const list = current.lists[listKey];
    const target = index + offset;
    if (!list || index < 0 || index >= list.length || target < 0 || target >= list.length) return current;
    [list[index], list[target]] = [list[target], list[index]];
    return current;
  }
  function prosConsTimeGroups(next) {
    const current = normalizeProsConsState(next);
    const groups = { short: [], long: [], other: [] };
    PROS_CONS_SECTIONS.forEach((section) => current.lists[section.key].forEach((item) => {
      if (!item.text.trim()) return;
      const value = `${section.review}: ${item.text.trim()}`;
      if (item.timeFrame === "short") groups.short.push(value);
      else if (item.timeFrame === "long") groups.long.push(value);
      else groups.other.push(`${value}${item.timeFrame ? ` — ${prosConsTimeLabel(item.timeFrame)}` : " — Time frame not selected"}`);
    }));
    return groups;
  }
  function prosConsSummary(next) {
    const current = normalizeProsConsState(next);
    const lines = ["# Pros & Cons"];
    [["Urge or problem behavior", current.urge], ["Context", current.context]].forEach(([heading, value]) => { lines.push("", `## ${heading}`, "", value.trim() || "Not entered."); });
    PROS_CONS_SECTIONS.forEach((section) => {
      lines.push("", `## ${section.title}`, "");
      const entries = current.lists[section.key].filter((item) => item.text.trim());
      if (!entries.length) lines.push("No entries.");
      else entries.forEach((item) => lines.push(`- ${item.text.trim()}${item.timeFrame ? ` — ${prosConsTimeLabel(item.timeFrame)}` : ""}`));
    });
    lines.push("", "## Looking beyond the immediate moment", "", `What stands out: ${current.standsOut.trim() || "Not entered."}`, "", `Choice / next step: ${current.choice.trim() || "Not entered."}`, "", `Support: ${current.support.trim() || "Not entered."}`, "", "## Sources", "", "- Learn: /learn/distress-tolerance/pros-and-cons.html", "- Printable worksheet: /resources/clean/distress-tolerance/distress-tolerance-worksheet-3-pros-and-cons-of-acting-on-crisis-urges-clean.pdf", "- Reference handout: /resources/clean/distress-tolerance/distress-tolerance-handout-5-pros-and-cons-clean.pdf");
    return lines.join("\n");
  }
  function initProsAndCons(root) {
    let state = initialProsConsState();
    let itemCounter = 0;
    let reviewMode = false;
    const nextItemId = (key) => { itemCounter += 1; return `${key}-${Date.now().toString(36)}-${itemCounter}`; };
    const itemMarkup = (section, item, index, length) => `<fieldset class="pros-cons-item" data-pros-item="${escapeHtml(item.id)}"><legend>Item ${index + 1}</legend><label for="pros-${escapeHtml(item.id)}">Point</label><textarea id="pros-${escapeHtml(item.id)}" data-pros-text>${escapeHtml(item.text)}</textarea><label for="pros-time-${escapeHtml(item.id)}">Time frame</label><select id="pros-time-${escapeHtml(item.id)}" data-pros-time>${PROS_CONS_TIME_FRAMES.map(([value, label]) => `<option value="${value}" ${item.timeFrame === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select><div class="skill-app-actions pros-cons-item-actions"><button type="button" class="secondary" data-pros-edit>Edit</button><button type="button" class="secondary" data-pros-up ${index ? "" : "disabled"}>Move up</button><button type="button" class="secondary" data-pros-down ${index < length - 1 ? "" : "disabled"}>Move down</button><button type="button" class="secondary" data-pros-remove>Remove</button></div></fieldset>`;
    function reviewMarkup() {
      const groups = prosConsTimeGroups(state);
      const list = (items) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="skill-app-field-help">No points in this group.</p>';
      const entries = (key) => list(state.lists[key].filter((item) => item.text.trim()).map((item) => `${item.text.trim()}${item.timeFrame ? ` — ${prosConsTimeLabel(item.timeFrame)}` : ""}`));
      return `<section class="pros-cons-review" aria-labelledby="pros-review-heading"><p class="skill-tree-kicker">Simple summary</p><h3 id="pros-review-heading">Pros & Cons</h3><p><strong>Urge:</strong> ${escapeHtml(state.urge || "Not entered")}</p><div class="pros-cons-review-options"><section><h4>ACTING ON THE URGE</h4><h5>Pros</h5>${entries("actingPros")}<h5>Cons</h5>${entries("actingCons")}</section><section><h4>RESISTING THE URGE</h4><h5>Pros</h5>${entries("resistingPros")}<h5>Cons</h5>${entries("resistingCons")}</section></div><section><h4>Short-term points</h4>${list(groups.short)}</section><section><h4>Longer-term points</h4>${list(groups.long)}</section><section><h4>Both / not sure</h4>${list(groups.other)}</section><dl><dt>What stands out</dt><dd>${escapeHtml(state.standsOut || "Not entered")}</dd><dt>My intended next step</dt><dd>${escapeHtml(state.choice || "Not entered")}</dd></dl><button type="button" class="secondary" data-pros-back-to-list>Back to worksheet</button></section>`;
    }
    function render(focusId = "") {
      if (reviewMode) {
        root.innerHTML = pageShell("Pros & Cons", "A clean summary of your entries for quick review. It does not score the options or choose for you.", reviewMarkup(), learnLinks([["Learn Pros & Cons", "/learn/distress-tolerance/pros-and-cons.html"], ["Printable worksheet", "/resources/clean/distress-tolerance/distress-tolerance-worksheet-3-pros-and-cons-of-acting-on-crisis-urges-clean.pdf", true], ["Reference handout", "/resources/clean/distress-tolerance/distress-tolerance-handout-5-pros-and-cons-clean.pdf", true]]));
        root.querySelector("[data-pros-back-to-list]").addEventListener("click", () => { reviewMode = false; render(); });
        return;
      }
      const grid = PROS_CONS_SECTIONS.map((section) => `<section class="pros-cons-quadrant pros-cons-quadrant--${section.key}" data-pros-list="${section.key}"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.prompt)}</p><div>${state.lists[section.key].length ? state.lists[section.key].map((item, index) => itemMarkup(section, item, index, state.lists[section.key].length)).join("") : '<p class="pros-cons-empty">No items yet.</p>'}</div><button type="button" class="secondary" data-pros-add>Add another</button></section>`).join("");
      const anyEntries = PROS_CONS_SECTIONS.some(({ key }) => state.lists[key].some((item) => item.text.trim()));
      const groups = prosConsTimeGroups(state);
      const derived = anyEntries ? `<section class="pros-cons-time-review" aria-labelledby="pros-time-review-heading"><h3 id="pros-time-review-heading">Looking beyond the immediate moment</h3><div><section><h4>Short term / today</h4><ul>${groups.short.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>No points tagged for this group.</li>"}</ul></section><section><h4>Longer term / beyond today</h4><ul>${groups.long.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>No points tagged for this group.</li>"}</ul></section><section><h4>Both / not sure</h4><ul>${groups.other.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>No points tagged for this group.</li>"}</ul></section></div></section>` : "";
      root.innerHTML = pageShell("Pros & Cons", "Compare acting on an urge with resisting it, including what may happen now and later.", `<label for="pros-urge"><strong>What urge or problem behavior are you considering?</strong></label><p class="skill-app-field-help">Describe the urge or behavior you want to think through.</p><textarea id="pros-urge" class="skill-app-textarea-large" data-pros-field="urge">${escapeHtml(state.urge)}</textarea><label for="pros-context">What is happening right now? <span class="skill-app-optional">Optional</span></label><p class="skill-app-field-help">Add only as much context as is useful.</p><textarea id="pros-context" data-pros-field="context">${escapeHtml(state.context)}</textarea><div class="pros-cons-grid">${grid}</div>${derived}<section class="pros-cons-reflection"><label for="pros-stands"><strong>Looking at both today and the longer term, what stands out to you?</strong></label><textarea id="pros-stands" data-pros-field="standsOut">${escapeHtml(state.standsOut)}</textarea><label for="pros-choice"><strong>What choice feels most consistent with what matters to you right now?</strong></label><textarea id="pros-choice" data-pros-field="choice">${escapeHtml(state.choice)}</textarea><label for="pros-support">What could help you follow through? <span class="skill-app-optional">Optional</span></label><textarea id="pros-support" data-pros-field="support">${escapeHtml(state.support)}</textarea></section><div class="pros-cons-summary-action"><button type="button" data-pros-review ${anyEntries ? "" : "disabled"}>View a simple summary</button><p class="skill-app-field-help">Shows a clean, read-only view of your entries for quick review. You can return to editing at any time.</p></div><details class="quick-tool-related"><summary>Related skills</summary><p><a href="${escapeHtml(Site.path("/tool-finder/stop/"))}">STOP</a> · <a href="${escapeHtml(Site.path("/learn/mindfulness/mindfulness-foundations.html#wise-mind"))}">Wise Mind</a> · <a href="${escapeHtml(Site.path("/tool-finder/urge-surfing/"))}">Urge Surfing</a> · <a href="${escapeHtml(Site.path("/learn/distress-tolerance/radical-acceptance.html"))}">Radical Acceptance</a></p></details><p class="skill-app-note">If an urge involves immediate danger to you or another person, prioritize immediate safety and appropriate real-world support rather than relying on this exercise alone.</p>`, learnLinks([["Learn Pros & Cons", "/learn/distress-tolerance/pros-and-cons.html"], ["Printable worksheet", "/resources/clean/distress-tolerance/distress-tolerance-worksheet-3-pros-and-cons-of-acting-on-crisis-urges-clean.pdf", true], ["Reference handout", "/resources/clean/distress-tolerance/distress-tolerance-handout-5-pros-and-cons-clean.pdf", true]]));
      root.querySelectorAll("[data-pros-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.prosField] = field.value; }));
      root.querySelectorAll("[data-pros-list]").forEach((sectionElement) => {
        const key = sectionElement.dataset.prosList;
        sectionElement.querySelector("[data-pros-add]").addEventListener("click", () => { const id = nextItemId(key); state.lists[key].push({ id, text: "", timeFrame: "" }); render(id); });
        sectionElement.querySelectorAll("[data-pros-item]").forEach((row) => {
          const index = state.lists[key].findIndex((item) => item.id === row.dataset.prosItem);
          const item = state.lists[key][index];
          row.querySelector("[data-pros-text]").addEventListener("input", (event) => { item.text = event.target.value; });
          row.querySelector("[data-pros-text]").addEventListener("change", () => render(item.id));
          row.querySelector("[data-pros-time]").addEventListener("change", (event) => { item.timeFrame = event.target.value; render(item.id); });
          row.querySelector("[data-pros-edit]").addEventListener("click", () => row.querySelector("[data-pros-text]").focus());
          row.querySelector("[data-pros-up]").addEventListener("click", () => { state = reorderProsConsItem(state, key, index, -1); render(item.id); });
          row.querySelector("[data-pros-down]").addEventListener("click", () => { state = reorderProsConsItem(state, key, index, 1); render(item.id); });
          row.querySelector("[data-pros-remove]").addEventListener("click", () => { state.lists[key].splice(index, 1); render(); });
        });
      });
      root.querySelector("[data-pros-review]")?.addEventListener("click", () => { reviewMode = true; render(); });
      if (focusId) global.requestAnimationFrame(() => root.querySelector(`[data-pros-item="${global.CSS?.escape ? global.CSS.escape(focusId) : focusId}"] textarea`)?.focus());
    }
    render();
    register(root, { toolId: "pros-and-cons", toolTitle: "Pros & Cons", route: Progress.TOOL_ROUTES["pros-and-cons"], getState: () => clone(state), setState: (next) => { state = normalizeProsConsState(next); itemCounter = PROS_CONS_SECTIONS.reduce((sum, section) => sum + state.lists[section.key].length, 0); reviewMode = false; render(); }, validateState: validateProsConsState, getReadableSummary: prosConsSummary });
  }

  const TROUBLESHOOTING_AREAS = Object.freeze([
    { id: "skills", heading: "Do I have the skills I need?", exportHeading: "Skills", questions: ["Do I know how to ask skillfully for what I want?", "Do I know how to say what I need to say?", "Am I using the relevant skill steps, rather than only part of them?", "Have I practised the wording and nonverbal delivery enough to use the skill when it matters?"], suggestion: "Review or rehearse the relevant skill, including the wording and nonverbal delivery.", links: [["DEAR MAN", "/tool-finder/dear-man/"], ["Ask or Say No", "/tool-finder/ask-or-say-no/"], ["DIME Game", "/tool-finder/dime-game/"]] },
    { id: "clarity", heading: "Am I clear about what I want in this interaction?", exportHeading: "Clarity about what I want", questions: ["Am I undecided about what I actually want?", "Am I unsure which priority matters most?", "Am I asking for more or less than I really intend?", "Am I moving toward saying no to everything or yes to everything?", "Are fear or shame making it harder to identify what I want?"], suggestion: "Clarify the goal and priorities before choosing intensity or wording.", links: [["Clarifying Priorities", "/learn/interpersonal-effectiveness/clarifying-priorities.html"], ["DIME Game", "/tool-finder/dime-game/"], ["Ask or Say No", "/tool-finder/ask-or-say-no/"]] },
    { id: "timeGoals", heading: "Are short-term goals getting in the way of longer-term goals?", exportHeading: "Short-term vs longer-term goals", questions: ["Am I focused mainly on getting relief or a result right now?", "Could what I say or do now undermine something more important later?", "Is Emotion Mind driving the interaction when I would rather respond from Wise Mind?"], suggestion: "Pause and compare the immediate objective with longer-term relationship, self-respect, safety, and other goals.", links: [["Wise Mind", "/learn/mindfulness/mindfulness-foundations.html#wise-mind"], ["Clarifying Priorities", "/learn/interpersonal-effectiveness/clarifying-priorities.html"], ["STOP", "/tool-finder/stop/"]] },
    { id: "emotions", heading: "Are my emotions making it hard to use the skill?", exportHeading: "Emotional intensity", questions: ["Am I too upset or activated to use the skill the way I intended?", "Does my emotional intensity make it hard to think clearly enough to use the skill?"], suggestion: "Regulate enough to regain choice, then return to the interpersonal problem. You do not have to become completely calm before communicating.", links: [["TIPP", "/learn/distress-tolerance/tipp.html"], ["STOP", "/tool-finder/stop/"], ["Grounding", "/tool-finder/grounding/"], ["Check the Facts", "/learn/emotion-regulation/check-the-facts.html"], ["Mindfulness of Current Emotions", "/learn/mindfulness/mindfulness-of-emotions.html"]] },
    { id: "beliefs", heading: "Are worries, assumptions, or beliefs getting in the way?", exportHeading: "Worries, assumptions, or myths", questions: ["Am I predicting bad consequences such as rejection or disapproval?", "Am I assuming I do not deserve to ask, refuse, or set the boundary?", "Am I using harsh labels about myself that make it harder to act?", "Am I relying on rigid beliefs about what asking, saying no, or having values supposedly means?"], suggestion: "Separate predictions and assumptions from facts, then choose wording that supports self-respect.", links: [["Check the Facts", "/learn/emotion-regulation/check-the-facts.html"], ["Thinking Traps", "/tool-finder/thinking-traps/"], ["Thought Record", "/tool-finder/thought-record/"], ["FAST", "/learn/interpersonal-effectiveness/fast.html"]] },
    { id: "environment", heading: "Is the environment more powerful than the skill right now?", exportHeading: "Environment / power", questions: ["Does someone else have substantially more control over the situation?", "Are there real power differences affecting what is possible?", "Could the other person feel threatened by the change I am asking for?", "Does the other person have strong reasons to resist what I want?", "Is this a situation where even skillful communication may not produce the outcome I want?"], suggestion: "Recognize environmental limits. Consider changing timing, strategy, or the goal; seeking support; protecting safety; or accepting that the other person may still say no.", links: [["Boundaries", "/learn/interpersonal-effectiveness/boundaries.html"], ["Clarifying Priorities", "/learn/interpersonal-effectiveness/clarifying-priorities.html"]] },
  ]);
  const TROUBLESHOOTING_ANSWERS = Object.freeze(["", "yes", "no", "unsure"]);
  function initialTroubleshootingState() {
    return { goal: "", tried: "", happened: "", areas: Object.fromEntries(TROUBLESHOOTING_AREAS.map(({ id }) => [id, { answer: "", note: "" }])), nextAdjustment: "", successMeasure: "" };
  }
  function normalizeTroubleshootingState(next) {
    const source = isObject(next) ? next : {};
    const current = initialTroubleshootingState();
    ["goal", "tried", "happened", "nextAdjustment", "successMeasure"].forEach((key) => { current[key] = typeof source[key] === "string" ? source[key] : ""; });
    if (isObject(source.areas)) TROUBLESHOOTING_AREAS.forEach(({ id }) => {
      const area = isObject(source.areas[id]) ? source.areas[id] : {};
      current.areas[id] = { answer: TROUBLESHOOTING_ANSWERS.includes(area.answer) ? area.answer : "", note: typeof area.note === "string" ? area.note : "" };
    });
    return current;
  }
  function validateTroubleshootingState(next) {
    return isObject(next) && ["goal", "tried", "happened", "nextAdjustment", "successMeasure"].every((key) => typeof next[key] === "string") && isObject(next.areas) && TROUBLESHOOTING_AREAS.every(({ id }) => isObject(next.areas[id]) && TROUBLESHOOTING_ANSWERS.includes(next.areas[id].answer) && typeof next.areas[id].note === "string");
  }
  function troubleshootingResultAreas(next) {
    const current = normalizeTroubleshootingState(next);
    return { yes: TROUBLESHOOTING_AREAS.filter(({ id }) => current.areas[id].answer === "yes"), unsure: TROUBLESHOOTING_AREAS.filter(({ id }) => current.areas[id].answer === "unsure") };
  }
  function troubleshootingSummary(next) {
    const current = normalizeTroubleshootingState(next);
    const lines = ["# Troubleshooting Interpersonal Effectiveness", "", "## What I am trying to do", "", current.goal.trim() || "Not entered.", "", "## What I already tried", "", current.tried.trim() || "Not entered.", "", "## What happened", "", current.happened.trim() || "Not entered."];
    TROUBLESHOOTING_AREAS.forEach((area) => { lines.push("", `## ${area.exportHeading}`, "", `Answer: ${current.areas[area.id].answer === "unsure" ? "Not sure" : current.areas[area.id].answer ? current.areas[area.id].answer[0].toUpperCase() + current.areas[area.id].answer.slice(1) : "Not answered"}`, "", `Notes: ${current.areas[area.id].note.trim() || "None."}`); });
    const results = troubleshootingResultAreas(current);
    lines.push("", "## What may be getting in the way", "", "Worth looking at:", ...(results.yes.length ? results.yes.map((area) => `- ${area.heading}`) : ["- None marked Yes."]), "", "Not sure:", ...(results.unsure.length ? results.unsure.map((area) => `- ${area.heading}`) : ["- None."]), "", "## Next adjustment", "", current.nextAdjustment.trim() || "Not entered.", "", "## How I'll know whether it helped", "", current.successMeasure.trim() || "Not entered.", "", "## Sources", "", "- Learn: /learn/interpersonal-effectiveness/saying-no.html#interpersonal-troubleshooting", "- Handout 9, part 1: /resources/clean/interpersonal-effectiveness/interpersonal-effectiveness-handout-9-troubleshooting-when-what-you-are-doing-is-not-working-1-of-2-clean.pdf", "- Handout 9, part 2: /resources/clean/interpersonal-effectiveness/interpersonal-effectiveness-handout-9-troubleshooting-when-what-you-are-doing-is-not-working-2-of-2-clean.pdf");
    return lines.join("\n");
  }
  function initInterpersonalTroubleshooting(root) {
    let state = initialTroubleshootingState();
    let activeIndex = 0;
    const answerLabel = (answer) => answer === "unsure" ? "Not sure" : answer ? answer[0].toUpperCase() + answer.slice(1) : "Not answered";
    const answerButtons = (area, compact = false) => `<div class="skill-guided-choices troubleshooting-choices" role="group" aria-label="${compact ? "Change" : "Choose"} answer for ${escapeHtml(area.heading)}">${[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]].map(([value, label]) => `<button type="button" class="skill-guided-choice skill-guided-choice--${value} ${state.areas[area.id].answer === value ? "is-selected" : ""}" data-trouble-answer="${value}" aria-pressed="${state.areas[area.id].answer === value}">${label}</button>`).join("")}</div>`;
    const contextualLinks = (areas) => {
      const seen = new Set();
      const links = [];
      areas.forEach((area) => area.links.forEach(([label, href]) => { if (!seen.has(href)) { seen.add(href); links.push([label, href]); } }));
      if (areas.some((area) => area.id === "skills")) {
        const goal = state.goal.toLocaleLowerCase();
        if (goal.includes("boundary")) links.push(["Boundaries", "/learn/interpersonal-effectiveness/boundaries.html"]);
        if (goal.includes("relationship") || goal.includes("conversation")) links.push(["GIVE", "/learn/interpersonal-effectiveness/give.html"]);
        if (goal.includes("self-respect") || goal.includes("value")) links.push(["FAST", "/learn/interpersonal-effectiveness/fast.html"]);
      }
      return links.map(([label, href]) => `<a class="skill-app-link-button secondary" href="${escapeHtml(Site.path(href))}">${escapeHtml(label)}</a>`).join("");
    };
    function completedMarkup(area) {
      const response = state.areas[area.id];
      return `<article class="troubleshooting-completed" data-trouble-completed="${area.id}"><p class="skill-tree-kicker">Completed · ${escapeHtml(answerLabel(response.answer))}</p><h3>${escapeHtml(area.heading)}</h3>${answerButtons(area, true)}<label for="trouble-note-${area.id}">Optional note</label><textarea id="trouble-note-${area.id}" data-trouble-note>${escapeHtml(response.note)}</textarea><button type="button" class="secondary" data-trouble-review-area>Review this area</button></article>`;
    }
    function resultMarkup() {
      const results = troubleshootingResultAreas(state);
      const list = (areas, empty) => areas.length ? `<ul>${areas.map((area) => `<li>${escapeHtml(area.heading)}</li>`).join("")}</ul>` : `<p class="skill-app-field-help">${escapeHtml(empty)}</p>`;
      const relevant = [...results.yes, ...results.unsure];
      return `<section class="troubleshooting-result" aria-labelledby="trouble-result-heading"><p class="skill-tree-kicker">Review complete</p><h3 id="trouble-result-heading">What may be getting in the way</h3><h4>Worth looking at</h4>${list(results.yes, "No area was marked Yes.")}<h4>Not sure</h4>${list(results.unsure, "No area was marked Not sure.")}<div class="troubleshooting-suggestions">${relevant.map((area) => `<article><h4>${escapeHtml(area.heading)}</h4><p>${escapeHtml(area.suggestion)}</p></article>`).join("") || "<p>Your answers do not point to one of these six areas right now. You can still revise an answer or name another adjustment.</p>"}</div>${relevant.length ? `<nav class="quick-tool-source-links" aria-label="Related tools for the areas selected">${contextualLinks(relevant)}</nav>` : ""}<label for="trouble-adjustment"><strong>What is the next adjustment you want to try?</strong></label><textarea id="trouble-adjustment" data-trouble-field="nextAdjustment">${escapeHtml(state.nextAdjustment)}</textarea><label for="trouble-measure">What would tell you whether that adjustment helped? <span class="skill-app-optional">Optional</span></label><textarea id="trouble-measure" data-trouble-field="successMeasure">${escapeHtml(state.successMeasure)}</textarea><p class="skill-app-note">If safety or coercion is present, prioritize safety and appropriate support rather than simply trying an interpersonal script harder.</p></section>`;
    }
    function render(focus = false) {
      const answered = TROUBLESHOOTING_AREAS.filter(({ id }) => state.areas[id].answer);
      const history = answered.filter((_area, index) => TROUBLESHOOTING_AREAS.indexOf(answered[index]) !== activeIndex).map(completedMarkup).join("");
      const allAnswered = answered.length === TROUBLESHOOTING_AREAS.length;
      const current = activeIndex === null ? null : TROUBLESHOOTING_AREAS[activeIndex];
      const currentMarkup = current ? `<article class="troubleshooting-current" data-trouble-current tabindex="-1"><p class="skill-tree-kicker">Current question · Area ${activeIndex + 1} of ${TROUBLESHOOTING_AREAS.length}</p><h3>${escapeHtml(current.heading)}</h3><ul>${current.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul><p class="skill-app-field-help">Choose Yes if this may be worth looking at. It does not mean this is definitely the problem.</p>${answerButtons(current)}<label for="trouble-current-note">Optional note</label><textarea id="trouble-current-note" data-trouble-current-note>${escapeHtml(state.areas[current.id].note)}</textarea><div class="skill-app-actions"><button type="button" class="secondary" data-trouble-back ${activeIndex ? "" : "disabled"}>Back</button></div></article>` : "";
      root.innerHTML = pageShell("Troubleshooting Interpersonal Effectiveness", "Work out what may be getting in the way when an interpersonal skill isn't working.", `<section class="troubleshooting-opening"><label for="trouble-goal"><strong>What are you trying to do in this interaction?</strong></label><p class="skill-app-field-help">For example: ask for something, say no, set a boundary, express a need, or handle a difficult conversation.</p><textarea id="trouble-goal" class="skill-app-textarea-large" data-trouble-field="goal">${escapeHtml(state.goal)}</textarea><label for="trouble-tried"><strong>What have you already tried?</strong></label><textarea id="trouble-tried" data-trouble-field="tried">${escapeHtml(state.tried)}</textarea><label for="trouble-happened">What happened? <span class="skill-app-optional">Optional</span></label><textarea id="trouble-happened" data-trouble-field="happened">${escapeHtml(state.happened)}</textarea></section><section class="troubleshooting-guide" aria-label="Six troubleshooting areas"><div class="troubleshooting-history" aria-live="polite">${history}${currentMarkup}${allAnswered && activeIndex === null ? resultMarkup() : ""}</div></section>`, learnLinks([["Learn troubleshooting", "/learn/interpersonal-effectiveness/saying-no.html#interpersonal-troubleshooting"], ["Handout 9, part 1", "/resources/clean/interpersonal-effectiveness/interpersonal-effectiveness-handout-9-troubleshooting-when-what-you-are-doing-is-not-working-1-of-2-clean.pdf", true], ["Handout 9, part 2", "/resources/clean/interpersonal-effectiveness/interpersonal-effectiveness-handout-9-troubleshooting-when-what-you-are-doing-is-not-working-2-of-2-clean.pdf", true]]));
      root.querySelectorAll("[data-trouble-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.troubleField] = field.value; }));
      root.querySelectorAll("[data-trouble-completed]").forEach((card) => {
        const area = TROUBLESHOOTING_AREAS.find((item) => item.id === card.dataset.troubleCompleted);
        card.querySelectorAll("[data-trouble-answer]").forEach((button) => button.addEventListener("click", () => { state.areas[area.id].answer = button.dataset.troubleAnswer; render(); }));
        card.querySelector("[data-trouble-note]").addEventListener("input", (event) => { state.areas[area.id].note = event.target.value; });
        card.querySelector("[data-trouble-review-area]").addEventListener("click", () => { activeIndex = TROUBLESHOOTING_AREAS.indexOf(area); render(true); });
      });
      if (current) {
        root.querySelector("[data-trouble-current-note]").addEventListener("input", (event) => { state.areas[current.id].note = event.target.value; });
        root.querySelectorAll("[data-trouble-current] [data-trouble-answer]").forEach((button) => button.addEventListener("click", () => {
          state.areas[current.id].answer = button.dataset.troubleAnswer;
          const next = TROUBLESHOOTING_AREAS.findIndex((area, index) => index > activeIndex && !state.areas[area.id].answer);
          activeIndex = next >= 0 ? next : (TROUBLESHOOTING_AREAS.every((area) => state.areas[area.id].answer) ? null : TROUBLESHOOTING_AREAS.findIndex((area) => !state.areas[area.id].answer));
          render(true);
        }));
        root.querySelector("[data-trouble-back]")?.addEventListener("click", () => { activeIndex = Math.max(0, activeIndex - 1); render(true); });
      }
      if (focus) global.requestAnimationFrame(() => { const target = root.querySelector("[data-trouble-current], #trouble-result-heading"); target?.scrollIntoView({ block: "start", behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth" }); target?.focus?.({ preventScroll: true }); });
    }
    render();
    register(root, { toolId: "interpersonal-troubleshooting", toolTitle: "Troubleshooting Interpersonal Effectiveness", route: Progress.TOOL_ROUTES["interpersonal-troubleshooting"], getState: () => clone(state), setState: (next) => { state = normalizeTroubleshootingState(next); const firstUnanswered = TROUBLESHOOTING_AREAS.findIndex((area) => !state.areas[area.id].answer); activeIndex = firstUnanswered >= 0 ? firstUnanswered : null; render(); }, validateState: validateTroubleshootingState, getReadableSummary: troubleshootingSummary });
  }

  const INITIALIZERS = {
    "five-factor-model": initFiveFactor,
    "case-map": initCaseMap,
    "thinking-traps": initThinkingTraps,
    "thought-record": initThoughtRecord,
    "worry-time": initWorryTime,
    "box-breathing": initBoxBreathing,
    "gratitude-journal": initGratitude,
    "positive-self-talk": initPositiveSelfTalk,
    "grounding": initGrounding,
    "stop": initStop,
    "sleep-hygiene": initSleepHygiene,
    "stages-of-change": initStagesOfChange,
    "urge-surfing": initUrgeSurfing,
    "pros-and-cons": initProsAndCons,
    "interpersonal-troubleshooting": initInterpersonalTroubleshooting,
  };

  function initMaladaptiveSignDisclosures() {
    document.querySelectorAll("details.maladaptive-sign").forEach((details) => {
      const summary = details.querySelector(":scope > summary");
      if (!summary) return;
      const syncExpanded = () => summary.setAttribute("aria-expanded", String(details.open));
      syncExpanded();
      details.addEventListener("toggle", syncExpanded);
    });
  }

  async function start() {
    initMaladaptiveSignDisclosures();
    for (const root of document.querySelectorAll("[data-quick-app]")) {
      try { await INITIALIZERS[root.dataset.quickApp]?.(root); }
      catch (error) { root.innerHTML = '<p class="skill-app-note">This tool could not load. Please refresh the page or use the linked Learn material.</p>'; global.console?.error(error); }
    }
  }

  const api = { FIVE_FACTORS, CASE_MAP_FIELDS, THINKING_TRAPS, THOUGHT_FIELDS, CANONICAL_EMOTION_IDS, GROUNDING_STEPS, STAGES_OF_CHANGE, STAGES_RESPONSE_KEYS, PROS_CONS_SECTIONS, PROS_CONS_TIME_FRAMES, TROUBLESHOOTING_AREAS, BoxBreathingMachine, initialThoughtRecord, normalizeThoughtRecord, validateThoughtRecordState, thoughtRecordSummarySections, gratitudeSummarySections, initialStagesOfChangeState, normalizeStagesOfChangeState, validateStagesOfChangeState, selectStagesOfChangeStage, stagesOfChangeSummary, stagesChangePathMarkup, validUrgeCheckpoint, urgeGraphPoints, urgeGraphMarkup, initialProsConsState, normalizeProsConsState, validateProsConsState, reorderProsConsItem, prosConsTimeGroups, prosConsSummary, initialTroubleshootingState, normalizeTroubleshootingState, validateTroubleshootingState, troubleshootingResultAreas, troubleshootingSummary };
  global.TherapyQuickTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
}(typeof window !== "undefined" ? window : globalThis));

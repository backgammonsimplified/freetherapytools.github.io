(function (global) {
  "use strict";

  const Progress = global.TherapySkillProgress;
  const Calendar = global.TherapyCalendar;
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
    return `<nav class="quick-tool-source-links" aria-label="Learn and source links">${items.map(([label, href, external]) => `<a class="skill-app-link-button secondary" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(label)}${external ? ' <span class="visually-hidden">(opens in a new tab)</span>' : ""}</a>`).join("")}</nav>`;
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
        global.location.href = "/tool-finder/thought-record/";
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
    const response = await fetch("/data/skill-apps/emotions.json", { credentials: "same-origin" });
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
      root.innerHTML = pageShell("Box Breathing", "Use a configurable four-phase breathing timer. Either hold can be set to 0.", `<div class="box-breathing-tool"><div class="box-breathing-stage" aria-live="polite"><div class="box-breathing-circle" data-breath-circle style="--breath-progress:0"><span data-breath-phase>Ready</span><small data-breath-remaining>${state.cycles} completed cycles</small></div></div><div class="box-breathing-settings">${controls}<aside class="skill-app-note box-breathing-safety">Please consult your doctor or health care practitioner before holding your breath if you have concerns about whether breath-hold exercises are appropriate for you. Everyone has different breathing needs. Be mindful of what feels safe and works for you.</aside></div><div class="skill-app-actions box-breathing-actions"><button type="button" data-breath-start>Start</button><button type="button" class="secondary" data-breath-pause disabled>Pause</button><button type="button" class="secondary" data-breath-reset>Reset</button></div></div><p class="skill-app-note">The source curriculum names Box Breathing but does not prescribe timings. Four seconds per phase is a configurable starting setup, not a required pace.</p>`, learnLinks([["Skills & Strengths List", "/tool-finder/#resource-general-p002"]]));
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

  function initStagesOfChange(root) {
    const stages = ["Precontemplation", "Contemplation", "Preparation", "Action", "Maintenance", "Return to an old pattern / lapse"];
    const fields = [["behaviour","Behaviour or change I am considering"],["readiness","Which description feels closest today, and why?"],["benefits","What does the current behaviour provide in the short term?"],["costs","What does it cost in the short or long term?"],["ambivalence","What are both sides of my ambivalence?"],["nextStep","One possible next step"],["support","People, services, or practical support"]];
    let state = { stage: "", ...Object.fromEntries(fields.map(([key]) => [key, ""])) };
    function render() {
      root.innerHTML = pageShell("Stages of Change", "Reflect on readiness without turning it into a diagnostic score.", `<label for="stage-choice">Current readiness description</label><select id="stage-choice" data-stage-choice><option value="">Choose if useful</option>${stages.map((stage) => `<option ${state.stage === stage ? "selected" : ""}>${escapeHtml(stage)}</option>`).join("")}</select>${fields.map(([key,label]) => `<label for="stage-${key}">${escapeHtml(label)}</label><textarea id="stage-${key}" data-stage-field="${key}">${escapeHtml(state[key])}</textarea>`).join("")}<p class="skill-app-note">Stages are descriptions for reflection, not a test or diagnosis. Readiness can shift by behaviour and over time.</p>`, learnLinks([["Learn the Stages of Change", "/learn/wellness/maladaptive-coping.html#stages-of-change"],["Learn Urge Surfing", "/learn/wellness/urge-surfing.html"]]));
      root.querySelector("[data-stage-choice]").addEventListener("change", (event) => { state.stage = event.target.value; });
      root.querySelectorAll("[data-stage-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.stageField] = field.value; }));
    }
    render();
    register(root, { toolId: "stages-of-change", toolTitle: "Stages of Change", route: Progress.TOOL_ROUTES["stages-of-change"], getState: () => state, setState: (next) => { state = clone(next); render(); }, validateState: (next) => isObject(next) && (next.stage === "" || stages.includes(next.stage)) && fields.every(([key]) => typeof next[key] === "string"), getReadableSummary: (next) => Progress.nonEmptySections("Stages of Change", [["Current readiness description",next.stage], ...fields.map(([key,label]) => [label,next[key]])]) });
  }

  function initUrgeSurfing(root) {
    const fields = [["urge","I have the urge to…"],["trigger","Context or trigger"],["body","Body sensations"],["thoughts","Thoughts, images, emotions, or stories"],["observe","How I can acknowledge this urge without treating it as a command"],["noticed","What I noticed"],["changed","How the urge changed, if at all"],["helped","What helped me stay with it"],["acted","Did I act on it? What happened?"],["nextTime","What I would try next time"],["nextAction","Optional safe or value-aligned next action"]];
    let state = { ...Object.fromEntries(fields.map(([key]) => [key, ""])), intensity: "", afterIntensity: "", checkpoints: [], timer: { duration: 120, remaining: 120, running: false } };
    let timerId = null;
    function stopTimer() { if (timerId) global.clearInterval(timerId); timerId = null; state.timer.running = false; }
    function render() {
      const before = fields.slice(0,5).map(([key,label]) => `<label for="urge-${key}">${escapeHtml(label)}</label><textarea id="urge-${key}" data-urge-field="${key}">${escapeHtml(state[key])}</textarea>`).join("");
      const after = fields.slice(5).map(([key,label]) => `<label for="urge-${key}">${escapeHtml(label)}</label><textarea id="urge-${key}" data-urge-field="${key}">${escapeHtml(state[key])}</textarea>`).join("");
      root.innerHTML = pageShell("Urge Surfing", "Notice the urge, anchor attention, and ride the wave without treating it as a command.", `${before}<label for="urge-intensity">Current intensity (0–100)</label><input id="urge-intensity" type="number" min="0" max="100" inputmode="numeric" data-urge-rating="intensity" value="${escapeHtml(state.intensity)}"><section class="urge-wave" aria-label="Accessible wave illustration"><span aria-hidden="true">rise → crest → change</span><p>Urges can change like a wave. Notice the experience, allow time, and return to a comfortable breath as an anchor. You do not have to use the timer.</p></section><div class="urge-timer"><label for="urge-duration">Optional practice timer</label><select id="urge-duration" data-urge-duration>${[120,180,240,300].map((seconds) => `<option value="${seconds}" ${state.timer.duration === seconds ? "selected" : ""}>${seconds/60} minutes</option>`).join("")}</select><output aria-live="polite" data-urge-clock>${Math.floor(state.timer.remaining/60)}:${String(state.timer.remaining%60).padStart(2,"0")}</output><div class="skill-app-actions"><button type="button" data-urge-start>Start</button><button type="button" class="secondary" data-urge-pause>Pause</button><button type="button" class="secondary" data-urge-reset>Reset</button></div></div><label for="urge-after">Check the wave again (0–100, optional)</label><input id="urge-after" type="number" min="0" max="100" inputmode="numeric" data-urge-rating="afterIntensity" value="${escapeHtml(state.afterIntensity)}">${after}<p class="skill-app-note">If an urge involves immediate danger to you or another person, prioritize safety and appropriate real-world support rather than relying on this exercise alone.</p>`, learnLinks([["Learn Urge Surfing", "/learn/wellness/urge-surfing.html"],["Mindfulness of Emotions", "/learn/mindfulness/mindfulness-of-emotions.html#emotion-surfing"]]));
      root.querySelectorAll("[data-urge-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.urgeField] = field.value; }));
      root.querySelectorAll("[data-urge-rating]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.urgeRating] = field.value; }));
      root.querySelector("[data-urge-duration]").addEventListener("change", (event) => { stopTimer(); state.timer.duration = Number(event.target.value); state.timer.remaining = state.timer.duration; render(); });
      root.querySelector("[data-urge-start]").addEventListener("click", () => { if (state.timer.running) return; state.timer.running = true; timerId = global.setInterval(() => { state.timer.remaining = Math.max(0, state.timer.remaining - 1); const out = root.querySelector("[data-urge-clock]"); if (out) out.textContent = `${Math.floor(state.timer.remaining/60)}:${String(state.timer.remaining%60).padStart(2,"0")}`; if (!state.timer.remaining) stopTimer(); }, 1000); });
      root.querySelector("[data-urge-pause]").addEventListener("click", stopTimer);
      root.querySelector("[data-urge-reset]").addEventListener("click", () => { stopTimer(); state.timer.remaining = state.timer.duration; render(); });
    }
    render();
    register(root, { toolId: "urge-surfing", toolTitle: "Urge Surfing", route: Progress.TOOL_ROUTES["urge-surfing"], getState: () => ({...state, timer: {...state.timer, running: false}}), setState: (next) => { stopTimer(); state = clone(next); state.timer.running = false; render(); }, validateState: (next) => isObject(next) && fields.every(([key]) => typeof next[key] === "string") && [next.intensity,next.afterIntensity].every((value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100)) && isObject(next.timer) && [120,180,240,300].includes(next.timer.duration) && Number.isInteger(next.timer.remaining) && next.timer.remaining >= 0 && next.timer.remaining <= next.timer.duration, getReadableSummary: (next) => Progress.nonEmptySections("Urge Surfing", [["Initial intensity",next.intensity && `${next.intensity}/100`], ...fields.map(([key,label]) => [label,next[key]]), ["Later intensity",next.afterIntensity && `${next.afterIntensity}/100`]]) });
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
  };

  async function start() {
    for (const root of document.querySelectorAll("[data-quick-app]")) {
      try { await INITIALIZERS[root.dataset.quickApp]?.(root); }
      catch (error) { root.innerHTML = '<p class="skill-app-note">This tool could not load. Please refresh the page or use the linked Learn material.</p>'; global.console?.error(error); }
    }
  }

  const api = { FIVE_FACTORS, CASE_MAP_FIELDS, THINKING_TRAPS, THOUGHT_FIELDS, CANONICAL_EMOTION_IDS, GROUNDING_STEPS, BoxBreathingMachine, initialThoughtRecord, normalizeThoughtRecord, validateThoughtRecordState, thoughtRecordSummarySections, gratitudeSummarySections };
  global.TherapyQuickTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
}(typeof window !== "undefined" ? window : globalThis));

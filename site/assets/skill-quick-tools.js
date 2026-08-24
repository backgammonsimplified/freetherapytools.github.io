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
    register(root, { toolId: "five-factor-model", toolTitle: "Five Factor Model", route: Progress.TOOL_ROUTES["five-factor-model"], getState: () => state, setState: (next) => { state = { ...state, ...next }; render(); }, validateState: (next) => stringsOnly(next, FIVE_FACTORS.map(([key]) => key)), getReadableSummary: (next) => Progress.nonEmptySections("Five Factor Model", FIVE_FACTORS.map(([key, label]) => [label, next[key]])) });
  }

  function initThinkingTraps(root) {
    let state = { context: "", thought: "", selected: [] };
    function render() {
      const cards = THINKING_TRAPS.map(([id, name, description, example]) => `<label class="thinking-trap-card"><span class="thinking-trap-choice"><input type="checkbox" data-trap="${id}" ${state.selected.includes(id) ? "checked" : ""}><strong>${escapeHtml(name)}</strong></span><span>${escapeHtml(description)}</span><small>Example: ${escapeHtml(example)}</small></label>`).join("");
      root.innerHTML = pageShell("Recognizing Thinking Traps", "Name patterns that may fit a thought, then decide whether a fuller Thought Record would help.", `<label for="trap-context">Situation or context</label><textarea id="trap-context" data-trap-field="context">${escapeHtml(state.context)}</textarea><label for="trap-thought">Thought I am examining</label><textarea id="trap-thought" data-trap-field="thought">${escapeHtml(state.thought)}</textarea><fieldset class="skill-app-fieldset"><legend>Which source-backed patterns may fit?</legend><p>Select any that seem relevant. A label is a prompt to check a thought, not proof that it is wrong.</p><div class="thinking-trap-grid">${cards}</div></fieldset><div class="skill-app-actions"><button type="button" data-start-thought-record>Continue to Thought Record</button></div><p class="skill-app-field-help">The handoff uses temporary session storage. Your text is not placed in the page URL.</p>`, learnLinks([["Thinking Traps lesson", "/learn/cbt-anxiety/thinking-traps.html#thinking-traps"], ["Thinking Traps overview", "/resources/cbt-skills/cbt-skills-p012.jpg", true]]));
      root.querySelectorAll("[data-trap-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.trapField] = field.value; }));
      root.querySelectorAll("[data-trap]").forEach((field) => field.addEventListener("change", () => { state.selected = [...root.querySelectorAll("[data-trap]:checked")].map((item) => item.dataset.trap); }));
      root.querySelector("[data-start-thought-record]")?.addEventListener("click", () => {
        try { global.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(state)); } catch (_error) { /* direct navigation still works */ }
        global.location.href = "/skill-finder/thought-record/";
      });
    }
    render();
    register(root, { toolId: "thinking-traps", toolTitle: "Recognizing Thinking Traps", route: Progress.TOOL_ROUTES["thinking-traps"], getState: () => state, setState: (next) => { state = { context: next.context, thought: next.thought, selected: [...next.selected] }; render(); }, validateState: (next) => isObject(next) && Object.keys(next).every((key) => ["context", "thought", "selected"].includes(key)) && typeof next.context === "string" && typeof next.thought === "string" && Array.isArray(next.selected) && next.selected.every((id) => THINKING_TRAPS.some(([trapId]) => trapId === id)), getReadableSummary: (next) => Progress.nonEmptySections("Recognizing Thinking Traps", [["Situation or Context", next.context], ["Thought", next.thought], ["Thinking Traps", next.selected.map((id) => THINKING_TRAPS.find(([trapId]) => trapId === id)?.[1] || id)]]) });
  }

  const THOUGHT_FIELDS = ["situation", "emotions", "initialIntensity", "automaticThoughts", "hotThought", "beliefBefore", "evidenceFor", "evidenceAgainst", "balancedThought", "beliefBalanced", "emotionAfter"];
  function initialThoughtRecord() { return { ...Object.fromEntries(THOUGHT_FIELDS.map((key) => [key, ""])), traps: [] }; }
  function normalizeThoughtRecord(next) { return { ...initialThoughtRecord(), ...(next || {}), traps: Array.isArray(next?.traps) ? [...next.traps] : [] }; }
  function validateThoughtRecordState(next) {
    const ratings = ["initialIntensity", "beliefBefore", "beliefBalanced", "emotionAfter"];
    const validRating = (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100);
    return isObject(next) && Object.keys(next).every((key) => [...THOUGHT_FIELDS, "traps"].includes(key))
      && THOUGHT_FIELDS.every((key) => typeof next[key] === "string") && ratings.every((key) => validRating(next[key]))
      && Array.isArray(next.traps) && next.traps.length <= THINKING_TRAPS.length && new Set(next.traps).size === next.traps.length
      && next.traps.every((id) => THINKING_TRAPS.some(([trapId]) => trapId === id));
  }

  function ratingField(id, label, value) {
    return `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="number" min="0" max="100" inputmode="numeric" value="${escapeHtml(value)}" data-thought-field="${id.replace("thought-", "")}">`;
  }

  function initThoughtRecord(root) {
    let state = initialThoughtRecord();
    try {
      const handoff = JSON.parse(global.sessionStorage.getItem(HANDOFF_KEY) || "null");
      global.sessionStorage.removeItem(HANDOFF_KEY);
      if (isObject(handoff)) state = normalizeThoughtRecord({ situation: String(handoff.context || ""), automaticThoughts: String(handoff.thought || ""), hotThought: String(handoff.thought || ""), traps: Array.isArray(handoff.selected) ? handoff.selected : [] });
    } catch (_error) { /* begin with a blank record */ }
    function render() {
      const traps = THINKING_TRAPS.map(([id, name]) => `<label class="skill-app-check"><input type="checkbox" data-thought-trap="${id}" ${state.traps.includes(id) ? "checked" : ""}> <span>${escapeHtml(name)}</span></label>`).join("");
      const body = `<ol class="thought-record-steps">
        <li><h3>1. Situation</h3><label for="thought-situation">Who, what, when, and where? Describe the event briefly and factually.</label><textarea id="thought-situation" data-thought-field="situation">${escapeHtml(state.situation)}</textarea></li>
        <li><h3>2. Emotions, mood, and sensations</h3><label for="thought-emotions">Name the emotions or sensations.</label><textarea id="thought-emotions" data-thought-field="emotions">${escapeHtml(state.emotions)}</textarea>${ratingField("thought-initialIntensity", "Initial intensity (0-100)", state.initialIntensity)}</li>
        <li><h3>3. Automatic thoughts</h3><label for="thought-automaticThoughts">What words or images went through your mind?</label><textarea id="thought-automaticThoughts" data-thought-field="automaticThoughts">${escapeHtml(state.automaticThoughts)}</textarea><label for="thought-hotThought">Hot thought most connected with the difficult emotion</label><textarea id="thought-hotThought" data-thought-field="hotThought">${escapeHtml(state.hotThought)}</textarea>${ratingField("thought-beliefBefore", "How much did I believe the hot thought? (0-100)", state.beliefBefore)}</li>
        <li><h3>4. Identify thinking traps</h3><div class="thought-record-traps">${traps}</div></li>
        <li><h3>5. Supporting evidence</h3><label for="thought-evidenceFor">What observable facts support the hot thought?</label><textarea id="thought-evidenceFor" data-thought-field="evidenceFor">${escapeHtml(state.evidenceFor)}</textarea></li>
        <li><h3>6. Challenging evidence</h3><label for="thought-evidenceAgainst">What facts does it overlook or contradict? What might a trusted person notice?</label><textarea id="thought-evidenceAgainst" data-thought-field="evidenceAgainst">${escapeHtml(state.evidenceAgainst)}</textarea></li>
        <li><h3>7. Alternative balanced thought</h3><label for="thought-balancedThought">Write a fair interpretation that includes all the evidence, without forced positivity.</label><textarea id="thought-balancedThought" data-thought-field="balancedThought">${escapeHtml(state.balancedThought)}</textarea>${ratingField("thought-beliefBalanced", "How much do I believe the balanced thought? (0-100)", state.beliefBalanced)}</li>
        <li><h3>8. Re-rate emotion and mood</h3>${ratingField("thought-emotionAfter", "Emotion intensity now (0-100)", state.emotionAfter)}<p class="skill-app-field-help">The goal is not to force a lower number; it is to notice what changes after considering a fuller account.</p></li>
      </ol>`;
      root.innerHTML = pageShell("Thought Record", "Complete the curriculum's Part 1 and Part 2 progression in one practical record.", body, learnLinks([["Thought Records Part 1", "/learn/cbt-anxiety/thought-records.html#thought-record-part-1"], ["Thought Records Part 2", "/learn/cbt-anxiety/thought-records-part-2.html#thought-record-part-2"], ["Blank printable record", "/resources/cbt-skills/cbt-skills-p034.jpg", true]]));
      root.querySelectorAll("[data-thought-field]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.thoughtField] = field.value; }));
      root.querySelectorAll("[data-thought-trap]").forEach((field) => field.addEventListener("change", () => { state.traps = [...root.querySelectorAll("[data-thought-trap]:checked")].map((item) => item.dataset.thoughtTrap); }));
    }
    render();
    register(root, { toolId: "thought-record", toolTitle: "Thought Record", route: Progress.TOOL_ROUTES["thought-record"], getState: () => state, setState: (next) => { state = normalizeThoughtRecord(next); render(); }, validateState: validateThoughtRecordState, getReadableSummary: (next) => Progress.nonEmptySections("Thought Record", [["1. Situation", next.situation], ["2. Emotions, Mood, and Sensations", [next.emotions, next.initialIntensity && `Initial intensity: ${next.initialIntensity}/100`]], ["3. Automatic Thoughts", next.automaticThoughts], ["Hot Thought", [next.hotThought, next.beliefBefore && `Belief: ${next.beliefBefore}/100`]], ["4. Thinking Traps", next.traps.map((id) => THINKING_TRAPS.find(([trapId]) => trapId === id)?.[1] || id)], ["5. Supporting Evidence", next.evidenceFor], ["6. Challenging Evidence", next.evidenceAgainst], ["7. Alternative Balanced Thought", [next.balancedThought, next.beliefBalanced && `Belief: ${next.beliefBalanced}/100`]], ["8. Emotion After", next.emotionAfter && `${next.emotionAfter}/100`]]) });
  }

  function initWorryTime(root) {
    let state = { worry: "", cue: "", response: "I have a time to return to this. For now, I will bring attention back to the present activity.", calendar: Calendar?.initialState({ recurring: true, frequency: "daily", durationMinutes: "20" }) || {} };
    function render() {
      root.innerHTML = pageShell("Worry Time", "Briefly note a worry, postpone extended thinking, and optionally schedule a consistent limited worry period.", `<label for="worry-time-worry">Worry to defer</label><textarea id="worry-time-worry" data-worry-field="worry">${escapeHtml(state.worry)}</textarea><label for="worry-time-cue">Brief cue I can recognize later</label><input id="worry-time-cue" type="text" data-worry-field="cue" value="${escapeHtml(state.cue)}"><label for="worry-time-response">What I will remind myself when the worry returns</label><textarea id="worry-time-response" data-worry-field="response">${escapeHtml(state.response)}</textarea><h3>Optional worry-time window</h3><p>Choose a consistent, limited period that is not close to bedtime. Calendar use is optional.</p><div data-worry-time-calendar></div><aside class="skill-app-note"><strong>When the thought returns:</strong> note a few cue words, remind yourself that you have a planned time for it, and gently return attention to the present task. During the worry period, use the Worry Tree to separate current problems from hypothetical worries.</aside>`, learnLinks([["Worry Time instructions", "/learn/cbt-anxiety/understanding-worry.html#worry-time"], ["Open Worry Tree", "/skill-finder/worry-tree/"], ["Postpone Your Worry source", "/resources/cbt-skills/cbt-skills-p040.jpg", true]]));
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
    configure(durations = {}) { this.durations = { inhale: Number(durations.inhale) || 4, holdIn: Number(durations.holdIn) || 4, exhale: Number(durations.exhale) || 4, holdOut: Number(durations.holdOut) || 4 }; }
    reset() { this.phaseIndex = 0; this.remaining = this.durations.inhale; this.running = false; this.cycles = 0; }
    start() { this.running = true; }
    pause() { this.running = false; }
    advance(seconds) {
      let delta = Math.max(0, Number(seconds) || 0);
      if (!this.running) return this.snapshot();
      while (delta >= this.remaining && this.remaining > 0) {
        delta -= this.remaining;
        this.phaseIndex = (this.phaseIndex + 1) % BREATH_PHASES.length;
        if (this.phaseIndex === 0) this.cycles += 1;
        this.remaining = this.durations[BREATH_PHASES[this.phaseIndex][0]];
      }
      this.remaining = Math.max(0, this.remaining - delta);
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
      const controls = [["inhale", "Inhale"], ["holdIn", "Hold after inhale"], ["exhale", "Exhale"], ["holdOut", "Hold after exhale"]].map(([key, label]) => `<label for="breath-${key}">${label} (seconds)<input id="breath-${key}" type="number" min="1" max="30" step="1" data-breath-duration="${key}" value="${escapeHtml(state.durations[key])}"></label>`).join("");
      root.innerHTML = pageShell("Box Breathing", "Use a configurable four-phase breathing timer. Stop if breathing practice feels uncomfortable or unhelpful.", `<div class="box-breathing-tool"><div class="box-breathing-stage" aria-live="polite"><div class="box-breathing-circle" data-breath-circle style="--breath-progress:0"><span data-breath-phase>Ready</span><small data-breath-remaining>${state.cycles} completed cycles</small></div></div><div class="box-breathing-settings">${controls}</div><div class="skill-app-actions box-breathing-actions"><button type="button" data-breath-start>Start</button><button type="button" class="secondary" data-breath-pause disabled>Pause</button><button type="button" class="secondary" data-breath-reset>Reset</button></div></div><p class="skill-app-note">The source curriculum names Box Breathing but does not prescribe timings. Four seconds per phase is a configurable starting setup, not a required pace or a substitute for medical care.</p>`, learnLinks([["Skills & Strengths List", "/skill-finder/#resource-general-p002"]]));
      root.querySelectorAll("[data-breath-duration]").forEach((field) => field.addEventListener("change", () => { const value = Math.max(1, Math.min(30, Number(field.value) || 4)); state.durations[field.dataset.breathDuration] = String(value); field.value = String(value); machine.configure(state.durations); machine.reset(); state.cycles = 0; updateStatus(); }));
      root.querySelector("[data-breath-start]")?.addEventListener("click", () => { if (machine.running) return; machine.start(); lastTick = performance.now(); stopTimer(); timer = global.setInterval(() => { const now = performance.now(); machine.advance((now - lastTick) / 1000); lastTick = now; updateStatus(); }, 100); updateStatus(); });
      root.querySelector("[data-breath-pause]")?.addEventListener("click", () => { machine.pause(); stopTimer(); updateStatus(); });
      root.querySelector("[data-breath-reset]")?.addEventListener("click", () => { stopTimer(); machine.reset(); state.cycles = 0; updateStatus(); });
      updateStatus();
    }
    render();
    register(root, { toolId: "box-breathing", toolTitle: "Box Breathing", route: Progress.TOOL_ROUTES["box-breathing"], getState: () => ({ durations: { ...state.durations }, cycles: state.cycles }), setState: (next) => { state = { durations: { ...next.durations }, cycles: next.cycles }; render(); }, validateState: (next) => isObject(next) && isObject(next.durations) && ["inhale", "holdIn", "exhale", "holdOut"].every((key) => Number.isInteger(Number(next.durations[key])) && Number(next.durations[key]) >= 1 && Number(next.durations[key]) <= 30) && Number.isInteger(next.cycles) && next.cycles >= 0, getReadableSummary: (next) => Progress.nonEmptySections("Box Breathing", [["Inhale", `${next.durations.inhale} seconds`], ["First Hold", `${next.durations.holdIn} seconds`], ["Exhale", `${next.durations.exhale} seconds`], ["Second Hold", `${next.durations.holdOut} seconds`], ["Completed Cycles", String(next.cycles)]]) });
  }

  function initGratitude(root) {
    let state = { entries: [{ id: "gratitude-1", appreciation: "", meaning: "" }] };
    function render(focusId = "") {
      root.innerHTML = pageShell("Gratitude Journal", "Record specific things you appreciate without requiring yourself to feel a particular way.", `<div class="gratitude-entries">${state.entries.map((entry, index) => `<fieldset class="skill-app-fieldset" data-gratitude-entry="${escapeHtml(entry.id)}"><legend>Entry ${index + 1}</legend><label for="${entry.id}-appreciation">Something I appreciate or am thankful for</label><textarea id="${entry.id}-appreciation" data-gratitude-field="appreciation">${escapeHtml(entry.appreciation)}</textarea><label for="${entry.id}-meaning">What I noticed or why it matters to me</label><textarea id="${entry.id}-meaning" data-gratitude-field="meaning">${escapeHtml(entry.meaning)}</textarea>${state.entries.length > 1 ? '<button type="button" class="secondary" data-remove-gratitude>Remove entry</button>' : ""}</fieldset>`).join("")}</div><button type="button" data-add-gratitude>Add another entry</button><p class="skill-app-note">This is a small Therapy Skill Kit exercise built around the curriculum's named skill “Gratitude Journaling”; it does not claim that gratitude erases difficult experiences.</p>`, learnLinks([["Skills Overview", "/skill-finder/#resource-general-p003"]]));
      root.querySelectorAll("[data-gratitude-entry]").forEach((fieldset) => {
        const entry = state.entries.find((item) => item.id === fieldset.dataset.gratitudeEntry);
        fieldset.querySelectorAll("[data-gratitude-field]").forEach((field) => field.addEventListener("input", () => { entry[field.dataset.gratitudeField] = field.value; }));
        fieldset.querySelector("[data-remove-gratitude]")?.addEventListener("click", () => { state.entries = state.entries.filter((item) => item.id !== entry.id); render(); });
      });
      root.querySelector("[data-add-gratitude]")?.addEventListener("click", () => { const id = `gratitude-${Date.now().toString(36)}`; state.entries.push({ id, appreciation: "", meaning: "" }); render(id); });
      if (focusId) root.querySelector(`[data-gratitude-entry="${focusId}"] textarea`)?.focus();
    }
    render();
    register(root, { toolId: "gratitude-journal", toolTitle: "Gratitude Journal", route: Progress.TOOL_ROUTES["gratitude-journal"], getState: () => state, setState: (next) => { state = { entries: next.entries.map((entry) => ({ ...entry })) }; render(); }, validateState: (next) => isObject(next) && Array.isArray(next.entries) && next.entries.length >= 1 && next.entries.length <= 100 && new Set(next.entries.map((entry) => entry.id)).size === next.entries.length && next.entries.every((entry) => isObject(entry) && typeof entry.id === "string" && typeof entry.appreciation === "string" && typeof entry.meaning === "string"), getReadableSummary: (next) => Progress.nonEmptySections("Gratitude Journal", next.entries.flatMap((entry, index) => [[`Entry ${index + 1}`, entry.appreciation], ["What I Noticed / Why It Matters", entry.meaning]])) });
  }

  function initPositiveSelfTalk(root) {
    const keys = ["context", "difficultThought", "emotion", "friendResponse", "evidence", "alternative", "nextStep"];
    let state = Object.fromEntries(keys.map((key) => [key, ""]));
    const prompts = [["context", "Situation or context"], ["difficultThought", "Difficult or self-critical thought"], ["emotion", "Emotion or body response I notice"], ["friendResponse", "What would I say to a close friend in the same situation?"], ["evidence", "What fuller evidence or perspective does the difficult thought leave out?"], ["alternative", "A fair, believable, supportive alternative"], ["nextStep", "One effective next step this alternative supports"]];
    function render() {
      root.innerHTML = pageShell("Positive Self-Talk", "Move from a difficult thought toward a fairer and more supportive response—not forced positivity.", `${prompts.map(([key, label]) => `<label for="self-talk-${key}">${escapeHtml(label)}</label><textarea id="self-talk-${key}" data-self-talk="${key}">${escapeHtml(state[key])}</textarea>`).join("")}<p class="skill-app-note">A useful alternative can acknowledge pain, uncertainty, responsibility, or limits. It does not have to deny what is difficult or promise that everything will work out.</p>`, learnLinks([["Balanced alternatives", "/learn/cbt-anxiety/thought-records-part-2.html#balanced-alternatives"], ["How to Get Out of a Thinking Trap", "/resources/cbt-skills/cbt-skills-p021.jpg", true]]));
      root.querySelectorAll("[data-self-talk]").forEach((field) => field.addEventListener("input", () => { state[field.dataset.selfTalk] = field.value; }));
    }
    render();
    register(root, { toolId: "positive-self-talk", toolTitle: "Positive Self-Talk", route: Progress.TOOL_ROUTES["positive-self-talk"], getState: () => state, setState: (next) => { state = { ...next }; render(); }, validateState: (next) => stringsOnly(next, keys), getReadableSummary: (next) => Progress.nonEmptySections("Positive Self-Talk", prompts.map(([key, label]) => [label, next[key]])) });
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

  const INITIALIZERS = {
    "five-factor-model": initFiveFactor,
    "thinking-traps": initThinkingTraps,
    "thought-record": initThoughtRecord,
    "worry-time": initWorryTime,
    "box-breathing": initBoxBreathing,
    "gratitude-journal": initGratitude,
    "positive-self-talk": initPositiveSelfTalk,
    "grounding": initGrounding,
  };

  function start() {
    document.querySelectorAll("[data-quick-app]").forEach((root) => {
      try { INITIALIZERS[root.dataset.quickApp]?.(root); }
      catch (error) { root.innerHTML = '<p class="skill-app-note">This tool could not load. Please refresh the page or use the linked Learn material.</p>'; global.console?.error(error); }
    });
  }

  const api = { FIVE_FACTORS, THINKING_TRAPS, THOUGHT_FIELDS, GROUNDING_STEPS, BoxBreathingMachine, initialThoughtRecord, normalizeThoughtRecord, validateThoughtRecordState };
  global.TherapyQuickTools = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
}(typeof window !== "undefined" ? window : globalThis));

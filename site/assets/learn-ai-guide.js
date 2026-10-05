(function (global) {
  "use strict";

  const CHAT_URL = "https://chatgpt.com/";
  const GENERIC_HEADINGS = new Set([
    "handouts & worksheets", "practice materials", "exercises", "reference materials",
    "references", "source approach", "original source overview", "guided audio and video resources",
  ]);
  const TRACK_GUIDANCE = {
    act: "Keep the focus on flexible attention, willingness, values, and chosen action. Do not frame acceptance as accepting unsafe treatment.",
    "cbt-anxiety": "Help separate observable events from interpretations and test ideas gently. Do not propose an exposure exercise unless it fits a plan made with my therapist.",
    "distress-tolerance": "Focus on safe, brief skill practice. Follow the lesson's cautions for cooling, breathing, or exercise, and do not suggest extreme physical methods.",
    "emotion-regulation": "Help me name patterns and consider choices without diagnosing my emotions or telling me what I should feel.",
    "goal-setting": "Keep goals small, flexible, and tied to my own values and available time or energy.",
    "interpersonal-effectiveness": "Make room for safety, power differences, and the other person's autonomy. Role-play without promising a particular response.",
    mindfulness: "Offer brief, optional, eyes-open practice when useful. Let me stop or change anchors if a practice feels uncomfortable.",
    wellness: "Focus on reflection and practical preparation. Do not recommend changing medication, food intake, or substance use treatment without a qualified clinician.",
  };
  const SHAPE_GUIDANCE = {
    checklist: "Treat this as a checklist: ask me to read a small group of options, let me choose what fits, and help me note one example. Do not score or diagnose me.",
    record: "Treat this as a record or tracker: work through one entry at a time, distinguish what I observed from what I inferred, and leave unknowns blank.",
    planner: "Treat this as a plan: follow the fields I read to you, make the next step realistic, and leave room for obstacles, supports, and review.",
    worksheet: "Ask me to read or describe the next question or field, then help me write an answer in my own words before moving on.",
    handout: "Treat this as a reference handout: help me understand its main idea, choose one point that fits my situation, and consider a small way to try it.",
  };

  function clean(value, limit = 220) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function canonicalPath() {
    const path = global.location?.pathname || "/";
    return global.TherapySite?.canonicalPath(path) || path;
  }

  function resourceShape(title, kind) {
    const text = `${title} ${kind}`.toLowerCase();
    if (/challenging myths/.test(text)) return "worksheet";
    if (/checklist|myth|factors|signs/.test(text)) return "checklist";
    if (/record|diary|log|track|monitor|journal/.test(text)) return "record";
    if (/plan|goal|schedule|cope ahead|chain/.test(text)) return "planner";
    return /worksheet|exercise|practice/.test(text) ? "worksheet" : "handout";
  }

  function pageContext(root) {
    const path = canonicalPath();
    const toolPage = path.startsWith("/tool-finder/") && path !== "/tool-finder/" && path !== "/tool-finder/index.html";
    let track = path.split("/").filter(Boolean)[1] || "";
    if (toolPage) {
      const learnLink = [...root.querySelectorAll('a[href*="/learn/"]')]
        .map((link) => link.getAttribute("href"))
        .find((href) => /\/learn\/(act|cbt-anxiety|distress-tolerance|emotion-regulation|goal-setting|interpersonal-effectiveness|mindfulness|wellness)\//.test(href || ""));
      track = learnLink?.match(/\/learn\/([^/]+)\//)?.[1] || "";
    }
    const title = clean(root.querySelector("h1.title")?.textContent || document.title, 140);
    const description = clean(root.querySelector("#title-block-header .description")?.textContent || document.querySelector('meta[name="description"]')?.content, 300);
    const topics = [...root.querySelectorAll("section.level2 > h2")]
      .map((heading) => clean(heading.textContent.replace(/Anchor$/, ""), 90))
      .filter((heading) => heading && !GENERIC_HEADINGS.has(heading.toLowerCase()))
      .slice(0, 10);
    const resources = [...root.querySelectorAll(".bs-practice-resource[data-source-id]")]
      .map((card) => {
        const titleNode = card.querySelector(":scope > p:first-child strong");
        const resourceTitle = clean(titleNode?.textContent, 150);
        if (!resourceTitle) return null;
        const kind = clean(card.querySelector(".bs-resource-match > p:first-child strong")?.textContent || "Handout", 40);
        const digitalSection = [...card.querySelectorAll("section.level4")]
          .find((section) => /^digital\b/i.test(clean(section.querySelector("h4")?.textContent)));
        const summary = clean(digitalSection?.querySelector("p")?.textContent, 360);
        return { id: card.dataset.sourceId, title: resourceTitle, kind, shape: resourceShape(resourceTitle, kind), summary };
      }).filter(Boolean);
    if (toolPage && root.querySelector(".skill-app")) {
      resources.unshift({ id: "current-tool", title, kind: "interactive tool", shape: resourceShape(title, "worksheet") });
    }
    return { path, track, title, description, topics, resources, toolPage };
  }

  function promptText(context, options = {}) {
    const mode = options.mode === "practice" ? "practice" : "worksheet";
    const delivery = options.delivery === "spoken" ? "spoken" : "written";
    const resource = context.resources?.find((item) => item.id === options.resourceId) || null;
    const lines = [
      "I am using a Free Therapy Tools educational lesson to prepare for a conversation with my therapist. Be a skill-practice companion, not my therapist. Do not diagnose, interpret my answers as clinical facts, or make treatment decisions for me.",
      "Ask one short question at a time and wait for my answer. Accept skip, back, summarize, and stop. If I am stuck, ask before giving one neutral example. Keep my wording and uncertainty in the final notes.",
      delivery === "spoken" ? "I want to talk this through aloud. Use brief, easy-to-answer spoken questions and pause after each one." : "I want to work in writing. Give me one concise question at a time and let me revise my words.",
      "",
      `${context.toolPage ? "Interactive tool" : "Lesson"}: ${context.title}`,
      context.description ? `Page focus: ${context.description}` : "",
      context.topics?.length ? `Topics covered on the page: ${context.topics.join("; ")}.` : "",
      TRACK_GUIDANCE[context.track] || "Stay within the lesson's educational scope and respect any safety notes on the page.",
    ].filter((line) => line !== "");

    if (resource) {
      lines.push("", `Selected ${resource.kind.toLowerCase()}: ${resource.title}.`);
      if (resource.summary) lines.push(`The page describes it this way: ${resource.summary}`);
      lines.push("You cannot see this sheet or tool unless I read or paste its words. Do not invent its questions, options, scores, or instructions. Ask me to read or describe the next field when needed; follow what I provide.");
    } else {
      lines.push("", "I may use the lesson page or an associated worksheet. Ask which part I want to work on first. Do not pretend to see an unshared worksheet.");
    }

    if (mode === "worksheet") {
      lines.push("", "Guide me through the material rather than filling it in for me.");
      lines.push(resource ? SHAPE_GUIDANCE[resource.shape] : "Start with the lesson's main skill or the first worksheet field I describe. Help me work through it in my own words, one step at a time.");
      lines.push("For each step: ask what the item means to me, help me identify an example only if useful, and check whether my answer fits what the sheet actually asks.");
    } else {
      lines.push("", "Help me brainstorm ways to practise this skill between sessions. Ask about my setting, time, energy, and any constraints before suggesting ideas.");
      lines.push("Offer two or three concrete options that fit this lesson and, if selected, this sheet. Include a very small starting option. Let me choose; do not turn a suggestion into an instruction or guarantee an outcome.");
      lines.push("Help me decide when to try it, what I might notice afterward, and how I could record the result without judging myself.");
    }
    lines.push("", "At the end, draft a short note I can edit and bring to my therapist: what I tried or wrote, what I noticed, what remains uncertain, and one question to discuss. Do not present it as a clinical assessment.");
    return `${lines.join("\n").trim()}\n`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function copyText(value) {
    if (global.navigator?.clipboard?.writeText) return global.navigator.clipboard.writeText(value);
    const textArea = element("textarea");
    textArea.value = value;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();
    if (!copied) throw new Error("Copy unavailable");
  }

  function mount(root) {
    const context = pageContext(root);
    if (!context.title) return;
    const panel = element("details", "learn-ai-guide");
    panel.id = "learn-ai-guide";
    panel.setAttribute("aria-labelledby", "learn-ai-guide-title");
    const heading = element("summary", "learn-ai-guide-title", "Work through this skill with an AI helper");
    heading.id = "learn-ai-guide-title";
    const intro = element("p", "", "Copy a prompt for a written or spoken AI conversation. Use it to explore this page, work through a sheet or tool you have open, or plan a small practice step to discuss with your therapist.");
    const form = element("div", "learn-ai-guide-controls");
    const sourceLabel = element("label", "", "Lesson or sheet");
    const source = element("select");
    source.id = "learn-ai-guide-source";
    source.append(element("option", "", `${context.toolPage ? "This tool" : "This lesson"}: ${context.title}`));
    source.options[0].value = "";
    context.resources.forEach((resource) => {
      const option = element("option", "", `${resource.title} (${resource.kind})`);
      option.value = resource.id;
      source.append(option);
    });
    if (context.toolPage) source.value = "current-tool";
    sourceLabel.htmlFor = source.id;
    const modeLabel = element("label", "", "What kind of help?");
    const mode = element("select");
    mode.id = "learn-ai-guide-mode";
    [["worksheet", "Guide me through it"], ["practice", "Suggest ways to practise"]].forEach(([value, label]) => {
      const option = element("option", "", label);
      option.value = value;
      mode.append(option);
    });
    modeLabel.htmlFor = mode.id;
    const deliveryLabel = element("label", "", "Conversation style");
    const delivery = element("select");
    delivery.id = "learn-ai-guide-delivery";
    [["written", "Write it out"], ["spoken", "Talk it through"]].forEach(([value, label]) => {
      const option = element("option", "", label);
      option.value = value;
      delivery.append(option);
    });
    deliveryLabel.htmlFor = delivery.id;
    [[sourceLabel, source], [modeLabel, mode], [deliveryLabel, delivery]].forEach(([label, control]) => {
      const group = element("div", "learn-ai-guide-control");
      group.append(label, control);
      form.append(group);
    });
    const details = element("details", "learn-ai-guide-preview");
    details.append(element("summary", "", "Preview the prompt"));
    const preview = element("textarea");
    preview.readOnly = true;
    preview.rows = 12;
    preview.setAttribute("aria-label", "Prompt to copy into an AI assistant");
    details.append(preview);
    const actions = element("div", "learn-ai-guide-actions");
    const copy = element("button", "", "Copy prompt");
    copy.type = "button";
    const open = element("a", "", "Open ChatGPT in a new tab");
    open.href = CHAT_URL;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    const status = element("span", "learn-ai-guide-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.append(copy, open, status);
    const privacy = element("p", "learn-ai-guide-privacy", "The prompt contains only lesson and sheet context, not your answers. Nothing is sent automatically. If you choose to share personal details with an AI service, its privacy terms apply.");
    const refresh = () => { preview.value = promptText(context, { resourceId: source.value, mode: mode.value, delivery: delivery.value }); status.textContent = ""; };
    [source, mode, delivery].forEach((control) => control.addEventListener("change", refresh));
    copy.addEventListener("click", async () => {
      try { await copyText(preview.value); status.textContent = "Prompt copied. Paste it into the AI assistant when ready."; }
      catch (_error) { details.open = true; preview.focus(); preview.select(); status.textContent = "Copy unavailable. Select and copy the prompt above."; }
    });
    panel.append(heading, intro, form, details, actions, privacy);
    const firstSection = root.querySelector(":scope > section.level2");
    if (firstSection) firstSection.before(panel);
    else root.querySelector("#title-block-header")?.after(panel);
    context.resources.forEach((resource) => {
      const card = root.querySelector(`.bs-practice-resource[data-source-id="${CSS.escape(resource.id)}"]`);
      if (!card) return;
      const link = element("a", "learn-ai-guide-sheet-link", "Use the AI helper for this sheet");
      link.href = "#learn-ai-guide";
      link.addEventListener("click", () => { panel.open = true; source.value = resource.id; mode.value = "worksheet"; refresh(); });
      card.append(link);
    });
    refresh();
  }

  const api = { clean, resourceShape, promptText, pageContext };
  global.TherapyLearnAiGuide = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    const start = () => {
      const path = canonicalPath();
      const learnPage = document.body.classList.contains("bs-learn-article");
      const toolPage = path.startsWith("/tool-finder/") && path !== "/tool-finder/" && path !== "/tool-finder/index.html" && document.querySelector(".skill-app");
      if (!learnPage && !toolPage) return;
      const root = document.querySelector("#quarto-document-content");
      if (root && !document.querySelector("#learn-ai-guide")) mount(root);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);

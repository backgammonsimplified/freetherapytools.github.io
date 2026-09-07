# CBT Week 6 — Avoidance, Safety Behaviours, Exposure, and Fear Ladder

Implementation authority for draft PR #2.

This pass expands the existing CBT Week 6 lesson and builds/updates the related interactive tools. It combines:

- the existing authored CBT Week 6 content;
- the user's earlier handwritten session notes;
- the newer photographed handouts and handwritten annotations;
- the user-created safety-behaviour/anxiety diagram concept;
- the existing Tool Finder/progress architecture.

Do not reproduce third-party worksheets verbatim. Teach the same concepts in original language, keep source/provenance links, and use the user's requested tool structure.

## 1. Source notes to incorporate

### Earlier handwritten notes

Integrate these concepts naturally, without presenting them as quotations:

- Safety behaviours can get in the way of longer-term goals even when they make someone feel safer temporarily.
- Avoiding anxiety can prevent learning that anxiety can be managed or tolerated.
- A behaviour is not automatically helpful or unhelpful; look at its purpose and function.
- Ask whether the behaviour moves the person toward or away from what matters.
- Compare short-term relief with longer-term effects.
- Worry is often a thinking process; anxiety is an emotional/body response; avoidance/safety behaviours are actions in the cycle.
- Exposure gives direct experience that can challenge anxious predictions and build confidence in coping.
- Thinking traps and perfectionistic rules can interact with avoidance.
- After practice, review both **what I did** and **how I felt**. Do not judge success only by anxiety intensity.
- The avoidance pattern can be summarized as retreat/protect → recover/relief → repeat, while approach practice can become approach → stay/observe → learn → repeat.
- Include the idea: “I can cope” as something a person may discover through experience, not a promise made in advance.

### Current photographed handouts

Paraphrase and integrate the useful teaching from:

1. **What Are Safety Behaviours?**
   - attempts to prevent feared outcomes and feel more comfortable;
   - the same outward behaviour may or may not function as a safety behaviour depending on why it is being used;
   - safety behaviours can prevent direct testing of fears;
   - they can contribute to self-fulfilling patterns;
   - when feared outcomes do not happen, people may credit the safety behaviour instead of learning the feared event may not have happened anyway;
   - self-focused attention can increase when attention is pulled away from the task and toward monitoring oneself.

2. **Safety Behaviour Checklist**
   - use as source inspiration for categories/examples, but do not publish a verbatim checklist transcription;
   - include examples such as hiding/keeping a low profile, avoiding eye contact, over-preparing, mentally rehearsing, relying on a companion, planning escape routes, repeated checking, phone/electronics during social situations, reassurance seeking, carrying a protective object, repeatedly monitoring bodily signs, repeated re-reading/editing, avoiding delegation/control loss, perfectionistic preparation, and avoiding even small risks;
   - allow custom user-added examples.

3. **Situational Exposure**
   - graded exposure rather than immediately choosing the hardest situation;
   - create a list of avoided situations and rate expected difficulty;
   - vary WHO, WHAT, WHEN, WHERE, and HOW to create easier/harder versions;
   - repeat practices rather than treating one attempt as final;
   - setbacks are information and may mean using an easier/intermediate step;
   - record expected distress, actual distress, what happened, what helped, and what was learned.

4. **Ideas for Challenging Different Fears**
   - do not reproduce the source's exact lists;
   - teach the method of generating specific, observable, low-risk experiments for themes such as mistakes/perfectionism, uncertainty/new experiences, and social fears;
   - examples on the public page should be newly written and substantially different from the source wording.

5. **Examples of Fear Ladders / Developing Exposure Hierarchies**
   - goal at the top;
   - concrete situations/rungs underneath;
   - change variables such as being alone/with support, busy/quiet, duration, distance, familiarity, timing, and complexity;
   - use a predicted anxiety/difficulty rating;
   - the user's handwritten “Victory” idea can be used as the visual label at the top of the ladder;
   - do **not** include the user's handwritten tax/paperwork example or other personal example text in public content.

## 2. Canonical Learn page

Route:

`/learn/cbt-anxiety/safety-behaviours-exposure.html`

Source:

`site/learn/cbt-anxiety/safety-behaviours-exposure.qmd`

Restructure the authored part of the page in this order while preserving useful existing content:

1. Week 6 overview
2. What are safety behaviours?
3. Why safety behaviours can keep anxiety going
4. Safety behaviour or useful coping?
5. Safety Behaviour Checklist
6. Avoidance: what am I putting off or staying away from?
7. Situational Exposure / graded exposure
8. Ideas for challenging different fears
9. Fear Ladder / graded hierarchy
10. Behavioural Experiments
11. Review what you did and what you learned
12. Bringing the skills together
13. Videos
14. Handouts / source materials

Keep right-hand TOC behavior.

## 3. Safety behaviour diagram

Place the user-created safety-behaviour/anxiety-over-time diagram with the safety-behaviour teaching, before or immediately after the short-term vs long-term explanation.

The intended diagram is a two-panel conceptual illustration:

### Top panel — facing fears

- y-axis: Anxiety level, low to high
- x-axis: Time
- anxiety rises to a wave/peak, then decreases over time
- label: “Facing your fears”
- explanatory idea: anxiety can rise while approaching a fear; staying engaged can provide new learning and confidence
- later label: greater freedom/confidence/a richer life

### Bottom panel — avoidance / safety behaviour

- repeated anxiety peaks and short-term relief troughs
- label near early trough: safety behaviours can reduce anxiety in the short term
- later curve grows/repeats
- label: avoidance can contribute to more anxiety or restriction over time

Important wording correction: do **not** imply that every exposure session follows a smooth predictable wave or that anxiety must decrease during a session. Add a nearby note that the figure is conceptual. Emphasize learning, approach, and reduced reliance on avoidance rather than requiring habituation to zero.

Use an accessible `<figure>` with useful alt text/description. If recreating as SVG, use project colors and keep all text readable on mobile.

## 4. CTA block near the top

Near the beginning of Week 6, provide three clearly separated tools:

- **Avoidance & Approach Planner** — `/tool-finder/avoidance/`
- **Safety Behaviour Check** — `/tool-finder/safety-behaviours/`
- **Fear Ladder / Exposure Planner** — `/tool-finder/exposure/`

Do not create duplicate tools if an existing route already fulfills one of these roles; enhance the existing Exposure tool at `/tool-finder/exposure/`.

## 5. Avoidance & Approach Planner

New route:

`/tool-finder/avoidance/`

Public title:

**Avoidance & Approach Planner**

Subtitle:

**Notice what anxiety is keeping you from, identify a safe direction of progress, and choose a manageable next step.**

Use original paraphrased prompts based on the user's requested worksheet questions:

1. **What are you staying away from because it feels frightening, uncomfortable, or anxiety-provoking?**
2. **What have you been putting off because of worry or anxiety?**
3. **Which parts of this situation are realistically within your control or possible to change?**
4. **What thoughts, predictions, rules, or worries get in the way?**
5. **What are some small, safe actions that would move you toward the situation rather than away from it?**
6. **What would you like to be able to do in this situation?**
7. **Picture a successful-enough outcome. What would you be doing differently?**

The tool should support multiple avoided situations/items, not one giant textarea only.

For each chosen approach step, include optional fields such as:

- next safe step;
- predicted anxiety/difficulty 0–100;
- what would make the step appropriately safe and workable;
- safety behaviour to notice/reduce, if relevant;
- when/where to try it;
- what happened;
- actual anxiety/difficulty 0–100;
- what I learned;
- what I want to try next.

Do not calculate a clinical score.

### Worksheet download at top

At the top of the tool, before the interactive fields, provide prominent download buttons for a clean Free Therapy Tools worksheet:

- PDF
- DOCX

The worksheet must be authored from the paraphrased questions above, with generous blank space for handwriting. It must not be a reproduction of the photographed third-party worksheet.

Suggested public filenames:

- `/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.pdf`
- `/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.docx`

Generate these reproducibly if the repository already has a document-generation pattern. Otherwise commit the generated files plus a source template/script so they can be regenerated.

Use project branding, accessible typography, and a restrained footer stating that it is an original Free Therapy Tools practice sheet.

Use existing `TherapySkillProgress` for browser-local state/export. No new storage system.

## 6. Safety Behaviour Check tool

New route:

`/tool-finder/safety-behaviours/`

Public title:

**Safety Behaviour Check**

Purpose:

Help someone notice behaviours they may use to reduce anxiety and examine the behaviour's function, short-term payoff, and longer-term effect.

### Step 1 — possible safety behaviours

Provide a paraphrased, categorized checklist. Do not reproduce the photographed checklist line-for-line.

Possible categories/examples:

- staying quiet, hidden, or at the edge of a situation to avoid attention;
- avoiding eye contact or interaction;
- using clothing/accessories or another barrier mainly to avoid being noticed;
- over-preparing or rehearsing repeatedly;
- only going somewhere with a trusted person;
- planning exits/escape routes in advance;
- repeatedly checking locks/messages/work/body sensations;
- repeatedly seeking reassurance;
- using a phone/electronics to avoid participating in a social interaction;
- carrying an object mainly because it feels impossible to cope without it;
- monitoring heart rate or other body signs repeatedly;
- repeatedly re-reading/editing before sending something;
- keeping complete control and avoiding delegation;
- perfectionistic preparation or refusing small reasonable risks;
- avoiding places, activities, or opportunities that raise anxiety;
- custom entry.

Do not present medication itself as a safety behaviour; if mentioning medication-related behaviour, frame it carefully as *how a person is relying on or checking something*, not advice to reduce prescribed treatment. Do not encourage stopping prescribed medication or medically necessary supports.

### Step 2 — function

For each selected behaviour ask:

- What am I afraid might happen without this behaviour?
- What short-term relief or sense of safety does it give me?
- Does it help me participate, or does it mainly help me avoid anxiety/uncertainty?
- What might it cost me over time?
- What does it make harder to learn or test directly?

### Step 3 — small experiment

Ask:

- Is there a safe, reasonable way to rely on this behaviour a little less?
- What is the smallest change I could test?
- What would I observe to learn from the test?

Important framing:

- safety behaviours are protective attempts, not moral failures;
- the same behaviour can be useful support in one context and avoidance in another;
- real safety, accessibility needs, health needs, consent, and legal boundaries take priority;
- do not encourage removal of medically necessary or disability-related supports.

Use existing `TherapySkillProgress`.

## 7. Situational Exposure teaching

Expand this section using source-faithful paraphrase plus the handwritten notes.

Explain:

- Avoidance can create a retreat/protect → relief/recovery → repeat loop.
- Exposure means approaching an objectively safe-enough feared situation deliberately rather than automatically escaping it.
- Graded exposure uses smaller steps.
- Difficulty can be changed by WHO is present, WHAT is done, WHEN it happens, WHERE it happens, HOW long it lasts, and HOW much support/safety behaviour is used.
- Repetition matters because a single attempt is only one piece of information.
- If a step is too difficult, create an in-between rung rather than interpreting it as failure.
- Success is not defined by anxiety reaching zero.
- Review what you did, what actually happened, how you coped, and what you learned.

Tie in existing Week 6 concepts of thinking traps, perfectionism, and behavioural experiments.

## 8. Ideas for challenging different fears

Create a short section teaching *how to brainstorm*, rather than copying the photographed examples.

Useful dimensions for generating ideas:

- make the feared situation smaller/larger;
- familiar vs unfamiliar;
- alone vs with support;
- quiet vs busy;
- short vs longer duration;
- observe first vs participate;
- private vs mildly public;
- allow a small imperfection;
- tolerate a small amount of uncertainty;
- reduce one safety behaviour at a time.

Use fresh example ideas only.

### Copyable LLM brainstorming prompt

Provide a copy button and a plain-text prompt similar to:

> I am building a graded CBT fear ladder for this fear or avoided situation: **[describe fear]**. My longer-term goal is: **[goal]**. Please brainstorm 10–15 specific practice ideas from easier to harder. Vary who is present, what I do, when/where I do it, duration, and how much support I use. Keep the ideas legal, consensual, physically safe, and realistic. Do not include trauma-processing exercises, medically risky exposure, stopping prescribed treatment, or deliberately dangerous situations. For each idea, give a short reason it may be easier or harder. I will choose and edit the ideas myself. End with 3 questions that would help me personalize the ladder.

After the prompt, say:

**Use the output as brainstorming material. Edit or discard suggestions that do not fit, and bring the list to a therapist or other support person if that would be useful.**

Do not say that the AI is a therapist. Do not imply the output is clinically approved.

## 9. Fear Ladder / Exposure Planner tool

Existing canonical route:

`/tool-finder/exposure/`

Current public title can be upgraded from `Exposure Ladder` to:

**Fear Ladder / Graded Exposure**

Do not create a second competing ladder route unless there is a strong architecture reason.

### Top of tool

Include:

- concise explanation;
- link back to Week 6 Learn page;
- the copyable LLM brainstorming prompt from section 8;
- optional link to source/reference handouts;
- no personal text in URLs.

### Ladder setup

Fields:

- **What fear, avoided situation, or pattern are you working on?**
- **What would you like anxiety to interfere with less?**
- **What does “victory” or meaningful progress look like at the top of this ladder?**
- optional notes on factors that change difficulty: WHO / WHAT / WHEN / WHERE / HOW.

### Rungs

Support a flexible number of rungs; 10 visible starting rows is fine, but do not impose a hard maximum of 10.

Each rung should include:

- specific situation/action;
- predicted anxiety/difficulty 0–100;
- optional safety behaviour/support to reduce or vary;
- optional plan (when/where/duration/repetition);
- status: not tried / practiced / repeat / ready to move up;
- actual anxiety/difficulty after practice;
- what happened;
- what I coped with;
- what I learned;
- next adjustment.

Allow:

- add rung;
- remove rung;
- edit;
- move up/down accessibly;
- duplicate a rung to create an easier/harder variation.

### Visual ladder

Render the hierarchy visually as climbable steps, with the user's chosen goal displayed at the top under a small **Victory / Goal** label.

Do not imply that the highest anxiety score is inherently “victory.” The top means the personally meaningful goal.

The visual must remain usable at ~390px without horizontal scrolling.

### Practice history

Allow repeated attempts on a rung without overwriting the previous attempt if practical within the current architecture. At minimum preserve a simple repetition count plus latest notes; ideally a short list of practice attempts.

Use existing `TherapySkillProgress` and readable export.

## 10. Worksheet/print support for Fear Ladder

The existing photographed Exposure Hierarchy Worksheet remains source/reference material only.

Create an original Free Therapy Tools printable ladder if practical, preferably from the same data/source template as the interactive tool. Include:

- goal/victory;
- 10 blank rungs;
- predicted anxiety/difficulty;
- room for notes.

A DOCX/PDF download may be added, but the Avoidance & Approach worksheet downloads are higher priority for this PR.

## 11. Behavioural experiments

Preserve and refine the current Behavioural Experiments section.

Make the relationship clear:

- a fear ladder organizes repeated approach steps;
- an exposure practice is an approach exercise;
- a behavioural experiment is specifically designed to test a prediction or belief;
- one activity can serve both purposes.

Include the earlier handwritten notes:

- connect anxious thoughts/predictions with direct experience;
- after practice look at both what happened and how it felt;
- challenge perfectionistic rules when relevant;
- confidence is built through experience and coping, not required before action.

## 12. Video section

Embed the four user-selected YouTube videos near the relevant teaching sections or in one `Videos` section near the end.

URLs / IDs:

1. `https://www.youtube.com/watch?v=2z-ZGt_vD5A`
   - Ali Mattu / The Psych Show — *How to Use Exposure Therapy to Overcome Phobias*.
2. `https://www.youtube.com/watch?v=qzpoO0oVRr8`
   - Therapy in a Nutshell — *Super Duper Gentle Exposure Therapy*.
3. `https://www.youtube.com/watch?v=n2rKVj75P3M`
   - exposure hierarchy / fear ladder video; verify current public title before labeling.
4. `https://www.youtube.com/watch?v=TYQ2qWgVJrY`
   - Therapy in a Nutshell — *How to do Exposure Therapy for Fears and Anxiety - Break the Anxiety Cycle 27/30*.

Implementation:

- use responsive 16:9 embeds;
- `loading="lazy"`;
- prefer `youtube-nocookie.com/embed/<id>` if compatible with project conventions;
- include a normal YouTube link below each embed as fallback;
- do not autoplay;
- do not load all four if current privacy/performance conventions use click-to-load placeholders; follow existing site convention if one exists.

Verify that each video still exists and embedding is permitted. If a video blocks embedding, show a linked video card instead of a broken iframe.

## 13. Source/resource presentation

Current Week 6 source assets include:

- `cbt-skills-p047` Avoidance Worksheet
- `cbt-skills-p048` What Are Safety Behaviours?
- `cbt-skills-p049` Safety Behaviour Checklist
- `cbt-skills-p050` Situational Exposure
- `cbt-skills-p051` Examples of Fear Ladders
- `cbt-skills-p052` Ideas for Challenging Different Fears
- `cbt-skills-p053` Developing Exposure Hierarchies
- `cbt-skills-p054` Exposure Hierarchy Worksheet

The current page contains visibly corrupted OCR under some of these resources. Do not leave corrupted OCR as the public text version once the material is integrated into authored content.

For each resource:

- keep the source image / existing provenance where publication is allowed;
- replace corrupted OCR display with `Native Version` / `Content integrated above` where the educational text has been faithfully paraphrased into the Learn page;
- do not fabricate an exact clean transcription;
- preserve any verified higher-resolution copy already present.

## 14. Tool Finder catalogue

Update canonical catalogue with:

### Avoidance & Approach Planner

- id: `avoidance`
- topic: `CBT and Managing Anxiety`
- kind: `tool`
- type: `planner`
- route: `/tool-finder/avoidance/`
- learn: `/learn/cbt-anxiety/safety-behaviours-exposure.html#avoidance`
- aliases: avoidance, procrastination from anxiety, putting things off, approaching fears, anxiety avoidance

### Safety Behaviour Check

- id: `safety-behaviours`
- topic: `CBT and Managing Anxiety`
- kind: `tool`
- type: `worksheet`
- route: `/tool-finder/safety-behaviours/`
- learn: `/learn/cbt-anxiety/safety-behaviours-exposure.html#safety-behaviours`
- aliases: safety behavior, safety behaviour, reassurance, checking, avoidance, protective behaviour

### Exposure / Fear Ladder

Keep current `exposure` id and canonical route if already established:

`/tool-finder/exposure/`

Update display name/summary/search terms to include:

- fear ladder
- exposure hierarchy
- graded exposure
- facing fears
- approach practice

Do not create duplicate catalogue IDs for the same route.

## 15. Shared progress routes

Update `site/assets/skill-progress.js` `TOOL_ROUTES` only as needed for the two new tool IDs:

- `avoidance`
- `safety-behaviours`

Keep `exposure` canonical.

No second persistence system.

## 16. Safety boundaries

The site should not direct users to expose themselves to genuine danger.

Keep concise, non-alarmist guidance:

- use exposure/experiments for situations that are safe enough and appropriate to approach;
- do not use a ladder to override consent, legal boundaries, accessibility needs, medically necessary precautions, or prescribed treatment;
- trauma memories, severe symptoms, or medically risky interoceptive exposure may require professional planning;
- if a rung is too difficult, make it smaller rather than treating the difficulty as failure.

Do not turn every section into a warning box.

## 17. Tests

Add focused tests for:

### Learn page

- canonical Week 6 route renders;
- section order/anchors exist;
- safety-behaviour diagram exists and has accessible alt/description;
- no personal tax/paperwork example appears;
- no visibly corrupted OCR remains in public authored/native text for p047/p049/p051/p052;
- four video IDs appear in valid embed/link markup;
- CTA links resolve.

### Avoidance tool

- route exists;
- catalogue entry exists;
- all paraphrased core prompts exist;
- multiple avoided items/approach steps supported;
- PDF/DOCX worksheet links exist and files build/resolve;
- progress round-trip;
- readable export;
- mobile layout.

### Safety Behaviour Check

- route/catalogue;
- paraphrased categories, not verbatim source checklist;
- custom item;
- function / short-term / long-term / learning prompts;
- progress/export;
- medically necessary supports not framed as something to remove automatically.

### Fear Ladder

- existing `exposure` route remains canonical;
- goal/victory field;
- flexible rung count;
- 0–100 predicted difficulty;
- move up/down;
- add/remove/duplicate;
- mobile stacking;
- LLM prompt copy control;
- progress/export;
- no anxiety-zero requirement.

### Regression

Run relevant CBT, Tool Finder, `TherapySkillProgress`, site-path, navigation, glossary, publication/resource tests.

At minimum:

```bash
node --check site/assets/skill-finder-apps.js
node --check site/assets/skill-quick-tools.js
node --check site/assets/skill-progress.js
node tests/test_site_path.js
node tests/test_skill_progress.js
python scripts/learn_glossary.py validate
git diff --check
```

Run full Quarto render where supported.

## 18. PR / branch rules

Implementation branch:

`content/cbt-week-6-session-notes`

PR:

`#2`

Do not push to master.
Do not merge PR #2.
Do not force-push.

Codex should implement, test, commit, and push only this branch, then report exact test/render results for human review.

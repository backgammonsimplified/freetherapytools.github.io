# Implementation brief: DEAR skills, communication styles, Learn layout, and tool progress UI

Branch: `content/interpersonal-dear-skills`
Base: `master`

This branch is for a draft implementation PR. Do not merge directly to `master`, do not force-push, and do not rewrite history.

## Work already completed on this branch

A first-pass implementation has already been committed before Codex QA:

- `site/learn/interpersonal-effectiveness/dear-man.qmd` has been rewritten as **DEAR + MAN** with communication styles, priority selection, DEAR/MAN teaching, a landlord worked example, cleaned source transcriptions, provenance lines, and removal of the malformed p020 OCR.
- `site/assets/interpersonal/communication-styles-triangle.svg` has been added as an accessible project recreation of the supplied communication-styles diagram.
- `site/tool-finder/dear-man/index.qmd` has improved objective-priority framing, local-data/save guidance, Learn link, and links to GIVE/FAST.
- `site/tool-finder/dear-give/index.qmd` and `site/tool-finder/dear-fast/index.qmd` route shells now exist.

Codex should **preserve, review, refine, wire, test, and complete** this first pass rather than replacing it with an unrelated implementation.

## 1. Global Learn-page layout

For all Learn pages, when the left lesson sidebar is collapsed with `← Hide`, the article text must stay in the same horizontal position instead of shifting left. `→ Show Lessons` restores the sidebar. Keep the right TOC independent, preserve mobile behavior, accessibility, and no horizontal overflow.

Inspect the existing Backgammon-derived Learn layout before changing it. Prefer a layout/CSS fix that preserves the article column position while hiding the left sidebar rather than moving the article into the newly vacant space.

## 2. Canonical DEAR MAN Learn page

Route: `/learn/interpersonal-effectiveness/dear-man.html`
Source: `site/learn/interpersonal-effectiveness/dear-man.qmd`

Change public framing to **DEAR + MAN** where the teaching is broken down:
- **DEAR = what we say**: Describe, Express, Assert, Reinforce.
- **MAN = how we say it**: Mindful, Appear Confident, Negotiate.

### Communication styles first

Open with a section on communication styles and reserve a figure area for a communication-styles triangle. Recreate the supplied diagram as a project SVG if necessary. Desired content:

- **Passive**: needs, preferences, or limits are not stated clearly. Other people may not know what you want, how strongly you feel, or how important the issue is, so they may not take it seriously.
- **Aggressive**: forceful, disrespectful, intimidating, or dominating communication. It often triggers defensiveness and can make cooperation less likely.
- **Passive-aggressive**: indirect or mixed communication in which resentment or resistance is expressed without a clear request. It can combine the ambiguity of passivity with the hostility of aggression, creating confusion and resentment.
- **Assertive**: clear, concise, direct, respectful, and confident. Assertiveness communicates what matters without attacking or hiding it and is the basis of effective interpersonal communication.

### Priority matters

Explain that DEAR MAN is most useful when the priority is **objective effectiveness**: getting a concrete result matters more than improving the relationship or protecting self-respect in that interaction.

Use the landlord example: getting a broken sink fixed is the objective; the landlord relationship itself is not the main goal.

Contrast:
- relationship priority -> use **DEAR GIVE**; example: asking a partner to say good morning when the real goal is closeness/connection rather than the words themselves.
- self-respect priority -> use **DEAR FAST**; example: responding to a demeaning comment about people with mental-health concerns when protecting your values/self-respect is the main goal.

Create and link the new tools described below.

## 3. Worked landlord example

Use one coherent example in both the Learn page and DEAR MAN tool. Polish wording but keep it realistic and non-manipulative.

- **Situation:** I told my landlord the sink was broken a week ago and it still has not been fixed.
- **Describe:** I told you one week ago that the sink was broken. You said it would be fixed soon, and I asked for an update about when you or a plumber would come. I have not heard back and the sink is still not fixed.
- **Express:** I feel frustrated and overlooked because it is difficult to manage daily life without a working sink.
- **Assert:** I need the repair to be scheduled within the next day.
- **Reinforce:** Prefer constructive benefit wording such as: If the repair is scheduled promptly, the sink is less likely to get worse and the issue can be resolved before it becomes more disruptive or expensive. Avoid threats or coercive pressure.
- **Mindful:** I understand there may be delays, but I still need the repair to be scheduled within the next day.
- **Appear Confident:** explain calm, steady, clear delivery without unnecessary apology or backing away from a reasonable request. Example: I am asking clearly because this issue needs attention, and I need a concrete update today.
- **Negotiate:** If scheduling is difficult on your end, I can send you a few plumber options so the repair can be arranged more quickly.

## 4. Digitize all supplied worksheet/handout text and cite the source immediately below

The user explicitly wants all legible text from the supplied photographed DEAR MAN materials digitized, not left as corrupted OCR.

Source pages supplied in this task include:
- **Interpersonal Effectiveness Handout 5 (1 of 2): Guidelines for Objectives Effectiveness: Getting What You Want (DEAR MAN)**
- **Interpersonal Effectiveness Handout 5 (2 of 2): MAN continuation**
- **Interpersonal Effectiveness Handout 5A: Applying DEAR MAN Skills to a Difficult Current Interaction**
- **DEAR MAN Script** worksheet
- handwritten session notes on DEAR/MAN and communication priorities.

For every digitized source-derived block on the Learn page:
1. transcribe all legible printed text accurately;
2. correct obvious OCR corruption by checking the source image and the clean-resource copy already in the repo where available;
3. preserve the source's organization and terminology;
4. immediately below the block add a concise provenance line naming the handout/worksheet and source;
5. distinguish clearly between **source transcription** and **Free Therapy Tools explanation/adaptation**.

Examples of provenance lines:

`Source: Interpersonal Effectiveness Handout 5, Guidelines for Objectives Effectiveness: Getting What You Want (DEAR MAN), DBT Skills Training Handouts and Worksheets, 2nd ed.`

`Source: Interpersonal Effectiveness Handout 5A, Applying DEAR MAN Skills to a Difficult Current Interaction, DBT Skills Training Handouts and Worksheets, 2nd ed.`

`Source: DEAR MAN Script practice worksheet supplied by the user.`

Do not leave the current malformed p020 OCR visible. Replace it with a faithful transcription from the supplied photo. Where the repo already has clean matched PDFs/JPGs for p017-p019, use them to verify the text rather than relying on OCR alone.

Keep the source resource image/download cards and clean-copy links already used by the site where publication rules allow.

## 5. DEAR MAN tool

Route: `/tool-finder/dear-man/`

Public title: **DEAR MAN Script Builder**. Do not repeat a second redundant builder heading.

Intro should explain:
- objective-priority use case;
- DEAR GIVE for relationship priority;
- DEAR FAST for self-respect priority;
- write a script you could realistically say out loud;
- keep wording factual, truthful, respectful, and non-manipulative;
- local-only browser behavior;
- save `.md` to resume later; export DOCX/PDF for printing/sharing with a therapist.

Link prominently to `/learn/interpersonal-effectiveness/dear-man.html`.

Fields:
- Situation — What is going on?
- Objective — What result do you want?
- Describe
- Express
- Assert
- Reinforce
- Mindful
- Appear Confident
- Negotiate
- Final combined script

Use light placeholder/help text based on the landlord example above.

Add a collapsible copyable LLM brainstorming prompt. It must ask for factual, respectful, concise, non-manipulative wording and produce options rather than pretending to decide what the user should say.

## 6. New DEAR GIVE and DEAR FAST tools

Create:
- `/tool-finder/dear-give/`
- `/tool-finder/dear-fast/`

### DEAR GIVE
Relationship-priority version. Structure around DEAR plus GIVE: Gentle, Interested, Validate, Easy manner. Suggested fields: situation, relationship goal, DEAR draft, Gentle wording, Interested/listening plan, Validating statements, Easy-manner approach, final script.

### DEAR FAST
Self-respect-priority version. Structure around DEAR plus FAST: Fair, no unnecessary Apologies, Stick to values, Truthful. Suggested fields: situation, self-respect goal, DEAR draft, Fair statement, unnecessary-apology check, values statement, truthful statement, final script.

Both should use the existing Tool Finder and `TherapySkillProgress` architecture and appear in the Tool Finder catalogue.

## 7. Tool progress UI — all tools

Remove the floating/side `Save progress` control from all tool pages. Progress controls should be available only in the bottom save/export area.

The bottom save/export area should:
- remain the canonical place for `.md`, DOCX, and print/PDF actions;
- be collapsible;
- stay pinned/focused at the bottom in the same manner as the current focused save bar system;
- not obscure tool fields;
- preserve keyboard accessibility and mobile behavior.

Replace generic copy:

`Recommended. You can reopen this Markdown file later and continue.`

with:

`You can save your progress by downloading the markdown (.md) file below. If you want to export, for example for printing, you can download the .docx or .pdf. To resume progress, upload the .md file.`

Preserve local-only storage behavior. Do not create a second save system.

## 8. Original downloadable DEAR MAN worksheet

Create original Free Therapy Tools downloads, not a branded copy of the photographed worksheet:
- editable DOCX
- printable PDF

Suggested sections:
- Situation
- Objective
- Describe — observable facts
- Express — feelings/opinions
- Assert — clear request or boundary
- Reinforce — why cooperation helps
- Mindful — phrase to return to
- Appear Confident — delivery plan
- Negotiate — workable alternatives
- Final script
- Reflection after use: what worked / what to change next time

Give generous writing space. Link both files from the Learn page and DEAR MAN tool.

## 9. Communication-styles image

The user supplied a triangle diagram with:
- Assertive at top: Clear • Respectful • Confident
- Passive lower-left: Avoids • Withholds • Self-sacrifices
- Aggressive lower-right: Pushes • Disrespects • Dominates
- Passive-aggressive centered along the bottom edge: Indirect • Conflicted • Unclear

Recreate it as an accessible project SVG if the original binary image is not available in the local checkout. Use it on the Learn page immediately after the communication-styles introduction. Add meaningful alt text.

## 10. Tests / QA

At minimum verify:
- all Learn pages keep their article column fixed when left sidebar collapses;
- `← Hide` / `→ Show Lessons` still work;
- DEAR MAN Learn page has communication styles, DEAR + MAN framing, priority guidance, worked example, source transcriptions, and immediate provenance notes;
- source text is complete and no malformed OCR remains for the DEAR MAN pages;
- DEAR MAN tool links to the Learn page;
- no floating/side save-progress button remains on tool pages;
- bottom save/export UI works and uses revised wording;
- DEAR GIVE and DEAR FAST routes exist, are in the catalogue, and save/export correctly;
- worksheet PDF and DOCX exist and open;
- mobile ~390 and desktop 1280/1440 have no overflow;
- `node --check` for changed JS;
- `node tests/test_site_path.js`;
- `node tests/test_skill_progress.js`;
- `python scripts/learn_glossary.py validate`;
- relevant Tool Finder/Interpersonal tests;
- `git diff --check`;
- full `quarto render site` where supported.

If the managed Windows environment hits the known spawn/invalid-handle render issue, report it accurately and rely on GitHub Actions/Linux for authoritative full render.

## 11. Branch / PR rules

- Work only on `content/interpersonal-dear-skills`.
- Push only that branch.
- Do not merge the PR.
- Do not force push.
- Keep commits reviewable.

Final report should include starting/final SHA, commits, Learn layout fix, source transcription/provenance, DEAR MAN Learn/tool changes, DEAR GIVE/FAST, progress UI changes, worksheet files, tests, render status, and remaining concerns.

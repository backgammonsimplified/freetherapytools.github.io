# Implementation brief: Tool Finder TOC, Box Breathing, Change Emotion, and conservative repo cleanup

## Status

This branch is intentionally a **Codex implementation branch**. This document is the task authority for the pass. Do not merge `master` into this branch unless needed for a normal fast-forward/update after checking for conflicts. Never force-push.

Baseline when the branch was created:

- repository: `backgammonsimplified/freetherapytools.github.io`
- base branch: `master`
- base SHA: `8eb62c48369570adbd7ab40ed29584c65b5a5998`
- live development site: `https://backgammonsimplified.github.io/freetherapytools.github.io/`

The project will move to a different GitHub account later. **Do not perform that migration in this pass.** Keep the existing project-site base-path support working.

## Goals

Implement four focused workstreams:

1. Give the Tool Finder homepage a normal right-side table of contents using the same Quarto TOC system/styling used elsewhere on the site.
2. Fix the broken left-side **Inhale** portion of the Box Breathing visual/timer.
3. Improve Change an Emotion source handling: clearly connect it to the Handout 8 / Check the Facts sequence, while paraphrasing worksheet logic instead of reproducing a copyrighted worksheet.
4. Conservatively remove Backgammon-only repository material that is demonstrably unrelated to Free Therapy Tools and can be deleted without breaking the site, tests, source/resource pipelines, or reusable Learn mechanics.

Do not use this pass for a broad redesign, URL migration, Git history rewrite, or new therapy curriculum.

---

# 1. Tool Finder: native right-side TOC

## Current state

`site/tool-finder/index.qmd` currently has:

```yaml
page-layout: article
toc: false
```

The page contains a dynamic catalogue rendered by `site/assets/tool-finder.js`. The JS currently generates topic sections at runtime with markup conceptually like:

```html
<section class="tool-finder-topic" data-tool-finder-topic="...">
  <h2>... Tools</h2>
  ...
</section>
```

Because these H2 headings are injected after Quarto has built the page, simply changing `toc: false` to `toc: true` is not sufficient unless the topic headings are made available to Quarto at render time or the native TOC is synchronized after runtime rendering.

## Required behavior

The Tool Finder homepage should use the **same right-side table-of-contents technology and visual language as normal Quarto article pages**.

The TOC should provide direct navigation to the Tool Finder's major subject sections. At minimum it should represent the canonical topics currently present in `site/data/tool-finder/catalogue.json`, such as the current subject groups (exact names should come from the catalogue authority, not a second manually diverging list).

Expected examples include subjects such as:

- Goal Setting / the current goal-planning topic name
- Distress Tolerance
- Mindfulness
- Emotional Regulation
- CBT / Managing Anxiety
- Interpersonal Effectiveness
- Wellness

Use the **actual current catalogue topic labels** as authority.

## Preferred implementation

Prefer making the subject headings deterministic at render time so Quarto can build its native TOC normally. Good approaches include:

- generating a small QMD/HTML include from the canonical Tool Finder catalogue during the existing pre-render/generation pipeline; or
- changing the homepage structure so static H2 section containers exist in the QMD/rendered HTML and JavaScript fills those existing containers with cards.

A custom hand-built second navigation component should be a last resort. The requirement is specifically to use the same TOC experience as other pages.

Do **not** create a second hard-coded topic list that can silently drift from `catalogue.json`. If headings are generated, add a test that the rendered/static subject sections match the catalogue topic authority.

## Search/filter interaction

The existing search and All / Tools / Skills filters must continue working.

When a filter/search produces no visible entries for a topic, handle the right TOC cleanly. Acceptable behavior:

- hide/disable the corresponding TOC item while that topic has no visible entries; or
- leave the TOC entry available only if clicking it still lands on a visible, meaningful section.

Preferred: synchronize visibility of topic TOC entries with visible topic sections without replacing Quarto's actual TOC structure/styling.

Clearing the search must restore all applicable topic sections and TOC links.

## Accessibility / layout

- topic anchors must be stable and human-readable;
- right TOC links must be keyboard accessible;
- current section highlighting / smooth scroll should work like ordinary Quarto TOCs where supported;
- no horizontal overflow at approximately 390px;
- normal desktop layout should work around 1280px and 1440px;
- do not break the left Tool Finder sidebar;
- do not break the featured Skill Thermometer;
- preserve project-site base-path support via `TherapySite.path` / existing helpers.

## Tests

Add focused tests covering:

- Tool Finder enables a right TOC;
- every canonical catalogue topic has exactly one stable section anchor;
- topic labels do not drift from catalogue data;
- links point at existing section IDs;
- search/filter still works;
- TOC visibility/state is sensible during filtering;
- clear search restores sections;
- Tool Finder cards and links still resolve under the GitHub Pages project base path.

---

# 2. Box Breathing: fix the left-side Inhale phase

## Current route

`/tool-finder/box-breathing/`

Source page:

`site/tool-finder/box-breathing/index.qmd`

The app is mounted with:

```html
data-quick-app="box-breathing"
```

The current page intentionally allows configurable phase timings, including zero-second holds where already supported. Preserve existing safety wording and current progress behavior.

## Defect

On the live tool, the **Inhale** portion on the left side of the box visualization is broken. Treat this as a visual/layout/runtime regression, not a request to redesign the breathing exercise.

Inspect the actual implementation and rendered DOM/CSS for the four phases. Find the root cause rather than hiding the label.

Likely files may include the current quick-tool JS and skill-app CSS, but trace the actual implementation before editing.

## Acceptance criteria

- Inhale is fully visible and correctly aligned on the left side.
- It is not clipped by the app container, box, transform, overflow rule, fixed save bar, or responsive layout.
- Inhale / hold / exhale / hold remain visually coherent with each other.
- Active-phase styling still identifies the correct phase.
- Timer progression and configurable durations are unchanged except where necessary to fix the bug.
- zero-second holds remain supported if currently supported;
- no forced breath holds are introduced;
- the visual remains usable at approximately 390px mobile and common desktop widths;
- text is not conveyed by color alone;
- no horizontal overflow.

If the root cause is negative positioning on the left label, solve the geometry responsively rather than applying a one-device pixel patch.

Add a regression test around the relevant DOM/classes/styles if practical, plus the existing JS behavior tests.

---

# 3. Change an Emotion: Handout 8 sequence link + paraphrased worksheet logic

## Current route

`/tool-finder/change-emotion/`

Source page:

`site/tool-finder/change-emotion/index.qmd`

Current intro says the tool follows Emotion Regulation Handouts 8, 8A, and 9 and links to the readable Handout 8A reference and Mindfulness of Current Emotions.

## Existing source assets

The repo currently contains verified clean source/reference assets including:

- `site/resources/clean/emotion-regulation/emotion-regulation-handout-7-overview-changing-emotional-responses-clean.pdf`
- `site/resources/clean/emotion-regulation/emotion-regulation-handout-8-check-the-facts-clean.pdf`
- `site/resources/clean/emotion-regulation/emotion-regulation-handout-8a-examples-of-emotions-that-fit-the-facts-clean.pdf`
- `site/resources/clean/emotion-regulation/emotion-regulation-handout-9-opposite-action-and-problem-solving-deciding-which-to-use-clean.pdf`

The repo also contains worksheet assets, including Problem Solving / Opposite Action worksheets. **Do not use a worksheet as the public interactive content merely because a file exists.**

## User requirement

The tool should clearly give the user a path to the **Handout 8 / Check the Facts sequence/reference**.

At the same time, the interactive worksheet-like prompts must be **original paraphrased content** rather than a line-by-line reproduction of a copyrighted worksheet.

## Required source handling

1. Add a clear, useful source/reference link associated with the Check the Facts step, labelled in human terms such as:
   - `Check the Facts — Handout 8 reference`
   - or an equivalent concise wording.
2. Prefer linking the user to the project's readable Learn/reference treatment of Check the Facts when that provides the best copyright-safe experience.
3. If the existing clean Handout 8 PDF remains part of the project's intentionally published reference resources, it may be offered as a **reference link**, but do not turn it into copied interactive worksheet text.
4. Do not newly expose or reproduce Worksheet 8 (or any other worksheet) as the interactive app content.
5. Do not transcribe worksheet fields verbatim into the tool.
6. Keep source/provenance metadata accurate.

## Paraphrased Check the Facts sequence

Review Handout 8 and the existing Learn content, then write concise original prompts that preserve the educational logic without copying source phrasing. The sequence should cover the underlying ideas, for example:

- identify the emotion and what prompted it;
- describe what actually happened using observable facts;
- separate direct observations from assumptions, interpretations, or predictions;
- notice whether a threat or feared outcome is being assumed and examine its realistic likelihood/consequences;
- compare the emotion/intensity with the facts and context;
- then move into the existing decision process for problem solving, opposite action, or mindful observation as appropriate.

This list is a conceptual brief, not approved copy. Use source-faithful original wording and preserve the current non-diagnostic framing.

Do not make the tool decide whether a user's emotion is "valid." It should support reflection and choice.

## Handout 8A / Handout 9

Preserve useful links to:

- Examples of Emotions That Fit the Facts (Handout 8A readable reference);
- the appropriate source-backed deciding-between-skills reference (Handout 9 / Learn treatment);
- Mindfulness of Current Emotions when it is the relevant outcome.

Avoid clutter: source links should appear where they are useful in the sequence and/or in a concise resources area.

## Tests

Add/adjust tests to ensure:

- Change an Emotion still follows the intended decision path;
- a Handout 8 / Check the Facts reference link is present and resolves;
- the app does not link users to a worksheet as the interactive form;
- there is no verbatim worksheet-field reproduction introduced by this pass;
- existing Handout 8A and related Learn links resolve;
- project-site base paths work;
- progress normalization/export remains compatible.

---

# 4. Conservative repository cleanup

## Objective

Remove tracked material that belongs only to the original Backgammon Simplified project and has no remaining runtime, build, test, content, provenance, compatibility, or development purpose for Free Therapy Tools.

This is a **reference-aware cleanup**, not a naming purge.

## Critical rule

Do not delete a file because it has a `bs-` prefix.

Free Therapy Tools intentionally retains proven generic mechanics inherited from Backgammon Simplified. Generic implementation names may remain until a future low-risk refactor.

## Must retain when still used

Preserve:

- glossary infrastructure and `scripts/learn_glossary.py`;
- generated glossary lookup/data;
- Learn navigation and lesson sequencing;
- continuous Learn scrolling;
- `← Hide` / `→ Show Lessons` behavior;
- generic `bs-*` CSS/JS used by Therapy pages;
- generic accessibility helpers;
- Quarto filters/extensions used by the current build;
- generic tests that protect current Therapy behavior;
- Tool Finder, TherapySkillProgress, audio, calendar, source audit, resource match, and publication pipelines;
- current Therapy clean resources and provenance metadata;
- compatibility redirects that are intentionally maintained for current/previous Therapy URLs;
- README knowledge that remains operationally useful.

## Candidates for removal after proof of no references

Audit for clearly game-specific material such as:

- GNU Backgammon / GNUBG fixtures or outputs;
- Sage-vs-GNU comparison data;
- checker-play / cube / pip / equity / position fixtures;
- engine benchmark data, generated tables, figures, manifests, and scripts;
- Backgammon-only browser fixtures;
- tests whose sole purpose is validating Backgammon content or game-engine output;
- game-specific sample pages and assets;
- game-specific social-card/position assets that are not used by Free Therapy Tools;
- obsolete game terminology metadata (`Checker Play`, `doubling-cube`, etc.) on active Therapy pages;
- stale Backgammon route/content assertions that no longer represent supported compatibility behavior;
- abandoned render/analyze/research directories that have no Therapy role.

Do not assume every item in this list still exists. Inventory first.

## Repository-root organization

The root currently contains historical review documents such as:

- `docs/reviews/NAVIGATION-PARITY-REVIEW.md`
- `docs/reviews/OVERNIGHT-REVIEW.md`
- `docs/reviews/PHP-MATCH-REVIEW.md`
- `docs/reviews/PROGRESS-SYSTEM-REVIEW.md`
- `docs/reviews/QMD-CONTENT-REVIEW.md`
- `docs/reviews/RESOURCE-PARAPHRASE-REVIEW.md`
- `docs/reviews/VALUES-DICTIONARY-REVIEW.md`

Do not blindly delete useful project knowledge. Move still-useful historical/internal reviews into an organized location such as `docs/reviews/` or `docs/architecture/`. Delete only reports proven obsolete and superseded with no durable value.

Keep the repository root focused on current project entry points and configuration.

## Asset organization audit

Classify tracked assets into:

- production runtime assets;
- authored Therapy content;
- public downloadable/reference resources;
- generated assets required by build/runtime;
- source/provenance audit data;
- tests/fixtures needed by Therapy;
- internal documentation;
- obsolete Backgammon-only material.

Do not perform large path moves merely for aesthetics if they would create substantial regression risk in this pass. Prefer deleting proven-dead game assets and cleaning manifest/config references.

## Reference tracing before deletion

For every deletion category:

1. search QMD/HTML/JS/CSS/JSON/YAML/Python/tests/workflows for references;
2. determine whether the reference is runtime, generated, test-only, compatibility-only, documentation-only, or dead;
3. update/remove references deliberately;
4. render/test after deletion;
5. include a deletion/retention report in the final Codex summary.

Do not delete generic infrastructure merely because only generated files currently reference it; check the generator.

## Build/config cleanup

Audit:

- `site/_quarto.yml` resources/render exclusions;
- `.gitignore`;
- `.gitattributes`;
- pre/post-render scripts;
- tests and fixtures;
- workflows;
- README build instructions;
- generated navigation/glossary authorities.

Remove stale Backgammon-only entries after the underlying content is removed.

## No history rewrite

Do not use filter-repo, BFG, orphan history, force push, or any history rewrite in this PR.

Historical cleanup can happen when the project is eventually moved to its fresh permanent repository.

## Secrets / machine paths

As part of the inventory, scan tracked text for accidental:

- `C:\Users\...` paths;
- `file:///` paths;
- credentials/tokens/API keys;
- temporary scan/source locations.

Do not treat legitimate source citations or public URLs as secrets.

If a sensitive item is discovered in history rather than current files, report it; do not rewrite history.

## Cleanup tests

After cleanup, verify:

- full Therapy Quarto render succeeds in the supported environment;
- no current production page has a broken internal link caused by deletion;
- no Tool Finder route is lost;
- Learn navigation/glossary validates;
- all Therapy-focused Node/Python suites pass;
- `git diff --check` passes;
- GitHub Pages workflow contract remains valid;
- no Backgammon-only resource is still intentionally shipped unless specifically documented as reusable generic infrastructure.

---

# 5. Commit strategy

Keep changes reviewable. Suggested logical commits:

1. `Add native Tool Finder topic TOC`
2. `Fix Box Breathing inhale layout`
3. `Clarify Change Emotion Check the Facts sequence`
4. `Remove unused Backgammon-specific repository material`
5. `Organize retained project review documentation`

Do not manufacture commits if a different clean grouping is better, but avoid one opaque giant commit if the cleanup is substantial.

Push only this branch. **Do not merge the PR and do not push implementation directly to master.**

---

# 6. Required validation

At minimum run the relevant existing suites for:

- Tool Finder catalogue/rendering;
- site path/base path;
- Box Breathing / quick tools;
- Change an Emotion / constrained-tree decision tools;
- TherapySkillProgress;
- Learn navigation and glossary;
- publication/source validation;
- any files affected by cleanup.

Run JS syntax checks for changed JS.

Run:

```bash
python scripts/learn_glossary.py validate
git diff --check
```

Run a full Quarto render in a supported environment when possible:

```bash
unset TSK_RESOURCE_REVIEW
export BS_SKIP_SOCIAL_CARDS=1
quarto render site
```

If the managed Windows environment hits the known invalid-handle/spawn limitation, do not claim render success. Use GitHub Actions or the established supported environment and report the limitation accurately.

---

# 7. QA routes

Verify rendered/live-equivalent behavior for at least:

- `/tool-finder/`
- `/tool-finder/box-breathing/`
- `/tool-finder/change-emotion/`
- `/learn/emotion-regulation/check-the-facts.html` (or the current canonical Check the Facts route)
- `/learn/emotion-regulation/examples-emotions-fit-facts.html`
- representative Learn pages using generic `bs-*` infrastructure
- representative Tool Finder tools using shared progress/export.

Desktop QA: approximately 1280px / 1440px.

Mobile QA: approximately 390px.

---

# 8. Final Codex report

Return:

- starting branch SHA;
- final branch SHA;
- commits;
- Tool Finder TOC implementation and topic-anchor authority;
- Box Breathing root cause and exact fix;
- Change Emotion Handout 8/reference behavior and paraphrase approach;
- confirmation that worksheets were not newly reproduced as interactive content;
- deleted Backgammon-only files/directories grouped by reason;
- retained `bs-*`/generic infrastructure and why;
- moved/organized internal docs;
- test commands/results;
- Quarto/render status;
- remaining blockers or questionable cleanup candidates deliberately retained.

Do not stop at an inventory. Implement the safe changes on this branch, test them, and push the branch for PR review.

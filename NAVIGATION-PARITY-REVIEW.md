# Visible Learn Navigation Review

[ ] Left sidebar visually resembles reference
[ ] Sidebar hierarchy/spacing matches reference
[ ] Collapse all visibly works
[ ] Expand all visibly works
[ ] Entire left rail visibly collapses
[ ] Lesson body reclaims left space
[ ] Entire left rail visibly reopens
[ ] Right rail visually resembles reference
[ ] Learning Track visible
[ ] On this page visible
[ ] Look up a term visible
[ ] Wise Mind lookup works
[ ] Right rail collapse works
[ ] Right rail restores
[ ] Back to top works
[ ] Active lesson follows continuous scrolling
[ ] CBT navigation isolated
[ ] Mindfulness navigation isolated
[ ] Mobile lesson navigation behaves like reference
[ ] Save Progress does not collide

These boxes are intentionally unchecked. Automated source or DOM assertions do not substitute for the user's rendered visual acceptance.

## Root cause

The rendered Learn pages referenced `assets/bs-learn.js` with a query string, but the file was not included as a Quarto resource and was absent from `site/_site/assets`. Consequently the Backgammon initializers never ran in the actual site: no sidebar action row, whole-rail toggle, right-rail tools, lookup mount, mobile lesson drawer, or Back to top control could appear. Earlier tests only found functions and strings in source.

Therapy's generated Quarto sidebar was compatible with the reference code. A separate metadata error disabled lesson taxonomy on all Distress Tolerance lessons, so TIPP also lacked its Learning Track node. The generic Backgammon taxonomy mapping mislabeled that track and sent CBT and Mindfulness track links to the DBT-filtered Learn index.

## Rendered DOM comparison

| Page | Body class | Sidebar sections/toggles | Margin rail / TOC | Learning Track |
|---|---|---:|---|---|
| DBT TIPP | `bs-learn-article` | 5 / 5 | present / present | Distress Tolerance |
| CBT Thinking Traps | `bs-learn-article` | 1 / 1 | present / present | CBT Skills |
| Mindfulness Observe | `bs-learn-article` | 1 / 1 | present / present | Mindfulness |

Each fresh rendered page contains `#quarto-sidebar`, `.sidebar-menu-container`, `.sidebar-item-section`, `.sidebar-item-container`, `.sidebar-item-toggle`, `#quarto-margin-sidebar`, and `#TOC`. Learn metadata and the term-lookup, inline-glossary, and taxonomy filters inherit uniformly from `site/learn/_metadata.yml`.

## Implemented shell changes

- Explicitly deploy the production Learn script and use a new cachebuster.
- Restore Distress Tolerance taxonomy on its lesson pages and map Therapy track names/routes explicitly.
- Keep Backgammon's Quarto disclosure controls, add an active curriculum-section state, and preserve it during continuous scrolling.
- Make whole-left and right-rail state classes change the Quarto grid boundaries so lesson content reclaims the hidden rail space.
- Put Learning Track and On this page in the desktop right rail; expose both plus Look up a term in the mobile lesson drawer.
- Keep the local Therapy glossary, canonical/alias ranking, inline term activation, keyboard behavior, and glossary-entry links.
- Retain Therapy's DBT/CBT/Mindfulness manifest selection and Skill Finder progress behavior as intentional differences.

## Validation evidence

- A fresh full Quarto render completed successfully (92/92 input pages plus post-render validation).
- The fresh `_site` contains `assets/bs-learn.js`; its hash matches the source file.
- Rendered-DOM tests cover DBT, CBT, and Mindfulness pages and their deployed initializer, sidebar nodes, track node, lookup, margin rail, and TOC.
- Runtime tests click production Collapse all, Expand all, whole-left collapse, and reopen controls against fixtures sized from the actual rendered sidebars.
- The release browser script now verifies visual layout width changes, Wise Mind lookup, mobile track/TOC/lookup access, and right-rail reflow.
- Automated browser execution was not completed: the managed in-app browser denied localhost access. No browser pass is claimed.

## Reference compared

Exact commit `6ce883106715d42594a8013e3c31eb8f50aa5e73`: `_quarto.yml`, `_learn-navigation.yml`, Learn metadata, `bs-learn.js`, `bs-learn.css`, `bs-shared.css`, `bs-components.css`, `bs-glossary.js`, script include, the three Learn extensions, Learn tests, and the three UX instruction documents requested in the task.

## Manual acceptance routes

- `/learn/cube/tipp.html`
- `/learn/interpersonal-effectiveness/dear-man.html`
- `/learn/emotion-regulation/what-emotions-do.html`
- `/learn/cbt-anxiety/thinking-traps.html`
- `/learn/cbt-anxiety/understanding-worry.html`
- `/learn/mindfulness/what-skills.html`
- `/skill-finder/values/`
- `/skill-finder/emotions/`

At desktop width, exercise both section controls, both whole-rail controls, lookup, scrolling, active lesson changes, anchors, and Back to top. Repeat at approximately 390 px and through `390 -> 1200 -> 390 -> 1200`, checking for duplicate controls and horizontal overflow. On the two Skill Finder routes, verify shared controls do not overlap Save progress.

# DEAR skills implementation and verification

Starting commit: `c8a8403ba067b12d164abbd26db34bef800a3f92`.
Branch: `content/interpersonal-dear-skills`. Target: Draft PR #3, base `master`.
Verification date: 2026-09-06. No merge, force push, or history rewrite.

## Retained work and completed integration

The first-pass DEAR + MAN explanation, four communication styles, triangle SVG,
priority guidance, landlord example, handout transcriptions, p020 repair, and
three route shells were retained. The landlord objective and original worksheet
links are now included. Handout 5 Parts 1/2, Handout 5A, and the Script worksheet
were checked against the available original JPGs and matched clean PDFs.
Original handout footer text and worksheet cross-references were restored.
Every source block has immediate provenance, separate from original project
explanations. The handwritten-note transcription is retained, but its original
image was not available in this checkout for renewed verification.

All three routes now mount functional builders through the existing practice-app
and TherapySkillProgress architecture:

| Route | Priority | Fields |
| --- | --- | --- |
| `/tool-finder/dear-man/` | Objective | Situation, Objective, Describe, Express, Assert, Reinforce, Mindful, Appear Confident, Negotiate, final script |
| `/tool-finder/dear-give/` | Relationship | Situation, relationship goal, DEAR, Gentle, Interested, Validate, Easy manner, final script |
| `/tool-finder/dear-fast/` | Self-respect | Situation, self-respect goal, DEAR, Fair, no unnecessary Apologies, Stick to values, Truthful, final script |

The MAN title appears only once. Placeholders use the landlord example; GIVE
uses morning connection and FAST uses a response to a demeaning comment.
Combining joins the user's DEAR text; the final script remains editable. Every
field is included in readable exports. Legacy seven-field MAN progress accepts
the older optional GIVE/FAST keys and fills new fields without rejecting old
files. The static brainstorming prompt copies to the clipboard only, with live
status feedback and a manual-copy fallback. Each builder links to its Learn
authority, and the routes and aliases are in both catalogue and generated sidebar.
Educational GIVE/FAST catalogue entries remain intact.

## Shared layout and save controls

The article shifted because sidebar collapse removed the sidebar grid item and
CSS changed the article's grid start. Collapse now reserves the grid item and
uses visibility, inert, and aria-hidden. The article's horizontal position and
width stay fixed; the right TOC is independent. Desktop controls, resize to
mobile, continuous scrolling helpers, and active navigation remain covered.

The shared progress runtime no longer creates a floating button, header opener,
or modal drawer. Every registered tool gets one native, collapsible bottom
disclosure in document flow. It contains Markdown save/reopen, legacy JSON,
DOCX, browser Print / Save as PDF, browser restore/clear, and optional restart.
It reattaches after tool rerenders. Per-tool fixed save footers were removed;
the independent Values navigation bar remains. Copy explicitly distinguishes a
Markdown resume file from DOCX export and browser print/PDF. No form data is
uploaded by these actions.

Strict browser console testing found Quarto's category badges requesting a
missing `listings.json` when no listing pages are rendered. The post-render hook
now writes `[]` only if that file does not exist, preserving any real Quarto
listing index. The focused test covers both branches.

## Original worksheets

- `site/resources/interpersonal-effectiveness/dear-man-script-worksheet.docx`
- `site/resources/interpersonal-effectiveness/dear-man-script-worksheet.pdf`
- Generator: `python scripts/generate-dear-worksheet.py` (python-docx, ReportLab).

These are original three-page practice materials with all requested fields,
generous writing space, a final script, and reflection prompts. They are linked
from Learn and the MAN tool. Both files opened successfully through their file
parsers: python-docx read 88 paragraphs; pypdf read three pages. All requested
prompts were present; every DOCX XML/relationship part parsed, and ZIP integrity
passed. All three PDF pages were rasterized with Poppler and visually reviewed.

Native DOCX visual rendering remains unverified: the packaged `render_docx.py`
failed because `soffice.exe` is unavailable in the runtime. It also reported
Windows temporary-directory cleanup permissions. The PDF review does not stand
in for native Word/LibreOffice layout verification.

## Tests and exact results

All commands run from the repository root unless otherwise noted.

Syntax checks: **PASS**, exit 0 for each:

```text
node --check site/assets/bs-learn.js
node --check site/assets/skill-progress.js
node --check site/assets/skill-practice-apps.js
node --check tests/test_navigation_runtime.js
node --check tests/test_dear_skills.js
node --check tests/test_dear_browser.cjs
```

JavaScript checks: **PASS**, exit 0 for every command:

```text
node tests/test_site_path.js
node tests/test_skill_progress.js
node tests/test_dear_skills.js
node tests/test_navigation_runtime.js
node tests/test_continuous_learn.js
node tests/test_learn_filters.js
node tests/test_dime_game.js
node tests/test_focused_tools.js
node tests/test_emotion_explorer.js
node tests/test_quick_tools.js
node tests/test_wellness_tools.js
node tests/test_values_smart.js
node tests/test_values_mission_map.js
node tests/test_resource_paraphrases.js
```

Focused Python suite: **91 tests passed**, exit 0:

```text
python -m unittest tests.test_dear_content tests.test_tool_finder_pass tests.test_practice_apps tests.test_skill_progress tests.test_navigation_parity tests.test_mindfulness_emotion_pass tests.test_focused_tools tests.test_dedicated_skill_tools tests.test_dime_game tests.test_skill_finder_apps
```

`python scripts/learn_glossary.py validate`: **PASS**, 58 lessons, 7 tracks,
38 canonical glossary entries, 29 aliases, 18 generated files checked.
`git diff --check`: **PASS**.

Broader legacy suites remain failing:

```text
python -m unittest tests.test_learn_glossary tests.test_lesson_inline_glossary
```

Latest result: **80 tests, 19 failures, 8 errors**, exit 1. These tests retain
Backgammon lesson/route, taxonomy, RSS, and navigation assumptions. To distinguish
regressions, the exact starting commit was archived under ignored `tmp/` and the
same suites were run there. The first run stopped glossary setup at the already
invalid DEAR metadata. With only that metadata corrected in the disposable copy,
the same **27 test cases** failed, with no newly failing case in the current tree.
No unrelated legacy tests were deleted or relaxed.

An initial broader 170-test command also caught the outdated fixed tool count
(31 instead of 33); that focused contract was updated and now passes. An initial
navigation command run while Quarto was replacing output reported a missing
rendered fixture; it passed after rendering completed.

## Quarto and browser QA

PowerShell build environment and command:

```powershell
Remove-Item Env:TSK_RESOURCE_REVIEW -ErrorAction SilentlyContinue
$env:BS_SKIP_SOCIAL_CARDS='1'
& 'C:/PROGRA~1/Quarto/bin/quarto.cmd' render site
```

**Full render passed**, exit 0: 109 pages; canonical/link/indexing checks and
project-base-path rewriting completed, with `Output created: _site\index.html`.
The normal long-path launcher first failed on its unquoted `Program Files`
path. The short-path launcher within the sandbox hit the known Python spawn
`Invalid handle` error. Running it outside the sandbox succeeded after the
first-pass Learn tags were corrected to the existing taxonomy. The final full
render includes the listing-index fallback.

Browser command (bundled Node/Playwright, local Chromium executable supplied
through `BROWSER_EXECUTABLE`, run outside the sandbox):

```text
node tests/test_dear_browser.cjs
```

**PASS: 27 rendered route/width checks**, with zero JavaScript page errors and
zero browser console errors. Widths: **390, 768, 1280, 1440px**.

- MAN Learn plus TIPP: fixed article position/width on hide/show, keyboard
  restore, desktop-to-mobile transitions, responsive figure, no overflow.
- MAN/GIVE/FAST: one public title, all labelled fields and placeholders,
  editable final script, bottom disclosure, no floating save control/overflow.
- At 1280px: actual Markdown download/reopen, browser restore, DOCX downloads,
  print-summary generation, and actual clipboard prompt contents. Windows
  clipboard CRLF is normalized only in the test comparison.
- At 1440px: shared save UI smoke checks for Pros & Cons, Interpersonal
  Troubleshooting, DIME Game, Ask / Say No, Emotion Explorer, Thought Record,
  and Values.
- Tests serve the rendered site under `/project/` to exercise project base paths.

Local screenshots, downloaded progress fixtures, render logs, and the disposable
baseline comparison remain under ignored `tmp/`; they are not production assets.

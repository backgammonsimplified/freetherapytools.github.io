# CBT Week 6 implementation verification

Verification date: 2026-09-05 (America/Toronto).

## Delivery state

- Starting SHA: `0630e3ef7aa37d737bb59554142b5ee7bf7cfb59`.
- Delivery commit and pushed SHA are recorded in the accompanying final report.
- Branch: `content/cbt-week-6-session-notes`; base: `master`.
- PR #2 was verified draft before delivery, with the starting SHA on the remote.
- A later fetch failed writing the existing `.git/FETCH_HEAD`: permission denied.
  Normal staging nevertheless succeeded. No ACL changes, alternative Git
  directory, history rewrite, force push, merge, or master write was attempted.
  Commit/push use only the normal implementation-branch workflow.

## Implementation

The Learn page remains
`/learn/cbt-anxiety/safety-behaviours-exposure.html`. Authored section order:

1. What are Safety Behaviours?
2. Why Safety Behaviours Can Keep Anxiety Going
3. Safety Behaviour or Useful Coping?
4. Safety Behaviour Checklist
5. Avoidance and Approach
6. Situational / Graded Exposure
7. Ideas for Challenging Different Fears
8. Fear Ladder / Exposure Hierarchy
9. Behavioural Experiments
10. Review What You Did and Learned
11. Bringing the Skills Together
12. Videos
13. Handouts & Worksheets (followed by retained practice/reference resources)

Both batches of handwritten concepts are integrated: function matters; short-term
relief versus longer-term restriction; worry/thinking, anxiety/emotion/body, and
avoidance/action are distinct; approach, repeat, and learn through experience;
review both WHAT DID I DO and HOW DID I FEEL; perfectionism links to rehearsal,
checking, and safe experiments. The personal tax/paperwork example is excluded.

The two-panel anxiety-over-time SVG has accessible descriptions and explicit
conceptual-curve caveats. Decorative icons overlapping labels in the existing
cycle SVG were removed. Original source images and provenance links are retained;
corrupt p047/p049/p051/p052 text blocks are concise Native Version notices, not
manufactured transcriptions. Four requested YouTube videos have verified oEmbed
titles/channels, lazy responsive privacy-enhanced embeds, and fallback links.
Playback itself was not verified; iframe dimensions and markup were checked.

`/tool-finder/avoidance/` supports multiple situations, all core planning prompts,
small safe approach steps, and repeated practice histories with action, feeling,
coping, outcome, learning, and next-step fields. Original three-page PDF and DOCX
worksheets are linked at the top. `/tool-finder/safety-behaviours/` has seven
paraphrased categories, multiple selections, custom behaviours, and seven
function/cost/learning/coping/experiment reflections. Deselecting retains prior
reflections and selections are never scored diagnostically.

`/tool-finder/exposure/` remains canonical. Victory / Goal is above adjustable
rungs, with optional 0–100 estimates, support, who/what/when/where/how-long,
safety-behaviour and prediction fields. Add/remove/duplicate/move controls and
repeated attempts preserve learning even with high after-anxiety. Old exposure
progress migrates without losing old fields or ratings.

All three use TherapySkillProgress and original readable exports. The shared
LLM prompt appears on Learn and near the top of the ladder. Copy substitutes the
current fear/goal locally, announces success/fallback, and never submits personal
text or adds it to a URL. Tool Finder and generated sidebar entries include all
three canonical tools and their anchored Learn links.

## Automated checks

All of these passed:

```powershell
node --check site/assets/cbt-practice.js
node --check site/assets/skill-practice-apps.js
node --check site/assets/skill-progress.js
node --check site/assets/skill-quick-tools.js
node --check site/assets/skill-finder-apps.js
node tests/test_cbt_week6.js
node tests/test_cbt_tool_finder.js
node tests/test_quick_tools.js
node tests/test_skill_progress.js
node tests/test_site_path.js
node tests/test_focused_tools.js
node tests/test_emotion_explorer.js
node tests/test_dime_game.js
node tests/test_resource_paraphrases.js
node tests/test_learn_filters.js
node tests/test_continuous_learn.js
python scripts/generate-cbt-worksheets.py
python scripts/learn_glossary.py generate
python scripts/learn_glossary.py validate
git diff --check
```

The new CBT tests exercise actual event handlers through a small DOM-boundary
stub, multiple items/selections, custom behaviours, add/remove/duplicate/reorder,
reflection retention, repeated attempts, escaping, optional rating validation,
legacy migration, copy-prompt contents, JSON/Markdown round trips through the
shared progress parser, readable exports, and root/project base paths. Tool
Finder tests run the real search runtime against catalogue data under both bases.

Focused Python regression command: **92 tests, OK, one skipped** (requires the
unavailable production-rendered site):

```powershell
python -m unittest tests.test_cbt_week6 tests.test_practice_apps tests.test_dedicated_skill_tools tests.test_skill_progress tests.test_skill_finder_apps tests.test_focused_tools tests.test_dime_game tests.test_tool_finder_pass tests.test_navigation_parity tests.test_mindfulness_emotion_pass
```

Additional legacy regression command: **112 tests, 22 failures, 7 errors**:

```powershell
python -m unittest tests.test_learn_glossary tests.test_lesson_inline_glossary tests.test_qmd_resource_extraction tests.test_resource_paraphrases
```

These suites are not green. They still expect removed backgammon/cube lessons,
older glossary counts/navigation/publication contracts, a general source block
on Tool Finder, and deterministic output from the broader source corpus. The
starting commit was checked in an isolated archive: its glossary suite initially
cannot initialize because Week 6 has invalid tags. This implementation fixes the
tags and adds the relevant CBT tag to the validator. Temporarily substituting an
already accepted tag in the archive exposes the older glossary failures there
as well; inline-glossary missing-cube fixtures and the two resource-content
failures also reproduce. Those unrelated contracts were not rewritten here.
The standalone production glossary validator passes: 38 canonical entries,
29 aliases, 58 continuous lessons, 18 generated files.

`node tests/test_navigation_runtime.js` cannot complete: missing rendered fixture
`learn/distress-tolerance/tipp.html`. This is not reported as a passed test.

## Documents

Both original assets regenerate identically:

- PDF SHA256: `a3c7ad45493ff9fee3ca42fbb55a07b36fa1885e16fcfc4a7e62334b84ff0919`.
- DOCX SHA256: `c3869c5ae8250802db5792e468f36e7d7fcfe12ad88c4437d0ba7e23fd95ac63`.

DOCX ZIP/XML integrity checks pass. LibreOffice opened the DOCX and converted it
to a three-page Letter PDF. Poppler reported both PDFs as three pages and rendered
all six page previews; every page was visually inspected for clipping, overlap,
readability, and handwriting space. The standard document rendering helper hit
Windows temporary-directory access errors; equivalent LibreOffice + Poppler
verification succeeded. QA outputs remain ignored under `tmp/`.

```powershell
& 'C:/Program Files/LibreOffice/program/soffice.exe' '-env:UserInstallation=file:///C:/Users/andre/Documents/freetherapytools-pr1/tmp/cbt-lo-profile' --headless --convert-to pdf --outdir tmp/cbt-docx-render site/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.docx
& 'tmp/poppler/poppler-26.07.0/Library/bin/pdfinfo.exe' site/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.pdf
& 'tmp/poppler/poppler-26.07.0/Library/bin/pdfinfo.exe' tmp/cbt-docx-render/avoidance-and-approach-planner.pdf
& 'tmp/poppler/poppler-26.07.0/Library/bin/pdftoppm.exe' -r 100 -png site/resources/free-therapy-tools/cbt/avoidance-and-approach-planner.pdf tmp/pdfs/avoidance
& 'tmp/poppler/poppler-26.07.0/Library/bin/pdftoppm.exe' -r 100 -png tmp/cbt-docx-render/avoidance-and-approach-planner.pdf tmp/cbt-docx-render/page
```

## Browser and responsive QA

Used `python scripts/cbt-browser-harness.py` on localhost:8766, rendering scoped
QMD through Pandoc and loading the real site assets. The visible banner explicitly
states that the Quarto navigation/theme is not rendered.

- Avoidance and Safety tools: measured no horizontal overflow at
  390/768/1280/1440px, including populated cards. Multiple situations, two practice
  entries, multiple selections, custom behaviour, and retained reflections checked.
- Exposure: 390px populated layout, goal, copy substitution, repeated practice,
  high after-anxiety, duplication, and reordering checked. Final remove confirmation
  caused a browser-connection timeout; automated event-handler removal passes.
  Wider final exposure screenshots remain a review task.
- Learn: 390/1280px content, heading/TOC anchors, loaded diagrams, four responsive
  iframe boxes, and copy status checked. Mobile figure overflow traced to default
  figure side margins; `.cbt-diagram` now has explicit zero horizontal margins.
  Fresh prefixed-path check has 375px document width inside a 390px viewport.
- Box Breathing: all four label/control rectangles fit at 390/768/1280/1440px;
  visual mobile/desktop inspection confirmed readable controls. The existing
  page-local single-column rule is retained. No additional timing-layout fix was
  necessary. Progress registration is removed, so no save/open/export UI appears.
  Start/Pause/Reset and completed cycles checked; unit tests cover zero-hold phase
  skipping. Synthetic fill alone did not commit native change events, so browser
  timing checks used keyboard edits as well; no claim is made from fill values alone.
- A real Avoidance Markdown save downloaded correctly; inspected file contained
  both situations and repeated attempts. Reopening it was blocked by browser
  upload permission. This boundary was respected; browser import is unverified.
- Root and project-prefix tool links checked. Tool Finder search is covered by
  the real-runtime Node test; final browser search check was not completed.
- No console errors in the captured lesson checks. A later browser timeout reset
  the connection, and its installed browser-client path was no longer available.
  Remaining screenshots and browser cleanup could not be completed through that
  connection. This is not full end-to-end browser sign-off.

## Full Quarto render and outstanding review

Attempted production-like command:

```powershell
$env:BS_SKIP_SOCIAL_CARDS='1'
Remove-Item Env:TSK_RESOURCE_REVIEW -ErrorAction SilentlyContinue
quarto render site
```

Failed in pre-render subprocess launch:

```text
Running script 'python'
ERROR: Error executing 'python': Failed to spawn 'C:\Users\andre\AppData\Local\Programs\Python\Python312\python.exe': Invalid handle
```

Stack begins at `execProcess` in `C:/Program Files/Quarto/bin/quarto.js:7919:11`.
No successful full production render is claimed. Keep PR #2 draft. Delivery must
commit and push only the implementation branch. Before review completion,
render in a working Quarto environment and finish production-theme,
Learn sidebar/TOC, video playback, full responsive, and browser import checks.

# Free Therapy Tools

Free Therapy Tools is an open-source Quarto site with practical DBT, CBT, mindfulness, goal-setting, emotional-regulation, distress-tolerance, interpersonal-effectiveness, and wellness lessons and browser-based exercises.

The project is under active development. Its tools are educational and do not diagnose conditions, replace professional care, or provide emergency support.

## Project links

- Preview: <https://backgammonsimplified.github.io/freetherapytools.github.io/>
- Tool Finder: <https://backgammonsimplified.github.io/freetherapytools.github.io/tool-finder/>
- Repository: <https://github.com/backgammonsimplified/freetherapytools.github.io>
- Issues: <https://github.com/backgammonsimplified/freetherapytools.github.io/issues>

This GitHub location is the temporary development home. Repository migration is intentionally outside the scope of current implementation work.

## Development and publication

`development` is the canonical branch for consolidating active work. Check the current branch, HEAD, worktree, and merge state before making changes; historical branch names and machine-specific paths in archived notes are not operating instructions. Preserve stable routes, tool IDs, saved-state compatibility, and unrelated local work.

The existing `.github/workflows/pages.yml` still deploys pushes to `master` and supports manual dispatch. Consolidating into `development` does not change that deployment trigger. GitHub Actions renders `site/` and publishes `site/_site/`; rendered output is not committed.

## Local development

Requirements include Python, Node.js, and Quarto. From the repository root:

```powershell
python scripts/learn_glossary.py validate
$env:BS_SKIP_SOCIAL_CARDS = "1"
Remove-Item Env:TSK_RESOURCE_REVIEW -ErrorAction SilentlyContinue
quarto render site
```

The rendered website is written to `site/_site/`. The managed Windows environment used by Codex can hit a Python/Playwright or Dart Sass invalid-handle error; Linux CI remains the full-render authority when that occurs.

Run the core source-level checks with:

```powershell
python -m unittest discover -s tests -p "test_*.py"
Get-ChildItem tests -Filter "test_*.js" | ForEach-Object { node $_.FullName }
python scripts/page_publication.py validate-source
python scripts/glossary_source.py check-source
python scripts/learn_glossary.py validate
git diff --check
```

## Architecture

- `site/` contains Quarto pages, browser assets, catalogue data, generated Learn navigation, and published resources.
- `site/data/tool-finder/catalogue.json` is the canonical Tool Finder catalogue.
- `scripts/tool_finder_topics.py` generates the render-time topic headings that Quarto uses for the native right-hand table of contents.
- `scripts/learn_glossary.py` owns Learn discovery, lesson catalogues, navigation, continuous-reading sequences, and glossary-derived output.
- `site/assets/bs-learn.js` and the shared Learn styles provide the current lesson layout, navigation, and continuous-reading behavior. Desktop sidebar collapse reserves the sidebar grid footprint so the article stays in place; the right TOC and mobile navigation remain independent.
- `site/assets/skill-progress.js` provides the shared `TherapySkillProgress` storage, validated imports, and readable exports. Tool adapters own their state and summaries.
- `site/assets/skill-progress.css` styles the underlying save disclosure; `skill-progress-bar.js` and `skill-progress-bar.css` enhance it into the persistent save/export bar with an Open previous progress control. `site/includes/bs-scripts.html` loads both runtimes and the bar stylesheet. Keep this shared architecture when updating individual tools.
- `site/assets/skill-practice-apps.js` implements DEAR MAN, DEAR GIVE, and DEAR FAST with objective, relationship, and self-respect priorities. The authored DEAR + MAN lesson keeps communication styles, the worked example, attributed project-written source summaries, and original worksheet downloads.
- `site/assets/skill-finder-apps.js` implements the Change an Emotion decision path and Check the Facts reflection with Handout 8 references and saved/exported answers. `site/assets/skill-quick-tools.js` supplies focused tools including the configurable Box Breathing timer and phase indicators.
- `site/assets/skill-handoff.js` connects valued actions to SMART goals; shared calendar and graph modules support the tools without replacing the Quarto site with a separate application.
- `site/assets/site-path.js` provides project-site base-path support.
- `site/_publication.yml` and `scripts/page_publication.py` provide publication and indexing controls.

Some generic files retain internal `bs-*` names because they originated in a reusable earlier site framework. Those names are not content authority and are intentionally left in place to avoid a risky broad rename.

Progress stays on the current device unless the user saves a copy. Nothing entered in the tools is uploaded. Markdown resume files preserve structured state alongside readable output; DOCX and print/PDF exports use the entered work. Keep existing storage keys and validate imported state when extending adapters.

Authored QMD, curriculum/navigation sources, and the Tool Finder catalogue are authoritative. Run `python scripts/learn_glossary.py generate` after lesson or metadata changes, then `python scripts/learn_glossary.py validate`; do not hand-edit generated lesson catalogue/index HTML. Run `python scripts/tool_finder_topics.py` to refresh native Tool Finder headings. The pre-render hook invokes these generators as appropriate.

Resource paraphrases use the canonical data under `data/`, reviewed publication gates, and generated browser assets. Keep original practice materials and attributed source summaries distinct from supplied resources. See the authoring and asset-provenance guides for the pipeline and permissions.

Backgammon-specific pages, analysis assets, fixtures, and obsolete metadata have been removed or archived. Keep that cleanup while retaining the generic reusable infrastructure described above.

## DEAR practice tools and source materials

The objective, relationship, and self-respect priorities have dedicated tools:
`/tool-finder/dear-man/`, `/tool-finder/dear-give/`, and
`/tool-finder/dear-fast/`. They share `DEAR_DEFINITIONS` and `initDear` in
`site/assets/skill-practice-apps.js`, plus the existing schema-v1
`TherapySkillProgress` adapters. All include Situation, a priority-specific goal,
DEAR wording, their MAN/GIVE/FAST approach fields, and an editable final script.
Combining copies the user's DEAR wording without adding persuasion. Rehearsal
shows the main spoken script separately from MAN backup/delivery lines (Mindful,
Negotiate, and an Appear Confident reminder), GIVE relationship approach notes,
or FAST self-respect approach notes. Markdown, DOCX, and print retain that
structure, followed by the planning fields. Old seven-field MAN files,
including legacy GIVE/FAST keys, still validate and normalize. A manual final
script is preserved on restore. The MAN brainstorming disclosure copies only a
static prompt; no answers are uploaded or automatically included.

The Learn authority is `/learn/interpersonal-effectiveness/dear-man.html`.
Its communication-styles SVG, priorities, and landlord example are project
explanations. Handout 5 Parts 1/2, Handout 5A, and the source Script worksheet
have project-written summaries with immediate provenance; do not publish their
full verbatim transcriptions or malformed OCR. Existing source/reference cards
remain subject to the project's publication rules. Useful handwritten-note
concepts are integrated with concise attribution. The lesson uses its existing
interpersonal-effectiveness track and Beginner category without legacy subject
tags; optional tags are not required by the lesson metadata validator.

Original blank downloads are
`site/resources/interpersonal-effectiveness/dear-man-script-worksheet.docx` and
`site/resources/interpersonal-effectiveness/dear-man-script-worksheet.pdf`.
Both are linked from Learn and the MAN builder. Regenerate them with
`python scripts/generate-dear-worksheet.py` using python-docx and ReportLab.
The three-page practice worksheet has original prompts, writing space, a final
script, and reflection; it does not copy the supplied worksheet's layout.

The catalogue retains educational GIVE/FAST entries alongside the new tools.
`scripts/learn_glossary.py` owns generated sidebar destinations; regenerate
navigation after adding a route. Focused regression coverage is in
`tests/test_dear_skills.js`, `tests/test_dear_content.py`, and
`tests/test_dear_browser.cjs` (Playwright, after a full render).

## CBT Week 6 and FAST lessons

The CBT Week 6 lesson at `/learn/cbt-anxiety/safety-behaviours-exposure.html`
covers safety behaviours, avoidance and approach, graded exposure, behavioural
experiments, and reviewing both actions and feelings. Its diagrams, practice
prompts, videos, and resource summaries support the authored lesson sequence.

Three tools share `site/assets/cbt-practice.js` and `cbt-practice.css`:

- `/tool-finder/avoidance/`: the Avoidance & Approach Planner records avoided
  situations, small approach steps, and repeated practice histories.
- `/tool-finder/safety-behaviours/`: the Safety Behaviour Check combines an
  original checklist with reflections on function, relief, cost, learning,
  coping, and experiments. Deselecting a behaviour retains its reflection.
- `/tool-finder/exposure/`: Fear Ladder / Graded Exposure keeps the existing
  route and supports a meaningful goal, editable and reorderable rungs, and
  repeated practice. Legacy `theme/safety/steps/next` progress migrates with ratings.

All three use the existing schema-v1 `TherapySkillProgress` adapters and shared
save/export architecture. Their canonical IDs are `avoidance`,
`safety-behaviours`, and `exposure`. The ladder's AI brainstorming prompt is
copied locally; personal answers are not sent to an external service. Box
Breathing remains a timer without a progress adapter.

The original Avoidance & Approach Planner PDF and editable DOCX are in
`site/resources/free-therapy-tools/cbt/` and linked from the tool. Regenerate both
with `python scripts/generate-cbt-worksheets.py` and visually inspect every page.
Generic PDF/DOCX binary attributes protect these packages during checkout.
Week 6 resource cards retain source provenance and concise Native Version
summaries; educational content is integrated into the authored lesson.

The DEAR + FAST lesson at `/learn/interpersonal-effectiveness/fast.html` adds
self-respect reflection, Assertive Rights and Responsibilities, expanded FAST
skills, replacing automatic apologies with appreciation, adding FAST to a DEAR
MAN script, and practice questions. It retains the Self-Respect tag and
project-written Native Version resource summaries without malformed OCR.

Focused coverage includes `tests/test_cbt_week6.py`, `tests/test_cbt_week6.js`,
and `tests/test_cbt_tool_finder.js`, alongside the tool, navigation, and progress
suites. `scripts/cbt-browser-harness.py` provides a Pandoc-content runtime
fallback for Windows Quarto subprocess failures; full theme/sidebar review
still requires a production render. See the [CBT implementation guide](docs/implementation/cbt-week-6-avoidance-safety-exposure-tools.md)
and [recorded CBT verification](docs/implementation/cbt-week-6-verification.md).

## Documentation

- [Authoring guide](docs/authoring-guide.md)
- [Glossary source contract](docs/glossary-source.md)
- [Inline glossary integration](docs/lesson-inline-glossary.md)
- [UI release testing](docs/ui-release-testing.md)
- [Asset provenance](docs/ASSET_PROVENANCE.md)
- [DEAR skills implementation and QA history](docs/implementation/interpersonal-dear-skills-qa.md)
- [Implementation brief for PR #1](docs/implementation/tool-finder-fixes-and-repo-cleanup.md)
- [Retained review reports](docs/reviews/)
- [Historical project notes](docs/archive/project-history.md)

## Licensing

Software is licensed under AGPL-3.0-only. Original educational content is licensed under CC BY-SA 4.0 unless a source or resource states otherwise. Third-party material retains its original licence or permission. See [LICENSE.md](LICENSE.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md).

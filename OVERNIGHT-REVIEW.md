# Overnight Review

## What changed

Local commits created during this run:

- `c7c82d0` — Add verified clean DBT handout matches
- `0fb2022` — Add Values and Valued Action module
- `b8fca1e` — Add flagship Skill Finder applications
- `23c751d` — Add behaviour exposure relationship and goal tools

The site now has 13 interactive Skill Finder routes: Values, Skill Thermometer, Emotion Explorer, Change an Emotion, Worry Tree, Pleasant Event Planner, Behaviour Chain, Missing Links, Exposure Ladder, DEAR MAN, Ask or Say No, SMART Goal Builder, and Behavioural Activation.

The Values extension adds a fifth Goal Setting & Tracking lesson without removing the four scan-authoritative lessons. It includes 257 workbook-sourced value definitions, the required nine public life domains, native Learn content, and a private eight-step browser app.

## Book match review

- Current published curriculum resources checked: **266**
- High-confidence matches: **99**
- Candidate matches: **14**
- No match: **153**
- Clean assets added: **99 single-page PDFs and 99 readable previews**
- Public comparison presentation: selected curriculum page first, then **Clean Printable Copy** for high-confidence matches only

Candidate matches needing human review (none are published as clean copies):

- `interpersonal-effectiveness-p020` — DEAR MAN Script → Writing Out Interpersonal Effectiveness Scripts, PDF page 198
- `interpersonal-effectiveness-p028` — DEAR + GIVE Script → Writing Out Interpersonal Effectiveness Scripts, PDF page 198
- `interpersonal-effectiveness-p035` — DEAR + FAST Script → Writing Out Interpersonal Effectiveness Scripts, PDF page 198
- `wellness-p024` — The Behaviour Chain Analysis → Chain Analysis, PDF page 44
- `emotion-regulation-p034` — Check the Facts Practice → Check the Facts, PDF page 309
- `emotion-regulation-p036` — Choosing Problem Solving or Opposite Action → Figuring Out How to Change Unwanted Emotions, PDF page 311
- `emotion-regulation-p066` — Building Positive Experiences Now → Pleasant Events Diary, PDF page 319
- `emotion-regulation-p067` — Daily Pleasant Moments Record → Pleasant Events Diary, PDF page 319
- `emotion-regulation-p068` — Accumulating Positive Emotions: Long Term Worksheet, Part 1 → Getting from Values to Specific Action Steps, PDF page 320
- `emotion-regulation-p069` — Accumulating Positive Emotions: Long Term Worksheet, Part 2 → Getting from Values to Specific Action Steps, PDF page 321
- `emotion-regulation-p071` — Building Mastery → Build Mastery and Cope Ahead, PDF page 280
- `emotion-regulation-p072` — Changing Emotional Responses with Cope Ahead → Build Mastery and Cope Ahead, PDF page 280
- `emotion-regulation-p073` — How to Cope Ahead → Build Mastery and Cope Ahead, PDF page 280
- `emotion-regulation-p076` — Cope Ahead Worksheet → Build Mastery and Cope Ahead, PDF page 325

The searchable reference-book PDF was found. The expected separate reference-book DOCX was not present in the read-only source directory.

## Values review

- Learn lesson: `/learn/goal-setting/values-valued-action.html`
- App: `/tool-finder/values/`
- Workbook found: `Core_Values_and_Valued_Action_Workbook_v0.2.docx`
- Dictionary: 257 unique workbook values and definitions
- App: Discover, Sort, Narrow, Assess, Act, Barriers, Mission, and Review
- Privacy: local browser storage only for Values; visible **Saved only in this browser** notice and **Clear Saved Data** control

Review question: the workbook source combines health/resources into one source area, while the requested public model explicitly requires nine separate domains. The implementation follows the requested nine-domain model and leaves `suggested_domains` empty rather than inventing assignments.

## App review

Completed:

- Skill Finder hub
- Values & Valued Action
- Skill Thermometer
- Emotion Explorer with original wheel, accessible list, source-derived words, body-region map, and checklist
- Change an Emotion decision tree
- Worry Tree
- Pleasant Event Planner with all 225 source activities
- Behaviour Chain Builder with add/remove/reorder controls and chain view
- Missing Links
- Exposure Ladder with keyboard ordering and explicit safety guardrail
- DEAR MAN Builder with optional GIVE and FAST
- Ask or Say No Planner
- SMART Goal Builder
- Behavioural Activation Planner

Deferred:

- Distress quick tools (TIPP coach, ACCEPTS, Self-Soothing, IMPROVE, Pros & Cons, Radical Acceptance)
- Check the Facts wizard
- Both/And dialectics tool

Known limitations:

- The exact Quarto build command reaches Quarto but the managed Windows sandbox blocks Quarto from spawning both Python hooks and its bundled Sass executable (`Invalid handle`). Manual pre-render validation passes.
- The browser review could not be completed: the sandboxed preview process saw an empty virtual directory, and the browser security policy blocked the self-contained local diagnostic URL. No browser screenshots or credible desktop/mobile visual pass are claimed.
- The full legacy unit suite still contains Backgammon-era assertions and tests that require the unavailable system temp/process permissions. The new/current targeted suite passes.

## Visual review routes

Open these in order after running the normal local preview:

1. `/tool-finder/`
2. `/learn/goal-setting/values-valued-action.html`
3. `/tool-finder/values/`
4. `/tool-finder/thermometer/`
5. `/tool-finder/emotions/`
6. `/tool-finder/change-emotion/?emotion=fear`
7. `/tool-finder/worry-tree/`
8. `/tool-finder/pleasant-event/`
9. `/tool-finder/behaviour-chain/`
10. `/tool-finder/missing-links/`
11. `/tool-finder/exposure/`
12. `/tool-finder/dear-man/`
13. `/tool-finder/ask-or-say-no/`
14. `/tool-finder/goal-builder/`
15. `/tool-finder/behavioural-activation/`
16. `/learn/distress-tolerance/stop-crisis-survival.html` (clean-copy comparison)
17. `/learn/emotion-regulation/observing-describing-emotions.html` (clean-copy comparison)
18. `/learn/`, `/cbt-skills/`, `/mindfulness/`, and `/glossary/`

At approximately 390 px, specifically check the Emotion wheel's list layout, body map/checklist, values progress grid, chain/exposure controls, Pleasant Events results, navbar, and horizontal overflow.

## Commands

Exact supported build command:

```powershell
$env:BS_SKIP_SOCIAL_CARDS = "1"; quarto render site
```

Exact supported preview command:

```powershell
bash scripts/preview-site.sh 8765
```

Targeted validation used in this sandbox:

```powershell
$env:PYTHONPATH = (Get-Location).Path
python -m unittest tests.test_book_matches tests.test_values_module tests.test_skill_finder_apps tests.test_practice_apps tests.test_therapy_curriculum tests.test_section_scan_curriculum
node --check site/assets/skill-apps.js
node --check site/assets/skill-finder-apps.js
node --check site/assets/skill-practice-apps.js
python scripts/learn_glossary.py validate
git diff --check
```

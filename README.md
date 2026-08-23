# Therapy Skill Kit

Therapy Skill Kit is a **Quarto-based learning site and local-first interactive skills toolkit** focused on DBT, CBT, mindfulness, goal setting, wellness, emotional regulation, distress tolerance, interpersonal effectiveness, and valued action.

This repository is also the durable implementation handoff for the project. The documentation below is intentionally detailed so a future ChatGPT/Codex session can safely continue if conversation context is lost.

> **Git is authoritative.** Always verify the current branch, remote, HEAD, and worktree before acting. This README records architecture, operating procedures, major decisions, and the latest known implementation plan, but it should not override the actual repository state.

**Last major context update:** 2026-08-23.

---

# 1. Product direction

Therapy Skill Kit intentionally reuses the proven Quarto framework and interaction patterns of **Backgammon Simplified** rather than replacing them with a generic SPA rewrite.

Core direction:

- preserve Quarto/QMD/build-system architecture;
- preserve working Backgammon-derived Learn/navigation mechanics;
- replace Backgammon content with Therapy Skill Kit content;
- reuse proven Backgammon mechanics/design tokens where the same UI problem exists;
- develop Therapy only in the Therapy repository;
- treat Backgammon and Personal Planning repositories as read-only references;
- use focused Codex passes with explicit acceptance tests;
- preserve routes, saved progress, stable IDs, and migration compatibility whenever practical.

The intended product flow is:

```text
Learn
  ↓
understand the skill / concept
  ↓
identify what matters
  ↓
assess where attention is needed
  ↓
choose a valued direction
  ↓
choose a concrete action
  ↓
optionally turn it into a SMART goal
  ↓
save / reopen progress
  ↓
hand concrete work to Calendar or GTD tools where appropriate
  ↓
return and reassess
```

---

# 2. Repository authority

## Therapy Skill Kit — writable authority

Local path:

```text
C:\Users\andre\Documents\therapy-skill-kit
```

GitHub:

```text
backgammonsimplified/therapyskillkit.github.io
```

Preferred origin:

```text
git@github.com:backgammonsimplified/therapyskillkit.github.io.git
```

Authoritative branch:

```text
master
```

All Therapy development belongs here.

## Backgammon Simplified — read-only implementation/design reference

Local path:

```text
C:\Users\andre\Documents\backgammonsimplified.github.io
```

GitHub:

```text
backgammonsimplified/backgammonsimplified.github.io
```

Primary reference commit:

```text
6ce883106715d42594a8013e3c31eb8f50aa5e73
```

Desired Therapy-checkout remote configuration:

```text
backgammon-reference fetch:
https://github.com/backgammonsimplified/backgammonsimplified.github.io.git

backgammon-reference push:
no_push://backgammon-reference
```

The invalid push URL is intentional so Therapy work cannot be accidentally pushed to the reference repository.

## Personal Planning / GTD Control Tower — read-only integration reference

Repository:

```text
https://github.com/backgammonsimplified/personal-planning
```

Reference branch:

```text
feature/gtd-core-pre-integration-20260822
```

Typical local path:

```text
C:\Users\andre\Documents\personal-planning
```

Important reference files:

```text
README.md
docs/markdown-task-repository.md
docs/PERSONAL-GTD-ARCHITECTURE.md
schema/task-file.schema.json
```

Also inspect the actual runtime Task model, Markdown parser/serializer, validation code, fixtures, and tests before claiming compatibility. Runtime validation is stricter than documentation examples.

Do not modify, commit, or push to Personal Planning during Therapy work.

---

# 3. Current known Git history and baseline

Before this README documentation update, the most recently independently verified remote Therapy `master` was:

```text
e0109ffc060d4c847a10721269c1cccd0dc7ac23
Improve SMART Goal event scheduling controls
```

Parent:

```text
4446d201a696ed3bb3b3c33f37420a69fd8c592a
Complete Values to SMART Goal workflow redesign
```

Earlier important commits:

```text
54e4e167dbbde2bf282ef5eae5263d7cfa3d2ce6
Keep lesson width fixed during sidebar auto-hide

578ca8ed9e207099729e0ca63ae8455c142a7431
Restore visible Backgammon navigation shell
```

Always run a fresh preflight because this README update itself creates a newer commit.

## Historical local/remote reconciliation situation

A local checkpoint commit was created as:

```text
db6e6ee Snapshot pre Values navigation refinement
```

Its push was rejected because remote `master` had advanced to `e0109ff`. The remote commit changed the same five files with the same aggregate 94 insertions / 9 deletions, strongly indicating the remote contained the same concurrent work.

If a future checkout is still in that state, compare first:

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

git fetch origin master

git rev-parse --short HEAD
git rev-parse --short origin/master

git diff --stat HEAD origin/master
git diff --quiet HEAD origin/master
echo $?
```

If the diff is empty and exit code is `0`, align local to authoritative remote:

```bash
git reset --hard origin/master

git status --short --branch
git rev-parse --short HEAD
git log -3 --oneline
```

If trees differ, inspect before resetting.

---

# 4. Required Git preflight for every Codex pass

Every substantive Codex prompt should require:

```bash
git remote get-url origin
git branch --show-current
git rev-parse --short HEAD
git status --short --branch
```

Expected:

```text
origin = git@github.com:backgammonsimplified/therapyskillkit.github.io.git
branch = master
worktree = clean
```

For a task that requires a specific baseline:

```bash
git fetch origin master
git rev-parse HEAD
git rev-parse origin/master
```

Codex should **STOP** if:

- origin is wrong;
- branch is not `master`;
- unexpected user changes exist;
- work would target Backgammon Simplified;
- a force push would be required.

Never force push unless explicitly requested.

---

# 5. Git authentication

Normal Git authentication is intended to use **SSH**.

Preferred origin:

```text
git@github.com:backgammonsimplified/therapyskillkit.github.io.git
```

Test:

```bash
ssh -T git@github.com
```

GitHub normally answers that authentication succeeded and shell access is not provided.

Do not confuse Git-over-SSH authentication with `gh` CLI OAuth/PAT authentication. Do not rotate an SSH key merely because a GitHub CLI credential is discussed. Only rotate a CLI credential if a literal sensitive token was actually exposed.

Avoid commands that print credentials such as:

```bash
gh auth token
```

---

# 6. Common Git Bash commands

Always enter the correct repository first:

```bash
cd /c/Users/andre/Documents/therapy-skill-kit
```

Do not run project Git commands from `~/Documents`; there has been an unrelated Documents-level Git repository/history trap.

## Status

```bash
git status --short --branch
git branch --show-current
git rev-parse --short HEAD
git log -5 --oneline
git remote -v
```

## Fetch / compare local and remote

```bash
git fetch origin master

git rev-parse --short HEAD
git rev-parse --short origin/master

git log --oneline --decorate --graph --max-count=12 --all
git diff --stat HEAD origin/master
git diff HEAD origin/master
```

Check tree equality:

```bash
git diff --quiet HEAD origin/master
echo $?
```

`0` means identical.

## Align local checkout to remote

Only after checking that local changes are expendable or redundant:

```bash
git fetch origin master
git reset --hard origin/master
git clean -fd
```

Then:

```bash
git status --short --branch
git rev-parse --short HEAD
```

`git clean -fd` deletes untracked files/directories; use intentionally.

## Preserve unexpected work

Inspect:

```bash
git status --short
git diff --stat
git diff
```

Backup patch:

```bash
git diff > /c/Users/andre/Documents/therapy-uncommitted-backup.patch
```

Or checkpoint selected files:

```bash
git add -- <file1> <file2>
git commit -m "Snapshot before <task>"
```

## Commit and push

```bash
git add -- <specific-files>

git diff --cached --stat
git diff --cached

git commit -m "Concise commit message"
git push origin master
```

Never use `--force`.

## Push rejected because remote advanced

Do not immediately force or blindly pull.

```bash
git fetch origin master

git log --oneline --decorate --graph --max-count=12 HEAD origin/master
git diff --stat HEAD origin/master
git diff HEAD origin/master
```

Determine whether the local commit is redundant, independent and mergeable, stale, or conflicting before integrating.

---

# 7. Running Codex in PowerShell

Known CLI version during this work:

```text
codex-cli 0.149.0
```

## Preferred profile launch

```powershell
Set-Location "C:\Users\andre\Documents\therapy-skill-kit"

codex `
  --profile therapy-nav `
  --ask-for-approval never
```

Then paste the focused Codex task prompt.

## Expected profile intent

The profile should make:

- Therapy workspace writable;
- Therapy `.git` writable if Windows allows it;
- Backgammon reference read-only;
- Personal Planning read-only;
- source scans read-only;
- network enabled;
- local binding allowed;
- approvals disabled.

Example concept:

```toml
default_permissions = "therapy-nav"

[permissions.therapy-nav]
extends = ":workspace"

[permissions.therapy-nav.filesystem]
"C:/Users/andre/Documents/therapy-skill-kit/.git" = "write"
"C:/Users/andre/Documents/backgammonsimplified.github.io" = "read"
"C:/Users/andre/Documents/personal-planning" = "read"
"C:/Users/andre/Downloads/scans" = "read"
"C:/Users/andre/Downloads/book-scans" = "read"

[permissions.therapy-nav.network]
enabled = true
allow_local_binding = true
```

Profile file has been referred to as:

```text
~/.codex/therapy-nav.config.toml
```

If Codex syntax changes in a newer CLI, inspect current CLI help/profile format rather than guessing.

## Inline-permission launch example

If a profile is unavailable:

```powershell
Set-Location "C:\Users\andre\Documents\therapy-skill-kit"

codex `
  --ask-for-approval never `
  -c 'default_permissions="therapy-skill-kit"' `
  -c 'permissions.therapy-skill-kit.extends=":workspace"' `
  -c 'permissions.therapy-skill-kit.filesystem."C:/Users/andre/Documents/therapy-skill-kit/.git"="write"' `
  -c 'permissions.therapy-skill-kit.filesystem."C:/Users/andre/Documents/personal-planning"="read"' `
  -c 'permissions.therapy-skill-kit.network.enabled=true'
```

Prefer the existing `therapy-nav` profile when it is working.

---

# 8. Windows Codex sandbox caveat

Managed Codex Windows sessions have repeatedly failed to write the original checkout's `.git` metadata even when permissions theoretically allow it.

Observed pattern:

- lock/ref writes denied;
- original local HEAD remains stale;
- working-tree files appear modified;
- Codex may commit/push successfully from a disposable clone or isolated Git metadata;
- normal interactive Git Bash can later reconcile the original checkout.

Operational rule:

1. verify the remote commit independently;
2. use normal Git Bash to fetch/compare;
3. reset local only after confirming no independent work would be lost;
4. never force push to repair a sandbox ACL problem.

---

# 9. Recommended Codex prompt structure

A strong prompt contains:

1. project and focused task;
2. required preflight;
3. repository/branch/baseline;
4. references to inspect;
5. product/architecture intent;
6. exact behavior requirements;
7. acceptance cases;
8. focused tests;
9. do-not-touch boundaries;
10. Git requirements;
11. exact final report fields.

Example skeleton:

```text
PROJECT: Therapy Skill Kit

TASK:
<focused task>

PRE-FLIGHT
git remote get-url origin
git branch --show-current
git rev-parse --short HEAD
git status --short --branch

Required:
origin = git@github.com:backgammonsimplified/therapyskillkit.github.io.git
branch = master
worktree = clean

If wrong, STOP.

ARCHITECTURE
<what to preserve>
<what to change>

ACCEPTANCE
<numbered behavior>

TESTS
<focused tests>
git diff --check

DO NOT TOUCH
<unrelated systems>

GIT
commit on master
push non-force to origin master

FINAL REPORT
<fields>
```

Do not give Codex broad instructions such as “polish everything.”

---

# 10. Quarto build and local preview

Therapy Skill Kit is a **Quarto site**. QMD/config/build files are part of the architecture and must remain first-class source.

Normal Git Bash:

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

export BS_SKIP_SOCIAL_CARDS=1
quarto render site
```

Preview:

```bash
bash scripts/preview-site.sh 8766
```

Open:

```text
http://127.0.0.1:8766/
```

Key current routes:

```text
http://127.0.0.1:8766/skill-finder/values/
http://127.0.0.1:8766/skill-finder/goal-builder/
```

Preview wrapper requires `site/_site/index.html`, so render first.

Earlier dev setup:

```bash
bash scripts/setup/windows-dev.sh
```

Testing:

```bash
bash scripts/testing/quick.sh
bash scripts/testing/comprehensive.sh
```

---

# 11. Known Windows build/test blockers

Managed Codex sessions have hit Windows “Invalid handle” / service / permission failures while spawning Python hooks, Dart Sass, Git Bash, or Playwright/browser processes.

Codex reports must distinguish:

```text
PASS
FAIL
BLOCKED BY ENVIRONMENT
```

Never claim Quarto/browser validation passed if the managed environment could not execute it. Final render/preview is best performed in normal interactive Git Bash.

---

# 12. Backgammon-derived Quarto / Learn architecture

Important Backgammon reference files:

```text
site/_quarto.yml
site/_learn-navigation.yml
site/learn/_metadata.yml
site/assets/bs-theme.scss
site/assets/bs-shared.css
site/assets/bs-components.css
site/assets/bs-learn.css
site/assets/bs-learn.js
site/assets/bs-learn-scroll.js
site/assets/bs-glossary.js
site/assets/bs-glossary-lookup.json
site/includes/bs-scripts.html
site/_extensions/bs-term-lookup/
site/_extensions/bs-inline-glossary/
site/_extensions/bs-learn-taxonomy/
```

Reference characteristics include:

- search navbar overlay;
- navbar collapse-below xl;
- right TOC;
- TOC depth 3;
- “On this page”;
- smooth scrolling;
- docked hierarchical Learn sidebar;
- generated Learn navigation;
- taxonomy + glossary extensions.

Do not replace these mechanics with a new generic SPA architecture.

---

# 13. Navigation parity history

Earlier Therapy Learn pages looked wrong even while some tests passed.

Root cause found:

> Learn HTML referenced `assets/bs-learn.js`, but Quarto was not copying that file into rendered `_site`, so navigation initializers never ran.

This prevented Collapse all / Expand all, whole-left-rail toggle, right-rail controls, term lookup, mobile drawer, and Back to top.

Therapy taxonomy/routing was also corrected.

Commit:

```text
578ca8e Restore visible Backgammon navigation shell
```

Do not broadly rewrite the Learn shell again.

---

# 14. Sidebar auto-hide vs manual collapse

Commit:

```text
54e4e16 Keep lesson width fixed during sidebar auto-hide
```

Two deliberately separate states:

## Auto-hide on scroll

```text
bs-learn-left-sidebar-auto-hidden
```

Sidebar is visually translated/hidden while the grid footprint remains reserved, so lesson/right-rail geometry does not move.

## Manual collapse

```text
bs-learn-left-sidebar-collapsed
```

Sidebar is truly collapsed and lesson content may widen.

Do not merge these states again.

Known unrelated issue at that checkpoint:

```text
/learn/cbt-anxiety/thinking-traps.html
```

had horizontal overflow. Fix it only as a focused later task.

---

# 15. Public vocabulary

Do not publicly call source material a **binder**.

Use:

- Handouts & Worksheets;
- Practice Materials;
- Exercises;
- Reference Materials;
- Printable Copy;
- Text Version.

---

# 16. Curriculum source architecture

Authoritative scan directory:

```text
C:\Users\andre\Downloads\scans
```

Known source PDFs:

```text
0 general handouts and skills to turn to app.pdf
1 goal setting and tracking.pdf
2 Distress Tolerance.pdf
4 Distress Tolerance.pdf   # actually Interpersonal Effectiveness
5 Wellness.pdf
6 Emotional Regulation.pdf
7 CBT SKills.pdf
```

Major migration checkpoint:

```text
331 total pages
266 published content pages
37 structural
28 duplicate/blank
266 new assets
```

Inventory:

```text
data/source-inventory.csv
```

Generator:

```text
scripts/section_scan_inventory.py
```

No dedicated Mindfulness scan exists; keep the authored Mindfulness curriculum.

---

# 17. Current curricula

Primary navigation:

```text
Skill Finder | DBT Skills | CBT Skills | Mindfulness
```

## Goal Setting & Tracking

1. Goal Setting Guidelines
2. Skills & Strengths List
3. Values & Valued Action
4. Weekly Goal Worksheets
5. Weekly Home Practice Trackers

## Distress Tolerance

1. Introduction & STOP
2. TIPP
3. Distraction & Self-Soothing
4. IMPROVE
5. Pros & Cons
6. Radical Acceptance

## Interpersonal Effectiveness

1. Boundaries
2. Clarifying Priorities & Myths
3. DEAR MAN
4. DEAR + GIVE
5. DEAR + FAST
6. How to Ask & Say No & Troubleshooting

## Wellness

1. Sleep
2. Behaviour Activation
3. Behaviour Chain Analysis and Missing Links
4. Addictions
5. Balanced Eating
6. Medication & Doctor’s Visits

## Emotion Regulation

1. What Emotions Do for You
2. Emotions
3. Check the Facts
4. Opposite Action & Problem Solving
5. Accumulating Positive Emotions
6. Building Mastery & Cope Ahead

## CBT `/cbt-skills/`

1. Introduction to CBT
2. Thinking Traps
3. Thought Records Part 1
4. Thought Records Part 2
5. Understanding Worry
6. Safety Behaviours & Exposure

## Mindfulness `/mindfulness/`

1. Introduction and States of Mind
2. Observe
3. Describe
4. Participate
5. Non-Judgmentally
6. One-Mindfully
7. Effectively
8. Self-Compassion and Loving Kindness
9. Mindfulness of Emotions
10. Mindfulness of Thoughts
11. Grounding
12. Being Mind and Doing Mind

---

# 18. Stable anchors

Preserve these unless a deliberate migration is made.

## TIPP

```text
#temperature
#intense-exercise
#progressive-muscle-relaxation
#paced-breathing
```

## ACCEPTS

```text
#activities
#contributing
#comparisons
#opposite-emotion
#pushing-away
#thoughts
#sensations
```

## IMPROVE

```text
#imagery
#meaning
#prayer
#relaxation
#one-thing-in-the-moment
#vacation
#self-encouragement
```

## DEAR MAN

```text
#describe
#express
#assert
#reinforce
#mindful
#appear-confident
#negotiate
```

## GIVE

```text
#gentle
#interested
#validate
#easy-manner
```

## FAST

```text
#fair
#no-unnecessary-apologies
#stick-to-values
#truthful
```

## ABC PLEASE

```text
#accumulating-positive-emotions
#build-mastery
#cope-ahead
#treat-physical-illness
#balanced-eating
#avoid-mood-altering-substances
#balanced-sleep
#exercise
```

## WHAT

```text
#observe
#describe
#participate
```

## HOW

```text
#non-judgmentally
#one-mindfully
#effectively
```

Preserve Self-Soothe per-sense anchors.

---

# 19. Resource matching / better-copy architecture

Searchable DBT reference:

```text
C:\Users\andre\Downloads\scans\dbt_skills_training_handouts_and_worksheets_-_linehan_marsha_srg_.pdf
```

Older high-resolution source:

```text
C:\Users\andre\Downloads\book-scans\php.pdf
```

`php.pdf` is **not curriculum authority**; it is only a better-resolution source.

Known checkpoint:

- 266 published resources;
- 99 displayed Linehan matches;
- 42 PHP high-confidence;
- 125 low-resolution unmatched;
- 141 combined better-copy comparisons.

Review UI:

```text
/review/resource-matches.html?review=1
/review/unmatched-resources.html?review=1
```

Do not finalize replacement matches until the user exports completed review JSON.

---

# 20. Native QMD extraction

Extracted text lives directly in lesson QMDs rather than a separate Markdown library.

Known checkpoint:

- 34 lesson QMDs;
- all 266 resources represented;
- 74 integrated;
- 192 Text Version;
- 190 review-needed;
- 99 direct PDF;
- 165 OCR;
- 2 OCR + manual.

Files:

```text
QMD-CONTENT-REVIEW.md
data/qmd-resource-extraction.csv
```

---

# 21. Glossary architecture

Preserve the Backgammon-style architecture:

- canonical terms;
- aliases;
- taxonomy;
- highlighted inline terms;
- lookup.

Smoke test:

```text
Wise Mind
```

Earlier checkpoint:

```text
38 terms / 29 aliases
```

---

# 22. Skill Finder applications

Route:

```text
/skill-finder/
```

Known apps:

1. Values & Valued Action
2. Skill Thermometer
3. Emotion Explorer
4. Change Emotion
5. Worry Tree
6. Pleasant Event Planner
7. Behaviour Chain
8. Missing Links
9. Exposure
10. DEAR MAN
11. Ask / Say No
12. SMART Goal Builder
13. Behavioural Activation

Deferred ideas have included distress quick tools, Check the Facts wizard, and Both/And dialectics.

Product preference: refine individual tools deeply rather than apply broad shallow polish.

---

# 23. Shared Save Progress architecture

Central files:

```text
site/assets/skill-progress.js
site/assets/skill-progress.css
```

Functions include:

- browser autosave;
- Open previous progress;
- Markdown save/reload;
- JSON compatibility;
- DOCX export;
- Print/PDF;
- wrong-tool handoff.

Storage:

```text
therapy-skill-kit:progress:<tool-id>
```

Shared temporary handoff historically:

```text
therapy-skill-kit:progress-handoff
```

Current user-facing terminology:

## Save

```text
Save progress (.md)
```

Supporting copy:

```text
Recommended. You can reopen this Markdown file later and continue.
```

## Export

```text
Export JSON
Export DOCX
Print / Save as PDF
```

Legacy JSON progress should remain loadable. Markdown is the main user-facing save/reopen format.

---

# 24. Values conceptual authority

Teach:

> **Values are compass directions, not destinations.**

Do not mechanically rewrite Values into verbs/adverbs.

Canonical noun/adjective labels can be correct, including Courage, Honesty, Compassion, Curiosity, Responsibility, Creativity, Connection, Acceptance, Authenticity, and Balance.

Conceptual model:

```text
LIFE DOMAIN
    Where in my life?

        ↓

VALUE / COMPASS DIRECTION
    What direction or quality matters?

        ↓

ONGOING PROCESS / PRACTICE
    How do I want to keep living this value?

        ↓

WHAT
    What could I work on, strengthen, change, repair, explore, or build?

        ↓

HOW
    What concrete action could move me that way?

        ↓

OPTIONAL SMART GOAL / MILESTONE
    Would structured goal-setting help?

        ↓

NEXT ACTION / CALENDAR COMMITMENT
    What am I actually going to do?
```

Process is primary. A formal goal is optional.

---

# 25. Values life-domain taxonomy — fixed

Preserve exactly:

1. Close Relationships, Family & Caregiving
2. Friendship & Social Connection
3. Work, Education & Contribution
4. Health, Self-Care & Vitality
5. Personal Growth, Character & Autonomy
6. Leisure, Creativity & Adventure
7. Community, Service & Environment
8. Spirituality, Meaning & Inner Life
9. Home, Resources, Security & Lifestyle

A domain answers:

```text
Where in my life?
```

A Value answers:

```text
What direction/quality matters?
```

Do not conflate them.

---

# 26. Values dictionary audit — implemented

Commit:

```text
4446d20 Complete Values to SMART Goal workflow redesign
```

Counts:

```text
starting canonical count: 256
resulting canonical count: 242
review-needed retained: 42
```

Removed:

```text
Perfection
```

Perfection is treated as a standard/endpoint/evaluative rule, with legacy migration support only if needed.

Moved to existing life-domain model:

- Health;
- Family;
- Friendship;
- Community;
- Spirituality.

Implemented high-confidence merges:

```text
Courage <- Bravery, Valor
Reliability <- Dependability
Adaptability <- Flexibility
Honesty <- Candor
Generosity <- Giving
Gratitude <- Thankfulness
Collaboration <- Teamwork
```

Audit artifacts:

```text
VALUES-DICTIONARY-REVIEW.md
data/values-dictionary-review.csv
```

Important distinctions intentionally retained include:

- Courage / Boldness / Fortitude;
- Reliability / Consistency;
- Honesty / Integrity / Ethics;
- Openness / Open-Mindedness;
- Compassion / Empathy / Kindness / Care;
- Responsibility / Accountability;
- Fairness / Equality / Justice;
- Curiosity / Learning / Knowledge / Wisdom / Mastery;
- Achievement / Excellence / Competence / Effectiveness;
- Connection / Intimacy.

Do not redo the dictionary audit during the next focused UX pass.

---

# 27. Values search and browse tiers

Merged vocabulary remains searchable as aliases.

Example:

```text
Bravery -> Courage
```

Search for `bravery` should still return Courage.

Browse sizes are derived from actual canonical count rather than forcing 256/All duplication.

Concept:

```text
16
32
64
128
<actual full count>
```

Search spans the whole canonical dictionary + aliases regardless of current tier.

---

# 28. Values saved-progress migration

Dictionary cleanup must not silently lose old selections.

Legacy IDs are migrated to canonical IDs and duplicate merged selections are deduplicated.

Custom Values remain untouched.

Removed/domain terms can remain as gracefully restored legacy vocabulary when required by old saves.

Do not casually change stable IDs.

---

# 29. Current Values flow

Current step order:

```text
DISCOVER
CATEGORIZE
ASSIGN
ASSESS
MISSION
ACT
BARRIERS
```

Mission was intentionally moved before Act.

The Categorize state bug was fixed so H/M/L selection rerenders/recomputes and Continue eligibility updates immediately without a Back workaround.

---

# 30. Raw Assessment attention score — keep

Formula:

```text
gap = desired - current
positive_gap = max(gap, 0)

High   = 3/3 = 1
Medium = 2/3
Low    = 1/3

attention_score = positive_gap × importance_weight
```

Examples:

```text
High gap 4:
4 × 3/3 = 4.00

Medium gap 4:
4 × 2/3 = 2.666... -> 2.67

Low gap 4:
4 × 1/3 = 1.333... -> 1.33
```

Use unrounded numbers for sorting.

Over-invested domains (`desired < current`) get zero positive score and are shown as possible rebalancing areas, not inherently bad areas. Balanced domains are described separately.

This score is a planning aid based on the user's answers, not a clinical measurement.

---

# 31. Relative Priority — latest requirement, pending correction

The verified code at `e0109ff` still used:

```text
relative = attention_score / maximum_attention_score × 100
```

The requirement changed.

Desired:

```text
total_positive_score = sum(all positive attention scores)

relative_priority =
attention_score / total_positive_score × 100
```

Thus positive-domain shares should total **100%**.

Example raw scores:

```text
4
2
1
```

Underlying shares:

```text
57.142857...
28.571428...
14.285714...
```

Displayed whole shares should use deterministic largest-remainder or equivalent:

```text
57%
29%
14%
```

Exactly:

```text
100%
```

Do not fake equal shares if all raw scores are zero.

---

# 32. Pending horizontal Relative Priority visualization

The user wants a Backgammon-Simplified-style compact horizontal segmented bar.

Requirements:

- entire bar = 100% positive Relative Priority;
- each positive-score domain gets a proportional segment;
- segment order uses the same shared domain ranking;
- legend below always shows domain + percentage;
- if a segment is too narrow, do not squeeze text inside;
- long labels belong in the legend;
- color cannot be the only identifier;
- accessible text/ARIA exposes equivalent information;
- mobile (~390px) does not horizontally overflow.

Before implementation, inspect Backgammon reference commit `6ce8831...` for a probability/distribution/segmented-bar pattern and reuse mechanics/design tokens if appropriate.

---

# 33. Pending Values navigation history

Current progress-step accessibility is based too strongly on current step.

Required model:

```text
state.step
```

= currently displayed step

and:

```text
state.furthestStep
```

(or equivalent)

= furthest successfully reached step.

Example:

```text
current: Categorize
furthest: Assess
```

Enabled:

```text
Discover
Categorize
Assign
Assess
```

Disabled:

```text
Mission
Act
Barriers
```

Going Back must not force the user to click Continue through already-visited steps again.

Persist this state in saved progress. Old saves missing it should migrate gracefully.

---

# 34. Pending step-scroll behavior

On actual step navigation through Continue, Back, or a progress-step button, bring the new step to the top of the usable viewport below the fixed navbar.

Use one shared helper, conceptually:

```text
navigateValuesStep(targetStep)
```

Responsibilities:

1. update step;
2. update furthestStep when advancing;
3. render;
4. restore sensible focus;
5. scroll new heading/start into view.

Do **not** scroll for ordinary rerenders caused by selecting H/M/L, typing, selecting What/How, or shortlist operations.

Respect `prefers-reduced-motion`.

---

# 35. Pending Assessment labels

Use:

```text
Current Score (1-10)
Desired Score (1-10)
```

Inputs remain `min=1`, `max=10`.

---

# 36. Mission architecture — latest requirement

Mission comes after Assessment and before Act.

It should prioritize **life-domain ranking first**, then Values within those domains.

Algorithm:

1. rank selected domains using the shared Assessment helper;
2. iterate domains in that order;
3. gather only Values assigned to that domain;
4. within each domain sort Values High -> Medium -> Low, then stable/name;
5. deduplicate Values assigned to multiple domains, crediting first occurrence to the higher-ranked domain;
6. use that ordering for Mission context/generation.

Do not gather top-domain Values and then globally reorder them in a way that destroys domain priority.

Suggested preview:

```text
Your highest-priority directions

Close Relationships — 42%
Connection, Compassion, Courage

Personal Growth — 31%
Curiosity, Learning
```

Then editable Mission text.

Manual edit persists. Only explicit Regenerate should replace it.

---

# 37. Act architecture — domain first

Order selected life domains using Assessment ranking.

Each domain should be an independent disclosure, normally:

```html
<details open>
```

Open by default.

Each domain should show:

- name;
- importance;
- Current -> Desired;
- Attention score;
- Relative Priority;
- Values actually assigned to that domain.

Do not show unrelated selected Values under a domain.

---

# 38. WHAT -> HOW model

**WHAT**:

```text
What could I work on / strengthen / repair / change / build / explore?
```

**HOW**:

```text
What concrete action could I take to start?
```

Example:

```text
WHAT:
Reconnect with an old relationship.

HOW:
Send one friend a simple message asking how they have been.
```

The What is not automatically a SMART goal. The How should be concrete.

---

# 39. Current Values action library

Data:

```text
site/data/skill-apps/values-actions.json
```

Current reported counts:

```text
9 domains
135 Whats
2700 Hows
```

Major quality problem:

Many Whats have only a few specific Hows, then repeat generic filler such as setting a timer, removing friction, making a two-minute start, reserving fifteen minutes, setting a reminder, or breaking a task into steps.

Those may be useful execution aids but are not legitimate What-specific Hows.

---

# 40. Required What-specific How quality

Every How should answer:

> “How could I actually do THIS specific What?”

Example:

```text
WHAT:
Reconnect with an old relationship.
```

Appropriate specific Hows include actions like:

- text them asking how they have been;
- send a voice note;
- call them;
- invite them for coffee;
- invite them for lunch;
- ask them to walk;
- send a shared photo/memory;
- send a song/article/meme that reminded you of them;
- write a short email;
- send a card;
- if appropriate, offer a small thoughtful gift;
- invite them to a shared activity;
- suggest a video call;
- offer a low-pressure specific date;
- acknowledge that it has been a while;
- invite them to a group event;
- ask about something important in their life;
- offer two possible dates/times;
- mutually set a recurring call;
- after reconnecting once, suggest another small contact.

The required standard is this **level of specificity**, not exact reuse of this list.

Audit all 135 Whats.

Quality wins over a forced count. If a What has fewer than 20 genuinely useful Hows, do not pad it with filler merely to support “Another 10.”

---

# 41. Generic execution aids — separate concept

Generic support ideas may remain in an optional secondary helper, for example:

```text
Make this easier to start
```

Examples:

- set a reminder;
- reduce friction;
- prepare materials;
- make a two-minute version;
- schedule a block;
- ask for support.

Hierarchy should remain:

```text
What
  ↓
specific How
  ↓
optional implementation support
```

Do not count generic supports as What-specific Hows.

---

# 42. What selection must drive How pool

When What changes:

- immediately load only that What's Hows;
- clear stale active How selection if it does not belong to the new What;
- retain already-added shortlist items.

The suggestion UI shows about ten at a time and may support:

```text
Another 10 ideas
Another 10 ways to start
```

Use deterministic/session-seeded ordering so tests are stable.

When strong options are exhausted, hide/disable further paging rather than showing filler.

---

# 43. Short-term valued-action list

Allow multiple shortlist items.

Each item retains:

- domain;
- relevant assigned Values;
- What;
- How;
- suggestion IDs when useful;
- custom/suggested provenance when useful internally.

Display concept:

```text
My short-term valued-action list
```

One shortlist item at a time can be selected for SMART Goal Builder. Other items remain saved for later.

---

# 44. Return / reassess loop

Values should be reusable over time:

1. choose a handful of realistic actions;
2. try them;
3. save Values progress as `.md`;
4. return later;
5. open previous Markdown;
6. reassess domains/Values;
7. choose another action for SMART Goal Builder.

Do not imply user files are uploaded.

---

# 45. Values -> SMART Goal handoff architecture

Use same-origin transient local storage plus an opaque token.

Flow:

1. generate opaque random token;
2. save small prefill payload under token;
3. TTL about 10 minutes;
4. open:

```text
/skill-finder/goal-builder/?handoff=<opaque-token>
```

5. SMART Goal consumes payload;
6. delete payload after successful consumption;
7. keep personal answer text out of URL/history.

No backend is needed.

---

# 46. SMART Goal handoff mapping — latest requirement

**Prefill:**

```text
Direction / Value
Specific
```

Specific should come from the selected concrete How.

**Leave blank:**

```text
Measurable
Achievable
Relevant
Target date
Support
```

The user explicitly does **not** want Relevant auto-populated from Values.

It is acceptable to display separate context above the form:

```text
From your Values plan

Domain:
...

Values:
...

What:
...

How:
...
```

Context is not an answer to Relevant.

---

# 47. SMART Goal Builder architecture

Route:

```text
/skill-finder/goal-builder/
```

The tool now has a dedicated initializer because it needs Values handoff, calendar scheduling, ICS, Google Calendar, and GTD Markdown.

Core SMART concepts remain:

- Direction / Value;
- Specific;
- Measurable;
- Achievable;
- Relevant / Realistic;
- Time-Oriented;
- Smallest useful version;
- Support.

Keep compatibility with older saved Goal Builder progress.

---

# 48. Current SMART scheduling baseline

Remote commit before this README update:

```text
e0109ff Improve SMART Goal event scheduling controls
```

Improvements include:

- event/reminder date;
- start time;
- duration;
- date shortcuts;
- time shortcuts;
- duration shortcuts;
- browser timezone display;
- readiness/help copy;
- ICS action;
- Google Calendar action;
- flexible positive duration validation.

Touched files:

```text
site/assets/skill-apps.css
site/assets/skill-practice-apps.js
site/includes/bs-scripts.html
tests/test_values_redesign.py
tests/test_values_smart.js
```

The next pass should preserve and extend this work.

---

# 49. Deadline vs calendar commitment

Keep these separate.

## Target date / deadline

Example:

```text
Submit application by September 15.
```

Goal/task metadata. It does not automatically create a calendar event.

## Calendar commitment

Example:

```text
Call Sam Tuesday at 7 PM.
```

Belongs on a date/time calendar.

Google Calendar should remain the calendar authority rather than Therapy Skill Kit becoming a second full calendar database.

---

# 50. Pending recurring scheduling architecture

Add schedule type:

```text
One time
Recurring
```

Minimum recurrence patterns:

- Daily;
- Weekdays;
- Selected weekdays;
- Weekly.

If straightforward and robust, also support Monthly.

Support intervals:

```text
Repeat every N day(s)
Repeat every N week(s)
```

Selected weekdays:

```text
Mon Tue Wed Thu Fri Sat Sun
```

Ending:

- No end date;
- Until date;
- After N occurrences.

Do not force an end date for an ongoing practice.

---

# 51. Multiple times per day

A recurring action may happen several times per day.

Example:

```text
08:00
13:00
20:00
```

UI:

```text
Time 1 [08:00] [Remove]
Time 2 [13:00] [Remove]
Time 3 [20:00] [Remove]

[Add another time]
```

Do not hard-code exactly three. At least one time is required for a timed recurring commitment. Shared duration is acceptable if simpler.

---

# 52. Timezone / DST

Continue to show browser-local timezone, for example:

```text
America/Toronto
```

Recurring events should preserve intended local wall-clock time through daylight-saving changes wherever target formats support it.

A repeated 8:00 AM practice must not shift to 7:00 AM because the series was anchored to one fixed UTC offset.

Test across a DST boundary.

---

# 53. ICS architecture

One-time ICS requires valid VCALENDAR/VEVENT fields and correct text escaping.

For recurrence, use standards-compliant recurrence rules such as appropriate `RRULE` values.

For multiple daily times, a robust option is:

```text
one recurring VEVENT per daily time slot
```

with unique UIDs and identical recurrence cadence if that is more interoperable than an overly complex single recurrence.

Requirements:

- unique UID;
- correct local wall-clock behavior;
- correct duration;
- correct recurrence;
- no duplicate occurrences.

---

# 54. Google Calendar architecture

Do not add OAuth/backend/calendar API credentials for this static site flow.

Only after the user explicitly clicks:

```text
Add to Google Calendar
```

may event details be sent to Google via a prefilled event-creation page.

For recurrence:

- verify current supported event-template parameters;
- do not guess;
- if a recurrence can be faithfully prefilled, use it;
- if several daily time series cannot be represented as one reliable prefill, expose separate explicit buttons such as:

```text
Add 8:00 AM series
Add 1:00 PM series
Add 8:00 PM series
```

Never silently discard extra daily times.

---

# 55. Personal Planning / GTD architecture

Personal Planning treats canonical planning data as ordinary Markdown:

```text
tasks/*.md
```

with YAML front matter and readable Markdown body.

Conceptual record:

```yaml
---
record_version: 1
task_id: ...
title: ...
type: ...
state: ...
---
# Title

Notes...
```

Runtime parser/validator is authoritative.

The Therapy SMART Goal work reportedly validated a **dual-purpose Markdown** design:

1. Personal Planning-compatible YAML front matter;
2. readable SMART body;
3. hidden Therapy progress metadata comment.

This can make one `.md` both reloadable Therapy Skill Kit progress and valid GTD task Markdown.

Re-run runtime validation if structure changes.

---

# 56. GTD mapping decisions

Current intended mapping:

- task title = concrete Specific/How action, not abstract Value;
- target deadline -> `due_date` only if reference semantics validate;
- calendar commitment is not automatically written to `scheduled_date`;
- recurring calendar practice is not forced into GTD due/scheduled metadata;
- Google Calendar remains calendar authority;
- SMART context can remain in the body/hidden Therapy metadata.

Possible readable body fields:

- Life Domain;
- Values;
- Mission;
- What;
- How;
- Specific;
- Measurable;
- Achievable;
- Relevant;
- Target date;
- Smallest useful version;
- Support.

Do not invent unsupported front-matter fields.

---

# 57. Relevant Personal Planning architecture

Personal Planning has two complementary workflows over the same Markdown records.

Daily GTD:

```text
CAPTURE -> INBOX -> PROCESS / CLARIFY -> ORGANIZE -> DO / REVIEW
```

Planning graph:

```text
action -> action -> milestone
```

Important principles:

- Project membership differs from hierarchy;
- dependencies are directional;
- milestone is a Task with `milestone: true`;
- task deadline remains metadata;
- true date/time commitments belong on Calendar;
- Google Calendar should be calendar authority;
- ICS is a valid handoff boundary;
- do not create a second task/calendar system inside Therapy Skill Kit.

---

# 58. Next focused correction sprint

The next Codex pass should start from current remote `master` and make a **focused correction**, not a broad rewrite.

Do not redo:

- 242-value dictionary decision;
- semantic audit;
- Learn navigation;
- DBT/CBT/Mindfulness content;
- resource matching;
- OCR;
- glossary;
- unrelated Skill Finder tools;
- Personal Planning architecture.

Required work:

1. furthest-visited Values step navigation;
2. scroll-to-top on actual step transitions;
3. Current Score (1-10);
4. Desired Score (1-10);
5. Relative Priority as normalized shares totaling 100%;
6. exact deterministic whole-percent allocation totaling 100%;
7. Backgammon-style segmented priority bar + legend;
8. Mission: ranked domain first, then Values;
9. rewrite What-specific How library;
10. move generic execution aids out of primary How arrays;
11. leave SMART Relevant blank on handoff;
12. recurring scheduling;
13. selected weekdays;
14. recurrence interval/end rules;
15. multiple times/day;
16. DST-safe recurrence;
17. recurring ICS;
18. faithful Google Calendar recurrence behavior;
19. focused tests.

---

# 59. Navigation acceptance tests

Test:

```text
reach Assess
Back -> Assign
Back -> Categorize
Assign remains clickable
Assess remains clickable
click Assess
Assess opens
```

Also:

```text
reach Act
Back -> Assess
Mission remains clickable
Act remains clickable
```

Future unvisited steps stay disabled.

Save/restore:

```text
reach Assess
Back -> Categorize
save .md
reload
Categorize opens
Assign + Assess still clickable
```

---

# 60. Scroll acceptance tests

Continue Categorize -> Assign:

- Assign start/heading visible at top below fixed navbar.

Back Assess -> Assign:

- Assign visible at top.

Progress click -> Assess:

- Assess visible at top.

Ordinary selection/typing rerender:

- does not scroll unexpectedly.

Test desktop and about 390px.

---

# 61. Relative Priority acceptance tests

Raw scores remain:

```text
High gap 4 = 4
Medium gap 4 = 8/3
Low gap 4 = 4/3
```

Normalized share example:

```text
scores = 4, 2, 1
underlying = 57.142857..., 28.571428..., 14.285714...
display = 57%, 29%, 14%
sum = 100%
```

Also test:

- one positive domain = 100%;
- two equal = 50/50;
- zero-score domain = 0%;
- all-zero case has no fake distribution;
- every positive displayed set totals exactly 100%.

---

# 62. Priority bar acceptance tests

Verify:

- widths match underlying shares;
- segment order matches Assessment ranking;
- legend contains every positive domain;
- legend displayed percentages total 100;
- narrow segment text does not overflow;
- full meaning is available without color;
- 390px no page overflow.

---

# 63. Mission acceptance tests

Construct:

- Domain A highest priority;
- Domain B second;
- Value Z globally High but assigned only to B;
- Value X Medium but assigned to A.

Mission must place Domain A / Value X before Domain B / Value Z because domain priority is primary.

Within a domain:

```text
High -> Medium -> Low
```

Deduplicate one Value assigned to multiple domains.

Manual Mission edit persists; Regenerate explicitly replaces it.

---

# 64. What/How quality tests

Structural:

- every What owns its Hows;
- selecting new What changes How pool;
- stale How selection clears;
- shortlist remains.

Quality guard:

- detect excessive identical How reuse across unrelated Whats;
- report duplicate How text;
- report reuse counts;
- report parent Whats;
- widespread generic boilerplate should fail.

Manual review:

- at least 3 representative Whats in each of 9 domains;
- each displayed How must answer “How could I actually do this?”

---

# 65. SMART handoff acceptance tests

After Values handoff:

Prefilled:

```text
Direction
Specific
```

Blank:

```text
Measurable
Achievable
Relevant
Target date
Support
```

Context may display separately.

No personal text in URL. Opaque token only.

---

# 66. Recurrence acceptance tests

Test:

- one-time event;
- daily;
- weekdays;
- selected weekdays;
- weekly;
- interval;
- until date;
- occurrence count;
- one daily time;
- two daily times;
- three daily times;
- add/remove time;
- DST boundary in `America/Toronto`;
- valid recurring ICS;
- unique UIDs;
- no duplicate occurrences;
- Google request only after explicit click;
- Google handoff never silently loses extra times.

---

# 67. Relevant test files

Known relevant tests include:

```text
tests/test_values_module.py
tests/test_values_tiers.js
tests/test_skill_progress.js
tests/test_skill_progress.py
tests/test_skill_finder_apps.py
tests/test_practice_apps.py
tests/test_values_redesign.py
tests/test_values_smart.js
```

Inspect current files; names may evolve.

Always run:

```bash
git diff --check
```

Run focused tests before broad suites.

---

# 68. Known broad-suite noise

At the `4446d20` checkpoint:

- focused Values/progress/handoff/Goal/GTD tests passed;
- one unrelated Learn-sidebar assertion remained;
- broad suite contained many pre-existing Learn/Cube/publication failures;
- managed Quarto render was blocked by Windows child-process errors;
- Bash quick runner was blocked by Windows service denial.

Do not bundle unrelated test debt into a focused Values pass unless directly relevant.

---

# 69. Social-card backup

Earlier social-card changes were backed up at:

```text
C:\Users\andre\Documents\therapy-social-backup
```

Files included:

```text
site/assets/social/generated/.render-state.json
site/assets/social/generated/github-backgammon-simplified.png
site/assets/social/generated/social-default.png
site/assets/social/social-cards.yml
```

Do not restore automatically.

---

# 70. Historical wrong-remote incident

Therapy checkout previously pointed `origin` at Backgammon Simplified and accidentally pushed Therapy branch work there.

Accidental branch:

```text
therapy-skill-kit-v1
```

at:

```text
578ca8e
```

The fix was:

```text
origin -> therapyskillkit.github.io
backgammon-reference -> backgammonsimplified.github.io
```

Do not recreate this mistake.

Any cleanup of old accidental branches should be deliberate and separate from product work.

---

# 71. Working division of responsibility

## ChatGPT

- maintain architecture/context;
- design task boundaries;
- write detailed Codex prompts;
- review reports;
- verify remote commits;
- narrow next correction.

## Codex

- inspect repository;
- implement focused task;
- add tests;
- run feasible validation;
- commit;
- push non-force;
- report exact status.

## User / normal shell

- reconcile local Git when Codex sandbox cannot write `.git`;
- run final Quarto render;
- run local preview;
- manually evaluate UX/editorial quality;
- decide borderline content/editorial questions.

---

# 72. Common post-Codex reconciliation

If Codex pushes remotely but original local HEAD stays stale:

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

git fetch origin master

git status --short --branch
git rev-parse --short HEAD
git rev-parse --short origin/master
git diff --stat HEAD origin/master
```

If apparent local changes are exactly the remote commit and no independent work exists:

```bash
git reset --hard origin/master
git clean -fd
```

Then:

```bash
git status --short --branch
git log -3 --oneline
```

Do not assume reset is safe without checking first.

---

# 73. Example full local validation loop

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

git fetch origin master
git status --short --branch
git rev-parse --short HEAD
git rev-parse --short origin/master

export BS_SKIP_SOCIAL_CARDS=1

quarto render site
bash scripts/preview-site.sh 8766
```

Review:

```text
http://127.0.0.1:8766/skill-finder/values/
http://127.0.0.1:8766/skill-finder/goal-builder/
```

Then:

```bash
bash scripts/testing/quick.sh
git status --short --branch
```

---

# 74. Example focused commit loop

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

git status --short --branch
git diff --stat
git diff

git add -- \
  site/assets/skill-apps.js \
  site/assets/skill-apps.css \
  site/assets/skill-practice-apps.js \
  site/data/skill-apps/values-actions.json \
  tests/test_values_redesign.py \
  tests/test_values_smart.js

git diff --cached --stat
git diff --cached

git commit -m "Refine Values navigation priorities and action planning"
git push origin master

git status --short --branch
git log -3 --oneline
```

Adjust file list to actual changes.

---

# 75. Example read-only reference inspection

Backgammon:

```bash
git -C /c/Users/andre/Documents/backgammonsimplified.github.io \
  show 6ce883106715d42594a8013e3c31eb8f50aa5e73:site/assets/bs-components.css
```

Personal Planning:

```bash
git -C /c/Users/andre/Documents/personal-planning \
  show feature/gtd-core-pre-integration-20260822:docs/markdown-task-repository.md
```

Prefer read-only `git show` over switching a reference checkout's active branch.

---

# 76. Critical “do not” list

Do not:

- force push;
- push Therapy work to Backgammon Simplified;
- replace Quarto/QMD/build architecture;
- broadly rewrite Learn navigation;
- expose user answers in URL parameters;
- add backend/OAuth just for Google Calendar prefill;
- turn Therapy Skill Kit into a second GTD/calendar database;
- mechanically convert Values to verbs;
- target a convenient power-of-two Value count;
- reintroduce Perfection canonically;
- aggressively merge merely related Values;
- hide the attention-score formula;
- after the pending fix, allow positive Relative Priority display to total anything other than 100%;
- auto-fill SMART Relevant from Values;
- treat generic timers/reminders as What-specific Hows;
- silently discard old progress;
- claim tests/renders passed when they were blocked.

---

# 77. Immediate next-action checklist

Before the next Codex run:

1. reconcile local `master` with current `origin/master`;
2. verify the current remote baseline;
3. verify clean worktree;
4. verify SSH origin;
5. launch Codex with `therapy-nav`;
6. give it the focused Values navigation / priority / What-How / recurrence correction task;
7. require non-force commit/push;
8. independently verify resulting remote commit;
9. reconcile local checkout using normal Git Bash;
10. render and manually inspect Values + Goal Builder.

Preflight:

```bash
cd /c/Users/andre/Documents/therapy-skill-kit

git fetch origin master
git remote get-url origin
git branch --show-current
git rev-parse --short HEAD
git rev-parse --short origin/master
git status --short --branch
```

Desired:

```text
git@github.com:backgammonsimplified/therapyskillkit.github.io.git
master
HEAD == origin/master
clean
```

---

# 78. Suggested next Codex task

```text
PROJECT: Therapy Skill Kit
TASK: Focused Values navigation, normalized Relative Priority, specific What/How, and recurring SMART scheduling correction.
```

The task should explicitly preserve current `origin/master` and treat it as the baseline rather than expecting an older hard-coded commit.

---

# 79. Final architectural principle

Therapy Skill Kit is the **therapeutic learning + reflection + decision-support + valued-action layer**.

Backgammon Simplified is the **proven Quarto/UI/navigation implementation reference**.

Personal Planning is the **GTD/task/calendar-boundary architecture reference**.

Keep those responsibilities separate:

```text
Backgammon Simplified
    proven site mechanics/design
              ↓
Therapy Skill Kit
    learn + reflect + choose + plan valued action
              ↓
SMART Goal / Calendar / GTD handoff
              ↓
Personal Planning + Google Calendar
    execution/task/calendar authorities
```

That separation prevents architectural drift and keeps the system maintainable.

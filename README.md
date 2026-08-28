# Therapy Skill Kit

Therapy Skill Kit is a **Quarto-based learning site and local-first interactive skills toolkit** focused on DBT, CBT, mindfulness, goal setting, wellness, emotional regulation, distress tolerance, interpersonal effectiveness, and valued action.

This repository is also the durable implementation handoff for the project. The documentation below is intentionally detailed so a future ChatGPT/Codex session can safely continue if conversation context is lost.

> **Git is authoritative.** Always verify the current branch, remote, HEAD, and worktree before acting. This README records architecture, operating procedures, major decisions, and the latest known implementation plan, but it should not override the actual repository state.

**Last major context update:** 2026-08-24.

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
git ls-remote origin refs/heads/master
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

The SHA returned by `git ls-remote origin refs/heads/master` at the start of a run is the authoritative baseline. Do not require an older hard-coded starting SHA.

In a managed Windows Codex run, a dirty `git status` is not automatically evidence of user work because the checkout's index can be stale. For every reported tracked modification:

1. obtain current authoritative remote `master` in a disposable clean clone or equivalent read-only comparison environment;
2. compare the actual working-tree file bytes with the corresponding remote-master file bytes;
3. treat byte-identical reported modifications as **CLEAN-EQUIVALENT** and continue;
4. **STOP** if any reported tracked file differs byte-for-byte, because it may be genuine user work.

Known ignored Codex artifacts under `tmp/` do not by themselves make the checkout dirty. Unexpected non-ignored/untracked files still require inspection.

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

## Canonical managed-workspace launch

```powershell
$REPO = "$HOME\Documents\therapy-skill-kit"
$IMPLEMENTATION_GIT_DIR = (git -C "$REPO" rev-parse --absolute-git-dir).Trim()

Set-Location "$REPO"

codex `
  --ask-for-approval never `
  --sandbox workspace-write `
  -c sandbox_workspace_write.network_access=true `
  --add-dir "$IMPLEMENTATION_GIT_DIR" `
  --add-dir "$HOME\scratch"
```

Then paste the focused Codex task prompt.

This explicit launch is preferred over the older profile-based method. It gives
the session the repository, the repository's actual Git metadata directory, and
the scratch workspace without depending on a machine-specific profile name.

## Historical profile intent

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

The profile examples above are retained only as historical context. Use the
canonical managed-workspace command unless the Codex CLI itself requires an
updated equivalent.

---

# 8. Windows Codex sandbox caveat

Managed Codex Windows sessions have repeatedly failed to write the original checkout's `.git` metadata even when permissions theoretically allow it.

Observed pattern:

- lock/ref writes denied;
- original local HEAD remains stale;
- working-tree files appear modified;
- Codex may commit/push successfully from a disposable clone or isolated Git metadata;
- normal interactive Git Bash can later reconcile the original checkout.

Managed-ACL operating procedure:

1. establish authoritative remote `master` with `git ls-remote origin refs/heads/master`;
2. when status reports tracked changes, compare working-tree bytes to that remote tree instead of trusting a possibly stale local index;
3. byte-identical tracked files mean **CLEAN-EQUIVALENT**; report the condition and continue;
4. real byte differences mean **STOP**; do not overwrite possible user work;
5. try normal Git writes first, but do not fight repeated index/ref/lock denial;
6. if necessary, implement/test in the original working tree, copy only intended changed files into a disposable clean clone based on the exact starting remote SHA, and commit there;
7. immediately before pushing, run `git ls-remote origin refs/heads/master` again and preserve any concurrent commits;
8. push non-force only, verify the resulting remote SHA independently, and distinguish the stale main-checkout HEAD from authoritative remote HEAD in the handoff.

Never force push or reset the original checkout merely to repair a sandbox ACL problem.

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

# 31. Relative Priority — implemented

The shared Assessment ranking uses:

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

# 32. Horizontal Relative Priority visualization — implemented

Mission and Assessment reuse a compact horizontal segmented bar driven by the shared ranking data.

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

No separate priority formula or duplicated stored percentage exists.

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

# 36. Mission architecture — implemented

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

The rendered Mission information architecture is:

```text
Mission
    Priorities
    horizontal Relative Priority bar
    View calculation details (native disclosure, closed by default)
    My values map
    Mission statement
```

The calculation disclosure contains every selected life domain's H/M/L importance, Current Score, Desired Score, signed/positive gap, raw Attention Score, normalized Relative Priority, and the single shared formula explanation. Positive displayed shares total 100%; all-zero inputs remain truthful at 0%.

The map is derived view state and is not added to saved-progress schemas:

```text
You
  -> selected Life Domains (circle area sized by normalized Relative Priority)
       -> assigned Values revealed for each expanded domain
```

The Values map is an interactive force graph. Its initial focused view contains only `You` and every selected life domain; no Value nodes are visible until a domain is activated. Clicking a domain, or focusing it and pressing Enter/Space, independently expands or collapses that domain's assigned Values. Several domains can remain expanded at once.

Life-domain circle area continues to encode the shared normalized Relative Priority calculation, including a visible minimum size and truthful `0%` for zero-score domains. Domain colors use the same nine identities as the segmented priority bar. Value circle size encodes existing H/M/L importance (High largest, Medium middle, Low smallest), and spring target distance communicates the same rating (High closest, Medium middle, Low furthest). Text labels and the assistive relationship list state the ratings explicitly, so size, color, and distance are not the only representations.

A Value assigned to several domains is rendered as a separate derived visual node under every assigned domain. Those nodes retain the same underlying Value identity; assignments and saved state are not duplicated. Physics coordinates, velocity, camera transform, and open branches are transient view state and are not persisted.

The graph supports background pan, wheel/trackpad/pinch zoom, elastic node drag, visible-node Fit, and a Reset camera action that returns to the initial `You` + life-domain framing without closing expanded branches. D3's focused `force`, `selection`, `drag`, and `zoom` modules are vendored locally in `site/assets/d3-values-force.min.js`; there is no runtime CDN or other network dependency. `site/assets/therapy-force-graph.js` holds small reusable viewport, camera, drag, simulation reheat/settle, and reduced-motion primitives. These lightweight primitives are intended for the later Emotion Explorer graph and constrained Worry Tree / Change Emotion / Missing Links tools, without putting those tools' domain logic into Values.

The D3 subset is built locally from `d3-force@3.0.0`, `d3-selection@3.0.0`, `d3-drag@3.0.0`, and `d3-zoom@3.0.0`; its ISC notice is recorded in `LICENSES/D3-ISC.txt` and `THIRD_PARTY_NOTICES.md`. Quarto explicitly copies both graph assets so rendered Values remains self-contained and works offline.

The generated Mission text remains editable. Manual edits persist. Only explicit Regenerate replaces a manual draft; opening or closing either disclosure does not regenerate it.

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

Assigned Values are now a nested native disclosure labelled `Values for this domain (N)`. It is closed by default inside the normally open outer domain disclosure, keeping What/How work prominent. Toggling it does not rerender or change selected What/How, custom text, paging, actioned state, or shortlist state. Domains with no assignments show a non-blocking return-to-Assign note inside the disclosure.

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
- Can we simplify the goal? (stored as `smallest` for compatibility);
- Possible barrier;
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
tests/test_values_mission_map.js
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
- Simplified goal (`smallest` in saved data);
- Possible barrier;
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

# 58. Historical focused correction sprint — implemented

The navigation, normalized priority, What/How, and recurring scheduling correction described below is an implemented historical checkpoint, not the next task. Future passes should start from current remote `master` and preserve this architecture.

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

Implemented scope:

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
- allow positive Relative Priority display to total anything other than 100%;
- auto-fill SMART Relevant from Values;
- treat generic timers/reminders as What-specific Hows;
- silently discard old progress;
- claim tests/renders passed when they were blocked.

---

# 77. Current ACL-aware run checklist

Before the next Codex run:

1. reconcile local `master` with current `origin/master`;
2. verify the current remote baseline;
3. verify clean worktree;
4. verify SSH origin;
5. launch Codex with `therapy-nav`;
6. compare tracked working-tree bytes to authoritative remote bytes if managed ACLs make status unreliable;
7. require non-force commit/push;
8. independently verify resulting remote commit;
9. if the main checkout cannot write Git metadata, distinguish its local HEAD/status from the verified remote result;
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

# 78. Completed focused Values checkpoint

```text
PROJECT: Therapy Skill Kit
IMPLEMENTED: Values navigation, normalized Relative Priority, specific What/How, recurring SMART scheduling, Mission values map, and compact Act assigned-Values context.
```

The next task should explicitly preserve current `origin/master` and treat it as the baseline rather than expecting an older hard-coded commit.

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

---

# 80. Resource paraphrase and worksheet pipeline

The published Handouts, Worksheets, Practice Materials, and Reference Materials
now share one data-driven pipeline. It preserves the printable source while
adding project-authored adapted text, structured worksheet fields,
guided-reflection guidance, local progress, review controls, and reproducible
blank downloads. It does not create a second SPA or a backend.

## Canonical data and classification

`data/resource-paraphrases.json` is the canonical, stably ordered corpus. Its
records reuse the existing resource IDs and source/lesson mappings. Each record
contains source identity and hashes, title, informational/interactive/mixed
classification, plain-language blocks, deterministic field IDs, page-specific
guided-reflection data, specialized-tool mapping, export metadata, QA flags,
and review state. The schema is `data/resource-paraphrase.schema.json`.

The generator derives the current published set from repository inventory and
QMD resource extraction rather than a hard-coded count. Classification combines
the source's structural cues and semantic prompt language; blank lines alone do
not create fields. Poor or ambiguous extraction is kept in the complete review
queue with `review_needed` and source-uncertainty notes. It is never filled in by
guessing.

Stable worksheet field IDs use `<resource-id>-qNN`, with stable subordinate IDs
for structured content. Source hashes detect changed extraction. Generator
updates do not replace author-edited or approved content: the canonical record's
review provenance remains authoritative and a changed source is flagged for a
new review.

The maintainable audit outputs are:

- `data/resource-paraphrase-inventory.csv` — full classification and source audit;
- `data/resource-paraphrase-review.csv` — compact spreadsheet review queue;
- `data/resource-tool-mapping.csv` — explicit resource-to-Skill-Finder relationships;
- `RESOURCE-PARAPHRASE-REVIEW.md` — durable counts, QA totals, and exact flagged IDs.

## Publication gate and resource panes

Normal builds write only approved/published records to
`site/data/resource-paraphrases/index.json`. Draft and review-needed records show
the existing printable source only. Approved informational records can show a
Text version; approved interactive/mixed records can additionally show the
Interactive worksheet, blank downloads, and guided-reflection controls.
Unapproved text is therefore absent from the normal public data asset and from
public search indexing.

`?review=1` is an explicit local authoring override. A review build writes the
gitignored `site/data/resource-paraphrases/review.json`; the dedicated authoring
application at `/review/resource-paraphrases.html?review=1` loads it. This route
uses its own namespaced full-viewport shell rather than the public navbar,
sidebars, article width, title block, or footer. It renders only the compact
266-record queue and current record, with independent Source and Adapted version
scrolling, a draggable desktop split, and Queue/Source/Adapted tabs on narrow
screens. The sticky toolbar supplies search; section, classification, status,
QA, and specialized-tool filters; counts; previous/next; Approve, Approve &
next, and Needs changes & next; save state; and review JSON export.

Source page/text tabs and source fit/zoom controls keep the handout readable in
place. Accessible Text, Worksheet, Guided reflection, and Metadata / QA tabs
provide direct editing of titles, blocks, worksheet labels/help/choices,
guidance, review notes, and status. Review terminology is Source, Adapted
version, Adapted text, Worksheet, Guided reflection, Review status, Not
reviewed, Needs changes, and Approved. Public terminology is Text version,
Interactive worksheet, Printable source, Download worksheet (PDF/DOCX), and
Guided reflection prompt.

Review edits stay in browser storage until the author exports inspectable JSON.
The apply script validates schema and inventory version, refuses unknown or
mismatched IDs, supports dry-run, creates a canonical JSON backup, reports every
changed resource, and does not approve untouched drafts.

## Interactive worksheets and local progress

`site/assets/resource-paraphrases.js` attaches panes to existing resource markup
by stable resource ID. Fields use labels, fieldsets, native keyboard controls,
accessible tables/scales, and mobile stacking. Structured controls cover text,
long reflection, checklists/multi-select, ratings, dates/times, planning fields,
tables, and repeating rows. Exact numeric ranges in source-backed rating fields
are retained. No invented clinical scoring is added.

Resource forms register as dynamic `resource-<resource-id>` tools in the shared
`site/assets/skill-progress.js` framework. Answers remain browser-local and use
stable field IDs. Save progress produces readable Markdown with embedded
structured metadata; reopening validates the resource and uses the existing
wrong-tool handoff instead of silently applying unrelated answers. JSON export,
clear-this-worksheet, completion counting, filled DOCX export, and browser
Print/Save as PDF are local operations. Answers never appear in URLs or static
download links.

Where a page is the source for a specialized Skill Finder experience, the
canonical mapping links to the current tool instead of introducing a competing
progress state. The page-level adapted version still remains reviewable.

## Guided reflection and privacy

`data/resource-guided-reflection-base.json` contains the shared safety and style
contract. Each interactive record adds page-specific purpose, question order,
optional probes, branches/scales where present, and relevant user-owned summary
sections. The constructed prompt tells an external assistant to work one primary
question at a time, accept skip/back/summarize/stop, avoid diagnosis or pressure,
preserve the person's wording, stay within the worksheet, and label the result
`Draft summary for me to review`.

`Copy guide prompt` never includes answers. The separate
`Copy guide prompt + my responses` action explains that current responses will
be placed on the clipboard. Neither action calls an API or transmits anything;
the person chooses whether and where to paste.

## Blank and filled exports

`scripts/generate-resource-exports.py` deterministically renders canonical
approved interactive worksheets to blank DOCX and PDF files in
`site/assets/paraphrased-resources/`. The blank documents contain paraphrased
instructions/prompts and response space, not source scans. DOCX uses readable
OOXML headings, tables, checkbox symbols, and response space. PDF uses Letter
pages, readable margins/type, tables and lines, and source/adaptation notes.

The artifact manifest hashes canonical worksheet content plus a template
version, so `--changed` skips unchanged outputs and `--all` performs explicit
full regeneration. Draft artifact QA uses `--include-drafts` with an output path
outside the public site. Public pre-render generation never includes drafts.
Filled DOCX and Print/Save as PDF are produced locally from the person's current
responses and are clearly separated from blank-download actions.

## Author workflow

Run these commands from the repository root:

```powershell
# 1. Update/inspect inventory and canonical drafts without replacing reviewed text.
python scripts/generate-resource-paraphrases.py --dry-run
python scripts/generate-resource-paraphrases.py --update
python scripts/generate-resource-paraphrases.py --validate

# 2. Build the local-only review payload, then render/preview the review route.
python scripts/build-resource-paraphrase-assets.py --review
$env:TSK_RESOURCE_REVIEW = "1"
quarto render site
# Open /review/resource-paraphrases.html?review=1

# 3. Export review JSON in the dashboard, validate it, and apply it.
python scripts/apply-resource-paraphrase-review.py --dry-run review.json
python scripts/apply-resource-paraphrase-review.py --apply review.json

# 4. Validate and generate approved blank artifacts incrementally.
python scripts/generate-resource-paraphrases.py --validate --check-artifacts
python scripts/generate-resource-exports.py --changed
# Use --all only for an intentional full artifact rebuild.

# 5. Remove the review-only payload, build production-gated assets, render, test.
Remove-Item Env:TSK_RESOURCE_REVIEW -ErrorAction SilentlyContinue
python scripts/build-resource-paraphrase-assets.py
quarto render site
python -m unittest tests.test_resource_paraphrases
node tests/test_resource_paraphrases.js
node tests/test_skill_progress.js
```

The standard `scripts/bs_pre_render.py` hook performs changed approved-export
generation and public asset gating. It creates the review payload only when
`TSK_RESOURCE_REVIEW=1` is explicitly set.

## QA and maintenance rules

Corpus validation requires one canonical record per published resource, unique
resource/field IDs, resolvable source references, fields and prompts for every
interactive record, and export metadata/artifacts for approved interactive
records. Similarity QA flags long shared strings and close n-grams as editorial
signals, while allowing canonical skill names. Completeness QA compares headings,
steps, questions, tables, choices, branches, and scale cues. Question/prompt/field
counts and documented exceptions are available in the audit data.

All canonical output is stably ordered, IDs and filenames are deterministic, and
one page failure is reported without aborting the remaining corpus. Generated
review drafts are not approvals. The author reviews the source comparison,
corrects uncertain extraction and meaning, and explicitly changes status before
anything becomes publicly visible.

---

# 81. Full-screen authoring and Skill Finder interaction architecture

The 2026-08-24 implementation pass completed the next major authoring and Skill
Finder redesign while retaining Quarto, QMD lessons, stable routes/resource IDs,
the single Skill Progress system, local privacy, Markdown save/reopen, and legacy
JSON migration paths.

## Shared force-network and constrained-tree family

`site/assets/therapy-force-graph.js` remains the small shared interaction layer.
Force-network consumers are Values and Emotion Explorer. Constrained-tree
consumers are Change Emotion, Worry Tree, and Missing Links. Both families share
pan, zoom, node drag, elastic reheating, Fit, Reset, native Fullscreen API with a
fixed full-window fallback, ESC exit, reduced-motion handling, and accessible
toolbar/node labels. The tree helper adds level/lane attraction, directional
edges, current/visited/future states, highlighted chosen paths, branch revision,
and a separate active-node editor so personal text never sits in SVG nodes.

Values now gives the central You node a stronger network-wide drag response,
large +/− domain badges, and fullscreen. Activating a Value opens a contextual
WHAT → HOW panel backed only by `values-actions.json`; adding an item writes to
the existing Act shortlist, and Go to Act uses the existing Values step/domain
state rather than parallel storage.

## Skill Finder tools completed in this pass

- Skill Thermometer keeps its four source states, uses accessible red, amber,
  green, and blue families, and expands compact categorized skill summaries
  directly under the selected zone.
- Emotion Explorer renders You plus all ten source emotions as a force network.
  Each emotion has a distinct data-owned colour and definition, a prominent
  +/− descriptor branch, removable selected-word chips, a source-backed Learn
  route, and a session-only handoff to Change Emotion without free text in URLs.
- Ten Learn pages live under
  `site/learn/emotion-regulation/emotions/`. They are transcribed from Emotion
  Regulation Handout 6 and cross-link Emotion Explorer, Change Emotion, Check
  the Facts, Opposite Action, and Mindfulness of Current Emotions. Handouts 8,
  8A, 9, 11, 13, and 22 supply the related decision and skill context.
- Change Emotion uses the exact Handout 9 yes/no branches, a local Handout 8
  Check the Facts editor, Handout 8A fit-facts context, and source-defined leaves
  for mindful observation/action, problem solving, changing thoughts, and
  opposite action.
- Worry Tree separates actionable and hypothetical/outside-control branches.
  Later actions and optional worry time use the shared calendar, and outcomes
  link to Worry Time, Understanding Worry, problem solving, grounding,
  mindfulness, and the Skill Thermometer.
- Pleasant Event Planner preserves all 225 Handout 16 activities in a dense
  searchable/filterable grid, supports a custom activity, and schedules once or
  recurrently. Browse categories are explicitly described as aids derived from
  the source list, not source headings.
- Behavioural Activation reuses a curated subset of that same 225-item source
  library, permits a custom activity, and supports one-time or recurring plans.
- Behaviour Chain follows the scanned three-page worksheet directly: problem
  behaviour, prompting event, source vulnerability checklist, fixed link types,
  short/long pros and cons, solution analysis, harm/repair, three committed
  skills, and helpfulness rating. Legacy generic-link state migrates into the
  source fields when reopened.
- Missing Links follows General Worksheet 3 in order. Each No branch records its
  own source follow-up and problem-solving response before the correct stopping
  leaf; Yes advances through knowing, willingness, remembering, and immediate
  action. It uses the shared constrained tree and shared progress system.
- Values Review adds an optional reusable schedule/cadence editor and ends with
  Revisit my Values plan.
- SMART Goal Builder displays “Can we simplify the goal?”, the requested smaller
  action help text, a separate barrier prompt, and the existing follow-through
  support prompt. The stored `smallest` and `support` keys remain; `barrier` is
  additive, and validation/normalization accepts older saved progress. Existing
  recurrence, GTD Markdown, and Values handoff behaviour remains intact.

## Shared calendar

`site/assets/therapy-calendar.js` is the browser-local calendar authority used
by SMART Goal, Worry Tree, Pleasant Event, Behavioural Activation, and Values
Review. It owns one-time/recurring state, dates, times, positive duration,
weekdays, repeat interval, end rules, local timezone, ICS creation, and Google
Calendar URLs. No network request or OAuth occurs when editing; Google Calendar
opens only from an explicit click, and ICS is generated locally. SMART Goal's
existing UI and save/GTD schema delegate calculations to this helper to preserve
recurrence compatibility.

## Source-pipeline integration and publication

The specialized-tool relationships already present in
`data/resource-paraphrases.json` remain canonical: Worry Tree, Handout 9,
Pleasant Events 1–3, Behaviour Chain pages 1–3, Missing Links, SMART Goal, and
Behavioural Activation source records point at their tool routes. Tools read the
verified source or shared source data rather than publishing review-needed
adapted text. General resource publication gating is unchanged. The generator's
repeated opening language is now “adapted text” or “adapted worksheet”; review
status continues to carry the unapproved state without putting “draft” into
every content heading.

---

# 82. Dedicated Skill Finder workspace and focused tools

The 2026-08-24 workspace pass keeps the Quarto site and its existing Learn,
progress, force-graph, and calendar authorities. It does not introduce a second
application shell or client framework.

## Large constrained-tree workspaces

Change Emotion, Worry Tree, and Missing Links use one responsive workspace in
`site/assets/skill-apps.css` and the shared constrained-tree implementation in
`site/assets/skill-finder-apps.js`. On desktop the graph receives most of the
available page width and a viewport-relative height while the active question,
reflection fields, and contextual actions live in a docked side panel. At narrow
widths the graph remains full width and the editor stacks below it. The outer
generic card treatment is suppressed for these three routes so the graph is not
nested inside several decorative panes. Pan, zoom, drag, Fit, Reset, keyboard
activation, coherent levels, path emphasis, reduced motion, and fullscreen stay
available. Source handout links opened from an active tool use a new tab; ordinary
same-site Learn navigation is unchanged.

Missing Links continues to follow General Worksheet 3 exactly: know, willing,
remember, then the direct question about what prevented immediate action. The
last worksheet prompt is intentionally not converted into an invented yes/no
question. Change Emotion continues to use Emotion Regulation Handouts 8, 8A, 9,
12, and 22. Worry Tree retains its recognizable actionable versus hypothetical
structure and delegates Later and Worry Time scheduling to the shared calendar.

## Dedicated focused-tool routes

`site/assets/skill-quick-tools.js` is the small initializer/state layer for these
new Quarto routes:

- `/skill-finder/five-factor-model/` — the CBT Five Factor source terminology:
  event or trigger, thoughts, emotions, body sensations, and behaviours;
- `/skill-finder/thinking-traps/` — the authored twelve-category Thinking Traps
  lesson, with a session-only handoff to Thought Record;
- `/skill-finder/thought-record/` — one tool spanning the existing Thought Record
  Part 1 and Part 2 fields;
- `/skill-finder/worry-time/` — the Understanding Worry/Worry Time curriculum,
  with optional calendar scheduling;
- `/skill-finder/box-breathing/` — a configurable four-phase visual timer based
  on the curriculum's named Box Breathing practice;
- `/skill-finder/gratitude-journal/` — a minimal structured journal based on the
  curriculum's named Gratitude Journaling practice;
- `/skill-finder/positive-self-talk/` — fair, believable alternative self-talk
  using the site's evidence and best-friend CBT framing;
- `/skill-finder/grounding/` — an in-the-moment sensory, body, and environment
  progression based on the available Grounding material.

The source only names, rather than fully scripts, Box Breathing and Gratitude
Journaling, and it does not specify a numbered sensory grounding sequence. The
tools disclose that narrow authority and do not attribute timer defaults,
journal prompts, or an invented 5-4-3-2-1 sequence to a worksheet. Personal text
passes from Thinking Traps to Thought Record through `sessionStorage`, never a
query string. Every tool registers with `TherapySkillProgress`, so browser-local
autosave, manual reopen, Markdown/JSON compatibility, DOCX, and print stay in the
single shared progress system.

## Values, Thermometer, calendar, and progress refinements

The Values Mission map now assigns the nine fixed life domains deterministic
ring slots around central You. Relative Priority still changes domain size.
Expanded Values use deterministic local satellite targets around their owning
domain, so one expansion does not rearrange the entire ring and several domains
can remain open. Physics coordinates remain transient. Values Act also mounts
the existing `TherapyCalendar` inline for an already-defined concrete action;
the SMART Goal handoff remains available for elaboration.

The Skill Thermometer still exposes the source guideline's four states directly
under their selected section. Its data distinguishes original Skills Use
Guideline recommendations from broader Therapy Skill Kit curriculum navigation.
The expanded set includes the focused CBT, worry, breathing, journaling,
self-talk, grounding, and activation tools, and every recommendation opens its
audited specific destination in a new tab.

`site/assets/therapy-calendar.js` remains the only scheduling implementation.
Its consumers now include SMART Goal, Worry Tree, Worry Time, Pleasant Event,
Behavioural Activation, Values, and Values Review. Local wall-clock/DST handling,
ICS generation, recurrence support where exposed, and explicit-click Google
Calendar navigation remain centralized. Behavioural Activation now uses the
progress adapter's per-tool `showDraftPrompt: false` option; autosave, Open
previous progress, manual restoration, and exports remain enabled.

Focused coverage is in `tests/test_dedicated_skill_tools.py`,
`tests/test_quick_tools.js`, `tests/test_skill_finder_apps.py`,
`tests/test_values_mission_map.js`, `tests/test_values_redesign.py`, and
`tests/test_practice_apps.py`, alongside the existing progress, calendar, Values,
and Skill Finder suites. Managed Windows may still report the documented Quarto
`Invalid handle` child-process failure; record that exact result rather than
changing the static architecture to accommodate the sandbox.

---

# 83. Browser-QA correction architecture

The 2026-08-27 manual-QA pass supersedes the graph-dominant interaction described
above without removing its implementation history. Change Emotion, Worry Tree,
and Missing Links now use the shared `ConstrainedTreeEngine` in
`site/assets/skill-finder-apps.js` as a vertical guided worksheet: the current
question is large, completed questions and answers remain above it, and changing
an earlier answer removes incompatible downstream answers. A compact
top-to-bottom roadmap remains secondary and can be hidden to give the worksheet
the full width. Grounding remains the reference interaction and was not changed
into a graph tool.

## Source-backed additions

- `/skill-finder/case-map/` follows the six-part Case Map in the Goal Setting
  source: Behaviours; Body and physical concerns; Thoughts; Emotions;
  Environmental stressors; and Strengths and resources. It is explicitly
  distinct from the situation-focused Five Factor Model and uses shared
  progress/export.
- `/learn/emotion-regulation/examples-emotions-fit-facts.html` is the readable
  Handout 8A reference. Change Emotion and Check the Facts link to it and to the
  printable PDF; PDF links from interactive tools open safely in a new tab.
## Tool state and export changes

Pleasant Event Planner stores three ordered personal lists (`now`, `worked`, and
`try`) in its existing progress record. Source and custom activities can be
added, removed, or moved in any list; Surprise Me updates the same selected
activity state as a manual selection, and scheduling stays optional.

Values retains the stable domain ring and local satellites. Each derived Value
node also grows by a capped amount based on the number of assigned life domains.
The selected Value panel displays the Value, domain, current importance, and
assignment count. “Mark important” maps to the existing underlying Value's High
importance rating, so no parallel importance state was introduced.

Thought Record loads the same ten emotion families as Emotion Explorer and
stores intensity, notes/sensations, and optional after-rating for each. It also
stores an ordered list of automatic thoughts plus either a selected or custom
hot thought, while retaining the CBT 3/CBT 4 evidence, thinking-trap, balanced
thought, belief, and re-rating progression. Its readable, Markdown, DOCX, and
print exports are all driven by that complete shared summary. Gratitude Journal
similarly includes every populated date, gratitude item, and reflection in its
shared summary.

The interactive DEAR MAN route now renders only Describe, Express, Assert,
Reinforce, Mindful, Appear Confident, and Negotiate. Older saved GIVE/FAST keys
are accepted during validation and ignored during rendering/export; educational
GIVE and FAST Learn pages are unchanged. Behavioural Activation removes
horseback riding from its recommendation subset and combines the existing source
list with ordinary low-barrier micro-activities across self-care, home,
movement, connection, pleasure, accomplishment, outdoors, and routine. Custom,
one-time, recurring, and shared-calendar behaviour remains.

## Per-tool progress controls and print

`TherapySkillProgress.registerTool` now accepts the backward-compatible
`showOpenPreviousProgress: false` option. Skill Thermometer and Positive
Self-Talk use it to suppress the intrusive visible opener while retaining the
same autosave and export authority. Behavioural Activation retains
`showDraftPrompt: false` and browser autosave. No progress component was forked.

Five Factor browser printing uses live HTML textareas and a dedicated CSS print
layout; it does not rasterize the worksheet. Box Breathing permits either hold
to be zero and skips zero-length phases while retaining start, pause, reset, and
reduced-motion support. The safety guidance beside its timing controls is part
of the tool surface.

---

# 84. The DIME Game

`/skill-finder/dime-game/` implements the Interpersonal Effectiveness Worksheet
6 / Handout 8 decision tool as **The DIME Game: Determining Intensity in Asking
or Saying No**. It uses the shared guided vertical tree: the current question is
large, completed questions and their Yes/No answers remain visible, earlier
answers can be revised, and the compact roadmap is secondary and collapsible.

The two modes use the source's ten factors. In Asking mode, each Yes earns one
dime. In Saying-No mode, each No earns one dime, including the source-supported
Timing interpretation. The total runs from 0 to 10 dimes, displayed through the
DIME metaphor as $0.00 to $1.00; a higher total means greater suggested response
intensity. Handout 8 supplies the exact 1–10 Asking and Saying-No response table.
Because that table begins at 1, the 0-dime result is explicitly presented as a
neutral low-intensity descriptor rather than an invented exact DBT instruction.

The tool uses the existing `TherapySkillProgress` authority. Mode, situation,
and all ten answers are stored; score, dollar display, and guidance are derived
from those answers for browser autosave, Markdown/JSON reopen, readable export,
DOCX, and print. Printable Handout 8 links open in a new tab.

The Five Factor Model's live-HTML browser worksheet and print layout remain
crisp. The original source scan quality is intentionally unchanged pending a
replacement source from the user.

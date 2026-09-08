# Repository consolidation - 2026-09-08

Canonical repository: C:/Users/andre/Documents/therapy-skill-kit. Final branch: development, tracking origin/development. Fetched baseline: 7a4127eb37c34d9077054414c621ec602b478611. Consolidation is local and ready for review before push.

## Folder inventory and disposition

The actual auxiliary names are freetherapytools-dev and therapy-skill-kit-development; the request contained small spelling differences.

| Folder | Initial state | Work found and disposition | Later removal |
| --- | --- | --- | --- |
| therapy-skill-kit | Canonical clone, development-clean-2026-09-08 at 7a4127e, unfinished merge from 5a56e03 | Preserved index, conflicts, files and refs. Historical implementations already incorporated or superseded. Aborted obsolete merge after preservation; selected existing development. Reconciled build/validation issues below. | Keep canonical repository and private recovery archive. |
| freetherapytools-dev | Separate initialized Git repository; unborn master, no root HEAD or stash; source entirely untracked | Source matches current/historical development. Nested Pros/Cons 6f277fe is semantically equivalent to incorporated 0f62a19; nested save-bar 0cbf9ba is patch-equivalent to incorporated 8eb62c4. Temporary scripts, historical copies and build outputs archived. No outstanding source integration. | Eligible after review and archive retention. |
| freetherapytools-pr1 | Separate clone, development at a9b83541d71066d34678399f7f97ba48fd1ec68c | Committed history already incorporated. Two reported tracked modifications normalize to baseline content. Temporary scripts/outputs archived. One obsolete save-bar stash imported intact into canonical refs and stash list; original retained. | Eligible after review and archive retention. |
| therapy-skill-kit-development | Linked worktree sharing canonical metadata, development at 7a4127e | Manifest/index/topic differences normalize to baseline. Two social cards reproduced by current canonical pipeline. Untracked render-state JSON is local cache. Detached HEAD to free development; all working files retained. | Eligible for Git worktree removal after review. |
| therapy-social-backup | Plain folder, four files, no independent repository | Old social manifest, render-state cache, two generated cards with old branding. No unique generation script/functionality. All archived; modern pipeline retained. | Eligible after review and archive retention. |

No legitimate source remains solely in an auxiliary folder. Intentionally rejected historical/temporary material remains recoverable in canonical private archives. No auxiliary folder, existing branch or stash was deleted.

## Git integration and preservation

- PR #1 head ac2b12de4afcfe35e9a0b9995b36923c6ce8b1bc was confirmed an ancestor of development. The PR was not merged again.
- Merge source 5a56e03 substantially duplicates incorporated 2e1b8ba. Its thermometer change already exists in fddfc68; its old social cards are superseded.
- Rescue/WIP 6bb4af6 retained: remaining differences are duplicate audio, whitespace and superseded quick-tool implementations.
- PR1 stash 968daae67c86b6225a019cb7e7273992b29b1647, based on 33853c30f359c25a1759db1e6759fbec2a6b13a4, replaces the modern standalone save bar with an older framework implementation. Its useful browser-page coverage already exists. All stash parents were imported; the stash was neither applied nor dropped.
- Nested Values 4cf6e12 is patch-equivalent to incorporated history; temporary keyboard/ARIA priority-label changes also already exist. Nested Backgammon-only history remains unrelated reference material.
- New branches: codex/preserve-development-20260908 and codex/preserve-canonical-head-20260908 at 7a4127e; codex/preserve-merge-source-20260908 at 5a56e03; codex/preserve-pr1-stash-20260908 at 968daae.
- Imported refs/archive/pr1/*, refs/archive/dev/* and refs/archive/nested/* preserve additional history. Original branches remain.
- git fetch --all succeeded. Automatic approval review rejected --prune, so stale remote refs remain.

Private recovery evidence is in .git/consolidation-20260908/, outside tracked/published content: original merge/index evidence, file ZIPs and SHA-256 manifests for all five folders, separate-root and nested Git metadata, stash diffs, per-file classification ledgers, verified Git bundles, test logs and browser evidence. Preservation ZIPs passed CRC and SHA-256 checks.

Snapshots exclude generated _site, Quarto caches, Python/Node/R environments and tool caches; Git metadata was preserved separately. Untracked temporary source, backups, OCR and third-party source evidence remain private archival material, not reintroduced public content. A normal Git clone does not preserve these private archives or local-only refs.

Final auxiliary integrity checks: 5,305 dev files, 4,169 PR1 files, 1,077 linked-worktree files and four social files; zero changed/new/missing files against original snapshots.

## Reconciliation changes

- Fixed project-path links/assets on 404 pages served at nested missing URLs; ordinary pages retain portable relative URLs.
- Fixed publication URL normalization so published project routes survive sitemap filtering and unrelated same-host projects are excluded.
- Review links with intentionally removed resource anchors now open the current lesson.
- Excluded authored include fragments from standalone page rendering.
- Updated rendered audits for separate DBT/CBT/Mindfulness sequences, current 404 text, publication policy and absence of an authored Updates feed. Static markers distinguish initialization from dynamic browser text; browser requirements remain.
- Reconciled four extraction rows/tests with the existing copyright-safe DEAR rewrite. Regenerated 17 stale draft corpus records and dependent reviews. All remain review-gated; published paraphrase count stays zero.
- Updated stale title/guidance assertions; added project-path, sitemap and removed-anchor regressions.
- Regenerated modern social cards; ignored their local render-state cache.

Persistent save-bar JavaScript, CSS and geometry/privacy regression file are unchanged from origin/development. Exact explanatory text, shell-measured geometry, bottom-fixed behavior, Markdown save/reopen, DOCX and PDF controls remain.

## Validation

All final checks passed:

- python -m unittest discover -s tests: 284 tests.
- All 25 standalone tests/*.js and tests/*.mjs Node test commands.
- bash scripts/testing/build/quick.sh: JavaScript syntax/helpers, 20 focused Python tests, representative rendered audit.
- python scripts/testing/build/release_ui_static_check.py: 140 pages, zero findings.
- python scripts/learn_glossary.py validate and check-rendered: 58 rendered lessons, one canonical glossary page and one glossary sitemap route.
- python scripts/page_publication.py validate-source.
- python scripts/generate-resource-paraphrases.py --validate --check-artifacts.
- Project environment/social preflight, modified Python compilation and git diff --check.
- Clean quarto render after removing only generated site/_site: 111 authored inputs, all pre/post hooks and social generation completed.
- Local Playwright: Values, Emotions and DEAR MAN at 390/768/1440 widths; nine fixed-bar geometry checks, exact explanation/controls, Markdown download/reopen, valid DOCX, PDF print-action invocation, nested project 404 assets; zero page errors. The operating-system print dialog was not tested.

Initial failures reflected stale copyright/title/guidance/corpus assumptions, absent render output, outdated audit architecture, broken review anchors and real project-path/sitemap bugs. These were investigated and corrected before full/relevant reruns. R emitted nonfatal Windows locale warnings; preflight and render succeeded. Generated site/_site remains ignored and untracked.

## Review and cleanup

Nothing was pushed. No folder/ref/stash cleanup was executed. Private FINAL-REPORT.md records exact final Git output, test commands and guarded Git Bash cleanup commands for later approval. Retain the canonical private recovery archive when removing auxiliary copies.

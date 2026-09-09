# Free Therapy Tools Authoring Guide

## Lesson metadata

Lesson pages live below `site/learn/` and use the track declared by their directory index. A track index uses `learn-track-index`; each lesson uses the same value in `learn-track`, plus a positive `learn-order`.

```yaml
---
title: "STOP"
description: "Pause and choose the next effective step in a crisis."
learn-track: distress-tolerance
learn-order: 1
difficulty: Beginner
tags:
  - Distress Tolerance
---
```

Current topic labels are controlled in `scripts/learn_glossary.py`. Do not invent a second label list in generated HTML.

After changing lesson metadata or content, run:

```powershell
python scripts/learn_glossary.py generate
python scripts/learn_glossary.py validate
```

Generated catalogues, sidebars, and sequence JSON are committed. Do not hand-edit them.

## Tool Finder entries

`site/data/tool-finder/catalogue.json` is the canonical catalogue and topic source. Every entry needs a stable ID, title, description, type, topic, and project-relative route. Use `TherapySite.path()` when JavaScript resolves routes.

After editing the catalogue, run:

```powershell
python scripts/tool_finder_topics.py generate
python scripts/tool_finder_topics.py validate
```

The generated `site/includes/tool-finder-topics.qmd` gives Quarto render-time headings for its native table of contents. JavaScript fills those existing sections with cards.

## Glossary entries

The canonical glossary is `glossary/glossary.json`. Generate the public compatibility file and dependent assets with:

```powershell
python scripts/glossary_source.py generate-source
python scripts/learn_glossary.py generate
```

See [glossary-source.md](glossary-source.md) and [lesson-inline-glossary.md](lesson-inline-glossary.md) for field and inline-link rules.

## Interactive tools

- Reuse `TherapySkillProgress`; do not create a parallel persistence mechanism.
- Keep user-entered content out of URLs.
- Resolve internal routes through `TherapySite.path()`.
- Preserve keyboard access, visible focus, labels, live-region announcements where useful, and reduced-motion behavior.
- Interactive material based on copyrighted therapy resources must use original, educational paraphrases. Do not recreate a worksheet field-for-field.
- Exports should use readable prompts and responses, not internal storage keys.

## Publication and resources

Page status, canonical identity, sitemap inclusion, and authored-page metadata are controlled by `site/_publication.yml` and `scripts/page_publication.py`. Published resources are controlled by the Quarto resource list and the source/resource matching scripts. Validate both before committing.

## Verification

Run focused tests for the area changed, JavaScript syntax checks for modified scripts, then the wider source-level suites. Finish with `git diff --check`. A full `quarto render site` is preferred; if the managed Windows invalid-handle problem prevents it, report that failure and rely on Linux CI for the full render.

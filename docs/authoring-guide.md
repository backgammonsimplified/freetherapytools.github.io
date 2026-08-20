---

# Authoring Guide

This private guide explains where the site lives, how the navigation is wired, and how to copy the page components Marty wants to keep. The examples here are fixture-driven and intentionally editable.

## Where Things Live

| Area | Path | Notes |
|---|---|---|
| Homepage | `site/index.qmd` | Public landing page and homepage playground |
| DBT Skills | `site/learn/index.qmd` | Five-track DBT curriculum landing page |
| CBT Skills | `site/cbt-skills/index.qmd` | Six-lesson CBT curriculum landing page |
| Mindfulness | `site/mindfulness/index.qmd` | Twelve-lesson mindfulness curriculum landing page |
| Curriculum review | `site/review/index.qmd` | Temporary non-primary holding area |
| Glossary | `site/glossary/index.qmd` | One searchable page containing every canonical term |
| Custom 404 | `site/404.qmd` | Root not-found page and recovery links |
| Analyze | `site/analyze/index.qmd` | Static analyzer entry page and Shiny companion |
| Sage vs GNU | `site/engine-benchmark/sage-vs-gnu-stage1/index.qmd` | Study overview and status page |
| Blog | `site/blog/index.qmd` | Chronological listing that discovers `site/posts/**` |
| About | `site/about.qmd` | Project purpose and site-level identity |
| Posts | `site/posts/**/index.qmd` | Individual blog entries |
| Shared CSS | `site/assets/` | Layout, color, and component styling |

## Navigation

Edit `site/_quarto.yml` to change the navbar. The current public navigation is:

`Skill Finder | DBT Skills | CBT Skills | Mindfulness`

Glossary and About remain secondary navigation items. Home is available through the logo.

## Learn Sidebar

The DBT, CBT, Mindfulness, and curriculum-review sidebars are generated into
`site/_learn-navigation.yml`. Do not edit that file or duplicate those
sidebars manually in `site/_quarto.yml`. Track-index and lesson front matter
define the hierarchy and order; the generator assigns each track to its public
section and creates a separate continuous-scroll manifest for each section.

## Learn Catalogue

The section indexes, each track index, and the four sidebars are generated
views of the same curriculum metadata. The DBT index provides search,
difficulty filters, and track focus. Single-track CBT, Mindfulness, and review
indexes provide the matching lesson catalogue without a track filter.

A track index declares a stable ID and its top-level order:

```yaml
---
title: "The Doubling Cube"
description: "Lessons about cube action, take points, market losers, and cube timing."
sidebar: learn
learn-track-index: doubling-cube
learn-track-order: 2
page-layout: full
body-classes: "bs-learn-article bs-learn-track-index"
toc: false
term-lookup: false
lesson-taxonomy: false
---

{{< include _lesson-index.html >}}
```

Every lesson then names exactly one primary track and its order within that
track. Running the generator updates `site/_learn-navigation.yml`,
`site/learn/_lesson-catalogue.html`, and every track's `_lesson-index.html`.
The Roman numerals are derived from the numeric order metadata and never
belong in titles.

## Learn Lesson Taxonomy

Every file under `site/learn/` that represents a lesson must declare `categories`, `tags`, and `terms`.

Allowed difficulty categories:

- `Beginner`
- `Intermediate`
- `Advanced`

Allowed learning-track tags:

- `Doubling Cube`
- `Checker Play`
- `Opening Play`
- `Match Play`
- `Endgames`
- `Engines and Analysis`

Use YAML lists even when selecting one value. Multiple difficulties or tracks mean the lesson is appropriate to each selected value. `terms` must contain canonical glossary slugs only; never use an alias slug. Related glossary links are generated only from this explicit metadata.

A complete lesson header looks like:

```yaml
---
title: "Why Is 25% the Basic Take Point When a Double Is Offered?"
description: "Learn the simplified comparison between taking and passing."
sidebar: learn
learn-track: doubling-cube
learn-order: 1
categories:
  - Beginner
  - Intermediate
tags:
  - Doubling Cube
terms:
  - take-point
  - equity
body-classes: bs-learn-article
---
```

The generated canonical-slug and stable-anchor reference is [learn-glossary-terms.md](learn-glossary-terms.md). Regenerate the Learn catalogue, glossary entries fragment, and that authoring reference with:

```powershell
python scripts/learn_glossary.py generate
python scripts/learn_glossary.py validate
```

Do not add glossary relationships by scanning lesson prose. A keyword scan may be used as an authoring warning, but the public relationship must remain explicit in `terms`.

`learn-track` must match a `learn-track-index` ID. `learn-order` must be a
unique, contiguous positive integer within that track. The generator uses
those two fields as the single curriculum sequence for the global Learn index,
the relevant track index, and the sidebar.

## Single-Page Glossary

The glossary has one public route:

```text
/glossary/
```

Do not create a directory or page for an individual term. Every canonical term
is an expandable entry in the initial HTML on the glossary page. Link to a term
with its stable canonical anchor:

```text
/glossary/#prime
/glossary/#take-point
```

Use canonical slugs in Learn and Research `terms` metadata. Aliases remain
inside their canonical data entry and search resolves them to the canonical
anchor; aliases never receive separate pages, redirects, or visible duplicate
entries. Related Learn and Research content is driven only by explicit
canonical `terms` metadata.

`site/404.qmd` is the source for the root `404.html` page. Keep its recovery
links to Home, Learn, Backgammon Glossary, and Research. It must
remain a normal content page without redirect code.

## Blog Discovery

The blog listing is driven by `listing:` metadata on `site/blog/index.qmd`, which points at `site/posts/**/*.qmd`. Add or remove posts by creating or deleting files under `site/posts/`.

## Updates RSS

`site/updates/index.qmd` produces the combined `/updates/index.xml` feed. An
eligible Learn article, Research article, study, or benchmark report must live
under its public section, have a real ISO publication `date`, and explicitly
set `published: true`. The feed sorts those sources in reverse chronological
order. Do not mark landings, drafts, hidden or planned pages, or private fixture
posts as published feed items.

The controlled route entry in `site/_publication.yml` must also have
`status: published`. Source validation rejects either half of a contradictory
combination: `published: true` on a preliminary, draft, or fixture route, or a
feed-eligible article/report marked `status: published` without the explicit
source switch and date. Landing pages use the controlled `published` route
status for indexing but never set `published: true`, because they are not dated
Updates items.

## Page Publication Status

`site/_publication.yml` is the fail-closed registry for canonical routes, page
types, indexing, sitemap eligibility, breadcrumbs, and related-content hooks.
Unregistered routes resolve to `draft` and remain non-indexable. Use only the
controlled statuses `published`, `preliminary`, `draft`, `fixture`, `error`,
and `legacy`.

Before changing an authored article or report to `published`, remove explicit
unresolved author markers. The publication gate recognizes line-level `TODO:`,
a line containing only `TODO`, and `[PENDING ...]` markers while ignoring fenced
examples, HTML comments, and ordinary prose that merely discusses words such as
“todo” or “pending.” Do not replace preliminary scientific markers with guesses.

## Authored Page SEO And Social Contract

`site/_publication.yml` is also the authoritative authored-page registry. Its
controlled page types map Learn lessons and Research articles to Schema.org
`Article`, and benchmark reports to `Report`. Those three types automatically
receive the public author, publisher, structured-data, and social-card behavior;
landing and index page types do not receive article-only fields.

Use this source front matter shape for a normal authored page:

```yaml
---
title: "<Real page title>"
author: "Marty Gale"
description: >
  <Factual description of the actual page content.>
# Add these only when the page is genuinely ready to publish:
# published: true
# date: "<YYYY-MM-DD>"
# date-modified: "<YYYY-MM-DD>"
---
```

The matching route entry supplies the authored page type and publication state:

```yaml
/learn/example.html:
  source: site/learn/example.qmd
  type: learn-lesson       # or research-article / benchmark-report
  status: draft            # change to published only with real approval
```

`author` is the visible Quarto byline and must be exactly `Marty Gale`. Rendered
JSON-LD maps it to a `Person` whose canonical URL is
`https://backgammonsimplified.github.io/about.html`. Authored pages also receive
the controlled `Backgammon Simplified` `Organization` publisher. Do not add
external profiles or organization facts that are not established on the site.

`date` is the author-controlled publication date and must be an ISO 8601 calendar
date. `date-modified` is the one controlled field for a later material update.
Never infer either value from Git history, filesystem timestamps, rendering, or
deployment. `date-modified` cannot precede `date`; when it is omitted on a newly
published page, structured data uses the publication date for both values. When
it is later, the rendered title area includes an understandable update date.
Draft and preliminary examples do not receive fabricated structured-data dates.

To publish an authored page, all three controls must agree:

- source front matter has `published: true`;
- source front matter has a real `date`;
- the registered route has `status: published`.

Only then can the page become indexable, sitemap-eligible, and RSS-eligible.
Preliminary, draft, fixture, error, and legacy routes remain `noindex, follow`
and excluded from sitemap/RSS eligibility.

### Automatic authored social cards

Do not add a generated filename, dimensions, canonical host, card kind, or pill
label to normal authored front matter. The page type in `_publication.yml`
automatically drives the existing social-card generator:

| Authored page type | Card kind | Visible pill |
|---|---|---|
| `learn-lesson` | `article` | `Learn Article` |
| `research-article` | `article` | `Research Article` |
| `benchmark-report` | `benchmark` | `Benchmark Report` |

The card title comes from `title`. Its subtitle comes from `description`. Use
`social-title` or `social-subtitle` only when a deliberate social-only wording
override is necessary; do not invent promotional copy. `social-card-slug` is an
exceptional collision/route override, not routine authoring metadata.

The supported generator writes a 1200 x 630 PNG under
`site/assets/social/generated/`. The page-aware publication pass maps the same
canonical generated image URL to `og:image`, Twitter image metadata, and the
authored `Article`/`Report` JSON-LD `image`. Pages without a page-specific card
continue using `social-default.png` as the site fallback. Authored pages also use
`og:type=article`; real publication/modification dates feed the matching article
social metadata.

Run the focused and full validation before asking to publish:

```powershell
python -m unittest discover -s tests -p "test_publication*.py" -v
python social_generator/scripts/social/run_social_pipeline.py --all
```

```bash
bash scripts/testing/quick.sh
bash scripts/testing/build/comprehensive.sh --with-social-cards
BS_PUBLICATION_MODE=production bash scripts/testing/build/comprehensive.sh --with-social-cards
```

Do not add fake dates, evidence, findings, or conclusions to make draft or
preliminary pages pass publication checks.

## Recently Added

The homepage `Recently Added` section is hand-curated. Update it when a new lesson, post, or status page should be surfaced.

## Copying A Component

Each primary page has a `Component Playground` section. Marty can copy a rendered component and then copy the code source directly below it. The main pages that need this treatment are:

- Homepage
- Learn
- Analyze
- Sage vs GNU
- Blog
- About

## Removing Playground Sections

Before public release, search for `Component Playground` and delete or rewrite every section under that boundary. The visible boundary is deliberate so the private material is easy to remove.

## Render And Preview

Render the full site from `site/` with:

```bash
quarto render
```

Preview one page by rendering the page file directly, for example:

```bash
quarto render learn/index.qmd
```

## Shiny

Run the analyzer app from `shiny/position-dashboard/` with the local R environment. The site and Shiny app are separate, and the Shiny app still keeps worker-backed polling unwired until the contract is finalized next week.

## Generated Directories

Do not edit `_site/`, rendered HTML output, or other generated artifacts. Use the source files under `site/` instead.

## References

This guide uses fixture citation examples only, consistent with the private playground approach [@bs-fixture-methodology].
:::::


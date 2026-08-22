# Skill Finder Progress System Review

## Status

The shared, local-only progress system is registered on all 13 current interactive Skill Finder tools. Each tool uses schema version 1 and provides validated state capture, exact state restoration, a human-readable Markdown formatter, browser autosave, JSON/Markdown progress files, true client-side DOCX export, and a print/PDF view.

No Learn lesson source, Learn JavaScript, Learn CSS, resource-match review file, or OCR/QMD lesson content was changed.

## Registered tools

| Tool ID | Route | Autosave | Markdown / JSON restore | Readable export |
|---|---|---:|---:|---:|
| `values` | `/skill-finder/values/` | Yes | Yes | Yes |
| `thermometer` | `/skill-finder/thermometer/` | Yes | Yes | Yes |
| `emotion-explorer` | `/skill-finder/emotions/` | Yes | Yes | Yes |
| `change-emotion` | `/skill-finder/change-emotion/` | Yes | Yes | Yes |
| `worry-tree` | `/skill-finder/worry-tree/` | Yes | Yes | Yes |
| `pleasant-event` | `/skill-finder/pleasant-event/` | Yes | Yes | Yes |
| `behaviour-chain` | `/skill-finder/behaviour-chain/` | Yes | Yes | Yes |
| `missing-links` | `/skill-finder/missing-links/` | Yes | Yes | Yes |
| `exposure` | `/skill-finder/exposure/` | Yes | Yes | Yes |
| `dear-man` | `/skill-finder/dear-man/` | Yes | Yes | Yes |
| `ask-or-say-no` | `/skill-finder/ask-or-say-no/` | Yes | Yes | Yes |
| `goal-builder` | `/skill-finder/goal-builder/` | Yes | Yes | Yes |
| `behavioural-activation` | `/skill-finder/behavioural-activation/` | Yes | Yes | Yes |

## Shared save and load support

- One adapter framework provides the title-row **Open previous progress** control, floating **Save progress** control, accessible drawer, end-of-tool export area, browser drafts, file validation, wrong-tool handoff, and exports.
- Draft keys follow `therapy-skill-kit:progress:<tool-id>` and are written after a 450 ms debounce.
- Existing Values data under the former `therapy-skill-kit:values` key is offered as a shared browser draft instead of being discarded or silently loaded.
- A returning user sees **Previous browser progress found** with explicit **Continue** and **Start over** choices. Current work is never replaced merely because a draft exists.
- Markdown and JSON use the same `therapy-skill-kit-progress` record. Markdown has a machine-readable JSON comment plus a tool-specific readable summary.
- Imports are limited to 2 MiB, parsed as data, checked for format/schema/tool/route/state structure, and never evaluated or rendered as imported HTML.
- A valid wrong-tool record is retained in `sessionStorage` only for a local navigation handoff. State is never placed in a URL.
- Friendly errors distinguish non-progress files, damaged/incomplete files, newer schemas, and wrong-tool files.

## Exports

- **Markdown:** implemented as the preferred restorable and readable format.
- **JSON:** implemented as a restorable representation of the same progress record.
- **DOCX:** implemented client-side without a CDN or service. The generated file is a true Open XML ZIP package with content types, relationships, document, and styles parts. It is a readable export and is not presented as restorable.
- **Print / Save as PDF:** implemented with `window.print()` and an isolated print article. Navigation, the app, the floating control, drawer, and other page chrome are excluded during printing.
- Empty fields are omitted from human-readable summaries. Ordered Chain and Exposure content remains ordered.

## Privacy and security

- Personal progress is stored only in the current browser origin, an explicitly saved local file, or a short-lived same-origin `sessionStorage` handoff.
- The progress system contains no `fetch`, `XMLHttpRequest`, or `sendBeacon` call.
- Imported content is applied only through validated state and existing safe renderers; the shared UI uses safe DOM creation and `textContent`.
- No personal answers are logged. Automated and browser checks use synthetic fixture text only.
- Clearing browser progress targets only the active tool and requires confirmation.

## Accessibility and responsive behaviour

- The drawer has dialog semantics and an accessible name.
- Focus moves to the filename field, Escape closes, Tab is trapped within the open drawer, and focus returns to the trigger.
- Status/errors use a live region; the file picker is labelled; controls meet the shared 44 px minimum target.
- Reduced-motion users do not depend on animation.
- At 390 px, the title and open control stack, the drawer is full width, and measured document/drawer width is exactly 390 px with no horizontal overflow.

## Automated validation

- `node tests/test_skill_progress.js` covers Markdown and JSON round trips, readable Markdown, wrong-tool detection, future-schema rejection, damaged state rejection, filename rules, metadata comment safety, and a ZIP/DOCX package check.
- `tests/test_skill_progress.py` covers all 13 identities/routes, adapter contracts, shared UI labels, privacy/no-network guards, accessibility/mobile/print contracts, asset order, and absence of controls from Learn QMD sources.
- Focused progress, Skill Finder, Values, resource-match, PHP-match, QMD-extraction, and curriculum regression selection: 56 tests passed.
- Learn/Research JavaScript regression checks passed.
- `git diff --check` passed.

The complete repository-wide Python discovery still includes unrelated, pre-existing Backgammon-era assertions and tests that require temporary-directory/Playwright child-process permissions unavailable in this managed Windows environment. Those failures were not caused by the progress files.

## Browser review

The real production JavaScript and data were exercised through a temporary local fixture (removed after review):

- Values: synthetic custom value autosaved, survived reload, and restored through the explicit Continue prompt.
- Emotion Explorer: Fear, a descriptive word, chest/body area, prompting event, and final stage restored exactly.
- Worry Tree: actionable/later branch, prior answers, current flow node, and partially typed current answer restored exactly. This check found and led to a fix for current-screen flow input capture.
- Behaviour Chain: two synthetic links restored in their original order and types.
- Exposure: two safe synthetic steps and before/after ratings restored in order.
- DEAR MAN: several fields and the generated summary restored.
- Desktop: right-side drawer visually reviewed.
- Mobile: title/open control and full-width drawer reviewed at 390 px; a content-box overflow was found and fixed.
- DOCX: export action reported success; the package structure is also checked by the Node test.
- Browser console: no warnings or errors after the completed checks.

The managed browser declined permission to select a local progress file. It was not retried or bypassed. Therefore interactive file-picker restoration, wrong-tool navigation, corrupt-file display, and unsupported-version display remain unit/static validated rather than browser validated. The native print dialog was not exercised. The full Quarto page render was unavailable because Quarto could not spawn the Python pre-render process (`Invalid handle`), so browser checks used the actual assets and data but not freshly rendered Quarto chrome.

## Manual review routes

Review these local routes after running the normal preview command:

1. `/skill-finder/values/` — nested Values state, Markdown save/load, DOCX, and print.
2. `/skill-finder/emotions/` — selected emotion, words, body regions, details, and stage.
3. `/skill-finder/worry-tree/` — partial branch state and current text.
4. `/skill-finder/behaviour-chain/` — ordered links.
5. `/skill-finder/exposure/` — ordered steps and ratings.
6. `/skill-finder/dear-man/` — readable DEAR/GIVE/FAST summary.
7. Any tool route — wrong-tool file handoff, corrupt file, unsupported schema, confirmation-based clear, and print preview.

## Known limitations

- DOCX is deliberately lightweight: it preserves headings, list lines, entered content, and readable summaries, but not the visual styling of each interactive app.
- Print/PDF uses the browser's native print dialog; PDF creation depends on the browser's Save as PDF option.
- The five guided planners are single-page forms, so their meaningful state is their fields plus whether the summary has been built; they do not have a separate step index.
- No registered tool has a known state-restoration gap after the current-flow input fix.

## Next refinement

Refine each tool's readable Markdown/DOCX presentation individually as its final result experience evolves. The shared file format, validation, draft, privacy, and UI system should remain centralized.

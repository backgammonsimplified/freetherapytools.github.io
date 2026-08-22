# Backgammon Navigation Parity Review

## Authority and scope

- Reference repository: `C:\Users\andre\Documents\backgammonsimplified.github.io` (read-only)
- Reference commit: `6ce883106715d42594a8013e3c31eb8f50aa5e73`
- The checked-out reference repository was verified at that exact commit.
- Therapy curricula, routes, glossary entries, Skill Finder applications, progress storage, resource matching, QMD lesson content, and per-curriculum continuous-scroll manifests remain authoritative for Therapy Skill Kit.

The comparison was made against the source implementation, not an approximation of the public page. `site/assets/bs-glossary.js` and `site/assets/bs-shared.css` are byte-for-byte copies of the authority versions. Therapy's `bs-learn.js` and `bs-learn.css` retain the authority implementation and add only Skill Finder positioning/sidebar behavior. Therapy's `bs-learn-scroll.js` retains the authority implementation and adds manifest selection for DBT, CBT, Mindfulness, and review routes.

## Parity matrix

| Area | Therapy status | Authority implementation retained |
|---|---|---|
| Learn left sidebar | Complete | Quarto docked sidebar plus Backgammon section controls |
| Collapse all / Expand all | Complete | `initializeLearnSidebarControls()` |
| Hide/reopen entire left sidebar | Complete | `initializeLearnLeftSidebarToggle()` and fixed arrow control |
| Scroll behavior | Complete | Down-scroll collapse and navigation-hide behavior; Therapy adds upward-scroll reopen while respecting manual collapse |
| Active lesson / track | Complete | `setActiveSidebar()` follows the active continuous-scroll lesson and expands its track |
| Learning Track rail | Complete | `placeLessonTrackLinks()` moves the lesson track into the desktop right rail |
| On This Page | Complete | Authority TOC mounting, active heading, heading toggle, and collapse state |
| Look up a term | Complete | Authority local glossary lookup and result rendering |
| Inline glossary | Complete | Authority keyboard/click tooltip, canonical definitions, focus, Escape, and viewport positioning |
| Right-rail collapse | Complete | Authority heading toggle, all-content collapse, and scroll-direction collapse |
| Back to top | Complete | Authority one-viewport threshold, reduced-motion support, and content-aligned placement |
| Mobile lesson navigation | Complete | Authority secondary lesson-index affordance and swipeable TOC drawer |
| Navbar breakpoint | Complete | `collapse-below: xl`, matching the authority configuration |
| Browser Back/Forward | Preserved | Lesson/sidebar links remain real URLs; continuous scrolling does not inject synthetic history entries |
| Anchors | Complete | Same-page TOC detection plus deterministic ID/reference rewriting for appended lessons |
| Continuous scroll | Complete | Authority loader, validation, retry/end states, active lesson and TOC synchronization |
| Save Progress collision | Complete | Page tools are raised above the Save Progress control; page tools/sidebar are inert while its dialog is open, and Save Progress is hidden while term lookup is open |

## Therapy-specific adaptations

1. Skill Finder routes use the same left-sidebar hide/show behavior and expose all current tools plus links to the DBT, CBT, Mindfulness, and major Learn sections.
2. On desktop Skill Finder pages, Term Search and Back to top measure the actual `.skill-app-shell` and sit beside its content edge. They are recalculated after resize, scroll, app rerender, and left-sidebar state changes.
3. Manual sidebar collapse is persistent. Automatic down-scroll collapse reopens on a small upward scroll or at the page top; it never overrides a manual collapse.
4. Continuous Learn selects the correct Therapy manifest instead of assuming a single Backgammon curriculum sequence.
5. Collision rules live in `skill-progress.css`, leaving the shared Backgammon Learn CSS behavior intact.

## Navigation and state details

- Collapse/Expand all operates through Quarto's own accessible sidebar toggles, so section `aria-expanded` state stays synchronized.
- The whole-sidebar control retains focusable button semantics, `aria-controls`, `aria-expanded`, explicit labels, and a visible show control at the left edge when collapsed.
- Active continuous-scroll lessons update both `.active` and `aria-current="page"`, reveal the containing section, and keep the active link in the sidebar viewport.
- The right rail contains Learning Track before On This Page on desktop. On narrow screens the authority drawer exposes the current TOC from the left edge, closes by button/backdrop/Escape, and returns focus.
- Inline glossary content and term search use the local generated glossary data. Neither feature sends entered text or therapy data to a service.
- Appended lessons receive route-derived ID prefixes. TOC `href` and `data-scroll-target` references are rewritten with those IDs, preventing duplicate-anchor collisions across continuous lessons.

## Validation

Focused validation is implemented in `tests/test_navigation_parity.py` and the existing Learn, glossary, continuous-scroll, Skill Finder, progress, and Values tests. It checks the authority hashes for the unchanged shared glossary/stylesheet files, every navigation subsystem above, Therapy's manifest routing, the complete Skill Finder sidebar, and Save Progress collision guards.

- 119 focused Python tests passed across navigation parity, Skill Finder, progress, Values, practice apps, all three Therapy curricula, QMD extraction, book/PHP/resource-match review, glossary freshness/source/Markdown, and section-scan inventory.
- Learn filters, continuous Learn, continuous Research, progress serialization/DOCX, and Values-tier JavaScript runtime tests passed.
- JavaScript syntax checks passed for Learn, continuous Learn, glossary, and progress assets.
- The standalone pre-render completed and reported current glossary outputs and 47 continuous lessons across 7 tracks.
- The Quarto build did not run to completion in this managed Windows session: Quarto could not spawn the configured Python pre-render process and returned `Invalid handle`. This is reported as blocked, not passed.

The broad `tests.test_learn_glossary` module still contains unrelated Backgammon-content assumptions (Backgammon lesson filenames, three tracks, Research navigation, RSS copy, and publication fixtures). Those pre-existing content-specific assertions are not treated as Therapy navigation failures. The navigation-specific assertion in that module has been updated for Therapy's upward-scroll/manual-collapse extension.

## Browser review

The local Values page was previously reviewed with the production assets on desktop and at approximately 390 px. The left sidebar collapsed on downward scrolling, restored on upward scrolling, manually hid/reopened from the left-edge arrow, and Back to top appeared after one viewport and returned to the top. The Values bottom bar collapsed/reopened independently.

The managed browser denied access to the public Backgammon site, so no live public-site visual comparison is claimed. Source comparison is complete against the exact local authority commit. A fresh rendered browser pass was also unavailable because the Quarto build could not spawn its pre-render process. After a successful local/CI build, manually review one DBT lesson, one CBT lesson, one Mindfulness lesson, and a non-Values Skill Finder tool to confirm the rendered Quarto chrome and Save Progress spacing.

## Manual routes

- `/learn/cube/tipp.html` — DBT sidebar, track rail, TOC, glossary, anchors, continuous scroll.
- `/learn/cbt-anxiety/thinking-traps.html` — CBT manifest and active track.
- `/learn/mindfulness/what-skills.html` — Mindfulness manifest and active track.
- `/skill-finder/values/` — shared Skill Finder sidebar, content-aligned tools, collapsible bottom bar.
- `/skill-finder/emotions/` — Save Progress and Backgammon page-tool collision check.

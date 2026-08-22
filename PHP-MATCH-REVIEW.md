# PHP Match Review

This report records the reproducible comparison of currently published curriculum resources against the older high-resolution `php.pdf` scan. The current website curriculum remains authoritative; physical PDF order was not used as evidence.

## Target Resource Count

- Published curriculum resources: **266**
- Existing publicly displayed high-confidence Linehan-book matches: **99**
- Published resources searched against `php.pdf`: **167**
- Physical `php.pdf` pages considered: **152**

## PHP Results

- High-confidence matches: **42**
- Candidate matches: **0**
- No match: **125**

All 152 physical pages were rendered to normalized working images. Matching considered every orientation and combined perceptual, layout, crop, and projection signals. The inventory records the top page, second-best page, uniqueness margin, orientation, evidence, and review state. High-confidence results were manually checked against the page image; similar-layout pages without convincing content agreement were left unmatched.

Forty-one unique physical pages support the 42 matched resources. The two medication resources legitimately reuse the same printed page. Only these needed pages were extracted: 41 PDFs and 41 optimized previews, totaling **100,897,236 bytes** (about **96.2 MiB**).

## Combined Quality Status

- Resources with a pending displayed Linehan-book copy: **99**
- Resources with a pending displayed `php.pdf` high-resolution copy: **42**
- Resources with no high-confidence better copy: **125**
- Total resources with a pending better-copy comparison: **141**

Both the original curriculum copy and the proposed better copy remain on each real lesson page. No match has been finalized, and no original resource has been removed.

## Review Workflow

- Dashboard: `/review/resource-matches.html?review=1`
- Unmatched gallery: `/review/unmatched-resources.html?review=1`
- Browser storage key: `therapy-skill-kit.resource-match-review.v1`
- Export filename: `therapy-skill-kit-match-review.json`

Every one of the 141 displayed alternatives has a stable match ID and a development-only **Incorrect match** control. Flags remain local to the browser and can be toggled or cleared. Export records explicit review completion and rejected matches. The finalization helper refuses incomplete review files and supports dry-run planning; it has not been run in apply mode.

Neither review route appears in normal navigation. Both source pages include explicit `noindex, nofollow` metadata. Review controls are hidden outside localhost/loopback unless `?review=1` is present.

## Validation Record

- Focused inventory/review tests cover physical-page bounds, extracted assets, lesson publication rules, stable IDs, development-only controls, export schema, safe finalization, gallery completeness, navigation isolation, and absence of network transmission.
- Glossary generation and validation completed successfully.
- Static desktop inspection completed for the review dashboard and unmatched gallery.
- The managed Windows environment could not complete a Quarto render: Quarto failed to spawn Python and, with pre-render hooks temporarily bypassed for diagnosis, failed to spawn bundled Dart Sass with `Invalid handle`. The configuration was restored unchanged. This is an environment child-process limitation, not a reported successful build.
- Browser export download observation and representative real-lesson visual review remain manual checks because the partial managed render did not contain lesson pages.

## Durable Files

- Inventory: `data/php-matches.csv`
- Matching pipeline: `scripts/php_match_inventory.py`
- Review-page generator: `scripts/resource_match_review.py`
- Review client: `site/assets/resource-match-review.js`
- Finalization helper: `scripts/finalize-resource-match-review.py`
- Focused tests: `tests/test_php_matches.py`, `tests/test_resource_match_review.py`

## Next Review Step

Review every displayed comparison locally, mark any wrong alternative with **Incorrect match**, explicitly confirm **I have reviewed all displayed matches**, and export the JSON file. A later cleanup run can use that complete export to reject incorrect alternatives, promote accepted high-resolution copies, and retain lower-resolution resources wherever no accepted replacement exists.

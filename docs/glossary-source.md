# Canonical glossary production source

`glossary/glossary.json` is the only production editorial source. It contains
published canonical entries and keeps aliases inside their canonical entry.
The historical Markdown glossary, staged queue, comprehensive vocabulary list,
and Markdown contract are not present in the current accepted architecture and
are not production inputs.

Historical glossary material must be reconciled semantically into the JSON
contract. Preserve the current `bs-*` project namespace and do not treat old
Markdown structure as authoritative.

## Generation

From the repository root:

```powershell
python scripts\learn_glossary.py generate-source
python scripts\learn_glossary.py check-source
python scripts\learn_glossary.py generate
python scripts\learn_glossary.py validate
```

The generated chain is:

```text
glossary/glossary.json
  -> site/data/glossary.json
  -> site/assets/bs-glossary-lookup.json
  -> site/glossary/_entries.html
```

Generated files are deterministic and must not be edited manually.

## Public and editorial fields

The validator in `scripts/glossary_source.py` defines the authoritative field
order and allowed values. The source includes canonical slugs, aliases,
optional compatibility redirect slugs, short and long definitions, categories,
learning tracks, related canonical slugs, explicit inline-term mappings,
publication dates, optional public usage notes or editorial notes, and
references.

All current source entries are published. `added` becomes public `date_added`,
and dated entries enter the Updates feed. Do not invent publication dates for
material that has not been approved for publication.

The public compatibility field `category` is emitted only when categories are
non-empty and equals `categories[0]`.

## Validation and matching

Generation validates canonical and alias uniqueness after deterministic
Unicode, case, whitespace, apostrophe, punctuation, and hyphen normalization.
It also validates source ordering, field ordering, slugs, definitions,
controlled and deterministically ordered categories, learning tracks, inline
mappings, and canonical targets.

Search data includes canonical names, aliases, short definitions, and full
definitions. Alias matches resolve to their canonical entry. Hover and keyboard
focus use the canonical short definition; the glossary page and term sidebar
show the full definition.

Glossary definitions automatically link canonical terms and aliases using
longest-match-first recognition. Self-links are excluded. Explicit Inline terms
have priority over automatic matches. Resolved related words link to the
canonical fragment; unresolved labels remain plain text.

## Learn and Research metadata

Both page types support:

```yaml
terms:
  - broad relationship slugs

highlighted-terms:
  - explicit inline-highlight slugs
```

Only `highlighted-terms` are marked in prose. Matching accepts canonical names
and aliases, prefers the longest phrase, and marks only the first safe prose
occurrence. The filter excludes headings, links, code, math, raw HTML, captions,
metadata, and navigation.

## Editorial candidates

The current repository has no production or tracked staged-candidate source.
Keep unresolved candidates unpublished until their canonical wording, aliases,
definition, category, and relationship decisions are approved. A historical
staged candidate is not authority to add a published JSON entry.

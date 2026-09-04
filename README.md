# Free Therapy Tools

Free Therapy Tools is an open-source Quarto site with practical DBT, CBT, mindfulness, goal-setting, emotional-regulation, distress-tolerance, interpersonal-effectiveness, and wellness lessons and browser-based exercises.

The project is under active development. Its tools are educational and do not diagnose conditions, replace professional care, or provide emergency support.

## Project links

- Preview: <https://backgammonsimplified.github.io/freetherapytools.github.io/>
- Tool Finder: <https://backgammonsimplified.github.io/freetherapytools.github.io/tool-finder/>
- Repository: <https://github.com/backgammonsimplified/freetherapytools.github.io>
- Issues: <https://github.com/backgammonsimplified/freetherapytools.github.io/issues>

This GitHub location is the temporary development home. Repository migration is intentionally outside the scope of current implementation work.

## Local development

Requirements include Python, Node.js, and Quarto. From the repository root:

```powershell
python scripts/learn_glossary.py validate
$env:BS_SKIP_SOCIAL_CARDS = "1"
Remove-Item Env:TSK_RESOURCE_REVIEW -ErrorAction SilentlyContinue
quarto render site
```

The rendered website is written to `site/_site/`. The managed Windows environment used by Codex can hit a Python/Playwright or Dart Sass invalid-handle error; Linux CI remains the full-render authority when that occurs.

Run the core source-level checks with:

```powershell
python -m unittest discover -s tests -p "test_*.py"
Get-ChildItem tests -Filter "test_*.js" | ForEach-Object { node $_.FullName }
python scripts/page_publication.py validate-source
python scripts/glossary_source.py check-source
python scripts/learn_glossary.py validate
git diff --check
```

## Architecture

- `site/` contains Quarto pages, browser assets, catalogue data, generated Learn navigation, and published resources.
- `site/data/tool-finder/catalogue.json` is the canonical Tool Finder catalogue.
- `scripts/tool_finder_topics.py` generates the render-time topic headings that Quarto uses for the native right-hand table of contents.
- `scripts/learn_glossary.py` owns Learn discovery, lesson catalogues, navigation, continuous-reading sequences, and glossary-derived output.
- `site/assets/skill-progress.js` provides the shared `TherapySkillProgress` storage and export system.
- `site/assets/site-path.js` provides project-site base-path support.
- `site/_publication.yml` and `scripts/page_publication.py` provide publication and indexing controls.

Some generic files retain internal `bs-*` names because they originated in a reusable earlier site framework. Those names are not content authority and are intentionally left in place to avoid a risky broad rename.

## Documentation

- [Authoring guide](docs/authoring-guide.md)
- [Glossary source contract](docs/glossary-source.md)
- [Inline glossary integration](docs/lesson-inline-glossary.md)
- [UI release testing](docs/ui-release-testing.md)
- [Asset provenance](docs/ASSET_PROVENANCE.md)
- [Implementation brief for PR #1](docs/implementation/tool-finder-fixes-and-repo-cleanup.md)
- [Retained review reports](docs/reviews/)
- [Historical project notes](docs/archive/project-history.md)

## Licensing

Software is licensed under AGPL-3.0-only. Original educational content is licensed under CC BY-SA 4.0 unless a source or resource states otherwise. Third-party material retains its original licence or permission. See [LICENSE.md](LICENSE.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md).

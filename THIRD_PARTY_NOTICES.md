# Third-Party Notices

## Source Sans 3

- Project: Source Sans 3
- Version/source: Adobe Fonts release 3.052; <https://github.com/adobe-fonts/source-sans>
- Copyright: upstream 3.052 licence notice © 2010–2022 Adobe; embedded font metadata © 2023 Adobe
- Licence: SIL Open Font License 1.1 (`OFL-1.1`)
- Files: `site/assets/fonts/*.ttf`, `shiny/position-dashboard/www/fonts/*.ttf`, and `social_generator/site/assets/social/fonts/*.ttf`
- Modifications: none recorded
- Redistribution: permitted under the OFL; the unmodified licence text is in `LICENSES/OFL-1.1.txt`

## Build dependencies

The following tools and libraries are build dependencies and are not incorporated into the generated cards as software source. Their own terms continue to apply.

| Dependency | Pinned version | Licence | Source |
|---|---:|---|---|
| Jinja2 | 3.1.6 | BSD-3-Clause | <https://palletsprojects.com/p/jinja/> |
| PyYAML | 6.0.2 | MIT | <https://pyyaml.org/> |
| Playwright for Python | 1.54.0 | Apache-2.0 | <https://playwright.dev/python/> |
| Pillow | 11.3.0 | HPND | <https://python-pillow.org/> |
| fontTools | 4.63.0 | MIT | <https://fonttools.readthedocs.io/> |
| R yaml | installed build dependency | BSD-3-Clause | <https://cran.r-project.org/package=yaml> |

## D3 Values graph modules

- Projects: `d3-force`, `d3-selection`, `d3-drag`, and `d3-zoom`
- Version: 3.0.0 for each module
- Copyright: 2010-2021 Mike Bostock
- Licence: ISC
- File: focused local browser bundle at `site/assets/d3-values-force.min.js`
- Modifications: modules bundled and minified together; application behavior remains in project-owned `site/assets/therapy-force-graph.js`
- Runtime loading: local static asset only; no CDN or other runtime network dependency
- Licence text: `LICENSES/D3-ISC.txt`

## Project-owned visual assets

The favicon, logo, app-icon, and generated social-preview assets are project-owned Backgammon Simplified branding, not third-party material. Their inclusion does not grant trademark rights. See `LICENSE.md` and `docs/ASSET_PROVENANCE.md`.

## Other third-party material

Engine names, output, screenshots, quotations, datasets, and other third-party material retain their original licences or terms and must be recorded alongside the relevant release or file. The website's AGPL and CC BY-SA terms do not relicense them.

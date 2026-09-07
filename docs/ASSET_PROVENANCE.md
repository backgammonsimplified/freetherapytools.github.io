# Website Asset Provenance and Regeneration

## Free Therapy Tools mark

The active logo and favicon use an original code-native mark created for Free Therapy Tools in this repository: a warm-coloured heart inside a speech bubble. The canonical vector sources are `site/assets/logo.svg` and `site/assets/icons/favicon.svg`. They intentionally replace the former Backgammon Simplified identity.

The raster icons are deterministic ImageMagick conversions of the favicon SVG. Regenerate them from the repository root with the documented dimensions in `site/assets/icons/site.webmanifest`.

| Public file | Dimensions/format | SHA-256 |
|---|---|---|
| `site/assets/logo.svg` | SVG | `2E6A08B978882B9370EE042872EFF05ADBB01E65D09D540165E02BAFDDC327B4` |
| `site/assets/icons/favicon.svg` | SVG | `4BF86E2BA99B8DB96F2AE35080C2CDB06B919C071E1C5A0D1BB85ABAD27D2F63` |
| `site/assets/icons/apple-touch-icon.png` | 180×180 PNG | `78BCAB13133DC6BF87B6505FE7E931EC8CC464EB475CEC8D2235560530D307FD` |
| `site/assets/icons/favicon-96x96.png` | 96×96 PNG | `3674BA5FEE9E496668F0C619ECC19201D2A302C699392106C2768292334E0F54` |
| `site/assets/icons/favicon.ico` | 48/32/16 ICO | `34A63D13FA129EA1CEAB57AED0FE4B64448C3E72AA224EC81AC959EA8CB039AB` |
| `site/assets/icons/web-app-manifest-192x192.png` | 192×192 PNG | `3A832C7E3890CF8AB326D620DD7B349495A2A09F952D7E93EE879CBAB5AC5C48` |
| `site/assets/icons/web-app-manifest-512x512.png` | 512×512 PNG | `E1BB3D7BE807F988AE030009AA79A038618E117BC354CB50C229F302145D17DC` |

## Social previews

The active social-card manifest contains only the Free Therapy Tools default and glossary cards. The tracked PNGs are text-only project assets with no third-party visual material.

| Generated file | Dimensions | SHA-256 |
|---|---:|---|
| `site/assets/social/generated/social-default.png` | 1200×630 | `E8ACB40269E582DB76DF0197814264EF09793966EF35BEC67E4773A7C6DB61E2` |
| `site/assets/social/generated/social-glossary.png` | 1200×630 | `F3A7322B55355E6C3A96A88B9A68A8B2EF0D37F85AC2B7B1DA1F74A975C1B92A` |

The social renderer and its pinned Source Sans 3 fonts remain under `social_generator/`. In managed Windows environments, Playwright may fail to spawn; the committed images allow Quarto to render when `BS_SKIP_SOCIAL_CARDS=1`.

## Font evidence

The social renderer uses unmodified Source Sans 3 Regular and SemiBold TTF files. Their embedded metadata reports Adobe Source Sans version 3.052. The upstream source is <https://github.com/adobe-fonts/source-sans/tree/3.052R>, licensed under the SIL Open Font License 1.1. The licence text is stored as `LICENSES/OFL-1.1.txt`.

## Licence text evidence

| Local file | Authoritative source | SHA-256 |
|---|---|---|
| `LICENSES/AGPL-3.0-only.txt` | <https://www.gnu.org/licenses/agpl-3.0.txt> | `0D96A4FF68AD6D4B6F1F30F713B18D5184912BA8DD389F86AA7710DB079ABCB0` |
| `LICENSES/CC-BY-SA-4.0.txt` | <https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt> | `28A9529C7D0BB4DC51F4BF5C116A3D16EF247A052F7591466768DDF563FD1CF5` |
| `LICENSES/OFL-1.1.txt` | <https://raw.githubusercontent.com/adobe-fonts/source-sans/3.052R/LICENSE.md> | `89AD2C4F66DD29127527493E729C31E731F111CF10FAF5774C3DB9275ED0C22C` |

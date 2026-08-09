# Developer setup SOP

## System prerequisites

Install system tools yourself using the platform vendor instructions: Git,
Git Bash, Python 3.11 or newer, Node.js, Quarto 1.10.15, and R with `Rscript`.
The repository detects and reports these tools but does not install or upgrade
them.

On Linux, the proven server convention is a Quarto 1.10.15 binary at
`$HOME/opt/quarto-1.10.15/bin/quarto`. On Windows, Quarto may resolve on `PATH`
or in the supported per-user/system install locations. Override discovery with
`QUARTO_BIN`, `NODE_BIN`, `RSCRIPT_BIN`, or `BASH_BIN` when needed.

## Project configuration

1. On Windows, run `bash scripts/setup/windows-dev.sh` from Git Bash. On Linux,
   run `bash scripts/setup/setup.sh`.
2. Optionally rerun the non-mutating check with
   `bash scripts/setup/preflight.sh --with-social-cards`.
3. Run `bash scripts/testing/quick.sh` or
   `bash scripts/testing/comprehensive.sh --with-social-cards`.

Setup is idempotent: it reuses `.venv` and `.r-library`, then reconciles their
declared dependencies. Network access is needed only when declared Python
packages, Playwright Chromium, or declared R packages are not already cached or
installed.

## Dependency sources

- `social_generator/requirements-social.txt`: pinned Jinja2, PyYAML,
  Playwright, Pillow, and fonttools versions.
- `social_generator/requirements-social.R`: the side-effect-free R package and
  minimum-version declaration (`yaml >= 2.3.10`).
- `scripts/setup/install-r-dependencies.R`: the idempotent installer/checker
  that reconciles the R declaration into `.r-library`.
- `scripts/bs-setup-server-environment.sh`: the established Linux/server
  Quarto and local-environment conventions.

If preflight reports a missing system tool, install it outside the repository
and rerun setup. Do not add a package merely to satisfy setup unless repository
code first establishes that dependency.

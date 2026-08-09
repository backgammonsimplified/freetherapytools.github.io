# Setup entrypoints

On a new Windows laptop, clone or open the repository and run this from Git
Bash:

```bash
bash scripts/setup/windows-dev.sh
bash scripts/setup/preflight.sh --with-social-cards
```

`windows-dev.sh` is the obvious Windows entrypoint and delegates to the existing
cross-platform `setup.sh`. Setup creates or reuses only repository-local
environments (`.venv` and `.r-library`), reconciles the pinned Python
requirements, installs Playwright Chromium, reconciles the declared R package
set, and finishes with the social-card preflight. It never installs or upgrades
Git, Git Bash, Python, Node.js, Quarto, or R.

`preflight.sh` is non-mutating. Omit `--with-social-cards` to check a normal
Quarto build without requiring social-card-only R packages. `verify.sh` remains
a compatibility alias for preflight. On Linux, use
`bash scripts/setup/setup.sh`.

Platform and shared files:

- `windows/install-system-tools.ps1` reports required Windows tools; it does
  not run a package manager.
- `windows/configure-project.ps1` locates and reports system tools, creates or
  reuses `.venv`, installs `social_generator/requirements-social.txt`, and
  provisions `.r-library` from `requirements-social.R`.
- `preflight.py` and `install-r-dependencies.R` provide the shared
  non-mutating checks and idempotent R dependency reconciliation.
- `linux/install-system-tools.sh`, `linux/configure-project.sh`, and
  `linux/verify.sh` provide the same responsibilities, retaining the proven
  server Quarto location convention.

See [SETUP-SOP.md](SETUP-SOP.md) for prerequisites and recovery guidance.

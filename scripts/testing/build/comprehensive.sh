#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." && pwd)"
WITH_SOCIAL_CARDS=0

usage() {
  cat <<'EOF'
Usage:
  bash scripts/testing/build/comprehensive.sh [--with-social-cards]

Options:
  --with-social-cards  Run the canonical full social-card pipeline during the
                       Quarto build. The default skips social-card generation.
  -h, --help           Show this help.

EOF
}

for argument in "$@"; do
  case "${argument}" in
    --with-social-cards)
      WITH_SOCIAL_CARDS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'ERROR: Unrecognized argument: %s\n\n' "${argument}" >&2
      usage >&2
      exit 2
      ;;
  esac
done

PREFLIGHT_ARGUMENTS=()
if [[ ${WITH_SOCIAL_CARDS} -eq 1 ]]; then
  PREFLIGHT_ARGUMENTS+=(--with-social-cards)
fi
bash "${REPO_ROOT}/scripts/setup/preflight.sh" "${PREFLIGHT_ARGUMENTS[@]}"

if [[ -x "${REPO_ROOT}/.venv/Scripts/python.exe" ]]; then
  PYTHON_COMMAND=("${REPO_ROOT}/.venv/Scripts/python.exe")
  export PATH="${REPO_ROOT}/.venv/Scripts:${PATH}"
else
  PYTHON_COMMAND=("${REPO_ROOT}/.venv/bin/python")
  export PATH="${REPO_ROOT}/.venv/bin:${PATH}"
fi

cd "${REPO_ROOT}"
export BS_PUBLICATION_MODE="${BS_PUBLICATION_MODE:-development}"

printf 'BS comprehensive build gate\n'
printf 'Repository:   %s\n' "${REPO_ROOT}"
printf 'Social cards: %s\n\n' "$([[ ${WITH_SOCIAL_CARDS} -eq 1 ]] && printf yes || printf no)"

printf '[1/5] Quick build gate\n'
bash scripts/testing/build/quick.sh

printf '\n[2/5] Complete Python suite\n'
"${PYTHON_COMMAND[@]}" -m unittest discover -s tests -p 'test_*.py'

printf '\n[3/5] Full Quarto build\n'
if [[ ${WITH_SOCIAL_CARDS} -eq 1 ]]; then
  unset BS_SKIP_SOCIAL_CARDS || true
else
  export BS_SKIP_SOCIAL_CARDS=1
fi
quarto render site

printf '\n[4/5] Full rendered glossary and HTML audit\n'
"${PYTHON_COMMAND[@]}" scripts/learn_glossary.py check-rendered \
  --output site/_site
"${PYTHON_COMMAND[@]}" scripts/testing/build/release_ui_static_check.py

printf '\n[5/5] Diff hygiene\n'
git diff --check
printf '\nPASS: comprehensive build gate.\n'

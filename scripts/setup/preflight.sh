#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

if [[ -x "${REPO_ROOT}/.venv/Scripts/python.exe" ]]; then
  PYTHON="${REPO_ROOT}/.venv/Scripts/python.exe"
elif [[ -x "${REPO_ROOT}/.venv/bin/python" ]]; then
  PYTHON="${REPO_ROOT}/.venv/bin/python"
else
  printf 'ERROR: repository .venv is missing. Run bash scripts/setup/windows-dev.sh on Windows or bash scripts/setup/setup.sh on Linux.\n' >&2
  exit 1
fi

exec "${PYTHON}" "${SCRIPT_DIR}/preflight.py" --repo-root "${REPO_ROOT}" "$@"

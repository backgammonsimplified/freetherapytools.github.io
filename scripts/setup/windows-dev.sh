#!/usr/bin/env bash
set -Eeuo pipefail

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) ;;
  *)
    printf 'ERROR: scripts/setup/windows-dev.sh must be run from Git Bash on Windows.\n' >&2
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/setup.sh"

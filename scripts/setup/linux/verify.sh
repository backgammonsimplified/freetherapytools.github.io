#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="${1:?repository root is required}"
shift
exec bash "${REPO_ROOT}/scripts/setup/preflight.sh" "$@"

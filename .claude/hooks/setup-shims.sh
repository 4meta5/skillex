#!/usr/bin/env bash
set -euo pipefail

# Setup Shims Hook - PATH-prepended command interception
# Registered as SessionStart hook. Prepends shims directory to PATH
# via CLAUDE_ENV_FILE so shim wrappers intercept target commands.

# Guard: node must be available (shims may need it to run project-local binaries)
command -v node &>/dev/null || exit 0

# Guard: CLAUDE_ENV_FILE must be set by the runtime
if [[ -z "${CLAUDE_ENV_FILE:-}" ]]; then
  exit 0
fi

shims_dir="$(cd "$(dirname "$0")/shims" && pwd)" || {
  echo "setup-shims: shims directory not found" >&2
  exit 1
}

# Only prepend if shims directory has executables
if ls "${shims_dir}"/* &>/dev/null; then
  echo "export PATH=\"${shims_dir}:\${PATH}\"" >>"$CLAUDE_ENV_FILE"
fi

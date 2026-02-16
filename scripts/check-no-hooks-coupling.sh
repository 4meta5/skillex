#!/usr/bin/env bash
# Regression guard: fail if stale hooks-era paths reappear in skillex.
# Wired into npm test via package.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXIT=0

# Pattern 1: old CLI path (should be packages/skills-cli, not packages/cli)
if grep -rn --include='*.ts' --include='*.yaml' --include='*.json' \
  'packages/cli/' "$ROOT/packages" | grep -v 'packages/skills-cli' | grep -v node_modules; then
  echo "ERROR: Found stale 'packages/cli/' reference (should be packages/skills-cli/)"
  EXIT=1
fi

# Pattern 2: cross-repo ../hooks reference in source code
# Allowed (internal): ../../hooks/<name>.js, ../../../hooks, ../hooks/<name>.js
# Blocked (cross-repo): ../hooks/packages/..., bare ../hooks as repo path
# Strategy:
#   1. Match all lines containing ../hooks
#   2. Exclude node_modules
#   3. Exclude deeper relative paths (../../hooks, ../../../hooks)
#   4. Exclude single-segment module imports (../hooks/<name>.js or .ts only)
if grep -rn --include='*.ts' --include='*.yaml' --include='*.json' -E \
  '\.\./hooks' "$ROOT/packages" \
  | grep -v node_modules \
  | grep -v '\.\./\.\./hooks' \
  | grep -v -E '\.\./hooks/[a-zA-Z][a-zA-Z0-9_-]*\.(js|ts)'; then
  echo "ERROR: Found cross-repo '../hooks' reference"
  EXIT=1
fi

if [ $EXIT -eq 0 ]; then
  echo "check-no-hooks-coupling: PASS"
fi

exit $EXIT

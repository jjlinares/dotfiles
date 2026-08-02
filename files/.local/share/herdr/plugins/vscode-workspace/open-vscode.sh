#!/usr/bin/env bash
set -euo pipefail

context_json="${HERDR_PLUGIN_CONTEXT_JSON:-}"
if [[ -z "$context_json" ]]; then
    context_json="{}"
fi

dir="$(CONTEXT_JSON="$context_json" python3 - <<'PY'
import json
import os

try:
    ctx = json.loads(os.environ.get("CONTEXT_JSON") or "{}")
except json.JSONDecodeError:
    ctx = {}

print(ctx.get("workspace_cwd") or ctx.get("focused_pane_cwd") or "")
PY
)"

if [[ -z "$dir" ]]; then
    echo "No workspace cwd in Herdr plugin context" >&2
    exit 1
fi

exec code "$dir"

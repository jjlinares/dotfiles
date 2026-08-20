#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

plugin_dir="$HOME/.local/share/herdr/plugins/vscode-workspace"
if command -v herdr >/dev/null 2>&1; then
    log "Linking the Herdr VS Code workspace plugin"
    herdr plugin link "$plugin_dir" >/dev/null
    herdr server reload-config >/dev/null 2>&1 || true
else
    warn "herdr is not installed; skipping plugin registration"
fi

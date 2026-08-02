#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use default >/dev/null
fi

command -v npm >/dev/null 2>&1 || die "npm is required to install Pi extension dependencies"

while IFS= read -r relative || [ -n "$relative" ]; do
    case "$relative" in
        .pi/agent/extensions/*) ;;
        *) continue ;;
    esac

    extension="$DOTFILES_ROOT/files/$relative"
    [ -f "$extension/package.json" ] || continue
    [ -f "$extension/package-lock.json" ] || die "missing package-lock.json: $extension"
    log "Installing dependencies for ${relative##*/}"
    npm ci --prefix "$extension" --omit=peer --legacy-peer-deps
done < "$DOTFILES_ROOT/links.txt"

plugin_dir="$HOME/.local/share/herdr/plugins/vscode-workspace"
if command -v herdr >/dev/null 2>&1; then
    log "Linking the Herdr VS Code workspace plugin"
    herdr plugin link "$plugin_dir" >/dev/null
    herdr server reload-config >/dev/null 2>&1 || true
else
    warn "herdr is not installed; skipping plugin registration"
fi

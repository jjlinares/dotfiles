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

install_extension_dependencies() {
    local extension="$1"

    [ -d "$extension" ] || return 0
    [ -f "$extension/package.json" ] || return 0
    [ -f "$extension/package-lock.json" ] || die "missing package-lock.json: $extension"
    log "Installing dependencies for ${extension##*/}"
    npm ci --prefix "$extension" --omit=peer --legacy-peer-deps
}

link_paths=()
load_link_manifest "$DOTFILES_ROOT/links.txt" link_paths
for relative in "${link_paths[@]}"; do
    case "$relative" in
        .pi/agent/extensions/*)
            install_extension_dependencies "$DOTFILES_ROOT/files/$relative"
            ;;
    esac
done

plugin_dir="$HOME/.local/share/herdr/plugins/vscode-workspace"
if command -v herdr >/dev/null 2>&1; then
    log "Linking the Herdr VS Code workspace plugin"
    herdr plugin link "$plugin_dir" >/dev/null
    herdr server reload-config >/dev/null 2>&1 || true
else
    warn "herdr is not installed; skipping plugin registration"
fi

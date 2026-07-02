#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[+]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

backup_and_link() {
    local src="$1"
    local dest="$2"

    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
        warn "Backing up existing $dest to ${dest}.bak"
        mv "$dest" "${dest}.bak"
    elif [ -L "$dest" ]; then
        rm "$dest"
    fi

    mkdir -p "$(dirname "$dest")"
    ln -s "$src" "$dest"
    log "Linked $dest -> $src"
}

log "Setting up Herdr..."
backup_and_link "$DOTFILES_DIR/herdr/config.toml" "$HOME/.config/herdr/config.toml"

if command -v herdr &> /dev/null; then
    herdr plugin link "$DOTFILES_DIR/herdr/plugins/vscode-workspace" || warn "Failed to link VS Code workspace plugin"
    herdr server reload-config >/dev/null 2>&1 || true
else
    warn "herdr not found, skipping plugin link"
fi

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

install_codex_cli() {
    if ! command -v codex &> /dev/null; then
        if command -v npm &> /dev/null; then
            log "Installing Codex CLI..."
            npm install -g @openai/codex
        else
            warn "npm not found, skipping Codex CLI install"
        fi
    else
        log "Codex CLI already installed"
    fi
}

setup_codex_agents_md() {
    mkdir -p "$HOME/.codex"

    if [ -f "$DOTFILES_DIR/agents/AGENTS.md" ]; then
        backup_and_link "$DOTFILES_DIR/agents/AGENTS.md" "$HOME/.codex/AGENTS.md"
    fi
}

setup_codex_skills() {
    [ -d "$DOTFILES_DIR/agents/skills" ] || return

    mkdir -p "$HOME/.agents/skills"
    find "$DOTFILES_DIR/agents/skills" -mindepth 1 -maxdepth 1 | while read -r src; do
        local rel
        rel="$(basename "$src")"
        backup_and_link "$src" "$HOME/.agents/skills/$rel"
    done
}

log "Setting up Codex..."
install_codex_cli
setup_codex_agents_md
setup_codex_skills

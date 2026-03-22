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

remove_path() {
    local path="$1"

    if [ -L "$path" ]; then
        rm "$path"
    elif [ -e "$path" ]; then
        rm -rf "$path"
    fi
}

install_claude_cli() {
    if ! command -v claude &> /dev/null; then
        log "Installing Claude Code CLI..."
        curl -fsSL https://claude.ai/install.sh | bash
    else
        log "Claude Code CLI already installed"
    fi
}

setup_claude_agents_md() {
    mkdir -p "$HOME/.claude"

    if [ -e "$HOME/.claude/AGENTS.md" ] || [ -L "$HOME/.claude/AGENTS.md" ]; then
        if [ ! -e "$HOME/.claude/CLAUDE.md" ] && [ ! -L "$HOME/.claude/CLAUDE.md" ]; then
            mv "$HOME/.claude/AGENTS.md" "$HOME/.claude/CLAUDE.md"
            log "Moved $HOME/.claude/AGENTS.md -> $HOME/.claude/CLAUDE.md"
        else
            remove_path "$HOME/.claude/AGENTS.md"
            log "Removed legacy path $HOME/.claude/AGENTS.md"
        fi
    fi

    if [ -f "$DOTFILES_DIR/agents/AGENTS.md" ]; then
        backup_and_link "$DOTFILES_DIR/agents/AGENTS.md" "$HOME/.claude/CLAUDE.md"
    fi
}

setup_claude_skills() {
    [ -d "$DOTFILES_DIR/agents/skills" ] || return

    mkdir -p "$HOME/.claude/skills"
    find "$DOTFILES_DIR/agents/skills" -mindepth 1 -maxdepth 1 | while read -r src; do
        local rel
        rel="$(basename "$src")"
        backup_and_link "$src" "$HOME/.claude/skills/$rel"
    done
}

setup_claude_config() {
    [ -d "$DOTFILES_DIR/claude" ] || return

    mkdir -p "$HOME/.claude"
    find "$DOTFILES_DIR/claude" -type f ! -name "setup.sh" | while read -r src; do
        local rel="${src#$DOTFILES_DIR/claude/}"
        backup_and_link "$src" "$HOME/.claude/$rel"
    done
}

log "Setting up Claude..."
install_claude_cli
setup_claude_agents_md
setup_claude_skills
setup_claude_config

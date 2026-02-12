#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing dotfiles from $DOTFILES_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Install Oh My Zsh if not present
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    log "Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
else
    log "Oh My Zsh already installed"
fi

# Install Claude Code CLI
if ! command -v claude &> /dev/null; then
    log "Installing Claude Code CLI..."
    curl -fsSL https://claude.ai/install.sh | bash
else
    log "Claude Code CLI already installed"
fi

# Install Codex CLI
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

# Install GitHub CLI
if ! command -v gh &> /dev/null; then
    log "Installing GitHub CLI..."
    (type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
        && sudo mkdir -p -m 755 /etc/apt/keyrings \
        && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
        && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
        && sudo mkdir -p -m 755 /etc/apt/sources.list.d \
        && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
        && sudo apt update \
        && sudo apt install gh -y
else
    log "GitHub CLI already installed"
fi

# Shell configs
log "Setting up shell configs..."
backup_and_link "$DOTFILES_DIR/shell/.bashrc" "$HOME/.bashrc"
backup_and_link "$DOTFILES_DIR/shell/.zshrc" "$HOME/.zshrc"
backup_and_link "$DOTFILES_DIR/shell/.profile" "$HOME/.profile"

# Git configs
log "Setting up git configs..."
backup_and_link "$DOTFILES_DIR/git/.gitconfig" "$HOME/.gitconfig"
mkdir -p "$HOME/.config/git"
backup_and_link "$DOTFILES_DIR/git/ignore" "$HOME/.config/git/ignore"

# Merge agents + Claude configs into ~/.claude
log "Setting up Claude configs (agents + claude)..."
mkdir -p "$HOME/.claude"
if [ -e "$HOME/.claude/AGENTS.md" ] || [ -L "$HOME/.claude/AGENTS.md" ]; then
    if [ ! -e "$HOME/.claude/CLAUDE.md" ] && [ ! -L "$HOME/.claude/CLAUDE.md" ]; then
        mv "$HOME/.claude/AGENTS.md" "$HOME/.claude/CLAUDE.md"
        log "Renamed ~/.claude/AGENTS.md -> ~/.claude/CLAUDE.md"
    else
        rm "$HOME/.claude/AGENTS.md"
    fi
fi
find "$DOTFILES_DIR/agents" -type f | while read -r src; do
    rel="${src#$DOTFILES_DIR/agents/}"
    if [ "$rel" = "AGENTS.md" ]; then
        rel="CLAUDE.md"
    fi
    backup_and_link "$src" "$HOME/.claude/$rel"
done

# Claude configs
log "Applying Claude-specific configs..."
find "$DOTFILES_DIR/claude" -type f | while read -r src; do
    rel="${src#$DOTFILES_DIR/claude/}"
    backup_and_link "$src" "$HOME/.claude/$rel"
done

# Codex configs
log "Setting up Codex configs..."
mkdir -p "$HOME/.codex"
find "$DOTFILES_DIR/codex" -type f | while read -r src; do
    rel="${src#$DOTFILES_DIR/codex/}"
    backup_and_link "$src" "$HOME/.codex/$rel"
done

# GTK configs
log "Setting up GTK configs..."
backup_and_link "$DOTFILES_DIR/gtk/.gtkrc-2.0" "$HOME/.gtkrc-2.0"
mkdir -p "$HOME/.config/gtk-3.0"
mkdir -p "$HOME/.config/gtk-4.0"
backup_and_link "$DOTFILES_DIR/gtk/gtk-3.0/settings.ini" "$HOME/.config/gtk-3.0/settings.ini"
backup_and_link "$DOTFILES_DIR/gtk/gtk-4.0/settings.ini" "$HOME/.config/gtk-4.0/settings.ini"

# Cursor configs
log "Setting up Cursor configs..."
mkdir -p "$HOME/.config/Cursor/User"
backup_and_link "$DOTFILES_DIR/cursor/settings.json" "$HOME/.config/Cursor/User/settings.json"
backup_and_link "$DOTFILES_DIR/cursor/keybindings.json" "$HOME/.config/Cursor/User/keybindings.json"

# Detect devcontainer
IN_DEVCONTAINER=false
if [ -n "$REMOTE_CONTAINERS" ] || [ -f "/.dockerenv" ]; then
    IN_DEVCONTAINER=true
    log "Devcontainer detected"
fi

install_extensions() {
    local cmd="$1"
    local file="$2"
    [ -f "$file" ] || return
    while IFS= read -r ext; do
        [ -z "$ext" ] && continue
        [[ "$ext" =~ ^# ]] && continue
        $cmd --install-extension "$ext" || warn "Failed to install $ext"
    done < "$file"
}

# Install Cursor extensions
if command -v cursor &> /dev/null; then
    log "Installing Cursor extensions..."
    install_extensions cursor "$DOTFILES_DIR/cursor/extensions-core.txt"
    if [ "$IN_DEVCONTAINER" = false ]; then
        install_extensions cursor "$DOTFILES_DIR/cursor/extensions-local.txt"
    fi
else
    warn "Cursor not found, skipping extension install"
fi

# Install VS Code extensions
if command -v code &> /dev/null; then
    log "Installing VS Code extensions..."
    install_extensions code "$DOTFILES_DIR/vscode/extensions-core.txt"
    if [ "$IN_DEVCONTAINER" = false ]; then
        install_extensions code "$DOTFILES_DIR/vscode/extensions-local.txt"
    fi
else
    warn "VS Code not found, skipping extension install"
fi

echo ""
log "Dotfiles installation complete!"
log "You may need to restart your shell or log out and back in for changes to take effect."

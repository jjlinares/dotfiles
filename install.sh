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

# Ensure curl is available for downloads
if ! command -v curl &> /dev/null; then
    log "Installing curl..."
    sudo apt update
    sudo apt install curl -y
else
    log "curl already installed"
fi

# Install Oh My Zsh if not present
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    log "Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
else
    log "Oh My Zsh already installed"
fi

# Install ripgrep
if ! command -v rg &> /dev/null; then
    log "Installing ripgrep..."
    RIPGREP_URL=$(curl -fsSL https://api.github.com/repos/BurntSushi/ripgrep/releases/latest | grep 'browser_download_url.*amd64.deb"' | cut -d '"' -f 4 | head -n 1)
    tmp_dir=$(mktemp -d)
    curl -fsSL "$RIPGREP_URL" -o "$tmp_dir/ripgrep.deb"
    sudo dpkg -i "$tmp_dir/ripgrep.deb"
    rm -rf "$tmp_dir"
else
    log "ripgrep already installed"
fi

# Install yq
if ! command -v yq &> /dev/null; then
    log "Installing yq..."
    sudo curl -fsSL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o /usr/local/bin/yq
    sudo chmod +x /usr/local/bin/yq
else
    log "yq already installed"
fi

# Install GitHub CLI
if ! command -v gh &> /dev/null; then
    log "Installing GitHub CLI..."
    sudo mkdir -p -m 755 /etc/apt/keyrings \
        && out=$(mktemp) \
        && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o "$out" \
        && cat "$out" | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
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
backup_and_link "$DOTFILES_DIR/shell/.shell_shared" "$HOME/.shell_shared"
backup_and_link "$DOTFILES_DIR/shell/.zshrc" "$HOME/.zshrc"
backup_and_link "$DOTFILES_DIR/shell/.profile" "$HOME/.profile"

# Git configs
log "Setting up git configs..."
backup_and_link "$DOTFILES_DIR/git/.gitconfig" "$HOME/.gitconfig"
mkdir -p "$HOME/.config/git"
backup_and_link "$DOTFILES_DIR/git/ignore" "$HOME/.config/git/ignore"

bash "$DOTFILES_DIR/claude/setup.sh"
bash "$DOTFILES_DIR/codex/setup.sh"
bash "$DOTFILES_DIR/pi/setup.sh"
bash "$DOTFILES_DIR/herdr/setup.sh"
bash "$DOTFILES_DIR/kde/setup.sh"
bash "$DOTFILES_DIR/vscode/setup.sh"

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

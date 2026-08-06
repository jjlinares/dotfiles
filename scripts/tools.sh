#!/usr/bin/env bash
set -o pipefail

# NVM does not load reliably under errexit, so failures are checked explicitly.
# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

command -v git >/dev/null 2>&1 || die "git is required"
command -v curl >/dev/null 2>&1 || die "curl is required"

if ! command -v uv >/dev/null 2>&1; then
    log "Installing uv"
    curl -LsSf https://astral.sh/uv/0.11.7/install.sh \
        | env UV_NO_MODIFY_PATH=1 sh \
        || die "uv installation failed"
    export PATH="$HOME/.local/bin:$PATH"
fi

zsh_root="$HOME/.oh-my-zsh"
if [ ! -f "$zsh_root/oh-my-zsh.sh" ]; then
    [ ! -e "$zsh_root" ] || die "$zsh_root exists but is not a valid Oh My Zsh installation"
    log "Installing Oh My Zsh"
    git clone --depth=1 https://github.com/ohmyzsh/ohmyzsh.git "$zsh_root" || die "Oh My Zsh installation failed"
fi

export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    [ ! -e "$NVM_DIR" ] || die "$NVM_DIR exists but does not contain nvm.sh"
    log "Installing NVM"
    nvm_version="$(
        git ls-remote --tags --refs --sort='version:refname' \
            https://github.com/nvm-sh/nvm.git 'v[0-9]*' \
            | awk -F/ 'END { print $3 }'
    )"
    [ -n "$nvm_version" ] || die "could not determine the latest NVM version"
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$nvm_version/install.sh" \
        | PROFILE=/dev/null NVM_DIR="$NVM_DIR" bash \
        || die "NVM installation failed"
fi

# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" || die "could not load NVM"
log "Ensuring Node LTS is installed"
nvm install --lts || die "Node LTS installation failed"
nvm alias default 'lts/*' || die "could not set the default Node version"
nvm use default >/dev/null || die "could not activate the default Node version"

while IFS= read -r package || [ -n "$package" ]; do
    case "$package" in
        ''|'#'*) continue ;;
    esac
    if ! npm list --global --depth=0 "$package" >/dev/null 2>&1; then
        log "Installing npm package $package"
        npm install --global "$package" || die "failed to install $package"
    fi
done < "$DOTFILES_ROOT/packages/npm.txt"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if [ ! -x "$BUN_INSTALL/bin/bun" ]; then
    log "Installing Bun"
    curl -fsSL https://bun.sh/install | bash || die "Bun installation failed"
fi

export PNPM_HOME="$HOME/.local/share/pnpm"
if [ ! -x "$PNPM_HOME/bin/pnpm" ] && [ ! -x "$PNPM_HOME/pnpm" ]; then
    log "Installing pnpm"
    temporary_home="$(mktemp -d)" || die "could not create a temporary directory"
    touch "$temporary_home/.bashrc" || die "could not initialize temporary home"
    HOME="$temporary_home" PNPM_HOME="$PNPM_HOME" SHELL=/bin/bash \
        sh -c 'curl -fsSL https://get.pnpm.io/install.sh | sh -' \
        || { rm -rf "$temporary_home"; die "pnpm installation failed"; }
    rm -rf "$temporary_home"
fi

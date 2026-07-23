# Environment shared by login and interactive Bash/Zsh shells.

path_prepend() {
    [ -d "$1" ] || return 0
    case ":${PATH:-}:" in
        *":$1:"*) ;;
        *) PATH="$1${PATH:+:$PATH}" ;;
    esac
}

export BUN_INSTALL="$HOME/.bun"
export PNPM_HOME="$HOME/.local/share/pnpm"
export NVM_DIR="$HOME/.nvm"
export PORTLESS_STATE_DIR="$HOME/.portless"
export BH_DOMAIN_SKILLS=1

# Lowest to highest priority because each entry is prepended.
path_prepend "${KREW_ROOT:-$HOME/.krew}/bin"
path_prepend "$HOME/.browser-use-env/bin"
path_prepend "$HOME/.opencode/bin"
path_prepend "$PNPM_HOME"
path_prepend "$PNPM_HOME/bin"
path_prepend "$BUN_INSTALL/bin"
path_prepend "$HOME/bin"
path_prepend "$HOME/.local/bin"
export PATH
unset -f path_prepend

if [ -z "${EDITOR:-}" ]; then
    if command -v code >/dev/null 2>&1; then
        EDITOR="code --wait"
    elif command -v nvim >/dev/null 2>&1; then
        EDITOR="nvim"
    else
        EDITOR="vi"
    fi
fi
export EDITOR
export VISUAL="${VISUAL:-$EDITOR}"

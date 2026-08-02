# Interactive configuration shared by Bash and Zsh.

# kubectl
alias k="kubectl"
alias kk="kubectl kustomize --enable-helm"
alias kka="kustomize build --enable-helm . | kubectl apply --server-side -f -"
alias kkd="kubectl kustomize --enable-helm | kubectl delete -f -"

# NVM
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
if [ -n "${BASH_VERSION:-}" ] && [ -s "$NVM_DIR/bash_completion" ]; then
    . "$NVM_DIR/bash_completion"
fi

# pi in tmux
tpi() {
    if [ -z "$1" ]; then
        echo "usage: tpi <session-id>" >&2
        return 2
    fi

    local name="$1"
    tmux new-session -A -s "$name" "pi --session-id $(printf '%q' "$name")"
}

# Machine-local variables and secrets; intentionally unmanaged.
[ -f "$HOME/.config/shell/env.local" ] && . "$HOME/.config/shell/env.local"

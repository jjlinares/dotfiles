[ -f "$HOME/.config/shell/env.sh" ] && . "$HOME/.config/shell/env.sh"

export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)

# Updates are managed explicitly rather than during shell startup.
zstyle ':omz:update' mode disabled

if [ -r "$ZSH/oh-my-zsh.sh" ]; then
    source "$ZSH/oh-my-zsh.sh"
fi

[ -f "$HOME/.config/shell/interactive.sh" ] && source "$HOME/.config/shell/interactive.sh"

# Bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

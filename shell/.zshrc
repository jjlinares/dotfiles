# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load
ZSH_THEME="robbyrussell"

# Which plugins would you like to load?
plugins=(git)

source $ZSH/oh-my-zsh.sh

[ -f "$HOME/.shell_shared" ] && source "$HOME/.shell_shared"

export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# bun completions
[ -s "/home/jj/.bun/_bun" ] && source "/home/jj/.bun/_bun"

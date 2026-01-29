# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load
ZSH_THEME="robbyrussell"

# Which plugins would you like to load?
plugins=(git)

source $ZSH/oh-my-zsh.sh

# kubectl
alias k="kubectl"
alias kk="kubectl kustomize --enable-helm"
alias kka="kubectl kustomize --enable-helm | kubectl apply --server-side -f -"
alias kkd="kubectl kustomize --enable-helm | kubectl delete -f -"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# opencode
export PATH=$HOME/.opencode/bin:$PATH

# browser remote debugging
chrome-debug() {
    local DEBUG_PORT=9222
    local BRIDGE_PORT=9223
    local PROFILE_DIR="$HOME/.config/chrome-debug-profile"

    # --- 1. Pre-flight Checks ---
    if ss -tulpn | grep -q ":$DEBUG_PORT "; then
        echo "❌ Error: Port $DEBUG_PORT is in use. Chrome is likely already open."
        return 1
    fi
    if ss -tulpn | grep -q ":$BRIDGE_PORT "; then
        echo "❌ Error: Port $BRIDGE_PORT is in use. Kill the old socat process."
        return 1
    fi

    echo "🚀 Starting Chrome with Remote Debugging Bridge..."

    # --- 2. Start Chrome ---
    google-chrome \
        --remote-debugging-port=$DEBUG_PORT \
        --user-data-dir="$PROFILE_DIR" \
        --no-first-run \
        --no-default-browser-check \
        >/dev/null 2>&1 &
    
    # --- 3. Start Bridge ---
    # Wait for Chrome to initialize
    local attempts=0
    while ! ss -tulpn | grep -q ":$DEBUG_PORT "; do
        sleep 0.5
        attempts=$((attempts+1))
        if [ $attempts -ge 10 ]; then
            echo "❌ Error: Chrome failed to start."
            return 1
        fi
    done

    # Bind only docker host interface (172.17.0.1)
    socat TCP-LISTEN:$BRIDGE_PORT,fork,bind=172.17.0.1 TCP:127.0.0.1:$DEBUG_PORT &
    local SOCAT_PID=$!

    echo "✅ Connected."
    echo "   Gateway: http://host.docker.internal:$BRIDGE_PORT"
    echo ""
    
    # --- 4. Keep Alive ---
    read -k 1 -s "?Press ANY KEY to stop the bridge and close Chrome..."
    echo ""

    # --- 5. Cleanup ---
    echo "🛑 Shutting down..."
    
    # Kill the bridge
    kill $SOCAT_PID 2>/dev/null
    
    # Kill the specific Chrome instance using this profile
    # We use pkill -f to find the process command line containing the profile path
    pkill -f "chrome-debug-profile"
    
    echo "Done."
}

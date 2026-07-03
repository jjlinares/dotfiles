#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[+]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

if ! command -v code &> /dev/null; then
    warn "VS Code not found, skipping settings"
    exit 0
fi

log "Setting VS Code window title..."
settings="$HOME/.config/Code/User/settings.json"
mkdir -p "$(dirname "$settings")"
python3 - "$settings" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
if path.exists() and path.read_text().strip():
    data = json.loads(path.read_text())
else:
    data = {}

data["window.title"] = "${rootPath}${separator}${appName}"
path.write_text(json.dumps(data, indent=2) + "\n")
PY

#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

[ "$(uname -s)" = Linux ] || die "package installation only supports Linux"
command -v apt-get >/dev/null 2>&1 || die "package installation requires apt"

mapfile -t packages < <(grep -Ev '^[[:space:]]*(#|$)' "$DOTFILES_ROOT/packages/apt.txt")
[ "${#packages[@]}" -gt 0 ] || die "packages/apt.txt is empty"

log "Installing declared apt packages"
sudo apt-get update
sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    printf 'usage: %s [all|packages|links|post]\n' "${0##*/}" >&2
    exit 2
}

mode="${1:-all}"
[ "$#" -le 1 ] || usage

case "$mode" in
    all)
        "$ROOT/scripts/packages.sh"
        "$ROOT/scripts/install-kubernetes.sh"
        "$ROOT/scripts/tools.sh"
        "$ROOT/scripts/links.sh"
        "$ROOT/scripts/post-install.sh"
        ;;
    packages)
        "$ROOT/scripts/packages.sh"
        "$ROOT/scripts/install-kubernetes.sh"
        "$ROOT/scripts/tools.sh"
        ;;
    links)
        "$ROOT/scripts/links.sh"
        ;;
    post)
        "$ROOT/scripts/post-install.sh"
        ;;
    *)
        usage
        ;;
esac

printf '%s\n' '[+] Dotfiles installation complete'

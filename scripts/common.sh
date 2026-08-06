#!/usr/bin/env bash

DOTFILES_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

load_link_manifest() {
    local manifest="$1"
    local output_name="$2"
    local -n output="$output_name"
    local relative directory source_dir child

    output=()
    while IFS= read -r relative || [ -n "$relative" ]; do
        case "$relative" in
            ''|'#'*) continue ;;
            /*|../*|*/../*|*/..|.|./*|*/./*) die "unsafe link path in links.txt: $relative" ;;
            */\*)
                directory="${relative%/\*}"
                case "$directory" in
                    *'*'*|*'?'*|*'['*) die "unsupported link pattern in links.txt: $relative" ;;
                esac
                source_dir="$DOTFILES_ROOT/files/$directory"
                [ -d "$source_dir" ] || die "missing link source directory: $source_dir"
                while IFS= read -r -d '' child; do
                    output+=("$directory/${child##*/}")
                done < <(find "$source_dir" -mindepth 1 -maxdepth 1 -print0 | sort -z)
                ;;
            *'*'*|*'?'*|*'['*) die "unsupported link pattern in links.txt: $relative" ;;
            *) output+=("$relative") ;;
        esac
    done < "$manifest"
}

log() {
    printf '[+] %s\n' "$*"
}

warn() {
    printf '[!] %s\n' "$*" >&2
}

die() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

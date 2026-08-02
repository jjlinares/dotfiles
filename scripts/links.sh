#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

manifest="$DOTFILES_ROOT/links.txt"

# Linked files keep their repository permissions. Preserve the previous
# non-group-writable invariant without walking generated dependency trees.
find "$DOTFILES_ROOT/files" \
    -type d -name node_modules -prune -o \
    -exec chmod go-w {} +

backup_root="$HOME/.local/state/dotfiles/backups/$(date +%Y%m%d-%H%M%S)-$$"
backup_count=0

while IFS= read -r relative || [ -n "$relative" ]; do
    case "$relative" in
        ''|'#'*) continue ;;
        /*|../*|*/../*|*/..|.|./*|*/./*) die "unsafe link path in links.txt: $relative" ;;
    esac

    source_path="$DOTFILES_ROOT/files/$relative"
    destination="$HOME/$relative"
    [ -e "$source_path" ] || [ -L "$source_path" ] || die "missing link source: $source_path"

    if [ -L "$destination" ] \
        && [ "$(readlink -f -- "$destination" 2>/dev/null || true)" = "$(readlink -f -- "$source_path")" ]; then
        log "Already linked: ~/$relative"
        continue
    fi

    if [ -e "$destination" ] || [ -L "$destination" ]; then
        if [ "$backup_count" -eq 0 ]; then
            mkdir -p "$backup_root"
        fi
        backup_path="$backup_root/$relative"
        mkdir -p "$(dirname -- "$backup_path")"
        mv -- "$destination" "$backup_path"
        backup_count=$((backup_count + 1))
        warn "Backed up ~/$relative to $backup_path"
    fi

    mkdir -p "$(dirname -- "$destination")"
    ln -s "$source_path" "$destination"
    log "Linked ~/$relative"
done < "$manifest"

if [ "$backup_count" -gt 0 ]; then
    log "Saved $backup_count backup(s) under $backup_root"
fi

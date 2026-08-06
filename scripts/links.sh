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
link_paths=()
load_link_manifest "$manifest" link_paths

prepare_link_parent() {
    local relative="$1"
    local parent="${relative%/*}"
    local remaining component prefix destination managed_target

    [ "$parent" != "$relative" ] || return 0

    remaining="$parent"
    prefix=""
    while [ -n "$remaining" ]; do
        component="${remaining%%/*}"
        prefix="${prefix:+$prefix/}$component"
        destination="$HOME/$prefix"
        managed_target="$DOTFILES_ROOT/files/$prefix"

        if [ -L "$destination" ] \
            && [ -e "$managed_target" ] \
            && [ "$(readlink -f -- "$destination" 2>/dev/null || true)" = "$(readlink -f -- "$managed_target")" ]; then
            rm -- "$destination"
            mkdir -- "$destination"
            log "Replaced obsolete directory link: ~/$prefix"
        fi

        [ "$remaining" != "$component" ] || break
        remaining="${remaining#*/}"
    done
}

for relative in "${link_paths[@]}"; do
    prepare_link_parent "$relative"

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
done

if [ "$backup_count" -gt 0 ]; then
    log "Saved $backup_count backup(s) under $backup_root"
fi

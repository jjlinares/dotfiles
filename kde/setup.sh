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

kwriteconfig_cmd() {
    if command -v kwriteconfig6 &> /dev/null; then
        kwriteconfig6 "$@"
    elif command -v kwriteconfig5 &> /dev/null; then
        kwriteconfig5 "$@"
    else
        return 1
    fi
}

set_kwin_shortcut() {
    local key="$1"
    local value="$2"
    kwriteconfig_cmd --file kglobalshortcutsrc --group kwin --key "$key" "$value"
}

set_service_shortcut() {
    local desktop_file="$1"
    local value="$2"
    kwriteconfig_cmd --file kglobalshortcutsrc --group services --group "$desktop_file" --key _launch "$value"
}

if ! command -v kwriteconfig6 &> /dev/null && ! command -v kwriteconfig5 &> /dev/null; then
    warn "KDE kwriteconfig not found, skipping KDE shortcuts"
    exit 0
fi

log "Setting up KDE shortcuts..."

# Custom KDE tile zones. Meta+Arrow remains KDE's built-in half-screen quick tile.
set_kwin_shortcut "Switch Window Down" "none,,Switch to Window Below"
set_kwin_shortcut "Switch Window Left" "none,,Switch to Window to the Left"
set_kwin_shortcut "Switch Window Right" "none,,Switch to Window to the Right"
set_kwin_shortcut "Switch Window Up" "none,,Switch to Window Above"
set_kwin_shortcut "Window Custom Quick Tile Bottom" "Meta+Alt+Down,Meta+Alt+Down,Custom Quick Tile Window to the Bottom"
set_kwin_shortcut "Window Custom Quick Tile Left" "Meta+Alt+Left,Meta+Alt+Left,Custom Quick Tile Window to the Left"
set_kwin_shortcut "Window Custom Quick Tile Right" "Meta+Alt+Right,Meta+Alt+Right,Custom Quick Tile Window to the Right"
set_kwin_shortcut "Window Custom Quick Tile Top" "Meta+Alt+Up,Meta+Alt+Up,Custom Quick Tile Window to the Top"

# App/search launchers.
set_service_shortcut "com.mitchellh.ghostty.desktop" "Ctrl+Alt+Space"
set_service_shortcut "org.kde.krunner.desktop" $'Alt+Space\tAlt+F2\tSearch'

set_service_shortcut "org.kde.spectacle.desktop" "Meta+Shift+S"

python3 <<'PY' || warn "Could not update live KDE shortcuts; log out/in or open System Settings to reload"
try:
    import dbus
except Exception:
    raise SystemExit(1)

bus = dbus.SessionBus()
try:
    iface = dbus.Interface(bus.get_object('org.kde.kglobalaccel', '/kglobalaccel'), 'org.kde.KGlobalAccel')
except Exception:
    raise SystemExit(1)

NO_AUTOLOAD = dbus.UInt32(4)

def action_id(component, name, friendly_name, description):
    return dbus.Array([component, name, friendly_name, description], signature='s')

def set_shortcut(component, name, friendly_name, description, keys):
    iface.setShortcut(
        action_id(component, name, friendly_name, description),
        dbus.Array([dbus.Int32(key) for key in keys], signature='i'),
        NO_AUTOLOAD,
    )

# Qt key integers. Avoids qdbus array pain.
set_shortcut('kwin', 'Switch Window Down', 'KWin', 'Switch to Window Below', [])
set_shortcut('kwin', 'Switch Window Left', 'KWin', 'Switch to Window to the Left', [])
set_shortcut('kwin', 'Switch Window Right', 'KWin', 'Switch to Window to the Right', [])
set_shortcut('kwin', 'Switch Window Up', 'KWin', 'Switch to Window Above', [])
set_shortcut('kwin', 'Window Custom Quick Tile Bottom', 'KWin', 'Custom Quick Tile Window to the Bottom', [419430421])
set_shortcut('kwin', 'Window Custom Quick Tile Left', 'KWin', 'Custom Quick Tile Window to the Left', [419430418])
set_shortcut('kwin', 'Window Custom Quick Tile Right', 'KWin', 'Custom Quick Tile Window to the Right', [419430420])
set_shortcut('kwin', 'Window Custom Quick Tile Top', 'KWin', 'Custom Quick Tile Window to the Top', [419430419])
set_shortcut('com.mitchellh.ghostty.desktop', '_launch', 'Ghostty', 'Ghostty', [201326624])
set_shortcut('org.kde.krunner.desktop', '_launch', 'KRunner', 'KRunner', [134217760, 150994993, 16777362])
set_shortcut('org.kde.spectacle.desktop', '_launch', 'Spectacle', 'Launch Spectacle', [301989971])
PY

if qdbus6 org.kde.KWin /KWin org.kde.KWin.reconfigure &> /dev/null; then
    log "Reloaded KWin"
elif qdbus org.kde.KWin /KWin org.kde.KWin.reconfigure &> /dev/null; then
    log "Reloaded KWin"
else
    warn "KWin reload unavailable; shortcuts may apply after log out/in"
fi

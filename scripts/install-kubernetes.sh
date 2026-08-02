#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
. "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/common.sh"

KUBERNETES_MINOR="${KUBERNETES_MINOR:-v1.35}"
[[ "$KUBERNETES_MINOR" =~ ^v[0-9]+\.[0-9]+$ ]] \
    || die "invalid Kubernetes minor: $KUBERNETES_MINOR"

command -v apt-get >/dev/null 2>&1 || die "Kubernetes installation requires apt"
command -v curl >/dev/null 2>&1 || die "Kubernetes installation requires curl"
command -v gpg >/dev/null 2>&1 || die "Kubernetes installation requires gpg"

log "Configuring the Kubernetes $KUBERNETES_MINOR apt repository"
sudo install -d -m 0755 /etc/apt/keyrings
key_file="$(mktemp)"
keyring_file="$(mktemp)"
trap 'rm -f "$key_file" "$keyring_file"' EXIT HUP INT TERM

curl -fsSL "https://pkgs.k8s.io/core:/stable:/$KUBERNETES_MINOR/deb/Release.key" -o "$key_file"
gpg --dearmor --batch --yes --output "$keyring_file" "$key_file"
sudo install -m 0644 "$keyring_file" /etc/apt/keyrings/kubernetes-apt-keyring.gpg
printf '%s\n' \
    "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/$KUBERNETES_MINOR/deb/ /" \
    | sudo tee /etc/apt/sources.list.d/kubernetes.list >/dev/null
sudo chmod 0644 /etc/apt/sources.list.d/kubernetes.list

log "Installing kubectl"
sudo apt-get update
sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y kubectl

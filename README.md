# Dotfiles

Personal Linux configuration, installed with direct symlinks.

## Install

```bash
git clone git@github.com:jjlinares/dotfiles.git ~/projects/dotfiles
~/projects/dotfiles/install.sh
```

The installer runs, in order:

1. generic apt package installation
2. Kubernetes repository and `kubectl` installation
3. user tool installation (Oh My Zsh, NVM, Node, Bun, pnpm)
4. symlink creation
5. Herdr plugin registration

Existing destinations are moved to timestamped directories under
`~/.local/state/dotfiles/backups/` before linking.

## Commands

```bash
./install.sh           # full setup
./install.sh packages  # apt, Kubernetes, and user tools
./install.sh links     # create or repair symlinks
./install.sh post      # Herdr registration
```

## Daily use

Files under `files/` mirror paths under `$HOME`. Because installed files are
symlinks, editing either path changes the repository immediately:

```bash
vim ~/.bashrc
git -C ~/projects/dotfiles diff
```

`links.txt` is the explicit list of paths owned by this repository. Add a
source under `files/`, add its home-relative path to `links.txt`, then run
`./install.sh links`.

## Local Qwen3-ASR

The repository owns the local transcription adapter, launcher, and systemd
user unit. The Python environment and model weights remain machine-local and
are never installed by the normal dotfiles workflow.

Provision each phase explicitly:

```bash
./scripts/qwen3-asr.sh runtime  # pinned Python/CUDA dependencies
./scripts/qwen3-asr.sh model    # explicit 3.9 GB model download
./install.sh links              # adapter and user unit
./scripts/qwen3-asr.sh enable   # start now and at future logins
./scripts/qwen3-asr.sh status
```

The server listens only on `http://127.0.0.1:26007`. Configure OpenWhispr with
base URL `http://127.0.0.1:26007/v1` and model
`Qwen/Qwen3-ASR-1.7B-hf`.

## Sunshine

The repository owns Sunshine's non-secret application configuration, systemd
user unit, and dynamic KScreen mode helper. Credentials and runtime state stay
under the unmanaged portions of `~/.config/sunshine/`.

The helper discovers a connected display instead of relying on unstable KDE
connector names such as `DP-3` or `DP-4`.

## Pi

Pi runtime and configuration are managed by
[`jjlinares/pi`](https://github.com/jjlinares/pi). Run `~/projects/pi/install.sh`
to install or repair the host setup. Credentials and mutable state remain under
`~/.pi/agent`.

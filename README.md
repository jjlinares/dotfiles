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
3. user tool installation (Oh My Zsh, NVM, Node, Pi, Bun, pnpm)
4. symlink creation
5. Pi extension dependency installation and Herdr plugin registration

Existing destinations are moved to timestamped directories under
`~/.local/state/dotfiles/backups/` before linking.

## Commands

```bash
./install.sh           # full setup
./install.sh packages  # apt, Kubernetes, and user tools
./install.sh links     # create or repair symlinks
./install.sh post      # Pi dependencies and Herdr registration
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

## Pi ownership

The repository links only stable Pi resources: instructions, agents, skills,
and the extensions directory. Runtime state remains local, including credentials,
settings, trust data, sessions, history, binaries, and Pi's npm directory.

# Dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). The repository itself is the
chezmoi source state; no `install.sh` or symlink checkout is required.

## Bootstrap

While migration remains on the `chezmoi` branch:

```sh
chezmoi init --branch chezmoi --apply jjlinares
```

After the branch becomes `master`:

```sh
chezmoi init --apply jjlinares
```

## Daily use

```sh
chezmoi diff       # review source state against $HOME
chezmoi apply      # apply source state
chezmoi update     # pull and apply repository changes
chezmoi cd         # open the source repository
```

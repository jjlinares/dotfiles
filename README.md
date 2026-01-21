# Dotfiles

Personal dotfiles for Linux systems.

## Quick Install

```bash
git clone https://github.com/jjlinares/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

## What's Included

| Directory | Contents |
|-----------|----------|
| `shell/` | Bash, Zsh, profile configs (kubectl aliases) |
| `git/` | Git config and global ignore |
| `claude/` | Claude Code CLI settings |
| `cursor/` | Cursor IDE settings, keybindings, extensions |
| `vscode/` | VS Code extensions |
| `gtk/` | GTK 2/3/4 theme settings (Breeze-Dark) |

## Install Script

The `install.sh` script will:

1. Install Oh My Zsh (if not present)
2. Install Claude Code CLI (if not present)
3. Create symlinks for all config files
4. Backup existing configs to `*.bak`
5. Install Cursor/VS Code extensions (host only)

## Devcontainers

This repo works with VS Code/Cursor devcontainer dotfiles feature.

Add to your settings:
```json
"dotfiles.repository": "jjlinares/dotfiles",
"dotfiles.installCommand": "./install.sh"
```

### Extension Handling

Extensions are split into two files:

| File | When Installed |
|------|----------------|
| `extensions-core.txt` | Always (including devcontainers) |
| `extensions-local.txt` | Host only (skipped in devcontainers) |

**Note:** The dotfiles script runs before VS Code connects to the container, so the `code` CLI isn't available yet. Run the script again after the container is ready to install extensions:

```bash
~/dotfiles/install.sh
```

## Manual Steps

After running `install.sh`, you may still need to:

- Install NVM: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash`
- Install Bun: `curl -fsSL https://bun.sh/install | bash`
- Install pnpm: `npm install -g pnpm`

## Structure

```
dotfiles/
├── install.sh
├── README.md
├── shell/
│   ├── .bashrc
│   ├── .zshrc
│   └── .profile
├── git/
│   ├── .gitconfig
│   └── ignore
├── claude/
│   ├── CLAUDE.md
│   └── settings.json
├── cursor/
│   ├── settings.json
│   ├── keybindings.json
│   ├── extensions-core.txt
│   └── extensions-local.txt
├── vscode/
│   ├── extensions-core.txt
│   └── extensions-local.txt
└── gtk/
    ├── .gtkrc-2.0
    ├── gtk-3.0/
    │   └── settings.ini
    └── gtk-4.0/
        └── settings.ini
```

# Dotfiles

Personal dotfiles for Linux systems.

## Quick Install

```bash
git clone https://github.com/YOUR_USERNAME/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

## What's Included

| Directory | Contents |
|-----------|----------|
| `shell/` | Bash, Zsh, profile configs |
| `git/` | Git config and global ignore |
| `claude/` | Claude Code CLI settings |
| `cursor/` | Cursor IDE settings, keybindings, extensions |
| `vscode/` | VS Code extensions list |
| `gtk/` | GTK 2/3/4 theme settings (Breeze-Dark) |

## Install Script

The `install.sh` script will:

1. Install Oh My Zsh (if not present)
2. Create symlinks for all config files
3. Backup existing configs to `*.bak`
4. Install Cursor/VS Code extensions (if available)

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
│   └── extensions.txt
├── vscode/
│   └── extensions.txt
└── gtk/
    ├── .gtkrc-2.0
    ├── gtk-3.0/
    │   └── settings.ini
    └── gtk-4.0/
        └── settings.ini
```

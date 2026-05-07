# Dotfiles

Personal dotfiles for Linux systems.

## Quick Install

```bash
git clone https://github.com/jjlinares/dotfiles.git ~/dotfiles && ~/dotfiles/install.sh
```

## What's Included

| Directory | Contents |
|-----------|----------|
| `shell/` | Bash, Zsh, shared shell config, profile configs |
| `git/` | Git config and global ignore |
| `agents/` | Shared `AGENTS.md`, agent prompts, and skills |
| `claude/` | Claude-specific config (symlinked into `~/.claude`) |
| `codex/` | Codex setup helpers |
| `pi/` | Pi Coding Agent setup helpers |
| `cursor/` | Cursor IDE settings, keybindings, extensions |
| `vscode/` | VS Code extensions |

## Install Script

The `install.sh` script will:

1. Ensure `curl` is installed for downloads
2. Install Oh My Zsh (if not present)
3. Install ripgrep (`rg`) from the latest GitHub release `.deb` (if not present)
4. Install `yq` from the latest GitHub release (if not present)
5. Install GitHub CLI (if not present)
6. Install Claude Code CLI (if not present)
7. Install Codex CLI (if not present, requires `npm`)
8. Install Pi Coding Agent (if not present, requires `npm`)
9. Set up shared agent instructions and skills for Claude, Codex, and Pi
10. Backup existing configs to `*.bak`
11. Install Cursor/VS Code extensions (host only)

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
│   ├── .shell_shared
│   ├── .zshrc
│   └── .profile
├── git/
│   ├── .gitconfig
│   └── ignore
├── agents/
│   ├── AGENTS.md
│   ├── agents/
│   └── skills/
├── claude/
│   └── settings.json
├── codex/
│   └── setup.sh
├── pi/
│   └── setup.sh
├── cursor/
│   ├── settings.json
│   ├── keybindings.json
│   ├── extensions-core.txt
│   └── extensions-local.txt
└── vscode/
    ├── extensions-core.txt
    └── extensions-local.txt
```

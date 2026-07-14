# 🌿 openwts

**Isolated worktrees for opencode. Spin up, switch, run, and clean up — with zero friction.**

```bash
npm install -g openwts
openwts install                       # one-time shell setup
openwts create my-new-feature         # isolate your next task
openwts run my-new-feature            # launch opencode in the worktree
openwts list                          # see everything you're working on
openwts switch my-new-feature         # jump into it
openwts remove my-new-feature         # clean up when done
```

Stop context switching. Start shipping.

---

## Why openwts?

Every `git stash`, `git checkout -b`, and "which branch was I on?" slows you down. openwts gives each task its own **isolated directory** — a git worktree — so you can jump between tasks without interrupting your flow.

| Problem | openwts fix |
|---------|-------------|
| "Let me stash and switch branches" | One command: `openwts create task-name` |
| "I forgot what I was working on" | `openwts list` shows all worktrees + dirty status |
| "Let me clean up these old branches" | `openwts prune` — gone, with safety checks |
| "I need opencode for a different task" | `openwts run task-name` — opens in the worktree |

## Commands

| Command | What it does |
|---------|-------------|
| `create <name> [base]` | Create a worktree + branch from base (default: `main`) |
| `list` | Show all worktrees with branch, path, and dirty status |
| `switch <name>` | `cd` into the worktree |
| `run <name> [-- cmd]` | Run opencode (or any command) inside the worktree |
| `remove <name>` | Delete a worktree with safety checks |
| `prune` | Delete all non-main worktrees |
| `install` | Set up shell function for `switch` support |

## Quick start

```bash
# Install
npm install -g openwts

# One-time shell setup
openwts install

# Start your first worktree
cd my-project
openwts create fix-login-bug
openwts run fix-login-bug

# Worktree is ready at .openwts/worktrees/fix-login-bug/
# opencode opens inside it automatically
```

## Docs

| Document | What's inside |
|----------|-------------|
| [OPENWTS.md](./OPENWTS.md) | Product overview — the pitch, the value, the use cases |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Codebase architecture — modules, seams, adapters, OCP |
| [docs/FEATURES.md](./docs/FEATURES.md) | Feature breakdown — every command with arguments and errors |
| [docs/COMMANDS.md](./docs/COMMANDS.md) | CLI reference — all flags, exit codes, and examples |
| [docs/DESIGN-PHILOSOPHY.md](./docs/DESIGN-PHILOSOPHY.md) | Design principles — deep modules, seam discipline, OCP |

## License

MIT

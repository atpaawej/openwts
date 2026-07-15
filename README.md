# 🌿 openwts

**Isolated worktrees for opencode. Spin up, code, clean up — one command.**

```bash
npm install -g openwts

cd my-project
openwts fix-login-bug       # create worktree → open opencode → auto-cleanup
openwts list                # see everything you're working on
openwts remove fix-login-bug # clean up when done
```

---

## Why openwts?

Every `git stash`, `git checkout -b`, and "which branch was I on?" slows you down. openwts gives each task its own **isolated directory** — a git worktree — so you can jump between tasks without interrupting your flow.

| Problem | openwts fix |
|---------|-------------|
| "Let me stash and switch branches" | One command: `openwts <name>` |
| "I forgot what I was working on" | `openwts list` shows all worktrees + dirty status |
| "opencode doesn't have `claude -w`" | Now it does. `openwts <name>` = create + open + cleanup |
| "Let me clean up these old branches" | `openwts prune` — gone, with safety checks |

## Commands

| Command | What it does |
|---------|-------------|
| `openwts <name>` | **One-shot:** create worktree → open opencode → cleanup on exit |
| `create <name> [base]` | Create a worktree + branch from base (default: `main`) |
| `run <name> [-- cmd]` | Run opencode (or any command) inside a worktree |
| `list` | Show all worktrees with branch, path, and dirty status |
| `remove <name>` | Delete a worktree with safety checks |
| `prune` | Delete all non-main worktrees |

## Quick start

```bash
# Install
npm install -g openwts

# One-shot — create, open opencode, auto-cleanup on exit
cd my-project
openwts fix-login-bug

# Or explicit steps
openwts create analytics-v2
openwts run analytics-v2
```

**Cleanup behavior on exit:**
- No changes → worktree + branch removed automatically
- Has changes → prompted "Keep or remove?"
- Non-interactive (`-p`/`--no-prompt`) → left in place

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

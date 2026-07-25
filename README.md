# 🌿 openwts

**Isolated worktrees for AI coding agents. Spin up, code, clean up — one command.**

```bash
npm install -g openwts

cd my-project
openwts fix-login-bug       # create worktree → pick agent → auto-cleanup
openwts claude fix-login-bug # use Claude Code explicitly
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
| "I hate typing `openwts start` every time" | Default verb routing: `openwts <name>` ≡ `openwts start <name>` |
| "Which AI coding CLI should I use?" | **Agent-agnostic** — works with Claude Code, opencode, and more |
| "Let me clean up these old branches" | `openwts prune` — gone, with safety checks |

## Commands

| Command | What it does |
|---------|-------------|
| `openwts <name>` | **One-shot:** create worktree → resolve agent → cleanup on exit |
| `openwts claude <name>` | One-shot with **Claude Code** (agent-as-verb) |
| `openwts opencode <name>` | One-shot with **opencode** (agent-as-verb) |
| `create <name> [base]` | Create a worktree + branch from base (default: `main`) |
| `run <name>` | Open an AI coding agent inside a worktree |
| `list` | Show all worktrees with branch, path, and dirty status |
| `remove <name>` | Delete a worktree with safety checks |
| `prune` | Delete all non-main worktrees |

## Usage

### 🚀 One-shot (the main flow)

Start a new task and jump straight into an AI coding agent:

```bash
cd my-project
openwts feature-auth           # picker or OPENWTS_DEFAULT_AGENT
openwts claude feature-auth    # Claude Code explicitly
openwts opencode feature-auth  # opencode explicitly
```
→ Resolves agent, creates worktree, opens the agent inside it.
→ Exit the agent → auto-cleanup. Done.

**Agent resolution** (in priority order):
1. **Agent-as-verb:** `openwts claude fix-bug` — pre-resolved
2. **`--agent` flag:** `openwts fix-bug --agent claude`
3. **`OPENWTS_DEFAULT_AGENT`** env var — persistent preference
4. **Interactive picker** — keyboard-navigable list of installed agents

### 📋 See what you're working on

```bash
openwts list
```
Shows every worktree, what branch it's on, whether it's dirty, and if openwts manages it.

### 🧹 Clean up when done

```bash
openwts remove old-feature
openwts prune           # remove all non-main worktrees at once
```

### 🛠️ Run an agent in an existing worktree

```bash
openwts run feature-auth                # picker or default agent
openwts run feature-auth --agent claude # use Claude Code
```

### 📖 Real-world scenarios

| Scenario | Command |
|----------|---------|
| Jump on a hotfix mid-feature | `openwts hotfix` → fix it → exit → back to your feature |
| Use Claude Code for a task | `openwts claude api-redesign` |
| Try an experiment safely | `openwts experiment` → try things → exit → auto-cleanup if nothing changed |
| Review someone's branch | `openwts create review-pr-42` → look around → `openwts remove review-pr-42` |
| Set a default agent | `export OPENWTS_DEFAULT_AGENT=claude` in your shell config |

**Cleanup behavior on exit:**
- No changes → worktree + branch removed automatically
- Has changes → prompted "Keep or remove?"
- Non-interactive (`-p`/`--no-prompt`) → left in place

## Docs

| Document | What's inside |
|----------|-------------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Codebase architecture — modules, seams, adapters, OCP |
| [docs/FEATURES.md](./docs/FEATURES.md) | Feature breakdown — every command with arguments and errors |
| [docs/COMMANDS.md](./docs/COMMANDS.md) | CLI reference — all flags, exit codes, and examples |
| [docs/DESIGN-PHILOSOPHY.md](./docs/DESIGN-PHILOSOPHY.md) | Design principles — deep modules, seam discipline, OCP |

## License

MIT

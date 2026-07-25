# 🌿 openwts

**Stop context-switching. Start shipping.**

You know that feeling. You're deep in a feature — flow state, everything clicking — and then: *"Hey, can you look at this bug real quick?"*

What happens next?

- Stash. Or commit. Or panic.
- `git checkout -b hotfix`
- Fix the thing.
- `git checkout` back.
- Pop the stash. Or try to remember what you were doing.

That mental reset costs you **20 minutes** every time. Multiple that by 5 interruptions a day and you've lost an entire afternoon — every single day.

**openwts kills that tax.**

```bash
npm install -g openwts

cd my-project
openwts fix-login-bug    # new worktree → agent opens → fix → exit → clean
```

One command. Isolated environment. Zero mental overhead.

---

## This Is What Flow Looks Like

Your main worktree stays untouched — no stashes, no partial commits, no "what branch was I on?" Every task gets its own clean room. Jump between them like it's nothing.

```bash
openwts claude redesign-auth    # deep feature work with Claude Code
openwts opencode hotfix         # hotfix with opencode
openwts list                    # see everything at a glance
```

No git gymnastics. No "hold on, let me stash." Just work.

And when you're done? Exit the agent and the worktree cleans itself up — *poof* — no branches to delete, no directories to sweep.

---

## The Commands

| If you want to… | Type this |
|---|---|
| Start a task and code | `openwts fix-login-bug` |
| Use a specific agent | `openwts claude api-redesign` |
| Create without opening an agent | `openwts create experiment` |
| Jump into an existing worktree | `openwts run feature-x` |
| See what you're working on | `openwts list` |
| Delete a worktree | `openwts remove old-feature` |
| Nuke all worktrees | `openwts prune` |

That's it. **6 commands.** The whole tool fits in your head. That's the point.

---

## How It Works (The Engineering)

### One-Shot Flow

The main event. One command does everything:

1. **Creates** a git worktree at `.openwts/worktrees/<name>/` on a fresh branch
2. **Opens** your AI coding agent inside it — Claude Code, opencode, whatever you use
3. **Cleans up** when you exit — auto-remove if clean, asks if dirty, leaves it if non-interactive

All in `src/commands/start.ts` — about 80 lines.

### Agent Resolution

openwts is **agent-agnostic**. It doesn't care which AI CLI you use. Here's how it picks one:

```
❶  openwts claude fix-bug        → pre-resolved (agent-as-verb)
❷  --agent claude flag           → explicit
❸  OPENWTS_DEFAULT_AGENT env var → persistent preference
❹  Interactive picker            → arrow-key menu of installed agents
```

Add a new agent? Create `src/agents/cursor.ts` with 5 lines. Register it. Done. Zero existing code changes — that's the OCP seam in `src/agents/registry.ts`.

### Smart Cleanup

The cleanup logic in `src/cleanup.ts` decides what happens when the agent exits:

- **Clean state** → auto-delete the worktree and branch (you're welcome)
- **Dirty/unpushed** → prompts "Keep or remove?"
- **`--no-prompt` / `-p`** → leaves it in place (for CI/scripts)
- **`--clean` / `-c`** → removes regardless (yes I'm sure)

### Safety First

openwts wraps every destructive operation in checks. When you `remove` or `prune`, it verifies:

- ✅ Worktree exists
- ✅ Not deleting the main repository
- ⚠️ Warns if it has uncommitted changes
- ⚠️ Warns if it has unpushed commits
- ⚠️ Asks for confirmation (unless `--force`)

No accidents. Your work is safe.

### Manifest Tracking

openwts keeps a manifest at `.openwts/manifest.json` so it knows which worktrees it created vs ones you made manually with `git worktree add`. It **never** touches worktrees it didn't create — your `git worktree add` habits are perfectly safe, handled in `src/manifest.ts`.

---

## Architecture in One Picture

```
src/
├── index.ts              # Entry — three-tier routing
├── worktree.ts           # Deep module — all git worktree logic (5 methods, ~350 lines)
├── manifest.ts           # Tracks which worktrees openwts owns
├── system.ts             # I/O seam — exec + filesystem (NodeSystem / FakeSystem)
├── output.ts             # Presentation seam — colored terminal / test capture
├── cleanup.ts            # Cleanup orchestration — auto, prompt, or leave
│
├── agents/               # Pluggable agent definitions
│   ├── registry.ts       # Agent resolution + PATH detection
│   ├── agent.ts          # Agent interface (4 fields)
│   ├── claude.ts         # Claude Code definition
│   └── opencode.ts       # opencode definition
│
└── commands/             # One file per command — OCP enabled
    ├── start.ts          # The one-shot flow
    ├── create.ts         # Create worktree only
    ├── list.ts           # Show all worktrees
    ├── run.ts            # Open agent in existing worktree
    ├── remove.ts         # Delete safely
    └── prune.ts          # Batch delete
```

**The philosophy:** Deep modules, small interfaces. `worktree.ts` hides ~350 lines of complex git logic behind 5 methods. Every bug fix or safety improvement there benefits all 6 commands at once. That's leverage.

---

## Requirements

- **Node.js** >= 18
- **git** >= 2.5 (for worktree support)
- An AI coding agent on PATH (Claude Code, opencode, etc.)

That's it. No daemons. No config files. No background services.

---

## Configuration

| Variable | What it does |
|---|---|
| `OPENWTS_DEFAULT_AGENT` | Set your default AI agent: `export OPENWTS_DEFAULT_AGENT=claude` |

No config files. No YAML. One env var or don't set it at all and use the interactive picker.

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git clone https://github.com/atpaawej/openwts
cd openwts
npm install
npm test          # vitest — all of it
```

The codebase is designed so adding a command or agent means **creating a file, not changing existing ones**. The `src/commands/` and `src/agents/` directories are open for extension.

---

## License

MIT — go build something.

---

Made by someone who got tired of `git stash` and decided to do something about it.

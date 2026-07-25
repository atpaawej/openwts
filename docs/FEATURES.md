# Features

## Overview

openwts provides **6 commands** that wrap git worktree operations into a simple,
focused CLI for AI coding agents (opencode, Claude Code, etc.).

---

## `openwts start <name>` (one-shot — default verb)

The primary way to use openwts. Any unrecognized command name is routed here.
Built-in agent names (`claude`, `opencode`) are recognized and pre-resolved.

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `name` | ✅ | — | Worktree and branch name |

**Flags:**
| Flag | Description |
|------|-------------|
| `--base`, `-b` | Base branch to fork from |
| `--no-prompt`, `-p` | Non-interactive — leave worktree on exit |
| `--clean`, `-c` | Force cleanup even with changes |
| `--agent`, `-a` | Specify AI coding agent (e.g. `claude`, `opencode`) |

**What happens:**
1. Resolves which AI coding agent to use (from agent-as-verb, `--agent` flag,
   `OPENWTS_DEFAULT_AGENT` env var, or interactive picker)
2. Creates a worktree at `.openwts/worktrees/<name>/` on branch `name`
3. Records the worktree in `.openwts/manifest.json` (marks it as openwts-managed)
4. Spawns the agent inside the worktree directory
5. On exit from the agent:
   - No changes → auto-remove worktree + branch
   - Has changes → prompt "Keep or remove?"
   - Non-interactive → leave it
   - Force → remove regardless

**Agent-as-verb:**
```bash
openwts claude fix-login-bug     # pre-resolves claude, routes to start
openwts opencode feature-x       # pre-resolves opencode
```

**Example:**
```bash
openwts fix-login-bug          # one-shot from default branch (picker or default agent)
openwts start feature-x --base develop   # explicit with base
openwts claude experiment -p            # Claude Code, non-interactive
```

---

## `openwts create <name> [base]`

Create a new isolated worktree.

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `name` | ✅ | — | Worktree and branch name |
| `base` | ❌ | Detected default branch (`main`/`master`) | Branch to fork from |

**What happens:**
1. Detects the repo's default branch (`main` → `master` → origin/HEAD)
2. Creates a git branch `name` from the base
3. Runs `git worktree add` to create `.openwts/worktrees/<name>/`
4. Records the worktree in `.openwts/manifest.json`
5. Reports success with the path

**Special values for `base`:**
- `@` — use the **currently checked out branch** instead of default

**Example:**
```bash
openwts create fix-login-bug          # from main
openwts create analytics-v2 develop   # from develop
openwts create hotfix @               # from current branch
```

**Errors:**
- `Worktree "x" already exists` — name collision
- `Base branch "x" not found` — base doesn't exist
- `Invalid name "x"` — contains spaces or special chars

---

## `openwts list`

Show all worktrees for the current repo.

**Output:**
```
 Name              Managed  Branch            Path                            Dirty  Current
 fix-login-bug     ✓        fix-login-bug     .openwts/worktrees/fix-login-bug  ✓
 analytics-v2      ✓        analytics-v2      .openwts/worktrees/analytics-v2   ⚠
 main              -        main              /repo                             ✓      ◀
```

**What happens:**
1. Runs `git worktree list --porcelain`
2. Parses output into structured info
3. Checks each worktree's dirty status
4. Checks manifest for openwts-managed status
5. Highlights the current worktree

**Exit codes:**
- `0` — success
- `1` — not in a git repository

---

## `openwts run <name>`

Run an AI coding agent inside a worktree. Performs cleanup after the agent exits
if the worktree is openwts-managed.

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Worktree name |

**Agent resolution:**
1. `--agent / -a` flag (e.g. `openwts run fix-bug --agent claude`)
2. `OPENWTS_DEFAULT_AGENT` env var
3. Interactive picker of installed agents

**What happens:**
1. Resolves which AI coding agent to use
2. Looks up the worktree path
3. Sets env vars (`OPENWTS=1`, `OPENWTS_NAME`, `OPENWTS_BRANCH`)
4. Spawns the agent in the worktree directory
5. On exit: if openwts-managed, runs cleanup (auto-remove if clean, prompt if dirty)

**Examples:**
```bash
openwts run fix-login-bug                # picker or default agent
openwts run fix-login-bug --agent claude # Claude Code explicitly
openwts run fix-login-bug -a opencode    # opencode explicitly
```

**Errors:**
- `Worktree "x" not found` — doesn't exist
- `Command not found: <agent>` — agent binary not on PATH

---

## `openwts remove <name>`

Delete a worktree with safety checks.

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Worktree name |

**Safety checks (order):**
1. ✅ Worktree exists
2. ✅ Not the main repo worktree (can't delete yourself)
3. ⚠️ Warning if worktree was NOT created by openwts
4. ⚠️ Warning if worktree has dirty/unstaged changes
5. ⚠️ Warning if worktree has unpushed commits
6. Confirmation prompt if risks detected (can be skipped with `--force`)

**What happens:**
1. Validates the worktree exists
2. Runs safety checks
3. Prompts for confirmation (if needed)
4. Runs `git worktree remove`
5. Removes manifest entry

**Example:**
```bash
openwts remove fix-login-bug
# are you sure? [y/N]
```

**Errors:**
- `Worktree "x" not found` — nothing to remove
- `Cannot remove the main worktree` — nice try
- `Worktree "x" has uncommitted changes` — stash or commit first

---

## `openwts prune`

Remove all worktrees except the main one.

**Safety model:**
1. Lists all non-main worktrees
2. For each: checks for dirty state, unpushed commits
3. Shows a summary of what will be removed
4. Confirmation prompt before proceeding
5. If confirmed, removes each worktree (skipping those with errors)

**Example:**
```bash
$ openwts prune

 Name              Dirty  Managed
 fix-login-bug     ✓      ✓
 analytics-v2      ⚠      ✓
 old-experiment    ✓      -

Remove 3 worktrees? [y/N]
```

**Flags:**
- `--force` — skip dirty state warnings (not recommended)

---

## Summary

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `start` / `<name>` / `<agent> <name>` | One-shot: create + open agent + cleanup | Daily |
| `create` | Isolate a new task (explicit) | Weekly |
| `list` | See what you're working on | Daily |
| `run` | Open agent inside a worktree | Daily |
| `remove` | Clean up finished tasks | Weekly |
| `prune` | Bulk cleanup | Monthly |

## Agent Registry

openwts ships with built-in agent definitions for **opencode** and **claude**.
Adding a new agent means creating one file and registering it in the registry
— zero changes to commands, router, or picker (OCP).

### Resolution chain

When a command needs an agent, it follows this priority:
1. **Agent-as-verb** — `openwts claude fix-bug`
2. **`--agent` flag** — `openwts fix-bug --agent claude`
3. **`OPENWTS_DEFAULT_AGENT`** env var
4. **Interactive picker** of installed agents

## Manifest System

openwts tracks its own worktrees in `.openwts/manifest.json`. This enables:
- Auto-cleanup of openwts-created worktrees only (manual `git worktree add` worktrees are left alone)
- The `Managed` column in `list` output
- Safe bulk cleanup via `prune` — only removes openwts-managed worktrees unless `--force` is used

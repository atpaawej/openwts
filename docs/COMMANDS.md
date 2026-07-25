# CLI Reference

## Usage

```bash
openwts <command|agent> [arguments...] [-- flags...]
```

If `<command>` is not a known command name, it's either matched against a built-in
**agent name** (see below) or treated as a worktree name and dispatched to the
`start` (one-shot) command.

---

## Agent-as-verb

Any built-in agent name can be used directly as a command:

```bash
openwts claude fix-bug      # use Claude Code
openwts opencode feature-x  # use opencode
```

When invoked this way, the agent is pre-resolved and the remaining arguments are
routed to `start`. If no worktree name is given, you'll be prompted interactively.

---

## `openwts start <name>`

**Alias:** Any unrecognized command or agent name is routed here.
`openwts fix-login-bug` ≡ `openwts start fix-login-bug`

Create a worktree, launch an AI coding agent (opencode, claude, etc.) inside it,
and clean up on exit.

**Arguments:**

| Position | Name | Required | Default | Description |
|----------|------|----------|---------|-------------|
| 1 | `name` | ✅ | — | Worktree and branch name |

**Flags:**

| Flag | Description |
|------|-------------|
| `--base`, `-b` | Base branch to fork from (default: repo default) |
| `--no-prompt`, `-p` | Non-interactive mode — leave worktree on exit, don't prompt |
| `--clean`, `-c` | Force cleanup even with dirty/unpushed changes |
| `--agent`, `-a` | Specify which AI coding agent to use (e.g. `claude`, `opencode`) |

**Agent resolution** (in priority order):
1. `openwts claude <name>` — pre-resolved by router (agent-as-verb)
2. `--agent claude` / `-a claude` flag
3. `OPENWTS_DEFAULT_AGENT` environment variable
4. Interactive picker — shows all installed agents

**Cleanup behavior:**
- No changes, no unpushed commits → auto-remove worktree + branch
- Has changes or unpushed commits → prompt "Keep or remove?"
- `--no-prompt` / `-p` → leave worktree in place
- `--clean` / `-c` → remove regardless of state

**Examples:**
```bash
openwts fix-login-bug                  # one-shot, picker or default agent
openwts start api-redesign             # explicit
openwts start hotfix --base main       # from main branch
openwts claude experiment              # Claude Code, one-shot
openwts start experiment --agent claude # same, using --agent flag
openwts start experiment -p            # non-interactive, leave on exit
```

**Exit codes:**
- `0` — completed (worktree may have been removed or kept)
- `1` — creation failed, agent not found

---

## `openwts create <name> [base]`

Create a new git worktree.

**Alias:** `openwts new`, `openwts add`

**Arguments:**

| Position | Name | Required | Description |
|----------|------|----------|-------------|
| 1 | `name` | ✅ | Worktree and branch name |
| 2 | `base` | ❌ | Base branch (default: `main` or detected default) |

**Examples:**
```bash
openwts create fix-login-bug
openwts create api-redesign develop
openwts create urgent-hotfix @
```

**Exit codes:**
- `0` — worktree created
- `1` — name collision, invalid name, missing base

---

## `openwts list`

List all worktrees in the current repository.

**Alias:** `openwts ls`, `openwts status`

**Output columns:**
| Column | Description |
|--------|-------------|
| Name | Worktree name (derived from path) |
| Managed | Whether created by openwts (✓) or manually (-) |
| Branch | Git branch checked out in the worktree |
| Path | Filesystem path |
| Dirty | Whether uncommitted changes exist |
| Current | Whether this is the current worktree |

**Examples:**
```bash
openwts list
openwts ls
```

**Exit codes:**
- `0` — success
- `1` — not in a git repository

---

## `openwts run <name>`

Run an AI coding agent inside an existing worktree. After the agent exits, cleans up if the worktree was created by openwts.

| Position | Name | Required | Default | Description |
|----------|------|----------|---------|-------------|
| 1 | `name` | ✅ | — | Worktree name |

**Agent resolution** (same as `start`):
1. `--agent / -a` flag
2. `OPENWTS_DEFAULT_AGENT` env var
3. Interactive picker of installed agents

**Environment variables set:**
| Variable | Value |
|----------|-------|
| `OPENWTS` | `1` |
| `OPENWTS_NAME` | The worktree name |
| `OPENWTS_BRANCH` | The branch name |

**Examples:**
```bash
openwts run fix-login-bug             # picker or default agent
openwts run fix-login-bug -a claude   # Claude Code explicitly
openwts run experiment --agent claude # same with long flag
```

**Exit codes:**
- `0` — agent exited successfully
- `1` — worktree not found, agent not found, agent failed
- Exit code of the child process is propagated

---

## `openwts remove <name>`

Delete a worktree with safety checks.

**Alias:** `openwts rm`, `openwts delete`

| Position | Name | Required | Description |
|----------|------|----------|-------------|
| 1 | `name` | ✅ | Worktree name |

**Flags:**
| Flag | Description |
|------|-------------|
| `--force`, `-f` | Skip confirmation prompts |

**Safety checks (in order):**
1. ✅ Worktree exists
2. ✅ Not deleting the main repo
3. ⚠️ Warn if worktree was NOT created by openwts
4. ⚠️ Warn if worktree has dirty changes
5. ⚠️ Warn if worktree has unpushed commits
6. ⚠️ Confirm (unless `--force`)

**Examples:**
```bash
openwts remove fix-login-bug
openwts rm old-experiment --force
```

**Exit codes:**
- `0` — removed
- `1` — not found, is main worktree, user cancelled

---

## `openwts prune`

Remove all non-main worktrees.

| Flag | Description |
|------|-------------|
| `--force`, `-f` | Skip dirty state prompts |

**Shows a summary table:**
```
 Name              Dirty  Managed
 fix-login-bug     ✓      ✓
 analytics-v2      ⚠      ✓
 old-experiment    ✓      -
```

**Exit codes:**
- `0` — all worktrees removed (or none to remove)
- `1` — user cancelled, some worktrees could not be removed

---

## Exit Code Summary

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (worktree not found, validation failure, etc.) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENWTS_DEFAULT_AGENT` | Default AI coding agent (e.g. `claude`). Used when no `--agent` flag or agent-as-verb is given. |
| `OPENWTS` | Set to `1` in all spawned agent processes |
| `OPENWTS_NAME` | Set to the worktree name in all spawned agent processes |
| `OPENWTS_BRANCH` | Set to the branch name in all spawned agent processes |

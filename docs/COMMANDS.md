# CLI Reference

## Usage

```bash
openwts <command> [arguments...] [-- flags...]
```

If `<command>` is not a known command name, it's treated as a worktree name and dispatched to the `start` (one-shot) command.

---

## `openwts start <name>`

**Alias:** Any unrecognized command name is routed here. `openwts fix-login-bug` ≡ `openwts start fix-login-bug`

Create a worktree, launch `opencode` inside it, and clean up on exit.

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

**Cleanup behavior:**
- No changes, no unpushed commits → auto-remove worktree + branch
- Has changes or unpushed commits → prompt "Keep or remove?"
- `--no-prompt` / `-p` → leave worktree in place
- `--clean` / `-c` → remove regardless of state

**Examples:**
```bash
openwts fix-login-bug                  # one-shot
openwts start api-redesign             # explicit
openwts start hotfix --base main       # from main branch
openwts start experiment -p            # non-interactive, leave on exit
```

**Exit codes:**
- `0` — completed (worktree may have been removed or kept)
- `1` — creation failed, opencode not found

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

## `openwts run <name> [-- <cmd>]`

Execute a command inside a worktree. After the command exits, cleans up if the worktree was created by openwts.

| Position | Name | Required | Default | Description |
|----------|------|----------|---------|-------------|
| 1 | `name` | ✅ | — | Worktree name |
| after `--` | `cmd` | ❌ | `opencode` | Command to run |

**If no command is given:** Launches `opencode` interactively in the worktree.

**Environment variables set:**
| Variable | Value |
|----------|-------|
| `OPENWTS` | `1` |
| `OPENWTS_NAME` | The worktree name |
| `OPENWTS_BRANCH` | The branch name |

**Examples:**
```bash
openwts run fix-login-bug                 # opencode in worktree
openwts run fix-login-bug -- npm test     # run tests
openwts run fix-login-bug -- code .       # VS Code in worktree
openwts run fix-login-bug -- git log --oneline -5
```

**Exit codes:**
- `0` — command exited successfully
- `1` — worktree not found, command not found, command failed
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

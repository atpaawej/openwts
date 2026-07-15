# CLI Reference

## Usage

```bash
openwts <command> [arguments...] [-- flags...]
```

Alias: `owt`

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
| Branch | Git branch checked out in the worktree |
| Path | Filesystem path |
| Dirty | Whether uncommitted changes exist |

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

Execute a command inside a worktree.

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
3. ⚠️ Warn if worktree has dirty changes
4. ⚠️ Warn if worktree has unpushed commits
5. ⚠️ Confirm (unless `--force`)

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
▸ fix-login-bug    — clean
▸ analytics-v2     — has uncommitted changes ⚠️
▸ old-experiment   — clean
```

**Then confirms:** `Remove 3 worktrees? [y/N]`

**Exit codes:**
- `0` — all worktrees removed (or none to remove)
- `1` — user cancelled, some worktrees could not be removed

---

## Exit Code Summary

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (worktree not found, validation failure, etc.) |
| `2` | Not in a git repository |

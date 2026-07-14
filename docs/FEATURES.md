# Features

## Overview

openwts provides **7 commands** that wrap git worktree operations into a simple, focused CLI for opencode users.

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
4. Reports success with the path

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
 Name              Branch            Path                            Dirty
 fix-login-bug     fix-login-bug     .openwts/worktrees/fix-login-bug  ✓
 analytics-v2      analytics-v2      .openwts/worktrees/analytics-v2   ✗
 main              main              /repo                             ✗
```

**What happens:**
1. Runs `git worktree list --porcelain`
2. Parses output into structured info
3. Checks each worktree's dirty status
4. Highlights the current worktree

**Exit codes:**
- `0` — success
- `1` — not in a git repository

---

## `openwts switch <name>`

Navigate to a worktree in the current shell.

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Worktree name |

**What happens:**
1. Looks up the worktree path
2. Outputs the path for the shell function to `cd` into

**Requires the shell function** (installed via `openwts install`). Without it, this command prints the path but doesn't change directory.

**Example:**
```bash
openwts switch fix-login-bug
# You are now in .openwts/worktrees/fix-login-bug/
```

**Errors:**
- `Worktree "x" not found` — no matching worktree
- `Suggestion: openwts create x` — helpful hint

---

## `openwts run <name> [-- <cmd>]`

Run a command inside a worktree.

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Worktree name |
| `-- <cmd>` | ❌ | Command to execute (default: `opencode`) |

**What happens:**
1. Looks up the worktree path
2. Sets env vars (`OPENWTS=1`, `OPENWTS_NAME`, `OPENWTS_BRANCH`)
3. If no command given: spawns `opencode` interactively
4. If command given: spawns it in the worktree directory

**Examples:**
```bash
openwts run fix-login-bug                 # launch opencode in worktree
openwts run fix-login-bug -- npm test     # run tests in worktree
openwts run fix-login-bug -- code .       # open VS Code in worktree
openwts run fix-login-bug -- git status   # check status in worktree
```

**The `--` separator** is optional when there's no ambiguity but recommended for clarity.

**Errors:**
- `Worktree "x" not found` — doesn't exist
- `Command not found: opencode` — opencode not in PATH (when no `--` given)

---

## `openwts remove <name>`

Delete a worktree with safety checks.

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | ✅ | Worktree name |

**Safety checks (order):**
1. ✅ Worktree exists
2. ✅ Not the main repo worktree (can't delete yourself)
3. ⚠️ Warning if worktree has dirty/unstaged changes
4. ⚠️ Warning if worktree has unpushed commits
5. Confirmation prompt if risks detected (can be skipped with `--force`)

**What happens:**
1. Validates the worktree exists
2. Runs safety checks
3. Prompts for confirmation (if needed)
4. Runs `git worktree remove`
5. Deletes the branch (optional, confirmed)

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
3. Shows a summary of what will be removed and what has risks
4. Confirmation prompt before proceeding
5. If confirmed, removes each worktree (skipping those with errors)

**Example:**
```bash
$ openwts prune

▸ fix-login-bug    — clean
▸ analytics-v2     — has uncommitted changes ⚠️
▸ old-experiment   — clean

Remove 3 worktrees? [y/N]
```

**Flags:**
- `--force` — skip dirty state warnings (not recommended)

---

## `openwts install`

Set up the shell function for `switch` to work.

**What happens:**
1. Detects the user's shell (zsh, bash, fish)
2. Locates the correct config file (`.zshrc`, `.bashrc`, `config.fish`)
3. Checks if the function is already installed (idempotent)
4. Appends the shell function definition
5. Prints instructions to reload: `source ~/.zshrc`

**Shells supported:**
| Shell | Config file | Status |
|-------|-------------|--------|
| zsh | `~/.zshrc` | ✅ |
| bash | `~/.bashrc` | ✅ |
| fish | `~/.config/fish/config.fish` | ✅ |

**What gets added:**
```bash
# openwts shell integration
owt() {
  if [ "$1" = "switch" ]; then
    cd "$(openwts "$@")"
  else
    openwts "$@"
  fi
}
```

**The function also aliases `openwts` to `owt`** — because `owt run my-task` is even shorter than `openwts run my-task`.

---

## Summary

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `create` | Isolate a new task | Daily |
| `list` | See what you're working on | Daily |
| `switch` | Change context | Daily |
| `run` | Work inside a worktree | Daily |
| `remove` | Clean up finished tasks | Weekly |
| `prune` | Bulk cleanup | Monthly |
| `install` | One-time setup | Once |

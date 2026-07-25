# Agent Support — Specification

## Problem Statement

openwts is a worktree manager that spawns an AI coding CLI inside each worktree. Currently it's hardcoded to launch `opencode` — meaning users of other AI coding CLIs (Claude Code, Cursor, etc.) have to manually override the command every time (`openwts run fix-bug -- claude`). The one-shot `openwts <name>` flow is hardcoded to `opencode` with no way to choose a different agent without editing source.

As more AI coding tools emerge, openwts needs to be **agent-agnostic**: let the user pick which agent to use, remember their preference, and make adding new agents trivial without changing existing code.

## Solution

openwts gains an **agent registry** — a set of built-in agent definitions (`opencode`, `claude`) with an OCP design so new agents can be added by creating a file and registering it. Users choose their agent via:

1. **Agent-as-verb:** `openwts claude fix-bug` — quick, explicit
2. **`--agent` flag:** `openwts fix-bug --agent claude`
3. **`OPENWTS_DEFAULT_AGENT` env var** — persistent preference
4. **Interactive picker** — shown when none of the above is set; keyboard-navigable list of installed agents

Both `start` (create + open agent) and `run` (open agent in existing worktree) commands are simplified to be agent-only — they no longer accept arbitrary command passthrough via `-- <cmd>`.

## User Stories

1. As an openwts user, I want to run `openwts claude fix-bug` so that I can create a worktree and open Claude Code in one command without going through a picker.
2. As an openwts user, I want to run `openwts opencode fix-bug` so that I can use opencode (the original default) explicitly.
3. As an openwts user, I want to run `openwts fix-bug` and be shown an interactive list of installed agents so that I can pick one without remembering flags or names.
4. As an openwts user, I want to use arrow keys (up/down) to navigate the agent picker, Enter to confirm, and Escape/Ctrl+C to cancel.
5. As an openwts user, I want the picker to show only agents that are actually installed on my system (found on PATH) so I don't select something that will fail.
6. As an openwts user, I want to set `OPENWTS_DEFAULT_AGENT=claude` in my shell config so that `openwts fix-bug` always uses Claude without showing the picker.
7. As an openwts user, I want to run `openwts fix-bug --agent claude` so that I can set the agent via a flag when I don't want the default or the picker.
8. As an openwts user, I want `openwts claude` (no worktree name) to prompt me interactively to type a name rather than erroring, so I don't have to re-type the whole command.
9. As an openwts user, I want `openwts run fix-bug` to open an agent in an existing worktree (following the same agent resolution as `start`), so the behavior is consistent.
10. As an openwts user, I want `openwts run fix-bug --agent claude` to open Claude Code in an existing worktree directly.
11. As an openwts user, I want the agent picker to descriptions next to each agent name so I can tell agents apart.
12. As an openwts developer, I want to add a new agent by creating a single file and registering it, so that I add agents without modifying existing code (OCP).
13. As an openwts developer, I want agent definitions to have a minimal interface (`name`, `description`, `bin`, optional `args`) so that adding an agent is simple.
14. As an openwts user, I want PATH detection for agents to be lazy and memoized so that `openwts list` and `openwts create` don't pay the cost of checking every agent binary.
15. As an openwts user, I want `openwts start fix-bug` (the explicit command) to follow the same agent resolution as the shorthand `openwts fix-bug`, so behavior is consistent regardless of invocation style.
16. As an openwts user, I want both `openwts start` and `openwts run` to no longer support `-- <cmd>` arbitrary command passthrough, so that the interface is simpler and agent-focused.
17. As an openwts user, I want the interactive prompt for worktree name (`openwts claude` with no name) to accept my typed input and proceed to create the worktree and open the agent, so I don't have to re-run the command.
18. As an openwts user, I want the picker to show a "Back" or cancel option so that I can abort agent selection and return to the shell.

## Implementation Decisions

### Agent Interface

Every agent is defined by a simple interface with four fields:

- `name` — The CLI name used in `openwts <name> <worktree>` and `--agent <name>`
- `description` — Short human-readable description for the picker UI
- `bin` — Binary to spawn (must be on PATH)
- `args` — Optional additional CLI arguments passed before the worktree path

Built-in agents ship with openwts:
- `opencode` — bin: `opencode`, no args
- `claude` — bin: `claude`, no args

### Agent Registry

The registry is a module that stores agent definitions and provides lazy, memoized PATH detection. Its interface:

- Register one or more agent definitions
- Look up an agent by name (throws a known error with suggestion if not found)
- List all registered agent definitions
- List only installed agents (PATH-filtered, lazy + memoized per process)
- Check if a specific agent is installed

PATH detection uses `system.exec()` — `which <bin>` on POSIX, `where <bin>` on Windows — crossed at the existing System seam. This means tests use `FakeSystem` to control which agents appear "installed."

### Three-Tier Routing

The CLI entry point (`index.ts`) resolves commands in this priority:

1. **Known command** (list, create, remove, run, prune, start) → dispatch directly
2. **Known agent name** (claude, opencode) → strip from argv, resolve agent, set context, route remaining args to `start`
3. **Fallthrough** (unrecognized) → route to `start` with picker/default resolution

### Agent Resolution Chain

When a command needs an agent but none was pre-resolved by the router:

1. Check `--agent` / `-a` flag in parsed args
2. Check `OPENWTS_DEFAULT_AGENT` environment variable
3. Show interactive picker (filtered to installed agents only)
4. If picker is cancelled → exit gracefully with message

If the resolved agent's binary is not on PATH, the spawn will fail with a clear error message suggesting the user install it.

### Interactive Picker

A custom terminal UI built with Node.js `readline` in raw mode:

- Up/Down arrows to navigate the list
- Enter to confirm selection
- Escape or Ctrl+C to cancel (returns to shell)
- Renders: selection indicator + agent name + description
- Only shows agents whose binaries are found on PATH
- Cross-platform (Windows, macOS, Linux)

### Command Changes

**`start` command:**
- Removed: `-- <cmd>` arbitrary command passthrough
- Removed: `args._exec` / `opencode` hardcoded default
- Changed: Calls `ctx.resolveAgent(args)` to determine which agent to spawn
- Changed: Description updated to reflect agent-agnostic behavior

**`run` command:**
- Removed: `-- <cmd>` arbitrary command passthrough
- Removed: `args._extra` handling
- Changed: Calls `ctx.resolveAgent(args)` to determine which agent to spawn
- Changed: Description updated to reflect agent-only behavior

**`CommandContext`:**
- Added optional `agent?: Agent` field — pre-resolved by router for agent-as-verb calls
- Added `resolveAgent(args: Record<string, string>): Promise<Agent>` method — the resolution chain

### Environment Variables

Existing variables preserved: `OPENWTS`, `OPENWTS_NAME`, `OPENWTS_BRANCH`
No new variables added in this change.

### Files Modified/Created

**New files:**
- `src/agents/agent.ts` — Agent interface
- `src/agents/registry.ts` — Agent registry (deep module)
- `src/agents/picker.ts` — Interactive agent selector (internal)
- `src/agents/opencode.ts` — Built-in opencode agent definition
- `src/agents/claude.ts` — Built-in claude agent definition
- `test/agents/registry.test.ts` — Registry tests
- `test/agents/resolve.test.ts` — Agent resolution chain tests

**Modified files:**
- `src/index.ts` — Three-tier routing
- `src/commands/command.ts` — CommandContext gains `agent` and `resolveAgent()`
- `src/commands/start.ts` — Agent-only, remove `-- <cmd>`
- `src/commands/run.ts` — Agent-only, remove `-- <cmd>`
- `src/commands/loader.ts` — Minor: no agent-related changes needed (agents are not commands)

**Closed (zero changes):**
`src/worktree.ts`, `src/system.ts`, `src/output.ts`, `src/types.ts`, `src/manifest.ts`, `src/cleanup.ts`, `src/git.ts`, `src/commands/create.ts`, `src/commands/list.ts`, `src/commands/remove.ts`, `src/commands/prune.ts`

## Testing Decisions

### What makes a good test

- Tests cross the **same seam** as production callers
- Tests assert on **outcomes** (which agent was resolved, what output was produced), not on **implementation** (which internal methods were called)
- Agent PATH detection is tested through `FakeSystem.exec()` — the existing I/O seam
- The picker (interactive terminal UI) is tested manually — `resolveAgent()` falling through to the picker is tested by asserting the fallback behavior, not cursor positions

### What will be tested

**Registry (`src/agents/registry.ts`):**
- Registering agents and looking them up by name
- Getting an unknown agent name throws with suggestion
- `getInstalled()` returns only agents whose binaries are on PATH (via `FakeSystem`)
- `getInstalled()` results are memoized (cached after first call)
- Cross-platform `which`/`where` detection

**Agent resolution chain (`CommandContext.resolveAgent()`):**
- Pre-resolved `ctx.agent` is returned immediately (no PATH check)
- `--agent` flag overrides defaults
- `OPENWTS_DEFAULT_AGENT` env var is respected
- Priority order is correct
- Fallthrough to picker when nothing else resolves
- When no agents are installed and picker would show, behaves gracefully

**Command integration (`test/commands.test.ts` pattern):**
- `start` command spawns correct agent binary
- `run` command spawns correct agent binary
- Agent resolution produces expected output messages
- Error messages for unresolved agent are clear

**Picker:**
- Manual testing only (interactive terminal UI)

### Prior art

The existing tests at `test/commands.test.ts` and `test/worktree.test.ts` demonstrate the pattern: construct a `FakeSystem`, queue exec responses, create the module under test, call the public API, assert on outcomes. Agent registry tests will follow this exact pattern.

## Out of Scope

- **User-defined/custom agents via config file** — Agent definitions are hardcoded in the codebase for now. Adding new agents requires a code change (new file + registration). A config-based extension point may be added later.
- **`-- <cmd>` arbitrary command passthrough** — Removed from both `start` and `run`. Users who need to run arbitrary commands in a worktree should use `cd` or a wrapper script.
- **Auto-detecting new agents at runtime** — Only registered agents are recognized. No scanning of PATH for unknown binaries.
- **Agent-specific hooks or lifecycle** — Agents are spawned and cleaned up identically. No per-agent pre/post hooks.
- **JSON output / machine-readable agent list** — The agent picker is terminal-only. `--json` flag deferred.
- **Package.json `openwts` config section** — No project-level agent configuration.

## Further Notes

- This design follows openwts' existing architecture principles: deep modules, seam discipline (one adapter = hypothetical, two = real), OCP, and the deletion test.
- The agent registry is deliberately shallow (just definitions + PATH check) because the *real* depth is in `worktree.ts` — the agent system is a thin selection layer on top.
- The picker is built from scratch (no dependency) to maintain openwts' zero-runtime-dependency philosophy. If cross-platform issues arise, a dependency can be justified later following seam discipline.
- `opencode` and `claude` are symmetric built-ins — neither is the "default" in code. The "default" is whatever the user's `OPENWTS_DEFAULT_AGENT` or the picker chooses.

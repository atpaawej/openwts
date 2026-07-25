# Agent Support — Architecture & Design

## Status

Final design. Ready for implementation.

---

## 1. What's Changing

openwts is currently hardcoded to `opencode`. This design makes it **agent-agnostic** — it spawns any registered AI coding CLI (agent), with `opencode` and `claude` built in, and a clear seam to add more.

### Scope of changes

| File | What changes |
|------|-------------|
| `src/agents/agent.ts` | **New** — `Agent` interface |
| `src/agents/registry.ts` | **New** — Registry (deep module): registration + lazy PATH detection |
| `src/agents/picker.ts` | **New** — Interactive agent selector terminal UI |
| `src/agents/opencode.ts` | **New** — Built-in `opencode` agent definition |
| `src/agents/claude.ts` | **New** — Built-in `claude` agent definition |
| `src/index.ts` | **Change** — Three-tier routing (commands → agents → start) |
| `src/commands/command.ts` | **Change** — `CommandContext` gains `resolveAgent()` and optional `agent` |
| `src/commands/start.ts` | **Change** — Agent-only, no more `-- <cmd>` pass-through |
| `src/commands/run.ts` | **Change** — Agent-only, no more `-- <cmd>` pass-through, simpler |
| `src/commands/loader.ts` | **Minor change** — Import and register agent commands? No — agents are not commands. No change needed. |

### Files that remain closed (zero changes)

`src/worktree.ts`, `src/system.ts`, `src/output.ts`, `src/types.ts`, `src/manifest.ts`, `src/cleanup.ts`, `src/git.ts`, `src/commands/create.ts`, `src/commands/list.ts`, `src/commands/remove.ts`, `src/commands/prune.ts`

---

## 2. The Agent Interface — `src/agents/agent.ts`

A shallow, minimal interface. Every piece of data a caller or the registry needs to know about an agent.

```typescript
export interface Agent {
  /** CLI name — used as `openwts claude <name>` / `--agent claude` */
  readonly name: string;
  /** Short description, shown in the interactive picker */
  readonly description: string;
  /** Binary to spawn (must be on PATH) */
  readonly bin: string;
  /** Additional CLI args passed BEFORE the worktree path */
  readonly args?: string[];
}
```

**Depth rationale:** Three fields (`name`, `description`, `bin`) plus one optional (`args`). Behind this small interface: cross-platform PATH detection, error messages, binary resolution. A caller learns 3 fields and can identify, describe, or launch any agent.

**Examples:**

```typescript
// src/agents/opencode.ts
export const opencodeAgent: Agent = {
  name: 'opencode',
  description: 'AI coding assistant',
  bin: 'opencode',
};
```

```typescript
// src/agents/claude.ts
export const claudeAgent: Agent = {
  name: 'claude',
  description: 'Claude Code CLI',
  bin: 'claude',
};
```

**Adding an agent next quarter** (e.g. Cursor):
```typescript
// src/agents/cursor.ts  ← new file
import { Agent } from './agent.js';

export const cursorAgent: Agent = {
  name: 'cursor',
  description: 'Cursor AI editor',
  bin: 'cursor',
  args: ['--reuse-window'],
};
```

**Then register it in `registry.ts`** — one import, one `register()` call. Zero changes to commands, router, or picker.

---

## 3. The Registry — `src/agents/registry.ts` (Deep Module)

### Interface

```typescript
export interface AgentRegistry {
  /** Register a single agent definition */
  register(agent: Agent): void;
  /** Register multiple agents at once */
  registerMany(agents: Agent[]): void;
  /** Resolve an agent by name — throws OpenwtError if unknown */
  get(name: string): Agent;
  /** Get all registered agents (the static definitions, not PATH-filtered) */
  getAll(): Agent[];
  /**
   * Check which registered agents are actually on PATH.
   * Lazy + memoized: checks once per process, caches result.
   * Returns only agents whose binaries are found on PATH.
   */
  getInstalled(): Promise<Agent[]>;
  /**
   * Check if a specific agent binary is on PATH.
   * Not memoized — call sparingly.
   */
  isInstalled(name: string): Promise<boolean>;
}
```

### Implementation (behind the interface)

| Behaviour | How |
|-----------|-----|
| Static registration | `Map<string, Agent>` populated at import time by `register()` |
| PATH detection | `which` / `where` via `system.exec()` |
| Memoization | Module-scoped `Promise<Agent[]> | null` — computed on first `getInstalled()`, cached for process lifetime |
| Cross-platform `which` | Windows: `where <bin>`, POSIX: `which <bin>`. Handled inside one private method |
| Unknown agent | `get()` throws `OpenwtError` with suggestion |
| No agents installed | `getInstalled()` returns empty array — picker shows "No agents found" |

### Why this is deep

The interface is **5 methods + 1 thrown error**. Behind it:

- Cross-platform `which`/`where` PATH resolution
- Memoization lifecycle management
- Error translation (unknown name → suggestion)
- Registration deduplication
- Support for any number of agents without caller changes

**Deletion test:** Delete this module and every command/route that resolves an agent would need its own PATH-checking, name-resolution, and error-handling logic. Complexity reappears across N callers. → **Earns its keep.**

---

## 4. Three-Tier Routing — `src/index.ts`

Current routing:

```
argv[0] = known command?  → dispatch directly
otherwise                → route to `start` (treat argv[0] as worktree name)
```

New routing:

```
argv[0] = known command?   → dispatch directly
argv[0] = known agent?     → strip agent from argv, resolve agent, pre-set ctx.agent,
                              route remaining args to `start`
otherwise                  → show picker, resolve agent, route to `start`
```

### Routing table

| User types | Tier | Resolved agent | Worktree name | Command |
|------------|------|----------------|---------------|---------|
| `openwts fix-bug` | 3 (fallthrough) | Picker / `OPENWTS_DEFAULT_AGENT` | `fix-bug` | `start` |
| `openwts claude fix-bug` | 2 (agent verb) | `claude` | `fix-bug` | `start` |
| `openwts opencode fix-bug` | 2 (agent verb) | `opencode` | `fix-bug` | `start` |
| `openwts claude` | 2 (agent verb) | `claude` | _(prompted)_ | `start` |
| `openwts start fix-bug` | 1 (command) | Resolved by command | `fix-bug` | `start` |
| `openwts run fix-bug` | 1 (command) | Resolved by command | `fix-bug` | `run` |
| `openwts list` | 1 (command) | — | — | `list` |

### Agent resolution priority (used by both router and `resolveAgent()`)

1. **Agent-as-verb** — `openwts claude fix-bug` → `claude`
2. **`--agent` flag** — `openwts fix-bug --agent claude` → `claude`
3. **`OPENWTS_DEFAULT_AGENT` env var** — if set and the agent is installed
4. **Picker** — interactive list (fallback when none of the above)

---

## 5. `CommandContext` Changes — `src/commands/command.ts`

```typescript
export interface CommandContext {
  worktree: Worktree;
  system: System;
  output: Output;
  commands: Map<string, Command>;

  /** Pre-resolved agent (set by router for agent-as-verb). Undefined = resolve yourself. */
  agent?: Agent;

  /**
   * Resolve an agent using the priority chain:
   * 1. ctx.agent (pre-resolved by router)
   * 2. args['agent'] (--agent flag)
   * 3. OPENWTS_DEFAULT_AGENT env var
   * 4. Interactive picker
   */
  resolveAgent(args: Record<string, string>): Promise<Agent>;
}
```

This is the seam. `start` and `run` call `ctx.resolveAgent(args)` and get back an `Agent` — they never need to know about pickers, PATH checks, or enum vars.

---

## 6. Command Changes

### `start` command — `src/commands/start.ts`

```typescript
export const startCommand: Command = {
  name: 'start',
  description: 'Create a worktree and open an AI agent inside it (one-shot)',
  arguments: [
    { name: 'name', required: true, description: 'Worktree and branch name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const name = args.name;
    const base = args.base;
    const noPrompt = args['no-prompt'] === 'true' || args.p === 'true';
    const forceCleanup = args['clean'] === 'true' || args.c === 'true';

    // Resolve agent (positional, --agent, env var, or picker)
    const agent = await ctx.resolveAgent(args);

    // Create worktree
    await ctx.worktree.create(name, base || undefined);
    const path = await ctx.worktree.getPath(name);
    ctx.output.success(`Created worktree "${name}" at ${path}`);
    ctx.output.info(`Running: ${agent.name} in ${name}\n`);

    // Spawn agent inside worktree
    const child = spawn(agent.bin, agent.args ?? [], {
      cwd: path,
      stdio: 'inherit',
      env: { ...process.env, OPENWTS: '1', OPENWTS_NAME: name, OPENWTS_BRANCH: name },
      shell: process.platform === 'win32',
    });

    // ... wait for exit, same cleanup logic as today
  },
};
```

**Removed vs today:** `const runCmd = args._exec || 'opencode'`, `-- <cmd>` pass-through, `_exec` handling.

### `run` command — `src/commands/run.ts`

```typescript
export const runCommand: Command = {
  name: 'run',
  description: 'Open an AI agent inside an existing worktree',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const name = args.name;
    const noPrompt = args['no-prompt'] === 'true' || args.p === 'true';
    const forceCleanup = args['clean'] === 'true' || args.c === 'true';

    // Resolve agent
    const agent = await ctx.resolveAgent(args);

    // Get worktree path
    const path = await ctx.worktree.getPath(name);

    // Spawn agent inside worktree
    const child = spawn(agent.bin, agent.args ?? [], {
      cwd: path,
      stdio: 'inherit',
      env: { ...process.env, OPENWTS: '1', OPENWTS_NAME: name, OPENWTS_BRANCH: name },
      shell: process.platform === 'win32',
    });

    // ... wait for exit, same cleanup logic as today
  },
};
```

**Removed vs today:** `_extra` arg handling, `-- <cmd>` pass-through, `getBranchName()` helper (branch env var set from `name` same as `start`).

---

## 7. The Picker — `src/agents/picker.ts` (Internal Module)

### Interface (not exported — used by `registry.ts` / `resolveAgent`)

```typescript
/** Shows an interactive list prompt. Returns the selected Agent, or undefined if cancelled. */
export function showAgentPicker(agents: Agent[]): Promise<Agent | undefined>;
```

### Implementation

- ~80 lines using Node.js `readline` in raw mode
- Keyboard: Up/Down arrows to navigate, Enter to confirm
- Cancel: `Escape` or `Ctrl+C` returns `undefined` → caller handles (e.g., exit gracefully)
- Renders: cursor indicator + agent name + description per row
- Cross-platform: tested patterns for Windows (`process.stdin.setRawMode(true)` behaviour varies)

### Rendering

```
Select an agent:
❯ opencode    AI coding assistant
  claude      Claude Code CLI
```

### Why internal

Only `resolveAgent()` calls it. No other module needs to know it exists. If we later swap to `@clack/prompts`, the change is scoped to one file.

---

## 8. Agent Selection Flow (Complete)

```
User types command
        │
        ▼
   ┌─────────────────────────────────┐
   │        index.ts router          │
   │                                 │
   │  argv[0] = known command?       │──→ dispatch to command
   │  argv[0] = known agent?         │──→ strip agent, resolve, set ctx.agent → route to start
   │  otherwise                      │──→ route to start (no ctx.agent)
   └─────────────────────────────────┘
                                           │
                                    ┌──────┘
                                    ▼
                           ┌──────────────────────┐
                           │  start / run command  │
                           │                       │
                           │  ctx.resolveAgent()   │──→ chain: ctx.agent? → --agent? → env var? → picker
                           │                       │
                           │  spawn agent.bin      │
                           │  wait for exit        │
                           │  cleanup              │
                           └──────────────────────┘
```

---

## 9. Migration Path

### What gets built (in order)

| Step | Files | Testable? |
|------|-------|-----------|
| 1. Create `Agent` interface | `src/agents/agent.ts` | No runtime |
| 2. Create `opencode.ts` + `claude.ts` definitions | `src/agents/opencode.ts`, `src/agents/claude.ts` | No runtime |
| 3. Build registry (registration + lazy PATH detection) | `src/agents/registry.ts` | ✅ Via `FakeSystem` |
| 4. Build picker | `src/agents/picker.ts` | Manual (interactive) |
| 5. Update `CommandContext` + `resolveAgent()` | `src/commands/command.ts` | ✅ Via test commands |
| 6. Update router in `index.ts` | `src/index.ts` | ✅ Integration test |
| 7. Update `start` command (remove `opencode`, use agent) | `src/commands/start.ts` | ✅ Via existing test patterns |
| 8. Update `run` command (remove `-- <cmd>`, use agent) | `src/commands/run.ts` | ✅ Via existing test patterns |
| 9. Update docs (README, FEATURES, COMMANDS) | `docs/*.md`, `README.md` | — |

### What stays (zero changes)

`worktree.ts`, `system.ts`, `output.ts`, `types.ts`, `manifest.ts`, `cleanup.ts`, `git.ts`, `create.ts`, `list.ts`, `remove.ts`, `prune.ts`

---

## 10. Test Strategy

| What | How | Seam crossed |
|------|-----|-------------|
| Agent resolution chain | Pass `FakeSystem` with mocked PATH, assert agent returned | `System` (PATH detection) |
| Unknown agent name error | Call `registry.get('nope')`, assert `OpenwtError` | `AgentRegistry` |
| No agents installed | Mock PATH to find nothing, assert empty list | `AgentRegistry` |
| Router dispatches agent-as-verb | Call `main(['claude', 'test'])`, assert agent resolved + start called | `CommandContext` |
| Command resolves from `--agent` flag | Pass `{ agent: 'claude' }` args, assert correct agent | `resolveAgent()` |
| Picker not called when agent is pre-resolved | Set `ctx.agent`, assert picker never shown | `resolveAgent()` |
| Picker not called when `OPENWTS_DEFAULT_AGENT` is set | Set env var, assert correct agent returned | `resolveAgent()` |

---

## 11. Open/Closed Principle Audit

| Operation | Open? | Closed? |
|-----------|-------|---------|
| Adding a new agent | `src/agents/cursor.ts` (new file) + `registry.ts` (one import + register call) | `command.ts`, `index.ts`, `start.ts`, `run.ts`, `picker.ts`, `worktree.ts`, all existing commands |
| Changing how agents are detected | `registry.ts` | Everything else |
| Changing the picker UI | `picker.ts` | Everything else |
| Adding agent resolution logic | `command.ts` / `index.ts` | Commands (`start`, `run`) — they just call `resolveAgent()` |
| Adding a new command | `src/commands/*.ts` | Everything else (existing OCP) |

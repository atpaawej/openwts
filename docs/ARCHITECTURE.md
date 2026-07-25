# Architecture

## Philosophy

openwts follows the **deep modules** design philosophy — a lot of behaviour behind a small interface. Callers learn a handful of methods and get powerful functionality. Bugs and complexity concentrate in one place (locality) rather than spreading across callers.

### Vocabulary

- **Module** — anything with an interface and an implementation (a file, a class, a package)
- **Interface** — everything a caller must know to use a module (types, errors, ordering, config)
- **Seam** — a place where you can alter behaviour without editing in that place
- **Adapter** — a concrete thing that satisfies an interface at a seam
- **Depth** — leverage: how much behaviour per unit of interface
- **Locality** — change, bugs, and complexity sit in one place, not N

### Principles

1. **Depth over shallowness.** Small interface, big implementation. A module with 5 methods that hides 200 lines of logic is deep. A module with 5 methods that each call one git command is shallow — don't bother.
2. **Seams only where justified.** "One adapter means a hypothetical seam. Two adapters means a real one." Don't introduce an interface unless you genuinely need both a production adapter and a test fake.
3. **The interface is the test surface.** Tests cross the same seam as callers. No testing past the interface.
4. **Open for extension, closed for modification (OCP).** Adding a new command or agent requires zero changes to existing code — just create a new file.

---

## Module Map

```
src/
├── index.ts              # Entry point (bin) — three-tier routing (commands → agents → start)
├── types.ts              # Shared domain types (WorktreeInfo, ExecResult)
├── worktree.ts           # DEEP MODULE — all git worktree logic
├── manifest.ts           # Manifest tracking (openwts-created worktrees)
├── git.ts                # Git helper utilities (status, branches)
├── cleanup.ts            # Cleanup decision + prompt logic
│
├── system.ts             # Seam A: exec + filesystem I/O
│   └── FakeSystem        # (in tests) in-memory I/O
│
├── output.ts             # Seam B: terminal output
│   └── CaptureOutput     # (in tests) collect output for assertions
│
├── agents/               # Agent abstraction layer (added in v0.3)
│   ├── agent.ts          # Agent interface (name, description, bin, args)
│   ├── registry.ts       # DEEP MODULE — registration + lazy PATH detection
│   ├── picker.ts         # Interactive terminal picker (internal)
│   ├── opencode.ts       # Built-in opencode agent definition
│   └── claude.ts         # Built-in claude agent definition
│
├── commands/
│   ├── loader.ts         # Static registration (OCP enabler)
│   ├── start.ts          # openwts <name> — one-shot create + run + cleanup
│   ├── create.ts         # openwts create <name> [base]
│   ├── list.ts           # openwts list
│   ├── run.ts            # openwts run <name> — agent inside existing worktree
│   ├── remove.ts         # openwts remove <name>
│   ├── prune.ts          # openwts prune
│   └── prompt.ts         # Interactive name prompt (internal, used by router)
```

### Dependency flow

```
index.ts
  └─→ main() (composition root)
        ├─→ worktree.ts  ←── system.ts  ←── child_process.exec / fs
        ├─→ output.ts    ←── console
        ├─→ agents/      ←── system.ts (for PATH detection)
        └─→ commands/loader.ts
              └─→ commands/*.ts  ←── worktree, system, output, agents (via CommandContext)
```

**Rules:**
- `worktree.ts` depends ONLY on `system.ts`. Never on `output.ts` or commands.
- `commands/*.ts` depend on `worktree.ts`, `system.ts`, `output.ts`, and optionally `agents/`.
- `worktree.ts` never prints or formats output — it returns structured data or throws.
- `agents/registry.ts` is the deep module of the agent layer: PATH detection, memoization, and error translation behind a 5-method interface.
- `index.ts` owns error handling: catches `OpenwtError` (known) and unexpected errors.

---

## The Deep Module: `worktree.ts`

The entire domain logic of openwts lives here. Its interface:

```typescript
interface Worktree {
  list(): Promise<WorktreeInfo[]>
  getPath(name: string): Promise<string>
  create(name: string, base?: string): Promise<void>
  remove(name: string, force?: boolean): Promise<void>
  prune(force?: boolean): Promise<void>
  isManaged(name: string): Promise<boolean>
  cleanup(name: string, opts?): Promise<boolean>
}
```

**8 methods.** Behind them:

- Parsing `git worktree list --porcelain` output (significantly more complex than it looks)
- Branch name validation and normalization
- Conflict detection (worktree exists? branch exists? already on this branch?)
- Safety pre-checks before remove (dirty state, detached HEAD, are you *inside* this worktree?)
- Bulk iteration and summary for `prune`
- Cleanup logic: auto-remove if clean, prompt if dirty, leave if non-interactive
- Manifest integration for tracking openwts-created worktrees
- Cross-platform path resolution (Windows vs POSIX)
- All error messages and user-facing suggestions

Every improvement to parsing, safety, or cleanup benefits all 6 commands simultaneously. That's **depth**.

---

## The Agent Registry: `src/agents/registry.ts`

A second deep module, added in v0.3. Its 5-method interface hides:

- Cross-platform `which`/`where` PATH resolution
- Memoization (installed agent cache, invalidated on registration)
- Error translation (unknown name → suggestion)
- Registration deduplication
- Support for any number of agents without caller changes

---

## Seams

### Seam A: `System`

```typescript
interface System {
  exec(cmd: string, args: string[], opts?: { cwd?: string }): Promise<ExecResult>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  appendFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  homeDir(): Promise<string>
  cwd(): string
}
```

**One interface, two adapters:**

| Adapter | Where | What it does |
|---------|-------|-------------|
| `NodeSystem` | Production | Wraps `child_process.exec` and `fs/promises` |
| `FakeSystem` | Tests | In-memory map for files, records exec calls + canned responses |

**Why one adapter instead of separate Git/Exec/FS adapters?** Depth. One fake to construct in tests, one import in commands. Three separate seams would triple the boilerplate for zero gain at this scale.

### Seam B: `Output`

```typescript
interface Output {
  info(msg: string): void
  success(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  table(rows: Record<string, string>[]): void
}
```

Same pattern: `NodeOutput` (console) in production, `CaptureOutput` (collects into arrays) in tests.

---

## Open-Closed Principle

New commands and agents are added by creating a file — no existing files are modified.

### How it works (commands)

Each command file exports a `Command` object:

```typescript
// src/commands/sync.ts
export const command: Command = {
  name: 'sync',
  description: 'Sync a worktree with its upstream',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  async run(args, ctx) {
    const path = await ctx.worktree.getPath(args.name);
    await ctx.system.exec('git', ['pull', '--ff-only'], { cwd: path });
    ctx.output.success(`Synced "${args.name}"`);
  },
};
```

The `loader.ts` statically registers every command. Just import and call `register()`.

**To add `sync`:** Create `src/commands/sync.ts`, import it in `loader.ts`, call `register()`. Done.

### How it works (agents)

Each agent definition exports an `Agent` object. The registry constructor imports and registers built-in agents.

**To add `cursor`:** Create `src/agents/cursor.ts`, import it in `registry.ts`, add to constructor's `register()` call. Zero changes to commands, router, or picker.

### What is closed

`index.ts`, `worktree.ts`, `types.ts`, `system.ts`, `output.ts`, every existing command and command handler.

### What is open

- `src/commands/*.ts` — new command files
- `src/agents/*.ts` — new agent definitions

---

## Routing

### Three-tier routing (v0.3+)

```
argv[0] = known command?   → dispatch directly
argv[0] = known agent?     → strip agent from argv, resolve agent, set ctx.agent,
                              route remaining args to `start`
otherwise                  → route to `start` (fallthrough with picker/default resolution)
```

### Agent resolution chain (used by both router and `ctx.resolveAgent()`)

1. **Agent-as-verb** — `openwts claude fix-bug` → pre-resolved by router
2. **`--agent` flag** — `openwts fix-bug --agent claude`
3. **`OPENWTS_DEFAULT_AGENT` env var**
4. **Interactive picker** (fallback)

### Default verb routing (v0.2 and earlier)

If `argv[0]` is not a known command name, it's treated as a worktree name and dispatched to the `start` command. This enables `openwts feature-x` without typing `openwts start feature-x`.

```
openwts feature-x     # "feature-x" isn't a command → routed to start
openwts start feature-x  # explicit, same result
openwts list          # "list" is a known command → normal dispatch
```

---

## Error Handling

```typescript
class OpenwtError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string   // "Did you mean...?"
  ) { this.name = 'OpenwtError'; }
}
```

| Error category | Mechanism | User sees |
|---------------|-----------|-----------|
| Known error (worktree not found, already exists) | Commands throw `OpenwtError` | Red message + suggestion, exit 1 |
| Unexpected error (bug, runtime failure) | Uncaught exception | Stack trace, exit 1 |

The suggestion pattern helps users recover quickly:

```
$ openwts run oops
✗ Worktree "oops" not found
  Suggestion: Create it first — openwts create oops
```

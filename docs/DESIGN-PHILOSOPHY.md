# Design Philosophy

This document captures the principles and rationale behind how openwts is built — *why* it's designed this way, not just *what* it does.

---

## 1. Deep Modules, Not Shallow Ones

**Rule:** A module should hide more than it shows.

In the codebase-design vocabulary (from `.claude/skills/codebase-design`):

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

In openwts, `worktree.ts` is the deep module. Its 5 methods (`list`, `getPath`, `create`, `remove`, `prune`) hide:

- Parsing `git worktree list --porcelain` (a surprisingly subtle format)
- Branch name validation and normalization
- Cross-platform path handling
- All git error translation
- Safety checks for destructive operations

A shallow alternative would be a module per git command (one for `git worktree add`, one for `git worktree list`, etc.). That would spread the complexity across 7 files instead of concentrating it in 1. **Depth = leverage.** Callers learn 5 methods and get everything. Fix a bug in parsing once, and all 7 commands benefit.

---

## 2. The Deletion Test

**Rule:** Imagine deleting a module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, the module is earning its keep.

- **Delete `worktree.ts`**: Every command would need to run raw git worktree commands and parse porcelain output. Complexity reappears across 7 files. → **Earns its keep.**
- **Delete `system.ts`**: Every test would need to mock child_process and fs individually. Complexity reappears across every test file. → **Earns its keep.**
- **Delete `output.ts`**: Commands would use `console.log` directly. Tests would capture stdout by overriding console. Complexity disappears but so does test infrastructure. → **Barely earns its keep at 7 commands; justified at 10+.**

---

## 3. Seam Discipline (One vs Two Adapters)

**Rule:** "One adapter means a hypothetical seam. Two adapters means a real one."

Don't introduce an interface unless you genuinely need TWO implementations — typically one for production and one for testing.

**In openwts:**

| Interface | Production Adapter | Test Adapter | Justified? |
|-----------|-------------------|-------------|------------|
| `System` | `NodeSystem` (real exec + fs) | `FakeSystem` (in-memory) | ✅ **Yes** — tests must not touch real git or filesystem |
| `Output` | `NodeOutput` (console) | `CaptureOutput` (collects lines) | ✅ **Yes** — tests assert on output |

**What we deliberately avoided:**

- **Separate GitPort, ExecPort, FileSystemPort** — These would be 3 interfaces instead of 1. Each would need its own fake. Tests would construct 3 objects instead of 1. The seams would be shallow — each port would have 1-4 thin methods. Bad depth.

- **ConfigPort** — No config in v1. If config is added later, the seam is extracted at that point. Adding a seam before you have two adapters is speculative abstraction.

---

## 4. Open-Closed Principle

**Rule:** A new feature should require adding new code, not modifying existing code.

**How openwts achieves this:**

Commands are auto-discovered via filesystem scan. Each command file exports a `Command` object; the loader imports every file in the `commands/` directory. 

```
To add "openwts sync" → create src/commands/sync.ts
                          ↓
                    0 existing files changed.
```

**What is closed (never changes per-command):**

- `cli.ts` — the dispatch loop
- `loader.ts` — the auto-registration logic  
- `worktree.ts` — the domain module
- `types.ts` — shared types
- `system.ts` — I/O adapter
- `output.ts` — output adapter

**What is open (extensible per-command):**

- `src/commands/*.ts` — new command files

**Why not a plugin system?** Plugin systems add packaging, lifecycle, and versioning complexity. For 5-15 commands, a directory scan is simpler, faster, and typesafe. Plugin support can be added behind the same `Command` interface if third-party commands become a real need.

---

## 5. The Interface Is the Test Surface

**Rule:** Tests should cross the same seam as production callers. If a test has to change when the implementation changes, it's testing past the interface.

**In openwts:**

```typescript
// ✅ Tests call the same Worktree interface that commands call
const result = await worktree.create('my-feature', 'main');
const list = await worktree.list();
assert(list.some(w => w.name === 'my-feature'));

// ❌ Do NOT test that create() internally called:
//    "git worktree add .openwts/worktrees/my-feature main"
// That's implementation, not behaviour.
```

**What this means:**
- Tests assert on **outcomes** (worktree appears in list, error message contains expected text), not on **calls** (no "expect(git.exec).toHaveBeenCalledWith(...)")
- Tests survive internal refactors — you can rewrite the parsing logic and tests still pass
- The `FakeSystem` adapter returns realistic-looking data, not mock objects

---

## 6. Error Handling Philosophy

**Rule:** Errors should be informative, actionable, and consistent.

**Pattern:**
```
<error message>
Suggestion: <actionable fix>
```

**Why "Suggestion" is important:** A user seeing `Worktree "oops" not found` might not know what to do next. Adding `openwts create oops` turns frustration into a learning moment.

**Two error regimes:**

| Category | Mechanism | UX |
|----------|-----------|-----|
| Predictable failure (worktree not found, name taken) | `OpenwtError` with `.suggestion` | Clean message, exit 1 |
| Unexpected failure (bug, runtime error) | Uncaught exception | Stack trace, exit 1 |

No error type polymorphism, no complex error hierarchies. `OpenwtError` for everything the user can fix; uncaught for everything else.

---

## 7. One-Shot Design (Replacing Shell Integration)

The `switch` and `install` commands existed only to support manually `cd`-ing into a worktree from the user's shell — which requires a shell wrapper because a child process cannot change its parent's working directory.

The one-shot refactor replaced that pattern: `openwts <name>` (routed to the `start` command) creates a worktree and spawns `opencode` directly inside it via `child_process.spawn(cwd=worktreePath)`. No shell wrapper needed. Cleanup happens on exit.

This eliminated the two commands that required the most cross-platform complexity (especially PowerShell vs bash) while keeping the UX ergonomic — the user types one command, gets an opencode session in their worktree, and never thinks about shell integration again.

---

## 8. What's Explicitly Deferred

These decisions were consciously deferred to keep v1 deep and focused:

| Feature | Why deferred |
|---------|-------------|
| Config file | V1 has zero configuration. Custom worktree paths or behaviors can be added when users ask for them. |
| Plugin system | Unnecessary for 5-15 commands. The directory-scan registration pattern is sufficient. |
| JSON output | Primary user is a human in a terminal. `--json` can be added to `output.ts` later for CI integration. |
| `sync` / `rename` commands | Useful but not essential for v1. Following YAGNI — add when the workflow demands it. |
| Windows git path detection | Handled by the OS PATH, but edge cases (Git Bash vs WSL) can be addressed as they arise. |

---

## 9. Related Reading

- [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) — Ousterhout, the origin of "deep modules"
- [Working Effectively with Legacy Code](https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055) — Feathers, origin of "seam"
- The codebase-design skill (`.claude/skills/codebase-design/`) — the specific vocabulary and rules this architecture follows

# 🌿 openwts — The Worktree Sidekick for opencode

> **Stop context switching. Start shipping.**

You know the feeling. You're deep in a feature, then — *"fix this urgent bug"*. Now you're stashing, branch-hopping, praying nothing breaks. Your flow is shattered.

**openwts** is your exit from that chaos. One command, and you have an isolated git worktree ready for a new task with `opencode` running inside it. When you're done, you exit — cleanup happens automatically. Your main branch stays pristine.

---

## The One-Shot Flow

```bash
# Deep in a feature — opencode running
# Boss: "Fix login bug NOW"

# One command:
openwts login-hotfix
# → creates worktree, opens opencode inside it
# → fix the bug, exit opencode
# → auto-cleanup if no changes, prompt if dirty

# Back to your feature — code right where you left it
```

This is `claude -w` for opencode. One command, end to end.

---

## Why openwts?

| Problem | How openwts fixes it |
|---------|---------------------|
| Stashing and popping like a caveman | Every task gets its own directory. No stash. |
| `git checkout -b` + `git worktree add` incantations | One command: `openwts <name>` |
| Forgetting which worktree had what | `openwts list` shows all active worktrees, branch, dirty status, and whether openwts manages them |
| opencode doesn't have `claude -w` | `openwts <name>` does exactly that: create + open + cleanup |
| Cleaning up old worktrees manually | `openwts prune` — gone with safety checks |
| Fear of breaking production while experimenting | Each worktree is isolated. **Your main branch never changes.** |

---

## By the numbers

| Metric | Before openwts | With openwts |
|--------|---------------|--------------|
| Context switch cost | Mental + git overhead = 15+ min | `openwts <name>` = 2 seconds |
| Parallel task safety | Risky, manual, error-prone | Guaranteed isolation |
| Cleanup discipline | "I'll get to it" (never happens) | Auto-cleanup + `openwts prune` |
| opencode integration | No worktree support | One-shot create + open + cleanup |

---

## Who is this for?

- **opencode users** who want worktree superpowers without memorizing git incantations
- **Devs who juggle 3+ tasks daily** and are tired of stash conflicts
- **Anyone who's ever run `git checkout .` in the wrong branch** (we've all been there)

---

## Get started

```bash
npm install -g openwts

cd my-project
openwts my-new-feature     # one-shot: create + open + cleanup
openwts list               # see all worktrees
openwts remove my-new-feature  # clean up when done
```

**From zero to isolated in 2 seconds.**

---

> **openwts — Stop switching. Start shipping.**

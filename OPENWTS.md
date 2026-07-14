# 🌿 openwts — The Worktree Sidekick for opencode

> **Stop context switching. Start shipping.**

You know the feeling. You're deep in a feature, then — *"fix this urgent bug"*. Now you're stashing, branch-hopping, praying nothing breaks. Your flow is shattered.

**openwts** is your exit from that chaos. One command, and you have an isolated git worktree ready for a new task. Another command, and `opencode` opens right inside it — fresh context, zero conflicts, no stash. When you're done, delete it. Your main branch stays pristine.

---

## The Pitch

### For the solo dev who ships fast

```bash
# Deep in a feature
openwts run auth-rewrite -- opencode

# Boss: "Fix login bug NOW"
openwts create login-hotfix main
openwts run login-hotfix -- opencode "fix the login crash"

# Back to feature — your code is right where you left it
openwts switch auth-rewrite
```

**Zero friction. Zero context loss. Zero excuses.**

### For the team working in parallel

```bash
# Code review? Jump in clean
openwts create review-pr-42
openwts run review-pr-42 -- opencode "review these changes"

# Experiment without fear
openwts create risky-refactor
openwts run risky-refactor -- opencode "try the new caching"
# Didn't work? Delete it. Main untouched.
openwts remove risky-refactor
```

**Your `main` branch is sacred. Protect it with openwts.**

### For the CI/CD paranoid

```bash
# Test in isolation before merging
openwts create test-deploy-flow
openwts run test-deploy-flow -- npm run build:staging
openwts run test-deploy-flow -- npm test
openwts remove test-deploy-flow
```

**What happens in a worktree, stays in the worktree.**

---

## Why openwts?

| Problem | How openwts fixes it |
|---------|---------------------|
| Stashing and popping like a caveman | Every task gets its own directory. No stash. |
| `git checkout -b` + `git worktree add` incantations | One command: `openwts create task-name` |
| Forgetting which worktree had what | `openwts list` shows all active worktrees, branch, and dirty status |
| Switching between contexts disrupts your opencode session | `openwts switch task-name` takes you there |
| Cleaning up old worktrees manually | `openwts prune` — gone with safety checks |
| Fear of breaking production while experimenting | Each worktree is isolated. **Your main branch never changes.** |

---

## By the numbers

| Metric | Before openwts | With openwts |
|--------|---------------|--------------|
| Context switch cost | Mental + git overhead = 15+ min | `openwts create && openwts run` = 2 seconds |
| Parallel task safety | Risky, manual, error-prone | Guaranteed isolation |
| Cleanup discipline | "I'll get to it" (never happens) | `openwts prune` — one command |
| opencode integration | Manual `cd` and branch management | Automatic — opens right in the worktree |

---

## Who is this for?

- **opencode users** who want worktree superpowers without memorizing git incantations
- **Devs who juggle 3+ tasks daily** and are tired of stash conflicts
- **Anyone who's ever run `git checkout .` in the wrong branch** (we've all been there)

---

## Get started

```bash
npm install -g openwts
openwts install                              # shell setup (one-time)
openwts create my-new-feature                # isolate your work
openwts run my-new-feature                   # opencode in the worktree
openwts list                                 # see all worktrees
openwts switch my-new-feature                # cd into it (shell function)
openwts remove my-new-feature                # clean up when done
```

**From zero to isolated in 2 seconds.**

---

> **openwts — Stop switching. Start shipping.**

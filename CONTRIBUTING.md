# Contributing

You want to make openwts better? Hell yes. Let's go.

## Quick Start

```bash
git clone https://github.com/atpaawej/openwts
cd openwts
npm install
npm test
```

That's it. You're ready.

## Development

```bash
npm run dev           # run directly via tsx
npm test              # run all tests (vitest)
npm run test:watch    # watch mode
npm run build         # compile to dist/
```

## How It's Structured

The codebase is designed so you can add stuff without breaking stuff:

- **Commands** live in `src/commands/`. Create a new file, export a `Command` object, import it in `loader.ts`. Zero existing code changes.
- **Agents** live in `src/agents/`. Create a new file, export an `Agent` object, register in `registry.ts`. The router and picker handle the rest.

Read `docs/ARCHITECTURE.md` for the full picture.

## Design Principles

1. **Deep modules.** Hide complexity behind a small interface. `worktree.ts` does ~350 lines of git parsing behind 5 methods. Keep it that way.
2. **Seams only where justified.** One production adapter + one test fake. No speculative abstraction.
3. **The interface is the test surface.** Tests cross the same seam as callers. No testing internal implementation.
4. **OCP.** New features = new files. Don't modify existing code if you can help it.

## Pull Requests

- Open an issue first if it's more than a bug fix — let's talk about it
- Keep PRs focused. One thing per PR
- Tests or GTFO
- Match the existing code style (comments, naming, structure)
- Update docs if you change behavior

## Code of Conduct

Don't be a jerk. This is a small open source project — we're all here to make dev tools better. Be chill.

## Questions?

Open an issue. Or just send a PR. We'll figure it out.

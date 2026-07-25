#!/usr/bin/env node
/**
 * openwts — Isolated worktrees for AI coding agents.
 *
 * Entry point. Parses argv, wires adapters, dispatches to commands.
 *
 * Three-tier routing:
 * 1. Known command (list, create, remove, run, prune, start) → dispatch directly
 * 2. Known agent name (claude, opencode) → strip from argv, resolve agent,
 *    set context, route remaining args to `start`
 * 3. Fallthrough (unrecognized) → route to `start` with picker/default resolution
 */
export declare function main(argv: string[]): Promise<number>;
//# sourceMappingURL=index.d.ts.map
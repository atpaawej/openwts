/**
 * start — the one-shot command.
 *
 * Combines create + run + cleanup in one motion.
 * This is the DEFAULT command when argv[0] is not a known subcommand or agent name.
 *
 * UX: openwts feature-x
 *   → creates worktree .openwts/worktrees/feature-x on branch feature-x
 *   → launches agent (opencode, claude, etc.) inside the worktree
 *   → on exit: auto-remove if clean, prompt if dirty, leave if -p/--no-prompt
 */
import type { Command } from './command.js';
export declare const startCommand: Command;
//# sourceMappingURL=start.d.ts.map
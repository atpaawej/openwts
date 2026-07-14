/**
 * start — the one-shot command.
 *
 * Combines create + run + cleanup in one motion.
 * This is the DEFAULT command when argv[0] is not a known subcommand.
 *
 * UX: openwts feature-x
 *   → creates worktree .openwts/worktrees/feature-x on branch feature-x
 *   → launches opencode inside the worktree
 *   → on exit: auto-remove if clean, prompt if dirty, leave if -p/--no-prompt
 */

import { spawn } from 'node:child_process';
import type { Command } from './command.js';

export const startCommand: Command = {
  name: 'start',
  description: 'Create a worktree and open it with opencode (one-shot)',
  arguments: [
    { name: 'name', required: true, description: 'Worktree and branch name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const name = args.name;
    const base = args.base;
    const noPrompt = args['no-prompt'] === 'true' || args.p === 'true';
    const forceCleanup = args['clean'] === 'true' || args.c === 'true';
    const runCmd = args._exec || 'opencode';

    // Create the worktree
    await ctx.worktree.create(name, base || undefined);

    const path = await ctx.worktree.getPath(name);
    ctx.output.success(`Created worktree "${name}" at ${path}`);
    ctx.output.info(`Running: ${runCmd} in ${name}\n`);

    // Spawn opencode (or custom command) inside the worktree
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      OPENWTS: '1',
      OPENWTS_NAME: name,
      OPENWTS_BRANCH: name,
    };

    const child = spawn(runCmd, [], {
      cwd: path,
      stdio: 'inherit',
      env,
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => resolve(code ?? 0));
      child.on('error', () => resolve(1));
    });

    if (exitCode !== 0) {
      ctx.output.warn(`${runCmd} exited with code ${exitCode}`);
    }

    // Cleanup after exit
    const removed = await ctx.worktree.cleanup(name, {
      force: forceCleanup,
      noPrompt,
    });

    if (removed) {
      ctx.output.success(`Removed worktree "${name}"`);
    } else {
      ctx.output.info(`Worktree "${name}" left in place at ${path}`);
    }
  },
};

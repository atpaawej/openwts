import { spawn } from 'node:child_process';
import type { Command, CommandContext } from './command.js';
import { OpenwtError } from '../types.js';

async function getBranchName(ctx: CommandContext, path: string): Promise<string> {
  const worktrees = await ctx.worktree.list();
  const name = path.split('/').pop();
  const wt = worktrees.find(w => w.name === name);
  return wt?.branch ?? 'unknown';
}

export const runCommand: Command = {
  name: 'run',
  description: 'Run a command inside a worktree (default: opencode)',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const path = await ctx.worktree.getPath(args.name);

    // Determine command to run from _extra (passed after --)
    const extraArg = args._extra;
    const cmdArgs: string[] = extraArg !== undefined
      ? (typeof extraArg === 'string' ? [extraArg] : extraArg as unknown as string[])
      : [];
    const cmd = cmdArgs.length > 0 ? cmdArgs[0]! : 'opencode';
    const cmdRest = cmdArgs.length > 1 ? cmdArgs.slice(1) : [];

    // Set env vars so child processes know they're in a worktree
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      OPENWTS: '1',
      OPENWTS_NAME: args.name,
      OPENWTS_BRANCH: (await getBranchName(ctx, path)),
    };

    // Spawn the command with inherited stdio
    const child = spawn(cmd, cmdRest, {
      cwd: path,
      stdio: 'inherit',
      env,
    });

    return new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0 && code !== null) {
          reject(new OpenwtError(`Command exited with code ${code}`));
        } else {
          resolve();
        }
      });
      child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new OpenwtError(
            `Command not found: ${cmd}`,
            `Install it or use: openwts run ${args.name} -- <command>`,
          ));
        } else {
          reject(err);
        }
      });
    });
  },
};

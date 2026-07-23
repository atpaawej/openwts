import { spawn } from 'node:child_process';
import type { Command, CommandContext } from './command.js';
import { resolveAgent } from './command.js';
import { OpenwtError } from '../types.js';

async function getBranchName(ctx: CommandContext, path: string): Promise<string> {
  const worktrees = await ctx.worktree.list();
  const name = path.split('/').pop();
  const wt = worktrees.find(w => w.name === name);
  return wt?.branch ?? 'unknown';
}

export const runCommand: Command = {
  name: 'run',
  description: 'Run an AI coding agent inside an existing worktree',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const path = await ctx.worktree.getPath(args.name);

    // Resolve which agent to use
    const agent = await resolveAgent(ctx, args);
    const runCmd = agent.bin;
    const agentArgs = [...(agent.args ?? [])];

    const noPrompt = args['no-prompt'] === 'true' || args.p === 'true';
    const forceCleanup = args['clean'] === 'true' || args.c === 'true';

    // Set env vars so child processes know they're in a worktree
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      OPENWTS: '1',
      OPENWTS_NAME: args.name,
      OPENWTS_BRANCH: (await getBranchName(ctx, path)),
    };

    ctx.output.info(`Running: ${runCmd} in ${args.name}\n`);

    // Spawn the agent with inherited stdio.
    // On Windows, npm-installed CLIs are .cmd files — need shell: true to resolve.
    const child = spawn(runCmd, agentArgs, {
      cwd: path,
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    });

    return new Promise((resolve, reject) => {
      child.on('close', async (code) => {
        if (code !== 0 && code !== null) {
          reject(new OpenwtError(`Command exited with code ${code}`));
          return;
        }

        // Post-exit cleanup for openwts-managed worktrees
        try {
          const removed = await ctx.worktree.cleanup(args.name, {
            force: forceCleanup,
            noPrompt,
          });
          if (removed) {
            ctx.output.success(`Cleaned up worktree "${args.name}"`);
          }
        } catch {
          // Cleanup is best-effort — don't fail the command for it
        }

        resolve();
      });
      child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new OpenwtError(
            `Command not found: ${runCmd}`,
            `Install ${agent.name} or check that it's on your PATH`,
          ));
        } else {
          reject(err);
        }
      });
    });
  },
};

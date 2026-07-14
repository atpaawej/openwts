import type { Command } from './command.js';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new git worktree from a base branch',
  arguments: [
    { name: 'name', required: true, description: 'Worktree and branch name' },
    { name: 'base', required: false, description: 'Base branch (default: main, @ = current)' },
  ],
  aliases: ['new', 'add'],

  async run(args, ctx) {
    const name = args.name;
    const base = args.base;

    await ctx.worktree.create(name, base || undefined);

    const path = await ctx.worktree.getPath(name);
    ctx.output.success(`Created worktree "${name}" at ${path}`);
    ctx.output.info(`Run: openwts run ${name}`);
  },
};

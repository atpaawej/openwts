import type { Command } from './command.js';

export const switchCommand: Command = {
  name: 'switch',
  description: 'Navigate into a worktree (requires shell function from openwts install)',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  aliases: [],

  async run(args, ctx) {
    const path = await ctx.worktree.getPath(args.name);
    // Output just the path — the shell function intercepts this and does `cd`
    ctx.output.info(path);
  },
};

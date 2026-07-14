import type { Command } from './command.js';

export const listCommand: Command = {
  name: 'list',
  description: 'List all worktrees with branch and dirty status',
  arguments: [],
  aliases: ['ls', 'status'],

  async run(_args, ctx) {
    const worktrees = await ctx.worktree.list();

    if (worktrees.length === 0) {
      ctx.output.info('No worktrees found');
      return;
    }

    const rows = worktrees.map(w => ({
      Name: w.name,
      Branch: w.branch,
      Path: w.path.replace(ctx.system.cwd().replace(/\\/g, '/') + '/', ''),
      Dirty: w.dirty ? '⚠' : '✓',
      Current: w.isCurrent ? '◀' : '',
    }));

    ctx.output.table(rows);
  },
};

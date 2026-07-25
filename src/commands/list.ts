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

    const repoRoot = (await ctx.worktree.repoRoot()).replace(/\\/g, '/');
    const rows = await Promise.all(worktrees.map(async w => ({
      Name: w.isCurrent ? `${w.name} ◀` : w.name,
      Branch: w.branch,
      Dirty: w.dirty ? '⚠ dirty' : '✓ clean',
      Managed: (await ctx.worktree.isManaged(w.name)) ? '✓' : '-',
    })));

    ctx.output.table(rows);
  },
};

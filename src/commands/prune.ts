import type { Command } from './command.js';
import { OpenwtError } from '../types.js';

export const pruneCommand: Command = {
  name: 'prune',
  description: 'Remove all non-main worktrees',
  arguments: [],
  aliases: [],

  async run(args, ctx) {
    const force = args.force === 'true' || args.f === 'true';
    const worktrees = await ctx.worktree.list();
    const toRemove = worktrees.filter(w => !w.isCurrent);

    if (toRemove.length === 0) {
      ctx.output.info('No worktrees to prune');
      return;
    }

    // Show summary
    ctx.output.info(`Found ${toRemove.length} worktree(s) to remove:\n`);

    const rows = toRemove.map(w => ({
      Name: w.name,
      Branch: w.branch,
      Dirty: w.dirty ? '⚠' : '✓',
    }));
    ctx.output.table(rows);

    // Check for risky ones
    const risky = toRemove.filter(w => w.dirty);
    if (risky.length > 0 && !force) {
      ctx.output.warn(`\n${risky.length} worktree(s) have uncommitted changes`);
      ctx.output.info('Run with --force to remove anyway');
      return;
    }

    // Confirm
    if (!force) {
      // Note: in a real interactive CLI we'd use readline here.
      // For programmatic use, --force skips confirmation.
      ctx.output.info(`\nRun again with --force to confirm removal of ${toRemove.length} worktree(s)`);
      return;
    }

    let removed = 0;
    let failed = 0;
    for (const wt of toRemove) {
      try {
        await ctx.worktree.remove(wt.name, true);
        removed++;
      } catch (e) {
        ctx.output.error(`Failed to remove "${wt.name}": ${e instanceof Error ? e.message : String(e)}`);
        failed++;
      }
    }

    if (failed === 0) {
      ctx.output.success(`Removed ${removed} worktree(s)`);
    } else {
      ctx.output.warn(`Removed ${removed}, failed ${failed} worktree(s)`);
    }
  },
};

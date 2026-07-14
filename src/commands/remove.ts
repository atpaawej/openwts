import type { Command } from './command.js';
import { OpenwtError } from '../types.js';

export const removeCommand: Command = {
  name: 'remove',
  description: 'Delete a worktree with safety checks',
  arguments: [
    { name: 'name', required: true, description: 'Worktree name' },
  ],
  aliases: ['rm', 'delete'],

  async run(args, ctx) {
    const name = args.name;
    const force = args.force === 'true' || args.f === 'true';

    // Warn if removing a non-openwts worktree
    const isManaged = await ctx.worktree.isManaged(name);
    if (!isManaged) {
      ctx.output.warn(`"${name}" was not created by openwts`);
    }

    // Safety check: warn about dirty/unpushed before removing
    const path = await ctx.worktree.getPath(name);

    // Check dirty
    const statusRes = await ctx.system.exec('git', ['status', '--porcelain'], { cwd: path });
    const isDirty = statusRes.stdout.trim().length > 0;
    if (isDirty) {
      ctx.output.warn(`"${name}" has uncommitted changes`);
    }

    // Check unpushed
    const unpushedRes = await ctx.system.exec(
      'git', ['log', '@{u}..HEAD', '--oneline'], { cwd: path }
    );
    const hasUnpushed = unpushedRes.stdout.trim().length > 0;
    if (hasUnpushed) {
      ctx.output.warn(`"${name}" has unpushed commits`);
    }

    if ((isDirty || hasUnpushed) && !force) {
      throw new OpenwtError(
        `"${name}" has pending changes`,
        'Commit, push, or stash first, or use --force',
      );
    }

    await ctx.worktree.remove(name, force);
    ctx.output.success(`Removed worktree "${name}"`);
  },
};

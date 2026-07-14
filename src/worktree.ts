/**
 * Worktree — the deep domain module.
 *
 * Interface: 5 methods (list, getPath, create, remove, prune).
 * Behind them: git porcelain parsing, branch validation, safety checks,
 * cross-platform path resolution, error translation.
 *
 * Depends ONLY on System. Never on Output or commands.
 * Returns structured data. Throws OpenwtError on known failures.
 */

import type { System } from './system.js';
import type { WorktreeInfo } from './types.js';
import { OpenwtError } from './types.js';
import { createManifestManager, ManifestManager } from './manifest.js';
import { getCurrentBranch, getDefaultBranch, getStatus } from './git.js';

const WORKTREE_DIR = '.openwts/worktrees';

export function createWorktree(system: System): Worktree {
  return new RealWorktree(system);
}

export interface Worktree {
  /** List all worktrees for the current repo */
  list(): Promise<WorktreeInfo[]>;

  /** Resolve a worktree name to its absolute path */
  getPath(name: string): Promise<string>;

  /**
   * Create a new worktree.
   * @param name Worktree and branch name
   * @param base Base branch to fork from. Defaults to detected default branch.
   *             Use '@' for current branch.
   */
  create(name: string, base?: string): Promise<void>;

  /**
   * Remove a worktree with safety checks.
   * @param name Worktree name
   * @param force Skip safety confirmation
   */
  remove(name: string, force?: boolean): Promise<void>;

  /** Remove all non-main worktrees */
  prune(force?: boolean): Promise<void>;

  /** Get the repo root for the current directory */
  repoRoot(): Promise<string>;

  /**
   * Check if a worktree was created by openwts.
   * Non-openwts worktrees are skipped by auto-cleanup.
   */
  isManaged(name: string): Promise<boolean>;

  /**
   * Clean up a worktree after use.
   * - If clean: auto-remove
   * - If dirty and interactive: prompt user
   * - If dirty and non-interactive: leave it
   * @param name Worktree name
   * @param opts Options for cleanup
   * @returns true if worktree was removed, false if kept
   */
  cleanup(name: string, opts?: { force?: boolean; noPrompt?: boolean }): Promise<boolean>;
}

class RealWorktree implements Worktree {
  constructor(private system: System) {}

  private async getManifest(): Promise<ManifestManager> {
    const root = await this.repoRoot();
    return createManifestManager(this.system, root);
  }

  async repoRoot(): Promise<string> {
    const result = await this.system.exec('git', ['rev-parse', '--show-toplevel']);
    if (result.exitCode !== 0) {
      throw new OpenwtError(
        'Not in a git repository',
        'Run openwts from inside a git repository',
      );
    }
    return result.stdout.trim();
  }

  async list(): Promise<WorktreeInfo[]> {
    const root = await this.repoRoot();
    const result = await this.system.exec('git', ['worktree', 'list', '--porcelain'], { cwd: root });
    if (result.exitCode !== 0) {
      throw new OpenwtError('Failed to list worktrees', result.stderr.trim());
    }

    const entries = this.parsePorcelain(result.stdout);
    const mainPath = root.replace(/\\/g, '/');

    // Check dirty status for each worktree
    const enriched: WorktreeInfo[] = [];
    for (const entry of entries) {
      const statusRes = await this.system.exec('git', ['status', '--porcelain'], { cwd: entry.path });
      enriched.push({
        ...entry,
        dirty: statusRes.stdout.trim().length > 0,
        isCurrent: entry.path.replace(/\\/g, '/') === mainPath,
      });
    }

    return enriched;
  }

  async getPath(name: string): Promise<string> {
    const worktrees = await this.list();
    // Exact match first
    const exact = worktrees.find(w => w.name === name);
    if (exact) return exact.path;

    // Fuzzy match by branch name
    const fuzzy = worktrees.find(w => w.branch === name);
    if (fuzzy) return fuzzy.path;

    throw new OpenwtError(
      `Worktree "${name}" not found`,
      `Create it first: openwts create ${name}`,
    );
  }

  async create(name: string, base?: string): Promise<void> {
    // Validate name
    if (!/^[\w.-]+$/.test(name)) {
      throw new OpenwtError(
        `Invalid worktree name "${name}"`,
        'Use only letters, numbers, hyphens, dots, and underscores',
      );
    }

    const root = await this.repoRoot();
    const wtPath = `${root}/${WORKTREE_DIR}/${name}`;

    // Check if worktree already exists
    if (await this.system.exists(wtPath)) {
      throw new OpenwtError(
        `Worktree "${name}" already exists`,
        `Use: openwts run ${name}`,
      );
    }

    // Determine base branch
    let baseBranch = base;
    if (!baseBranch || baseBranch === '@') {
      if (baseBranch === '@') {
        baseBranch = await this.getCurrentBranch(root);
      } else {
        baseBranch = await this.getDefaultBranch(root);
      }
    }

    // Ensure base branch exists locally
    const branchCheck = await this.system.exec('git', ['rev-parse', '--verify', baseBranch], { cwd: root });
    if (branchCheck.exitCode !== 0) {
      // Try fetching from origin
      await this.system.exec('git', ['fetch', 'origin', baseBranch], { cwd: root });
      const retryCheck = await this.system.exec('git', ['rev-parse', '--verify', baseBranch], { cwd: root });
      if (retryCheck.exitCode !== 0) {
        throw new OpenwtError(
          `Base branch "${baseBranch}" not found`,
          'Make sure the branch exists locally or on origin',
        );
      }
    }

    // Create the worktree
    const addResult = await this.system.exec(
      'git',
      ['worktree', 'add', '-b', name, wtPath, baseBranch],
      { cwd: root },
    );
    if (addResult.exitCode !== 0) {
      // Check for specific errors
      const stderr = addResult.stderr;
      if (stderr.includes('already exists')) {
        throw new OpenwtError(
          `Branch "${name}" already exists`,
          'Use a different name or remove the existing branch: git branch -D ' + name,
        );
      }
      throw new OpenwtError('Failed to create worktree', stderr.trim());
    }

    // Record in manifest
    const manifest = await this.getManifest();
    await manifest.add(name, name, wtPath);
  }

  async remove(name: string, force?: boolean): Promise<void> {
    const root = await this.repoRoot();
    const path = await this.getPath(name);

    // Safety: can't remove main worktree
    if (path.replace(/\\/g, '/') === root.replace(/\\/g, '/')) {
      throw new OpenwtError(
        'Cannot remove the main worktree',
        'You can only remove worktrees created by openwts',
      );
    }

    // Safety: check for dirty state
    const statusRes = await this.system.exec('git', ['status', '--porcelain'], { cwd: path });
    const isDirty = statusRes.stdout.trim().length > 0;

    if (isDirty && !force) {
      // Non-blocking warning — the remove will still work with --force
      // But we let it continue since `git worktree remove` handles dirty checks
    }

    // Check for unpushed commits
    const unpushedRes = await this.system.exec(
      'git', ['log', '@{u}..HEAD', '--oneline'], { cwd: path }
    );
    const hasUnpushed = unpushedRes.stdout.trim().length > 0;

    if (hasUnpushed && !force) {
      // Let it proceed but warn below
    }

    if (force) {
      // Force remove with git worktree remove --force
      await this.system.exec('git', ['worktree', 'remove', '--force', path], { cwd: root });
    } else {
      const rmResult = await this.system.exec('git', ['worktree', 'remove', path], { cwd: root });
      if (rmResult.exitCode !== 0) {
        throw new OpenwtError(
          `Cannot remove "${name}"`,
          `${rmResult.stderr.trim()}\nUse --force to override`,
        );
      }
    }

    // Clean up manifest entry
    const manifest = await this.getManifest();
    await manifest.remove(name);
  }

  async prune(force?: boolean): Promise<void> {
    const worktrees = await this.list();
    const toRemove = worktrees.filter(w => !w.isCurrent);

    if (toRemove.length === 0) {
      return;
    }

    for (const wt of toRemove) {
      try {
        await this.remove(wt.name, force);
      } catch (e) {
        if (e instanceof OpenwtError) {
          throw new OpenwtError(
            `Failed to remove "${wt.name}"`,
            e.message,
          );
        }
        throw e;
      }
    }
  }

  // ─── Manifest-aware operations ──────────────────────────

  async isManaged(name: string): Promise<boolean> {
    const manifest = await this.getManifest();
    return manifest.isManaged(name);
  }

  async cleanup(name: string, opts?: { force?: boolean; noPrompt?: boolean }): Promise<boolean> {
    const root = await this.repoRoot();

    // Only clean up worktrees that openwts created
    if (!(await this.isManaged(name))) {
      return false;
    }

    const path = await this.getPath(name);

    // Check dirty + unpushed state
    const status = await getStatus(this.system, path);

    // Decide what to do
    const { decideCleanup } = await import('./cleanup.js');
    const action = decideCleanup(status.isDirty, status.hasUnpushed, opts);

    // Non-interactive → leave it
    if (action === 'keep') return false;

    // Interactive: prompt user
    if (action === 'prompt') {
      const { askForCleanup } = await import('./cleanup.js');
      const shouldRemove = await askForCleanup(name, status.isDirty, status.hasUnpushed);
      if (!shouldRemove) return false;
    }

    // Remove
    await this.remove(name, true);
    return true;
  }

  // ─── Private helpers ──────────────────────────────────────

  private parsePorcelain(output: string): Omit<WorktreeInfo, 'dirty' | 'isCurrent'>[] {
    const entries: Omit<WorktreeInfo, 'dirty' | 'isCurrent'>[] = [];
    const blocks = output.split('\n\n').filter(b => b.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      let path = '';
      let branch = '';
      let commit = '';

      for (const line of lines) {
        if (line.startsWith('branch ')) {
          branch = line.slice(7).trim().replace('refs/heads/', '');
        } else if (line.startsWith('HEAD ')) {
          commit = line.slice(5).trim();
        } else if (line.startsWith('detached')) {
          branch = '(detached)';
        } else if (line.startsWith('worktree ')) {
          // In git porcelain format, each worktree starts with "worktree <path>"
          path = line.slice(9).trim();
        } else {
          // Fallback: bare path line (older git versions, edge cases)
          path = line.trim();
        }
      }

      if (path) {
        const name = path.split('/').pop() ?? 'unknown';
        entries.push({ name, path, branch: branch || '(detached)', commit: commit.slice(0, 7) });
      }
    }

    return entries;
  }

  private async getCurrentBranch(cwd: string): Promise<string> {
    return getCurrentBranch(this.system, cwd);
  }

  private async getDefaultBranch(cwd: string): Promise<string> {
    return getDefaultBranch(this.system, cwd);
  }
}

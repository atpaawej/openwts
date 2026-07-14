/**
 * Git helper utilities — extracted from worktree.ts for reuse.
 *
 * Pure functions that take a System and cwd. No domain logic — just
 * porcelain interactions translated to structured data.
 */

import type { System } from './system.js';

export interface GitStatus {
  /** Whether the working tree has uncommitted changes */
  isDirty: boolean;
  /** Number of unpushed commits (0 if no upstream) */
  unpushedCount: number;
  /** Whether the worktree has unpushed commits */
  hasUnpushed: boolean;
}

/**
 * Get the current branch name for a working directory.
 */
export async function getCurrentBranch(system: System, cwd: string): Promise<string> {
  const result = await system.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  return result.stdout.trim();
}

/**
 * Detect the repository's default branch.
 * Tries: origin/HEAD → main → master → current branch.
 */
export async function getDefaultBranch(system: System, cwd: string): Promise<string> {
  // Try origin/HEAD first
  const originResult = await system.exec(
    'git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd }
  );
  if (originResult.exitCode === 0) {
    return originResult.stdout.trim().replace('refs/remotes/origin/', '');
  }

  // Try main, then master
  for (const candidate of ['main', 'master']) {
    const result = await system.exec('git', ['rev-parse', '--verify', candidate], { cwd });
    if (result.exitCode === 0) return candidate;
  }

  // Fallback to current branch
  return getCurrentBranch(system, cwd);
}

/**
 * Check dirty + unpushed state of a working directory in a single call.
 */
export async function getStatus(system: System, cwd: string): Promise<GitStatus> {
  const statusRes = await system.exec('git', ['status', '--porcelain'], { cwd });
  const isDirty = statusRes.stdout.trim().length > 0;

  const unpushedRes = await system.exec(
    'git', ['log', '@{u}..HEAD', '--oneline'], { cwd }
  );
  const unpushedOutput = unpushedRes.stdout.trim();
  const hasUnpushed = unpushedOutput.length > 0;
  const unpushedCount = hasUnpushed ? unpushedOutput.split('\n').length : 0;

  return { isDirty, hasUnpushed, unpushedCount };
}

/**
 * Get the repo root for any directory inside a git repo.
 */
export async function getRepoRoot(system: System): Promise<string> {
  const result = await system.exec('git', ['rev-parse', '--show-toplevel']);
  if (result.exitCode !== 0) {
    throw new Error('Not in a git repository');
  }
  return result.stdout.trim();
}

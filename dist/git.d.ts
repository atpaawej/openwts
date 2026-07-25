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
export declare function getCurrentBranch(system: System, cwd: string): Promise<string>;
/**
 * Detect the repository's default branch.
 * Tries: origin/HEAD → main → master → current branch.
 */
export declare function getDefaultBranch(system: System, cwd: string): Promise<string>;
/**
 * Check dirty + unpushed state of a working directory in a single call.
 */
export declare function getStatus(system: System, cwd: string): Promise<GitStatus>;
/**
 * Get the repo root for any directory inside a git repo.
 */
export declare function getRepoRoot(system: System): Promise<string>;
//# sourceMappingURL=git.d.ts.map
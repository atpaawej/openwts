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
export declare function createWorktree(system: System): Worktree;
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
    cleanup(name: string, opts?: {
        force?: boolean;
        noPrompt?: boolean;
    }): Promise<boolean>;
}
//# sourceMappingURL=worktree.d.ts.map
/**
 * Cleanup logic — prompt, decide, and remove worktrees after use.
 *
 * Separated from worktree.ts so tests don't need full Worktree setup.
 * The `askForCleanup` function uses readline for interactive prompting.
 */
/**
 * Interactive prompt: ask the user whether to keep or remove a dirty worktree.
 * Returns true if the user wants to remove it.
 */
export declare function askForCleanup(name: string, isDirty: boolean, hasUnpushed: boolean): Promise<boolean>;
/**
 * Determine what to do with a worktree after the work is done.
 *
 * Returns:
 *   'remove' — safe to auto-remove
 *   'keep'   — leave it (dirty and non-interactive)
 *   'prompt' — ask the user
 */
export type CleanupAction = 'remove' | 'keep' | 'prompt';
export declare function decideCleanup(isDirty: boolean, hasUnpushed: boolean, opts?: {
    force?: boolean;
    noPrompt?: boolean;
}): CleanupAction;
//# sourceMappingURL=cleanup.d.ts.map
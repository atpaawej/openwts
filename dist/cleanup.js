/**
 * Cleanup logic — prompt, decide, and remove worktrees after use.
 *
 * Separated from worktree.ts so tests don't need full Worktree setup.
 * The `askForCleanup` function uses readline for interactive prompting.
 */
import { createInterface } from 'node:readline';
/**
 * Interactive prompt: ask the user whether to keep or remove a dirty worktree.
 * Returns true if the user wants to remove it.
 */
export function askForCleanup(name, isDirty, hasUnpushed) {
    const reasons = [];
    if (isDirty)
        reasons.push('uncommitted changes');
    if (hasUnpushed)
        reasons.push('unpushed commits');
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        console.log(`\n⚠ Worktree "${name}" has ${reasons.join(' and ')}.`);
        rl.question('Keep or remove? [K/r] ', (answer) => {
            rl.close();
            const trimmed = answer.trim().toLowerCase();
            // Default is "keep" — empty or anything starting with 'k'
            resolve(trimmed.startsWith('r'));
        });
    });
}
export function decideCleanup(isDirty, hasUnpushed, opts) {
    // Clean → remove
    if (!isDirty && !hasUnpushed)
        return 'remove';
    // Force → remove regardless
    if (opts?.force)
        return 'remove';
    // Non-interactive → leave it
    if (opts?.noPrompt)
        return 'keep';
    // Interactive: prompt
    return 'prompt';
}
//# sourceMappingURL=cleanup.js.map
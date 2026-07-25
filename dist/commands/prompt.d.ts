/**
 * Interactive prompt for worktree name via stdin/stdout.
 *
 * Used when an agent-as-verb command is given without a worktree name,
 * e.g. `openwts claude` (no name given).
 *
 * Cross-platform readline prompt. Returns null if the user enters
 * an empty response.
 */
export declare function promptForName(): Promise<string | null>;
//# sourceMappingURL=prompt.d.ts.map
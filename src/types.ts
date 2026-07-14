/** Shared domain types for openwts */

export interface WorktreeInfo {
  /** Derived from the worktree path basename */
  name: string;
  /** Absolute filesystem path */
  path: string;
  /** Git branch checked out (without refs/heads/) */
  branch: string;
  /** Whether uncommitted changes exist */
  dirty: boolean;
  /** Whether this is the repo's main worktree */
  isCurrent: boolean;
  /** Short commit hash at HEAD */
  commit: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ShellConfig {
  type: 'bash' | 'zsh' | 'fish';
  configPath: string;
}

/**
 * Known, actionable error.
 * Commands throw OpenwtError for failures the user can understand and fix.
 * Unexpected errors (bugs) are not wrapped — they bubble up as uncaught.
 */
export class OpenwtError extends Error {
  override readonly name = 'OpenwtError';
  constructor(
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message);
  }
}

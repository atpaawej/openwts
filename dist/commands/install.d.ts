/**
 * install — cross-platform shell integration for openwts.
 *
 * Installs a shell wrapper function that intercepts the `switch` command
 * and does a directory change (cd / Set-Location) instead of just
 * printing the path.
 *
 * Supports: bash, zsh, fish, PowerShell (Windows)
 */
import type { Command } from './command.js';
export declare const installCommand: Command;
//# sourceMappingURL=install.d.ts.map
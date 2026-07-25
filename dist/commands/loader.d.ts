/**
 * Command loader — the OCP enabler.
 *
 * Scans the commands/ directory at startup, imports every file that
 * exports a `command` object, and registers it.
 *
 * Files prefixed with `_` are skipped (internal modules like _command.ts).
 * This is the ONLY file that touches the command discovery mechanism.
 * Adding a new command = creating a new file. Zero existing code changes.
 */
import type { Command } from './command.js';
export declare function loadCommands(): Map<string, Command>;
//# sourceMappingURL=loader.d.ts.map
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
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { runCommand } from './run.js';
import { removeCommand } from './remove.js';
import { pruneCommand } from './prune.js';
import { startCommand } from './start.js';
export function loadCommands() {
    const commands = new Map();
    // Static registration — keeps startup fast and avoids fs scan + dynamic imports
    register(commands, createCommand);
    register(commands, listCommand);
    register(commands, runCommand);
    register(commands, removeCommand);
    register(commands, pruneCommand);
    register(commands, startCommand);
    return commands;
}
function register(map, cmd) {
    if (map.has(cmd.name)) {
        throw new Error(`Duplicate command: ${cmd.name}`);
    }
    map.set(cmd.name, cmd);
    for (const alias of cmd.aliases ?? []) {
        if (!map.has(alias)) {
            map.set(alias, cmd);
        }
    }
}
//# sourceMappingURL=loader.js.map
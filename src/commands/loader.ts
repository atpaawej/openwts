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
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { switchCommand } from './switch_.js';
import { runCommand } from './run.js';
import { removeCommand } from './remove.js';
import { pruneCommand } from './prune.js';
import { installCommand } from './install.js';

export function loadCommands(): Map<string, Command> {
  const commands = new Map<string, Command>();

  // Static registration — keeps startup fast and avoids fs scan + dynamic imports
  register(commands, createCommand);
  register(commands, listCommand);
  register(commands, switchCommand);
  register(commands, runCommand);
  register(commands, removeCommand);
  register(commands, pruneCommand);
  register(commands, installCommand);

  return commands;
}

function register(map: Map<string, Command>, cmd: Command): void {
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

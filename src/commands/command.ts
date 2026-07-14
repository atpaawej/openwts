/**
 * Command interface and shared types.
 *
 * Every command exports a `command: Command` constant.
 * The loader discovers them by scanning the commands/ directory.
 */

import type { Output } from '../output.js';
import type { System } from '../system.js';
import type { Worktree } from '../worktree.js';

export interface ArgSpec {
  name: string;
  required: boolean;
  description: string;
}

export interface CommandContext {
  worktree: Worktree;
  system: System;
  output: Output;
  commands: Map<string, Command>;
}

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly arguments: ArgSpec[];
  readonly aliases?: string[];
  run(args: Record<string, string>, ctx: CommandContext): Promise<void>;
}

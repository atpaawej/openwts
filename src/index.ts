#!/usr/bin/env node

/**
 * openwts — Isolated worktrees for opencode.
 *
 * Entry point. Parses argv, wires adapters, dispatches to commands.
 */

import { createNodeSystem } from './system.js';
import { createNodeOutput, createCaptureOutput } from './output.js';
import { createWorktree } from './worktree.js';
import { loadCommands } from './commands/loader.js';
import { OpenwtError } from './types.js';
import type { CommandContext } from './commands/command.js';

export async function main(argv: string[]): Promise<number> {
  const system = createNodeSystem();
  const output = createNodeOutput();
  const worktree = createWorktree(system);
  const commands = loadCommands();

  // No args or help
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printHelp(output, commands);
    return 0;
  }

  // Version
  if (argv[0] === '--version' || argv[0] === '-v') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json');
    output.info(pkg.version);
    return 0;
  }

  const commandName = argv[0]!;
  const command = commands.get(commandName);

  if (!command) {
    output.error(`Unknown command: "${commandName}"`);
    output.info(`Run "openwts --help" for available commands`);
    return 1;
  }

  // Parse positional args
  const rest = argv.slice(1);
  const parsed = parseArgs(rest, command.arguments);

  if (!parsed.ok) {
    output.error(parsed.error);
    return 1;
  }

  const ctx: CommandContext = {
    worktree,
    system,
    output,
    commands,
  };

  try {
    await command.run(parsed.args, ctx);
    return 0;
  } catch (e) {
    if (e instanceof OpenwtError) {
      output.error(e.message);
      if (e.suggestion) {
        output.info(`  Suggestion: ${e.suggestion}`);
      }
      return 1;
    }
    output.error(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) {
      output.info(`\n${e.stack}`);
    }
    return 1;
  }
}

function printHelp(
  output: ReturnType<typeof createNodeOutput>,
  commands: Map<string, import('./commands/command.js').Command>,
): void {
  output.info('🌿 openwts — Isolated worktrees for opencode\n');
  output.info('Usage: openwts <command> [arguments...]\n');
  output.info('Commands:\n');

  const uniqueCommands = new Map<string, import('./commands/command.js').Command>();
  for (const [, cmd] of commands) {
    if (!uniqueCommands.has(cmd.name)) {
      uniqueCommands.set(cmd.name, cmd);
    }
  }

  for (const [, cmd] of uniqueCommands) {
    const aliases = cmd.aliases && cmd.aliases.length > 0
      ? ` (${cmd.aliases.join(', ')})`
      : '';
    const args = cmd.arguments.map(a =>
      a.required ? `<${a.name}>` : `[${a.name}]`
    ).join(' ');
    const argStr = args ? ` ${args}` : '';
    output.info(`  openwts ${cmd.name}${argStr}`);
    output.info(`        ${cmd.description}${aliases}\n`);
  }

  output.info('Flags:');
  output.info('  --help, -h     Show this help');
  output.info('  --version, -v  Show version');
}

type ParseResult =
  | { ok: true; args: Record<string, string> }
  | { ok: false; error: string };

function parseArgs(
  argv: string[],
  argDefs: import('./commands/command.js').ArgSpec[],
): ParseResult {
  const args: Record<string, string> = {};

  // Check for --flags
  const posArgs: string[] = [];
  let extraArgs: string[] = [];

  let foundSep = false;
  for (const a of argv) {
    if (a === '--') {
      foundSep = true;
      continue;
    }
    if (foundSep) {
      extraArgs.push(a);
    } else if (a.startsWith('--')) {
      const eqIdx = a.indexOf('=');
      if (eqIdx !== -1) {
        args[a.slice(2, eqIdx)] = a.slice(eqIdx + 1);
      } else {
        args[a.slice(2)] = 'true';
      }
    } else if (a.startsWith('-') && !a.startsWith('--')) {
      args[a.slice(1)] = 'true';
    } else {
      posArgs.push(a);
    }
  }

  // Map positional args to definitions
  for (let i = 0; i < argDefs.length; i++) {
    if (i < posArgs.length) {
      args[argDefs[i]!.name] = posArgs[i]!;
    } else if (argDefs[i]!.required) {
      return { ok: false, error: `Missing required argument: <${argDefs[i]!.name}>` };
    }
  }

  if (extraArgs.length > 0) {
    args._extra = extraArgs as unknown as string;
  }

  return { ok: true, args };
}

// Allow running directly
const isMain = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('openwts');
if (isMain) {
  main(process.argv.slice(2)).then(code => process.exit(code));
}

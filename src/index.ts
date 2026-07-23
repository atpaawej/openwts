#!/usr/bin/env node

/**
 * openwts — Isolated worktrees for AI coding agents.
 *
 * Entry point. Parses argv, wires adapters, dispatches to commands.
 *
 * Three-tier routing:
 * 1. Known command (list, create, remove, run, prune, start) → dispatch directly
 * 2. Known agent name (claude, opencode) → strip from argv, resolve agent,
 *    set context, route remaining args to `start`
 * 3. Fallthrough (unrecognized) → route to `start` with picker/default resolution
 */

import { createNodeSystem } from './system.js';
import { createNodeOutput, createCaptureOutput } from './output.js';
import { createWorktree } from './worktree.js';
import { loadCommands } from './commands/loader.js';
import { createRegistry } from './agents/registry.js';
import { OpenwtError } from './types.js';
import type { CommandContext } from './commands/command.js';

export async function main(argv: string[]): Promise<number> {
  const system = createNodeSystem();
  const output = createNodeOutput();
  const worktree = createWorktree(system);
  const commands = loadCommands();
  const agents = createRegistry(system);

  // No args or help
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printHelp(output, commands, agents);
    return 0;
  }

  // Version
  if (argv[0] === '--version' || argv[0] === '-v') {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };
    output.info(pkg.version);
    return 0;
  }

  const commandName = argv[0]!;
  const command = commands.get(commandName);

  // ─── Tier 1: Known command ─────────────────────────────────
  if (command) {
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
      agents,
    };

    return await runCommand(command.run, parsed.args, ctx, output);
  }

  // ─── Tier 2: Known agent name (agent-as-verb) ──────────────
  try {
    const agent = agents.get(commandName);

    // It's a known agent — route to `start` with pre-resolved agent
    const startCommand = commands.get('start');
    if (!startCommand) {
      output.error('Internal error: start command not found');
      return 1;
    }

    // The rest of argv after the agent name: [name, ...flags]
    // If no name given, we need to prompt for it
    const rest = argv.slice(1);

    // If the next arg is a flag or empty, the worktree name was omitted —
    // we need to insert a placeholder so parseArgs validates correctly,
    // then prompt interactively for the name.
    const needsNamePrompt = rest.length === 0 || rest[0]?.startsWith('-');

    const startArgs = parseArgs(needsNamePrompt ? ['__PROMPT_NAME__', ...rest] : rest, startCommand.arguments);
    if (!startArgs.ok) {
      output.error(startArgs.error);
      return 1;
    }

    const ctx: CommandContext = {
      worktree,
      system,
      output,
      commands,
      agents,
      agent,
    };

    // If name was omitted, prompt for it
    if (needsNamePrompt) {
      const { promptForName } = await import('./commands/prompt.js');
      const name = await promptForName();
      if (!name) {
        output.info('Cancelled');
        return 0;
      }
      startArgs.args.name = name;
    }

    return await runCommand(startCommand.run, startArgs.args, ctx, output);
  } catch {
    // Not a known agent name either — fall through to Tier 3
  }

  // ─── Tier 3: Fallthrough (route to `start` with picker) ────
  if (commandName.startsWith('-')) {
    output.error(`Unknown flag: "${commandName}"`);
    output.info(`Run "openwts --help" for available commands`);
    return 1;
  }

  const startCommand = commands.get('start');
  if (!startCommand) {
    output.error('Internal error: start command not found');
    return 1;
  }

  const startArgs = parseArgs(argv, startCommand.arguments);
  if (!startArgs.ok) {
    output.error(startArgs.error);
    return 1;
  }

  const ctx: CommandContext = {
    worktree,
    system,
    output,
    commands,
    agents,
  };

  return await runCommand(startCommand.run, startArgs.args, ctx, output);
}

/**
 * Run a command, handling OpenwtError and unexpected errors uniformly.
 */
async function runCommand(
  run: (args: Record<string, string>, ctx: CommandContext) => Promise<void>,
  args: Record<string, string>,
  ctx: CommandContext,
  output: ReturnType<typeof createNodeOutput>,
): Promise<number> {
  try {
    await run(args, ctx);
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
  agents: import('./agents/registry.js').AgentRegistry,
): void {
  output.info('🌿 openwts — Isolated worktrees for AI coding agents\n');
  output.info('Usage: openwts <command|agent> [arguments...]\n');
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

  output.info('Agents (use as commands, e.g. `openwts claude fix-bug`):\n');
  for (const agent of agents.list()) {
    output.info(`  ${agent.name.padEnd(12)} ${agent.description}`);
  }
  output.info('');

  output.info('Flags:');
  output.info('  --help, -h     Show this help');
  output.info('  --version, -v  Show version');
  output.info('  --agent, -a    Specify agent (e.g. openwts fix-bug --agent claude)');
  output.info('');
  output.info('Environment:');
  output.info('  OPENWTS_DEFAULT_AGENT   Set default agent (e.g. "claude")');
}

type ParseResult =
  | { ok: true; args: Record<string, string> }
  | { ok: false; error: string };

/** Flags that take a value (not just boolean presence) */
const VALUE_FLAGS = new Set(['agent', 'a', 'base']);

function parseArgs(
  argv: string[],
  argDefs: import('./commands/command.js').ArgSpec[],
): ParseResult {
  const args: Record<string, string> = {};

  // Pre-process: convert `--flag value` → `--flag=value` for known value flags
  const normalized: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--') && !a.includes('=')) {
      const flagName = a.slice(2);
      if (VALUE_FLAGS.has(flagName) && i + 1 < argv.length && !argv[i + 1]!.startsWith('-')) {
        normalized.push(`${a}=${argv[i + 1]!}`);
        i++; // skip next arg — it's the value
        continue;
      }
    } else if (a.startsWith('-') && !a.startsWith('--') && a.length === 2) {
      const flagName = a.slice(1);
      if (VALUE_FLAGS.has(flagName) && i + 1 < argv.length && !argv[i + 1]!.startsWith('-')) {
        normalized.push(`${a}=${argv[i + 1]!}`);
        i++;
        continue;
      }
    }
    normalized.push(a);
  }

  // Check for --flags
  const posArgs: string[] = [];

  for (const a of normalized) {
    if (a.startsWith('--')) {
      const eqIdx = a.indexOf('=');
      if (eqIdx !== -1) {
        args[a.slice(2, eqIdx)] = a.slice(eqIdx + 1);
      } else {
        args[a.slice(2)] = 'true';
      }
    } else if (a.startsWith('-') && !a.startsWith('--')) {
      // Short flag: -a=value or -a
      const eqIdx = a.indexOf('=');
      if (eqIdx !== -1) {
        args[a.slice(1, eqIdx)] = a.slice(eqIdx + 1);
      } else {
        args[a.slice(1)] = 'true';
      }
    } else {
      posArgs.push(a);
    }
  }

  // Map positional args to definitions
  for (let i = 0; i < argDefs.length; i++) {
    if (i < posArgs.length) {
      if (posArgs[i] !== '__PROMPT_NAME__') {
        args[argDefs[i]!.name] = posArgs[i]!;
      }
    } else if (argDefs[i]!.required) {
      return { ok: false, error: `Missing required argument: <${argDefs[i]!.name}>` };
    }
  }

  return { ok: true, args };
}

// Allow running directly
const isMain = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('openwts');
if (isMain) {
  main(process.argv.slice(2)).then(code => process.exit(code));
}

/**
 * Command interface and shared types.
 *
 * Every command exports a `command: Command` constant.
 * The loader discovers them by scanning the commands/ directory.
 */

import type { Output } from '../output.js';
import type { System } from '../system.js';
import type { Worktree } from '../worktree.js';
import type { Agent } from '../agents/agent.js';
import type { AgentRegistry } from '../agents/registry.js';
import { OpenwtError } from '../types.js';

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
  /** Agent registry for resolving which AI coding CLI to use */
  agents: AgentRegistry;
  /** Pre-resolved agent (set by three-tier router for agent-as-verb calls) */
  agent?: Agent;
}

/**
 * Cancelled by user — the caller should exit gracefully (code 0).
 * Used when the interactive picker is cancelled or a prompt is aborted.
 */
export class CancelledError extends Error {
  override readonly name = 'CancelledError';
}

/**
 * Resolve which agent to use, following the resolution chain:
 *
 * 1. Pre-resolved ctx.agent (from agent-as-verb routing)
 * 2. --agent / -a flag in parsed args
 * 3. OPENWTS_DEFAULT_AGENT environment variable
 * 4. Interactive picker (filtered to installed agents)
 *    - If picker is cancelled → CancelledError
 * 5. Error if nothing resolves
 */
export async function resolveAgent(
  ctx: { agents: AgentRegistry; agent?: Agent },
  args: Record<string, string>,
): Promise<Agent> {
  // 1. Pre-resolved (set by three-tier router on agent-as-verb calls)
  if (ctx.agent) return ctx.agent;

  // 2. --agent / -a flag
  const agentFlag = args.agent || args.a;
  if (agentFlag) {
    try {
      return ctx.agents.get(agentFlag);
    } catch {
      throw new OpenwtError(
        `Unknown agent: "${agentFlag}"`,
        `Use one of: ${ctx.agents.list().map(a => a.name).join(', ')}`,
      );
    }
  }

  // 3. OPENWTS_DEFAULT_AGENT env var
  const envAgent = process.env.OPENWTS_DEFAULT_AGENT;
  if (envAgent) {
    try {
      return ctx.agents.get(envAgent);
    } catch {
      throw new OpenwtError(
        `OPENWTS_DEFAULT_AGENT="${envAgent}" is not a known agent`,
        `Set it to one of: ${ctx.agents.list().map(a => a.name).join(', ')}`,
      );
    }
  }

  // 4. Interactive picker (only installed agents)
  const installed = await ctx.agents.getInstalled();

  if (installed.length === 0) {
    throw new OpenwtError(
      'No AI coding agents found on PATH',
      'Install an agent like "claude" or "opencode", or set OPENWTS_DEFAULT_AGENT',
    );
  }

  // Lazily import picker (it's only needed for interactive use)
  const { pickAgent } = await import('../agents/picker.js');
  const picked = await pickAgent(installed);

  if (!picked) {
    throw new CancelledError('Agent selection cancelled');
  }

  return picked;
}

/** Extract spawn-ready binary name and args from an Agent. */
export function agentSpawnArgs(agent: Agent): [bin: string, args: readonly string[]] {
  return [agent.bin, agent.args ?? []];
}

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly arguments: ArgSpec[];
  readonly aliases?: string[];
  run(args: Record<string, string>, ctx: CommandContext): Promise<void>;
}

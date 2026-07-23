/**
 * Agent registry — manages agent definitions with lazy, memoized PATH detection.
 *
 * This module follows OCP: adding a new agent means registering it.
 * Zero existing code changes.
 *
 * PATH detection uses System.exec() — which on POSIX, where on Windows —
 * crossed at the System seam so tests use FakeSystem to control which
 * agents appear "installed."
 */

import type { System } from '../system.js';
import type { Agent } from './agent.js';
import { opencodeAgent } from './opencode.js';
import { claudeAgent } from './claude.js';

/**
 * Determine the command to check if a binary is on PATH.
 * Cross-platform: `which` on POSIX, `where` on Windows.
 */
function whichCmd(): string {
  return process.platform === 'win32' ? 'where' : 'which';
}

export function createRegistry(system: System): AgentRegistry {
  return new Registry(system);
}

export class AgentNotFoundError extends Error {
  override readonly name = 'AgentNotFoundError';
  constructor(
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message);
  }
}

export interface AgentRegistry {
  /** Register one or more agent definitions. Idempotent (later wins). */
  register(...agents: Agent[]): void;

  /** Look up an agent by name. Throws AgentNotFoundError with suggestion. */
  get(name: string): Agent;

  /** List all registered agent definitions (regardless of installed status). */
  list(): Agent[];

  /** List only agents whose binaries are found on PATH. Lazy + memoized. */
  getInstalled(): Promise<Agent[]>;

  /** Check if a specific agent's binary is on PATH. */
  isInstalled(agent: Agent): Promise<boolean>;
}

class Registry implements AgentRegistry {
  private readonly agents = new Map<string, Agent>();
  private readonly system: System;
  private installedCache: Agent[] | null = null;

  constructor(system: System) {
    this.system = system;
    // Register built-in agents
    this.register(opencodeAgent, claudeAgent);
  }

  register(...newAgents: Agent[]): void {
    for (const agent of newAgents) {
      this.agents.set(agent.name, agent);
    }
    // Invalidate memoized cache when new agents are registered
    this.installedCache = null;
  }

  get(name: string): Agent {
    const agent = this.agents.get(name);
    if (!agent) {
      const knownNames = Array.from(this.agents.keys()).join(', ');
      throw new AgentNotFoundError(
        `Unknown agent: "${name}"`,
        `Known agents: ${knownNames}`,
      );
    }
    return agent;
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  async getInstalled(): Promise<Agent[]> {
    if (this.installedCache !== null) {
      return this.installedCache;
    }

    const results = await Promise.all(
      Array.from(this.agents.values()).map(async (agent) => {
        const installed = await this.isInstalled(agent);
        return installed ? agent : null;
      }),
    );

    this.installedCache = results.filter((a): a is Agent => a !== null);
    return this.installedCache;
  }

  async isInstalled(agent: Agent): Promise<boolean> {
    const result = await this.system.exec(whichCmd(), [agent.bin]);
    // which/where exits 0 when found, non-zero when not found
    return result.exitCode === 0;
  }
}

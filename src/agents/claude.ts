/**
 * Built-in agent definition for Claude Code by Anthropic.
 *
 * Registered automatically by the AgentRegistry constructor.
 * Binary must be on PATH to be detected as "installed."
 */

import type { Agent } from './agent.js';

export const claudeAgent: Agent = {
  name: 'claude',
  description: 'Claude Code CLI by Anthropic',
  bin: 'claude',
};

/**
 * Built-in agent definition for opencode — the original AI coding CLI.
 *
 * Registered automatically by the AgentRegistry constructor.
 * Binary must be on PATH to be detected as "installed."
 */

import type { Agent } from './agent.js';

export const opencodeAgent: Agent = {
  name: 'opencode',
  description: 'OpenCode AI coding CLI',
  bin: 'opencode',
};

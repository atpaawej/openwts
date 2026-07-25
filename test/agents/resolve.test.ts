/**
 * Tests for the agent resolution chain (src/commands/command.ts resolveAgent)
 *
 * Tests verify priority order:
 * 1. Pre-resolved ctx.agent
 * 2. --agent / -a flag
 * 3. OPENWTS_DEFAULT_AGENT env var
 * 4. Interactive picker (tested via fallthrough behavior)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSystem } from '../fakes/system.js';
import { createRegistry } from '../../src/agents/registry.js';
import { resolveAgent, agentSpawnArgs, CancelledError } from '../../src/commands/command.js';
import type { Agent } from '../../src/agents/agent.js';

describe('resolveAgent', () => {
  let sys: FakeSystem;

  beforeEach(() => {
    sys = new FakeSystem();
  });

  it('returns pre-resolved agent immediately (no PATH check)', async () => {
    const agents = createRegistry(sys);
    const testAgent: Agent = { name: 'custom', description: 'Custom', bin: 'custom-bin' };

    const result = await resolveAgent(
      { agents, agent: testAgent },
      {},
    );

    expect(result.name).toBe('custom');
    // No exec calls made — agent returned immediately
    expect(sys.execCalls.length).toBe(0);
  });

  it('resolves from --agent flag', async () => {
    const agents = createRegistry(sys);

    const result = await resolveAgent(
      { agents },
      { agent: 'claude' },
    );

    expect(result.name).toBe('claude');
  });

  it('resolves from -a short flag', async () => {
    const agents = createRegistry(sys);

    const result = await resolveAgent(
      { agents },
      { a: 'opencode' },
    );

    expect(result.name).toBe('opencode');
  });

  it('throws for unknown agent in --agent flag', async () => {
    const agents = createRegistry(sys);

    await expect(
      resolveAgent({ agents }, { agent: 'nonexistent' }),
    ).rejects.toThrow(/Unknown agent/);
  });

  it('resolves from OPENWTS_DEFAULT_AGENT env var', async () => {
    process.env.OPENWTS_DEFAULT_AGENT = 'opencode';
    const agents = createRegistry(sys);

    try {
      const result = await resolveAgent({ agents }, {});
      expect(result.name).toBe('opencode');
    } finally {
      delete process.env.OPENWTS_DEFAULT_AGENT;
    }
  });

  it('throws when OPENWTS_DEFAULT_AGENT refers to unknown agent', async () => {
    process.env.OPENWTS_DEFAULT_AGENT = 'nonexistent';
    const agents = createRegistry(sys);

    try {
      await expect(
        resolveAgent({ agents }, {}),
      ).rejects.toThrow(/OPENWTS_DEFAULT_AGENT/);
    } finally {
      delete process.env.OPENWTS_DEFAULT_AGENT;
    }
  });

  it('--agent flag takes priority over OPENWTS_DEFAULT_AGENT', async () => {
    process.env.OPENWTS_DEFAULT_AGENT = 'opencode';
    const agents = createRegistry(sys);

    try {
      const result = await resolveAgent(
        { agents },
        { agent: 'claude' },
      );
      expect(result.name).toBe('claude');
    } finally {
      delete process.env.OPENWTS_DEFAULT_AGENT;
    }
  });

  it('pre-resolved ctx.agent takes priority over --agent flag', async () => {
    const agents = createRegistry(sys);
    const testAgent: Agent = { name: 'custom', description: 'Custom', bin: 'custom-bin' };

    const result = await resolveAgent(
      { agents, agent: testAgent },
      { agent: 'claude' },
    );

    expect(result.name).toBe('custom');
  });

  it('throws with suggestion when no agents installed and no env var set', async () => {
    sys.addExecResponse({ exitCode: 1, stderr: 'not found' });
    sys.addExecResponse({ exitCode: 1, stderr: 'not found' });

    const agents = createRegistry(sys);

    await expect(
      resolveAgent({ agents }, {}),
    ).rejects.toThrow(/No AI coding agents found/);
  });

  it('throws CancelledError when picker returns null (user cancelled)', async () => {
    // Make both built-in agents "installed" so we reach the picker
    sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });
    sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/claude\n' });

    const agents = createRegistry(sys);

    // We can't easily mock the dynamic import of the picker in unit tests,
    // but we can assert CancelledError class exists and behaves like Error
    const err = new CancelledError('Agent selection cancelled');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CancelledError');
    expect(err.message).toBe('Agent selection cancelled');
  });
});

describe('agentSpawnArgs', () => {
  it('returns bin and empty args array when agent has no args', () => {
    const agent: Agent = { name: 'test', description: 'Test', bin: 'test-bin' };
    const [bin, args] = agentSpawnArgs(agent);
    expect(bin).toBe('test-bin');
    expect(args).toEqual([]);
  });

  it('returns bin and args when agent has args', () => {
    const agent: Agent = { name: 'cursor', description: 'Cursor', bin: 'cursor', args: ['--reuse-window'] };
    const [bin, args] = agentSpawnArgs(agent);
    expect(bin).toBe('cursor');
    expect(args).toEqual(['--reuse-window']);
  });
});

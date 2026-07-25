/**
 * Tests for the agent registry (src/agents/registry.ts)
 *
 * Tests cross the same seam as production callers: System.exec().
 * FakeSystem controls which agents appear "installed" via exec responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSystem } from '../fakes/system.js';
import { createRegistry, AgentNotFoundError } from '../../src/agents/registry.js';
import type { Agent } from '../../src/agents/agent.js';

/** Helper: which/where command used on this platform */
function whichBin(): string {
  return process.platform === 'win32' ? 'where' : 'which';
}

const testAgent: Agent = {
  name: 'test-agent',
  description: 'A test CLI agent',
  bin: 'test-agent-bin',
};

const anotherAgent: Agent = {
  name: 'another',
  description: 'Another test CLI agent',
  bin: 'another-bin',
};

describe('AgentRegistry', () => {
  let sys: FakeSystem;

  beforeEach(() => {
    sys = new FakeSystem();
  });

  describe('get()', () => {
    it('returns a built-in agent by name', () => {
      const registry = createRegistry(sys);
      const agent = registry.get('opencode');
      expect(agent.name).toBe('opencode');
      expect(agent.bin).toBe('opencode');
    });

    it('returns a built-in claude agent by name', () => {
      const registry = createRegistry(sys);
      const agent = registry.get('claude');
      expect(agent.name).toBe('claude');
      expect(agent.bin).toBe('claude');
    });

    it('throws AgentNotFoundError for unknown agent', () => {
      const registry = createRegistry(sys);
      expect(() => registry.get('nonexistent')).toThrow(AgentNotFoundError);
    });

    it('includes known agent names in error suggestion', () => {
      const registry = createRegistry(sys);
      try {
        registry.get('nonexistent');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AgentNotFoundError);
        const err = e as AgentNotFoundError;
        expect(err.message).toContain('nonexistent');
        expect(err.suggestion).toContain('opencode');
        expect(err.suggestion).toContain('claude');
      }
    });
  });

  describe('register()', () => {
    it('registers a new agent that can be looked up', () => {
      const registry = createRegistry(sys);
      registry.register(testAgent);
      const agent = registry.get('test-agent');
      expect(agent.name).toBe('test-agent');
    });

    it('overwrites an existing agent with same name', () => {
      const registry = createRegistry(sys);
      registry.register({
        name: 'opencode',
        description: 'Overridden',
        bin: '/custom/path/opencode',
      });
      const agent = registry.get('opencode');
      expect(agent.description).toBe('Overridden');
      expect(agent.bin).toBe('/custom/path/opencode');
    });
  });

  describe('list()', () => {
    it('returns all registered agents including built-ins', () => {
      const registry = createRegistry(sys);
      registry.register(testAgent);
      const agents = registry.list();
      expect(agents.length).toBeGreaterThanOrEqual(3);
      expect(agents.map(a => a.name)).toContain('opencode');
      expect(agents.map(a => a.name)).toContain('claude');
      expect(agents.map(a => a.name)).toContain('test-agent');
    });
  });

  describe('isInstalled()', () => {
    it('returns true when which/where exits 0', async () => {
      sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });
      const registry = createRegistry(sys);
      const installed = await registry.isInstalled(testAgent);
      expect(installed).toBe(true);
    });

    it('returns false when which/where exits non-zero', async () => {
      sys.addExecResponse({ exitCode: 1, stderr: 'not found' });
      const registry = createRegistry(sys);
      const installed = await registry.isInstalled(testAgent);
      expect(installed).toBe(false);
    });
  });

  describe('getInstalled()', () => {
    it('returns only agents on PATH', async () => {
      // opencode found, claude not found
      sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });
      sys.addExecResponse({ exitCode: 1, stderr: 'not found' });

      const registry = createRegistry(sys);
      const installed = await registry.getInstalled();

      expect(installed.map(a => a.name)).toEqual(['opencode']);
    });

    it('results are memoized (cached after first call)', async () => {
      // Only supply responses for the first call
      sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });
      sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/claude\n' });

      const registry = createRegistry(sys);
      const first = await registry.getInstalled();

      // Second call should use cache — no additional exec calls
      const second = await registry.getInstalled();

      expect(first.length).toBe(2);
      expect(second).toEqual(first);
    });

    it('returns empty array when no agents are on PATH', async () => {
      sys.addExecResponse({ exitCode: 1, stderr: 'not found' });
      sys.addExecResponse({ exitCode: 1, stderr: 'not found' });

      const registry = createRegistry(sys);
      const installed = await registry.getInstalled();
      expect(installed).toEqual([]);
    });

    it('uses cross-platform which/where command', async () => {
      sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });

      const registry = createRegistry(sys);
      await registry.getInstalled();

      const call = sys.getExecCall(0);
      expect(call).toBeDefined();
      expect(call!.cmd).toBe(whichBin());
    });
  });
});

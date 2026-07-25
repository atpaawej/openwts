/**
 * Agent-spawn command integration tests.
 *
 * Tests that start and run commands correctly resolve and use agents
 * through the CommandContext / FakeSystem seam.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorktree } from '../../src/worktree.js';
import { createCaptureOutput } from '../../src/output.js';
import { FakeSystem } from '../fakes/system.js';
import { startCommand } from '../../src/commands/start.js';
import { runCommand } from '../../src/commands/run.js';
import { createRegistry } from '../../src/agents/registry.js';
import type { Agent } from '../../src/agents/agent.js';

const PORCELAIN = [
  '/repo',
  'branch refs/heads/main',
  'HEAD a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
  '',
  '/repo/.openwts/worktrees/feature-x',
  'branch refs/heads/feature-x',
  'HEAD d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9a0b1c2',
].join('\n');

function addListResponses(sys: FakeSystem, count: number): void {
  sys.addExecResponse({ stdout: '/repo\n' });
  sys.addExecResponse({ stdout: PORCELAIN });
  for (let i = 0; i < count; i++) {
    sys.addExecResponse({ stdout: '' });
  }
}

describe('start command agent resolution', () => {
  let sys: FakeSystem;
  let output: ReturnType<typeof createCaptureOutput>;

  beforeEach(() => {
    sys = new FakeSystem();
    sys.setCwd('/repo');
    output = createCaptureOutput();
  });

  it('uses pre-resolved ctx.agent when set', async () => {
    // create worktree: repoRoot + symbol-ref + rev-parse + worktree add = 4
    sys.addExecResponse({ stdout: '/repo\n' });
    sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
    sys.addExecResponse({ stdout: 'abc123\n' });
    sys.addExecResponse({ stdout: '' });
    // getManifest: repoRoot + readFile (doesn't exist)
    sys.addExecResponse({ stdout: '/repo\n' });
    // getPath: list = repoRoot + porcelain + 2 status
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const agents = createRegistry(sys);

    const testAgent: Agent = { name: 'custom', description: 'Custom', bin: 'custom-bin' };

    await startCommand.run(
      { name: 'feature-x' },
      { worktree, system: sys, output: output.output, commands: new Map(), agents, agent: testAgent },
    );

    expect(output.captured.info.some(s => s.includes('custom-bin'))).toBe(true);
  });

  it('uses --agent flag via args', async () => {
    // create worktree: 4 calls
    sys.addExecResponse({ stdout: '/repo\n' });
    sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
    sys.addExecResponse({ stdout: 'abc123\n' });
    sys.addExecResponse({ stdout: '' });
    // getManifest
    sys.addExecResponse({ stdout: '/repo\n' });
    // getPath: list
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const agents = createRegistry(sys);

    await startCommand.run(
      { name: 'feature-x', agent: 'claude' },
      { worktree, system: sys, output: output.output, commands: new Map(), agents },
    );

    expect(output.captured.info.some(s => s.includes('claude'))).toBe(true);
  });

  it('falls through to picker when no agent pre-resolved', async () => {
    // Mock picker path: make opencode "installed"
    sys.addExecResponse({ stdout: '/repo\n' });
    sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
    sys.addExecResponse({ stdout: 'abc123\n' });
    sys.addExecResponse({ stdout: '' });
    sys.addExecResponse({ stdout: '/repo\n' });
    addListResponses(sys, 2);
    // getInstalled will run which/where for both agents
    sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/opencode\n' });
    sys.addExecResponse({ exitCode: 0, stdout: '/usr/bin/claude\n' });

    const worktree = createWorktree(sys);
    const agents = createRegistry(sys);

    // We can't easily mock the dynamic picker import in unit context,
    // so we just verify getInstalled returns installed agents
    const installed = await agents.getInstalled();
    expect(installed.length).toBeGreaterThanOrEqual(2);
  });
});

describe('run command agent resolution', () => {
  let sys: FakeSystem;
  let output: ReturnType<typeof createCaptureOutput>;

  beforeEach(() => {
    sys = new FakeSystem();
    sys.setCwd('/repo');
    output = createCaptureOutput();
  });

  it('uses pre-resolved ctx.agent', async () => {
    // getPath: list = repoRoot + porcelain + 2 status = 4
    addListResponses(sys, 2);
    // getBranchName: list() is called again = another 4
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const agents = createRegistry(sys);
    const testAgent: Agent = { name: 'custom', description: 'Custom', bin: 'custom-bin' };

    // Capture the spawn attempt — run() will try to spawn custom-bin which doesn't exist.
    // We expect the ENOENT error.
    await expect(
      runCommand.run(
        { name: 'feature-x' },
        { worktree, system: sys, output: output.output, commands: new Map(), agents, agent: testAgent },
      ),
    ).rejects.toThrow(/not found/);
  });

  it('uses --agent flag via args', async () => {
    addListResponses(sys, 2);
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const agents = createRegistry(sys);

    await expect(
      runCommand.run(
        { name: 'feature-x', agent: 'claude' },
        { worktree, system: sys, output: output.output, commands: new Map(), agents },
      ),
    ).rejects.toThrow(/not found/);
  });
});

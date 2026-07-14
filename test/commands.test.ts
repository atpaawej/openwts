/**
 * Command-level integration tests.
 *
 * These test that commands wire together Worktree + Output correctly.
 * The deep module (Worktree) has its own tests — here we verify
 * that commands parse args, invoke the right Worktree methods,
 * and produce the right output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorktree } from '../src/worktree.js';
import { createCaptureOutput } from '../src/output.js';
import { FakeSystem } from './fakes/system.js';
import { createCommand } from '../src/commands/create.js';
import { listCommand } from '../src/commands/list.js';
import { removeCommand } from '../src/commands/remove.js';

const PORCELAIN = [
  '/repo',
  'branch refs/heads/main',
  'HEAD a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
  '',
  '/repo/.openwts/worktrees/feature-x',
  'branch refs/heads/feature-x',
  'HEAD d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9a0b1c2',
].join('\n');

/** Adds exec responses for one list() call: repoRoot + porcelain + N status checks */
function addListResponses(sys: FakeSystem, count: number): void {
  sys.addExecResponse({ stdout: '/repo\n' });
  sys.addExecResponse({ stdout: PORCELAIN });
  for (let i = 0; i < count; i++) {
    sys.addExecResponse({ stdout: '' });
  }
}

describe('create command', () => {
  let sys: FakeSystem;
  let output: ReturnType<typeof createCaptureOutput>;

  beforeEach(() => {
    sys = new FakeSystem();
    sys.setCwd('/repo');
    output = createCaptureOutput();
  });

  it('creates a worktree and reports success', async () => {
    // create() exec calls: repoRoot + symbol-ref + rev-parse + worktree add = 4
    // then getManifest → repoRoot + readFile (manifest doesn't exist → empty manifest) = 1
    // then write manifest (no exec)
    // getPath() → list(): repoRoot + porcelain + 2 status = 4
    sys.addExecResponse({ stdout: '/repo\n' });
    sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
    sys.addExecResponse({ stdout: 'abc123\n' });
    sys.addExecResponse({ stdout: '' });
    sys.addExecResponse({ stdout: '/repo\n' });           // getManifest repoRoot

    // getPath → list
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const commands = new Map();
    commands.set('create', createCommand);

    await createCommand.run(
      { name: 'feature-x' },
      { worktree, system: sys, output: output.output, commands },
    );

    expect(output.captured.success.some(s => s.includes('feature-x'))).toBe(true);
  });

  it('rejects invalid names', async () => {
    const worktree = createWorktree(sys);
    const commands = new Map();

    await expect(
      createCommand.run(
        { name: 'invalid space' },
        { worktree, system: sys, output: output.output, commands },
      ),
    ).rejects.toThrow('Invalid');
  });
});

describe('list command', () => {
  let sys: FakeSystem;
  let output: ReturnType<typeof createCaptureOutput>;

  beforeEach(() => {
    sys = new FakeSystem();
    sys.setCwd('/repo');
    output = createCaptureOutput();
  });

  it('prints worktrees as a table', async () => {
    addListResponses(sys, 2);

    const worktree = createWorktree(sys);
    const commands = new Map();
    commands.set('list', listCommand);

    await listCommand.run(
      {},
      { worktree, system: sys, output: output.output, commands },
    );

    expect(output.captured.tables.length).toBe(1);
    const table = output.captured.tables[0]!;
    expect(table.some(r => r.Name === 'feature-x')).toBe(true);
    expect(table.some(r => r.Name === 'repo')).toBe(true);
  });
});

describe('remove command', () => {
  let sys: FakeSystem;
  let output: ReturnType<typeof createCaptureOutput>;

  beforeEach(() => {
    sys = new FakeSystem();
    sys.setCwd('/repo');
    output = createCaptureOutput();
  });

  it('removes a worktree with force flag', async () => {
    // remove command:
    // 1. isManaged → getManifest → repoRoot = 1
    sys.addExecResponse({ stdout: '/repo\n' });
    // 2. read manifest (file doesn't exist → throw → empty manifest)
    // 3. getPath(name) → list → repoRoot + porcelain + 2 status = 4
    addListResponses(sys, 2);
    // 4. status check (via ctx.system.exec)
    sys.addExecResponse({ stdout: '' });
    // 5. unpushed check
    sys.addExecResponse({ stdout: '' });
    // 6. worktree.remove(name, force) → repoRoot = 1
    sys.addExecResponse({ stdout: '/repo\n' });
    // 7. worktree.remove → getPath → list = 4
    addListResponses(sys, 2);
    // 8. status check inside remove
    sys.addExecResponse({ stdout: '' });
    // 9. unpushed inside remove
    sys.addExecResponse({ stdout: '' });
    // 10. git worktree remove --force
    sys.addExecResponse({ stdout: '' });
    // 11. getManifest → repoRoot = 1
    sys.addExecResponse({ stdout: '/repo\n' });
    // 12. manifest.remove → readFile (doesn't exist → throw → empty) + writeFile

    const worktree = createWorktree(sys);
    const commands = new Map();
    commands.set('remove', removeCommand);

    await removeCommand.run(
      { name: 'feature-x', force: 'true' },
      { worktree, system: sys, output: output.output, commands },
    );

    expect(output.captured.success.some(s => s.includes('feature-x'))).toBe(true);
  });
});

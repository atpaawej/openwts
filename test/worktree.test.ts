/**
 * Tests for the Worktree deep module.
 *
 * Tests cross the SAME seam as production callers (commands).
 * No testing past the interface — we assert on OUTCOMES, not calls.
 */

import { describe, it, expect } from 'vitest';
import { createWorktree } from '../src/worktree.js';
import { FakeSystem } from './fakes/system.js';

// Sample git worktree list --porcelain output with 3 entries
const PORCELAIN_3 = [
  '/repo',
  'branch refs/heads/main',
  'HEAD a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
  '',
  '/repo/.openwts/worktrees/feature-x',
  'branch refs/heads/feature-x',
  'HEAD d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9a0b1c2',
  '',
  '/repo/.openwts/worktrees/bug-fix',
  'branch refs/heads/bug-fix',
  'HEAD f6a7b8c9d0e1f2a3b4c5d6e7f8a9a0b1c2d3e4f5',
].join('\n');

/** Adds exec responses for one list() call: repoRoot + porcelain + N status checks */
function addListResponses(sys: FakeSystem, porcelain: string, dirtyCount = 3): void {
  sys.addExecResponse({ stdout: '/repo\n' });          // repoRoot
  sys.addExecResponse({ stdout: porcelain });           // porcelain
  for (let i = 0; i < dirtyCount; i++) {
    sys.addExecResponse({ stdout: '' });                // status per worktree
  }
}

describe('Worktree', () => {
  describe('list()', () => {
    it('parses porcelain output into WorktreeInfo[]', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      addListResponses(sys, PORCELAIN_3, 3);

      const wt = createWorktree(sys);
      const list = await wt.list();

      expect(list).toHaveLength(3);
      expect(list[0]).toMatchObject({
        name: 'repo', branch: 'main', dirty: false, isCurrent: true,
      });
      expect(list[1]).toMatchObject({
        name: 'feature-x', branch: 'feature-x', dirty: false, isCurrent: false,
      });
      expect(list[2]).toMatchObject({
        name: 'bug-fix', branch: 'bug-fix', dirty: false, isCurrent: false,
      });
    });

    it('marks worktrees as dirty when status --porcelain has output', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      // repoRoot
      sys.addExecResponse({ stdout: '/repo\n' });
      // porcelain
      sys.addExecResponse({ stdout: PORCELAIN_3 });
      // status per worktree: repo(clean), feature-x(dirty), bug-fix(clean)
      sys.addExecResponse({ stdout: '' });
      sys.addExecResponse({ stdout: ' M modified-file.ts\n' });
      sys.addExecResponse({ stdout: '' });

      const wt = createWorktree(sys);
      const list = await wt.list();

      expect(list[0]!.dirty).toBe(false);
      expect(list[1]!.dirty).toBe(true);
      expect(list[2]!.dirty).toBe(false);
    });

    it('throws when not in a git repository', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ exitCode: 128, stderr: 'fatal: not a git repository' });

      const wt = createWorktree(sys);
      await expect(wt.list()).rejects.toThrow('Not in a git repository');
    });
  });

  describe('getPath()', () => {
    it('finds worktree by exact name', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      addListResponses(sys, PORCELAIN_3, 3);

      const wt = createWorktree(sys);
      const path = await wt.getPath('feature-x');

      expect(path).toBe('/repo/.openwts/worktrees/feature-x');
    });

    it('throws when worktree not found', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      addListResponses(sys, PORCELAIN_3, 3);

      const wt = createWorktree(sys);
      await expect(wt.getPath('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('create()', () => {
    it('creates a worktree from the default branch', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      // repoRoot + symbol-ref origin/HEAD + rev-parse base + worktree add
      sys.addExecResponse({ stdout: '/repo\n' });
      sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
      sys.addExecResponse({ stdout: 'abc123\n' });
      sys.addExecResponse({ stdout: '' });

      const wt = createWorktree(sys);
      await wt.create('my-feature');

      const addCmd = sys.getExecCommands().find(c => c.includes('worktree add'));
      expect(addCmd).toBeTruthy();
      expect(addCmd).toContain('my-feature');
    });

    it('creates from a specific base branch', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      sys.addExecResponse({ stdout: '/repo\n' });
      sys.addExecResponse({ stdout: 'def456\n' });
      sys.addExecResponse({ stdout: '' });

      const wt = createWorktree(sys);
      await wt.create('my-feature', 'develop');

      const addCmd = sys.getExecCommands().find(c => c.includes('worktree add'));
      expect(addCmd).toBeTruthy();
      expect(addCmd).toContain('develop');
    });

    it('throws for invalid worktree name', async () => {
      const sys = new FakeSystem();
      const wt = createWorktree(sys);

      await expect(wt.create('bad name')).rejects.toThrow('Invalid');
    });

    it('throws when worktree path already exists', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');
      sys.addExecResponse({ stdout: '/repo\n' });
      sys.setFile('/repo/.openwts/worktrees/existing', '');

      const wt = createWorktree(sys);
      await expect(wt.create('existing')).rejects.toThrow('already exists');
    });
  });

  describe('remove()', () => {
    it('removes a worktree with force', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');

      // remove() trace:
      // 1. remove's repoRoot → 1 exec
      // 2. getPath('feature-x') → list → repoRoot + porcelain + 3x status → 5 execs
      // 3. status check → 1 exec
      // 4. unpushed check → 1 exec
      // 5. git worktree remove --force → 1 exec
      // 6. getManifest → repoRoot → 1 exec
      // 7. manifest.remove → writeFile (no exec)
      sys.addExecResponse({ stdout: '/repo\n' });         // 1. remove's repoRoot
      addListResponses(sys, PORCELAIN_3, 3);               // 2. getPath → list
      sys.addExecResponse({ stdout: '' });                  // 3. status check
      sys.addExecResponse({ stdout: '' });                  // 4. unpushed check
      sys.addExecResponse({ stdout: '' });                  // 5. worktree remove --force
      sys.addExecResponse({ stdout: '/repo\n' });           // 6. manifest repoRoot

      const wt = createWorktree(sys);
      await wt.remove('feature-x', true);

      const cmds = sys.getExecCommands();
      expect(cmds.some(c => c.includes('worktree remove'))).toBe(true);
    });

    it('throws when trying to remove the main worktree', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');

      // remove() fails early — before status/unpushed/remove execs
      // 1. remove's repoRoot → 1 exec
      // 2. getPath('repo') → list → repoRoot + porcelain + 3x status → 5 execs
      sys.addExecResponse({ stdout: '/repo\n' });         // 1. remove's repoRoot
      addListResponses(sys, PORCELAIN_3, 3);               // 2. getPath → list

      const wt = createWorktree(sys);
      await expect(wt.remove('repo', true)).rejects.toThrow('Cannot remove the main worktree');
    });
  });

  describe('prune()', () => {
    it('removes all non-main worktrees with force', async () => {
      const sys = new FakeSystem();
      sys.setCwd('/repo');

      // prune() calls list() first → 6 execs (repoRoot + porcelain + 3x status + force param checks)
      addListResponses(sys, PORCELAIN_3, 3);

      // Then removes 'feature-x' with force:
      // remove's repoRoot + getPath(list) 5 + status + unpushed + remove + manifest repoRoot = 10
      sys.addExecResponse({ stdout: '/repo\n' });         // remove's repoRoot
      addListResponses(sys, PORCELAIN_3, 3);               // getPath → list (5)
      sys.addExecResponse({ stdout: '' });                  // status check
      sys.addExecResponse({ stdout: '' });                  // unpushed check
      sys.addExecResponse({ stdout: '' });                  // worktree remove --force
      sys.addExecResponse({ stdout: '/repo\n' });           // manifest repoRoot

      // Then removes 'bug-fix' with force: same pattern
      sys.addExecResponse({ stdout: '/repo\n' });         // remove's repoRoot
      addListResponses(sys, PORCELAIN_3, 3);               // getPath → list (5)
      sys.addExecResponse({ stdout: '' });                  // status check
      sys.addExecResponse({ stdout: '' });                  // unpushed check
      sys.addExecResponse({ stdout: '' });                  // worktree remove --force
      sys.addExecResponse({ stdout: '/repo\n' });           // manifest repoRoot

      const wt = createWorktree(sys);
      await wt.prune(true);

      const rmCount = sys.getExecCommands().filter(c => c.includes('worktree remove')).length;
      expect(rmCount).toBe(2);
    });
  });
});

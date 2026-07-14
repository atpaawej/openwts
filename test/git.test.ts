/**
 * Tests for git helpers (src/git.ts)
 */

import { describe, it, expect } from 'vitest';
import { FakeSystem } from './fakes/system.js';
import { getCurrentBranch, getDefaultBranch, getStatus } from '../src/git.js';

describe('git helpers', () => {
  describe('getCurrentBranch', () => {
    it('returns the current branch name', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: 'main\n' });
      expect(await getCurrentBranch(sys, '/repo')).toBe('main');
    });
  });

  describe('getDefaultBranch', () => {
    it('detects origin/HEAD', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: 'refs/remotes/origin/main\n' });
      expect(await getDefaultBranch(sys, '/repo')).toBe('main');
    });

    it('falls back to main', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ exitCode: 1, stderr: 'symbolic-ref failed' });
      sys.addExecResponse({ stdout: 'abc123\n' }); // rev-parse main
      expect(await getDefaultBranch(sys, '/repo')).toBe('main');
    });

    it('falls back to master', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ exitCode: 1, stderr: 'symbolic-ref failed' });
      sys.addExecResponse({ exitCode: 1, stderr: 'main not found' });
      sys.addExecResponse({ stdout: 'abc123\n' }); // rev-parse master
      expect(await getDefaultBranch(sys, '/repo')).toBe('master');
    });

    it('falls back to current branch', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ exitCode: 1, stderr: 'symbolic-ref failed' });
      sys.addExecResponse({ exitCode: 1, stderr: 'main not found' });
      sys.addExecResponse({ exitCode: 1, stderr: 'master not found' });
      sys.addExecResponse({ stdout: 'develop\n' }); // current branch
      expect(await getDefaultBranch(sys, '/repo')).toBe('develop');
    });
  });

  describe('getStatus', () => {
    it('returns clean status', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: '' });
      sys.addExecResponse({ stdout: '' });
      const status = await getStatus(sys, '/repo');
      expect(status.isDirty).toBe(false);
      expect(status.hasUnpushed).toBe(false);
      expect(status.unpushedCount).toBe(0);
    });

    it('returns dirty status', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: ' M file.ts\n' });
      sys.addExecResponse({ stdout: '' });
      const status = await getStatus(sys, '/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasUnpushed).toBe(false);
    });

    it('returns unpushed status', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: '' });
      sys.addExecResponse({ stdout: 'abc123 Commit message\n' });
      const status = await getStatus(sys, '/repo');
      expect(status.isDirty).toBe(false);
      expect(status.hasUnpushed).toBe(true);
      expect(status.unpushedCount).toBe(1);
    });

    it('returns both dirty and unpushed', async () => {
      const sys = new FakeSystem();
      sys.addExecResponse({ stdout: ' M file.ts\n' });
      sys.addExecResponse({ stdout: 'abc123 First\n' });
      const status = await getStatus(sys, '/repo');
      expect(status.isDirty).toBe(true);
      expect(status.hasUnpushed).toBe(true);
    });
  });
});

/**
 * Tests for manifest tracking (src/manifest.ts)
 */

import { describe, it, expect } from 'vitest';
import { FakeSystem } from './fakes/system.js';
import { createManifestManager } from '../src/manifest.js';

describe('ManifestManager', () => {
  it('starts with an empty manifest', async () => {
    const sys = new FakeSystem();
    const mm = createManifestManager(sys, '/repo');

    const manifest = await mm.read();
    expect(manifest.version).toBe(1);
    expect(manifest.worktrees).toEqual({});
  });

  it('adds and reads worktree entries', async () => {
    const sys = new FakeSystem();
    sys.setCwd('/repo');
    const mm = createManifestManager(sys, '/repo');

    await mm.add('feature-x', 'feature-x', '/repo/.openwts/worktrees/feature-x');

    const entry = await mm.get('feature-x');
    expect(entry).toBeDefined();
    expect(entry!.branch).toBe('feature-x');
    expect(entry!.path).toBe('/repo/.openwts/worktrees/feature-x');

    expect(await mm.isManaged('feature-x')).toBe(true);
  });

  it('removes worktree entries', async () => {
    const sys = new FakeSystem();
    sys.setCwd('/repo');
    const mm = createManifestManager(sys, '/repo');

    await mm.add('feature-x', 'feature-x', '/repo/.openwts/worktrees/feature-x');
    expect(await mm.isManaged('feature-x')).toBe(true);

    await mm.remove('feature-x');
    expect(await mm.isManaged('feature-x')).toBe(false);
  });

  it('lists managed worktree names', async () => {
    const sys = new FakeSystem();
    sys.setCwd('/repo');
    const mm = createManifestManager(sys, '/repo');

    await mm.add('feature-x', 'feature-x', '/path');
    await mm.add('bug-fix', 'bug-fix', '/path2');

    const names = await mm.list();
    expect(names).toContain('feature-x');
    expect(names).toContain('bug-fix');
    expect(names.length).toBe(2);
  });

  it('returns false for isManaged on unknown name', async () => {
    const sys = new FakeSystem();
    const mm = createManifestManager(sys, '/repo');
    expect(await mm.isManaged('nonexistent')).toBe(false);
  });

  it('persists manifest across reads', async () => {
    const sys = new FakeSystem();
    sys.setCwd('/repo');
    const mm1 = createManifestManager(sys, '/repo');
    await mm1.add('feature-x', 'feature-x', '/path');

    // Create a new manager — should read the same data
    const mm2 = createManifestManager(sys, '/repo');
    expect(await mm2.isManaged('feature-x')).toBe(true);
  });

  it('remove returns false for unknown name', async () => {
    const sys = new FakeSystem();
    const mm = createManifestManager(sys, '/repo');
    expect(await mm.remove('nonexistent')).toBe(false);
  });
});

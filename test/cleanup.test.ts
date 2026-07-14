/**
 * Tests for cleanup logic (src/cleanup.ts)
 */

import { describe, it, expect } from 'vitest';
import { decideCleanup } from '../src/cleanup.js';

describe('decideCleanup', () => {
  it('returns remove for clean worktree', () => {
    expect(decideCleanup(false, false)).toBe('remove');
  });

  it('returns prompt for dirty worktree', () => {
    expect(decideCleanup(true, false)).toBe('prompt');
  });

  it('returns prompt for unpushed commits', () => {
    expect(decideCleanup(false, true)).toBe('prompt');
  });

  it('returns prompt for both dirty and unpushed', () => {
    expect(decideCleanup(true, true)).toBe('prompt');
  });

  it('returns remove for dirty with force', () => {
    expect(decideCleanup(true, false, { force: true })).toBe('remove');
  });

  it('returns keep for dirty with noPrompt', () => {
    expect(decideCleanup(true, false, { noPrompt: true })).toBe('keep');
  });

  it('returns keep for dirty with both force and noPrompt — force takes precedence', () => {
    expect(decideCleanup(true, false, { force: true, noPrompt: true })).toBe('remove');
  });

  it('returns remove for unpushed with force', () => {
    expect(decideCleanup(false, true, { force: true })).toBe('remove');
  });

  it('returns keep for unpushed with noPrompt', () => {
    expect(decideCleanup(false, true, { noPrompt: true })).toBe('keep');
  });
});

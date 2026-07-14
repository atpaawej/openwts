/**
 * Worktree manifest — tracks which worktrees were created by openwts
 * vs manually via `git worktree add`.
 *
 * Manifest lives at <repo-root>/.openwts/manifest.json.
 *
 * Only openwts-created worktrees are eligible for auto-cleanup.
 * Manual worktrees are never touched by cleanup logic.
 */

import type { System } from './system.js';

export interface ManifestEntry {
  /** ISO 8601 creation timestamp */
  created: string;
  /** Git branch checked out in the worktree */
  branch: string;
  /** Path relative to repo root (or absolute) */
  path: string;
}

export interface Manifest {
  version: number;
  worktrees: Record<string, ManifestEntry>;
}

const MANIFEST_FILE = '.openwts/manifest.json';
const CURRENT_VERSION = 1;

export function createManifestManager(system: System, repoRoot: string): ManifestManager {
  return new ManifestManager(system, repoRoot);
}

export class ManifestManager {
  private system: System;
  private repoRoot: string;

  constructor(system: System, repoRoot: string) {
    this.system = system;
    this.repoRoot = repoRoot;
  }

  /** Get the absolute path to the manifest file */
  private get manifestPath(): string {
    return `${this.repoRoot}/${MANIFEST_FILE}`;
  }

  /** Read the manifest, returning an empty one if it doesn't exist */
  async read(): Promise<Manifest> {
    try {
      const content = await this.system.readFile(this.manifestPath);
      return JSON.parse(content) as Manifest;
    } catch {
      return { version: CURRENT_VERSION, worktrees: {} };
    }
  }

  /** Write the manifest to disk */
  private async write(manifest: Manifest): Promise<void> {
    await this.system.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  /** Check if the manifest file exists */
  async exists(): Promise<boolean> {
    try {
      await this.system.readFile(this.manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  /** Add a worktree entry to the manifest */
  async add(name: string, branch: string, path: string): Promise<void> {
    const manifest = await this.read();
    manifest.worktrees[name] = {
      created: new Date().toISOString(),
      branch,
      path,
    };
    await this.write(manifest);
  }

  /** Remove a worktree entry from the manifest */
  async remove(name: string): Promise<boolean> {
    const manifest = await this.read();
    if (!manifest.worktrees[name]) {
      return false;
    }
    delete manifest.worktrees[name];
    await this.write(manifest);
    return true;
  }

  /** Check if a worktree was created by openwts */
  async isManaged(name: string): Promise<boolean> {
    const manifest = await this.read();
    return name in manifest.worktrees;
  }

  /** Get all managed worktree names */
  async list(): Promise<string[]> {
    const manifest = await this.read();
    return Object.keys(manifest.worktrees);
  }

  /** Get the manifest entry for a worktree */
  async get(name: string): Promise<ManifestEntry | undefined> {
    const manifest = await this.read();
    return manifest.worktrees[name];
  }
}

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
export declare function createManifestManager(system: System, repoRoot: string): ManifestManager;
export declare class ManifestManager {
    private system;
    private repoRoot;
    constructor(system: System, repoRoot: string);
    /** Get the absolute path to the manifest file */
    private get manifestPath();
    /** Read the manifest, returning an empty one if it doesn't exist */
    read(): Promise<Manifest>;
    /** Write the manifest to disk */
    private write;
    /** Check if the manifest file exists */
    exists(): Promise<boolean>;
    /** Add a worktree entry to the manifest */
    add(name: string, branch: string, path: string): Promise<void>;
    /** Remove a worktree entry from the manifest */
    remove(name: string): Promise<boolean>;
    /** Check if a worktree was created by openwts */
    isManaged(name: string): Promise<boolean>;
    /** Get all managed worktree names */
    list(): Promise<string[]>;
    /** Get the manifest entry for a worktree */
    get(name: string): Promise<ManifestEntry | undefined>;
}
//# sourceMappingURL=manifest.d.ts.map
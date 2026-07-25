/**
 * Worktree manifest — tracks which worktrees were created by openwts
 * vs manually via `git worktree add`.
 *
 * Manifest lives at <repo-root>/.openwts/manifest.json.
 *
 * Only openwts-created worktrees are eligible for auto-cleanup.
 * Manual worktrees are never touched by cleanup logic.
 */
const MANIFEST_FILE = '.openwts/manifest.json';
const CURRENT_VERSION = 1;
export function createManifestManager(system, repoRoot) {
    return new ManifestManager(system, repoRoot);
}
export class ManifestManager {
    system;
    repoRoot;
    constructor(system, repoRoot) {
        this.system = system;
        this.repoRoot = repoRoot;
    }
    /** Get the absolute path to the manifest file */
    get manifestPath() {
        return `${this.repoRoot}/${MANIFEST_FILE}`;
    }
    /** Read the manifest, returning an empty one if it doesn't exist */
    async read() {
        try {
            const content = await this.system.readFile(this.manifestPath);
            return JSON.parse(content);
        }
        catch {
            return { version: CURRENT_VERSION, worktrees: {} };
        }
    }
    /** Write the manifest to disk */
    async write(manifest) {
        await this.system.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    }
    /** Check if the manifest file exists */
    async exists() {
        try {
            await this.system.readFile(this.manifestPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /** Add a worktree entry to the manifest */
    async add(name, branch, path) {
        const manifest = await this.read();
        manifest.worktrees[name] = {
            created: new Date().toISOString(),
            branch,
            path,
        };
        await this.write(manifest);
    }
    /** Remove a worktree entry from the manifest */
    async remove(name) {
        const manifest = await this.read();
        if (!manifest.worktrees[name]) {
            return false;
        }
        delete manifest.worktrees[name];
        await this.write(manifest);
        return true;
    }
    /** Check if a worktree was created by openwts */
    async isManaged(name) {
        const manifest = await this.read();
        return name in manifest.worktrees;
    }
    /** Get all managed worktree names */
    async list() {
        const manifest = await this.read();
        return Object.keys(manifest.worktrees);
    }
    /** Get the manifest entry for a worktree */
    async get(name) {
        const manifest = await this.read();
        return manifest.worktrees[name];
    }
}
//# sourceMappingURL=manifest.js.map
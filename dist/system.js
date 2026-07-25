/**
 * System adapter — the sole I/O seam.
 *
 * Bundles exec (spawning processes) and filesystem operations into one
 * interface so tests need only one fake instead of three separate mocks.
 *
 * Seam discipline: this seam exists because tests genuinely need a
 * substitute for real I/O. The fake is justified on day one.
 */
/** Production adapter — wraps child_process and fs/promises */
export function createNodeSystem() {
    return new NodeSystem();
}
class NodeSystem {
    async exec(cmd, args, options) {
        const { exec } = await import('node:child_process');
        const command = [cmd, ...args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
        return new Promise((resolve) => {
            exec(command, { cwd: options?.cwd }, (err, stdout, stderr) => {
                resolve({
                    exitCode: err ? err.code === 'ENOENT' ? 127 : 1 : 0,
                    stdout,
                    stderr,
                });
            });
        });
    }
    async readFile(path) {
        const fs = await import('node:fs/promises');
        return fs.readFile(path, 'utf-8');
    }
    async writeFile(path, content) {
        const fs = await import('node:fs/promises');
        await fs.writeFile(path, content, 'utf-8');
    }
    async appendFile(path, content) {
        const fs = await import('node:fs/promises');
        await fs.appendFile(path, content, 'utf-8');
    }
    async exists(path) {
        const fs = await import('node:fs/promises');
        try {
            await fs.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    async homeDir() {
        const { homedir } = await import('node:os');
        return homedir();
    }
    cwd() {
        return process.cwd();
    }
}
//# sourceMappingURL=system.js.map
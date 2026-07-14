/**
 * System adapter — the sole I/O seam.
 *
 * Bundles exec (spawning processes) and filesystem operations into one
 * interface so tests need only one fake instead of three separate mocks.
 *
 * Seam discipline: this seam exists because tests genuinely need a
 * substitute for real I/O. The fake is justified on day one.
 */

import type { ExecResult } from './types.js';

export interface System {
  exec(cmd: string, args: string[], options?: { cwd?: string }): Promise<ExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  homeDir(): Promise<string>;
  cwd(): string;
}

/** Production adapter — wraps child_process and fs/promises */
export function createNodeSystem(): System {
  return new NodeSystem();
}

class NodeSystem implements System {
  async exec(cmd: string, args: string[], options?: { cwd?: string }): Promise<ExecResult> {
    const { exec } = await import('node:child_process');
    const command = [cmd, ...args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
    return new Promise((resolve) => {
      exec(command, { cwd: options?.cwd }, (err, stdout, stderr) => {
        resolve({
          exitCode: err ? (err as NodeJS.ErrnoException).code === 'ENOENT' ? 127 : 1 : 0,
          stdout,
          stderr,
        });
      });
    });
  }

  async readFile(path: string): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.writeFile(path, content, 'utf-8');
  }

  async appendFile(path: string, content: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.appendFile(path, content, 'utf-8');
  }

  async exists(path: string): Promise<boolean> {
    const fs = await import('node:fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async homeDir(): Promise<string> {
    const { homedir } = await import('node:os');
    return homedir();
  }

  cwd(): string {
    return process.cwd();
  }
}

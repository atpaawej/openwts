/**
 * FakeSystem — in-memory adapter for testing.
 *
 * Implements the System interface with in-memory maps:
 * - exec: records calls, returns canned responses
 * - readFile/writeFile/appendFile/exists: in-memory virtual filesystem
 * - homeDir/cwd: configurable
 *
 * Tests set up expected responses and verify calls through the public API.
 */

import type { System } from '../../src/system.js';
import type { ExecResult } from '../../src/types.js';

interface ExecCall {
  cmd: string;
  args: string[];
  options?: { cwd?: string };
}

export class FakeSystem implements System {
  /** Record of all exec() calls, in order */
  readonly execCalls: ExecCall[] = [];

  /** Queue of responses for exec(). Consumed FIFO. */
  private execResponses: ExecResult[] = [];

  /** In-memory filesystem: path → content */
  private files = new Map<string, string>();

  /** Simulated exit code for exec (default 0 for success) */
  private defaultExitCode = 0;

  private _homeDir = '/home/test';
  private _cwd = '/repo';

  // ─── Test helpers ────────────────────────────────────────

  setDefaultExitCode(code: number): void {
    this.defaultExitCode = code;
  }

  /** Queue an exec response. Responses consumed in FIFO order. */
  addExecResponse(response: Partial<ExecResult>): void {
    this.execResponses.push({
      exitCode: response.exitCode ?? 0,
      stdout: response.stdout ?? '',
      stderr: response.stderr ?? '',
    });
  }

  /** Set a file's content in the virtual filesystem */
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  /** Configure the fake home directory */
  setHomeDir(dir: string): void {
    this._homeDir = dir;
  }

  /** Configure the fake cwd */
  setCwd(dir: string): void {
    this._cwd = dir;
  }

  /** Get the Nth exec call for assertions */
  getExecCall(n: number): ExecCall | undefined {
    return this.execCalls[n];
  }

  /** Get all exec commands for a quick assertion */
  getExecCommands(): string[] {
    return this.execCalls.map(c => `${c.cmd} ${c.args.join(' ')}`);
  }

  // ─── System implementation ───────────────────────────────

  async exec(cmd: string, args: string[], options?: { cwd?: string }): Promise<ExecResult> {
    this.execCalls.push({ cmd, args, options });
    const next = this.execResponses.shift();
    if (next) return next;
    return { exitCode: this.defaultExitCode, stdout: '', stderr: '' };
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async appendFile(path: string, content: string): Promise<void> {
    const existing = this.files.get(path) ?? '';
    this.files.set(path, existing + content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async homeDir(): Promise<string> {
    return this._homeDir;
  }

  cwd(): string {
    return this._cwd;
  }
}

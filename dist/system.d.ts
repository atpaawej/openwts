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
    exec(cmd: string, args: string[], options?: {
        cwd?: string;
    }): Promise<ExecResult>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    appendFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    homeDir(): Promise<string>;
    cwd(): string;
}
/** Production adapter — wraps child_process and fs/promises */
export declare function createNodeSystem(): System;
//# sourceMappingURL=system.d.ts.map
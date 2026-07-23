/**
 * Interactive prompt for worktree name via stdin/stdout.
 *
 * Used when an agent-as-verb command is given without a worktree name,
 * e.g. `openwts claude` (no name given).
 *
 * Cross-platform readline prompt. Returns null if the user enters
 * an empty response.
 */

import { createInterface } from 'node:readline';

export function promptForName(): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Worktree name: ', (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed.length > 0 ? trimmed : null);
    });
  });
}

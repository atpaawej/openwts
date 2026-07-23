/**
 * Interactive agent picker — keyboard-navigable terminal UI.
 *
 * Built with Node.js readline in raw mode (no external dependencies).
 * Supports: Up/Down arrows, Enter to confirm, Escape/Ctrl+C to cancel.
 * Shows a "Back/Cancel" option at the bottom of the list.
 *
 * Cross-platform (Windows, macOS, Linux).
 */

import { createInterface } from 'node:readline';
import type { Agent } from './agent.js';

const ESC = '\x1b';

function write(s: string): void {
  process.stdout.write(s);
}

/**
 * Show an interactive picker for selecting an agent.
 *
 * @param agents Installed agents to display (must have at least one entry).
 * @returns The selected Agent, or `null` if the user cancelled.
 */
export async function pickAgent(agents: Agent[]): Promise<Agent | null> {
  if (agents.length === 0) {
    return null;
  }

  // Build display list with a "Cancel" footer option
  const items: Array<{ label: string; agent: Agent | null }> = agents.map((a) => ({
    label: `${a.name}  ${a.description}`,
    agent: a,
  }));
  items.push({ label: 'Cancel', agent: null });

  let selected = 0;

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();

    // Total visible lines we write (header + all items)
    const lineCount = items.length + 1;
    let firstRender = true;

    function render() {
      if (!firstRender) {
        // Move cursor back up to the start of our block
        write(`${ESC}[${lineCount}A`);
      }
      firstRender = false;

      // Clear from here to end of screen, then write everything
      write(`${ESC}[J`);
      write('Select an AI coding agent:\n');
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const cursor = i === selected ? '❯' : ' ';
        write(`${cursor} ${item.label}\n`);
      }
    }

    function cleanup() {
      stdin.setRawMode?.(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener('data', onData);
      rl.close();
    }

    function cancel() {
      cleanup();
      resolve(null);
    }

    function confirm() {
      const chosen = items[selected]?.agent ?? null;
      write('\n');
      cleanup();
      resolve(chosen);
    }

    function onData(data: Buffer) {
      const key = data.toString();

      // Escape sequences: wait for full sequence
      if (key === `${ESC}`) return;

      if (key === `${ESC}[A` || key === 'OA') {
        selected = selected > 0 ? selected - 1 : items.length - 1;
        render();
        return;
      }

      if (key === `${ESC}[B` || key === 'OB') {
        selected = selected < items.length - 1 ? selected + 1 : 0;
        render();
        return;
      }

      if (key === '\x03') {
        cancel();
        return;
      }

      if (key === '\r' || key === '\n') {
        confirm();
        return;
      }
    }

    stdin.on('data', onData);

    // Initial render
    render();
  });
}

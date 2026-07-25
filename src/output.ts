/**
 * Output adapter — the presentation seam.
 *
 * All user-facing output flows through this interface.
 * Tests use CaptureOutput to collect output for assertions.
 */

export interface Output {
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  table(rows: Record<string, string>[]): void;
}

const ESC = '\x1b';
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const RED = `${ESC}[31m`;
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;

export function createNodeOutput(): Output {
  return new NodeOutput();
}

class NodeOutput implements Output {
  info(msg: string): void {
    console.log(msg);
  }

  success(msg: string): void {
    console.log(`${GREEN}✓${RESET} ${msg}`);
  }

  warn(msg: string): void {
    console.warn(`${YELLOW}⚠${RESET} ${msg}`);
  }

  error(msg: string): void {
    console.error(`${RED}✗${RESET} ${msg}`);
  }

  table(rows: Record<string, string>[]): void {
    if (rows.length === 0) {
      console.log('(none)');
      return;
    }
    const keys = Object.keys(rows[0]!);

    // Calculate visible display widths (handles emoji/double-width chars)
    const displayWidth = (s: string): number => {
      let width = 0;
      for (const ch of s) {
        const cp = ch.codePointAt(0) ?? 0;
        // Double-width ranges: commonly emoji, arrows, and misc symbols
        if (cp >= 0x2000) width += 2;
        else width += 1;
      }
      return width;
    };

    const padDisplay = (s: string, len: number): string => {
      const diff = len - displayWidth(s);
      return diff > 0 ? s + ' '.repeat(diff) : s;
    };

    // Column widths: add 2 for padding (1 space each side)
    const colWidths: number[] = keys.map(k =>
      Math.max(k.length, ...rows.map(r => displayWidth(r[k] ?? ''))) + 2,
    );

    // Build separators
    const topSep    = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐';
    const headSep  = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
    const rowSep   = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
    const bottomSep = '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

    const renderRow = (data: string[], bold?: boolean): string => {
      const cells = data.map((s, i) => {
        const padded = ' ' + padDisplay(s, colWidths[i]! - 2) + ' ';
        return bold ? `${BOLD}${padded}${RESET}` : padded;
      });
      return '│' + cells.join('│') + '│';
    };

    console.log(topSep);
    console.log(renderRow(keys, true));
    console.log(headSep);
    for (let i = 0; i < rows.length; i++) {
      if (i > 0) console.log(rowSep);
      console.log(renderRow(keys.map(k => rows[i]![k] ?? '')));
    }
    console.log(bottomSep);
  }
}

/** Test-only — captures output for assertions */
export function createCaptureOutput(): { output: Output; captured: { info: string[]; error: string[]; warn: string[]; success: string[]; tables: Record<string, string>[][] } } {
  const captured = { info: [] as string[], error: [] as string[], warn: [] as string[], success: [] as string[], tables: [] as Record<string, string>[][] };
  const output: Output = {
    info: (m) => { captured.info.push(m); },
    success: (m) => { captured.success.push(m); },
    warn: (m) => { captured.warn.push(m); },
    error: (m) => { captured.error.push(m); },
    table: (rows) => { captured.tables.push(rows); },
  };
  return { output, captured };
}

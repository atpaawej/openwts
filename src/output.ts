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
    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const key of keys) {
      widths[key] = Math.max(
        key.length,
        ...rows.map(r => (r[key] ?? '').length),
      );
    }
    // Header
    const header = keys.map(k => `${BOLD}${k.padEnd(widths[k]!)}${RESET}`).join('  ');
    console.log(header);
    console.log(keys.map(k => '─'.repeat(widths[k]!)).join('──'));
    // Rows
    for (const row of rows) {
      console.log(keys.map(k => (row[k] ?? '').padEnd(widths[k]!)).join('  '));
    }
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

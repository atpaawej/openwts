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

    // Visible display width (handles emoji/double-width chars)
    const displayWidth = (s: string): number => {
      let width = 0;
      for (const ch of s) {
        const cp = ch.codePointAt(0) ?? 0;
        if (cp >= 0x2000) width += 2;
        else width += 1;
      }
      return width;
    };

    const truncate = (s: string, maxWidth: number): string => {
      if (displayWidth(s) <= maxWidth) return s;
      // Keep chopping from end until it fits with ellipsis
      for (let end = s.length - 1; end > 0; end--) {
        if (displayWidth(s.slice(0, end) + '…') <= maxWidth) {
          return s.slice(0, end) + '…';
        }
      }
      return '…';
    };

    const padDisplay = (s: string, len: number): string => {
      const diff = len - displayWidth(s);
      return diff > 0 ? s + ' '.repeat(diff) : s;
    };

    // ─── Natural column widths (content-driven, excl. padding) ───
    const natural: number[] = keys.map(k =>
      Math.max(k.length, ...rows.map(r => displayWidth(r[k] ?? ''))),
    );

    // ─── Terminal-constrained widths ──────────────────────────────
    const terminalWidth = (process.stdout.columns ?? 80);
    // Borders: 1 left + keys.length-1 separators + 1 right = keys.length + 1
    const borderChars = keys.length * 2 + 1; // each column has a left wall: │, plus final right wall
    // Actually: for N columns: │ col │ col │ col │ = N+1 wall chars + N-1 separator walls = 2N
    // Let me just be explicit: N columns ⇒ N+1 vertical bars (including outermost)
    // Each vertical bar = 1 char. Wait — outermost │ + between │ = keys.length + 1 + (keys.length - 1)
    // That's old calc: keys.length + 1 + keys.length - 1 = 2 * keys.length
    // Re-check: ┌──┬──┐ = 1 left border + N-1 separators + 1 right border = N+1
    // │a │b │ = N+1 vertical bars. Total = N+1 for the │ chars.
    // Hmm, easier to measure: the total is (sum colWidths) + (keys.length + 1) for │ chars
    const wallChars = keys.length + 1;

    // Per-column minimum = header width + 2 padding. Headers never truncate.
    const minColWidths: number[] = keys.map(k => k.length + 2);

    // Natural padded widths
    const padded = natural.map(w => w + 2);

    const totalWidth = padded.reduce((a, b) => a + b, 0) + wallChars;
    const gap = totalWidth - terminalWidth;

    let colWidths: number[];

    if (gap <= 0) {
      colWidths = padded;
    } else {
      // Need to shrink. Calculate how much slack each column has.
      let toCut = gap;
      colWidths = [...padded];

      // Keep cutting from columns with the most slack (natural - minimum)
      while (toCut > 0) {
        // Which columns have room to shrink?
        const candidates = colWidths
          .map((w, i) => ({ w, i, slack: w - minColWidths[i]! }))
          .filter(x => x.slack > 0)
          .sort((a, b) => b.slack - a.slack);

        if (candidates.length === 0) break; // can't shrink further

        // Cut from the column with most slack, one at a time
        for (const col of candidates) {
          if (toCut <= 0) break;
          colWidths[col.i]!--;
          toCut--;
        }
      }
    }

    // ─── Build separators ─────────────────────────────────────────
    const topSep    = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐';
    const headSep  = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
    const rowSep   = '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤';
    const bottomSep = '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

    const renderRow = (data: string[], bold?: boolean): string => {
      const cells = data.map((s, i) => {
        const maxContent = colWidths[i]! - 2; // minus padding
        const content = truncate(s, maxContent);
        const padded = ' ' + padDisplay(content, maxContent) + ' ';
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

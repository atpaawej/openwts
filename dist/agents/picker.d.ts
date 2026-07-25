/**
 * Interactive agent picker — keyboard-navigable terminal UI.
 *
 * Built with Node.js readline in raw mode (no external dependencies).
 * Supports: Up/Down arrows, Enter to confirm, Escape/Ctrl+C to cancel.
 * Shows a "Back/Cancel" option at the bottom of the list.
 *
 * Cross-platform (Windows, macOS, Linux).
 */
import type { Agent } from './agent.js';
/**
 * Show an interactive picker for selecting an agent.
 *
 * @param agents Installed agents to display (must have at least one entry).
 * @returns The selected Agent, or `null` if the user cancelled.
 */
export declare function pickAgent(agents: Agent[]): Promise<Agent | null>;
//# sourceMappingURL=picker.d.ts.map
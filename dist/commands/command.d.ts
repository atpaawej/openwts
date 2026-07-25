/**
 * Command interface and shared types.
 *
 * Every command exports a `command: Command` constant.
 * The loader discovers them by scanning the commands/ directory.
 */
import type { Output } from '../output.js';
import type { System } from '../system.js';
import type { Worktree } from '../worktree.js';
import type { Agent } from '../agents/agent.js';
import type { AgentRegistry } from '../agents/registry.js';
export interface ArgSpec {
    name: string;
    required: boolean;
    description: string;
}
export interface CommandContext {
    worktree: Worktree;
    system: System;
    output: Output;
    commands: Map<string, Command>;
    /** Agent registry for resolving which AI coding CLI to use */
    agents: AgentRegistry;
    /** Pre-resolved agent (set by three-tier router for agent-as-verb calls) */
    agent?: Agent;
}
/**
 * Cancelled by user — the caller should exit gracefully (code 0).
 * Used when the interactive picker is cancelled or a prompt is aborted.
 */
export declare class CancelledError extends Error {
    readonly name = "CancelledError";
}
/**
 * Resolve which agent to use, following the resolution chain:
 *
 * 1. Pre-resolved ctx.agent (from agent-as-verb routing)
 * 2. --agent / -a flag in parsed args
 * 3. OPENWTS_DEFAULT_AGENT environment variable
 * 4. Interactive picker (filtered to installed agents)
 *    - If picker is cancelled → CancelledError
 * 5. Error if nothing resolves
 */
export declare function resolveAgent(ctx: {
    agents: AgentRegistry;
    agent?: Agent;
}, args: Record<string, string>): Promise<Agent>;
/** Extract spawn-ready binary name and args from an Agent. */
export declare function agentSpawnArgs(agent: Agent): [bin: string, args: readonly string[]];
export interface Command {
    readonly name: string;
    readonly description: string;
    readonly arguments: ArgSpec[];
    readonly aliases?: string[];
    run(args: Record<string, string>, ctx: CommandContext): Promise<void>;
}
//# sourceMappingURL=command.d.ts.map
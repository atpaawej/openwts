/**
 * Command interface and shared types.
 *
 * Every command exports a `command: Command` constant.
 * The loader discovers them by scanning the commands/ directory.
 */
import { OpenwtError } from '../types.js';
/**
 * Cancelled by user — the caller should exit gracefully (code 0).
 * Used when the interactive picker is cancelled or a prompt is aborted.
 */
export class CancelledError extends Error {
    name = 'CancelledError';
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
export async function resolveAgent(ctx, args) {
    // 1. Pre-resolved (set by three-tier router on agent-as-verb calls)
    if (ctx.agent)
        return ctx.agent;
    // 2. --agent / -a flag
    const agentFlag = args.agent || args.a;
    if (agentFlag) {
        try {
            return ctx.agents.get(agentFlag);
        }
        catch {
            throw new OpenwtError(`Unknown agent: "${agentFlag}"`, `Use one of: ${ctx.agents.list().map(a => a.name).join(', ')}`);
        }
    }
    // 3. OPENWTS_DEFAULT_AGENT env var
    const envAgent = process.env.OPENWTS_DEFAULT_AGENT;
    if (envAgent) {
        try {
            return ctx.agents.get(envAgent);
        }
        catch {
            throw new OpenwtError(`OPENWTS_DEFAULT_AGENT="${envAgent}" is not a known agent`, `Set it to one of: ${ctx.agents.list().map(a => a.name).join(', ')}`);
        }
    }
    // 4. Interactive picker (only installed agents)
    const installed = await ctx.agents.getInstalled();
    if (installed.length === 0) {
        throw new OpenwtError('No AI coding agents found on PATH', 'Install an agent like "claude" or "opencode", or set OPENWTS_DEFAULT_AGENT');
    }
    // Lazily import picker (it's only needed for interactive use)
    const { pickAgent } = await import('../agents/picker.js');
    const picked = await pickAgent(installed);
    if (!picked) {
        throw new CancelledError('Agent selection cancelled');
    }
    return picked;
}
/** Extract spawn-ready binary name and args from an Agent. */
export function agentSpawnArgs(agent) {
    return [agent.bin, agent.args ?? []];
}
//# sourceMappingURL=command.js.map
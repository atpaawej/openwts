/**
 * Agent registry — manages agent definitions with lazy, memoized PATH detection.
 *
 * This module follows OCP: adding a new agent means registering it.
 * Zero existing code changes.
 *
 * PATH detection uses System.exec() — which on POSIX, where on Windows —
 * crossed at the System seam so tests use FakeSystem to control which
 * agents appear "installed."
 */
import type { System } from '../system.js';
import type { Agent } from './agent.js';
export declare function createRegistry(system: System): AgentRegistry;
export declare class AgentNotFoundError extends Error {
    readonly suggestion?: string | undefined;
    readonly name = "AgentNotFoundError";
    constructor(message: string, suggestion?: string | undefined);
}
export interface AgentRegistry {
    /** Register one or more agent definitions. Idempotent (later wins). */
    register(...agents: Agent[]): void;
    /** Look up an agent by name. Throws AgentNotFoundError with suggestion. */
    get(name: string): Agent;
    /** List all registered agent definitions (regardless of installed status). */
    list(): Agent[];
    /** List only agents whose binaries are found on PATH. Lazy + memoized. */
    getInstalled(): Promise<Agent[]>;
    /** Check if a specific agent's binary is on PATH. */
    isInstalled(agent: Agent): Promise<boolean>;
}
//# sourceMappingURL=registry.d.ts.map
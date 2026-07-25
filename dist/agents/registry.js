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
import { opencodeAgent } from './opencode.js';
import { claudeAgent } from './claude.js';
/**
 * Determine the command to check if a binary is on PATH.
 * Cross-platform: `which` on POSIX, `where` on Windows.
 */
function whichCmd() {
    return process.platform === 'win32' ? 'where' : 'which';
}
export function createRegistry(system) {
    return new Registry(system);
}
export class AgentNotFoundError extends Error {
    suggestion;
    name = 'AgentNotFoundError';
    constructor(message, suggestion) {
        super(message);
        this.suggestion = suggestion;
    }
}
class Registry {
    agents = new Map();
    system;
    installedCache = null;
    constructor(system) {
        this.system = system;
        // Register built-in agents
        this.register(opencodeAgent, claudeAgent);
    }
    register(...newAgents) {
        for (const agent of newAgents) {
            this.agents.set(agent.name, agent);
        }
        // Invalidate memoized cache when new agents are registered
        this.installedCache = null;
    }
    get(name) {
        const agent = this.agents.get(name);
        if (!agent) {
            const knownNames = Array.from(this.agents.keys()).join(', ');
            throw new AgentNotFoundError(`Unknown agent: "${name}"`, `Known agents: ${knownNames}`);
        }
        return agent;
    }
    list() {
        return Array.from(this.agents.values());
    }
    async getInstalled() {
        if (this.installedCache !== null) {
            return this.installedCache;
        }
        const results = await Promise.all(Array.from(this.agents.values()).map(async (agent) => {
            const installed = await this.isInstalled(agent);
            return installed ? agent : null;
        }));
        this.installedCache = results.filter((a) => a !== null);
        return this.installedCache;
    }
    async isInstalled(agent) {
        const result = await this.system.exec(whichCmd(), [agent.bin]);
        // which/where exits 0 when found, non-zero when not found
        return result.exitCode === 0;
    }
}
//# sourceMappingURL=registry.js.map
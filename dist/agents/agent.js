/**
 * Agent interface — the core abstraction for agent-agnostic openwts.
 *
 * Every AI coding CLI (opencode, claude, etc.) is represented by an Agent
 * with a name, description, binary, and optional args. The interface is
 * minimal by design — see OCP Principle.
 *
 * Adding a new agent = creating one Agent object and registering it.
 * Zero existing code changes.
 *
 * All four fields are readonly to prevent accidental mutation.
 * `args` is optional — most agents take only the worktree path.
 */
export {};
//# sourceMappingURL=agent.js.map
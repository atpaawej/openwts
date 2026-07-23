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

export interface Agent {
  /** CLI name used in `openwts <name> <worktree>` and `--agent <name>` */
  readonly name: string;
  /** Short human-readable description for the picker UI */
  readonly description: string;
  /** Binary to spawn (must be on PATH to be "installed") */
  readonly bin: string;
  /** Optional CLI arguments passed before the worktree path */
  readonly args?: readonly string[];
}

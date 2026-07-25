/** Shared domain types for openwts */
/**
 * Known, actionable error.
 * Commands throw OpenwtError for failures the user can understand and fix.
 * Unexpected errors (bugs) are not wrapped — they bubble up as uncaught.
 */
export class OpenwtError extends Error {
    suggestion;
    name = 'OpenwtError';
    constructor(message, suggestion) {
        super(message);
        this.suggestion = suggestion;
    }
}
//# sourceMappingURL=types.js.map
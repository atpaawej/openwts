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
export declare function createNodeOutput(): Output;
/** Test-only — captures output for assertions */
export declare function createCaptureOutput(): {
    output: Output;
    captured: {
        info: string[];
        error: string[];
        warn: string[];
        success: string[];
        tables: Record<string, string>[][];
    };
};
//# sourceMappingURL=output.d.ts.map
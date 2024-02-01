/**
 * Type definitions for IDE Service Protocol
 */
export namespace IDEService {
    export interface Position {
        line: number; // 0-based
        character: number; // 0-based
    }

    export interface Range {
        start: Position;
        end: Position;
    }

    export interface SymbolNode {
        name: string;
        kind: string; 
        range: Range;
        children: SymbolNode[];
    }
}

/**
 * Domain types for LSP metadata as consumed by Monaco-side language helpers
 * (tokenizer, completion provider, hover provider, signature help).
 *
 * These are intentionally decoupled from the JSON-RPC transport types in
 * `@/api/repository/lsp` so the Monaco layer never imports transport details.
 *
 * The transport returns a loosely-typed `any` for `lsp.metadata` (see Phase 2);
 * normalization into this shape happens at the consumption boundary
 * (`metadata.ts`, `tokens.ts`, future completion/hover providers).
 */

export interface LspKeywordInfo {
    name: string;
    description?: string;
}

export interface LspParameterInfo {
    name: string;
    type?: string;
    description?: string;
    optional?: boolean;
}

export interface LspSignatureInfo {
    signature: string;
    description?: string;
    parameters?: LspParameterInfo[];
}

export interface LspSymbolInfo {
    name: string;
    kind?: string;
    description?: string;
    signature?: string;
    examples?: string[];
}

export interface LspModuleInfo {
    name: string;
    description?: string;
    symbols?: LspSymbolInfo[];
}

export interface LspMetadata {
    keywords?: LspKeywordInfo[];
    symbols?: LspSymbolInfo[];
    modules?: LspModuleInfo[];
    signatures?: Record<string, LspSignatureInfo>;
}

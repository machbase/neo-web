/**
 * LSP named wrappers over the JSON-RPC 2.0 primitive (`callJsonRpc`).
 *
 * Each wrapper exposes a single LSP method (`lsp.diagnostics`, `lsp.completion`,
 * `lsp.hover`, `lsp.signature`, `lsp.metadata`) with a typed request shape and
 * a normalized `{ success, reason, data }` response so callers can stay decoupled
 * from JSON-RPC envelope details.
 *
 * Transport is WebSocket-only (see `rpc.ts`). Any JSON-RPC error response is
 * surfaced as `RpcTransportError` for consistency with transport-level failures
 * — callers should not have to distinguish "no socket" from "server returned
 * an error envelope" at this layer.
 */

import { callJsonRpc, RpcMethod, RpcTransportError } from '@/api/repository/rpc';

export type LspLanguage = 'sql' | 'tql' | 'jsh';

export interface LspPosition {
    line: number;
    column: number;
}

export interface LspRange {
    start: LspPosition;
    end: LspPosition;
}

export interface LspDiagnostic {
    range: LspRange;
    severity: number;
    code?: string;
    source?: string;
    message: string;
}

export interface LspCompletionItem {
    label: string;
    kind: number;
    detail?: string;
    documentation?: string;
    insertText?: string;
}

export interface LspHover {
    range: LspRange;
    contents: string;
}

export interface LspParameterInfo {
    label: string;
    documentation?: string;
}

export interface LspSignatureInfo {
    label: string;
    documentation?: string;
    parameters?: LspParameterInfo[];
}

export interface LspSignatureHelp {
    signatures: LspSignatureInfo[];
    activeSignature: number;
    activeParameter: number;
}

export interface LspRequest {
    language: LspLanguage;
    uri: string;
    text: string;
    position?: LspPosition;
}

export interface LspResponse<T> {
    success: true;
    reason: 'success';
    data: T;
}

/**
 * Internal helper: issue a JSON-RPC call and normalize the response.
 *
 * - On `response.error`, throws `RpcTransportError` (NOT plain `Error`) so all
 *   LSP transport/server failures share a single error type.
 * - On success, returns `{ success: true, reason: 'success', data: result ?? {} }`.
 */
const callLspRpc = async <T>(
    method: string,
    params: any[],
    signal?: AbortSignal
): Promise<LspResponse<T>> => {
    const response = await callJsonRpc<T>(method, params, { signal });
    if (response?.error) {
        throw new RpcTransportError(
            response.error.message || `JSON-RPC error ${response.error.code}`
        );
    }
    return {
        success: true,
        reason: 'success',
        data: (response?.result ?? ({} as T)) as T,
    };
};

export const postLspDiagnostics = (aData: LspRequest, signal?: AbortSignal) =>
    callLspRpc<{ diagnostics: LspDiagnostic[] }>(RpcMethod.lsp.diagnostics, [aData], signal);

export const postLspCompletion = (aData: LspRequest, signal?: AbortSignal) =>
    callLspRpc<{ items: LspCompletionItem[] }>(RpcMethod.lsp.completion, [aData], signal);

export const postLspHover = (aData: LspRequest, signal?: AbortSignal) =>
    callLspRpc<{ hover?: LspHover }>(RpcMethod.lsp.hover, [aData], signal);

export const postLspSignatureHelp = (aData: LspRequest, signal?: AbortSignal) =>
    callLspRpc<{ signatureHelp?: LspSignatureHelp }>(RpcMethod.lsp.signature, [aData], signal);

export const getLspMetadata = (language: LspLanguage, signal?: AbortSignal) =>
    callLspRpc<any>(RpcMethod.lsp.metadata, [{ language }], signal);

import { callJsonRpc } from '@/api/repository/rpc';

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

interface LspRequest {
    language: LspLanguage;
    uri: string;
    text: string;
    position?: LspPosition;
}

const lspHeaders = { 'X-Console-Log-Level': 'NONE' };

const callLspRpc = async <T>(method: string, params: any[], signal?: AbortSignal) => {
    const response = await callJsonRpc<T>(method, params, { headers: lspHeaders, signal });
    if (response?.error) {
        throw new Error(response.error.message || `JSON-RPC error ${response.error.code}`);
    }
    return {
        success: true,
        reason: 'success',
        data: response?.result ?? {},
    };
};

export const postLspDiagnostics = async (aData: LspRequest, signal?: AbortSignal) => {
    return callLspRpc<{ diagnostics: LspDiagnostic[] }>('lsp.diagnostics', [aData], signal);
};

export const postLspCompletion = async (aData: LspRequest, signal?: AbortSignal) => {
    return callLspRpc<{ items: LspCompletionItem[] }>('lsp.completion', [aData], signal);
};

export const postLspHover = async (aData: LspRequest, signal?: AbortSignal) => {
    return callLspRpc<{ hover?: LspHover }>('lsp.hover', [aData], signal);
};

export const postLspSignatureHelp = async (aData: LspRequest, signal?: AbortSignal) => {
    return callLspRpc<{ signatureHelp?: LspSignatureHelp }>('lsp.signature', [aData], signal);
};

export const getLspMetadata = async (language: LspLanguage, signal?: AbortSignal) => {
    return callLspRpc('lsp.metadata', [{ language }], signal);
};

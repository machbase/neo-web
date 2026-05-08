import request from '@/api/core';

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

interface LspRequest {
    language: LspLanguage;
    uri: string;
    text: string;
    position?: LspPosition;
}

const lspHeaders = { 'X-Console-Log-Level': 'NONE' };

export const postLspDiagnostics = async (aData: LspRequest, signal?: AbortSignal) => {
    return request({
        method: 'POST',
        url: '/api/lsp/diagnostics',
        data: aData,
        headers: lspHeaders,
        signal,
    });
};

export const postLspCompletion = async (aData: LspRequest, signal?: AbortSignal) => {
    return request({
        method: 'POST',
        url: '/api/lsp/completion',
        data: aData,
        headers: lspHeaders,
        signal,
    });
};

export const postLspHover = async (aData: LspRequest, signal?: AbortSignal) => {
    return request({
        method: 'POST',
        url: '/api/lsp/hover',
        data: aData,
        headers: lspHeaders,
        signal,
    });
};

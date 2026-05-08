export interface LspKeywordInfo {
    label: string;
    category?: string;
    detail?: string;
    documentation?: string;
}

export interface LspSignatureInfo {
    label: string;
    documentation?: string;
    parameters?: LspParameterInfo[];
}

export interface LspParameterInfo {
    label: string;
    documentation?: string;
}

export interface LspSymbolInfo {
    label: string;
    kind: number;
    category?: string;
    detail?: string;
    documentation?: string;
    insertText?: string;
    statementKind?: string;
    signature?: LspSignatureInfo;
    deprecated?: boolean;
}

export interface LspModuleInfo {
    id: string;
    detail?: string;
    documentation?: string;
    exports?: LspSymbolInfo[];
}

export interface LspMetadata {
    language: string;
    version: string;
    keywords: LspKeywordInfo[];
    symbols: LspSymbolInfo[];
    modules?: LspModuleInfo[];
}

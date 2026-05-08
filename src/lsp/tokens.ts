import type * as Monaco from 'monaco-editor';
import { loadLspMetadata } from '@/lsp/metadata';

export const TQL_BASE_KEYWORDS = [
    'FAKE',
    'SQL',
    'CSV',
    'JSON',
    'MARKDOWN',
    'MAPVALUE',
    'MAPKEY',
    'FILTER',
    'GROUPBY',
    'SCRIPT',
    'CHART',
    'SHELL',
    'INSERT',
    'APPEND',
    'DISCARD',
    'WHEN',
    'ELSE',
    'INCLUDE',
];

export const registerTqlTokens = (monaco: typeof Monaco, languageId: string, keywords: string[] = []) => {
    monaco.languages.setMonarchTokensProvider(languageId, {
        ignoreCase: true,
        keywords: uniqueKeywords([...TQL_BASE_KEYWORDS, ...keywords]),
        tokenizer: {
            root: [
                [/\/\/.*$/, 'comment'],
                [/`[^`]*`/, 'string'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*'/, 'string'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"([^"\\]|\\.)*"/, 'string'],
                [/\b\d+(\.\d+)?\b/, 'number'],
                [/[a-zA-Z_][\w]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                [/[{}()[\]]/, '@brackets'],
                [/[,:]/, 'delimiter'],
                [/[+\-*/%<>=!&|^~?]+/, 'operator'],
            ],
        },
    });
};

export const bindTqlMetadataTokens = (monaco: typeof Monaco, languageId: string) => {
    loadLspMetadata('tql')
        .then((metadata) => {
            if (!metadata) return;
            registerTqlTokens(
                monaco,
                languageId,
                metadata.keywords.map((keyword) => keyword.label)
            );
        })
        .catch(() => undefined);
};

const uniqueKeywords = (keywords: string[]) => Array.from(new Set(keywords.filter(Boolean)));

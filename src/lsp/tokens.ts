/**
 * Monaco Monarch tokenizer registration for TQL.
 *
 * Two-phase keyword loading:
 *  1. `registerTqlTokens(monaco, languageId)` is called synchronously at
 *     language registration time so the editor renders with a usable base
 *     keyword set immediately (no flash of un-highlighted source).
 *  2. `bindTqlMetadataTokens(monaco, languageId)` fires an async
 *     `loadLspMetadata('tql')` and, when metadata arrives, re-registers the
 *     tokenizer with `BASE + server keywords` merged. Monaco safely accepts
 *     a second `setMonarchTokensProvider` call for the same language.
 *
 * Failures of the metadata request are swallowed — the base keyword set
 * remains the source of truth for highlighting in that case.
 */

import type * as Monaco from 'monaco-editor';
import { loadLspMetadata } from '@/lsp/metadata';

export const TQL_BASE_KEYWORDS: readonly string[] = [
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
    'TAKE',
    'DROP',
];

const uniqueKeywords = (keywords: string[]): string[] =>
    Array.from(new Set(keywords.filter(Boolean)));

export const registerTqlTokens = (
    monaco: typeof Monaco,
    languageId: string,
    extraKeywords: string[] = []
) => {
    monaco.languages.setMonarchTokensProvider(languageId, {
        ignoreCase: true,
        keywords: uniqueKeywords([...TQL_BASE_KEYWORDS, ...extraKeywords]),
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

export const bindTqlMetadataTokens = async (monaco: typeof Monaco, languageId: string) => {
    try {
        const metadata = await loadLspMetadata('tql');
        const extraKeywords = (metadata.keywords ?? [])
            .map((keyword) => keyword?.name)
            .filter((name): name is string => typeof name === 'string' && name.length > 0);
        registerTqlTokens(monaco, languageId, extraKeywords);
    } catch {
        // Metadata fetch failed — leave the base tokenizer in place.
    }
};

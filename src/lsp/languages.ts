import type * as Monaco from 'monaco-editor';

export const TQL_LANGUAGE_ID = 'tql';

let sRegistered = false;

export const registerLspLanguages = (monaco: typeof Monaco) => {
    if (sRegistered) return;
    sRegistered = true;

    monaco.languages.register({ id: TQL_LANGUAGE_ID, extensions: ['.tql'], aliases: ['TQL', 'tql'] });
    monaco.languages.setMonarchTokensProvider(TQL_LANGUAGE_ID, {
        ignoreCase: true,
        keywords: [
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
        ],
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

import type * as Monaco from 'monaco-editor';
import { conf as javascriptConf, language as javascriptLanguage } from 'monaco-editor/esm/vs/basic-languages/javascript/javascript';

export const TQL_LANGUAGE_ID = 'tql';
export const JSH_LANGUAGE_ID = 'jsh';

const JSH_GLOBALS = ['require', 'console', 'process', 'Buffer', 'URL'];

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

    monaco.languages.register({ id: JSH_LANGUAGE_ID, extensions: ['.js'], aliases: ['JSH', 'jsh'] });
    monaco.languages.setLanguageConfiguration(JSH_LANGUAGE_ID, javascriptConf);
    monaco.languages.setMonarchTokensProvider(JSH_LANGUAGE_ID, {
        ...javascriptLanguage,
        tokenPostfix: '.jsh',
        keywords: [...new Set([...(javascriptLanguage.keywords ?? []), ...JSH_GLOBALS])],
    });
};

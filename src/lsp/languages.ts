/**
 * Monaco language registration entry point for TQL and JSH.
 *
 * Why this lives in `src/lsp/` rather than `src/plugin/monaco.ts`:
 *   - TQL/JSH are LSP-driven languages (metadata, completion, hover, signature
 *     help). Co-locating registration with the LSP integration keeps the
 *     "everything Monaco needs to know about TQL/JSH" surface in one folder.
 *   - The generic Monaco worker setup in `plugin/monaco.ts` stays focused on
 *     workers and built-in languages.
 *
 * `sRegistered` guards against double registration in the face of:
 *   - React StrictMode double-mount
 *   - Vite HMR re-imports
 *   - Multiple Monaco editor mounts on the same page
 * `monaco.languages.register` is NOT idempotent — calling it twice with the
 * same id leaks the second registration, so we gate it explicitly.
 */

import type * as Monaco from 'monaco-editor';
import { bindTqlMetadataTokens, registerTqlTokens } from '@/lsp/tokens';

export const TQL_LANGUAGE_ID = 'tql';
export const JSH_LANGUAGE_ID = 'jsh';

/**
 * JSH-specific globals that are not part of vanilla JavaScript keywords but
 * should highlight as such inside JSH scripts (the JSH runtime exposes them
 * as ambient globals).
 */
export const JSH_GLOBALS: readonly string[] = [
    'require',
    'module',
    'exports',
    'console',
    'process',
    'Buffer',
    'global',
    'globalThis',
    '__dirname',
    '__filename',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
];

const JS_KEYWORDS: readonly string[] = [
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'null',
    'of',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'async',
    'await',
];

let sRegistered = false;

/**
 * Idempotently register TQL and JSH with the given Monaco namespace.
 *
 * Safe to call multiple times — the first call wins, subsequent calls are
 * no-ops. Callers should invoke this once at editor bootstrap (e.g. from
 * `<Editor beforeMount={registerLspLanguages}>`).
 */
export const registerLspLanguages = (monaco: typeof Monaco) => {
    if (sRegistered) return;

    // --- TQL ---------------------------------------------------------------
    monaco.languages.register({
        id: TQL_LANGUAGE_ID,
        extensions: ['.tql'],
        aliases: ['TQL', 'tql'],
    });
    registerTqlTokens(monaco, TQL_LANGUAGE_ID);
    // Fire-and-forget: server metadata refines the keyword set, but the base
    // tokens above are already active so the editor is usable immediately.
    void bindTqlMetadataTokens(monaco, TQL_LANGUAGE_ID);

    // --- JSH ---------------------------------------------------------------
    monaco.languages.register({
        id: JSH_LANGUAGE_ID,
        extensions: ['.jsh'],
        aliases: ['JSH', 'jsh'],
    });
    monaco.languages.setMonarchTokensProvider(JSH_LANGUAGE_ID, {
        defaultToken: 'invalid',
        tokenPostfix: '.jsh',
        keywords: Array.from(new Set([...JS_KEYWORDS, ...JSH_GLOBALS])),
        operators: [
            '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
            '*', '/', '%', '++', '--', '<<', '</', '>>', '>>>', '&', '|',
            '^', '!', '~', '&&', '||', '??', '?', ':', '=', '+=', '-=',
            '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '^=',
            '@',
        ],
        symbols: /[=><!~?:&|+\-*/^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        tokenizer: {
            root: [
                [
                    /[a-zA-Z_$][\w$]*/,
                    { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
                ],
                { include: '@whitespace' },
                [/[{}()[\]]/, '@brackets'],
                [/[<>](?!@symbols)/, '@brackets'],
                [
                    /@symbols/,
                    { cases: { '@operators': 'delimiter', '@default': '' } },
                ],
                [/\d+\.\d+([eE][-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                [/\d+/, 'number'],
                [/[;,.]/, 'delimiter'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string_double'],
                [/'/, 'string', '@string_single'],
                [/`/, 'string', '@string_backtick'],
            ],
            whitespace: [
                [/[ \t\r\n]+/, ''],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment'],
            ],
            comment: [
                [/[^/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[/*]/, 'comment'],
            ],
            string_double: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop'],
            ],
            string_single: [
                [/[^\\']+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/'/, 'string', '@pop'],
            ],
            string_backtick: [
                [/[^\\`$]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/`/, 'string', '@pop'],
            ],
        },
    });

    sRegistered = true;
};

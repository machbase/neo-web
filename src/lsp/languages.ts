import type * as Monaco from 'monaco-editor';
import { conf as javascriptConf, language as javascriptLanguage } from 'monaco-editor/esm/vs/basic-languages/javascript/javascript';
import { bindTqlMetadataTokens, registerTqlTokens } from '@/lsp/tokens';

export const TQL_LANGUAGE_ID = 'tql';
export const JSH_LANGUAGE_ID = 'jsh';

const JSH_GLOBALS = ['require', 'console', 'process', 'Buffer', 'URL'];

let sRegistered = false;

export const registerLspLanguages = (monaco: typeof Monaco) => {
    if (sRegistered) return;
    sRegistered = true;

    monaco.languages.register({ id: TQL_LANGUAGE_ID, extensions: ['.tql'], aliases: ['TQL', 'tql'] });
    registerTqlTokens(monaco, TQL_LANGUAGE_ID);
    bindTqlMetadataTokens(monaco, TQL_LANGUAGE_ID);

    monaco.languages.register({ id: JSH_LANGUAGE_ID, extensions: ['.js'], aliases: ['JSH', 'jsh'] });
    monaco.languages.setLanguageConfiguration(JSH_LANGUAGE_ID, javascriptConf);
    monaco.languages.setMonarchTokensProvider(JSH_LANGUAGE_ID, {
        ...javascriptLanguage,
        tokenPostfix: '.jsh',
        keywords: [...new Set([...(javascriptLanguage.keywords ?? []), ...JSH_GLOBALS])],
    });
};

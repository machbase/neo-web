declare module '*.svg?react' {
    import React from 'react';
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export { ReactComponent };
    export default ReactComponent;
}

declare module '*.svg' {
    import React from 'react';
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export { ReactComponent };
    export default ReactComponent;
}

declare module 'monaco-editor/esm/vs/basic-languages/javascript/javascript' {
    import type * as Monaco from 'monaco-editor';

    export const conf: Monaco.languages.LanguageConfiguration;
    export const language: Monaco.languages.IMonarchLanguage;
}

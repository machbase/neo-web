/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_TAG_ANALYZER_VERSION: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module 'v3-infinite-loading';
declare module '*.vue' {
    import { DefineComponent } from 'vue';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

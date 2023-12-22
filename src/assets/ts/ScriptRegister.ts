const loadScript = (url: string) => {
    document?.getElementById('tmp-script')?.remove();
    return new Promise((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
        sScript.id = 'tmp-script';
        sScript.type = 'text/javascript';
        sScript.onload = resolve;
        sScript.onerror = reject;
        document.getElementsByTagName('head')[0].appendChild(sScript);
    });
};

const LOADED_COMMON_SCRIPTS = new Set();

export const ExistCommonScript = (aScripts?: string[]) => {
    const COMMON_SCRIPTS = Array.from(LOADED_COMMON_SCRIPTS);
    const sResult = aScripts?.filter((bScript: any) => {
        if (!COMMON_SCRIPTS.includes(bScript)) return bScript;
    });
    return sResult;
};

export const loadScriptsSequentially = async (scripts: { jsAssets: string[]; jsCodeAssets: string[] }) => {
    const sAddScript: string[] = scripts.jsAssets;
    for (const url of sAddScript.concat(scripts.jsCodeAssets)) {
        const sLoadResult: any = await loadScript(url);
        if (sLoadResult && sLoadResult.type === 'load' && sAddScript.includes(url)) LOADED_COMMON_SCRIPTS.add(url);
    }
};

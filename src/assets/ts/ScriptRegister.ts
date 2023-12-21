const loadScript = (url: string) => {
    document?.getElementById('tmp-script')?.remove();
    return new Promise((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
        sScript.id = LOADED_COMMON_SCRIPTS.includes(url) ? 'common-script' : 'tmp-script';
        sScript.type = 'text/javascript';
        sScript.onload = resolve;
        sScript.onerror = reject;
        document.getElementsByTagName('head')[0].appendChild(sScript);
    });
};

const LOADED_COMMON_SCRIPTS: string[] = [];

export const loadScriptsSequentially = async (scripts: { jsAssets: string[]; jsCodeAssets: string[] }) => {
    const sAddScripts: string[] = [];
    scripts.jsAssets.map((aAsset: string) => {
        if (!LOADED_COMMON_SCRIPTS.includes(aAsset)) {
            LOADED_COMMON_SCRIPTS.push(aAsset);
            sAddScripts.push(aAsset);
        }
    });
    for (const url of sAddScripts.concat(scripts.jsCodeAssets)) {
        await loadScript(url);
    }
};

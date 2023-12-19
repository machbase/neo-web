const JS_ASSETS_LIST: string[] = [];

const CheckScriptAssets = (assets: string) => {
    if (!JS_ASSETS_LIST.includes(assets)) {
        JS_ASSETS_LIST.push(assets);
        return true;
    } else return false;
};

const loadScript = (url: string) => {
    if (!CheckScriptAssets(url)) {
        if (document.getElementById(url)) document?.getElementById(url)?.remove();
    }
    return new Promise((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
        sScript.id = url;
        sScript.type = 'text/javascript';
        sScript.onload = resolve;
        sScript.onerror = reject;
        document.getElementsByTagName('head')[0].appendChild(sScript);
    });
};

export const loadScriptsSequentially = async (scriptUrls: string[]) => {
    for (const url of scriptUrls) {
        await loadScript(url);
    }
};

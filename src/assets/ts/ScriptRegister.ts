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

export const loadScriptsSequentially = async (scriptUrls: string[]) => {
    for (const url of scriptUrls) {
        await loadScript(url);
    }
};

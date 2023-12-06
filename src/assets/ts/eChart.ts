const sScriptFileUrl = [
    `/web/echarts/echarts.min.js`,
    `/web/echarts/echarts@4.min.js`,
    `/web/echarts/echarts-gl.min.js`,
    `/web/echarts/echarts-liquidfill.min.js`,
    `/web/echarts/echarts-wordcloud.min.js`,
    '/web/echarts/themes/essos.js',
    '/web/echarts/themes/chalk.js',
    '/web/echarts/themes/purple-passion.js',
    '/web/echarts/themes/romantic.js',
    '/web/echarts/themes/walden.js',
    '/web/echarts/themes/westeros.js',
    '/web/echarts/themes/wonderland.js',
    '/web/echarts/themes/vintage.js',
    '/web/echarts/themes/dark.js',
    '/web/echarts/themes/macarons.js',
    '/web/echarts/themes/infographic.js',
    '/web/echarts/themes/shine.js',
    '/web/echarts/themes/roma.js',
];

const loadScript = (url: string) => {
    return new Promise((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
        sScript.type = 'text/javascript';
        sScript.onload = resolve;
        sScript.onerror = reject;
        document.getElementsByTagName('head')[0].appendChild(sScript);
    });
};

const loadScriptsSequentially = async (scriptUrls: string[]) => {
    for (const url of scriptUrls) {
        await loadScript(url);
    }
};

loadScriptsSequentially(sScriptFileUrl);

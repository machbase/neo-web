const sScriptFileUrl = [
    `/web/echarts/echarts.min.js`,
    `/web/echarts/echarts-gl.min.js`,
    `/web/echarts/echarts-liquidfill.min.js`,
    `/web/echarts/echarts-wordcloud.min.js`,
    '/web/echarts/themes/essos.js',
    '/web/echarts/themes/chalk.js',
    '/web/echarts/themes/infographic.js',
    '/web/echarts/themes/macarons.js',
    '/web/echarts/themes/purple-passion.js',
    '/web/echarts/themes/shine.js',
    '/web/echarts/themes/roma.js',
    '/web/echarts/themes/romantic.js',
    '/web/echarts/themes/vintage.js',
    '/web/echarts/themes/walden.js',
    '/web/echarts/themes/westeros.js',
    '/web/echarts/themes/wonderland.js',
];
const divScripts = document.getElementsByTagName('head')[0];

sScriptFileUrl.forEach((aItem, aIdx) => {
    const sScript = document.createElement('script');
    sScript.src = aItem;
    sScript.type = 'text/javascript';
    // sScript.async = true;
    setTimeout(() => {
        divScripts.appendChild(sScript);
    }, aIdx * 50);
});

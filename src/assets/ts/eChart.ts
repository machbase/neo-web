// const sScriptFileUrl = [
//     `/web/echarts/echarts.min.js`,
//     `/web/echarts/echarts@4.min.js`,
//     `/web/echarts/echarts-gl.min.js`,
//     `/web/echarts/echarts-liquidfill.min.js`,
//     `/web/echarts/echarts-wordcloud.min.js`,
//     '/web/echarts/themes/essos.js',
//     '/web/echarts/themes/chalk.js',
//     '/web/echarts/themes/purple-passion.js',
//     '/web/echarts/themes/romantic.js',
//     '/web/echarts/themes/walden.js',
//     '/web/echarts/themes/westeros.js',
//     '/web/echarts/themes/wonderland.js',
//     '/web/echarts/themes/vintage.js',
//     '/web/echarts/themes/dark.js',
//     '/web/echarts/themes/macarons.js',
//     '/web/echarts/themes/infographic.js',
//     '/web/echarts/themes/shine.js',
//     '/web/echarts/themes/roma.js',
// ];
const JS_ASSETS_LIST: string[] = [];
const ECHART_PATH_REGEX = new RegExp('^/web/echarts', 'm');

const CheckAssets = (assets: string) => {
    if (!JS_ASSETS_LIST.includes(assets) && !assets.includes('-.') && ECHART_PATH_REGEX.test(assets.toString())) {
        JS_ASSETS_LIST.push(assets);
        return true;
    } else return false;
};

const loadScript = (url: string) => {
    if (!CheckAssets(url)) return;
    return new Promise((resolve, reject) => {
        const sScript = document.createElement('script');
        sScript.src = url;
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

// loadScriptsSequentially(sScriptFileUrl);

const sScriptFileUrl = [`/web/echarts/echarts.min.js`, `/web/echarts/echarts-gl.min.js`, `/web/echarts/echarts-liquidfill.min.js`, `/web/echarts/echarts-wordcloud.min.js`];
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

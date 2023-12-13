import { loadScriptsSequentially } from '@/assets/ts/eChart';

const JS_ASSETS_LIST: string[] = [];

const showChart = (aData: any, sTheme: string) => {
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return;
};

const CheckAssets = (assets: string[]) => {
    const newAssets: string[] = [];
    assets.map((aAssets: string) => {
        if (!JS_ASSETS_LIST.includes(aAssets)) {
            JS_ASSETS_LIST.push(aAssets);
            newAssets.push(aAssets);
        }
    });
    return newAssets;
};

export const drawChart = async (aData: any, sTheme: string) => {
    // aData.jsAssets
    aData.jsAssets && (await loadScriptsSequentially(CheckAssets(aData.jsAssets)));
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    aData.chartAction && goecharts_aibQDdRJHYEs.dispatchAction(aData.chartAction);
    return goecharts_aibQDdRJHYEs;
};

export const reSizeChart = (aTargetDiv: any, aSizes: any) => {
    if (aTargetDiv) {
        aTargetDiv.resize(aSizes);
    }
};

export default showChart;

import { loadScriptsSequentially } from '@/assets/ts/eChart';

const showChart = (aData: any, sTheme: string) => {
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return;
};

export const drawChart = async (aData: any, sTheme: string) => {
    let goecharts_aibQDdRJHYEs = undefined;
    if (aData && aData.jsAssets) {
        await loadScriptsSequentially(aData.jsAssets);
        // @ts-ignore
        goecharts_aibQDdRJHYEs = await echarts.init(document.getElementById(aData.chartID), sTheme);
    } else {
        // @ts-ignore
        goecharts_aibQDdRJHYEs = await echarts.init(document.getElementById(aData.chartID), sTheme);
    }

    await goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    aData.chartAction && (await goecharts_aibQDdRJHYEs.dispatchAction(aData.chartAction));
    return goecharts_aibQDdRJHYEs;
};

export const reSizeChart = (aTargetDiv: any, aSizes: any) => {
    if (aTargetDiv) {
        aTargetDiv.resize(aSizes);
    }
};

export default showChart;

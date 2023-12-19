/* eslint-disable @typescript-eslint/ban-ts-comment */
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

const showChart = (aData: any, sTheme: string) => {
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return;
};

export const drawChart = async (aData: any, sTheme: string) => {
    let DynamicChartInfo: any = undefined;
    // let goecharts_aibQDdRJHYEs = undefined;
    if (aData && aData.jsAssets) {
        await loadScriptsSequentially(aData.jsAssets);
        if (aData && aData.jsCodeAssets) {
            // @ts-ignore
            await loadScriptsSequentially(aData.jsCodeAssets);
            // aData.jsCodeAssets.map(async (aCode: string, aIdx: number) => {
            //     // @ts-ignore
            //     await loadScriptsSequentially([aCode], () => window[`${aData.chartID}`][`customfunc${aIdx}`](echarts.init(document.getElementById(aData.chartID))));
            //     // await window[`${aData.chartID}`][`customfunc${aIdx}`](echarts.init(document.getElementById(aData.chartID)));
            // });
        }
        // @ts-ignore
        DynamicChartInfo = echarts.init(document.getElementById(aData.chartID), sTheme);
    } else {
        // @ts-ignore
        DynamicChartInfo = echarts.init(document.getElementById(aData.chartID), sTheme);
    }
    // await DynamicChartInfo.setOption(aData.chartOption);
    // aData.chartAction && (await DynamicChartInfo.dispatchAction(aData.chartAction));
    return DynamicChartInfo;
};

export const reSizeChart = (aTargetDiv: any, aSizes: any) => {
    if (aTargetDiv) {
        aTargetDiv.resize(aSizes);
    }
};

export default showChart;

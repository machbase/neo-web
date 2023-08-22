const showChart = (aData: any, sTheme: string) => {
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return;
};

export const drawChart = (aData: any, sTheme: string) => {
    // @ts-ignore
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return goecharts_aibQDdRJHYEs;
};

export const reSizeChart = (aTargetDiv: any, aSizes: any) => {
    if (aTargetDiv) {
        aTargetDiv.resize(aSizes);
    }
};

export default showChart;

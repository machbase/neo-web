const showChart = (aData: any, sTheme: string) => {
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), sTheme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
    return;
};
export default showChart;

const showChart = (aData: any) => {
    const goecharts_aibQDdRJHYEs = echarts.init(document.getElementById(aData.chartID), aData.theme);

    goecharts_aibQDdRJHYEs.setOption(aData.chartOption);
};
export default showChart;

import ReactECharts from 'echarts-for-react';
import { buildOverlapChartOption } from '../panel/PanelEChartUtil';
import type { TagAnalyzerYN } from '../panel/TagAnalyzerPanelModelTypes';

// Draws the actual overlap comparison graph for the selected panels.
// It normalizes timestamps, computes axis bounds, and renders the shared tooltip/legend view.
const OverlapChart = ({
    pChartState,
    pChartRefs,
}: {
    pChartState: {
        chartData: any;
        startTimeList: any;
        zeroBase: TagAnalyzerYN;
    };
    pChartRefs: {
        areaChart: any;
        chartRef: any;
    };
}) => {
    const chartWidth = pChartRefs.areaChart.current.clientWidth;

    return (
        <ReactECharts
            ref={pChartRefs.chartRef}
            option={buildOverlapChartOption({
                chartData: pChartState.chartData,
                startTimeList: pChartState.startTimeList,
                zeroBase: pChartState.zeroBase === 'Y',
            })}
            notMerge
            lazyUpdate
            style={{ width: chartWidth ? `${chartWidth - 10}px` : '100%', height: 300 }}
            opts={{ renderer: 'canvas' }}
        />
    );
};
export default OverlapChart;

import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { buildOverlapChartOptions } from './OverlapChartUtil';
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
        <HighchartsReact
            ref={pChartRefs.chartRef}
            highcharts={Highcharts}
            options={buildOverlapChartOptions(pChartState.chartData, pChartState.startTimeList, pChartState.zeroBase === 'Y', chartWidth)}
        />
    );
};
export default OverlapChart;

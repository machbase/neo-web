import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { buildOverlapChartOptions } from './OverlapChartUtil';
import type { TagAnalyzerYN } from '../panel/TagAnalyzerPanelModelTypes';

// Draws the actual overlap comparison graph for the selected panels.
// It normalizes timestamps, computes axis bounds, and renders the shared tooltip/legend view.
const OverlapChart = ({
    pChartModel,
    pChartRefs,
}: {
    pChartModel: {
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
            options={buildOverlapChartOptions(pChartModel.chartData, pChartModel.startTimeList, pChartModel.zeroBase === 'Y', chartWidth)}
        />
    );
};
export default OverlapChart;

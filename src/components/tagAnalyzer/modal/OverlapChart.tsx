import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { buildOverlapChartOptions } from './OverlapChartUtil';
import type { TagAnalyzerYN } from '../panel/TagAnalyzerPanelTypes';

// Draws the actual overlap comparison graph for the selected panels.
// It normalizes timestamps, computes axis bounds, and renders the shared tooltip/legend view.
const OverlapChart = ({
    pChartData,
    pStartTimeList,
    pZeroBase,
    pAreaChart,
    pChartRef,
}: {
    pChartData: any;
    pStartTimeList: any;
    pZeroBase: TagAnalyzerYN;
    pAreaChart: any;
    pChartRef: any;
}) => {
    const chartWidth = pAreaChart.current.clientWidth;

    return (
        <HighchartsReact
            ref={pChartRef}
            highcharts={Highcharts}
            options={buildOverlapChartOptions(pChartData, pStartTimeList, pZeroBase === 'Y', chartWidth)}
        />
    );
};
export default OverlapChart;

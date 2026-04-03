import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { buildOverlapChartOptions } from './OverlapChartUtil';

// Draws the actual overlap comparison graph for the selected panels.
// It normalizes timestamps, computes axis bounds, and renders the shared tooltip/legend view.
const OverlapChart = ({ pChartData, pStartTimeList, pPanelInfo, pAreaChart, pChartRef }: any) => {
    const chartWidth = pAreaChart.current.clientWidth;

    return (
        <HighchartsReact
            ref={pChartRef}
            highcharts={Highcharts}
            options={buildOverlapChartOptions(pChartData, pStartTimeList, pPanelInfo.zero_base === 'Y', chartWidth)}
        />
    );
};
export default OverlapChart;

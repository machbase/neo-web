import { render } from '@testing-library/react';
import OverlapChart from './OverlapChart';

let mockChartOptions: any;

jest.mock('highcharts/highstock', () => ({
    __esModule: true,
    default: {},
}));

jest.mock('highcharts-react-official', () => {
    const React = require('react');

    return {
        __esModule: true,
        default: React.forwardRef((aProps: any, _aRef: unknown) => {
            mockChartOptions = aProps.options;
            return <div data-testid="overlap-chart" />;
        }),
    };
});

describe('OverlapChart', () => {
    test('formats x-axis labels as elapsed time instead of dates', () => {
        render(
            <OverlapChart
                pChartData={[{ name: 'A', data: [[0, 1]], yAxis: 0 }]}
                pStartTimeList={[0]}
                pPanelInfo={{ zero_base: 'N' }}
                pAreaChart={{ current: { clientWidth: 800 } }}
                pChartRef={{ current: null }}
            />
        );

        const formatter = mockChartOptions.xAxis.labels.formatter;

        expect(formatter.call({ value: 0, axis: { tickInterval: 30 * 60 * 1000 } })).toBe('00:00');
        expect(formatter.call({ value: 25 * 60 * 60 * 1000, axis: { tickInterval: 60 * 60 * 1000 } })).toBe('25:00');
    });
});

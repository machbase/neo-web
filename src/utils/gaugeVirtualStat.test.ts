import { DashboardChartCodeParser } from './DashboardChartCodeParser';
import { DashboardQueryParser } from './DashboardQueryParser';
import { DefaultGaugeChartOption } from './eChartHelper';

const createTime = () => ({
    interval: {
        IntervalType: 'min',
        IntervalValue: 1,
    },
    start: 1745910581000,
    end: 1745914181000,
});

const createVirtualStatGaugeBlock = () => ({
    id: 'block-1',
    table: 'V$EXAMPLE_STAT',
    customTable: false,
    customFullTyping: {
        use: false,
        text: '',
    },
    time: '',
    type: 'tag',
    userName: 'SYS',
    name: 'NAME',
    tag: '',
    value: 'ROW_COUNT',
    aggregator: 'sum',
    alias: '',
    diff: 'none',
    useCustom: true,
    filter: [],
    values: [{ id: 'value-1', value: 'ROW_COUNT', jsonKey: '', aggregator: 'sum', alias: 'rows', diff: 'none' }],
    color: '#000000',
    tableInfo: [
        ['NAME', 5],
        ['ROW_COUNT', 20],
        ['MIN_TIME', 6],
        ['MAX_TIME', 6],
    ],
    math: '',
    isValidMath: true,
    duration: {
        from: '',
        to: '',
    },
    isVisible: true,
});

describe('Gauge virtual stat table flow', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('builds a NAME_VALUE query for a V$ stat table with ROW_COUNT selected', () => {
        const [queries] = DashboardQueryParser('gauge', 'NAME_VALUE' as any, [createVirtualStatGaugeBlock()], [], {}, [], createTime());

        expect(queries[0].sql).toContain('SELECT sum(ROW_COUNT) as VALUE FROM SYS.V$EXAMPLE_STAT');
        expect(queries[0].tql).toContain('MAPVALUE(1, dict("name", "rows", "value", value(0)))');
    });

    test('does not treat a zero gauge value as missing data', () => {
        const [queries] = DashboardQueryParser('gauge', 'NAME_VALUE' as any, [createVirtualStatGaugeBlock()], [], {}, [], createTime());
        const chartCode = DashboardChartCodeParser(DefaultGaugeChartOption, 'gauge', queries, '1.0.1');

        expect(chartCode).not.toContain('!(obj?.data?.rows?.[0]?.[0]?.value)');
    });

    test('renders a zero gauge response value instead of clearing series data', async () => {
        const [queries] = DashboardQueryParser('gauge', 'NAME_VALUE' as any, [createVirtualStatGaugeBlock()], [], {}, [], createTime());
        const chartCode = DashboardChartCodeParser(DefaultGaugeChartOption, 'gauge', queries, '1.0.1');
        const chartOption = {
            graphic: [] as any[],
            series: [
                {
                    axisLabel: {},
                    data: [],
                    detail: {},
                },
            ],
        };
        const chart = {
            getWidth: jest.fn(() => 300),
            setOption: jest.fn(),
        };
        const fetchMock = jest.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        success: true,
                        data: {
                            rows: [[{ name: 'rows', value: 0 }]],
                        },
                    }),
            })
        );

        new Function('_chartOption', '_chart', 'fetch', chartCode)(chartOption, chart, fetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(chartOption.series[0].data).toEqual([{ name: 'rows', value: 0 }]);
        expect(chartOption.graphic[0].style.text).toBe('');
        expect(chart.setOption).toHaveBeenLastCalledWith(chartOption);
    });

    test('renders a non-zero gauge response value', async () => {
        const [queries] = DashboardQueryParser('gauge', 'NAME_VALUE' as any, [createVirtualStatGaugeBlock()], [], {}, [], createTime());
        const chartCode = DashboardChartCodeParser(DefaultGaugeChartOption, 'gauge', queries, '1.0.1');
        const chartOption = {
            graphic: [] as any[],
            series: [
                {
                    axisLabel: {},
                    data: [],
                    detail: {},
                },
            ],
        };
        const chart = {
            getWidth: jest.fn(() => 300),
            setOption: jest.fn(),
        };
        const fetchMock = jest.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        success: true,
                        data: {
                            rows: [[{ name: 'rows', value: 42 }]],
                        },
                    }),
            })
        );

        new Function('_chartOption', '_chart', 'fetch', chartCode)(chartOption, chart, fetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(chartOption.series[0].data).toEqual([{ name: 'rows', value: 42 }]);
        expect(chartOption.graphic[0].style.text).toBe('');
        expect(chart.setOption).toHaveBeenLastCalledWith(chartOption);
    });
});

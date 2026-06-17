import { buildDataViewerChartXAxis, buildRawResultColumns, buildTagChartSeries, formatDataViewerAxisTime } from './dataViewerModel';

describe('data viewer chart helpers', () => {
    test('buildRawResultColumns keeps time name value first and appends extra fields', () => {
        const columns = buildRawResultColumns([
            {
                str_value: 'running',
                name: 'sensor.a',
                value: 12.5,
                time: '2026-06-01',
                quality: 'GOOD',
                buffer: ['internal'],
                names: ['TIME', 'NAME', 'VALUE'],
            },
            { extra_status: 'ok', name: 'sensor.a', value: 13.5, time: '2026-06-02' },
        ]);

        expect(columns.map((column) => column.key)).toEqual(['time', 'name', 'value', 'str_value', 'quality', 'extra_status']);
        expect(columns.map((column) => column.label)).toEqual(['Time', 'Name', 'Value', 'Str Value', 'Quality', 'Extra Status']);
    });

    test('buildRawResultColumns hides hierarchy metadata case-insensitively', () => {
        const columns = buildRawResultColumns(
            [
                {
                    time: '2026-06-01',
                    name: 'sensor.a',
                    value: 12.5,
                    ASSET_PATH: '{"city":"Seoul"}',
                    spec: '{"unit":"C"}',
                },
            ],
            { hiddenKeys: ['asset_path'] },
        );

        expect(columns.map((column) => column.key)).toEqual(['time', 'name', 'value', 'spec']);
    });

    test('buildTagChartSeries uses real time values and sorts points by time', () => {
        const series = buildTagChartSeries([
            { time: '2026-06-04T10:02:00Z', name: 'sensor.a', value: '12.5' },
            { time: '2026-06-04T10:00:00Z', name: 'sensor.a', value: '10.5' },
            { time: 'bad-time', name: 'sensor.a', value: '99' },
            { time: '2026-06-04T10:01:00Z', name: 'sensor.a', value: 'not-number' },
        ]);

        expect(series).toHaveLength(1);
        expect(series[0].name).toBe('sensor.a');
        expect(series[0].data).toEqual([
            [Date.parse('2026-06-04T10:00:00Z'), 10.5],
            [Date.parse('2026-06-04T10:02:00Z'), 12.5],
        ]);
    });

    test('buildDataViewerChartXAxis uses selected range instead of data extent', () => {
        const from = '2026-06-17T00:00:00.000Z';
        const to = '2026-06-17T00:10:00.000Z';
        const axis = buildDataViewerChartXAxis(
            [
                [Date.parse('2026-06-17T00:04:00.000Z'), 1],
                [Date.parse('2026-06-17T00:05:00.000Z'), 2],
            ],
            { from, to },
        );

        expect(axis.min).toBe(Date.parse(from));
        expect(axis.max).toBe(Date.parse(to));
        expect(axis.tickInterval).toBe(2 * 60 * 1000);
    });

    test('buildDataViewerChartXAxis falls back to data extent when range is empty', () => {
        const first = Date.parse('2026-06-17T00:04:00.000Z');
        const last = Date.parse('2026-06-17T00:05:00.000Z');
        const axis = buildDataViewerChartXAxis([
            [last, 2],
            [first, 1],
        ]);

        expect(axis.min).toBe(first);
        expect(axis.max).toBe(last);
    });

    test('formatDataViewerAxisTime uses compact labels based on visible range', () => {
        const value = Date.parse('2026-06-17T09:43:15.984Z');

        expect(
            formatDataViewerAxisTime(
                value,
                {
                    min: Date.parse('2026-06-17T09:40:00.000Z'),
                    max: Date.parse('2026-06-17T09:50:00.000Z'),
                },
                'UTC',
            ),
        ).toBe('09:43:15');
        expect(
            formatDataViewerAxisTime(
                value,
                {
                    min: Date.parse('2026-06-17T00:00:00.000Z'),
                    max: Date.parse('2026-06-17T12:00:00.000Z'),
                },
                'UTC',
            ),
        ).toBe('09:43');
        expect(
            formatDataViewerAxisTime(
                value,
                {
                    min: Date.parse('2026-06-01T00:00:00.000Z'),
                    max: Date.parse('2026-06-20T00:00:00.000Z'),
                },
                'UTC',
            ),
        ).toBe('06-17 09:43');
    });
});

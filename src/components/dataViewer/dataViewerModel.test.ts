import {
    buildDataViewerChartGroups,
    buildDataViewerChartXAxis,
    buildDataViewerEChartOption,
    buildDataViewerSplitGroups,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    buildRawResultColumns,
    buildTagChartSeries,
    extractDataViewerDataZoomRange,
    getDataViewerChartRangeMs,
    hasExplicitDataViewerDataZoomEventRange,
    isSameDataViewerChartRange,
    normalizeSelectedTagNames,
    toggleSelectedTagName,
    formatDataViewerAxisTime,
} from './dataViewerModel';

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

    test('buildDataViewerChartXAxis handles large point sets without stack overflow', () => {
        const first = Date.parse('2026-06-17T00:00:00.000Z');
        const points = Array.from({ length: 150000 }, (_, index) => [first + index * 1000, index % 100] as [number, number]);
        const axis = buildDataViewerChartXAxis(points);

        expect(axis.min).toBe(first);
        expect(axis.max).toBe(first + 149999 * 1000);
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

    test('normalizeSelectedTagNames keeps valid tags and falls back to first selectable tag', () => {
        const rows = [
            { type: 'tag' as const, id: 'a', label: 'sensor.a', depth: 0, name: 'sensor.a', parentIds: [] },
            { type: 'tag' as const, id: 'b', label: 'sensor.b', depth: 0, name: 'sensor.b', parentIds: [] },
            { type: 'tag' as const, id: 'c', label: 'sensor.c', depth: 0, name: 'sensor.c', parentIds: [] },
        ];

        expect(normalizeSelectedTagNames(['sensor.c', 'missing', 'sensor.a'], rows)).toEqual(['sensor.c', 'sensor.a']);
        expect(normalizeSelectedTagNames(['missing'], rows)).toEqual(['sensor.a']);
        expect(normalizeSelectedTagNames([], [])).toEqual([]);
    });

    test('toggleSelectedTagName removes existing tags or appends new tags', () => {
        expect(toggleSelectedTagName(['sensor.a', 'sensor.b'], 'sensor.a')).toEqual(['sensor.b']);
        expect(toggleSelectedTagName(['sensor.a'], 'sensor.b')).toEqual(['sensor.a', 'sensor.b']);
    });

    test('buildDataViewerChartGroups keeps default chart unless every tag is split', () => {
        expect(
            buildDataViewerChartGroups({
                selectedTagNames: ['sensor.a', 'sensor.b', 'sensor.c'],
                splitGroups: [{ id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'] }],
                globalRange: { from: 'now-1h', to: 'now' },
                splitRanges: { 'split:b': { from: '2026-06-01 00:00:00', to: '2026-06-01 01:00:00' } },
            }),
        ).toEqual([
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a', 'sensor.c'], range: { from: 'now-1h', to: 'now' }, split: false },
            { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: '2026-06-01 00:00:00', to: '2026-06-01 01:00:00' }, split: true },
        ]);

        expect(
            buildDataViewerChartGroups({
                selectedTagNames: ['sensor.a', 'sensor.b'],
                splitGroups: [
                    { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'] },
                    { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'] },
                ],
                globalRange: { from: 'now-1h', to: 'now' },
            }),
        ).toEqual([
            { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'], range: { from: 'now-1h', to: 'now' }, split: true },
            { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: 'now-1h', to: 'now' }, split: true },
        ]);
    });

    test('buildDataViewerSplitGroups creates one split chart per unassigned selected tag', () => {
        expect(
            buildDataViewerSplitGroups({
                tagNames: ['sensor.a', 'sensor.b', 'sensor.a', 'sensor.c'],
                selectedTagNames: ['sensor.a', 'sensor.b'],
                assignedTagNames: ['sensor.b'],
                createId: (name, index) => `split:${index}:${name}`,
            }),
        ).toEqual([{ id: 'split:0:sensor.a', title: 'sensor.a', tagNames: ['sensor.a'] }]);
    });

    test('buildDataViewerEChartOption creates a mini navigator and zoom controls target', () => {
        const option = buildDataViewerEChartOption({
            series: [
                {
                    name: 'sensor.a',
                    data: [
                        [Date.parse('2026-06-01T00:00:00Z'), 10],
                        [Date.parse('2026-06-01T00:01:00Z'), 11],
                    ],
                },
            ],
            timeRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T00:10:00.000Z' },
            timeZone: 'UTC',
        }) as any;

        expect(option.backgroundColor).toBe('#252525');
        expect(option.grid).toHaveLength(2);
        expect(option.xAxis).toHaveLength(3);
        expect(option.series[0].id).toBe('main-series-0');
        expect(option.series[1].id).toBe('navigator-series-0');
        expect(option.dataZoom.map((zoom: any) => zoom.type)).toEqual(['inside', 'slider']);
        expect(option.dataZoom.map((zoom: any) => zoom.xAxisIndex)).toEqual([[1], [1]]);
        expect(option.tooltip.appendToBody).toBe(true);
        expect(option.tooltip.extraCssText).toContain('max-width:260px');
        expect(typeof option.tooltip.position).toBe('function');
        expect(option.tooltip.position([240, 120], [], {} as HTMLElement, null, { contentSize: [220, 80], viewSize: [300, 220] })).toEqual([12, 132]);
    });

    test('data zoom helpers map slider percentages and wheel zoom around pointer', () => {
        expect(extractDataViewerDataZoomRange({ start: 20, end: 40 }, { startTime: 0, endTime: 100 }, { startTime: 1000, endTime: 2000 })).toEqual({
            startTime: 1200,
            endTime: 1400,
        });
        expect(hasExplicitDataViewerDataZoomEventRange({ batch: [{ startValue: 10, endValue: 20 }] })).toBe(true);
        expect(isSameDataViewerChartRange({ startTime: 10.4, endTime: 20.2 }, { startTime: 10.1, endTime: 20.9 })).toBe(true);

        const currentRange = { startTime: 200, endTime: 600 };
        const navigatorRange = { startTime: 0, endTime: 1000 };
        expect(buildDataViewerZoomControlRange('zoom-in', currentRange, navigatorRange, 0.4)).toEqual({ startTime: 360, endTime: 440 });
        expect(buildDataViewerZoomControlRange('zoom-out', currentRange, navigatorRange, 0.2)).toEqual({ startTime: 120, endTime: 680 });
        expect(buildDataViewerZoomControlRange('focus', currentRange, navigatorRange)).toEqual({ startTime: 360, endTime: 440 });
        expect(buildDataViewerWheelZoomRange(-100, 300, currentRange, navigatorRange)).toEqual({ startTime: 218, endTime: 546 });
        expect(buildDataViewerWheelZoomRange(100, 300, currentRange, navigatorRange)).toEqual({ startTime: 178, endTime: 666 });
    });

    test('getDataViewerChartRangeMs resolves explicit chart range before data extent', () => {
        const points: Array<[number, number]> = [
            [Date.parse('2026-06-01T00:00:00Z'), 10],
            [Date.parse('2026-06-01T00:10:00Z'), 20],
        ];

        expect(
            getDataViewerChartRangeMs(points, {
                from: '2026-06-01T00:01:00.000Z',
                to: '2026-06-01T00:02:00.000Z',
            }),
        ).toEqual({
            startTime: Date.parse('2026-06-01T00:01:00.000Z'),
            endTime: Date.parse('2026-06-01T00:02:00.000Z'),
        });
    });
});

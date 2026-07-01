import {
    buildDataViewerChartGroups,
    buildDataViewerChartXAxis,
    buildDataViewerEChartOption,
    buildDataViewerGlobalTimeUpdate,
    buildDataViewerTagAnalyzerRange,
    buildDataViewerTagAnalyzerTableName,
    buildDataViewerChartResultsFromRawRows,
    buildDataViewerRawPageTimeRange,
    buildDataViewerRawPageBounds,
    buildDataViewerRawPageRequest,
    buildDataViewerRawRowsPerTagChange,
    buildDataViewerDefaultChartShiftRawPageUpdate,
    buildDataViewerRawToChartRangeUpdate,
    buildDataViewerSplitRangeUpdate,
    buildDataViewerSplitGroups,
    buildDataViewerShiftMainRangeUpdate,
    buildDataViewerDragRangeUpdate,
    buildDataViewerTagSelectionUpdate,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    buildRawResultColumns,
    buildTagChartSeries,
    extractDataViewerDataZoomRange,
    getDataViewerChartRangeMs,
    getDataViewerRawPageSize,
    normalizeDataViewerRowsPerTag,
    hasDataViewerRawNextPage,
    hasExplicitDataViewerDataZoomEventRange,
    isSameDataViewerChartRange,
    normalizeSelectedTagNames,
    shouldFetchDataViewerRowsForMode,
    toggleSelectedTagName,
    formatDataViewerAxisTime,
    formatDataViewerNavigatorRangeLabels,
} from './dataViewerModel';

describe('data viewer chart helpers', () => {
    test('shouldFetchDataViewerRowsForMode keeps raw rows active for raw and chart', () => {
        expect(shouldFetchDataViewerRowsForMode('raw')).toBe(true);
        expect(shouldFetchDataViewerRowsForMode('chart')).toBe(true);
        expect(shouldFetchDataViewerRowsForMode('other')).toBe(false);
    });

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
            { TIME: '2026-06-04T10:03:00Z', NAME: 'sensor.b', VALUE: '20.5' },
        ]);

        expect(series).toHaveLength(2);
        expect(series[0].name).toBe('sensor.a');
        expect(series[0].data).toEqual([
            [Date.parse('2026-06-04T10:00:00Z'), 10.5],
            [Date.parse('2026-06-04T10:02:00Z'), 12.5],
        ]);
        expect(series[1].name).toBe('sensor.b');
        expect(series[1].data).toEqual([
            [Date.parse('2026-06-04T10:03:00Z'), 20.5],
        ]);
    });

    test('buildDataViewerChartResultsFromRawRows builds chart groups from visible raw rows', () => {
        const rows = [
            { TIME: '2026-06-25T05:10:00.000Z', NAME: 'sensor.a', VALUE: 1 },
            { time: '2026-06-25T05:10:01.000Z', name: 'sensor.b', value: 2 },
            { time: '2026-06-25T05:10:02.000Z', name: 'sensor.a', value: 3 },
        ];
        const chartGroups = [
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a', 'sensor.b'], range: { from: 'raw-from', to: 'raw-to' }, split: false },
            { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'], range: { from: 'split-from', to: 'split-to' }, split: true },
        ];

        expect(buildDataViewerChartResultsFromRawRows({ rows, chartGroups })).toEqual({
            default: {
                range: { from: 'raw-from', to: 'raw-to' },
                series: [
                    { name: 'sensor.a', data: [[Date.parse('2026-06-25T05:10:00.000Z'), 1], [Date.parse('2026-06-25T05:10:02.000Z'), 3]] },
                    { name: 'sensor.b', data: [[Date.parse('2026-06-25T05:10:01.000Z'), 2]] },
                ],
            },
            'split:a': {
                range: { from: 'split-from', to: 'split-to' },
                series: [
                    { name: 'sensor.a', data: [[Date.parse('2026-06-25T05:10:00.000Z'), 1], [Date.parse('2026-06-25T05:10:02.000Z'), 3]] },
                ],
            },
        });
    });

    test('buildDataViewerChartResultsFromRawRows can use split specific raw rows', () => {
        const parentRows = [
            { time: '2026-06-25T05:10:00.000Z', name: 'sensor.a', value: 1 },
            { time: '2026-06-25T05:10:01.000Z', name: 'sensor.b', value: 2 },
        ];
        const splitRows = [{ time: '2026-06-25T05:20:00.000Z', name: 'sensor.a', value: 10 }];
        const chartGroups = [
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a', 'sensor.b'], range: { from: 'parent-from', to: 'parent-to' }, split: false },
            { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'], range: { from: 'split-from', to: 'split-to' }, split: true },
        ];

        const results = buildDataViewerChartResultsFromRawRows({
            rows: parentRows,
            rowsByGroup: {
                'split:a': splitRows,
            },
            chartGroups,
        });

        expect(results.default.series.find((item) => item.name === 'sensor.a')?.data).toEqual([[Date.parse('2026-06-25T05:10:00.000Z'), 1]]);
        expect(results['split:a'].series[0].data).toEqual([[Date.parse('2026-06-25T05:20:00.000Z'), 10]]);
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

    test('formatDataViewerNavigatorRangeLabels renders mini chart boundary labels', () => {
        expect(
            formatDataViewerNavigatorRangeLabels(
                { startTime: Date.parse('2026-06-01T12:34:56.789Z'), endTime: Date.parse('2026-06-01T12:35:01.789Z') },
                'YYYY-MM-DD HH24:MI:SS.mmm',
                'UTC',
            ),
        ).toEqual({
            start: '2026-06-01 12:34:56.789',
            end: '2026-06-01 12:35:01.789',
        });
        expect(formatDataViewerNavigatorRangeLabels({}, 'YYYY-MM-DD HH24:MI:SS.mmm', 'UTC')).toEqual({ start: '', end: '' });
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

    test('getDataViewerRawPageSize uses configurable rows per selected tag', () => {
        expect(getDataViewerRawPageSize(['sensor.a'])).toBe(500);
        expect(getDataViewerRawPageSize(['sensor.a', 'sensor.b', 'sensor.c'])).toBe(1500);
        expect(getDataViewerRawPageSize([])).toBe(500);
        expect(getDataViewerRawPageSize(['sensor.a'], 100)).toBe(100);
        expect(getDataViewerRawPageSize(['sensor.a', 'sensor.b', 'sensor.c'], 100)).toBe(300);
        expect(getDataViewerRawPageSize([], 100)).toBe(100);
    });

    test('normalizeDataViewerRowsPerTag keeps positive integer values', () => {
        expect(normalizeDataViewerRowsPerTag('100', 1000)).toBe(100);
        expect(normalizeDataViewerRowsPerTag('100.9', 1000)).toBe(100);
        expect(normalizeDataViewerRowsPerTag('', 1000)).toBe(1000);
        expect(normalizeDataViewerRowsPerTag('0', 1000)).toBe(1000);
        expect(normalizeDataViewerRowsPerTag('abc', 1000)).toBe(1000);
    });

    test('buildDataViewerRawRowsPerTagChange resets raw paging to page one', () => {
        expect(
            buildDataViewerRawRowsPerTagChange({
                value: '100',
                currentRowsPerTag: 1000,
                selectedTagNames: ['sensor.a', 'sensor.b', 'sensor.c'],
            }),
        ).toEqual({
            rowsPerTag: 100,
            pageSize: 300,
            page: 1,
            rawPageRequest: { page: 1 },
        });
        expect(
            buildDataViewerRawRowsPerTagChange({
                value: '0',
                currentRowsPerTag: 1000,
                selectedTagNames: ['sensor.a'],
            }),
        ).toBeNull();
    });

    test('buildDataViewerRawPageTimeRange returns the current raw page time span', () => {
        expect(
            buildDataViewerRawPageTimeRange([
                { time: '2026-06-25T05:09:58.534Z', name: 'sensor.a' },
                { time: '2026-06-25T05:09:56.100Z', name: 'sensor.b' },
                { time: '2026-06-25T05:10:01.001Z', name: 'sensor.a' },
            ]),
        ).toEqual({
            from: '2026-06-25T05:09:56.100Z',
            to: '2026-06-25T05:10:01.001Z',
        });

        expect(
            buildDataViewerRawPageTimeRange([
                { TIME: '2026-06-25T05:09:58.534Z' },
                { Time: '2026-06-25T05:09:59.534Z' },
            ]),
        ).toEqual({
            from: '2026-06-25T05:09:58.534Z',
            to: '2026-06-25T05:09:59.534Z',
        });
    });

    test('buildDataViewerRawPageTimeRange ignores rows without valid time', () => {
        expect(buildDataViewerRawPageTimeRange([])).toBeNull();
        expect(buildDataViewerRawPageTimeRange([{ time: '' }, { time: 'not-a-date' }])).toBeNull();
    });

    test('buildDataViewerRawPageBounds returns first, last, and time range for the current page', () => {
        expect(
            buildDataViewerRawPageBounds([
                { time: '2026-06-25T05:10:01.001Z', name: 'sensor.a' },
                { time: '2026-06-25T05:09:58.534Z', name: 'sensor.b' },
                { time: '2026-06-25T05:09:56.100Z', name: 'sensor.a' },
            ]),
        ).toEqual({
            pageStart: { time: '2026-06-25T05:10:01.001Z', name: 'sensor.a' },
            pageEnd: { time: '2026-06-25T05:09:56.100Z', name: 'sensor.a' },
            pageBounds: {
                from: '2026-06-25T05:09:56.100Z',
                to: '2026-06-25T05:10:01.001Z',
            },
        });

        expect(buildDataViewerRawPageBounds([{ time: '', name: 'sensor.a' }])).toBeNull();
    });

    test('buildDataViewerRawPageRequest uses cursor boundaries for page movement', () => {
        const currentBounds = {
            pageStart: { time: '2026-06-25T05:10:01.001Z', name: 'sensor.a' },
            pageEnd: { time: '2026-06-25T05:09:56.100Z', name: 'sensor.c' },
            pageBounds: {
                from: '2026-06-25T05:09:56.100Z',
                to: '2026-06-25T05:10:01.001Z',
            },
        };

        expect(
            buildDataViewerRawPageRequest({
                currentPage: 1,
                nextPage: 2,
                pageSize: 3000,
                currentBounds,
                reason: 'page',
            }),
        ).toEqual({
            page: 2,
            cursorSide: 'next',
            cursorTime: '2026-06-25T05:09:56.100Z',
            cursorName: 'sensor.c',
            cursorOffset: 0,
        });

        expect(
            buildDataViewerRawPageRequest({
                currentPage: 1,
                nextPage: 3,
                pageSize: 3000,
                currentBounds,
                reason: 'page',
            }),
        ).toEqual({
            page: 3,
        });

        expect(
            buildDataViewerRawPageRequest({
                currentPage: 3,
                nextPage: 2,
                pageSize: 3000,
                currentBounds,
                reason: 'page',
            }),
        ).toEqual({
            page: 2,
            cursorSide: 'prev',
            cursorTime: '2026-06-25T05:10:01.001Z',
            cursorName: 'sensor.a',
            cursorOffset: 0,
        });

        expect(
            buildDataViewerRawPageRequest({
                currentPage: 3,
                nextPage: 3,
                pageSize: 3000,
                currentBounds,
                reason: 'tags',
            }),
        ).toEqual({
            page: 3,
            from: '2026-06-25T05:09:56.100Z',
            to: '2026-06-25T05:10:01.001Z',
            boundedRange: true,
        });
    });

    test('buildDataViewerDefaultChartShiftRawPageUpdate maps chart movement through raw scan direction', () => {
        const currentBounds = {
            pageStart: { time: '2026-06-01T00:00:00.000Z', name: 'sensor.a' },
            pageEnd: { time: '2026-06-01T00:10:00.000Z', name: 'sensor.a' },
            pageBounds: {
                from: '2026-06-01T00:00:00.000Z',
                to: '2026-06-01T00:10:00.000Z',
            },
        } as any;

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'backward',
                backwardScan: true,
                currentPage: 2,
                pageSize: 1000,
                currentBounds,
            }),
        ).toEqual({
            page: 3,
            rawPageRequest: {
                page: 3,
                cursorSide: 'next',
                cursorTime: '2026-06-01T00:10:00.000Z',
                cursorName: 'sensor.a',
                cursorOffset: 0,
            },
        });

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'forward',
                backwardScan: true,
                currentPage: 2,
                pageSize: 1000,
                currentBounds,
            }),
        ).toEqual({
            page: 1,
            rawPageRequest: {
                page: 1,
                cursorSide: 'prev',
                cursorTime: '2026-06-01T00:00:00.000Z',
                cursorName: 'sensor.a',
                cursorOffset: 0,
            },
        });

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'forward',
                backwardScan: false,
                currentPage: 2,
                pageSize: 1000,
                currentBounds,
            })?.page,
        ).toBe(3);

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'backward',
                backwardScan: false,
                currentPage: 2,
                pageSize: 1000,
                currentBounds,
            })?.page,
        ).toBe(1);

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'forward',
                backwardScan: true,
                currentPage: 1,
                pageSize: 1000,
                currentBounds,
            }),
        ).toBeNull();

        expect(
            buildDataViewerDefaultChartShiftRawPageUpdate({
                direction: 'backward',
                backwardScan: true,
                currentPage: 2,
                pageSize: 1000,
                rowCount: 999,
                currentBounds,
            }),
        ).toBeNull();
    });

    test('hasDataViewerRawNextPage opens next page during bounded tag refresh', () => {
        expect(
            hasDataViewerRawNextPage({
                rowCount: 100,
                pageSize: 2000,
                forceOpen: false,
            }),
        ).toBe(false);
        expect(
            hasDataViewerRawNextPage({
                rowCount: 100,
                pageSize: 2000,
                forceOpen: true,
            }),
        ).toBe(true);
    });

    test('buildDataViewerRawToChartRangeUpdate keeps raw range unchanged and prepares chart range', () => {
        const rawRange = { from: 'now-1h', to: 'now' };

        expect(
            buildDataViewerRawToChartRangeUpdate({
                rows: [
                    { time: '2026-06-25T05:09:58.534Z' },
                    { time: '2026-06-25T05:10:01.001Z' },
                ],
                rawRange,
                splitGroups: [
                    { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'] },
                    { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'] },
                ],
            }),
        ).toEqual({
            rawRange,
            chartRange: {
                from: '2026-06-25T05:09:58.534Z',
                to: '2026-06-25T05:10:01.001Z',
            },
            splitRanges: {
                'split:a': {
                    from: '2026-06-25T05:09:58.534Z',
                    to: '2026-06-25T05:10:01.001Z',
                },
                'split:b': {
                    from: '2026-06-25T05:09:58.534Z',
                    to: '2026-06-25T05:10:01.001Z',
                },
            },
        });

        expect(buildDataViewerRawToChartRangeUpdate({ rows: [], rawRange })).toBeNull();
    });

    test('toggleSelectedTagName removes existing tags or appends new tags', () => {
        expect(toggleSelectedTagName(['sensor.a', 'sensor.b'], 'sensor.a')).toEqual(['sensor.b']);
        expect(toggleSelectedTagName(['sensor.a'], 'sensor.b')).toEqual(['sensor.a', 'sensor.b']);
    });

    test('buildDataViewerTagSelectionUpdate preserves chart ranges while refreshing raw rows', () => {
        const update = buildDataViewerTagSelectionUpdate({
            selectedTagNames: ['sensor.a'],
            tagName: 'sensor.b',
            currentPage: 3,
            currentBounds: {
                pageBounds: {
                    from: '2026-06-01T00:00:00.000Z',
                    to: '2026-06-01T00:10:00.000Z',
                },
            } as any,
        });

        expect(update.selectedTagNames).toEqual(['sensor.a', 'sensor.b']);
        expect(update.rawPageRequest).toEqual({
            page: 3,
            from: '2026-06-01T00:00:00.000Z',
            to: '2026-06-01T00:10:00.000Z',
            boundedRange: true,
        });
        expect(update.preserveChartRanges).toBe(true);
    });

    test('buildDataViewerChartGroups keeps split tags in the default chart', () => {
        expect(
            buildDataViewerChartGroups({
                selectedTagNames: ['sensor.a', 'sensor.b', 'sensor.c'],
                splitGroups: [{ id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'] }],
                globalRange: { from: 'now-1h', to: 'now' },
                splitRanges: { 'split:b': { from: '2026-06-01 00:00:00', to: '2026-06-01 01:00:00' } },
            }),
        ).toEqual([
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a', 'sensor.b', 'sensor.c'], range: { from: 'now-1h', to: 'now' }, split: false },
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
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a', 'sensor.b'], range: { from: 'now-1h', to: 'now' }, split: false },
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

    test('buildDataViewerSplitRangeUpdate preserves default ranges and seeds new split ranges', () => {
        expect(
            buildDataViewerSplitRangeUpdate({
                nextGroups: [
                    { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'] },
                    { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'] },
                ],
                chartViewRanges: {
                    default: { startTime: 1000, endTime: 2000 },
                    'split:old': { startTime: 3000, endTime: 4000 },
                },
                chartNavigatorRanges: {
                    default: { startTime: 0, endTime: 5000 },
                    'split:old': { startTime: 2500, endTime: 4500 },
                },
                splitRanges: {
                    'split:old': { startTime: 2500, endTime: 4500 },
                },
            }),
        ).toEqual({
            chartViewRanges: {
                default: { startTime: 1000, endTime: 2000 },
                'split:old': { startTime: 3000, endTime: 4000 },
                'split:a': { startTime: 1000, endTime: 2000 },
                'split:b': { startTime: 1000, endTime: 2000 },
            },
            chartNavigatorRanges: {
                default: { startTime: 0, endTime: 5000 },
                'split:old': { startTime: 2500, endTime: 4500 },
                'split:a': { startTime: 0, endTime: 5000 },
                'split:b': { startTime: 0, endTime: 5000 },
            },
            splitRanges: {
                'split:old': { startTime: 2500, endTime: 4500 },
                'split:a': { startTime: 0, endTime: 5000 },
                'split:b': { startTime: 0, endTime: 5000 },
            },
        });
    });

    test('buildDataViewerGlobalTimeUpdate uses visible range first and applies it to every chart range', () => {
        expect(
            buildDataViewerGlobalTimeUpdate({
                sourceGroupId: 'split:b',
                chartGroups: [
                    { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: false },
                    { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: true },
                    { id: 'split:c', title: 'sensor.c', tagNames: ['sensor.c'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: true },
                ],
                chartViewRanges: {
                    'split:b': { from: '2026-06-01T00:10:00.000Z', to: '2026-06-01T00:20:00.000Z' },
                },
                chartNavigatorRanges: {
                    'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                },
                chartResults: {
                    'split:b': { range: { from: '2026-06-01T00:05:00.000Z', to: '2026-06-01T00:25:00.000Z' } },
                },
            }),
        ).toEqual({
            range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            splitRanges: {
                'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:c': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            },
            viewRanges: {
                default: { from: '2026-06-01T00:10:00.000Z', to: '2026-06-01T00:20:00.000Z' },
                'split:b': { from: '2026-06-01T00:10:00.000Z', to: '2026-06-01T00:20:00.000Z' },
                'split:c': { from: '2026-06-01T00:10:00.000Z', to: '2026-06-01T00:20:00.000Z' },
            },
            navigatorRanges: {
                default: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:c': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            },
        });
    });

    test('buildDataViewerGlobalTimeUpdate falls back to query range and rejects unavailable global time', () => {
        const chartGroups = [
            { id: 'split:a', title: 'sensor.a', tagNames: ['sensor.a'], range: { from: 'now-1h', to: 'now' }, split: true },
            { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: 'now-1h', to: 'now' }, split: true },
        ];

        expect(
            buildDataViewerGlobalTimeUpdate({
                sourceGroupId: 'split:a',
                chartGroups,
                chartResults: {
                    'split:a': { range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' } },
                },
            }),
        ).toEqual({
            range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            splitRanges: {
                'split:a': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            },
            viewRanges: {
                'split:a': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            },
            navigatorRanges: {
                'split:a': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
                'split:b': { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            },
        });

        expect(buildDataViewerGlobalTimeUpdate({ sourceGroupId: 'only', chartGroups: [{ id: 'only', title: 'Only', tagNames: ['sensor.a'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: false }] })).toBeUndefined();
        expect(buildDataViewerGlobalTimeUpdate({ sourceGroupId: 'split:a', chartGroups })).toBeUndefined();
    });

    test('buildDataViewerTagAnalyzerRange converts chart view ranges to bridge payload ranges', () => {
        expect(
            buildDataViewerTagAnalyzerRange({
                startTime: Date.parse('2026-06-01T00:10:00.000Z'),
                endTime: Date.parse('2026-06-01T00:20:00.000Z'),
            }),
        ).toEqual({
            startIso: '2026-06-01T00:10:00.000Z',
            endIso: '2026-06-01T00:20:00.000Z',
        });
        expect(
            buildDataViewerTagAnalyzerRange({
                from: '2026-06-01T00:00:00.000Z',
                to: '2026-06-01T01:00:00.000Z',
            }),
        ).toEqual({
            startIso: '2026-06-01T00:00:00.000Z',
            endIso: '2026-06-01T01:00:00.000Z',
        });
        expect(buildDataViewerTagAnalyzerRange({ startTime: 2000, endTime: 1000 })).toBeUndefined();
    });

    test('buildDataViewerTagAnalyzerTableName matches DB Explorer table qualification rules', () => {
        expect(
            buildDataViewerTagAnalyzerTableName({
                dbName: 'MACHBASEDB',
                userName: 'SYS',
                tableName: 'TEST',
                databaseId: '-1',
                currentUserName: 'SYS',
            }),
        ).toBe('TEST');
        expect(
            buildDataViewerTagAnalyzerTableName({
                dbName: 'MACHBASEDB',
                userName: 'OTHER',
                tableName: 'TEST',
                databaseId: '-1',
                currentUserName: 'SYS',
            }),
        ).toBe('OTHER.TEST');
        expect(
            buildDataViewerTagAnalyzerTableName({
                dbName: 'BACKUPDB',
                userName: 'SYS',
                tableName: 'TEST',
                databaseId: '3',
                currentUserName: 'SYS',
            }),
        ).toBe('BACKUPDB.SYS.TEST');
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

    test('buildDataViewerEChartOption moves main chart below multi-row legend', () => {
        const series = Array.from({ length: 9 }, (_, index) => ({
            name: `sensor.${index}`,
            data: [[Date.parse('2026-06-01T00:00:00Z'), index] as [number, number]],
        }));
        const option = buildDataViewerEChartOption({
            series,
            timeRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T00:10:00.000Z' },
            timeZone: 'UTC',
        }) as any;

        expect(option.grid[0].top).toBeGreaterThan(40);
        expect(option.grid[0].height).toBeLessThan(178);
        expect(option.legend.type).toBe('scroll');
    });

    test('buildDataViewerEChartOption keeps explicit ranges when series is empty', () => {
        const option = buildDataViewerEChartOption({
            series: [],
            timeRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' },
            displayRange: { from: '2026-06-01T00:15:00.000Z', to: '2026-06-01T00:30:00.000Z' },
        }) as any;

        expect(option.xAxis[0].min).toBe(Date.parse('2026-06-01T00:15:00.000Z'));
        expect(option.xAxis[0].max).toBe(Date.parse('2026-06-01T00:30:00.000Z'));
        expect(option.xAxis[1].min).toBe(Date.parse('2026-06-01T00:00:00.000Z'));
        expect(option.xAxis[1].max).toBe(Date.parse('2026-06-01T01:00:00.000Z'));
        expect(option.dataZoom[0].startValue).toBe(Date.parse('2026-06-01T00:15:00.000Z'));
        expect(option.dataZoom[0].endValue).toBe(Date.parse('2026-06-01T00:30:00.000Z'));
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

    test('buildDataViewerDragRangeUpdate zooms into a left-button drag range', () => {
        expect(
            buildDataViewerDragRangeUpdate({
                mode: 'zoom-in',
                dragStartTime: 800,
                dragEndTime: 300,
                currentRange: { startTime: 0, endTime: 1000 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            }),
        ).toEqual({ startTime: 300, endTime: 800 });
    });

    test('buildDataViewerDragRangeUpdate pans with middle-button drag inside navigator', () => {
        expect(
            buildDataViewerDragRangeUpdate({
                mode: 'pan',
                dragStartTime: 500,
                dragEndTime: 650,
                currentRange: { startTime: 200, endTime: 800 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            }),
        ).toEqual({ startTime: 50, endTime: 650 });
        expect(
            buildDataViewerDragRangeUpdate({
                mode: 'pan',
                dragStartTime: 500,
                dragEndTime: 650,
                currentRange: { startTime: 0, endTime: 1000 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            }),
        ).toBeUndefined();
    });

    test('buildDataViewerDragRangeUpdate zooms out with right-button drag', () => {
        expect(
            buildDataViewerDragRangeUpdate({
                mode: 'zoom-out',
                dragStartTime: 400,
                dragEndTime: 600,
                currentRange: { startTime: 200, endTime: 800 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            }),
        ).toEqual({ startTime: 100, endTime: 900 });
        expect(
            buildDataViewerDragRangeUpdate({
                mode: 'zoom-out',
                dragStartTime: 0,
                dragEndTime: 1000,
                currentRange: { startTime: 200, endTime: 800 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            }),
        ).toEqual({ startTime: 0, endTime: 1000 });
    });

    test('buildDataViewerShiftMainRangeUpdate shifts visible main range like Tag Analyzer', () => {
        const currentRange = { startTime: 1000, endTime: 2000 };
        const navigatorRange = { startTime: 0, endTime: 3000 };

        expect(buildDataViewerShiftMainRangeUpdate({ direction: 'backward', currentRange, navigatorRange })).toEqual({
            range: {
                from: new Date(100).toISOString(),
                to: new Date(1100).toISOString(),
            },
            navigatorRange: {
                from: new Date(-900).toISOString(),
                to: new Date(2100).toISOString(),
            },
        });
        expect(buildDataViewerShiftMainRangeUpdate({ direction: 'forward', currentRange, navigatorRange })).toEqual({
            range: {
                from: new Date(1900).toISOString(),
                to: new Date(2900).toISOString(),
            },
            navigatorRange: {
                from: new Date(900).toISOString(),
                to: new Date(3900).toISOString(),
            },
        });
    });

    test('buildDataViewerShiftMainRangeUpdate moves the full navigator range for page navigation', () => {
        expect(
            buildDataViewerShiftMainRangeUpdate({
                direction: 'backward',
                currentRange: { startTime: 1000, endTime: 2000 },
                navigatorRange: { startTime: 900, endTime: 2500 },
            }),
        ).toEqual({
            range: {
                from: new Date(520).toISOString(),
                to: new Date(1520).toISOString(),
            },
            navigatorRange: {
                from: new Date(420).toISOString(),
                to: new Date(2020).toISOString(),
            },
        });
        expect(buildDataViewerShiftMainRangeUpdate({ direction: 'backward', currentRange: {}, navigatorRange: {} })).toBeNull();
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

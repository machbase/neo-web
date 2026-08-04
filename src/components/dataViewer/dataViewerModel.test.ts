import {
    buildDataViewerChartGroups,
    buildDataViewerChartXAxis,
    buildDataViewerEChartOption,
    buildDataViewerGlobalTimeUpdate,
    buildDataViewerTagAnalyzerRange,
    buildDataViewerTagAnalyzerTableName,
    buildDataViewerChartResultsFromRawRows,
    buildDataViewerRawPageBounds,
    buildDataViewerRawPageRequest,
    buildDataViewerRawRowsPerTagChange,
    buildDataViewerDefaultChartShiftRawPageUpdate,
    buildDataViewerSplitRangeUpdate,
    buildDataViewerSplitGroups,
    buildDataViewerShiftBaseRangeUpdate,
    buildDataViewerShiftMainRangeUpdate,
    buildDataViewerDistanceQuickWindow,
    buildDataViewerDistanceSliderClickRange,
    buildDataViewerDragRangeUpdate,
    buildDataViewerTagSelectionUpdate,
    buildDataViewerWheelZoomRange,
    buildDataViewerZoomControlRange,
    buildRawColumnWidths,
    buildRawRowNameColors,
    buildSeriesColorMap,
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
    snapDataViewerDistanceEdge,
    shouldFetchDataViewerRowsForMode,
    toggleSelectedTagName,
    formatDataViewerAxisTime,
    formatDataViewerNavigatorRangeLabels,
    formatDataViewerTimeRangeInput,
    formatTimeRangeLabel,
    resolveTimeRangeInput,
    DATA_VIEWER_COLUMN_FLAG_INDEX,
    DATA_VIEWER_COLUMN_NAME_INDEX,
    DATA_VIEWER_COLUMN_TYPE_INDEX,
    getDataViewerBaseAxisLabel,
    isDataViewerJsonValueColumn,
    resolveDataViewerBaseColumn,
    resolveDataViewerBaseKind,
    formatDataViewerBaseRangeLabel,
    formatDataViewerBaseValue,
    formatDataViewerChartRangeEdge,
    formatDataViewerDistance,
    getDataViewerDefaultRange,
    isDataViewerRangeReversed,
    parseDataViewerDistanceValue,
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

    test('buildRawColumnWidths sizes the time column from the formatted sample, not the raw rows', () => {
        const columns = [{ key: 'time', label: 'Time' }];
        const options = { timeSample: '2026-06-01 10:00:00.000' };
        // 35 raw chars would have produced ceil(35 * 8.401 + 34) = 329px if the rows were measured.
        const wideRows = [{ time: '2026-06-01T10:00:00.000000000+09:00' }, { time: '2026-06-01T10:00:00.000000001+09:00' }];
        const narrowRows = [{ time: 1 }];

        // 23 sample chars * 8.401 = 193.223, + 32 padding + 2 slack -> ceil 228.
        expect(buildRawColumnWidths(wideRows, columns, options).time).toBe(228);
        expect(buildRawColumnWidths(narrowRows, columns, options).time).toBe(228);
    });

    test('buildRawColumnWidths uses a measured char width over the D2Coding constant', () => {
        const columns = [{ key: 'value', label: 'Value' }];
        // '-297.988095' is 11 chars — the real case that ellipsized: 11 * 8.401 + 32 + 2 = 127px
        // leaves only 2.6px of slack, so a font even 0.24px/char wider than D2Coding clips it.
        const rows = [{ value: '-297.988095' }];

        expect(buildRawColumnWidths(rows, columns).value).toBe(127);
        // A wider measured font must widen the column instead of silently ellipsizing.
        expect(buildRawColumnWidths(rows, columns, { charWidth: 9.6 }).value).toBe(140);
        // Unusable measurements fall back to the constant rather than collapsing the column.
        expect(buildRawColumnWidths(rows, columns, { charWidth: 0 }).value).toBe(127);
        expect(buildRawColumnWidths(rows, columns, { charWidth: Number.NaN }).value).toBe(127);
    });

    test('buildRawColumnWidths sizes non-time columns from the longest cell value', () => {
        const widths = buildRawColumnWidths(
            [{ name: 'a' }, { name: 'plant1.line1.temp' }, { name: 'ab' }],
            [{ key: 'name', label: 'Name' }],
        );

        // 17 chars * 8.401 = 142.817, + 34 -> ceil 177 (header 'Name' is only 4 * 7 = 28).
        expect(widths.name).toBe(177);
    });

    test('buildRawColumnWidths falls back to the header when the header is wider than every cell', () => {
        const label = 'Extra Status Description'; // 24 chars * 7 = 168px
        const byHeader = buildRawColumnWidths([{ status: '1' }], [{ key: 'status', label }]);
        const byCell = buildRawColumnWidths([{ status: '1' }], [{ key: 'status', label: 'S' }]);

        expect(byHeader.status).toBe(202);
        expect(byHeader.status).toBeGreaterThan(byCell.status);
    });

    test('buildRawColumnWidths clamps to the 90..10000 range', () => {
        const widths = buildRawColumnWidths(
            [{ tiny: '1', huge: 'x'.repeat(2000) }],
            [
                { key: 'tiny', label: 'V' },
                { key: 'huge', label: 'Huge' },
            ],
        );

        expect(widths.tiny).toBe(90);
        expect(widths.huge).toBe(10000);
    });

    // The upper clamp is the only thing in the page that can ellipsize a raw cell: the table is
    // `table-layout: fixed` with a definite width, so these widths are the column widths, full stop.
    // 1186 chars is the last length that still fits; 1187 is the first that does not.
    test('buildRawColumnWidths clamps at 10000px and not one character earlier', () => {
        const at = (chars: number) => buildRawColumnWidths([{ blob: 'x'.repeat(chars) }], [{ key: 'blob', label: 'Blob' }]).blob;

        expect(at(1186)).toBe(9998);
        expect(at(1187)).toBe(10000);
        expect(at(100_000)).toBe(10000);
    });

    // The regression this guards: a 640px cap turned every JSON document into an ellipsis, and
    // because the table was never asked to be wider than its pane there was no horizontal scroll to
    // recover the tail with. A realistic telemetry document has to come back wide enough to hold
    // every character of itself.
    test('buildRawColumnWidths gives a JSON document a column wide enough to hold all of it', () => {
        const document = JSON.stringify({
            sensor: 'plant1.line1.extruder.zone3',
            temperature: 218.4213,
            pressure: 12.9981,
            rpm: 1450,
            state: 'RUNNING',
            operator: 'kim.minsoo',
            batch: 'B-2026-0731-0042',
        });
        expect(document.length).toBe(162);

        const width = buildRawColumnWidths([{ value: document }], [{ key: 'value', label: 'Value' }]).value;

        // 162 * 8.401 = 1360.96, + 32 padding + 2 slack -> ceil 1395. Every character is inside the
        // column, which is what stops `text-overflow: ellipsis` from having anything to cut.
        expect(width).toBe(1395);
        expect(width).toBeGreaterThanOrEqual(Math.ceil(document.length * 8.401) + 34);
        // The old cap. Named explicitly so a reintroduction fails here rather than in a screenshot.
        expect(width).toBeGreaterThan(640);
    });

    test('buildRawColumnWidths widens a column by the extra pixel budget', () => {
        const base = buildRawColumnWidths([{ name: 'plant1.line1.temp' }], [{ key: 'name', label: 'Name' }]);
        const padded = buildRawColumnWidths([{ name: 'plant1.line1.temp' }], [{ key: 'name', label: 'Name' }], { extra: { name: 20 } });

        expect(padded.name).toBe(base.name + 20);
    });

    test('buildRawColumnWidths tolerates missing rows, columns and column keys', () => {
        expect(buildRawColumnWidths()).toEqual({});
        expect(buildRawColumnWidths([], [])).toEqual({});
        expect(buildRawColumnWidths(undefined as any, undefined as any)).toEqual({});
        expect(buildRawColumnWidths(null as any, null as any)).toEqual({});
        expect(buildRawColumnWidths([], [null as any, { key: '', label: 'Empty' }, { key: 'name', label: 'Name' }])).toEqual({ name: 90 });
    });

    test('buildRawColumnWidths is deterministic for the same rows', () => {
        const rows = [{ time: '2026-06-01', name: 'plant1.line1.temp', value: 12.5 }, { time: '2026-06-02', name: 'a', value: 3 }];
        const columns = [
            { key: 'time', label: 'Time' },
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
        ];
        const options = { timeSample: '2026-06-01 10:00:00.000' };

        expect(buildRawColumnWidths(rows, columns, options)).toEqual(buildRawColumnWidths(rows, columns, options));
        expect(buildRawColumnWidths(rows, columns, options)).toEqual(buildRawColumnWidths([...rows], [...columns], { ...options }));
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
            start: '2026-06-01 12:34:56',
            end: '2026-06-01 12:35:01',
        });
        expect(formatDataViewerNavigatorRangeLabels({}, 'YYYY-MM-DD HH24:MI:SS.mmm', 'UTC')).toEqual({ start: '', end: '' });
    });

    test('getDataViewerChartRangeMs prefers resolved query range over data extent', () => {
        const resolvedStart = Date.parse('2026-06-01T12:00:00.000Z');
        const resolvedEnd = Date.parse('2026-06-01T12:00:10.000Z');
        const points: Array<[number, number]> = [
            [Date.parse('2026-06-01T12:00:03.000Z'), 1],
            [Date.parse('2026-06-01T12:00:07.000Z'), 2],
        ];

        expect(
            getDataViewerChartRangeMs(points, {
                from: new Date(resolvedStart).toISOString(),
                to: new Date(resolvedEnd).toISOString(),
            }),
        ).toEqual({
            startTime: resolvedStart,
            endTime: resolvedEnd,
        });
    });

    test('formatTimeRangeLabel formats concrete date ranges without ISO separators', () => {
        expect(formatTimeRangeLabel('last-5m', 'last')).toBe('last-5m ~ last');
        expect(formatTimeRangeLabel('', '')).toBe('Time range not set');
        expect(formatTimeRangeLabel('2026-06-01 12:34:56.789', '2026-06-01 12:35:01.789')).toBe('2026-06-01 12:34:56 ~ 2026-06-01 12:35:01');
        expect(formatTimeRangeLabel('2026-06-01T12:34:56.789Z', '2026-06-01T12:35:01.789Z')).not.toMatch(/[TZ]/);
    });

    test('formatDataViewerTimeRangeInput formats modal inputs without ISO separators', () => {
        expect(formatDataViewerTimeRangeInput('')).toBe('');
        expect(formatDataViewerTimeRangeInput('now-5m')).toBe('now-5m');
        expect(formatDataViewerTimeRangeInput('last')).toBe('last');
        expect(formatDataViewerTimeRangeInput('2026-06-01T12:34:56.789Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(formatDataViewerTimeRangeInput('2026-06-01T12:34:56.789Z')).not.toMatch(/[TZ]/);
        expect(formatDataViewerTimeRangeInput(Date.parse('2026-06-01T12:34:56.789Z'))).toBe(formatDataViewerTimeRangeInput('2026-06-01T12:34:56.789Z'));
    });

    test('resolveTimeRangeInput preserves last range end by rounding to upward millisecond', () => {
        const base = new Date(2026, 6, 7, 16, 18, 9, 16);

        expect(resolveTimeRangeInput('last-5m', base, 'from')).toBe('2026-07-07 16:13:09.016');
        expect(resolveTimeRangeInput('last', base, 'to')).toBe('2026-07-07 16:18:09.017');
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

    test('buildDataViewerSplitRangeUpdate preserves display ranges without seeding split ranges', () => {
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
            },
        });
    });

    test('buildDataViewerGlobalTimeUpdate uses the source chart time and display ranges globally', () => {
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

    // "Set global time" copies one panel's window onto every other panel, and what it returns is
    // stored as the page's range and read back by the next query. On a distance axis that pair has
    // to stay numeric: the edges the page holds are the numbers `formatDataViewerDistance` produced
    // ('0', '999990'), and `Date.parse('0')` is the year 2000 while `Date.parse('1000')` is the year
    // 1000 — reversed, so before this branch existed the whole update was refused and the menu item
    // sat disabled on every distance table with more than one panel.
    test('buildDataViewerGlobalTimeUpdate keeps a distance window numeric instead of date-parsing it', () => {
        const chartGroups = [
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a'], range: { from: '0', to: '1000' }, split: false },
            { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: '0', to: '1000' }, split: true },
        ];

        const update = buildDataViewerGlobalTimeUpdate({
            sourceGroupId: 'split:b',
            chartGroups,
            // Written by a chart interaction, so already numbers.
            chartViewRanges: { 'split:b': { from: 200, to: 400 } },
            chartNavigatorRanges: { 'split:b': { from: 0, to: 999990 } },
            baseKind: 'distance',
        });

        expect(update).toEqual({
            range: { from: 0, to: 999990 },
            splitRanges: { 'split:b': { from: 0, to: 999990 } },
            viewRanges: { default: { from: 200, to: 400 }, 'split:b': { from: 200, to: 400 } },
            navigatorRanges: { default: { from: 0, to: 999990 }, 'split:b': { from: 0, to: 999990 } },
        });
        // Stated as a type rather than only as a value: `toEqual` would be just as happy with
        // '1970-01-01T00:16:39.990Z' if the assertion above had been written against a string.
        [...Object.values(update!.viewRanges), ...Object.values(update!.navigatorRanges), update!.range].forEach((edge) => {
            expect(typeof edge.from).toBe('number');
            expect(typeof edge.to).toBe('number');
        });

        // The edges the page actually stores on a distance axis are the strings
        // `formatDataViewerDistance` returns — this is the case the date path refused outright.
        expect(
            buildDataViewerGlobalTimeUpdate({
                sourceGroupId: 'split:b',
                chartGroups,
                chartResults: { 'split:b': { range: { from: '0', to: '1000' } } },
                baseKind: 'distance',
            }),
        ).toMatchObject({ range: { from: 0, to: 1000 } });

        // A non-numeric edge is still a refusal — it is not silently coerced into 0.
        expect(
            buildDataViewerGlobalTimeUpdate({
                sourceGroupId: 'split:b',
                chartGroups: [
                    { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a'], range: { from: 'last-1h', to: 'last' }, split: false },
                    { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: 'last-1h', to: 'last' }, split: true },
                ],
                baseKind: 'distance',
            }),
        ).toBeUndefined();
    });

    // The other half of the branch: an explicit time axis still stores ISO strings. The distance
    // path must not have leaked into the default.
    test('buildDataViewerGlobalTimeUpdate still stores ISO edges on a time axis', () => {
        const chartGroups = [
            { id: 'default', title: 'Selected Tags', tagNames: ['sensor.a'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: false },
            { id: 'split:b', title: 'sensor.b', tagNames: ['sensor.b'], range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' }, split: true },
        ];

        expect(buildDataViewerGlobalTimeUpdate({ sourceGroupId: 'split:b', chartGroups, baseKind: 'time' })).toEqual(
            buildDataViewerGlobalTimeUpdate({ sourceGroupId: 'split:b', chartGroups }),
        );
        expect(buildDataViewerGlobalTimeUpdate({ sourceGroupId: 'split:b', chartGroups, baseKind: 'time' })!.range).toEqual({
            from: '2026-06-01T00:00:00.000Z',
            to: '2026-06-01T01:00:00.000Z',
        });
    });

    test('buildDataViewerTagAnalyzerRange converts chart view ranges to bridge payload ranges', () => {
        expect(
            buildDataViewerTagAnalyzerRange({
                startTime: Date.parse('2026-06-01T00:10:00.000Z'),
                endTime: Date.parse('2026-06-01T00:20:00.000Z'),
            }),
        ).toEqual({
            startEpochMs: Date.parse('2026-06-01T00:10:00.000Z'),
            endEpochMs: Date.parse('2026-06-01T00:20:00.000Z'),
        });
        expect(
            buildDataViewerTagAnalyzerRange({
                startEpochMs: 1000,
                endEpochMs: 2000,
            }),
        ).toEqual({
            startEpochMs: 1000,
            endEpochMs: 2000,
        });
        expect(
            buildDataViewerTagAnalyzerRange({
                from: '2026-06-01T00:00:00.000Z',
                to: '2026-06-01T01:00:00.000Z',
            }),
        ).toEqual({
            startEpochMs: Date.parse('2026-06-01T00:00:00.000Z'),
            endEpochMs: Date.parse('2026-06-01T01:00:00.000Z'),
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

    // A scroll legend is one line at any series count — it pages the rest away rather than wrapping
    // — so the plot below it must not move or shrink as tags are added. The layout used to reserve a
    // row per four series, which at 30 tags left a single-row legend floating over a band of empty
    // space and a chart squashed to its 96px floor.
    test('buildDataViewerEChartOption keeps the plot area fixed as series are added', () => {
        const optionFor = (count: number) =>
            buildDataViewerEChartOption({
                series: Array.from({ length: count }, (_, index) => ({
                    name: `sensor.${index}`,
                    data: [[Date.parse('2026-06-01T00:00:00Z'), index] as [number, number]],
                })),
                timeRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T00:10:00.000Z' },
                timeZone: 'UTC',
            }) as any;

        const one = optionFor(1);
        const many = optionFor(30);

        expect(one.grid[0].top).toBe(40);
        expect(one.grid[0].height).toBe(178);
        expect(many.grid[0].top).toBe(one.grid[0].top);
        expect(many.grid[0].height).toBe(one.grid[0].height);
        expect(many.legend.type).toBe('scroll');
        expect(many.legend.height).toBe(one.legend.height);
    });

    // The pager is the only way to reach the tags past the first page, and ECharts styles it for a
    // white background by default (#2f4554 arrows, #333 text) against this panel's #252525.
    test('buildDataViewerEChartOption styles the legend pager for the dark panel', () => {
        const option = buildDataViewerEChartOption({ series: [], timeRange: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T00:10:00.000Z' } }) as any;

        expect(option.legend.pageIconColor).toBe('#e7e8ea');
        expect(option.legend.pageIconInactiveColor).toBe('#61646b');
        expect(option.legend.pageTextStyle.color).toBe('#e7e8ea');
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

    // The raw table's name dot and the chart's line share one palette walk, so a name has to map
    // to the same colour no matter which of the two asks for it, or the dot stops identifying
    // the line it belongs to.
    test('buildSeriesColorMap assigns one stable colour per name in first-seen order', () => {
        const names = ['alpha', 'beta', 'gamma'];

        const first = buildSeriesColorMap(names);
        const second = buildSeriesColorMap(names);

        expect(first).toEqual(second);
        expect(Object.keys(first)).toEqual(names);
        expect(new Set(Object.values(first)).size).toBe(3);
        // Repeats and blanks must not advance the palette, otherwise the same name drawn twice
        // would take two different colours.
        expect(buildSeriesColorMap(['alpha', 'alpha', '', null, 'beta'])).toEqual({
            alpha: first.alpha,
            beta: first.beta,
        });
    });

    test('buildSeriesColorMap wraps around the palette instead of running out of colours', () => {
        const names = Array.from({ length: 11 }, (_, index) => `tag-${index}`);

        const colors = buildSeriesColorMap(names);

        expect(Object.keys(colors)).toHaveLength(11);
        expect(colors['tag-9']).toBe(colors['tag-0']);
        expect(colors['tag-10']).toBe(colors['tag-1']);
    });

    // `color: PANEL_COLORS` only fixes a panel's own palette order, and a split panel holds exactly
    // one series — so every split panel used to take the palette's first entry and come out the same
    // blue, matching neither the tag's line in the main chart nor its dot in the raw grid.
    test('buildDataViewerEChartOption paints a series the colour its tag holds, not its position in this panel', () => {
        const seriesColors = buildSeriesColorMap(['sensor.a', 'sensor.b', 'sensor.c']);
        const panelOf = (names: string[], colors?: Record<string, string>) =>
            buildDataViewerEChartOption({
                series: names.map((name) => ({ name, data: [[0, 1] as [number, number]] })),
                seriesColors: colors,
            }) as any;
        const colorOf = (option: any, index: number) => option.series[index].lineStyle.color;

        const main = panelOf(['sensor.a', 'sensor.b', 'sensor.c'], seriesColors);
        // 'sensor.c' is third in the main chart; alone in its own panel it is first.
        const splitC = panelOf(['sensor.c'], seriesColors);

        expect(colorOf(splitC, 0)).toBe(seriesColors['sensor.c']);
        expect(colorOf(splitC, 0)).toBe(colorOf(main, 2));
        // Both the main line and its navigator twin, which are separate series objects.
        expect(splitC.series[0].itemStyle.color).toBe(seriesColors['sensor.c']);
        expect(splitC.series[1].id).toBe('navigator-series-0');
        expect(splitC.series[1].lineStyle.color).toBe(seriesColors['sensor.c']);
        expect(splitC.series[1].itemStyle.color).toBe(seriesColors['sensor.c']);

        // The regression itself: without the map the lone series takes the first palette entry,
        // which belongs to a different tag.
        expect(colorOf(panelOf(['sensor.c']), 0)).toBe(seriesColors['sensor.a']);
        expect(colorOf(panelOf(['sensor.c']), 0)).not.toBe(seriesColors['sensor.c']);

        // Two split panels are two different colours, not two copies of the palette's head.
        const splitA = panelOf(['sensor.a'], seriesColors);
        const splitB = panelOf(['sensor.b'], seriesColors);
        expect(new Set([colorOf(splitA, 0), colorOf(splitB, 0), colorOf(splitC, 0)]).size).toBe(3);
        expect(colorOf(splitA, 0)).toBe(colorOf(main, 0));
        expect(colorOf(splitB, 0)).toBe(colorOf(main, 1));

        // A name the map does not cover falls back to this panel's own palette position rather
        // than rendering colourless.
        const unmapped = panelOf(['sensor.a', 'sensor.z'], seriesColors);
        expect(colorOf(unmapped, 0)).toBe(seriesColors['sensor.a']);
        expect(colorOf(unmapped, 1)).toBe(buildSeriesColorMap(['x', 'y'])['y']);
    });

    test('buildRawRowNameColors colours rows by the order their names first appear', () => {
        const rows = [
            { time: 1, name: 'beta', value: 1 },
            { time: 2, name: 'alpha', value: 2 },
            { time: 3, name: 'beta', value: 3 },
        ];

        expect(buildRawRowNameColors(rows)).toEqual(buildSeriesColorMap(['beta', 'alpha']));
        expect(buildRawRowNameColors([])).toEqual({});
        // Rows arrive as arrays from some query paths; the name is still column 1.
        expect(buildRawRowNameColors([[1, 'beta', 1]])).toEqual({ beta: buildSeriesColorMap(['beta']).beta });
    });
});

describe('data viewer base axis detection', () => {
    // Exactly the shape `listTableColumns` returns: [NAME, TYPE, FLAG]. The flag index is the whole
    // point of these tests — `@/utils/timeFieldColumns` defaults to 4, which is a *different* row
    // shape, and reading index 4 here yields `undefined` for every column. That misread is silent:
    // nothing throws, every column just looks non-BASETIME, and the answer flips to 'time'.
    const DATETIME_TYPE = 6;
    const DOUBLE_TYPE = 20;
    const VARCHAR_TYPE = 5;
    const BASETIME_FLAG = 0x01000000;

    const TIME_BASE = [
        ['NAME', VARCHAR_TYPE, 0],
        ['TIME', DATETIME_TYPE, BASETIME_FLAG],
        ['VALUE', DOUBLE_TYPE, 0],
    ];
    // BASETIME on a DOUBLE. `RECORDED_AT` is the decoy: a flag-blind reader picks it and calls this
    // a time base.
    const DISTANCE_BASE = [
        ['NAME', VARCHAR_TYPE, 0],
        ['ODOMETER_M', DOUBLE_TYPE, BASETIME_FLAG],
        ['VALUE', DOUBLE_TYPE, 0],
        ['RECORDED_AT', DATETIME_TYPE, 0],
    ];

    test('the flag index matches the listTableColumns projection order', () => {
        // NAME=0, TYPE=1, FLAG=2. Pinned as a value because the two modules cannot share a constant
        // without dragging dataViewerApi (and its mocks) into this one.
        expect(DATA_VIEWER_COLUMN_FLAG_INDEX).toBe(2);
        expect(TIME_BASE[1][DATA_VIEWER_COLUMN_FLAG_INDEX]).toBe(BASETIME_FLAG);
    });

    test('a BASETIME column that is not DATETIME is a distance base', () => {
        const baseColumn = resolveDataViewerBaseColumn(DISTANCE_BASE, 'TIME');
        expect(baseColumn).toBe('ODOMETER_M');
        expect(resolveDataViewerBaseKind(DISTANCE_BASE, baseColumn)).toBe('distance');
        expect(getDataViewerBaseAxisLabel(resolveDataViewerBaseKind(DISTANCE_BASE, baseColumn))).toBe('DIST');
    });

    test('a DATETIME BASETIME column is a time base', () => {
        const baseColumn = resolveDataViewerBaseColumn(TIME_BASE, 'FALLBACK');
        expect(baseColumn).toBe('TIME');
        expect(resolveDataViewerBaseKind(TIME_BASE, baseColumn)).toBe('time');
        expect(getDataViewerBaseAxisLabel(resolveDataViewerBaseKind(TIME_BASE, baseColumn))).toBe('TIME');
    });

    test('an unflagged schema falls back to the first DATETIME column, still as a time base', () => {
        const columns = [
            ['NAME', VARCHAR_TYPE, 0],
            ['TS', DATETIME_TYPE, 0],
            ['VALUE', DOUBLE_TYPE, 0],
        ];
        const baseColumn = resolveDataViewerBaseColumn(columns, 'FALLBACK');
        expect(baseColumn).toBe('TS');
        expect(resolveDataViewerBaseKind(columns, baseColumn)).toBe('time');
    });

    test('an unreadable schema keeps the caller fallback and reads as a time base', () => {
        expect(resolveDataViewerBaseColumn([], 'ODOMETER_M')).toBe('ODOMETER_M');
        expect(resolveDataViewerBaseColumn(undefined, 'TIME')).toBe('TIME');
        // The fallback name is not in the (empty) column list, so nothing claims it is a distance
        // base — an unknown schema must never take the page down the distance branch.
        expect(resolveDataViewerBaseKind([], 'ODOMETER_M')).toBe('time');
        expect(resolveDataViewerBaseKind(undefined, 'TIME')).toBe('time');
    });

    test('the base column is matched case-insensitively against the schema', () => {
        expect(resolveDataViewerBaseKind(DISTANCE_BASE, 'odometer_m')).toBe('distance');
    });
});

describe('data viewer JSON value column detection', () => {
    // Same [NAME, TYPE, FLAG] rows as above. The trap this whole suite guards is that the type and
    // the flag are adjacent numeric positions: read index 2 instead of 1 and `isJsonTypeColumn`
    // still gets a number, still returns a boolean, and nothing anywhere throws.
    const JSON_TYPE = 61;
    const DATETIME_TYPE = 6;
    const DOUBLE_TYPE = 20;
    const VARCHAR_TYPE = 5;
    const INTEGER_TYPE = 8;
    const FLOAT_TYPE = 16;
    const BASETIME_FLAG = 0x01000000;

    const jsonValueColumns = [
        ['NAME', VARCHAR_TYPE, 0],
        ['TIME', DATETIME_TYPE, BASETIME_FLAG],
        ['VALUE', JSON_TYPE, 0],
    ];

    test('the index constants match the listTableColumns projection order', () => {
        // NAME=0, TYPE=1, FLAG=2. Pinned as values because the two modules cannot share a constant
        // without dragging dataViewerApi (and its mocks) into this file.
        expect([DATA_VIEWER_COLUMN_NAME_INDEX, DATA_VIEWER_COLUMN_TYPE_INDEX, DATA_VIEWER_COLUMN_FLAG_INDEX]).toEqual([0, 1, 2]);
        // The type and the flag must not be the same position, or the reader below has no contract
        // to break — it would read a BASETIME flag and call it a type.
        expect(DATA_VIEWER_COLUMN_TYPE_INDEX).not.toBe(DATA_VIEWER_COLUMN_FLAG_INDEX);
        expect(jsonValueColumns[2][DATA_VIEWER_COLUMN_TYPE_INDEX]).toBe(JSON_TYPE);
        expect(jsonValueColumns[1][DATA_VIEWER_COLUMN_FLAG_INDEX]).toBe(BASETIME_FLAG);
    });

    test('a JSON-typed value column is refused', () => {
        expect(isDataViewerJsonValueColumn(jsonValueColumns, 'VALUE')).toBe(true);
    });

    // The type is read from index 1, not index 2. This is the shape that catches the swap: the
    // BASETIME flag sits at index 2 of the TIME row, so a reader off by one position finds a number
    // there and answers with confidence.
    test('the JSON type is read from the type position, not the flag position', () => {
        // JSON type at index 1, and a flag at index 2 that is not the JSON code.
        expect(isDataViewerJsonValueColumn([['VALUE', JSON_TYPE, BASETIME_FLAG]], 'VALUE')).toBe(true);
        // The mirror image: the JSON code parked at the flag position must not be mistaken for a
        // JSON type. A reader on index 2 answers true here.
        expect(isDataViewerJsonValueColumn([['VALUE', DOUBLE_TYPE, JSON_TYPE]], 'VALUE')).toBe(false);
    });

    test.each([
        ['INTEGER', INTEGER_TYPE],
        ['FLOAT', FLOAT_TYPE],
        ['DOUBLE', DOUBLE_TYPE],
        ['DATETIME', DATETIME_TYPE],
        ['VARCHAR', VARCHAR_TYPE],
    ])('a %s value column is not refused', (_label, type) => {
        expect(isDataViewerJsonValueColumn([['NAME', VARCHAR_TYPE, 0], ['TIME', DATETIME_TYPE, BASETIME_FLAG], ['VALUE', type, 0]], 'VALUE')).toBe(false);
    });

    test('the value column is matched case-insensitively, ignoring surrounding space', () => {
        expect(isDataViewerJsonValueColumn([['value', JSON_TYPE, 0]], 'VALUE')).toBe(true);
        expect(isDataViewerJsonValueColumn([['VALUE', JSON_TYPE, 0]], 'value')).toBe(true);
        expect(isDataViewerJsonValueColumn([['  Payload  ', JSON_TYPE, 0]], 'payload')).toBe(true);
    });

    // Only the *value* column decides this. A JSON column elsewhere in the table is none of the
    // page's business — it never selects it.
    test('a JSON column that is not the value column is ignored', () => {
        const columns = [
            ['NAME', VARCHAR_TYPE, 0],
            ['TIME', DATETIME_TYPE, BASETIME_FLAG],
            ['VALUE', DOUBLE_TYPE, 0],
            ['PAYLOAD', JSON_TYPE, 0],
        ];
        expect(isDataViewerJsonValueColumn(columns, 'VALUE')).toBe(false);
        expect(isDataViewerJsonValueColumn(columns, 'PAYLOAD')).toBe(true);
    });

    // "Unknown" is not "JSON". A schema read that failed must never lock a working table out of the
    // viewer — the block only fires on a positive identification.
    test('an unknown schema does not refuse the table', () => {
        expect(isDataViewerJsonValueColumn([], 'VALUE')).toBe(false);
        expect(isDataViewerJsonValueColumn(undefined, 'VALUE')).toBe(false);
        expect(isDataViewerJsonValueColumn(null as any, 'VALUE')).toBe(false);
        // Column present, but not the one asked about.
        expect(isDataViewerJsonValueColumn(jsonValueColumns, 'MISSING')).toBe(false);
        // No value column name to match on.
        expect(isDataViewerJsonValueColumn(jsonValueColumns, '')).toBe(false);
        expect(isDataViewerJsonValueColumn(jsonValueColumns, undefined as any)).toBe(false);
    });

    test('malformed rows are skipped rather than throwing', () => {
        expect(isDataViewerJsonValueColumn([null, undefined, 'VALUE', ['VALUE', JSON_TYPE, 0]] as any, 'VALUE')).toBe(true);
        expect(isDataViewerJsonValueColumn([['VALUE']] as any, 'VALUE')).toBe(false);
    });
});

// A distance-base table is ordered by a non-DATETIME BASETIME column — an odometer, in the live
// case: MACHBASEDB.SYS.DISTANCE_SENSOR, base column ODOMETER_M (DOUBLE), values 0 .. 999990. Every
// helper here exists because the time equivalents give a confident, wrong answer on such a value
// rather than failing.
describe('data viewer distance base range', () => {
    test('the default window is 0 ~ 1000 on distance and last-1h ~ last on time', () => {
        expect(getDataViewerDefaultRange('distance')).toEqual({ from: 0, to: 1000 });
        expect(getDataViewerDefaultRange('time')).toEqual({ from: 'last-1h', to: 'last' });
    });

    // The page uses this as a render-time fallback, so a fresh object per call would give the range
    // a new identity on every render and re-fire every query keyed on it.
    test('the default window keeps one identity across calls', () => {
        expect(getDataViewerDefaultRange('distance')).toBe(getDataViewerDefaultRange('distance'));
        expect(getDataViewerDefaultRange('time')).toBe(getDataViewerDefaultRange('time'));
    });

    describe('parseDataViewerDistanceValue', () => {
        test('accepts the decimal forms a distance can actually take', () => {
            expect(parseDataViewerDistanceValue(0)).toBe(0);
            expect(parseDataViewerDistanceValue(999990)).toBe(999990);
            expect(parseDataViewerDistanceValue('0')).toBe(0);
            expect(parseDataViewerDistanceValue(' 1000 ')).toBe(1000);
            expect(parseDataViewerDistanceValue('12.5')).toBe(12.5);
            expect(parseDataViewerDistanceValue('-3')).toBe(-3);
            expect(parseDataViewerDistanceValue('.5')).toBe(0.5);
            expect(parseDataViewerDistanceValue('1e3')).toBe(1000);
        });

        // `Number()` alone accepts every one of these. Each would become either a silently wrong
        // bound or a SQL literal the server rejects — and the SQL builders interpolate the result
        // unquoted, so "reject anything that is not a plain decimal" is also the injection defence.
        test('rejects everything a bound must never be built from', () => {
            [
                '',
                '   ',
                null,
                undefined,
                'last-1h',
                'now',
                '0x3e8',
                '0b11',
                'Infinity',
                '-Infinity',
                'NaN',
                Number.NaN,
                Number.POSITIVE_INFINITY,
                '1,000',
                '10 or 1=1--',
                "1000'); drop table DISTANCE_SENSOR;--",
                '2026-06-25 05:10:01.001',
                {},
                [],
            ].forEach((value) => {
                expect(parseDataViewerDistanceValue(value as unknown)).toBeNull();
            });
        });
    });

    // 999990 through the time formatter comes back as a 1970 timestamp — a date rendered with total
    // confidence that is nowhere in the data. This is the fork that stops that.
    test('formats base values on the axis the table actually has', () => {
        expect(formatDataViewerBaseValue(999990, 'distance', '2006-01-02 15:04:05.000', 'UTC')).toBe('999990');
        expect(formatDataViewerBaseValue(0, 'distance', '2006-01-02 15:04:05.000', 'UTC')).toBe('0');
        expect(formatDataViewerBaseValue(999990, 'time', 'ms', 'UTC')).toBe('999990');
        expect(formatDataViewerBaseValue(999990, 'time', '2006-01-02 15:04:05.000', 'UTC')).toBe('1970-01-01 00:16:39.990');
        expect(formatDataViewerDistance(999990)).toBe('999990');
        expect(formatDataViewerDistance(null)).toBe('');
    });

    test('labels a distance range as two numbers and a time range as its expression', () => {
        expect(formatDataViewerBaseRangeLabel(0, 1000, 'distance')).toBe('0 ~ 1000');
        expect(formatDataViewerBaseRangeLabel('0', '999990', 'distance')).toBe('0 ~ 999990');
        expect(formatDataViewerBaseRangeLabel('last-1h', 'last', 'time')).toBe('last-1h ~ last');
        // The time label collapses a falsy edge to a placeholder; on distance, 0 is a real bound.
        expect(formatTimeRangeLabel(0, 1000)).toContain('Start');
        expect(formatDataViewerBaseRangeLabel(0, 1000, 'distance')).not.toContain('Start');
        expect(formatDataViewerBaseRangeLabel('', '', 'distance')).toBe('Distance range not set');
    });

    // `new Date('0')` is the year 2000 and `new Date('1000')` is the year 1000, so the date
    // comparison calls the perfectly ordinary default window reversed and refuses to query it.
    test('orders distance edges numerically, not chronologically', () => {
        expect(isDataViewerRangeReversed('0', '1000', 'distance')).toBe(false);
        expect(isDataViewerRangeReversed('0', '1000', 'time')).toBe(true);
        expect(isDataViewerRangeReversed('900', '100', 'distance')).toBe(true);
        expect(isDataViewerRangeReversed('100', '100', 'distance')).toBe(false);
        // A non-numeric edge is refused elsewhere; it is not reported as reversed here.
        expect(isDataViewerRangeReversed('abc', '100', 'distance')).toBe(false);
        expect(isDataViewerRangeReversed('2026-06-25 04:00:00', '2026-06-25 05:00:00', 'time')).toBe(false);
        expect(isDataViewerRangeReversed('2026-06-25 05:00:00', '2026-06-25 04:00:00', 'time')).toBe(true);
    });

    // The page bounds are the next page's cursor anchors. Pushing an odometer reading through
    // `new Date(...)` turns 999990 into 1970-01-01T00:16:39.990Z, and the cursor built from that
    // compares a timestamp against a DOUBLE column — a page move that returns nothing.
    test('page bounds stay numeric on a distance base and stay ISO on a time base', () => {
        const rows = [
            { time: 0, name: 'SENSOR_01', value: 1 },
            { time: 20, name: 'SENSOR_02', value: 2 },
            { time: 10, name: 'SENSOR_03', value: 3 },
        ];

        expect(buildDataViewerRawPageBounds(rows, 'distance')).toEqual({
            pageStart: { time: '0', name: 'SENSOR_01' },
            pageEnd: { time: '10', name: 'SENSOR_03' },
            pageBounds: { from: '0', to: '20' },
        });

        const timeBounds = buildDataViewerRawPageBounds(rows, 'time');
        expect(timeBounds?.pageBounds.to).toBe('1970-01-01T00:00:00.020Z');
        // Default is the time axis, so every existing caller keeps its behaviour untouched.
        expect(buildDataViewerRawPageBounds(rows)).toEqual(timeBounds);
    });

    test('a row whose distance is unreadable is dropped, not turned into a date', () => {
        expect(
            buildDataViewerRawPageBounds([{ time: 'n/a', name: 'SENSOR_01' }, { time: 40, name: 'SENSOR_02' }], 'distance')
        ).toEqual({
            pageStart: { time: '40', name: 'SENSOR_02' },
            pageEnd: { time: '40', name: 'SENSOR_02' },
            pageBounds: { from: '40', to: '40' },
        });
        expect(buildDataViewerRawPageBounds([{ time: 'n/a', name: 'SENSOR_01' }], 'distance')).toBeNull();
    });
});

// The raw grid's base column is aliased `time` in SQL on both axes, and the row key, the column
// order and the keyset cursor all read that alias. The axis shows up in the header label alone.
describe('data viewer distance base grid header', () => {
    const rows = [
        { time: 0, name: 'SENSOR_01', value: 10 },
        { time: 10, name: 'SENSOR_01', value: 11 },
    ];

    test('labels the base column Distance on a distance base and Time on a time base', () => {
        expect(buildRawResultColumns(rows, { baseKind: 'distance' }).map((column) => column.label)).toEqual(['Distance', 'Name', 'Value']);
        expect(buildRawResultColumns(rows, { baseKind: 'time' }).map((column) => column.label)).toEqual(['Time', 'Name', 'Value']);
        // Default is the time axis, so every existing caller keeps the header it had.
        expect(buildRawResultColumns(rows)).toEqual(buildRawResultColumns(rows, { baseKind: 'time' }));
        // The column list a query has not answered yet is still labelled by the axis.
        expect(buildRawResultColumns([], { baseKind: 'distance' })).toEqual([
            { key: 'time', label: 'Distance' },
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
        ]);
    });

    // Only the label moves. `formatBaseValue(row.time)`, the width lookup and the page cursor all
    // address the row by the `time` alias; renaming the key would break three readers for a
    // cosmetic gain, which is why the SQL alias was deliberately left alone.
    test('renames the label without touching the `time` alias the rows are keyed by', () => {
        const columns = buildRawResultColumns(rows, { baseKind: 'distance' });

        expect(columns.map((column) => column.key)).toEqual(['time', 'name', 'value']);
        expect(columns.find((column) => column.label === 'Distance')?.key).toBe('time');
        expect(columns.some((column) => column.key === 'distance')).toBe(false);
        // The key really is what the rows carry — a renamed key would read undefined out of them.
        expect(rows.map((row) => row[columns[0].key as 'time'])).toEqual([0, 10]);
    });

    // The header and `buildRawColumnWidths` read one array, so they cannot disagree about which
    // label is on screen. Two labels of these lengths both land on the 90px column floor
    // (`Time` = 28px of header, `Distance` = 56px, floor = 90), so the swap is not visible as a
    // number today; the second assertion is what pins that the width really is label-driven, and
    // the first is what pins that it is *this* array's label.
    test('the width calculation sizes the base column from the axis label the header shows', () => {
        const columns = buildRawResultColumns(rows, { baseKind: 'distance' });
        const widths = buildRawColumnWidths(rows, columns, { timeSample: '0' });

        expect(Object.keys(widths)).toEqual(['time', 'name', 'value']);
        expect(widths.time).toBe(buildRawColumnWidths(rows, [{ key: 'time', label: 'Distance' }], { timeSample: '0' }).time);
        expect(buildRawColumnWidths(rows, [{ key: 'time', label: 'Distance travelled since reset' }], { timeSample: '0' }).time).toBeGreaterThan(widths.time);
    });
});

// A distance axis plots numbers. An ECharts `time` axis reads every x as an epoch, so the live
// table's 0 .. 999990 would be laid out across the first sixteen minutes of 1970 and every tick,
// tooltip and navigator label would name a date that is nowhere in the data. `value` — the same
// axis the dashboards switch to for a non-DATETIME base column — reads them as distances.
describe('data viewer distance base chart axis', () => {
    const distanceSeries = [
        {
            name: 'SENSOR_01',
            data: [
                [0, 10],
                [500, 12],
                [1000, 14],
            ] as Array<[number, number]>,
        },
    ];
    const distanceRange = { from: 0, to: 1000 };
    const timeSeries = [
        {
            name: 'sensor.a',
            data: [
                [Date.parse('2026-06-01T00:00:00Z'), 10],
                [Date.parse('2026-06-01T00:10:00Z'), 12],
            ] as Array<[number, number]>,
        },
    ];
    const timeWindow = { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T00:10:00.000Z' };
    // A clock time or a calendar date, in any of the formats the axis and tooltip can produce.
    const DATE_TEXT = /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/;

    const distanceOption = (extra: Record<string, unknown> = {}) =>
        buildDataViewerEChartOption({ series: distanceSeries, timeRange: distanceRange, baseKind: 'distance', timeZone: 'UTC', ...extra }) as any;
    const timeOption = (extra: Record<string, unknown> = {}) => buildDataViewerEChartOption({ series: timeSeries, timeRange: timeWindow, timeZone: 'UTC', ...extra }) as any;

    // All three: the main axis and the two navigator axes plot the same series, so a split would put
    // the navigator's window in a different coordinate space than the panel it scrolls.
    test('every x axis is a value axis on distance and a time axis on time', () => {
        expect(distanceOption().xAxis.map((axis: any) => axis.type)).toEqual(['value', 'value', 'value']);
        expect(timeOption().xAxis.map((axis: any) => axis.type)).toEqual(['time', 'time', 'time']);
        // Unstated axis is the time one, so nothing that does not know about `baseKind` moves.
        expect((buildDataViewerEChartOption({ series: timeSeries, timeRange: timeWindow }) as any).xAxis.map((axis: any) => axis.type)).toEqual(['time', 'time', 'time']);
        // The y axes were already numeric and stay that way.
        expect(distanceOption().yAxis.map((axis: any) => axis.type)).toEqual(['value', 'value']);
    });

    test('the axis spans the distance window rather than an epoch one', () => {
        const option = distanceOption({ displayRange: { from: 200, to: 400 } });

        expect([option.xAxis[0].min, option.xAxis[0].max]).toEqual([200, 400]);
        // The navigator keeps the whole window while the main panel holds the zoomed one.
        expect([option.xAxis[1].min, option.xAxis[1].max]).toEqual([0, 1000]);
        expect([option.xAxis[2].min, option.xAxis[2].max]).toEqual([0, 1000]);
    });

    test('the axis labels are numbers, never a clock', () => {
        const formatter = distanceOption().xAxis[0].axisLabel.formatter;

        expect(formatter(0)).toBe('0');
        expect(formatter(500)).toBe('500');
        expect(formatter(999990)).toBe('999990');
        // ECharts divides a value axis in floating point, so a tick that means 200 arrives like this.
        expect(formatter(199.99999999999997)).toBe('200');
        [0, 500, 999990, 12.5].forEach((value) => expect(formatter(value)).not.toMatch(DATE_TEXT));
        // A time axis still writes a clock — 500ms into the window would otherwise be '00:00:00'.
        expect(timeOption().xAxis[0].axisLabel.formatter(Date.parse('2026-06-01T00:05:00Z'))).toMatch(DATE_TEXT);
    });

    test('the tooltip heading is the distance under the pointer, not a date', () => {
        const html = distanceOption().tooltip.formatter([
            { seriesId: 'main-series-0', seriesName: 'SENSOR_01', value: [999990, 42], axisValue: 999990, color: '#5470c6' },
        ]);

        expect(html).toContain('999990');
        expect(html).toContain('SENSOR_01 : 42');
        // 999990 through the time formatter is '1970-01-01 00:16:39.990' — the leak this is here for.
        expect(html).not.toContain('1970');
        expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        // The time tooltip keeps its timestamp heading.
        expect(
            timeOption().tooltip.formatter([
                { seriesId: 'main-series-0', seriesName: 'sensor.a', value: [Date.parse('2026-06-01T00:05:00Z'), 42], axisValue: Date.parse('2026-06-01T00:05:00Z'), color: '#5470c6' },
            ]),
        ).toContain('2026-06-01 00:05:00.000');
    });

    test('the data zoom windows are distances, not epoch milliseconds', () => {
        expect(distanceOption().dataZoom.map((zoom: any) => [zoom.startValue, zoom.endValue])).toEqual([
            [0, 1000],
            [0, 1000],
        ]);
        expect(distanceOption({ displayRange: { from: 200, to: 400 } }).dataZoom.map((zoom: any) => [zoom.startValue, zoom.endValue])).toEqual([
            [200, 400],
            [200, 400],
        ]);
        // Time keeps epoch milliseconds, and both zooms still drive the navigator axis.
        const option = timeOption();
        expect(option.dataZoom[0].startValue).toBe(Date.parse('2026-06-01T00:00:00.000Z'));
        expect(option.dataZoom[1].endValue).toBe(Date.parse('2026-06-01T00:10:00.000Z'));
        expect(option.dataZoom.map((zoom: any) => zoom.xAxisIndex)).toEqual([[1], [1]]);
    });

    // What an empty distance chart opens on. `now - 1h .. now` is a clock reading, so it would put
    // the axis eighteen digits away from every point such a table holds.
    test('an empty distance chart falls back to the 0 ~ 1000 window, not to the last hour', () => {
        const option = buildDataViewerEChartOption({ series: [], baseKind: 'distance' }) as any;
        expect([option.xAxis[0].min, option.xAxis[0].max]).toEqual([0, 1000]);

        const timeFallback = buildDataViewerEChartOption({ series: [] }) as any;
        expect(timeFallback.xAxis[0].max).toBeGreaterThan(Date.parse('2020-01-01T00:00:00Z'));
        expect(timeFallback.xAxis[0].max - timeFallback.xAxis[0].min).toBe(60 * 60 * 1000);
    });

    // `toEpochMs` divides anything past 1e14 by a million — V$..._STAT answers MAX_TIME as the raw
    // bit pattern of a double, which is exactly that large — and hands whatever is left to
    // `Date.parse`. On a distance axis the number is already the coordinate.
    test('series x values stay distances instead of being rescaled as epochs', () => {
        const rows = [
            { time: 0, name: 'SENSOR_01', value: 1 },
            { time: 999990, name: 'SENSOR_01', value: 2 },
            { time: 2e14, name: 'SENSOR_01', value: 3 },
            { time: 'n/a', name: 'SENSOR_01', value: 4 },
        ];

        expect(buildTagChartSeries(rows, 'distance')[0].data).toEqual([
            [0, 1],
            [999990, 2],
            [2e14, 3],
        ]);
        expect(buildTagChartSeries(rows, 'time')[0].data).toEqual([
            [0, 1],
            [999990, 2],
            [2e8, 3],
        ]);
        expect(buildTagChartSeries(rows)).toEqual(buildTagChartSeries(rows, 'time'));
    });

    test('the chart results carry the axis down into the series', () => {
        const chartGroups = [{ id: 'default', title: '', tagNames: ['SENSOR_01'], range: distanceRange, split: false }];
        const rows = [{ time: 2e14, name: 'SENSOR_01', value: 3 }];

        expect((buildDataViewerChartResultsFromRawRows({ rows, chartGroups, baseKind: 'distance' }) as any).default.series[0].data).toEqual([[2e14, 3]]);
        expect((buildDataViewerChartResultsFromRawRows({ rows, chartGroups }) as any).default.series[0].data).toEqual([[2e8, 3]]);
    });

    test('the chart range resolves numerically and falls back to the distance default', () => {
        const points: Array<[number, number]> = [
            [0, 1],
            [999990, 2],
        ];

        expect(getDataViewerChartRangeMs(points, { from: 0, to: 1000 }, 'distance')).toEqual({ startTime: 0, endTime: 1000 });
        // No window: the data's own extent, still as distances.
        expect(getDataViewerChartRangeMs(points, {}, 'distance')).toEqual({ startTime: 0, endTime: 999990 });
        expect(getDataViewerChartRangeMs([], {}, 'distance')).toEqual({ startTime: 0, endTime: 1000 });
        // A time expression is not a distance, so it is refused rather than parsed as a date.
        expect(getDataViewerChartRangeMs(points, { from: 'last-1h', to: 'last' }, 'distance')).toEqual({ startTime: 0, endTime: 999990 });
        // Time is untouched, including the ms tick interval that has no meaning on a distance axis.
        expect(getDataViewerChartRangeMs([], { from: '2026-06-01T00:00:00.000Z', to: '2026-06-01T01:00:00.000Z' })).toEqual({
            startTime: Date.parse('2026-06-01T00:00:00.000Z'),
            endTime: Date.parse('2026-06-01T01:00:00.000Z'),
        });
        expect(buildDataViewerChartXAxis(points, { from: 0, to: 1000 }, 'distance').tickInterval).toBeUndefined();
        expect(buildDataViewerChartXAxis(points, { from: 0, to: 600000 }).tickInterval).toBe(2 * 60000);
    });

    test('the navigator boundary labels read as distances', () => {
        expect(formatDataViewerNavigatorRangeLabels({ startTime: 0, endTime: 999990 }, '2006-01-02 15:04:05.000', 'UTC', 'distance')).toEqual({
            start: '0',
            end: '999990',
        });
        expect(formatDataViewerNavigatorRangeLabels({ startTime: 0, endTime: 999990 }, '2006-01-02 15:04:05.000', 'UTC')).toEqual({
            start: '1970-01-01 00:00:00',
            end: '1970-01-01 00:16:39',
        });
    });

    // Every interaction hands back axis coordinates that the page stores and the next render reads
    // in again. Storing a distance as an ISO string is what would make the panel jump to 1970 the
    // moment anyone zoomed it.
    test('a range edge is stored in the units of its own axis', () => {
        expect(formatDataViewerChartRangeEdge(999990, 'distance')).toBe(999990);
        expect(formatDataViewerChartRangeEdge(0, 'distance')).toBe(0);
        expect(formatDataViewerChartRangeEdge(999990, 'time')).toBe('1970-01-01T00:16:39.990Z');
        expect(formatDataViewerChartRangeEdge(999990)).toBe('1970-01-01T00:16:39.990Z');
        expect(formatDataViewerChartRangeEdge('n/a', 'distance')).toBe('');
    });

    test('the shift arrows move a distance window by distances', () => {
        const currentRange = { startTime: 200, endTime: 400 };
        const navigatorRange = { startTime: 0, endTime: 1000 };

        expect(buildDataViewerShiftMainRangeUpdate({ direction: 'forward', currentRange, navigatorRange, baseKind: 'distance' })).toEqual({
            range: { from: 500, to: 700 },
            navigatorRange: { from: 300, to: 1300 },
        });
        expect(buildDataViewerShiftMainRangeUpdate({ direction: 'forward', currentRange, navigatorRange })).toEqual({
            range: { from: new Date(500).toISOString(), to: new Date(700).toISOString() },
            navigatorRange: { from: new Date(300).toISOString(), to: new Date(1300).toISOString() },
        });
    });
});

// The range chip's ◀ / ▶. Not the panel arrows: those move a view inside a wider navigator extent
// and step by a fraction of it. The chip has no navigator — the window on the toolbar is the whole
// extent — so a step is one window, and `0 ~ 1000` has to become exactly `1000 ~ 2000`.
describe('base range shift', () => {
    test('moves the window by its own width, in the units of its own axis', () => {
        const distance = { from: 0, to: 1000 };
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: distance, baseKind: 'distance' })).toEqual({ from: 1000, to: 2000 });
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'backward', range: distance, baseKind: 'distance' })).toEqual({ from: -1000, to: 0 });

        // Adjacent, not overlapping: `to` of one step is `from` of the next.
        const forward = buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: distance, baseKind: 'distance' })!;
        expect(forward.from).toBe(distance.to);

        const time = { from: '2026-06-01T09:00:00.000Z', to: '2026-06-01T10:00:00.000Z' };
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: time, baseKind: 'time' })).toEqual({
            from: '2026-06-01T10:00:00.000Z',
            to: '2026-06-01T11:00:00.000Z',
        });
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'backward', range: time, baseKind: 'time' })).toEqual({
            from: '2026-06-01T08:00:00.000Z',
            to: '2026-06-01T09:00:00.000Z',
        });
    });

    // The distance axis is the whole reason this does not just call `new Date()`. A 1000-metre
    // window read as an epoch is one second of 1970, and stepping it would move the window a second.
    test('a distance window is never routed through a date', () => {
        const stepped = buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: { from: 999000, to: 999990 }, baseKind: 'distance' });
        expect(stepped).toEqual({ from: 999990, to: 1000980 });
        expect(typeof stepped!.from).toBe('number');
        // The same numbers on the default (time) axis are timestamps, which is what makes the
        // baseKind argument load-bearing rather than cosmetic.
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: { from: 999000, to: 999990 } })!.from).toBe('1970-01-01T00:16:39.990Z');
    });

    // Refusing beats moving to a window that says nothing: each of these would otherwise re-query
    // for a range the user cannot see the point of.
    test('refuses anything that is not a window with a width', () => {
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: { from: 0, to: 0 }, baseKind: 'distance' })).toBeNull();
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: { from: 1000, to: 0 }, baseKind: 'distance' })).toBeNull();
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: { from: 'last-1h', to: 'last' } })).toBeNull();
        expect(buildDataViewerShiftBaseRangeUpdate({ direction: 'forward', range: {} })).toBeNull();
        expect(buildDataViewerShiftBaseRangeUpdate({ range: { from: 0, to: 1000 }, baseKind: 'distance' })).toBeNull();
        expect(buildDataViewerShiftBaseRangeUpdate()).toBeNull();
    });
});

// A click on the distance slider's track. The window keeps its width and slides so the clicked
// point is its centre — the alternative, dragging both thumbs across the rail and matching the width
// by eye, is what this replaces.
describe('distance slider track click', () => {
    const bounds = { min: 0, max: 4000 };

    test('keeps the span and centres it on the clicked point', () => {
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.5, from: 0, to: 400, ...bounds })).toEqual({ from: 1800, to: 2200 });
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.25, from: 1000, to: 2000, ...bounds })).toEqual({ from: 500, to: 1500 });

        // Span preserved exactly, wherever it lands.
        const moved = buildDataViewerDistanceSliderClickRange({ ratio: 0.7, from: 120, to: 933, ...bounds })!;
        expect(moved.to - moved.from).toBe(813);
    });

    // Clamping moves the window rather than squeezing it: an edge pinned to the bound while the
    // other stayed put would silently narrow a window nobody asked to narrow.
    test('clamps at both ends without changing the width', () => {
        const atStart = buildDataViewerDistanceSliderClickRange({ ratio: 0, from: 1000, to: 2000, ...bounds })!;
        expect(atStart).toEqual({ from: 0, to: 1000 });

        const atEnd = buildDataViewerDistanceSliderClickRange({ ratio: 1, from: 1000, to: 2000, ...bounds })!;
        expect(atEnd).toEqual({ from: 3000, to: 4000 });

        // Beyond either end — a pointer that left the track mid-gesture — is the same as its edge.
        expect(buildDataViewerDistanceSliderClickRange({ ratio: -3, from: 1000, to: 2000, ...bounds })).toEqual(atStart);
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 4, from: 1000, to: 2000, ...bounds })).toEqual(atEnd);

        // A window as wide as the extent has nowhere to go, and must not come back narrower.
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.2, from: 0, to: 4000, ...bounds })).toEqual({ from: 0, to: 4000 });
    });

    test('an unparseable edge falls back to the bound the thumb is drawn at', () => {
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.5, from: '', to: 1000, ...bounds })).toEqual({ from: 1500, to: 2500 });
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.5, from: 3000, to: 'abc', ...bounds })).toEqual({ from: 1500, to: 2500 });
    });

    // The editor does not draw a track at all without an extent, so there is nothing a click on one
    // could mean.
    test('refuses when there is no extent to click along', () => {
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.5, from: 0, to: 100, min: 0, max: 0 })).toBeNull();
        expect(buildDataViewerDistanceSliderClickRange({ ratio: 0.5, from: 0, to: 100, min: 100, max: 0 })).toBeNull();
        expect(buildDataViewerDistanceSliderClickRange({ ratio: Number.NaN, from: 0, to: 100, ...bounds })).toBeNull();
        expect(buildDataViewerDistanceSliderClickRange()).toBeNull();
    });

    // Float noise from `ratio * extent` would be printed straight into the From box, where nobody
    // could have typed it and nobody can retype it.
    test('the edges it writes are numbers a user could have typed', () => {
        const noisy = buildDataViewerDistanceSliderClickRange({ ratio: 1 / 3, from: 0, to: 0.3, min: 0, max: 1 })!;
        expect(String(noisy.from)).not.toMatch(/\d{13}/);
        expect(String(noisy.to)).not.toMatch(/\d{13}/);
    });
});

// The quick-window buttons under the From/To fields. Each one is a fraction of the *extent*, which
// is what makes them a way back from a window nobody can navigate out of by hand.
describe('distance quick windows', () => {
    const bounds = { min: 0, max: 4000 };

    test('a first-N% window starts at the lower bound', () => {
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'first', ratio: 0.1 })).toEqual({ from: 0, to: 400 });
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'first', ratio: 0.25 })).toEqual({ from: 0, to: 1000 });
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'first', ratio: 0.5 })).toEqual({ from: 0, to: 2000 });
    });

    test('a last-N% window ends at the upper bound', () => {
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'last', ratio: 0.25 })).toEqual({ from: 3000, to: 4000 });
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'last', ratio: 0.5 })).toEqual({ from: 2000, to: 4000 });
    });

    // `Full` is not a special case: it is the whole extent, which is `First 100%`.
    test('the full window is the extent itself', () => {
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'first', ratio: 1 })).toEqual({ from: 0, to: 4000 });
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'last', ratio: 1 })).toEqual({ from: 0, to: 4000 });
    });

    // An extent that does not start at zero is the case a `ratio * max` shortcut gets wrong.
    test('the fractions are of the extent, not of the upper bound', () => {
        expect(buildDataViewerDistanceQuickWindow({ min: 1000, max: 3000, edge: 'first', ratio: 0.5 })).toEqual({ from: 1000, to: 2000 });
        expect(buildDataViewerDistanceQuickWindow({ min: 1000, max: 3000, edge: 'last', ratio: 0.5 })).toEqual({ from: 2000, to: 3000 });
        expect(buildDataViewerDistanceQuickWindow({ min: -500, max: 500, edge: 'first', ratio: 0.25 })).toEqual({ from: -500, to: -250 });
    });

    // Same answer as the slider gives, for the same reason: with no extent there is no fraction of
    // anything, and the buttons are not drawn.
    test('refuses without a real extent', () => {
        expect(buildDataViewerDistanceQuickWindow({ min: 0, max: 0, edge: 'first', ratio: 0.5 })).toBeNull();
        expect(buildDataViewerDistanceQuickWindow({ min: 100, max: 0, edge: 'first', ratio: 0.5 })).toBeNull();
        expect(buildDataViewerDistanceQuickWindow({ min: Number.NaN, max: 100, edge: 'first', ratio: 0.5 })).toBeNull();
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, ratio: Number.NaN })).toBeNull();
        expect(buildDataViewerDistanceQuickWindow()).toBeNull();
    });

    test('a ratio outside 0..1 is held to the extent rather than escaping it', () => {
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'first', ratio: 3 })).toEqual({ from: 0, to: 4000 });
        expect(buildDataViewerDistanceQuickWindow({ ...bounds, edge: 'last', ratio: -1 })).toEqual({ from: 4000, to: 4000 });
    });

    // The edges go straight into the From/To text boxes, so they have to be numbers a user could
    // have typed — `4828 * 0.1` is 482.80000000000007 unrounded.
    test('the edges it writes are numbers a user could have typed', () => {
        const noisy = buildDataViewerDistanceQuickWindow({ min: 0, max: 4828, edge: 'first', ratio: 0.1 })!;
        expect(noisy.to).toBe(482.8);
        expect(String(noisy.to)).not.toMatch(/\d{13}/);
    });
});

// What a thumb commits, whether it was moved by a pixel or by an arrow key. The step the thumbs move
// in is about a thousandth of the extent rounded to something round, so it almost never divides the
// extent: 0 .. 999,990 in steps of 1,000 runs out at 999,000, and "as far as it goes" has to be
// defined by the bound rather than by the grid — otherwise the last 990 m of that axis, the maximum
// among them, cannot be selected at all.
describe('distance slider edge snapping', () => {
    const wide = { min: 0, max: 999990, step: 1000 };

    test('either bound is exactly reachable, whatever the step leaves over', () => {
        expect(snapDataViewerDistanceEdge({ ...wide, value: 999990 })).toBe(999990);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 1_000_000 })).toBe(999990);
        // The last half-step of the rail is the bound itself, not the last grid point below it —
        // 0 .. 4828 in steps of 5 has its last grid point at 4825, and rounding 4826 to the grid
        // would park the thumb there while the pointer was already at the end of the rail.
        expect(snapDataViewerDistanceEdge({ min: 0, max: 4828, step: 5, value: 4826 })).toBe(4828);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 999600 })).toBe(999990);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 0 })).toBe(0);
        expect(snapDataViewerDistanceEdge({ ...wide, value: -50 })).toBe(0);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 300 })).toBe(0);
    });

    test('everything between them lands on a number a user could have typed', () => {
        expect(snapDataViewerDistanceEdge({ ...wide, value: 401578.346465 })).toBe(402000);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 500499 })).toBe(500000);
        expect(snapDataViewerDistanceEdge({ min: 0, max: 4828, step: 5, value: 1234.5678 })).toBe(1235);
    });

    test('an extent that is not one leaves the value alone rather than inventing a bound', () => {
        expect(snapDataViewerDistanceEdge({ min: 0, max: 0, step: 1, value: 42 })).toBe(42);
        expect(snapDataViewerDistanceEdge({ value: 42 })).toBe(42);
        expect(snapDataViewerDistanceEdge({ ...wide, value: 'abc' })).toBe(0);
        expect(snapDataViewerDistanceEdge()).toBe(0);
    });
});

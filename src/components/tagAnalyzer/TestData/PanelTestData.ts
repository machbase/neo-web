import type {
    ChartData,
    ChartSeriesItem,
    PanelAxes,
    PanelData,
    PanelDisplay,
    PanelInfo,
    PanelMeta,
    PanelTime,
    TimeRangePair,
    SeriesColumns,
    SeriesConfig,
    TimeRangeConfig,
    TimeRange,
} from '../utils/ModelTypes';
import type { BoardSourceInfo, EditRequest, OverlapPanelInfo } from '../utils/TagAnalyzerTypes';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyUtils';
import { normalizeTimeRangeConfig } from '../utils/TagAnalyzerTimeRangeConfig';
import type { LegacyTimeValue } from '../utils/legacy/LegacyTypes';
import { toLegacyFlatPanelInfo } from '../utils/TagAnalyzerPanelInfoConversion';

type FixtureOverrides<T> = Partial<{
    [K in keyof T]: T[K] | undefined;
}>;

function stripUndefinedFields<T extends Record<string, unknown>>(
    aOverrides: FixtureOverrides<T> | undefined,
): Partial<T> {
    return Object.fromEntries(
        Object.entries(aOverrides ?? {}).filter(([, aValue]) => aValue !== undefined),
    ) as Partial<T>;
}

// Override shape for series-config fixtures, including partial column metadata.
// Used by PanelTestData fixtures to type series config overrides.
type TagAnalyzerSeriesConfigOverrides = Omit<
    FixtureOverrides<SeriesConfig>,
    'colName'
> & {
    colName: FixtureOverrides<SeriesColumns> | undefined;
};

// Override shape for panel-time fixtures, including nested saved time-range pairs.
// Used by PanelTestData fixtures to type panel time overrides.
type TagAnalyzerPanelTimeOverrides = FixtureOverrides<
    Omit<PanelTime, 'time_keeper' | 'range_bgn' | 'range_end' | 'range_config'>
> &
    Partial<{
        time_keeper: FixtureOverrides<TimeRangePair> | undefined;
        range_bgn: LegacyTimeValue | undefined;
        range_end: LegacyTimeValue | undefined;
        range_config: TimeRangeConfig | undefined;
    }>;

// Override shape for nested panel-info fixtures used across tests.
// Used by PanelTestData fixtures to type panel info overrides.
type TagAnalyzerPanelInfoOverrides = FixtureOverrides<{
    meta: FixtureOverrides<PanelMeta>;
    data: FixtureOverrides<PanelData>;
    time: TagAnalyzerPanelTimeOverrides | undefined;
    axes: FixtureOverrides<PanelAxes>;
    display: FixtureOverrides<PanelDisplay>;
    use_normalize: boolean | undefined;
}>;

// Override shape for overlap-panel fixtures, with nested board overrides.
// Used by PanelTestData fixtures to type overlap panel info fixture overrides.
type OverlapPanelInfoFixtureOverrides = Omit<
    FixtureOverrides<OverlapPanelInfo>,
    'board'
> & {
    board: TagAnalyzerPanelInfoOverrides | undefined;
};

// Override shape for top-level board-source fixtures in TagAnalyzer tests.
// Used by PanelTestData fixtures to type board source info overrides.
type TagAnalyzerBoardSourceInfoOverrides = FixtureOverrides<BoardSourceInfo>;

// Override shape for top-level edit-request fixtures passed into the editor flow.
// Used by PanelTestData fixtures to type edit request overrides.
type TagAnalyzerEditRequestOverrides = Omit<
    FixtureOverrides<EditRequest>,
    'pPanelInfo' | 'pNavigatorRange'
> & {
    pPanelInfo: PanelInfo | undefined;
    pNavigatorRange: FixtureOverrides<TimeRange> | undefined;
};

/**
 * Builds a time-range fixture for panel and navigator tests.
 * @param aOverrides The range fields to override for the current fixture.
 * @returns A complete time-range fixture.
 */
export function createTagAnalyzerTimeRangeFixture(
    aOverrides: FixtureOverrides<TimeRange> = {},
): TimeRange {
    return {
        startTime: 100,
        endTime: 200,
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the source-column mapping used by chart-series fixtures.
 * @param aOverrides The source-column fields to override for the current fixture.
 * @returns A complete series-column fixture.
 */
export function createTagAnalyzerSeriesColumnsFixture(
    aOverrides: FixtureOverrides<SeriesColumns> = {},
): SeriesColumns {
    return {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds a series-config fixture for panel, fetch, and adapter tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A complete series-config fixture.
 */
export function createTagAnalyzerSeriesConfigFixture(
    aOverrides: TagAnalyzerSeriesConfigOverrides = { colName: undefined },
): SeriesConfig {
    const { colName, ...sSeriesOverrides } = aOverrides;
    const sColumns = createTagAnalyzerSeriesColumnsFixture(colName ?? {});

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        alias: '',
        calculationMode: 'avg',
        color: '#ff0000',
        use_y2: false,
        id: undefined,
        onRollup: false,
        ...stripUndefinedFields(sSeriesOverrides),
        colName: sColumns,
    };
}

/**
 * Builds the fetch-focused series config used by TagAnalyzerFetchUtils tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A series-config fixture that matches the fetch helper expectations.
 */
export function createTagAnalyzerFetchSeriesConfigFixture(
    aOverrides: TagAnalyzerSeriesConfigOverrides = { colName: undefined },
): SeriesConfig {
    const { colName, ...sSeriesOverrides } = aOverrides;

    return createTagAnalyzerSeriesConfigFixture({
        calculationMode: 'AVG',
        onRollup: false,
        colName: {
            value: 'value_col',
            ...stripUndefinedFields(colName),
        },
        ...stripUndefinedFields(sSeriesOverrides),
    });
}

/**
 * Builds a chart-series item fixture for chart rendering tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A complete chart-series item fixture.
 */
export function createTagAnalyzerChartSeriesItemFixture(
    aOverrides: FixtureOverrides<ChartSeriesItem> = {},
): ChartSeriesItem {
    return {
        name: 'temp(avg)',
        data: [[100, 1]],
        yAxis: 0,
        marker: {
            symbol: 'circle',
        lineColor: undefined,
            lineWidth: 1,
        },
        color: '#ff0000',
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default chart-series list used by panel tests.
 * @returns A one-series chart dataset list.
 */
export function createTagAnalyzerChartSeriesListFixture(): ChartSeriesItem[] {
    return [createTagAnalyzerChartSeriesItemFixture(undefined)];
}

/**
 * Builds navigator chart data for chart and layout tests.
 * @param aOverrides The chart-data fields to override for the current fixture.
 * @returns A complete chart-data fixture.
 */
export function createTagAnalyzerChartDataFixture(
    aOverrides: FixtureOverrides<ChartData> = {},
): ChartData {
    return {
        datasets: [createTagAnalyzerChartSeriesItemFixture(undefined)],
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default panel-axis config used by panel tests.
 * @param aOverrides The axis fields to override for the current fixture.
 * @returns A complete axis-config fixture.
 */
export function createTagAnalyzerPanelAxesFixture(
    aOverrides: FixtureOverrides<PanelAxes> = {},
): PanelAxes {
    return {
        show_x_tickline: true,
        pixels_per_tick_raw: 100,
        pixels_per_tick: 100,
        use_sampling: true,
        sampling_value: 9,
        zero_base: false,
        show_y_tickline: true,
        primaryRange: { min: 0, max: 0 },
        primaryDrilldownRange: { min: 0, max: 0 },
        use_ucl: false,
        ucl_value: 0,
        use_lcl: false,
        lcl_value: 0,
        use_right_y2: false,
        zero_base2: false,
        show_y_tickline2: false,
        secondaryRange: { min: 0, max: 0 },
        secondaryDrilldownRange: { min: 0, max: 0 },
        use_ucl2: false,
        ucl2_value: 0,
        use_lcl2: false,
        lcl2_value: 0,
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default panel-display config used by chart tests.
 * @param aOverrides The display fields to override for the current fixture.
 * @returns A complete display-config fixture.
 */
export function createTagAnalyzerPanelDisplayFixture(
    aOverrides: FixtureOverrides<PanelDisplay> = {},
): PanelDisplay {
    return {
        show_legend: true,
        use_zoom: false,
        chart_type: 'Line',
        show_point: true,
        point_radius: 2,
        fill: 3,
        stroke: 4,
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default time-range pair used by panel-time tests.
 * @param aOverrides The time-range pair fields to override for the current fixture.
 * @returns A complete time-range pair fixture.
 */
export function createTagAnalyzerTimeRangePairFixture(
    aOverrides: FixtureOverrides<TimeRangePair> = {},
): TimeRangePair {
    return {
        panelRange: { startTime: 10, endTime: 20 },
        navigatorRange: { startTime: 5, endTime: 25 },
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default panel-data config used by fetch and runtime tests.
 * @param aOverrides The data fields to override for the current fixture.
 * @returns A complete panel-data fixture.
 */
export function createTagAnalyzerPanelDataFixture(
    aOverrides: FixtureOverrides<PanelData> = {},
): PanelData {
    return {
        tag_set: [createTagAnalyzerSeriesConfigFixture(undefined)],
        raw_keeper: false,
        count: 500,
        interval_type: 'sec',
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the default panel-time config used by runtime and editor tests.
 * @param aOverrides The time fields to override for the current fixture.
 * @returns A complete panel-time fixture.
 */
export function createTagAnalyzerPanelTimeFixture(
    aOverrides: TagAnalyzerPanelTimeOverrides = { time_keeper: undefined },
): PanelTime {
    const {
        time_keeper,
        range_bgn = 'now-1h',
        range_end = 'now',
        range_config,
        ...sTimeOverrides
    } = aOverrides;
    const sNormalizedTimeRange = range_config
        ? normalizeTimeRangeConfig(range_config)
        : normalizeLegacyTimeRangeBoundary(range_bgn, range_end);

    return {
        range_bgn: sNormalizedTimeRange.range.min,
        range_end: sNormalizedTimeRange.range.max,
        range_config: range_config ?? sNormalizedTimeRange.rangeConfig,
        use_time_keeper: false,
        time_keeper: createTagAnalyzerTimeRangePairFixture(time_keeper ?? {}),
        default_range: {
            min: 1,
            max: 2,
        },
        ...stripUndefinedFields(sTimeOverrides),
    };
}

/**
 * Builds a panel-time fixture with blank range bounds for reset/initialization tests.
 * @param aOverrides The time fields to override for the current fixture.
 * @returns A panel-time fixture with empty range bounds.
 */
export function createEmptyTagAnalyzerPanelTimeFixture(
    aOverrides: TagAnalyzerPanelTimeOverrides = { time_keeper: undefined },
): PanelTime {
    return createTagAnalyzerPanelTimeFixture({
        range_bgn: '',
        range_end: '',
        ...aOverrides,
    });
}

/**
 * Builds a nested panel-info fixture for editor and model tests.
 * @param aOverrides The nested panel-info fields to override for the current fixture.
 * @returns A complete panel-info fixture.
 */
export function createTagAnalyzerPanelInfoFixture(
    aOverrides: TagAnalyzerPanelInfoOverrides = {
        meta: undefined,
        data: undefined,
        time: undefined,
        axes: undefined,
        display: undefined,
        use_normalize: undefined,
    },
): PanelInfo {
    const {
        meta,
        data,
        time,
        axes,
        display,
        use_normalize,
    } = aOverrides;

    return {
        meta: {
            index_key: 'panel-1',
            chart_title: 'Panel One',
            ...stripUndefinedFields(meta),
        },
        data: createTagAnalyzerPanelDataFixture(data),
        time: createTagAnalyzerPanelTimeFixture(time),
        axes: createTagAnalyzerPanelAxesFixture({
            pixels_per_tick_raw: 10,
            pixels_per_tick: 20,
            sampling_value: 30,
            primaryRange: { min: 40, max: 50 },
            primaryDrilldownRange: { min: 60, max: 70 },
            use_ucl: true,
            ucl_value: 80,
            lcl_value: 90,
            use_right_y2: false,
            zero_base2: true,
            show_y_tickline2: false,
            secondaryRange: { min: 100, max: 110 },
            secondaryDrilldownRange: { min: 120, max: 130 },
            use_ucl2: false,
            ucl2_value: 140,
            use_lcl2: true,
            lcl2_value: 150,
            ...stripUndefinedFields(axes),
        }),
        display: createTagAnalyzerPanelDisplayFixture(display),
        use_normalize: use_normalize ?? false,
    };
}

/**
 * Builds the board-source shape passed into the top-level TagAnalyzer workspace.
 * @param aOverrides The board-source fields to override for the current fixture.
 * @returns A board-source fixture with one flattened panel by default.
 */
export function createTagAnalyzerBoardSourceInfoFixture(
    aOverrides: TagAnalyzerBoardSourceInfoOverrides = {},
): BoardSourceInfo {
    return {
        id: 'board-1',
        type: 'tag',
        name: 'Tag Board',
        path: '/tag-board',
        code: '',
        panels: [toLegacyFlatPanelInfo(createTagAnalyzerPanelInfoFixture(undefined))],
        range_bgn: 'now-1h',
        range_end: 'now',
        savedCode: false,
        ...stripUndefinedFields(aOverrides),
    };
}

/**
 * Builds the top-level edit request shape used to open PanelEditor from TagAnalyzer.
 * @param aOverrides The edit-request fields to override for the current fixture.
 * @returns A complete edit-request fixture.
 */
export function createTagAnalyzerEditRequestFixture(
    aOverrides: TagAnalyzerEditRequestOverrides = {
        pPanelInfo: undefined,
        pNavigatorRange: undefined,
    },
): EditRequest {
    const { pPanelInfo, pNavigatorRange, pSetSaveEditedInfo } = aOverrides;

    return {
        pPanelInfo: pPanelInfo ?? createTagAnalyzerPanelInfoFixture(undefined),
        pNavigatorRange: createTagAnalyzerTimeRangeFixture(pNavigatorRange ?? {}),
        pSetSaveEditedInfo: pSetSaveEditedInfo ?? jest.fn(),
    };
}

/**
 * Builds the footer props needed by focused footer interaction tests.
 * @param aVisibleRange The visible range to show in the footer labels.
 * @returns The minimum footer props for label and click-handler tests.
 */
export function createPanelFooterPropsFixture(aVisibleRange: FixtureOverrides<TimeRange> = {}) {
    return {
        pPanelSummary: {
            tagCount: 1,
            showLegend: false,
        },
        pVisibleRange: createTagAnalyzerTimeRangeFixture(aVisibleRange),
        pShiftHandlers: {
            onShiftPanelRangeLeft: jest.fn(),
            onShiftPanelRangeRight: jest.fn(),
            onShiftNavigatorRangeLeft: jest.fn(),
            onShiftNavigatorRangeRight: jest.fn(),
        },
        pZoomHandlers: {
            onZoomIn: jest.fn(),
            onZoomOut: jest.fn(),
            onFocus: jest.fn(),
        },
    };
}

/**
 * Builds the minimal overlap-panel info used by overlap helper tests.
 * @param aOverrides The overlap-panel fields to override for the current fixture.
 * @returns A minimal overlap-panel fixture with board-axis settings.
 */
export function createOverlapPanelInfoFixture(
    aOverrides: OverlapPanelInfoFixtureOverrides = { board: undefined },
): OverlapPanelInfo {
    const { board, ...sOverlapOverrides } = aOverrides;

    return {
        start: 1_000,
        duration: 5_000,
        isRaw: false,
        board: createTagAnalyzerPanelInfoFixture({
            axes: {
                pixels_per_tick: 20,
                pixels_per_tick_raw: 10,
                ...stripUndefinedFields(board?.axes),
            },
            meta: board?.meta,
            data: board?.data,
            time: board?.time,
            display: board?.display,
            use_normalize: board?.use_normalize,
        }),
        ...stripUndefinedFields(sOverlapOverrides),
    };
}

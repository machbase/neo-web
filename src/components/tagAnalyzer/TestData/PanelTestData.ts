import type {
    PanelAxisThreshold,
    PanelAxes,
    PanelData,
    PanelDisplay,
    PanelHighlight,
    PanelInfo,
    PanelMeta,
    PanelSampling,
    PanelToolbarConfig,
    PanelXAxis,
    PanelYAxis,
    PanelTime,
} from '../utils/panelModelTypes';
import type {
    ChartData,
    ChartSeriesData,
    SeriesAnnotation,
    PanelSeriesSourceColumns,
    PanelSeriesDefinition,
} from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs, TimeRangeConfig, TimeRangePair } from '../utils/time/types/TimeTypes';
import type { OverlapPanelInfo } from '../boardModal/OverlapTypes';
import type { EditRequest } from '../utils/boardTypes';
import {
    normalizeStoredTimeRangeBoundary,
    type StoredTimeValue,
} from '../utils/time/StoredTimeRangeAdapter';
import { normalizeTimeRangeConfig } from '../utils/time/TimeBoundaryParsing';
import type { PersistedTazBoardInfo } from '../utils/persistence/TazPersistenceTypes';
import { createPersistedPanelInfo } from '../utils/persistence/save/TazPanelSaveMapper';
import { TAZ_FORMAT_VERSION } from '../utils/persistence/versionParsing/TazVersionResolver';

type FixtureOverrides<T> = Partial<{
    [K in keyof T]: T[K] | undefined;
}>;

type DeepFixtureOverrides<T> = Partial<{
    [K in keyof T]:
        T[K] extends Array<unknown>
            ? T[K] | undefined
            : T[K] extends Record<string, unknown>
              ? DeepFixtureOverrides<T[K]> | undefined
              : T[K] | undefined;
}>;

/**
 * Removes undefined override fields from a fixture override object.
 * Intent: Let fixture builders merge only the values the test actually wants to override.
 * @param {FixtureOverrides<T> | undefined} overrides The optional override object to clean.
 * @returns {Partial<T>} The override object without undefined fields.
 */
function stripUndefinedFields<T extends Record<string, unknown>>(
    overrides: FixtureOverrides<T> | undefined,
): Partial<T> {
    return Object.fromEntries(
        Object.entries(overrides ?? {}).filter(([, aValue]) => aValue !== undefined),
    ) as Partial<T>;
}

// Override shape for series-config fixtures, including partial column metadata.
// Used by PanelTestData fixtures to type series config overrides.
type TagAnalyzerSeriesConfigOverrides = Omit<
    FixtureOverrides<PanelSeriesDefinition>,
    'sourceColumns'
> & {
    sourceColumns?: FixtureOverrides<PanelSeriesSourceColumns> | undefined;
};

// Override shape for panel-time fixtures, including nested saved time-range pairs.
// Used by PanelTestData fixtures to type panel time overrides.
type TagAnalyzerPanelTimeOverrides = FixtureOverrides<
    Omit<PanelTime, 'time_keeper' | 'range_bgn' | 'range_end' | 'range_config'>
> &
    Partial<{
        time_keeper: FixtureOverrides<TimeRangePair> | undefined;
        range_bgn: StoredTimeValue | undefined;
        range_end: StoredTimeValue | undefined;
        range_config: TimeRangeConfig | undefined;
    }>;

// Override shape for nested panel-info fixtures used across tests.
// Used by PanelTestData fixtures to type panel info overrides.
type TagAnalyzerPanelInfoOverrides = FixtureOverrides<{
    meta: FixtureOverrides<PanelMeta>;
    data: FixtureOverrides<PanelData>;
    toolbar: FixtureOverrides<PanelToolbarConfig>;
    time: TagAnalyzerPanelTimeOverrides | undefined;
    axes: DeepFixtureOverrides<PanelAxes>;
    display: FixtureOverrides<PanelDisplay>;
    use_normalize: boolean | undefined;
    highlights: PanelHighlight[] | undefined;
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
type TagAnalyzerBoardSourceInfoOverrides = FixtureOverrides<PersistedTazBoardInfo>;

// Override shape for top-level edit-request fixtures passed into the editor flow.
// Used by PanelTestData fixtures to type edit request overrides.
type TagAnalyzerEditRequestOverrides = Omit<
    FixtureOverrides<EditRequest>,
    'pPanelInfo' | 'pNavigatorRange'
> & {
    pPanelInfo: PanelInfo | undefined;
    pNavigatorRange: FixtureOverrides<TimeRangeMs> | undefined;
};

/**
 * Builds a time-range fixture for panel and navigator tests.
 * Intent: Keep time-range tests focused on a stable default window.
 * @param {FixtureOverrides<TimeRangeMs>} overrides The range fields to override for the current fixture.
 * @returns {TimeRangeMs} A complete time-range fixture.
 */
export function createTagAnalyzerTimeRangeFixture(
    overrides: FixtureOverrides<TimeRangeMs> = {},
): TimeRangeMs {
    return {
        startTime: 100,
        endTime: 200,
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the source-column mapping used by chart-series fixtures.
 * Intent: Keep chart-series and fetch helpers on a predictable column layout.
 * @param {FixtureOverrides<PanelSeriesSourceColumns>} overrides The source-column fields to override for the current fixture.
 * @returns {PanelSeriesSourceColumns} A complete series-column fixture.
 */
export function createTagAnalyzerSeriesColumnsFixture(
    overrides: FixtureOverrides<PanelSeriesSourceColumns> = {},
): PanelSeriesSourceColumns {
    return {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds a series-config fixture for panel, fetch, and adapter tests.
 * Intent: Reuse one normalized series config across the TagAnalyzer test surface.
 * @param {TagAnalyzerSeriesConfigOverrides} overrides The series fields to override for the current fixture.
 * @returns {PanelSeriesDefinition} A complete series-config fixture.
 */
export function createTagAnalyzerSeriesConfigFixture(
    overrides: TagAnalyzerSeriesConfigOverrides = { sourceColumns: undefined },
): PanelSeriesDefinition {
    const { sourceColumns, ...sSeriesOverrides } = overrides;
    const sColumns = createTagAnalyzerSeriesColumnsFixture(sourceColumns ?? {});

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        alias: '',
        calculationMode: 'avg',
        color: '#ff0000',
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        annotations: [] as SeriesAnnotation[],
        ...stripUndefinedFields(sSeriesOverrides),
        sourceColumns: sColumns,
    };
}

/**
 * Builds the fetch-focused series config used by TagAnalyzerFetchUtils tests.
 * Intent: Keep repository and adapter tests aligned with the fetch helper expectations.
 * @param {TagAnalyzerSeriesConfigOverrides} overrides The series fields to override for the current fixture.
 * @returns {PanelSeriesDefinition} A series-config fixture that matches the fetch helper expectations.
 */
export function createTagAnalyzerFetchSeriesConfigFixture(
    overrides: TagAnalyzerSeriesConfigOverrides = { sourceColumns: undefined },
): PanelSeriesDefinition {
    const { sourceColumns, ...sSeriesOverrides } = overrides;

    return createTagAnalyzerSeriesConfigFixture({
        calculationMode: 'AVG',
        useRollupTable: false,
        sourceColumns: {
            value: 'value_col',
            ...stripUndefinedFields(sourceColumns),
        },
        ...stripUndefinedFields(sSeriesOverrides),
    });
}

/**
 * Builds a chart-series item fixture for chart rendering tests.
 * Intent: Keep chart rendering tests on a stable series item shape.
 * @param {FixtureOverrides<ChartSeriesData>} overrides The series fields to override for the current fixture.
 * @returns {ChartSeriesData} A complete chart-series item fixture.
 */
export function createTagAnalyzerChartSeriesDataFixture(
    overrides: FixtureOverrides<ChartSeriesData> = {},
): ChartSeriesData {
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
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default chart-series list used by panel tests.
 * Intent: Keep single-series chart tests short and predictable.
 * @returns {ChartSeriesData[]} A one-series chart dataset list.
 */
export function createTagAnalyzerChartSeriesListFixture(): ChartSeriesData[] {
    return [createTagAnalyzerChartSeriesDataFixture(undefined)];
}

/**
 * Builds navigator chart data for chart and layout tests.
 * Intent: Keep chart-layout tests anchored to a consistent dataset wrapper.
 * @param {FixtureOverrides<ChartData>} overrides The chart-data fields to override for the current fixture.
 * @returns {ChartData} A complete chart-data fixture.
 */
export function createTagAnalyzerChartDataFixture(
    overrides: FixtureOverrides<ChartData> = {},
): ChartData {
    return {
        datasets: [createTagAnalyzerChartSeriesDataFixture(undefined)],
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default panel-axis config used by panel tests.
 * Intent: Keep panel-axis tests on a stable default configuration.
 * @param {FixtureOverrides<PanelAxes>} overrides The axis fields to override for the current fixture.
 * @returns {PanelAxes} A complete axis-config fixture.
 */
export function createTagAnalyzerPanelAxesFixture(
    overrides: DeepFixtureOverrides<PanelAxes> = {},
): PanelAxes {
    const sXAxisOverrides = overrides.x_axis ?? {};
    const sSamplingOverrides = overrides.sampling ?? {};
    const sPrimaryYAxisOverrides = overrides.left_y_axis ?? {};
    const sSecondaryYAxisOverrides = overrides.right_y_axis ?? {};
    const sRightYAxisEnabledOverride = overrides.right_y_axis_enabled;

    return {
        x_axis: {
            show_tickline: true,
            raw_data_pixels_per_tick: 100,
            calculated_data_pixels_per_tick: 100,
            ...stripUndefinedFields(sXAxisOverrides as FixtureOverrides<PanelXAxis>),
        },
        sampling: {
            enabled: true,
            sample_count: 9,
            ...stripUndefinedFields(sSamplingOverrides as FixtureOverrides<PanelSampling>),
        },
        left_y_axis: {
            zero_base: false,
            show_tickline: true,
            value_range: {
                min: 0,
                max: 0,
                ...stripUndefinedFields(
                    sPrimaryYAxisOverrides.value_range as FixtureOverrides<PanelYAxis['value_range']>,
                ),
            },
            raw_data_value_range: {
                min: 0,
                max: 0,
                ...stripUndefinedFields(
                    sPrimaryYAxisOverrides.raw_data_value_range as FixtureOverrides<
                        PanelYAxis['raw_data_value_range']
                    >,
                ),
            },
            upper_control_limit: {
                enabled: false,
                value: 0,
                ...stripUndefinedFields(
                    sPrimaryYAxisOverrides.upper_control_limit as FixtureOverrides<
                        PanelAxisThreshold
                    >,
                ),
            },
            lower_control_limit: {
                enabled: false,
                value: 0,
                ...stripUndefinedFields(
                    sPrimaryYAxisOverrides.lower_control_limit as FixtureOverrides<
                        PanelAxisThreshold
                    >,
                ),
            },
            ...stripUndefinedFields({
                zero_base: sPrimaryYAxisOverrides.zero_base,
                show_tickline: sPrimaryYAxisOverrides.show_tickline,
            }),
        },
        right_y_axis_enabled: sRightYAxisEnabledOverride ?? false,
        right_y_axis: {
            zero_base: false,
            show_tickline: false,
            value_range: {
                min: 0,
                max: 0,
                ...stripUndefinedFields(
                    sSecondaryYAxisOverrides.value_range as FixtureOverrides<PanelYAxis['value_range']>,
                ),
            },
            raw_data_value_range: {
                min: 0,
                max: 0,
                ...stripUndefinedFields(
                    sSecondaryYAxisOverrides.raw_data_value_range as FixtureOverrides<
                        PanelYAxis['raw_data_value_range']
                    >,
                ),
            },
            upper_control_limit: {
                enabled: false,
                value: 0,
                ...stripUndefinedFields(
                    sSecondaryYAxisOverrides.upper_control_limit as FixtureOverrides<
                        PanelAxisThreshold
                    >,
                ),
            },
            lower_control_limit: {
                enabled: false,
                value: 0,
                ...stripUndefinedFields(
                    sSecondaryYAxisOverrides.lower_control_limit as FixtureOverrides<
                        PanelAxisThreshold
                    >,
                ),
            },
            ...stripUndefinedFields({
                zero_base: sSecondaryYAxisOverrides.zero_base,
                show_tickline: sSecondaryYAxisOverrides.show_tickline,
            }),
        },
    };
}

/**
 * Builds the default panel-display config used by chart tests.
 * Intent: Keep chart display tests focused on predictable legend and zoom settings.
 * @param {FixtureOverrides<PanelDisplay>} overrides The display fields to override for the current fixture.
 * @returns {PanelDisplay} A complete display-config fixture.
 */
export function createTagAnalyzerPanelDisplayFixture(
    overrides: FixtureOverrides<PanelDisplay> = {},
): PanelDisplay {
    return {
        show_legend: true,
        use_zoom: false,
        chart_type: 'Line',
        show_point: true,
        point_radius: 2,
        fill: 3,
        stroke: 4,
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default time-range pair used by panel-time tests.
 * Intent: Keep panel time-range tests on a predictable saved-range pair.
 * @param {FixtureOverrides<TimeRangePair>} overrides The time-range pair fields to override for the current fixture.
 * @returns {TimeRangePair} A complete time-range pair fixture.
 */
export function createTagAnalyzerTimeRangePairFixture(
    overrides: FixtureOverrides<TimeRangePair> = {},
): TimeRangePair {
    return {
        panelRange: { startTime: 10, endTime: 20 },
        navigatorRange: { startTime: 5, endTime: 25 },
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default panel-data config used by fetch and runtime tests.
 * Intent: Reuse one normalized panel data shape across runtime and fetch tests.
 * @param {FixtureOverrides<PanelData>} overrides The data fields to override for the current fixture.
 * @returns {PanelData} A complete panel-data fixture.
 */
export function createTagAnalyzerPanelDataFixture(
    overrides: FixtureOverrides<PanelData> = {},
): PanelData {
    return {
        tag_set: [createTagAnalyzerSeriesConfigFixture(undefined)],
        count: 500,
        interval_type: 'sec',
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default panel-toolbar config used by runtime and persistence tests.
 * Intent: Keep toolbar-owned persisted panel settings separate from fetched panel data.
 * @param {FixtureOverrides<PanelToolbarConfig>} overrides The toolbar fields to override for the current fixture.
 * @returns {PanelToolbarConfig} A complete panel-toolbar fixture.
 */
export function createTagAnalyzerPanelToolbarFixture(
    overrides: FixtureOverrides<PanelToolbarConfig> = {},
): PanelToolbarConfig {
    return {
        isRaw: false,
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the default panel-time config used by runtime and editor tests.
 * Intent: Keep panel-time tests aligned with the legacy normalization path.
 * @param {TagAnalyzerPanelTimeOverrides} overrides The time fields to override for the current fixture.
 * @returns {PanelTime} A complete panel-time fixture.
 */
export function createTagAnalyzerPanelTimeFixture(
    overrides: TagAnalyzerPanelTimeOverrides = { time_keeper: undefined },
): PanelTime {
    const {
        time_keeper,
        range_bgn = 'now-1h',
        range_end = 'now',
        range_config,
        ...sTimeOverrides
    } = overrides;
    const sNormalizedTimeRange = range_config
        ? normalizeTimeRangeConfig(range_config)
        : normalizeStoredTimeRangeBoundary(range_bgn, range_end);

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
 * Intent: Keep reset-path tests focused on empty persisted range values.
 * @param {TagAnalyzerPanelTimeOverrides} overrides The time fields to override for the current fixture.
 * @returns {PanelTime} A panel-time fixture with empty range bounds.
 */
export function createEmptyTagAnalyzerPanelTimeFixture(
    overrides: TagAnalyzerPanelTimeOverrides = { time_keeper: undefined },
): PanelTime {
    return createTagAnalyzerPanelTimeFixture({
        range_bgn: '',
        range_end: '',
        ...overrides,
    });
}

/**
 * Builds a nested panel-info fixture for editor and model tests.
 * Intent: Keep nested board, data, and time fixtures consistent across TagAnalyzer tests.
 * @param {TagAnalyzerPanelInfoOverrides} overrides The nested panel-info fields to override for the current fixture.
 * @returns {PanelInfo} A complete panel-info fixture.
 */
export function createTagAnalyzerPanelInfoFixture(
    overrides: TagAnalyzerPanelInfoOverrides = {
        meta: undefined,
        data: undefined,
        toolbar: undefined,
        time: undefined,
        axes: undefined,
        display: undefined,
        use_normalize: undefined,
        highlights: undefined,
    },
): PanelInfo {
    const {
        meta,
        data,
        toolbar,
        time,
        axes,
        display,
        use_normalize,
        highlights,
    } = overrides;

    return {
        meta: {
            index_key: 'panel-1',
            chart_title: 'Panel One',
            ...stripUndefinedFields(meta),
        },
        data: createTagAnalyzerPanelDataFixture(data),
        toolbar: createTagAnalyzerPanelToolbarFixture(toolbar),
        time: createTagAnalyzerPanelTimeFixture(time),
        axes: createTagAnalyzerPanelAxesFixture({
            x_axis: {
                raw_data_pixels_per_tick: 10,
                calculated_data_pixels_per_tick: 20,
                ...stripUndefinedFields(axes?.x_axis as FixtureOverrides<PanelXAxis>),
            },
            sampling: {
                sample_count: 30,
                ...stripUndefinedFields(axes?.sampling as FixtureOverrides<PanelSampling>),
            },
            left_y_axis: {
                value_range: { min: 40, max: 50, ...stripUndefinedFields(axes?.left_y_axis?.value_range as FixtureOverrides<PanelYAxis['value_range']>) },
                raw_data_value_range: { min: 60, max: 70, ...stripUndefinedFields(axes?.left_y_axis?.raw_data_value_range as FixtureOverrides<PanelYAxis['raw_data_value_range']>) },
                upper_control_limit: { enabled: true, value: 80, ...stripUndefinedFields(axes?.left_y_axis?.upper_control_limit as FixtureOverrides<PanelAxisThreshold>) },
                lower_control_limit: { value: 90, ...stripUndefinedFields(axes?.left_y_axis?.lower_control_limit as FixtureOverrides<PanelAxisThreshold>) },
                ...stripUndefinedFields({
                    zero_base: axes?.left_y_axis?.zero_base,
                    show_tickline: axes?.left_y_axis?.show_tickline,
                }),
            },
            right_y_axis: {
                zero_base: true,
                show_tickline: false,
                value_range: { min: 100, max: 110, ...stripUndefinedFields(axes?.right_y_axis?.value_range as FixtureOverrides<PanelYAxis['value_range']>) },
                raw_data_value_range: { min: 120, max: 130, ...stripUndefinedFields(axes?.right_y_axis?.raw_data_value_range as FixtureOverrides<PanelYAxis['raw_data_value_range']>) },
                upper_control_limit: { enabled: false, value: 140, ...stripUndefinedFields(axes?.right_y_axis?.upper_control_limit as FixtureOverrides<PanelAxisThreshold>) },
                lower_control_limit: { enabled: true, value: 150, ...stripUndefinedFields(axes?.right_y_axis?.lower_control_limit as FixtureOverrides<PanelAxisThreshold>) },
                ...stripUndefinedFields({
                    zero_base: axes?.right_y_axis?.zero_base,
                    show_tickline: axes?.right_y_axis?.show_tickline,
                }),
            },
            right_y_axis_enabled: axes?.right_y_axis_enabled ?? false,
        }),
        display: createTagAnalyzerPanelDisplayFixture(display),
        use_normalize: use_normalize ?? false,
        highlights: highlights ?? [],
    };
}

/**
 * Builds the board-source shape passed into the top-level TagAnalyzer workspace.
 * Intent: Keep the top-level workspace tests on one flattened board fixture by default.
 * @param {TagAnalyzerBoardSourceInfoOverrides} overrides The board-source fields to override for the current fixture.
 * @returns {PersistedTazBoardInfo} A board-source fixture with one flattened panel by default.
 */
export function createTagAnalyzerBoardSourceInfoFixture(
    overrides: TagAnalyzerBoardSourceInfoOverrides = {},
): PersistedTazBoardInfo {
    const sBoardTime = normalizeStoredTimeRangeBoundary('now-1h', 'now');

    return {
        id: 'board-1',
        type: 'taz',
        name: 'Tag Board',
        path: '/tag-board',
        code: '',
        version: TAZ_FORMAT_VERSION,
        panels: [createPersistedPanelInfo(createTagAnalyzerPanelInfoFixture(undefined))],
        boardTimeRange: sBoardTime.rangeConfig,
        savedCode: false,
        ...stripUndefinedFields(overrides),
    };
}

/**
 * Builds the top-level edit request shape used to open PanelEditor from TagAnalyzer.
 * Intent: Keep editor-flow tests on a predictable request object.
 * @param {TagAnalyzerEditRequestOverrides} overrides The edit-request fields to override for the current fixture.
 * @returns {EditRequest} A complete edit-request fixture.
 */
export function createTagAnalyzerEditRequestFixture(
    overrides: TagAnalyzerEditRequestOverrides = {
        pPanelInfo: undefined,
        pNavigatorRange: undefined,
    },
): EditRequest {
    const { pPanelInfo, pNavigatorRange, pSetSaveEditedInfo } = overrides;

    return {
        pPanelInfo: pPanelInfo ?? createTagAnalyzerPanelInfoFixture(undefined),
        pNavigatorRange: createTagAnalyzerTimeRangeFixture(pNavigatorRange ?? {}),
        pSetSaveEditedInfo: pSetSaveEditedInfo ?? jest.fn(),
    };
}

/**
 * Builds the footer props needed by focused footer interaction tests.
 * Intent: Keep footer interaction tests small while preserving the handler shape.
 * @param {FixtureOverrides<TimeRangeMs>} visibleRange The visible range to show in the footer labels.
 * @returns {{ pPanelSummary: { tagCount: number; showLegend: boolean; }; pVisibleRange: TimeRangeMs; pShiftHandlers: { onShiftPanelRangeLeft: jest.Mock; onShiftPanelRangeRight: jest.Mock; onShiftNavigatorRangeLeft: jest.Mock; onShiftNavigatorRangeRight: jest.Mock; }; pZoomHandlers: { onZoomIn: jest.Mock; onZoomOut: jest.Mock; onFocus: jest.Mock; }; }} The minimum footer props for label and click-handler tests.
 */
export function createPanelFooterPropsFixture(visibleRange: FixtureOverrides<TimeRangeMs> = {}) {
    return {
        pPanelSummary: {
            tagCount: 1,
            showLegend: false,
        },
        pVisibleRange: createTagAnalyzerTimeRangeFixture(visibleRange),
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
 * Intent: Keep overlap tests focused on a compact board fixture with stable axes.
 * @param {OverlapPanelInfoFixtureOverrides} overrides The overlap-panel fields to override for the current fixture.
 * @returns {OverlapPanelInfo} A minimal overlap-panel fixture with board-axis settings.
 */
export function createOverlapPanelInfoFixture(
    overrides: OverlapPanelInfoFixtureOverrides = { board: undefined },
): OverlapPanelInfo {
    const { board, ...sOverlapOverrides } = overrides;

    return {
        start: 1_000,
        duration: 5_000,
        isRaw: false,
        board: createTagAnalyzerPanelInfoFixture({
            axes: {
                x_axis: {
                    calculated_data_pixels_per_tick: 20,
                    raw_data_pixels_per_tick: 10,
                    ...stripUndefinedFields(board?.axes?.x_axis as FixtureOverrides<PanelXAxis>),
                },
                sampling: board?.axes?.sampling,
                left_y_axis: board?.axes?.left_y_axis,
                right_y_axis: board?.axes?.right_y_axis,
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


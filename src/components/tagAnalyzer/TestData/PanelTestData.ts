import type {
    PanelAxisThreshold,
    PanelAxes,
    PanelData,
    PanelHighlight,
    PanelDisplay,
    PanelInfo,
    PanelMeta,
    PanelSampling,
    PanelToolbarConfig,
    PanelXAxis,
    PanelYAxis,
    PanelTime,
} from '../domain/PanelModel';
import { normalizePanelHighlight } from '../domain/PanelModel';
import type {
    SeriesAnnotation,
    PanelSeriesSourceColumns,
    PanelSeriesDefinition,
} from '../domain/SeriesModel';
import type { ChartData, ChartSeriesData } from '../chart/ChartTypes';
import type {
    PanelNavigatorRangePair,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';
import type { OverlapPanelInfo } from '../domain/OverlapModel';
import type { ValueRange } from '../domain/ValueRangeModel';
import { parseTimeRangeConfigFromBoundaryValues } from '../time/TimeBoundaryParser';
import type { PersistedTazBoardInfo } from '../persistence/TazPersistenceTypesV200';
import { mapPanelToPersistedTaz } from '../persistence/save/mapPanelToPersistedTaz';
import { TAZ_FORMAT_VERSION } from '../persistence/load/parseLoadedTaz';

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
    Omit<PanelTime, 'timeKeeper' | 'rangeConfig'>
> &
    Partial<{
        timeKeeper: FixtureOverrides<PanelNavigatorRangePair> | undefined;
        range_bgn: string | number | '' | undefined;
        range_end: string | number | '' | undefined;
        default_range: ValueRange | undefined;
        rangeConfig: TimeRangeConfig | undefined;
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
    highlights: PanelHighlightFixture[] | undefined;
}>;

type PanelHighlightFixture = {
    text: string;
    timeRange: ResolvedTimeRangeMs;
    fillColor?: string | undefined;
    textColor?: string | undefined;
};

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
export function createTagAnalyzerTimeRangeFixture(
    overrides: FixtureOverrides<ResolvedTimeRangeMs> = {},
): ResolvedTimeRangeMs {
    return {
        startTime: 100,
        endTime: 200,
        ...stripUndefinedFields(overrides),
    };
}
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
export function createTagAnalyzerChartSeriesListFixture(): ChartSeriesData[] {
    return [createTagAnalyzerChartSeriesDataFixture(undefined)];
}
export function createTagAnalyzerChartDataFixture(
    overrides: FixtureOverrides<ChartData> = {},
): ChartData {
    return {
        datasets: [createTagAnalyzerChartSeriesDataFixture(undefined)],
        ...stripUndefinedFields(overrides),
    };
}
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

export function createTagAnalyzerPanelHighlightFixture(
    overrides: PanelHighlightFixture,
): PanelHighlight {
    return normalizePanelHighlight(overrides);
}
export function createTagAnalyzerPanelNavigatorRangePairFixture(
    overrides: FixtureOverrides<PanelNavigatorRangePair> = {},
): PanelNavigatorRangePair {
    return {
        panelRange: { startTime: 10, endTime: 20 },
        navigatorRange: { startTime: 5, endTime: 25 },
        ...stripUndefinedFields(overrides),
    };
}
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
export function createTagAnalyzerPanelToolbarFixture(
    overrides: FixtureOverrides<PanelToolbarConfig> = {},
): PanelToolbarConfig {
    return {
        isRaw: false,
        ...stripUndefinedFields(overrides),
    };
}
export function createTagAnalyzerPanelTimeFixture(
    overrides: TagAnalyzerPanelTimeOverrides = { timeKeeper: undefined },
): PanelTime {
    const {
        timeKeeper,
        range_bgn = 'now-1h',
        range_end = 'now',
        default_range,
        rangeConfig,
        ...sTimeOverrides
    } = overrides;
    const sNormalizedTimeRange = resolvePanelTimeFixtureBounds(
        rangeConfig,
        range_bgn,
        range_end,
        default_range,
    );

    return {
        rangeConfig: sNormalizedTimeRange,
        useTimeKeeper: false,
        timeKeeper: createTagAnalyzerPanelNavigatorRangePairFixture(timeKeeper ?? {}),
        ...stripUndefinedFields(sTimeOverrides),
    };
}
export function createEmptyTagAnalyzerPanelTimeFixture(
    overrides: TagAnalyzerPanelTimeOverrides = { timeKeeper: undefined },
): PanelTime {
    return createTagAnalyzerPanelTimeFixture({
        range_bgn: '',
        range_end: '',
        ...overrides,
    });
}

function resolvePanelTimeFixtureBounds(
    rangeConfig: TimeRangeConfig | undefined,
    rangeBegin: string | number | '' | undefined,
    rangeEnd: string | number | '' | undefined,
    defaultRange: ValueRange | undefined,
): TimeRangeConfig {
    if (rangeConfig) {
        return rangeConfig;
    }

    if (rangeBegin === '' && rangeEnd === '' && defaultRange) {
        return {
            start: {
                kind: 'absolute' as const,
                timestamp: defaultRange.min,
            },
            end: {
                kind: 'absolute' as const,
                timestamp: defaultRange.max,
            },
        };
    }

    return parseTimeRangeConfigFromBoundaryValues(
        rangeBegin ?? '',
        rangeEnd ?? '',
    );
}
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
        highlights: (highlights ?? []).map((highlight) =>
            createTagAnalyzerPanelHighlightFixture(highlight),
        ),
    };
}
export function createTagAnalyzerBoardSourceInfoFixture(
    overrides: TagAnalyzerBoardSourceInfoOverrides = {},
): PersistedTazBoardInfo {
    const sBoardTime = parseTimeRangeConfigFromBoundaryValues('now-1h', 'now');

    return {
        id: 'board-1',
        type: 'taz',
        name: 'Tag Board',
        path: '/tag-board',
        code: '',
        version: TAZ_FORMAT_VERSION,
        panels: [mapPanelToPersistedTaz(createTagAnalyzerPanelInfoFixture(undefined))],
        boardTimeRange: sBoardTime,
        savedCode: false,
        ...stripUndefinedFields(overrides),
    };
}
export function createPanelFooterPropsFixture(visibleRange: FixtureOverrides<ResolvedTimeRangeMs> = {}) {
    return {
        pShowLegend: false,
        pVisiblePanelRange: createTagAnalyzerTimeRangeFixture(visibleRange),
        pNavigatorActions: {
            onShiftLeft: jest.fn(),
            onShiftRight: jest.fn(),
            onZoomIn: jest.fn(),
            onZoomOut: jest.fn(),
            onFocus: jest.fn(),
        },
    };
}
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





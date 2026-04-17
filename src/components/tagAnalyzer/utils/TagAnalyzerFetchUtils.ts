import { fetchCalculationData, fetchRawData, fetchTablesData } from '@/api/repository/machiot';
import { isRollup, parseTables } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from './legacy/LegacyUtils';
import { resolveTagAnalyzerBgnEndTimeRange } from '../TagAnalyzerUtilCaller';
import {
    calculateInterval,
    convertIntervalUnit,
    getIntervalMs,
} from '../common/timeUtils';
import { calculateSampleCount, getQualifiedTableName } from '../TagAnalyzerUtils';
import {
    createTagAnalyzerTimeRange,
    normalizePanelTimeRangeSource,
    normalizeTimeRangeSource,
    setTimeRange,
} from './TagAnalyzerDateUtils';
import { toLegacyTimeRangeInput as toLegacyTimeRangeInputFromConfig } from './TagAnalyzerTimeRangeConfig';
import type {
    BgnEndTimeRange,
    ChartData,
    ChartRow,
    ChartSeriesItem,
    ValueRange,
    IntervalOption,
    PanelAxes,
    PanelData,
    PanelTime,
    SeriesColumns,
    SeriesConfig,
    TimeRangeConfig,
    TimeRange,
} from '../common/modelTypes';

// Board/controller-facing fetch contract used by the public load helpers.
// Used by TagAnalyzerFetchUtils to type fetch request.
type PanelFetchRequest = {
    panelData: PanelData;
    panelTime: PanelTime;
    panelAxes: PanelAxes;
    boardRange: ValueRange | undefined;
    boardRangeConfig?: TimeRangeConfig | undefined;
    chartWidth: number | undefined;
    isRaw: boolean;
    timeRange: TimeRange | undefined;
    rollupTableList: string[];
};

// Fetch input contract for the shared dataset builder before it gets mapped into chart state.
// Used by TagAnalyzerFetchUtils to type fetch panel datasets params.
type FetchPanelDatasetsParams = Omit<PanelFetchRequest, 'chartWidth'> & {
    seriesConfigSet: SeriesConfig[];
    chartWidth: number;
    useSampling: boolean;
    includeColor: boolean;
    isNavigator: boolean | undefined;
};

// Normalized dataset bundle returned by the shared panel fetch pipeline.
// Used by TagAnalyzerFetchUtils to type fetch panel datasets result.
type FetchPanelDatasetsResult = {
    datasets: ChartSeriesItem[];
    interval: IntervalOption;
    count: number;
    hasDataLimit: boolean;
    limitEnd: number;
};

// Repository row shape used before extra trailing columns are stripped away.
// Used by TagAnalyzerFetchUtils to type tag fetch row.
type TagFetchRow = [number, number, ...unknown[]];

// Minimal repository response shape used by the fetch helpers in this module.
// Used by TagAnalyzerFetchUtils to type chart fetch response.
type ChartFetchResponse = {
    data:
        | {
              column: string[] | undefined;
              rows: TagFetchRow[] | undefined;
          }
        | undefined;
};

// Fields shared by every TagAnalyzer series fetch (calculated or raw).
// Used by TagAnalyzerFetchUtils to type the common request envelope.
type SeriesFetchRequestBase = {
    Table: string;
    TagNames: string;
    Start: number;
    End: number;
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    colName: SeriesColumns | undefined;
    Count: number;
};

// Used by TagAnalyzerFetchUtils to type calculation fetch requests.
type CalculationFetchRequest = SeriesFetchRequestBase & {
    Rollup: boolean;
    RollupList: string[];
};

// Used by TagAnalyzerFetchUtils to type raw fetch requests.
type RawFetchRequest = SeriesFetchRequestBase & {
    Rollup: boolean | undefined;
    UseSampling: boolean | undefined;
    sampleValue: (number | string) | undefined;
};

// Used by TagAnalyzerFetchUtils to type data limit state.
type PanelDataLimitState = {
    hasDataLimit: boolean;
    limitEnd: number;
};

// Main chart-load result returned after dataset mapping and overflow analysis.
// Used by TagAnalyzerFetchUtils to type chart load state.
export type PanelChartLoadState = {
    chartData: ChartData;
    rangeOption: IntervalOption;
    overflowRange: TimeRange | undefined;
};

const EMPTY_INTERVAL_OPTION: IntervalOption = {
    IntervalType: '',
    IntervalValue: 0,
};

/**
 * Loads and parses the source-table metadata used by TagAnalyzer.
 * @returns The parsed table list when the fetch succeeds, otherwise `undefined`.
 */
export const fetchParsedTables = async (): Promise<string[] | undefined> => {
    const sResult = (await fetchTablesData()) as {
        success?: boolean;
        status?: number;
        data: unknown;
    };
    if (sResult.success === false) return undefined;
    if (typeof sResult.status === 'number' && sResult.status >= 400) return undefined;
    return parseTables(sResult.data as { columns: unknown[]; rows: unknown[] });
};

/**
 * Resolves the shared top-level tag time bounds for the current board.
 * @param aTagSet The first panel tag set used to seed the top-level range.
 * @param aStart The requested board start value.
 * @param aEnd The requested board end value.
 * @returns A normalized top-level range with numeric values only.
 */
export const fetchNormalizedTopLevelTimeRange = async (
    aTagSet: SeriesConfig[],
    aBoardRange: ValueRange,
    aBoardRangeConfig: TimeRangeConfig | undefined,
): Promise<BgnEndTimeRange | undefined> => {
    return resolveTagAnalyzerBgnEndTimeRange(
        aTagSet,
        toLegacyTimeRangeInputFromConfig(aBoardRange, aBoardRangeConfig),
        { bgn: '', end: '' },
    );
};

/**
 * Shared fetch pipeline that loads panel datasets from a PanelFetchRequest.
 * Returns `undefined` when the panel has no tags configured.
 */
async function fetchPanelDatasetsFromRequest(
    aRequest: PanelFetchRequest,
    aUseSampling: boolean,
    aIncludeColor: boolean,
    aIsNavigator: boolean | undefined,
): Promise<FetchPanelDatasetsResult | undefined> {
    const sSeriesConfigSet = aRequest.panelData.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return undefined;
    }

    return fetchPanelDatasets({
        seriesConfigSet: sSeriesConfigSet,
        panelData: aRequest.panelData,
        panelTime: aRequest.panelTime,
        panelAxes: aRequest.panelAxes,
        boardRange: aRequest.boardRange,
        boardRangeConfig: aRequest.boardRangeConfig,
        chartWidth: aRequest.chartWidth || 1,
        isRaw: aRequest.isRaw,
        timeRange: aRequest.timeRange,
        rollupTableList: aRequest.rollupTableList,
        useSampling: aUseSampling,
        includeColor: aIncludeColor,
        isNavigator: aIsNavigator,
    });
}

/**
 * Bridges board/controller state into the navigator fetch helper.
 * @param aRequest The panel fetch request for the navigator.
 * @returns The navigator chart data for the current panel.
 * Side effect: performs repository work through the shared navigator chart loader.
 */
export async function loadNavigatorChartState(
    aRequest: PanelFetchRequest,
): Promise<ChartData> {
    const sFetchResult = await fetchPanelDatasetsFromRequest(
        aRequest,
        aRequest.panelAxes.use_sampling,
        false,
        true,
    );

    return { datasets: sFetchResult?.datasets ?? [] };
}

/**
 * Bridges board/controller state into the main panel fetch helper.
 * @param aRequest The panel fetch request for the main chart.
 * @returns The main panel chart load state.
 * Side effect: performs repository work through the shared main-chart loader.
 */
export async function loadPanelChartState(
    aRequest: PanelFetchRequest,
): Promise<PanelChartLoadState> {
    const sFetchResult = await fetchPanelDatasetsFromRequest(aRequest, false, true, undefined);

    if (!sFetchResult) {
        return {
            chartData: { datasets: [] },
            rangeOption: { IntervalType: '', IntervalValue: 0 },
            overflowRange: undefined,
        };
    }

    const sOverflowRange =
        sFetchResult.hasDataLimit && sFetchResult.datasets[0]?.data?.[0]
            ? createTagAnalyzerTimeRange(sFetchResult.datasets[0].data[0][0], sFetchResult.limitEnd)
            : undefined;

    return {
        chartData: { datasets: sFetchResult.datasets },
        rangeOption: sFetchResult.interval,
        overflowRange: sOverflowRange,
    };
}

function createEmptyFetchResponse(): ChartFetchResponse {
    return {
        data: {
            column: [],
            rows: [],
        },
    };
}

function createEmptyFetchPanelDatasetsResult(): FetchPanelDatasetsResult {
    return {
        datasets: [],
        interval: EMPTY_INTERVAL_OPTION,
        count: 0,
        hasDataLimit: false,
        limitEnd: 0,
    };
}

/**
 * Returns whether a time range is concrete enough to send to the repository.
 * Tag Analyzer frequently uses `0` as a sentinel during unresolved range flows,
 * and forwarding those values produces invalid Machbase time comparisons.
 * @param aTimeRange The range about to be fetched.
 * @returns Whether the range is safe to use for a repository request.
 */
export function isFetchableTimeRange(aTimeRange: TimeRange | undefined): aTimeRange is TimeRange {
    if (!aTimeRange) {
        return false;
    }

    const { startTime, endTime } = aTimeRange;
    return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime > 0 &&
        endTime > 0 &&
        endTime > startTime
    );
}

/**
 * Fetches every saved series config and normalizes the responses into chart datasets.
 * @param seriesConfigSet The saved series configs to load for the chart.
 * @param panelData The panel data settings that drive count and interval selection.
 * @param panelTime The panel time settings used to resolve the fetch range.
 * @param panelAxes The panel axis settings used for sampling and density math.
 * @param boardRange The optional board-level time override applied to the fetch.
 * @param chartWidth The measured chart width used for count and interval math.
 * @param isRaw Whether the request should load raw series data.
 * @param timeRange An optional explicit time-range override for the fetch.
 * @param rollupTableList The available rollup tables used to shape fetch requests.
 * @param useSampling Whether sampling should be enabled for this fetch.
 * @param includeColor Whether chart color metadata should be copied into the result.
 * @param isNavigator Whether the fetch is for the navigator overview lane.
 * @returns The normalized datasets and range metadata for the fetch.
 * Side effect: performs one repository fetch per requested series config.
 */
export async function fetchPanelDatasets({
    seriesConfigSet,
    panelData,
    panelTime,
    panelAxes,
    boardRange,
    boardRangeConfig,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
    useSampling,
    includeColor,
    isNavigator,
}: FetchPanelDatasetsParams): Promise<FetchPanelDatasetsResult> {
    const sCount = calculatePanelFetchCount(
        panelData.count,
        useSampling,
        isRaw,
        panelAxes,
        chartWidth,
    );
    const sTimeRange = resolvePanelFetchTimeRange(
        panelTime,
        boardRange,
        boardRangeConfig,
        timeRange,
    );
    if (!isFetchableTimeRange(sTimeRange)) {
        return createEmptyFetchPanelDatasetsResult();
    }
    const sIntervalTime = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        sTimeRange,
        chartWidth,
        isRaw,
        isNavigator,
    );
    const sSeriesFetchResults = await Promise.all(
        seriesConfigSet.map(async (aSeriesConfig) => ({
            seriesConfig: aSeriesConfig,
            fetchResult: await fetchSeriesRows(
                aSeriesConfig,
                sTimeRange,
                sIntervalTime,
                sCount,
                isRaw,
                rollupTableList,
                useSampling,
                panelAxes.sampling_value,
            ),
        })),
    );
    const sDatasets: ChartSeriesItem[] = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < sSeriesFetchResults.length; index++) {
        const { seriesConfig: sSeriesConfig, fetchResult: sFetchResult } = sSeriesFetchResults[index];
        const sRows = sFetchResult?.data?.rows as TagFetchRow[] | undefined;

        const sDataLimitState = analyzePanelDataLimit(isRaw, sRows, sCount, sLimitEnd);
        if (sDataLimitState.hasDataLimit) {
            sHasDataLimit = true;
            sLimitEnd = sDataLimitState.limitEnd;
        }

        sDatasets.push(buildChartSeriesItem(sSeriesConfig, sRows, isRaw, includeColor));
    }

    return {
        datasets: sDatasets,
        interval: sIntervalTime,
        count: sCount,
        hasDataLimit: sHasDataLimit,
        limitEnd: sLimitEnd,
    };
}

/**
 * Fetches rows for one series config through the shared raw/calculated request path.
 * @param aSeriesConfig The saved series config being fetched.
 * @param aTimeRange The resolved fetch time range.
 * @param aInterval The interval option for the request.
 * @param aCount The requested row count.
 * @param aIsRaw Whether the request is for raw data.
 * @param aRollupTableList The available rollup table list.
 * @param aUseSampling Whether sampling should be requested.
 * @param aSamplingValue The sampling value to pass through when enabled.
 * @returns The raw or calculated repository response for the series.
 * Side effect: performs a repository fetch through the raw or calculated MachIOT API.
 */
export async function fetchSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: string[],
    aUseSampling: boolean | undefined,
    aSamplingValue: number | undefined,
): Promise<ChartFetchResponse> {
    if (!isFetchableTimeRange(aTimeRange)) {
        return createEmptyFetchResponse();
    }

    if (aIsRaw) {
        return fetchRawSeriesRows(
            aSeriesConfig,
            aTimeRange,
            aInterval,
            aCount,
            aUseSampling || undefined,
            aUseSampling ? aSamplingValue : undefined,
        );
    }

    return fetchCalculatedSeriesRows(
        aSeriesConfig,
        aTimeRange,
        aInterval,
        aCount,
        aRollupTableList,
    );
}

/**
 * Calculates the requested row count for the current panel fetch.
 * @param aLimit The current row limit, when one already exists.
 * @param aUseSampling Whether sampling is enabled.
 * @param aIsRaw Whether the request is for raw data.
 * @param aAxes The panel axis configuration.
 * @param aChartWidth The measured chart width.
 * @returns The row count to request for the fetch.
 */
export function calculatePanelFetchCount(
    aLimit: number | undefined,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aAxes: PanelAxes,
    aChartWidth: number,
): number {
    return calculateSampleCount(
        aLimit ?? -1,
        aUseSampling,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aChartWidth,
    );
}

/**
 * Resolves the concrete fetch window from panel, board, and override ranges.
 * @param aPanelTime The panel time configuration.
 * @param aBoardRange The board-level range override.
 * @param aTimeRange An explicit time-range override.
 * @returns The resolved time range for the next fetch.
 */
export function resolvePanelFetchTimeRange(
    aPanelTime: PanelTime,
    aBoardRange: ValueRange | undefined,
    aBoardRangeConfig: TimeRangeConfig | undefined,
    aTimeRange: TimeRange | undefined,
): TimeRange {
    if (aTimeRange) {
        return aTimeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeTimeRangeSource(aBoardRangeConfig ?? aBoardRange),
    );
}

/**
 * Chooses either the saved interval or a width-based fallback interval.
 * @param aPanelData The panel data configuration.
 * @param aAxes The panel axis configuration.
 * @param aTimeRange The resolved fetch time range.
 * @param aChartWidth The measured chart width.
 * @param aIsRaw Whether the request is for raw data.
 * @param aIsNavigator Whether the interval is for the navigator chart.
 * @returns The interval option for the next fetch.
 */
export function resolvePanelFetchInterval(
    aPanelData: PanelData,
    aAxes: PanelAxes,
    aTimeRange: TimeRange,
    aChartWidth: number,
    aIsRaw: boolean,
    aIsNavigator = false,
): IntervalOption {
    const sIntervalType = aPanelData.interval_type?.toLowerCase() ?? '';

    if (sIntervalType !== '') {
        return {
            IntervalType: convertIntervalUnit(sIntervalType),
            IntervalValue: 0,
        };
    }

    return calculateInterval(
        aTimeRange.startTime,
        aTimeRange.endTime,
        aChartWidth,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aIsNavigator,
    );
}

/**
 * Fetches calculated rows for one series config through the MachIOT repository API.
 * @param aSeriesConfig The saved series config being fetched.
 * @param aTimeRange The resolved fetch time range.
 * @param aInterval The interval option for the request.
 * @param aCount The requested row count.
 * @param aRollupTableList The available rollup table list.
 * @returns The calculated repository response for the series.
 * Side effect: performs one calculated-series fetch through the MachIOT API.
 */
async function fetchCalculatedSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aRollupTableList: string[],
): Promise<ChartFetchResponse> {
    const sRequest: CalculationFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: isRollup(
            aRollupTableList,
            aSeriesConfig.table,
            getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue),
            aSeriesConfig.colName?.value ?? '',
        ),
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aSeriesConfig.colName,
        Count: aCount,
        RollupList: aRollupTableList,
    };

    return (await fetchCalculationData(sRequest)) as ChartFetchResponse;
}

/**
 * Fetches raw rows for one series config through the MachIOT repository API.
 * @param aSeriesConfig The saved series config being fetched.
 * @param aTimeRange The resolved fetch time range.
 * @param aInterval The interval option for the request.
 * @param aCount The requested row count.
 * @param aUseSampling Whether sampling should be requested.
 * @param aSamplingValue The sampling value to pass through when enabled.
 * @returns The raw repository response for the series.
 * Side effect: performs one raw-series fetch through the MachIOT API.
 */
async function fetchRawSeriesRows(
    aSeriesConfig: SeriesConfig,
    aTimeRange: TimeRange,
    aInterval: IntervalOption,
    aCount: number,
    aUseSampling: boolean | undefined,
    aSamplingValue: number | string | undefined,
): Promise<ChartFetchResponse> {
    const sRequest: RawFetchRequest = {
        Table: getQualifiedTableName(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: aSeriesConfig.onRollup,
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aSeriesConfig.colName,
        Count: aCount,
        UseSampling: aUseSampling,
        sampleValue: aSamplingValue,
    };

    return (await fetchRawData(sRequest)) as ChartFetchResponse;
}

/**
 * Drops any extra repository columns and keeps the timestamp/value pair expected by the chart.
 * @param aRows The raw repository rows.
 * @returns The chart-ready timestamp/value tuples.
 */
export function mapRowsToChartData(aRows: TagFetchRow[] | undefined): ChartRow[] {
    if (!aRows || aRows.length === 0) {
        return [];
    }

    return aRows.map(([aTime, aValue]) => [aTime, aValue]);
}

/**
 * Builds the display label for a series, preferring aliases when present.
 * @param aSeriesConfig The saved series config for the chart line.
 * @param aUseRawLabel Whether the raw tag label should be forced.
 * @returns The display label for the series.
 */
export function getSeriesName(
    aSeriesConfig: SeriesConfig,
    aUseRawLabel = false,
): string {
    if (aSeriesConfig.alias) {
        return aSeriesConfig.alias;
    }

    return `${getSourceTagName(aSeriesConfig)}(${aUseRawLabel ? 'raw' : aSeriesConfig.calculationMode.toLowerCase()})`;
}

/**
 * Converts one fetched series-config response into the chart-series structure used by TagAnalyzer.
 * @param aSeriesConfig The saved series config for the chart line.
 * @param aRows The repository rows for the tag.
 * @param aUseRawLabel Whether the raw tag label should be forced.
 * @param aIncludeColor Whether the configured tag color should be copied through.
 * @returns The chart-series item for the fetched tag.
 */
export function buildChartSeriesItem(
    aSeriesConfig: SeriesConfig,
    aRows: TagFetchRow[] | undefined,
    aUseRawLabel = false,
    aIncludeColor = true,
): ChartSeriesItem {
    return {
        name: getSeriesName(aSeriesConfig, aUseRawLabel),
        data: mapRowsToChartData(aRows),
        yAxis: aSeriesConfig.use_y2 ? 1 : 0,
        marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
        color: aIncludeColor ? (aSeriesConfig?.color ?? '') : undefined,
    };
}

/**
 * Detects whether a raw fetch hit its row limit and therefore clamped the visible range.
 * @param aIsRaw Whether the fetch was for raw data.
 * @param aRows The repository rows that were returned.
 * @param aCount The requested row count.
 * @param aCurrentLimitEnd The previous raw-data limit end time.
 * @returns The current raw-data limit state for the panel.
 */
export function analyzePanelDataLimit(
    aIsRaw: boolean,
    aRows: TagFetchRow[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
): PanelDataLimitState {
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLastTimestamp = aRows[aRows.length - 1]?.[0];
    const sPreviousTimestamp = aRows[aRows.length - 2]?.[0];
    const sShouldUseLastTimestamp = aCurrentLimitEnd !== 0 && aCurrentLimitEnd !== sLastTimestamp;
    const sLimitEnd = sShouldUseLastTimestamp
        ? sLastTimestamp
        : (sPreviousTimestamp ?? sLastTimestamp);

    return {
        hasDataLimit: true,
        limitEnd: sLimitEnd,
    };
}

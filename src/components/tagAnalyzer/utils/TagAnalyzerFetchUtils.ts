import { fetchCalculationData, fetchRawData, fetchTablesData } from '@/api/repository/machiot';
import { isRollup, parseTables } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../TagAnalyzerSeriesNaming';
import { callTagAnalyzerBgnEndTimeRange } from '../TagAnalyzerUtilCaller';
import {
    calculateInterval,
    calculateSampleCount,
    checkTableUser,
    convertIntervalUnit,
    getIntervalMs,
} from '../TagAnalyzerUtils';
import {
    createTagAnalyzerTimeRange,
    normalizePanelTimeRangeSource,
    normalizeTimeRangeSource,
    setTimeRange,
} from './TagAnalyzerDateUtils';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerBoardRange,
    TagAnalyzerChartData,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerInputRangeValue,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTime,
    TagAnalyzerSeriesConfig,
    TimeRange,
} from '../panel/PanelModel';

// Shared fetch input contract used before panel-specific chart state is shaped.
// Used by TagAnalyzerFetchUtils to type chart state params.
type PanelChartStateParams = {
    seriesConfigSet: TagAnalyzerSeriesConfig[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange: TagAnalyzerBoardRange | undefined;
    chartWidth: number;
    isRaw: boolean;
    timeRange: TimeRange | undefined;
    rollupTableList: string[];
};

// Fetch input contract for the shared dataset builder before it gets mapped into chart state.
// Used by TagAnalyzerFetchUtils to type fetch panel datasets params.
type FetchPanelDatasetsParams = PanelChartStateParams & {
    useSampling: boolean;
    includeColor: boolean;
    isNavigator: boolean | undefined;
};

// Normalized dataset bundle returned by the shared panel fetch pipeline.
// Used by TagAnalyzerFetchUtils to type fetch panel datasets result.
type FetchPanelDatasetsResult = {
    datasets: TagAnalyzerChartData['datasets'];
    interval: TagAnalyzerIntervalOption;
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

// Used by TagAnalyzerFetchUtils to type calculation fetch requests.
type CalculationFetchRequest = {
    Table: string;
    TagNames: string;
    Start: number;
    End: number;
    Rollup: ReturnType<typeof isRollup>;
    CalculationMode: string;
    IntervalType: TagAnalyzerIntervalOption['IntervalType'];
    IntervalValue: TagAnalyzerIntervalOption['IntervalValue'];
    colName: TagAnalyzerSeriesConfig['colName'];
    Count: number;
    RollupList: string[];
};

// Used by TagAnalyzerFetchUtils to type raw fetch requests.
type RawFetchRequest = {
    Table: string;
    TagNames: string;
    Start: number;
    End: number;
    Rollup: TagAnalyzerSeriesConfig['onRollup'];
    CalculationMode: string;
    IntervalType: TagAnalyzerIntervalOption['IntervalType'];
    IntervalValue: TagAnalyzerIntervalOption['IntervalValue'];
    colName: TagAnalyzerSeriesConfig['colName'];
    Count: number;
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
    chartData: TagAnalyzerChartData;
    rangeOption: TagAnalyzerIntervalOption;
    overflowRange: TimeRange | null;
};

// Board/controller-facing fetch contract used by the public load helpers.
// Used by TagAnalyzerFetchUtils to type fetch request.
type PanelFetchRequest = {
    panelInfo: Pick<TagAnalyzerPanelInfo, 'data' | 'time' | 'axes'>;
    boardRange: TagAnalyzerBoardRange | undefined;
    chartWidth: number | undefined;
    isRaw: boolean;
    timeRange: TimeRange | undefined;
    rollupTableList: string[];
};

/**
 * Loads and parses the source-table metadata used by TagAnalyzer.
 * @returns The parsed table list when the fetch succeeds, otherwise `undefined`.
 */
export const fetchParsedTables = async (): Promise<ReturnType<typeof parseTables> | undefined> => {
    const sResult = await fetchTablesData();
    if (!sResult.success) return undefined;
    return parseTables(sResult.data);
};

/**
 * Resolves the shared top-level tag time bounds for the current board.
 * @param aTagSet The first panel tag set used to seed the top-level range.
 * @param aStart The requested board start value.
 * @param aEnd The requested board end value.
 * @returns A normalized top-level range with numeric values only.
 */
export const fetchNormalizedTopLevelTimeRange = async (
    aTagSet: TagAnalyzerPanelInfo['data']['tag_set'],
    aStart: TagAnalyzerInputRangeValue,
    aEnd: TagAnalyzerInputRangeValue,
): Promise<TagAnalyzerBgnEndTimeRange | undefined> => {
    return callTagAnalyzerBgnEndTimeRange(
        aTagSet,
        { bgn: aStart, end: aEnd },
        { bgn: '', end: '' },
    );
};

/**
 * Bridges board/controller state into the navigator fetch helper.
 * @param panelInfo The current panel info supplying data, time, and axes settings.
 * @param boardRange The optional board-level time override applied to the fetch.
 * @param chartWidth The measured chart width used for count and interval math.
 * @param isRaw Whether the navigator should load raw series data.
 * @param timeRange An optional explicit time-range override for the fetch.
 * @param rollupTableList The available rollup tables used to shape fetch requests.
 * @returns The navigator chart data for the current panel.
 * Side effect: performs repository work through the shared navigator chart loader.
 */
export async function loadNavigatorChartState({
    panelInfo,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelFetchRequest): Promise<TagAnalyzerChartData> {
    const sSeriesConfigSet = panelInfo.data.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return { datasets: [] };
    }

    const sFetchResult = await fetchPanelDatasets({
        seriesConfigSet: sSeriesConfigSet,
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: chartWidth || 1,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling: panelInfo.axes.use_sampling,
        includeColor: false,
        isNavigator: true,
    });

    return { datasets: sFetchResult.datasets };
}

/**
 * Bridges board/controller state into the main panel fetch helper.
 * @param panelInfo The current panel info supplying data, time, and axes settings.
 * @param boardRange The optional board-level time override applied to the fetch.
 * @param chartWidth The measured chart width used for count and interval math.
 * @param isRaw Whether the main chart should load raw series data.
 * @param timeRange An optional explicit time-range override for the fetch.
 * @param rollupTableList The available rollup tables used to shape fetch requests.
 * @returns The main panel chart load state.
 * Side effect: performs repository work through the shared main-chart loader.
 */
export async function loadPanelChartState({
    panelInfo,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelFetchRequest): Promise<PanelChartLoadState> {
    const sSeriesConfigSet = panelInfo.data.tag_set ?? [];
    const sChartWidth = chartWidth || 1;

    if (sSeriesConfigSet.length === 0) {
        return {
            chartData: { datasets: [] },
            rangeOption: { IntervalType: '', IntervalValue: 0 },
            overflowRange: null,
        };
    }

    const sFetchResult = await fetchPanelDatasets({
        seriesConfigSet: sSeriesConfigSet,
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: sChartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling: false,
        includeColor: true,
        isNavigator: undefined,
    });

    const sOverflowRange =
        sFetchResult.hasDataLimit && sFetchResult.datasets[0]?.data?.[0]
            ? createTagAnalyzerTimeRange(sFetchResult.datasets[0].data[0][0], sFetchResult.limitEnd)
            : null;

    return {
        chartData: { datasets: sFetchResult.datasets },
        rangeOption: sFetchResult.interval,
        overflowRange: sOverflowRange,
    };
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
    const sTimeRange = resolvePanelFetchTimeRange(panelTime, boardRange, timeRange);
    const sIntervalTime = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        sTimeRange,
        chartWidth,
        isRaw,
        isNavigator,
    );
    const sDatasets: TagAnalyzerChartData['datasets'] = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < seriesConfigSet.length; index++) {
        const sSeriesConfig = seriesConfigSet[index];
        const sFetchResult = await fetchSeriesRows(
            sSeriesConfig,
            sTimeRange,
            sIntervalTime,
            sCount,
            isRaw,
            rollupTableList,
            useSampling,
            panelAxes.sampling_value,
        );
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
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aTimeRange: TimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: string[],
    aUseSampling: boolean | undefined,
    aSamplingValue: number | undefined,
): Promise<ChartFetchResponse> {
    if (aUseSampling && aIsRaw) {
        return fetchRawSeriesRows(
            aSeriesConfig,
            aTimeRange,
            aInterval,
            aCount,
            aUseSampling,
            aSamplingValue,
        );
    }

    if (aIsRaw) {
        return fetchRawSeriesRows(
            aSeriesConfig,
            aTimeRange,
            aInterval,
            aCount,
            undefined,
            undefined,
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
 * Prevents zero-width layouts from collapsing the interval and sample math.
 * @param aWidth The measured chart width.
 * @returns A non-zero chart width for downstream calculations.
 */
export function normalizeChartWidth(aWidth: number | undefined): number {
    if (!aWidth || aWidth === 0) {
        return 1;
    }

    return aWidth;
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
    aAxes: TagAnalyzerPanelAxes,
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
    aPanelTime: TagAnalyzerPanelTime,
    aBoardRange: TagAnalyzerBoardRange | undefined,
    aTimeRange: TimeRange | undefined,
): TimeRange {
    if (aTimeRange) {
        return aTimeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeTimeRangeSource(aBoardRange),
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
    aPanelData: TagAnalyzerPanelData,
    aAxes: TagAnalyzerPanelAxes,
    aTimeRange: TimeRange,
    aChartWidth: number,
    aIsRaw: boolean,
    aIsNavigator = false,
): TagAnalyzerIntervalOption {
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
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aTimeRange: TimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aRollupTableList: string[],
): Promise<ChartFetchResponse> {
    const sRequest: CalculationFetchRequest = {
        Table: checkTableUser(aSeriesConfig.table, ADMIN_ID),
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
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aTimeRange: TimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aUseSampling: boolean | undefined,
    aSamplingValue: number | string | undefined,
): Promise<ChartFetchResponse> {
    const sRequest: RawFetchRequest = {
        Table: checkTableUser(aSeriesConfig.table, ADMIN_ID),
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
export function mapRowsToChartData(aRows: TagFetchRow[] | undefined): TagAnalyzerChartRow[] {
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
    aSeriesConfig: TagAnalyzerSeriesConfig,
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
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aRows: TagFetchRow[] | undefined,
    aUseRawLabel = false,
    aIncludeColor = true,
): TagAnalyzerChartSeriesItem {
    return {
        name: getSeriesName(aSeriesConfig, aUseRawLabel),
        data: mapRowsToChartData(aRows),
        yAxis: aSeriesConfig.use_y2 === 'Y' ? 1 : 0,
        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
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

import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getSourceTagName } from '../TagAnalyzerSeriesNaming';
import {
    calculateInterval,
    calculateSampleCount,
    checkTableUser,
    convertIntervalUnit,
    getIntervalMs,
} from '../TagAnalyzerUtils';
import { getDateRange } from '../utils/TagAnalyzerDateUtils';
import { createTagAnalyzerTimeRange } from './PanelModelUtils';
import type {
    TagAnalyzerChartData,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTime,
    TagAnalyzerRangeValue,
    TagAnalyzerSeriesConfig,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

// Board-level range override reused by the panel and navigator fetch helpers.
type BoardRange = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

// Fully expanded input contract for the low-level panel and navigator chart loaders.
type PanelChartStateParams = {
    seriesConfigSet: TagAnalyzerSeriesConfig[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange?: BoardRange;
    chartWidth: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: string[];
};

// Fetch input contract for the shared dataset builder before it gets mapped into chart state.
type FetchPanelDatasetsParams = PanelChartStateParams & {
    useSampling: boolean;
    includeColor: boolean;
    isNavigator?: boolean;
};

// Normalized dataset bundle returned by the shared panel fetch pipeline.
type FetchPanelDatasetsResult = {
    datasets: TagAnalyzerChartData['datasets'];
    interval: TagAnalyzerIntervalOption;
    count: number;
    hasDataLimit: boolean;
    limitEnd: number;
};

// Repository row shape used before extra trailing columns are stripped away.
type TagFetchRow = [number, number, ...unknown[]];

// Minimal repository response shape used by the fetch helpers in this module.
type ChartFetchResponse = {
    data?: {
        column?: string[];
        rows?: TagFetchRow[];
    };
};

// Main chart-load result returned after dataset mapping and overflow analysis.
export type PanelChartLoadState = {
    chartData: TagAnalyzerChartData;
    rangeOption: TagAnalyzerIntervalOption;
    overflowRange: TagAnalyzerTimeRange | null;
};

// Board/controller-facing fetch contract used by the public load helpers.
type PanelFetchRequest = {
    panelInfo: Pick<TagAnalyzerPanelInfo, 'data' | 'time' | 'axes'>;
    boardRange?: BoardRange;
    chartWidth?: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: string[];
};

/**
 * Prevents zero-width layouts from collapsing the interval and sample math.
 * @param aWidth The measured chart width.
 * @returns A non-zero chart width for downstream calculations.
 */
export function normalizeChartWidth(aWidth?: number): number {
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
    aBoardRange?: BoardRange,
    aTimeRange?: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange {
    return getDateRange(
        {
            range_bgn: aPanelTime.range_bgn,
            range_end: aPanelTime.range_end,
            default_range: aPanelTime.default_range,
        },
        aBoardRange,
        aTimeRange,
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
    aTimeRange: TagAnalyzerTimeRange,
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
 * Builds the calculated-data request expected by the MachIOT repository API.
 * @param aSeriesConfig The saved series config being fetched.
 * @param aTimeRange The resolved fetch time range.
 * @param aInterval The interval option for the request.
 * @param aCount The requested row count.
 * @param aRollupTableList The available rollup table list.
 * @returns The repository request payload for calculated data.
 */
export function buildCalculationFetchParams(
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aRollupTableList: string[],
){
    return {
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
}

/**
 * Builds the raw-data request expected by the MachIOT repository API.
 * @param aSeriesConfig The saved series config being fetched.
 * @param aTimeRange The resolved fetch time range.
 * @param aInterval The interval option for the request.
 * @param aCount The requested row count.
 * @param aUseSampling Whether sampling should be requested.
 * @param aSamplingValue The sampling value to pass through when enabled.
 * @returns The repository request payload for raw data.
 */
export function buildRawFetchParams(
    aSeriesConfig: TagAnalyzerSeriesConfig,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aUseSampling?: boolean,
    aSamplingValue?: number | string,
){
    return {
        Table: checkTableUser(aSeriesConfig.table, ADMIN_ID),
        TagNames: getSourceTagName(aSeriesConfig),
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: aSeriesConfig.onRollup,
        CalculationMode: aSeriesConfig.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aSeriesConfig.colName,
        Count: aCount,
        ...(aUseSampling !== undefined
            ? {
                  UseSampling: aUseSampling,
                  sampleValue: aSamplingValue,
              }
            : {}),
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
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: string[],
    aUseSampling?: boolean,
    aSamplingValue?: number,
): Promise<ChartFetchResponse> {
    if (aUseSampling && aIsRaw) {
        return (await fetchRawData(
            buildRawFetchParams(
                aSeriesConfig,
                aTimeRange,
                aInterval,
                aCount,
                aUseSampling,
                aSamplingValue,
            ),
        )) as ChartFetchResponse;
    }

    if (aIsRaw) {
        return (await fetchRawData(buildRawFetchParams(aSeriesConfig, aTimeRange, aInterval, aCount))) as ChartFetchResponse;
    }

    return (await fetchCalculationData(
        buildCalculationFetchParams(aSeriesConfig, aTimeRange, aInterval, aCount, aRollupTableList),
    )) as ChartFetchResponse;
}

/**
 * Drops any extra repository columns and keeps the timestamp/value pair expected by the chart.
 * @param aRows The raw repository rows.
 * @returns The chart-ready timestamp/value tuples.
 */
export function mapRowsToChartData(aRows?: TagFetchRow[]): TagAnalyzerChartRow[] {
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
export function getSeriesName(aSeriesConfig: TagAnalyzerSeriesConfig, aUseRawLabel = false): string {
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
        ...(aIncludeColor ? { color: aSeriesConfig?.color ?? '' } : {}),
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
){
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLastTimestamp = aRows[aRows.length - 1]?.[0];
    const sPreviousTimestamp = aRows[aRows.length - 2]?.[0];
    const sShouldUseLastTimestamp = aCurrentLimitEnd !== 0 && aCurrentLimitEnd !== sLastTimestamp;
    const sLimitEnd = sShouldUseLastTimestamp ? sLastTimestamp : (sPreviousTimestamp ?? sLastTimestamp);

    return {
        hasDataLimit: true,
        limitEnd: sLimitEnd,
    };
}

/**
 * Fetches every saved series config and normalizes the responses into chart datasets.
 * @param aParams The fetch inputs for the current panel load.
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
    const sCount = calculatePanelFetchCount(panelData.count, useSampling, isRaw, panelAxes, chartWidth);
    const sTimeRange = resolvePanelFetchTimeRange(panelTime, boardRange, timeRange);
    const sIntervalTime = resolvePanelFetchInterval(panelData, panelAxes, sTimeRange, chartWidth, isRaw, isNavigator);
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
 * Loads the low-detail navigator dataset for the current panel.
 * @param aParams The fetch inputs for the navigator load.
 * @returns The navigator chart data for the current panel.
 * Side effect: performs navigator-oriented repository fetches for the current panel series set.
 */
export async function resolveNavigatorChartState({
    seriesConfigSet,
    panelData,
    panelTime,
    panelAxes,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelChartStateParams): Promise<TagAnalyzerChartData> {
    if (seriesConfigSet.length === 0) {
        return { datasets: [] };
    }

    const sFetchResult = await fetchPanelDatasets({
        seriesConfigSet,
        panelData,
        panelTime,
        panelAxes,
        boardRange,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling: panelAxes.use_sampling,
        includeColor: false,
        isNavigator: true,
    });

    return { datasets: sFetchResult.datasets };
}

/**
 * Loads the main chart dataset and reports any overflow clamp that occurred.
 * @param aParams The fetch inputs for the main panel load.
 * @returns The main chart data, interval, and overflow metadata.
 * Side effect: performs main-chart repository fetches and computes any overflow clamp.
 */
export async function resolvePanelChartState({
    seriesConfigSet,
    panelData,
    panelTime,
    panelAxes,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelChartStateParams): Promise<PanelChartLoadState> {
    if (seriesConfigSet.length === 0) {
        return {
            chartData: { datasets: [] },
            rangeOption: { IntervalType: '', IntervalValue: 0 },
            overflowRange: null,
        };
    }

    const sFetchResult = await fetchPanelDatasets({
        seriesConfigSet,
        panelData,
        panelTime,
        panelAxes,
        boardRange,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling: false,
        includeColor: true,
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
 * Bridges board/controller state into the navigator fetch helper.
 * @param aParams The board/controller inputs for the navigator fetch.
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
}: PanelFetchRequest) {
    return resolveNavigatorChartState({
        seriesConfigSet: panelInfo.data.tag_set || [],
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: normalizeChartWidth(chartWidth),
        isRaw,
        timeRange,
        rollupTableList,
    });
}

/**
 * Bridges board/controller state into the main panel fetch helper.
 * @param aParams The board/controller inputs for the main panel fetch.
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
}: PanelFetchRequest) {
    return resolvePanelChartState({
        seriesConfigSet: panelInfo.data.tag_set || [],
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: normalizeChartWidth(chartWidth),
        isRaw,
        timeRange,
        rollupTableList,
    });
}

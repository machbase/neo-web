import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
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
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

type BoardRange = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

type PanelChartStateParams = {
    tagSet: TagAnalyzerTagItem[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange?: BoardRange;
    chartWidth: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: string[];
};

type FetchPanelDatasetsParams = PanelChartStateParams & {
    useSampling: boolean;
    includeColor: boolean;
    isNavigator?: boolean;
};

type FetchPanelDatasetsResult = {
    datasets: TagAnalyzerChartData['datasets'];
    interval: TagAnalyzerIntervalOption;
    count: number;
    hasDataLimit: boolean;
    limitEnd: number;
};

type TagFetchRow = [number, number, ...unknown[]];

type ChartFetchResponse = {
    data?: {
        rows?: TagFetchRow[];
    };
};

export type PanelChartLoadState = {
    chartData: TagAnalyzerChartData;
    rangeOption: TagAnalyzerIntervalOption;
    overflowRange: TagAnalyzerTimeRange | null;
};

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
 */
export const normalizeChartWidth = (aWidth?: number): number => {
    if (!aWidth || aWidth === 0) {
        return 1;
    }
    return aWidth;
};

/**
 * Calculates the requested row count for the current panel fetch.
 */
export const calculatePanelFetchCount = (
    aLimit: number | undefined,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aAxes: TagAnalyzerPanelAxes,
    aChartWidth: number,
): number => {
    return calculateSampleCount(
        aLimit ?? -1,
        aUseSampling,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aChartWidth,
    );
};

/**
 * Resolves the concrete fetch window from panel, board, and override ranges.
 */
export const resolvePanelFetchTimeRange = (
    aPanelTime: TagAnalyzerPanelTime,
    aBoardRange?: BoardRange,
    aTimeRange?: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    return getDateRange(
        {
            range_bgn: aPanelTime.range_bgn,
            range_end: aPanelTime.range_end,
            default_range: aPanelTime.default_range,
        },
        aBoardRange,
        aTimeRange,
    );
};

/**
 * Chooses either the saved interval or a width-based fallback interval.
 */
export const resolvePanelFetchInterval = (
    aPanelData: TagAnalyzerPanelData,
    aAxes: TagAnalyzerPanelAxes,
    aTimeRange: TagAnalyzerTimeRange,
    aChartWidth: number,
    aIsRaw: boolean,
    aIsNavigator = false,
): TagAnalyzerIntervalOption => {
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
};

/**
 * Builds the calculated-data request expected by the MachIOT repository API.
 */
export const buildCalculationFetchParams = (
    aTagItem: TagAnalyzerTagItem,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aRollupTableList: string[],
) => {
    return {
        Table: checkTableUser(aTagItem.table, ADMIN_ID),
        TagNames: aTagItem.tagName,
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: isRollup(
            aRollupTableList,
            aTagItem.table,
            getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue),
            aTagItem.colName.value,
        ),
        CalculationMode: aTagItem.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aTagItem.colName,
        Count: aCount,
        RollupList: aRollupTableList,
    };
};

/**
 * Builds the raw-data request expected by the MachIOT repository API.
 */
export const buildRawFetchParams = (
    aTagItem: TagAnalyzerTagItem,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aUseSampling?: boolean,
    aSamplingValue?: number | string,
) => {
    return {
        Table: checkTableUser(aTagItem.table, ADMIN_ID),
        TagNames: aTagItem.tagName,
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: aTagItem.onRollup,
        CalculationMode: aTagItem.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aTagItem.colName,
        Count: aCount,
        ...(aUseSampling !== undefined
            ? {
                  UseSampling: aUseSampling,
                  sampleValue: aSamplingValue,
              }
            : {}),
    };
};

/**
 * Routes a single tag fetch to either the raw or calculated endpoint.
 */
const fetchChartRows = async (
    aTagItem: TagAnalyzerTagItem,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: string[],
    aUseSampling?: boolean,
    aSamplingValue?: number,
): Promise<ChartFetchResponse> => {
    if (aUseSampling && aIsRaw) {
        return fetchRawData(
            buildRawFetchParams(
                aTagItem,
                aTimeRange,
                aInterval,
                aCount,
                aUseSampling,
                aSamplingValue,
            ),
        );
    }

    if (aIsRaw) {
        return fetchRawData(buildRawFetchParams(aTagItem, aTimeRange, aInterval, aCount));
    }

    return fetchCalculationData(
        buildCalculationFetchParams(aTagItem, aTimeRange, aInterval, aCount, aRollupTableList),
    );
};

/**
 * Drops any extra repository columns and keeps the timestamp/value pair expected by the chart.
 */
export const mapRowsToChartData = (aRows?: TagFetchRow[]): TagAnalyzerChartRow[] => {
    if (!aRows || aRows.length === 0) {
        return [];
    }

    return aRows.map(([aTime, aValue]) => [aTime, aValue]);
};

/**
 * Builds the display label for a series, preferring aliases when present.
 */
export const getSeriesName = (aTagItem: TagAnalyzerTagItem, aUseRawLabel = false): string => {
    if (aTagItem.alias) {
        return aTagItem.alias;
    }

    return `${aTagItem.tagName}(${aUseRawLabel ? 'raw' : aTagItem.calculationMode.toLowerCase()})`;
};

/**
 * Converts one fetched tag response into the chart-series structure used by TagAnalyzer.
 */
export const buildChartSeriesItem = (
    aTagItem: TagAnalyzerTagItem,
    aRows: TagFetchRow[] | undefined,
    aUseRawLabel = false,
    aIncludeColor = true,
): TagAnalyzerChartSeriesItem => {
    return {
        name: getSeriesName(aTagItem, aUseRawLabel),
        data: mapRowsToChartData(aRows),
        yAxis: aTagItem.use_y2 === 'Y' ? 1 : 0,
        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
        ...(aIncludeColor ? { color: aTagItem?.color ?? '' } : {}),
    };
};

/**
 * Detects whether a raw fetch hit its row limit and therefore clamped the visible range.
 */
export const analyzePanelDataLimit = (
    aIsRaw: boolean,
    aRows: TagFetchRow[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
) => {
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
};

/**
 * Fetches every selected tag and normalizes the responses into chart datasets.
 */
export const fetchPanelDatasets = async ({
    tagSet,
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
}: FetchPanelDatasetsParams): Promise<FetchPanelDatasetsResult> => {
    const sCount = calculatePanelFetchCount(panelData.count, useSampling, isRaw, panelAxes, chartWidth);
    const sTimeRange = resolvePanelFetchTimeRange(panelTime, boardRange, timeRange);
    const sIntervalTime = resolvePanelFetchInterval(panelData, panelAxes, sTimeRange, chartWidth, isRaw, isNavigator);
    const sDatasets: TagAnalyzerChartData['datasets'] = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < tagSet.length; index++) {
        const sTagSetElement = tagSet[index];
        const sFetchResult = await fetchChartRows(
            sTagSetElement,
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

        sDatasets.push(buildChartSeriesItem(sTagSetElement, sRows, isRaw, includeColor));
    }

    return {
        datasets: sDatasets,
        interval: sIntervalTime,
        count: sCount,
        hasDataLimit: sHasDataLimit,
        limitEnd: sLimitEnd,
    };
};

/**
 * Loads the low-detail navigator dataset for the current panel.
 */
export const resolveNavigatorChartState = async ({
    tagSet,
    panelData,
    panelTime,
    panelAxes,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelChartStateParams): Promise<TagAnalyzerChartData> => {
    if (tagSet.length === 0) {
        return { datasets: [] };
    }

    const sFetchResult = await fetchPanelDatasets({
        tagSet,
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
};

/**
 * Loads the main chart dataset and reports any overflow clamp that occurred.
 */
export const resolvePanelChartState = async ({
    tagSet,
    panelData,
    panelTime,
    panelAxes,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelChartStateParams): Promise<PanelChartLoadState> => {
    if (tagSet.length === 0) {
        return {
            chartData: { datasets: [] },
            rangeOption: { IntervalType: '', IntervalValue: 0 },
            overflowRange: null,
        };
    }

    const sFetchResult = await fetchPanelDatasets({
        tagSet,
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
};

/**
 * Bridges board/controller state into the navigator fetch helper.
 */
export const loadNavigatorChartState = async ({
    panelInfo,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelFetchRequest) => {
    return resolveNavigatorChartState({
        tagSet: panelInfo.data.tag_set || [],
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: normalizeChartWidth(chartWidth),
        isRaw,
        timeRange,
        rollupTableList,
    });
};

/**
 * Bridges board/controller state into the main panel fetch helper.
 */
export const loadPanelChartState = async ({
    panelInfo,
    boardRange,
    chartWidth,
    isRaw,
    timeRange,
    rollupTableList,
}: PanelFetchRequest) => {
    return resolvePanelChartState({
        tagSet: panelInfo.data.tag_set || [],
        panelData: panelInfo.data,
        panelTime: panelInfo.time,
        panelAxes: panelInfo.axes,
        boardRange,
        chartWidth: normalizeChartWidth(chartWidth),
        isRaw,
        timeRange,
        rollupTableList,
    });
};

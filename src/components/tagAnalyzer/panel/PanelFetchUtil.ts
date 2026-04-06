import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import {
    calcInterval,
    calculateSCount,
    checkTableUser,
    convertInterType,
    getInterval,
} from '../TagAnalyzerUtil';
import { getDateRange } from '../tagAnalyzerUtilReplacement/TagAnalyzerDateUtil';
import { createTagAnalyzerTimeRange } from './PanelModelUtil';
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
    rollupTableList: unknown;
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
    rollupTableList: unknown;
};

export const normalizeChartWidth = (aWidth?: number): number => {
    if (!aWidth || aWidth === 0) {
        return 1;
    }
    return aWidth;
};

export const calculatePanelFetchCount = (
    aLimit: number | undefined,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aAxes: TagAnalyzerPanelAxes,
    aChartWidth: number,
): number => {
    return calculateSCount(
        aLimit ?? -1,
        aUseSampling,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aChartWidth,
    );
};

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
            IntervalType: convertInterType(sIntervalType),
            IntervalValue: 0,
        };
    }

    return calcInterval(
        aTimeRange.startTime,
        aTimeRange.endTime,
        aChartWidth,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aIsNavigator,
    );
};

export const buildCalculationFetchParams = (
    aTagItem: TagAnalyzerTagItem,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aRollupTableList: unknown,
) => {
    return {
        Table: checkTableUser(aTagItem.table, ADMIN_ID),
        TagNames: aTagItem.tagName,
        Start: aTimeRange.startTime,
        End: aTimeRange.endTime,
        Rollup: isRollup(
            aRollupTableList,
            aTagItem.table,
            getInterval(aInterval.IntervalType, aInterval.IntervalValue),
            aTagItem.colName.value,
        ),
        CalculationMode: aTagItem.calculationMode.toLowerCase(),
        ...aInterval,
        colName: aTagItem.colName,
        Count: aCount,
        RollupList: aRollupTableList,
    };
};

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

const fetchChartRows = async (
    aTagItem: TagAnalyzerTagItem,
    aTimeRange: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerIntervalOption,
    aCount: number,
    aIsRaw: boolean,
    aRollupTableList: unknown,
    aUseSampling?: boolean,
    aSamplingValue?: number,
) => {
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

export const mapRowsToChartData = (aRows?: unknown[]): TagAnalyzerChartRow[] => {
    if (!aRows || aRows.length === 0) {
        return [];
    }

    return aRows.map((aItem: any) => [aItem[0], aItem[1]]);
};

export const getSeriesName = (aTagItem: TagAnalyzerTagItem, aUseRawLabel = false): string => {
    if (aTagItem.alias) {
        return aTagItem.alias;
    }

    return `${aTagItem.tagName}(${aUseRawLabel ? 'raw' : aTagItem.calculationMode.toLowerCase()})`;
};

export const buildChartSeriesItem = (
    aTagItem: TagAnalyzerTagItem,
    aRows: unknown[] | undefined,
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

export const analyzePanelDataLimit = (
    aIsRaw: boolean,
    aRows: unknown[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
) => {
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLimitEnd =
        aCurrentLimitEnd && Math.sign(aCurrentLimitEnd - (aRows.at(-1) as any)[0])
            ? (aRows.at(-1) as any)[0]
            : (aRows.at(-2) as any)[0];

    return {
        hasDataLimit: true,
        limitEnd: sLimitEnd,
    };
};

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
    const sDatasets = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < tagSet.length; index++) {
        const sTagSetElement = tagSet[index];
        const sFetchResult: any = await fetchChartRows(
            sTagSetElement,
            sTimeRange,
            sIntervalTime,
            sCount,
            isRaw,
            rollupTableList,
            useSampling,
            panelAxes.sampling_value,
        );

        const sDataLimitState = analyzePanelDataLimit(isRaw, sFetchResult?.data?.rows, sCount, sLimitEnd);
        if (sDataLimitState.hasDataLimit) {
            sHasDataLimit = true;
            sLimitEnd = sDataLimitState.limitEnd;
        }

        sDatasets.push(buildChartSeriesItem(sTagSetElement, sFetchResult?.data?.rows, isRaw, includeColor));
    }

    return {
        datasets: sDatasets,
        interval: sIntervalTime,
        count: sCount,
        hasDataLimit: sHasDataLimit,
        limitEnd: sLimitEnd,
    };
};

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

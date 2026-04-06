import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { ADMIN_ID } from '@/utils/constants';
import { isRollup } from '@/utils';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import {
    calcInterval,
    calculateSCount,
    checkTableUser,
    convertInterType,
    getInterval,
} from '../TagAnalyzerUtil';
import { getDateRange } from '../tagAnalyzerUtilReplacement/TagAnalyzerDateUtil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartRow,
    TagAnalyzerChartData,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelTime,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';
import { createTagAnalyzerTimeRange } from './PanelModelUtil';
import type { CoordinateType, PanelPresentationState } from './TagAnalyzerPanelTypes';

type ChartRectLike = {
    left: number;
    top: number;
};

type PanelRangeUpdate = {
    panelRange: TagAnalyzerTimeRange;
    navigatorRange?: TagAnalyzerTimeRange;
};

type ResolveResetTimeRangeParams = {
    boardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    };
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    isEdit: boolean;
};

type FetchPanelDatasetsParams = {
    tagSet: TagAnalyzerTagItem[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    };
    chartWidth: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: unknown;
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

type ResolveNavigatorChartStateParams = {
    tagSet: TagAnalyzerTagItem[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    };
    chartWidth: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: unknown;
};

type ResolvePanelChartStateParams = {
    tagSet: TagAnalyzerTagItem[];
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    panelAxes: TagAnalyzerPanelAxes;
    boardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    };
    chartWidth: number;
    isRaw: boolean;
    timeRange?: TagAnalyzerTimeRange;
    rollupTableList: unknown;
};

export type PanelChartLoadState = {
    chartData: TagAnalyzerChartData;
    rangeOption: TagAnalyzerIntervalOption;
    overflowRange: TagAnalyzerTimeRange | null;
};

type ResolveInitialPanelRangeParams = {
    boardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    };
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    isEdit: boolean;
};

type BuildPanelPresentationStateParams = {
    title: string;
    panelRange: TagAnalyzerTimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isSelectionActive: boolean;
    isSelectionMenuOpen: boolean;
    canSaveLocal: boolean;
    changeUtcToText: (aUtc: number) => string;
};

const MAX_PANEL_END_TIME = 9999999999999;

export const getSelectionMenuPosition = (aChartRect?: ChartRectLike | null): CoordinateType => {
    if (!aChartRect) {
        return { x: 10, y: 10 };
    }

    return {
        x: aChartRect.left - 90,
        y: aChartRect.top - 35,
    };
};

export const getExpandedNavigatorRange = (
    aEvent: any,
    aNavigatorRange: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange | undefined => {
    if (
        !aEvent?.trigger ||
        (aEvent.trigger !== 'zoom' && aEvent.trigger !== 'navigator') ||
        (aNavigatorRange.endTime - aNavigatorRange.startTime) / 100 <= aEvent.max - aEvent.min
    ) {
        return undefined;
    }

    const sRatio =
        1 - ((aEvent.max - aEvent.min) * 100) / (aNavigatorRange.endTime - aNavigatorRange.startTime);

    return createTagAnalyzerTimeRange(
        aNavigatorRange.startTime + (aEvent.min - aNavigatorRange.startTime) * sRatio,
        aNavigatorRange.endTime + (aEvent.max - aNavigatorRange.endTime) * sRatio,
    );
};

export const getNavigatorRangeFromEvent = (aEvent: any): TagAnalyzerTimeRange => {
    const sStartTime = aEvent.min;
    const sEndTime = aEvent.max - sStartTime < 1000 ? sStartTime + 1000 : aEvent.max;

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
};

export const shouldReloadNavigatorData = (
    aNextRange: TagAnalyzerTimeRange,
    aCurrentRange: TagAnalyzerTimeRange,
): boolean => {
    return (
        aNextRange.startTime.toString().slice(0, 10) !== aCurrentRange.startTime.toString().slice(0, 10) ||
        aNextRange.endTime.toString().slice(0, 10) !== aCurrentRange.endTime.toString().slice(0, 10)
    );
};

export const getZoomInPanelRange = (aPanelRange: TagAnalyzerTimeRange, aZoom = 0): TagAnalyzerTimeRange => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) * aZoom;
    const startTime = aPanelRange.startTime + sCalcTime;
    let sEndTime = aPanelRange.endTime - sCalcTime;

    if (sEndTime - startTime < 10) {
        sEndTime = startTime + 10;
    }

    return createTagAnalyzerTimeRange(startTime, sEndTime);
};

export const getZoomOutRange = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aZoom = 0,
): PanelRangeUpdate => {
    const calcTime = (aPanelRange.endTime - aPanelRange.startTime) * aZoom;
    let sStartTime = aPanelRange.startTime - calcTime;
    let sEndTime = aPanelRange.endTime + calcTime;

    if (sStartTime <= 0) {
        sStartTime = aNavigatorRange.startTime;
    }

    if (sEndTime > MAX_PANEL_END_TIME) {
        sEndTime = MAX_PANEL_END_TIME;
    }

    return {
        panelRange: createTagAnalyzerTimeRange(sStartTime, sEndTime),
        navigatorRange:
            sEndTime > aNavigatorRange.endTime || sStartTime < aNavigatorRange.startTime
                ? createTagAnalyzerTimeRange(sStartTime, sEndTime)
                : undefined,
    };
};

export const getFocusedPanelRange = (aPanelRange: TagAnalyzerTimeRange): PanelRangeUpdate | undefined => {
    if (aPanelRange.endTime - aPanelRange.startTime < 1000) {
        return undefined;
    }

    return {
        panelRange: {
            startTime: aPanelRange.startTime + (aPanelRange.endTime - aPanelRange.startTime) * 0.4,
            endTime: aPanelRange.startTime + (aPanelRange.endTime - aPanelRange.startTime) * 0.6,
        },
        navigatorRange: {
            startTime: aPanelRange.startTime,
            endTime: aPanelRange.endTime,
        },
    };
};

export const getMovedPanelRange = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aDirection: 'left' | 'right',
): PanelRangeUpdate => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) / 2;

    if (aDirection === 'left') {
        const sStartTime = aPanelRange.startTime - sCalcTime;
        const sEndTime = aPanelRange.endTime - sCalcTime;

        return {
            panelRange: createTagAnalyzerTimeRange(sStartTime, sEndTime),
            navigatorRange:
                aNavigatorRange.startTime > sStartTime
                    ? createTagAnalyzerTimeRange(sStartTime, aNavigatorRange.endTime - sCalcTime)
                    : undefined,
        };
    }

    const sStartTime = aPanelRange.startTime + sCalcTime;
    const sEndTime = aPanelRange.endTime + sCalcTime;

    return {
        panelRange: createTagAnalyzerTimeRange(sStartTime, sEndTime),
        navigatorRange:
            aNavigatorRange.endTime < sEndTime
                ? createTagAnalyzerTimeRange(aNavigatorRange.startTime + sCalcTime, sEndTime)
                : undefined,
    };
};

export const getMovedNavigatorRange = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aDirection: 'left' | 'right',
): PanelRangeUpdate => {
    const sCalcTime = (aNavigatorRange.endTime - aNavigatorRange.startTime) / 2;
    const sMainChartCount = aPanelRange.endTime - aPanelRange.startTime;

    if (aDirection === 'left') {
        const startTime = aNavigatorRange.startTime - sCalcTime;
        const endTime = aNavigatorRange.endTime - sCalcTime;

        return {
            panelRange:
                aPanelRange.endTime > endTime
                    ? createTagAnalyzerTimeRange(endTime - sMainChartCount, endTime)
                    : aPanelRange,
            navigatorRange: createTagAnalyzerTimeRange(startTime, endTime),
        };
    }

    const startTime = aNavigatorRange.startTime + sCalcTime;
    const endTime = aNavigatorRange.endTime + sCalcTime;

    return {
        panelRange:
            aPanelRange.startTime < startTime
                ? createTagAnalyzerTimeRange(startTime, startTime + sMainChartCount)
                : aPanelRange,
        navigatorRange: createTagAnalyzerTimeRange(startTime, endTime),
    };
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
        aLimit,
        aUseSampling,
        aIsRaw,
        aAxes.pixels_per_tick,
        aAxes.pixels_per_tick_raw,
        aChartWidth,
    );
};

export const resolvePanelFetchTimeRange = (
    aPanelTime: TagAnalyzerPanelTime,
    aBoardRange?: {
        range_bgn: TagAnalyzerRangeValue;
        range_end: TagAnalyzerRangeValue;
    },
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
    if ((aPanelData.interval_type ?? '').toLowerCase() !== '') {
        return {
            IntervalType: convertInterType(aPanelData.interval_type?.toLowerCase()),
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
}: ResolveNavigatorChartStateParams): Promise<TagAnalyzerChartData> => {
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
}: ResolvePanelChartStateParams): Promise<PanelChartLoadState> => {
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

const resolveBoardLastRange = (
    aBoardRange: { range_bgn: TagAnalyzerRangeValue; range_end: TagAnalyzerRangeValue } | undefined,
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (
        !aBgnEndTimeRange?.end_max ||
        typeof aBoardRange?.range_bgn !== 'string' ||
        !aBoardRange.range_bgn.includes('last')
    ) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(
        subtractTime(aBgnEndTimeRange.end_max, aBoardRange.range_bgn),
        subtractTime(aBgnEndTimeRange.end_max, aBoardRange.range_end),
    );
};

const resolveEditBoardLastRange = (
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (aBgnEndTimeRange?.bgn_max === undefined || aBgnEndTimeRange.end_max === undefined) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn_max, aBgnEndTimeRange.end_max);
};

const getDefaultBoardRange = (
    aBoardRange: { range_bgn: TagAnalyzerRangeValue; range_end: TagAnalyzerRangeValue } | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): TagAnalyzerTimeRange => {
    return getDateRange(
        {
            default_range: aPanelTime.default_range,
        },
        aBoardRange,
    );
};

const resolveEditPreviewTimeRange = (
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (aBgnEndTimeRange?.bgn_min === undefined || aBgnEndTimeRange?.end_max === undefined) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn_min, aBgnEndTimeRange.end_max);
};

const getAbsolutePanelRange = (aPanelTime: TagAnalyzerPanelTime): TagAnalyzerTimeRange | undefined => {
    if (typeof aPanelTime.range_bgn !== 'number' || typeof aPanelTime.range_end !== 'number') {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);
};

const resolveNowPanelRange = (
    aBoardRange: { range_bgn: TagAnalyzerRangeValue; range_end: TagAnalyzerRangeValue } | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): TagAnalyzerTimeRange | undefined => {
    if (typeof aPanelTime.range_end !== 'string' || !aPanelTime.range_end.includes('now')) {
        return undefined;
    }

    return getDateRange(
        {
            range_bgn: aPanelTime.range_bgn,
            range_end: aPanelTime.range_end,
            default_range: aPanelTime.default_range,
        },
        aBoardRange,
    );
};

const getRelativePanelLastRange = async (
    aPanelData: TagAnalyzerPanelData,
    aBoardRange: { range_bgn: TagAnalyzerRangeValue; range_end: TagAnalyzerRangeValue } | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): Promise<TagAnalyzerTimeRange | undefined> => {
    if (
        typeof aPanelTime.range_end !== 'string' ||
        !aPanelTime.range_end.includes('last') ||
        typeof aBoardRange?.range_bgn !== 'string' ||
        typeof aBoardRange.range_end !== 'string'
    ) {
        return undefined;
    }

    const sTimeRange = await getBgnEndTimeRange(
        aPanelData.tag_set,
        { bgn: aBoardRange.range_bgn, end: aBoardRange.range_end },
        { bgn: aPanelTime.range_bgn, end: aPanelTime.range_end },
    );

    return createTagAnalyzerTimeRange(
        subtractTime(sTimeRange.end_max as number, aPanelTime.range_bgn),
        subtractTime(sTimeRange.end_max as number, aPanelTime.range_end),
    );
};

export const resolveResetTimeRange = async ({
    boardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: ResolveResetTimeRangeParams): Promise<TagAnalyzerTimeRange> => {
    if (isEdit) {
        return (
            resolveEditPreviewTimeRange(bgnEndTimeRange) ??
            getDateRange(
                {
                    range_bgn: panelTime.range_bgn,
                    range_end: panelTime.range_end,
                    default_range: panelTime.default_range,
                },
                boardRange,
            )
        );
    }

    const sTopLevelLastRange = resolveBoardLastRange(boardRange, bgnEndTimeRange);
    if (sTopLevelLastRange) {
        return sTopLevelLastRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardRange, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = resolveNowPanelRange(boardRange, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    const sAbsolutePanelRange = getAbsolutePanelRange(panelTime);
    if (sAbsolutePanelRange) {
        return sAbsolutePanelRange;
    }

    return getDefaultBoardRange(boardRange, panelTime);
};

export const resolveInitialPanelRange = async ({
    boardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: ResolveInitialPanelRangeParams): Promise<TagAnalyzerTimeRange> => {
    const sTopLevelLastRange = isEdit
        ? resolveEditBoardLastRange(bgnEndTimeRange)
        : resolveBoardLastRange(boardRange, bgnEndTimeRange);

    if (sTopLevelLastRange) {
        return sTopLevelLastRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardRange, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = resolveNowPanelRange(boardRange, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    return getDateRange(
        {
            range_bgn: panelTime.range_bgn,
            range_end: panelTime.range_end,
            default_range: panelTime.default_range,
        },
        boardRange,
    );
};

export const resolveTimeKeeperRanges = (
    aTimeKeeper?: Partial<TagAnalyzerPanelTimeKeeper>,
): { panelRange: TagAnalyzerTimeRange; navigatorRange: TagAnalyzerTimeRange } | undefined => {
    if (
        aTimeKeeper?.startPanelTime === undefined ||
        aTimeKeeper.endPanelTime === undefined ||
        aTimeKeeper.startNaviTime === undefined ||
        aTimeKeeper.endNaviTime === undefined
    ) {
        return undefined;
    }

    return {
        panelRange: createTagAnalyzerTimeRange(aTimeKeeper.startPanelTime, aTimeKeeper.endPanelTime),
        navigatorRange: createTagAnalyzerTimeRange(aTimeKeeper.startNaviTime, aTimeKeeper.endNaviTime),
    };
};

export const createPanelTimeKeeperPayload = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
): TagAnalyzerPanelTimeKeeper => {
    return {
        startPanelTime: aPanelRange.startTime,
        endPanelTime: aPanelRange.endTime,
        startNaviTime: aNavigatorRange.startTime,
        endNaviTime: aNavigatorRange.endTime,
    };
};

export const resolveGlobalTimeTargetRange = (
    aPreOverflowRange: TagAnalyzerTimeRange,
    aPanelRange: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    if (aPreOverflowRange.startTime && aPreOverflowRange.endTime) {
        return aPreOverflowRange;
    }

    return aPanelRange;
};

export const buildPanelPresentationState = ({
    title,
    panelRange,
    rangeOption,
    isEdit,
    isRaw,
    isSelectedForOverlap,
    isOverlapAnchor,
    canToggleOverlap,
    isSelectionActive,
    isSelectionMenuOpen,
    canSaveLocal,
    changeUtcToText,
}: BuildPanelPresentationStateParams): PanelPresentationState => {
    return {
        title,
        timeText: panelRange.startTime ? `${changeUtcToText(panelRange.startTime)} ~ ${changeUtcToText(panelRange.endTime)}` : '',
        intervalText: !isRaw && rangeOption ? `${rangeOption.IntervalValue}${rangeOption.IntervalType}` : '',
        isEdit,
        isRaw,
        isSelectedForOverlap,
        isOverlapAnchor,
        canToggleOverlap,
        isSelectionActive,
        canOpenFft: isSelectionMenuOpen && isSelectionActive,
        canSaveLocal,
    };
};

import { getDateRange } from '@/utils/helpers/date';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { ADMIN_ID } from '@/utils/constants';
import { isRollup } from '@/utils';
import {
    calcInterval,
    calculateSCount,
    checkTableUser,
    convertInterType,
    getInterval,
} from '../../TagAnalyzerUtil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTime,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from '../TagAnalyzerPanelModelTypes';
import { createTagAnalyzerTimeRange } from '../TagAnalyzerPanelModelTypes';
import type { CoordinateType, TagAnalyzerPanelHeaderState } from '../TagAnalyzerPanelTypes';
import type { TagAnalyzerBoardInfo, TagAnalyzerBoardPanelState } from '../../TagAnalyzerType';

type ChartRectLike = {
    left: number;
    top: number;
};

type PanelRangeUpdate = {
    panelRange: TagAnalyzerTimeRange;
    navigatorRange?: TagAnalyzerTimeRange;
};

type ResolveResetTimeRangeParams = {
    boardInfo: TagAnalyzerBoardInfo;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    isEdit?: boolean;
};

type ResolveInitialPanelRangeParams = {
    boardInfo: TagAnalyzerBoardInfo;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    isEdit?: boolean;
};

type BuildPanelHeaderStateParams = {
    title: string;
    panelRange: TagAnalyzerTimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    isEdit?: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    canToggleOverlap: boolean;
    isSelectionActive: boolean;
    isSelectionMenuOpen: boolean;
    canSaveLocal: boolean;
    overlapPanels?: TagAnalyzerBoardPanelState['overlapPanels'];
    panelInfo: TagAnalyzerPanelInfo;
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

export const getZoomInPanelRange = (aPanelRange: TagAnalyzerTimeRange, aZoom = 0): TagAnalyzerTimeRange => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) * aZoom;
    const sStartTime = aPanelRange.startTime + sCalcTime;
    let sEndTime = aPanelRange.endTime - sCalcTime;

    if (sEndTime - sStartTime < 10) {
        sEndTime = sStartTime + 10;
    }

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
};

export const getZoomOutRange = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aZoom = 0,
): PanelRangeUpdate => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) * aZoom;
    let sStartTime = aPanelRange.startTime - sCalcTime;
    let sEndTime = aPanelRange.endTime + sCalcTime;

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
    aDirection: string,
): PanelRangeUpdate => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) / 2;

    if (aDirection === 'l') {
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
    aDirection: string,
): PanelRangeUpdate => {
    const sCalcTime = (aNavigatorRange.endTime - aNavigatorRange.startTime) / 2;
    const sMainChartCount = aPanelRange.endTime - aPanelRange.startTime;

    if (aDirection === 'l') {
        const sStartTime = aNavigatorRange.startTime - sCalcTime;
        const sEndTime = aNavigatorRange.endTime - sCalcTime;

        return {
            panelRange:
                aPanelRange.endTime > sEndTime
                    ? createTagAnalyzerTimeRange(sEndTime - sMainChartCount, sEndTime)
                    : aPanelRange,
            navigatorRange: createTagAnalyzerTimeRange(sStartTime, sEndTime),
        };
    }

    const sStartTime = aNavigatorRange.startTime + sCalcTime;
    const sEndTime = aNavigatorRange.endTime + sCalcTime;

    return {
        panelRange:
            aPanelRange.startTime < sStartTime
                ? createTagAnalyzerTimeRange(sStartTime, sStartTime + sMainChartCount)
                : aPanelRange,
        navigatorRange: createTagAnalyzerTimeRange(sStartTime, sEndTime),
    };
};

export const getPanelChartWidth = (aWidth?: number): number => {
    if (!aWidth || aWidth === 0) {
        return 1;
    }

    return aWidth;
};

export const getPanelFetchCount = (
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

export const getPanelFetchTimeRange = (
    aPanelTime: TagAnalyzerPanelTime,
    aBoardInfo: TagAnalyzerBoardInfo,
    aTimeRange?: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    return getDateRange(
        {
            range_bgn: aPanelTime.range_bgn,
            range_end: aPanelTime.range_end,
            default_range: aPanelTime.default_range,
        },
        aBoardInfo,
        aTimeRange,
    );
};

export const getPanelIntervalOption = (
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

export const getPanelDataLimitState = (
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

const getTopLevelLastRange = (
    aBoardInfo: TagAnalyzerBoardInfo,
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (
        !aBgnEndTimeRange?.end_max ||
        typeof aBoardInfo.range_bgn !== 'string' ||
        !aBoardInfo.range_bgn.includes('last')
    ) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(
        subtractTime(aBgnEndTimeRange.end_max, aBoardInfo.range_bgn),
        subtractTime(aBgnEndTimeRange.end_max, aBoardInfo.range_end),
    );
};

const getEditableTopLevelLastRange = (
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (aBgnEndTimeRange?.bgn_max === undefined || aBgnEndTimeRange.end_max === undefined) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn_max, aBgnEndTimeRange.end_max);
};

const getDefaultBoardRange = (
    aBoardInfo: TagAnalyzerBoardInfo,
    aPanelTime: TagAnalyzerPanelTime,
): TagAnalyzerTimeRange => {
    return getDateRange(
        {},
        aBoardInfo?.range_end
            ? aBoardInfo
            : {
                  range_bgn: aPanelTime.default_range?.min ?? 0,
                  range_end: aPanelTime.default_range?.max ?? 0,
              },
    );
};

const getEditPreviewRange = (
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

const getNowPanelRange = (
    aBoardInfo: TagAnalyzerBoardInfo,
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
        aBoardInfo,
    );
};

const getRelativePanelLastRange = async (
    aPanelData: TagAnalyzerPanelData,
    aBoardInfo: TagAnalyzerBoardInfo,
    aPanelTime: TagAnalyzerPanelTime,
): Promise<TagAnalyzerTimeRange | undefined> => {
    if (typeof aPanelTime.range_end !== 'string' || !aPanelTime.range_end.includes('last')) {
        return undefined;
    }

    const sTimeRange = await getBgnEndTimeRange(
        aPanelData.tag_set,
        { bgn: aBoardInfo.range_bgn, end: aBoardInfo.range_end },
        { bgn: aPanelTime.range_bgn, end: aPanelTime.range_end },
    );

    return createTagAnalyzerTimeRange(
        subtractTime(sTimeRange.end_max as number, aPanelTime.range_bgn),
        subtractTime(sTimeRange.end_max as number, aPanelTime.range_end),
    );
};

export const resolveResetTimeRange = async ({
    boardInfo,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: ResolveResetTimeRangeParams): Promise<TagAnalyzerTimeRange> => {
    if (isEdit) {
        return (
            getEditPreviewRange(bgnEndTimeRange) ??
            getDateRange(
                {
                    range_bgn: panelTime.range_bgn,
                    range_end: panelTime.range_end,
                    default_range: panelTime.default_range,
                },
                boardInfo,
            )
        );
    }

    const sTopLevelLastRange = getTopLevelLastRange(boardInfo, bgnEndTimeRange);
    if (sTopLevelLastRange) {
        return sTopLevelLastRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardInfo, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = getNowPanelRange(boardInfo, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    const sAbsolutePanelRange = getAbsolutePanelRange(panelTime);
    if (sAbsolutePanelRange) {
        return sAbsolutePanelRange;
    }

    return getDefaultBoardRange(boardInfo, panelTime);
};

export const resolveInitialPanelRange = async ({
    boardInfo,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: ResolveInitialPanelRangeParams): Promise<TagAnalyzerTimeRange> => {
    const sTopLevelLastRange = isEdit
        ? getEditableTopLevelLastRange(bgnEndTimeRange)
        : getTopLevelLastRange(boardInfo, bgnEndTimeRange);

    if (sTopLevelLastRange) {
        return sTopLevelLastRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardInfo, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = getNowPanelRange(boardInfo, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    return getDateRange(
        {
            range_bgn: panelTime.range_bgn,
            range_end: panelTime.range_end,
            default_range: panelTime.default_range,
        },
        boardInfo,
    );
};

export const getTimeKeeperRanges = (
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

export const getPanelGlobalTimeTarget = (
    aPreOverflowRange: TagAnalyzerTimeRange,
    aPanelRange: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    if (aPreOverflowRange.startTime && aPreOverflowRange.endTime) {
        return aPreOverflowRange;
    }

    return aPanelRange;
};

export const buildPanelHeaderState = ({
    title,
    panelRange,
    rangeOption,
    isEdit,
    isRaw,
    isSelectedForOverlap,
    canToggleOverlap,
    isSelectionActive,
    isSelectionMenuOpen,
    canSaveLocal,
    overlapPanels,
    panelInfo,
    changeUtcToText,
}: BuildPanelHeaderStateParams): TagAnalyzerPanelHeaderState => {
    return {
        title,
        timeText: panelRange.startTime ? `${changeUtcToText(panelRange.startTime)} ~ ${changeUtcToText(panelRange.endTime)}` : '',
        intervalText: !isRaw && rangeOption ? `${rangeOption.IntervalValue}${rangeOption.IntervalType}` : '',
        isEdit,
        isRaw,
        isSelectedForOverlap,
        isOverlapAnchor: overlapPanels?.[0]?.board.meta.index_key === panelInfo.meta.index_key,
        canToggleOverlap,
        isSelectionActive,
        canOpenFft: isSelectionMenuOpen && isSelectionActive,
        canSaveLocal,
    };
};

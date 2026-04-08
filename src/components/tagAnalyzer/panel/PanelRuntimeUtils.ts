import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { getDateRange } from '../utils/TagAnalyzerDateUtils';
import { isLastRelativeTimeValue, isNowRelativeTimeValue } from '../utils/TagAnalyzerRelativeTimeUtils';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelData,
    TagAnalyzerPanelTime,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';
import { createTagAnalyzerTimeRange } from './PanelModelUtils';
import type { PanelPresentationState, PanelRangeChangeEvent } from './TagAnalyzerPanelTypes';

type BoardRange = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

const isRelativeTimeBoundary = (
    aBoardRange: BoardRange | undefined,
): aBoardRange is { range_bgn: string; range_end: string } => {
    return typeof aBoardRange?.range_bgn === 'string' && typeof aBoardRange.range_end === 'string';
};

export type PanelRangeUpdate = {
    panelRange: TagAnalyzerTimeRange;
    navigatorRange?: TagAnalyzerTimeRange;
};

type PanelRangeResolveParams = {
    boardRange?: BoardRange;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    isEdit: boolean;
};

const MAX_PANEL_END_TIME = 9999999999999;
const NAVIGATOR_RELOAD_BUCKET_MS = 1000;

const getNavigatorReloadBucket = (aTime: number) => {
    return Math.floor(aTime / NAVIGATOR_RELOAD_BUCKET_MS);
};

export const getSelectionMenuPosition = (aChartRect?: { left: number; top: number } | null): { x: number; y: number } => {
    if (!aChartRect) return { x: 10, y: 10 };
    return { x: aChartRect.left - 90, y: aChartRect.top - 35 };
};

export const getExpandedNavigatorRange = (
    aEvent: PanelRangeChangeEvent,
    aNavigatorRange: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange | undefined => {
    if (
        aEvent.trigger !== 'brushZoom' ||
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

export const resolveAppliedPanelRange = (
    aRequestedRange: TagAnalyzerTimeRange,
    aOverflowRange: TagAnalyzerTimeRange | null,
): TagAnalyzerTimeRange => {
    return aOverflowRange ?? aRequestedRange;
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
        getNavigatorReloadBucket(aNextRange.startTime) !== getNavigatorReloadBucket(aCurrentRange.startTime) ||
        getNavigatorReloadBucket(aNextRange.endTime) !== getNavigatorReloadBucket(aCurrentRange.endTime)
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

export const applyZoomIn = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aZoom: number,
) => {
    aSetExtremes(getZoomInPanelRange(aPanelRange, aZoom));
};

export const applyZoomOut = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aZoom: number,
) => {
    const sRangeUpdate = getZoomOutRange(aPanelRange, aNavigatorRange, aZoom);
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

export const applyFocusedRange = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getFocusedPanelRange(aPanelRange);
    if (!sRangeUpdate) return;
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
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

export const applyShiftedPanelRangeLeft = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedPanelRange(aPanelRange, aNavigatorRange, 'left');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

export const applyShiftedPanelRangeRight = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedPanelRange(aPanelRange, aNavigatorRange, 'right');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

export const applyShiftedNavigatorRangeLeft = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'left');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

export const applyShiftedNavigatorRangeRight = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'right');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

const resolveBoardLastRange = (
    aBoardRange: BoardRange | undefined,
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (
        !aBgnEndTimeRange?.end_max ||
        !isRelativeTimeBoundary(aBoardRange) ||
        !isLastRelativeTimeValue(aBoardRange.range_bgn)
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
    aBoardRange: BoardRange | undefined,
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
    aBoardRange: BoardRange | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): TagAnalyzerTimeRange | undefined => {
    if (!isNowRelativeTimeValue(aPanelTime.range_end)) {
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
    aBoardRange: BoardRange | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): Promise<TagAnalyzerTimeRange | undefined> => {
    if (
        !isLastRelativeTimeValue(aPanelTime.range_end) ||
        !isRelativeTimeBoundary(aBoardRange)
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

const resolvePanelRangeFromRules = async ({
    topLevelRange,
    boardRange,
    panelData,
    panelTime,
    includeAbsolutePanelRange = false,
    fallbackRange,
}: {
    topLevelRange?: TagAnalyzerTimeRange;
    boardRange?: BoardRange;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    includeAbsolutePanelRange?: boolean;
    fallbackRange: () => TagAnalyzerTimeRange;
}): Promise<TagAnalyzerTimeRange> => {
    if (topLevelRange) {
        return topLevelRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(panelData, boardRange, panelTime);
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = resolveNowPanelRange(boardRange, panelTime);
    if (sNowPanelRange) {
        return sNowPanelRange;
    }

    if (includeAbsolutePanelRange) {
        const sAbsolutePanelRange = getAbsolutePanelRange(panelTime);
        if (sAbsolutePanelRange) {
            return sAbsolutePanelRange;
        }
    }

    return fallbackRange();
};

export const resolveResetTimeRange = async ({
    boardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: PanelRangeResolveParams): Promise<TagAnalyzerTimeRange> => {
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

    return resolvePanelRangeFromRules({
        topLevelRange: resolveBoardLastRange(boardRange, bgnEndTimeRange),
        boardRange,
        panelData,
        panelTime,
        includeAbsolutePanelRange: true,
        fallbackRange: () => getDefaultBoardRange(boardRange, panelTime),
    });
};

export const resolveInitialPanelRange = async ({
    boardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: PanelRangeResolveParams): Promise<TagAnalyzerTimeRange> => {
    return resolvePanelRangeFromRules({
        topLevelRange: isEdit
            ? resolveEditBoardLastRange(bgnEndTimeRange)
            : resolveBoardLastRange(boardRange, bgnEndTimeRange),
        boardRange,
        panelData,
        panelTime,
        fallbackRange: () =>
            getDateRange(
                {
                    range_bgn: panelTime.range_bgn,
                    range_end: panelTime.range_end,
                    default_range: panelTime.default_range,
                },
                boardRange,
            ),
    });
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
    isDragSelectActive,
    canOpenFft,
    canSaveLocal,
    changeUtcToText,
}: {
    title: string;
    panelRange: TagAnalyzerTimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isDragSelectActive: boolean;
    canOpenFft: boolean;
    canSaveLocal: boolean;
    changeUtcToText: (aUtc: number) => string;
}): PanelPresentationState => ({
    title,
    timeText: panelRange.startTime ? `${changeUtcToText(panelRange.startTime)} ~ ${changeUtcToText(panelRange.endTime)}` : '',
    intervalText: !isRaw && rangeOption ? `${rangeOption.IntervalValue}${rangeOption.IntervalType}` : '',
    isEdit,
    isRaw,
    isSelectedForOverlap,
    isOverlapAnchor,
    canToggleOverlap,
    isDragSelectActive,
    canOpenFft,
    canSaveLocal,
});

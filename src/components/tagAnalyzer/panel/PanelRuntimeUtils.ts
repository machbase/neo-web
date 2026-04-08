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

/**
 * Narrows a board range to the string-based relative values used by the time helpers.
 * @param aBoardRange The board-level range to inspect.
 * @returns Whether the board range can be treated as a relative string range.
 */
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

/**
 * Buckets navigator timestamps so tiny millisecond drift does not force a reload.
 * @param aTime The navigator timestamp to bucket.
 * @returns The coarse reload bucket for the timestamp.
 */
const getNavigatorReloadBucket = (aTime: number) => {
    return Math.floor(aTime / NAVIGATOR_RELOAD_BUCKET_MS);
};

/**
 * Places the drag-select popover near the chart instead of the page origin.
 * @param aChartRect The chart bounding rect, when available.
 * @returns The popover position for the drag-selection summary.
 */
export const getSelectionMenuPosition = (aChartRect?: { left: number; top: number } | null): { x: number; y: number } => {
    if (!aChartRect) return { x: 10, y: 10 };
    return { x: aChartRect.left - 90, y: aChartRect.top - 35 };
};

/**
 * Widens the navigator when a brush zoom selects a range that is too narrow for the current overview.
 * @param aEvent The panel range change event from the chart.
 * @param aNavigatorRange The current navigator range.
 * @returns The widened navigator range, or `undefined` when no expansion is needed.
 */
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

/**
 * Prefers the overflow-corrected range when the fetch clamps the requested window.
 * @param aRequestedRange The range the user asked for.
 * @param aOverflowRange The overflow-corrected range from the fetch.
 * @returns The range that should be treated as the applied panel range.
 */
export const resolveAppliedPanelRange = (
    aRequestedRange: TagAnalyzerTimeRange,
    aOverflowRange: TagAnalyzerTimeRange | null,
): TagAnalyzerTimeRange => {
    return aOverflowRange ?? aRequestedRange;
};

/**
 * Enforces the minimum navigator width expected by the footer controls.
 * @param aEvent The navigator range change event.
 * @returns The normalized navigator range.
 */
export const getNavigatorRangeFromEvent = (aEvent: Pick<PanelRangeChangeEvent, 'min' | 'max'>): TagAnalyzerTimeRange => {
    const sStartTime = aEvent.min;
    const sEndTime = aEvent.max - sStartTime < 1000 ? sStartTime + 1000 : aEvent.max;

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
};

/**
 * Reloads navigator data only when the window crosses a new second-level bucket.
 * @param aNextRange The next navigator range.
 * @param aCurrentRange The current navigator range.
 * @returns Whether the navigator dataset should be reloaded.
 */
export const shouldReloadNavigatorData = (
    aNextRange: TagAnalyzerTimeRange,
    aCurrentRange: TagAnalyzerTimeRange,
): boolean => {
    return (
        getNavigatorReloadBucket(aNextRange.startTime) !== getNavigatorReloadBucket(aCurrentRange.startTime) ||
        getNavigatorReloadBucket(aNextRange.endTime) !== getNavigatorReloadBucket(aCurrentRange.endTime)
    );
};

/**
 * Zooms the panel inward around its current center point.
 * @param aPanelRange The current panel range.
 * @param aZoom The zoom ratio to apply.
 * @returns The zoomed-in panel range.
 */
export const getZoomInPanelRange = (aPanelRange: TagAnalyzerTimeRange, aZoom = 0): TagAnalyzerTimeRange => {
    const sCalcTime = (aPanelRange.endTime - aPanelRange.startTime) * aZoom;
    const startTime = aPanelRange.startTime + sCalcTime;
    let sEndTime = aPanelRange.endTime - sCalcTime;

    if (sEndTime - startTime < 10) {
        sEndTime = startTime + 10;
    }

    return createTagAnalyzerTimeRange(startTime, sEndTime);
};

/**
 * Zooms the panel outward and widens the navigator when the new range escapes the current bounds.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aZoom The zoom ratio to apply.
 * @returns The updated panel range and any required navigator range.
 */
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

/**
 * Narrows the panel view to the middle slice of the current range.
 * @param aPanelRange The current panel range.
 * @returns The focused panel range update, or `undefined` when the range is already too small.
 */
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

/**
 * Applies a zoom-in request through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aZoom The zoom ratio to apply.
 * @returns Nothing.
 */
export const applyZoomIn = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aZoom: number,
) => {
    aSetExtremes(getZoomInPanelRange(aPanelRange, aZoom));
};

/**
 * Applies a zoom-out request through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aZoom The zoom ratio to apply.
 * @returns Nothing.
 */
export const applyZoomOut = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aZoom: number,
) => {
    const sRangeUpdate = getZoomOutRange(aPanelRange, aNavigatorRange, aZoom);
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Applies the centered focus window when the panel range is wide enough.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @returns Nothing.
 */
export const applyFocusedRange = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getFocusedPanelRange(aPanelRange);
    if (!sRangeUpdate) return;
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Shifts the visible panel range by half its width in the requested direction.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel range and any required navigator range.
 */
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

/**
 * Shifts the navigator window and keeps the panel inside the new overview.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel and navigator ranges.
 */
export const getMovedNavigatorRange = (
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
    aDirection: 'left' | 'right',
): PanelRangeUpdate => {
    const sCalcTime = (aNavigatorRange.endTime - aNavigatorRange.startTime) / 2;
    const sDirectionOffset = aDirection === 'left' ? -sCalcTime : sCalcTime;
    const sPanelRange = createTagAnalyzerTimeRange(
        aPanelRange.startTime + sDirectionOffset,
        aPanelRange.endTime + sDirectionOffset,
    );

    if (aDirection === 'left') {
        const startTime = aNavigatorRange.startTime - sCalcTime;
        const endTime = aNavigatorRange.endTime - sCalcTime;

        return {
            panelRange: sPanelRange,
            navigatorRange: createTagAnalyzerTimeRange(startTime, endTime),
        };
    }

    const startTime = aNavigatorRange.startTime + sCalcTime;
    const endTime = aNavigatorRange.endTime + sCalcTime;

    return {
        panelRange: sPanelRange,
        navigatorRange: createTagAnalyzerTimeRange(startTime, endTime),
    };
};

/**
 * Applies a leftward panel shift through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns Nothing.
 */
export const applyShiftedPanelRangeLeft = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedPanelRange(aPanelRange, aNavigatorRange, 'left');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Applies a rightward panel shift through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns Nothing.
 */
export const applyShiftedPanelRangeRight = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedPanelRange(aPanelRange, aNavigatorRange, 'right');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Applies a leftward navigator shift through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns Nothing.
 */
export const applyShiftedNavigatorRangeLeft = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'left');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Applies a rightward navigator shift through the shared range setter.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns Nothing.
 */
export const applyShiftedNavigatorRangeRight = (
    aSetExtremes: (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => void,
    aPanelRange: TagAnalyzerTimeRange,
    aNavigatorRange: TagAnalyzerTimeRange,
) => {
    const sRangeUpdate = getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'right');
    aSetExtremes(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
};

/**
 * Resolves board-level ranges expressed as "last ..." relative values.
 * @param aBoardRange The board-level range to inspect.
 * @param aBgnEndTimeRange The fetched board min/max bounds.
 * @returns The resolved board-relative range, or `undefined` when it does not apply.
 */
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

/**
 * Reuses edit-mode preview bounds when they already reflect a fetched board range.
 * @param aBgnEndTimeRange The fetched board min/max bounds.
 * @returns The edit-preview range, or `undefined` when it is incomplete.
 */
const resolveEditBoardLastRange = (
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (aBgnEndTimeRange?.bgn_max === undefined || aBgnEndTimeRange.end_max === undefined) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn_max, aBgnEndTimeRange.end_max);
};

/**
 * Falls back to the board default range when no more specific rule applies.
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The default board range for the panel.
 */
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

/**
 * Reuses the editor preview min/max bounds when they are already known.
 * @param aBgnEndTimeRange The fetched preview min/max bounds.
 * @returns The edit-preview panel range, or `undefined` when it is incomplete.
 */
const resolveEditPreviewTimeRange = (
    aBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>,
): TagAnalyzerTimeRange | undefined => {
    if (aBgnEndTimeRange?.bgn_min === undefined || aBgnEndTimeRange?.end_max === undefined) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn_min, aBgnEndTimeRange.end_max);
};

/**
 * Returns a literal numeric panel range without any relative-time resolution.
 * @param aPanelTime The panel time configuration.
 * @returns The numeric panel range, or `undefined` when the config is not absolute.
 */
const getAbsolutePanelRange = (aPanelTime: TagAnalyzerPanelTime): TagAnalyzerTimeRange | undefined => {
    if (typeof aPanelTime.range_bgn !== 'number' || typeof aPanelTime.range_end !== 'number') {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);
};

/**
 * Resolves panel ranges that are expressed relative to "now".
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The now-relative panel range, or `undefined` when it does not apply.
 */
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

/**
 * Resolves panel ranges that are expressed relative to the latest fetched panel time.
 * @param aPanelData The panel data configuration.
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The last-relative panel range, or `undefined` when it does not apply.
 */
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

/**
 * Resolves the highest-priority range rule that applies to a panel.
 * @param aParams The range-resolution inputs for the panel.
 * @returns The resolved panel range.
 */
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

/**
 * Resolves the range used when a panel is explicitly reset.
 * @param aParams The reset-resolution inputs for the panel.
 * @returns The resolved reset range.
 */
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

/**
 * Resolves the first visible range when a panel initializes.
 * @param aParams The initialization-resolution inputs for the panel.
 * @returns The resolved initial panel range.
 */
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

/**
 * Rehydrates persisted panel and navigator ranges from the time-keeper payload.
 * @param aTimeKeeper The persisted time-keeper payload.
 * @returns The restored panel and navigator ranges, or `undefined` when the payload is incomplete.
 */
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

/**
 * Serializes the current panel and navigator windows into the time-keeper payload.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns The persisted time-keeper payload.
 */
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

/**
 * Chooses the range that should be broadcast as the current global time selection.
 * @param aPreOverflowRange The pre-overflow panel range, when one exists.
 * @param aPanelRange The current panel range.
 * @returns The range that should be broadcast globally.
 */
export const resolveGlobalTimeTargetRange = (
    aPreOverflowRange: TagAnalyzerTimeRange,
    aPanelRange: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    if (aPreOverflowRange.startTime && aPreOverflowRange.endTime) {
        return aPreOverflowRange;
    }

    return aPanelRange;
};

/**
 * Builds the header/footer presentation strings for a panel card.
 * @param aParams The presentation inputs for the current panel state.
 * @returns The derived presentation state for the panel UI.
 */
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

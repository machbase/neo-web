import { subtractTime } from '@/utils/bgnEndTimeRange';
import {
    createTagAnalyzerTimeRange,
    normalizePanelTimeRangeSource,
    normalizeTimeRangeSource,
    setTimeRange,
    isLastRelativeTimeValue,
    isNowRelativeTimeValue,
} from '../utils/TagAnalyzerDateUtils';
import { callTagAnalyzerBgnEndTimeRange } from '../TagAnalyzerUtilCaller';
import type { LegacyTimeRange } from '../utils/legacy/LegacyTimeRangeTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerDefaultRange,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelData,
    TagAnalyzerPanelTime,
    TagAnalyzerPanelTimeKeeper,
    TimeRange,
    PanelPresentationState,
    PanelShiftHandlers,
    PanelZoomHandlers,
} from './PanelModel';

// Used by PanelRangeUtils to type range direction.
type RangeDirection = 'left' | 'right';

// Used by PanelRangeUtils to type range update.
export type PanelRangeUpdate = {
    panelRange: TimeRange;
    navigatorRange: TimeRange | undefined;
};

// Used by PanelRangeUtils to type range resolve params.
type PanelRangeResolveParams = {
    boardRange: TagAnalyzerDefaultRange | undefined;
    legacyBoardRange?: LegacyTimeRange | undefined;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    bgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined;
    isEdit: boolean;
};

// Used by PanelRangeUtils to type panel range rule resolution params.
type PanelRangeRuleResolveParams = {
    topLevelRange: TimeRange | undefined;
    boardRange: TagAnalyzerDefaultRange | undefined;
    legacyBoardRange?: LegacyTimeRange | undefined;
    panelData: TagAnalyzerPanelData;
    panelTime: TagAnalyzerPanelTime;
    includeAbsolutePanelRange: boolean | undefined;
    fallbackRange: () => TimeRange;
};

// Used by PanelRangeUtils to type range setters shared by the chart shells.
type RangeSetter = (aPanelRange: TimeRange, aNavigatorRange: TimeRange | undefined) => void;

const MAX_PANEL_END_TIME = 9999999999999;
const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;

/**
 * Enforces the minimum navigator width expected by the footer controls.
 * @param aEvent The navigator min/max range.
 * @returns The normalized navigator range.
 */
export function getNavigatorRangeFromEvent(
    aEvent: TagAnalyzerDefaultRange,
): TimeRange {
    const sStartTime = aEvent.min;
    const sEndTime = Math.max(aEvent.max, sStartTime + MIN_NAVIGATOR_RANGE_MS);

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
}

/**
 * Zooms the panel inward around its current center point.
 * @param aPanelRange The current panel range.
 * @param aZoom The zoom ratio to apply.
 * @returns The zoomed-in panel range.
 */
export function getZoomInPanelRange(aPanelRange: TimeRange, aZoom = 0): TimeRange {
    const sCalcTime = getRangeWidth(aPanelRange) * aZoom;
    const startTime = aPanelRange.startTime + sCalcTime;
    const sEndTime = Math.max(aPanelRange.endTime - sCalcTime, startTime + MIN_PANEL_RANGE_MS);

    return createTagAnalyzerTimeRange(startTime, sEndTime);
}

/**
 * Zooms the panel outward and widens the navigator when the new range escapes the current bounds.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aZoom The zoom ratio to apply.
 * @returns The updated panel range and any required navigator range.
 */
export function getZoomOutRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aZoom = 0,
): PanelRangeUpdate {
    const sOffset = getRangeWidth(aPanelRange) * aZoom;
    let sStartTime = aPanelRange.startTime - sOffset;
    let sEndTime = aPanelRange.endTime + sOffset;

    if (sStartTime <= 0) {
        sStartTime = aNavigatorRange.startTime;
    }

    if (sEndTime > MAX_PANEL_END_TIME) {
        sEndTime = MAX_PANEL_END_TIME;
    }

    const sNextPanelRange = createTagAnalyzerTimeRange(sStartTime, sEndTime);

    return {
        panelRange: sNextPanelRange,
        navigatorRange: isRangeOutsideBounds(sNextPanelRange, aNavigatorRange)
            ? sNextPanelRange
            : undefined,
    };
}

/**
 * Narrows the panel view to the middle slice of the current range and zooms the slider range in by half.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current slider range.
 * @returns The focused panel range update, or `undefined` when the range is already too small.
 */
export function getFocusedPanelRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): PanelRangeUpdate | undefined {
    const sPanelWidth = getRangeWidth(aPanelRange);
    if (sPanelWidth < MIN_FOCUSABLE_PANEL_RANGE_MS) {
        return undefined;
    }

    const sNavigatorWidth = getRangeWidth(aNavigatorRange);
    const sFocusedNavigatorWidth = Math.max(sPanelWidth, sNavigatorWidth / 2);
    const sPanelCenterTime = aPanelRange.startTime + sPanelWidth / 2;

    return {
        panelRange: createTagAnalyzerTimeRange(
            aPanelRange.startTime + sPanelWidth * 0.4,
            aPanelRange.startTime + sPanelWidth * 0.6,
        ),
        navigatorRange: getClampedNavigatorFocusRange(
            aNavigatorRange,
            sPanelCenterTime,
            sFocusedNavigatorWidth,
        ),
    };
}

/**
 * Builds the panel move and zoom handlers for the board and preview shells.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns The shift and zoom handlers for the current chart state.
 */
export function createPanelRangeControlHandlers(
    aSetExtremes: RangeSetter,
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): { shiftHandlers: PanelShiftHandlers; zoomHandlers: PanelZoomHandlers } {
    return {
        shiftHandlers: {
            onShiftPanelRangeLeft: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedPanelRange(aPanelRange, aNavigatorRange, 'left'),
                ),
            onShiftPanelRangeRight: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedPanelRange(aPanelRange, aNavigatorRange, 'right'),
                ),
            onShiftNavigatorRangeLeft: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'left'),
                ),
            onShiftNavigatorRangeRight: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'right'),
                ),
        },
        zoomHandlers: {
            onZoomIn: (aZoom: number) =>
                aSetExtremes(getZoomInPanelRange(aPanelRange, aZoom), undefined),
            onZoomOut: (aZoom: number) =>
                applyRangeUpdate(
                    aSetExtremes,
                    getZoomOutRange(aPanelRange, aNavigatorRange, aZoom),
                ),
            onFocus: () =>
                applyRangeUpdate(aSetExtremes, getFocusedPanelRange(aPanelRange, aNavigatorRange)),
        },
    };
}

/**
 * Shifts the visible panel range by half its width in the requested direction.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel range and any required navigator range.
 */
export function getMovedPanelRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aPanelRange), aDirection);
    const sNextPanelRange = shiftTimeRange(aPanelRange, sOffset);

    return {
        panelRange: sNextPanelRange,
        navigatorRange:
            aDirection === 'left'
                ? aNavigatorRange.startTime > sNextPanelRange.startTime
                    ? createTagAnalyzerTimeRange(
                          sNextPanelRange.startTime,
                          aNavigatorRange.endTime + sOffset,
                      )
                    : undefined
                : aNavigatorRange.endTime < sNextPanelRange.endTime
                  ? createTagAnalyzerTimeRange(
                        aNavigatorRange.startTime + sOffset,
                        sNextPanelRange.endTime,
                    )
                  : undefined,
    };
}

/**
 * Shifts the navigator window and keeps the panel inside the new overview.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel and navigator ranges.
 */
export function getMovedNavigatorRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aNavigatorRange), aDirection);

    return {
        panelRange: shiftTimeRange(aPanelRange, sOffset),
        navigatorRange: shiftTimeRange(aNavigatorRange, sOffset),
    };
}

/**
 * Resolves board-level ranges expressed as "last ..." relative values.
 * @param aBoardRange The board-level range to inspect.
 * @param aBgnEndTimeRange The fetched board min/max bounds.
 * @returns The resolved board-relative range, or `undefined` when it does not apply.
 */
function resolveBoardLastRange(
    aLegacyBoardRange: LegacyTimeRange | undefined,
    aBgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined,
): TimeRange | undefined {
    if (
        !aBgnEndTimeRange ||
        !isRelativeTimeBoundary(aLegacyBoardRange) ||
        !isLastRelativeTimeValue(aLegacyBoardRange.range_bgn)
    ) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(
        subtractTime(aBgnEndTimeRange.end.max, aLegacyBoardRange.range_bgn),
        subtractTime(aBgnEndTimeRange.end.max, aLegacyBoardRange.range_end),
    );
}

/**
 * Reuses edit-mode preview bounds when they already reflect a fetched board range.
 * @param aBgnEndTimeRange The fetched board min/max bounds.
 * @returns The edit-preview range, or `undefined` when it is incomplete.
 */
function resolveEditBoardLastRange(
    aBgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined,
): TimeRange | undefined {
    if (!aBgnEndTimeRange) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn.max, aBgnEndTimeRange.end.max);
}

/**
 * Falls back to the board default range when no more specific rule applies.
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The default board range for the panel.
 */
function getDefaultBoardRange(
    aBoardRange: TagAnalyzerDefaultRange | undefined,
    aLegacyBoardRange: LegacyTimeRange | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): TimeRange {
    return setTimeRange(
        {
            range: undefined,
            defaultRange: createTagAnalyzerTimeRange(
                aPanelTime.default_range?.min ?? 0,
                aPanelTime.default_range?.max ?? 0,
            ),
        },
        normalizeTimeRangeSource(aLegacyBoardRange ?? aBoardRange),
    );
}

/**
 * Reuses the editor preview min/max bounds when they are already known.
 * @param aBgnEndTimeRange The fetched preview min/max bounds.
 * @returns The edit-preview panel range, or `undefined` when it is incomplete.
 */
function resolveEditPreviewTimeRange(
    aBgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined,
): TimeRange | undefined {
    if (!aBgnEndTimeRange) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aBgnEndTimeRange.bgn.min, aBgnEndTimeRange.end.max);
}

/**
 * Returns a literal numeric panel range without any relative-time resolution.
 * @param aPanelTime The panel time configuration.
 * @returns The numeric panel range, or `undefined` when the config is not absolute.
 */
function getAbsolutePanelRange(aPanelTime: TagAnalyzerPanelTime): TimeRange | undefined {
    if (aPanelTime.legacy_range) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(aPanelTime.range_bgn, aPanelTime.range_end);
}

/**
 * Resolves panel ranges that are expressed relative to "now".
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The now-relative panel range, or `undefined` when it does not apply.
 */
function resolveNowPanelRange(
    aBoardRange: TagAnalyzerDefaultRange | undefined,
    aLegacyBoardRange: LegacyTimeRange | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): TimeRange | undefined {
    if (!isNowRelativeTimeBoundary(aPanelTime.legacy_range)) {
        return undefined;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeTimeRangeSource(aLegacyBoardRange ?? aBoardRange),
    );
}

/**
 * Resolves panel ranges that are expressed relative to the latest fetched panel time.
 * @param aPanelData The panel data configuration.
 * @param aBoardRange The board-level range override.
 * @param aPanelTime The panel time configuration.
 * @returns The last-relative panel range, or `undefined` when it does not apply.
 */
async function getRelativePanelLastRange(
    aPanelData: TagAnalyzerPanelData,
    aLegacyBoardRange: LegacyTimeRange | undefined,
    aPanelTime: TagAnalyzerPanelTime,
): Promise<TimeRange | undefined> {
    if (
        !isLastRelativeTimeBoundary(aPanelTime.legacy_range) ||
        !isRelativeTimeBoundary(aLegacyBoardRange)
    ) {
        return undefined;
    }

    const sTimeRange = await callTagAnalyzerBgnEndTimeRange(
        aPanelData.tag_set,
        { bgn: aLegacyBoardRange.range_bgn, end: aLegacyBoardRange.range_end },
        { bgn: aPanelTime.legacy_range.range_bgn, end: aPanelTime.legacy_range.range_end },
    );
    if (!sTimeRange) {
        return undefined;
    }

    return createTagAnalyzerTimeRange(
        subtractTime(sTimeRange.end.max, aPanelTime.legacy_range.range_bgn),
        subtractTime(sTimeRange.end.max, aPanelTime.legacy_range.range_end),
    );
}

/**
 * Resolves the highest-priority range rule that applies to a panel.
 * @param topLevelRange The highest-priority resolved range, when one already exists.
 * @param boardRange The optional board-level range override.
 * @param panelData The panel data settings used by relative range resolution.
 * @param panelTime The panel time settings used to resolve the final range.
 * @param includeAbsolutePanelRange Whether literal numeric panel ranges should be accepted directly.
 * @param fallbackRange The fallback resolver used when no specific rule applies.
 * @returns The resolved panel range.
 */
async function resolvePanelRangeFromRules({
    topLevelRange,
    boardRange,
    legacyBoardRange,
    panelData,
    panelTime,
    includeAbsolutePanelRange = false,
    fallbackRange,
}: PanelRangeRuleResolveParams): Promise<TimeRange> {
    if (topLevelRange) {
        return topLevelRange;
    }

    const sRelativePanelLastRange = await getRelativePanelLastRange(
        panelData,
        legacyBoardRange,
        panelTime,
    );
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    const sNowPanelRange = resolveNowPanelRange(boardRange, legacyBoardRange, panelTime);
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
}

/**
 * Resolves the range used when a panel is explicitly reset.
 * @param boardRange The optional board-level range override.
 * @param panelData The panel data settings used by relative range resolution.
 * @param panelTime The panel time settings used to resolve the reset range.
 * @param bgnEndTimeRange The fetched min/max bounds used by edit and last-range paths.
 * @param isEdit Whether the panel is being resolved in edit mode.
 * @returns The resolved reset range.
 */
export async function resolveResetTimeRange({
    boardRange,
    legacyBoardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: PanelRangeResolveParams): Promise<TimeRange> {
    if (isEdit) {
        return (
            resolveEditPreviewTimeRange(bgnEndTimeRange) ??
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                normalizeTimeRangeSource(legacyBoardRange ?? boardRange),
            )
        );
    }

    return resolvePanelRangeFromRules({
        topLevelRange: resolveBoardLastRange(legacyBoardRange, bgnEndTimeRange),
        boardRange,
        legacyBoardRange,
        panelData,
        panelTime,
        includeAbsolutePanelRange: true,
        fallbackRange: () => getDefaultBoardRange(boardRange, legacyBoardRange, panelTime),
    });
}

/**
 * Resolves the first visible range when a panel initializes.
 * @param boardRange The optional board-level range override.
 * @param panelData The panel data settings used by relative range resolution.
 * @param panelTime The panel time settings used to resolve the initial range.
 * @param bgnEndTimeRange The fetched min/max bounds used by edit and last-range paths.
 * @param isEdit Whether the panel is being resolved in edit mode.
 * @returns The resolved initial panel range.
 */
export async function resolveInitialPanelRange({
    boardRange,
    legacyBoardRange,
    panelData,
    panelTime,
    bgnEndTimeRange,
    isEdit,
}: PanelRangeResolveParams): Promise<TimeRange> {
    return resolvePanelRangeFromRules({
        topLevelRange: isEdit
            ? resolveEditBoardLastRange(bgnEndTimeRange)
            : resolveBoardLastRange(legacyBoardRange, bgnEndTimeRange),
        boardRange,
        legacyBoardRange,
        panelData,
        panelTime,
        fallbackRange: () =>
            setTimeRange(
                normalizePanelTimeRangeSource(panelTime),
                normalizeTimeRangeSource(legacyBoardRange ?? boardRange),
            ),

        includeAbsolutePanelRange: undefined,
    });
}

/**
 * Rehydrates persisted panel and navigator ranges from the time-keeper payload.
 * @param aTimeKeeper The persisted time-keeper payload.
 * @returns The restored panel and navigator ranges, or `undefined` when the payload is incomplete.
 */
export function resolveTimeKeeperRanges(
    aTimeKeeper: Partial<TagAnalyzerPanelTimeKeeper> | undefined,
): { panelRange: TimeRange; navigatorRange: TimeRange } | undefined {
    if (
        !isCompleteTimeRange(aTimeKeeper?.panelRange) ||
        !isCompleteTimeRange(aTimeKeeper?.navigatorRange)
    ) {
        return undefined;
    }

    return {
        panelRange: aTimeKeeper.panelRange,
        navigatorRange: aTimeKeeper.navigatorRange,
    };
}

/**
 * Serializes the current panel and navigator windows into the time-keeper payload.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns The persisted time-keeper payload.
 */
export function createPanelTimeKeeperPayload(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): TagAnalyzerPanelTimeKeeper {
    return {
        panelRange: aPanelRange,
        navigatorRange: aNavigatorRange,
    };
}

/**
 * Chooses the range that should be broadcast as the current global time selection.
 * @param aPreOverflowRange The pre-overflow panel range, when one exists.
 * @param aPanelRange The current panel range.
 * @returns The range that should be broadcast globally.
 */
export function resolveGlobalTimeTargetRange(
    aPreOverflowRange: TimeRange,
    aPanelRange: TimeRange,
): TimeRange {
    if (aPreOverflowRange.startTime && aPreOverflowRange.endTime) {
        return aPreOverflowRange;
    }

    return aPanelRange;
}

/**
 * Builds the header/footer presentation strings for a panel card.
 * @param title The panel title text shown in the header.
 * @param panelRange The current visible panel range.
 * @param aRangeOption The current interval option for sampled chart loads.
 * @param aIsEdit Whether the panel is currently in edit mode.
 * @param aIsRaw Whether the panel is currently showing raw data.
 * @param aIsSelectedForOverlap Whether the panel is selected for overlap comparison.
 * @param aIsOverlapAnchor Whether the panel is the current overlap anchor.
 * @param aCanToggleOverlap Whether overlap toggling is currently allowed.
 * @param aIsDragSelectActive Whether drag-select mode is currently active.
 * @param aCanOpenFft Whether the FFT action is currently allowed.
 * @param aCanSaveLocal Whether the local-save action is currently allowed.
 * @param aChangeUtcToText The formatter used to render UTC timestamps as text.
 * @returns The derived presentation state for the panel UI.
 */
export function buildPanelPresentationState(
    aTitle: string,
    aPanelRange: TimeRange,
    aRangeOption: TagAnalyzerIntervalOption | undefined,
    aIsEdit: boolean,
    aIsRaw: boolean,
    aIsSelectedForOverlap: boolean,
    aIsOverlapAnchor: boolean,
    aCanToggleOverlap: boolean,
    aIsDragSelectActive: boolean,
    aCanOpenFft: boolean,
    aCanSaveLocal: boolean,
    aChangeUtcToText: (aUtc: number) => string,
): PanelPresentationState {
    return {
        title: aTitle,
        timeText: aPanelRange.startTime
            ? `${aChangeUtcToText(aPanelRange.startTime)} ~ ${aChangeUtcToText(aPanelRange.endTime)}`
            : '',
        intervalText:
            !aIsRaw && aRangeOption
                ? `${aRangeOption.IntervalValue}${aRangeOption.IntervalType}`
                : '',
        isEdit: aIsEdit,
        isRaw: aIsRaw,
        isSelectedForOverlap: aIsSelectedForOverlap,
        isOverlapAnchor: aIsOverlapAnchor,
        canToggleOverlap: aCanToggleOverlap,
        isDragSelectActive: aIsDragSelectActive,
        canOpenFft: aCanOpenFft,
        canSaveLocal: aCanSaveLocal,
    };
}

/**
 * Keeps a resized navigator range inside its previous bounds while preserving width when possible.
 * @param aNavigatorRange The current navigator range.
 * @param aCenterTime The time that should stay near the middle of the resized range.
 * @param aNextWidth The requested navigator width.
 * @returns The resized navigator range constrained to the previous bounds.
 */
function getClampedNavigatorFocusRange(
    aNavigatorRange: TimeRange,
    aCenterTime: number,
    aNextWidth: number,
): TimeRange {
    let sStartTime = aCenterTime - aNextWidth / 2;
    let sEndTime = aCenterTime + aNextWidth / 2;

    if (sStartTime < aNavigatorRange.startTime) {
        sEndTime += aNavigatorRange.startTime - sStartTime;
        sStartTime = aNavigatorRange.startTime;
    }

    if (sEndTime > aNavigatorRange.endTime) {
        sStartTime -= sEndTime - aNavigatorRange.endTime;
        sEndTime = aNavigatorRange.endTime;
    }

    if (sStartTime < aNavigatorRange.startTime) {
        sStartTime = aNavigatorRange.startTime;
    }

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
}

/**
 * Measures the current width of a time range.
 * @param aRange The time range to inspect.
 * @returns The range width in milliseconds.
 */
function getRangeWidth(aRange: TimeRange): number {
    return aRange.endTime - aRange.startTime;
}

/**
 * Shifts a time range by the provided offset.
 * @param aRange The time range to shift.
 * @param aOffset The offset to apply.
 * @returns The shifted time range.
 */
function shiftTimeRange(aRange: TimeRange, aOffset: number): TimeRange {
    return createTagAnalyzerTimeRange(aRange.startTime + aOffset, aRange.endTime + aOffset);
}

/**
 * Converts a range width and direction into the signed shift offset used by move helpers.
 * @param aRangeWidth The current range width.
 * @param aDirection The requested move direction.
 * @returns The signed half-width offset for the move.
 */
function getDirectionOffset(aRangeWidth: number, aDirection: RangeDirection): number {
    const sHalfWidth = aRangeWidth / 2;
    return aDirection === 'left' ? -sHalfWidth : sHalfWidth;
}

/**
 * Detects whether the next panel range escaped the current navigator bounds.
 * @param aRange The next panel range.
 * @param aBounds The current navigator bounds.
 * @returns Whether the panel range escaped the navigator bounds.
 */
function isRangeOutsideBounds(aRange: TimeRange, aBounds: TimeRange): boolean {
    return aRange.startTime < aBounds.startTime || aRange.endTime > aBounds.endTime;
}

/**
 * Applies a resolved range update only when one exists.
 * @param aSetExtremes The shared range setter.
 * @param aRangeUpdate The resolved panel and navigator range update.
 * @returns Nothing.
 */
function applyRangeUpdate(
    aSetExtremes: RangeSetter,
    aRangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!aRangeUpdate) {
        return;
    }
    aSetExtremes(aRangeUpdate.panelRange, aRangeUpdate.navigatorRange);
}

/**
 * Detects whether a partial time range has both concrete endpoints.
 * @param aRange The time range payload to inspect.
 * @returns Whether the time range has both start and end values.
 */
function isCompleteTimeRange(aRange: Partial<TimeRange> | undefined): aRange is TimeRange {
    return aRange?.startTime !== undefined && aRange.endTime !== undefined;
}

/**
 * Narrows a board range to the string-based relative values used by the time helpers.
 * @param aBoardRange The board-level range to inspect.
 * @returns Whether the board range can be treated as a relative string range.
 */
function isRelativeTimeBoundary(
    aRange: LegacyTimeRange | undefined,
): aRange is { range_bgn: string; range_end: string } {
    return typeof aRange?.range_bgn === 'string' && typeof aRange.range_end === 'string';
}

function isLastRelativeTimeBoundary(
    aRange: LegacyTimeRange | undefined,
): aRange is { range_bgn: string; range_end: string } {
    return (
        isRelativeTimeBoundary(aRange) &&
        isLastRelativeTimeValue(aRange.range_bgn) &&
        isLastRelativeTimeValue(aRange.range_end)
    );
}

function isNowRelativeTimeBoundary(
    aRange: LegacyTimeRange | undefined,
): aRange is { range_bgn: string; range_end: string } {
    return (
        isRelativeTimeBoundary(aRange) &&
        isNowRelativeTimeValue(aRange.range_bgn) &&
        isNowRelativeTimeValue(aRange.range_end)
    );
}

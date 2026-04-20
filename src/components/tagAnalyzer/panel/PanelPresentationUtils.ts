import { changeUtcToText } from '@/utils/helpers/date';
import type { PanelPresentationState } from '../utils/PanelTypes';
import type { IntervalOption, TimeRange } from '../utils/ModelTypes';

/**
 * Builds the header/footer presentation strings for a panel card.
 * @param aTitle The panel title text shown in the header.
 * @param aPanelRange The current visible panel range.
 * @param aRangeOption The current interval option for sampled chart loads.
 * @param aIsEdit Whether the panel is currently in edit mode.
 * @param aIsRaw Whether the panel is currently showing raw data.
 * @param aIsSelectedForOverlap Whether the panel is selected for overlap comparison.
 * @param aIsOverlapAnchor Whether the panel is the current overlap anchor.
 * @param aCanToggleOverlap Whether overlap toggling is currently allowed.
 * @param aIsDragSelectActive Whether drag-select mode is currently active.
 * @param aCanOpenFft Whether the FFT action is currently allowed.
 * @param aCanSaveLocal Whether the local-save action is currently allowed.
 * @returns The derived presentation state for the panel UI.
 */
export function buildPanelPresentationState(
    aTitle: string,
    aPanelRange: TimeRange,
    aRangeOption: IntervalOption | undefined,
    aIsEdit: boolean,
    aIsRaw: boolean,
    aIsSelectedForOverlap: boolean,
    aIsOverlapAnchor: boolean,
    aCanToggleOverlap: boolean,
    aIsDragSelectActive: boolean,
    aCanOpenFft: boolean,
    aCanSaveLocal: boolean,
): PanelPresentationState {
    return {
        title: aTitle,
        timeText: aPanelRange.startTime
            ? `${changeUtcToText(aPanelRange.startTime)} ~ ${changeUtcToText(aPanelRange.endTime)}`
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

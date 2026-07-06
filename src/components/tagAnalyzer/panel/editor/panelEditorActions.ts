import type { PanelInfo } from '../../domain/panel/PanelInfo';
import {
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { TimeRangeInput } from '../../domain/time/TimeTypes';
import { isPanelRangeInputValidForAxis } from '../../domain/panelRange/PanelRangeInput';

function hasPanelTimeRangeInputChanged(
    currentPanelState: PanelInfo,
    nextPanelState: PanelInfo,
): boolean {
    return (
        currentPanelState.time.rangeInput.start !== nextPanelState.time.rangeInput.start ||
        currentPanelState.time.rangeInput.end !== nextPanelState.time.rangeInput.end
    );
}

function normalizeTagSetForRightYAxis(
    tagSet: PanelSeriesDefinition[],
    rightYAxisEnabled: boolean,
): PanelSeriesDefinition[] {
    return rightYAxisEnabled
        ? tagSet
        : tagSet.map((series) => ({ ...series, useSecondaryAxis: false }));
}

// When the series change flips the x-axis kind (datetime <-> numeric), the stored
// expressions become meaningless for the new axis, so reset them to empty.
function normalizeRangeInputForSeries(
    rangeInput: TimeRangeInput,
    tagSet: PanelSeriesDefinition[],
): TimeRangeInput {
    const sIsNumericAxis = shouldUseNumericPanelRangeInput(tagSet);

    return isPanelRangeInputValidForAxis(rangeInput, sIsNumericAxis)
        ? rangeInput
        : { start: '', end: '' };
}

export function resolveAppliedPanelInfo(
    currentPanelInfo: PanelInfo,
    editorConfig: PanelInfo,
): {
    nextPanelInfo: PanelInfo;
    preserveCurrentVisibleRange: boolean;
} {
    const sNormalizedTagSet = normalizeTagSetForRightYAxis(
        editorConfig.query.tagSet,
        editorConfig.axes.rightY.enabled,
    );
    const sNormalizedRangeInput = normalizeRangeInputForSeries(
        editorConfig.time.rangeInput,
        sNormalizedTagSet,
    );
    const sNextPanelState: PanelInfo = {
        ...editorConfig,
        query: {
            ...editorConfig.query,
            tagSet: sNormalizedTagSet,
        },
        time: {
            rangeInput: sNormalizedRangeInput,
            useLastViewedRange: editorConfig.time.useLastViewedRange,
            lastViewedRange: editorConfig.time.lastViewedRange,
        },
    };
    const sHasTimeRangeInputChanged = hasPanelTimeRangeInputChanged(
        currentPanelInfo,
        sNextPanelState,
    );
    const sShouldClearLastViewedRange =
        !sNextPanelState.time.useLastViewedRange ||
        sHasTimeRangeInputChanged;

    return {
        nextPanelInfo: {
            ...sNextPanelState,
            time: {
                ...sNextPanelState.time,
                lastViewedRange: sShouldClearLastViewedRange
                    ? undefined
                    : sNextPanelState.time.lastViewedRange,
            },
        },
        preserveCurrentVisibleRange: !sHasTimeRangeInputChanged,
    };
}

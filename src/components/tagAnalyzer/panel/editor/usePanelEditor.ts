import type { PanelInfo } from '../../domain/panel/PanelConfig';
import {
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { PanelRangeInput } from '../../domain/time/TimeTypes';
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
    rangeInput: PanelRangeInput,
    tagSet: PanelSeriesDefinition[],
): PanelRangeInput {
    const sIsNumericAxis = shouldUseNumericPanelRangeInput(tagSet);

    return isPanelRangeInputValidForAxis(rangeInput, sIsNumericAxis)
        ? rangeInput
        : { start: '', end: '' };
}

export function usePanelEditorActions({
    panelInfo,
    onApplyPanelInfo,
    onSavePanelInfo,
    reloadAfterEditorSave,
}: {
    panelInfo: PanelInfo;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSavePanelInfo: (panelInfo: PanelInfo) => Promise<boolean>;
    reloadAfterEditorSave: (
        panelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ) => void;
}): {
    applyEditedPanelConfig: (editorConfig: PanelInfo) => void;
    saveEditedPanelConfig: (editorConfig: PanelInfo) => Promise<boolean>;
} {
    function buildAppliedPanelInfo(editorConfig: PanelInfo): PanelInfo {
        const sCurrentPanelState = panelInfo;
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
            sCurrentPanelState,
            sNextPanelState,
        );
        const sShouldClearLastViewedRange =
            !sNextPanelState.time.useLastViewedRange ||
            sHasTimeRangeInputChanged;
        const sNextPanelInfo: PanelInfo = {
            ...sNextPanelState,
            time: {
                ...sNextPanelState.time,
                lastViewedRange: sShouldClearLastViewedRange
                    ? undefined
                    : sNextPanelState.time.lastViewedRange,
            },
        };

        return sNextPanelInfo;
    }

    function shouldPreserveCurrentVisibleRange(
        nextPanelInfo: PanelInfo,
    ): boolean {
        return !hasPanelTimeRangeInputChanged(panelInfo, nextPanelInfo);
    }

    function applyAndReloadPanelInfo(
        editorConfig: PanelInfo,
    ): PanelInfo {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(
            sNextPanelInfo,
            shouldPreserveCurrentVisibleRange(sNextPanelInfo),
        );

        return sNextPanelInfo;
    }

    function applyEditedPanelConfig(editorConfig: PanelInfo): void {
        applyAndReloadPanelInfo(editorConfig);
    }

    async function saveEditedPanelConfig(
        editorConfig: PanelInfo,
    ): Promise<boolean> {
        return onSavePanelInfo(applyAndReloadPanelInfo(editorConfig));
    }

    return {
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    };
}

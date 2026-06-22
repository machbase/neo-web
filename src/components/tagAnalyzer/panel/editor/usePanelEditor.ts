import type { PanelInfo, PanelTimeRange } from '../../domain/PanelDomain';
import {
    shouldUseNumericPanelRangeConfig,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { PanelEditorConfig } from './PanelEditor';
import type { PanelRangeConfig } from '../../domain/time/model/TimeTypes';
import {
    createNumericRangeBoundary,
    createNumericRangeConfig,
    createTimestampRangeBoundary,
    createTimestampRangeConfig,
    isNumericRangeConfig,
    isTimestampRangeConfig,
} from '../../domain/time/range/PanelRangeConfigUtils';

function hasPanelTimeRangeConfigChanged(
    currentPanelState: PanelInfo,
    nextPanelState: PanelInfo,
): boolean {
    return (
        getRangeConfigKey(currentPanelState.timeRange) !==
        getRangeConfigKey(nextPanelState.timeRange)
    );
}

function getRangeConfigKey(timeRange: PanelTimeRange): string {
    return JSON.stringify({
        start: timeRange.start,
        end: timeRange.end,
    });
}

function normalizeTagSetForRightYAxis(
    tagSet: PanelSeriesDefinition[],
    rightYAxisEnabled: boolean,
): PanelSeriesDefinition[] {
    return rightYAxisEnabled
        ? tagSet
        : tagSet.map((series) => ({ ...series, useSecondaryAxis: false }));
}

function normalizeRangeConfigForSeries(
    rangeConfig: PanelRangeConfig,
    tagSet: PanelSeriesDefinition[],
): PanelRangeConfig {
    const sShouldUseNumericRangeConfig = shouldUseNumericPanelRangeConfig(tagSet);

    if (sShouldUseNumericRangeConfig) {
        return isNumericRangeConfig(rangeConfig)
            ? rangeConfig
            : createNumericRangeConfig(
                  createNumericRangeBoundary('numeric_empty'),
                  createNumericRangeBoundary('numeric_empty'),
              );
    }

    return isTimestampRangeConfig(rangeConfig)
        ? rangeConfig
        : createTimestampRangeConfig(
              createTimestampRangeBoundary('timestamp_empty'),
              createTimestampRangeBoundary('timestamp_empty'),
          );
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
    applyEditedPanelConfig: (editorConfig: PanelEditorConfig) => void;
    saveEditedPanelConfig: (editorConfig: PanelEditorConfig) => Promise<boolean>;
} {
    function buildAppliedPanelInfo(editorConfig: PanelEditorConfig): PanelInfo {
        const sCurrentPanelState = panelInfo;
        const sNormalizedTagSet = normalizeTagSetForRightYAxis(
            editorConfig.query.tagSet,
            editorConfig.axes.rightY.enabled,
        );
        const sNormalizedRangeConfig = normalizeRangeConfigForSeries(
            editorConfig.timeRange,
            sNormalizedTagSet,
        );
        const sNextPanelState: PanelInfo = {
            ...editorConfig,
            query: {
                ...editorConfig.query,
                tagSet: sNormalizedTagSet,
            },
            timeRange: {
                ...sNormalizedRangeConfig,
                useLastViewedRange: editorConfig.timeRange.useLastViewedRange,
                lastViewedRange: editorConfig.timeRange.lastViewedRange,
            },
        };
        const sHasTimeRangeConfigChanged = hasPanelTimeRangeConfigChanged(
            sCurrentPanelState,
            sNextPanelState,
        );
        const sShouldClearLastViewedRange =
            !sNextPanelState.timeRange.useLastViewedRange ||
            sHasTimeRangeConfigChanged;
        const sNextPanelInfo: PanelInfo = {
            ...sNextPanelState,
            timeRange: {
                ...sNextPanelState.timeRange,
                lastViewedRange: sShouldClearLastViewedRange
                    ? undefined
                    : sNextPanelState.timeRange.lastViewedRange,
            },
        };

        return sNextPanelInfo;
    }

    function shouldPreserveCurrentVisibleRange(
        nextPanelInfo: PanelInfo,
    ): boolean {
        return !hasPanelTimeRangeConfigChanged(panelInfo, nextPanelInfo);
    }

    function applyEditedPanelConfig(editorConfig: PanelEditorConfig): void {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(
            sNextPanelInfo,
            shouldPreserveCurrentVisibleRange(sNextPanelInfo),
        );
    }

    async function saveEditedPanelConfig(
        editorConfig: PanelEditorConfig,
    ): Promise<boolean> {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(
            sNextPanelInfo,
            shouldPreserveCurrentVisibleRange(sNextPanelInfo),
        );
        return onSavePanelInfo(sNextPanelInfo);
    }

    return {
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    };
}

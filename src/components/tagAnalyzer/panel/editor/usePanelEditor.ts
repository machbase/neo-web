import type { PanelInfo } from '../../domain/PanelDomain';
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
        JSON.stringify(currentPanelState.time.range_config) !==
        JSON.stringify(nextPanelState.time.range_config)
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
            editorConfig.data.tag_set,
            editorConfig.axes.right_y_axis_enabled,
        );
        const sNextPanelState: PanelInfo = {
            ...editorConfig,
            data: {
                ...editorConfig.data,
                tag_set: sNormalizedTagSet,
            },
            time: {
                range_config: normalizeRangeConfigForSeries(
                    editorConfig.time.range_config,
                    sNormalizedTagSet,
                ),
            },
        };
        const sHasTimeRangeConfigChanged = hasPanelTimeRangeConfigChanged(
            sCurrentPanelState,
            sNextPanelState,
        );
        const sShouldClearLastViewedRange =
            !sNextPanelState.general.use_last_viewed_range ||
            sHasTimeRangeConfigChanged;
        const sNextPanelInfo: PanelInfo = {
            ...sNextPanelState,
            general: {
                ...sNextPanelState.general,
                last_viewed_range: sShouldClearLastViewedRange
                    ? undefined
                    : sNextPanelState.general.last_viewed_range,
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

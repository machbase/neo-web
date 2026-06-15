import type { PanelInfo } from '../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { ReloadAfterEditorSaveOptions } from '../../board/useConfigReload';
import type { PanelEditorConfig } from './PanelEditor';

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
        options: ReloadAfterEditorSaveOptions,
    ) => void;
}): {
    applyEditedPanelConfig: (editorConfig: PanelEditorConfig) => void;
    saveEditedPanelConfig: (editorConfig: PanelEditorConfig) => Promise<boolean>;
} {
    function buildAppliedPanelInfo(editorConfig: PanelEditorConfig): PanelInfo {
        const sCurrentPanelState = panelInfo;
        const sNextPanelState: PanelInfo = {
            ...editorConfig,
            data: {
                ...editorConfig.data,
                tag_set: normalizeTagSetForRightYAxis(
                    editorConfig.data.tag_set,
                    editorConfig.axes.right_y_axis_enabled,
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

    function getReloadAfterEditorSaveOptions(
        nextPanelInfo: PanelInfo,
    ): ReloadAfterEditorSaveOptions {
        return {
            preserveCurrentVisibleRange:
                !hasPanelTimeRangeConfigChanged(panelInfo, nextPanelInfo),
        };
    }

    function applyEditedPanelConfig(editorConfig: PanelEditorConfig): void {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(
            sNextPanelInfo,
            getReloadAfterEditorSaveOptions(sNextPanelInfo),
        );
    }

    async function saveEditedPanelConfig(
        editorConfig: PanelEditorConfig,
    ): Promise<boolean> {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(
            sNextPanelInfo,
            getReloadAfterEditorSaveOptions(sNextPanelInfo),
        );
        return onSavePanelInfo(sNextPanelInfo);
    }

    return {
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    };
}

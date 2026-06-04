import { useState } from 'react';
import type { PanelInfo } from '../../domain/PanelDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../../domain/time/TimeRangeUtils';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
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

export function usePanelEditor({
    panelInfo,
    panelRange,
    navigatorRange,
    onResetPanelUi,
    onApplyPanelInfo,
    onSavePanelInfo,
    reloadAfterEditorSave,
}: {
    panelInfo: PanelInfo;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    onResetPanelUi: () => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSavePanelInfo: (panelInfo: PanelInfo) => Promise<boolean>;
    reloadAfterEditorSave: (panelInfo: PanelInfo) => void;
}): {
    isEditing: boolean;
    closePanelEditor: () => void;
    toggleEditMode: () => void;
    applyEditedPanelConfig: (editorConfig: PanelEditorConfig) => void;
    saveEditedPanelConfig: (editorConfig: PanelEditorConfig) => Promise<boolean>;
} {
    const [isEditing, setIsEditing] = useState(false);

    function closePanelEditor(): void {
        setIsEditing(false);
    }

    function toggleEditMode(): void {
        const sShouldOpenEditor = !isEditing;

        onResetPanelUi();
        setIsEditing(sShouldOpenEditor);
    }

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
        const sLastViewedRange =
            sNextPanelState.general.use_last_viewed_range &&
            !sHasTimeRangeConfigChanged &&
            isConcreteTimeRange(panelRange) &&
            isConcreteTimeRange(navigatorRange)
                ? {
                      panelRange,
                      navigatorRange,
                  }
                : undefined;
        const sNextPanelInfo: PanelInfo = {
            ...sNextPanelState,
            general: {
                ...sNextPanelState.general,
                last_viewed_range: sLastViewedRange,
            },
        };

        return sNextPanelInfo;
    }

    function applyEditedPanelConfig(editorConfig: PanelEditorConfig): void {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(sNextPanelInfo);
    }

    async function saveEditedPanelConfig(
        editorConfig: PanelEditorConfig,
    ): Promise<boolean> {
        const sNextPanelInfo = buildAppliedPanelInfo(editorConfig);

        onApplyPanelInfo(sNextPanelInfo);
        reloadAfterEditorSave(sNextPanelInfo);
        return onSavePanelInfo(sNextPanelInfo);
    }

    return {
        isEditing,
        closePanelEditor,
        toggleEditMode,
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    };
}

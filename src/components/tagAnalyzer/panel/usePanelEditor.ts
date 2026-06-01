import { useState } from 'react';
import type { PanelInfo } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { PanelEditorConfig } from './editor/PanelEditor';

function getPanelStateWithoutNavigatorPersistence(
    panelState: PanelInfo,
): PanelInfo {
    return {
        ...panelState,
        general: {
            ...panelState.general,
            use_last_viewed_range: false,
            last_viewed_range: undefined,
        },
    };
}

function shouldReloadPanelAfterEditorSave(
    currentPanelState: PanelInfo,
    nextPanelState: PanelInfo,
): boolean {
    return (
        JSON.stringify(getPanelStateWithoutNavigatorPersistence(currentPanelState)) !==
        JSON.stringify(getPanelStateWithoutNavigatorPersistence(nextPanelState))
    );
}

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
    onSavePanel,
    reloadPanelEdit,
}: {
    panelInfo: PanelInfo;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    onResetPanelUi: () => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    reloadPanelEdit: (panelInfo: PanelInfo) => void;
}): {
    isEditing: boolean;
    closePanelEditor: () => void;
    toggleEditMode: () => void;
    saveEditedPanelConfig: (editorConfig: PanelEditorConfig) => void;
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

    function saveEditedPanelConfig(editorConfig: PanelEditorConfig): void {
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

        onSavePanel(sNextPanelInfo);
        if (shouldReloadPanelAfterEditorSave(sCurrentPanelState, sNextPanelState)) {
            reloadPanelEdit(sNextPanelInfo);
        }
    }

    return {
        isEditing,
        closePanelEditor,
        toggleEditMode,
        saveEditedPanelConfig,
    };
}

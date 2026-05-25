import { useState } from 'react';
import type { PanelInfo } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import type { PanelEditorConfig } from './editor/EditorTypes';
import {
    mergeEditorConfigIntoPanelState,
    type PanelEditorPanelState,
} from './editor/PanelEditorConfigConverter';

function getPanelStateWithoutNavigatorPersistence(
    panelState: PanelEditorPanelState,
): PanelEditorPanelState {
    return {
        ...panelState,
        time: {
            ...panelState.time,
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
    };
}

function shouldReloadPanelAfterEditorSave(
    currentPanelState: PanelEditorPanelState,
    nextPanelState: PanelEditorPanelState,
): boolean {
    return (
        JSON.stringify(getPanelStateWithoutNavigatorPersistence(currentPanelState)) !==
        JSON.stringify(getPanelStateWithoutNavigatorPersistence(nextPanelState))
    );
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
        const sCurrentPanelState = {
            meta: panelInfo.meta,
            data: panelInfo.data,
            time: panelInfo.time,
            axes: panelInfo.axes,
            display: panelInfo.display,
        };
        const sNextPanelState = mergeEditorConfigIntoPanelState(
            sCurrentPanelState,
            editorConfig,
        );
        const sLastViewedRange =
            sNextPanelState.time.useLastViewedRange &&
            isConcreteTimeRange(panelRange) &&
            isConcreteTimeRange(navigatorRange)
                ? {
                      panelRange,
                      navigatorRange,
                  }
                : undefined;
        const sNextPanelInfo = {
            ...panelInfo,
            ...sNextPanelState,
            time: {
                ...sNextPanelState.time,
                lastViewedRange: sLastViewedRange,
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

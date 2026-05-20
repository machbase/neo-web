import { useState } from 'react';
import type { PanelInfo } from '../domain/PanelModel';
import type { PanelEditorConfig } from './editor/EditorTypes';
import { mergeEditorConfigIntoPanelState } from './editor/PanelEditorConfigConverter';

export function usePanelEditor({
    panelInfo,
    onResetPanelUi,
    onSavePanel,
    reloadPanelEdit,
}: {
    panelInfo: PanelInfo;
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
        const sNextPanelState = mergeEditorConfigIntoPanelState(
            {
                meta: panelInfo.meta,
                data: panelInfo.data,
                time: panelInfo.time,
                axes: panelInfo.axes,
                display: panelInfo.display,
            },
            editorConfig,
        );
        const sNextPanelInfo = {
            ...panelInfo,
            ...sNextPanelState,
        };

        onSavePanel(sNextPanelInfo);
        reloadPanelEdit(sNextPanelInfo);
    }

    return {
        isEditing,
        closePanelEditor,
        toggleEditMode,
        saveEditedPanelConfig,
    };
}

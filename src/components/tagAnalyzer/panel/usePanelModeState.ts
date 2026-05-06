import { useState } from 'react';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import {
    closePanelAnnotationMode,
    closePanelDragSelectMode,
    openPanelAnnotationMode,
    setPanelFftModalOpen,
    setPanelRawMode,
    togglePanelDragSelectMode,
    togglePanelEditMode,
    togglePanelHighlightMode,
} from './PanelInteractionStateUtils';
import type { PanelState } from './PanelTypes';

export function usePanelModeState(initialIsRaw: boolean) {
    const [panelState, setPanelState] = useState<PanelState>(() => ({
        isRaw: initialIsRaw,
        isFFTModal: false,
        isEditing: false,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
    }));
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(undefined);

    function closeAnnotationMode() {
        setPanelState(closePanelAnnotationMode);
    }

    function closeDragSelectMode() {
        setPanelState(closePanelDragSelectMode);
        setFftSelection(undefined);
    }

    function toggleDragSelectMode() {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;

        setPanelState(togglePanelDragSelectMode);
        if (!nextIsDragSelectActive) {
            setFftSelection(undefined);
        }
    }

    function toggleHighlightMode() {
        setPanelState(togglePanelHighlightMode);
        setFftSelection(undefined);
    }

    function openAnnotationMode() {
        setPanelState(openPanelAnnotationMode);
        setFftSelection(undefined);
    }

    function toggleEditMode() {
        setPanelState(togglePanelEditMode);
        setFftSelection(undefined);
    }

    function toggleRawMode() {
        const nextRaw = !panelState.isRaw;

        setPanelState((prev) => setPanelRawMode(prev, nextRaw));
        return nextRaw;
    }

    function setFftModalOpen(isOpen: boolean) {
        setPanelState((prev) => setPanelFftModalOpen(prev, isOpen));
    }

    function openFftModal() {
        setFftModalOpen(true);
    }

    return {
        panelState,
        fftSelection,
        setFftSelection,
        setFftModalOpen,
        closeAnnotationMode,
        closeDragSelectMode,
        toggleDragSelectMode,
        toggleHighlightMode,
        openAnnotationMode,
        toggleEditMode,
        toggleRawMode,
        openFftModal,
    };
}

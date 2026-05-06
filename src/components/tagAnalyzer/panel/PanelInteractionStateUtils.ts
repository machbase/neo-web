import type { PanelState } from './PanelTypes';

export function togglePanelDragSelectMode(panelState: PanelState): PanelState {
    const nextIsDragSelectActive = !panelState.isDragSelectActive;

    return {
        ...panelState,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: nextIsDragSelectActive,
        isFFTModal: nextIsDragSelectActive ? panelState.isFFTModal : false,
    };
}

export function closePanelDragSelectMode(panelState: PanelState): PanelState {
    return {
        ...panelState,
        isDragSelectActive: false,
        isFFTModal: false,
    };
}

export function togglePanelHighlightMode(panelState: PanelState): PanelState {
    const nextIsHighlightActive = !panelState.isHighlightActive;

    return {
        ...panelState,
        isFFTModal: false,
        isHighlightActive: nextIsHighlightActive,
        isAnnotationActive: false,
        isDragSelectActive: false,
    };
}

export function openPanelAnnotationMode(panelState: PanelState): PanelState {
    return {
        ...panelState,
        isFFTModal: false,
        isHighlightActive: false,
        isAnnotationActive: true,
        isDragSelectActive: false,
    };
}

export function closePanelAnnotationMode(panelState: PanelState): PanelState {
    return {
        ...panelState,
        isAnnotationActive: false,
    };
}

export function togglePanelEditMode(panelState: PanelState): PanelState {
    return {
        ...panelState,
        isFFTModal: false,
        isEditing: !panelState.isEditing,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
    };
}

export function setPanelRawMode(
    panelState: PanelState,
    isRaw: boolean,
): PanelState {
    return {
        ...panelState,
        isRaw: isRaw,
    };
}

export function setPanelFftModalOpen(
    panelState: PanelState,
    isOpen: boolean,
): PanelState {
    return {
        ...panelState,
        isFFTModal: isOpen,
    };
}

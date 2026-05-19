import { useState } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import type { FFTSelectionPayload } from '../domain/ChartDataModel';
import type { PanelOverlayModeState } from '../domain/PanelChartModel';
import type { PanelHighlight } from '../domain/PanelModel';
import type { ActiveAnnotationEditor } from './modal/EditAnnotationModal';
import type { ActiveHighlightEditor } from './modal/EditHighlightModal';
import type { PanelSelectionSummary } from './PanelBrushSelection';

export type PanelActiveMarkupEditor =
    | {
          type: 'highlight';
          editor: ActiveHighlightEditor;
          temporaryHighlight?: PanelHighlight | undefined;
      }
    | {
          type: 'annotation';
          editor: ActiveAnnotationEditor;
      };

type PanelOverlayMode = 'highlight' | 'annotation' | 'dragSelect';

export function usePanelOverlayState(): {
    panelOverlayModeState: PanelOverlayModeState;
    isEditing: boolean;
    contextMenuPosition: ContextMenuPosition | undefined;
    fftSelection: FFTSelectionPayload | undefined;
    isDeleteConfirmOpen: boolean;
    isExportCsvOpen: boolean;
    selectionSummary: PanelSelectionSummary | undefined;
    activeHighlightEditor:
        | Extract<PanelActiveMarkupEditor, { type: 'highlight' }>
        | undefined;
    activeAnnotationEditor:
        | Extract<PanelActiveMarkupEditor, { type: 'annotation' }>
        | undefined;
    resetAllModals: () => void;
    closeSelection: () => void;
    closeFftDialog: () => void;
    closeDeleteConfirm: () => void;
    closeExportCsv: () => void;
    closePanelEditor: () => void;
    closeContextMenu: () => void;
    closeAnnotation: () => void;
    openContextMenu: (position: ContextMenuPosition) => void;
    openFftDialog: () => void;
    openDeleteConfirm: () => void;
    openExportCsv: () => void;
    openSelectionSummary: (selectionSummary: PanelSelectionSummary) => void;
    setActiveMarkupEditorAndClearSelection: (
        activeMarkupEditor: PanelActiveMarkupEditor | undefined,
    ) => void;
    toggleOverlayMode: (mode: PanelOverlayMode) => void;
    toggleAnnotationMode: () => void;
    toggleEditMode: () => void;
} {
    const [overlayMode, setOverlayMode] =
        useState<PanelOverlayMode | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] =
        useState<ContextMenuPosition | undefined>(undefined);
    const [fftSelection, setFftSelection] =
        useState<FFTSelectionPayload | undefined>(undefined);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isExportCsvOpen, setIsExportCsvOpen] = useState(false);
    const [activeMarkupEditor, setActiveMarkupEditor] =
        useState<PanelActiveMarkupEditor | undefined>(undefined);
    const [selectionSummary, setSelectionSummary] =
        useState<PanelSelectionSummary | undefined>(undefined);
    const activeHighlightEditor =
        activeMarkupEditor?.type === 'highlight'
            ? activeMarkupEditor
            : undefined;
    const activeAnnotationEditor =
        activeMarkupEditor?.type === 'annotation'
            ? activeMarkupEditor
            : undefined;
    const panelOverlayModeState: PanelOverlayModeState = {
        isHighlightActive: overlayMode === 'highlight',
        isAnnotationActive: overlayMode === 'annotation',
        isDragSelectActive: overlayMode === 'dragSelect',
    };

    function resetAllModals(): void {
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setContextMenuPosition(undefined);
        setIsDeleteConfirmOpen(false);
        setIsExportCsvOpen(false);
        setActiveMarkupEditor(undefined);
        setOverlayMode(undefined);
        setIsEditing(false);
    }

    function closeSelection(): void {
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setOverlayMode((currentMode) =>
            currentMode === 'dragSelect' ? undefined : currentMode,
        );
    }

    function closeFftDialog(): void {
        setFftSelection(undefined);
    }

    function closeDeleteConfirm(): void {
        setIsDeleteConfirmOpen(false);
    }

    function closeExportCsv(): void {
        setIsExportCsvOpen(false);
    }

    function closePanelEditor(): void {
        setIsEditing(false);
    }

    function closeContextMenu(): void {
        setContextMenuPosition(undefined);
    }

    function closeAnnotation(): void {
        setOverlayMode((currentMode) =>
            currentMode === 'annotation' ? undefined : currentMode,
        );
        setActiveMarkupEditor((currentEditor) =>
            currentEditor?.type === 'annotation' ? undefined : currentEditor,
        );
    }

    function openContextMenu(position: ContextMenuPosition): void {
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setContextMenuPosition(position);
        setActiveMarkupEditor(undefined);

        if (overlayMode === 'annotation' || overlayMode === 'dragSelect') {
            setOverlayMode(undefined);
        }
    }

    function openFftDialog(): void {
        if (!selectionSummary) {
            return;
        }

        setFftSelection(selectionSummary.selection);
        setSelectionSummary(undefined);
        setOverlayMode((currentMode) =>
            currentMode === 'dragSelect' ? undefined : currentMode,
        );
    }

    function openDeleteConfirm(): void {
        closeSelection();
        setIsDeleteConfirmOpen(true);
    }

    function openExportCsv(): void {
        closeSelection();
        setIsExportCsvOpen(true);
    }

    function openSelectionSummary(
        nextSelectionSummary: PanelSelectionSummary,
    ): void {
        setOverlayMode('dragSelect');
        setSelectionSummary(nextSelectionSummary);
        setFftSelection(undefined);
    }

    function setActiveMarkupEditorAndClearSelection(
        nextActiveMarkupEditor: PanelActiveMarkupEditor | undefined,
    ): void {
        setActiveMarkupEditor(nextActiveMarkupEditor);
        setFftSelection(undefined);
        setSelectionSummary(undefined);

        if (nextActiveMarkupEditor && !isEditing) {
            setOverlayMode(undefined);
        }
    }

    function toggleOverlayMode(mode: PanelOverlayMode): void {
        const sShouldOpenMode = overlayMode !== mode;

        resetAllModals();

        if (sShouldOpenMode) {
            setOverlayMode(mode);
        }
    }

    function toggleAnnotationMode(): void {
        if (
            activeMarkupEditor?.type === 'annotation' ||
            overlayMode === 'annotation'
        ) {
            closeAnnotation();
            return;
        }

        resetAllModals();
        setOverlayMode('annotation');
    }

    function toggleEditMode(): void {
        const sShouldOpenEditor = !isEditing;

        resetAllModals();

        if (sShouldOpenEditor) {
            setIsEditing(true);
        }
    }

    return {
        panelOverlayModeState,
        isEditing,
        contextMenuPosition,
        fftSelection,
        isDeleteConfirmOpen,
        isExportCsvOpen,
        selectionSummary,
        activeHighlightEditor,
        activeAnnotationEditor,
        resetAllModals,
        closeSelection,
        closeFftDialog,
        closeDeleteConfirm,
        closeExportCsv,
        closePanelEditor,
        closeContextMenu,
        closeAnnotation,
        openContextMenu,
        openFftDialog,
        openDeleteConfirm,
        openExportCsv,
        openSelectionSummary,
        setActiveMarkupEditorAndClearSelection,
        toggleOverlayMode,
        toggleAnnotationMode,
        toggleEditMode,
    };
}

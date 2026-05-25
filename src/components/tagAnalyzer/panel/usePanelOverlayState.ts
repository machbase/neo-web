import {
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import type { PanelOverlayMode } from '../domain/PanelDomain';
import type { PanelSelectionSummary } from './PanelBrushSelection';

export function usePanelOverlayState(): {
    overlayMode: PanelOverlayMode;
    contextMenuPosition: ContextMenuPosition | undefined;
    fftSelection: FFTSelectionPayload | undefined;
    isDeleteConfirmOpen: boolean;
    isExportCsvOpen: boolean;
    selectionSummary: PanelSelectionSummary | undefined;
    setOverlayMode: Dispatch<SetStateAction<PanelOverlayMode>>;
    setContextMenuPosition: Dispatch<SetStateAction<ContextMenuPosition | undefined>>;
    setFftSelection: Dispatch<SetStateAction<FFTSelectionPayload | undefined>>;
    setIsDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>;
    setIsExportCsvOpen: Dispatch<SetStateAction<boolean>>;
    setSelectionSummary: Dispatch<SetStateAction<PanelSelectionSummary | undefined>>;
    resetOverlayState: () => void;
} {
    const [overlayMode, setOverlayMode] = useState<PanelOverlayMode>('noOverlay');
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | undefined>(
        undefined,
    );
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(undefined);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isExportCsvOpen, setIsExportCsvOpen] = useState(false);
    const [selectionSummary, setSelectionSummary] = useState<PanelSelectionSummary | undefined>(
        undefined,
    );

    function resetOverlayState(): void {
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setContextMenuPosition(undefined);
        setIsDeleteConfirmOpen(false);
        setIsExportCsvOpen(false);
        setOverlayMode('noOverlay');
    }

    return {
        overlayMode,
        contextMenuPosition,
        fftSelection,
        isDeleteConfirmOpen,
        isExportCsvOpen,
        selectionSummary,
        setOverlayMode,
        setContextMenuPosition,
        setFftSelection,
        setIsDeleteConfirmOpen,
        setIsExportCsvOpen,
        setSelectionSummary,
        resetOverlayState,
    };
}

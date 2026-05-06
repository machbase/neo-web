import type { MouseEvent, MutableRefObject } from 'react';
import type { BoardActions } from '../BoardTypes';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import { usePanelModeState } from './usePanelModeState';
import { usePanelPopoverStateActions } from './usePanelPopoverStateActions';

type UsePanelInteractionStateParams = {
    initialIsRaw: boolean;
    panelKey: string;
    panelRange: ResolvedTimeRangeMs;
    navigatorRange: ResolvedTimeRangeMs;
    seriesCount: number;
    panelFormRef: MutableRefObject<HTMLDivElement | null>;
    onPersistPanelState: BoardActions['onPersistPanelState'];
    onRefreshPanelData: (
        panelRange: ResolvedTimeRangeMs,
        isRaw: boolean,
        dataRange: ResolvedTimeRangeMs,
    ) => void | Promise<unknown>;
};

export function usePanelInteractionState({
    initialIsRaw,
    panelKey,
    panelRange,
    navigatorRange,
    seriesCount,
    panelFormRef,
    onPersistPanelState,
    onRefreshPanelData,
}: UsePanelInteractionStateParams) {
    const panelMode = usePanelModeState(initialIsRaw);
    const popoverActions = usePanelPopoverStateActions({
        panelRange: panelRange,
        seriesCount: seriesCount,
        panelFormRef: panelFormRef,
    });

    function closeCreateAnnotationPopover() {
        popoverActions.closeCreateAnnotationPopoverView();
        panelMode.closeAnnotationMode();
    }

    function closeTransientPanelPopovers() {
        popoverActions.closeTransientPanelPopoverViews();
        panelMode.closeAnnotationMode();
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        closeTransientPanelPopovers();
        popoverActions.openContextMenuAt(event.clientX, event.clientY);
    }

    function toggleDragSelect() {
        closeTransientPanelPopovers();
        panelMode.toggleDragSelectMode();
    }

    function toggleHighlight() {
        closeTransientPanelPopovers();
        panelMode.toggleHighlightMode();
    }

    function toggleAnnotation() {
        if (popoverActions.createAnnotationPopoverState.isOpen) {
            closeCreateAnnotationPopover();
            return;
        }

        popoverActions.closeHighlightRenamePopover();
        popoverActions.closeAnnotationPopover();
        popoverActions.closeContextMenu();
        popoverActions.openCreateAnnotationPopover();
        panelMode.openAnnotationMode();
    }

    function toggleEdit() {
        popoverActions.closeContextMenu();
        closeTransientPanelPopovers();
        panelMode.toggleEditMode();
    }

    function handleDragSelectStateChange(isDragSelectActive: boolean) {
        if (!isDragSelectActive) {
            panelMode.closeDragSelectMode();
        }
    }

    function toggleRaw() {
        const nextRaw = panelMode.toggleRawMode();

        handleRawModeChange(nextRaw);
    }

    function handleRawModeChange(nextRaw: boolean) {
        if (panelRange.startTime) {
            onPersistPanelState({
                targetPanelKey: panelKey,
                timeInfo: {
                    panelRange: panelRange,
                    navigatorRange: navigatorRange,
                },
                isRaw: nextRaw,
            });
        }
        void onRefreshPanelData(panelRange, nextRaw, navigatorRange);
    }

    return {
        panelState: panelMode.panelState,
        fftSelection: panelMode.fftSelection,
        contextMenuState: popoverActions.contextMenuState,
        highlightRenameState: popoverActions.highlightRenameState,
        createAnnotationPopoverState: popoverActions.createAnnotationPopoverState,
        annotationPopoverState: popoverActions.annotationPopoverState,
        setFftSelection: panelMode.setFftSelection,
        setFftModalOpen: panelMode.setFftModalOpen,
        handlePanelContextMenu,
        closeContextMenu: popoverActions.closeContextMenu,
        closeHighlightRenamePopover: popoverActions.closeHighlightRenamePopover,
        openHighlightRenamePopover: popoverActions.openHighlightRenamePopover,
        updateHighlightRenameLabelText: popoverActions.updateHighlightRenameLabelText,
        updateHighlightRenameFillColor: popoverActions.updateHighlightRenameFillColor,
        updateHighlightRenameTextColor: popoverActions.updateHighlightRenameTextColor,
        updateCreateAnnotationSeriesValue: popoverActions.updateCreateAnnotationSeriesValue,
        updateCreateAnnotationYearText: popoverActions.updateCreateAnnotationYearText,
        updateCreateAnnotationMonthText: popoverActions.updateCreateAnnotationMonthText,
        updateCreateAnnotationDayText: popoverActions.updateCreateAnnotationDayText,
        updateCreateAnnotationLabelText: popoverActions.updateCreateAnnotationLabelText,
        updateSeriesAnnotationLabelText: popoverActions.updateSeriesAnnotationLabelText,
        openSeriesAnnotationPopover: popoverActions.openSeriesAnnotationPopover,
        closeCreateAnnotationPopover,
        closeAnnotationPopover: popoverActions.closeAnnotationPopover,
        closeTransientPanelPopovers,
        toggleDragSelect,
        toggleHighlight,
        toggleAnnotation,
        toggleEdit,
        toggleRaw,
        handleDragSelectStateChange,
        openFftModal: panelMode.openFftModal,
    };
}

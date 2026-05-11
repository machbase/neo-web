import { useState, type MouseEvent } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { hasResolvedIntervalOption } from '../time/TimeIntervalOptionUtils';
import type { BoardActions } from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import type { TimeRangeMs } from '../time/TimeTypes';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import type {
    PanelHeaderActions,
    PanelHeaderState,
    PanelNavigateState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
} from './PanelTypes';

export function usePanelInteractionController({
    panelInfo,
    isRaw,
    chartRangeState,
    isSelectedForOverlap,
    isOverlapAnchor,
    canSaveLocal,
    isAnnotationEditorOpen,
    onClosePanelEditors,
    onCloseAnnotationEditor,
    onToggleOverlapSelection,
    onToggleRaw,
    onSetGlobalTimeRange,
    onRefreshPanelData,
    onRefreshInitialTimeRange,
    onOpenExportCsv,
    onOpenDeleteConfirm,
}: {
    panelInfo: PanelInfo;
    isRaw: boolean;
    chartRangeState: PanelNavigateState;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canSaveLocal: boolean;
    isAnnotationEditorOpen: boolean;
    onClosePanelEditors: () => void;
    onCloseAnnotationEditor: () => void;
    onToggleOverlapSelection: () => void;
    onToggleRaw: (isRaw: boolean) => void;
    onSetGlobalTimeRange: BoardActions['onSetGlobalTimeRange'];
    onRefreshPanelData: (
        timeRange: TimeRangeMs,
        raw: boolean,
        dataRange: TimeRangeMs,
    ) => unknown;
    onRefreshInitialTimeRange: () => unknown;
    onOpenExportCsv: () => void;
    onOpenDeleteConfirm: () => void;
}): {
    panelHeaderState: PanelHeaderState;
    panelHeaderActions: PanelHeaderActions;
    panelOverlayModeState: PanelOverlayModeState;
    panelOverlayModeActions: PanelOverlayModeActions;
    fftSelection: FFTSelectionPayload | undefined;
    onFftSelectionChange: (selection: FFTSelectionPayload | undefined) => void;
    handlePanelContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
    closeContextMenu: () => void;
} {
    const [isFFTModal, setIsFFTModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isHighlightActive, setIsHighlightActive] = useState(false);
    const [isAnnotationActive, setIsAnnotationActive] = useState(false);
    const [isDragSelectActive, setIsDragSelectActive] = useState(false);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(
        undefined,
    );
    const sResolvedIntervalOption = hasResolvedIntervalOption(chartRangeState.rangeOption)
        ? chartRangeState.rangeOption
        : undefined;
    const sTimeText = chartRangeState.panelRange.startTime
        ? `${changeUtcToText(chartRangeState.panelRange.startTime)} ~ ${changeUtcToText(chartRangeState.panelRange.endTime)}`
        : '';
    const sIntervalText =
        !isRaw && sResolvedIntervalOption
            ? `${sResolvedIntervalOption.IntervalValue}${sResolvedIntervalOption.IntervalType}`
            : '';
    const sCanSetGlobalTime = Boolean(chartRangeState.rangeOption);
    const sSeriesCount = panelInfo.data.tag_set.length;
    const panelOverlayModeState: PanelOverlayModeState = {
        isFFTModal: isFFTModal,
        isEditing: isEditing,
        isHighlightActive: isHighlightActive,
        isAnnotationActive: isAnnotationActive,
        isDragSelectActive: isDragSelectActive,
    };
    const panelHeaderState: PanelHeaderState = {
        title: panelInfo.meta.chart_title,
        timeText: sTimeText,
        intervalText: sIntervalText,
        isRaw: isRaw,
        isSelectedForOverlap: isSelectedForOverlap,
        isOverlapAnchor: isOverlapAnchor,
        canOpenFft: fftSelection !== undefined,
        canSetGlobalTime: sCanSetGlobalTime,
        canSaveLocal: canSaveLocal,
        contextMenu: {
            isOpen: isContextMenuOpen,
            position: contextMenuPosition,
            isOverlapToggleAvailable: sSeriesCount === 1,
        },
    };

    const panelOverlayModeActions: PanelOverlayModeActions = {
        onToggleHighlight: () => {
            onClosePanelEditors();
            setIsFFTModal(false);
            setIsHighlightActive(!isHighlightActive);
            setIsAnnotationActive(false);
            setIsDragSelectActive(false);
            setFftSelection(undefined);
        },
        onToggleAnnotation: () => {
            if (isAnnotationEditorOpen || panelOverlayModeState.isAnnotationActive) {
                onCloseAnnotationEditor();
                setIsAnnotationActive(false);
                return;
            }

            setIsContextMenuOpen(false);
            onClosePanelEditors();
            setIsFFTModal(false);
            setIsHighlightActive(false);
            setIsAnnotationActive(true);
            setIsDragSelectActive(false);
            setFftSelection(undefined);
        },
        onToggleDragSelect: () => {
            const sNextIsDragSelectActive = !panelOverlayModeState.isDragSelectActive;

            onClosePanelEditors();
            setIsAnnotationActive(false);
            setIsFFTModal(sNextIsDragSelectActive ? isFFTModal : false);
            setIsHighlightActive(false);
            setIsDragSelectActive(sNextIsDragSelectActive);
            if (!sNextIsDragSelectActive) {
                setFftSelection(undefined);
            }
        },
        onToggleEdit: () => {
            setIsContextMenuOpen(false);
            onClosePanelEditors();
            setIsAnnotationActive(false);
            setIsFFTModal(false);
            setIsEditing(!isEditing);
            setIsHighlightActive(false);
            setIsDragSelectActive(false);
            setFftSelection(undefined);
        },
        onOpenFft: () => setIsFFTModal(true),
        onCloseHighlight: () => setIsHighlightActive(false),
        onCloseAnnotation: () => setIsAnnotationActive(false),
        onCloseEdit: () => setIsEditing(false),
        onDragSelectStateChange: (nextIsDragSelectActive) => {
            if (nextIsDragSelectActive) {
                return;
            }

            setIsDragSelectActive(false);
            setIsFFTModal(false);
            setFftSelection(undefined);
        },
        onSetFftModalOpen: setIsFFTModal,
    };

    const headerActions: PanelHeaderActions = {
        onToggleOverlap: () => {
            if (sSeriesCount === 1) {
                onToggleOverlapSelection();
            }
        },
        onToggleRaw: () => onToggleRaw(!panelHeaderState.isRaw),
        onSetGlobalTime: () => {
            if (!sResolvedIntervalOption) return;

            onSetGlobalTimeRange({
                dataTime: chartRangeState.panelRange,
                navigatorTime: chartRangeState.navigatorRange,
                interval: sResolvedIntervalOption,
            });
        },
        onRefreshData: () =>
            void onRefreshPanelData(
                chartRangeState.panelRange,
                panelHeaderState.isRaw,
                chartRangeState.navigatorRange,
            ),
        onRefreshTime: () => void onRefreshInitialTimeRange(),
        onOpenExportCsv: onOpenExportCsv,
        onOpenDeleteConfirm: onOpenDeleteConfirm,
    };

    return {
        panelHeaderState,
        panelHeaderActions: headerActions,
        panelOverlayModeState,
        panelOverlayModeActions,
        fftSelection,
        onFftSelectionChange: setFftSelection,
        handlePanelContextMenu: (event: MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            onClosePanelEditors();
            setContextMenuPosition({
                x: event.clientX,
                y: event.clientY,
            });
            setIsContextMenuOpen(true);
            setIsAnnotationActive(false);
        },
        closeContextMenu: () => setIsContextMenuOpen(false),
    };
}

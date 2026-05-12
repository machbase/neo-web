export type {
    PanelChartHandle,
    PanelChartState,
    PanelCreateAnnotationRequest,
    PanelHighlightEditRequest,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelNavigatorShiftActions,
    PanelOverlayModeState,
    PanelRangeAppliedContext,
    PanelRangeChangeEvent,
    PanelRangeHandlers,
    PanelRangeShiftActions,
    PanelSeriesAnnotationEditRequest,
    PanelVisibleSeriesItem,
    PanelZoomActions,
} from '../domain/PanelChartModel';

export type PanelHeaderActions = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onSetGlobalTime: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onOpenExportCsv: () => void;
    onOpenDeleteConfirm: () => void;
};

export type PanelOverlayModeActions = {
    onToggleHighlight: () => void;
    onToggleAnnotation: () => void;
    onToggleDragSelect: () => void;
    onToggleEdit: () => void;
    onOpenFft: () => void;
    onCloseHighlight: () => void;
    onCloseAnnotation: () => void;
    onCloseEdit: () => void;
    onDragSelectStateChange: (isDragSelectActive: boolean) => void;
    onSetFftModalOpen: (isOpen: boolean) => void;
};

export type PanelHeaderState = {
    title: string;
    timeText: string;
    intervalText: string;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canOpenFft: boolean;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
    contextMenu: {
        isOpen: boolean;
        position: {
            x: number;
            y: number;
        };
        isOverlapToggleAvailable: boolean;
    };
};


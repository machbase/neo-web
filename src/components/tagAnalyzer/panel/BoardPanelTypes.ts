import type { ContextMenuPosition } from '@/design-system/components';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
} from '../utils/boardTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type {
    PanelActionHandlers,
    PanelPresentationState,
    PanelRefreshHandlers,
    PanelSavedChartInfo,
} from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

export type BoardPanelProps = {
    pPanelInfo: PanelInfo;
    pBoardContext: BoardContext;
    pIsActiveTab: boolean;
    pChartBoardState: BoardChartState;
    pChartBoardActions: BoardChartActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pRollupTableList: string[];
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
};

export type BoardPanelContextMenuState = {
    isOpen: boolean;
    position: ContextMenuPosition;
};

export type HighlightRenameState = {
    isOpen: boolean;
    highlightIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
};

export type SeriesAnnotationPopoverState = {
    isOpen: boolean;
    seriesIndex: number | undefined;
    annotationIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
    timeRange: TimeRangeMs | undefined;
};

export type CreateSeriesAnnotationPopoverState = {
    isOpen: boolean;
    position: ContextMenuPosition;
    seriesIndex: number | undefined;
    yearText: string;
    monthText: string;
    dayText: string;
    labelText: string;
};

export type BoardPanelContextMenuProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isDragSelectActive: boolean;
    canToggleOverlap: boolean;
    canOpenFft: boolean;
    isSetGlobalTimeDisabled: boolean;
    actionHandlers: Pick<
        PanelActionHandlers,
        | 'onToggleOverlap'
        | 'onToggleRaw'
        | 'onToggleDragSelect'
        | 'onOpenFft'
        | 'onSetGlobalTime'
        | 'onOpenEdit'
    >;
    refreshHandlers: PanelRefreshHandlers;
    onClose: () => void;
    onOpenDeleteConfirm: () => void;
};

export type BoardPanelHeaderProps = {
    pPresentationState: PanelPresentationState;
    pActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    pSavedChartInfo: PanelSavedChartInfo;
};

export type HighlightRenamePopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onClose: () => void;
};

export type SeriesAnnotationPopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onDelete: () => void;
    onClose: () => void;
};

export type CreateSeriesAnnotationPopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    selectedSeriesValue: string;
    yearText: string;
    monthText: string;
    dayText: string;
    labelText: string;
    onSeriesValueChange: (aValue: string) => void;
    onYearTextChange: (aValue: string) => void;
    onMonthTextChange: (aValue: string) => void;
    onDayTextChange: (aValue: string) => void;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onClose: () => void;
};

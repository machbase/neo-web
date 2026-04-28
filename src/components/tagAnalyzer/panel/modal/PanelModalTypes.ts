import type { Dispatch, SetStateAction } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelPresentationState,
    PanelRefreshHandlers,
} from '../../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';

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

export type CreateAnnotationModalBundle = {
    state: CreateSeriesAnnotationPopoverState;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    onSeriesValueChange: (value: string) => void;
    onYearTextChange: (value: string) => void;
    onMonthTextChange: (value: string) => void;
    onDayTextChange: (value: string) => void;
    onLabelTextChange: (value: string) => void;
    onApply: () => void;
    onClose: () => void;
};

export type ContextMenuModalBundle = {
    state: BoardPanelContextMenuState;
    pPresentationState: Pick<
        PanelPresentationState,
        | 'isRaw'
        | 'isSelectedForOverlap'
        | 'isDragSelectActive'
        | 'canToggleOverlap'
        | 'canOpenFft'
        | 'canSetGlobalTime'
    >;
    pActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    onClose: () => void;
    onOpenDeleteConfirm: () => void;
};

export type HighlightRenameModalBundle = {
    state: HighlightRenameState;
    onLabelTextChange: (labelText: string) => void;
    onApply: () => void;
    onClose: () => void;
};

export type AnnotationModalBundle = {
    state: SeriesAnnotationPopoverState;
    onLabelTextChange: (value: string) => void;
    onApply: () => void;
    onDelete: () => void;
    onClose: () => void;
};

export type DeletePanelModalBundle = {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onDelete: () => void;
};

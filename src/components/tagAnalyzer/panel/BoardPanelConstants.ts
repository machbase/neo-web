import type {
    CreateSeriesAnnotationPopoverState,
    HighlightRenameState,
    SeriesAnnotationPopoverState,
} from '../panelModal/PanelModalTypes';
import type {
    BoardPanelContextMenuState,
} from './BoardPanelTypes';

export const INITIAL_CONTEXT_MENU_STATE: BoardPanelContextMenuState = {
    isOpen: false,
    position: { x: 0, y: 0 },
};

export const INITIAL_HIGHLIGHT_RENAME_STATE: HighlightRenameState = {
    isOpen: false,
    highlightIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
};

export const INITIAL_SERIES_ANNOTATION_POPOVER_STATE: SeriesAnnotationPopoverState = {
    isOpen: false,
    seriesIndex: undefined,
    annotationIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
    timeRange: undefined,
};

export const INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE: CreateSeriesAnnotationPopoverState = {
    isOpen: false,
    position: { x: 0, y: 0 },
    seriesIndex: undefined,
    yearText: '',
    monthText: '',
    dayText: '',
    labelText: '',
};

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
export const DEFAULT_ANNOTATION_LABEL = 'note';

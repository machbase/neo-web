import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
} from '../domain/PanelModel';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import {
    createUtcDateFieldText,
    getCreateAnnotationPopoverPosition,
} from './PanelAnnotationUtils';
import type {
    CreateSeriesAnnotationPopoverState,
    HighlightRenameState,
    PanelContextMenuState,
    SeriesAnnotationPopoverState,
} from './modal/PanelModalTypes';

export const INITIAL_CONTEXT_MENU_STATE: PanelContextMenuState = {
    isOpen: false,
    position: { x: 0, y: 0 },
};
export const INITIAL_HIGHLIGHT_RENAME_STATE: HighlightRenameState = {
    isOpen: false,
    highlightIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
    fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
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

export type OpenHighlightRenamePopoverParams = Pick<
    HighlightRenameState,
    'highlightIndex' | 'position' | 'labelText' | 'fillColor' | 'textColor'
>;
export type OpenSeriesAnnotationPopoverParams = Omit<
    SeriesAnnotationPopoverState,
    'isOpen'
>;

export function buildCreateAnnotationPopoverOpenState({
    panelRange,
    seriesCount,
    panelFormElement,
}: {
    panelRange: ResolvedTimeRangeMs;
    seriesCount: number;
    panelFormElement: HTMLDivElement | null;
}): CreateSeriesAnnotationPopoverState {
    const sDefaultDateFields = createUtcDateFieldText(
        panelRange.startTime || Date.now(),
    );

    return {
        isOpen: true,
        position: getCreateAnnotationPopoverPosition(panelFormElement),
        seriesIndex: seriesCount > 0 ? 0 : undefined,
        yearText: sDefaultDateFields.yearText,
        monthText: sDefaultDateFields.monthText,
        dayText: sDefaultDateFields.dayText,
        labelText: '',
    };
}

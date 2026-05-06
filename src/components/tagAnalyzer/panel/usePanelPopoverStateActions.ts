import { useState } from 'react';
import type { MutableRefObject } from 'react';
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

type UsePanelPopoverStateActionsParams = {
    panelRange: ResolvedTimeRangeMs;
    seriesCount: number;
    panelFormRef: MutableRefObject<HTMLDivElement | null>;
};

type OpenHighlightRenamePopoverParams = Pick<
    HighlightRenameState,
    'highlightIndex' | 'position' | 'labelText'
>;

type OpenSeriesAnnotationPopoverParams = Omit<SeriesAnnotationPopoverState, 'isOpen'>;

export function usePanelPopoverStateActions({
    panelRange,
    seriesCount,
    panelFormRef,
}: UsePanelPopoverStateActionsParams) {
    const [contextMenuState, setContextMenuState] =
        useState<PanelContextMenuState>(INITIAL_CONTEXT_MENU_STATE);
    const [highlightRenameState, setHighlightRenameState] =
        useState<HighlightRenameState>(INITIAL_HIGHLIGHT_RENAME_STATE);
    const [createAnnotationPopoverState, setCreateAnnotationPopoverState] =
        useState<CreateSeriesAnnotationPopoverState>(
            INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE,
        );
    const [annotationPopoverState, setAnnotationPopoverState] =
        useState<SeriesAnnotationPopoverState>(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);

    function openContextMenuAt(clientX: number, clientY: number) {
        setContextMenuState({
            isOpen: true,
            position: {
                x: clientX,
                y: clientY,
            },
        });
    }

    function closeContextMenu() {
        setContextMenuState((prev) => ({
            ...prev,
            isOpen: false,
        }));
    }

    function closeHighlightRenamePopover() {
        setHighlightRenameState(INITIAL_HIGHLIGHT_RENAME_STATE);
    }

    function updateHighlightRenameLabelText(labelText: string) {
        setHighlightRenameState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
    }

    function openHighlightRenamePopover({
        highlightIndex,
        position,
        labelText,
    }: OpenHighlightRenamePopoverParams) {
        setHighlightRenameState({
            isOpen: true,
            highlightIndex: highlightIndex,
            position: position,
            labelText: labelText,
        });
    }

    function updateCreateAnnotationSeriesValue(value: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            seriesIndex: Number.isInteger(Number(value)) ? Number(value) : undefined,
        }));
    }

    function updateCreateAnnotationYearText(yearText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            yearText: yearText,
        }));
    }

    function updateCreateAnnotationMonthText(monthText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            monthText: monthText,
        }));
    }

    function updateCreateAnnotationDayText(dayText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            dayText: dayText,
        }));
    }

    function updateCreateAnnotationLabelText(labelText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
    }

    function updateSeriesAnnotationLabelText(labelText: string) {
        setAnnotationPopoverState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
    }

    function openSeriesAnnotationPopover({
        seriesIndex,
        annotationIndex,
        position,
        labelText,
        timeRange,
    }: OpenSeriesAnnotationPopoverParams) {
        setAnnotationPopoverState({
            isOpen: true,
            seriesIndex: seriesIndex,
            annotationIndex: annotationIndex,
            position: position,
            labelText: labelText,
            timeRange: timeRange,
        });
    }

    function openCreateAnnotationPopover() {
        const sDefaultSeriesIndex = seriesCount > 0 ? 0 : undefined;
        const sDefaultTimestamp = panelRange.startTime || Date.now();
        const sDefaultDateFields = createUtcDateFieldText(sDefaultTimestamp);

        setCreateAnnotationPopoverState({
            isOpen: true,
            position: getCreateAnnotationPopoverPosition(panelFormRef.current),
            seriesIndex: sDefaultSeriesIndex,
            yearText: sDefaultDateFields.yearText,
            monthText: sDefaultDateFields.monthText,
            dayText: sDefaultDateFields.dayText,
            labelText: '',
        });
    }

    function closeCreateAnnotationPopoverView() {
        setCreateAnnotationPopoverState(INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE);
    }

    function closeAnnotationPopover() {
        setAnnotationPopoverState(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);
    }

    function closeTransientPanelPopoverViews() {
        closeHighlightRenamePopover();
        closeCreateAnnotationPopoverView();
        closeAnnotationPopover();
    }

    return {
        contextMenuState,
        highlightRenameState,
        createAnnotationPopoverState,
        annotationPopoverState,
        openContextMenuAt,
        closeContextMenu,
        closeHighlightRenamePopover,
        openHighlightRenamePopover,
        updateHighlightRenameLabelText,
        updateCreateAnnotationSeriesValue,
        updateCreateAnnotationYearText,
        updateCreateAnnotationMonthText,
        updateCreateAnnotationDayText,
        updateCreateAnnotationLabelText,
        updateSeriesAnnotationLabelText,
        openSeriesAnnotationPopover,
        openCreateAnnotationPopover,
        closeCreateAnnotationPopoverView,
        closeAnnotationPopover,
        closeTransientPanelPopoverViews,
    };
}

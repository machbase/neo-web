import type { MutableRefObject } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../domain/PanelDomain';
import { parseAxisInputValue } from '../domain/time/TimeInputFormatters';
import {
    DEFAULT_HIGHLIGHT_LABEL,
    type HighlightEditorState,
    type HighlightFormState,
} from './modal/EditMarkupModal';

export type HighlightActions = {
    getHighlightByIndex: (index: number) => PanelHighlight;
    getHighlightCount: () => number;
    addHighlightEntry: (highlight: PanelHighlight) => void;
    updateHighlightEntry: (index: number, highlight: PanelHighlight) => void;
    deleteHighlightEntry: (index: number) => void;
};

type ActivePanelHighlightEditor = {
    editor: HighlightEditorState;
    temporaryHighlight?: PanelHighlight | undefined;
};

export function usePanelHighlight({
    highlights,
    chartAreaRef,
    isNumericXAxis,
    onSaveHighlights,
}: {
    highlights: PanelHighlight[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isNumericXAxis: boolean;
    onSaveHighlights: (highlights: PanelHighlight[]) => void;
}): {
    highlightActions: HighlightActions;
    applyHighlightChange: (
        formState: HighlightFormState,
        activeEditor: HighlightEditorState,
        temporaryHighlight: PanelHighlight | undefined,
    ) => boolean;
    buildEditHighlightEditor: (
        position: ContextMenuPosition,
        highlightIndex: number,
    ) => ActivePanelHighlightEditor;
    buildCreateHighlightEditor: (
        startTime: number,
        endTime: number,
    ) => ActivePanelHighlightEditor | undefined;
} {
    const highlightActions = createHighlightActions({
        highlights,
        onSaveHighlights,
    });

    function getChartCenterPosition(): { x: number; y: number } {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            throw new Error('Cannot create a highlight without a chart area.');
        }

        return {
            x: sChartRect.left + sChartRect.width / 2,
            y: sChartRect.top + sChartRect.height / 2,
        };
    }

    function buildEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): ActivePanelHighlightEditor {
        return {
            editor: {
                position,
                highlightIndex,
            },
        };
    }

    function buildCreateHighlightEditor(
        startTime: number,
        endTime: number,
    ): ActivePanelHighlightEditor | undefined {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return undefined;
        }

        return {
            editor: {
                position: getChartCenterPosition(),
                highlightIndex: highlightActions.getHighlightCount(),
            },
            temporaryHighlight: {
                text: DEFAULT_HIGHLIGHT_LABEL,
                timeRange: {
                    startTime: sStartTime,
                    endTime: sEndTime,
                },
                fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
            },
        };
    }

    function applyHighlightChange(
        formState: HighlightFormState,
        activeEditor: HighlightEditorState,
        temporaryHighlight: PanelHighlight | undefined,
    ): boolean {
        const sHighlightIndex = activeEditor.highlightIndex;
        const sIsTemporaryHighlight =
            temporaryHighlight !== undefined &&
            sHighlightIndex === highlightActions.getHighlightCount();

        const sNextLabelText = formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextStartTime = parseAxisInputValue(formState.startTimeText, isNumericXAxis);
        const sNextEndTime = parseAxisInputValue(formState.endTimeText, isNumericXAxis);

        if (
            sNextStartTime === undefined ||
            sNextEndTime === undefined ||
            sNextEndTime <= sNextStartTime
        ) {
            return false;
        }

        const sBaseHighlight = sIsTemporaryHighlight
            ? getActiveTemporaryHighlight(temporaryHighlight)
            : highlightActions.getHighlightByIndex(sHighlightIndex);
        const sNextHighlight = {
            ...sBaseHighlight,
            text: sNextLabelText,
            timeRange: {
                startTime: sNextStartTime,
                endTime: sNextEndTime,
            },
            fillColor: formState.fillColor,
            textColor: formState.textColor,
        };

        if (sIsTemporaryHighlight) {
            highlightActions.addHighlightEntry(sNextHighlight);
            return true;
        }

        highlightActions.updateHighlightEntry(sHighlightIndex, sNextHighlight);
        return true;
    }

    return {
        highlightActions,
        applyHighlightChange,
        buildEditHighlightEditor,
        buildCreateHighlightEditor,
    };
}

function createHighlightActions({
    highlights,
    onSaveHighlights,
}: {
    highlights: PanelHighlight[];
    onSaveHighlights: (highlights: PanelHighlight[]) => void;
}): HighlightActions {
    function getHighlightByIndex(index: number): PanelHighlight {
        const sHighlight = highlights[index];

        if (!sHighlight) {
            throw new Error(`Expected highlight at index ${index}.`);
        }

        return sHighlight;
    }

    function addHighlightEntry(highlight: PanelHighlight): void {
        onSaveHighlights([...highlights, highlight]);
    }

    function updateHighlightEntry(index: number, highlight: PanelHighlight): void {
        getHighlightByIndex(index);

        onSaveHighlights(
            highlights.map((currentHighlight, currentIndex) =>
                currentIndex === index ? highlight : currentHighlight,
            ),
        );
    }

    function deleteHighlightEntry(index: number): void {
        getHighlightByIndex(index);

        onSaveHighlights(highlights.filter((_highlight, currentIndex) => currentIndex !== index));
    }

    return {
        getHighlightByIndex,
        getHighlightCount: () => highlights.length,
        addHighlightEntry,
        updateHighlightEntry,
        deleteHighlightEntry,
    };
}

function getActiveTemporaryHighlight(
    temporaryHighlight: PanelHighlight | undefined,
): PanelHighlight {
    if (!temporaryHighlight) {
        throw new Error('Expected a temporary highlight editor.');
    }

    return temporaryHighlight;
}

import {
    useState,
    type MutableRefObject,
} from 'react';
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
} from './modal/EditHighlightModal';

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
    panelHighlights: PanelHighlight[];
    activeHighlightEditor: HighlightEditorState | undefined;
    temporaryHighlight: PanelHighlight | undefined;
    highlightActions: HighlightActions;
    applyHighlightChange: (
        formState: HighlightFormState,
        activeEditor: HighlightEditorState,
    ) => boolean;
    activateEditHighlightEditor: (
        position: ContextMenuPosition,
        highlightIndex: number,
    ) => void;
    activateCreateHighlightEditor: (startTime: number, endTime: number) => void;
    clearActiveHighlightEditor: () => void;
} {
    const [activeHighlightEditor, setActiveHighlightEditor] = useState<
        ActivePanelHighlightEditor | undefined
    >(undefined);
    const highlightActions = createHighlightActions({
        highlights,
        onSaveHighlights,
    });
    const panelHighlights =
        activeHighlightEditor?.temporaryHighlight
            ? [
                  ...highlights,
                  activeHighlightEditor.temporaryHighlight,
              ]
            : highlights;

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

    function activateEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        setActiveHighlightEditor({
            editor: {
                position,
                highlightIndex,
            },
        });
    }

    function activateCreateHighlightEditor(startTime: number, endTime: number): void {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        setActiveHighlightEditor({
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
        });
    }

    function applyHighlightChange(
        formState: HighlightFormState,
        activeEditor: HighlightEditorState,
    ): boolean {
        const sHighlightIndex = activeEditor.highlightIndex;
        const sIsTemporaryHighlight =
            activeHighlightEditor?.temporaryHighlight !== undefined &&
            sHighlightIndex === highlightActions.getHighlightCount();

        const sNextLabelText =
            formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextStartTime = parseAxisInputValue(
            formState.startTimeText,
            isNumericXAxis,
        );
        const sNextEndTime = parseAxisInputValue(
            formState.endTimeText,
            isNumericXAxis,
        );

        if (
            sNextStartTime === undefined ||
            sNextEndTime === undefined ||
            sNextEndTime <= sNextStartTime
        ) {
            return false;
        }

        const sBaseHighlight = sIsTemporaryHighlight
            ? getActiveTemporaryHighlight(activeHighlightEditor)
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
        panelHighlights,
        activeHighlightEditor: activeHighlightEditor?.editor,
        temporaryHighlight: activeHighlightEditor?.temporaryHighlight,
        highlightActions,
        applyHighlightChange,
        activateEditHighlightEditor,
        activateCreateHighlightEditor,
        clearActiveHighlightEditor: () => setActiveHighlightEditor(undefined),
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

    function updateHighlightEntry(
        index: number,
        highlight: PanelHighlight,
    ): void {
        getHighlightByIndex(index);

        onSaveHighlights(
            highlights.map((currentHighlight, currentIndex) =>
                currentIndex === index ? highlight : currentHighlight,
            ),
        );
    }

    function deleteHighlightEntry(index: number): void {
        getHighlightByIndex(index);

        onSaveHighlights(
            highlights.filter((_highlight, currentIndex) => currentIndex !== index),
        );
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
    activeHighlightEditor: ActivePanelHighlightEditor | undefined,
): PanelHighlight {
    if (!activeHighlightEditor?.temporaryHighlight) {
        throw new Error('Expected a temporary highlight editor.');
    }

    return activeHighlightEditor.temporaryHighlight;
}

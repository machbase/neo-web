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
    getHighlightByIndex: (index: number) => PanelHighlight | undefined;
    getHighlightCount: () => number;
    addHighlightEntry: (highlight: PanelHighlight) => number;
    updateHighlightEntry: (index: number, highlight: PanelHighlight) => boolean;
    deleteHighlightEntry: (index: number) => boolean;
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
            return { x: 0, y: 0 };
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

        if (
            !highlightActions.getHighlightByIndex(sHighlightIndex) &&
            !sIsTemporaryHighlight
        ) {
            return true;
        }

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

        const sBaseHighlight =
            highlightActions.getHighlightByIndex(sHighlightIndex) ??
            activeHighlightEditor?.temporaryHighlight;
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

        return highlightActions.updateHighlightEntry(
            sHighlightIndex,
            sNextHighlight,
        );
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
    function getHighlightByIndex(index: number): PanelHighlight | undefined {
        return highlights[index];
    }

    function addHighlightEntry(highlight: PanelHighlight): number {
        onSaveHighlights([...highlights, highlight]);
        return highlights.length;
    }

    function updateHighlightEntry(
        index: number,
        highlight: PanelHighlight,
    ): boolean {
        if (!highlights[index]) {
            return false;
        }

        onSaveHighlights(
            highlights.map((currentHighlight, currentIndex) =>
                currentIndex === index ? highlight : currentHighlight,
            ),
        );
        return true;
    }

    function deleteHighlightEntry(index: number): boolean {
        if (!highlights[index]) {
            return false;
        }

        onSaveHighlights(
            highlights.filter((_highlight, currentIndex) => currentIndex !== index),
        );
        return true;
    }

    return {
        getHighlightByIndex,
        getHighlightCount: () => highlights.length,
        addHighlightEntry,
        updateHighlightEntry,
        deleteHighlightEntry,
    };
}

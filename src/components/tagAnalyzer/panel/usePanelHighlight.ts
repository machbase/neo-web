import type { MutableRefObject } from 'react';
import type { PanelHighlightEditRequest } from '../domain/PanelChartModel';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../domain/PanelModel';
import { parseLocalTimestampInput } from '../domain/time/TimeInputFormatters';
import {
    DEFAULT_HIGHLIGHT_LABEL,
    type ActiveHighlightEditor,
    type HighlightFormState,
} from './modal/EditHighlightModal';
import type { PanelActiveMarkupEditor } from './usePanelOverlayState';

export type PanelHighlightAction = {
    getHighlightByIndex: (index: number) => PanelHighlight | undefined;
    getHighlightCount: () => number;
    addHighlight: (highlight: PanelHighlight) => number;
    setHighlightByIndex: (index: number, highlight: PanelHighlight) => boolean;
    deleteHighlightByIndex: (index: number) => boolean;
};

export type PanelHighlightEditor = {
    activeEditor: ActiveHighlightEditor | undefined;
    temporaryHighlight: PanelHighlight | undefined;
    highlightAction: PanelHighlightAction;
    onApplyHighlightChange: (
        formState: HighlightFormState,
        activeEditor: ActiveHighlightEditor,
    ) => boolean;
    onCancel: () => void;
    onApplied: () => void;
};

export function usePanelHighlight({
    highlights,
    chartAreaRef,
    activeHighlightEditor,
    onActiveMarkupEditorChange,
    onSaveHighlights,
}: {
    highlights: PanelHighlight[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    activeHighlightEditor:
        | Extract<PanelActiveMarkupEditor, { type: 'highlight' }>
        | undefined;
    onActiveMarkupEditorChange: (
        activeMarkupEditor: PanelActiveMarkupEditor | undefined,
    ) => void;
    onSaveHighlights: (highlights: PanelHighlight[]) => void;
}): {
    panelHighlights: PanelHighlight[];
    highlightEditor: PanelHighlightEditor;
    openHighlightEditor: (request: PanelHighlightEditRequest) => void;
    createHighlightFromSelection: (startTime: number, endTime: number) => void;
} {
    const highlightAction = createPanelHighlightAction({
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

    function openHighlightEditor(request: PanelHighlightEditRequest): void {
        onActiveMarkupEditorChange({
            type: 'highlight',
            editor: {
                position: request.position,
                highlightIndex: request.highlightIndex,
            },
        });
    }

    function createHighlightFromSelection(startTime: number, endTime: number): void {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        onActiveMarkupEditorChange({
            type: 'highlight',
            editor: {
                position: getChartCenterPosition(),
                highlightIndex: highlightAction.getHighlightCount(),
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

    function cancelHighlightEditor(): void {
        if (activeHighlightEditor) {
            onActiveMarkupEditorChange(undefined);
        }
    }

    function applyHighlightChange(
        formState: HighlightFormState,
        activeEditor: ActiveHighlightEditor,
    ): boolean {
        const sHighlightIndex = activeEditor.highlightIndex;
        const sIsTemporaryHighlight =
            activeHighlightEditor?.temporaryHighlight !== undefined &&
            sHighlightIndex === highlightAction.getHighlightCount();

        if (
            !highlightAction.getHighlightByIndex(sHighlightIndex) &&
            !sIsTemporaryHighlight
        ) {
            return true;
        }

        const sNextLabelText =
            formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextStartTime = parseLocalTimestampInput(formState.startTimeText);
        const sNextEndTime = parseLocalTimestampInput(formState.endTimeText);

        if (
            sNextStartTime === undefined ||
            sNextEndTime === undefined ||
            sNextEndTime <= sNextStartTime
        ) {
            return false;
        }

        const sBaseHighlight =
            highlightAction.getHighlightByIndex(sHighlightIndex) ??
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
            highlightAction.addHighlight(sNextHighlight);
            return true;
        }

        return highlightAction.setHighlightByIndex(
            sHighlightIndex,
            sNextHighlight,
        );
    }

    return {
        panelHighlights,
        highlightEditor: {
            activeEditor: activeHighlightEditor?.editor,
            temporaryHighlight: activeHighlightEditor?.temporaryHighlight,
            highlightAction,
            onApplyHighlightChange: applyHighlightChange,
            onCancel: cancelHighlightEditor,
            onApplied: () => onActiveMarkupEditorChange(undefined),
        },
        openHighlightEditor,
        createHighlightFromSelection,
    };
}

function createPanelHighlightAction({
    highlights,
    onSaveHighlights,
}: {
    highlights: PanelHighlight[];
    onSaveHighlights: (highlights: PanelHighlight[]) => void;
}): PanelHighlightAction {
    function getHighlightByIndex(index: number): PanelHighlight | undefined {
        return highlights[index];
    }

    function addHighlight(highlight: PanelHighlight): number {
        onSaveHighlights([...highlights, highlight]);
        return highlights.length;
    }

    function setHighlightByIndex(
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

    function deleteHighlightByIndex(index: number): boolean {
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
        addHighlight,
        setHighlightByIndex,
        deleteHighlightByIndex,
    };
}

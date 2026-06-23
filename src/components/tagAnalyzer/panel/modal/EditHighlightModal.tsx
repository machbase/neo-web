import { useState, type KeyboardEvent } from 'react';
import { Button, type ContextMenuPosition } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelHighlight,
} from '../../domain/PanelDomain';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/formatting/TimeInputFormatters';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/range/TimeRangeUtils';
import type { PanelHighlightCrud } from '../usePanelHighlight';
import PanelPopover from './PanelPopover';

export type HighlightEditorState =
    | {
          mode: 'create';
          position: ContextMenuPosition;
      }
    | {
          mode: 'edit';
          position: ContextMenuPosition;
          highlightIndex: number;
      };

type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

function getInitialHighlight(
    activeEditor: HighlightEditorState,
    draftHighlight: PanelHighlight | undefined,
    highlightCrud: PanelHighlightCrud,
): PanelHighlight {
    if (activeEditor.mode === 'create') {
        if (!draftHighlight) {
            throw new Error('Cannot create highlight form without a draft highlight.');
        }

        return draftHighlight;
    }

    return highlightCrud.getHighlightByIndex(activeEditor.highlightIndex);
}

function createHighlightFormState(
    highlight: PanelHighlight,
    isNumericXAxis: boolean,
): HighlightFormState {
    return {
        labelText: highlight.text,
        startTimeText: formatAxisInputValue(highlight.timeRange.startTime, isNumericXAxis),
        endTimeText: formatAxisInputValue(highlight.timeRange.endTime, isNumericXAxis),
        fillColor: highlight.fillColor,
        textColor: highlight.textColor,
    };
}

function convertHighlightFormStateToPanelHighlight(
    formState: HighlightFormState,
    isNumericXAxis: boolean,
): PanelHighlight | undefined {
    const startTime = parseAxisInputValue(formState.startTimeText, isNumericXAxis);
    const endTime = parseAxisInputValue(formState.endTimeText, isNumericXAxis);
    const timeRange = startTime !== undefined && endTime !== undefined
        ? createTimeRangeMs(startTime, endTime)
        : undefined;

    if (!isValidTimeRange(timeRange)) {
        return undefined;
    }

    return {
        text: formState.labelText.trim() || DEFAULT_PANEL_HIGHLIGHT_LABEL,
        timeRange,
        fillColor: formState.fillColor,
        textColor: formState.textColor,
    };
}

export function EditHighlightModal({
    activeHighlightEditor,
    draftHighlight,
    highlightCrud,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState;
    draftHighlight: PanelHighlight | undefined;
    highlightCrud: PanelHighlightCrud;
    onCancel: () => void;
    onApplied: () => void;
    isNumericXAxis: boolean;
}) {
    function saveHighlight(state: HighlightFormState): boolean {
        const nextHighlight = convertHighlightFormStateToPanelHighlight(
            state,
            isNumericXAxis,
        );

        if (!nextHighlight) {
            return false;
        }

        if (activeHighlightEditor.mode === 'create') {
            highlightCrud.addHighlightEntry(nextHighlight);
            return true;
        }

        highlightCrud.updateHighlightEntry(
            activeHighlightEditor.highlightIndex,
            nextHighlight,
        );
        return true;
    }

    function deleteHighlight(): void {
        if (activeHighlightEditor.mode !== 'edit') {
            throw new Error('Cannot delete a highlight that has not been saved.');
        }

        highlightCrud.deleteHighlightEntry(activeHighlightEditor.highlightIndex);
        onApplied();
    }

    const [state, setState] = useState(() =>
        createHighlightFormState(
            getInitialHighlight(activeHighlightEditor, draftHighlight, highlightCrud),
            isNumericXAxis,
        ),
    );
    const startTime = parseAxisInputValue(state.startTimeText, isNumericXAxis);
    const endTime = parseAxisInputValue(state.endTimeText, isNumericXAxis);
    const timeRange = startTime !== undefined && endTime !== undefined
        ? createTimeRangeMs(startTime, endTime)
        : undefined;
    const canApply = isValidTimeRange(timeRange);
    const timePlaceholder = isNumericXAxis
        ? NUMERIC_AXIS_INPUT_FORMAT
        : LOCAL_DATE_TIME_INPUT_FORMAT;

    function applyForm(): void {
        if (saveHighlight(state)) {
            onApplied();
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter') applyForm();
        if (event.key === 'Escape') onCancel();
    }

    return (
        <PanelPopover
            title={activeHighlightEditor.mode === 'create' ? 'Create highlight' : 'Edit highlight'}
            position={activeHighlightEditor.position}
            onClose={onCancel}
            draggable
            size="compact"
            actions={(
                <>
                    {activeHighlightEditor.mode === 'edit' && (
                        <Button size="sm" variant="ghost" onClick={deleteHighlight}>
                            Delete
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" disabled={!canApply} onClick={applyForm}>
                        Apply
                    </Button>
                </>
            )}
        >
            <label className="panel-popover-form__field">
                Label
                <input
                    aria-label="Label"
                    autoFocus
                    className="panel-popover-form__input"
                    value={state.labelText}
                    onChange={(event) =>
                        setState((currentState) => ({
                            ...currentState,
                            labelText: event.target.value,
                        }))
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={handleKeyDown}
                />
            </label>
            <div className="panel-popover-form__row panel-popover-form__row--two">
                <label className="panel-popover-form__field">
                    {isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                    <input
                        aria-label={isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                        className="panel-popover-form__input"
                        placeholder={timePlaceholder}
                        value={state.startTimeText}
                        onChange={(event) =>
                            setState((currentState) => ({
                                ...currentState,
                                startTimeText: event.target.value,
                            }))
                        }
                        onKeyDown={handleKeyDown}
                    />
                </label>
                <label className="panel-popover-form__field">
                    {isNumericXAxis ? 'End value' : 'End time (Local)'}
                    <input
                        aria-label={isNumericXAxis ? 'End value' : 'End time (Local)'}
                        className="panel-popover-form__input"
                        placeholder={timePlaceholder}
                        value={state.endTimeText}
                        onChange={(event) =>
                            setState((currentState) => ({
                                ...currentState,
                                endTimeText: event.target.value,
                            }))
                        }
                        onKeyDown={handleKeyDown}
                    />
                </label>
            </div>
            <div className="panel-popover-form__row panel-popover-form__row--two">
                <label className="panel-popover-form__field">
                    Fill color
                    <input
                        aria-label="Highlight fill color"
                        className="panel-popover-form__color-input"
                        type="color"
                        value={state.fillColor}
                        onChange={(event) =>
                            setState((currentState) => ({
                                ...currentState,
                                fillColor: event.target.value,
                            }))
                        }
                    />
                </label>
                <label className="panel-popover-form__field">
                    Text color
                    <input
                        aria-label="Highlight text color"
                        className="panel-popover-form__color-input"
                        type="color"
                        value={state.textColor}
                        onChange={(event) =>
                            setState((currentState) => ({
                                ...currentState,
                                textColor: event.target.value,
                            }))
                        }
                    />
                </label>
            </div>
            <div
                className="panel-popover-form__preview"
                style={{
                    backgroundColor: `${state.fillColor}29`,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_PANEL_HIGHLIGHT_LABEL}
            </div>
        </PanelPopover>
    );
}

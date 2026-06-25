import { type KeyboardEvent } from 'react';
import { Button, type ContextMenuPosition } from '@/design-system/components';
import { useEditFormState, handleEditFormKeyDown } from './editFormState';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelHighlight,
} from '../../domain/panel/PanelConfig';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../formatting/TimeInputFormatters';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
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

export type PanelHighlightActions = {
    getHighlight: (highlightIndex: number) => PanelHighlight;
    addHighlight: (highlight: PanelHighlight) => void;
    updateHighlight: (highlightIndex: number, highlight: PanelHighlight) => void;
    deleteHighlight: (highlightIndex: number) => void;
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
    highlightActions: PanelHighlightActions,
): PanelHighlight {
    if (activeEditor.mode === 'create') {
        if (!draftHighlight) {
            throw new Error('Cannot create highlight form without a draft highlight.');
        }

        return draftHighlight;
    }

    return highlightActions.getHighlight(activeEditor.highlightIndex);
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
    highlightActions,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState;
    draftHighlight: PanelHighlight | undefined;
    highlightActions: PanelHighlightActions;
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
            highlightActions.addHighlight(nextHighlight);
            return true;
        }

        highlightActions.updateHighlight(
            activeHighlightEditor.highlightIndex,
            nextHighlight,
        );
        return true;
    }

    function deleteHighlight(): void {
        if (activeHighlightEditor.mode !== 'edit') {
            throw new Error('Cannot delete a highlight that has not been saved.');
        }

        highlightActions.deleteHighlight(activeHighlightEditor.highlightIndex);
        onApplied();
    }

    const { state, setField } = useEditFormState(() =>
        createHighlightFormState(
            getInitialHighlight(activeHighlightEditor, draftHighlight, highlightActions),
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
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel });
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
                    onChange={(event) => setField('labelText', event.target.value)}
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
                        onChange={(event) => setField('startTimeText', event.target.value)}
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
                        onChange={(event) => setField('endTimeText', event.target.value)}
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
                        onChange={(event) => setField('fillColor', event.target.value)}
                    />
                </label>
                <label className="panel-popover-form__field">
                    Text color
                    <input
                        aria-label="Highlight text color"
                        className="panel-popover-form__color-input"
                        type="color"
                        value={state.textColor}
                        onChange={(event) => setField('textColor', event.target.value)}
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

import { type KeyboardEvent } from 'react';
import { Button, type ContextMenuPosition } from '@/design-system/components';
import { useEditFormState, handleEditFormKeyDown } from './editFormState';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelHighlight,
} from '../../domain/panel/PanelInfo';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';
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

type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

type HighlightFormValidation = {
    highlight: PanelHighlight | undefined;
    startTimeMessage?: string;
    endTimeMessage?: string;
};

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

function validateHighlightFormState(
    formState: HighlightFormState,
    isNumericXAxis: boolean,
): HighlightFormValidation {
    const startTime = parseAxisInputValue(formState.startTimeText, isNumericXAxis);
    const endTime = parseAxisInputValue(formState.endTimeText, isNumericXAxis);
    const axisKindLabel = isNumericXAxis ? 'value' : 'time';
    const startTimeMessage = startTime === undefined
        ? `Enter a valid start ${axisKindLabel}.`
        : undefined;
    const endTimeMessage = endTime === undefined
        ? `Enter a valid end ${axisKindLabel}.`
        : undefined;

    if (startTimeMessage || endTimeMessage) {
        return {
            highlight: undefined,
            startTimeMessage,
            endTimeMessage,
        };
    }

    const timeRange = startTime !== undefined && endTime !== undefined
        ? createTimeRangeMs(startTime, endTime)
        : undefined;

    if (!isValidTimeRange(timeRange)) {
        return {
            highlight: undefined,
            endTimeMessage: `End ${axisKindLabel} must be greater than start ${axisKindLabel}.`,
        };
    }

    return {
        highlight: {
            text: formState.labelText.trim() || DEFAULT_PANEL_HIGHLIGHT_LABEL,
            timeRange,
            fillColor: formState.fillColor,
            textColor: formState.textColor,
        },
    };
}

export function EditHighlightModal({
    activeHighlightEditor,
    highlight,
    onCancel,
    onApply,
    onDelete,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState;
    highlight: PanelHighlight;
    onCancel: () => void;
    onApply: (highlight: PanelHighlight) => void;
    onDelete?: () => void;
    isNumericXAxis: boolean;
}) {
    const { state, setField } = useEditFormState(() =>
        createHighlightFormState(
            highlight,
            isNumericXAxis,
        ),
    );
    const validation = validateHighlightFormState(state, isNumericXAxis);
    const canApply = validation.highlight !== undefined;
    const timePlaceholder = isNumericXAxis
        ? NUMERIC_AXIS_INPUT_FORMAT
        : LOCAL_DATE_TIME_INPUT_FORMAT;

    function applyForm(): void {
        if (validation.highlight !== undefined) {
            onApply(validation.highlight);
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
                    {activeHighlightEditor.mode === 'edit' && onDelete !== undefined && (
                        <Button size="sm" variant="ghost" onClick={onDelete}>
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
                    <span className="panel-popover-form__field-label">
                        {isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                        {validation.startTimeMessage ? (
                            <span className="panel-popover-form__field-error">
                                {validation.startTimeMessage}
                            </span>
                        ) : null}
                    </span>
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
                    <span className="panel-popover-form__field-label">
                        {isNumericXAxis ? 'End value' : 'End time (Local)'}
                        {validation.endTimeMessage ? (
                            <span className="panel-popover-form__field-error">
                                {validation.endTimeMessage}
                            </span>
                        ) : null}
                    </span>
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

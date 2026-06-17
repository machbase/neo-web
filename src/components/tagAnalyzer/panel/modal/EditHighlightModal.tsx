import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelHighlight,
} from '../../domain/PanelDomain';
import {
    formatAxisInputValue,
    parseAxisInputValue,
} from '../../domain/time/formatting/TimeInputFormatters';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/range/TimeRangeUtils';
import type { PanelHighlightCrud } from '../usePanelHighlight';
import {
    ColorFields,
    getAxisPlaceholder,
    ModalActions,
    PanelMarkupModal,
    TextField,
    useFocusedInput,
    useMarkupForm,
} from './PanelMarkupModalPrimitives';
import type {
    HighlightEditorState,
    HighlightFormState,
} from './PanelMarkupModalTypes';

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
    const inputRef = useFocusedInput();
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

    const form = useMarkupForm<HighlightFormState>(
        () =>
            createHighlightFormState(
                getInitialHighlight(activeHighlightEditor, draftHighlight, highlightCrud),
                isNumericXAxis,
            ),
        saveHighlight,
        onCancel,
        onApplied,
    );
    const { state, setField, handleKeyDown, applyForm } = form;
    const startTime = parseAxisInputValue(state.startTimeText, isNumericXAxis);
    const endTime = parseAxisInputValue(state.endTimeText, isNumericXAxis);
    const timeRange = startTime !== undefined && endTime !== undefined
        ? createTimeRangeMs(startTime, endTime)
        : undefined;
    const canApply = isValidTimeRange(timeRange);
    const timePlaceholder = getAxisPlaceholder(isNumericXAxis);

    return (
        <PanelMarkupModal
            title={activeHighlightEditor.mode === 'create' ? 'Create highlight' : 'Edit highlight'}
            className="panel-markup-modal--highlight"
            position={activeHighlightEditor.position}
            onClose={onCancel}
            draggable
            actions={(
                <ModalActions
                    canApply={canApply}
                    onCancel={onCancel}
                    onApply={applyForm}
                    deleteAction={activeHighlightEditor.mode === 'edit' ? deleteHighlight : undefined}
                />
            )}
        >
            <TextField
                field="labelText"
                label="Label"
                inputRef={inputRef}
                state={state}
                setField={setField}
                onKeyDown={handleKeyDown}
            />
            <div className="panel-markup-modal__row panel-markup-modal__row--two">
                {([
                    ['startTimeText', isNumericXAxis ? 'Start value' : 'Start time (Local)'],
                    ['endTimeText', isNumericXAxis ? 'End value' : 'End time (Local)'],
                ] as const).map(([key, label]) => (
                    <TextField
                        key={key}
                        field={key}
                        label={label}
                        placeholder={timePlaceholder}
                        state={state}
                        setField={setField}
                        onKeyDown={handleKeyDown}
                    />
                ))}
            </div>
            <ColorFields state={state} ariaPrefix="Highlight" setField={setField} />
            <div
                className="panel-markup-modal__preview"
                style={{
                    backgroundColor: `${state.fillColor}29`,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_PANEL_HIGHLIGHT_LABEL}
            </div>
        </PanelMarkupModal>
    );
}

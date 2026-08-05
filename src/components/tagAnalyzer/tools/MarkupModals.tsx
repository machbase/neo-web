import { useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { Button, Dropdown } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelAnnotation,
    type PanelHighlight,
} from '../model';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    getPanelSeriesDisplayName,
    type PanelSeriesDefinition,
} from '../seriesModel';
import {
    formatAxisInputValue,
    getAxisInputPlaceholder,
    parseAxisInputValue,
} from '../range/format/rangeFormat';
import { isValidRange } from '../range/rangeArithmetic';
import type {
    AnnotationEditorMetaState,
    HighlightEditorState,
} from '../panel/panelInteraction';

import PanelPopover from '../components/PanelPopover';

type AnnotationFormState = {
    seriesValue: string;
    timeText: string;
    labelText: string;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

type AnnotationFormValidation = {
    annotation: PanelAnnotation | undefined;
    seriesMessage?: string;
    timeMessage?: string;
};

const EMPTY_ANNOTATION_SERIES_VALUE = '';
const MARKUP_DROPDOWN_MENU_CLASS = 'panel-popover-form__dropdown-menu';

type MarkupInputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>,
    'autoFocus' | 'className' | 'onFocus'> & {
    label: string;
    validationMessage?: string;
    autoSelect?: boolean;
};

function MarkupInputField({
    label, validationMessage, autoSelect, type,
    'aria-label': ariaLabel = label, ...inputProps
}: MarkupInputFieldProps) {
    return (
        <label className="panel-popover-form__field">
            <span className="panel-popover-form__field-label">
                {label}
                {validationMessage && <span className="panel-popover-form__field-error">{validationMessage}</span>}
            </span>
            <input
                {...inputProps}
                aria-label={ariaLabel}
                autoFocus={autoSelect}
                className={type === 'color' ? 'panel-popover-form__color-input' : 'panel-popover-form__input'}
                type={type}
                onFocus={autoSelect ? (event) => event.currentTarget.select() : undefined}
            />
        </label>
    );
}

function saveMarkupItem<T>(
    items: readonly T[],
    item: T,
    index: number | undefined,
): T[] {
    return index === undefined
        ? [...items, item]
        : items.map((current, currentIndex) =>
              currentIndex === index ? item : current,
          );
}

function deleteMarkupItem<T>(items: readonly T[], index: number): T[] {
    return items.filter((_item, currentIndex) => currentIndex !== index);
}

function createAnnotationFormState(
    editorMeta: AnnotationEditorMetaState,
    annotation: PanelAnnotation | undefined,
    isNumericXAxis: boolean,
): AnnotationFormState {
    const timestamp = annotation?.timeRange.startTime ?? editorMeta.timestamp;

    return {
        seriesValue:
            annotation?.seriesKey ??
            editorMeta.seriesKey ??
            EMPTY_ANNOTATION_SERIES_VALUE,
        timeText: timestamp === undefined
            ? ''
            : formatAxisInputValue(timestamp, isNumericXAxis),
        labelText: annotation?.text ?? DEFAULT_SERIES_ANNOTATION_LABEL,
        fillColor: annotation?.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: annotation?.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        clip: annotation?.clip ?? true,
    };
}

function validateAnnotationFormState({
    formState,
    selectedSeriesKey,
    existingAnnotation,
    isNumericXAxis,
}: {
    formState: AnnotationFormState;
    selectedSeriesKey: string;
    existingAnnotation: PanelAnnotation | undefined;
    isNumericXAxis: boolean;
}): AnnotationFormValidation {
    const annotationTimestamp = parseAxisInputValue(formState.timeText, isNumericXAxis);
    const seriesMessage = selectedSeriesKey === ''
        ? 'Select a series.'
        : undefined;
    const timeMessage = annotationTimestamp === undefined
        ? `Enter a valid ${isNumericXAxis ? 'axis value' : 'time'}.`
        : undefined;

    if (selectedSeriesKey === '' || annotationTimestamp === undefined) {
        return {
            annotation: undefined,
            seriesMessage,
            timeMessage,
        };
    }

    const existingTimeRange = existingAnnotation?.timeRange;
    const existingStartTimeText = existingTimeRange
        ? formatAxisInputValue(existingTimeRange.startTime, isNumericXAxis)
        : undefined;
    const annotationTimeRange =
        existingTimeRange && existingStartTimeText === formState.timeText
            ? existingTimeRange
            : {
                  startTime: annotationTimestamp,
                  endTime: annotationTimestamp,
              };

    return {
        annotation: {
            seriesKey: selectedSeriesKey,
            text: formState.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL,
            timeRange: { ...annotationTimeRange },
            fillColor: formState.fillColor || DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: formState.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: formState.clip,
        },
    };
}

export function EditAnnotationModal({
    annotationEditorMeta,
    annotations,
    annotationSeriesList,
    onChange,
    onClose,
    isNumericXAxis,
}: {
    annotationEditorMeta: AnnotationEditorMetaState;
    annotations: readonly PanelAnnotation[];
    annotationSeriesList: PanelSeriesDefinition[];
    onChange: (annotations: PanelAnnotation[]) => void;
    onClose: () => void;
    isNumericXAxis: boolean;
}) {
    const annotationIndex = annotationEditorMeta.annotationIndex;
    const annotation = annotationIndex === undefined
        ? undefined
        : annotations[annotationIndex];
    const { state, setField } = useEditFormState(() =>
        createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
    );
    const seriesOptions = [
        {
            label: 'annotation not selected',
            value: EMPTY_ANNOTATION_SERIES_VALUE,
        },
        ...annotationSeriesList.map((seriesInfo) => ({
            label: getPanelSeriesDisplayName(seriesInfo),
            value: seriesInfo.key,
        })),
    ];
    const selectedSeriesKey = state.seriesValue.trim();
    const validation = validateAnnotationFormState({
        formState: state,
        selectedSeriesKey,
        existingAnnotation: annotation,
        isNumericXAxis,
    });
    function applyForm(): void {
        const nextAnnotation = validation.annotation;
        if (nextAnnotation === undefined) return;

        if (
            !annotationSeriesList.some(
                (series) => series.key === nextAnnotation.seriesKey,
            )
        ) {
            throw new Error('Cannot save an annotation for an unknown series.');
        }

        onChange(saveMarkupItem(
            annotations,
            { ...nextAnnotation },
            annotationIndex,
        ));
        onClose();
    }

    function deleteAnnotation(): void {
        if (annotationIndex === undefined) return;

        onChange(deleteMarkupItem(annotations, annotationIndex));
        onClose();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel: onClose });
    }

    return (
        <PanelPopover
            title="Edit annotation"
            position={annotationEditorMeta.position}
            onClose={onClose}
            size="wide"
            outsideCloseIgnoreSelector={`.${MARKUP_DROPDOWN_MENU_CLASS}`}
            closeOnScroll={false}
            actions={(
                <>
                    {annotation !== undefined && (
                        <Button size="sm" variant="ghost" onClick={deleteAnnotation}>
                            Delete
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={validation.annotation === undefined}
                        onClick={applyForm}
                    >
                        Apply
                    </Button>
                </>
            )}
        >
            <label className="panel-popover-form__field">
                <span className="panel-popover-form__field-label">
                    Series
                    {validation.seriesMessage ? (
                        <span className="panel-popover-form__field-error">
                            {validation.seriesMessage}
                        </span>
                    ) : null}
                </span>
                <Dropdown.Root
                    options={seriesOptions}
                    value={state.seriesValue}
                    onChange={(value) => setField('seriesValue', value)}
                    placeholder="annotation not selected"
                    fullWidth
                >
                    <Dropdown.Trigger style={{ height: '32px' }} />
                    <Dropdown.Menu className={MARKUP_DROPDOWN_MENU_CLASS}>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </label>
            <MarkupInputField
                label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                validationMessage={validation.timeMessage}
                placeholder={getAxisInputPlaceholder(isNumericXAxis)}
                value={state.timeText}
                onChange={(event) => setField('timeText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <MarkupInputField
                label="Text"
                autoSelect
                value={state.labelText}
                onChange={(event) => setField('labelText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className="panel-popover-form__row panel-popover-form__row--two">
                <MarkupInputField
                    label="Fill color"
                    aria-label="Annotation fill color"
                    type="color"
                    value={state.fillColor}
                    onChange={(event) => setField('fillColor', event.target.value)}
                />
                <MarkupInputField
                    label="Text color"
                    aria-label="Annotation text color"
                    type="color"
                    value={state.textColor}
                    onChange={(event) => setField('textColor', event.target.value)}
                />
            </div>
            <label className="panel-popover-form__checkbox-field">
                <input
                    aria-label="Clip annotation to panel range"
                    type="checkbox"
                    checked={state.clip}
                    onChange={(event) => setField('clip', event.target.checked)}
                />
                Clip to panel range
            </label>
            <div
                className="panel-popover-form__preview"
                style={{
                    backgroundColor: state.fillColor,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL}
            </div>
        </PanelPopover>
    );
}

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

    if (startTime === undefined || endTime === undefined) {
        return {
            highlight: undefined,
            startTimeMessage,
            endTimeMessage,
        };
    }

    const timeRange = { startTime, endTime };

    if (!isValidRange(timeRange)) {
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

function getHighlightEditorValue(
    editor: HighlightEditorState,
    draftHighlight: PanelHighlight | undefined,
    highlights: readonly PanelHighlight[],
): PanelHighlight {
    const highlight = draftHighlight ?? (
        editor.mode === 'edit' ? highlights[editor.highlightIndex] : undefined
    );

    if (highlight === undefined) {
        throw new Error('Cannot open the highlight editor without a highlight.');
    }

    return highlight;
}

export function EditHighlightModal({
    activeHighlightEditor,
    draftHighlight,
    highlights,
    onChange,
    onClose,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState;
    draftHighlight: PanelHighlight | undefined;
    highlights: readonly PanelHighlight[];
    onChange: (highlights: PanelHighlight[]) => void;
    onClose: () => void;
    isNumericXAxis: boolean;
}) {
    const highlightIndex = activeHighlightEditor.mode === 'edit'
        ? activeHighlightEditor.highlightIndex
        : undefined;
    const highlight = getHighlightEditorValue(
        activeHighlightEditor,
        draftHighlight,
        highlights,
    );

    const { state, setField } = useEditFormState(() =>
        createHighlightFormState(
            highlight,
            isNumericXAxis,
        ),
    );
    const validation = validateHighlightFormState(state, isNumericXAxis);
    const timePlaceholder = getAxisInputPlaceholder(isNumericXAxis);

    function applyForm(): void {
        if (validation.highlight === undefined) return;

        onChange(saveMarkupItem(
            highlights,
            validation.highlight,
            highlightIndex,
        ));
        onClose();
    }

    function deleteHighlight(): void {
        if (highlightIndex === undefined) return;

        onChange(deleteMarkupItem(highlights, highlightIndex));
        onClose();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel: onClose });
    }

    return (
        <PanelPopover
            title={activeHighlightEditor.mode === 'create' ? 'Create highlight' : 'Edit highlight'}
            position={activeHighlightEditor.position}
            onClose={onClose}
            size="compact"
            actions={(
                <>
                    {activeHighlightEditor.mode === 'edit' && (
                        <Button size="sm" variant="ghost" onClick={deleteHighlight}>
                            Delete
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={validation.highlight === undefined}
                        onClick={applyForm}
                    >
                        Apply
                    </Button>
                </>
            )}
        >
            <MarkupInputField
                label="Label"
                autoSelect
                value={state.labelText}
                onChange={(event) => setField('labelText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className="panel-popover-form__row panel-popover-form__row--two">
                <MarkupInputField
                    label={isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                    validationMessage={validation.startTimeMessage}
                    placeholder={timePlaceholder}
                    value={state.startTimeText}
                    onChange={(event) => setField('startTimeText', event.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <MarkupInputField
                    label={isNumericXAxis ? 'End value' : 'End time (Local)'}
                    validationMessage={validation.endTimeMessage}
                    placeholder={timePlaceholder}
                    value={state.endTimeText}
                    onChange={(event) => setField('endTimeText', event.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="panel-popover-form__row panel-popover-form__row--two">
                <MarkupInputField
                    label="Fill color"
                    aria-label="Highlight fill color"
                    type="color"
                    value={state.fillColor}
                    onChange={(event) => setField('fillColor', event.target.value)}
                />
                <MarkupInputField
                    label="Text color"
                    aria-label="Highlight text color"
                    type="color"
                    value={state.textColor}
                    onChange={(event) => setField('textColor', event.target.value)}
                />
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

function useEditFormState<T>(initializer: () => T) {
    const [state, setState] = useState<T>(initializer);

    function setField<K extends keyof T>(field: K, value: T[K]): void {
        setState((currentState) => ({ ...currentState, [field]: value }));
    }

    return { state, setField };
}

function handleEditFormKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    actions: { onApply: () => void; onCancel: () => void },
): void {
    if (event.key === 'Enter') {
        actions.onApply();
    }

    if (event.key === 'Escape') {
        actions.onCancel();
    }
}

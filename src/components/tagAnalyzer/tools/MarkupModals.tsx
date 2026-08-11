import { useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { Button, Dropdown } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    type PanelAnnotation,
    type PanelHighlight,
} from '../panel/panelModel';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    getPanelSeriesDisplayName,
    type PanelSeriesDefinition,
} from '../seriesModel';
import {
    formatRangeInputValue,
    parseRangeInputValue,
} from '../format/inputFormat';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import type {
    AnnotationEditorSession,
    HighlightEditorSession,
} from './markupModel';

import PanelPopover from './PanelPopover';

type AnnotationFormState = {
    seriesValue: string;
    timeText: string;
    labelText: string;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

const EMPTY_ANNOTATION_SERIES_VALUE = '';
const MARKUP_DROPDOWN_MENU_CLASS = 'panel-popover-form__dropdown-menu';

function getRangeInputPlaceholder(isNumericAxis: boolean): string {
    return isNumericAxis
        ? 'Numeric value'
        : 'YYYY-MM-DD HH:mm:ss.SSS';
}

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

function MarkupActions({
    onDelete,
    onCancel,
    onApply,
    applyDisabled,
}: {
    onDelete?: () => void;
    onCancel: () => void;
    onApply: () => void;
    applyDisabled: boolean;
}) {
    return (
        <>
            {onDelete && (
                <Button size="sm" variant="ghost" onClick={onDelete}>
                    Delete
                </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
            <Button size="sm" disabled={applyDisabled} onClick={onApply}>
                Apply
            </Button>
        </>
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
}) {
    const annotationTimestamp = parseRangeInputValue(
        formState.timeText,
        isNumericXAxis ? 'numeric' : 'time',
    );
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
        ? formatRangeInputValue(existingTimeRange.start, isNumericXAxis)
        : undefined;
    const annotationTimeRange =
        existingTimeRange && existingStartTimeText === formState.timeText
            ? existingTimeRange
            : {
                  start: annotationTimestamp,
                  end: annotationTimestamp,
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
    session,
    annotations,
    annotationSeriesList,
    onChange,
    onClose,
    isNumericXAxis,
}: {
    session: AnnotationEditorSession;
    annotations: readonly PanelAnnotation[];
    annotationSeriesList: PanelSeriesDefinition[];
    onChange: (annotations: PanelAnnotation[]) => void;
    onClose: () => void;
    isNumericXAxis: boolean;
}) {
    const annotationIndex = session.kind === 'edit'
        ? session.annotationIndex
        : undefined;
    const annotation = annotationIndex === undefined
        ? undefined
        : annotations[annotationIndex];
    const annotationTimestamp =
        annotation?.timeRange.start ?? (
            session.kind === 'create' ? session.timestamp : undefined
        );
    const { state, setField } = useEditFormState<AnnotationFormState>(() => ({
        seriesValue:
            annotation?.seriesKey ??
            (session.kind === 'create' ? session.seriesKey : undefined) ??
            EMPTY_ANNOTATION_SERIES_VALUE,
        timeText: annotationTimestamp === undefined
            ? ''
            : formatRangeInputValue(annotationTimestamp, isNumericXAxis),
        labelText: annotation?.text ?? DEFAULT_SERIES_ANNOTATION_LABEL,
        fillColor: annotation?.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: annotation?.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        clip: annotation?.clip ?? true,
    }));
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
            position={session.position}
            onClose={onClose}
            size="wide"
            outsideCloseIgnoreSelector={`.${MARKUP_DROPDOWN_MENU_CLASS}`}
            closeOnScroll={false}
            actions={(
                <MarkupActions
                    onDelete={annotation === undefined ? undefined : deleteAnnotation}
                    onCancel={onClose}
                    onApply={applyForm}
                    applyDisabled={validation.annotation === undefined}
                />
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
                placeholder={getRangeInputPlaceholder(isNumericXAxis)}
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

function validateHighlightFormState(
    formState: HighlightFormState,
    isNumericXAxis: boolean,
) {
    const sAxisKind = isNumericXAxis ? 'numeric' : 'time';
    const startTime = parseRangeInputValue(formState.startTimeText, sAxisKind);
    const endTime = parseRangeInputValue(formState.endTimeText, sAxisKind);
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

    const timeRange = createNonEmptyAxisRange(startTime, endTime);
    if (!timeRange) {
        return {
            highlight: undefined,
            endTimeMessage: `Start and end ${axisKindLabel} must differ.`,
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
    session,
    highlights,
    onChange,
    onClose,
    isNumericXAxis,
}: {
    session: HighlightEditorSession;
    highlights: readonly PanelHighlight[];
    onChange: (highlights: PanelHighlight[]) => void;
    onClose: () => void;
    isNumericXAxis: boolean;
}) {
    const highlightIndex = session.kind === 'edit'
        ? session.highlightIndex
        : undefined;
    const highlight = session.kind === 'create'
        ? session.initialHighlight
        : highlights[session.highlightIndex];
    if (highlight === undefined) {
        throw new Error('Cannot open the highlight editor without a highlight.');
    }

    const { state, setField } = useEditFormState<HighlightFormState>(() => ({
        labelText: highlight.text,
        startTimeText: formatRangeInputValue(
            highlight.timeRange.start,
            isNumericXAxis,
        ),
        endTimeText: formatRangeInputValue(
            highlight.timeRange.end,
            isNumericXAxis,
        ),
        fillColor: highlight.fillColor,
        textColor: highlight.textColor,
    }));
    const validation = validateHighlightFormState(state, isNumericXAxis);
    const timePlaceholder = getRangeInputPlaceholder(isNumericXAxis);

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
            title={session.kind === 'create' ? 'Create highlight' : 'Edit highlight'}
            position={session.position}
            onClose={onClose}
            size="compact"
            actions={(
                <MarkupActions
                    onDelete={highlightIndex === undefined ? undefined : deleteHighlight}
                    onCancel={onClose}
                    onApply={applyForm}
                    applyDisabled={validation.highlight === undefined}
                />
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

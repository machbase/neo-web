import { useId, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { Button, Dropdown } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelAnnotation,
    type PanelHighlight,
    type AnnotationEditorSession,
    type HighlightEditorSession,
} from './markupModel';
import {
    getPanelSeriesDisplayName,
    type PanelSeriesDefinition,
} from '../seriesModel';
import {
    DATE_TIME_INPUT_FORMAT,
    formatRangeInputValue,
    parseRangeInputValue,
} from '../format/inputFormat';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import PanelPopover from '../tools/PanelPopover';
import { Field, Inline, Surface, Text } from '../ui/Presentation';
import controls from '../ui/Controls.module.scss';

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
            testId: 'annotation-series-empty',
        },
        ...annotationSeriesList.map((seriesInfo) => ({
            label: getPanelSeriesDisplayName(seriesInfo),
            value: seriesInfo.key,
            testId: `annotation-series-option-${encodeURIComponent(seriesInfo.key)}`,
        })),
    ];
    const validation = validateAnnotationFormState({
        formState: state,
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

        onChange(annotations.filter((_, index) => index !== annotationIndex));
        onClose();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel: onClose });
    }

    return (
        <PanelPopover
            data-testid="tag-analyzer-annotation-editor"
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
            <Field gap={4} label={<MarkupFieldLabel label="Series" message={validation.seriesMessage} />}>
                <Dropdown.Root
                    options={seriesOptions}
                    value={state.seriesValue}
                    onChange={(value) => setField('seriesValue', value)}
                    placeholder="annotation not selected"
                    fullWidth
                >
                    <Dropdown.Trigger
                        data-testid="series-trigger"
                        className={controls.control}
                    />
                    <Dropdown.Menu className={MARKUP_DROPDOWN_MENU_CLASS}>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </Field>
            <MarkupInputField
                data-testid="anchor-input"
                label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                validationMessage={validation.timeMessage}
                placeholder={isNumericXAxis ? 'Numeric value' : DATE_TIME_INPUT_FORMAT}
                value={state.timeText}
                onChange={(event) => setField('timeText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <MarkupInputField
                data-testid="text-input"
                label="Text"
                autoSelect
                value={state.labelText}
                onChange={(event) => setField('labelText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <MarkupColorFields
                kind="Annotation"
                state={state}
                onChange={setField}
            />
            <Inline as="label">
                <input
                    data-testid="clip-checkbox"
                    aria-label="Clip annotation to panel range"
                    type="checkbox"
                    checked={state.clip}
                    onChange={(event) => setField('clip', event.target.checked)}
                />
                Clip to panel range
            </Inline>
            <Surface
                variant="outlined"
                density="compact"
                style={{
                    backgroundColor: state.fillColor,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL}
            </Surface>
        </PanelPopover>
    );
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
    const timePlaceholder = isNumericXAxis ? 'Numeric value' : DATE_TIME_INPUT_FORMAT;

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

        onChange(highlights.filter((_, index) => index !== highlightIndex));
        onClose();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel: onClose });
    }

    return (
        <PanelPopover
            data-testid="tag-analyzer-highlight-editor"
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
                data-testid="label-input"
                label="Label"
                autoSelect
                value={state.labelText}
                onChange={(event) => setField('labelText', event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className={controls.twoColumns}>
                <MarkupInputField
                    data-testid="start-input"
                    label={isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                    validationMessage={validation.startTimeMessage}
                    placeholder={timePlaceholder}
                    value={state.startTimeText}
                    onChange={(event) => setField('startTimeText', event.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <MarkupInputField
                    data-testid="end-input"
                    label={isNumericXAxis ? 'End value' : 'End time (Local)'}
                    validationMessage={validation.endTimeMessage}
                    placeholder={timePlaceholder}
                    value={state.endTimeText}
                    onChange={(event) => setField('endTimeText', event.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <MarkupColorFields
                kind="Highlight"
                state={state}
                onChange={setField}
            />
            <Surface
                variant="outlined"
                density="compact"
                style={{
                    backgroundColor: `${state.fillColor}29`,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_PANEL_HIGHLIGHT_LABEL}
            </Surface>
        </PanelPopover>
    );
}

// -------------------- Local --------------------

type MarkupAppearanceState = {
    labelText: string;
    fillColor: string;
    textColor: string;
};

type AnnotationFormState = MarkupAppearanceState & {
    seriesValue: string;
    timeText: string;
    clip: boolean;
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
    label, validationMessage, autoSelect, type, id,
    'aria-label': ariaLabel = label, ...inputProps
}: MarkupInputFieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
        <Field htmlFor={inputId} gap={4} label={(
            <MarkupFieldLabel label={label} message={validationMessage} errorId={`${inputId}-error`} />
        )}>
            <input
                {...inputProps}
                id={inputId}
                aria-label={ariaLabel}
                aria-describedby={validationMessage ? `${inputId}-error` : inputProps['aria-describedby']}
                aria-invalid={validationMessage ? true : inputProps['aria-invalid']}
                autoFocus={autoSelect}
                className={controls.input}
                type={type}
                onFocus={autoSelect ? (event) => event.currentTarget.select() : undefined}
            />
        </Field>
    );
}

function MarkupFieldLabel({ label, message, errorId }: { label: string; message?: string; errorId?: string }) {
    return (
        <Inline as="span" justify="between">
            {label}
            {message && <Text variant="caption" tone="danger" id={errorId}>{message}</Text>}
        </Inline>
    );
}

type MarkupColorField = 'fillColor' | 'textColor';
const MARKUP_COLOR_FIELDS: readonly MarkupColorField[] = ['fillColor', 'textColor'];

function MarkupColorFields({ kind, state, onChange }: {
    kind: 'Annotation' | 'Highlight';
    state: MarkupAppearanceState;
    onChange: (field: MarkupColorField, value: string) => void;
}) {
    return (
        <div className={controls.twoColumns}>
            {MARKUP_COLOR_FIELDS.map((field) => {
                const colorKind = field === 'fillColor' ? 'Fill' : 'Text';

                return (
                    <MarkupInputField
                        key={field}
                        data-testid={`${colorKind.toLowerCase()}-color-input`}
                        label={`${colorKind} color`}
                        aria-label={`${kind} ${colorKind.toLowerCase()} color`}
                        type="color"
                        value={state[field]}
                        onChange={(event) => onChange(field, event.target.value)}
                    />
                );
            })}
        </div>
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
                <Button
                    data-testid="delete-button"
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                >
                    Delete
                </Button>
            )}
            <Button
                data-testid="cancel-button"
                size="sm"
                variant="ghost"
                onClick={onCancel}
            >
                Cancel
            </Button>
            <Button
                data-testid="apply-button"
                size="sm"
                disabled={applyDisabled}
                onClick={onApply}
            >
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

function validateAnnotationFormState({
    formState,
    existingAnnotation,
    isNumericXAxis,
}: {
    formState: AnnotationFormState;
    existingAnnotation: PanelAnnotation | undefined;
    isNumericXAxis: boolean;
}) {
    const selectedSeriesKey = formState.seriesValue.trim();
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
    const annotationTimeRange =
        existingTimeRange &&
        formatRangeInputValue(existingTimeRange.start, isNumericXAxis) === formState.timeText
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

type HighlightFormState = MarkupAppearanceState & {
    startTimeText: string;
    endTimeText: string;
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

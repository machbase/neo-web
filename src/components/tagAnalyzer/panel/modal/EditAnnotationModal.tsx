import { useState, type KeyboardEvent } from 'react';
import { Button, Dropdown, type ContextMenuPosition } from '@/design-system/components';
import type { PanelAnnotation } from '../../domain/PanelDomain';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../../domain/SeriesDomain';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/formatting/TimeInputFormatters';
import type {
    PanelAnnotationCrud,
    PanelAnnotationSeriesOption,
} from '../usePanelAnnotation';
import PanelPopover from './PanelPopover';

export type AnnotationEditorMetaState = {
    position: ContextMenuPosition;
    seriesKey?: string;
    annotationIndex?: number;
    timestamp?: number;
};

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
        clip: annotation?.clip === true,
    };
}

function convertAnnotationFormStateToPanelAnnotation({
    formState,
    selectedSeriesKey,
    existingAnnotation,
    isNumericXAxis,
}: {
    formState: AnnotationFormState;
    selectedSeriesKey: string;
    existingAnnotation: PanelAnnotation | undefined;
    isNumericXAxis: boolean;
}): PanelAnnotation | undefined {
    const annotationTimestamp = parseAxisInputValue(formState.timeText, isNumericXAxis);

    if (annotationTimestamp === undefined) {
        return undefined;
    }

    const existingTimeRange = existingAnnotation?.timeRange;
    const existingStartTimeText = existingTimeRange
        ? formatAxisInputValue(existingTimeRange.startTime, isNumericXAxis)
        : undefined;
    const shouldPreserveExistingRange =
        existingTimeRange !== undefined && existingStartTimeText === formState.timeText;
    const annotationTimeRange =
        shouldPreserveExistingRange && existingTimeRange
            ? existingTimeRange
            : {
                  startTime: annotationTimestamp,
                  endTime: annotationTimestamp,
              };

    return {
        seriesKey: selectedSeriesKey,
        text: formState.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL,
        timeRange: { ...annotationTimeRange },
        fillColor: formState.fillColor || DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: formState.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        clip: formState.clip,
    };
}

export function EditAnnotationModal({
    annotationEditorMeta,
    annotationCrud,
    annotationSeriesOptions,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    annotationEditorMeta: AnnotationEditorMetaState;
    annotationCrud: PanelAnnotationCrud;
    annotationSeriesOptions: PanelAnnotationSeriesOption[];
    onCancel: () => void;
    onApplied: () => void;
    isNumericXAxis: boolean;
}) {
    const annotationIndex = annotationEditorMeta.annotationIndex;
    const annotation = annotationIndex === undefined
        ? undefined
        : annotationCrud.getAnnotation(annotationIndex);
    function saveAnnotation(state: AnnotationFormState): boolean {
        const selectedAnnotationSeriesKey = state.seriesValue.trim();

        if (selectedAnnotationSeriesKey === '') {
            return false;
        }

        const nextAnnotation = convertAnnotationFormStateToPanelAnnotation({
            formState: state,
            selectedSeriesKey: selectedAnnotationSeriesKey,
            existingAnnotation: annotation,
            isNumericXAxis,
        });

        if (!nextAnnotation) {
            return false;
        }

        if (annotationIndex === undefined) {
            annotationCrud.addAnnotationEntry(nextAnnotation);
            return true;
        }

        annotationCrud.updateAnnotationEntry(annotationIndex, nextAnnotation);
        return true;
    }

    const [state, setState] = useState(() =>
        createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
    );
    const seriesOptions = [
        {
            label: 'annotation not selected',
            value: EMPTY_ANNOTATION_SERIES_VALUE,
        },
        ...annotationSeriesOptions,
    ];
    const selectedSeriesKey = state.seriesValue.trim();
    const canApply =
        selectedSeriesKey !== '' &&
        parseAxisInputValue(state.timeText, isNumericXAxis) !== undefined;
    const timePlaceholder = isNumericXAxis
        ? NUMERIC_AXIS_INPUT_FORMAT
        : LOCAL_DATE_TIME_INPUT_FORMAT;

    function applyForm(): void {
        if (saveAnnotation(state)) {
            onApplied();
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter') applyForm();
        if (event.key === 'Escape') onCancel();
    }

    function deleteAnnotation(): void {
        if (annotationIndex === undefined) {
            throw new Error('Cannot delete annotation without an annotation index.');
        }

        annotationCrud.deleteAnnotationEntry(annotationIndex);
        onApplied();
    }

    return (
        <PanelPopover
            title="Edit annotation"
            position={annotationEditorMeta.position}
            onClose={onCancel}
            draggable
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
                Series
                <Dropdown.Root
                    options={seriesOptions}
                    value={state.seriesValue}
                    onChange={(value) =>
                        setState((currentState) => ({
                            ...currentState,
                            seriesValue: value,
                        }))
                    }
                    placeholder="annotation not selected"
                    fullWidth
                >
                    <Dropdown.Trigger style={{ height: '32px' }} />
                    <Dropdown.Menu className={MARKUP_DROPDOWN_MENU_CLASS}>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </label>
            <label className="panel-popover-form__field">
                {isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                <input
                    aria-label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                    className="panel-popover-form__input"
                    placeholder={timePlaceholder}
                    value={state.timeText}
                    onChange={(event) =>
                        setState((currentState) => ({
                            ...currentState,
                            timeText: event.target.value,
                        }))
                    }
                    onKeyDown={handleKeyDown}
                />
            </label>
            <label className="panel-popover-form__field">
                Text
                <input
                    aria-label="Text"
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
                    Fill color
                    <input
                        aria-label="Annotation fill color"
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
                        aria-label="Annotation text color"
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
            <label className="panel-popover-form__checkbox-field">
                <input
                    aria-label="Clip annotation to panel range"
                    type="checkbox"
                    checked={state.clip}
                    onChange={(event) =>
                        setState((currentState) => ({
                            ...currentState,
                            clip: event.target.checked,
                        }))
                    }
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

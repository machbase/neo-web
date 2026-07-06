import { type KeyboardEvent } from 'react';
import { Button, Dropdown, type ContextMenuPosition } from '@/design-system/components';
import { useEditFormState, handleEditFormKeyDown } from './editFormState';
import type { PanelAnnotation } from '../../domain/panel/PanelInfo';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';

import PanelPopover from './PanelPopover';

export type AnnotationEditorMetaState = {
    position: ContextMenuPosition;
    seriesKey?: string;
    annotationIndex?: number;
    timestamp?: number;
};

type PanelAnnotationSeriesOption = {
    label: string;
    value: string;
};

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

function createPanelAnnotationSeriesOptions(
    seriesList: PanelSeriesDefinition[],
): PanelAnnotationSeriesOption[] {
    return seriesList.map((seriesInfo) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: seriesInfo.key,
    }));
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
        clip: annotation?.clip === true,
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
    annotation,
    annotationSeriesList,
    onCancel,
    onApply,
    onDelete,
    isNumericXAxis,
}: {
    annotationEditorMeta: AnnotationEditorMetaState;
    annotation: PanelAnnotation | undefined;
    annotationSeriesList: PanelSeriesDefinition[];
    onCancel: () => void;
    onApply: (annotation: PanelAnnotation) => void;
    onDelete?: () => void;
    isNumericXAxis: boolean;
}) {
    const { state, setField } = useEditFormState(() =>
        createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
    );
    const seriesOptions = [
        {
            label: 'annotation not selected',
            value: EMPTY_ANNOTATION_SERIES_VALUE,
        },
        ...createPanelAnnotationSeriesOptions(annotationSeriesList),
    ];
    const selectedSeriesKey = state.seriesValue.trim();
    const validation = validateAnnotationFormState({
        formState: state,
        selectedSeriesKey,
        existingAnnotation: annotation,
        isNumericXAxis,
    });
    const canApply = validation.annotation !== undefined;
    const timePlaceholder = isNumericXAxis
        ? NUMERIC_AXIS_INPUT_FORMAT
        : LOCAL_DATE_TIME_INPUT_FORMAT;

    function applyForm(): void {
        if (validation.annotation !== undefined) {
            onApply(validation.annotation);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        handleEditFormKeyDown(event, { onApply: applyForm, onCancel });
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
                    {annotation !== undefined && onDelete !== undefined && (
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
            <label className="panel-popover-form__field">
                <span className="panel-popover-form__field-label">
                    {isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                    {validation.timeMessage ? (
                        <span className="panel-popover-form__field-error">
                            {validation.timeMessage}
                        </span>
                    ) : null}
                </span>
                <input
                    aria-label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                    className="panel-popover-form__input"
                    placeholder={timePlaceholder}
                    value={state.timeText}
                    onChange={(event) => setField('timeText', event.target.value)}
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
                    onChange={(event) => setField('labelText', event.target.value)}
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
                        onChange={(event) => setField('fillColor', event.target.value)}
                    />
                </label>
                <label className="panel-popover-form__field">
                    Text color
                    <input
                        aria-label="Annotation text color"
                        className="panel-popover-form__color-input"
                        type="color"
                        value={state.textColor}
                        onChange={(event) => setField('textColor', event.target.value)}
                    />
                </label>
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

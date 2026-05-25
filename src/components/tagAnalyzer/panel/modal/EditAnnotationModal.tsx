import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import {
    Button,
    type ContextMenuPosition,
} from '@/design-system/components';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../../domain/SeriesDomain';
import type { PanelAnnotation } from '../../domain/PanelDomain';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';
import type { PanelAnnotationAction } from '../usePanelAnnotation';
import PanelMarkupPopover from './PanelMarkupPopover';
import './PanelMarkupModal.scss';

export type AnnotationEditorMetaState = {
    position: ContextMenuPosition;
    seriesKey?: string;
    annotationIndex?: number;
    timestamp?: number;
};

export type AnnotationFormState = {
    seriesValue: string;
    timeText: string;
    labelText: string;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

const ANNOTATION_NOT_SELECTED_VALUE = '';
const ANNOTATION_NOT_SELECTED_LABEL = 'annotation not selected';
const ANNOTATION_COLOR_FIELDS = [
    ['fillColor', 'Fill color', 'Annotation fill color'],
    ['textColor', 'Text color', 'Annotation text color'],
] as const;

function createAnnotationFormState(
    annotationEditorMeta: AnnotationEditorMetaState,
    annotation: PanelAnnotation | undefined,
    isNumericXAxis: boolean,
): AnnotationFormState {
    const sTimestamp =
        annotation?.timeRange.startTime ?? annotationEditorMeta.timestamp;
    const sSeriesValue =
        annotation?.seriesKey ??
        annotationEditorMeta.seriesKey ??
        ANNOTATION_NOT_SELECTED_VALUE;

    return {
        seriesValue: sSeriesValue,
        timeText:
            sTimestamp !== undefined
                ? formatAxisInputValue(sTimestamp, isNumericXAxis)
                : '',
        labelText: annotation?.text ?? DEFAULT_SERIES_ANNOTATION_LABEL,
        fillColor: annotation?.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: annotation?.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        clip: annotation?.clip === true,
    };
}

function parseAnnotationSeriesValue(value: string): string | undefined {
    return value.trim() === ''
        ? undefined
        : value;
}

function getActiveAnnotation(
    annotationAction: PanelAnnotationAction,
    annotationEditorMeta: AnnotationEditorMetaState,
): PanelAnnotation | undefined {
    if (annotationEditorMeta.annotationIndex === undefined) {
        return undefined;
    }

    return annotationAction.getAnnotation(annotationEditorMeta.annotationIndex);
}

const EditAnnotationModal = ({
    annotationEditorMeta,
    annotationAction,
    onApplyAnnotationChange,
    onDeleteAnnotation,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    annotationEditorMeta: AnnotationEditorMetaState;
    annotationAction: PanelAnnotationAction;
    onApplyAnnotationChange: (
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesKey: string,
    ) => boolean;
    onDeleteAnnotation: (annotationEditorMeta: AnnotationEditorMetaState) => void;
    onCancel: () => void;
    onApplied: () => void;
    isNumericXAxis: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const annotation = getActiveAnnotation(annotationAction, annotationEditorMeta);
    const seriesOptions = annotationAction.getSeriesOptions();
    const [formState, setFormState] = useState(() =>
        createAnnotationFormState(
            annotationEditorMeta,
            annotation,
            isNumericXAxis,
        ),
    );

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const sSelectedSeriesKey = parseAnnotationSeriesValue(formState.seriesValue);
    const sCanApply =
        sSelectedSeriesKey !== undefined &&
        parseAxisInputValue(formState.timeText, isNumericXAxis) !== undefined;

    function setField<K extends keyof AnnotationFormState>(
        field: K,
        value: AnnotationFormState[K],
    ) {
        setFormState((prev) => ({ ...prev, [field]: value }));
    }

    function apply() {
        if (sSelectedSeriesKey === undefined) {
            return;
        }

        const sDidApply = onApplyAnnotationChange(
            formState,
            annotationEditorMeta,
            sSelectedSeriesKey,
        );

        if (sDidApply) {
            onApplied();
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            apply();
        } else if (event.key === 'Escape') {
            onCancel();
        }
    }

    return (
        <PanelMarkupPopover
            position={annotationEditorMeta.position}
            onClose={onCancel}
            closeOnOutsideClick
        >
            <div className="panel-markup-modal panel-markup-modal--annotation">
                <div className="panel-markup-modal__title">
                    Edit annotation
                </div>
                <div className="panel-markup-modal__body">
                    <label className="panel-markup-modal__field">
                        Series
                        <select
                            aria-label="Annotation series"
                            className="panel-markup-modal__select"
                            value={formState.seriesValue}
                            onChange={(event) => setField('seriesValue', event.target.value)}
                        >
                            <option value={ANNOTATION_NOT_SELECTED_VALUE}>
                                {ANNOTATION_NOT_SELECTED_LABEL}
                            </option>
                            {seriesOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="panel-markup-modal__field">
                        {isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                        <input
                            aria-label={isNumericXAxis ? 'Annotation axis value' : 'Annotation time'}
                            className="panel-markup-modal__input"
                            placeholder={
                                isNumericXAxis
                                    ? NUMERIC_AXIS_INPUT_FORMAT
                                    : LOCAL_DATE_TIME_INPUT_FORMAT
                            }
                            value={formState.timeText}
                            onChange={(event) => setField('timeText', event.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </label>
                    <label className="panel-markup-modal__field">
                        Text
                        <input
                            ref={inputRef}
                            aria-label="Annotation text"
                            className="panel-markup-modal__input"
                            value={formState.labelText}
                            onChange={(event) => setField('labelText', event.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </label>
                    <div className="panel-markup-modal__row panel-markup-modal__row--two">
                        {ANNOTATION_COLOR_FIELDS.map(([field, label, ariaLabel]) => (
                            <label className="panel-markup-modal__field" key={field}>
                                {label}
                                <input
                                    aria-label={ariaLabel}
                                    className="panel-markup-modal__color-input"
                                    type="color"
                                    value={formState[field]}
                                    onChange={(event) => setField(field, event.target.value)}
                                />
                            </label>
                        ))}
                    </div>
                    <label className="panel-markup-modal__checkbox-field">
                        <input
                            aria-label="Clip annotation to panel range"
                            type="checkbox"
                            checked={formState.clip}
                            onChange={(event) => setField('clip', event.target.checked)}
                        />
                        Clip to panel range
                    </label>
                    <div
                        className="panel-markup-modal__preview"
                        style={{
                            backgroundColor: formState.fillColor,
                            borderColor: formState.fillColor,
                            color: formState.textColor,
                        }}
                    >
                        {formState.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL}
                    </div>
                </div>
                <div className="panel-markup-modal__actions">
                    {annotation && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                onDeleteAnnotation(annotationEditorMeta);
                                onApplied();
                            }}
                        >
                            Delete
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" disabled={!sCanApply} onClick={apply}>
                        Apply
                    </Button>
                </div>
            </div>
        </PanelMarkupPopover>
    );
};

export default EditAnnotationModal;

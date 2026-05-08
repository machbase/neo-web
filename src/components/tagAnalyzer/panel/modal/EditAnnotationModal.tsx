import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Popover } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import { parseNonNegativeInteger } from '../../domain/IntegerParsing';
import type { SeriesAnnotation } from '../../domain/SeriesModel';
import {
    createUtcDateFieldText,
    DEFAULT_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../PanelAnnotationUtils';
import './PanelMarkupModal.scss';

export type ActiveAnnotationEditor = {
    position: ContextMenuPosition;
    seriesIndex?: number;
    annotationIndex?: number;
    timestamp?: number;
};

type AnnotationFormState = {
    seriesValue: string;
    yearText: string;
    monthText: string;
    dayText: string;
    labelText: string;
    fillColor: string;
    textColor: string;
};

export type ApplyAnnotationChangeRequest = AnnotationFormState & {
    activeAnnotationEditor: ActiveAnnotationEditor;
    seriesIndex: number | undefined;
};

type AnnotationSeriesOption = {
    label: string;
    value: string;
};

const ANNOTATION_DATE_FIELDS = [
    ['yearText', 'Year', 'Annotation year'],
    ['monthText', 'Month', 'Annotation month'],
    ['dayText', 'Day', 'Annotation day'],
] as const;
const ANNOTATION_NOT_SELECTED_VALUE = '';
const ANNOTATION_NOT_SELECTED_LABEL = 'annotation not selected';
const ANNOTATION_COLOR_FIELDS = [
    ['fillColor', 'Fill color', 'Annotation fill color'],
    ['textColor', 'Text color', 'Annotation text color'],
] as const;

function createAnnotationFormState(
    activeAnnotationEditor: ActiveAnnotationEditor | undefined,
    annotation: SeriesAnnotation | undefined,
): AnnotationFormState {
    const sTimestamp =
        annotation?.timeRange.startTime ?? activeAnnotationEditor?.timestamp;
    const sDateFields = sTimestamp !== undefined
        ? createUtcDateFieldText(sTimestamp)
        : undefined;
    const sSeriesValue =
        activeAnnotationEditor?.seriesIndex !== undefined
            ? String(activeAnnotationEditor.seriesIndex)
            : ANNOTATION_NOT_SELECTED_VALUE;

    return {
        seriesValue: sSeriesValue,
        yearText: sDateFields?.yearText ?? '',
        monthText: sDateFields?.monthText ?? '',
        dayText: sDateFields?.dayText ?? '',
        labelText: annotation?.text ?? DEFAULT_ANNOTATION_LABEL,
        fillColor: annotation?.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
        textColor: annotation?.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    };
}

function parseAnnotationSeriesValue(value: string): number | undefined {
    return value.trim() === ''
        ? undefined
        : parseNonNegativeInteger(value);
}

const EditAnnotationModal = ({
    activeAnnotationEditor,
    annotation,
    seriesOptions,
    onApplyAnnotationChange,
    onDeleteAnnotation,
    onCancel,
    onApplied,
}: {
    activeAnnotationEditor: ActiveAnnotationEditor | undefined;
    annotation: SeriesAnnotation | undefined;
    seriesOptions: AnnotationSeriesOption[];
    onApplyAnnotationChange: (request: ApplyAnnotationChangeRequest) => boolean;
    onDeleteAnnotation: (activeAnnotationEditor: ActiveAnnotationEditor | undefined) => void;
    onCancel: () => void;
    onApplied: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [formState, setFormState] = useState(() =>
        createAnnotationFormState(activeAnnotationEditor, annotation),
    );

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    if (!activeAnnotationEditor) {
        return null;
    }
    const sActiveAnnotationEditor = activeAnnotationEditor;
    const sSelectedSeriesIndex = parseAnnotationSeriesValue(formState.seriesValue);
    const sCanApply = sSelectedSeriesIndex !== undefined;

    function setField(field: keyof AnnotationFormState, value: string) {
        setFormState((prev) => ({ ...prev, [field]: value }));
    }

    function apply() {
        const sDidApply = onApplyAnnotationChange({
            activeAnnotationEditor: sActiveAnnotationEditor,
            seriesIndex: sSelectedSeriesIndex,
            ...formState,
        });

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
        <Popover
            isOpen
            position={sActiveAnnotationEditor.position}
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
                    <div className="panel-markup-modal__row panel-markup-modal__row--three">
                        {ANNOTATION_DATE_FIELDS.map(([field, label, ariaLabel]) => (
                            <label className="panel-markup-modal__field" key={field}>
                                {label}
                                <input
                                    aria-label={ariaLabel}
                                    className="panel-markup-modal__input"
                                    value={formState[field]}
                                    onChange={(event) => setField(field, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </label>
                        ))}
                    </div>
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
                    <div
                        className="panel-markup-modal__preview"
                        style={{
                            backgroundColor: formState.fillColor,
                            borderColor: formState.fillColor,
                            color: formState.textColor,
                        }}
                    >
                        {formState.labelText.trim() || DEFAULT_ANNOTATION_LABEL}
                    </div>
                </div>
                <div className="panel-markup-modal__actions">
                    {annotation && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                onDeleteAnnotation(sActiveAnnotationEditor);
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
        </Popover>
    );
};

export default EditAnnotationModal;

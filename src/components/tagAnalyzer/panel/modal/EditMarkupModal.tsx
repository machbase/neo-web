import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import {
    Button,
    type ContextMenuPosition,
} from '@/design-system/components';
import type {
    PanelAnnotation,
    PanelHighlight,
} from '../../domain/PanelDomain';
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
} from '../../domain/time/TimeInputFormatters';
import type { PanelAnnotationAction } from '../usePanelAnnotation';
import type { HighlightActions } from '../usePanelHighlight';
import PanelMarkupPopover from './PanelMarkupPopover';
import './PanelMarkupModal.scss';

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';

export type HighlightEditorState = {
    position: ContextMenuPosition;
    highlightIndex: number;
};

export type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

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

const EMPTY_ANNOTATION_SERIES_VALUE = '';
const COLOR_FIELDS = [
    ['fillColor', 'Fill color'],
    ['textColor', 'Text color'],
] as const;

function MarkupShell({
    title,
    className,
    position,
    onClose,
    children,
    actions,
}: {
    title: string;
    className: string;
    position: ContextMenuPosition;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode;
}) {
    return (
        <PanelMarkupPopover
            position={position}
            onClose={onClose}
            closeOnOutsideClick
        >
            <div className={`panel-markup-modal ${className}`}>
                <div className="panel-markup-modal__title">{title}</div>
                <div className="panel-markup-modal__body">{children}</div>
                <div className="panel-markup-modal__actions">{actions}</div>
            </div>
        </PanelMarkupPopover>
    );
}

function TextField({
    label,
    ariaLabel,
    value,
    placeholder,
    inputRef,
    onChange,
    onKeyDown,
}: {
    label: string;
    ariaLabel: string;
    value: string;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
    onChange: (value: string) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className="panel-markup-modal__field">
            {label}
            <input
                ref={inputRef}
                aria-label={ariaLabel}
                className="panel-markup-modal__input"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
            />
        </label>
    );
}

function ColorFields<T extends Record<'fillColor' | 'textColor', string>>({
    state,
    onChange,
    ariaPrefix,
}: {
    state: T;
    onChange: <K extends 'fillColor' | 'textColor'>(field: K, value: T[K]) => void;
    ariaPrefix: string;
}) {
    return (
        <div className="panel-markup-modal__row panel-markup-modal__row--two">
            {COLOR_FIELDS.map(([field, label]) => (
                <label className="panel-markup-modal__field" key={field}>
                    {label}
                    <input
                        aria-label={`${ariaPrefix} ${field === 'fillColor' ? 'fill' : 'text'} color`}
                        className="panel-markup-modal__color-input"
                        type="color"
                        value={state[field]}
                        onChange={(event) => onChange(field, event.target.value as T[typeof field])}
                    />
                </label>
            ))}
        </div>
    );
}

function useFocusedInput() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    return inputRef;
}

function getAxisPlaceholder(isNumericXAxis: boolean): string {
    return isNumericXAxis
        ? NUMERIC_AXIS_INPUT_FORMAT
        : LOCAL_DATE_TIME_INPUT_FORMAT;
}

function createHighlightFormState(
    highlight: PanelHighlight,
    isNumericXAxis: boolean,
): HighlightFormState {
    return {
        labelText: highlight.text,
        startTimeText: formatAxisInputValue(
            highlight.timeRange.startTime,
            isNumericXAxis,
        ),
        endTimeText: formatAxisInputValue(
            highlight.timeRange.endTime,
            isNumericXAxis,
        ),
        fillColor: highlight.fillColor,
        textColor: highlight.textColor,
    };
}

function getActiveHighlight(
    activeHighlightEditor: HighlightEditorState,
    temporaryHighlight: PanelHighlight | undefined,
    highlightActions: HighlightActions,
): PanelHighlight {
    return temporaryHighlight ??
        highlightActions.getHighlightByIndex(activeHighlightEditor.highlightIndex);
}

export function EditHighlightModal({
    activeHighlightEditor,
    temporaryHighlight,
    highlightActions,
    onApplyHighlightChange,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState;
    temporaryHighlight: PanelHighlight | undefined;
    highlightActions: HighlightActions;
    onApplyHighlightChange: (
        formState: HighlightFormState,
        activeHighlightEditor: HighlightEditorState,
    ) => boolean;
    onCancel: () => void;
    onApplied: () => void;
    isNumericXAxis: boolean;
}) {
    const inputRef = useFocusedInput();
    const [formState, setFormState] = useState(() =>
        createHighlightFormState(
            getActiveHighlight(activeHighlightEditor, temporaryHighlight, highlightActions),
            isNumericXAxis,
        ),
    );
    const sParsedStartTime = parseAxisInputValue(
        formState.startTimeText,
        isNumericXAxis,
    );
    const sParsedEndTime = parseAxisInputValue(
        formState.endTimeText,
        isNumericXAxis,
    );
    const sCanApply =
        sParsedStartTime !== undefined &&
        sParsedEndTime !== undefined &&
        sParsedEndTime > sParsedStartTime;
    const setField = <K extends keyof HighlightFormState>(
        field: K,
        value: HighlightFormState[K],
    ) => setFormState((prev) => ({ ...prev, [field]: value }));
    const apply = () => {
        if (onApplyHighlightChange(formState, activeHighlightEditor)) {
            onApplied();
        }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') apply();
        if (event.key === 'Escape') onCancel();
    };

    return (
        <MarkupShell
            title="Edit highlight"
            className="panel-markup-modal--highlight"
            position={activeHighlightEditor.position}
            onClose={onCancel}
            actions={(
                <>
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" disabled={!sCanApply} onClick={apply}>
                        Apply
                    </Button>
                </>
            )}
        >
            <TextField
                label="Label"
                ariaLabel="Highlight label"
                inputRef={inputRef}
                value={formState.labelText}
                onChange={(value) => setField('labelText', value)}
                onKeyDown={handleKeyDown}
            />
            <div className="panel-markup-modal__row panel-markup-modal__row--two">
                <TextField
                    label={isNumericXAxis ? 'Start value' : 'Start time (Local)'}
                    ariaLabel={isNumericXAxis ? 'Highlight start value' : 'Highlight start time'}
                    value={formState.startTimeText}
                    placeholder={getAxisPlaceholder(isNumericXAxis)}
                    onChange={(value) => setField('startTimeText', value)}
                    onKeyDown={handleKeyDown}
                />
                <TextField
                    label={isNumericXAxis ? 'End value' : 'End time (Local)'}
                    ariaLabel={isNumericXAxis ? 'Highlight end value' : 'Highlight end time'}
                    value={formState.endTimeText}
                    placeholder={getAxisPlaceholder(isNumericXAxis)}
                    onChange={(value) => setField('endTimeText', value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <ColorFields
                state={formState}
                ariaPrefix="Highlight"
                onChange={setField}
            />
            <div
                className="panel-markup-modal__preview"
                style={{
                    backgroundColor: `${formState.fillColor}29`,
                    borderColor: formState.fillColor,
                    color: formState.textColor,
                }}
            >
                {formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL}
            </div>
        </MarkupShell>
    );
}

function createAnnotationFormState(
    annotationEditorMeta: AnnotationEditorMetaState,
    annotation: PanelAnnotation | undefined,
    isNumericXAxis: boolean,
): AnnotationFormState {
    const sTimestamp =
        annotation?.timeRange.startTime ?? annotationEditorMeta.timestamp;

    return {
        seriesValue:
            annotation?.seriesKey ??
            annotationEditorMeta.seriesKey ??
            EMPTY_ANNOTATION_SERIES_VALUE,
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

export function EditAnnotationModal({
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
}) {
    const inputRef = useFocusedInput();
    const annotation = annotationEditorMeta.annotationIndex === undefined
        ? undefined
        : annotationAction.getAnnotation(annotationEditorMeta.annotationIndex);
    const [formState, setFormState] = useState(() =>
        createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
    );
    const sSelectedSeriesKey =
        formState.seriesValue.trim() === '' ? undefined : formState.seriesValue;
    const sCanApply =
        sSelectedSeriesKey !== undefined &&
        parseAxisInputValue(formState.timeText, isNumericXAxis) !== undefined;
    const setField = <K extends keyof AnnotationFormState>(
        field: K,
        value: AnnotationFormState[K],
    ) => setFormState((prev) => ({ ...prev, [field]: value }));
    const apply = () => {
        if (
            sSelectedSeriesKey &&
            onApplyAnnotationChange(
                formState,
                annotationEditorMeta,
                sSelectedSeriesKey,
            )
        ) {
            onApplied();
        }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') apply();
        if (event.key === 'Escape') onCancel();
    };

    return (
        <MarkupShell
            title="Edit annotation"
            className="panel-markup-modal--annotation"
            position={annotationEditorMeta.position}
            onClose={onCancel}
            actions={(
                <>
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
                </>
            )}
        >
            <label className="panel-markup-modal__field">
                Series
                <select
                    aria-label="Annotation series"
                    className="panel-markup-modal__select"
                    value={formState.seriesValue}
                    onChange={(event) => setField('seriesValue', event.target.value)}
                >
                    <option value={EMPTY_ANNOTATION_SERIES_VALUE}>
                        annotation not selected
                    </option>
                    {annotationAction.getSeriesOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            <TextField
                label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                ariaLabel={isNumericXAxis ? 'Annotation axis value' : 'Annotation time'}
                value={formState.timeText}
                placeholder={getAxisPlaceholder(isNumericXAxis)}
                onChange={(value) => setField('timeText', value)}
                onKeyDown={handleKeyDown}
            />
            <TextField
                label="Text"
                ariaLabel="Annotation text"
                inputRef={inputRef}
                value={formState.labelText}
                onChange={(value) => setField('labelText', value)}
                onKeyDown={handleKeyDown}
            />
            <ColorFields
                state={formState}
                ariaPrefix="Annotation"
                onChange={setField}
            />
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
        </MarkupShell>
    );
}

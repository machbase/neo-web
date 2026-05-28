import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Button, type ContextMenuPosition } from '@/design-system/components';
import type { PanelAnnotation, PanelHighlight } from '../../domain/PanelDomain';
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

export type HighlightEditorState = { position: ContextMenuPosition; highlightIndex: number };

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
const COLOR_FIELDS = [['fillColor', 'Fill color', 'fill'], ['textColor', 'Text color', 'text']] as const;

function MarkupModal({
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
        <PanelMarkupPopover position={position} onClose={onClose}>
            <div className={`panel-markup-modal ${className}`}>
                <div className="panel-markup-modal__title">{title}</div>
                <div className="panel-markup-modal__body">{children}</div>
                <div className="panel-markup-modal__actions">{actions}</div>
            </div>
        </PanelMarkupPopover>
    );
}

function TextField<T extends Record<string, unknown>>({
    field,
    label,
    ariaLabel,
    placeholder,
    inputRef,
    state,
    setField,
    onKeyDown,
}: {
    field: keyof T;
    label: string;
    ariaLabel?: string;
    placeholder?: string;
    inputRef?: RefObject<HTMLInputElement>;
    state: T;
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className="panel-markup-modal__field">
            {label}
            <input
                ref={inputRef}
                aria-label={ariaLabel ?? label}
                className="panel-markup-modal__input"
                placeholder={placeholder}
                value={String(state[field] ?? '')}
                onChange={(event) => setField(field, event.target.value as T[keyof T])}
                onKeyDown={onKeyDown}
            />
        </label>
    );
}

function ColorFields<T extends Record<'fillColor' | 'textColor', string>>({
    state,
    setField,
    ariaPrefix,
}: {
    state: T;
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
    ariaPrefix: string;
}) {
    return (
        <div className="panel-markup-modal__row panel-markup-modal__row--two">
            {COLOR_FIELDS.map(([field, label, ariaLabel]) => (
                <label className="panel-markup-modal__field" key={field}>
                    {label}
                    <input
                        aria-label={`${ariaPrefix} ${ariaLabel} color`}
                        className="panel-markup-modal__color-input"
                        type="color"
                        value={state[field]}
                        onChange={(event) => setField(field, event.target.value as T[typeof field])}
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

function useMarkupForm<T extends Record<string, unknown>>(
    initialState: () => T,
    apply: (state: T) => boolean,
    onCancel: () => void,
    onApplied: () => void,
) {
    const [state, setState] = useState(initialState);
    const setField = <K extends keyof T>(field: K, value: T[K]) =>
        setState((prev) => ({ ...prev, [field]: value }));
    const applyForm = () => {
        if (apply(state)) {
            onApplied();
        }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') applyForm();
        if (event.key === 'Escape') onCancel();
    };

    return { state, setField, applyForm, handleKeyDown };
}

const getAxisPlaceholder = (isNumericXAxis: boolean) => isNumericXAxis ? NUMERIC_AXIS_INPUT_FORMAT : LOCAL_DATE_TIME_INPUT_FORMAT;

const getActiveHighlight = (
    activeEditor: HighlightEditorState,
    temporaryHighlight: PanelHighlight | undefined,
    highlightActions: HighlightActions,
) => temporaryHighlight ?? highlightActions.getHighlightByIndex(activeEditor.highlightIndex);

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

function ModalActions({
    canApply,
    onCancel,
    onApply,
    deleteAction,
}: {
    canApply: boolean;
    onCancel: () => void;
    onApply: () => void;
    deleteAction?: () => void;
}) {
    return (
        <>
            {deleteAction && (
                <Button size="sm" variant="ghost" onClick={deleteAction}>
                    Delete
                </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
            <Button size="sm" disabled={!canApply} onClick={onApply}>Apply</Button>
        </>
    );
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
    const form = useMarkupForm<HighlightFormState>(
        () =>
            createHighlightFormState(
                getActiveHighlight(activeHighlightEditor, temporaryHighlight, highlightActions),
                isNumericXAxis,
            ),
        (state) => onApplyHighlightChange(state, activeHighlightEditor),
        onCancel,
        onApplied,
    );
    const { state, setField, handleKeyDown, applyForm } = form;
    const startTime = parseAxisInputValue(state.startTimeText, isNumericXAxis);
    const endTime = parseAxisInputValue(state.endTimeText, isNumericXAxis);
    const canApply = startTime !== undefined && endTime !== undefined && endTime > startTime;
    const timePlaceholder = getAxisPlaceholder(isNumericXAxis);

    return (
        <MarkupModal
            title="Edit highlight"
            className="panel-markup-modal--highlight"
            position={activeHighlightEditor.position}
            onClose={onCancel}
            actions={(
                <ModalActions canApply={canApply} onCancel={onCancel} onApply={applyForm} />
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
                {state.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL}
            </div>
        </MarkupModal>
    );
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
    const form = useMarkupForm<AnnotationFormState>(
        () => createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
        (state) => {
            const selectedSeriesKey = state.seriesValue.trim();
            return selectedSeriesKey !== '' &&
                onApplyAnnotationChange(state, annotationEditorMeta, selectedSeriesKey);
        },
        onCancel,
        onApplied,
    );
    const { state, setField, handleKeyDown, applyForm } = form;
    const selectedSeriesKey = state.seriesValue.trim();
    const canApply =
        selectedSeriesKey !== '' &&
        parseAxisInputValue(state.timeText, isNumericXAxis) !== undefined;

    return (
        <MarkupModal
            title="Edit annotation"
            className="panel-markup-modal--annotation"
            position={annotationEditorMeta.position}
            onClose={onCancel}
            actions={(
                <ModalActions
                    canApply={canApply}
                    onCancel={onCancel}
                    onApply={applyForm}
                    deleteAction={annotation && (() => {
                        onDeleteAnnotation(annotationEditorMeta);
                        onApplied();
                    })}
                />
            )}
        >
            <label className="panel-markup-modal__field">
                Series
                <select
                    aria-label="Annotation series"
                    className="panel-markup-modal__select"
                    value={state.seriesValue}
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
                field="timeText"
                label={isNumericXAxis ? 'Axis value' : 'Time (Local)'}
                placeholder={getAxisPlaceholder(isNumericXAxis)}
                state={state}
                setField={setField}
                onKeyDown={handleKeyDown}
            />
            <TextField
                field="labelText"
                label="Text"
                inputRef={inputRef}
                state={state}
                setField={setField}
                onKeyDown={handleKeyDown}
            />
            <ColorFields state={state} ariaPrefix="Annotation" setField={setField} />
            <label className="panel-markup-modal__checkbox-field">
                <input
                    aria-label="Clip annotation to panel range"
                    type="checkbox"
                    checked={state.clip}
                    onChange={(event) => setField('clip', event.target.checked)}
                />
                Clip to panel range
            </label>
            <div
                className="panel-markup-modal__preview"
                style={{
                    backgroundColor: state.fillColor,
                    borderColor: state.fillColor,
                    color: state.textColor,
                }}
            >
                {state.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL}
            </div>
        </MarkupModal>
    );
}

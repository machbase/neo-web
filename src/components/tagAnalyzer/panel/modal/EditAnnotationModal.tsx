import { Dropdown } from '@/design-system/components';
import type { PanelAnnotation } from '../../domain/PanelDomain';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
} from '../../domain/SeriesDomain';
import {
    formatAxisInputValue,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';
import type {
    PanelAnnotationCrud,
    PanelAnnotationSeriesOption,
} from '../usePanelAnnotation';
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
    AnnotationEditorMetaState,
    AnnotationFormState,
} from './PanelMarkupModalTypes';

const EMPTY_ANNOTATION_SERIES_VALUE = '';
const MARKUP_DROPDOWN_MENU_CLASS = 'panel-markup-modal__dropdown-menu';

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
    const inputRef = useFocusedInput();
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

    const form = useMarkupForm<AnnotationFormState>(
        () => createAnnotationFormState(annotationEditorMeta, annotation, isNumericXAxis),
        saveAnnotation,
        onCancel,
        onApplied,
    );
    const { state, setField, handleKeyDown, applyForm } = form;
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
    function deleteAnnotation(): void {
        if (annotationIndex === undefined) {
            throw new Error('Cannot delete annotation without an annotation index.');
        }

        annotationCrud.deleteAnnotationEntry(annotationIndex);
        onApplied();
    }

    return (
        <PanelMarkupModal
            title="Edit annotation"
            className="panel-markup-modal--annotation"
            position={annotationEditorMeta.position}
            onClose={onCancel}
            draggable
            outsideCloseIgnoreSelector={`.${MARKUP_DROPDOWN_MENU_CLASS}`}
            closeOnScroll={false}
            actions={(
                <ModalActions
                    canApply={canApply}
                    onCancel={onCancel}
                    onApply={applyForm}
                    deleteAction={annotation ? deleteAnnotation : undefined}
                />
            )}
        >
            <label className="panel-markup-modal__field">
                Series
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
        </PanelMarkupModal>
    );
}

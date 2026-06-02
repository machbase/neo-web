import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../domain/SeriesDomain';
import type { PanelAnnotation } from '../domain/PanelDomain';
import {
    formatAxisInputValue,
    parseAxisInputValue,
} from '../domain/time/TimeInputFormatters';
import type {
    AnnotationEditorMetaState,
    AnnotationFormState,
} from './modal/EditAnnotationModal';

export type PanelAnnotationSeriesOption = {
    label: string;
    value: string;
};

export type PanelAnnotationAction = {
    getAnnotation: (annotationIndex: number) => PanelAnnotation;
    getSeriesOptions: () => PanelAnnotationSeriesOption[];
    addAnnotationEntry: (annotation: PanelAnnotation) => void;
    updateAnnotationEntry: (
        annotationIndex: number,
        annotation: PanelAnnotation,
    ) => void;
    deleteAnnotationEntry: (annotationIndex: number) => void;
};

export function usePanelAnnotation({
    annotations,
    seriesList,
    isNumericXAxis,
    onSaveAnnotations,
}: {
    annotations: PanelAnnotation[];
    seriesList: PanelSeriesDefinition[];
    isNumericXAxis: boolean;
    onSaveAnnotations: (annotations: PanelAnnotation[]) => void;
}): {
    annotationAction: PanelAnnotationAction;
    applyAnnotationChange: (
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesKey: string,
    ) => boolean;
    deletePanelAnnotation: (editorMeta: AnnotationEditorMetaState) => void;
} {
    const annotationAction = createPanelAnnotationAction({
        annotations,
        seriesList,
        onSaveAnnotations,
    });

    function applyAnnotationChange(
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesKey: string,
    ): boolean {
        const sAnnotationTimestamp = parseAxisInputValue(
            formState.timeText,
            isNumericXAxis,
        );

        if (sAnnotationTimestamp === undefined) {
            return false;
        }

        const sAnnotationIndex = annotationEditorMeta.annotationIndex;
        const sExistingAnnotation =
            sAnnotationIndex !== undefined
                ? annotationAction.getAnnotation(sAnnotationIndex)
                : undefined;

        const sInitialTimeRange = sExistingAnnotation?.timeRange;
        const sOriginalTimeText = sInitialTimeRange
            ? formatAxisInputValue(sInitialTimeRange.startTime, isNumericXAxis)
            : undefined;
        const sShouldPreserveExistingRange =
            sInitialTimeRange !== undefined && sOriginalTimeText === formState.timeText;
        const sNextAnnotationTimeRange =
            sShouldPreserveExistingRange && sInitialTimeRange
                ? sInitialTimeRange
                : {
                      startTime: sAnnotationTimestamp,
                      endTime: sAnnotationTimestamp,
                  };
        const sNextAnnotation: PanelAnnotation = {
            seriesKey: selectedSeriesKey,
            text: formState.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL,
            timeRange: { ...sNextAnnotationTimeRange },
            fillColor: formState.fillColor || DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: formState.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: formState.clip,
        };

        if (sAnnotationIndex === undefined) {
            annotationAction.addAnnotationEntry(sNextAnnotation);
            return true;
        }

        annotationAction.updateAnnotationEntry(sAnnotationIndex, sNextAnnotation);
        return true;
    }

    function deletePanelAnnotation(editorMeta: AnnotationEditorMetaState): void {
        if (editorMeta.annotationIndex === undefined) {
            throw new Error('Cannot delete annotation without an annotation index.');
        }

        annotationAction.deleteAnnotationEntry(editorMeta.annotationIndex);
    }

    return {
        annotationAction,
        applyAnnotationChange,
        deletePanelAnnotation,
    };
}

function createPanelAnnotationAction({
    annotations,
    seriesList,
    onSaveAnnotations,
}: {
    annotations: PanelAnnotation[];
    seriesList: PanelSeriesDefinition[];
    onSaveAnnotations: (annotations: PanelAnnotation[]) => void;
}): PanelAnnotationAction {
    function getAnnotation(annotationIndex: number): PanelAnnotation {
        const sAnnotation = annotations[annotationIndex];

        if (!sAnnotation) {
            throw new Error(`Expected annotation at index ${annotationIndex}.`);
        }

        return sAnnotation;
    }

    function getSeriesOptions(): PanelAnnotationSeriesOption[] {
        return seriesList.map((seriesInfo) => ({
            label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
            value: seriesInfo.key,
        }));
    }

    function addAnnotationEntry(annotation: PanelAnnotation): void {
        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        onSaveAnnotations([...annotations, { ...annotation }]);
    }

    function updateAnnotationEntry(
        annotationIndex: number,
        annotation: PanelAnnotation,
    ): void {
        getAnnotation(annotationIndex);

        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        onSaveAnnotations(
            annotations.map((currentAnnotation, currentAnnotationIndex) =>
                currentAnnotationIndex === annotationIndex
                    ? { ...annotation }
                    : currentAnnotation,
            ),
        );
    }

    function deleteAnnotationEntry(annotationIndex: number): void {
        getAnnotation(annotationIndex);

        onSaveAnnotations(
            annotations.filter(
                (_annotation, currentAnnotationIndex) =>
                    currentAnnotationIndex !== annotationIndex,
            ),
        );
    }

    return {
        getAnnotation,
        getSeriesOptions,
        addAnnotationEntry,
        updateAnnotationEntry,
        deleteAnnotationEntry,
    };
}

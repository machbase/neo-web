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
    getAnnotation: (annotationIndex: number) => PanelAnnotation | undefined;
    getSeriesOptions: () => PanelAnnotationSeriesOption[];
    addAnnotationEntry: (annotation: PanelAnnotation) => boolean;
    updateAnnotationEntry: (
        annotationIndex: number,
        annotation: PanelAnnotation,
    ) => boolean;
    deleteAnnotationEntry: (annotationIndex: number) => boolean;
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
        selectedSeriesKey: string | undefined,
    ) => boolean;
    deletePanelAnnotation: (editorMeta: AnnotationEditorMetaState | undefined) => void;
} {
    const annotationAction = createPanelAnnotationAction({
        annotations,
        seriesList,
        onSaveAnnotations,
    });

    function applyAnnotationChange(
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesKey: string | undefined,
    ): boolean {
        const sAnnotationTimestamp = parseAxisInputValue(
            formState.timeText,
            isNumericXAxis,
        );

        if (selectedSeriesKey === undefined || sAnnotationTimestamp === undefined) {
            return false;
        }

        const sAnnotationIndex = annotationEditorMeta.annotationIndex;
        const sExistingAnnotation =
            sAnnotationIndex !== undefined
                ? annotationAction.getAnnotation(sAnnotationIndex)
                : undefined;

        if (sAnnotationIndex !== undefined && !sExistingAnnotation) {
            return false;
        }

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
            return annotationAction.addAnnotationEntry(sNextAnnotation);
        }

        return annotationAction.updateAnnotationEntry(
            sAnnotationIndex,
            sNextAnnotation,
        );
    }

    function deletePanelAnnotation(
        editorMeta: AnnotationEditorMetaState | undefined,
    ): void {
        if (!editorMeta || editorMeta.annotationIndex === undefined) {
            return;
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
    function getAnnotation(annotationIndex: number): PanelAnnotation | undefined {
        return annotations[annotationIndex];
    }

    function getSeriesOptions(): PanelAnnotationSeriesOption[] {
        return seriesList.map((seriesInfo) => ({
            label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
            value: seriesInfo.key,
        }));
    }

    function addAnnotationEntry(annotation: PanelAnnotation): boolean {
        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            return false;
        }

        onSaveAnnotations([...annotations, { ...annotation }]);
        return true;
    }

    function updateAnnotationEntry(
        annotationIndex: number,
        annotation: PanelAnnotation,
    ): boolean {
        if (!annotations[annotationIndex]) {
            return false;
        }

        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            return false;
        }

        onSaveAnnotations(
            annotations.map((currentAnnotation, currentAnnotationIndex) =>
                currentAnnotationIndex === annotationIndex
                    ? { ...annotation }
                    : currentAnnotation,
            ),
        );
        return true;
    }

    function deleteAnnotationEntry(annotationIndex: number): boolean {
        if (!annotations[annotationIndex]) {
            return false;
        }

        onSaveAnnotations(
            annotations.filter(
                (_annotation, currentAnnotationIndex) =>
                    currentAnnotationIndex !== annotationIndex,
            ),
        );
        return true;
    }

    return {
        getAnnotation,
        getSeriesOptions,
        addAnnotationEntry,
        updateAnnotationEntry,
        deleteAnnotationEntry,
    };
}

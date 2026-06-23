import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { PanelAnnotation } from '../domain/PanelDomain';

export type PanelAnnotationSeriesOption = {
    label: string;
    value: string;
};

export type PanelAnnotationCrud = {
    getAnnotation: (annotationIndex: number) => PanelAnnotation;
    addAnnotationEntry: (annotation: PanelAnnotation) => void;
    updateAnnotationEntry: (annotationIndex: number, annotation: PanelAnnotation) => void;
    deleteAnnotationEntry: (annotationIndex: number) => void;
};

export function usePanelAnnotation(
    annotations: PanelAnnotation[],
    seriesList: PanelSeriesDefinition[],
    onSaveAnnotations: (annotations: PanelAnnotation[]) => void,
): {
    annotationCrud: PanelAnnotationCrud;
    annotationSeriesOptions: PanelAnnotationSeriesOption[];
} {
    return {
        annotationCrud: createPanelAnnotationCrud(
            annotations,
            seriesList,
            onSaveAnnotations,
        ),
        annotationSeriesOptions: createPanelAnnotationSeriesOptions(seriesList),
    };
}

function createPanelAnnotationSeriesOptions(
    seriesList: PanelSeriesDefinition[],
): PanelAnnotationSeriesOption[] {
    return seriesList.map((seriesInfo) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: seriesInfo.key,
    }));
}

function createPanelAnnotationCrud(
    annotations: PanelAnnotation[],
    seriesList: PanelSeriesDefinition[],
    onSaveAnnotations: (annotations: PanelAnnotation[]) => void,
): PanelAnnotationCrud {
    function getAnnotation(annotationIndex: number): PanelAnnotation {
        const sAnnotation = annotations[annotationIndex];

        if (!sAnnotation) {
            throw new Error(`Expected annotation at index ${annotationIndex}.`);
        }

        return sAnnotation;
    }

    function addAnnotationEntry(annotation: PanelAnnotation): void {
        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        onSaveAnnotations([...annotations, { ...annotation }]);
    }

    function updateAnnotationEntry(annotationIndex: number, annotation: PanelAnnotation): void {
        getAnnotation(annotationIndex);

        if (!seriesList.some((seriesInfo) => seriesInfo.key === annotation.seriesKey)) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        onSaveAnnotations(
            annotations.map((currentAnnotation, currentAnnotationIndex) =>
                currentAnnotationIndex === annotationIndex ? { ...annotation } : currentAnnotation,
            ),
        );
    }

    function deleteAnnotationEntry(annotationIndex: number): void {
        getAnnotation(annotationIndex);

        onSaveAnnotations(
            annotations.filter(
                (_annotation, currentAnnotationIndex) => currentAnnotationIndex !== annotationIndex,
            ),
        );
    }

    return {
        getAnnotation,
        addAnnotationEntry,
        updateAnnotationEntry,
        deleteAnnotationEntry,
    };
}

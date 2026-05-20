import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
    type SeriesAnnotation,
} from '../domain/SeriesModel';
import {
    formatLocalTimestampInput,
    parseLocalTimestampInput,
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
    getAnnotation: (seriesIndex: number, annotationIndex: number) => SeriesAnnotation | undefined;
    getSeriesCount: () => number;
    getSeriesOptions: () => PanelAnnotationSeriesOption[];
    addAnnotationEntry: (seriesIndex: number, annotation: SeriesAnnotation) => boolean;
    updateAnnotationEntry: (
        seriesIndex: number,
        annotationIndex: number,
        annotation: SeriesAnnotation,
    ) => boolean;
    deleteAnnotationEntry: (seriesIndex: number, annotationIndex: number) => boolean;
    moveAnnotationEntry: (
        fromSeriesIndex: number,
        annotationIndex: number,
        toSeriesIndex: number,
        annotation: SeriesAnnotation,
    ) => boolean;
};

export function usePanelAnnotation({
    seriesList,
    onSaveSeriesList,
}: {
    seriesList: PanelSeriesDefinition[];
    onSaveSeriesList: (seriesList: PanelSeriesDefinition[]) => void;
}): {
    annotationAction: PanelAnnotationAction;
    applyAnnotationChange: (
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesIndex: number | undefined,
    ) => boolean;
    deleteSeriesAnnotation: (editorMeta: AnnotationEditorMetaState | undefined) => void;
} {
    const annotationAction = createPanelAnnotationAction({
        seriesList,
        onSaveSeriesList,
    });

    function applyAnnotationChange(
        formState: AnnotationFormState,
        annotationEditorMeta: AnnotationEditorMetaState,
        selectedSeriesIndex: number | undefined,
    ): boolean {
        const sAnnotationTimestamp = parseLocalTimestampInput(formState.timeText);

        if (selectedSeriesIndex === undefined || sAnnotationTimestamp === undefined) {
            return false;
        }

        const sCurrentSeriesIndex = annotationEditorMeta.seriesIndex;
        const sAnnotationIndex = annotationEditorMeta.annotationIndex;
        const sIsExistingAnnotation =
            sCurrentSeriesIndex !== undefined &&
            sAnnotationIndex !== undefined &&
            annotationAction.getAnnotation(sCurrentSeriesIndex, sAnnotationIndex) !== undefined;

        if (sAnnotationIndex !== undefined && !sIsExistingAnnotation) {
            return false;
        }

        const sInitialTimeRange = sIsExistingAnnotation
            ? annotationAction.getAnnotation(sCurrentSeriesIndex, sAnnotationIndex)?.timeRange
            : undefined;
        const sOriginalTimeText = sInitialTimeRange
            ? formatLocalTimestampInput(sInitialTimeRange.startTime)
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
        const sNextAnnotation: SeriesAnnotation = {
            text: formState.labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL,
            timeRange: { ...sNextAnnotationTimeRange },
            fillColor: formState.fillColor || DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: formState.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: formState.clip,
        };

        if (!sIsExistingAnnotation) {
            return annotationAction.addAnnotationEntry(selectedSeriesIndex, sNextAnnotation);
        }

        if (sCurrentSeriesIndex === undefined || sAnnotationIndex === undefined) {
            return false;
        }

        return annotationAction.moveAnnotationEntry(
            sCurrentSeriesIndex,
            sAnnotationIndex,
            selectedSeriesIndex,
            sNextAnnotation,
        );
    }

    function deleteSeriesAnnotation(editorMeta: AnnotationEditorMetaState | undefined): void {
        if (
            !editorMeta ||
            editorMeta.seriesIndex === undefined ||
            editorMeta.annotationIndex === undefined
        ) {
            return;
        }

        annotationAction.deleteAnnotationEntry(editorMeta.seriesIndex, editorMeta.annotationIndex);
    }

    return {
        annotationAction,
        applyAnnotationChange,
        deleteSeriesAnnotation,
    };
}

function createPanelAnnotationAction({
    seriesList,
    onSaveSeriesList,
}: {
    seriesList: PanelSeriesDefinition[];
    onSaveSeriesList: (seriesList: PanelSeriesDefinition[]) => void;
}): PanelAnnotationAction {
    function getAnnotation(
        seriesIndex: number,
        annotationIndex: number,
    ): SeriesAnnotation | undefined {
        return seriesList[seriesIndex]?.annotations?.[annotationIndex];
    }

    function getSeriesOptions(): PanelAnnotationSeriesOption[] {
        return seriesList.map((seriesInfo, seriesIndex) => ({
            label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
            value: String(seriesIndex),
        }));
    }

    function addAnnotationEntry(seriesIndex: number, annotation: SeriesAnnotation): boolean {
        if (!seriesList[seriesIndex]) {
            return false;
        }

        onSaveSeriesList(
            seriesList.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: [...(seriesInfo.annotations ?? []), { ...annotation }],
                      },
            ),
        );
        return true;
    }

    function updateAnnotationEntry(
        seriesIndex: number,
        annotationIndex: number,
        annotation: SeriesAnnotation,
    ): boolean {
        if (!seriesList[seriesIndex]?.annotations?.[annotationIndex]) {
            return false;
        }

        onSaveSeriesList(
            seriesList.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: (seriesInfo.annotations ?? []).map(
                              (currentAnnotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex === annotationIndex
                                      ? { ...annotation }
                                      : currentAnnotation,
                          ),
                      },
            ),
        );
        return true;
    }

    function deleteAnnotationEntry(seriesIndex: number, annotationIndex: number): boolean {
        if (!seriesList[seriesIndex]?.annotations?.[annotationIndex]) {
            return false;
        }

        onSaveSeriesList(
            seriesList.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: (seriesInfo.annotations ?? []).filter(
                              (_annotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex !== annotationIndex,
                          ),
                      },
            ),
        );
        return true;
    }

    function moveAnnotationEntry(
        fromSeriesIndex: number,
        annotationIndex: number,
        toSeriesIndex: number,
        annotation: SeriesAnnotation,
    ): boolean {
        if (fromSeriesIndex === toSeriesIndex) {
            return updateAnnotationEntry(fromSeriesIndex, annotationIndex, annotation);
        }

        if (
            !seriesList[fromSeriesIndex]?.annotations?.[annotationIndex] ||
            !seriesList[toSeriesIndex]
        ) {
            return false;
        }

        onSaveSeriesList(
            seriesList.map((seriesInfo, currentSeriesIndex) => {
                if (currentSeriesIndex === fromSeriesIndex) {
                    return {
                        ...seriesInfo,
                        annotations: (seriesInfo.annotations ?? []).filter(
                            (_currentAnnotation, currentAnnotationIndex) =>
                                currentAnnotationIndex !== annotationIndex,
                        ),
                    };
                }

                if (currentSeriesIndex === toSeriesIndex) {
                    return {
                        ...seriesInfo,
                        annotations: [...(seriesInfo.annotations ?? []), { ...annotation }],
                    };
                }

                return seriesInfo;
            }),
        );
        return true;
    }

    return {
        getAnnotation,
        getSeriesCount: () => seriesList.length,
        getSeriesOptions,
        addAnnotationEntry,
        updateAnnotationEntry,
        deleteAnnotationEntry,
        moveAnnotationEntry,
    };
}

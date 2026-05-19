import type {
    PanelCreateAnnotationRequest,
    PanelSeriesAnnotationEditRequest,
} from '../domain/PanelChartModel';
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
    ActiveAnnotationEditor,
    AnnotationApplyContext,
    AnnotationFormState,
} from './modal/EditAnnotationModal';
import type { PanelActiveMarkupEditor } from './usePanelOverlayState';

export type PanelAnnotationSeriesOption = {
    label: string;
    value: string;
};

export type PanelAnnotationAction = {
    getAnnotation: (
        seriesIndex: number,
        annotationIndex: number,
    ) => SeriesAnnotation | undefined;
    getSeriesCount: () => number;
    getSeriesOptions: () => PanelAnnotationSeriesOption[];
    addAnnotation: (
        seriesIndex: number,
        annotation: SeriesAnnotation,
    ) => boolean;
    setAnnotation: (
        seriesIndex: number,
        annotationIndex: number,
        annotation: SeriesAnnotation,
    ) => boolean;
    deleteAnnotation: (seriesIndex: number, annotationIndex: number) => boolean;
    moveAnnotation: (
        fromSeriesIndex: number,
        annotationIndex: number,
        toSeriesIndex: number,
        annotation: SeriesAnnotation,
    ) => boolean;
};

export type PanelAnnotationEditor = {
    activeEditor: ActiveAnnotationEditor | undefined;
    annotationAction: PanelAnnotationAction;
    onApplyAnnotationChange: (
        formState: AnnotationFormState,
        context: AnnotationApplyContext,
    ) => boolean;
    onDeleteAnnotation: (activeEditor: ActiveAnnotationEditor | undefined) => void;
    onCancel: () => void;
    onApplied: () => void;
};

export function usePanelAnnotation({
    seriesList,
    activeAnnotationEditor,
    onActiveMarkupEditorChange,
    onCloseAnnotationMode,
    onSaveSeriesList,
}: {
    seriesList: PanelSeriesDefinition[];
    activeAnnotationEditor:
        | Extract<PanelActiveMarkupEditor, { type: 'annotation' }>
        | undefined;
    onActiveMarkupEditorChange: (
        activeMarkupEditor: PanelActiveMarkupEditor | undefined,
    ) => void;
    onCloseAnnotationMode: () => void;
    onSaveSeriesList: (seriesList: PanelSeriesDefinition[]) => void;
}): {
    annotationEditor: PanelAnnotationEditor;
    openCreateAnnotationEditor: (request: PanelCreateAnnotationRequest) => void;
    openAnnotationEditor: (request: PanelSeriesAnnotationEditRequest) => void;
} {
    const annotationAction = createPanelAnnotationAction({
        seriesList,
        onSaveSeriesList,
    });

    function openCreateAnnotationEditor(request: PanelCreateAnnotationRequest): void {
        const sSeriesIndex =
            request.seriesIndex !== undefined &&
            request.seriesIndex >= 0 &&
            request.seriesIndex < annotationAction.getSeriesCount()
                ? request.seriesIndex
                : undefined;

        onActiveMarkupEditorChange({
            type: 'annotation',
            editor: {
                position: request.position,
                seriesIndex: sSeriesIndex,
                timestamp: request.timestamp,
            },
        });
    }

    function openAnnotationEditor(request: PanelSeriesAnnotationEditRequest): void {
        if (
            !annotationAction.getAnnotation(
                request.seriesIndex,
                request.annotationIndex,
            )
        ) {
            return;
        }

        onActiveMarkupEditorChange({
            type: 'annotation',
            editor: {
                position: request.position,
                seriesIndex: request.seriesIndex,
                annotationIndex: request.annotationIndex,
            },
        });
    }

    function cancelAnnotationEditor(): void {
        if (activeAnnotationEditor) {
            onActiveMarkupEditorChange(undefined);
        }
    }

    function applyAnnotationChange(
        formState: AnnotationFormState,
        context: AnnotationApplyContext,
    ): boolean {
        const sSeriesIndex = context.seriesIndex;
        const sAnnotationTimestamp = parseLocalTimestampInput(formState.timeText);

        if (sSeriesIndex === undefined || sAnnotationTimestamp === undefined) {
            return false;
        }

        const sCurrentSeriesIndex = context.activeAnnotationEditor.seriesIndex;
        const sAnnotationIndex = context.activeAnnotationEditor.annotationIndex;
        const sIsExistingAnnotation =
            sCurrentSeriesIndex !== undefined &&
            sAnnotationIndex !== undefined &&
            annotationAction.getAnnotation(sCurrentSeriesIndex, sAnnotationIndex) !==
                undefined;

        if (sAnnotationIndex !== undefined && !sIsExistingAnnotation) {
            return false;
        }

        const sInitialTimeRange = sIsExistingAnnotation
            ? annotationAction.getAnnotation(sCurrentSeriesIndex, sAnnotationIndex)
                  ?.timeRange
            : undefined;
        const sOriginalTimeText = sInitialTimeRange
            ? formatLocalTimestampInput(sInitialTimeRange.startTime)
            : undefined;
        const sShouldPreserveExistingRange =
            sInitialTimeRange !== undefined &&
            sOriginalTimeText === formState.timeText;
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
            fillColor:
                formState.fillColor || DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor:
                formState.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            ...(formState.clip ? { clip: true } : {}),
        };

        if (!sIsExistingAnnotation) {
            return annotationAction.addAnnotation(sSeriesIndex, sNextAnnotation);
        }

        if (sCurrentSeriesIndex === undefined || sAnnotationIndex === undefined) {
            return false;
        }

        return annotationAction.moveAnnotation(
            sCurrentSeriesIndex,
            sAnnotationIndex,
            sSeriesIndex,
            sNextAnnotation,
        );
    }

    function deleteSeriesAnnotation(activeEditor: ActiveAnnotationEditor | undefined): void {
        if (
            !activeEditor ||
            activeEditor.seriesIndex === undefined ||
            activeEditor.annotationIndex === undefined
        ) {
            return;
        }

        annotationAction.deleteAnnotation(
            activeEditor.seriesIndex,
            activeEditor.annotationIndex,
        );
    }

    return {
        annotationEditor: {
            activeEditor: activeAnnotationEditor?.editor,
            annotationAction,
            onApplyAnnotationChange: applyAnnotationChange,
            onDeleteAnnotation: deleteSeriesAnnotation,
            onCancel: () => {
                cancelAnnotationEditor();
                onCloseAnnotationMode();
            },
            onApplied: () => {
                onActiveMarkupEditorChange(undefined);
                onCloseAnnotationMode();
            },
        },
        openCreateAnnotationEditor,
        openAnnotationEditor,
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

    function addAnnotation(
        seriesIndex: number,
        annotation: SeriesAnnotation,
    ): boolean {
        if (!seriesList[seriesIndex]) {
            return false;
        }

        onSaveSeriesList(
            seriesList.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: [
                              ...(seriesInfo.annotations ?? []),
                              { ...annotation },
                          ],
                      },
            ),
        );
        return true;
    }

    function setAnnotation(
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

    function deleteAnnotation(
        seriesIndex: number,
        annotationIndex: number,
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
                          annotations: (seriesInfo.annotations ?? []).filter(
                              (_annotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex !== annotationIndex,
                          ),
                      },
            ),
        );
        return true;
    }

    function moveAnnotation(
        fromSeriesIndex: number,
        annotationIndex: number,
        toSeriesIndex: number,
        annotation: SeriesAnnotation,
    ): boolean {
        if (fromSeriesIndex === toSeriesIndex) {
            return setAnnotation(fromSeriesIndex, annotationIndex, annotation);
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
                        annotations: [
                            ...(seriesInfo.annotations ?? []),
                            { ...annotation },
                        ],
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
        addAnnotation,
        setAnnotation,
        deleteAnnotation,
        moveAnnotation,
    };
}

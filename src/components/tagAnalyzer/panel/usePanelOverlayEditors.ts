import type { MutableRefObject } from 'react';
import type { PanelHighlight, PanelInfo } from '../domain/PanelModel';
import {
    formatLocalTimestampInput,
    parseLocalTimestampInput,
} from '../domain/time/TimeInputFormatters';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
    type SeriesAnnotation,
} from '../domain/SeriesModel';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import type {
    PanelCreateAnnotationRequest,
    PanelHighlightEditRequest,
    PanelMarkupHandlers,
    PanelOverlayModeDispatch,
    PanelSeriesAnnotationEditRequest,
} from './PanelTypes';
import type {
    ActiveAnnotationEditor,
    AnnotationApplyContext,
    AnnotationFormState,
} from './modal/EditAnnotationModal';
import {
    DEFAULT_HIGHLIGHT_LABEL,
    type ActiveHighlightEditor,
    type HighlightFormState,
} from './modal/EditHighlightModal';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
} from '../domain/PanelModel';

export type PanelAnnotationEditorStateAndActions = {
    activeEditor: ActiveAnnotationEditor | undefined;
    annotation: SeriesAnnotation | undefined;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    onApplyAnnotationChange: (
        formState: AnnotationFormState,
        context: AnnotationApplyContext,
    ) => boolean;
    onDeleteAnnotation: (activeEditor: ActiveAnnotationEditor | undefined) => void;
    onCancel: () => void;
    onApplied: () => void;
};

export type PanelHighlightEditorStateAndActions = {
    activeEditor: ActiveHighlightEditor | undefined;
    highlight: PanelHighlight | undefined;
    onApplyHighlightChange: (
        formState: HighlightFormState,
        activeEditor: ActiveHighlightEditor,
    ) => boolean;
    onCancel: () => void;
    onApplied: () => void;
};

export type PanelActiveMarkupEditor =
    | {
          type: 'highlight';
          editor: ActiveHighlightEditor;
          temporaryHighlight?: PanelHighlight | undefined;
      }
    | {
          type: 'annotation';
          editor: ActiveAnnotationEditor;
      };

function withPanelMarkup(
    panelInfo: PanelInfo,
    highlights: PanelHighlight[],
    seriesList: PanelSeriesDefinition[],
): PanelInfo {
    return {
        ...panelInfo,
        highlights: highlights,
        data: {
            ...panelInfo.data,
            tag_set: seriesList,
        },
    };
}

function buildAnnotationSeriesOptions(tagSet: PanelSeriesDefinition[]) {
    return tagSet.map((seriesInfo, seriesIndex) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: String(seriesIndex),
    }));
}

function appendSeriesAnnotationWithRangeToSeriesList(
    seriesList: PanelSeriesDefinition[],
    seriesIndex: number,
    timeRange: TimeRangeMs,
    labelText: string,
    fillColor: string = DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    textColor: string = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    clip = false,
): PanelSeriesDefinition[] | undefined {
    const sSeriesInfo = seriesList[seriesIndex];

    if (!sSeriesInfo) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL;

    return seriesList.map((seriesInfo, currentSeriesIndex) =>
        currentSeriesIndex !== seriesIndex
            ? seriesInfo
            : {
                  ...seriesInfo,
                  annotations: [
                      ...(seriesInfo.annotations ?? []),
                      {
                          text: sNextLabelText,
                          timeRange: { ...timeRange },
                          fillColor: fillColor,
                          textColor: textColor,
                          ...(clip ? { clip: true } : {}),
                      },
                  ],
              },
    );
}

function updateSeriesAnnotationInSeriesList(
    seriesList: PanelSeriesDefinition[],
    seriesIndex: number,
    annotationIndex: number,
    timeRange: TimeRangeMs,
    labelText: string,
    fillColor: string = DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    textColor: string = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    clip = false,
): PanelSeriesDefinition[] | undefined {
    const sSeriesInfo = seriesList[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_SERIES_ANNOTATION_LABEL;

    return seriesList.map((seriesInfo, currentSeriesIndex) =>
        currentSeriesIndex !== seriesIndex
            ? seriesInfo
            : {
                  ...seriesInfo,
                  annotations: (seriesInfo.annotations ?? []).map(
                      (annotation, currentAnnotationIndex) => {
                          const { clip: _clip, ...sAnnotationWithoutClip } = annotation;

                          return currentAnnotationIndex === annotationIndex
                              ? {
                                    ...sAnnotationWithoutClip,
                                    text: sNextLabelText,
                                    timeRange: { ...timeRange },
                                    fillColor: fillColor,
                                    textColor: textColor,
                                    ...(clip ? { clip: true } : {}),
                                }
                              : annotation;
                      },
                  ),
              },
    );
}

function removeSeriesAnnotationFromSeriesList(
    seriesList: PanelSeriesDefinition[],
    seriesIndex: number,
    annotationIndex: number,
): PanelSeriesDefinition[] | undefined {
    const sSeriesInfo = seriesList[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    return seriesList.map((seriesInfo, currentSeriesIndex) =>
        currentSeriesIndex !== seriesIndex
            ? seriesInfo
            : {
                  ...seriesInfo,
                  annotations: (seriesInfo.annotations ?? []).filter(
                      (_annotation, currentAnnotationIndex) =>
                          currentAnnotationIndex !== annotationIndex,
                  ),
              },
    );
}

export function usePanelOverlayEditors({
    panelInfo,
    chartAreaRef,
    onSavePanel,
    activeMarkupEditor,
    onActiveMarkupEditorChange,
}: {
    panelInfo: PanelInfo;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    onSavePanel: (panelInfo: PanelInfo) => void;
    activeMarkupEditor: PanelActiveMarkupEditor | undefined;
    onActiveMarkupEditorChange: (
        activeMarkupEditor: PanelActiveMarkupEditor | undefined,
    ) => void;
}) {
    const savedPanelHighlights = panelInfo.highlights ?? [];
    const panelHighlights =
        activeMarkupEditor?.type === 'highlight' &&
        activeMarkupEditor.temporaryHighlight
            ? [
                  ...savedPanelHighlights,
                  activeMarkupEditor.temporaryHighlight,
              ]
            : savedPanelHighlights;
    const panelSeriesList = panelInfo.data.tag_set;

    function savePanelWithMarkup(
        nextHighlights?: PanelHighlight[],
        nextSeriesList?: PanelSeriesDefinition[],
    ) {
        onSavePanel(
            withPanelMarkup(
                panelInfo,
                nextHighlights ?? savedPanelHighlights,
                nextSeriesList ?? panelSeriesList,
            ),
        );
    }

    function getChartCenterPosition() {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            return { x: 0, y: 0 };
        }

        return {
            x: sChartRect.left + sChartRect.width / 2,
            y: sChartRect.top + sChartRect.height / 2,
        };
    }

    function cancelHighlightEditor() {
        if (activeMarkupEditor?.type === 'highlight') {
            onActiveMarkupEditorChange(undefined);
        }
    }

    function cancelAnnotationEditor() {
        if (activeMarkupEditor?.type === 'annotation') {
            onActiveMarkupEditorChange(undefined);
        }
    }

    function handleHighlightSelection(
        startTime: number,
        endTime: number,
        onCloseContextMenu: () => void,
        dispatchOverlayModeCommand: PanelOverlayModeDispatch,
    ) {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        onCloseContextMenu();
        dispatchOverlayModeCommand({ type: 'close-annotation' });
        const sTemporaryHighlight = {
            text: DEFAULT_HIGHLIGHT_LABEL,
            timeRange: {
                startTime: sStartTime,
                endTime: sEndTime,
            },
            fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
            textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        };

        onActiveMarkupEditorChange({
            type: 'highlight',
            editor: {
                position: getChartCenterPosition(),
                highlightIndex: savedPanelHighlights.length,
            },
            temporaryHighlight: sTemporaryHighlight,
        });
    }

    function handleOpenHighlightEditor(
        request: PanelHighlightEditRequest,
        onCloseContextMenu: () => void,
        dispatchOverlayModeCommand: PanelOverlayModeDispatch,
    ) {
        onCloseContextMenu();
        dispatchOverlayModeCommand({ type: 'close-annotation' });
        onActiveMarkupEditorChange({
            type: 'highlight',
            editor: {
                position: request.position,
                highlightIndex: request.highlightIndex,
            },
        });
    }

    function handleOpenSeriesAnnotationEditor(
        request: PanelSeriesAnnotationEditRequest,
        onCloseContextMenu: () => void,
        dispatchOverlayModeCommand: PanelOverlayModeDispatch,
    ) {
        if (!panelSeriesList[request.seriesIndex]?.annotations?.[request.annotationIndex]) {
            return;
        }

        onCloseContextMenu();
        dispatchOverlayModeCommand({ type: 'close-annotation' });
        onActiveMarkupEditorChange({
            type: 'annotation',
            editor: {
                position: request.position,
                seriesIndex: request.seriesIndex,
                annotationIndex: request.annotationIndex,
            },
        });
    }

    function handleOpenCreateAnnotation(
        request: PanelCreateAnnotationRequest,
        isAnnotationActive: boolean,
        onCloseContextMenu: () => void,
    ) {
        if (!isAnnotationActive) {
            return;
        }

        onCloseContextMenu();
        const sSeriesIndex =
            request.seriesIndex !== undefined &&
            request.seriesIndex >= 0 &&
            request.seriesIndex < panelSeriesList.length
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

    function applyHighlightChange(
        formState: HighlightFormState,
        activeHighlightEditor: ActiveHighlightEditor,
    ): boolean {
        const sHighlightIndex = activeHighlightEditor.highlightIndex;
        const sIsTemporaryHighlight =
            activeMarkupEditor?.type === 'highlight' &&
            activeMarkupEditor.temporaryHighlight !== undefined &&
            sHighlightIndex === savedPanelHighlights.length;

        if (!savedPanelHighlights[sHighlightIndex] && !sIsTemporaryHighlight) {
            return true;
        }

        const sNextLabelText =
            formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextStartTime = parseLocalTimestampInput(formState.startTimeText);
        const sNextEndTime = parseLocalTimestampInput(formState.endTimeText);

        if (
            sNextStartTime === undefined ||
            sNextEndTime === undefined ||
            sNextEndTime <= sNextStartTime
        ) {
            return false;
        }

        const sBaseHighlight =
            savedPanelHighlights[sHighlightIndex] ??
            (activeMarkupEditor?.type === 'highlight'
                ? activeMarkupEditor.temporaryHighlight
                : undefined);
        const sNextHighlight = {
            ...sBaseHighlight,
            text: sNextLabelText,
            timeRange: {
                startTime: sNextStartTime,
                endTime: sNextEndTime,
            },
            fillColor: formState.fillColor,
            textColor: formState.textColor,
        };
        const sNextHighlights = sIsTemporaryHighlight
            ? [...savedPanelHighlights, sNextHighlight]
            : savedPanelHighlights.map((highlight, highlightIndex) =>
                  highlightIndex === sHighlightIndex ? sNextHighlight : highlight,
              );

        savePanelWithMarkup(sNextHighlights);
        return true;
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
            panelSeriesList[sCurrentSeriesIndex]?.annotations?.[sAnnotationIndex] !== undefined;

        if (
            sAnnotationIndex !== undefined &&
            !sIsExistingAnnotation
        ) {
            return false;
        }

        const sInitialTimeRange = sIsExistingAnnotation
            ? panelSeriesList[sCurrentSeriesIndex]
                  ?.annotations?.[sAnnotationIndex]?.timeRange
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
        const sNextSeriesList =
            !sIsExistingAnnotation
                ? appendSeriesAnnotationWithRangeToSeriesList(
                      panelSeriesList,
                      sSeriesIndex,
                      sNextAnnotationTimeRange,
                      formState.labelText,
                      formState.fillColor,
                      formState.textColor,
                      formState.clip,
                  )
                : sSeriesIndex === sCurrentSeriesIndex
                ? updateSeriesAnnotationInSeriesList(
                      panelSeriesList,
                      sSeriesIndex,
                      sAnnotationIndex,
                      sNextAnnotationTimeRange,
                      formState.labelText,
                      formState.fillColor,
                      formState.textColor,
                      formState.clip,
                  )
                : (() => {
                      const sSeriesListWithoutAnnotation = removeSeriesAnnotationFromSeriesList(
                          panelSeriesList,
                          sCurrentSeriesIndex,
                          sAnnotationIndex,
                      );

                      return sSeriesListWithoutAnnotation
                          ? appendSeriesAnnotationWithRangeToSeriesList(
                                sSeriesListWithoutAnnotation,
                                sSeriesIndex,
                                sNextAnnotationTimeRange,
                                formState.labelText,
                                formState.fillColor,
                                formState.textColor,
                                formState.clip,
                            )
                          : undefined;
                  })();

        if (!sNextSeriesList) {
            return false;
        }

        savePanelWithMarkup(undefined, sNextSeriesList);
        return true;
    }

    function deleteSeriesAnnotation(activeEditor: ActiveAnnotationEditor | undefined) {
        if (
            !activeEditor ||
            activeEditor.seriesIndex === undefined ||
            activeEditor.annotationIndex === undefined
        ) {
            return;
        }

        const sNextSeriesList = removeSeriesAnnotationFromSeriesList(
            panelSeriesList,
            activeEditor.seriesIndex,
            activeEditor.annotationIndex,
        );

        if (!sNextSeriesList) {
            return;
        }

        savePanelWithMarkup(undefined, sNextSeriesList);
    }

    function createChartMarkupActions({
        isAnnotationActive,
        dispatchOverlayModeCommand,
        onCloseContextMenu,
    }: {
        isAnnotationActive: boolean;
        dispatchOverlayModeCommand: PanelOverlayModeDispatch;
        onCloseContextMenu: () => void;
    }): {
        chartMarkupHandlers: PanelMarkupHandlers;
        onHighlightSelection: (startTime: number, endTime: number) => void;
    } {
        return {
            chartMarkupHandlers: {
                onOpenCreateAnnotation: (request) =>
                    handleOpenCreateAnnotation(
                        request,
                        isAnnotationActive,
                        onCloseContextMenu,
                    ),
                onActivateHighlightEditor: (request) =>
                    handleOpenHighlightEditor(
                        request,
                        onCloseContextMenu,
                        dispatchOverlayModeCommand,
                    ),
                onActivateAnnotationEditor: (request) =>
                    handleOpenSeriesAnnotationEditor(
                        request,
                        onCloseContextMenu,
                        dispatchOverlayModeCommand,
                    ),
            },
            onHighlightSelection: (startTime, endTime) =>
                handleHighlightSelection(
                    startTime,
                    endTime,
                    onCloseContextMenu,
                    dispatchOverlayModeCommand,
                ),
        };
    }

    function createOverlayEditorActions({
        dispatchOverlayModeCommand,
    }: {
        dispatchOverlayModeCommand: PanelOverlayModeDispatch;
    }): {
        highlightEditor: PanelHighlightEditorStateAndActions;
        editAnnotation: PanelAnnotationEditorStateAndActions;
    } {
        return {
            highlightEditor: {
                activeEditor:
                    activeMarkupEditor?.type === 'highlight'
                        ? activeMarkupEditor.editor
                        : undefined,
                highlight:
                    activeMarkupEditor?.type === 'highlight'
                        ? panelHighlights[activeMarkupEditor.editor.highlightIndex]
                        : undefined,
                onApplyHighlightChange: applyHighlightChange,
                onCancel: cancelHighlightEditor,
                onApplied: () => onActiveMarkupEditorChange(undefined),
            },
            editAnnotation: {
                activeEditor:
                    activeMarkupEditor?.type === 'annotation'
                        ? activeMarkupEditor.editor
                        : undefined,
                annotation:
                    activeMarkupEditor?.type === 'annotation' &&
                    activeMarkupEditor.editor.seriesIndex !== undefined &&
                    activeMarkupEditor.editor.annotationIndex !== undefined
                        ? panelSeriesList[activeMarkupEditor.editor.seriesIndex]
                              ?.annotations?.[activeMarkupEditor.editor.annotationIndex]
                        : undefined,
                seriesOptions: buildAnnotationSeriesOptions(panelSeriesList),
                onApplyAnnotationChange: applyAnnotationChange,
                onDeleteAnnotation: deleteSeriesAnnotation,
                onCancel: () => {
                    cancelAnnotationEditor();
                    dispatchOverlayModeCommand({ type: 'close-annotation' });
                },
                onApplied: () => {
                    onActiveMarkupEditorChange(undefined);
                    dispatchOverlayModeCommand({ type: 'close-annotation' });
                },
            },
        };
    }

    return {
        panelHighlights,
        createChartMarkupActions,
        createOverlayEditorActions,
    };
}

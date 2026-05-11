import { useState, type MutableRefObject } from 'react';
import type { PanelHighlight, PanelInfo } from '../domain/PanelModel';
import {
    appendSeriesAnnotationWithRangeToSeriesList,
    buildAnnotationSeriesOptions,
    removeSeriesAnnotationFromSeriesList,
    updateSeriesAnnotationInSeriesList,
} from './PanelAnnotationUtils';
import {
    formatUtcTimestampInput,
    parseUtcTimestampInput,
} from '../time/TimeInputFormatters';
import type { PanelSeriesDefinition, SeriesAnnotation } from '../domain/SeriesModel';
import type {
    PanelCreateAnnotationRequest,
    PanelHighlightEditRequest,
    PanelMarkupHandlers,
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

export function usePanelOverlayEditors({
    panelInfo,
    chartAreaRef,
    onPanelInfoChange,
    onSavePanel,
}: {
    panelInfo: PanelInfo;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    onPanelInfoChange: (panelInfo: PanelInfo) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
}) {
    const [activeHighlightEditor, setActiveHighlightEditor] = useState<
        ActiveHighlightEditor | undefined
    >(undefined);
    const [activeAnnotationEditor, setActiveAnnotationEditor] = useState<
        ActiveAnnotationEditor | undefined
    >(undefined);
    const panelHighlights = panelInfo.highlights ?? [];
    const panelSeriesList = panelInfo.data.tag_set;

    function removeTemporaryHighlightsFrom(highlights: PanelHighlight[]) {
        if (
            !activeHighlightEditor?.deleteOnCancel ||
            !highlights[activeHighlightEditor.highlightIndex]
        ) {
            return highlights;
        }

        return highlights.filter(
            (_highlight, currentIndex) =>
                currentIndex !== activeHighlightEditor.highlightIndex,
        );
    }

    function getPanelInfoWithCurrentMarkup(
        panelInfoToSave: PanelInfo,
        seriesList: PanelSeriesDefinition[] = panelSeriesList,
    ): PanelInfo {
        return withPanelMarkup(
            panelInfoToSave,
            removeTemporaryHighlightsFrom(panelHighlights),
            seriesList,
        );
    }

    function savePanelWithMarkup(
        nextHighlights?: PanelHighlight[],
        nextSeriesList?: PanelSeriesDefinition[],
    ) {
        onSavePanel(
            withPanelMarkup(
                panelInfo,
                nextHighlights ?? removeTemporaryHighlightsFrom(panelHighlights),
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
        const sNextHighlights = removeTemporaryHighlightsFrom(panelHighlights);

        if (sNextHighlights !== panelHighlights) {
            onPanelInfoChange(withPanelMarkup(panelInfo, sNextHighlights, panelSeriesList));
        }
        setActiveHighlightEditor(undefined);
    }

    function cancelAnnotationEditor() {
        setActiveAnnotationEditor(undefined);
    }

    function closePanelEditors() {
        cancelHighlightEditor();
        cancelAnnotationEditor();
    }

    function handleHighlightSelection(
        startTime: number,
        endTime: number,
        onCloseContextMenu: () => void,
        onCloseAnnotationMode: () => void,
    ) {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        onCloseContextMenu();
        const sHighlightsForCreate = removeTemporaryHighlightsFrom(panelHighlights);
        const sHighlightIndex = sHighlightsForCreate.length;
        const sNextHighlights = [
            ...sHighlightsForCreate,
            {
                text: DEFAULT_HIGHLIGHT_LABEL,
                timeRange: {
                    startTime: sStartTime,
                    endTime: sEndTime,
                },
                fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
            },
        ];

        onPanelInfoChange(withPanelMarkup(panelInfo, sNextHighlights, panelSeriesList));
        setActiveAnnotationEditor(undefined);
        setActiveHighlightEditor({
            position: getChartCenterPosition(),
            highlightIndex: sHighlightIndex,
            deleteOnCancel: true,
        });
        onCloseAnnotationMode();
    }

    function handleOpenHighlightEditor(
        request: PanelHighlightEditRequest,
        onCloseContextMenu: () => void,
        onCloseAnnotationMode: () => void,
    ) {
        onCloseContextMenu();
        closePanelEditors();
        setActiveHighlightEditor({
            position: request.position,
            highlightIndex: request.highlightIndex,
        });
        onCloseAnnotationMode();
    }

    function handleOpenSeriesAnnotationEditor(
        request: PanelSeriesAnnotationEditRequest,
        onCloseContextMenu: () => void,
        onCloseAnnotationMode: () => void,
    ) {
        if (!panelSeriesList[request.seriesIndex]?.annotations?.[request.annotationIndex]) {
            return;
        }

        onCloseContextMenu();
        closePanelEditors();
        setActiveAnnotationEditor({
            position: request.position,
            seriesIndex: request.seriesIndex,
            annotationIndex: request.annotationIndex,
        });
        onCloseAnnotationMode();
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
        const sHighlightsAfterCleanup = removeTemporaryHighlightsFrom(panelHighlights);
        setActiveHighlightEditor(undefined);
        const sSeriesIndex =
            request.seriesIndex !== undefined &&
            request.seriesIndex >= 0 &&
            request.seriesIndex < panelSeriesList.length
                ? request.seriesIndex
                : undefined;

        if (sHighlightsAfterCleanup !== panelHighlights) {
            onPanelInfoChange(
                withPanelMarkup(panelInfo, sHighlightsAfterCleanup, panelSeriesList),
            );
        }
        setActiveAnnotationEditor({
            position: request.position,
            seriesIndex: sSeriesIndex,
            timestamp: request.timestamp,
        });
    }

    function applyHighlightChange(
        formState: HighlightFormState,
        activeHighlightEditor: ActiveHighlightEditor,
    ): boolean {
        const sHighlightIndex = activeHighlightEditor.highlightIndex;

        if (!panelHighlights[sHighlightIndex]) {
            return true;
        }

        const sNextLabelText =
            formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextStartTime = parseUtcTimestampInput(formState.startTimeText);
        const sNextEndTime = parseUtcTimestampInput(formState.endTimeText);

        if (
            sNextStartTime === undefined ||
            sNextEndTime === undefined ||
            sNextEndTime <= sNextStartTime
        ) {
            return false;
        }

        const sNextHighlights = panelHighlights.map((highlight, highlightIndex) =>
            highlightIndex === sHighlightIndex
                ? {
                      ...highlight,
                      text: sNextLabelText,
                      timeRange: {
                          startTime: sNextStartTime,
                          endTime: sNextEndTime,
                      },
                      fillColor: formState.fillColor,
                      textColor: formState.textColor,
                  }
                : highlight,
        );

        savePanelWithMarkup(sNextHighlights);
        return true;
    }

    function applyAnnotationChange(
        formState: AnnotationFormState,
        context: AnnotationApplyContext,
    ): boolean {
        const sSeriesIndex = context.seriesIndex;
        const sAnnotationTimestamp = parseUtcTimestampInput(formState.timeText);

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
            ? formatUtcTimestampInput(sInitialTimeRange.startTime)
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
        onCloseAnnotationMode,
        onCloseContextMenu,
    }: {
        isAnnotationActive: boolean;
        onCloseAnnotationMode: () => void;
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
                        onCloseAnnotationMode,
                    ),
                onActivateAnnotationEditor: (request) =>
                    handleOpenSeriesAnnotationEditor(
                        request,
                        onCloseContextMenu,
                        onCloseAnnotationMode,
                    ),
            },
            onHighlightSelection: (startTime, endTime) =>
                handleHighlightSelection(
                    startTime,
                    endTime,
                    onCloseContextMenu,
                    onCloseAnnotationMode,
                ),
        };
    }

    function createOverlayEditorActions({
        onCloseAnnotationMode,
    }: {
        onCloseAnnotationMode: () => void;
    }): {
        highlightEditor: PanelHighlightEditorStateAndActions;
        editAnnotation: PanelAnnotationEditorStateAndActions;
    } {
        return {
            highlightEditor: {
                activeEditor: activeHighlightEditor,
                highlight:
                    activeHighlightEditor !== undefined
                        ? panelHighlights[activeHighlightEditor.highlightIndex]
                        : undefined,
                onApplyHighlightChange: applyHighlightChange,
                onCancel: cancelHighlightEditor,
                onApplied: () => setActiveHighlightEditor(undefined),
            },
            editAnnotation: {
                activeEditor: activeAnnotationEditor,
                annotation:
                    activeAnnotationEditor?.seriesIndex !== undefined &&
                    activeAnnotationEditor.annotationIndex !== undefined
                        ? panelSeriesList[activeAnnotationEditor.seriesIndex]
                              ?.annotations?.[activeAnnotationEditor.annotationIndex]
                        : undefined,
                seriesOptions: buildAnnotationSeriesOptions(panelSeriesList),
                onApplyAnnotationChange: applyAnnotationChange,
                onDeleteAnnotation: deleteSeriesAnnotation,
                onCancel: () => {
                    cancelAnnotationEditor();
                    onCloseAnnotationMode();
                },
                onApplied: () => {
                    setActiveAnnotationEditor(undefined);
                    onCloseAnnotationMode();
                },
            },
        };
    }

    return {
        panelHighlights,
        panelSeriesList,
        isAnnotationEditorOpen: Boolean(activeAnnotationEditor),
        cancelAnnotationEditor,
        closePanelEditors,
        getPanelInfoWithCurrentMarkup,
        createChartMarkupActions,
        createOverlayEditorActions,
    };
}

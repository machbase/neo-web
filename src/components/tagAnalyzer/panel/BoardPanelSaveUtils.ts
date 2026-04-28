import type { PanelInfo } from '../utils/panelModelTypes';
import type { PanelSeriesDefinition } from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
export const DEFAULT_ANNOTATION_LABEL = 'note';

export function getCreateAnnotationPopoverPosition(panelFormRef: HTMLDivElement | null) {
    const sPanelRect = panelFormRef?.getBoundingClientRect();

    return {
        x: (sPanelRect?.left ?? 0) + 120,
        y: (sPanelRect?.top ?? 0) + 56,
    };
}

export function createUtcDateFieldText(timestamp: number) {
    const sDate = new Date(timestamp);

    return {
        yearText: String(sDate.getUTCFullYear()),
        monthText: String(sDate.getUTCMonth() + 1),
        dayText: String(sDate.getUTCDate()),
    };
}

export function createUtcAnnotationTimestamp(
    yearText: string,
    monthText: string,
    dayText: string,
): number | undefined {
    const sYear = Number(yearText);
    const sMonth = Number(monthText);
    const sDay = Number(dayText);

    if (!Number.isInteger(sYear) || !Number.isInteger(sMonth) || !Number.isInteger(sDay)) {
        return undefined;
    }

    const sTimestamp = Date.UTC(sYear, sMonth - 1, sDay);
    const sDate = new Date(sTimestamp);

    if (
        sDate.getUTCFullYear() !== sYear ||
        sDate.getUTCMonth() !== sMonth - 1 ||
        sDate.getUTCDate() !== sDay
    ) {
        return undefined;
    }

    return sTimestamp;
}

export function buildAnnotationSeriesOptions(tagSet: PanelSeriesDefinition[]) {
    return tagSet.map((seriesInfo, seriesIndex) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: String(seriesIndex),
    }));
}

export function appendPanelHighlight(
    panelInfo: PanelInfo,
    timeRange: TimeRangeMs,
    labelText: string = DEFAULT_HIGHLIGHT_LABEL,
): PanelInfo {
    return {
        ...panelInfo,
        highlights: [
            ...(panelInfo.highlights ?? []),
            {
                text: labelText.trim() || DEFAULT_HIGHLIGHT_LABEL,
                timeRange,
            },
        ],
    };
}

export function renamePanelHighlight(
    panelInfo: PanelInfo,
    highlightIndex: number,
    labelText: string,
): PanelInfo | undefined {
    const sCurrentHighlights = panelInfo.highlights ?? [];

    if (!sCurrentHighlights[highlightIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;

    return {
        ...panelInfo,
        highlights: sCurrentHighlights.map((highlight, index) =>
            index === highlightIndex ? { ...highlight, text: sNextLabelText } : highlight,
        ),
    };
}

export function appendSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    timestamp: number,
    labelText: string,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: [
                              ...(seriesInfo.annotations ?? []),
                              {
                                  text: sNextLabelText,
                                  timeRange: {
                                      startTime: timestamp,
                                      endTime: timestamp,
                                  },
                              },
                          ],
                      },
            ),
        },
    };
}

export function updateSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    annotationIndex: number,
    timeRange: TimeRangeMs,
    labelText: string,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: (seriesInfo.annotations ?? []).map(
                              (annotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex === annotationIndex
                                      ? {
                                            ...annotation,
                                            text: sNextLabelText,
                                            timeRange: { ...timeRange },
                                        }
                                      : annotation,
                          ),
                      },
            ),
        },
    };
}

export function removeSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    annotationIndex: number,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
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
        },
    };
}

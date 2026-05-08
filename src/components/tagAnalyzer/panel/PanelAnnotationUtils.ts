import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../domain/SeriesModel';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';

const DEFAULT_ANNOTATION_LABEL = 'note';

export function buildAnnotationSeriesOptions(tagSet: PanelSeriesDefinition[]) {
    return tagSet.map((seriesInfo, seriesIndex) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: String(seriesIndex),
    }));
}

export function appendSeriesAnnotationWithRangeToSeriesList(
    seriesList: PanelSeriesDefinition[],
    seriesIndex: number,
    timeRange: ResolvedTimeRangeMs,
    labelText: string,
    fillColor: string = DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    textColor: string = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
): PanelSeriesDefinition[] | undefined {
    const sSeriesInfo = seriesList[seriesIndex];

    if (!sSeriesInfo) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

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
                      },
                  ],
              },
    );
}

export function updateSeriesAnnotationInSeriesList(
    seriesList: PanelSeriesDefinition[],
    seriesIndex: number,
    annotationIndex: number,
    timeRange: ResolvedTimeRangeMs,
    labelText: string,
    fillColor: string = DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    textColor: string = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
): PanelSeriesDefinition[] | undefined {
    const sSeriesInfo = seriesList[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

    return seriesList.map((seriesInfo, currentSeriesIndex) =>
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
                                    fillColor: fillColor,
                                    textColor: textColor,
                                }
                              : annotation,
                  ),
              },
    );
}

export function removeSeriesAnnotationFromSeriesList(
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

export {
    DEFAULT_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
};

import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../domain/SeriesModel';
import type { TimeRangeMs } from '../domain/time/TimeTypes';

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
                          ...(clip ? { clip: true } : {}),
                      },
                  ],
              },
    );
}

export function updateSeriesAnnotationInSeriesList(
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

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

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

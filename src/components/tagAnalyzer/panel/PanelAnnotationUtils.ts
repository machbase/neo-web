import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../domain/SeriesModel';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';

const DEFAULT_ANNOTATION_LABEL = 'note';

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

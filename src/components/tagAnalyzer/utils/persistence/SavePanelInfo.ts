import type { PanelHighlight, PanelInfo } from '../panelModelTypes';
import type { SeriesAnnotation, SeriesColumns, SeriesConfig } from '../series/seriesTypes';
import { normalizeLegacyTimeRangeBoundary } from '../legacy/LegacyTimeAdapter';
import type { TimeRangeConfig } from '../time/timeTypes';

export type SaveHighlightInfo = PanelHighlight;
export type SaveAnnotationInfo = SeriesAnnotation;
export type PersistedPanelInfo = PanelInfo;
export type PersistedSeriesInfo = SeriesConfig;

type LegacyCompatibleTimeValue = string | number | '';

type PersistedPanelTimeInput = Omit<PanelInfo['time'], 'rangeConfig'> & {
    rangeConfig?: TimeRangeConfig | undefined;
    range_config?: TimeRangeConfig | undefined;
    range_bgn?: LegacyCompatibleTimeValue | undefined;
    range_end?: LegacyCompatibleTimeValue | undefined;
};

type PersistedPanelInfoInput = Omit<PersistedPanelInfo, 'time'> & {
    time: PersistedPanelTimeInput;
};

/**
 * Checks whether an unknown saved panel already uses the nested persisted panel shape.
 * Intent: Let TagAnalyzer load both the legacy flat format and the direct `PanelInfo` save format.
 * @param {unknown} aPanelInfo The unknown saved panel value.
 * @returns {boolean} True when the value matches the nested persisted panel structure.
 */
export function isPanelInfoMapped(aPanelInfo: unknown): aPanelInfo is PersistedPanelInfoInput {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoInput>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        !!sPanelInfo.time &&
        typeof sPanelInfo.time === 'object' &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object' &&
        !!sPanelInfo.persistence &&
        typeof sPanelInfo.persistence === 'object' &&
        Array.isArray(sPanelInfo.persistence.highlights)
    );
}

/**
 * Clones one series config so persisted panel data never shares mutable references with runtime state.
 * Intent: Keep series annotations and column metadata explicit inside the direct `PanelInfo` save format.
 * @param {SeriesConfig} aSeriesInfo The runtime series config.
 * @returns {PersistedSeriesInfo} The cloned persisted series config.
 */
export function createSaveSeriesInfo(aSeriesInfo: SeriesConfig): PersistedSeriesInfo {
    return {
        ...aSeriesInfo,
        colName: cloneSeriesColumns(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

/**
 * Clones one runtime panel into the direct persisted panel shape.
 * Intent: Save `.taz` panels directly as `PanelInfo` without maintaining a second saved-panel type.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PersistedPanelInfo} The cloned persisted panel model.
 */
export function createPanelInfoMapped(aPanelInfo: PanelInfo): PersistedPanelInfo {
    return {
        meta: { ...aPanelInfo.meta },
        data: {
            ...aPanelInfo.data,
            series: aPanelInfo.data.series.map(createSaveSeriesInfo),
        },
        time: {
            ...aPanelInfo.time,
            rangeConfig: { ...aPanelInfo.time.rangeConfig },
            savedTimeSelection: aPanelInfo.time.savedTimeSelection
                ? {
                      ...aPanelInfo.time.savedTimeSelection,
                      panelRange: aPanelInfo.time.savedTimeSelection.panelRange
                          ? { ...aPanelInfo.time.savedTimeSelection.panelRange }
                          : undefined,
                      navigatorRange: aPanelInfo.time.savedTimeSelection.navigatorRange
                          ? { ...aPanelInfo.time.savedTimeSelection.navigatorRange }
                          : undefined,
                  }
                : undefined,
            defaultValueRange: aPanelInfo.time.defaultValueRange
                ? { ...aPanelInfo.time.defaultValueRange }
                : undefined,
        },
        axes: {
            ...aPanelInfo.axes,
            primaryYAxisRange: { ...aPanelInfo.axes.primaryYAxisRange },
            primaryYAxisDrilldownRange: { ...aPanelInfo.axes.primaryYAxisDrilldownRange },
            secondaryYAxisRange: { ...aPanelInfo.axes.secondaryYAxisRange },
            secondaryYAxisDrilldownRange: { ...aPanelInfo.axes.secondaryYAxisDrilldownRange },
        },
        display: { ...aPanelInfo.display },
        persistence: {
            normalizeValues: aPanelInfo.persistence.normalizeValues,
            highlights: aPanelInfo.persistence.highlights.map(clonePanelHighlight),
        },
    };
}

export function createSavePanelInfo(aPanelInfo: PanelInfo): PersistedPanelInfo {
    return createPanelInfoMapped(aPanelInfo);
}

/**
 * Clones one persisted series back into the runtime series shape.
 * Intent: The runtime model and saved model now match, so loading is a deep clone instead of a type translation.
 * @param {PersistedSeriesInfo} aSeriesInfo The persisted series info.
 * @returns {SeriesConfig} The cloned runtime series config.
 */
export function createSeriesInfoFromMapped(aSeriesInfo: PersistedSeriesInfo): SeriesConfig {
    return createSaveSeriesInfo(aSeriesInfo);
}

/**
 * Clones one persisted panel back into the runtime panel shape.
 * Intent: Keep older mapped `.taz` files loadable while normalizing the renamed time config field.
 * @param {PersistedPanelInfoInput} aPanelInfo The persisted panel value.
 * @returns {PanelInfo} The cloned runtime panel model.
 */
export function createPanelInfoFromMapped(aPanelInfo: PersistedPanelInfoInput): PanelInfo {
    const sRangeConfig = resolveMappedPanelTimeRangeConfig(aPanelInfo.time);

    return {
        meta: { ...aPanelInfo.meta },
        data: {
            ...aPanelInfo.data,
            series: aPanelInfo.data.series.map(createSeriesInfoFromMapped),
        },
        time: {
            ...aPanelInfo.time,
            rangeConfig: sRangeConfig,
            savedTimeSelection: aPanelInfo.time.savedTimeSelection
                ? {
                      ...aPanelInfo.time.savedTimeSelection,
                      panelRange: aPanelInfo.time.savedTimeSelection.panelRange
                          ? { ...aPanelInfo.time.savedTimeSelection.panelRange }
                          : undefined,
                      navigatorRange: aPanelInfo.time.savedTimeSelection.navigatorRange
                          ? { ...aPanelInfo.time.savedTimeSelection.navigatorRange }
                          : undefined,
                  }
                : undefined,
            defaultValueRange: aPanelInfo.time.defaultValueRange
                ? { ...aPanelInfo.time.defaultValueRange }
                : undefined,
        },
        axes: {
            ...aPanelInfo.axes,
            primaryYAxisRange: { ...aPanelInfo.axes.primaryYAxisRange },
            primaryYAxisDrilldownRange: { ...aPanelInfo.axes.primaryYAxisDrilldownRange },
            secondaryYAxisRange: { ...aPanelInfo.axes.secondaryYAxisRange },
            secondaryYAxisDrilldownRange: { ...aPanelInfo.axes.secondaryYAxisDrilldownRange },
        },
        display: { ...aPanelInfo.display },
        persistence: {
            normalizeValues: aPanelInfo.persistence.normalizeValues,
            highlights: aPanelInfo.persistence.highlights.map(clonePanelHighlight),
        },
    };
}

function cloneSeriesColumns(aColumns: SeriesColumns | undefined): SeriesColumns | undefined {
    return aColumns ? { ...aColumns } : undefined;
}

function cloneSeriesAnnotation(aAnnotation: SeriesAnnotation): SeriesAnnotation {
    return {
        text: aAnnotation.text,
        timeRange: {
            startTime: aAnnotation.timeRange.startTime,
            endTime: aAnnotation.timeRange.endTime,
        },
    };
}

function clonePanelHighlight(aHighlight: PanelHighlight): PanelHighlight {
    return {
        text: aHighlight.text,
        timeRange: {
            startTime: aHighlight.timeRange.startTime,
            endTime: aHighlight.timeRange.endTime,
        },
    };
}

function resolveMappedPanelTimeRangeConfig(aPanelTime: PersistedPanelTimeInput): TimeRangeConfig {
    if (aPanelTime.rangeConfig) {
        return { ...aPanelTime.rangeConfig };
    }

    if (aPanelTime.range_config) {
        return { ...aPanelTime.range_config };
    }

    return normalizeLegacyTimeRangeBoundary(aPanelTime.range_bgn, aPanelTime.range_end)
        .rangeConfig;
}

import type { PanelHighlight, PanelInfo } from '../panelModelTypes';
import type { SeriesAnnotation, SeriesColumns, SeriesConfig } from '../series/seriesTypes';

type PersistedPanelInfoInput = Omit<Partial<PanelInfo>, 'data' | 'time'> & {
    data?: Partial<PanelInfo['data']> | undefined;
    time?: Partial<PanelInfo['time']> | undefined;
};

/**
 * Checks whether a persisted panel already uses the direct nested `PanelInfo` shape.
 * Intent: Let `.taz` loading pick between the legacy flat format and the direct panel format.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the nested panel structure.
 */
export function isPanelInfoMapped(aPanelInfo: unknown): aPanelInfo is PersistedPanelInfoInput {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PanelInfo>;

    return (
        !!sPanelInfo.meta &&
        !!sPanelInfo.data &&
        !!sPanelInfo.time &&
        !!sPanelInfo.axes &&
        !!sPanelInfo.display
    );
}

/**
 * Clones one series config for `.taz` persistence.
 * Intent: Keep saved panel data detached from runtime references while preserving explicit annotations.
 * @param {SeriesConfig} aSeriesInfo The runtime series config.
 * @returns {SeriesConfig} The cloned series config for persistence.
 */
export function createSaveSeriesInfo(aSeriesInfo: SeriesConfig): SeriesConfig {
    return {
        ...aSeriesInfo,
        colName: cloneSeriesColumns(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

/**
 * Clones one runtime panel into the direct persisted `PanelInfo` shape.
 * Intent: Save `.taz` panels directly as `PanelInfo` instead of maintaining a second saved-panel type.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PanelInfo} The cloned persisted panel model.
 */
export function createPanelInfoMapped(aPanelInfo: PanelInfo): PanelInfo {
    return createSavePanelInfo(aPanelInfo);
}

/**
 * Clones one runtime panel for `.taz` persistence.
 * Intent: Persist the real `PanelInfo` shape, including panel highlights and series annotations.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PanelInfo} The cloned persisted panel model.
 */
export function createSavePanelInfo(aPanelInfo: PanelInfo): PanelInfo {
    return {
        meta: { ...aPanelInfo.meta },
        data: {
            ...aPanelInfo.data,
            tag_set: (aPanelInfo.data.tag_set ?? []).map(createSaveSeriesInfo),
        },
        time: {
            ...aPanelInfo.time,
            range_config: aPanelInfo.time.range_config
                ? { ...aPanelInfo.time.range_config }
                : aPanelInfo.time.range_config,
            time_keeper: aPanelInfo.time.time_keeper
                ? {
                      ...aPanelInfo.time.time_keeper,
                      panelRange: aPanelInfo.time.time_keeper.panelRange
                          ? { ...aPanelInfo.time.time_keeper.panelRange }
                          : undefined,
                      navigatorRange: aPanelInfo.time.time_keeper.navigatorRange
                          ? { ...aPanelInfo.time.time_keeper.navigatorRange }
                          : undefined,
                  }
                : undefined,
            default_range: aPanelInfo.time.default_range
                ? { ...aPanelInfo.time.default_range }
                : undefined,
        },
        axes: {
            ...aPanelInfo.axes,
            primaryRange: { ...aPanelInfo.axes.primaryRange },
            primaryDrilldownRange: { ...aPanelInfo.axes.primaryDrilldownRange },
            secondaryRange: { ...aPanelInfo.axes.secondaryRange },
            secondaryDrilldownRange: { ...aPanelInfo.axes.secondaryDrilldownRange },
        },
        display: { ...aPanelInfo.display },
        use_normalize: aPanelInfo.use_normalize,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Clones one persisted panel back into the runtime panel shape.
 * Intent: Default new persistence-only fields when a saved panel was written before they existed.
 * @param {PersistedPanelInfoInput} aPanelInfo The persisted panel value.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromMapped(aPanelInfo: PersistedPanelInfoInput): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta?.index_key ?? '',
            chart_title: aPanelInfo.meta?.chart_title ?? '',
        },
        data: {
            tag_set: (aPanelInfo.data?.tag_set ?? []).map(createSeriesInfoFromMapped),
            raw_keeper: aPanelInfo.data?.raw_keeper ?? false,
            count: aPanelInfo.data?.count ?? -1,
            interval_type: aPanelInfo.data?.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.time?.range_bgn ?? 0,
            range_end: aPanelInfo.time?.range_end ?? 0,
            range_config: aPanelInfo.time?.range_config as PanelInfo['time']['range_config'],
            use_time_keeper: aPanelInfo.time?.use_time_keeper ?? false,
            time_keeper: aPanelInfo.time?.time_keeper
                ? {
                      ...aPanelInfo.time.time_keeper,
                      panelRange: aPanelInfo.time.time_keeper.panelRange
                          ? { ...aPanelInfo.time.time_keeper.panelRange }
                          : undefined,
                      navigatorRange: aPanelInfo.time.time_keeper.navigatorRange
                          ? { ...aPanelInfo.time.time_keeper.navigatorRange }
                          : undefined,
                  }
                : undefined,
            default_range: aPanelInfo.time?.default_range
                ? { ...aPanelInfo.time.default_range }
                : undefined,
        },
        axes: {
            show_x_tickline: aPanelInfo.axes?.show_x_tickline ?? false,
            pixels_per_tick_raw: aPanelInfo.axes?.pixels_per_tick_raw ?? 0,
            pixels_per_tick: aPanelInfo.axes?.pixels_per_tick ?? 0,
            use_sampling: aPanelInfo.axes?.use_sampling ?? false,
            sampling_value: aPanelInfo.axes?.sampling_value ?? 0,
            zero_base: aPanelInfo.axes?.zero_base ?? false,
            show_y_tickline: aPanelInfo.axes?.show_y_tickline ?? false,
            primaryRange: aPanelInfo.axes?.primaryRange
                ? { ...aPanelInfo.axes.primaryRange }
                : { min: 0, max: 0 },
            primaryDrilldownRange: aPanelInfo.axes?.primaryDrilldownRange
                ? { ...aPanelInfo.axes.primaryDrilldownRange }
                : { min: 0, max: 0 },
            use_ucl: aPanelInfo.axes?.use_ucl ?? false,
            ucl_value: aPanelInfo.axes?.ucl_value ?? 0,
            use_lcl: aPanelInfo.axes?.use_lcl ?? false,
            lcl_value: aPanelInfo.axes?.lcl_value ?? 0,
            use_right_y2: aPanelInfo.axes?.use_right_y2 ?? false,
            zero_base2: aPanelInfo.axes?.zero_base2 ?? false,
            show_y_tickline2: aPanelInfo.axes?.show_y_tickline2 ?? false,
            secondaryRange: aPanelInfo.axes?.secondaryRange
                ? { ...aPanelInfo.axes.secondaryRange }
                : { min: 0, max: 0 },
            secondaryDrilldownRange: aPanelInfo.axes?.secondaryDrilldownRange
                ? { ...aPanelInfo.axes.secondaryDrilldownRange }
                : { min: 0, max: 0 },
            use_ucl2: aPanelInfo.axes?.use_ucl2 ?? false,
            ucl2_value: aPanelInfo.axes?.ucl2_value ?? 0,
            use_lcl2: aPanelInfo.axes?.use_lcl2 ?? false,
            lcl2_value: aPanelInfo.axes?.lcl2_value ?? 0,
        },
        display: {
            show_legend: aPanelInfo.display?.show_legend ?? false,
            use_zoom: aPanelInfo.display?.use_zoom ?? false,
            chart_type: aPanelInfo.display?.chart_type ?? 'Line',
            show_point: aPanelInfo.display?.show_point ?? false,
            point_radius: aPanelInfo.display?.point_radius ?? 0,
            fill: aPanelInfo.display?.fill ?? 0,
            stroke: aPanelInfo.display?.stroke ?? 0,
        },
        use_normalize: aPanelInfo.use_normalize ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

function createSeriesInfoFromMapped(aSeriesInfo: Partial<SeriesConfig>): SeriesConfig {
    return {
        key: aSeriesInfo.key ?? '',
        table: aSeriesInfo.table ?? '',
        sourceTagName: aSeriesInfo.sourceTagName ?? '',
        alias: aSeriesInfo.alias ?? '',
        calculationMode: aSeriesInfo.calculationMode ?? '',
        color: aSeriesInfo.color ?? '',
        use_y2: aSeriesInfo.use_y2 ?? false,
        id: aSeriesInfo.id,
        onRollup: aSeriesInfo.onRollup ?? false,
        colName: cloneSeriesColumns(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
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

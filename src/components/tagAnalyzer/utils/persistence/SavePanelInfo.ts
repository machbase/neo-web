import type { PanelHighlight, PanelInfo } from '../panelModelTypes';
import type { SeriesAnnotation, SeriesColumns, SeriesConfig } from '../series/seriesTypes';
import type { TimeRangeConfig, TimeRangePair, ValueRange } from '../time/timeTypes';

export type PersistedSeriesColumnsV201 = {
    nameColumn: string | undefined;
    timeColumn: string | undefined;
    valueColumn: string | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV200 = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: boolean;
    id: string | undefined;
    onRollup?: boolean | undefined;
    colName: SeriesColumns | undefined;
    annotations?: SeriesAnnotation[] | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV201 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    columnNames: PersistedSeriesColumnsV201 | undefined;
    annotations?: SeriesAnnotation[] | undefined;
};

export type PersistedPanelMetaV200 = {
    index_key: string;
    chart_title: string;
};

export type PersistedPanelDataV200 = {
    tag_set: PersistedSeriesInfoV200[];
    raw_keeper: boolean;
    count: number;
    interval_type: string | undefined;
};

export type PersistedPanelTimeV200 = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
    default_range: ValueRange | undefined;
};

export type PersistedPanelInfoV200 = {
    meta: PersistedPanelMetaV200;
    data: PersistedPanelDataV200;
    time: PersistedPanelTimeV200;
    axes: PanelInfo['axes'];
    display: PanelInfo['display'];
    use_normalize: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelMetaV201 = {
    panelKey: string;
    chartTitle: string;
};

export type PersistedPanelDataV201 = {
    seriesList: PersistedSeriesInfoV201[];
    useRawData: boolean;
    rowLimit: number;
    intervalType: string | undefined;
};

export type PersistedPanelTimeV201 = {
    rangeStart: number;
    rangeEnd: number;
    rangeConfig: TimeRangeConfig;
    useSavedTimeRange: boolean;
    savedTimeRange: Partial<TimeRangePair> | undefined;
    defaultValueRange: ValueRange | undefined;
};

export type PersistedPanelAxesV201 = {
    showXAxisTickLine: boolean;
    rawDataPixelsPerTick: number;
    rollupDataPixelsPerTick: number;
    useSampling: boolean;
    samplingValue: number;
    usePrimaryZeroBase: boolean;
    showPrimaryYAxisTickLine: boolean;
    primaryValueRange: ValueRange;
    primaryDrilldownValueRange: ValueRange;
    usePrimaryUpperControlLimit: boolean;
    primaryUpperControlLimit: number;
    usePrimaryLowerControlLimit: boolean;
    primaryLowerControlLimit: number;
    useSecondaryAxisOnRight: boolean;
    useSecondaryZeroBase: boolean;
    showSecondaryYAxisTickLine: boolean;
    secondaryValueRange: ValueRange;
    secondaryDrilldownValueRange: ValueRange;
    useSecondaryUpperControlLimit: boolean;
    secondaryUpperControlLimit: number;
    useSecondaryLowerControlLimit: boolean;
    secondaryLowerControlLimit: number;
};

export type PersistedPanelDisplayV201 = {
    showLegend: boolean;
    useZoom: boolean;
    chartType: string;
    showPoints: boolean;
    pointRadius: number;
    fill: number;
    stroke: number;
};

export type PersistedPanelInfoV201 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV201;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

/**
 * Checks whether a persisted panel uses the nested `2.0.0` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.0` panel structure.
 */
export function isPersistedPanelInfoV200(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV200 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV200>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'index_key' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.tag_set)
    );
}

/**
 * Checks whether a persisted panel uses the explicit `2.0.1` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.1` panel structure.
 */
export function isPersistedPanelInfoV201(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV201 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV201>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'panelKey' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.seriesList)
    );
}

/**
 * Clones one series config into the explicit `2.0.1` persisted series shape.
 * Intent: Save `.taz` files with descriptive series field names while keeping runtime state detached.
 * @param {SeriesConfig} aSeriesInfo The runtime series config.
 * @returns {PersistedSeriesInfoV201} The explicit persisted series config.
 */
export function createSaveSeriesInfo(
    aSeriesInfo: SeriesConfig,
): PersistedSeriesInfoV201 {
    return {
        seriesKey: aSeriesInfo.key,
        tableName: aSeriesInfo.table,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        useSecondaryAxis: aSeriesInfo.use_y2,
        id: aSeriesInfo.id,
        useRollupTable: aSeriesInfo.onRollup,
        columnNames: createPersistedSeriesColumnsV201(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

/**
 * Clones one runtime panel into the explicit `2.0.1` persisted panel shape.
 * Intent: Save `.taz` panels with clearer field names while keeping runtime state detached.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PersistedPanelInfoV201} The explicit persisted panel model.
 */
export function createSavePanelInfo(
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV201 {
    return {
        meta: {
            panelKey: aPanelInfo.meta.index_key,
            chartTitle: aPanelInfo.meta.chart_title,
        },
        data: {
            seriesList: (aPanelInfo.data.tag_set ?? []).map(createSaveSeriesInfo),
            useRawData: aPanelInfo.data.raw_keeper,
            rowLimit: aPanelInfo.data.count,
            intervalType: aPanelInfo.data.interval_type,
        },
        time: {
            rangeStart: aPanelInfo.time.range_bgn,
            rangeEnd: aPanelInfo.time.range_end,
            rangeConfig: aPanelInfo.time.range_config
                ? { ...aPanelInfo.time.range_config }
                : aPanelInfo.time.range_config,
            useSavedTimeRange: aPanelInfo.time.use_time_keeper,
            savedTimeRange: cloneTimeRangePair(aPanelInfo.time.time_keeper),
            defaultValueRange: cloneValueRange(aPanelInfo.time.default_range),
        },
        axes: {
            showXAxisTickLine: aPanelInfo.axes.show_x_tickline,
            rawDataPixelsPerTick: aPanelInfo.axes.pixels_per_tick_raw,
            rollupDataPixelsPerTick: aPanelInfo.axes.pixels_per_tick,
            useSampling: aPanelInfo.axes.use_sampling,
            samplingValue: aPanelInfo.axes.sampling_value,
            usePrimaryZeroBase: aPanelInfo.axes.zero_base,
            showPrimaryYAxisTickLine: aPanelInfo.axes.show_y_tickline,
            primaryValueRange: { ...aPanelInfo.axes.primaryRange },
            primaryDrilldownValueRange: { ...aPanelInfo.axes.primaryDrilldownRange },
            usePrimaryUpperControlLimit: aPanelInfo.axes.use_ucl,
            primaryUpperControlLimit: aPanelInfo.axes.ucl_value,
            usePrimaryLowerControlLimit: aPanelInfo.axes.use_lcl,
            primaryLowerControlLimit: aPanelInfo.axes.lcl_value,
            useSecondaryAxisOnRight: aPanelInfo.axes.use_right_y2,
            useSecondaryZeroBase: aPanelInfo.axes.zero_base2,
            showSecondaryYAxisTickLine: aPanelInfo.axes.show_y_tickline2,
            secondaryValueRange: { ...aPanelInfo.axes.secondaryRange },
            secondaryDrilldownValueRange: { ...aPanelInfo.axes.secondaryDrilldownRange },
            useSecondaryUpperControlLimit: aPanelInfo.axes.use_ucl2,
            secondaryUpperControlLimit: aPanelInfo.axes.ucl2_value,
            useSecondaryLowerControlLimit: aPanelInfo.axes.use_lcl2,
            secondaryLowerControlLimit: aPanelInfo.axes.lcl2_value,
        },
        display: {
            showLegend: aPanelInfo.display.show_legend,
            useZoom: aPanelInfo.display.use_zoom,
            chartType: aPanelInfo.display.chart_type,
            showPoints: aPanelInfo.display.show_point,
            pointRadius: aPanelInfo.display.point_radius,
            fill: aPanelInfo.display.fill,
            stroke: aPanelInfo.display.stroke,
        },
        useNormalizedValues: aPanelInfo.use_normalize,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.0` panel into the runtime `PanelInfo` shape.
 * Intent: Keep old nested `.taz` files loadable after the `2.0.1` persistence rename.
 * @param {PersistedPanelInfoV200} aPanelInfo The `2.0.0` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV200(
    aPanelInfo: PersistedPanelInfoV200,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.index_key,
            chart_title: aPanelInfo.meta.chart_title,
        },
        data: {
            tag_set: (aPanelInfo.data.tag_set ?? []).map(createSeriesInfoFromPersistedV200),
            raw_keeper: aPanelInfo.data.raw_keeper ?? false,
            count: aPanelInfo.data.count ?? -1,
            interval_type: aPanelInfo.data.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.time.range_bgn ?? 0,
            range_end: aPanelInfo.time.range_end ?? 0,
            range_config: aPanelInfo.time.range_config,
            use_time_keeper: aPanelInfo.time.use_time_keeper ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.time_keeper),
            default_range: cloneValueRange(aPanelInfo.time.default_range),
        },
        axes: {
            ...aPanelInfo.axes,
            primaryRange: cloneValueRangeOrDefault(aPanelInfo.axes.primaryRange),
            primaryDrilldownRange: cloneValueRangeOrDefault(
                aPanelInfo.axes.primaryDrilldownRange,
            ),
            secondaryRange: cloneValueRangeOrDefault(aPanelInfo.axes.secondaryRange),
            secondaryDrilldownRange: cloneValueRangeOrDefault(
                aPanelInfo.axes.secondaryDrilldownRange,
            ),
        },
        display: { ...aPanelInfo.display },
        use_normalize: aPanelInfo.use_normalize ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.1` panel into the runtime `PanelInfo` shape.
 * Intent: Keep the runtime model stable while `.taz` storage uses clearer field names.
 * @param {PersistedPanelInfoV201} aPanelInfo The `2.0.1` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV201(
    aPanelInfo: PersistedPanelInfoV201,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.panelKey,
            chart_title: aPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (aPanelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV201),
            raw_keeper: aPanelInfo.data.useRawData ?? false,
            count: aPanelInfo.data.rowLimit ?? -1,
            interval_type: aPanelInfo.data.intervalType,
        },
        time: {
            range_bgn: aPanelInfo.time.rangeStart ?? 0,
            range_end: aPanelInfo.time.rangeEnd ?? 0,
            range_config: aPanelInfo.time.rangeConfig,
            use_time_keeper: aPanelInfo.time.useSavedTimeRange ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.savedTimeRange),
            default_range: cloneValueRange(aPanelInfo.time.defaultValueRange),
        },
        axes: {
            show_x_tickline: aPanelInfo.axes.showXAxisTickLine ?? false,
            pixels_per_tick_raw: aPanelInfo.axes.rawDataPixelsPerTick ?? 0,
            pixels_per_tick: aPanelInfo.axes.rollupDataPixelsPerTick ?? 0,
            use_sampling: aPanelInfo.axes.useSampling ?? false,
            sampling_value: aPanelInfo.axes.samplingValue ?? 0,
            zero_base: aPanelInfo.axes.usePrimaryZeroBase ?? false,
            show_y_tickline: aPanelInfo.axes.showPrimaryYAxisTickLine ?? false,
            primaryRange: cloneValueRangeOrDefault(aPanelInfo.axes.primaryValueRange),
            primaryDrilldownRange: cloneValueRangeOrDefault(
                aPanelInfo.axes.primaryDrilldownValueRange,
            ),
            use_ucl: aPanelInfo.axes.usePrimaryUpperControlLimit ?? false,
            ucl_value: aPanelInfo.axes.primaryUpperControlLimit ?? 0,
            use_lcl: aPanelInfo.axes.usePrimaryLowerControlLimit ?? false,
            lcl_value: aPanelInfo.axes.primaryLowerControlLimit ?? 0,
            use_right_y2: aPanelInfo.axes.useSecondaryAxisOnRight ?? false,
            zero_base2: aPanelInfo.axes.useSecondaryZeroBase ?? false,
            show_y_tickline2: aPanelInfo.axes.showSecondaryYAxisTickLine ?? false,
            secondaryRange: cloneValueRangeOrDefault(aPanelInfo.axes.secondaryValueRange),
            secondaryDrilldownRange: cloneValueRangeOrDefault(
                aPanelInfo.axes.secondaryDrilldownValueRange,
            ),
            use_ucl2: aPanelInfo.axes.useSecondaryUpperControlLimit ?? false,
            ucl2_value: aPanelInfo.axes.secondaryUpperControlLimit ?? 0,
            use_lcl2: aPanelInfo.axes.useSecondaryLowerControlLimit ?? false,
            lcl2_value: aPanelInfo.axes.secondaryLowerControlLimit ?? 0,
        },
        display: {
            show_legend: aPanelInfo.display.showLegend ?? false,
            use_zoom: aPanelInfo.display.useZoom ?? false,
            chart_type: aPanelInfo.display.chartType ?? 'Line',
            show_point: aPanelInfo.display.showPoints ?? false,
            point_radius: aPanelInfo.display.pointRadius ?? 0,
            fill: aPanelInfo.display.fill ?? 0,
            stroke: aPanelInfo.display.stroke ?? 0,
        },
        use_normalize: aPanelInfo.useNormalizedValues ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

function createSeriesInfoFromPersistedV200(
    aSeriesInfo: PersistedSeriesInfoV200,
): SeriesConfig {
    return {
        key: aSeriesInfo.key,
        table: aSeriesInfo.table,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        use_y2: aSeriesInfo.use_y2,
        id: aSeriesInfo.id,
        onRollup: aSeriesInfo.onRollup ?? false,
        colName: cloneSeriesColumns(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createSeriesInfoFromPersistedV201(
    aSeriesInfo: PersistedSeriesInfoV201,
): SeriesConfig {
    return {
        key: aSeriesInfo.seriesKey,
        table: aSeriesInfo.tableName,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        use_y2: aSeriesInfo.useSecondaryAxis ?? false,
        id: aSeriesInfo.id,
        onRollup: aSeriesInfo.useRollupTable ?? false,
        colName: createRuntimeSeriesColumns(aSeriesInfo.columnNames),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createPersistedSeriesColumnsV201(
    aColumns: SeriesColumns | undefined,
): PersistedSeriesColumnsV201 | undefined {
    if (!aColumns) {
        return undefined;
    }

    const { name, time, value, ...sRest } = aColumns;

    return {
        ...sRest,
        nameColumn: name,
        timeColumn: time,
        valueColumn: value,
    };
}

function createRuntimeSeriesColumns(
    aColumns: PersistedSeriesColumnsV201 | undefined,
): SeriesColumns | undefined {
    if (!aColumns) {
        return undefined;
    }

    const {
        nameColumn,
        timeColumn,
        valueColumn,
        ...sRest
    } = aColumns;

    return {
        ...sRest,
        name: nameColumn,
        time: timeColumn,
        value: valueColumn,
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

function cloneTimeRangePair(
    aTimeRangePair: Partial<TimeRangePair> | undefined,
): Partial<TimeRangePair> | undefined {
    if (!aTimeRangePair) {
        return undefined;
    }

    return {
        ...aTimeRangePair,
        panelRange: aTimeRangePair.panelRange
            ? { ...aTimeRangePair.panelRange }
            : undefined,
        navigatorRange: aTimeRangePair.navigatorRange
            ? { ...aTimeRangePair.navigatorRange }
            : undefined,
    };
}

function cloneValueRange(
    aValueRange: ValueRange | undefined,
): ValueRange | undefined {
    return aValueRange ? { ...aValueRange } : undefined;
}

function cloneValueRangeOrDefault(aValueRange: ValueRange | undefined): ValueRange {
    return aValueRange ? { ...aValueRange } : { min: 0, max: 0 };
}

import { validateAndRepairTazPanel } from '@/utils/panelValidator';
import type { BoardInfo } from '../board/boardModel';
import { asRecord, isFiniteNumber, isPlainObject } from '../objectGuards';
import {
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    ensureUniquePanelKeys,
    type PanelAnnotation,
    type PanelAxisThreshold,
    type PanelEChartType,
    type PanelInfo,
    type PanelYAxis,
    type ValueRange,
} from '../panel/panelModel';
import { decodePersistedPanelRangeState } from './persistedPanelRange';
import { formatAbsoluteTime, formatNumericValue } from './serializeRange';
import { normalizeStoredTimeUnit } from '../range/intervalResolver';
import {
    type RangeExpressionInput,
    type RangeState,
} from '../range/rangeModel';
import {
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    getPanelSeriesDisplayColor,
    getPanelSeriesDisplayName,
    normalizePanelSeriesCalculationMode,
    normalizePanelSeriesDefinitions,
    PanelSeriesCalculationMode,
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../seriesModel';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
    cloneSeriesAnnotations,
    createTimeRangeInputFromStoredValues,
    normalizePersistedPanelChartType,
    normalizePersistedPanelRangeInput,
    normalizePersistedTimeRangeInput,
    normalizePersistedTazVersion,
    normalizePersistedValueRangeOrAuto,
    parseLoadedPanelTazVer210,
    parsePersistedValueRangeOrThrow,
    TAZ_FORMAT_VERSION,
    TazVersion,
    type PersistedBoardRange,
    type PersistedPanelAnnotationInput,
    type PersistedPanelSeries,
    type PersistedTimedMarkupInput,
} from './tazFormat';

type PersistedPanelAxisThresholdV200 = {
    enabled: boolean;
    value: number;
};

type PersistedPanelSamplingV200 = {
    enabled: boolean;
    sampleCount: number;
};

type PersistedPanelYAxisV200 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV200;
    lowerControlLimit: PersistedPanelAxisThresholdV200;
};

type PersistedPanelInfoV200 = {
    meta: {
        panelKey: string;
        chartTitle: string;
    };
    data: {
        seriesList: {
            seriesKey: string;
            tableName: string;
            sourceTagName: string;
            alias: string;
            calculationMode: string;
            color?: string;
            useSecondaryAxis: boolean;
            id: string | undefined;
            useRollupTable: boolean;
            sourceColumns: {
                nameColumn: string | undefined;
                timeColumn: string | undefined;
                valueColumn: string | undefined;
                [key: string]: unknown;
            };
            annotations?: PersistedTimedMarkupInput[];
        }[];
        intervalType: string | undefined;
    };
    toolbar: {
        isRaw: boolean;
    };
    time: {
        rangeConfig: RangeExpressionInput;
        useLastViewedRange?: boolean;
        lastViewedRange?: unknown;
    };
    axes: {
        xAxis: {
            showTickLine: boolean;
            calculatedDataPixelsPerTick: number;
        };
        sampling?: PersistedPanelSamplingV200;
        mainChartSampling?: PersistedPanelSamplingV200;
        leftYAxis: PersistedPanelYAxisV200;
        rightYAxis: PersistedPanelYAxisV200 & {
            enabled: boolean;
        };
    };
    display: {
        showLegend: boolean;
        useZoom: boolean;
        chartType: PanelEChartType;
        connectNulls?: boolean;
        showPoints: boolean;
        pointRadius: number;
        fill: number;
        stroke: number;
    };
    useNormalizedValues: boolean;
    highlights?: PersistedTimedMarkupInput[];
    annotations?: PersistedPanelAnnotationInput[];
};

type PersistedPanelYAxisV204 = {
    zero_base: boolean;
    show_tickline: boolean;
    value_range: ValueRange;
    raw_data_value_range: ValueRange;
    upper_control_limit: PanelAxisThreshold;
    lower_control_limit: PanelAxisThreshold;
};

type PersistedPanelInfoV204 = {
    general: {
        chart_title: string;
        use_zoom: boolean;
        use_last_viewed_range: boolean;
        last_viewed_range?: RangeState;
        is_raw: boolean;
        is_order_by?: boolean;
        use_normalize: boolean;
    };
    data: {
        index_key: string;
        tag_set: PersistedPanelSeries[];
        count: number | undefined;
        interval_type: string | undefined;
    };
    time: {
        range_config: RangeExpressionInput;
    };
    axes: {
        x_axis: {
            show_tickline: boolean;
            raw_data_pixels_per_tick: number | undefined;
            calculated_data_pixels_per_tick: number | undefined;
            calculated_navigator_pixels_per_tick?: number;
        };
        sampling?: {
            enabled: boolean;
            sample_count: number | undefined;
        };
        main_chart_sampling?: {
            enabled: boolean;
            sample_count: number | undefined;
        };
        left_y_axis: PersistedPanelYAxisV204;
        right_y_axis_enabled?: boolean;
        right_y_axis: PersistedPanelYAxisV204;
    };
    display: {
        show_legend: boolean;
        chart_type: PanelEChartType;
        connect_nulls?: boolean;
        show_point: boolean;
        point_radius: number | undefined;
        fill: number | undefined;
        stroke: number | undefined;
    };
    highlights?: PersistedTimedMarkupInput[];
    annotations?: PersistedPanelAnnotationInput[];
};

type LegacyCompatibleSeriesConfig = {
    key: string;
    table: string;
    alias: string;
    calculationMode: string;
    color?: string;
    id: string | undefined;
    sourceColumns?: PanelSeriesSourceColumns;
    columnNames?: PanelSeriesSourceColumns;
    sourceTagName?: string;
    tagName?: string;
    colName?: PanelSeriesSourceColumns;
    use_y2: 'Y' | 'N';
    onRollup?: boolean;
    [key: string]: unknown;
};

function fromLegacyBoolean(value: 'Y' | 'N' | undefined): boolean {
    return value === 'Y';
}

function normalizeLegacySeriesConfig(
    item: LegacyCompatibleSeriesConfig,
): PanelSeriesDefinition {
    const sCalculationMode = normalizePanelSeriesCalculationMode(
        item.calculationMode ?? PanelSeriesCalculationMode.Average,
    );
    if (!sCalculationMode) {
        throw new Error(
            'Invalid TagAnalyzer legacy panel series calculationMode.',
        );
    }
    const sSourceColumns =
        item.sourceColumns ?? item.columnNames ?? item.colName;

    const sSeries = {
        key: item.key,
        table: item.table,
        alias: item.alias,
        calculationMode: sCalculationMode,
        color: item.color,
        id: item.id,
        sourceColumns: {
            ...(sSourceColumns ?? {}),
            name:
                sSourceColumns?.name ??
                DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
            time:
                sSourceColumns?.time ??
                DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
            value:
                sSourceColumns?.value ??
                DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
        },
        sourceTagName: item.sourceTagName || item.tagName || '',
        useSecondaryAxis: fromLegacyBoolean(item.use_y2),
        useRollupTable: item.onRollup ?? false,
    };

    sSeries.alias = getPanelSeriesDisplayName(sSeries);
    return sSeries;
}

type LegacyStoredTimeRangeValue = string | number | '';

type LegacyFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: LegacyCompatibleSeriesConfig[];
    range_bgn: LegacyStoredTimeRangeValue;
    range_end: LegacyStoredTimeRangeValue;
    raw_keeper: boolean | undefined;
    time_keeper: unknown;
    default_range: ValueRange | undefined;
    count: number | undefined;
    interval_type: string | undefined;
    show_legend: 'Y' | 'N';
    use_zoom: 'Y' | 'N';
    connect_nulls?: 'Y' | 'N';
    use_normalize: 'Y' | 'N' | undefined;
    use_time_keeper: 'Y' | 'N';
    show_x_tickline: 'Y' | 'N';
    pixels_per_tick: number | string;
    sampling_value: number | string;
    zero_base: 'Y' | 'N';
    show_y_tickline: 'Y' | 'N';
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: 'Y' | 'N';
    ucl_value: number | string;
    use_lcl: 'Y' | 'N';
    lcl_value: number | string;
    use_right_y2: 'Y' | 'N';
    zero_base2: 'Y' | 'N';
    show_y_tickline2: 'Y' | 'N';
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: 'Y' | 'N';
    ucl2_value: number | string;
    use_lcl2: 'Y' | 'N';
    lcl2_value: number | string;
    chart_type: PanelEChartType;
    show_point: 'Y' | 'N';
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
    [key: string]: unknown;
};

function buildMigratedPanelInfo(
    panelInfo: Omit<PanelInfo, 'isOverlapSelected'>,
): PanelInfo {
    return {
        ...panelInfo,
        isOverlapSelected: false,
    };
}

function createPanelInfoFromLegacyFlatPanelInfo(
    panelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    const sTagSet = (panelInfo.tag_set || []).map(normalizeLegacySeriesConfig);
    const sRangeConfig = resolveLegacyRangeConfig(
        panelInfo,
        createTimeRangeInputFromStoredValues(
            panelInfo.range_bgn ?? '',
            panelInfo.range_end ?? '',
        ),
        shouldUseNumericPanelRangeInput(sTagSet),
    );
    return buildMigratedPanelInfo({
        key: panelInfo.index_key,
        title: panelInfo.chart_title,
        query: {
            tagSet: sTagSet,
            intervalType: normalizeStoredTimeUnit(panelInfo.interval_type ?? ''),
        },
        mode: {
            isRaw: panelInfo.raw_keeper ?? false,
            isOrderBy: false,
            useNormalize: fromLegacyBoolean(panelInfo.use_normalize),
        },
        time: {
            rangeInput: sRangeConfig,
            useLastViewedRange: fromLegacyBoolean(panelInfo.use_time_keeper),
            lastViewedRange: decodePersistedPanelRangeState(panelInfo.time_keeper),
        },
        axes: {
            x: {
                showTickline: fromLegacyBoolean(panelInfo.show_x_tickline),
            },
            leftY: mapLegacyFlatYAxis(panelInfo, false),
            rightY: {
                ...mapLegacyFlatYAxis(panelInfo, true),
                enabled: fromLegacyBoolean(panelInfo.use_right_y2),
            },
        },
        display: {
            chartType: normalizePersistedPanelChartType(panelInfo.chart_type),
            showLegend: fromLegacyBoolean(panelInfo.show_legend),
            showPoint: fromLegacyBoolean(panelInfo.show_point),
            pointRadius: normalizeNumericValue(panelInfo.point_radius),
            fill: normalizeNumericValue(panelInfo.fill),
            stroke: normalizeNumericValue(panelInfo.stroke),
            connectNulls: fromLegacyBoolean(panelInfo.connect_nulls),
            useZoom: fromLegacyBoolean(panelInfo.use_zoom),
            pixelsPerTick: {
                calculated: normalizeNumericValue(panelInfo.pixels_per_tick),
                calculatedNavigator: normalizeNumericValue(panelInfo.pixels_per_tick),
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: normalizeNumericValue(panelInfo.sampling_value),
            },
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: [],
        annotations: [],
    });
}

function mapLegacyFlatYAxis(
    panelInfo: LegacyFlatPanelInfo,
    useSecondaryAxis: boolean,
): PanelYAxis {
    const select = <T,>(primary: T, secondary: T): T =>
        useSecondaryAxis ? secondary : primary;

    return {
        zeroBase: fromLegacyBoolean(select(panelInfo.zero_base, panelInfo.zero_base2)),
        showTickline: fromLegacyBoolean(
            select(panelInfo.show_y_tickline, panelInfo.show_y_tickline2),
        ),
        valueRange: normalizeLegacyValueRange(
            select(panelInfo.custom_min, panelInfo.custom_min2),
            select(panelInfo.custom_max, panelInfo.custom_max2),
        ),
        rawValueRange: normalizeLegacyValueRange(
            select(panelInfo.custom_drilldown_min, panelInfo.custom_drilldown_min2),
            select(panelInfo.custom_drilldown_max, panelInfo.custom_drilldown_max2),
        ),
        upperControlLimit: {
            enabled: fromLegacyBoolean(select(panelInfo.use_ucl, panelInfo.use_ucl2)),
            value: normalizeNumericValue(select(panelInfo.ucl_value, panelInfo.ucl2_value)),
        },
        lowerControlLimit: {
            enabled: fromLegacyBoolean(select(panelInfo.use_lcl, panelInfo.use_lcl2)),
            value: normalizeNumericValue(select(panelInfo.lcl_value, panelInfo.lcl2_value)),
        },
    };
}

function normalizeLegacyValueRange(
    min: number | string | undefined,
    max: number | string | undefined,
): ValueRange {
    return normalizePersistedValueRangeOrAuto({
        min: normalizeNumericValue(min),
        max: normalizeNumericValue(max),
    });
}
function normalizeNumericValue(value: number | string | undefined): number {
    return value === undefined || value === '' ? 0 : Number(value);
}

function resolveLegacyRangeConfig(
    panelInfo: LegacyFlatPanelInfo,
    storedRangeConfig: RangeExpressionInput,
    isNumericAxis: boolean,
): RangeExpressionInput {
    const sHasStoredRange =
        panelInfo.range_bgn !== '' &&
        panelInfo.range_bgn !== undefined &&
        panelInfo.range_end !== '' &&
        panelInfo.range_end !== undefined;
    if (sHasStoredRange) {
        return (
            normalizePersistedPanelRangeInput(
                storedRangeConfig,
                isNumericAxis,
            ) ?? { start: '', end: '' }
        );
    }

    const sValueRange = panelInfo.default_range;
    if (
        !sValueRange ||
        sValueRange.min === undefined ||
        sValueRange.max === undefined
    ) {
        return { start: '', end: '' };
    }

    const sFormatter = isNumericAxis
        ? formatNumericValue
        : formatAbsoluteTime;
    return {
        start: sFormatter(sValueRange.min),
        end: sFormatter(sValueRange.max),
    };
}

type LegacyNestedPanelTaz = {
    meta: {
        index_key: string;
        chart_title: string;
    };
    data: {
        tag_set: unknown[];
        raw_keeper?: boolean;
        count?: number;
        interval_type?: string;
    };
    time: {
        range_bgn: unknown;
        range_end: unknown;
        use_time_keeper?: boolean;
        time_keeper?: unknown;
        default_range?: unknown;
    };
    axes: Record<string, unknown>;
    display: Record<string, unknown>;
    use_normalize?: boolean;
};

function parseLoadedLegacyPanelTaz(panelInfo: unknown): PanelInfo {
    if (isLegacyNestedPanelTaz(panelInfo)) {
        return createPanelInfoFromLegacyFlatPanelInfo(
            flattenLegacyNestedPanelTaz(panelInfo),
        );
    }

    if (isLegacyFlatPanelTaz(panelInfo)) {
        return createPanelInfoFromLegacyFlatPanelInfo(panelInfo);
    }

    throw new Error('Invalid TagAnalyzer legacy .taz panel structure.');
}

function isLegacyNestedPanelTaz(panelInfo: unknown): panelInfo is LegacyNestedPanelTaz {
    if (!isPlainObject(panelInfo)) {
        return false;
    }

    const sPanelInfo = panelInfo as Record<string, unknown>;
    const sMeta = isPlainObject(sPanelInfo.meta) ? sPanelInfo.meta : undefined;
    const sData = isPlainObject(sPanelInfo.data) ? sPanelInfo.data : undefined;

    return (
        sMeta !== undefined &&
        typeof sMeta.index_key === 'string' &&
        typeof sMeta.chart_title === 'string' &&
        sData !== undefined &&
        Array.isArray(sData.tag_set) &&
        isPlainObject(sPanelInfo.time) &&
        isPlainObject(sPanelInfo.axes) &&
        isPlainObject(sPanelInfo.display)
    );
}

function isLegacyFlatPanelTaz(panelInfo: unknown): panelInfo is LegacyFlatPanelInfo {
    if (!isPlainObject(panelInfo)) {
        return false;
    }

    const sPanelInfo = panelInfo as Record<string, unknown>;

    return (
        typeof sPanelInfo.index_key === 'string' &&
        typeof sPanelInfo.chart_title === 'string' &&
        Array.isArray(sPanelInfo.tag_set)
    );
}

function flattenLegacyNestedPanelTaz(panelInfo: LegacyNestedPanelTaz): LegacyFlatPanelInfo {
    const sAxes = panelInfo.axes as Record<string, unknown>;
    const sDisplay = panelInfo.display as Record<string, unknown>;
    const sPrimaryRange = (sAxes.primaryRange as Record<string, unknown> | undefined) ?? {};
    const sPrimaryDrilldownRange =
        (sAxes.primaryDrilldownRange as Record<string, unknown> | undefined) ?? {};
    const sSecondaryRange = (sAxes.secondaryRange as Record<string, unknown> | undefined) ?? {};
    const sSecondaryDrilldownRange =
        (sAxes.secondaryDrilldownRange as Record<string, unknown> | undefined) ?? {};

    return {
        index_key: panelInfo.meta.index_key,
        chart_title: panelInfo.meta.chart_title,
        tag_set: panelInfo.data.tag_set as LegacyFlatPanelInfo['tag_set'],
        range_bgn: panelInfo.time.range_bgn as LegacyFlatPanelInfo['range_bgn'],
        range_end: panelInfo.time.range_end as LegacyFlatPanelInfo['range_end'],
        raw_keeper: panelInfo.data.raw_keeper ?? false,
        time_keeper: panelInfo.time.time_keeper as LegacyFlatPanelInfo['time_keeper'],
        default_range: panelInfo.time.default_range as LegacyFlatPanelInfo['default_range'],
        count: panelInfo.data.count,
        interval_type: panelInfo.data.interval_type,
        show_legend: toLegacyFlag(sDisplay.show_legend),
        use_zoom: toLegacyFlag(sDisplay.use_zoom),
        connect_nulls: toLegacyFlag(sDisplay.connect_nulls),
        use_normalize: toLegacyFlag(panelInfo.use_normalize),
        use_time_keeper: toLegacyFlag(panelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyFlag(sAxes.show_x_tickline),
        pixels_per_tick: toLegacyNumber(sAxes.pixels_per_tick),
        sampling_value: toLegacyNumber(sAxes.sampling_value),
        zero_base: toLegacyFlag(sAxes.zero_base),
        show_y_tickline: toLegacyFlag(sAxes.show_y_tickline),
        custom_min: toLegacyNumber(sPrimaryRange.min),
        custom_max: toLegacyNumber(sPrimaryRange.max),
        custom_drilldown_min: toLegacyNumber(sPrimaryDrilldownRange.min),
        custom_drilldown_max: toLegacyNumber(sPrimaryDrilldownRange.max),
        use_ucl: toLegacyFlag(sAxes.use_ucl),
        ucl_value: toLegacyNumber(sAxes.ucl_value),
        use_lcl: toLegacyFlag(sAxes.use_lcl),
        lcl_value: toLegacyNumber(sAxes.lcl_value),
        use_right_y2: toLegacyFlag(sAxes.use_right_y2),
        zero_base2: toLegacyFlag(sAxes.zero_base2),
        show_y_tickline2: toLegacyFlag(sAxes.show_y_tickline2),
        custom_min2: toLegacyNumber(sSecondaryRange.min),
        custom_max2: toLegacyNumber(sSecondaryRange.max),
        custom_drilldown_min2: toLegacyNumber(sSecondaryDrilldownRange.min),
        custom_drilldown_max2: toLegacyNumber(sSecondaryDrilldownRange.max),
        use_ucl2: toLegacyFlag(sAxes.use_ucl2),
        ucl2_value: toLegacyNumber(sAxes.ucl2_value),
        use_lcl2: toLegacyFlag(sAxes.use_lcl2),
        lcl2_value: toLegacyNumber(sAxes.lcl2_value),
        chart_type: normalizePersistedPanelChartType(sDisplay.chart_type),
        show_point: toLegacyFlag(sDisplay.show_point),
        point_radius: toLegacyNumber(sDisplay.point_radius),
        fill: toLegacyNumber(sDisplay.fill),
        stroke: toLegacyNumber(sDisplay.stroke),
    };
}

function toLegacyFlag(value: unknown): 'Y' | 'N' {
    return value === true || value === 'Y' ? 'Y' : 'N';
}

function toLegacyNumber(value: unknown): number | string {
    if (value === undefined || value === null || value === '') {
        return 0;
    }

    return typeof value === 'number' || typeof value === 'string' ? value : 0;
}

function isPersistedPanelInfoV200(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV200 {
    if (!isPlainObject(panelInfo)) {
        return false;
    }

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV200>;

    return (
        isPlainObject(sPanelInfo.meta) &&
        typeof sPanelInfo.meta.panelKey === 'string' &&
        typeof sPanelInfo.meta.chartTitle === 'string' &&
        isPlainObject(sPanelInfo.data) &&
        Array.isArray(sPanelInfo.data.seriesList) &&
        sPanelInfo.data.seriesList.every(isPlainObject) &&
        isPlainObject(sPanelInfo.toolbar) &&
        typeof sPanelInfo.toolbar.isRaw === 'boolean' &&
        isPlainObject(sPanelInfo.time) &&
        isPlainObject(sPanelInfo.time.rangeConfig) &&
        isPlainObject(sPanelInfo.axes) &&
        isPlainObject(sPanelInfo.axes.xAxis) &&
        isPersistedYAxisContainer(sPanelInfo.axes.leftYAxis) &&
        isPersistedYAxisContainer(sPanelInfo.axes.rightYAxis) &&
        isPlainObject(sPanelInfo.display)
    );
}

function isPersistedYAxisContainer(value: unknown): boolean {
    return isPlainObject(value) &&
        isPlainObject(value.upperControlLimit) &&
        isPlainObject(value.lowerControlLimit);
}

function parseLoadedPanelTazVer200(
    panelInfo: unknown,
    version: TazVersion,
): PanelInfo {
    if (!isPersistedPanelInfoV200(panelInfo)) {
        throw new Error(`Invalid TagAnalyzer .taz ${version} panel structure.`);
    }

    const sTagSet = panelInfo.data.seriesList.map(createSeriesInfoFromPersistedV200);
    const sRangeInput = normalizePersistedPanelRangeInput(
        panelInfo.time.rangeConfig,
        shouldUseNumericPanelRangeInput(sTagSet),
    );
    if (!sRangeInput) {
        throw new Error('Invalid TagAnalyzer .taz panel time rangeConfig structure.');
    }
    const sMainChartSampling =
        panelInfo.axes.mainChartSampling ?? panelInfo.axes.sampling;

    return buildMigratedPanelInfo({
        key: panelInfo.meta.panelKey,
        title: panelInfo.meta.chartTitle,
        query: {
            tagSet: sTagSet,
            intervalType: normalizeStoredTimeUnit(panelInfo.data.intervalType ?? ''),
        },
        mode: {
            isRaw: panelInfo.toolbar.isRaw,
            isOrderBy: false,
            useNormalize: panelInfo.useNormalizedValues ?? false,
        },
        time: {
            rangeInput: sRangeInput,
            useLastViewedRange: panelInfo.time.useLastViewedRange === true,
            lastViewedRange: decodePersistedPanelRangeState(
                panelInfo.time.lastViewedRange,
            ),
        },
        axes: {
            x: {
                showTickline: panelInfo.axes.xAxis.showTickLine ?? false,
            },
            leftY: mapPersistedYAxisV200(panelInfo.axes.leftYAxis),
            rightY: {
                ...mapPersistedYAxisV200(panelInfo.axes.rightYAxis),
                enabled: panelInfo.axes.rightYAxis.enabled ?? false,
            },
        },
        display: {
            chartType: normalizePersistedPanelChartType(panelInfo.display.chartType),
            showLegend: panelInfo.display.showLegend ?? false,
            showPoint: panelInfo.display.showPoints ?? false,
            pointRadius: panelInfo.display.pointRadius ?? 0,
            fill: panelInfo.display.fill ?? 0,
            stroke: panelInfo.display.stroke ?? 0,
            connectNulls: panelInfo.display.connectNulls ?? false,
            useZoom: panelInfo.display.useZoom ?? false,
            pixelsPerTick: {
                calculated: panelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
                calculatedNavigator:
                    panelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            mainChartSampling: {
                enabled: sMainChartSampling?.enabled ?? false,
                sampleCount: sMainChartSampling?.sampleCount ?? 0,
            },
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: createPanelAnnotationsFromPersistedPanel(panelInfo),
    });
}

function mapPersistedYAxisV200(
    axis: PersistedPanelInfoV200['axes']['leftYAxis'],
): PanelYAxis {
    return {
        zeroBase: axis.zeroBase ?? false,
        showTickline: axis.showTickLine ?? false,
        valueRange: normalizePersistedValueRangeOrAuto(axis.valueRange),
        rawValueRange: normalizePersistedValueRangeOrAuto(axis.rawDataValueRange),
        upperControlLimit: {
            enabled: axis.upperControlLimit.enabled ?? false,
            value: axis.upperControlLimit.value ?? 0,
        },
        lowerControlLimit: {
            enabled: axis.lowerControlLimit.enabled ?? false,
            value: axis.lowerControlLimit.value ?? 0,
        },
    };
}

function createPanelAnnotationsFromPersistedPanel(
    panelInfo: PersistedPanelInfoV200,
): PanelAnnotation[] {
    const sPanelAnnotations = clonePanelAnnotations(panelInfo.annotations);
    const sSeriesAnnotations = panelInfo.data.seriesList.flatMap((seriesInfo) =>
        cloneSeriesAnnotations(seriesInfo.annotations).map((annotation) => ({
            ...annotation,
            seriesKey: seriesInfo.seriesKey,
        })),
    );

    return [...sPanelAnnotations, ...sSeriesAnnotations];
}

function createSeriesInfoFromPersistedV200(
    seriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
): PanelSeriesDefinition {
    const sCalculationMode = normalizePanelSeriesCalculationMode(
        seriesInfo.calculationMode,
    );
    if (!sCalculationMode) {
        throw new Error(
            'Invalid TagAnalyzer .taz panel series calculationMode.',
        );
    }

    const sSeries = {
        key: seriesInfo.seriesKey,
        table: seriesInfo.tableName,
        sourceTagName: seriesInfo.sourceTagName,
        alias: seriesInfo.alias,
        calculationMode: sCalculationMode,
        color: seriesInfo.color,
        useSecondaryAxis: seriesInfo.useSecondaryAxis ?? false,
        id: seriesInfo.id,
        useRollupTable: seriesInfo.useRollupTable ?? false,
        sourceColumns: createRuntimeSeriesColumns(seriesInfo.sourceColumns),
    };

    sSeries.alias = getPanelSeriesDisplayName(sSeries);
    return sSeries;
}

function createRuntimeSeriesColumns(
    columns: PersistedPanelInfoV200['data']['seriesList'][number]['sourceColumns'] | undefined,
): PanelSeriesSourceColumns {
    if (!columns) {
        return { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS };
    }

    return {
        name: columns.nameColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: columns.timeColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: columns.valueColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
        jsonKey: typeof columns.jsonKey === 'string' ? columns.jsonKey : undefined,
        timeType: typeof columns.timeType === 'number' ? columns.timeType : undefined,
        timeBaseTime: typeof columns.timeBaseTime === 'boolean'
            ? columns.timeBaseTime
            : undefined,
    };
}

const V204_INVALID_AXIS_RANGE_MESSAGE =
    'Invalid TagAnalyzer .taz panel axis range structure.';

function isPersistedPanelInfoV204(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV204 {
    if (!isPlainObject(panelInfo)) return false;

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV204>;
    const sGeneral = sPanelInfo.general;
    const sData = sPanelInfo.data;
    const sTime = sPanelInfo.time;
    const sAxes = isPlainObject(sPanelInfo.axes) ? sPanelInfo.axes : undefined;
    const sDisplay = isPlainObject(sPanelInfo.display)
        ? sPanelInfo.display
        : undefined;

    return (
        isPlainObject(sGeneral) &&
        typeof sGeneral.chart_title === 'string' &&
        typeof sGeneral.use_zoom === 'boolean' &&
        typeof sGeneral.use_last_viewed_range === 'boolean' &&
        typeof sGeneral.is_raw === 'boolean' &&
        (sGeneral.is_order_by === undefined ||
            typeof sGeneral.is_order_by === 'boolean') &&
        typeof sGeneral.use_normalize === 'boolean' &&
        isPlainObject(sData) &&
        typeof sData.index_key === 'string' &&
        Array.isArray(sData.tag_set) &&
        isPlainObject(sTime) &&
        isPlainObject(sTime.range_config) &&
        sAxes !== undefined &&
        isPersistedXAxis(sAxes.x_axis) &&
        isPersistedYAxis(sAxes.left_y_axis) &&
        isPersistedYAxis(sAxes.right_y_axis) &&
        (sAxes.right_y_axis_enabled === undefined ||
            typeof sAxes.right_y_axis_enabled === 'boolean') &&
        isOptionalSampling(sAxes.sampling) &&
        isOptionalSampling(sAxes.main_chart_sampling) &&
        sDisplay !== undefined &&
        typeof sDisplay.show_legend === 'boolean' &&
        typeof sDisplay.show_point === 'boolean' &&
        (sDisplay.connect_nulls === undefined ||
            typeof sDisplay.connect_nulls === 'boolean') &&
        isOptionalFiniteNumber(sDisplay.point_radius) &&
        isOptionalFiniteNumber(sDisplay.fill) &&
        isOptionalFiniteNumber(sDisplay.stroke)
    );
}

function isPersistedXAxis(value: unknown): boolean {
    return isPlainObject(value) &&
        typeof value.show_tickline === 'boolean' &&
        isOptionalFiniteNumber(value.raw_data_pixels_per_tick) &&
        isOptionalFiniteNumber(value.calculated_data_pixels_per_tick) &&
        isOptionalFiniteNumber(value.calculated_navigator_pixels_per_tick);
}

function isPersistedYAxis(value: unknown): boolean {
    return isPlainObject(value) &&
        typeof value.zero_base === 'boolean' &&
        typeof value.show_tickline === 'boolean' &&
        isPlainObject(value.value_range) &&
        isPlainObject(value.raw_data_value_range) &&
        isAxisThreshold(value.upper_control_limit) &&
        isAxisThreshold(value.lower_control_limit);
}

function isAxisThreshold(value: unknown): boolean {
    return isPlainObject(value) &&
        typeof value.enabled === 'boolean' &&
        isOptionalFiniteNumber(value.value) &&
        (!value.enabled || value.value !== undefined);
}

function isOptionalSampling(value: unknown): boolean {
    return value === undefined || (
        isPlainObject(value) &&
        typeof value.enabled === 'boolean' &&
        isOptionalFiniteNumber(value.sample_count) &&
        (!value.enabled || value.sample_count !== undefined)
    );
}

function isOptionalFiniteNumber(value: unknown): boolean {
    return value === undefined || isFiniteNumber(value);
}

function parseLoadedPanelTazVer204(
    panelInfo: unknown,
    version: TazVersion,
): PanelInfo {
    if (!isPersistedPanelInfoV204(panelInfo)) {
        throw new Error(`Invalid TagAnalyzer .taz ${version} panel structure.`);
    }

    const sTagSet = normalizePanelSeriesDefinitions(panelInfo.data.tag_set);
    if (!sTagSet) {
        throw new Error('Invalid TagAnalyzer .taz panel series structure.');
    }

    const sRangeInput = normalizePersistedPanelRangeInput(
        panelInfo.time.range_config,
        shouldUseNumericPanelRangeInput(sTagSet),
    );
    if (!sRangeInput) {
        throw new Error('Invalid TagAnalyzer .taz panel time range_config structure.');
    }
    const sMainChartSampling =
        panelInfo.axes.main_chart_sampling ?? panelInfo.axes.sampling;

    return buildMigratedPanelInfo({
        key: panelInfo.data.index_key,
        title: panelInfo.general.chart_title,
        query: {
            tagSet: sTagSet,
            intervalType: normalizeStoredTimeUnit(panelInfo.data.interval_type ?? ''),
        },
        mode: {
            isRaw: panelInfo.general.is_raw,
            isOrderBy: panelInfo.general.is_order_by ?? false,
            useNormalize: panelInfo.general.use_normalize,
        },
        time: {
            rangeInput: sRangeInput,
            useLastViewedRange: panelInfo.general.use_last_viewed_range,
            lastViewedRange: decodePersistedPanelRangeState(
                panelInfo.general.last_viewed_range,
            ),
        },
        axes: {
            x: { showTickline: panelInfo.axes.x_axis.show_tickline },
            leftY: mapPersistedYAxis(panelInfo.axes.left_y_axis),
            rightY: {
                ...mapPersistedYAxis(panelInfo.axes.right_y_axis),
                enabled: panelInfo.axes.right_y_axis_enabled ?? false,
            },
        },
        display: {
            chartType: normalizePersistedPanelChartType(
                panelInfo.display.chart_type,
            ),
            showLegend: panelInfo.display.show_legend,
            showPoint: panelInfo.display.show_point,
            pointRadius: panelInfo.display.point_radius,
            fill: panelInfo.display.fill,
            stroke: panelInfo.display.stroke,
            connectNulls: panelInfo.display.connect_nulls ?? false,
            useZoom: panelInfo.general.use_zoom,
            pixelsPerTick: {
                calculated: panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
                calculatedNavigator:
                    panelInfo.axes.x_axis.calculated_navigator_pixels_per_tick ??
                    panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
            },
            mainChartSampling: {
                enabled: sMainChartSampling?.enabled ?? false,
                sampleCount: sMainChartSampling?.sample_count,
            },
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    });
}

function mapPersistedYAxis(
    axis: PersistedPanelInfoV204['axes']['left_y_axis'],
): PanelYAxis {
    return {
        zeroBase: axis.zero_base,
        showTickline: axis.show_tickline,
        valueRange: parsePersistedValueRangeOrThrow(
            axis.value_range,
            V204_INVALID_AXIS_RANGE_MESSAGE,
        ),
        rawValueRange: parsePersistedValueRangeOrThrow(
            axis.raw_data_value_range,
            V204_INVALID_AXIS_RANGE_MESSAGE,
        ),
        upperControlLimit: { ...axis.upper_control_limit },
        lowerControlLimit: { ...axis.lower_control_limit },
    };
}

type LoadedTazBoardData = Record<string, unknown> & {
    panels: unknown[];
    version?: unknown;
    boardTimeRange?: PersistedBoardRange;
    boardNumericRange?: PersistedBoardRange;
    range_bgn?: unknown;
    range_end?: unknown;
};

export function parseLoadedTaz(boardInfo: unknown): BoardInfo {
    const sBoardInfo = assertLoadedTazBoardData(boardInfo);
    const sVersion = normalizePersistedTazVersion(sBoardInfo.version);
    const sPanels = sBoardInfo.panels
        .flatMap((panel) => repairLegacyPanelIfNeeded(panel, sVersion))
        .map(normalizeTazPanelSeriesCompatibility);
    const sBoardTimeRange = normalizePersistedBoardRange(
        sBoardInfo.boardTimeRange ??
            createTimeRangeInputFromStoredValues(
                normalizeStoredTimeRangeValue(sBoardInfo.range_bgn),
                normalizeStoredTimeRangeValue(sBoardInfo.range_end),
            ),
        'boardTimeRange',
    );
    const sBoardNumericRange = normalizePersistedBoardRange(
        sBoardInfo.boardNumericRange,
        'boardNumericRange',
    );

    return {
        ...sBoardInfo,
        version: sVersion,
        id: normalizeLoadedString(sBoardInfo.id),
        type: normalizeLoadedString(sBoardInfo.type, 'taz'),
        name: normalizeLoadedString(sBoardInfo.name),
        path: normalizeLoadedString(sBoardInfo.path),
        code: sBoardInfo.code ?? '',
        panels: ensureUniquePanelKeys(
            sPanels.map((panelInfo) =>
                parseLoadedPanelTazByVersion(panelInfo, sVersion),
            ),
        ),
        savedCode:
            typeof sBoardInfo.savedCode === 'string'
                ? sBoardInfo.savedCode
                : false,
        boardTimeRange: sBoardTimeRange,
        boardNumericRange: sBoardNumericRange,
    };
}

function repairLegacyPanelIfNeeded(
    panel: unknown,
    version: TazVersion,
): unknown[] {
    if (version !== TazVersion.Legacy || isLegacyNestedPanelTaz(panel)) {
        return [panel];
    }

    if (!isPlainObject(panel)) return [];

    const result = validateAndRepairTazPanel(panel);
    return result.valid ? [result.panel] : [];
}

function normalizeTazPanelSeriesCompatibility(panel: unknown): unknown {
    if (!isPlainObject(panel)) return panel;

    const data = asRecord(panel.data);
    if (data) {
        for (const seriesKey of ['tag_set', 'seriesList'] as const) {
            const seriesList = data[seriesKey];
            if (Array.isArray(seriesList)) {
                return {
                    ...panel,
                    highlights: Array.isArray(panel.highlights)
                        ? panel.highlights
                        : [],
                    data: {
                        ...data,
                        [seriesKey]: normalizeSeriesList(seriesList),
                    },
                };
            }
        }
    }

    return Array.isArray(panel.tag_set)
        ? { ...panel, tag_set: normalizeSeriesList(panel.tag_set) }
        : panel;
}

function normalizeSeriesList(seriesList: unknown[]): unknown[] {
    return seriesList.map((series, index) => {
        if (!isPlainObject(series)) return series;

        const columnInfo = asRecord(series.colName);
        return {
            ...series,
            colName: columnInfo
                ? { ...columnInfo, jsonKey: columnInfo.jsonKey ?? '' }
                : series.colName,
            color:
                typeof series.color === 'string' && series.color.length > 0
                    ? series.color
                    : getPanelSeriesDisplayColor({}, index),
        };
    });
}

function assertLoadedTazBoardData(boardInfo: unknown): LoadedTazBoardData {
    if (!isPlainObject(boardInfo)) {
        throw new Error('Invalid TagAnalyzer .taz board structure.');
    }

    if (!Array.isArray(boardInfo.panels)) {
        throw new Error('Invalid TagAnalyzer .taz board panels structure.');
    }

    return boardInfo as LoadedTazBoardData;
}

function parseLoadedPanelTazByVersion(
    panelInfo: unknown,
    version: TazVersion,
): PanelInfo {
    switch (version) {
        case TazVersion.Legacy:
            return parseLoadedLegacyPanelTaz(panelInfo);
        case TAZ_FORMAT_VERSION:
            return parseLoadedPanelTazVer210(panelInfo);
        case TazVersion.V204:
        case TazVersion.V205:
            return parseLoadedPanelTazVer204(panelInfo, version);
        case TazVersion.V200:
        case TazVersion.V201:
        case TazVersion.V202:
        case TazVersion.V203:
            return parseLoadedPanelTazVer200(panelInfo, version);
        default:
            throw new Error(`Unsupported TagAnalyzer .taz version: ${version}`);
    }
}

function normalizeLoadedString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function normalizeStoredTimeRangeValue(value: unknown): string | number {
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }

    return '';
}

function normalizePersistedBoardRange(
    boardRange: PersistedBoardRange | undefined,
    rangeName: 'boardTimeRange' | 'boardNumericRange',
): RangeExpressionInput {
    if (boardRange === undefined) {
        return { start: '', end: '' };
    }

    const sNormalizedBoardRange =
        rangeName === 'boardTimeRange'
            ? normalizePersistedTimeRangeInput(boardRange)
            : normalizePersistedPanelRangeInput(boardRange, true);
    if (!sNormalizedBoardRange) {
        throw new Error(`Invalid TagAnalyzer .taz ${rangeName} structure.`);
    }

    return sNormalizedBoardRange;
}

import type { PanelEChartType, PanelHighlight, PanelInfo } from '../panelModelTypes';
import type { SeriesAnnotation } from '../series/PanelSeriesTypes';
import type { ValueRange } from '../../TagAnalyzerCommonTypes';
import type { TimeRangeConfig, TimeRangePair } from '../time/types/TimeTypes';

export type PersistedSeriesColumnsV201 = {
    nameColumn: string | undefined;
    timeColumn: string | undefined;
    valueColumn: string | undefined;
    [key: string]: unknown;
};

export type LegacySeriesSourceColumns = {
    name: string | undefined;
    time: string | undefined;
    value: string | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV200 = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    use_y2: boolean;
    id: string | undefined;
    onRollup?: boolean | undefined;
    colName: LegacySeriesSourceColumns | undefined;
    annotations?: SeriesAnnotation[] | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV201 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    columnNames: PersistedSeriesColumnsV201 | undefined;
    annotations?: SeriesAnnotation[] | undefined;
};

export type PersistedSeriesInfoV204 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PersistedSeriesColumnsV201;
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

export type PersistedPanelAxesV200 = {
    show_x_tickline: boolean;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: boolean;
    show_y_tickline: boolean;
    primaryRange: ValueRange;
    primaryDrilldownRange: ValueRange;
    use_ucl: boolean;
    ucl_value: number;
    use_lcl: boolean;
    lcl_value: number;
    use_right_y2: boolean;
    zero_base2: boolean;
    show_y_tickline2: boolean;
    secondaryRange: ValueRange;
    secondaryDrilldownRange: ValueRange;
    use_ucl2: boolean;
    ucl2_value: number;
    use_lcl2: boolean;
    lcl2_value: number;
};

export type PersistedPanelInfoV200 = {
    meta: PersistedPanelMetaV200;
    data: PersistedPanelDataV200;
    time: PersistedPanelTimeV200;
    axes: PersistedPanelAxesV200;
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

export type PersistedPanelDataV204 = {
    seriesList: PersistedSeriesInfoV204[];
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
    defaultValueRange?: ValueRange | undefined;
};

export type PersistedPanelTimeV205 = {
    rangeConfig: TimeRangeConfig;
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
    chartType: PanelEChartType;
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

export type PersistedPanelXAxisV202 = {
    showTickLine: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
};

export type PersistedPanelSamplingV202 = {
    enabled: boolean;
    sampleCount: number;
};

export type PersistedPanelAxisThresholdV202 = {
    enabled: boolean;
    value: number;
};

export type PersistedPanelYAxisV202 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV202;
    lowerControlLimit: PersistedPanelAxisThresholdV202;
};

export type PersistedPanelRightYAxisV202 = PersistedPanelYAxisV202 & {
    enabled: boolean;
};

export type PersistedPanelAxesV202 = {
    xAxis: PersistedPanelXAxisV202;
    sampling: PersistedPanelSamplingV202;
    primaryYAxis: PersistedPanelYAxisV202;
    secondaryYAxis: PersistedPanelRightYAxisV202;
};

export type PersistedPanelInfoV202 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV202;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelLeftYAxisV203 = PersistedPanelYAxisV202;

export type PersistedPanelRightYAxisV203 = PersistedPanelYAxisV202 & {
    enabled: boolean;
};

export type PersistedPanelAxesV203 = {
    xAxis: PersistedPanelXAxisV202;
    sampling: PersistedPanelSamplingV202;
    leftYAxis: PersistedPanelLeftYAxisV203;
    rightYAxis: PersistedPanelRightYAxisV203;
};

export type PersistedPanelInfoV203 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV203;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelInfoV204 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV204;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV203;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelInfoV205 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV204;
    time: PersistedPanelTimeV205;
    axes: PersistedPanelAxesV203;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

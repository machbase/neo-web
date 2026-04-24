import type { PanelEChartType, PanelHighlight } from '../panelModelTypes';
import type { SeriesAnnotation } from '../series/PanelSeriesTypes';
import type { ValueRange } from '../../TagAnalyzerCommonTypes';
import type { TimeRangeConfig } from '../time/types/TimeTypes';

export type PersistedSeriesColumnsV200 = {
    nameColumn: string | undefined;
    timeColumn: string | undefined;
    valueColumn: string | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV200 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string | undefined;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PersistedSeriesColumnsV200;
    annotations?: SeriesAnnotation[] | undefined;
};

export type PersistedPanelMetaV200 = {
    panelKey: string;
    chartTitle: string;
};

export type PersistedPanelDataV200 = {
    seriesList: PersistedSeriesInfoV200[];
    rowLimit: number;
    intervalType: string | undefined;
};

export type PersistedPanelToolbarV200 = {
    isRaw: boolean;
};

export type PersistedPanelTimeV200 = {
    rangeConfig: TimeRangeConfig;
};

export type PersistedPanelAxisThresholdV200 = {
    enabled: boolean;
    value: number;
};

export type PersistedPanelXAxisV200 = {
    showTickLine: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
};

export type PersistedPanelSamplingV200 = {
    enabled: boolean;
    sampleCount: number;
};

export type PersistedPanelYAxisV200 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV200;
    lowerControlLimit: PersistedPanelAxisThresholdV200;
};

export type PersistedPanelRightYAxisV200 = PersistedPanelYAxisV200 & {
    enabled: boolean;
};

export type PersistedPanelAxesV200 = {
    xAxis: PersistedPanelXAxisV200;
    sampling: PersistedPanelSamplingV200;
    leftYAxis: PersistedPanelYAxisV200;
    rightYAxis: PersistedPanelRightYAxisV200;
};

export type PersistedPanelDisplayV200 = {
    showLegend: boolean;
    useZoom: boolean;
    chartType: PanelEChartType;
    showPoints: boolean;
    pointRadius: number;
    fill: number;
    stroke: number;
};

export type PersistedPanelInfoV200 = {
    meta: PersistedPanelMetaV200;
    data: PersistedPanelDataV200;
    toolbar: PersistedPanelToolbarV200;
    time: PersistedPanelTimeV200;
    axes: PersistedPanelAxesV200;
    display: PersistedPanelDisplayV200;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

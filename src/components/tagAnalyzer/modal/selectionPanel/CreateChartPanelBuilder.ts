import type { TagSelectionDraftItem } from '../seriesSelection/TagSelectionTypes';
import { DEFAULT_VALUE_RANGE, type PanelEChartType, type PanelInfo } from '../../domain/PanelDomain';
import { createPanelIndexKey } from '../../domain/PanelIdentity';
import {
    shouldUseNumericPanelRangeConfig,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import { buildSeriesDefinitionsFromDrafts } from '../seriesSelection/buildSelectedSeriesDefinitions';
import {
    createNumericRangeBoundary,
    createNumericRangeConfig,
    createTimestampRangeBoundary,
    createTimestampRangeConfig,
} from '../../domain/time/range/PanelRangeConfigUtils';
import type { PersistedPanelInfoV205 } from '../../persistence/TazPersistenceTypesV205';

export const DEFAULT_NEW_PANEL_TITLE = 'New chart';
const DEFAULT_PANEL_ROW_LIMIT = -1;
const DEFAULT_PANEL_INTERVAL_TYPE = '';
const DEFAULT_RAW_PIXELS_PER_TICK = 0.1;
const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const DEFAULT_CALCULATED_NAVIGATOR_PIXELS_PER_TICK = 3;
const DEFAULT_SAMPLING_VALUE = 0.01;

export function buildCreateChartPanel(
    chartType: PanelEChartType,
    selectedSeriesDrafts: TagSelectionDraftItem[],
    chartTitle: string = DEFAULT_NEW_PANEL_TITLE,
): PersistedPanelInfoV205 {
    return createRuntimePanelInfo(
        chartType,
        buildSeriesDefinitionsFromDrafts(selectedSeriesDrafts),
        normalizeChartTitle(chartTitle),
    );
}

function createRuntimePanelInfo(
    chartType: PanelEChartType,
    tagSet: PanelSeriesDefinition[],
    chartTitle: string,
): PanelInfo {
    const sDisplay = createPanelDisplayForChartType(chartType);
    const sIsNumericXAxis = shouldUseNumericPanelRangeConfig(tagSet);

    return {
        key: createPanelIndexKey(),
        title: chartTitle,
        query: {
            tagSet,
            count: DEFAULT_PANEL_ROW_LIMIT,
            intervalType: DEFAULT_PANEL_INTERVAL_TYPE,
        },
        mode: {
            isRaw: false,
            isOrderBy: false,
            useNormalize: false,
        },
        timeRange: {
            ...(sIsNumericXAxis
                ? createNumericRangeConfig(
                    createNumericRangeBoundary('numeric_empty'),
                    createNumericRangeBoundary('numeric_empty'),
                )
                : createTimestampRangeConfig(
                    createTimestampRangeBoundary('timestamp_empty'),
                    createTimestampRangeBoundary('timestamp_empty'),
                )),
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: {
                showTickline: true,
            },
            leftY: createDefaultLeftYAxisConfig(),
            rightY: createDefaultRightYAxisConfig(),
        },
        display: {
            chartType: chartType,
            showLegend: true,
            showPoint: sDisplay.showPoint,
            pointRadius: sDisplay.pointRadius,
            fill: sDisplay.fill,
            stroke: sDisplay.stroke,
            connectNulls: false,
            useZoom: true,
            pixelsPerTick: {
                raw: DEFAULT_RAW_PIXELS_PER_TICK,
                calculated: DEFAULT_CALCULATED_PIXELS_PER_TICK,
                calculatedNavigator: DEFAULT_CALCULATED_NAVIGATOR_PIXELS_PER_TICK,
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: DEFAULT_SAMPLING_VALUE,
            },
        },
        highlights: [],
        annotations: [],
    };
}

function normalizeChartTitle(chartTitle: string): string {
    const sTitle = chartTitle.trim();

    return sTitle.length > 0 ? sTitle : DEFAULT_NEW_PANEL_TITLE;
}

function createPanelDisplayForChartType(
    chartType: PanelEChartType,
): Pick<PanelInfo['display'], 'showPoint' | 'pointRadius' | 'fill' | 'stroke'> {
    switch (chartType) {
        case 'Zone':
            return { showPoint: false, pointRadius: 0, fill: 0.15, stroke: 1 };
        case 'Dot':
            return { showPoint: true, pointRadius: 2, fill: 0, stroke: 0 };
        case 'Line':
        case 'Custom':
            return { showPoint: true, pointRadius: 0, fill: 0, stroke: 1 };
    }

    throw new Error(`Unsupported chart type: ${chartType}`);
}

function createDefaultLeftYAxisConfig(): PanelInfo['axes']['leftY'] {
    return createBaseYAxisConfig(false);
}

function createDefaultRightYAxisConfig(): PanelInfo['axes']['rightY'] {
    return {
        ...createBaseYAxisConfig(true),
        enabled: false,
    };
}

function createBaseYAxisConfig(zeroBase: boolean): PanelInfo['axes']['leftY'] {
    return {
        zeroBase: zeroBase,
        showTickline: true,
        valueRange: { ...DEFAULT_VALUE_RANGE },
        rawValueRange: { ...DEFAULT_VALUE_RANGE },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };
}


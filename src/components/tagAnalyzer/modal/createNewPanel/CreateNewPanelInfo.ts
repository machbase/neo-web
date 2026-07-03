import {
    AUTO_VALUE_RANGE,
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    type PanelEChartType,
    type PanelInfo,
} from '../../domain/panel/PanelConfig';
import { createPanelIndexKey } from '../../domain/panel/PanelIdentity';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';

export const DEFAULT_NEW_PANEL_TITLE = 'New chart';

const DEFAULT_PANEL_ROW_LIMIT = -1;
const DEFAULT_PANEL_INTERVAL_TYPE = '';
const DEFAULT_RAW_PIXELS_PER_TICK = 0.1;
const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const DEFAULT_CALCULATED_NAVIGATOR_PIXELS_PER_TICK = 3;
const DEFAULT_SAMPLING_VALUE = 0.01;

export function createNewPanelInfo(
    selectedSeries: PanelSeriesDefinition[],
    chartName: string,
    chartType: PanelEChartType,
): PanelInfo {
    const sDisplay = createPanelDisplayForChartType(chartType);

    return {
        key: createPanelIndexKey(),
        title: normalizeChartTitle(chartName),
        query: {
            tagSet: clonePanelSeriesDefinitions(selectedSeries),
            count: DEFAULT_PANEL_ROW_LIMIT,
            intervalType: DEFAULT_PANEL_INTERVAL_TYPE,
        },
        mode: {
            isRaw: false,
            isOrderBy: false,
            useNormalize: false,
        },
        time: {
            rangeInput: {
                start: '',
                end: '',
            },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: {
                showTickline: true,
            },
            leftY: createBaseYAxisConfig(false),
            rightY: { ...createBaseYAxisConfig(true), enabled: false },
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
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: [],
        annotations: [],
    };
}

function clonePanelSeriesDefinitions(
    selectedSeries: PanelSeriesDefinition[],
): PanelSeriesDefinition[] {
    return selectedSeries.map((selectedSeriesItem) => ({
        ...selectedSeriesItem,
        sourceColumns: { ...selectedSeriesItem.sourceColumns },
    }));
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

function createBaseYAxisConfig(zeroBase: boolean): PanelInfo['axes']['leftY'] {
    return {
        zeroBase: zeroBase,
        showTickline: true,
        valueRange: { ...AUTO_VALUE_RANGE },
        rawValueRange: { ...AUTO_VALUE_RANGE },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };
}

function normalizeChartTitle(chartName: string): string {
    const sChartName = chartName.trim();

    return sChartName.length > 0 ? sChartName : DEFAULT_NEW_PANEL_TITLE;
}

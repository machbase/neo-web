import type { LineSeriesOption } from 'echarts';
import type { RuntimePanelAxes, RuntimePanelDisplay } from '../../../domain/panel/PanelRuntime';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import { buildMainSeriesOption } from './buildPanelSeriesOptions';

const display: RuntimePanelDisplay = {
    chartType: 'Line',
    showLegend: true,
    showPoint: false,
    connectNulls: false,
    useZoom: true,
    pointRadius: 0,
    fill: 0,
    stroke: 1,
};

const axes: RuntimePanelAxes = {
    x: {
        showTickline: false,
        rawDataPixelsPerTick: 0,
        calculatedDataPixelsPerTick: 0,
        calculatedNavigatorPixelsPerTick: 0,
    },
    mainChartSampling: {
        enabled: false,
        sampleCount: 0,
    },
    leftY: {
        zeroBase: false,
        showTickline: false,
        valueRange: { min: undefined, max: undefined },
        rawValueRange: { min: undefined, max: undefined },
        upperControlLimit: { enabled: true, value: 10 },
        lowerControlLimit: { enabled: true, value: -10 },
    },
    rightY: {
        zeroBase: false,
        showTickline: false,
        valueRange: { min: undefined, max: undefined },
        rawValueRange: { min: undefined, max: undefined },
        upperControlLimit: { enabled: true, value: 100 },
        lowerControlLimit: { enabled: true, value: -100 },
    },
    rightYEnabled: true,
};

const rightAxisSeries: ChartSeriesData = {
    name: 'right',
    data: [[1, 20], [2, 30]],
    yAxis: 1,
    marker: undefined,
    color: undefined,
};

const duplicateDisplayNameSeries: ChartSeriesData = {
    name: 'Sensor_03(avg)',
    echartsName: 'SYS.SENSOR_TABLE / Sensor_03 / VIBRATION (avg)',
    data: [[1, 20]],
    yAxis: 0,
    marker: undefined,
    color: undefined,
};

describe('buildMainSeriesOption', () => {
    it('uses right-axis thresholds for right-axis series mark lines', () => {
        const options = buildMainSeriesOption([rightAxisSeries], display, axes);
        const markLineData = (options[0] as LineSeriesOption).markLine?.data;

        expect(options[0]).toMatchObject({ yAxisIndex: 1 });
        expect(markLineData).toEqual([{ yAxis: 100 }, { yAxis: -100 }]);
    });

    it('uses ECharts-facing series names when provided', () => {
        const options = buildMainSeriesOption(
            [duplicateDisplayNameSeries],
            display,
            axes,
        );

        expect(options[0]).toMatchObject({
            name: 'SYS.SENSOR_TABLE / Sensor_03 / VIBRATION (avg)',
        });
    });

    it('keeps animation by default but allows data replacement updates to disable it', () => {
        const animatedOptions = buildMainSeriesOption(
            [rightAxisSeries],
            display,
            axes,
        );
        const replacementOptions = buildMainSeriesOption(
            [rightAxisSeries],
            display,
            axes,
            undefined,
            false,
        );

        expect((animatedOptions[0] as LineSeriesOption).animation).toBe(true);
        expect((replacementOptions[0] as LineSeriesOption).animation).toBe(false);
    });
});

import type { RuntimePanelAxes } from '../../../domain/panel/PanelRuntime';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import { buildChartYAxisOption } from './buildPanelChartAxisOptions';

const baseAxes: RuntimePanelAxes = {
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
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    },
    rightY: {
        zeroBase: false,
        showTickline: false,
        valueRange: { min: undefined, max: undefined },
        rawValueRange: { min: undefined, max: undefined },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    },
    rightYEnabled: true,
};

const rightAxisSeries: ChartSeriesData = {
    name: 'right',
    data: [[1, 10], [2, 20]],
    yAxis: 1,
    marker: undefined,
    color: undefined,
};

const leftAxisSeries: ChartSeriesData = {
    ...rightAxisSeries,
    name: 'left',
    yAxis: 0,
};

describe('buildChartYAxisOption', () => {
    it('includes enabled right-axis thresholds in the right-axis auto range', () => {
        const yAxisOptions = buildChartYAxisOption(
            {
                ...baseAxes,
                rightY: {
                    ...baseAxes.rightY,
                    upperControlLimit: { enabled: true, value: 120 },
                    lowerControlLimit: { enabled: true, value: -40 },
                },
            },
            [rightAxisSeries],
            false,
            false,
        );

        expect(Number(yAxisOptions[1].max)).toBeGreaterThanOrEqual(120);
        expect(Number(yAxisOptions[1].min)).toBeLessThanOrEqual(-40);
    });

    it('shows the right-axis labels whenever the right axis is enabled', () => {
        const yAxisOptions = buildChartYAxisOption(
            baseAxes,
            [leftAxisSeries],
            false,
            false,
        );

        expect(yAxisOptions[1].axisLabel).toMatchObject({ show: true });
    });
});

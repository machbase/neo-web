import type { ChartSeriesData } from '../chart/chartData';
import type { PanelInfo } from '../model';
import {
    buildOverlapChartOption,
    createOverlapChartSeriesGroup,
    getOverlapChartSeriesGroupRange,
    joinOverlapChartSeriesGroups,
} from './overlapModel';

function createPanel(key: string): PanelInfo {
    return { key, title: 'Same panel' } as PanelInfo;
}

function createSeries(
    data: ChartSeriesData['data'],
): ChartSeriesData {
    return {
        name: 'Series',
        data,
        yAxis: 0,
        marker: undefined,
        color: undefined,
    };
}

describe('overlap chart series groups', () => {
    it('aligns, shifts, names, and identifies series at the ECharts boundary', () => {
        const firstGroup = createOverlapChartSeriesGroup(
            {
                panelInfo: createPanel('panel-a'),
                visibleRange: { startTime: 90, endTime: 130 },
            },
            [createSeries([[95, null], [100, 1], [110, 2]])],
        );
        const secondGroup = createOverlapChartSeriesGroup(
            {
                panelInfo: createPanel('panel-b'),
                visibleRange: { startTime: 490, endTime: 530 },
            },
            [createSeries([[500, 3], [510, 4]])],
        );
        const seriesData = joinOverlapChartSeriesGroups([
            { ...firstGroup, shiftValue: 5 },
            secondGroup,
        ]);

        expect(getOverlapChartSeriesGroupRange({
            ...firstGroup,
            shiftValue: 5,
        })).toEqual({ startTime: -5, endTime: 35 });
        expect(seriesData).toEqual([
            expect.objectContaining({
                id: 'panel-a:0',
                name: 'Same panel / Series',
                data: [[0, null], [5, 1], [15, 2]],
            }),
            expect.objectContaining({
                id: 'panel-b:0',
                name: 'Same panel / Series (2)',
                data: [[0, 3], [10, 4]],
            }),
        ]);

        const option = buildOverlapChartOption(seriesData, false, true);
        expect(option.series).toEqual([
            expect.objectContaining({
                id: 'panel-a:0',
                name: 'Same panel / Series',
            }),
            expect.objectContaining({
                id: 'panel-b:0',
                name: 'Same panel / Series (2)',
            }),
        ]);
        expect(option.dataZoom).toEqual([
            expect.objectContaining({
                moveOnMouseMove: true,
                zoomOnMouseWheel: true,
            }),
        ]);
        expect(option.aria).toEqual(expect.objectContaining({
            enabled: true,
            label: expect.objectContaining({
                description: expect.stringContaining('Same panel / Series'),
            }),
        }));
    });
});

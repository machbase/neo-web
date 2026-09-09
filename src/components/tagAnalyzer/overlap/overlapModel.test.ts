import {
    buildOverlapChartOption,
    createOverlapChartSeriesGroup,
    type OverlapSeriesData,
} from './overlapModel';

function createSeries(
    data: OverlapSeriesData['data'],
): OverlapSeriesData {
    return { name: 'Series', data };
}

describe('overlap chart series groups', () => {
    it('aligns, shifts, names, and identifies series at the ECharts boundary', () => {
        const firstGroup = createOverlapChartSeriesGroup(
            {
                key: 'panel-a',
                title: 'Same panel',
                visibleRange: { start: 90, end: 130 },
            },
            [
                createSeries([[85, null], [100, 1], [110, 2]]),
                createSeries([[95, 8], [120, 9]]),
            ],
        );
        const secondGroup = createOverlapChartSeriesGroup(
            {
                key: 'panel-b',
                title: 'Same panel',
                visibleRange: { start: 490, end: 530 },
            },
            [createSeries([[500, 3], [510, 4]])],
        );
        const option = buildOverlapChartOption([
            { ...firstGroup, shiftValue: 5 },
            secondGroup,
        ], false, true)!;

        expect(firstGroup.alignedRange).toEqual({ start: -5, end: 35 });
        expect(firstGroup.sourceRange).toEqual({ start: 90, end: 130 });
        expect(firstGroup.shiftValue).toBe(0);
        expect(option.series).toEqual([
            expect.objectContaining({
                id: 'panel-a:0',
                name: 'Same panel / Series',
                data: [[-5, null], [10, 1], [20, 2]],
                lineStyle: { width: 0.5, color: '#EB5757' },
                itemStyle: { color: '#EB5757' },
                animation: false,
            }),
            expect.objectContaining({
                id: 'panel-a:1',
                name: 'Same panel / Series (2)',
                data: [[5, 8], [30, 9]],
                itemStyle: { color: '#6FCF97' },
            }),
            expect.objectContaining({
                id: 'panel-b:0',
                name: 'Same panel / Series (3)',
                data: [[0, 3], [10, 4]],
                itemStyle: { color: '#9C8FFF' },
            }),
        ]);
        expect(option.xAxis).toEqual(expect.objectContaining({
            min: -1000,
            max: 1030,
        }));
        expect(option.dataZoom).toEqual([
            expect.objectContaining({
                startValue: 0,
                endValue: 30,
                moveOnMouseMove: true,
                zoomOnMouseWheel: true,
            }),
        ]);
    });

    it('omits chart options when no series has a plotted value', () => {
        expect(buildOverlapChartOption([], false, true)).toBeUndefined();
        const group = createOverlapChartSeriesGroup({
            key: 'empty',
            title: 'Same panel',
            visibleRange: { start: 90, end: 130 },
        }, [createSeries([]), createSeries([[100, null]])]);
        expect(buildOverlapChartOption([group], false, true)).toBeUndefined();
    });
});

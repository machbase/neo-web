import type { ChartSeriesData } from '../chart/chartData';
import type { PanelSeriesDefinition } from '../seriesModel';
import { buildSelectionSummaryPayload } from './AnalysisModals';

const SERIES = {
    key: 'series-1',
    sourceTagName: 'temperature',
} as PanelSeriesDefinition;

function chartData(data: ChartSeriesData['data']): ChartSeriesData {
    return {
        name: 'temperature',
        data,
        yAxis: 0,
        marker: undefined,
        color: undefined,
    };
}

test('builds selection statistics from values inside the selected range', () => {
    expect(
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [chartData([[5, 100], [10, 2], [15, null], [20, 4], [25, 200]])],
            [SERIES],
        ),
    ).toEqual({
        start: 10,
        end: 20,
        seriesSummaries: [{
            series: SERIES,
            min: '2.00000',
            max: '4.00000',
            avg: '3.00000',
        }],
    });
});

test('returns no payload when the selection contains no values', () => {
    expect(
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [chartData([[5, 1], [15, null]])],
            [SERIES],
        ),
    ).toBeUndefined();
});

test('rejects mismatched chart and panel series', () => {
    expect(() =>
        buildSelectionSummaryPayload(
            { start: 10, end: 20 },
            [],
            [SERIES],
        ),
    ).toThrow('Brush selection series mismatch');
});

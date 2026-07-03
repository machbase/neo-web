import type { ChartSeriesData } from '../../domain/ChartDomain';
import {
    getSeriesStartTime,
    getSeriesTimeBounds,
} from './OverlapComparisonUtils';

function series(data: Array<[number, number]>): ChartSeriesData {
    return {
        name: 'series',
        data,
        yAxis: 0,
        marker: undefined,
        color: undefined,
    };
}

describe('overlap comparison utilities', () => {
    test('finds the earliest timestamp across all series', () => {
        expect(
            getSeriesStartTime([
                series([[20, 1], [30, 2]]),
                series([[10, 3], [40, 4]]),
            ]),
        ).toBe(10);
    });

    test('keeps range bounds based on the full series extent', () => {
        expect(
            getSeriesTimeBounds([
                series([[20, 1], [30, 2]]),
                series([[10, 3], [40, 4]]),
            ]),
        ).toEqual({
            startTime: 10,
            endTime: 40,
        });
    });

    test('can align a single-point series even when a range is unavailable', () => {
        const sSeries = [series([[25, 1]])];

        expect(getSeriesStartTime(sSeries)).toBe(25);
        expect(getSeriesTimeBounds(sSeries)).toBeUndefined();
    });
});

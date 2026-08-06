import { calcInterval, calcNumericInterval } from './dashboardUtil';

describe('calcNumericInterval (distance / numeric base)', () => {
    test('picks a nice 5×10ⁿ step at time-axis density (width/3)', () => {
        // span 1000, width 600 → ~200 ticks → raw 5 → nice 5
        expect(calcNumericInterval(0, 1000, 600)).toEqual({ IntervalType: 'value', IntervalValue: 5 });
    });

    test('coarsens with a narrower panel', () => {
        // span 1000, width 120 → ~40 ticks → raw 25 → nice 50
        expect(calcNumericInterval(0, 1000, 120)).toEqual({ IntervalType: 'value', IntervalValue: 50 });
    });

    test('supports sub-unit steps for small spans', () => {
        // span 30, width 600 → ~200 ticks → raw 0.15 → nice 0.2
        expect(calcNumericInterval(0, 30, 600)).toEqual({ IntervalType: 'value', IntervalValue: 0.2 });
    });

    test('falls back to 1 for a zero / degenerate span', () => {
        expect(calcNumericInterval(5, 5, 600)).toEqual({ IntervalType: 'value', IntervalValue: 1 });
    });

    test('handles reversed bounds via absolute span', () => {
        expect(calcNumericInterval(1000, 0, 600)).toEqual({ IntervalType: 'value', IntervalValue: 5 });
    });
});

describe('calcInterval numeric-base flag', () => {
    test('delegates to numeric interval when aIsNumericBase is true', () => {
        expect(calcInterval(0, 1000, 600, true)).toEqual({ IntervalType: 'value', IntervalValue: 5 });
    });

    test('keeps time-unit behavior by default (backward compatible)', () => {
        const sResult = calcInterval(0, 1000, 600);
        expect(sResult.IntervalType).not.toBe('value');
        expect(['sec', 'min', 'hour', 'day']).toContain(sResult.IntervalType);
    });
});

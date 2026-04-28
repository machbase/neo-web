import {
    hasExplicitDataZoomEventRange,
    hasExplicitDataZoomOptionRange,
} from './ChartDataZoomUtils';

describe('ChartDataZoomUtils', () => {
    describe('hasExplicitDataZoomEventRange', () => {
        it('reads direct event range fields', () => {
            expect(hasExplicitDataZoomEventRange({ start: 10, end: 20 })).toBe(true);
        });

        it('reads the primary batched event item', () => {
            expect(
                hasExplicitDataZoomEventRange({
                    batch: [{ start: 10, end: 20 }],
                }),
            ).toBe(true);
        });

        it('returns false for an empty event batch', () => {
            expect(hasExplicitDataZoomEventRange({ batch: [] })).toBe(false);
        });
    });

    describe('hasExplicitDataZoomOptionRange', () => {
        it('reads option state range fields', () => {
            expect(hasExplicitDataZoomOptionRange({ startValue: 100, endValue: 200 })).toBe(true);
        });

        it('returns false for incomplete option state', () => {
            expect(hasExplicitDataZoomOptionRange({ startValue: 100 })).toBe(false);
        });
    });
});

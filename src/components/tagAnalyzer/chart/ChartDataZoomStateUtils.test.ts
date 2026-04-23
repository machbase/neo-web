import {
    hasExplicitDataZoomEventRange,
    hasExplicitDataZoomOptionRange,
} from './ChartDataZoomStateUtils';

describe('ChartDataZoomStateUtils', () => {
    describe('hasExplicitDataZoomEventRange', () => {
        it('reads direct event range fields', () => {
            // Confirms direct dataZoom events do not need option-state fallback.
            expect(hasExplicitDataZoomEventRange({ start: 10, end: 20 })).toBe(true);
        });

        it('reads the primary batched event item', () => {
            // Confirms batched dataZoom events are normalized only on the event path.
            expect(
                hasExplicitDataZoomEventRange({
                    batch: [{ start: 10, end: 20 }],
                }),
            ).toBe(true);
        });

        it('returns false for an empty event batch', () => {
            // Confirms missing event state is not passed into the range predicate.
            expect(hasExplicitDataZoomEventRange({ batch: [] })).toBe(false);
        });
    });

    describe('hasExplicitDataZoomOptionRange', () => {
        it('reads option state range fields', () => {
            // Confirms live chart option state is checked without event payload normalization.
            expect(hasExplicitDataZoomOptionRange({ startValue: 100, endValue: 200 })).toBe(true);
        });

        it('returns false for incomplete option state', () => {
            // Confirms callers can reject option state that cannot reconstruct a range.
            expect(hasExplicitDataZoomOptionRange({ startValue: 100 })).toBe(false);
        });
    });
});

import { hasResolvedIntervalOption } from './TimeIntervalOptionUtils';

describe('TimeIntervalOptionUtils', () => {
    describe('hasResolvedIntervalOption', () => {
        it('returns true for non-empty interval options', () => {
            expect(
                hasResolvedIntervalOption({
                    IntervalType: 'second',
                    IntervalValue: 5,
                }),
            ).toBe(true);
        });

        it('returns false for empty or zero interval options', () => {
            expect(hasResolvedIntervalOption(undefined)).toBe(false);
            expect(
                hasResolvedIntervalOption({
                    IntervalType: '',
                    IntervalValue: 0,
                }),
            ).toBe(false);
        });
    });
});

import { parseNonNegativeInteger } from './IntegerParsing';

describe('IntegerParsing', () => {
    describe('parseNonNegativeInteger', () => {
        it('returns the parsed integer for valid non-negative inputs', () => {
            expect(parseNonNegativeInteger(0)).toBe(0);
            expect(parseNonNegativeInteger('4')).toBe(4);
        });

        it('returns undefined for negative, fractional, and invalid inputs', () => {
            expect(parseNonNegativeInteger(-1)).toBeUndefined();
            expect(parseNonNegativeInteger('1.5')).toBeUndefined();
            expect(parseNonNegativeInteger('abc')).toBeUndefined();
        });
    });
});

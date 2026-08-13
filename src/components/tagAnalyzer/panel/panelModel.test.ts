import { isValueRangeInvalid } from './panelModel';

describe('isValueRangeInvalid', () => {
    it.each([
        [{ min: undefined, max: undefined }, false],
        [{ min: 0, max: 1 }, false],
        [{ min: undefined, max: 1 }, true],
        [{ min: 0, max: undefined }, true],
        [{ min: Number.NaN, max: 1 }, true],
        [{ min: 0, max: Number.POSITIVE_INFINITY }, true],
        [{ min: 1, max: 1 }, true],
        [{ min: 2, max: 1 }, true],
    ])('validates %o as invalid=%s', (range, expected) => {
        expect(isValueRangeInvalid(range)).toBe(expected);
    });
});
